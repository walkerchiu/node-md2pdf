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
  behavior: { healthy?: boolean; canHandle?: boolean; generateSucceeds?: boolean }
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
      _options?: PDFEngineOptions
    ): Promise<PDFEngineResult> => {
      if (!initialized) throw new Error('not-initialized');
      if (behavior.generateSucceeds === false) {
        return { success: false, error: 'generation-failed' };
      }

      return {
        success: true,
        outputPath: context.outputPath,
        metadata: { pages: 1, fileSize: 1, generationTime: 1, engineUsed: name },
      };
    },
    healthCheck: async () => ({
      isHealthy: behavior.healthy !== false,
      engineName: name,
      lastCheck: new Date(),
      errors: [],
      performance: { averageGenerationTime: 0, successRate: 1, memoryUsage: 0 },
    }),
    getResourceUsage: async () => ({ memoryUsage: 0, activeTasks: 0, averageTaskTime: 0 }),
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
    const primary = makeEngine('primary', { healthy: true, generateSucceeds: false });
    const fallback = makeEngine('fallback', { healthy: true, generateSucceeds: true });

    const factory: {
      createEngine(name: string): Promise<IPDFEngine>;
      getAvailableEngines(): string[];
      registerEngine(name: string, cls: unknown): void;
    } = {
      createEngine: async (name: string) => (name === 'primary' ? primary : fallback),
      getAvailableEngines: () => ['primary', 'fallback'],
      registerEngine: () => {},
    };

    const selectionStrategy: IEngineSelectionStrategy = {
      selectEngine: async (_context: PDFGenerationContext, availableEngines: IPDFEngine[]) => {
        return availableEngines.find(e => e.name === 'primary') || null;
      },
    };

    const manager = new PDFEngineManager(config, factory, selectionStrategy);
    await manager.initialize();

    const result = await manager.generatePDF(
      { htmlContent: '<p>hi</p>', outputPath: '/tmp/out.pdf' },
      {} as PDFEngineOptions
    );

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/tmp/out.pdf');
  });

  it('returns error when no healthy engines', async () => {
    const unhealthy = makeEngine('primary', { healthy: false });

    const factory: {
      createEngine(): Promise<IPDFEngine>;
      getAvailableEngines(): string[];
      registerEngine(name: string, cls: unknown): void;
    } = {
      createEngine: async () => unhealthy,
      getAvailableEngines: () => ['primary'],
      registerEngine: () => {},
    };

    const selectionStrategy: IEngineSelectionStrategy = {
      selectEngine: async () => null,
    };

    const manager = new PDFEngineManager(config, factory, selectionStrategy);

    // initialize will try to init engines and throw for unhealthy primary
    await expect(manager.initialize()).rejects.toBeDefined();
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

    const selectionStrategy: IEngineSelectionStrategy = { selectEngine: async () => primary };
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

    const selectionStrategy: IEngineSelectionStrategy = { selectEngine: async () => primary };
    const manager = new PDFEngineManager(
      { ...config, healthCheckInterval: 10 },
      factory,
      selectionStrategy
    );
    await manager.initialize();

    await manager.cleanup();

    expect(manager.getAvailableEngines().length).toBe(0);
    expect(manager.getEngineStatus().size).toBe(0);
  });
});
