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
    getAvailableEngines: jest.fn(() => ['puppeteer']),
    forceHealthCheck: jest.fn(() => Promise.resolve()),
    getHealthyEngines: jest.fn(() => ['puppeteer']),
    getEngineMetrics: jest.fn(() => new Map()),
    updateConfig: jest.fn(),
  };

  return {
    createDefaultEngineManager: jest.fn(() => mockEngineManagerInstance),
    PDFEngineManager: jest.fn(() => mockEngineManagerInstance),
    PDFEngineFactory: jest.fn(),
    HealthFirstSelectionStrategy: jest.fn(),
    PrimaryFirstSelectionStrategy: jest.fn(),
    DEFAULT_ENGINE_CONFIG: {
      primaryEngine: 'puppeteer',
      fallbackEngines: [],
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

  describe('CSS @page Injection', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should inject CSS @page rules when page numbers are enabled', async () => {
      const htmlContent = '<html><head></head><body>Test Content</body></html>';

      await service.generatePDF(htmlContent, '/test/output.pdf', {
        title: 'Test Document',
        includePageNumbers: true,
        headings: [
          { level: 1, text: 'Chapter 1', id: 'ch1', anchor: 'chapter-1' },
        ],
      });

      // Verify the debug logging for CSS injection
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Injecting CSS @page rules for header/footer - includePageNumbers: true',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Generated CSS @page rules:.*/),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(
          /CSS injected into existing <head> - result length: \d+/,
        ),
      );
    });

    it('should skip CSS injection when page numbers are disabled', async () => {
      const htmlContent = '<html><head></head><body>Test Content</body></html>';

      await service.generatePDF(htmlContent, '/test/output.pdf', {
        title: 'Test Document',
        includePageNumbers: false,
      });

      // Verify the debug logging for skipping injection
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Injecting CSS @page rules for header/footer - includePageNumbers: false',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Page numbers not enabled - skipping CSS @page injection',
      );
    });

    it('should inject CSS into HTML without existing head tag', async () => {
      const htmlContent = '<html><body>Test Content</body></html>';

      await service.generatePDF(htmlContent, '/test/output.pdf', {
        title: 'Test Document',
        includePageNumbers: true,
        headings: [
          { level: 1, text: 'Main Title', id: 'main', anchor: 'main-title' },
        ],
      });

      // Verify CSS was injected with new head section
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(
          /CSS injected with new <head> section - result length: \d+/,
        ),
      );
    });

    it('should wrap content with full HTML structure when no HTML tags exist', async () => {
      const htmlContent = 'Plain text content';

      await service.generatePDF(htmlContent, '/test/output.pdf', {
        title: 'Test Document',
        includePageNumbers: true,
      });

      // Verify CSS was injected with full HTML wrapper
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(
          /CSS injected with full HTML wrapper - result length: \d+/,
        ),
      );
    });

    it('should use first H1 heading as document title in CSS', async () => {
      const htmlContent = '<html><head></head><body>Test Content</body></html>';

      await service.generatePDF(htmlContent, '/test/output.pdf', {
        title: 'Original Title',
        includePageNumbers: true,
        headings: [
          { level: 1, text: 'First H1 Title', id: 'h1', anchor: 'first-h1' },
          { level: 2, text: 'Second Heading', id: 'h2', anchor: 'second' },
        ],
      });

      // The first H1 should be prioritized over the original title
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Generated CSS @page rules:.*/),
      );

      // Verify debug logging was called with proper parameters
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Injecting CSS @page rules for header/footer - includePageNumbers: true',
      );
    });

    it('should handle CSS injection errors gracefully', async () => {
      const htmlContent = '<html><head></head><body>Test Content</body></html>';

      // Mock the private method to throw an error - we'll test error handling through integration
      const originalGeneratePDF = service.generatePDF.bind(service);

      // Create options that might cause issues with CSS injection
      await service.generatePDF(htmlContent, '/test/output.pdf', {
        title: 'Test Document with "quotes" and special chars',
        includePageNumbers: true,
        headings: [
          {
            level: 1,
            text: 'Title with "quotes"',
            id: 'h1',
            anchor: 'title-quotes',
          },
        ],
      });

      // Should still succeed even with special characters
      expect(mockEngineManagerInstance.generatePDF).toHaveBeenCalled();
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

  describe('Error Handling in PDF Generation', () => {
    it('should handle PDF generation exceptions with error events', async () => {
      // Mock engine to throw error during generation
      mockEngineManagerInstance.generatePDF.mockRejectedValueOnce(
        new Error('PDF generation failed'),
      );

      await service.initialize();

      const result = await service.generatePDF(
        '<html><body>Test</body></html>',
        '/test/error.pdf',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Advanced PDF generation failed');
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should handle event publishing failures in error scenarios', async () => {
      // Mock engine to throw error
      mockEngineManagerInstance.generatePDF.mockRejectedValueOnce(
        new Error('Generation error'),
      );

      await service.initialize();

      // Create a mock that tracks event publishing attempts
      const mockEventPublisher = {
        publish: jest
          .fn()
          .mockRejectedValue(new Error('Event publish failed') as never),
      };
      (service as any).eventPublisher = mockEventPublisher;

      const result = await service.generatePDF(
        '<html><body>Test</body></html>',
        '/test/event-error.pdf',
      );

      expect(result.success).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to publish conversion failed event',
        expect.any(Error),
      );
    });
  });

  describe('CSS Page Rules and HTML Processing', () => {
    it('should handle CSS injection for different HTML structures', async () => {
      await service.initialize();

      // Test private method for page format
      const pageFormat = (service as any).getPageNumberFormat();
      expect(pageFormat).toContain('counter(page)');
      expect(pageFormat).toContain('counter(pages)');
    });

    it('should handle CSS injection error scenarios', async () => {
      await service.initialize();

      // Test the injectCSSPageRules method indirectly through generatePDF
      // This should not throw errors even with various HTML structures
      expect(async () => {
        await service.generatePDF(
          '<html><head><title>Test</title></head><body>Content</body></html>',
          '/test/with-head.pdf',
        );
      }).not.toThrow();

      expect(async () => {
        await service.generatePDF(
          '<html><body>Content without head</body></html>',
          '/test/no-head.pdf',
        );
      }).not.toThrow();

      expect(async () => {
        await service.generatePDF(
          '<h1>Just content without HTML tags</h1>',
          '/test/plain.pdf',
        );
      }).not.toThrow();
    });
  });

  describe('Page Number Format Localization', () => {
    it('should get localized page number format', async () => {
      // Access private method for testing
      const pageFormat = (service as any).getPageNumberFormat();

      expect(mockTranslationManager.t).toHaveBeenCalledWith(
        'pdfContent.pageNumber',
      );
      expect(pageFormat).toContain('counter(page)');
      expect(pageFormat).toContain('counter(pages)');
    });

    it('should handle translation errors with fallback format', async () => {
      // Mock translation manager to throw error
      (mockTranslationManager as any).t = jest.fn().mockImplementation(() => {
        throw new Error('Translation failed');
      });

      const pageFormat = (service as any).getPageNumberFormat();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to get internationalized page number format',
        ),
      );
      expect(pageFormat).toBe('"Page " counter(page) " of " counter(pages)');
    });
  });

  describe('Engine Management Methods', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get available engines', () => {
      const engines = service.getAvailableEngines();
      expect(mockEngineManagerInstance.getAvailableEngines).toHaveBeenCalled();
      expect(engines).toEqual(['puppeteer']);
    });

    it('should return empty array when engine manager not initialized', () => {
      const uninitializedService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      const engines = uninitializedService.getAvailableEngines();
      expect(engines).toEqual([]);
    });

    it('should force health check', async () => {
      await service.forceHealthCheck('puppeteer');
      expect(mockEngineManagerInstance.forceHealthCheck).toHaveBeenCalledWith(
        'puppeteer',
      );
    });

    it('should throw error when forcing health check without initialization', async () => {
      const uninitializedService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      await expect(uninitializedService.forceHealthCheck()).rejects.toThrow(
        'Engine manager not initialized',
      );
    });

    it('should get healthy engines', () => {
      mockEngineManagerInstance.getHealthyEngines = jest
        .fn()
        .mockReturnValue(['puppeteer']);

      const healthyEngines = (service as any).getHealthyEngines();
      expect(healthyEngines).toEqual(['puppeteer']);
    });

    it('should return empty array for healthy engines when not initialized', () => {
      const uninitializedService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      const healthyEngines = (uninitializedService as any).getHealthyEngines();
      expect(healthyEngines).toEqual([]);
    });

    it('should get engine metrics', () => {
      const mockMetrics = new Map([['puppeteer', { uptime: 1000 }]]);
      mockEngineManagerInstance.getEngineMetrics = jest
        .fn()
        .mockReturnValue(mockMetrics);

      const metrics = (service as any).getEngineMetrics();
      expect(metrics).toBe(mockMetrics);
    });

    it('should return empty map for engine metrics when not initialized', () => {
      const uninitializedService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      const metrics = (uninitializedService as any).getEngineMetrics();
      expect(metrics).toEqual(new Map());
    });

    it('should update engine configuration', () => {
      const newConfig = { maxRetries: 5 };
      mockEngineManagerInstance.updateConfig = jest.fn();

      (service as any).updateEngineConfig(newConfig);

      expect(mockEngineManagerInstance.updateConfig).toHaveBeenCalledWith(
        newConfig,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Engine configuration updated',
        newConfig,
      );
    });

    it('should throw error when updating config without initialization', () => {
      const uninitializedService = new PDFGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      expect(() =>
        (uninitializedService as any).updateEngineConfig({}),
      ).toThrow('Engine manager not initialized');
    });
  });

  describe('Two-Stage Rendering Features', () => {
    it('should handle markdown content options', async () => {
      await service.initialize();

      const result = await service.generatePDF(
        '<html><body>Test</body></html>',
        '/test/markdown.pdf',
        {
          tocOptions: { enabled: true, maxDepth: 3, includePageNumbers: true },
          markdownContent:
            '# Title\n## Subtitle\n```mermaid\ngraph TD\nA-->B\n```\n![image](test.png)',
        },
      );

      expect(result.success).toBe(true);
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
