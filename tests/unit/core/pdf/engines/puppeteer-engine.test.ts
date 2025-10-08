/**
 * Comprehensive Puppeteer engine unit tests
 */

// Hoist mocks for puppeteer so jest.mock is applied before the engine is required
// eslint-disable-next-line no-var
var mockLaunch = jest.fn();
jest.mock('puppeteer', () => ({
  __esModule: true,
  default: { launch: mockLaunch },
  launch: mockLaunch,
}));

// Comprehensive fs/path mocks used by the engine internals.
// eslint-disable-next-line no-var
var mockExistsSync = jest.fn();
// eslint-disable-next-line no-var
var mockMkdirSync = jest.fn();
jest.mock('fs', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: jest.fn(),
}));
jest.mock('path', () => ({
  dirname: jest.fn(() => '/mock/dir'),
  resolve: (...p: string[]): string => p.join('/'),
}));

// Mock PDFTemplates
jest.mock('../../../../../src/core/pdf/templates', () => ({
  PDFTemplates: {
    getFullHTML: jest.fn(
      (content, title, css, _chinese) =>
        `<html><head><title>${title || ''}</title><style>${css || ''}</style></head><body>${content}</body></html>`,
    ),
  },
}));

// require engine
const engineMod = require('../../../../../src/core/pdf/engines/puppeteer-engine');
const PuppeteerPDFEngineCtor =
  engineMod.PuppeteerPDFEngine || engineMod.default || engineMod;

