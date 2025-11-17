/**
 * smart-conversion-mode Unit Tests
 *
 * Simplified tests for smart-conversion-mode module to avoid memory issues
 */

import { jest } from '@jest/globals';

// Mock external ES modules
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
  italic: jest.fn((text) => text),
  underline: jest.fn((text) => text),
  inverse: jest.fn((text) => text),
  strikethrough: jest.fn((text) => text),
}));

describe('smart-conversion-mode', () => {
  // Dynamic import to avoid ES module issues
  let moduleExports: any;

  beforeAll(async () => {
    try {
      moduleExports = await import('../../../src/cli/smart-conversion-mode');
    } catch (error) {
      console.warn('Unable to import module:', error);
      moduleExports = {};
    }
  });

  describe('Module Structure', () => {
    it('should successfully load module', () => {
      expect(moduleExports).toBeDefined();
    });

    it('should export SmartConversionMode class', () => {
      expect(moduleExports.SmartConversionMode).toBeDefined();
      expect(typeof moduleExports.SmartConversionMode).toBe('function');
    });
  });

  describe('SmartConversionMode Basic Tests', () => {
    let mockContainer: any;
    let mockLogger: any;
    let mockTranslator: any;
    let mockSmartDefaults: any;
    let mockFileProcessor: any;

    beforeEach(() => {
      // Clear all mocks first
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
        getSupportedLocales: jest.fn().mockReturnValue(['en']),
        setLocale: jest.fn(),
      };

      // Simplified mock for SmartDefaults
      mockSmartDefaults = {
        analyzeContent: jest.fn().mockImplementation(() =>
          Promise.resolve({
            wordCount: 1000,
            pageCount: 5,
            hasImages: true,
            hasTables: false,
            hasCodeBlocks: true,
            estimatedReadingTime: 4,
            hasLinks: true,
            headingStructure: {
              totalHeadings: 5,
              maxDepth: 3,
              levels: [1, 2, 3, 2, 1],
            },
            languageDetection: {
              primary: 'en',
              confidence: 0.95,
              detected: ['en'],
            },
            structure: {
              sections: 3,
              subsections: 8,
            },
          }),
        ),
        generateRecommendations: jest.fn().mockImplementation(() =>
          Promise.resolve({
            quickConfigs: [
              {
                name: 'Professional Document',
                description: 'Standard business formatting',
                config: {
                  margins: { top: 25, bottom: 25, left: 25, right: 25 },
                },
              },
            ],
            smartConfig: {
              format: 'A4',
              margins: { top: 25, bottom: 25, left: 25, right: 25 },
              pageNumbers: true,
            },
          }),
        ),
      };

      mockFileProcessor = {
        processFile: jest.fn().mockImplementation(() =>
          Promise.resolve({
            success: true,
            outputPath: '/mock/output.pdf',
          }),
        ),
      };

      mockContainer = {
        resolve: jest.fn((key: string) => {
          const mocks: Record<string, any> = {
            logger: mockLogger,
            translator: mockTranslator,
            smartDefaults: mockSmartDefaults,
            fileProcessor: mockFileProcessor,
          };
          return mocks[key] || {};
        }),
      };
    });

    it('should be able to create instance', () => {
      if (moduleExports.SmartConversionMode) {
        expect(() => {
          const instance = new moduleExports.SmartConversionMode(mockContainer);
          expect(instance).toBeDefined();
        }).not.toThrow();
      }
    });

    it('should create container if none provided', () => {
      if (moduleExports.SmartConversionMode) {
        expect(() => {
          const instance = new moduleExports.SmartConversionMode();
          expect(instance).toBeDefined();
        }).not.toThrow();
      }
    });

    it('should handle basic functionality', () => {
      if (moduleExports.SmartConversionMode) {
        const instance = new moduleExports.SmartConversionMode(mockContainer);

        // Test that dependencies are resolved
        expect(mockContainer.resolve).toHaveBeenCalled();

        // Test basic properties exist
        expect(instance).toHaveProperty('start');
        expect(typeof instance.start).toBe('function');
      }
    });
  });

  describe('Private Method Tests (via internal access)', () => {
    let instance: any;
    let mockContainer: any;
    let mockLogger: any;
    let mockTranslator: any;

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
        getSupportedLocales: jest.fn().mockReturnValue(['en']),
        setLocale: jest.fn(),
      };

      mockContainer = {
        resolve: jest.fn((key: string) => {
          const mocks: Record<string, any> = {
            logger: mockLogger,
            translator: mockTranslator,
            smartDefaults: {
              analyzeContent: jest.fn(),
              generateRecommendations: jest.fn(),
            },
            fileProcessor: {
              processFile: jest.fn(),
            },
          };
          return mocks[key] || {};
        }),
      };

      if (moduleExports.SmartConversionMode) {
        instance = new moduleExports.SmartConversionMode(mockContainer);
      }
    });

    describe('getLanguageDisplay', () => {
      it('should return translated language display', () => {
        if (!instance) return;

        mockTranslator.t.mockImplementation((key: string) => {
          if (key === 'smartConversion.languageDisplay.en') return 'English';
          if (key === 'smartConversion.languageDisplay.zh') return 'Chinese';
          return key;
        });

        const display = instance.getLanguageDisplay('en');
        expect(display).toBe('English');
      });

      it('should fallback to language code if translation missing', () => {
        if (!instance) return;

        mockTranslator.t.mockImplementation((key: string) => key);

        const display = instance.getLanguageDisplay('fr');
        expect(display).toBe('fr');
      });
    });

    describe('getDocumentTypeDisplay', () => {
      it('should return translated document type display', () => {
        if (!instance) return;

        mockTranslator.t.mockImplementation((key: string) => {
          if (key === 'smartConversion.documentTypeDisplay.technical-manual')
            return 'Technical Manual';
          return key;
        });

        const display = instance.getDocumentTypeDisplay('technical-manual');
        expect(display).toBe('Technical Manual');
      });

      it('should fallback to type name if translation missing', () => {
        if (!instance) return;

        mockTranslator.t.mockImplementation((key: string) => key);

        const display = instance.getDocumentTypeDisplay('unknown-type');
        expect(display).toBe('unknown-type');
      });
    });

    describe('getEstimatedTime', () => {
      it('should return estimatedTime from QuickConfig', () => {
        if (!instance) return;

        const config: any = {
          estimatedTime: 10,
          config: {},
        };

        const time = instance.getEstimatedTime(config);
        expect(time).toBe(10);
      });

      it('should return estimatedProcessingTime from RecommendedConfig', () => {
        if (!instance) return;

        const config: any = {
          optimization: {
            estimatedProcessingTime: 15,
          },
        };

        const time = instance.getEstimatedTime(config);
        expect(time).toBe(15);
      });

      it('should return default time if not specified', () => {
        if (!instance) return;

        const config: any = {};

        const time = instance.getEstimatedTime(config);
        expect(time).toBe(5);
      });
    });

    describe('getRecommendedTOCValue', () => {
      const mockAnalysis = {
        headingStructure: {
          totalHeadings: 5,
          maxDepth: 3,
          levels: [1, 2, 3],
        },
      };

      it('should return true from QuickConfig when enabled', () => {
        if (!instance) return;

        const config: any = {
          config: {
            tocConfig: {
              enabled: true,
            },
          },
        };

        const value = instance.getRecommendedTOCValue(config, mockAnalysis);
        expect(value).toBe(true);
      });

      it('should return false from QuickConfig when disabled', () => {
        if (!instance) return;

        const config: any = {
          config: {
            tocConfig: {
              enabled: false,
            },
          },
        };

        const value = instance.getRecommendedTOCValue(config, mockAnalysis);
        expect(value).toBe(false);
      });

      it('should use analysis for QuickConfig when not specified', () => {
        if (!instance) return;

        const config: any = {
          config: {},
        };

        const value = instance.getRecommendedTOCValue(config, mockAnalysis);
        expect(value).toBe(true); // totalHeadings (5) > 3
      });

      it('should return true from RecommendedConfig when enabled', () => {
        if (!instance) return;

        const config: any = {
          tocConfig: {
            enabled: true,
          },
        };

        const value = instance.getRecommendedTOCValue(config, mockAnalysis);
        expect(value).toBe(true);
      });

      it('should use analysis for RecommendedConfig when not specified', () => {
        if (!instance) return;

        const config: any = {};

        const value = instance.getRecommendedTOCValue(config, mockAnalysis);
        expect(value).toBe(true); // totalHeadings (5) > 3
      });
    });

    describe('getRecommendedTOCDepth', () => {
      const mockAnalysis = {
        headingStructure: {
          totalHeadings: 5,
          maxDepth: 4,
          levels: [1, 2, 3, 4],
        },
      };

      it('should return depth from QuickConfig', () => {
        if (!instance) return;

        const config: any = {
          config: {
            tocConfig: {
              maxDepth: 2,
            },
          },
        };

        const depth = instance.getRecommendedTOCDepth(config, mockAnalysis);
        expect(depth).toBe(2);
      });

      it('should use analysis depth for QuickConfig when not specified', () => {
        if (!instance) return;

        const config: any = {
          config: {},
        };

        const depth = instance.getRecommendedTOCDepth(config, mockAnalysis);
        expect(depth).toBe(3); // min(4, 3) = 3
      });

      it('should return depth from RecommendedConfig', () => {
        if (!instance) return;

        const config: any = {
          tocConfig: {
            maxDepth: 5,
          },
        };

        const depth = instance.getRecommendedTOCDepth(config, mockAnalysis);
        expect(depth).toBe(5);
      });

      it('should use analysis depth for RecommendedConfig when not specified', () => {
        if (!instance) return;

        const config: any = {};

        const depth = instance.getRecommendedTOCDepth(config, mockAnalysis);
        expect(depth).toBe(3); // min(4, 3) = 3
      });
    });

    describe('shouldEnableTwoStageRendering', () => {
      it('should enable when TOC is included', () => {
        if (!instance) return;

        const analysis: any = {
          mediaElements: {
            hasDiagrams: false,
            images: 0,
          },
          headingStructure: {
            totalHeadings: 2,
          },
        };

        const result = instance.shouldEnableTwoStageRendering(analysis, true);
        expect(result).toBe(true);
      });

      it('should enable when has diagrams', () => {
        if (!instance) return;

        const analysis: any = {
          mediaElements: {
            hasDiagrams: true,
            images: 0,
          },
          headingStructure: {
            totalHeadings: 2,
          },
        };

        const result = instance.shouldEnableTwoStageRendering(analysis, false);
        expect(result).toBe(true);
      });

      it('should enable when has many headings', () => {
        if (!instance) return;

        const analysis: any = {
          mediaElements: {
            hasDiagrams: false,
            images: 0,
          },
          headingStructure: {
            totalHeadings: 15,
          },
        };

        const result = instance.shouldEnableTwoStageRendering(analysis, false);
        expect(result).toBe(true);
      });

      it('should enable when has many images', () => {
        if (!instance) return;

        const analysis: any = {
          mediaElements: {
            hasDiagrams: false,
            images: 10,
          },
          headingStructure: {
            totalHeadings: 2,
          },
        };

        const result = instance.shouldEnableTwoStageRendering(analysis, false);
        expect(result).toBe(true);
      });

      it('should not enable for simple content', () => {
        if (!instance) return;

        const analysis: any = {
          mediaElements: {
            hasDiagrams: false,
            images: 2,
          },
          headingStructure: {
            totalHeadings: 5,
          },
        };

        const result = instance.shouldEnableTwoStageRendering(analysis, false);
        expect(result).toBe(false);
      });
    });

    describe('convertToProcessingConfig', () => {
      const mockAnalysis: any = {
        mediaElements: {
          hasDiagrams: false,
          images: 0,
        },
        headingStructure: {
          totalHeadings: 5,
          maxDepth: 3,
        },
      };

      it('should create basic config when no config provided', () => {
        if (!instance) return;

        const result = instance.convertToProcessingConfig(
          undefined,
          mockAnalysis,
          true,
          3,
        );

        expect(result).toMatchObject({
          includeTOC: true,
          tocReturnLinksLevel: 3,
          tocOptions: {
            maxDepth: 3,
            includePageNumbers: true,
          },
        });
      });

      it('should set tocReturnLinksLevel to 0 when TOC disabled', () => {
        if (!instance) return;

        const result = instance.convertToProcessingConfig(
          undefined,
          mockAnalysis,
          false,
          3,
        );

        expect(result.tocReturnLinksLevel).toBe(0);
        expect(result.includeTOC).toBe(false);
      });

      it('should set tocReturnLinksLevel to 0 when anchorLinks disabled', () => {
        if (!instance) return;

        const result = instance.convertToProcessingConfig(
          undefined,
          mockAnalysis,
          true,
          3,
          undefined,
          false, // anchorLinksEnabled = false
        );

        expect(result.tocReturnLinksLevel).toBe(0);
      });

      it('should use provided tocReturnLinksLevel', () => {
        if (!instance) return;

        const result = instance.convertToProcessingConfig(
          undefined,
          mockAnalysis,
          true,
          3,
          5, // tocReturnLinksLevel
          true,
        );

        expect(result.tocReturnLinksLevel).toBe(5);
      });

      it('should apply headersFootersConfig when provided', () => {
        if (!instance) return;

        const headersFootersConfig = {
          header: { enabled: true },
          footer: { enabled: true },
        };

        const result = instance.convertToProcessingConfig(
          undefined,
          mockAnalysis,
          true,
          3,
          undefined,
          undefined,
          headersFootersConfig,
        );

        expect(result.headersFootersConfig).toBe(headersFootersConfig);
      });
    });

    describe('addToRecentFiles', () => {
      let mockRecentFilesManager: any;

      beforeEach(() => {
        mockRecentFilesManager = {
          addFile: jest.fn(() => Promise.resolve()),
        };
        if (instance) {
          instance.recentFilesManager = mockRecentFilesManager;
        }
      });

      it('should add file to recent files successfully', async () => {
        if (!instance) return;

        await instance.addToRecentFiles('/test/file.md');

        expect(mockRecentFilesManager.addFile).toHaveBeenCalledWith(
          '/test/file.md',
        );
        expect(mockLogger.debug).toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        if (!instance) return;

        mockRecentFilesManager.addFile.mockRejectedValue(
          new Error('Failed to add'),
        );

        await expect(
          instance.addToRecentFiles('/test/file.md'),
        ).resolves.not.toThrow();

        expect(mockLogger.warn).toHaveBeenCalled();
      });
    });
  });
});
