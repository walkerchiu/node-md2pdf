/**
 * Comprehensive tests for OutputManager core batch processing
 * Tests all major functionality including file system operations, validation, and error handling
 */

import { jest } from '@jest/globals';
import * as fs from 'fs';
import { OutputManager } from '../../../../src/core/batch/output-manager';
import {
  BatchConversionConfig,
  BatchFileInfo,
  BatchFilenameFormat,
} from '../../../../src/types/batch';
import { ErrorType } from '../../../../src/types';

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
    copyFile: jest.fn(),
  },
  constants: {
    F_OK: 0,
    W_OK: 2,
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('OutputManager', () => {
  let outputManager: OutputManager;
  let mockConfig: BatchConversionConfig;
  let mockFiles: BatchFileInfo[];
  let consoleSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    outputManager = new OutputManager();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockConfig = {
      inputPattern: '**/*.md',
      outputDirectory: '/output',
      preserveDirectoryStructure: true,
      filenameFormat: BatchFilenameFormat.ORIGINAL,
      maxConcurrentProcesses: 3,
      continueOnError: true,
      tocDepth: 3,
      includePageNumbers: true,
      chineseFontSupport: false,
    };

    mockFiles = [
      {
        inputPath: '/input/doc1.md',
        outputPath: '/output/doc1.pdf',
        relativeInputPath: 'doc1.md',
        size: 1024,
        lastModified: new Date('2023-01-01'),
      },
      {
        inputPath: '/input/subdir/doc2.md',
        outputPath: '/output/subdir/doc2.pdf',
        relativeInputPath: 'subdir/doc2.md',
        size: 2048,
        lastModified: new Date('2023-01-02'),
      },
    ];

    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create OutputManager instance', () => {
      expect(outputManager).toBeInstanceOf(OutputManager);
    });
  });

  describe('prepareOutputDirectories', () => {
    it('should create all unique output directories', async () => {
      mockFs.promises.mkdir.mockResolvedValue(undefined);

      await outputManager.prepareOutputDirectories(mockFiles);

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith('/output', {
        recursive: true,
      });
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith('/output/subdir', {
        recursive: true,
      });
      expect(mockFs.promises.mkdir).toHaveBeenCalledTimes(2);
    });

    it('should handle single directory for all files', async () => {
      const singleDirFiles = [
        { ...mockFiles[0], outputPath: '/output/doc1.pdf' },
        { ...mockFiles[1], outputPath: '/output/doc2.pdf' },
      ];

      mockFs.promises.mkdir.mockResolvedValue(undefined);

      await outputManager.prepareOutputDirectories(singleDirFiles);

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith('/output', {
        recursive: true,
      });
      expect(mockFs.promises.mkdir).toHaveBeenCalledTimes(1);
    });

    it('should throw error when directory creation fails', async () => {
      const error = new Error('Permission denied');
      mockFs.promises.mkdir.mockRejectedValue(error);

      await expect(
        outputManager.prepareOutputDirectories(mockFiles),
      ).rejects.toThrow('Failed to create directory: /output');
    });

    it('should handle empty file list', async () => {
      await outputManager.prepareOutputDirectories([]);
      expect(mockFs.promises.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('resolveFileNameConflicts', () => {
    beforeEach(() => {
      mockFs.promises.access.mockImplementation((filePath) => {
        // Mock some files as existing
        if (filePath === '/output/doc1.pdf') {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
    });

    it('should resolve filename conflicts by adding numeric suffix', async () => {
      const result = await outputManager.resolveFileNameConflicts(mockFiles);

      expect(result).toHaveLength(2);
      expect(result[0].outputPath).toBe('/output/doc1_1.pdf'); // Conflict resolved
      expect(result[1].outputPath).toBe('/output/subdir/doc2.pdf'); // No conflict
    });

    it('should handle multiple conflicts with incremental naming', async () => {
      const conflictFiles = [
        { ...mockFiles[0], outputPath: '/output/doc.pdf' },
        { ...mockFiles[0], outputPath: '/output/doc.pdf' },
        { ...mockFiles[0], outputPath: '/output/doc.pdf' },
      ];

      mockFs.promises.access.mockRejectedValue(new Error('File not found'));

      const result =
        await outputManager.resolveFileNameConflicts(conflictFiles);

      expect(result).toHaveLength(3);
      expect(result[0].outputPath).toBe('/output/doc.pdf');
      expect(result[1].outputPath).toBe('/output/doc_1.pdf');
      expect(result[2].outputPath).toBe('/output/doc_2.pdf');
    });

    it('should preserve original paths when no conflicts exist', async () => {
      mockFs.promises.access.mockRejectedValue(new Error('File not found'));

      const result = await outputManager.resolveFileNameConflicts(mockFiles);

      expect(result).toHaveLength(2);
      expect(result[0].outputPath).toBe('/output/doc1.pdf');
      expect(result[1].outputPath).toBe('/output/subdir/doc2.pdf');
    });
  });

  describe('validateOutputPaths', () => {
    it('should validate all paths and return valid/invalid lists', async () => {
      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.access.mockResolvedValue(undefined);

      const result = await outputManager.validateOutputPaths(mockFiles);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(0);
    });

    it('should identify invalid paths due to directory creation failure', async () => {
      mockFs.promises.mkdir
        .mockResolvedValueOnce(undefined) // First path succeeds
        .mockRejectedValueOnce(new Error('Permission denied')); // Second path fails

      mockFs.promises.access.mockResolvedValue(undefined);

      const result = await outputManager.validateOutputPaths(mockFiles);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error.type).toBe(ErrorType.SYSTEM_ERROR);
      expect(result.invalid[0].error.message).toContain(
        'Cannot create output directory',
      );
    });

    it('should identify paths with invalid characters', async () => {
      const invalidFiles = [
        {
          ...mockFiles[0],
          outputPath: '/output/doc<>.pdf', // Invalid characters
        },
      ];

      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.access.mockResolvedValue(undefined);

      const result = await outputManager.validateOutputPaths(invalidFiles);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error.type).toBe(ErrorType.INVALID_FORMAT);
    });

    it('should identify non-writable directories', async () => {
      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.access.mockRejectedValue(new Error('Permission denied')); // Write check fails

      const result = await outputManager.validateOutputPaths([mockFiles[0]]);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error.type).toBe(ErrorType.PERMISSION_DENIED);
    });
  });

  describe('generateOutputReport', () => {
    it('should generate comprehensive output report', () => {
      const result = outputManager.generateOutputReport(mockConfig, mockFiles);

      expect(result.summary).toEqual({
        totalFiles: 2,
        outputDirectory: '/output',
        preserveStructure: true,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
      });

      expect(result.directories).toContain('/output');
      expect(result.directories).toContain('/output/subdir');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect filename conflicts in report', () => {
      const conflictFiles = [
        mockFiles[0],
        { ...mockFiles[1], outputPath: '/output/doc1.pdf' }, // Same path as first file
      ];

      const result = outputManager.generateOutputReport(
        mockConfig,
        conflictFiles,
      );

      expect(result.conflicts).toContain('/output/doc1.pdf');
      expect(result.conflicts).toHaveLength(1);
    });

    it('should handle empty file list', () => {
      const result = outputManager.generateOutputReport(mockConfig, []);

      expect(result.summary.totalFiles).toBe(0);
      expect(result.directories).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should sort directories alphabetically', () => {
      const multiDirFiles = [
        { ...mockFiles[0], outputPath: '/output/z-folder/doc1.pdf' },
        { ...mockFiles[1], outputPath: '/output/a-folder/doc2.pdf' },
      ];

      const result = outputManager.generateOutputReport(
        mockConfig,
        multiDirFiles,
      );

      expect(result.directories).toEqual([
        '/output/a-folder',
        '/output/z-folder',
      ]);
    });
  });

  describe('cleanupFailedFiles', () => {
    it('should remove all failed files', async () => {
      const failedFiles = ['/output/failed1.pdf', '/output/failed2.pdf'];

      mockFs.promises.access.mockResolvedValue(undefined); // Files exist
      mockFs.promises.unlink.mockResolvedValue(undefined);

      await outputManager.cleanupFailedFiles(failedFiles);

      expect(mockFs.promises.unlink).toHaveBeenCalledTimes(2);
      expect(mockFs.promises.unlink).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
      );
    });

    it('should skip non-existent files during cleanup', async () => {
      const failedFiles = ['/output/nonexistent.pdf'];

      mockFs.promises.access.mockRejectedValue(new Error('File not found'));

      await outputManager.cleanupFailedFiles(failedFiles);

      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const failedFiles = ['/output/locked.pdf'];

      mockFs.promises.access.mockResolvedValue(undefined);
      mockFs.promises.unlink.mockRejectedValue(new Error('File locked'));

      await outputManager.cleanupFailedFiles(failedFiles);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to cleanup file: /output/locked.pdf',
        expect.any(Error),
      );
    });

    it('should handle empty file list', async () => {
      await outputManager.cleanupFailedFiles([]);
      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
    });
  });

  describe('createBackups', () => {
    it('should create backups for existing files', async () => {
      mockFs.promises.access.mockResolvedValue(undefined); // Files exist
      mockFs.promises.copyFile.mockResolvedValue(undefined);

      const result = await outputManager.createBackups(mockFiles);

      expect(mockFs.promises.copyFile).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(2);
      expect(result.has('/output/doc1.pdf')).toBe(true);
      expect(result.has('/output/subdir/doc2.pdf')).toBe(true);

      // Check backup paths contain timestamp
      for (const backupPath of result.values()) {
        expect(backupPath).toContain('_backup_');
        expect(backupPath).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      }
    });

    it('should skip non-existent files', async () => {
      mockFs.promises.access.mockRejectedValue(new Error('File not found'));

      const result = await outputManager.createBackups(mockFiles);

      expect(mockFs.promises.copyFile).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });

    it('should throw error when backup creation fails', async () => {
      mockFs.promises.access.mockResolvedValue(undefined);
      mockFs.promises.copyFile.mockRejectedValue(new Error('Disk full'));

      await expect(outputManager.createBackups([mockFiles[0]])).rejects.toThrow(
        'Failed to create backup for /output/doc1.pdf',
      );
    });

    it("should handle mixed scenarios (some exist, some don't)", async () => {
      mockFs.promises.access.mockImplementation((filePath) => {
        if (filePath === '/output/doc1.pdf') {
          return Promise.resolve(); // Exists
        }
        return Promise.reject(new Error('File not found')); // Doesn't exist
      });

      mockFs.promises.copyFile.mockResolvedValue(undefined);

      const result = await outputManager.createBackups(mockFiles);

      expect(mockFs.promises.copyFile).toHaveBeenCalledTimes(1);
      expect(result.size).toBe(1);
      expect(result.has('/output/doc1.pdf')).toBe(true);
      expect(result.has('/output/subdir/doc2.pdf')).toBe(false);
    });
  });

  describe('restoreBackups', () => {
    it('should restore all backups and cleanup backup files', async () => {
      const backups = new Map([
        ['/output/doc1.pdf', '/output/doc1_backup_2023-01-01T12-00-00.pdf'],
        ['/output/doc2.pdf', '/output/doc2_backup_2023-01-01T12-00-00.pdf'],
      ]);

      mockFs.promises.copyFile.mockResolvedValue(undefined);
      mockFs.promises.unlink.mockResolvedValue(undefined);

      await outputManager.restoreBackups(backups);

      expect(mockFs.promises.copyFile).toHaveBeenCalledTimes(2);
      expect(mockFs.promises.unlink).toHaveBeenCalledTimes(2);

      // Verify correct restore operations
      expect(mockFs.promises.copyFile).toHaveBeenCalledWith(
        '/output/doc1_backup_2023-01-01T12-00-00.pdf',
        '/output/doc1.pdf',
      );
    });

    it('should handle restore failures gracefully', async () => {
      const backups = new Map([
        ['/output/doc1.pdf', '/output/doc1_backup_2023-01-01T12-00-00.pdf'],
      ]);

      mockFs.promises.copyFile.mockRejectedValue(new Error('Restore failed'));
      mockFs.promises.unlink.mockResolvedValue(undefined);

      await outputManager.restoreBackups(backups);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to restore backup: /output/doc1.pdf',
        expect.any(Error),
      );
    });

    it('should handle empty backup map', async () => {
      await outputManager.restoreBackups(new Map());

      expect(mockFs.promises.copyFile).not.toHaveBeenCalled();
      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
    });
  });

  describe('private method integration tests', () => {
    describe('filename validation', () => {
      it('should reject filenames with invalid characters', async () => {
        const invalidFiles = [
          { ...mockFiles[0], outputPath: '/output/file<test>.pdf' },
          { ...mockFiles[0], outputPath: '/output/file:test.pdf' },
          { ...mockFiles[0], outputPath: '/output/file"test.pdf' },
          { ...mockFiles[0], outputPath: '/output/file|test.pdf' },
          { ...mockFiles[0], outputPath: '/output/file?test.pdf' },
          { ...mockFiles[0], outputPath: '/output/file*test.pdf' },
        ];

        mockFs.promises.mkdir.mockResolvedValue(undefined);
        mockFs.promises.access.mockResolvedValue(undefined);

        for (const file of invalidFiles) {
          const result = await outputManager.validateOutputPaths([file]);
          expect(result.invalid).toHaveLength(1);
          expect(result.invalid[0].error.type).toBe(ErrorType.INVALID_FORMAT);
        }
      });

      it('should reject reserved Windows filenames', async () => {
        const reservedFiles = [
          { ...mockFiles[0], outputPath: '/output/con.pdf' },
          { ...mockFiles[0], outputPath: '/output/PRN.pdf' },
          { ...mockFiles[0], outputPath: '/output/aux.pdf' },
          { ...mockFiles[0], outputPath: '/output/com1.pdf' },
          { ...mockFiles[0], outputPath: '/output/lpt1.pdf' },
        ];

        mockFs.promises.mkdir.mockResolvedValue(undefined);
        mockFs.promises.access.mockResolvedValue(undefined);

        for (const file of reservedFiles) {
          const result = await outputManager.validateOutputPaths([file]);
          expect(result.invalid).toHaveLength(1);
          expect(result.invalid[0].error.type).toBe(ErrorType.INVALID_FORMAT);
        }
      });

      it('should reject excessively long filenames', async () => {
        const longName = 'a'.repeat(256); // Exceeds 255 byte limit
        const longFile = {
          ...mockFiles[0],
          outputPath: `/output/${longName}.pdf`,
        };

        mockFs.promises.mkdir.mockResolvedValue(undefined);
        mockFs.promises.access.mockResolvedValue(undefined);

        const result = await outputManager.validateOutputPaths([longFile]);

        expect(result.invalid).toHaveLength(1);
        expect(result.invalid[0].error.type).toBe(ErrorType.INVALID_FORMAT);
      });

      it('should accept valid filenames', async () => {
        const validFiles = [
          { ...mockFiles[0], outputPath: '/output/valid-file_123.pdf' },
          { ...mockFiles[0], outputPath: '/output/文档.pdf' }, // Unicode
          { ...mockFiles[0], outputPath: '/output/file with spaces.pdf' },
        ];

        mockFs.promises.mkdir.mockResolvedValue(undefined);
        mockFs.promises.access.mockResolvedValue(undefined);

        for (const file of validFiles) {
          const result = await outputManager.validateOutputPaths([file]);
          expect(result.valid).toHaveLength(1);
          expect(result.invalid).toHaveLength(0);
        }
      });
    });

    describe('error creation', () => {
      it('should create standardized errors with all properties', async () => {
        mockFs.promises.mkdir.mockRejectedValue(new Error('Test error'));

        try {
          await outputManager.prepareOutputDirectories([mockFiles[0]]);
        } catch (error: unknown) {
          const e = error as {
            type: ErrorType;
            message: string;
            details?: unknown;
            suggestions?: unknown[];
          };
          expect(e.type).toBe(ErrorType.SYSTEM_ERROR);
          expect(e.message).toContain('Failed to create directory');
          expect(e.details).toBeDefined();
          expect(e.suggestions).toBeDefined();
          expect(Array.isArray(e.suggestions)).toBe(true);
        }
      });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle very large file lists efficiently', async () => {
      const largeFileList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockFiles[0],
        inputPath: `/input/doc${i}.md`,
        outputPath: `/output/doc${i}.pdf`,
        relativeInputPath: `doc${i}.md`,
      }));

      mockFs.promises.mkdir.mockResolvedValue(undefined);

      const startTime = Date.now();
      await outputManager.prepareOutputDirectories(largeFileList);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith('/output', {
        recursive: true,
      });
    });

    it('should handle paths with complex directory structures', async () => {
      const complexFiles = [
        {
          ...mockFiles[0],
          outputPath: '/output/very/deep/nested/directory/structure/file.pdf',
        },
      ];

      mockFs.promises.mkdir.mockResolvedValue(undefined);

      await outputManager.prepareOutputDirectories(complexFiles);

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        '/output/very/deep/nested/directory/structure',
        { recursive: true },
      );
    });
  });
});
