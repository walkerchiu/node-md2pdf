/**
 * Unit tests for TOCGeneratorService
 */

import {
  TOCGeneratorService,
  ITOCGeneratorService,
} from '../../../../src/application/services/toc-generator.service';
import { TOCGenerator } from '../../../../src/core/toc/toc-generator';
import {
  TOCGeneratorOptions,
  TOCGenerationResult,
  TOCItemFlat,
  TOCItemNested,
} from '../../../../src/core/toc/types';
import { Heading } from '../../../../src/types/index';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../../src/infrastructure/error/types';
import type { IConfigManager } from '../../../../src/infrastructure/config/types';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import { MD2PDFError } from '../../../../src/infrastructure/error/errors';

// Mock the core modules
jest.mock('../../../../src/core/toc/toc-generator');

describe('TOCGeneratorService', () => {
  let service: ITOCGeneratorService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let mockTranslationManager: jest.Mocked<ITranslationManager>;
  let MockTOCGenerator: jest.MockedClass<typeof TOCGenerator>;
  let mockTOCGeneratorInstance: jest.Mocked<{
    generateTOC: jest.MockedFunction<
      (headings: unknown[], options?: unknown) => unknown
    >;
    validateOptions: jest.MockedFunction<(options: unknown) => boolean>;
    sanitizeOptions: jest.MockedFunction<(options: unknown) => unknown>;
  }>;

  const sampleHeadings: Heading[] = [
    {
      level: 1,
      text: 'Introduction',
      id: 'introduction',
      anchor: 'introduction',
    },
    {
      level: 2,
      text: 'Getting Started',
      id: 'getting-started',
      anchor: 'getting-started',
    },
    {
      level: 2,
      text: 'Installation',
      id: 'installation',
      anchor: 'installation',
    },
    {
      level: 3,
      text: 'Prerequisites',
      id: 'prerequisites',
      anchor: 'prerequisites',
    },
    {
      level: 1,
      text: 'Configuration',
      id: 'configuration',
      anchor: 'configuration',
    },
  ];

  const mockTOCResult: TOCGenerationResult = {
    html: '<nav class="toc-container"><ol class="toc-list"><li class="toc-item"><a href="#introduction">Introduction</a></li></ol></nav>',
    items: [
      { title: 'Introduction', level: 1, anchor: 'introduction', index: 0 },
      {
        title: 'Getting Started',
        level: 2,
        anchor: 'getting-started',
        index: 1,
      },
    ] as TOCItemFlat[],
    tree: [
      {
        title: 'Introduction',
        level: 1,
        anchor: 'introduction',
        children: [
          {
            title: 'Getting Started',
            level: 2,
            anchor: 'getting-started',
            children: [],
          },
        ],
      },
    ] as TOCItemNested[],
    stats: {
      totalItems: 2,
      maxDepth: 2,
      itemsByLevel: { 1: 1, 2: 1 },
    },
  };

  const defaultTOCConfig: TOCGeneratorOptions = {
    maxDepth: 3,
    includePageNumbers: false,
    cssClasses: {
      container: 'toc-container',
      title: 'toc-title',
      list: 'toc-list',
      item: 'toc-item',
      link: 'toc-link',
      pageNumber: 'toc-page-number',
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock ILogger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    // Mock IErrorHandler
    mockErrorHandler = {
      handleError: jest.fn(),
      formatError: jest.fn(),
      isRecoverable: jest.fn(),
      categorizeError: jest.fn(),
    };

    // Mock IConfigManager
    mockConfigManager = {
      get: jest.fn().mockReturnValue(defaultTOCConfig),
      set: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      onConfigCreated: jest.fn(),
      onConfigChanged: jest.fn(),
      setAndSave: jest.fn().mockResolvedValue(undefined),
      getConfigPath: jest.fn().mockReturnValue('/mock/config/path'),
    };

    // Mock ITranslationManager
    mockTranslationManager = {
      t: jest.fn().mockImplementation((key: string) => {
        if (key === 'pdfContent.tocTitle') return 'Table of Contents';
        return key;
      }),
      getCurrentLocale: jest.fn().mockReturnValue('en'),
      setLocale: jest.fn(),
      getSupportedLocales: jest.fn().mockReturnValue(['en', 'zh-TW']),
      translate: jest.fn(),
      hasTranslation: jest.fn().mockReturnValue(true),
      loadTranslations: jest.fn(),
      getTranslations: jest.fn().mockReturnValue({}),
    };

    // Mock TOCGenerator
    MockTOCGenerator = TOCGenerator as jest.MockedClass<typeof TOCGenerator>;
    MockTOCGenerator.mockClear();

    mockTOCGeneratorInstance = {
      generateTOC: jest.fn(),
      validateOptions: jest.fn(),
      sanitizeOptions: jest.fn(),
    };
    MockTOCGenerator.mockImplementation(
      () => mockTOCGeneratorInstance as unknown as TOCGenerator,
    );

    // Setup default successful behavior
    mockTOCGeneratorInstance.generateTOC.mockReturnValue(mockTOCResult);

    // Create service instance
    service = new TOCGeneratorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
      mockTranslationManager,
    );
  });

  describe('initialization', () => {
    it('should initialize TOC generator successfully', async () => {
      await service.generateTOC(sampleHeadings);

      expect(MockTOCGenerator).toHaveBeenCalledWith(
        defaultTOCConfig,
        mockTranslationManager,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'toc',
        expect.any(Object),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing TOC generator service',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'TOC generator service initialized successfully',
      );
    });

    it('should not reinitialize if already initialized', async () => {
      await service.generateTOC(sampleHeadings);
      await service.generateTOC(sampleHeadings);

      expect(MockTOCGenerator).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      MockTOCGenerator.mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      await expect(service.generateTOC(sampleHeadings)).rejects.toThrow(
        MD2PDFError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'TOCGeneratorService.initialize',
      );
    });
  });

  describe('generateTOC', () => {
    it('should generate TOC successfully', async () => {
      const result = await service.generateTOC(sampleHeadings);

      expect(result).toEqual(mockTOCResult);
      expect(mockTOCGeneratorInstance.generateTOC).toHaveBeenCalledWith(
        sampleHeadings,
        undefined,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Generating TOC from ${sampleHeadings.length} headings`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`TOC generated successfully`),
      );
    });

    it('should use custom options when provided', async () => {
      const customOptions: Partial<TOCGeneratorOptions> = {
        maxDepth: 2,
        includePageNumbers: false,
      };

      await service.generateTOC(sampleHeadings, undefined, customOptions);

      expect(MockTOCGenerator).toHaveBeenCalledTimes(2); // Once for initialization, once for custom options
      expect(mockConfigManager.get).toHaveBeenCalledWith('toc', {});
    });

    it('should handle TOC generation errors', async () => {
      const tocError = new Error('TOC generation failed');
      mockTOCGeneratorInstance.generateTOC.mockImplementation(() => {
        throw tocError;
      });

      await expect(service.generateTOC(sampleHeadings)).rejects.toThrow(
        MD2PDFError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'TOCGeneratorService.generateTOC',
      );
    });

    it('should track generation performance', async () => {
      // Add a small delay to ensure processing time > 0
      mockTOCGeneratorInstance.generateTOC.mockImplementation(() => {
        // Synchronous mock with delay simulation - use setTimeout to ensure async behavior
        const startTime = Date.now();
        while (Date.now() - startTime < 10) {
          // Busy wait for 10ms
        }
        return mockTOCResult;
      });

      await service.generateTOC(sampleHeadings);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/TOC generated successfully \(\d+ms\)/),
      );
    });

    it('should include error context in wrapped errors', async () => {
      const tocError = new Error('Generation failed');
      mockTOCGeneratorInstance.generateTOC.mockImplementation(() => {
        throw tocError;
      });

      try {
        await service.generateTOC(sampleHeadings, undefined, { maxDepth: 2 });
      } catch (error) {
        expect(error).toBeInstanceOf(MD2PDFError);
        const wrappedError = error as MD2PDFError;
        expect(wrappedError.context).toMatchObject({
          headingsCount: sampleHeadings.length,
          options: { maxDepth: 2 },
          originalError: tocError,
        });
      }
    });
  });

  describe('validateHeadings', () => {
    it('should validate correct headings', async () => {
      const result = await service.validateHeadings(sampleHeadings);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Validating ${sampleHeadings.length} headings`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `All ${sampleHeadings.length} headings are valid`,
      );
    });

    it('should return false for empty headings array', async () => {
      const result = await service.validateHeadings([]);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No headings provided for validation',
      );
    });

    it('should return false for null/undefined headings', async () => {
      const result = await service.validateHeadings(
        null as unknown as Heading[],
      );

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Heading validation error:'),
      );
    });

    it('should return false for invalid headings', async () => {
      const invalidHeadings: Heading[] = [
        { level: 1, text: 'Valid', id: 'valid', anchor: 'valid' },
        {
          level: 7,
          text: 'Invalid Level',
          id: 'invalid-level',
          anchor: 'invalid-level',
        }, // Invalid level
        { level: 2, text: '', id: 'empty-text', anchor: 'empty-text' }, // Empty text
        { level: 3, text: 'No ID', id: '', anchor: 'no-id' }, // Empty id
      ];

      const result = await service.validateHeadings(invalidHeadings);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Found 3 invalid headings');
    });

    it('should handle validation errors gracefully', async () => {
      // Create an object that will cause JSON.stringify to throw (circular reference issue doesn't actually happen with filter)
      // Instead, let's create a scenario where the validation itself fails
      const corruptedHeadings = [
        { level: 1, text: 'Valid', id: 'valid', anchor: 'valid' },
        null, // This will cause issues in validation
      ] as unknown as Heading[];

      const result = await service.validateHeadings(corruptedHeadings);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Heading validation error:'),
      );
    });
  });

  describe('configuration', () => {
    it('should use custom TOC configuration', async () => {
      const customConfig: TOCGeneratorOptions = {
        maxDepth: 4,
        includePageNumbers: false,
        cssClasses: {
          container: 'custom-toc',
          title: 'custom-title',
          list: 'custom-list',
          item: 'custom-item',
          link: 'custom-link',
          pageNumber: 'custom-page',
        },
      };

      mockConfigManager.get.mockReturnValue(customConfig);

      const customService = new TOCGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      await customService.generateTOC(sampleHeadings);

      expect(MockTOCGenerator).toHaveBeenCalledWith(
        customConfig,
        mockTranslationManager,
      );
    });

    it('should use default configuration when config manager returns undefined', async () => {
      mockConfigManager.get.mockImplementation(
        (_key: string, defaultValue: any) => {
          return defaultValue; // Return the provided default value
        },
      );

      const service = new TOCGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      await service.generateTOC(sampleHeadings);

      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'toc',
        defaultTOCConfig,
      );
      expect(MockTOCGenerator).toHaveBeenCalledWith(
        defaultTOCConfig,
        mockTranslationManager,
      );
    });
  });

  describe('error handling', () => {
    it('should properly wrap initialization errors', async () => {
      const originalError = new Error('Mock initialization error');
      MockTOCGenerator.mockImplementation(() => {
        throw originalError;
      });

      const service = new TOCGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      await expect(service.generateTOC(sampleHeadings)).rejects.toThrow(
        MD2PDFError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'TOCGeneratorService.initialize',
      );
    });
  });

  describe('service lifecycle', () => {
    it('should handle multiple operations after initialization', async () => {
      await service.generateTOC(sampleHeadings);
      await service.validateHeadings(sampleHeadings);

      expect(MockTOCGenerator).toHaveBeenCalledTimes(1); // Once for init only
    });

    it('should handle auto-initialization for different methods', async () => {
      const service1 = new TOCGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );
      const service2 = new TOCGeneratorService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockTranslationManager,
      );

      await service1.generateTOC(sampleHeadings);
      await service2.validateHeadings(sampleHeadings);

      expect(MockTOCGenerator).toHaveBeenCalledTimes(1); // Only service1 initializes TOCGenerator
    });
  });
});
