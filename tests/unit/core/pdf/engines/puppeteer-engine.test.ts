/**
 * PuppeteerPDFEngine tests
 * Tests for the Puppeteer-based PDF generation engine
 */

import { existsSync } from 'fs';

import { PuppeteerPDFEngine } from '../../../../../src/core/pdf/engines/puppeteer-engine';
import {
  PDFGenerationContext,
  PDFEngineOptions,
} from '../../../../../src/core/pdf/engines/types';

// Mock puppeteer
jest.mock('puppeteer', () => {
  const mockPage = {
    // @ts-ignore
    setContent: jest.fn().mockResolvedValue(undefined),
    // @ts-ignore
    pdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
    // @ts-ignore
    close: jest.fn().mockResolvedValue(undefined),
    evaluate: jest
      .fn()
      // @ts-ignore
      .mockResolvedValue(3), // Page count
  };

  // @ts-ignore
  const mockBrowser = {
    // @ts-ignore
    newPage: jest.fn().mockResolvedValue(mockPage),
    // @ts-ignore
    close: jest.fn().mockResolvedValue(undefined),
    // @ts-ignore
    disconnect: jest.fn().mockResolvedValue(undefined),
  };

  return {
    // @ts-ignore
    launch: jest.fn().mockResolvedValue(mockBrowser),
    __mockPage: mockPage,
    __mockBrowser: mockBrowser,
  };
});

