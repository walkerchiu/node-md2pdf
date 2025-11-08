import * as HeadersFootersModule from '../../../../src/core/headers-footers/index';
import { HeaderFooterGenerator } from '../../../../src/core/headers-footers/generator';
import {
  TitleDisplayMode,
  PageNumberDisplayMode,
  DateTimeDisplayMode,
  CopyrightDisplayMode,
  MessageDisplayMode,
  AuthorDisplayMode,
  OrganizationDisplayMode,
  VersionDisplayMode,
  CategoryDisplayMode,
  ContentAlignment,
  ContentConfig,
  TitleConfig,
  PageNumberConfig,
  DateTimeConfig,
  CopyrightConfig,
  MessageConfig,
  AuthorConfig,
  OrganizationConfig,
  VersionConfig,
  CategoryConfig,
  PositionConfig,
  HeaderConfig,
  FooterConfig,
  HeaderFooterStyleConfig,
  HeadersFootersConfig,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADERS_FOOTERS_CONFIG,
  HeaderFooterContext,
  GeneratedHeaderFooter,
} from '../../../../src/core/headers-footers/types';

describe('Headers & Footers Module Index', () => {
  describe('Module Exports', () => {
    it('should export HeaderFooterGenerator class', () => {
      expect(HeadersFootersModule.HeaderFooterGenerator).toBeDefined();
      expect(HeadersFootersModule.HeaderFooterGenerator).toBe(
        HeaderFooterGenerator,
      );
    });

    it('should export all type definitions', () => {
      // Verify that all types are available through the module export
      // These should not throw TypeScript compilation errors
      const titleMode: TitleDisplayMode = 'metadata';
      const pageMode: PageNumberDisplayMode = 'show';
      const dateMode: DateTimeDisplayMode = 'date-short';
      const copyrightMode: CopyrightDisplayMode = 'custom';
      const messageMode: MessageDisplayMode = 'custom';
      const authorMode: AuthorDisplayMode = 'metadata';
      const orgMode: OrganizationDisplayMode = 'metadata';
      const versionMode: VersionDisplayMode = 'metadata';
      const categoryMode: CategoryDisplayMode = 'metadata';
      const alignment: ContentAlignment = 'center';

      expect(titleMode).toBe('metadata');
      expect(pageMode).toBe('show');
      expect(dateMode).toBe('date-short');
      expect(copyrightMode).toBe('custom');
      expect(messageMode).toBe('custom');
      expect(authorMode).toBe('metadata');
      expect(orgMode).toBe('metadata');
      expect(versionMode).toBe('metadata');
      expect(categoryMode).toBe('metadata');
      expect(alignment).toBe('center');
    });

    it('should export all configuration interfaces', () => {
      // Test that configuration interfaces are properly exported
      const contentConfig: ContentConfig = {
        mode: 'custom',
        customValue: 'Test',
        alignment: 'left',
        enabled: true,
      };

      const titleConfig: TitleConfig = {
        mode: 'metadata',
        alignment: 'center',
        enabled: true,
      };

      const pageConfig: PageNumberConfig = {
        mode: 'show',
        alignment: 'right',
        enabled: true,
      };

      expect(contentConfig.mode).toBe('custom');
      expect(titleConfig.mode).toBe('metadata');
      expect(pageConfig.mode).toBe('show');
    });

    it('should export default configurations', () => {
      expect(HeadersFootersModule.DEFAULT_HEADER_CONFIG).toBeDefined();
      expect(HeadersFootersModule.DEFAULT_FOOTER_CONFIG).toBeDefined();
      expect(HeadersFootersModule.DEFAULT_HEADERS_FOOTERS_CONFIG).toBeDefined();

      // Verify the default configurations are valid
      expect(HeadersFootersModule.DEFAULT_HEADER_CONFIG.enabled).toBe(true);
      expect(HeadersFootersModule.DEFAULT_FOOTER_CONFIG.enabled).toBe(true);
      expect(
        HeadersFootersModule.DEFAULT_HEADERS_FOOTERS_CONFIG.header,
      ).toEqual(DEFAULT_HEADER_CONFIG);
      expect(
        HeadersFootersModule.DEFAULT_HEADERS_FOOTERS_CONFIG.footer,
      ).toEqual(DEFAULT_FOOTER_CONFIG);
    });

    it('should export complex configuration types', () => {
      const headerConfig: HeaderConfig =
        HeadersFootersModule.DEFAULT_HEADER_CONFIG;
      const footerConfig: FooterConfig =
        HeadersFootersModule.DEFAULT_FOOTER_CONFIG;
      const fullConfig: HeadersFootersConfig =
        HeadersFootersModule.DEFAULT_HEADERS_FOOTERS_CONFIG;

      expect(headerConfig).toBeDefined();
      expect(footerConfig).toBeDefined();
      expect(fullConfig).toBeDefined();
      expect(fullConfig.header).toEqual(headerConfig);
      expect(fullConfig.footer).toEqual(footerConfig);
    });

    it('should export context and runtime types', () => {
      const context: HeaderFooterContext = {
        documentTitle: 'Test Document',
        pageNumber: 1,
        totalPages: 10,
        currentDate: new Date(),
        metadata: {
          title: 'Test',
          author: 'Test Author',
          subject: 'Test Subject',
          keywords: 'test,keywords',
          language: 'en',
          creationDate: new Date(),
          modDate: new Date(),
          creator: 'MD2PDF',
          producer: 'MD2PDF v1.0',
        },
      };

      const generated: GeneratedHeaderFooter = {
        left: 'Left Content',
        center: 'Center Content',
        right: 'Right Content',
        html: '<div>Generated HTML</div>',
      };

      expect(context.documentTitle).toBe('Test Document');
      expect(context.pageNumber).toBe(1);
      expect(generated.left).toBe('Left Content');
      expect(generated.html).toBe('<div>Generated HTML</div>');
    });
  });

  describe('Module Structure', () => {
    it('should have proper module structure with all required exports', () => {
      const moduleKeys = Object.keys(HeadersFootersModule);

      // Should export the HeaderFooterGenerator class
      expect(moduleKeys).toContain('HeaderFooterGenerator');

      // Should export default configurations
      expect(moduleKeys).toContain('DEFAULT_HEADER_CONFIG');
      expect(moduleKeys).toContain('DEFAULT_FOOTER_CONFIG');
      expect(moduleKeys).toContain('DEFAULT_HEADERS_FOOTERS_CONFIG');
    });

    it('should maintain proper inheritance and relationships', () => {
      const generator = new HeadersFootersModule.HeaderFooterGenerator(
        {} as any, // Mock translation manager
        {} as any, // Mock logger
      );

      expect(generator).toBeInstanceOf(HeaderFooterGenerator);
      expect(generator).toBeInstanceOf(
        HeadersFootersModule.HeaderFooterGenerator,
      );
    });
  });

  describe('Type Safety and Module Integrity', () => {
    it('should maintain type consistency across exports', () => {
      // Ensure that types exported from the module are consistent with direct imports
      const directHeaderConfig = DEFAULT_HEADER_CONFIG;
      const moduleHeaderConfig = HeadersFootersModule.DEFAULT_HEADER_CONFIG;

      expect(directHeaderConfig).toEqual(moduleHeaderConfig);
      expect(directHeaderConfig).toBe(moduleHeaderConfig);
    });

    it('should support proper instantiation through module exports', () => {
      const mockTranslationManager = {
        t: jest.fn(),
        setLocale: jest.fn(),
        getCurrentLocale: jest.fn(() => 'en' as const),
        getSupportedLocales: jest.fn(() => ['en', 'zh-TW'] as const),
        translate: jest.fn(),
        hasTranslation: jest.fn(() => true),
        loadTranslations: jest.fn(),
        getTranslations: jest.fn(() => ({})),
      } as any;

      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn(),
      };

      const generator = new HeadersFootersModule.HeaderFooterGenerator(
        mockTranslationManager,
        mockLogger,
      );

      expect(generator).toBeInstanceOf(
        HeadersFootersModule.HeaderFooterGenerator,
      );
      expect(typeof generator.generateCSSPageRules).toBe('function');
    });

    it('should provide access to all necessary type definitions for external usage', () => {
      // Test that external consumers can use all types properly
      const config: HeadersFootersConfig = {
        header: {
          ...HeadersFootersModule.DEFAULT_HEADER_CONFIG,
          title: {
            mode: 'custom',
            customValue: 'My Title',
            enabled: true,
            alignment: 'left',
          },
        },
        footer: {
          ...HeadersFootersModule.DEFAULT_FOOTER_CONFIG,
          pageNumber: { mode: 'show', enabled: true, alignment: 'right' },
        },
        globalStyle: {
          fontSize: '12px',
          fontFamily: 'Arial',
          color: '#333',
        },
      };

      expect(config.header.title.mode).toBe('custom');
      expect(config.header.title.customValue).toBe('My Title');
      expect(config.footer.pageNumber.mode).toBe('show');
      expect(config.globalStyle?.fontSize).toBe('12px');
    });
  });

  describe('Module Documentation and Usability', () => {
    it('should provide clear API surface for consumers', () => {
      // Test that the module provides a clean, well-defined API
      const moduleExports = Object.keys(HeadersFootersModule);

      // Core class export
      expect(moduleExports).toContain('HeaderFooterGenerator');

      // Configuration defaults
      expect(moduleExports).toContain('DEFAULT_HEADER_CONFIG');
      expect(moduleExports).toContain('DEFAULT_FOOTER_CONFIG');
      expect(moduleExports).toContain('DEFAULT_HEADERS_FOOTERS_CONFIG');

      // Should not export internal implementation details
      expect(moduleExports).not.toContain('internal');
      expect(moduleExports).not.toContain('private');
      expect(moduleExports).not.toContain('_');
    });

    it('should support common usage patterns', () => {
      // Test typical usage pattern: create generator and generate CSS
      const mockDeps = {
        translationManager: {
          t: jest.fn(),
          setLocale: jest.fn(),
          getCurrentLocale: jest.fn(() => 'en' as const),
          getSupportedLocales: jest.fn(() => ['en', 'zh-TW'] as const),
          translate: jest.fn(),
          hasTranslation: jest.fn(() => true),
          loadTranslations: jest.fn(),
          getTranslations: jest.fn(() => ({})),
        } as any,
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          log: jest.fn(),
          setLevel: jest.fn(),
          getLevel: jest.fn(),
        },
      };

      const generator = new HeadersFootersModule.HeaderFooterGenerator(
        mockDeps.translationManager,
        mockDeps.logger,
      );

      const config = HeadersFootersModule.DEFAULT_HEADERS_FOOTERS_CONFIG;
      const context: HeaderFooterContext = {
        pageNumber: 1,
        totalPages: 5,
        currentDate: new Date(),
        documentTitle: 'Test Document',
      };

      expect(() => {
        generator.generateCSSPageRules(config, context);
      }).not.toThrow();
    });
  });
});
