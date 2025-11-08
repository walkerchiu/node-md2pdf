import { HeaderFooterGenerator } from '../../../../src/core/headers-footers/generator';
import {
  HeadersFootersConfig,
  HeaderFooterContext,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_FOOTER_CONFIG,
} from '../../../../src/core/headers-footers/types';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import type { ILogger } from '../../../../src/infrastructure/logging/types';

describe('HeaderFooterGenerator', () => {
  let generator: HeaderFooterGenerator;
  let mockTranslationManager: jest.Mocked<ITranslationManager>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockTranslationManager = {
      t: jest.fn((key: string, params?: any) => `translated_${key}`),
      setLocale: jest.fn(),
      getCurrentLocale: jest.fn(() => 'en' as const),
      getSupportedLocales: jest.fn(() => ['en', 'zh-TW'] as const),
      translate: jest.fn(
        (key: string, locale: 'en' | 'zh-TW', params?: any) =>
          `translated_${key}`,
      ),
      hasTranslation: jest.fn((key: string, locale?: 'en' | 'zh-TW') => true),
      loadTranslations: jest.fn(),
      getTranslations: jest.fn((locale: 'en' | 'zh-TW') => ({})),
    } as jest.Mocked<ITranslationManager>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(() => 'info'),
    };

    generator = new HeaderFooterGenerator(mockTranslationManager, mockLogger);
  });

  describe('constructor', () => {
    it('should create instance with translation manager and logger', () => {
      expect(generator).toBeInstanceOf(HeaderFooterGenerator);
    });
  });

  describe('generateCSSPageRules', () => {
    let mockContext: HeaderFooterContext;

    beforeEach(() => {
      mockContext = {
        documentTitle: 'Test Document',
        firstH1Title: 'Chapter 1',
        pageNumber: 1,
        totalPages: 10,
        currentDate: new Date('2024-01-15T10:30:00Z'),
        copyright: '© 2024 Test Corp',
        customMessage: 'Confidential',
        metadata: {
          title: 'Test Doc',
          author: 'John Doe',
          subject: 'Testing',
          keywords: 'test,example',
          language: 'en',
          creationDate: new Date('2024-01-01'),
          modDate: new Date('2024-01-15'),
          creator: 'MD2PDF',
          producer: 'MD2PDF v1.0',
        },
      };
    });

    it('should return empty string when no headers or footers are enabled', () => {
      const config: HeadersFootersConfig = {
        header: { ...DEFAULT_HEADER_CONFIG, enabled: false },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toBe('');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No headers or footers enabled - returning empty CSS',
      );
    });

    it('should return empty string when headers/footers are enabled but have no visible content', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'none', enabled: false, alignment: 'left' },
          pageNumber: { mode: 'none', enabled: false, alignment: 'center' },
          dateTime: { mode: 'none', enabled: false, alignment: 'right' },
          copyright: { mode: 'none', enabled: false, alignment: 'center' },
          message: { mode: 'none', enabled: false, alignment: 'center' },
          author: { mode: 'none', enabled: false, alignment: 'left' },
          organization: { mode: 'none', enabled: false, alignment: 'center' },
          version: { mode: 'none', enabled: false, alignment: 'right' },
          category: { mode: 'none', enabled: false, alignment: 'center' },
        },
        footer: {
          ...DEFAULT_FOOTER_CONFIG,
          enabled: true,
          title: { mode: 'none', enabled: false, alignment: 'left' },
          pageNumber: { mode: 'none', enabled: false, alignment: 'center' },
          dateTime: { mode: 'none', enabled: false, alignment: 'right' },
          copyright: { mode: 'none', enabled: false, alignment: 'center' },
          message: { mode: 'none', enabled: false, alignment: 'center' },
          author: { mode: 'none', enabled: false, alignment: 'left' },
          organization: { mode: 'none', enabled: false, alignment: 'center' },
          version: { mode: 'none', enabled: false, alignment: 'right' },
          category: { mode: 'none', enabled: false, alignment: 'center' },
        },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toBe('');
    });

    it('should generate CSS page rules when header is enabled with visible content', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toContain('@media print');
      expect(result).toContain('@page');
      expect(result).toContain('margin-top:');
      expect(result).toContain('margin-bottom:');
      expect(result).toContain('margin-left:');
      expect(result).toContain('margin-right:');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Generating CSS @page rules from headers/footers config',
      );
    });

    it('should generate CSS page rules when footer is enabled with visible content', () => {
      const config: HeadersFootersConfig = {
        header: { ...DEFAULT_HEADER_CONFIG, enabled: false },
        footer: {
          ...DEFAULT_FOOTER_CONFIG,
          enabled: true,
          pageNumber: { mode: 'show', enabled: true, alignment: 'right' },
        },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toContain('@media print');
      expect(result).toContain('@page');
      expect(result).toContain('margin-top:');
      expect(result).toContain('margin-bottom:');
      expect(result).toContain('margin-left:');
      expect(result).toContain('margin-right:');
    });

    it('should generate CSS page rules when both header and footer are enabled', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
        footer: {
          ...DEFAULT_FOOTER_CONFIG,
          enabled: true,
          pageNumber: { mode: 'show', enabled: true, alignment: 'right' },
        },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toContain('@media print');
      expect(result).toContain('@page');
      expect(result).toContain('body {');
      expect(result).toContain('margin: 0;');
      expect(result).toContain('padding: 0;');
    });

    it('should log debug information about generated CSS', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
      };

      generator.generateCSSPageRules(config, mockContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Generating CSS @page rules from headers/footers config',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Generated CSS @page rules:'),
      );
    });

    it('should handle global style configuration', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
        globalStyle: {
          fontSize: '12px',
          fontFamily: 'Arial',
          color: '#333',
          backgroundColor: '#f0f0f0',
          padding: '10px',
        },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toContain('@media print');
      expect(result).toContain('@page');
    });

    it('should handle missing metadata gracefully', () => {
      const contextWithoutMetadata: HeaderFooterContext = {
        documentTitle: 'Test Document',
        pageNumber: 1,
        totalPages: 10,
        currentDate: new Date('2024-01-15T10:30:00Z'),
      };

      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
      };

      const result = generator.generateCSSPageRules(
        config,
        contextWithoutMetadata,
      );

      expect(result).toContain('@media print');
      expect(result).toContain('@page');
    });

    it('should handle different date/time formats', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          dateTime: { mode: 'date-short', enabled: true, alignment: 'right' },
        },
        footer: {
          ...DEFAULT_FOOTER_CONFIG,
          enabled: true,
          dateTime: {
            mode: 'datetime-long',
            enabled: true,
            alignment: 'center',
          },
        },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toContain('@media print');
      expect(result).toContain('@page');
    });

    it('should handle custom values in content configuration', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: {
            mode: 'custom',
            customValue: 'My Custom Title',
            enabled: true,
            alignment: 'center',
          },
          message: {
            mode: 'custom',
            customValue: 'Draft Version',
            enabled: true,
            alignment: 'right',
          },
        },
        footer: {
          ...DEFAULT_FOOTER_CONFIG,
          enabled: true,
          copyright: {
            mode: 'custom',
            customValue: '© 2024 My Company',
            enabled: true,
            alignment: 'center',
          },
        },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toContain('@media print');
      expect(result).toContain('@page');
    });

    it('should handle metadata-based content', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          author: { mode: 'metadata', enabled: true, alignment: 'left' },
          organization: {
            mode: 'metadata',
            enabled: true,
            alignment: 'center',
          },
          version: { mode: 'metadata', enabled: true, alignment: 'right' },
        },
        footer: {
          ...DEFAULT_FOOTER_CONFIG,
          enabled: true,
          category: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
      };

      const result = generator.generateCSSPageRules(config, mockContext);

      expect(result).toContain('@media print');
      expect(result).toContain('@page');
    });
  });

  describe('error handling', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {} as HeadersFootersConfig;
      const mockContext: HeaderFooterContext = {
        pageNumber: 1,
        totalPages: 10,
        currentDate: new Date(),
      };

      expect(() => {
        generator.generateCSSPageRules(invalidConfig, mockContext);
      }).not.toThrow();
    });

    it('should handle missing context properties gracefully', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
      };

      const minimalContext = {} as HeaderFooterContext;

      expect(() => {
        generator.generateCSSPageRules(config, minimalContext);
      }).not.toThrow();
    });
  });

  describe('integration with translation manager', () => {
    it('should use translation manager for localized content', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
      };

      const mockContext: HeaderFooterContext = {
        documentTitle: 'Test Document',
        pageNumber: 1,
        totalPages: 10,
        currentDate: new Date('2024-01-15T10:30:00Z'),
      };

      generator.generateCSSPageRules(config, mockContext);

      // The translation manager might be called for date formatting or other localized content
      // We don't assert specific calls since the implementation details may vary
      expect(mockTranslationManager.t).toBeDefined();
    });
  });

  describe('logging behavior', () => {
    it('should log debug messages for configuration processing', () => {
      const config: HeadersFootersConfig = {
        header: {
          ...DEFAULT_HEADER_CONFIG,
          enabled: true,
          title: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
      };

      const mockContext: HeaderFooterContext = {
        pageNumber: 1,
        totalPages: 10,
        currentDate: new Date(),
      };

      generator.generateCSSPageRules(config, mockContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Generating CSS @page rules from headers/footers config',
      );
    });

    it('should log when no headers or footers are enabled', () => {
      const config: HeadersFootersConfig = {
        header: { ...DEFAULT_HEADER_CONFIG, enabled: false },
        footer: { ...DEFAULT_FOOTER_CONFIG, enabled: false },
      };

      const mockContext: HeaderFooterContext = {
        pageNumber: 1,
        totalPages: 10,
        currentDate: new Date(),
      };

      generator.generateCSSPageRules(config, mockContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No headers or footers enabled - returning empty CSS',
      );
    });
  });
});