describe('PuppeteerPDFEngine - Comprehensive Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let engine: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockBrowser: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
      close: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(5),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    };

    mockLaunch.mockResolvedValue(mockBrowser);
    mockExistsSync.mockReturnValue(true);

    engine = new PuppeteerPDFEngineCtor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes by calling puppeteer.launch', async () => {
      await engine.initialize();
      expect(mockLaunch).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await engine.initialize();
      mockLaunch.mockClear();
      await engine.initialize();
      expect(mockLaunch).not.toHaveBeenCalled();
    });

    it('should handle initialization failure and retry configs', async () => {
      mockLaunch
        .mockRejectedValueOnce(new Error('First config failed'))
        .mockRejectedValueOnce(new Error('Second config failed'))
        .mockResolvedValueOnce(mockBrowser);

      await engine.initialize();
      expect(mockLaunch).toHaveBeenCalledTimes(3);
    });

    it('should throw error when all configs fail', async () => {
      mockLaunch.mockRejectedValue(new Error('All configs failed'));

      await expect(engine.initialize()).rejects.toThrow(
        'Failed to initialize Puppeteer engine',
      );
    });

    it('should clean up browser on failed initialization', async () => {
      const mockFailedBrowser = {
        close: jest.fn().mockResolvedValue(undefined),
        newPage: jest.fn().mockRejectedValue(new Error('Page creation failed')),
      };

      mockLaunch
        .mockResolvedValueOnce(mockFailedBrowser)
        .mockResolvedValueOnce(mockBrowser);

      await engine.initialize();

      expect(mockFailedBrowser.close).toHaveBeenCalled();
      expect(mockLaunch).toHaveBeenCalledTimes(2);
    });
  });

  describe('health check', () => {
    it('should return healthy when browser is connected', async () => {
      await engine.initialize();
      const health = await engine.healthCheck();

      expect(health.isHealthy).toBe(true);
      expect(health.engineName).toBe('puppeteer');
      expect(health.performance).toBeDefined();
    });

    it('should return unhealthy when page operations fail', async () => {
      mockPage.setContent.mockRejectedValue(new Error('Page error'));

      const health = await engine.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.errors).toContainEqual(
        expect.stringContaining('Page operation failed'),
      );
    });

    it('should return unhealthy when browser initialization fails', async () => {
      mockLaunch.mockRejectedValue(new Error('Launch failed'));

      const health = await engine.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.errors).toContainEqual(
        expect.stringContaining('Health check failed'),
      );
    });
  });

  describe('PDF generation', () => {
    const mockContext = {
      htmlContent: '<h1>Test</h1>',
      outputPath: '/test/output.pdf',
      title: 'Test Document',
      customCSS: 'body { font-size: 12px; }',
      enableChineseSupport: true,
      toc: { enabled: false },
    };

    const mockOptions = {
      format: 'A4',
      orientation: 'portrait',
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
    };

    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
    });

    it('should generate PDF successfully', async () => {
      const result = await engine.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/test/output.pdf');
      expect(result.metadata).toMatchObject({
        pages: 5,
        fileSize: 11,
        engineUsed: 'puppeteer',
      });
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalled();
    });

    it('should create output directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      await engine.generatePDF(mockContext, mockOptions);

      expect(mockMkdirSync).toHaveBeenCalledWith('/mock/dir', {
        recursive: true,
      });
    });

    it('should handle PDF generation errors', async () => {
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      const result = await engine.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF generation failed');
    });

    it('should validate output path extension', async () => {
      const invalidContext = { ...mockContext, outputPath: '/test/output.txt' };

      const result = await engine.generatePDF(invalidContext, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Output path must end with .pdf extension',
      );
    });

    it('should initialize browser if not initialized', async () => {
      const result = await engine.generatePDF(mockContext, mockOptions);

      expect(mockLaunch).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle TOC enabled context', async () => {
      const tocContext = { ...mockContext, toc: { enabled: true } };

      const result = await engine.generatePDF(tocContext, mockOptions);

      expect(result.success).toBe(true);
    });

    it('should handle setContent failure', async () => {
      mockPage.setContent.mockRejectedValue(new Error('Content error'));

      const result = await engine.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content error');
    });

    it('should always close page even on error', async () => {
      mockPage.pdf.mockRejectedValue(new Error('PDF error'));

      await engine.generatePDF(mockContext, mockOptions);

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should build correct PDF options', async () => {
      const customOptions = {
        format: 'A3',
        orientation: 'landscape',
        scale: 0.8,
        displayHeaderFooter: true,
        headerTemplate: '<div>Header</div>',
        footerTemplate: '<div>Footer</div>',
      };

      await engine.generatePDF(mockContext, customOptions);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A3',
          landscape: true,
          scale: 0.8,
          displayHeaderFooter: true,
          headerTemplate: '<div>Header</div>',
          footerTemplate: '<div>Footer</div>',
        }),
      );
    });
  });

  describe('resource management', () => {
    it('should track resource usage', async () => {
      const usage = await engine.getResourceUsage();

      expect(usage).toMatchObject({
        memoryUsage: expect.any(Number),
        activeTasks: 0,
        averageTaskTime: expect.any(Number),
      });
    });

    it('should track active tasks during generation', async () => {
      const mockContext = {
        htmlContent: '<h1>Test</h1>',
        outputPath: '/test/output.pdf',
      };

      // Delay PDF generation to check active tasks
      let resolvePdf: () => void;
      const pdfPromise = new Promise<Buffer>((resolve) => {
        resolvePdf = () => resolve(Buffer.from('pdf'));
      });
      mockPage.pdf.mockReturnValue(pdfPromise);

      const generatePromise = engine.generatePDF(mockContext, {});

      // Check that active tasks increased
      const usage = await engine.getResourceUsage();
      expect(usage.activeTasks).toBe(1);

      // Complete PDF generation
      resolvePdf!();
      await generatePromise;

      // Check that active tasks decreased
      const usageAfter = await engine.getResourceUsage();
      expect(usageAfter.activeTasks).toBe(0);
    });

    it('should cleanup browser on cleanup', async () => {
      await engine.initialize();
      await engine.cleanup();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle cleanup when browser is null', async () => {
      await expect(engine.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup browser close error', async () => {
      await engine.initialize();
      mockBrowser.close.mockRejectedValue(new Error('Close error'));

      await expect(engine.cleanup()).resolves.not.toThrow();
    });
  });

  describe('capabilities and metadata', () => {
    it('should return correct capabilities', () => {
      expect(engine.capabilities).toMatchObject({
        supportedFormats: ['A4', 'A3', 'A5', 'Letter', 'Legal'],
        maxConcurrentJobs: 3,
        supportsCustomCSS: true,
        supportsChineseText: true,
        supportsTOC: true,
        supportsHeaderFooter: true,
      });
    });

    it('should handle can handle check', async () => {
      const context = {
        htmlContent: '<h1>Test</h1>',
        outputPath: '/test/output.pdf',
      };

      const canHandle = await engine.canHandle(context);
      expect(canHandle).toBe(true);
    });

    it('should return metrics', () => {
      const metrics = engine.getMetrics();

      expect(metrics).toMatchObject({
        engineName: 'puppeteer',
        totalTasks: expect.any(Number),
        successfulTasks: expect.any(Number),
        failedTasks: expect.any(Number),
        averageTime: expect.any(Number),
        peakMemoryUsage: expect.any(Number),
        uptime: expect.any(Number),
      });
    });

    it('should have correct name and version', () => {
      expect(engine.name).toBe('puppeteer');
      expect(engine.version).toEqual(expect.any(String));
    });

    it('should update metrics on successful generation', async () => {
      const mockContext = {
        htmlContent: '<h1>Test</h1>',
        outputPath: '/test/output.pdf',
      };

      await engine.generatePDF(mockContext, {});

      const metrics = engine.getMetrics();
      expect(metrics.totalTasks).toBe(1);
      expect(metrics.successfulTasks).toBe(1);
    });

    it('should update metrics on failed generation', async () => {
      mockPage.pdf.mockRejectedValue(new Error('Generation failed'));

      const mockContext = {
        htmlContent: '<h1>Test</h1>',
        outputPath: '/test/output.pdf',
      };

      await engine.generatePDF(mockContext, {});

      const metrics = engine.getMetrics();
      expect(metrics.totalTasks).toBe(1);
      expect(metrics.failedTasks).toBe(1);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle page count evaluation failure', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'));

      const mockContext = {
        htmlContent: '<h1>Test</h1>',
        outputPath: '/test/output.pdf',
      };

      const result = await engine.generatePDF(mockContext, {});

      // Should still succeed, just with unknown page count
      expect(result.success).toBe(true);
      expect(result.metadata?.pages).toBe(1); // fallback value
    });

    it('should handle browser initialization with null browser', async () => {
      mockLaunch.mockResolvedValue(null);

      await expect(engine.initialize()).rejects.toThrow(
        'Failed to initialize Puppeteer engine',
      );
    });

    it('should preserve task counts on error', async () => {
      mockPage.setContent.mockRejectedValue(new Error('Content error'));

      const mockContext = {
        htmlContent: '<h1>Test</h1>',
        outputPath: '/test/output.pdf',
      };

      await engine.generatePDF(mockContext, {});

      const usage = await engine.getResourceUsage();
      expect(usage.activeTasks).toBe(0); // Should return to 0 after error
    });

    it('should handle missing optional context fields', async () => {
      const minimalContext = {
        htmlContent: '<h1>Test</h1>',
        outputPath: '/test/output.pdf',
      };

      const result = await engine.generatePDF(minimalContext, {});

      expect(result.success).toBe(true);
    });
  });
});
