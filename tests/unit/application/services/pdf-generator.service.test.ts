/**
 * Advanced PDF Generator Service Unit Tests
 *
 * Tests the advanced PDF generation service functionality including:
 * - Service initialization
 * - PDF generation with engine abstraction
 * - Engine selection strategies
 * - Error handling and cleanup
 */

/// <reference types="jest" />

import { jest } from '@jest/globals';
import type {
  PDFGeneratorService as PDFGeneratorServiceClass,
  IPDFGeneratorService,
} from '../../../../src/application/services/pdf-generator.service';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../../src/infrastructure/error/types';
import type { IConfigManager } from '../../../../src/infrastructure/config/types';
import type {
  ITranslationManager,
  SupportedLocale,
} from '../../../../src/infrastructure/i18n/types';

// Mock all external dependencies to avoid compilation issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockEngineManagerInstance: any;

jest.mock('../../../../src/core/pdf/engines', () => {
  mockEngineManagerInstance = {
    initialize: jest.fn(() => Promise.resolve()),
    generatePDF: jest.fn(() =>
      Promise.resolve({
        success: true,
        outputPath: '/test/output.pdf',
        metadata: {
          pages: 1,
          fileSize: 1_024,
          generationTime: 100,
          engineUsed: 'puppeteer',
        },
      }),
    ),
    cleanup: jest.fn(() => Promise.resolve()),
    getEngineStatus: jest.fn(() => new Map()),
    performHealthChecks: jest.fn(() => Promise.resolve()),
    getAvailableEngines: jest.fn(() => ['puppeteer', 'chrome-headless']),
  };

  return {
    createDefaultEngineManager: jest.fn(() => mockEngineManagerInstance),
    PDFEngineManager: jest.fn(() => mockEngineManagerInstance),
    PDFEngineFactory: jest.fn(),
    HealthFirstSelectionStrategy: jest.fn(),
    PrimaryFirstSelectionStrategy: jest.fn(),
    DEFAULT_ENGINE_CONFIG: {
      primaryEngine: 'puppeteer',
      fallbackEngines: ['chrome-headless'],
      healthCheckInterval: 30000,
      maxRetries: 2,
      retryDelay: 1000,
      enableMetrics: true,
      resourceLimits: {
        maxMemoryUsage: 1024 * 1024 * 1024,
        maxConcurrentTasks: 3,
        taskTimeout: 60000,
      },
    },
  };
});

