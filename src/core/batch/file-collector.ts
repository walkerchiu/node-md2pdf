/**
 * File collector for batch processing
 * Handles file discovery, filtering, and validation
 */

import * as path from 'path';
import * as fs from 'fs';
import { BatchFileInfo, BatchConversionConfig } from '../../types/batch';
import { ErrorType, MD2PDFError } from '../../types';

export class FileCollector {
  /**
   * Find files matching pattern (public method for CLI use)
   * Returns absolute paths of matching markdown files
   */
  async findFilesByPattern(pattern: string): Promise<string[]> {
    return this.findFiles(pattern);
  }

  /**
   * Collect files based on input pattern
   */
  async collectFiles(config: BatchConversionConfig): Promise<BatchFileInfo[]> {
    try {
      const files = await this.findFiles(config.inputPattern);
      if (files.length === 0) {
        throw this.createError(
          ErrorType.FILE_NOT_FOUND,
          `No files found matching pattern: ${config.inputPattern}`,
          { pattern: config.inputPattern },
          ['Check if the pattern is correct', 'Ensure files exist in the specified location']
        );
      }
      const fileInfos = await Promise.all(
        files.map(filePath => this.createFileInfo(filePath, config))
      );
      return fileInfos.filter(info => info !== null) as BatchFileInfo[];
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error; // Re-throw custom errors
      }
      throw this.createError(
        ErrorType.SYSTEM_ERROR,
        `Failed to collect files: ${error instanceof Error ? error.message : String(error)}`,
        { pattern: config.inputPattern },
        ['Check file system permissions', 'Verify the input pattern is valid'],
      );
    }
  }

  /**
   * Find files matching pattern using native fs methods
   */
  private async findFiles(pattern: string): Promise<string[]> {
    const files: string[] = [];

    // Handle comma-separated file paths
    if (pattern.includes(',')) {
      const filePaths = pattern.split(',')
        .map(p => p.trim())
        .filter(p => p)
        .map(p => this.cleanFilePath(p)); // Remove quotes and clean path
      for (const filePath of filePaths) {
        if (await this.fileExists(filePath)) {
          files.push(path.resolve(filePath));
        }
      }
    }
    // Handle different pattern types
    else if (pattern.includes('*')) {
      // Handle glob-like patterns
      const baseDir = this.getBaseDirFromPattern(pattern);
      const searchDir = baseDir || process.cwd();
      const isRecursive = pattern.includes('**');
      if (isRecursive) {
        await this.findFilesRecursive(searchDir, files);
      } else {
        await this.findFilesInDirectory(searchDir, files);
      }
    } else if (await this.isDirectory(pattern)) {
      // Handle directory paths
      await this.findFilesRecursive(pattern, files);
    } else {
      // Handle single file
      if (await this.fileExists(pattern)) {
        files.push(path.resolve(pattern));
      }
    }

    // Filter markdown files and exclude system directories
    return files.filter(
      (file) => this.isMarkdownFile(file) && !this.shouldIgnoreFile(file),
    );
  }

  /**
   * Recursively find files in directory
   */
  private async findFilesRecursive(
    dir: string,
    files: string[],
  ): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!this.shouldIgnoreDirectory(entry.name)) {
            await this.findFilesRecursive(fullPath, files);
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Find files in single directory (non-recursive)
   */
  private async findFilesInDirectory(
    dir: string,
    files: string[],
  ): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(path.join(dir, entry.name));
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Check if path is a directory
   */
  private async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
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
   * Check if directory should be ignored
   */
  private shouldIgnoreDirectory(dirName: string): boolean {
    const ignoreList = [
      'node_modules',
      '.git',
      'dist',
      'coverage',
      '.next',
      'build',
      '.vscode',
      '.idea',
    ];
    return ignoreList.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return fileName.startsWith('.') || 
      fileName.toLowerCase() === 'readme.md' ||
           filePath.includes('/node_modules/') ||
           filePath.includes('/.git/');
  }

  /**
   * Create file info object with output path calculation
   */
  private async createFileInfo(
    inputPath: string,
    config: BatchConversionConfig
  ): Promise<BatchFileInfo | null> {
    try {
      const stats = await fs.promises.stat(inputPath);
      // Skip if not a file
      if (!stats.isFile()) {
        return null;
      }
      // Validate file extension
      if (!this.isMarkdownFile(inputPath)) {
        return null;
      }
      // For comma-separated files, calculate relative path from actual file location
      let baseDir: string;
      let relativeInputPath: string;
      if (config.inputPattern.includes(',')) {
        // For comma-separated patterns, use current working directory as base
        baseDir = process.cwd();
        relativeInputPath = path.relative(baseDir, inputPath);
      } else {
        // For glob patterns, use the pattern-based approach
        baseDir =
          this.getBaseDirFromPattern(config.inputPattern) || process.cwd();
        relativeInputPath = path.relative(baseDir, inputPath);
      }
      const outputPath = this.calculateOutputPath(
        inputPath,
        relativeInputPath,
        config
      );

      return {
        inputPath,
        outputPath,
        relativeInputPath,
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      // Skip files that can't be accessed
      return null;
    }
  }

  /**
   * Calculate output path based on configuration
   */
  private calculateOutputPath(
    inputPath: string,
    relativeInputPath: string,
    config: BatchConversionConfig
  ): string {
    const inputFileName = path.basename(inputPath, path.extname(inputPath));
    const inputDir = path.dirname(relativeInputPath);
    // Generate filename based on format
    let outputFileName: string;
    const timestamp = new Date().getTime();
    const date = new Date().toISOString().split('T')[0];

    switch (config.filenameFormat) {
      case 'with_timestamp':
        outputFileName = `${inputFileName}_${timestamp}.pdf`;
        break;
      case 'with_date':
        outputFileName = `${inputFileName}_${date}.pdf`;
        break;
      case 'custom':
        outputFileName = config.customFilenamePattern
          ?.replace('{name}', inputFileName)
          ?.replace('{timestamp}', timestamp.toString())
          ?.replace('{date}', date) || `${inputFileName}.pdf`;
        break;
      default:
        outputFileName = `${inputFileName}.pdf`;
    }

    // Calculate output directory - ensure it's resolved to absolute path
    let outputDir: string;
    if (config.preserveDirectoryStructure && inputDir !== '.') {
      outputDir = path.resolve(config.outputDirectory, inputDir);
    } else {
      outputDir = path.resolve(config.outputDirectory);
    }

    return path.join(outputDir, outputFileName);
  }

  /**
   * Check if file is a markdown file
   */
  private isMarkdownFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.md' || ext === '.markdown';
  }

  /**
   * Extract base directory from glob pattern
   */
  private getBaseDirFromPattern(pattern: string): string | undefined {
    // Remove glob patterns to get base directory
    const cleanPattern = pattern
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\{[^}]*\}/g, '');
    const baseDir = path.dirname(cleanPattern);
    return baseDir !== '.' ? baseDir : undefined;
  }

  /**
   * Validate collected files
   */
  async validateFiles(files: BatchFileInfo[]): Promise<{
    valid: BatchFileInfo[];
    invalid: { file: BatchFileInfo; error: MD2PDFError }[];
  }> {
    const valid: BatchFileInfo[] = [];
    const invalid: { file: BatchFileInfo; error: MD2PDFError }[] = [];
    for (const file of files) {
      try {
        // Check if input file exists and is readable
        await fs.promises.access(file.inputPath, fs.constants.R_OK);
        // Check if output directory exists or can be created
        const outputDir = path.dirname(file.outputPath);
        await fs.promises.mkdir(outputDir, { recursive: true });
        // Check if output path is writable
        try {
          await fs.promises.access(outputDir, fs.constants.W_OK);
        } catch {
          throw this.createError(
            ErrorType.PERMISSION_DENIED,
            `Output directory is not writable: ${outputDir}`,
            { outputPath: file.outputPath },
            ['Check directory permissions', 'Choose a different output directory']
          );
        }
        valid.push(file);
      } catch (error) {
        invalid.push({
          file,
          error: error instanceof Error && 'type' in error
            ? error as MD2PDFError
            : this.createError(
                ErrorType.SYSTEM_ERROR,
                `File validation failed: ${error instanceof Error ? error.message : String(error)}`,
                { inputPath: file.inputPath }
              )
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * Clean file path by removing quotes and extra whitespace
   */
  private cleanFilePath(filePath: string): string {
    return filePath.trim().replace(/^['"`]|['"`]$/g, ''); // Remove leading and trailing quotes (single, double, or backtick)
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
