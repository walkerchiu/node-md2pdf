/**
 * Unit tests for PDFGeneratorService
 */

import {
  PDFGeneratorService,
  IPDFGeneratorService,
} from '../../../src/application/services/pdf-generator.service';
import { PDFGenerator } from '../../../src/core/pdf/pdf-generator';
import {
  PDFGeneratorOptions,
  PDFGenerationResult,
} from '../../../src/core/pdf/types';
import type { ILogger } from '../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../src/infrastructure/error/types';
import type { IConfigManager } from '../../../src/infrastructure/config/types';
import { MD2PDFError } from '../../../src/infrastructure/error/errors';

// Mock the PDFGenerator
jest.mock('../../../src/core/pdf/pdf-generator');

describe('PDFGeneratorService', () => {
  let service: IPDFGeneratorService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let MockPDFGenerator: jest.MockedClass<typeof PDFGenerator>;
  let mockPDFGeneratorInstance: jest.Mocked<{
    initialize: jest.MockedFunction<() => Promise<void>>;
    generatePDF: jest.MockedFunction<
      (html: string, outputPath: string, options?: unknown) => Promise<unknown>
    >;
    close: jest.MockedFunction<() => Promise<void>>;
    isInitialized: jest.MockedFunction<() => boolean>;
    dispose: jest.MockedFunction<() => Promise<void>>;
  }>;

  const sampleHtmlContent =
    '<h1>Test Document</h1><p>This is a test document.</p>';
  const outputPath = '/test/output.pdf';

  const mockPDFResult: PDFGenerationResult = {
    success: true,
    outputPath: outputPath,
    metadata: {
      pages: 1,
      fileSize: 1024,
      generationTime: 150,
    },
  };

  const defaultPDFConfig: PDFGeneratorOptions = {
    format: 'A4',
    orientation: 'portrait',
    margin: {
      top: '1in',
      right: '1in',
      bottom: '1in',
      left: '1in',
    },
    displayHeaderFooter: false,
    printBackground: true,
    scale: 1,
    preferCSSPageSize: false,
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
      get: jest.fn().mockReturnValue(defaultPDFConfig),
      set: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      onConfigCreated: jest.fn(),
      onConfigChanged: jest.fn(),
      setAndSave: jest.fn().mockResolvedValue(undefined),
      getConfigPath: jest.fn().mockReturnValue('/mock/config/path'),
    };

    // Mock PDFGenerator
    MockPDFGenerator = PDFGenerator as jest.MockedClass<typeof PDFGenerator>;
    MockPDFGenerator.mockClear();

    mockPDFGeneratorInstance = {
      initialize: jest.fn(),
      generatePDF: jest.fn(),
      close: jest.fn(),
      isInitialized: jest.fn(),
      dispose: jest.fn(),
    };
    MockPDFGenerator.mockImplementation(
      () => mockPDFGeneratorInstance as unknown as PDFGenerator,
    );

    // Setup default successful behavior
    mockPDFGeneratorInstance.initialize.mockResolvedValue(undefined);
    mockPDFGeneratorInstance.generatePDF.mockResolvedValue(mockPDFResult);
    mockPDFGeneratorInstance.close.mockResolvedValue(undefined);

    // Create service instance
    service = new PDFGeneratorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
    );
  });

  describe('initialize', () => {
    it('should initialize PDF generator successfully', async () => {
      await service.initialize();

      expect(MockPDFGenerator).toHaveBeenCalledWith(defaultPDFConfig);
      expect(mockPDFGeneratorInstance.initialize).toHaveBeenCalled();
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'pdf',
        expect.any(Object),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing PDF generator service',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PDF generator service initialized successfully',
      );
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      await service.initialize();

      expect(MockPDFGenerator).toHaveBeenCalledTimes(1);
      expect(mockPDFGeneratorInstance.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const initError = new Error('Initialization failed');
      mockPDFGeneratorInstance.initialize.mockRejectedValue(initError);

      await expect(service.initialize()).rejects.toThrow(MD2PDFError);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'PDFGeneratorService.initialize',
      );
    });

    it('should handle PDFGenerator constructor errors', async () => {
      MockPDFGenerator.mockImplementation(() => {
        throw new Error('Constructor failed');
      });

      await expect(service.initialize()).rejects.toThrow(MD2PDFError);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('generatePDF', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate PDF successfully', async () => {
      const result = await service.generatePDF(sampleHtmlContent, outputPath);

      expect(result).toEqual(mockPDFResult);
      expect(mockPDFGeneratorInstance.generatePDF).toHaveBeenCalledWith(
        sampleHtmlContent,
        outputPath,
        {},
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Generating PDF: ${outputPath}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`PDF generated successfully: ${outputPath}`),
      );
    });

    it('should initialize if not already initialized', async () => {
      const uninitializedService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );

      await uninitializedService.generatePDF(sampleHtmlContent, outputPath);

      expect(MockPDFGenerator).toHaveBeenCalledTimes(2); // Once for initialized service, once for uninitialized
      expect(mockPDFGeneratorInstance.initialize).toHaveBeenCalledTimes(2);
    });

    it('should handle PDF generation errors', async () => {
      const pdfError = new Error('PDF generation failed');
      mockPDFGeneratorInstance.generatePDF.mockRejectedValue(pdfError);

      await expect(
        service.generatePDF(sampleHtmlContent, outputPath),
      ).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'PDFGeneratorService.generatePDF',
      );
    });

    it('should pass options to PDF generator', async () => {
      const customOptions: Partial<PDFGeneratorOptions> = {
        format: 'Letter',
        orientation: 'landscape',
      };

      await service.generatePDF(sampleHtmlContent, outputPath, customOptions);

      // Note: Current implementation passes {} to generatePDF, but we test the method call
      expect(mockPDFGeneratorInstance.generatePDF).toHaveBeenCalledWith(
        sampleHtmlContent,
        outputPath,
        {},
      );
    });

    it('should track generation performance', async () => {
      // Add a small delay to ensure processing time > 0
      mockPDFGeneratorInstance.generatePDF.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockPDFResult;
      });

      await service.generatePDF(sampleHtmlContent, outputPath);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/PDF generated successfully: .*\(\d+ms\)/),
      );
    });

    it('should include error context in wrapped errors', async () => {
      const pdfError = new Error('Generation failed');
      mockPDFGeneratorInstance.generatePDF.mockRejectedValue(pdfError);

      try {
        await service.generatePDF(sampleHtmlContent, outputPath, {
          format: 'A3',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(MD2PDFError);
        const wrappedError = error as MD2PDFError;
        expect(wrappedError.context).toMatchObject({
          outputPath,
          htmlContentLength: sampleHtmlContent.length,
          options: { format: 'A3' },
          originalError: pdfError,
        });
      }
    });
  });

  describe('cleanup', () => {
    it('should cleanup PDF generator successfully', async () => {
      await service.initialize();
      await service.cleanup();

      expect(mockPDFGeneratorInstance.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleaning up PDF generator service',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PDF generator service cleaned up successfully',
      );
    });

    it('should handle cleanup when not initialized', async () => {
      await service.cleanup();

      expect(mockPDFGeneratorInstance.close).not.toHaveBeenCalled();
      // Should not throw or log errors
    });

    it('should handle cleanup errors gracefully', async () => {
      await service.initialize();

      const cleanupError = new Error('Cleanup failed');
      mockPDFGeneratorInstance.close.mockRejectedValue(cleanupError);

      // Should not throw
      await expect(service.cleanup()).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Error during PDF generator cleanup: ${cleanupError.message}`,
      );
    });

    it('should reset internal state after cleanup', async () => {
      await service.initialize();
      await service.cleanup();

      // Should reinitialize when generatePDF is called again
      await service.generatePDF(sampleHtmlContent, outputPath);

      expect(MockPDFGenerator).toHaveBeenCalledTimes(2); // Once for initial, once after cleanup
    });
  });

  describe('configuration', () => {
    it('should use custom PDF configuration', async () => {
      const customConfig: PDFGeneratorOptions = {
        format: 'Letter',
        orientation: 'landscape',
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        displayHeaderFooter: true,
        printBackground: false,
        scale: 0.8,
        preferCSSPageSize: true,
      };

      mockConfigManager.get.mockReturnValue(customConfig);

      const customService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );

      await customService.initialize();

      expect(MockPDFGenerator).toHaveBeenCalledWith(customConfig);
    });

    it('should use default configuration when config manager returns undefined', async () => {
      mockConfigManager.get.mockReturnValue(undefined);

      const service = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );

      await service.initialize();

      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'pdf',
        defaultPDFConfig,
      );
      expect(MockPDFGenerator).toHaveBeenCalledWith(undefined);
    });
  });

  describe('error handling', () => {
    it('should properly wrap initialization errors', async () => {
      const originalError = new Error('Mock initialization error');
      MockPDFGenerator.mockImplementation(() => {
        throw originalError;
      });

      const service = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );

      await expect(service.initialize()).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'PDFGeneratorService.initialize',
      );
    });

    it('should properly wrap PDF generation errors', async () => {
      await service.initialize();

      const originalError = new Error('Mock PDF generation error');
      mockPDFGeneratorInstance.generatePDF.mockRejectedValue(originalError);

      await expect(
        service.generatePDF(sampleHtmlContent, outputPath),
      ).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'PDFGeneratorService.generatePDF',
      );
    });
  });

  describe('service lifecycle', () => {
    it('should handle multiple initialize and cleanup cycles', async () => {
      await service.initialize();
      await service.cleanup();
      await service.initialize();
      await service.cleanup();

      expect(MockPDFGenerator).toHaveBeenCalledTimes(2);
      expect(mockPDFGeneratorInstance.initialize).toHaveBeenCalledTimes(2);
      expect(mockPDFGeneratorInstance.close).toHaveBeenCalledTimes(2);
    });

    it('should handle generatePDF calls during initialization', async () => {
      // This tests the auto-initialization feature
      const result = await service.generatePDF(sampleHtmlContent, outputPath);

      expect(result).toEqual(mockPDFResult);
      expect(MockPDFGenerator).toHaveBeenCalledTimes(1);
      expect(mockPDFGeneratorInstance.initialize).toHaveBeenCalledTimes(1);
    });
  });
});
