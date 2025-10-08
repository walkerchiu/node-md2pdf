import { PDFEngineManager } from '../../../../src/core/pdf/engines/engine-manager';
import {
  PDFEngineManagerConfig,
  PDFGenerationContext,
  PDFEngineResult,
  PDFEngineOptions,
  IPDFEngine,
  IEngineSelectionStrategy,
} from '../../../../src/core/pdf/engines/types';

// Create lightweight mock engines
function makeEngine(
  name: string,
  behavior: {
    healthy?: boolean;
    canHandle?: boolean;
    generateSucceeds?: boolean;
  },
): IPDFEngine {
  let initialized = false;

  return {
    name,
    version: '1.0',
    capabilities: {
      supportedFormats: ['A4'],
      maxConcurrentJobs: 1,
      supportsCustomCSS: true,
      supportsChineseText: true,
      supportsTOC: true,
      supportsHeaderFooter: true,
    },
    initialize: async (): Promise<void> => {
      if (behavior.healthy === false) throw new Error('init-fail');
      initialized = true;
    },
    generatePDF: async (
      context: PDFGenerationContext,
      _options?: PDFEngineOptions,
    ): Promise<PDFEngineResult> => {
      if (!initialized) throw new Error('not-initialized');
      if (behavior.generateSucceeds === false) {
        return { success: false, error: 'generation-failed' };
      }

      return {
        success: true,
        outputPath: context.outputPath,
        metadata: {
          pages: 1,
          fileSize: 1,
          generationTime: 1,
          engineUsed: name,
        },
      };
    },
    healthCheck: async () => ({
      isHealthy: behavior.healthy !== false,
      engineName: name,
      lastCheck: new Date(),
      errors: [],
      performance: { averageGenerationTime: 0, successRate: 1, memoryUsage: 0 },
    }),
    getResourceUsage: async () => ({
      memoryUsage: 0,
      activeTasks: 0,
      averageTaskTime: 0,
    }),
    cleanup: async (): Promise<void> => {},
    canHandle: async () => behavior.canHandle !== false,
  } as IPDFEngine;
}

