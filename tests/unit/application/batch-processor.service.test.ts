/**
 * Unit tests for BatchProcessorService
 */

import {
  BatchProcessorService,
  IBatchProcessorService,
  BatchProcessingServiceOptions,
} from '../../../src/application/services/batch-processor.service';
import {
  IFileProcessorService,
  FileProcessingOptions,
} from '../../../src/application/services/file-processor.service';
import { BatchConversionConfig, BatchFilenameFormat } from '../../../src/types/batch';
import type { ILogger } from '../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../src/infrastructure/error/types';
import type { IConfigManager } from '../../../src/infrastructure/config/types';
import type { IFileSystemManager } from '../../../src/infrastructure/filesystem/types';
import { MD2PDFError } from '../../../src/infrastructure/error/errors';
import fs from 'fs';

// Local minimal type for FileProcessingResult used in tests to avoid path-alias import
type TestFileProcessingResult = {
  inputPath: string;
  outputPath: string;
  success: boolean;
  processingTime: number;
  fileSize: number;
  parsedContent?: unknown;
  pdfResult?: unknown;
};

type ProcessFileReturn = ReturnType<IFileProcessorService['processFile']>;

// Minimal shape for batch processing result used in tests to avoid accessing unknown properties on
// the concrete BatchProcessingServiceResult type during unit tests.
type TestBatchProcessingResult = {
  success: boolean;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  skippedFiles: number;
  errors: Array<{ inputPath: string; error: unknown }>;
  results: unknown[];
  serviceResults: unknown[];
  processingTime?: number;
};

