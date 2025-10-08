import {
  HealthFirstSelectionStrategy,
  PrimaryFirstSelectionStrategy,
  LoadBalancedSelectionStrategy,
  CapabilityBasedSelectionStrategy,
  AdaptiveSelectionStrategy,
} from '../../../../src/core/pdf/engines/selection-strategies';
import {
  IPDFEngine,
  PDFGenerationContext,
  PDFEngineHealthStatus,
  PDFEngineCapabilities,
} from '../../../../src/core/pdf/engines/types';

// Minimal mock engine factory for selection tests
function makeMockEngine(
  name: string,
  capabilities: PDFEngineCapabilities,
  canHandle = true,
): IPDFEngine {
  return {
    name,
    version: '1.0',
    capabilities,
    initialize: async () => {},
    generatePDF: async () => ({
      success: true,
      outputPath: '/tmp/out.pdf',
      metadata: { pages: 1, fileSize: 1, generationTime: 0, engineUsed: name },
    }),
    healthCheck: async () => ({
      isHealthy: true,
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
    cleanup: async () => {},
    canHandle: async () => canHandle,
  } as unknown as IPDFEngine;
}

describe('Selection Strategies', () => {
  const context: PDFGenerationContext = {
    htmlContent: '<p>hi</p>',
    outputPath: '/tmp/out.pdf',
  };

  it('HealthFirstSelectionStrategy picks healthiest engine', async () => {
    const s = new HealthFirstSelectionStrategy();

    const e1 = makeMockEngine('e1', {
      supportedFormats: [],
      maxConcurrentJobs: 1,
      supportsCustomCSS: false,
      supportsChineseText: false,
      supportsTOC: false,
      supportsHeaderFooter: false,
    });

    const e2 = makeMockEngine('e2', {
      supportedFormats: [],
      maxConcurrentJobs: 5,
      supportsCustomCSS: true,
      supportsChineseText: true,
      supportsTOC: true,
      supportsHeaderFooter: true,
    });

    const health1: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'e1',
      lastCheck: new Date(),
      errors: [],
      performance: {
        averageGenerationTime: 2000,
        successRate: 0.9,
        memoryUsage: 10,
      },
    };

    const health2: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'e2',
      lastCheck: new Date(),
      errors: [],
      performance: {
        averageGenerationTime: 500,
        successRate: 0.99,
        memoryUsage: 5,
      },
    };

    const chosen = await s.selectEngine(context, [e1, e2], [health1, health2]);

    expect(chosen?.name).toBe('e2');
  });

  it('PrimaryFirstSelectionStrategy prefers primary when healthy', async () => {
    const s = new PrimaryFirstSelectionStrategy('primary');

    const primary = makeMockEngine('primary', {
      supportedFormats: [],
      maxConcurrentJobs: 1,
      supportsCustomCSS: false,
      supportsChineseText: false,
      supportsTOC: false,
      supportsHeaderFooter: false,
    });

    const other = makeMockEngine('other', {
      supportedFormats: [],
      maxConcurrentJobs: 5,
      supportsCustomCSS: true,
      supportsChineseText: true,
      supportsTOC: true,
      supportsHeaderFooter: true,
    });

    const primaryHealth: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'primary',
      lastCheck: new Date(),
      errors: [],
      performance: { averageGenerationTime: 0, successRate: 1, memoryUsage: 0 },
    };

    const otherHealth: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'other',
      lastCheck: new Date(),
      errors: [],
      performance: { averageGenerationTime: 0, successRate: 1, memoryUsage: 0 },
    };

    const chosen = await s.selectEngine(
      context,
      [primary, other],
      [primaryHealth, otherHealth],
    );
    expect(chosen?.name).toBe('primary');
  });

  it('LoadBalancedSelectionStrategy cycles through healthy engines', async () => {
    const s = new LoadBalancedSelectionStrategy();
    const a = makeMockEngine('a', {
      supportedFormats: [],
      maxConcurrentJobs: 1,
      supportsCustomCSS: false,
      supportsChineseText: false,
      supportsTOC: false,
      supportsHeaderFooter: false,
    });

    const b = makeMockEngine('b', {
      supportedFormats: [],
      maxConcurrentJobs: 1,
      supportsCustomCSS: false,
      supportsChineseText: false,
      supportsTOC: false,
      supportsHeaderFooter: false,
    });

    const healthA: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'a',
      lastCheck: new Date(),
      errors: [],
      performance: { averageGenerationTime: 0, successRate: 1, memoryUsage: 0 },
    };

    const healthB: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'b',
      lastCheck: new Date(),
      errors: [],
      performance: { averageGenerationTime: 0, successRate: 1, memoryUsage: 0 },
    };

    const first = await s.selectEngine(context, [a, b], [healthA, healthB]);
    const second = await s.selectEngine(context, [a, b], [healthA, healthB]);

    expect(first?.name).toBeDefined();
    expect(second?.name).toBeDefined();
    expect(first?.name).not.toBe(second?.name);
  });

  it('CapabilityBasedSelectionStrategy prefers engines with matching capabilities', async () => {
    const s = new CapabilityBasedSelectionStrategy();

    const withTOC = makeMockEngine('withTOC', {
      supportedFormats: [],
      maxConcurrentJobs: 1,
      supportsCustomCSS: true,
      supportsChineseText: true,
      supportsTOC: true,
      supportsHeaderFooter: true,
    });

    const withoutTOC = makeMockEngine('withoutTOC', {
      supportedFormats: [],
      maxConcurrentJobs: 5,
      supportsCustomCSS: true,
      supportsChineseText: true,
      supportsTOC: false,
      supportsHeaderFooter: true,
    });

    const h1: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'withTOC',
      lastCheck: new Date(),
      errors: [],
      performance: { averageGenerationTime: 0, successRate: 1, memoryUsage: 0 },
    };

    const h2: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'withoutTOC',
      lastCheck: new Date(),
      errors: [],
      performance: { averageGenerationTime: 0, successRate: 1, memoryUsage: 0 },
    };

    const chosen = await s.selectEngine(
      {
        htmlContent: '<p>hi</p>',
        outputPath: '/tmp/out.pdf',
        toc: { enabled: true, includePageNumbers: false, maxDepth: 2 },
      },
      [withTOC, withoutTOC],
      [h1, h2],
    );

    expect(chosen?.name).toBe('withTOC');
  });

  it('AdaptiveSelectionStrategy prefers engines with historical performance', async () => {
    const s = new AdaptiveSelectionStrategy();
    const fast = makeMockEngine('fast', {
      supportedFormats: [],
      maxConcurrentJobs: 1,
      supportsCustomCSS: false,
      supportsChineseText: false,
      supportsTOC: false,
      supportsHeaderFooter: false,
    });

    const slow = makeMockEngine('slow', {
      supportedFormats: [],
      maxConcurrentJobs: 1,
      supportsCustomCSS: false,
      supportsChineseText: false,
      supportsTOC: false,
      supportsHeaderFooter: false,
    });

    // Record performance: fast succeeds quickly, slow fails or is slow
    s.recordPerformance('fast', true, 1000);
    s.recordPerformance('fast', true, 1200);
    s.recordPerformance('slow', true, 8000);

    const hFast: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'fast',
      lastCheck: new Date(),
      errors: [],
      performance: {
        averageGenerationTime: 1000,
        successRate: 1,
        memoryUsage: 0,
      },
    };

    const hSlow: PDFEngineHealthStatus = {
      isHealthy: true,
      engineName: 'slow',
      lastCheck: new Date(),
      errors: [],
      performance: {
        averageGenerationTime: 8000,
        successRate: 0.5,
        memoryUsage: 0,
      },
    };

    const chosen = await s.selectEngine(context, [fast, slow], [hFast, hSlow]);

    expect(chosen?.name).toBe('fast');
  });
});
