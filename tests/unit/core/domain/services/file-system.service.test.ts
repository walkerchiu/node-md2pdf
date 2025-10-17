/**
 * Unit tests for FileSystemService
 */

import { jest } from '@jest/globals';
import { FilePath } from '../../../../../src/core/domain/value-objects/file-path.vo';
import { FileSystemService } from '../../../../../src/core/domain/services/file-system.service';
import { ValueObjectValidationError } from '../../../../../src/core/domain/value-objects/value-object.base';

// Mock fs module - need to define functions inline due to Jest hoisting
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
  },
  constants: {
    F_OK: 0,
  },
}));

// Get the mocked functions
import * as fs from 'fs';
const mockAccess = fs.promises.access as jest.MockedFunction<
  typeof fs.promises.access
>;
const mockStat = fs.promises.stat as jest.MockedFunction<
  typeof fs.promises.stat
>;

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;

  beforeEach(() => {
    fileSystemService = new FileSystemService();
    jest.clearAllMocks();
  });

  describe('fileExists method', () => {
    it('should return true when file exists', async () => {
      mockAccess.mockResolvedValue(undefined);
      const filePath = new FilePath('/existing/file.md');

      const exists = await fileSystemService.fileExists(filePath);

      expect(exists).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('/existing/file.md', 0); // F_OK = 0
    });

    it('should return false when file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      const filePath = new FilePath('/nonexistent/file.md');

      const exists = await fileSystemService.fileExists(filePath);

      expect(exists).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith('/nonexistent/file.md', 0);
    });

    it('should return false for permission errors', async () => {
      mockAccess.mockRejectedValue(new Error('EACCES'));
      const filePath = new FilePath('/restricted/file.md');

      const exists = await fileSystemService.fileExists(filePath);

      expect(exists).toBe(false);
    });

    it('should handle network drives and special paths', async () => {
      mockAccess.mockResolvedValue(undefined);
      const filePath = new FilePath('/network/path/file.md');

      const exists = await fileSystemService.fileExists(filePath);

      expect(exists).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('/network/path/file.md', 0);
    });
  });

  describe('getFileStats method', () => {
    it('should return file stats when file exists', async () => {
      const mockStats = {
        size: 1024,
        mtime: new Date('2024-01-01'),
        isFile: () => true,
        isDirectory: () => false,
      } as any;
      mockStat.mockResolvedValue(mockStats);
      const filePath = new FilePath('/existing/file.md');

      const stats = await fileSystemService.getFileStats(filePath);

      expect(stats).toBe(mockStats);
      expect(mockStat).toHaveBeenCalledWith('/existing/file.md');
    });

    it('should return null when file does not exist', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));
      const filePath = new FilePath('/nonexistent/file.md');

      const stats = await fileSystemService.getFileStats(filePath);

      expect(stats).toBeNull();
      expect(mockStat).toHaveBeenCalledWith('/nonexistent/file.md');
    });

    it('should return null for permission errors', async () => {
      mockStat.mockRejectedValue(new Error('EACCES'));
      const filePath = new FilePath('/restricted/file.md');

      const stats = await fileSystemService.getFileStats(filePath);

      expect(stats).toBeNull();
    });

    it('should handle various file types', async () => {
      const mockStats = {
        size: 2048,
        mtime: new Date('2024-02-01'),
        isFile: () => true,
        isDirectory: () => false,
      } as any;
      mockStat.mockResolvedValue(mockStats);
      const filePath = new FilePath('/path/to/document.markdown');

      const stats = await fileSystemService.getFileStats(filePath);

      expect(stats).toBe(mockStats);
      expect(mockStat).toHaveBeenCalledWith('/path/to/document.markdown');
    });
  });

  describe('createExistingFilePath method', () => {
    it('should create FilePath when file exists', async () => {
      mockAccess.mockResolvedValue(undefined);

      const filePath =
        await fileSystemService.createExistingFilePath('/existing/file.md');

      expect(filePath).toBeInstanceOf(FilePath);
      expect(filePath.value).toBe('/existing/file.md');
      expect(mockAccess).toHaveBeenCalledWith('/existing/file.md', 0);
    });

    it('should throw ValidationError when file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      await expect(
        fileSystemService.createExistingFilePath('/nonexistent/file.md'),
      ).rejects.toThrow(ValueObjectValidationError);

      expect(mockAccess).toHaveBeenCalledWith('/nonexistent/file.md', 0);
    });

    it('should throw ValidationError for permission errors', async () => {
      mockAccess.mockRejectedValue(new Error('EACCES'));

      await expect(
        fileSystemService.createExistingFilePath('/restricted/file.md'),
      ).rejects.toThrow(ValueObjectValidationError);
    });

    it('should handle validation errors from FilePath constructor', async () => {
      // Don't need to mock file access as this should fail earlier
      await expect(
        fileSystemService.createExistingFilePath(''),
      ).rejects.toThrow(ValueObjectValidationError);

      // Should not call file access for invalid paths
      expect(mockAccess).not.toHaveBeenCalled();
    });

    it('should validate file exists for complex paths', async () => {
      mockAccess.mockResolvedValue(undefined);

      const filePath = await fileSystemService.createExistingFilePath(
        '/complex/path/with spaces/file.md',
      );

      expect(filePath).toBeInstanceOf(FilePath);
      expect(filePath.value).toBe('/complex/path/with spaces/file.md');
      expect(mockAccess).toHaveBeenCalledWith(
        '/complex/path/with spaces/file.md',
        0,
      );
    });
  });

  describe('service contract compliance', () => {
    it('should implement IFileSystemService interface correctly', () => {
      expect(typeof fileSystemService.fileExists).toBe('function');
      expect(typeof fileSystemService.getFileStats).toBe('function');
      expect(typeof fileSystemService.createExistingFilePath).toBe('function');
    });

    it('should handle async operations properly', async () => {
      mockAccess.mockResolvedValue(undefined);
      const filePath = new FilePath('/test/file.md');

      const promises = [
        fileSystemService.fileExists(filePath),
        fileSystemService.getFileStats(filePath),
        fileSystemService.createExistingFilePath('/test/file.md'),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
    });

    it('should maintain statelessness between calls', async () => {
      mockAccess.mockResolvedValue(undefined);
      const filePath1 = new FilePath('/file1.md');
      const filePath2 = new FilePath('/file2.md');

      const exists1 = await fileSystemService.fileExists(filePath1);
      const exists2 = await fileSystemService.fileExists(filePath2);

      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
      expect(mockAccess).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent file operations', async () => {
      mockAccess.mockResolvedValue(undefined);
      const filePaths = [
        new FilePath('/file1.md'),
        new FilePath('/file2.md'),
        new FilePath('/file3.md'),
      ];

      const promises = filePaths.map((fp) => fileSystemService.fileExists(fp));
      const results = await Promise.all(promises);

      expect(results).toEqual([true, true, true]);
      expect(mockAccess).toHaveBeenCalledTimes(3);
    });

    it('should handle file system errors gracefully', async () => {
      mockAccess.mockRejectedValue(new Error('File system unavailable'));
      const filePath = new FilePath('/unavailable/file.md');

      const exists = await fileSystemService.fileExists(filePath);

      expect(exists).toBe(false);
    });

    it('should use dynamic imports properly', async () => {
      // This test ensures that fs is imported dynamically
      mockAccess.mockResolvedValue(undefined);
      const filePath = new FilePath('/test/file.md');

      await fileSystemService.fileExists(filePath);

      // The dynamic import should result in fs.promises.access being called
      expect(mockAccess).toHaveBeenCalled();
    });
  });
});
