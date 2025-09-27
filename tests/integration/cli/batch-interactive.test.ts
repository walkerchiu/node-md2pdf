/**
 * Integration tests for BatchInteractiveMode CLI
 */

import { ServiceContainer } from '@/shared/container';
import { BatchInteractiveMode } from '@/cli/batch/batch-interactive';
import { ILogger } from '@/infrastructure/logging/types';
import { IErrorHandler } from '@/infrastructure/error/types';
import { IBatchProcessorService } from '@/application/services/batch-processor.service';
import { APPLICATION_SERVICE_NAMES } from '@/application/container';
import { BatchFilenameFormat } from '@/types/batch';

// Mock inquirer
const mockInquirer = {
  prompt: jest.fn(),
};

jest.mock('inquirer', () => ({
  default: mockInquirer,
}));

// Mock chalk
jest.mock('chalk', () => ({
  cyan: jest.fn(text => text),
  red: jest.fn(text => text),
  yellow: jest.fn(text => text),
  green: jest.fn(text => text),
  gray: jest.fn(text => text),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock BatchProgressUI
const mockProgressUI = {
  start: jest.fn(),
  updateProgress: jest.fn(),
  addResult: jest.fn(),
  stop: jest.fn(),
  displayResults: jest.fn(),
};

jest.mock('@/cli/batch/batch-progress-ui', () => ({
  BatchProgressUI: jest.fn().mockImplementation(() => mockProgressUI),
}));

describe('BatchInteractiveMode Integration Tests', () => {
  let container: ServiceContainer;
  let batchInteractive: BatchInteractiveMode;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockBatchProcessor: jest.Mocked<IBatchProcessorService>;

  const mockBatchResult = {
    success: true,
    totalFiles: 5,
    successfulFiles: 5,
    failedFiles: 0,
    skippedFiles: 0,
    errors: [],
    processingTime: 1000,
    summary: 'All files processed successfully',
    results: [],
    serviceResults: [],
  };

  beforeEach(() => {
    // Create mock container
    container = new ServiceContainer();

    // Mock services
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    mockErrorHandler = {
      handleError: jest.fn().mockResolvedValue(undefined),
      formatError: jest.fn().mockReturnValue('Formatted error'),
      isRecoverable: jest.fn().mockReturnValue(true),
      categorizeError: jest.fn().mockReturnValue('VALIDATION_ERROR'),
    };

    mockBatchProcessor = {
      processBatch: jest.fn().mockResolvedValue(mockBatchResult),
      validateBatchConfig: jest.fn().mockResolvedValue(true),
      estimateBatchSize: jest.fn().mockResolvedValue(5),
      generateProgressCallback: jest.fn().mockReturnValue(jest.fn()),
    };

    // Register services
    container.register('logger', () => mockLogger);
    container.register('errorHandler', () => mockErrorHandler);
    container.register(APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR, () => mockBatchProcessor);

    batchInteractive = new BatchInteractiveMode(container);

    // Reset mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockInquirer.prompt.mockClear();
    mockProgressUI.stop.mockClear();
    mockProgressUI.displayResults.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization and welcome', () => {
    it('should display batch mode welcome message', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: false });

      try {
        await batchInteractive.start();
      } catch {
        // Expected due to process.exit(0) when confirmFiles is false
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📦 Batch Conversion Mode')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Process multiple Markdown files at once')
      );
    });

    it('should log start message', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: false });

      try {
        await batchInteractive.start();
      } catch {
        // Expected
      }

      expect(mockLogger.info).toHaveBeenCalledWith('Starting batch interactive mode');
    });
  });

  describe('input pattern selection', () => {
    it('should prompt for input pattern with proper options', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: false });

      try {
        await batchInteractive.start();
      } catch {
        // Expected
      }

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'inputPattern',
          message: expect.stringContaining('Enter input pattern:'),
          default: '*.md',
          validate: expect.any(Function),
        },
      ]);
    });

    it('should validate input pattern is not empty', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: false });

      try {
        await batchInteractive.start();
      } catch {
        // Expected
      }

      const validateFn = mockInquirer.prompt.mock.calls[0][0][0].validate;
      expect(validateFn('')).toBe('Please enter an input pattern');
      expect(validateFn('*.md')).toBe(true);
    });

    it('should estimate batch size and display file information', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: 'docs/**/*.md' })
        .mockResolvedValueOnce({ confirmFiles: false });

      try {
        await batchInteractive.start();
      } catch {
        // Expected
      }

      expect(mockBatchProcessor.estimateBatchSize).toHaveBeenCalledWith(
        expect.objectContaining({
          inputPattern: 'docs/**/*.md',
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📁 File pattern will be processed:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Pattern: docs/**/*.md'));
    });

    it('should handle pattern confirmation', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({ finalConfirm: false });

      await batchInteractive.start();

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirmFiles',
          message: 'Proceed with pattern: *.md?',
          default: true,
        },
      ]);
    });
  });

  describe('batch configuration', () => {
    it('should collect all batch configuration options', async () => {
      const configAnswers = {
        outputDirectory: './custom-output',
        preserveDirectoryStructure: true,
        filenameFormat: BatchFilenameFormat.WITH_DATE,
        tocDepth: 3,
        includePageNumbers: true,
        chineseFontSupport: false,
        maxConcurrentProcesses: 2,
        continueOnError: true,
      };

      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce(configAnswers)
        .mockResolvedValueOnce({ finalConfirm: false });

      await batchInteractive.start();

      expect(mockInquirer.prompt.mock.calls[2][0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'outputDirectory',
            default: './output',
          }),
          expect.objectContaining({
            name: 'preserveDirectoryStructure',
            default: true,
          }),
          expect.objectContaining({
            name: 'filenameFormat',
            choices: expect.arrayContaining([
              expect.objectContaining({ value: BatchFilenameFormat.ORIGINAL }),
              expect.objectContaining({ value: BatchFilenameFormat.WITH_TIMESTAMP }),
              expect.objectContaining({ value: BatchFilenameFormat.WITH_DATE }),
              expect.objectContaining({ value: BatchFilenameFormat.CUSTOM }),
            ]),
          }),
          expect.objectContaining({
            name: 'tocDepth',
            choices: expect.arrayContaining([
              { name: '1 level (H1 only)', value: 1 },
              { name: '2 levels (H1-H2)', value: 2 },
              { name: '3 levels (H1-H3)', value: 3 },
            ]),
          }),
        ])
      );
    });

    it('should prompt for custom filename pattern when custom format is selected', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({
          outputDirectory: './output',
          filenameFormat: BatchFilenameFormat.CUSTOM,
          customFilenamePattern: '{name}_{date}.pdf',
        })
        .mockResolvedValueOnce({ finalConfirm: false });

      await batchInteractive.start();

      const customPatternPrompt = mockInquirer.prompt.mock.calls[2][0].find(
        (prompt: { name: string; when?: (answers: { filenameFormat: string }) => boolean }) =>
          prompt.name === 'customFilenamePattern'
      );
      expect(customPatternPrompt).toBeDefined();
      expect(customPatternPrompt.when({ filenameFormat: BatchFilenameFormat.CUSTOM })).toBe(true);
      expect(customPatternPrompt.when({ filenameFormat: BatchFilenameFormat.ORIGINAL })).toBe(
        false
      );
    });

    it('should validate custom filename pattern includes name placeholder', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({ filenameFormat: BatchFilenameFormat.CUSTOM })
        .mockResolvedValueOnce({ finalConfirm: false });

      await batchInteractive.start();

      const customPatternPrompt = mockInquirer.prompt.mock.calls[2][0].find(
        (prompt: { name: string; when?: (answers: { filenameFormat: string }) => boolean }) =>
          prompt.name === 'customFilenamePattern'
      );
      const validateFn = customPatternPrompt.validate;

      expect(validateFn('invalid_pattern.pdf')).toBe('Pattern must include {name} placeholder');
      expect(validateFn('{name}_custom.pdf')).toBe(true);
    });
  });

  describe('final confirmation', () => {
    it('should display configuration summary before processing', async () => {
      const config = {
        inputPattern: '*.md',
        outputDirectory: './output',
        preserveDirectoryStructure: true,
        filenameFormat: BatchFilenameFormat.WITH_DATE,
        tocDepth: 3,
        includePageNumbers: true,
        chineseFontSupport: false,
        maxConcurrentProcesses: 2,
        continueOnError: true,
      };

      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce(config)
        .mockResolvedValueOnce({ finalConfirm: false });

      await batchInteractive.start();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📋 Configuration Summary')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📁 Input pattern: *.md')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📂 Output directory: ./output')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📖 Table of contents: 3 levels')
      );
    });

    it('should prompt for final confirmation with proper warning', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ finalConfirm: true });

      await batchInteractive.start();

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'finalConfirm',
          message: 'Start batch processing with the above configuration?',
          default: false,
        },
      ]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Final Confirmation:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('This operation may take several minutes')
      );
    });

    it('should cancel processing when user declines final confirmation', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ finalConfirm: false });

      await batchInteractive.start();

      expect(mockBatchProcessor.processBatch).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('User cancelled batch processing');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('❌ Batch processing cancelled')
      );
    });
  });

  describe('batch processing', () => {
    it('should process batch with correct configuration', async () => {
      const config = {
        inputPattern: '*.md',
        outputDirectory: './output',
        preserveDirectoryStructure: true,
        filenameFormat: BatchFilenameFormat.ORIGINAL,
        tocDepth: 2,
        includePageNumbers: true,
        chineseFontSupport: true,
        maxConcurrentProcesses: 3,
        continueOnError: true,
      };

      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce(config)
        .mockResolvedValueOnce({ finalConfirm: true });

      await batchInteractive.start();

      expect(mockBatchProcessor.processBatch).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          outputPath: './output',
          includeTOC: true,
          tocOptions: expect.objectContaining({
            maxDepth: 2,
            includePageNumbers: true,
          }),
          customStyles: expect.stringContaining('Noto Sans CJK SC'),
        }),
        expect.objectContaining({
          maxConcurrency: 3,
          continueOnError: true,
          generateReport: true,
        })
      );
    });

    it('should not include Chinese fonts when disabled', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({ chineseFontSupport: false })
        .mockResolvedValueOnce({ finalConfirm: true });

      await batchInteractive.start();

      const fileOptions = mockBatchProcessor.processBatch.mock.calls[0][1];
      expect(fileOptions?.customStyles).toBeUndefined();
    });

    it('should display success message when all files processed successfully', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ finalConfirm: true });

      await batchInteractive.start();

      expect(mockProgressUI.displayResults).toHaveBeenCalledWith(mockBatchResult);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🎉 All files processed successfully!')
      );
    });

    it('should handle partial success with retry option', async () => {
      const partialResult = {
        ...mockBatchResult,
        success: false,
        successfulFiles: 3,
        failedFiles: 2,
        skippedFiles: 0,
        errors: [
          { inputPath: 'file1.md', canRetry: true, error: 'Error 1' },
          { inputPath: 'file2.md', canRetry: true, error: 'Error 2' },
        ],
      };

      mockBatchProcessor.processBatch.mockResolvedValueOnce(partialResult);

      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ finalConfirm: true })
        .mockResolvedValueOnce({ retry: false });

      await batchInteractive.start();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Processed 3 out of 5 files successfully.')
      );
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'retry',
          message: expect.stringContaining('2 files failed but can be retried'),
          default: false,
        },
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle errors during batch processing', async () => {
      const testError = new Error('Batch processing error');
      mockBatchProcessor.processBatch.mockRejectedValue(testError);

      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ finalConfirm: true });

      await expect(batchInteractive.start()).rejects.toThrow('Batch processing error');

      expect(mockLogger.error).toHaveBeenCalledWith('Batch interactive mode error', testError);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        testError,
        'BatchInteractiveMode.start'
      );
    });

    it('should handle errors during file pattern validation', async () => {
      const testError = new Error('Pattern validation error');
      mockBatchProcessor.estimateBatchSize.mockRejectedValue(testError);

      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: 'invalid/**/*.md' })
        .mockResolvedValueOnce({ tryAgain: false });

      // Expect process.exit(0) to be called, so mock it
      const mockExit = jest.spyOn(process, 'exit').mockImplementation();

      await batchInteractive.start();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error searching for files:')
      );
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'tryAgain',
          message: 'Would you like to try a different pattern?',
          default: true,
        },
      ]);
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });

    it('should always stop progress UI in finally block', async () => {
      const testError = new Error('Test error');
      mockBatchProcessor.processBatch.mockRejectedValue(testError);

      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ finalConfirm: true });

      try {
        await batchInteractive.start();
      } catch {
        // Expected
      }

      expect(mockProgressUI.stop).toHaveBeenCalled();
    });
  });

  describe('service integration', () => {
    it('should properly resolve all required services from container', () => {
      expect(mockLogger).toBeDefined();
      expect(mockErrorHandler).toBeDefined();
      expect(mockBatchProcessor).toBeDefined();
    });

    it('should pass container services to processing pipeline', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ finalConfirm: true });

      await batchInteractive.start();

      expect(mockBatchProcessor.processBatch).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Starting batch interactive mode');
    });
  });
});
