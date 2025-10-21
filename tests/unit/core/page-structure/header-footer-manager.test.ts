import { HeaderFooterManager } from '../../../../src/core/page-structure/header-footer-manager';
import {
  PageContext,
  HeaderConfig,
  FooterConfig,
  PageStructureConfig,
  TemplateVariable,
} from '../../../../src/core/page-structure/types';

describe('HeaderFooterManager', () => {
  let manager: HeaderFooterManager;
  let mockContext: PageContext;

  beforeEach(() => {
    manager = new HeaderFooterManager();
    mockContext = {
      pageNumber: 1,
      totalPages: 10,
      title: 'Test Document',
      author: 'Test Author',
      date: '2024-01-01',
      fileName: 'test.md',
      chapterTitle: 'Chapter 1',
      sectionTitle: 'Section 1.1',
    };
  });

  describe('generateHeader', () => {
    it('should generate header with basic template', () => {
      const config: HeaderConfig = {
        enabled: true,
        template: '<div>{{title}} - {{date}}</div>',
      };

      const result = manager.generateHeader(config, mockContext);

      expect(result.html).toContain('Test Document - 2024-01-01');
      expect(result.warnings).toBeUndefined();
    });

    it('should return empty html when header is disabled', () => {
      const config: HeaderConfig = {
        enabled: false,
        template: '<div>{{title}}</div>',
      };

      const result = manager.generateHeader(config, mockContext);

      expect(result.html).toBe('');
    });

    it('should respect page visibility settings', () => {
      const config: HeaderConfig = {
        enabled: true,
        template: '<div>{{title}}</div>',
        showOnFirstPage: false,
      };

      // First page should not show header
      const result1 = manager.generateHeader(config, {
        ...mockContext,
        pageNumber: 1,
      });
      expect(result1.html).toBe('');

      // Second page should show header
      const result2 = manager.generateHeader(config, {
        ...mockContext,
        pageNumber: 2,
      });
      expect(result2.html).toContain('Test Document');
    });

    it('should handle even/odd page visibility', () => {
      const config: HeaderConfig = {
        enabled: true,
        template: '<div>{{title}}</div>',
        showOnEvenPages: false,
      };

      // Odd page (1) should show header
      const result1 = manager.generateHeader(config, {
        ...mockContext,
        pageNumber: 1,
      });
      expect(result1.html).toContain('Test Document');

      // Even page (2) should not show header
      const result2 = manager.generateHeader(config, {
        ...mockContext,
        pageNumber: 2,
      });
      expect(result2.html).toBe('');
    });

    it('should apply custom styles', () => {
      const config: HeaderConfig = {
        enabled: true,
        template: '<div>{{title}}</div>',
        styles: {
          fontSize: '16px',
          color: '#red',
        },
        height: '50px',
      };

      const result = manager.generateHeader(config, mockContext);

      expect(result.html).toContain('Test Document');
      expect(result.css).toContain('font-size: 16px');
      expect(result.css).toContain('color: #red');
      expect(result.height).toBe(50);
    });
  });

  describe('generateFooter', () => {
    it('should generate footer with page numbers', () => {
      const config: FooterConfig = {
        enabled: true,
        template: '<div>Page {{pageNumber}} of {{totalPages}}</div>',
      };

      const result = manager.generateFooter(config, mockContext);

      expect(result.html).toContain('Page 1 of 10');
    });

    it('should handle custom variables', () => {
      const config: FooterConfig = {
        enabled: true,
        template: '<div>{{customVar}} - {{title}}</div>',
      };

      const customVariables: TemplateVariable[] = [
        {
          name: 'customVar',
          value: 'Custom Value',
        },
      ];

      const result = manager.generateFooter(
        config,
        mockContext,
        customVariables,
      );

      expect(result.html).toContain('Custom Value - Test Document');
    });
  });

  describe('generatePageStructure', () => {
    it('should generate both header and footer', () => {
      const config: PageStructureConfig = {
        header: {
          enabled: true,
          template: '<div>Header: {{title}}</div>',
        },
        footer: {
          enabled: true,
          template: '<div>Footer: Page {{pageNumber}}</div>',
        },
        margins: {
          top: '60px',
          bottom: '40px',
          left: '50px',
          right: '50px',
        },
      };

      const result = manager.generatePageStructure(config, mockContext);

      expect(result.header.html).toContain('Header: Test Document');
      expect(result.footer.html).toContain('Footer: Page 1');
      expect(result.margins).toEqual(config.margins);
    });

    it('should handle disabled components', () => {
      const config: PageStructureConfig = {
        header: {
          enabled: false,
          template: '<div>Header</div>',
        },
        footer: {
          enabled: true,
          template: '<div>Footer</div>',
        },
      };

      const result = manager.generatePageStructure(config, mockContext);

      expect(result.header.html).toBe('');
      expect(result.footer.html).toContain('Footer');
    });
  });

  describe('validateHeaderConfig', () => {
    it('should validate enabled header with template', () => {
      const config: HeaderConfig = {
        enabled: true,
        template: '<div>{{title}}</div>',
      };

      const result = manager.validateHeaderConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for enabled header without template', () => {
      const config: HeaderConfig = {
        enabled: true,
        template: '',
      };

      const result = manager.validateHeaderConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'header is enabled but no template provided',
      );
    });
  });

  describe('getAvailableVariables', () => {
    it('should return list of available variables', () => {
      const variables = manager.getAvailableVariables();

      expect(variables).toHaveLength(8);
      expect(variables.find((v) => v.name === '{{title}}')).toBeDefined();
      expect(variables.find((v) => v.name === '{{pageNumber}}')).toBeDefined();
      expect(variables.find((v) => v.name === '{{totalPages}}')).toBeDefined();
    });
  });

  describe('previewContent', () => {
    it('should generate preview with sample context', () => {
      const template = '<div>{{title}} by {{author}}</div>';
      const sampleContext = {
        title: 'Preview Document',
        author: 'Preview Author',
      };

      const result = manager.previewContent(template, sampleContext);

      expect(result.html).toContain('Preview Document by Preview Author');
    });

    it('should use default context when partial context provided', () => {
      const template = '<div>{{title}} - Page {{pageNumber}}</div>';
      const sampleContext = {
        title: 'Custom Title',
      };

      const result = manager.previewContent(template, sampleContext);

      expect(result.html).toContain('Custom Title - Page 1');
    });
  });
});
