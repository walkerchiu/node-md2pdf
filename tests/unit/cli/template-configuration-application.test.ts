/**
 * Template Configuration Application Tests
 *
 * Tests to verify that template configurations are actually applied during PDF generation
 * This addresses the issue where template settings were displayed but not used
 */

import { jest } from '@jest/globals';

describe('Template Configuration Application', () => {
  let SmartConversionMode: any;
  let mockContainer: any;
  let mockLogger: any;
  let mockTranslator: any;
  let mockConfig: any;
  let mockFileProcessor: any;
  let mockSmartDefaults: any;
  let instance: any;

  beforeAll(async () => {
    // Mock external modules before importing
    jest.mock('inquirer');
    jest.mock('ora');
    jest.mock('chalk', () => ({
      green: jest.fn((text) => text),
      red: jest.fn((text) => text),
      yellow: jest.fn((text) => text),
      blue: jest.fn((text) => text),
      cyan: jest.fn((text) => text),
      magenta: jest.fn((text) => text),
      white: jest.fn((text) => text),
      gray: jest.fn((text) => text),
      bold: jest.fn((text) => text),
      dim: jest.fn((text) => text),
    }));

    const module = await import('../../../src/cli/smart-conversion-mode');
    SmartConversionMode = module.SmartConversionMode;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
      setLevel: jest.fn(),
    };

    mockTranslator = {
      t: jest.fn((key: string) => key),
      getCurrentLocale: jest.fn().mockReturnValue('en'),
      getSupportedLocales: jest.fn().mockReturnValue(['en', 'zh-TW']),
      setLocale: jest.fn(),
    };

    mockConfig = {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
      save: jest.fn(() => Promise.resolve()),
      has: jest.fn().mockReturnValue(false),
      getAll: jest.fn().mockReturnValue({}),
      getConfig: jest.fn().mockReturnValue({
        headersFooters: {
          header: { enabled: false },
          footer: { enabled: false },
        },
        metadata: {
          defaults: {},
        },
      }),
      updateConfig: jest.fn(),
      setAndSave: jest.fn(() => Promise.resolve()),
    };

    mockFileProcessor = {
      processFile: jest.fn(() => Promise.resolve()),
    };

    mockSmartDefaults = {
      analyzeContent: jest.fn(() =>
        Promise.resolve({
          wordCount: 1000,
          pageCount: 5,
          hasImages: false,
          hasTables: false,
          hasCodeBlocks: true,
          headingStructure: {
            totalHeadings: 5,
            maxDepth: 3,
            levels: [1, 2, 3],
          },
          languageDetection: {
            primary: 'en',
            confidence: 0.95,
          },
        }),
      ) as any,
      generateRecommendations: jest.fn(() =>
        Promise.resolve({
          quick: [],
          recommended: [],
        }),
      ) as any,
    };

    mockContainer = {
      resolve: jest.fn((key: string) => {
        const mocks: Record<string, any> = {
          logger: mockLogger,
          translator: mockTranslator,
          config: mockConfig,
          fileProcessor: mockFileProcessor,
          smartDefaults: mockSmartDefaults,
        };
        return mocks[key] || {};
      }),
    };

    instance = new SmartConversionMode(mockContainer);
  });

  // Note: Template application logic is inline in the conversion flow
  // These tests focus on the convertToProcessingConfig method which is the key place
  // where template settings should be correctly applied

  describe('Template Anchor Settings Application', () => {
    it('should use template anchorDepth in processing config', () => {
      const template = createMockTemplate({
        config: {
          features: {
            toc: true,
            tocDepth: 3,
            anchorLinks: true,
            anchorDepth: 4,
          },
        },
      });

      const processingConfig = (instance as any).convertToProcessingConfig?.(
        undefined,
        createMockAnalysis(),
        true, // includeTOC
        3, // tocDepth
        4, // anchorDepth from template
        true, // anchorLinksEnabled from template
        undefined,
      );

      // Should use template's anchorDepth (4), not hardcoded 3
      expect(processingConfig?.tocReturnLinksLevel).toBe(4);
    });

    it('should set tocReturnLinksLevel to 0 when anchorLinks disabled', () => {
      const template = createMockTemplate({
        config: {
          features: {
            toc: true,
            tocDepth: 3,
            anchorLinks: false, // Disabled
            anchorDepth: 3,
          },
        },
      });

      const processingConfig = (instance as any).convertToProcessingConfig?.(
        undefined,
        createMockAnalysis(),
        true, // includeTOC
        3, // tocDepth
        3, // anchorDepth
        false, // anchorLinksEnabled = false
        undefined,
      );

      // Should be 0 when anchorLinks disabled, regardless of anchorDepth
      expect(processingConfig?.tocReturnLinksLevel).toBe(0);
    });

    it('should set tocReturnLinksLevel to 0 when TOC disabled', () => {
      const processingConfig = (instance as any).convertToProcessingConfig?.(
        undefined,
        createMockAnalysis(),
        false, // includeTOC = false
        3,
        3,
        true,
        undefined,
      );

      expect(processingConfig?.tocReturnLinksLevel).toBe(0);
    });
  });
});

/**
 * Helper function to create mock template
 */
function createMockTemplate(overrides: any = {}) {
  return {
    id: 'test-template',
    name: 'Test Template',
    description: 'Test Description',
    type: 'system',
    metadata: {
      version: '1.0.0',
      author: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    config: {
      pdf: {
        format: 'A4',
        orientation: 'portrait',
        margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
        displayHeaderFooter: false,
        ...overrides.config?.pdf,
      },
      headerFooter: {
        header: { enabled: false },
        footer: { enabled: false },
        ...overrides.config?.headerFooter,
      },
      styles: {
        theme: 'clean',
        fonts: {
          body: 'Inter',
          heading: 'Inter',
          code: 'Monaco',
        },
        colors: {},
        codeBlock: {
          theme: 'github',
          lineNumbers: false,
        },
        ...overrides.config?.styles,
      },
      features: {
        toc: false,
        tocDepth: 2,
        pageNumbers: false,
        anchorLinks: false,
        anchorDepth: 2,
        ...overrides.config?.features,
      },
      metadata: overrides.config?.metadata,
    },
  };
}

/**
 * Helper function to create mock content analysis
 */
function createMockAnalysis() {
  return {
    wordCount: 1000,
    pageCount: 5,
    hasImages: false,
    hasTables: false,
    hasCodeBlocks: true,
    headingStructure: {
      totalHeadings: 5,
      maxDepth: 3,
      levels: [1, 2, 3],
    },
    languageDetection: {
      primary: 'en',
      confidence: 0.95,
    },
    mediaElements: {
      images: [],
      videos: [],
      diagrams: [],
      hasImages: false,
      hasVideos: false,
      hasDiagrams: false,
    },
  };
}
