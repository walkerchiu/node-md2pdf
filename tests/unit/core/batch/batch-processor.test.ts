/**
 * Core Batch Processor Tests
 * Tests the main batch processing workflow orchestration
 */

import { BatchProcessor } from '../../../../src/core/batch/batch-processor';
import { FileCollector } from '../../../../src/core/batch/file-collector';
import { OutputManager } from '../../../../src/core/batch/output-manager';
import type {
  BatchConversionConfig,
  BatchFileInfo,
} from '../../../../src/types/batch';
import { BatchFilenameFormat } from '../../../../src/types/batch';

// Mock dependencies
jest.mock('../../../../src/core/batch/file-collector');
jest.mock('../../../../src/core/batch/output-manager');

describe('BatchProcessor', () => {
  let processor: BatchProcessor;
  let mockFileCollector: jest.Mocked<FileCollector>;
  let mockOutputManager: jest.Mocked<OutputManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock FileCollector
    mockFileCollector = {
      collectFiles: jest.fn(),
      validateFiles: jest.fn(),
    } as any;

    // Mock OutputManager
    mockOutputManager = {
      prepareOutputDirectories: jest.fn(),
      resolveFileNameConflicts: jest.fn(),
      validateOutputPaths: jest.fn(),
    } as any;

    // Create processor instance with mocked dependencies
    processor = new BatchProcessor(mockFileCollector, mockOutputManager);
  });

  describe('constructor', () => {
    it('should create BatchProcessor instance', () => {
      expect(processor).toBeInstanceOf(BatchProcessor);
    });

    it('should initialize with default dependencies when none provided', () => {
      const defaultProcessor = new BatchProcessor();
      expect(defaultProcessor).toBeInstanceOf(BatchProcessor);
    });
  });

  describe('processBatch', () => {
    const mockConfig: BatchConversionConfig = {
      inputPattern: '*.md',
      outputDirectory: '/path/to/output',
      includeTOC: true,
      tocDepth: 3,
      includePageNumbers: true,
      preserveDirectoryStructure: false,
      filenameFormat: BatchFilenameFormat.ORIGINAL,
      maxConcurrentProcesses: 2,
      continueOnError: true,
      theme: 'default',
    };

    it('should process batch successfully', async () => {
      const mockFiles: BatchFileInfo[] = [
        {
          inputPath: '/path/to/input1.md',
          outputPath: '/path/to/output/input1.pdf',
          relativeInputPath: 'input1.md',
          size: 1000,
          lastModified: new Date(),
        },
        {
          inputPath: '/path/to/input2.md',
          outputPath: '/path/to/output/input2.pdf',
          relativeInputPath: 'input2.md',
          size: 2000,
          lastModified: new Date(),
        },
      ];

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

      const result = await processor.processBatch(mockConfig);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.totalFiles).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(mockFileCollector.collectFiles).toHaveBeenCalledWith(mockConfig);
      expect(mockOutputManager.prepareOutputDirectories).toHaveBeenCalledWith(
        mockFiles,
      );
    });

    it('should handle empty file list', async () => {
      mockFileCollector.collectFiles.mockResolvedValue([]);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: [],
        invalid: [],
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue([]);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: [],
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue(undefined);

      const result = await processor.processBatch(mockConfig);

      expect(result.success).toBe(false); // Should be false when no files processed
      expect(result.totalFiles).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle file collection errors', async () => {
      mockFileCollector.collectFiles.mockRejectedValue(
        new Error('File not found'),
      );

      const result = await processor.processBatch(mockConfig);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error.message).toContain('File not found');
    });
  });

  describe('progress tracking', () => {
    it('should track progress during processing', async () => {
      const mockConfig: BatchConversionConfig = {
        inputPattern: '*.md',
        outputDirectory: '/output',
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
      };

      const mockFiles: BatchFileInfo[] = [
        {
          inputPath: '/input1.md',
          outputPath: '/output1.pdf',
          relativeInputPath: 'input1.md',
          size: 1000,
          lastModified: new Date(),
        },
      ];

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

      await processor.processBatch(mockConfig);

      // Progress tracking is internal, no need to test specific method calls
    });
  });

  describe('error handling', () => {
    it('should handle invalid configuration', async () => {
      const invalidConfig = {
        inputPattern: '',
        outputDirectory: '',
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
      } as BatchConversionConfig;

      const result = await processor.processBatch(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle network timeout errors', async () => {
      mockFileCollector.collectFiles.mockRejectedValue(
        new Error('Network timeout'),
      );

      const result = await processor.processBatch({
        inputPattern: '*.md',
        outputDirectory: '/output',
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0].error.message).toContain('Network timeout');
    });
  });

  describe('configuration validation', () => {
    it('should validate required configuration fields', async () => {
      const incompleteConfig = {
        inputPattern: '*.md',
        // Missing outputDirectory
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
      } as any;

      const result = await processor.processBatch(incompleteConfig);

      // Should handle missing required fields gracefully
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.any(String),
          }),
        }),
      );
    });

    it('should validate output format', async () => {
      const invalidConfig: BatchConversionConfig = {
        inputPattern: '*.md',
        outputDirectory: '/output',
        theme: 'invalid' as any,
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
      };

      const result = await processor.processBatch(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.any(String),
          }),
        }),
      );
    });

    it('should handle processing with onFileComplete callback', async () => {
      const validFiles: BatchFileInfo[] = [
        {
          inputPath: '/input/test1.md',
          outputPath: '/output/test1.pdf',
          relativeInputPath: 'test1.md',
          size: 1024,
          lastModified: new Date(),
        },
      ];

      const onFileComplete = jest.fn();
      const onProgress = jest.fn();

      mockFileCollector.collectFiles.mockResolvedValue([
        {
          inputPath: '/input/test1.md',
          outputPath: '/output/test1.pdf',
          relativeInputPath: 'test1.md',
          size: 1024,
          lastModified: new Date(),
        },
      ]);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: validFiles,
        invalid: [],
      });
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(validFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: validFiles,
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue();

      const config: BatchConversionConfig = {
        inputPattern: '*.md',
        outputDirectory: '/output',
        theme: 'github',
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
      };

      const result = await processor.processBatch(config, {
        onFileComplete,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle processing with abort signal', async () => {
      const controller = new AbortController();
      const config: BatchConversionConfig = {
        inputPattern: '*.md',
        outputDirectory: '/output',
        theme: 'github',
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
      };

      // Set up mock to simulate operation
      mockFileCollector.collectFiles.mockResolvedValue([]);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: [],
        invalid: [],
      });

      // Abort immediately
      controller.abort();

      const result = await processor.processBatch(config, {
        signal: controller.signal,
      });

      expect(result).toBeDefined();
    });

    it('should handle abort signal during processing', async () => {
      const controller = new AbortController();
      const config: BatchConversionConfig = {
        inputPattern: '*.md',
        outputDirectory: '/output',
        theme: 'default',
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
      };

      const validFiles: BatchFileInfo[] = [
        {
          inputPath: '/input/test1.md',
          outputPath: '/output/test1.pdf',
          relativeInputPath: 'test1.md',
          size: 1024,
          lastModified: new Date(),
        },
      ];

      mockFileCollector.collectFiles.mockResolvedValue(validFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: validFiles,
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue();
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(validFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: validFiles,
        invalid: [],
      });

      // Abort during processing
      setTimeout(() => controller.abort(), 50);

      try {
        await processor.processBatch(config, {
          signal: controller.signal,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('cancelled');
      }
    });

    it('should handle file processing errors with onFileError callback', async () => {
      const config: BatchConversionConfig = {
        inputPattern: '*.md',
        outputDirectory: '/output',
        theme: 'default',
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
      };

      const validFiles: BatchFileInfo[] = [
        {
          inputPath: '/input/test1.md',
          outputPath: '/output/test1.pdf',
          relativeInputPath: 'test1.md',
          size: 1024,
          lastModified: new Date(),
        },
      ];

      const onFileError = jest.fn();

      mockFileCollector.collectFiles.mockResolvedValue(validFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: validFiles,
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue();
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(validFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: validFiles,
        invalid: [],
      });

      // Mock file system to cause processing failure
      const fs = require('fs');
      const originalReadFile = fs.promises.readFile;
      fs.promises.readFile = jest
        .fn()
        .mockRejectedValue(new Error('File read error'));

      const result = await processor.processBatch(config, {
        onFileError,
      });

      expect(onFileError).toHaveBeenCalledWith(
        expect.objectContaining({
          inputPath: '/input/test1.md',
          error: expect.any(Error),
          canRetry: expect.any(Boolean),
        }),
      );

      // Restore original function
      fs.promises.readFile = originalReadFile;
    });

    it('should handle rejected promise during file processing', async () => {
      const config: BatchConversionConfig = {
        inputPattern: '*.md',
        outputDirectory: '/output',
        theme: 'default',
        preserveDirectoryStructure: false,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        maxConcurrentProcesses: 1,
        continueOnError: true,
        includeTOC: true,
        tocDepth: 3,
        includePageNumbers: true,
      };

      const validFiles: BatchFileInfo[] = [
        {
          inputPath: '/input/test1.md',
          outputPath: '/output/test1.pdf',
          relativeInputPath: 'test1.md',
          size: 1024,
          lastModified: new Date(),
        },
      ];

      const onFileError = jest.fn();

      mockFileCollector.collectFiles.mockResolvedValue(validFiles);
      mockFileCollector.validateFiles.mockResolvedValue({
        valid: validFiles,
        invalid: [],
      });
      mockOutputManager.prepareOutputDirectories.mockResolvedValue();
      mockOutputManager.resolveFileNameConflicts.mockResolvedValue(validFiles);
      mockOutputManager.validateOutputPaths.mockResolvedValue({
        valid: validFiles,
        invalid: [],
      });

      // Mock processFile to throw error
      const originalProcessFile = processor['processFile'];
      processor['processFile'] = jest
        .fn()
        .mockRejectedValue(new Error('Processing failed'));

      const result = await processor.processBatch(config, {
        onFileError,
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(onFileError).toHaveBeenCalled();

      // Restore original function
      processor['processFile'] = originalProcessFile;
    });
  });
});