describe('PDFGeneratorService', () => {
  let PDFGeneratorService: typeof PDFGeneratorServiceClass;

  let service: IPDFGeneratorService;

  // Mock services
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    setLevel: jest.fn(),
    getLevel: jest.fn().mockReturnValue('info'),
  } as unknown as jest.Mocked<ILogger>;

  const mockErrorHandler = {
    handleError: jest.fn(),
    formatError: jest.fn(),
    isRecoverable: jest.fn(),
    categorizeError: jest.fn(),
  } as unknown as jest.Mocked<IErrorHandler>;

  const mockTranslationManager: ITranslationManager = {
    setLocale: jest.fn(),
    getCurrentLocale: jest.fn((): SupportedLocale => 'zh-TW'),
    getSupportedLocales: jest.fn((): SupportedLocale[] => ['en', 'zh-TW']),
    t: jest.fn((key: string) => {
      if (key === 'pdfContent.pageNumber') {
        return '第 {{page}} 頁 / 共 {{totalPages}} 頁';
      }
      return key;
    }),
    translate: jest.fn((key: string, locale: SupportedLocale) => {
      if (key === 'pdfContent.pageNumber') {
        return locale === 'en'
          ? 'Page {{page}} of {{totalPages}}'
          : '第 {{page}} 頁 / 共 {{totalPages}} 頁';
      }
      return key;
    }),
    hasTranslation: jest.fn(() => true),
    loadTranslations: jest.fn(),
    getTranslations: jest.fn(() => ({})),
  };

  const mockConfigManager: IConfigManager = {
    get<T = unknown>(key: string, defaultValue?: T): T {
      const configs: Record<string, unknown> = {
        'pdfEngine.selectionStrategy': 'health-first',
        'pdfEngine.primaryEngine': 'puppeteer',
        pdf: {
          format: 'A4',
          orientation: 'portrait',
          margin: {
            top: '0.75in',
            right: '0.75in',
            bottom: '0.75in',
            left: '0.75in',
          },
          displayHeaderFooter: false,
          printBackground: true,
          scale: 1,
          preferCSSPageSize: false,
        },
      };

      return configs[key] !== undefined
        ? (configs[key] as unknown as T)
        : (defaultValue as T);
    },
    set: (_key: string, _value: unknown) => {},
    has: (_key: string) => false,
    getAll: () => ({}),
    save: async () => {},
    onConfigCreated: () => {},
    onConfigChanged: () => {},
    setAndSave: async () => {},
    getConfigPath: () => '/mock/config/path',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Dynamically import to avoid circular dependencies
    const module = await import(
      '../../../../src/application/services/pdf-generator.service'
    );
    PDFGeneratorService = module.PDFGeneratorService;

    service = new PDFGeneratorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
      mockTranslationManager,
    );
  });

  describe('Service Lifecycle', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PDFGeneratorService);
    });

    it('should initialize successfully', async () => {
      await service.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Advanced PDF generator service initialized successfully',
      );
    });

    it('should not initialize twice', async () => {
      await service.initialize();
      jest.clearAllMocks(); // Clear previous calls
      await service.initialize();

      // Should not initialize again
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Initializing advanced PDF generator service',
      );
    });

    it('should cleanup successfully', async () => {
      await service.initialize();
      await service.cleanup();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Advanced PDF generator service cleaned up successfully',
      );
    });

    it('should handle cleanup without initialization', async () => {
      await service.cleanup();

      // Should not log anything if not initialized
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Cleaning up advanced PDF generator service',
      );
    });
  });

  describe('PDF Generation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate PDF successfully with all options', async () => {
      const result = await service.generatePDF(
        '<html><body>Test Content</body></html>',
        '/test/output.pdf',
        {
          title: 'Test Document',
          customCSS: 'body { font-family: Arial; }',
          enableChineseSupport: true,
          tocOptions: {
            enabled: true,
            maxDepth: 3,
            includePageNumbers: true,
            title: 'Table of Contents',
          },
        },
      );

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/test/output.pdf');
      expect(result.metadata).toMatchObject({
        pages: 1,
        fileSize: 1024,
        generationTime: 100,
        renderingStrategy: 'two-stage',
        pageNumberAccuracy: 'exact',
        enhancedFeatures: expect.any(Array),
        performance: expect.objectContaining({
          preRenderTime: expect.any(Number),
          finalRenderTime: expect.any(Number),
          totalTime: expect.any(Number),
          performanceIncrease: expect.any(Number),
        }),
      });
    });

    it('should generate PDF with minimal options', async () => {
      const result = await service.generatePDF(
        '<html><body>Test</body></html>',
        '/test/minimal.pdf',
      );

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/test/output.pdf');
    });

    it('should auto-initialize if not initialized', async () => {
      const newService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      const result = await newService.generatePDF(
        '<html></html>',
        '/test/auto-init.pdf',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Engine Status and Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return engine status', async () => {
      const status = await service.getEngineStatus();

      expect(status).toBeInstanceOf(Map);
    });

    it('should return empty map when not initialized', async () => {
      const newService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      const status = await newService.getEngineStatus();

      expect(status).toEqual(new Map());
    });
  });

  describe('Configuration and Strategy Selection', () => {
    it('should create health-first strategy by default', async () => {
      const { HealthFirstSelectionStrategy } = await import(
        '../../../../src/core/pdf/engines'
      );

      await service.initialize();

      expect(HealthFirstSelectionStrategy).toHaveBeenCalled();
    });

    it('should create primary-first strategy when configured', async () => {
      // Mock config to return primary-first strategy
      mockConfigManager.get = ((key: string, defaultValue?: unknown) => {
        if (key === 'pdfEngine.selectionStrategy') return 'primary-first';
        if (String(key).includes('primaryEngine')) return 'puppeteer';
        return defaultValue as any;
      }) as IConfigManager['get'];

      // Dynamically import the module to avoid hoisting issues in Jest
      const module = await import('../../../../src/core/pdf/engines');
      const { PrimaryFirstSelectionStrategy } = module;

      await service.initialize();

      expect(PrimaryFirstSelectionStrategy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      // Mock engine manager to throw error on initialize
      mockEngineManagerInstance.initialize.mockRejectedValueOnce(
        new Error('Init failed'),
      );

      try {
        await service.initialize();
        fail('Should have thrown an error');
      } catch (error) {
        expect(mockErrorHandler.handleError).toHaveBeenCalled();
      }
    });

    it('should handle generation errors gracefully', async () => {
      // Mock to simulate generation failure
      const mockResult = {
        success: false,
        error: 'Generation failed',
      };

      // Override the engine manager mock for this test
      const mockEngine = {
        initialize: jest.fn(),
        generatePDF: jest.fn(() => Promise.resolve(mockResult)),
        cleanup: jest.fn(),
        getEngineStatus: jest.fn(() => new Map()),
      };

      (service as unknown as Record<string, unknown>).engineManager =
        mockEngine as unknown as Record<string, unknown>;
      (service as unknown as Record<string, unknown>).isInitialized = true;

      const result = await service.generatePDF(
        '<html></html>',
        '/test/error.pdf',
      );

      expect(result).toEqual({
        success: false,
        error: 'Generation failed',
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      await service.initialize();

      // Mock cleanup to throw error
      mockEngineManagerInstance.cleanup.mockRejectedValueOnce(
        new Error('Cleanup failed'),
      );

      await service.cleanup();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error during advanced PDF generator cleanup: Cleanup failed',
      );
    });
  });

  describe('Metadata Handling', () => {
    it('should handle missing metadata in result', async () => {
      // Mock to return result without metadata
      const mockEngine = {
        initialize: jest.fn(),
        generatePDF: jest.fn(() =>
          Promise.resolve({
            success: true,
            outputPath: '/test/output.pdf',
            metadata: null,
          }),
        ),
        cleanup: jest.fn(),
        getEngineStatus: jest.fn(() => new Map()),
      };

      (service as any).engineManager = mockEngine;
      (service as any).isInitialized = true;

      const result = await service.generatePDF(
        '<html></html>',
        '/test/no-metadata.pdf',
      );

      expect(result.success).toBe(true);
      expect(result.metadata).toMatchObject({
        pages: 0,
        fileSize: 0,
        generationTime: 0,
        renderingStrategy: 'two-stage',
        pageNumberAccuracy: 'exact',
        enhancedFeatures: expect.any(Array),
        performance: expect.objectContaining({
          preRenderTime: expect.any(Number),
          finalRenderTime: expect.any(Number),
          totalTime: expect.any(Number),
          performanceIncrease: expect.any(Number),
        }),
      });
    });
  });

  describe('Logger Integration', () => {
    it('should pass logger to processing context for dynamic content processors', async () => {
      // Mock engine with processing context verification
      const mockEngine = {
        initialize: jest.fn(),
        generatePDF: jest.fn(
          (_htmlContent: string, _outputPath: string, options: any) => {
            // Verify that logger is included in processing context if provided
            if (options && options.processingContext) {
              expect(options.processingContext.logger).toBeDefined();
              expect(typeof options.processingContext.logger.info).toBe(
                'function',
              );
              expect(typeof options.processingContext.logger.error).toBe(
                'function',
              );
            }

            return Promise.resolve({
              success: true,
              outputPath: '/test/output.pdf',
              metadata: {
                pages: 1,
                fileSize: 1024,
                generationTime: 100,
                engineUsed: 'puppeteer',
              },
            });
          },
        ),
        cleanup: jest.fn(),
        getEngineStatus: jest.fn(() => new Map()),
      };

      (service as any).engineManager = mockEngine;
      (service as any).isInitialized = true;

      // Generate PDF with HTML content that would trigger dynamic content processing
      const result = await service.generatePDF(
        '<html><body><h1>Test</h1><pre class="language-plantuml">@startuml\nAlice -> Bob: Hello\n@enduml</pre></body></html>',
        '/test/with-logger.pdf',
      );

      expect(result.success).toBe(true);
      expect(mockEngine.generatePDF).toHaveBeenCalled();
    });

    it('should maintain logger instance throughout service lifecycle', async () => {
      await service.initialize();

      // Verify that the service maintains the logger instance
      expect((service as any).logger).toBe(mockLogger);

      // Test that logger is used in various service operations
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Advanced PDF generator service initialized successfully',
      );

      await service.cleanup();

      // Verify logger is used during cleanup
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Advanced PDF generator service cleaned up successfully',
      );
    });

    it('should handle logger methods correctly in error scenarios', async () => {
      // Mock engine manager to throw error on initialization
      mockEngineManagerInstance.initialize.mockRejectedValueOnce(
        new Error('Logger test initialization failure'),
      );

      try {
        await service.initialize();
      } catch (error) {
        // Verify error handler is called with proper logger context
        expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.stringMatching(/PDFGeneratorService/),
        );
      }

      // Reset mock for cleanup
      mockEngineManagerInstance.initialize.mockResolvedValue(undefined);
    });

    it('should ensure logger availability for dynamic content rendering', () => {
      // Verify that service exposes logger for internal components
      const serviceLogger = (service as any).logger;

      expect(serviceLogger).toBeDefined();
      expect(serviceLogger).toBe(mockLogger);
      expect(typeof serviceLogger.debug).toBe('function');
      expect(typeof serviceLogger.info).toBe('function');
      expect(typeof serviceLogger.warn).toBe('function');
      expect(typeof serviceLogger.error).toBe('function');
    });
  });
});
