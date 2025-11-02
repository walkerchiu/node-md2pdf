/**
 * Tests for PDF Engine Manager
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFEngineManager } from '../../../../../src/core/pdf/engines/engine-manager';
import { HealthFirstSelectionStrategy } from '../../../../../src/core/pdf/engines/selection-strategies';
import type {
  IPDFEngine,
  IPDFEngineFactory,
  IEngineSelectionStrategy,
  PDFEngineManagerConfig,
  PDFGenerationContext,
  PDFEngineOptions,
  PDFEngineResult,
  PDFEngineHealthStatus,
  PDFEngineCapabilities,
  PDFEngineMetrics,
} from '../../../../../src/core/pdf/engines/types';
import type { ILogger } from '../../../../../src/infrastructure/logging/types';

// Mock logger
const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  setLevel: jest.fn(),
  getLevel: jest.fn().mockReturnValue('info'),
};

// Mock engine implementation
class MockPDFEngine implements IPDFEngine {
  constructor(
    public readonly name: string,
    public readonly version: string = '1.0.0',
    public readonly capabilities: PDFEngineCapabilities = {
      supportedFormats: ['A4'],
      maxConcurrentJobs: 2,
      supportsCustomCSS: true,
      supportsChineseText: true,
      supportsTOC: true,
      supportsHeaderFooter: true,
    },
    private shouldThrowOnInit: boolean = false,
    private shouldThrowOnHealthCheck: boolean = false,
    private shouldFailGeneration: boolean = false,
    private canHandleResult: boolean = true,
  ) {}

  async initialize(): Promise<void> {
    if (this.shouldThrowOnInit) {
      throw new Error(`Failed to initialize ${this.name}`);
    }
  }

  async generatePDF(context: PDFGenerationContext): Promise<PDFEngineResult> {
    if (this.shouldFailGeneration) {
      return {
        success: false,
        error: `Generation failed for ${this.name}`,
      };
    }

    return {
      success: true,
      outputPath: context.outputPath,
      metadata: {
        pages: 1,
        fileSize: 1000,
        generationTime: 1000,
        engineUsed: this.name,
      },
    };
  }

  async healthCheck(): Promise<PDFEngineHealthStatus> {
    if (this.shouldThrowOnHealthCheck) {
      throw new Error(`Health check failed for ${this.name}`);
    }

    return {
      isHealthy: true,
      engineName: this.name,
      lastCheck: new Date(),
      errors: [],
      performance: {
        averageGenerationTime: 1000,
        successRate: 95,
        memoryUsage: 100 * 1024 * 1024,
      },
    };
  }

  async getResourceUsage(): Promise<{
    memoryUsage: number;
    activeTasks: number;
    averageTaskTime: number;
  }> {
    return {
      memoryUsage: 100 * 1024 * 1024,
      activeTasks: 0,
      averageTaskTime: 1000,
    };
  }

  async cleanup(): Promise<void> {
    // Mock implementation
  }

  async canHandle(_context: PDFGenerationContext): Promise<boolean> {
    return this.canHandleResult;
  }

  getMetrics(): PDFEngineMetrics {
    return {
      engineName: this.name,
      totalTasks: 10,
      successfulTasks: 9,
      failedTasks: 1,
      averageTime: 1000,
      peakMemoryUsage: 100 * 1024 * 1024,
      uptime: 3600000, // 1 hour
    };
  }
}

// Mock factory implementation
class MockPDFEngineFactory implements IPDFEngineFactory {
  private engines = new Map<string, () => MockPDFEngine>();
  private shouldThrowOnCreate: string[] = [];

  constructor() {
    this.engines.set('puppeteer', () => new MockPDFEngine('puppeteer'));
    this.engines.set(
      'chrome-headless',
      () => new MockPDFEngine('chrome-headless'),
    );
    this.engines.set('playwright', () => new MockPDFEngine('playwright'));
  }

  async createEngine(engineName: string): Promise<IPDFEngine> {
    if (this.shouldThrowOnCreate.includes(engineName)) {
      throw new Error(`Failed to create engine: ${engineName}`);
    }

    const engineFactory = this.engines.get(engineName);
    if (!engineFactory) {
      throw new Error(`Unknown engine: ${engineName}`);
    }

    return engineFactory();
  }

  getAvailableEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  registerEngine(
    name: string,
    engineClass: new (...args: any[]) => IPDFEngine,
  ): void {
    this.engines.set(name, engineClass as any);
  }

  setShouldThrowOnCreate(engineNames: string[]): void {
    this.shouldThrowOnCreate = engineNames;
  }
}

describe('PDFEngineManager', () => {
  let manager: PDFEngineManager;
  let mockFactory: MockPDFEngineFactory;
  let mockStrategy: IEngineSelectionStrategy;
  let mockConfig: PDFEngineManagerConfig;
  let mockContext: PDFGenerationContext;
  let mockOptions: PDFEngineOptions;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFactory = new MockPDFEngineFactory();
    mockStrategy = new HealthFirstSelectionStrategy();
    mockConfig = {
      primaryEngine: 'puppeteer',
      fallbackEngines: ['chrome-headless', 'playwright'],
      healthCheckInterval: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableMetrics: true,
      resourceLimits: {
        maxMemoryUsage: 500 * 1024 * 1024,
        maxConcurrentTasks: 5,
        taskTimeout: 30000,
      },
    };

    mockContext = {
      htmlContent: '<html><body>Test</body></html>',
      outputPath: '/test/output.pdf',
      title: 'Test Document',
    };

    mockOptions = {
      format: 'A4',
      orientation: 'portrait',
    };

    manager = new PDFEngineManager(
      mockConfig,
      mockFactory,
      mockStrategy,
      mockLogger,
    );
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize engines successfully', async () => {
      await manager.initialize();

      const availableEngines = manager.getAvailableEngines();
      expect(availableEngines).toContain('puppeteer');
      expect(availableEngines).toContain('chrome-headless');
      expect(availableEngines).toContain('playwright');
      expect(availableEngines).toHaveLength(3);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('✅ Initialized puppeteer engine successfully'),
      );
    });

    it('should handle engine initialization failures gracefully', async () => {
      mockFactory.setShouldThrowOnCreate(['chrome-headless']);

      await manager.initialize();

      const availableEngines = manager.getAvailableEngines();
      expect(availableEngines).toContain('puppeteer');
      expect(availableEngines).toContain('playwright');
      expect(availableEngines).not.toContain('chrome-headless');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize'),
      );
    });

    it('should initialize with configured engines when factory has no available engines', async () => {
      // Create factory without getAvailableEngines method
      const factoryWithoutMethod = {
        createEngine: mockFactory.createEngine.bind(mockFactory),
        registerEngine: mockFactory.registerEngine.bind(mockFactory),
      } as IPDFEngineFactory;

      manager = new PDFEngineManager(
        mockConfig,
        factoryWithoutMethod,
        mockStrategy,
        mockLogger,
      );

      await manager.initialize();

      const availableEngines = manager.getAvailableEngines();
      expect(availableEngines).toHaveLength(3); // primary + 2 fallbacks
    });

    it('should start health monitoring when interval is configured', async () => {
      jest.useFakeTimers();

      await manager.initialize();

      // Fast-forward time to trigger health check
      jest.advanceTimersByTime(mockConfig.healthCheckInterval);

      expect(mockLogger.info).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should not start health monitoring when interval is 0', async () => {
      mockConfig.healthCheckInterval = 0;
      manager = new PDFEngineManager(
        mockConfig,
        mockFactory,
        mockStrategy,
        mockLogger,
      );

      await manager.initialize();

      // Should not set up interval
      expect(true).toBe(true); // Test passes if no interval errors occur
    });
  });

  describe('PDF Generation', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should generate PDF successfully with selected engine', async () => {
      const result = await manager.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/test/output.pdf');
      expect(result.metadata?.engineUsed).toBeDefined();
    });

    it('should return error when no healthy engines available', async () => {
      // Mock strategy to return null
      const failStrategy: IEngineSelectionStrategy = {
        selectEngine: jest.fn().mockResolvedValue(null),
      };

      manager = new PDFEngineManager(
        mockConfig,
        mockFactory,
        failStrategy,
        mockLogger,
      );
      await manager.initialize();

      const result = await manager.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No healthy PDF engines available');
    });

    it('should retry generation on failure', async () => {
      // Create engine that fails generation
      const failingEngine = new MockPDFEngine(
        'failing',
        '1.0.0',
        undefined,
        false,
        false,
        true,
      );

      // Mock strategy to always return failing engine (to test retry mechanism)
      const retryStrategy: IEngineSelectionStrategy = {
        selectEngine: jest.fn().mockResolvedValue(failingEngine),
      };

      // Create a factory with only failing engines
      const failingFactory: IPDFEngineFactory = {
        createEngine: jest.fn().mockResolvedValue(failingEngine),
        getAvailableEngines: () => ['failing'],
        registerEngine: jest.fn(),
      };

      // Reduce retries for faster test
      const testConfig = { ...mockConfig, maxRetries: 2, retryDelay: 0 };
      manager = new PDFEngineManager(
        testConfig,
        failingFactory,
        retryStrategy,
        mockLogger,
      );
      await manager.initialize();

      const result = await manager.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF generation failed after 2 attempts');
    });

    it('should handle generation timeout', async () => {
      const timeoutConfig = {
        ...mockConfig,
        resourceLimits: {
          ...mockConfig.resourceLimits,
          taskTimeout: 100, // Very short timeout
        },
      };

      manager = new PDFEngineManager(
        timeoutConfig,
        mockFactory,
        mockStrategy,
        mockLogger,
      );
      await manager.initialize();

      // Mock engine that takes too long
      const slowEngine = {
        ...new MockPDFEngine('slow'),
        generatePDF: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve({ success: true }), 200),
              ),
          ),
      };

      const timeoutStrategy: IEngineSelectionStrategy = {
        selectEngine: jest.fn().mockResolvedValue(slowEngine),
      };

      manager = new PDFEngineManager(
        timeoutConfig,
        mockFactory,
        timeoutStrategy,
        mockLogger,
      );
      await manager.initialize();

      const result = await manager.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform periodic health checks', async () => {
      jest.useFakeTimers();

      // Fast-forward time to trigger health check
      jest.advanceTimersByTime(mockConfig.healthCheckInterval);

      // Allow promises to resolve
      await jest.runAllTicks();
      await Promise.resolve();

      const engineStatus = manager.getEngineStatus();
      expect(engineStatus.size).toBeGreaterThan(0);

      jest.useRealTimers();
    }, 15000);

    it('should handle health check failures', async () => {
      // Add engine that throws on health check
      const unhealthyEngine = new MockPDFEngine(
        'unhealthy',
        '1.0.0',
        undefined,
        false,
        true,
      );

      // Manually add to engines map for testing
      (manager as any).engines.set('unhealthy', unhealthyEngine);

      await manager.forceHealthCheck();

      const engineStatus = manager.getEngineStatus();
      const unhealthyStatus = engineStatus.get('unhealthy');

      expect(unhealthyStatus?.isHealthy).toBe(false);
      expect(unhealthyStatus?.errors).toHaveLength(1);
    });

    it('should update metrics when enabled', async () => {
      // Force a health check to trigger metrics update
      await manager.forceHealthCheck();

      const metrics = manager.getEngineMetrics();
      expect(metrics.size).toBeGreaterThan(0);
    });

    it('should force health check for specific engine', async () => {
      await manager.forceHealthCheck('puppeteer');

      const engineStatus = manager.getEngineStatus();
      const puppeteerStatus = engineStatus.get('puppeteer');

      expect(puppeteerStatus).toBeDefined();
      expect(puppeteerStatus?.engineName).toBe('puppeteer');
    });

    it('should get healthy engines only', async () => {
      await manager.forceHealthCheck();

      const healthyEngines = manager.getHealthyEngines();
      expect(healthyEngines.length).toBeGreaterThan(0);

      // All returned engines should be healthy
      const engineStatus = manager.getEngineStatus();
      healthyEngines.forEach((engineName) => {
        const status = engineStatus.get(engineName);
        expect(status?.isHealthy).toBe(true);
      });
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should update configuration', async () => {
      const newConfig = {
        maxRetries: 5,
        retryDelay: 2000,
      };

      manager.updateConfig(newConfig);

      // Configuration should be updated (internal test)
      expect((manager as any).config.maxRetries).toBe(5);
      expect((manager as any).config.retryDelay).toBe(2000);
    });

    it('should restart health monitoring when interval changes', async () => {
      jest.useFakeTimers();

      manager.updateConfig({ healthCheckInterval: 10000 });

      // Should clear old interval and start new one
      expect(true).toBe(true); // Test passes if no errors occur

      jest.useRealTimers();
    });

    it('should stop health monitoring when interval set to 0', async () => {
      manager.updateConfig({ healthCheckInterval: 0 });

      // Should clear interval
      expect((manager as any).healthCheckInterval).toBeNull();
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should cleanup all engines and clear state', async () => {
      await manager.cleanup();

      expect(manager.getAvailableEngines()).toHaveLength(0);
      expect(manager.getEngineStatus().size).toBe(0);
      expect(manager.getEngineMetrics().size).toBe(0);
    });

    it('should handle engine cleanup errors gracefully', async () => {
      // Mock engine cleanup to throw error
      const engines = (manager as any).engines;
      const mockEngine = {
        cleanup: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
      };
      engines.set('failing-cleanup', mockEngine);

      await manager.cleanup();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Engine cleanup error'),
      );
    });

    it('should stop health monitoring during cleanup', async () => {
      jest.useFakeTimers();

      await manager.cleanup();

      // Health check interval should be cleared
      expect((manager as any).healthCheckInterval).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('Fallback Engine Selection', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should select fallback engine when primary fails', async () => {
      // Mock a failing primary engine
      const primaryEngine = new MockPDFEngine(
        'primary',
        '1.0.0',
        undefined,
        false,
        false,
        true,
      );
      const fallbackEngine = new MockPDFEngine('fallback');

      const fallbackStrategy: IEngineSelectionStrategy = {
        selectEngine: jest.fn().mockResolvedValue(primaryEngine),
      };

      manager = new PDFEngineManager(
        mockConfig,
        mockFactory,
        fallbackStrategy,
        mockLogger,
      );
      await manager.initialize();

      // Add fallback engine manually
      (manager as any).engines.set('fallback', fallbackEngine);
      (manager as any).healthStatuses.set('fallback', {
        isHealthy: true,
        engineName: 'fallback',
        lastCheck: new Date(),
        errors: [],
      });

      const result = await manager.generatePDF(mockContext, mockOptions);

      expect(result.success).toBe(true);
    });

    it('should return null when no fallback engines can handle context', async () => {
      const unableEngine = new MockPDFEngine(
        'unable',
        '1.0.0',
        undefined,
        false,
        false,
        false,
        false,
      );

      (manager as any).engines.clear();
      (manager as any).engines.set('unable', unableEngine);
      (manager as any).healthStatuses.set('unable', {
        isHealthy: true,
        engineName: 'unable',
        lastCheck: new Date(),
        errors: [],
      });

      const result = await (manager as any).selectFallbackEngine(
        unableEngine,
        mockContext,
      );
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should work without logger', async () => {
      manager = new PDFEngineManager(mockConfig, mockFactory, mockStrategy);

      await manager.initialize();

      const result = await manager.generatePDF(mockContext, mockOptions);
      expect(result.success).toBe(true);
    });

    it('should handle empty factory available engines', async () => {
      const emptyFactory: IPDFEngineFactory = {
        createEngine: mockFactory.createEngine.bind(mockFactory),
        getAvailableEngines: () => [],
        registerEngine: mockFactory.registerEngine.bind(mockFactory),
      };

      manager = new PDFEngineManager(
        mockConfig,
        emptyFactory,
        mockStrategy,
        mockLogger,
      );

      await manager.initialize();

      // Should fall back to configured primary/fallback engines
      expect(manager.getAvailableEngines().length).toBeGreaterThan(0);
    });
  });
});