describe('PDFEngineManager', () => {
  const config: PDFEngineManagerConfig = {
    primaryEngine: 'primary',
    fallbackEngines: ['fallback'],
    healthCheckInterval: 0,
    maxRetries: 2,
    retryDelay: 0,
    enableMetrics: true,
    resourceLimits: {
      maxMemoryUsage: 1024 * 1024 * 1024,
      maxConcurrentTasks: 2,
      taskTimeout: 1000,
    },
  };

  it('initializes engines and records health', async () => {
    const factory: {
      createEngine(name: string): Promise<IPDFEngine>;
      getAvailableEngines(): string[];
      registerEngine(name: string, cls: unknown): void;
    } = {
      createEngine: async (name: string) => makeEngine(name, { healthy: true }),
      getAvailableEngines: () => ['primary', 'fallback'],
      registerEngine: () => {},
    };

    const selectionStrategy: IEngineSelectionStrategy = {
      selectEngine: async () => null,
    };

    const manager = new PDFEngineManager(config, factory, selectionStrategy);

    await manager.initialize();

    const statuses = manager.getEngineStatus();

    expect(statuses.has('primary')).toBe(true);
    expect(statuses.has('fallback')).toBe(true);
  });

  it('generatePDF uses selection strategy and retries with fallback', async () => {
    const primary = makeEngine('primary', {
      healthy: true,
      generateSucceeds: false,
    });
    const fallback = makeEngine('fallback', {
      healthy: true,
      generateSucceeds: true,
    });

    const factory: {
      createEngine(name: string): Promise<IPDFEngine>;
      getAvailableEngines(): string[];
      registerEngine(name: string, cls: unknown): void;
    } = {
      createEngine: async (name: string) =>
        name === 'primary' ? primary : fallback,
      getAvailableEngines: () => ['primary', 'fallback'],
      registerEngine: () => {},
    };

    const selectionStrategy: IEngineSelectionStrategy = {
      selectEngine: async (
        _context: PDFGenerationContext,
        availableEngines: IPDFEngine[],
      ) => {
        return availableEngines.find((e) => e.name === 'primary') || null;
      },
    };

    const manager = new PDFEngineManager(config, factory, selectionStrategy);
    await manager.initialize();

    const result = await manager.generatePDF(
      { htmlContent: '<p>hi</p>', outputPath: '/tmp/out.pdf' },
      {} as PDFEngineOptions,
    );

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/tmp/out.pdf');
  });

  it('returns error when no engines available', async () => {
    const factory: {
      createEngine(): Promise<IPDFEngine>;
      getAvailableEngines(): string[];
      registerEngine(name: string, cls: unknown): void;
    } = {
      createEngine: async () => {
        throw new Error('No engines');
      },
      getAvailableEngines: () => [],
      registerEngine: () => {},
    };

    const selectionStrategy: IEngineSelectionStrategy = {
      selectEngine: async () => null,
    };

    const manager = new PDFEngineManager(config, factory, selectionStrategy);

    // When factory reports no available engines, initialize should try to create primary engine
    // Since createEngine throws, this will fail during initialization
    await expect(manager.initialize()).rejects.toThrow('No engines');
  });

  it('forceHealthCheck updates statuses and metrics', async () => {
    const primary = makeEngine('primary', { healthy: true });
    const factory: {
      createEngine(): Promise<IPDFEngine>;
      getAvailableEngines(): string[];
      registerEngine(name: string, cls: unknown): void;
    } = {
      createEngine: async () => primary,
      getAvailableEngines: () => ['primary'],
      registerEngine: () => {},
    };

    const selectionStrategy: IEngineSelectionStrategy = {
      selectEngine: async () => primary,
    };
    const manager = new PDFEngineManager(config, factory, selectionStrategy);
    await manager.initialize();

    await manager.forceHealthCheck();

    const statuses = manager.getEngineStatus();
    expect(statuses.size).toBeGreaterThan(0);

    // Metrics should be available
    const metrics = manager.getEngineMetrics();
    expect(metrics).toBeInstanceOf(Map);
  });

  it('cleanup stops health monitoring and clears engines', async () => {
    const primary = makeEngine('primary', { healthy: true });
    const factory: {
      createEngine(): Promise<IPDFEngine>;
      getAvailableEngines(): string[];
      registerEngine(name: string, cls: unknown): void;
    } = {
      createEngine: async () => primary,
      getAvailableEngines: () => ['primary'],
      registerEngine: () => {},
    };

    const selectionStrategy: IEngineSelectionStrategy = {
      selectEngine: async () => primary,
    };
    const manager = new PDFEngineManager(
      { ...config, healthCheckInterval: 10 },
      factory,
      selectionStrategy,
    );
    await manager.initialize();

    await manager.cleanup();

    expect(manager.getAvailableEngines().length).toBe(0);
    expect(manager.getEngineStatus().size).toBe(0);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle fallback engine initialization failure without affecting primary', async () => {
      const primary = makeEngine('primary', { healthy: true });

      const factory: {
        createEngine(name: string): Promise<IPDFEngine>;
        getAvailableEngines(): string[];
        registerEngine(name: string, cls: unknown): void;
      } = {
        createEngine: async (name: string) => {
          if (name === 'fallback') {
            throw new Error('Fallback engine init failed');
          }
          return primary;
        },
        getAvailableEngines: () => ['primary', 'fallback'],
        registerEngine: () => {},
      };

      const selectionStrategy: IEngineSelectionStrategy = {
        selectEngine: async () => primary,
      };

      const manager = new PDFEngineManager(config, factory, selectionStrategy);

      // Should not throw even if fallback initialization fails
      await expect(manager.initialize()).resolves.not.toThrow();

      // Primary engine should still be available
      expect(manager.getAvailableEngines()).toContain('primary');
      expect(manager.getAvailableEngines()).not.toContain('fallback');
    });

    it('should retry with fallback engine when primary fails', async () => {
      const primaryEngine = makeEngine('primary', {
        healthy: true,
        generateSucceeds: false,
      });
      const fallbackEngine = makeEngine('fallback', {
        healthy: true,
        generateSucceeds: true,
      });

      const factory: {
        createEngine(name: string): Promise<IPDFEngine>;
        getAvailableEngines(): string[];
        registerEngine(name: string, cls: unknown): void;
      } = {
        createEngine: async (name: string) => {
          return name === 'primary' ? primaryEngine : fallbackEngine;
        },
        getAvailableEngines: () => ['primary', 'fallback'],
        registerEngine: () => {},
      };

      const selectionStrategy: IEngineSelectionStrategy = {
        selectEngine: async () => primaryEngine,
      };

      const manager = new PDFEngineManager(config, factory, selectionStrategy);
      await manager.initialize();

      const result = await manager.generatePDF(
        { htmlContent: '<p>test</p>', outputPath: '/tmp/fallback.pdf' },
        {} as PDFEngineOptions,
      );

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/fallback.pdf');
      expect(result.metadata?.engineUsed).toBe('fallback');
    });

    it('should respect maxRetries configuration', async () => {
      const failingEngine = makeEngine('failing', {
        healthy: true,
        generateSucceeds: false,
      });
      let generationAttempts = 0;

      // Override to count attempts
      failingEngine.generatePDF = async () => {
        generationAttempts++;
        return {
          success: false,
          error: `Attempt ${generationAttempts} failed`,
        };
      };

      const factory: {
        createEngine(): Promise<IPDFEngine>;
        getAvailableEngines(): string[];
        registerEngine(name: string, cls: unknown): void;
      } = {
        createEngine: async () => failingEngine,
        getAvailableEngines: () => ['failing'],
        registerEngine: () => {},
      };

      const selectionStrategy: IEngineSelectionStrategy = {
        selectEngine: async () => failingEngine,
      };

      const manager = new PDFEngineManager(
        { ...config, maxRetries: 3, fallbackEngines: [] },
        factory,
        selectionStrategy,
      );

      await manager.initialize();

      const result = await manager.generatePDF(
        { htmlContent: '<p>test</p>', outputPath: '/tmp/retry.pdf' },
        {} as PDFEngineOptions,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed after 3 attempts');
      expect(generationAttempts).toBe(3);
    });

    it('should handle engine canHandle checks correctly', async () => {
      const selectiveEngine = makeEngine('selective', {
        healthy: true,
        canHandle: false,
      });
      const generalEngine = makeEngine('general', {
        healthy: true,
        canHandle: true,
      });

      const factory: {
        createEngine(name: string): Promise<IPDFEngine>;
        getAvailableEngines(): string[];
        registerEngine(name: string, cls: unknown): void;
      } = {
        createEngine: async (name: string) => {
          return name === 'selective' ? selectiveEngine : generalEngine;
        },
        getAvailableEngines: () => ['selective', 'general'],
        registerEngine: () => {},
      };

      const selectionStrategy: IEngineSelectionStrategy = {
        selectEngine: async () => selectiveEngine, // Primary selection chooses selective engine
      };

      const manager = new PDFEngineManager(config, factory, selectionStrategy);
      await manager.initialize();

      const context: PDFGenerationContext = {
        htmlContent: '<p>test</p>',
        outputPath: '/tmp/selective.pdf',
        toc: {
          enabled: true,
          maxDepth: 2,
          includePageNumbers: true,
          title: 'Table of Contents',
        },
      };

      const result = await manager.generatePDF(context, {} as PDFEngineOptions);

      // Should succeed using available engine
      expect(result.success).toBe(true);
      expect(result.metadata?.engineUsed).toBe('selective');
    });
  });

  describe('Resource Management and Monitoring', () => {
    it('should collect and update engine metrics when enabled', async () => {
      const engine = makeEngine('metrics', { healthy: true });

      // Add metrics capability to engine
      (engine as any).getMetrics = () => ({
        engineName: 'metrics',
        totalTasks: 5,
        successfulTasks: 4,
        failedTasks: 1,
        averageTime: 1000,
        peakMemoryUsage: 1024 * 1024,
        uptime: 60000,
      });

      const factory: {
        createEngine(): Promise<IPDFEngine>;
        getAvailableEngines(): string[];
        registerEngine(name: string, cls: unknown): void;
      } = {
        createEngine: async () => engine,
        getAvailableEngines: () => ['metrics'],
        registerEngine: () => {},
      };

      const selectionStrategy: IEngineSelectionStrategy = {
        selectEngine: async () => engine,
      };

      const manager = new PDFEngineManager(
        { ...config, enableMetrics: true },
        factory,
        selectionStrategy,
      );

      await manager.initialize();
      await manager.forceHealthCheck(); // Trigger metrics collection

      const metrics = manager.getEngineMetrics();
      const engineMetrics = metrics.get('metrics');

      expect(engineMetrics).toBeDefined();
      expect(engineMetrics?.totalTasks).toBe(5);
      expect(engineMetrics?.successfulTasks).toBe(4);
      expect(engineMetrics?.averageTime).toBe(1000);
    });

    it('should handle engines without metrics capability gracefully', async () => {
      const engine = makeEngine('no-metrics', { healthy: true });

      // Ensure engine doesn't have getMetrics method
      delete (engine as any).getMetrics;

      const factory: {
        createEngine(): Promise<IPDFEngine>;
        getAvailableEngines(): string[];
        registerEngine(name: string, cls: unknown): void;
      } = {
        createEngine: async () => engine,
        getAvailableEngines: () => ['no-metrics'],
        registerEngine: () => {},
      };

      const selectionStrategy: IEngineSelectionStrategy = {
        selectEngine: async () => engine,
      };

      const manager = new PDFEngineManager(
        { ...config, enableMetrics: true },
        factory,
        selectionStrategy,
      );

      await manager.initialize();
      await manager.forceHealthCheck();

      // Should not crash when engine doesn't support metrics
      const metrics = manager.getEngineMetrics();
      expect(metrics.get('no-metrics')).toBeUndefined();
    });

    it('should handle engine cleanup errors gracefully', async () => {
      const problematicEngine = makeEngine('problematic', { healthy: true });

      // Override cleanup to throw error
      problematicEngine.cleanup = async () => {
        throw new Error('Cleanup failed');
      };

      const factory: {
        createEngine(): Promise<IPDFEngine>;
        getAvailableEngines(): string[];
        registerEngine(name: string, cls: unknown): void;
      } = {
        createEngine: async () => problematicEngine,
        getAvailableEngines: () => ['problematic'],
        registerEngine: () => {},
      };

      const selectionStrategy: IEngineSelectionStrategy = {
        selectEngine: async () => problematicEngine,
      };

      const manager = new PDFEngineManager(config, factory, selectionStrategy);
      await manager.initialize();

      // Should not throw even if engine cleanup fails
      await expect(manager.cleanup()).resolves.not.toThrow();

      // Manager should still be cleaned up
      expect(manager.getAvailableEngines().length).toBe(0);
    });
  });
});
