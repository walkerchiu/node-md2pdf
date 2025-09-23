/**
 * Output manager for batch processing
 * Handles output directory structure and file naming
 */

import * as path from 'path';
import * as fs from 'fs';
import { BatchConversionConfig, BatchFileInfo } from '../../types/batch';
import { ErrorType, MD2PDFError } from '../../types';

export class OutputManager {
  /**
   * Ensure all output directories exist
   */
  async prepareOutputDirectories(files: BatchFileInfo[]): Promise<void> {
    const directories = new Set<string>();

    // Collect all unique output directories
    files.forEach(file => {
      const outputDir = path.dirname(file.outputPath);
      directories.add(outputDir);
    });

    // Create directories in parallel
    const createPromises = Array.from(directories).map(dir => this.ensureDirectoryExists(dir));
    await Promise.all(createPromises);
  }

  /**
   * Handle file name conflicts
   */
  async resolveFileNameConflicts(files: BatchFileInfo[]): Promise<BatchFileInfo[]> {
    const resolvedFiles: BatchFileInfo[] = [];
    const pathCounts = new Map<string, number>();
    for (const file of files) {
      let outputPath = file.outputPath;
      // Check if path already exists (in our list or on disk)
      if (pathCounts.has(outputPath) || await this.fileExists(outputPath)) {
        outputPath = await this.generateUniqueFileName(outputPath, pathCounts);
      }
      pathCounts.set(outputPath, (pathCounts.get(outputPath) || 0) + 1);
      resolvedFiles.push({
        ...file,
        outputPath,
      });
    }
    return resolvedFiles;
  }

  /**
   * Validate output paths
   */
  async validateOutputPaths(files: BatchFileInfo[]): Promise<{
    valid: BatchFileInfo[];
    invalid: { file: BatchFileInfo; error: MD2PDFError }[];
  }> {
    const valid: BatchFileInfo[] = [];
    const invalid: { file: BatchFileInfo; error: MD2PDFError }[] = [];
    for (const file of files) {
      try {
        await this.validateOutputPath(file.outputPath);
        valid.push(file);
      } catch (error) {
        invalid.push({
          file,
          error: error as MD2PDFError,
        });
      }
    }
    return { valid, invalid };
  }

  /**
   * Generate output structure report
   */
  generateOutputReport(config: BatchConversionConfig, files: BatchFileInfo[]): {
    summary: {
      totalFiles: number;
      outputDirectory: string;
      preserveStructure: boolean;
      filenameFormat: string;
    };
    directories: string[];
    conflicts: string[];
  } {
    const directories = new Set<string>();
    const filePaths = new Set<string>();
    const conflicts: string[] = [];
    files.forEach(file => {
      const outputDir = path.dirname(file.outputPath);
      directories.add(outputDir);
      if (filePaths.has(file.outputPath)) {
        conflicts.push(file.outputPath);
      }
      filePaths.add(file.outputPath);
    });

    return {
      summary: {
        totalFiles: files.length,
        outputDirectory: config.outputDirectory,
        preserveStructure: config.preserveDirectoryStructure,
        filenameFormat: config.filenameFormat,
      },
      directories: Array.from(directories).sort(),
      conflicts,
    };
  }

  /**
   * Clean up failed conversions
   */
  async cleanupFailedFiles(files: string[]): Promise<void> {
    const cleanupPromises = files.map(async (filePath) => {
      try {
        if (await this.fileExists(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to cleanup file: ${filePath}`, error);
      }
    });
    await Promise.all(cleanupPromises);
  }

  /**
   * Create backup of existing files
   */
  async createBackups(files: BatchFileInfo[]): Promise<Map<string, string>> {
    const backups = new Map<string, string>();
    for (const file of files) {
      if (await this.fileExists(file.outputPath)) {
        const backupPath = await this.generateBackupPath(file.outputPath);
        try {
          await fs.promises.copyFile(file.outputPath, backupPath);
          backups.set(file.outputPath, backupPath);
        } catch (error) {
          throw this.createError(
            ErrorType.SYSTEM_ERROR,
            `Failed to create backup for ${file.outputPath}`,
            { originalPath: file.outputPath, backupPath },
            ['Check disk space', 'Verify write permissions']
          );
        }
      }
    }
    return backups;
  }

  /**
   * Restore backups
   */
  async restoreBackups(backups: Map<string, string>): Promise<void> {
    for (const [originalPath, backupPath] of backups) {
      try {
        await fs.promises.copyFile(backupPath, originalPath);
        await fs.promises.unlink(backupPath);
      } catch (error) {
        console.warn(`Failed to restore backup: ${originalPath}`, error);
      }
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw this.createError(
        ErrorType.SYSTEM_ERROR,
        `Failed to create directory: ${dirPath}`,
        { dirPath, error: error instanceof Error ? error.message : String(error) },
        ['Check permissions', 'Verify disk space']
      );
    }
  }

  /**
   * Generate unique filename to avoid conflicts
   */
  private async generateUniqueFileName(
    originalPath: string,
    pathCounts: Map<string, number>
  ): Promise<string> {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const baseName = path.basename(originalPath, ext);
    let counter = pathCounts.get(originalPath) || 1;
    let uniquePath: string;
    do {
      uniquePath = path.join(dir, `${baseName}_${counter}${ext}`);
      counter++;
    } while (pathCounts.has(uniquePath) || await this.fileExists(uniquePath));
    return uniquePath;
  }

  /**
   * Generate backup path
   */
  private async generateBackupPath(originalPath: string): Promise<string> {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const baseName = path.basename(originalPath, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(dir, `${baseName}_backup_${timestamp}${ext}`);
  }

  /**
   * Validate output path
   */
  private async validateOutputPath(outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    // Check if output directory exists or can be created
    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
    } catch (error) {
      throw this.createError(
        ErrorType.SYSTEM_ERROR,
        `Cannot create output directory: ${outputDir}`,
        { outputPath, outputDir },
        ['Check parent directory permissions', 'Verify disk space']
      );
    }
    // Check if output directory is writable
    try {
      await fs.promises.access(outputDir, fs.constants.W_OK);
    } catch (error) {
      throw this.createError(
        ErrorType.PERMISSION_DENIED,
        `Output directory is not writable: ${outputDir}`,
        { outputPath, outputDir },
        ['Check directory permissions', 'Use a different output directory']
      );
    }
    // Check if filename is valid
    const fileName = path.basename(outputPath);
    if (!this.isValidFileName(fileName)) {
      throw this.createError(
        ErrorType.INVALID_FORMAT,
        `Invalid output filename: ${fileName}`,
        { outputPath, fileName },
        ['Use only alphanumeric characters, hyphens, and underscores', 'Avoid special characters']
      );
    }
  }

  /**
   * Check if filename is valid for the filesystem
   */
  private isValidFileName(fileName: string): boolean {
    // Check for invalid characters (Windows and Unix)
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(fileName)) {
      return false;
    }
    // Check for reserved names (Windows)
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    const nameWithoutExt = path.parse(fileName).name;
    if (reservedNames.test(nameWithoutExt)) {
      return false;
    }
    // Check length (most filesystems have a 255 byte limit)
    if (Buffer.byteLength(fileName, 'utf8') > 255) {
      return false;
    }
    return true;
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create standardized error
   */
  private createError(
    type: ErrorType,
    message: string,
    details?: Record<string, unknown>,
    suggestions?: string[]
  ): MD2PDFError {
    const error = new Error(message) as MD2PDFError;
    error.type = type;
    if (details !== undefined) {
      error.details = details;
    }
    if (suggestions !== undefined) {
      error.suggestions = suggestions;
    }
    return error;
  }
}
