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

describe('Headers & Footers Types', () => {
  describe('Display Mode Types', () => {
    it('should define TitleDisplayMode correctly', () => {
      const modes: TitleDisplayMode[] = ['none', 'metadata', 'custom'];
      expect(modes).toHaveLength(3);
    });

    it('should define PageNumberDisplayMode correctly', () => {
      const modes: PageNumberDisplayMode[] = ['none', 'show'];
      expect(modes).toHaveLength(2);
    });

    it('should define DateTimeDisplayMode correctly', () => {
      const modes: DateTimeDisplayMode[] = [
        'none',
        'date-short',
        'date-long',
        'date-iso',
        'datetime-short',
        'datetime-long',
        'metadata-creation',
        'metadata-modification',
      ];
      expect(modes).toHaveLength(8);
    });

    it('should define CopyrightDisplayMode correctly', () => {
      const modes: CopyrightDisplayMode[] = ['none', 'custom', 'metadata'];
      expect(modes).toHaveLength(3);
    });

    it('should define MessageDisplayMode correctly', () => {
      const modes: MessageDisplayMode[] = ['none', 'custom'];
      expect(modes).toHaveLength(2);
    });

    it('should define metadata-specific display modes correctly', () => {
      const authorModes: AuthorDisplayMode[] = ['none', 'metadata', 'custom'];
      const orgModes: OrganizationDisplayMode[] = [
        'none',
        'metadata',
        'custom',
      ];
      const versionModes: VersionDisplayMode[] = ['none', 'metadata', 'custom'];
      const categoryModes: CategoryDisplayMode[] = [
        'none',
        'metadata',
        'custom',
      ];

      expect(authorModes).toHaveLength(3);
      expect(orgModes).toHaveLength(3);
      expect(versionModes).toHaveLength(3);
      expect(categoryModes).toHaveLength(3);
    });

    it('should define ContentAlignment correctly', () => {
      const alignments: ContentAlignment[] = ['left', 'center', 'right'];
      expect(alignments).toHaveLength(3);
    });
  });

  describe('Configuration Interfaces', () => {
    it('should create valid ContentConfig', () => {
      const config: ContentConfig = {
        mode: 'custom',
        customValue: 'Test Value',
        alignment: 'center',
        enabled: true,
      };

      expect(config.mode).toBe('custom');
      expect(config.customValue).toBe('Test Value');
      expect(config.alignment).toBe('center');
      expect(config.enabled).toBe(true);
    });

    it('should create valid TitleConfig', () => {
      const config: TitleConfig = {
        mode: 'metadata',
        alignment: 'left',
        enabled: true,
      };

      expect(config.mode).toBe('metadata');
      expect(config.alignment).toBe('left');
      expect(config.enabled).toBe(true);
    });

    it('should create valid PageNumberConfig', () => {
      const config: PageNumberConfig = {
        mode: 'show',
        alignment: 'right',
        enabled: true,
      };

      expect(config.mode).toBe('show');
      expect(config.alignment).toBe('right');
      expect(config.enabled).toBe(true);
    });

    it('should create valid DateTimeConfig', () => {
      const config: DateTimeConfig = {
        mode: 'date-short',
        alignment: 'center',
        enabled: true,
      };

      expect(config.mode).toBe('date-short');
      expect(config.alignment).toBe('center');
      expect(config.enabled).toBe(true);
    });

    it('should create valid CopyrightConfig', () => {
      const config: CopyrightConfig = {
        mode: 'custom',
        customValue: '© 2024 Test Company',
        alignment: 'center',
        enabled: true,
      };

      expect(config.mode).toBe('custom');
      expect(config.customValue).toBe('© 2024 Test Company');
      expect(config.alignment).toBe('center');
      expect(config.enabled).toBe(true);
    });

    it('should create valid MessageConfig', () => {
      const config: MessageConfig = {
        mode: 'custom',
        customValue: 'Confidential',
        alignment: 'right',
        enabled: true,
      };

      expect(config.mode).toBe('custom');
      expect(config.customValue).toBe('Confidential');
      expect(config.alignment).toBe('right');
      expect(config.enabled).toBe(true);
    });

    it('should create valid AuthorConfig', () => {
      const config: AuthorConfig = {
        mode: 'metadata',
        alignment: 'left',
        enabled: true,
      };

      expect(config.mode).toBe('metadata');
      expect(config.alignment).toBe('left');
      expect(config.enabled).toBe(true);
    });

    it('should create valid OrganizationConfig', () => {
      const config: OrganizationConfig = {
        mode: 'custom',
        customValue: 'My Organization',
        alignment: 'center',
        enabled: true,
      };

      expect(config.mode).toBe('custom');
      expect(config.customValue).toBe('My Organization');
      expect(config.alignment).toBe('center');
      expect(config.enabled).toBe(true);
    });

    it('should create valid VersionConfig', () => {
      const config: VersionConfig = {
        mode: 'metadata',
        alignment: 'right',
        enabled: true,
      };

      expect(config.mode).toBe('metadata');
      expect(config.alignment).toBe('right');
      expect(config.enabled).toBe(true);
    });

    it('should create valid CategoryConfig', () => {
      const config: CategoryConfig = {
        mode: 'custom',
        customValue: 'Documentation',
        alignment: 'left',
        enabled: true,
      };

      expect(config.mode).toBe('custom');
      expect(config.customValue).toBe('Documentation');
      expect(config.alignment).toBe('left');
      expect(config.enabled).toBe(true);
    });

    it('should create valid PositionConfig', () => {
      const config: PositionConfig = {
        left: {
          mode: 'metadata',
          enabled: true,
          alignment: 'left',
        },
        center: {
          mode: 'none',
          enabled: false,
          alignment: 'center',
        },
        right: {
          mode: 'show',
          enabled: true,
          alignment: 'right',
        },
      };

      expect(config.left?.mode).toBe('metadata');
      expect(config.center?.mode).toBe('none');
      expect(config.right?.mode).toBe('show');
    });

    it('should create valid HeaderFooterStyleConfig', () => {
      const style: HeaderFooterStyleConfig = {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#333',
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #ccc',
        borderBottom: '1px solid #ccc',
        padding: '10px',
        margin: '5px',
        height: '40px',
      };

      expect(style.fontSize).toBe('12px');
      expect(style.fontFamily).toBe('Arial');
      expect(style.color).toBe('#333');
      expect(style.backgroundColor).toBe('#f0f0f0');
      expect(style.borderTop).toBe('1px solid #ccc');
      expect(style.borderBottom).toBe('1px solid #ccc');
      expect(style.padding).toBe('10px');
      expect(style.margin).toBe('5px');
      expect(style.height).toBe('40px');
    });
  });

  describe('Complex Configuration Interfaces', () => {
    it('should create valid HeaderConfig', () => {
      const header: HeaderConfig = {
        enabled: true,
        title: { mode: 'metadata', enabled: true, alignment: 'left' },
        pageNumber: { mode: 'none', enabled: false, alignment: 'center' },
        dateTime: { mode: 'date-short', enabled: true, alignment: 'right' },
        copyright: { mode: 'none', enabled: false, alignment: 'center' },
        message: { mode: 'none', enabled: false, alignment: 'center' },
        author: { mode: 'metadata', enabled: true, alignment: 'left' },
        organization: { mode: 'none', enabled: false, alignment: 'center' },
        version: { mode: 'none', enabled: false, alignment: 'right' },
        category: { mode: 'none', enabled: false, alignment: 'center' },
        layout: {
          left: { mode: 'metadata', enabled: true, alignment: 'left' },
        },
      };

      expect(header.enabled).toBe(true);
      expect(header.title.mode).toBe('metadata');
      expect(header.pageNumber.mode).toBe('none');
      expect(header.dateTime.mode).toBe('date-short');
      expect(header.author.mode).toBe('metadata');
      expect(header.layout.left?.mode).toBe('metadata');
    });

    it('should create valid FooterConfig', () => {
      const footer: FooterConfig = {
        enabled: true,
        title: { mode: 'none', enabled: false, alignment: 'left' },
        pageNumber: { mode: 'show', enabled: true, alignment: 'right' },
        dateTime: { mode: 'none', enabled: false, alignment: 'center' },
        copyright: {
          mode: 'custom',
          customValue: '© 2024',
          enabled: true,
          alignment: 'center',
        },
        message: { mode: 'none', enabled: false, alignment: 'center' },
        author: { mode: 'none', enabled: false, alignment: 'left' },
        organization: { mode: 'metadata', enabled: true, alignment: 'center' },
        version: { mode: 'none', enabled: false, alignment: 'left' },
        category: { mode: 'none', enabled: false, alignment: 'center' },
        layout: {
          right: { mode: 'show', enabled: true, alignment: 'right' },
        },
      };

      expect(footer.enabled).toBe(true);
      expect(footer.pageNumber.mode).toBe('show');
      expect(footer.copyright.mode).toBe('custom');
      expect(footer.copyright.customValue).toBe('© 2024');
      expect(footer.organization.mode).toBe('metadata');
      expect(footer.layout.right?.mode).toBe('show');
    });

    it('should create valid HeadersFootersConfig', () => {
      const config: HeadersFootersConfig = {
        header: DEFAULT_HEADER_CONFIG,
        footer: DEFAULT_FOOTER_CONFIG,
        globalStyle: {
          fontSize: '10px',
          color: '#666',
        },
      };

      expect(config.header).toBeDefined();
      expect(config.footer).toBeDefined();
      expect(config.globalStyle?.fontSize).toBe('10px');
      expect(config.globalStyle?.color).toBe('#666');
    });
  });

  describe('Default Configurations', () => {
    it('should have valid DEFAULT_HEADER_CONFIG', () => {
      expect(DEFAULT_HEADER_CONFIG.enabled).toBe(true);
      expect(DEFAULT_HEADER_CONFIG.title.mode).toBe('metadata');
      expect(DEFAULT_HEADER_CONFIG.title.enabled).toBe(true);
      expect(DEFAULT_HEADER_CONFIG.title.alignment).toBe('left');
      expect(DEFAULT_HEADER_CONFIG.pageNumber.mode).toBe('none');
      expect(DEFAULT_HEADER_CONFIG.pageNumber.enabled).toBe(false);
      expect(DEFAULT_HEADER_CONFIG.layout.left?.mode).toBe('metadata');
      expect(DEFAULT_HEADER_CONFIG.layout.left?.enabled).toBe(true);
    });

    it('should have valid DEFAULT_FOOTER_CONFIG', () => {
      expect(DEFAULT_FOOTER_CONFIG.enabled).toBe(true);
      expect(DEFAULT_FOOTER_CONFIG.title.mode).toBe('none');
      expect(DEFAULT_FOOTER_CONFIG.title.enabled).toBe(false);
      expect(DEFAULT_FOOTER_CONFIG.pageNumber.mode).toBe('show');
      expect(DEFAULT_FOOTER_CONFIG.pageNumber.enabled).toBe(true);
      expect(DEFAULT_FOOTER_CONFIG.pageNumber.alignment).toBe('right');
      expect(DEFAULT_FOOTER_CONFIG.layout.right?.mode).toBe('show');
      expect(DEFAULT_FOOTER_CONFIG.layout.right?.enabled).toBe(true);
    });

    it('should have valid DEFAULT_HEADERS_FOOTERS_CONFIG', () => {
      expect(DEFAULT_HEADERS_FOOTERS_CONFIG.header).toEqual(
        DEFAULT_HEADER_CONFIG,
      );
      expect(DEFAULT_HEADERS_FOOTERS_CONFIG.footer).toEqual(
        DEFAULT_FOOTER_CONFIG,
      );
      expect(DEFAULT_HEADERS_FOOTERS_CONFIG.globalStyle).toBeDefined();
      expect(DEFAULT_HEADERS_FOOTERS_CONFIG.globalStyle?.fontSize).toBe('10px');
      expect(DEFAULT_HEADERS_FOOTERS_CONFIG.globalStyle?.fontFamily).toBe(
        'inherit',
      );
      expect(DEFAULT_HEADERS_FOOTERS_CONFIG.globalStyle?.color).toBe('#666');
    });
  });

  describe('Runtime Context and Generated Content', () => {
    it('should create valid HeaderFooterContext', () => {
      const context: HeaderFooterContext = {
        documentTitle: 'Test Document',
        firstH1Title: 'Chapter 1',
        pageNumber: 5,
        totalPages: 10,
        currentDate: new Date('2024-01-15'),
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

      expect(context.documentTitle).toBe('Test Document');
      expect(context.firstH1Title).toBe('Chapter 1');
      expect(context.pageNumber).toBe(5);
      expect(context.totalPages).toBe(10);
      expect(context.currentDate).toEqual(new Date('2024-01-15'));
      expect(context.copyright).toBe('© 2024 Test Corp');
      expect(context.customMessage).toBe('Confidential');
      expect(context.metadata?.title).toBe('Test Doc');
      expect(context.metadata?.author).toBe('John Doe');
    });

    it('should create valid GeneratedHeaderFooter', () => {
      const generated: GeneratedHeaderFooter = {
        left: 'Test Document',
        center: 'Page 5 of 10',
        right: '2024/01/15',
        html: '<div class="header"><span class="left">Test Document</span><span class="center">Page 5 of 10</span><span class="right">2024/01/15</span></div>',
      };

      expect(generated.left).toBe('Test Document');
      expect(generated.center).toBe('Page 5 of 10');
      expect(generated.right).toBe('2024/01/15');
      expect(generated.html).toContain('Test Document');
      expect(generated.html).toContain('Page 5 of 10');
      expect(generated.html).toContain('2024/01/15');
    });

    it('should handle optional fields in GeneratedHeaderFooter', () => {
      const generated: GeneratedHeaderFooter = {
        html: '<div class="footer"></div>',
      };

      expect(generated.left).toBeUndefined();
      expect(generated.center).toBeUndefined();
      expect(generated.right).toBeUndefined();
      expect(generated.html).toBe('<div class="footer"></div>');
    });
  });

  describe('Type Constraints', () => {
    it('should enforce correct mode types for specific configs', () => {
      // These should compile without TypeScript errors
      const titleConfig: TitleConfig = {
        mode: 'metadata',
        enabled: true,
        alignment: 'left',
      };
      const pageConfig: PageNumberConfig = {
        mode: 'show',
        enabled: true,
        alignment: 'right',
      };
      const dateConfig: DateTimeConfig = {
        mode: 'date-short',
        enabled: true,
        alignment: 'center',
      };
      const copyrightConfig: CopyrightConfig = {
        mode: 'custom',
        enabled: true,
        alignment: 'center',
      };
      const messageConfig: MessageConfig = {
        mode: 'custom',
        enabled: true,
        alignment: 'center',
      };
      const authorConfig: AuthorConfig = {
        mode: 'metadata',
        enabled: true,
        alignment: 'left',
      };
      const orgConfig: OrganizationConfig = {
        mode: 'metadata',
        enabled: true,
        alignment: 'center',
      };
      const versionConfig: VersionConfig = {
        mode: 'metadata',
        enabled: true,
        alignment: 'right',
      };
      const categoryConfig: CategoryConfig = {
        mode: 'metadata',
        enabled: true,
        alignment: 'center',
      };

      expect(titleConfig.mode).toBe('metadata');
      expect(pageConfig.mode).toBe('show');
      expect(dateConfig.mode).toBe('date-short');
      expect(copyrightConfig.mode).toBe('custom');
      expect(messageConfig.mode).toBe('custom');
      expect(authorConfig.mode).toBe('metadata');
      expect(orgConfig.mode).toBe('metadata');
      expect(versionConfig.mode).toBe('metadata');
      expect(categoryConfig.mode).toBe('metadata');
    });
  });
});
