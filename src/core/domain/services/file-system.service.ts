/**
 * Domain Service for file system operations
 * Handles all file-related I/O operations for domain logic
 */

import { FilePath } from '../value-objects/file-path.vo';

import type * as fs from 'fs';

export interface IFileSystemService {
  /**
   * Check if file exists at the given path
   */
  fileExists(filePath: FilePath): Promise<boolean>;

  /**
   * Get file statistics if file exists
   */
  getFileStats(filePath: FilePath): Promise<fs.Stats | null>;

  /**
   * Create FilePath with existence validation
   */
  createExistingFilePath(filePath: string): Promise<FilePath>;
}

/**
 * Implementation of file system service
 */
export class FileSystemService implements IFileSystemService {
  /**
   * Check if file exists at the given path
   */
  async fileExists(filePath: FilePath): Promise<boolean> {
    try {
      const fs = await import('fs');
      await fs.promises.access(filePath.value, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file statistics if file exists
   */
  async getFileStats(filePath: FilePath): Promise<fs.Stats | null> {
    try {
      const fs = await import('fs');
      return await fs.promises.stat(filePath.value);
    } catch {
      return null;
    }
  }

  /**
   * Create FilePath with existence validation
   */
  async createExistingFilePath(filePath: string): Promise<FilePath> {
    const fp = new FilePath(filePath);
    if (!(await this.fileExists(fp))) {
      const { ValueObjectValidationError } = await import(
        '../value-objects/value-object.base'
      );
      throw new ValueObjectValidationError(
        'FilePath',
        filePath,
        'file-exists',
        'File does not exist',
      );
    }
    return fp;
  }
}