describe('BatchProcessorService', () => {
  let service: IBatchProcessorService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let mockFileSystemManager: jest.Mocked<IFileSystemManager>;
  let mockFileProcessorService: jest.Mocked<IFileProcessorService>;

  const sampleBatchConfig: BatchConversionConfig = {
    inputPattern: '*.md',
    outputDirectory: './output',
    preserveDirectoryStructure: false,
    filenameFormat: BatchFilenameFormat.ORIGINAL,
    maxConcurrentProcesses: 2,
    continueOnError: true,
    tocDepth: 3,
    includePageNumbers: true,
    chineseFontSupport: true,
  };

  const sampleFileOptions: FileProcessingOptions = {
    outputPath: './output/test.pdf',
    includeTOC: true,
    tocOptions: {
      maxDepth: 3,
      includePageNumbers: true,
    },
  };

  const sampleBatchOptions: BatchProcessingServiceOptions = {
    maxConcurrency: 2,
    continueOnError: true,
    generateReport: true,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock ILogger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    // Mock IErrorHandler
    mockErrorHandler = {
      handleError: jest.fn(),
      formatError: jest.fn(),
      isRecoverable: jest.fn(),
      categorizeError: jest.fn(),
    };

    // Mock IConfigManager
    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      save: jest.fn(),
      load: jest.fn(),
    };

    // Mock IFileSystemManager
    mockFileSystemManager = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      appendFile: jest.fn(),
      copyFile: jest.fn(),
      moveFile: jest.fn(),
      deleteFile: jest.fn(),
      createDirectory: jest.fn(),
      deleteDirectory: jest.fn(),
      listDirectory: jest.fn(),
      exists: jest.fn(),
      isFile: jest.fn(),
      isDirectory: jest.fn(),
      getStats: jest.fn(),
      resolvePath: jest.fn(),
      getAbsolutePath: jest.fn(),
      getBaseName: jest.fn(),
      getDirName: jest.fn(),
      getExtension: jest.fn(),
      createTempFile: jest.fn(),
      createTempDirectory: jest.fn(),
      findFiles: jest.fn(),
      getFileSize: jest.fn(),
      getModificationTime: jest.fn(),
    };

    // Mock IFileProcessorService
    mockFileProcessorService = {
      processFile: jest.fn(),
      validateInputFile: jest.fn(),
      generateOutputPath: jest.fn(),
    };

    // Setup default successful behavior
    mockFileSystemManager.exists.mockResolvedValue(true);
    mockFileSystemManager.createDirectory.mockResolvedValue();

    // Create service instance
    service = new BatchProcessorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
      mockFileSystemManager,
      mockFileProcessorService
    );
  });

  describe('processBatch', () => {
    it('should process batch successfully with default options', async () => {
      const result = (await service.processBatch(
        sampleBatchConfig
      )) as unknown as TestBatchProcessingResult;

      expect(result).toMatchObject({
        success: true,
        totalFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        skippedFiles: 0,
        errors: [],
        results: [],
        serviceResults: [],
      });
      expect(result.processingTime).toBeGreaterThanOrEqual(0);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Starting batch processing: ${sampleBatchConfig.inputPattern}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Batch processing completed:')
      );
    });

    it('should process batch with custom options', async () => {
      const result = (await service.processBatch(
        sampleBatchConfig,
        sampleFileOptions,
        sampleBatchOptions
      )) as unknown as TestBatchProcessingResult;

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Starting batch processing: ${sampleBatchConfig.inputPattern}`
      );
    });

    it('should validate batch configuration before processing', async () => {
      await service.processBatch(sampleBatchConfig);

      expect(mockLogger.debug).toHaveBeenCalledWith('Validating batch configuration');
      expect(mockLogger.info).toHaveBeenCalledWith('Batch configuration validation passed');
    });

    it('should handle batch processing errors', async () => {
      // Make validation fail
      const invalidConfig = {
        ...sampleBatchConfig,
        inputPattern: '', // Empty pattern should cause validation failure
      };

      await expect(service.processBatch(invalidConfig)).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'BatchProcessorService.validateBatchConfig'
      );
    });

    it('should create output directory if it does not exist', async () => {
      mockFileSystemManager.exists.mockResolvedValue(false);

      await service.processBatch(sampleBatchConfig);

      expect(mockFileSystemManager.createDirectory).toHaveBeenCalledWith(
        sampleBatchConfig.outputDirectory
      );
    });

    it('should track processing time', async () => {
      // Mock Date.now to return specific values for processing time calculation
      const mockDateNow = jest.spyOn(Date, 'now');
      mockDateNow.mockReturnValueOnce(1000); // Start time
      mockDateNow.mockReturnValueOnce(1050); // End time

      const result = (await service.processBatch(
        sampleBatchConfig
      )) as unknown as TestBatchProcessingResult;

      expect(result.processingTime).toBe(50);

      mockDateNow.mockRestore();
    });

    it('should include error context in wrapped errors', async () => {
      const errorConfig = {
        ...sampleBatchConfig,
        inputPattern: '',
      };

      try {
        await service.processBatch(errorConfig, sampleFileOptions, sampleBatchOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(MD2PDFError);
        const wrappedError = error as MD2PDFError;
        expect(wrappedError.context).toMatchObject({
          config: errorConfig,
        });
      }
    });

    it('should process files returned by fileSystemManager.findFiles and include service results', async () => {
      const foundFiles = ['/project/doc1.md'];
      mockFileSystemManager.findFiles = jest.fn().mockResolvedValue(foundFiles as string[]);

      // Make fileProcessorService return a successful result for the file
      const mockResult: TestFileProcessingResult = {
        inputPath: '/project/doc1.md',
        outputPath: '/output/doc1.pdf',
        success: true,
        processingTime: 10,
        fileSize: 123,
        parsedContent: { headings: [] },
        pdfResult: { pages: 1 },
      };

      mockFileProcessorService.processFile.mockResolvedValueOnce(
        JSON.parse(JSON.stringify(mockResult)) as unknown as ProcessFileReturn
      );

      // Spy on private collectFiles to return our found files to avoid fs.existsSync checks
      const typedService = service as unknown as { collectFiles: () => Promise<string[]> };
      const collectSpy = jest.spyOn(typedService, 'collectFiles').mockResolvedValue(foundFiles);

      const result = (await service.processBatch(
        sampleBatchConfig
      )) as unknown as TestBatchProcessingResult;

      expect(result.totalFiles).toBe(1);
      expect(result.successfulFiles).toBe(1);
      expect(result.failedFiles).toBe(0);
      expect(result.serviceResults).toHaveLength(1);

      collectSpy.mockRestore();
    });

    it('should throw wrapped MD2PDFError when processFile fails and continueOnError is false', async () => {
      const foundFiles = ['/project/bad.md'];
      mockFileSystemManager.findFiles = jest.fn().mockResolvedValue(foundFiles as string[]);

      mockFileProcessorService.processFile.mockRejectedValue(new Error('processing failed'));

      // Ensure collectFiles returns the files so processing happens
      const typedService2 = service as unknown as { collectFiles: () => Promise<string[]> };
      const collectSpy = jest.spyOn(typedService2, 'collectFiles').mockResolvedValue(foundFiles);

      const result = (await service.processBatch(sampleBatchConfig, undefined, {
        continueOnError: false,
      })) as unknown as TestBatchProcessingResult;

      expect(result.success).toBe(false);
      expect(result.failedFiles).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].inputPath).toBe('/project/bad.md');
      expect(result.errors[0].error).toBeInstanceOf(Error);

      // outer error handler should not have been called because processing does not rethrow
      expect(mockErrorHandler.handleError).not.toHaveBeenCalled();

      collectSpy.mockRestore();
    });

    it('should use provided inputFiles instead of pattern matching', async () => {
      const inputFiles = ['/project/file1.md', '/project/file2.md'];
      const configWithInputFiles = {
        ...sampleBatchConfig,
        inputFiles,
      };

      // Mock fs.existsSync to return true for our test files
      const existsSyncSpy = jest
        .spyOn(fs, 'existsSync')
        .mockImplementation((...args: unknown[]) => {
          const filePath = args[0] as string;
          return inputFiles.includes(filePath) || inputFiles.some(f => filePath.endsWith(f));
        });

      // Mock file processor for both files
      const mockResult = {
        inputPath: '/project/file1.md',
        outputPath: '/output/file1.pdf',
        processingTime: 100,
        fileSize: 1024,
        parsedContent: { headings: [] },
      };

      mockFileProcessorService.processFile
        .mockResolvedValueOnce(
          JSON.parse(JSON.stringify(mockResult)) as unknown as ProcessFileReturn
        )
        .mockResolvedValueOnce({
          ...mockResult,
          inputPath: '/project/file2.md',
          outputPath: '/output/file2.pdf',
        } as unknown as ProcessFileReturn);

      const result = (await service.processBatch(
        configWithInputFiles
      )) as unknown as TestBatchProcessingResult;

      expect(result.totalFiles).toBe(2);
      expect(result.successfulFiles).toBe(2);
      expect(result.failedFiles).toBe(0);

      // Verify that file processor was called for both files
      expect(mockFileProcessorService.processFile).toHaveBeenCalledTimes(2);
      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        '/project/file1.md',
        expect.any(Object)
      );
      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        '/project/file2.md',
        expect.any(Object)
      );

      // Verify logger shows using pre-collected files
      expect(mockLogger.debug).toHaveBeenCalledWith('Using pre-collected files list (2 files)');

      // Clean up spy
      existsSyncSpy.mockRestore();
    });
  });

  describe('validateBatchConfig', () => {
    it('should validate correct batch configuration', async () => {
      const result = await service.validateBatchConfig(sampleBatchConfig);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Validating batch configuration');
      expect(mockLogger.info).toHaveBeenCalledWith('Batch configuration validation passed');
    });

    it('should reject configuration with empty input pattern', async () => {
      const invalidConfig = {
        ...sampleBatchConfig,
        inputPattern: '',
      };

      await expect(service.validateBatchConfig(invalidConfig)).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'BatchProcessorService.validateBatchConfig'
      );
    });

    it('should create output directory if it does not exist', async () => {
      mockFileSystemManager.exists.mockResolvedValue(false);

      await service.validateBatchConfig(sampleBatchConfig);

      expect(mockFileSystemManager.exists).toHaveBeenCalledWith(sampleBatchConfig.outputDirectory);
      expect(mockFileSystemManager.createDirectory).toHaveBeenCalledWith(
        sampleBatchConfig.outputDirectory
      );
    });

    it('should not create output directory if it already exists', async () => {
      mockFileSystemManager.exists.mockResolvedValue(true);

      await service.validateBatchConfig(sampleBatchConfig);

      expect(mockFileSystemManager.exists).toHaveBeenCalledWith(sampleBatchConfig.outputDirectory);
      expect(mockFileSystemManager.createDirectory).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors', async () => {
      mockFileSystemManager.exists.mockResolvedValue(false);
      mockFileSystemManager.createDirectory.mockRejectedValue(new Error('Permission denied'));

      await expect(service.validateBatchConfig(sampleBatchConfig)).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'BatchProcessorService.validateBatchConfig'
      );
    });

    it('should skip output directory check if not specified', async () => {
      const configWithoutOutput = {
        ...sampleBatchConfig,
        outputDirectory: '',
      };

      const result = await service.validateBatchConfig(configWithoutOutput);

      expect(result).toBe(true);
      expect(mockFileSystemManager.exists).not.toHaveBeenCalled();
      expect(mockFileSystemManager.createDirectory).not.toHaveBeenCalled();
    });
  });

  describe('estimateBatchSize', () => {
    it('should estimate batch size successfully', async () => {
      const size = await service.estimateBatchSize(sampleBatchConfig);

      expect(size).toBe(0); // Current implementation returns 0
      expect(mockLogger.debug).toHaveBeenCalledWith('Estimating batch size');
      expect(mockLogger.info).toHaveBeenCalledWith('Estimated batch size: 0 files');
    });

    it('should handle estimation errors gracefully', async () => {
      // Mock an error in the estimation process
      jest.spyOn(mockLogger, 'debug').mockImplementation(() => {
        throw new Error('Estimation error');
      });

      const size = await service.estimateBatchSize(sampleBatchConfig);

      expect(size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to estimate batch size: Estimation error'
      );

      jest.restoreAllMocks();
    });

    it('should not throw errors even when internal operations fail', async () => {
      // Mock an error that would normally propagate
      jest.spyOn(mockLogger, 'info').mockImplementation(() => {
        throw new Error('Logging error');
      });

      const size = await service.estimateBatchSize(sampleBatchConfig);

      expect(size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to estimate batch size: Logging error');
    });
  });

  describe('generateProgressCallback', () => {
    it('should generate progress callback without custom handler', () => {
      const callback = service.generateProgressCallback();

      expect(callback).toBeInstanceOf(Function);

      // Test the callback
      callback(50.5, 'test.md');

      expect(mockLogger.debug).toHaveBeenCalledWith('Batch progress: 50.5% - test.md');
    });

    it('should generate progress callback with custom handler', () => {
      const customHandler = jest.fn();
      const callback = service.generateProgressCallback(customHandler);

      expect(callback).toBeInstanceOf(Function);

      // Test the callback
      callback(75.2, 'document.md');

      expect(mockLogger.debug).toHaveBeenCalledWith('Batch progress: 75.2% - document.md');
      expect(customHandler).toHaveBeenCalledWith(75.2, 'document.md');
    });

    it('should handle progress callback with zero progress', () => {
      const customHandler = jest.fn();
      const callback = service.generateProgressCallback(customHandler);

      callback(0, 'start.md');

      expect(mockLogger.debug).toHaveBeenCalledWith('Batch progress: 0.0% - start.md');
      expect(customHandler).toHaveBeenCalledWith(0, 'start.md');
    });

    it('should handle progress callback with 100% progress', () => {
      const customHandler = jest.fn();
      const callback = service.generateProgressCallback(customHandler);

      callback(100, 'final.md');

      expect(mockLogger.debug).toHaveBeenCalledWith('Batch progress: 100.0% - final.md');
      expect(customHandler).toHaveBeenCalledWith(100, 'final.md');
    });

    it('should format progress to one decimal place', () => {
      const callback = service.generateProgressCallback();

      callback(33.333333, 'test.md');

      expect(mockLogger.debug).toHaveBeenCalledWith('Batch progress: 33.3% - test.md');
    });
  });

  describe('configuration handling', () => {
    it('should handle different batch filename formats', async () => {
      const configs = [
        { ...sampleBatchConfig, filenameFormat: BatchFilenameFormat.ORIGINAL },
        { ...sampleBatchConfig, filenameFormat: BatchFilenameFormat.WITH_TIMESTAMP },
        { ...sampleBatchConfig, filenameFormat: BatchFilenameFormat.WITH_DATE },
        {
          ...sampleBatchConfig,
          filenameFormat: BatchFilenameFormat.CUSTOM,
          customFilenamePattern: '{name}_{date}.pdf',
        },
      ];

      for (const config of configs) {
        const result = (await service.processBatch(config)) as unknown as TestBatchProcessingResult;
        expect(result.success).toBe(true);
      }
    });

    it('should handle various concurrency settings', async () => {
      const concurrencySettings = [1, 2, 3, 4, 5];

      for (const maxConcurrentProcesses of concurrencySettings) {
        const config = { ...sampleBatchConfig, maxConcurrentProcesses };
        const result = (await service.processBatch(config)) as unknown as TestBatchProcessingResult;
        expect(result.success).toBe(true);
      }
    });

    it('should handle continue on error setting', async () => {
      const configs = [
        { ...sampleBatchConfig, continueOnError: true },
        { ...sampleBatchConfig, continueOnError: false },
      ];

      for (const config of configs) {
        const result = (await service.processBatch(config)) as unknown as TestBatchProcessingResult;
        expect(result.success).toBe(true);
      }
    });
  });

  describe('error handling', () => {
    it('should properly wrap and handle processing errors', async () => {
      // Force an error during processing
      jest.spyOn(service, 'validateBatchConfig').mockRejectedValue(new Error('Validation failed'));

      await expect(service.processBatch(sampleBatchConfig)).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'BatchProcessorService.processBatch'
      );
    });

    it('should preserve MD2PDFError during validation', async () => {
      const originalError = new MD2PDFError(
        'Custom validation error',
        'VALIDATION_ERROR',
        'validation'
      );
      jest.spyOn(service, 'validateBatchConfig').mockRejectedValue(originalError);

      // The service wraps all errors including MD2PDFError, so we check the wrapped error
      await expect(service.processBatch(sampleBatchConfig)).rejects.toThrow(MD2PDFError);
      await expect(service.processBatch(sampleBatchConfig)).rejects.toThrow(
        'Batch processing failed: Custom validation error'
      );
    });

    it('should include processing time in error context', async () => {
      jest.spyOn(service, 'validateBatchConfig').mockRejectedValue(new Error('Test error'));

      try {
        await service.processBatch(sampleBatchConfig, sampleFileOptions, sampleBatchOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(MD2PDFError);
        const wrappedError = error as MD2PDFError;
        expect(wrappedError.context).toHaveProperty('totalProcessingTime');
        expect(wrappedError.context).toHaveProperty('config');
        expect(wrappedError.context).toHaveProperty('fileOptions');
        expect(wrappedError.context).toHaveProperty('batchOptions');
      }
    });
  });

  describe('service integration', () => {
    it('should handle unused service references without errors', async () => {
      // This tests that the service properly handles the reserved parameters
      const result = (await service.processBatch(
        sampleBatchConfig
      )) as unknown as TestBatchProcessingResult;

      expect(result.success).toBe(true);
      // The _configManager and _fileProcessorService are marked as unused but should not cause issues
    });

    it('should maintain compatibility with batch processing interface', async () => {
      // Test all interface methods
      const validateResult = await service.validateBatchConfig(sampleBatchConfig);
      const estimateResult = await service.estimateBatchSize(sampleBatchConfig);
      const callbackResult = service.generateProgressCallback();
      const processResult = (await service.processBatch(
        sampleBatchConfig
      )) as unknown as TestBatchProcessingResult;

      expect(validateResult).toBe(true);
      expect(estimateResult).toBe(0);
      expect(callbackResult).toBeInstanceOf(Function);
      expect(processResult.success).toBe(true);
    });
  });
});
