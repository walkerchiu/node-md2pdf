/**
 * Unit tests for BatchProcessor
 */

import { jest } from '@jest/globals';
import { BatchProcessor } from '../../../../src/core/batch/batch-processor';
import type { FileCollector as FileCollectorType } from '../../../../src/core/batch/file-collector';
import type { OutputManager as OutputManagerType } from '../../../../src/core/batch/output-manager';
import type { ProgressTracker as ProgressTrackerType } from '../../../../src/core/batch/progress-tracker';
import {
  BatchConversionConfig,
  BatchFileInfo,
  BatchFilenameFormat,
} from '../../../../src/types/batch';
import { ErrorType, MD2PDFError } from '../../../../src/types';

// Mocked classes for constructor checks
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FileCollector } = require('../../../../src/core/batch/file-collector');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { OutputManager } = require('../../../../src/core/batch/output-manager');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  ProgressTracker,
} = require('../../../../src/core/batch/progress-tracker');

// Mock dependencies
jest.mock('../../../../src/core/batch/file-collector');
jest.mock('../../../../src/core/batch/output-manager');
jest.mock('../../../../src/core/batch/progress-tracker');
jest.mock('../../../../src/core/parser');
jest.mock('../../../../src/core/pdf');

describe('BatchProcessor', () => {
  let batchProcessor: BatchProcessor;
  let mockFileCollector: jest.Mocked<FileCollectorType>;
  let mockOutputManager: jest.Mocked<OutputManagerType>;
  let mockProgressTracker: jest.Mocked<ProgressTrackerType>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock FileCollector

    mockFileCollector = {
      collectFiles: jest.fn(),
      validateFiles: jest.fn(),
    } as unknown as jest.Mocked<FileCollectorType>;

    mockOutputManager = {
      resolveFileNameConflicts: jest.fn(),
      validateOutputPaths: jest.fn(),
      prepareOutputDirectories: jest.fn(),
    } as unknown as jest.Mocked<OutputManagerType>;

    mockProgressTracker = {
      on: jest.fn(),
      start: jest.fn(),
      startFile: jest.fn(),
      completeFile: jest.fn(),
      failFile: jest.fn(),
      complete: jest.fn(),
    } as unknown as jest.Mocked<ProgressTrackerType>;

    FileCollector.mockImplementation(() => mockFileCollector);
    OutputManager.mockImplementation(() => mockOutputManager);
    ProgressTracker.mockImplementation(() => mockProgressTracker);

    // Inject mocks to avoid relying on constructor side-effects in tests
    batchProcessor = new BatchProcessor(
      mockFileCollector as unknown as FileCollectorType,
      mockOutputManager as unknown as OutputManagerType,
    );
  });

  describe('Constructor', () => {
    it('should create instance with dependencies', () => {
      expect(batchProcessor).toBeInstanceOf(BatchProcessor);
    });

    it('should use injected FileCollector instance', () => {
      expect(
        (
          batchProcessor as unknown as {
            fileCollector: typeof mockFileCollector;
          }
        ).fileCollector,
      ).toBe(mockFileCollector);
    });

    it('should use injected OutputManager instance', () => {
      expect(
        (
          batchProcessor as unknown as {
            outputManager: typeof mockOutputManager;
          }
        ).outputManager,
      ).toBe(mockOutputManager);
    });
  });

  describe('processBatch', () => {
    let mockConfig: BatchConversionConfig;
    let mockFiles: BatchFileInfo[];

    beforeEach(() => {
      mockConfig = {
        inputPattern: '*.md',
        outputDirectory: './output',
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 2,
        continueOnError: true,
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
        chineseFontSupport: true,
      };

      mockFiles = [
        {
          inputPath: 'test.md',
          outputPath: 'output/test.pdf',
          relativeInputPath: 'test.md',
          size: 1024,
          lastModified: new Date(),
        },
      ];
    });

    it('should handle successful batch processing', async () => {
      // Mock successful flow
      mockFileCollector.collectFiles.mockResolvedValue(mockFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: mockFiles,
        invalid: [],
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(mockFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: mockFiles,
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue(undefined);

      const result = await batchProcessor.processBatch(mockConfig);

      expect(result.success).toBe(true);
      expect(result.totalFiles).toBe(1);
      expect(mockFileCollector.collectFiles).toHaveBeenCalledWith(mockConfig);
      expect(mockFileCollector.validateFiles).toHaveBeenCalled();
      expect(mockOutputManager.resolveFileNameConflicts).toHaveBeenCalled();
      expect(mockOutputManager.validateOutputPaths).toHaveBeenCalled();
      expect(mockOutputManager.prepareOutputDirectories).toHaveBeenCalled();
    });

    it('should handle file collection errors', async () => {
      mockFileCollector.collectFiles.mockRejectedValue(
        new Error('Collection failed'),
      );

      const result = await batchProcessor.processBatch(mockConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.message).toContain(
        'Batch processing failed',
      );
    });

    it('should handle invalid files', async () => {
      const invalidFiles = [
        {
          file: mockFiles[0],
          error: {
            name: 'InvalidFormatError',
            type: ErrorType.INVALID_FORMAT,
            message: 'Invalid file',
          } as MD2PDFError,
        },
      ];

      mockFileCollector.collectFiles.mockResolvedValue(mockFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: [],
        invalid: invalidFiles,
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue([]);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: [],
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue(undefined);

      const result = await batchProcessor.processBatch(mockConfig);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].inputPath).toBe('test.md');
      expect(result.errors[0].canRetry).toBe(false);
    });

    it('should handle output validation errors', async () => {
      const outputInvalidFiles = [
        {
          file: mockFiles[0],
          error: {
            name: 'PermissionDenied',
            type: ErrorType.PERMISSION_DENIED,
            message: 'No permission',
          } as MD2PDFError,
        },
      ];

      mockFileCollector.collectFiles.mockResolvedValue(mockFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: mockFiles,
        invalid: [],
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(mockFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: [],
        invalid: outputInvalidFiles,
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue(undefined);

      const result = await batchProcessor.processBatch(mockConfig);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].canRetry).toBe(false);
    });

    it('should handle progress tracking', async () => {
      mockFileCollector.collectFiles.mockResolvedValue(mockFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: mockFiles,
        invalid: [],
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(mockFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: mockFiles,
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue(undefined);

      const onProgress = jest.fn();
      await batchProcessor.processBatch(mockConfig, { onProgress });

      expect(mockProgressTracker.on).toHaveBeenCalledWith(
        'progress',
        onProgress,
      );
      expect(mockProgressTracker.start).toHaveBeenCalled();
      expect(mockProgressTracker.complete).toHaveBeenCalled();
    });

    it('should handle abort signal cancellation', async () => {
      const abortController = new AbortController();
      abortController.abort();

      mockFileCollector.collectFiles.mockResolvedValue(mockFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: mockFiles,
        invalid: [],
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(mockFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: mockFiles,
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue(undefined);

      const result = await batchProcessor.processBatch(mockConfig, {
        signal: abortController.signal,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.message).toContain(
        'Batch processing failed',
      );
    });

    it('should handle maxConcurrentProcesses limit', async () => {
      const largeConfig = { ...mockConfig, maxConcurrentProcesses: 1 };
      const manyFiles = Array(5)
        .fill(null)
        .map((_, i) => ({
          inputPath: `test${i}.md`,
          outputPath: `output/test${i}.pdf`,
          relativeInputPath: `test${i}.md`,
          size: 1024,
          lastModified: new Date(),
        }));

      mockFileCollector.collectFiles.mockResolvedValue(manyFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: manyFiles,
        invalid: [],
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(manyFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: manyFiles,
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue(undefined);

      const result = await batchProcessor.processBatch(largeConfig);

      expect(result.totalFiles).toBe(5);
      expect(mockOutputManager.prepareOutputDirectories).toHaveBeenCalledWith(
        manyFiles,
      );
    });
  });

  describe('canRetry method tests', () => {
    it('should return correct retry status for different error types', async () => {
      const systemError = {
        file: {
          inputPath: 'test.md',
          outputPath: 'output/test.pdf',
          relativeInputPath: 'test.md',
          size: 1024,
          lastModified: new Date(),
        },
        error: {
          name: 'SystemError',
          type: ErrorType.SYSTEM_ERROR,
          message: 'System error',
        } as MD2PDFError,
      };

      mockFileCollector.collectFiles.mockResolvedValue([systemError.file]);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: [],
        invalid: [systemError],
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue([]);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: [],
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue(undefined);

      const result = await batchProcessor.processBatch({
        inputPattern: '*.md',
        outputDirectory: './output',
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 2,
        continueOnError: true,
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
        chineseFontSupport: true,
      });

      expect(result.errors[0].canRetry).toBe(true);
    });
  });

  describe('cancel method', () => {
    it('should have cancel method', () => {
      expect(typeof batchProcessor.cancel).toBe('function');
    });

    it('should not throw when called', () => {
      expect(() => batchProcessor.cancel()).not.toThrow();
    });
  });
});
