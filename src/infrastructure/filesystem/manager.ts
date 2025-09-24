/**
 * File system manager implementation using fs-extra
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as glob from 'glob';
import {
  FileNotFoundError,
  FilePermissionError,
  MD2PDFError,
} from '../error/errors';

import type {
  IFileSystemManager,
  WriteFileOptions,
  DirectoryItem,
  FileStats,
} from './types';

export class FileSystemManager implements IFileSystemManager {
  // File operations
  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string | Buffer> {
    try {
      if (!(await this.exists(filePath))) {
        throw new FileNotFoundError(filePath);
      }
      if (encoding) {
        return await fs.readFile(filePath, encoding);
      } else {
        return await fs.readFile(filePath);
      }
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new FilePermissionError(filePath, 'read');
      }
      throw new MD2PDFError(
        `Failed to read file: ${(error as Error).message}`,
        'FILE_READ_ERROR',
        'file_system',
        true,
        { filePath },
      );
    }
  }

  async writeFile(
    filePath: string,
    content: string | Buffer,
    options?: WriteFileOptions,
  ): Promise<void> {
    try {
      // Ensure directory exists
      const dirPath = path.dirname(filePath);
      await this.createDirectory(dirPath);
      await fs.writeFile(filePath, content, options);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new FilePermissionError(filePath, 'write');
      }
      throw new MD2PDFError(
        `Failed to write file: ${(error as Error).message}`,
        'FILE_WRITE_ERROR',
        'file_system',
        true,
        { filePath },
      );
    }
  }

  async appendFile(filePath: string, content: string | Buffer): Promise<void> {
    try {
      await fs.appendFile(filePath, content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new FilePermissionError(filePath, 'append');
      }
      throw new MD2PDFError(
        `Failed to append to file: ${(error as Error).message}`,
        'FILE_APPEND_ERROR',
        'file_system',
        true,
        { filePath },
      );
    }
  }

  async copyFile(source: string, destination: string): Promise<void> {
    try {
      if (!(await this.exists(source))) {
        throw new FileNotFoundError(source);
      }
      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      await this.createDirectory(destDir);
      await fs.copy(source, destination);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      throw new MD2PDFError(
        `Failed to copy file: ${(error as Error).message}`,
        'FILE_COPY_ERROR',
        'file_system',
        true,
        { source, destination },
      );
    }
  }

  async moveFile(source: string, destination: string): Promise<void> {
    try {
      if (!(await this.exists(source))) {
        throw new FileNotFoundError(source);
      }
      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      await this.createDirectory(destDir);
      await fs.move(source, destination);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      throw new MD2PDFError(
        `Failed to move file: ${(error as Error).message}`,
        'FILE_MOVE_ERROR',
        'file_system',
        true,
        { source, destination },
      );
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (await this.exists(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new FilePermissionError(filePath, 'delete');
      }
      throw new MD2PDFError(
        `Failed to delete file: ${(error as Error).message}`,
        'FILE_DELETE_ERROR',
        'file_system',
        true,
        { filePath },
      );
    }
  }

  // Directory operations
  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(dirPath);
    } catch (error) {
      throw new MD2PDFError(
        `Failed to create directory: ${(error as Error).message}`,
        'DIRECTORY_CREATE_ERROR',
        'file_system',
        true,
        { dirPath },
      );
    }
  }

  async deleteDirectory(dirPath: string, recursive: boolean = false): Promise<void> {
    try {
      if (await this.exists(dirPath)) {
        if (recursive) {
          await fs.remove(dirPath);
        } else {
          await fs.rmdir(dirPath);
        }
      }
    } catch (error) {
      throw new MD2PDFError(
        `Failed to delete directory: ${(error as Error).message}`,
        'DIRECTORY_DELETE_ERROR',
        'file_system',
        true,
        { dirPath, recursive },
      );
    }
  }

  async listDirectory(dirPath: string): Promise<DirectoryItem[]> {
    try {
      if (!(await this.exists(dirPath))) {
        throw new FileNotFoundError(dirPath);
      }
      const items = await fs.readdir(dirPath);
      const result: DirectoryItem[] = [];
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await this.getStats(itemPath);
        result.push({
          name: item,
          path: itemPath,
          isDirectory: stats.isDirectory,
          isFile: stats.isFile,
          size: stats.size,
          modified: stats.modified,
        });
      }
      return result;
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      throw new MD2PDFError(
        `Failed to list directory: ${(error as Error).message}`,
        'DIRECTORY_LIST_ERROR',
        'file_system',
        true,
        { dirPath },
      );
    }
  }

  // Path operations
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async isFile(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async getStats(filePath: string): Promise<FileStats> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        permissions: {
          read: !!(stats.mode & parseInt('400', 8)),
          write: !!(stats.mode & parseInt('200', 8)),
          execute: !!(stats.mode & parseInt('100', 8)),
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError(filePath);
      }
      throw new MD2PDFError(
        `Failed to get file stats: ${(error as Error).message}`,
        'FILE_STATS_ERROR',
        'file_system',
        true,
        { filePath },
      );
    }
  }

  resolvePath(...paths: string[]): string {
    return path.resolve(...paths);
  }

  getAbsolutePath(filePath: string): string {
    return path.resolve(filePath);
  }

  getBaseName(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  getDirName(filePath: string): string {
    return path.dirname(filePath);
  }

  getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  // Utility operations
  async createTempFile(prefix: string = 'md2pdf-', suffix: string = '.tmp'): Promise<string> {
    const tempDir = os.tmpdir();
    const fileName = `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}${suffix}`;
    const tempPath = path.join(tempDir, fileName);
    // Create empty file
    await this.writeFile(tempPath, '');
    return tempPath;
  }

  async createTempDirectory(prefix: string = 'md2pdf-'): Promise<string> {
    const tempDir = os.tmpdir();
    const dirName = `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempPath = path.join(tempDir, dirName);
    await this.createDirectory(tempPath);
    return tempPath;
  }

  async findFiles(pattern: string, searchPath: string = process.cwd()): Promise<string[]> {
    try {
      return new Promise((resolve, reject) => {
        glob.glob(pattern, { cwd: searchPath, absolute: true }, (err, files) => {
          if (err) {
            reject(err);
          } else {
            resolve(files);
          }
        });
      });
    } catch (error) {
      throw new MD2PDFError(
        `Failed to find files: ${(error as Error).message}`,
        'FILE_SEARCH_ERROR',
        'file_system',
        true,
        { pattern, searchPath },
      );
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    const stats = await this.getStats(filePath);
    return stats.size;
  }

  async getModificationTime(filePath: string): Promise<Date> {
    const stats = await this.getStats(filePath);
    return stats.modified;
  }
}