// Mock filesystem
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('PuppeteerPDFEngine', () => {
  let engine: PuppeteerPDFEngine;
  const mockContext: PDFGenerationContext = {
    htmlContent: '<html><body><h1>Test Content</h1></body></html>',
    outputPath: '/tmp/test-output.pdf',
    title: 'Test Document',
    customCSS: 'body { font-size: 14px; }',
    enableChineseSupport: false,
  };

  const mockOptions: PDFEngineOptions = {
    format: 'A4',
    orientation: 'portrait',
    margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset puppeteer mocks
    const puppeteer = require('puppeteer');
    // @ts-ignore
    puppeteer.launch.mockResolvedValue(puppeteer.__mockBrowser);
    // @ts-ignore
    puppeteer.__mockPage.setContent.mockResolvedValue(undefined);
    // @ts-ignore
    puppeteer.__mockPage.pdf.mockResolvedValue(Buffer.from('fake-pdf-content'));
    // @ts-ignore
    puppeteer.__mockPage.close.mockResolvedValue(undefined);
    // @ts-ignore
    puppeteer.__mockPage.evaluate.mockResolvedValue(3);
    // @ts-ignore
    puppeteer.__mockBrowser.newPage.mockResolvedValue(puppeteer.__mockPage);
    // @ts-ignore
    puppeteer.__mockBrowser.close.mockResolvedValue(undefined);
    // @ts-ignore
    puppeteer.__mockBrowser.disconnect.mockResolvedValue(undefined);

    engine = new PuppeteerPDFEngine();
    // @ts-ignore
    (existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('Constructor and Basic Properties', () => {
    it('should initialize with correct name and capabilities', () => {
      expect(engine.name).toBe('puppeteer');
      expect(engine.capabilities).toEqual({
        supportedFormats: ['A4', 'A3', 'A5', 'Letter', 'Legal'],
        maxConcurrentJobs: 3,
        supportsCustomCSS: true,
        supportsChineseText: true,
        supportsTOC: true,
        supportsHeaderFooter: true,
      });
    });

    it('should set version from puppeteer package', () => {
      // Version should be either a valid version string or 'unknown'
      expect(typeof engine.version).toBe('string');
    });

    it('should initialize metrics correctly', () => {
      const metrics = engine.getMetrics();
      expect(metrics).toEqual({
        engineName: 'puppeteer',
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        averageTime: 0,
        peakMemoryUsage: 0,
        uptime: expect.any(Number),
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize browser successfully', async () => {
      await engine.initialize();

      const puppeteer = require('puppeteer');
      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: 'new',
          timeout: 10000,
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ]),
        }),
      );

      // Should test browser connection
      expect(puppeteer.__mockBrowser.newPage).toHaveBeenCalled();
      expect(puppeteer.__mockPage.close).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await engine.initialize();
      const puppeteer = require('puppeteer');

      // Clear the mock call count
      puppeteer.launch.mockClear();

      // Initialize again
      await engine.initialize();

      // Should not call launch again
      expect(puppeteer.launch).not.toHaveBeenCalled();
    });

    it('should try multiple browser configurations on failure', async () => {
      const puppeteer = require('puppeteer');
      // @ts-ignore
      puppeteer.launch.mockRejectedValueOnce(new Error('First config failed'));
      // @ts-ignore
      puppeteer.launch.mockResolvedValueOnce(puppeteer.__mockBrowser);

      await engine.initialize();

      expect(puppeteer.launch).toHaveBeenCalledTimes(2);
    });

    it('should handle initialization failure', async () => {
      const puppeteer = require('puppeteer');
      // @ts-ignore
      puppeteer.launch.mockRejectedValue(new Error('All configs failed'));

      await expect(engine.initialize()).rejects.toThrow(
        'Failed to initialize Puppeteer engine',
      );
    });
  });

  describe('PDF Generation', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should generate PDF successfully', async () => {
      const result = await engine.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/test-output.pdf');
      expect(result.metadata).toEqual({
        pages: 3,
        fileSize: expect.any(Number),
        generationTime: expect.any(Number),
        engineUsed: 'puppeteer',
      });

      // Check browser interactions
      const puppeteer = require('puppeteer');
      expect(puppeteer.__mockBrowser.newPage).toHaveBeenCalled();
      expect(puppeteer.__mockPage.setContent).toHaveBeenCalled();
      expect(puppeteer.__mockPage.pdf).toHaveBeenCalled();
      expect(puppeteer.__mockPage.close).toHaveBeenCalled();
    });

    it('should create output directory if not exists', async () => {
      // @ts-ignore
      (existsSync as jest.Mock).mockReturnValue(false);

      await engine.generatePDF(mockContext, mockOptions);

      const { mkdirSync } = require('fs');
      expect(mkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
    });

    it('should validate PDF extension', async () => {
      const invalidContext = {
        ...mockContext,
        outputPath: '/tmp/test-output.txt',
      };

      const result = await engine.generatePDF(invalidContext, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Output path must end with .pdf extension',
      );
    });

    it('should handle PDF generation errors', async () => {
      const puppeteer = require('puppeteer');
      // @ts-ignore
      puppeteer.__mockPage.setContent.mockRejectedValueOnce(
        new Error('Content loading failed'),
      );

      const result = await engine.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF generation failed');
      expect(puppeteer.__mockPage.close).toHaveBeenCalled();
    });

    it('should update metrics on successful generation', async () => {
      await engine.generatePDF(mockContext, mockOptions);

      const metrics = engine.getMetrics();
      expect(metrics.totalTasks).toBe(1);
      expect(metrics.successfulTasks).toBe(1);
      expect(metrics.failedTasks).toBe(0);
      expect(metrics.averageTime).toBeGreaterThanOrEqual(0); // Can be 0 in fast tests
    });

    it('should update metrics on failed generation', async () => {
      const puppeteer = require('puppeteer');
      // @ts-ignore
      puppeteer.__mockPage.pdf.mockRejectedValueOnce(
        new Error('PDF generation failed'),
      );

      await engine.generatePDF(mockContext, mockOptions);

      const metrics = engine.getMetrics();
      expect(metrics.totalTasks).toBe(1);
      expect(metrics.successfulTasks).toBe(0);
      expect(metrics.failedTasks).toBe(1);
      expect(metrics.lastFailure).toEqual({
        timestamp: expect.any(Date),
        error: 'PDF generation failed',
        context: mockContext,
      });
    });

    it('should handle browser not initialized', async () => {
      const uninitializedEngine = new PuppeteerPDFEngine();
      const result = await uninitializedEngine.generatePDF(
        mockContext,
        mockOptions,
      );

      // Should auto-initialize and succeed
      expect(result.success).toBe(true);
    });

    it('should build correct PDF options', async () => {
      await engine.generatePDF(mockContext, mockOptions);

      const puppeteer = require('puppeteer');
      expect(puppeteer.__mockPage.pdf).toHaveBeenCalledWith({
        path: '/tmp/test-output.pdf',
        format: 'A4',
        landscape: false,
        margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
        displayHeaderFooter: false,
        headerTemplate: '',
        footerTemplate: '',
        printBackground: true,
        scale: 1,
        preferCSSPageSize: false,
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when browser is working', async () => {
      const status = await engine.healthCheck();

      expect(status.isHealthy).toBe(true);
      expect(status.engineName).toBe('puppeteer');
      expect(status.version).toBe(engine.version);
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(status.errors).toHaveLength(0);
      expect(status.performance).toEqual({
        averageGenerationTime: 0,
        successRate: 0,
        memoryUsage: expect.any(Number),
      });
    });

    it('should return unhealthy status when browser fails', async () => {
      const puppeteer = require('puppeteer');
      // Override the default mock for this test
      // @ts-ignore
      puppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));

      const uninitializedEngine = new PuppeteerPDFEngine();
      const status = await uninitializedEngine.healthCheck();

      expect(status.isHealthy).toBe(false);
      expect(status.errors.length).toBeGreaterThan(0);
    });

    it('should handle page operation failures', async () => {
      await engine.initialize();
      const puppeteer = require('puppeteer');
      // @ts-ignore
      puppeteer.__mockPage.setContent.mockRejectedValueOnce(
        new Error('Page error'),
      );

      const status = await engine.healthCheck();

      expect(status.isHealthy).toBe(false);
      expect(status.errors).toContainEqual(
        expect.stringContaining('Page operation failed'),
      );
    });
  });

  describe('Resource Management', () => {
    it('should return resource usage information', async () => {
      const usage = await engine.getResourceUsage();

      expect(usage).toEqual({
        memoryUsage: expect.any(Number),
        activeTasks: 0,
        averageTaskTime: 0,
      });
    });

    it('should track active tasks during generation', async () => {
      const puppeteer = require('puppeteer');
      // Make PDF generation take time by adding a delay
      let resolveSetContent: () => void;
      const setContentPromise = new Promise<void>((resolve) => {
        resolveSetContent = resolve;
      });
      // @ts-ignore
      puppeteer.__mockPage.setContent.mockReturnValueOnce(setContentPromise);

      // Start generation but don't await
      const generationPromise = engine.generatePDF(mockContext, mockOptions);

      // Check active tasks immediately
      const usage = await engine.getResourceUsage();
      expect(usage.activeTasks).toBe(1);

      // Complete the generation
      resolveSetContent!();
      await generationPromise;

      // Check active tasks after completion
      const finalUsage = await engine.getResourceUsage();
      expect(finalUsage.activeTasks).toBe(0);
    });

    it('should cleanup browser resources', async () => {
      await engine.initialize();
      const puppeteer = require('puppeteer');

      await engine.cleanup();

      expect(puppeteer.__mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle cleanup timeout and disconnect', async () => {
      await engine.initialize();
      const puppeteer = require('puppeteer');
      // @ts-ignore
      puppeteer.__mockBrowser.close.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Close timeout')), 4000),
          ),
      );

      await engine.cleanup();

      expect(puppeteer.__mockBrowser.disconnect).toHaveBeenCalled();
    });
  });

  describe('Engine Compatibility', () => {
    it('should indicate it can handle any context', async () => {
      const canHandle = await engine.canHandle(mockContext);
      expect(canHandle).toBe(true);
    });

    it('should handle Chinese support context', async () => {
      const chineseContext = {
        ...mockContext,
        enableChineseSupport: true,
      };

      const canHandle = await engine.canHandle(chineseContext);
      expect(canHandle).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle page count evaluation errors', async () => {
      const puppeteer = require('puppeteer');
      // @ts-ignore
      puppeteer.__mockPage.evaluate.mockRejectedValueOnce(
        new Error('Evaluation failed'),
      );

      const result = await engine.generatePDF(mockContext, mockOptions);

      // Should still succeed with default page count
      expect(result.success).toBe(true);
      expect(result.metadata?.pages).toBe(1); // Default fallback
    });

    it('should handle memory usage calculation errors', async () => {
      // Mock process.memoryUsage to throw
      const originalMemoryUsage = process.memoryUsage;
      // @ts-ignore
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory calculation failed');
      });

      const usage = await engine.getResourceUsage();
      expect(usage.memoryUsage).toBe(0); // Fallback value

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle version detection failures', () => {
      // Test version detection when puppeteer package.json is not accessible
      jest.doMock('puppeteer/package.json', () => {
        throw new Error('Package not found');
      });

      const newEngine = new PuppeteerPDFEngine();
      expect(newEngine.version).toBe('unknown');
    });

    it('should handle landscape orientation', async () => {
      const landscapeOptions = {
        ...mockOptions,
        orientation: 'landscape' as const,
      };

      await engine.generatePDF(mockContext, landscapeOptions);

      const puppeteer = require('puppeteer');
      expect(puppeteer.__mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({ landscape: true }),
      );
    });
  });
});
