import { ChromeHeadlessPDFEngine } from '../../../../../src/core/pdf/engines/chrome-headless-engine';
import { PDFGenerationContext } from '../../../../../src/core/pdf/engines/types';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync, mkdirSync, statSync, Stats } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

// Mock all external dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('os');
jest.mock('path');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
// Unused mocks removed to fix TypeScript warnings
const mockStatSync = statSync as jest.MockedFunction<typeof statSync>;
const mockTmpdir = tmpdir as jest.MockedFunction<typeof tmpdir>;
const mockPath = path as jest.Mocked<typeof path>;

describe('ChromeHeadlessPDFEngine', () => {
  let engine: ChromeHeadlessPDFEngine;
  let mockChildProcess: ChildProcess & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: jest.Mock;
  };
  const sampleOptions = {
    timeout: 30000,
    retries: 3,
    concurrent: false,
  } as unknown as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockTmpdir.mockReturnValue('/tmp');
    mockPath.dirname.mockImplementation((_filePath) => '/output/dir');
    mockPath.resolve.mockImplementation((filePath) => `/resolved${filePath}`);
    mockPath.join.mockImplementation((...paths) => paths.join('/'));

    // Mock child process
    mockChildProcess = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: jest.fn(),
    }) as unknown as ChildProcess & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: jest.Mock;
    };
    mockSpawn.mockReturnValue(mockChildProcess as any);

    // Mock filesystem operations
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 1024 } as Stats);

    engine = new ChromeHeadlessPDFEngine();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should have correct initial properties', () => {
      expect(engine.name).toBe('chrome-headless');
      expect(engine.version).toBe('chrome-headless-1.0');
      expect(engine.capabilities).toEqual({
        supportedFormats: ['A4', 'A3', 'A5', 'Letter', 'Legal'],
        maxConcurrentJobs: 2,
        supportsCustomCSS: true,
        supportsChineseText: true,
        supportsTOC: false,
        supportsHeaderFooter: true,
      });
    });

    it('should initialize successfully when Chrome is found', async () => {
      mockExistsSync.mockReturnValue(true);

      // Start initialization
      const initPromise = engine.initialize();

      // Immediately simulate Chrome version check completion
      setImmediate(() => {
        mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
        mockChildProcess.emit('close', 0);
      });

      await initPromise;

      // Verify Chrome executable search
      expect(mockExistsSync).toHaveBeenCalledWith(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      );
    });

    it('should throw error when Chrome executable not found', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(engine.initialize()).rejects.toThrow(
        'Chrome executable not found. Please install Google Chrome or Chromium.',
      );
    });

    it('should throw error when Chrome test execution fails', async () => {
      mockExistsSync.mockReturnValue(true);

      const initPromise = engine.initialize();

      // Immediately simulate Chrome test failure
      setImmediate(() => {
        mockChildProcess.emit('close', 1);
      });

      await expect(initPromise).rejects.toThrow('Chrome initialization failed');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when Chrome is available', async () => {
      mockExistsSync.mockReturnValue(true);

      // Mock spawn to return immediately
      let spawnCallCount = 0;
      mockSpawn.mockImplementation(() => {
        spawnCallCount++;
        setImmediate(() => {
          mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
          mockChildProcess.emit('close', 0);
        });
        return mockChildProcess;
      });

      const health = await engine.healthCheck();

      expect(health.isHealthy).toBe(true);
      expect(health.engineName).toBe('chrome-headless');
      expect(health.version).toBe('chrome-headless-1.0');
      expect(health.errors).toEqual([]);
      expect(spawnCallCount).toBeGreaterThan(0); // Ensure spawn was called during initialization
    });

    it('should return unhealthy status when Chrome is not found', async () => {
      mockExistsSync.mockReturnValue(false);

      const health = await engine.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.errors).toContain(
        'Health check failed: Chrome executable not found. Please install Google Chrome or Chromium.',
      );
    });

    it('should include performance metrics in health check', async () => {
      mockExistsSync.mockReturnValue(true);

      const healthPromise = engine.healthCheck();

      // Simulate Chrome version check
      setImmediate(() => {
        mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
        mockChildProcess.emit('close', 0);
      });

      const health = await healthPromise;

      expect(health.performance).toBeDefined();
      expect(health.performance?.averageGenerationTime).toBeDefined();
      expect(health.performance?.successRate).toBeDefined();
      expect(health.performance?.memoryUsage).toBeDefined();
    });
  });

  describe('PDF Generation', () => {
    const sampleContext: PDFGenerationContext = {
      htmlContent:
        '<html><body><h1>Test Document</h1><p>Content here</p></body></html>',
      outputPath: '/output/test.pdf',
      title: 'Test Document',
    };

    it('should generate PDF successfully', async () => {
      mockExistsSync.mockReturnValue(true);

      const generatePromise = engine.generatePDF(sampleContext, sampleOptions);

      // Simulate Chrome initialization and PDF generation
      setImmediate(() => {
        mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
        mockChildProcess.emit('close', 0);
      });

      // Simulate PDF generation process
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 1);

      const result = await generatePromise;

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/resolved/output/test.pdf');
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.engineUsed).toBe('chrome-headless');
    });

    it('should handle PDF generation failure', async () => {
      mockExistsSync.mockReturnValue(true);

      const generatePromise = engine.generatePDF(sampleContext, sampleOptions);

      // Simulate Chrome initialization success
      setImmediate(() => {
        mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
        mockChildProcess.emit('close', 0);
      });

      // Simulate Chrome PDF generation failure
      setTimeout(() => {
        mockChildProcess.stderr.emit('data', 'Chrome error message');
        mockChildProcess.emit('close', 1);
      }, 1);

      const result = await generatePromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Chrome headless PDF generation failed');
    });

    it('should create output directory if it does not exist', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // Chrome executable exists
        .mockReturnValueOnce(false) // Output directory does not exist
        .mockReturnValueOnce(true); // Temp HTML file exists for cleanup

      const generatePromise = engine.generatePDF(sampleContext, sampleOptions);

      // Complete the operation quickly
      setImmediate(() => {
        mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
        mockChildProcess.emit('close', 0);
      });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 1);

      await generatePromise;

      expect(mockMkdirSync).toHaveBeenCalledWith('/output/dir', {
        recursive: true,
      });
    });

    it('should validate PDF output path extension', async () => {
      // Setup proper mocks for this test
      mockExistsSync.mockReturnValue(true);
      mockSpawn.mockImplementation(() => {
        setImmediate(() => {
          mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
          mockChildProcess.emit('close', 0);
        });
        return mockChildProcess;
      });

      const invalidContext = {
        ...sampleContext,
        outputPath: '/output/test.txt',
      };

      const result = await engine.generatePDF(invalidContext, sampleOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Output path must end with .pdf extension',
      );
    });

    it('should pass correct Chrome arguments for PDF generation', async () => {
      mockExistsSync.mockReturnValue(true);

      const generatePromise = engine.generatePDF(sampleContext, sampleOptions);

      setImmediate(() => {
        mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
        mockChildProcess.emit('close', 0);
      });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 1);

      await generatePromise;

      // Check the second spawn call (PDF generation)
      expect(mockSpawn.mock.calls.length).toBeGreaterThanOrEqual(2);
      const pdfGenerationCall = mockSpawn.mock.calls[1];
      expect(pdfGenerationCall).toBeDefined();

      const args = pdfGenerationCall[1] as string[];
      expect(args).toContain('--headless');
      expect(args).toContain('--disable-gpu');
      expect(args).toContain('--no-sandbox');
      expect(args).toContain('--print-to-pdf=/resolved/output/test.pdf');
      expect(args).toContain('--print-to-pdf-no-header');
    });

    it('should update metrics after successful generation', async () => {
      mockExistsSync.mockReturnValue(true);

      const generatePromise = engine.generatePDF(sampleContext, sampleOptions);

      setImmediate(() => {
        mockChildProcess.stdout.emit('data', 'Google Chrome 119.0');
        mockChildProcess.emit('close', 0);
      });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 1);

      await generatePromise;

      const metrics = engine.getMetrics();
      expect(metrics.totalTasks).toBe(1);
      expect(metrics.successfulTasks).toBe(1);
      expect(metrics.failedTasks).toBe(0);
    });
  });

  describe('canHandle Method', () => {
    it('should return false for contexts with TOC enabled', async () => {
      const contextWithTOC: PDFGenerationContext = {
        htmlContent: '<html><body>Test</body></html>',
        outputPath: '/output/test.pdf',
        toc: {
          enabled: true,
          maxDepth: 3,
          includePageNumbers: true,
          title: 'Table of Contents',
        },
      };

      const canHandle = await engine.canHandle(contextWithTOC);
      expect(canHandle).toBe(false);
    });

    it('should return true for contexts without TOC', async () => {
      const context: PDFGenerationContext = {
        htmlContent: '<html><body>Test</body></html>',
        outputPath: '/output/test.pdf',
      };

      const canHandle = await engine.canHandle(context);
      expect(canHandle).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should reset engine state on cleanup', async () => {
      await engine.cleanup();
      // Cleanup should not throw
      expect(engine).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    it('should track resource usage', async () => {
      const resourceUsage = await engine.getResourceUsage();
      expect(resourceUsage.activeTasks).toBeGreaterThanOrEqual(0);
      expect(resourceUsage.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should provide accurate metrics', () => {
      const initialMetrics = engine.getMetrics();

      expect(initialMetrics).toEqual({
        engineName: 'chrome-headless',
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        averageTime: 0,
        peakMemoryUsage: 0,
        uptime: expect.any(Number),
      });
    });

    it('should track uptime correctly', (done) => {
      const initialMetrics = engine.getMetrics();
      const initialUptime = initialMetrics.uptime;

      setTimeout(() => {
        const laterMetrics = engine.getMetrics();
        expect(laterMetrics.uptime).toBeGreaterThanOrEqual(initialUptime);
        done();
      }, 10);
    });
  });
});
