/**
 * Integration tests for CLI modules
 * Tests the interaction between CLI components and application services
 */

import { jest } from '@jest/globals';
import { MainInteractiveMode } from '../../src/cli/main-interactive';
import { InteractiveMode } from '../../src/cli/interactive';
import { BatchInteractiveMode } from '../../src/cli/batch';
import { ApplicationServices } from '../../src/application/container';
import type { ServiceContainer } from '../../src/shared/container';
import type { IFileProcessorService } from '../../src/application/services/file-processor.service';
import type { IBatchProcessorService } from '../../src/application/services/batch-processor.service';
import type { IErrorHandler } from '../../src/infrastructure/error/types';
import type { ILogger } from '../../src/infrastructure/logging/types';
import type { IConfigManager } from '../../src/infrastructure/config/types';

// Mock external dependencies that require system resources
jest.mock('inquirer', () => ({
  default: {
    prompt: jest.fn(),
  },
}));

jest.mock('chalk', () => ({
  cyan: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text),
  bold: jest.fn((text: string) => text),
}));

jest.mock('ora', () => ({
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    text: '',
  })),
}));

describe('CLI Integration Tests', () => {
  let container: ServiceContainer;
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create application container for integration tests
    container = ApplicationServices.createContainer();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('MainInteractiveMode Integration', () => {
    it('should initialize with application services container', () => {
      const mainMode = new MainInteractiveMode(container);
      expect(mainMode).toBeInstanceOf(MainInteractiveMode);
    });

    it('should be able to create and start single mode', async () => {
      const inquirer = await import('inquirer');
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      ).mockResolvedValue({ mode: 'single' });

      // Mock InteractiveMode to avoid actual file processing
      const mockInteractiveStart = jest.fn(async () => {});
      jest
        .spyOn(InteractiveMode.prototype, 'start')
        .mockImplementation(
          mockInteractiveStart as unknown as () => Promise<void>,
        );

      const mainMode = new MainInteractiveMode(container);
      await mainMode.start();

      expect(mockInteractiveStart).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MD2PDF Main Menu'),
      );
    });

    it('should be able to create and start batch mode', async () => {
      const inquirer = await import('inquirer');
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      ).mockResolvedValue({ mode: 'batch' });

      // Mock BatchInteractiveMode to avoid actual batch processing
      const mockBatchStart = jest.fn(async () => {});
      jest
        .spyOn(BatchInteractiveMode.prototype, 'start')
        .mockImplementation(mockBatchStart as unknown as () => Promise<void>);

      const mainMode = new MainInteractiveMode(container);
      await mainMode.start();

      expect(mockBatchStart).toHaveBeenCalled();
    });

    it('should handle exit mode gracefully', async () => {
      const inquirer = await import('inquirer');
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      ).mockResolvedValue({ mode: 'exit' });

      const mainMode = new MainInteractiveMode(container);
      await mainMode.start();

      expect(consoleSpy).toHaveBeenCalledWith('👋 Goodbye!');
    });
  });

  describe('InteractiveMode Integration', () => {
    it('should initialize with application services', () => {
      const interactiveMode = new InteractiveMode(container);
      expect(interactiveMode).toBeInstanceOf(InteractiveMode);
    });

    it('should be able to access file processor service', async () => {
      const inquirer = await import('inquirer');
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      )
        .mockResolvedValueOnce({ inputPath: 'test.md' })
        .mockResolvedValueOnce({
          outputPath: 'test.pdf',
          tocDepth: 2,
          includePageNumbers: true,
          chineseFontSupport: false,
        })
        .mockResolvedValueOnce({ confirmed: false });

      const interactiveMode = new InteractiveMode(container);

      // Should not throw when accessing services
      await expect(interactiveMode.start()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('❌ Conversion cancelled');
    });

    it('should validate configuration flow', async () => {
      const inquirer = await import('inquirer');
      const mockConfig = {
        inputPath: 'test.md',
        outputPath: 'test.pdf',
        tocDepth: 2,
        includePageNumbers: true,
        chineseFontSupport: true,
      };

      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      )
        .mockResolvedValueOnce({ inputPath: mockConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConfig.outputPath,
          tocDepth: mockConfig.tocDepth,
          includePageNumbers: mockConfig.includePageNumbers,
          chineseFontSupport: mockConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      // Mock file processor service to avoid actual file operations
      const fileProcessorService = container.resolve(
        'fileProcessor',
      ) as unknown as IFileProcessorService;
      jest.spyOn(fileProcessorService, 'processFile').mockResolvedValue({
        success: true,
        inputPath: 'test.md',
        outputPath: 'test.pdf',
        processingTime: 1000,
        fileSize: 1024,
        parsedContent: { headings: [] },
        pdfResult: {
          success: true,
          outputPath: 'test.pdf',
          metadata: { pages: 1, fileSize: 1024, generationTime: 50 },
        },
      });

      const interactiveMode = new InteractiveMode(container);

      await expect(interactiveMode.start()).resolves.not.toThrow();
      expect(fileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.objectContaining({
          outputPath: 'test.pdf',
          includeTOC: true,
          tocOptions: expect.objectContaining({
            maxDepth: 2,
            includePageNumbers: true,
          }),
        }),
      );
    });
  });

  describe('BatchInteractiveMode Integration', () => {
    it('should initialize with application services', () => {
      const batchMode = new BatchInteractiveMode(container);
      expect(batchMode).toBeInstanceOf(BatchInteractiveMode);
    });

    it('should be able to access batch processor service', async () => {
      const inquirer = await import('inquirer');

      // Mock the pattern input and confirmation flow
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      )
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: false });

      // Mock process.exit to prevent test termination
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit called');
      });

      const batchMode = new BatchInteractiveMode(container);

      // Should throw because of mocked process.exit, but that means the flow worked
      await expect(batchMode.start()).rejects.toThrow('Process exit called');

      mockExit.mockRestore();
    });

    it('should complete full configuration flow', async () => {
      const inquirer = await import('inquirer');

      // Mock the full configuration flow
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      )
        .mockResolvedValueOnce({ inputPattern: '*.md' })
        .mockResolvedValueOnce({ confirmFiles: true })
        .mockResolvedValueOnce({
          outputDirectory: './output',
          preserveDirectoryStructure: true,
          filenameFormat: 'original',
          tocDepth: 2,
          includePageNumbers: true,
          chineseFontSupport: true,
          maxConcurrentProcesses: 2,
          continueOnError: true,
        })
        .mockResolvedValueOnce({ finalConfirm: false });

      // Mock batch processor service
      const batchProcessorService = container.resolve(
        'batchProcessor',
      ) as unknown as IBatchProcessorService;
      jest
        .spyOn(batchProcessorService, 'estimateBatchSize')
        .mockResolvedValue(3);

      const batchMode = new BatchInteractiveMode(container);

      await expect(batchMode.start()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('❌ Batch processing cancelled');
      expect(batchProcessorService.estimateBatchSize).toHaveBeenCalled();
    });
  });

  describe('Service Container Integration', () => {
    it('should resolve all required services for CLI modules', () => {
      // Test that all services required by CLI are available
      expect(container.resolve('logger')).toBeDefined();
      expect(container.resolve('errorHandler')).toBeDefined();
      expect(container.resolve('config')).toBeDefined();
      expect(container.resolve('fileProcessor')).toBeDefined();
      expect(container.resolve('batchProcessor')).toBeDefined();
    });

    it('should maintain service singletons across CLI modules', () => {
      new MainInteractiveMode(container);
      new InteractiveMode(container);
      new BatchInteractiveMode(container);

      // Services should be the same instance (singletons)
      const logger1 = container.resolve('logger');
      const logger2 = container.resolve('logger');
      expect(logger1).toBe(logger2);
    });

    it('should handle service resolution errors gracefully', () => {
      const emptyContainer = ApplicationServices.createContainer();
      // Clear a required service to test error handling
      emptyContainer.unregister('logger');

      expect(() => {
        new MainInteractiveMode(emptyContainer);
      }).toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    it('should propagate errors through error handler service', async () => {
      const inquirer = await import('inquirer');
      const testError = new Error('Integration test error');
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      ).mockRejectedValue(testError);

      const errorHandler = container.resolve(
        'errorHandler',
      ) as unknown as IErrorHandler;
      const handleErrorSpy = jest.spyOn(errorHandler, 'handleError');

      const interactiveMode = new InteractiveMode(container);

      await expect(interactiveMode.start()).rejects.toThrow(
        'Integration test error',
      );
      expect(handleErrorSpy).toHaveBeenCalledWith(
        testError,
        'InteractiveMode.start',
      );
    });

    it('should log errors through logger service', async () => {
      const inquirer = await import('inquirer');
      const testError = new Error('Logger integration test');
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      ).mockRejectedValue(testError);

      const logger = container.resolve('logger') as unknown as ILogger;
      const logErrorSpy = jest.spyOn(logger, 'error');

      const batchMode = new BatchInteractiveMode(container);

      await expect(batchMode.start()).rejects.toThrow(
        'Logger integration test',
      );
      expect(logErrorSpy).toHaveBeenCalledWith(
        'Batch interactive mode error',
        testError,
      );
    });
  });

  describe('Configuration Integration', () => {
    it('should use configuration service for settings', () => {
      const config = container.resolve('config') as unknown as IConfigManager;
      expect(config).toBeDefined();
      expect(typeof config.get).toBe('function');
      expect(typeof config.set).toBe('function');
    });

    it('should pass configuration to processing services', async () => {
      const inquirer = await import('inquirer');
      (
        inquirer.default.prompt as jest.MockedFunction<
          typeof inquirer.default.prompt
        >
      )
        .mockResolvedValueOnce({ inputPath: 'config-test.md' })
        .mockResolvedValueOnce({
          outputPath: 'config-test.pdf',
          tocDepth: 3,
          includePageNumbers: false,
          chineseFontSupport: false,
        })
        .mockResolvedValueOnce({ confirmed: true });

      // Mock file processor to capture configuration
      const fileProcessorService = container.resolve(
        'fileProcessor',
      ) as unknown as IFileProcessorService;
      const processFileSpy = jest
        .spyOn(fileProcessorService, 'processFile')
        .mockResolvedValue({
          success: true,
          inputPath: 'config-test.md',
          outputPath: 'config-test.pdf',
          processingTime: 500,
          fileSize: 512,
          parsedContent: { headings: [] },
          pdfResult: {
            success: true,
            outputPath: 'config-test.pdf',
            metadata: { pages: 1, fileSize: 512, generationTime: 25 },
          },
        });

      const interactiveMode = new InteractiveMode(container);
      await interactiveMode.start();

      // Verify configuration was passed correctly
      expect(processFileSpy).toHaveBeenCalledWith(
        'config-test.md',
        expect.objectContaining({
          tocOptions: expect.objectContaining({
            maxDepth: 3,
            includePageNumbers: false,
          }),
        }),
      );
    });
  });
});
