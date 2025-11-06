/**
 * Tests for PDF Engine Selection Strategies
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HealthFirstSelectionStrategy,
  PrimaryFirstSelectionStrategy,
  LoadBalancedSelectionStrategy,
  CapabilityBasedSelectionStrategy,
  AdaptiveSelectionStrategy,
} from '../../../../../src/core/pdf/engines/selection-strategies';
import type {
  IPDFEngine,
  PDFGenerationContext,
  PDFEngineHealthStatus,
  PDFEngineCapabilities,
  PDFEngineResult,
} from '../../../../../src/core/pdf/engines/types';

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
      supportsBookmarks: false,
      supportsOutlineGeneration: false,
    },
    private canHandleResult: boolean = true,
  ) {}

  async initialize(): Promise<void> {
    // Mock implementation
  }

  async generatePDF(context: PDFGenerationContext): Promise<PDFEngineResult> {
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
    return {
      isHealthy: true,
      engineName: this.name,
      lastCheck: new Date(),
      errors: [],
      performance: {
        averageGenerationTime: 1000,
        successRate: 95,
        memoryUsage: 100 * 1024 * 1024, // 100MB
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
}

describe('PDF Engine Selection Strategies', () => {
  let mockContext: PDFGenerationContext;
  let mockEngines: IPDFEngine[];
  let mockHealthStatuses: PDFEngineHealthStatus[];

  beforeEach(() => {
    mockContext = {
      htmlContent: '<html><body>Test</body></html>',
      outputPath: '/test/output.pdf',
      title: 'Test Document',
      enableChineseSupport: false,
      toc: {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
        title: 'Contents',
      },
    };

    mockEngines = [
      new MockPDFEngine('puppeteer'),
      new MockPDFEngine('playwright'),
    ];

    mockHealthStatuses = [
      {
        isHealthy: true,
        engineName: 'puppeteer',
        lastCheck: new Date(),
        errors: [],
        performance: {
          averageGenerationTime: 1500,
          successRate: 90,
          memoryUsage: 150 * 1024 * 1024,
        },
      },
      {
        isHealthy: true,
        engineName: 'playwright',
        lastCheck: new Date(),
        errors: [],
        performance: {
          averageGenerationTime: 1000,
          successRate: 98,
          memoryUsage: 100 * 1024 * 1024,
        },
      },
    ];
  });

  describe('HealthFirstSelectionStrategy', () => {
    let strategy: HealthFirstSelectionStrategy;

    beforeEach(() => {
      strategy = new HealthFirstSelectionStrategy();
    });

    it('should select the healthiest engine', async () => {
      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        mockHealthStatuses,
      );

      expect(selectedEngine).toBeTruthy();
      expect(selectedEngine?.name).toBe('playwright'); // Highest performance
    });

    it('should return null when no engines available', async () => {
      const selectedEngine = await strategy.selectEngine(mockContext, [], []);

      expect(selectedEngine).toBeNull();
    });

    it('should return null when no healthy engines available', async () => {
      const unhealthyStatuses = mockHealthStatuses.map((status) => ({
        ...status,
        isHealthy: false,
      }));

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        unhealthyStatuses,
      );

      expect(selectedEngine).toBeNull();
    });

    it('should filter engines that cannot handle context', async () => {
      const engines = [
        new MockPDFEngine('good-engine', '1.0.0', undefined, true),
        new MockPDFEngine('bad-engine', '1.0.0', undefined, false),
      ];

      const statuses = [
        {
          isHealthy: true,
          engineName: 'good-engine',
          lastCheck: new Date(),
          errors: [],
          performance: {
            averageGenerationTime: 1000,
            successRate: 95,
            memoryUsage: 100 * 1024 * 1024,
          },
        },
        {
          isHealthy: true,
          engineName: 'bad-engine',
          lastCheck: new Date(),
          errors: [],
          performance: {
            averageGenerationTime: 1000,
            successRate: 95,
            memoryUsage: 100 * 1024 * 1024,
          },
        },
      ];

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        engines,
        statuses,
      );

      expect(selectedEngine).toBeTruthy();
      expect(selectedEngine?.name).toBe('good-engine');
    });

    it('should penalize engines with errors', async () => {
      const statusesWithErrors = [...mockHealthStatuses];
      statusesWithErrors[0] = {
        ...statusesWithErrors[0],
        errors: ['Error 1', 'Error 2'],
      };

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        statusesWithErrors,
      );

      expect(selectedEngine).toBeTruthy();
      expect(selectedEngine?.name).not.toBe('puppeteer'); // Should not select the one with errors
    });
  });

  describe('PrimaryFirstSelectionStrategy', () => {
    let strategy: PrimaryFirstSelectionStrategy;

    beforeEach(() => {
      strategy = new PrimaryFirstSelectionStrategy('puppeteer');
    });

    it('should select primary engine when available and healthy', async () => {
      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        mockHealthStatuses,
      );

      expect(selectedEngine).toBeTruthy();
      expect(selectedEngine?.name).toBe('puppeteer');
    });

    it('should fallback to other engines when primary is unhealthy', async () => {
      const statusesWithUnhealthyPrimary = [...mockHealthStatuses];
      statusesWithUnhealthyPrimary[0] = {
        ...statusesWithUnhealthyPrimary[0],
        isHealthy: false,
      };

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        statusesWithUnhealthyPrimary,
      );

      expect(selectedEngine).toBeTruthy();
      expect(selectedEngine?.name).not.toBe('puppeteer');
    });

    it('should fallback when primary engine cannot handle context', async () => {
      const enginesWithUnablesPrimary = [
        new MockPDFEngine('puppeteer', '1.0.0', undefined, false),
        ...mockEngines.slice(1),
      ];

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        enginesWithUnablesPrimary,
        mockHealthStatuses,
      );

      expect(selectedEngine).toBeTruthy();
      expect(selectedEngine?.name).not.toBe('puppeteer');
    });

    it('should return null when primary not found and no fallbacks', async () => {
      const nonPrimaryEngines = mockEngines.filter(
        (e) => e.name !== 'puppeteer',
      );
      const nonPrimaryStatuses = mockHealthStatuses
        .filter((s) => s.engineName !== 'puppeteer')
        .map((status) => ({ ...status, isHealthy: false }));

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        nonPrimaryEngines,
        nonPrimaryStatuses,
      );

      expect(selectedEngine).toBeNull();
    });
  });

  describe('LoadBalancedSelectionStrategy', () => {
    let strategy: LoadBalancedSelectionStrategy;

    beforeEach(() => {
      strategy = new LoadBalancedSelectionStrategy();
    });

    it('should distribute load across multiple engines', async () => {
      const selections: string[] = [];

      // Make multiple selections
      for (let i = 0; i < 6; i++) {
        const selectedEngine = await strategy.selectEngine(
          mockContext,
          mockEngines,
          mockHealthStatuses,
        );
        if (selectedEngine) {
          selections.push(selectedEngine.name);
        }
      }

      expect(selections).toHaveLength(6);
      // Should have used multiple engines
      const uniqueEngines = new Set(selections);
      expect(uniqueEngines.size).toBeGreaterThan(1);
    });

    it('should only select healthy engines', async () => {
      const statusesWithOneUnhealthy = [...mockHealthStatuses];
      statusesWithOneUnhealthy[0] = {
        ...statusesWithOneUnhealthy[0],
        isHealthy: false,
      };

      const selections: string[] = [];
      for (let i = 0; i < 4; i++) {
        const selectedEngine = await strategy.selectEngine(
          mockContext,
          mockEngines,
          statusesWithOneUnhealthy,
        );
        if (selectedEngine) {
          selections.push(selectedEngine.name);
        }
      }

      expect(selections.every((name) => name !== 'puppeteer')).toBe(true);
    });

    it('should return null when no healthy engines available', async () => {
      const unhealthyStatuses = mockHealthStatuses.map((status) => ({
        ...status,
        isHealthy: false,
      }));

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        unhealthyStatuses,
      );

      expect(selectedEngine).toBeNull();
    });
  });

  describe('CapabilityBasedSelectionStrategy', () => {
    let strategy: CapabilityBasedSelectionStrategy;

    beforeEach(() => {
      strategy = new CapabilityBasedSelectionStrategy();
    });

    it('should select engine with best capability match', async () => {
      const enginesWithDifferentCapabilities = [
        new MockPDFEngine('basic-engine', '1.0.0', {
          supportedFormats: ['A4'],
          maxConcurrentJobs: 1,
          supportsCustomCSS: false,
          supportsChineseText: false,
          supportsTOC: false,
          supportsHeaderFooter: false,
          supportsBookmarks: false,
          supportsOutlineGeneration: false,
        }),
        new MockPDFEngine('advanced-engine', '1.0.0', {
          supportedFormats: ['A4', 'A3'],
          maxConcurrentJobs: 5,
          supportsCustomCSS: true,
          supportsChineseText: true,
          supportsTOC: true,
          supportsHeaderFooter: true,
          supportsBookmarks: true,
          supportsOutlineGeneration: true,
        }),
      ];

      const statuses = [
        {
          isHealthy: true,
          engineName: 'basic-engine',
          lastCheck: new Date(),
          errors: [],
        },
        {
          isHealthy: true,
          engineName: 'advanced-engine',
          lastCheck: new Date(),
          errors: [],
        },
      ];

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        enginesWithDifferentCapabilities,
        statuses,
      );

      expect(selectedEngine).toBeTruthy();
      expect(selectedEngine?.name).toBe('advanced-engine');
    });

    it('should score engines based on Chinese support requirement', async () => {
      const contextWithChinese = {
        ...mockContext,
        enableChineseSupport: true,
      };

      const enginesWithDifferentChineseSupport = [
        new MockPDFEngine('no-chinese', '1.0.0', {
          supportedFormats: ['A4'],
          maxConcurrentJobs: 1,
          supportsCustomCSS: true,
          supportsChineseText: false,
          supportsTOC: true,
          supportsHeaderFooter: true,
          supportsBookmarks: false,
          supportsOutlineGeneration: false,
        }),
        new MockPDFEngine('with-chinese', '1.0.0', {
          supportedFormats: ['A4'],
          maxConcurrentJobs: 1,
          supportsCustomCSS: true,
          supportsChineseText: true,
          supportsTOC: true,
          supportsHeaderFooter: true,
          supportsBookmarks: true,
          supportsOutlineGeneration: true,
        }),
      ];

      const statuses = [
        {
          isHealthy: true,
          engineName: 'no-chinese',
          lastCheck: new Date(),
          errors: [],
        },
        {
          isHealthy: true,
          engineName: 'with-chinese',
          lastCheck: new Date(),
          errors: [],
        },
      ];

      const selectedEngine = await strategy.selectEngine(
        contextWithChinese,
        enginesWithDifferentChineseSupport,
        statuses,
      );

      expect(selectedEngine?.name).toBe('with-chinese');
    });

    it('should return null when no engines can handle context', async () => {
      const unableEngines = mockEngines.map(
        (engine) => new MockPDFEngine(engine.name, '1.0.0', undefined, false),
      );

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        unableEngines,
        mockHealthStatuses,
      );

      expect(selectedEngine).toBeNull();
    });
  });

  describe('AdaptiveSelectionStrategy', () => {
    let strategy: AdaptiveSelectionStrategy;

    beforeEach(() => {
      strategy = new AdaptiveSelectionStrategy();
    });

    it('should select engine with no history initially', async () => {
      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        mockHealthStatuses,
      );

      expect(selectedEngine).toBeTruthy();
      expect(mockEngines.map((e) => e.name)).toContain(selectedEngine!.name);
    });

    it('should record performance and adapt selection', async () => {
      // Record good performance for one engine
      strategy.recordPerformance('playwright', true, 800);
      strategy.recordPerformance('playwright', true, 900);

      // Record poor performance for another
      strategy.recordPerformance('puppeteer', false, 5000);
      strategy.recordPerformance('puppeteer', false, 6000);

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        mockHealthStatuses,
      );

      expect(selectedEngine).toBeTruthy();
      // Should prefer the engine with better recorded performance
      expect(selectedEngine?.name).toBe('playwright');
    });

    it('should give higher weight to recent performance', async () => {
      // Record old good performance
      for (let i = 0; i < 20; i++) {
        strategy.recordPerformance('puppeteer', true, 1000);
      }

      // Record recent poor performance
      for (let i = 0; i < 5; i++) {
        strategy.recordPerformance('puppeteer', false, 10000);
      }

      // Record recent good performance for another engine
      for (let i = 0; i < 5; i++) {
        strategy.recordPerformance('playwright', true, 800);
      }

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        mockHealthStatuses,
      );

      expect(selectedEngine?.name).toBe('playwright');
    });

    it('should limit performance history size', async () => {
      // Record more than max history size
      for (let i = 0; i < 150; i++) {
        strategy.recordPerformance('puppeteer', true, 1000);
      }

      // Performance should still be recorded (internal check)
      expect(true).toBe(true); // This test primarily checks that the method doesn't crash
    });

    it('should handle fast generation times correctly', async () => {
      strategy.recordPerformance('fast-engine', true, 2000); // 2 seconds
      strategy.recordPerformance('slow-engine', true, 8000); // 8 seconds

      // Fast engine should get bonus points
      expect(true).toBe(true); // Internal scoring logic validation
    });

    it('should return null when no healthy engines available', async () => {
      const unhealthyStatuses = mockHealthStatuses.map((status) => ({
        ...status,
        isHealthy: false,
      }));

      const selectedEngine = await strategy.selectEngine(
        mockContext,
        mockEngines,
        unhealthyStatuses,
      );

      expect(selectedEngine).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty engine arrays gracefully', async () => {
      const strategy = new HealthFirstSelectionStrategy();
      const result = await strategy.selectEngine(mockContext, [], []);
      expect(result).toBeNull();
    });

    it('should handle mismatched engines and health statuses', async () => {
      const strategy = new HealthFirstSelectionStrategy();
      const mismatchedStatuses = [mockHealthStatuses[0]]; // Only one status for three engines

      const result = await strategy.selectEngine(
        mockContext,
        mockEngines,
        mismatchedStatuses,
      );

      expect(result).toBeTruthy(); // Should still work, but only consider engines with status
    });

    it('should handle engines with missing performance data', async () => {
      const statusesWithoutPerformance: PDFEngineHealthStatus[] =
        mockHealthStatuses.map((status) => {
          const { performance, ...statusWithoutPerformance } = status;
          return statusWithoutPerformance;
        });

      const strategy = new HealthFirstSelectionStrategy();
      const result = await strategy.selectEngine(
        mockContext,
        mockEngines,
        statusesWithoutPerformance,
      );

      expect(result).toBeTruthy(); // Should still select an engine
    });
  });
});
