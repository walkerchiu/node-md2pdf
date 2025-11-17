/**
 * Template Types Unit Tests
 *
 * Tests type definitions and interfaces for template management system
 */

import type {
  TemplateCategory,
  TemplateType,
  TemplateMetadata,
  MarginConfig,
  HeaderConfig,
  FooterConfig,
  FontConfig,
  ColorScheme,
  CodeBlockStyle,
  DocumentMetadata,
  TemplateConfig,
  Template,
  TemplateInput,
  TemplateCollection,
  TemplateFilter,
  ValidationError,
  ValidationResult,
  ConfigValidationResult,
  TemplateStorageOptions,
} from '../../../../src/core/templates/types';

describe('Template Types', () => {
  describe('Type Aliases', () => {
    it('should accept valid TemplateCategory values', () => {
      const categories: TemplateCategory[] = [
        'quick',
        'professional',
        'technical',
        'academic',
        'custom',
      ];

      expect(categories).toHaveLength(5);
      categories.forEach((category) => {
        expect([
          'quick',
          'professional',
          'technical',
          'academic',
          'custom',
        ]).toContain(category);
      });
    });

    it('should accept valid TemplateType values', () => {
      const types: TemplateType[] = ['system', 'custom'];

      expect(types).toHaveLength(2);
      types.forEach((type) => {
        expect(['system', 'custom']).toContain(type);
      });
    });
  });

  describe('TemplateMetadata', () => {
    it('should create valid metadata with required fields', () => {
      const metadata: TemplateMetadata = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.createdAt).toBeDefined();
      expect(metadata.updatedAt).toBeDefined();
    });

    it('should create valid metadata with optional fields', () => {
      const metadata: TemplateMetadata = {
        version: '1.0.0',
        author: 'Test Author',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['test', 'example'],
        category: 'technical',
      };

      expect(metadata.author).toBe('Test Author');
      expect(metadata.tags).toEqual(['test', 'example']);
      expect(metadata.category).toBe('technical');
    });
  });

  describe('MarginConfig', () => {
    it('should create valid margin configuration', () => {
      const margin: MarginConfig = {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm',
      };

      expect(margin.top).toBe('2cm');
      expect(margin.right).toBe('2cm');
      expect(margin.bottom).toBe('2cm');
      expect(margin.left).toBe('2cm');
    });

    it('should accept different margin values', () => {
      const margin: MarginConfig = {
        top: '1in',
        right: '1.5cm',
        bottom: '20mm',
        left: '0.5in',
      };

      expect(margin.top).toBe('1in');
      expect(margin.right).toBe('1.5cm');
      expect(margin.bottom).toBe('20mm');
      expect(margin.left).toBe('0.5in');
    });
  });

  describe('HeaderConfig and FooterConfig', () => {
    it('should create valid header configuration with minimal fields', () => {
      const header: HeaderConfig = {
        enabled: true,
      };

      expect(header.enabled).toBe(true);
    });

    it('should create valid header configuration with all fields', () => {
      const header: HeaderConfig = {
        enabled: true,
        content: '{{title}}',
        height: '1.5cm',
        style: 'font-weight: bold;',
      };

      expect(header.enabled).toBe(true);
      expect(header.content).toBe('{{title}}');
      expect(header.height).toBe('1.5cm');
      expect(header.style).toBe('font-weight: bold;');
    });

    it('should create valid footer configuration', () => {
      const footer: FooterConfig = {
        enabled: true,
        content: 'Page {{pageNumber}} of {{totalPages}}',
        height: '1cm',
      };

      expect(footer.enabled).toBe(true);
      expect(footer.content).toBe('Page {{pageNumber}} of {{totalPages}}');
      expect(footer.height).toBe('1cm');
    });
  });

  describe('FontConfig', () => {
    it('should create valid font configuration', () => {
      const fonts: FontConfig = {
        body: 'Inter',
        heading: 'Inter',
        code: 'Monaco',
      };

      expect(fonts.body).toBe('Inter');
      expect(fonts.heading).toBe('Inter');
      expect(fonts.code).toBe('Monaco');
    });

    it('should allow empty font configuration', () => {
      const fonts: FontConfig = {};

      expect(fonts.body).toBeUndefined();
      expect(fonts.heading).toBeUndefined();
      expect(fonts.code).toBeUndefined();
    });
  });

  describe('ColorScheme', () => {
    it('should create valid color scheme', () => {
      const colors: ColorScheme = {
        primary: '#007bff',
        secondary: '#6c757d',
        accent: '#28a745',
        background: '#ffffff',
        text: '#212529',
      };

      expect(colors.primary).toBe('#007bff');
      expect(colors.secondary).toBe('#6c757d');
      expect(colors.accent).toBe('#28a745');
      expect(colors.background).toBe('#ffffff');
      expect(colors.text).toBe('#212529');
    });
  });

  describe('CodeBlockStyle', () => {
    it('should create valid code block style', () => {
      const codeBlock: CodeBlockStyle = {
        theme: 'coy',
        lineNumbers: true,
        highlightLines: [1, 3, 5],
      };

      expect(codeBlock.theme).toBe('coy');
      expect(codeBlock.lineNumbers).toBe(true);
      expect(codeBlock.highlightLines).toEqual([1, 3, 5]);
    });
  });

  describe('DocumentMetadata', () => {
    it('should create valid document metadata', () => {
      const metadata: DocumentMetadata = {
        title: 'Test Document',
        author: 'John Doe',
        subject: 'Testing',
        keywords: 'test, example',
        language: 'en',
        creator: 'MD2PDF',
        producer: 'MD2PDF v1.0',
      };

      expect(metadata.title).toBe('Test Document');
      expect(metadata.author).toBe('John Doe');
      expect(metadata.subject).toBe('Testing');
      expect(metadata.keywords).toBe('test, example');
      expect(metadata.language).toBe('en');
      expect(metadata.creator).toBe('MD2PDF');
      expect(metadata.producer).toBe('MD2PDF v1.0');
    });
  });

  describe('TemplateConfig', () => {
    it('should create valid template configuration', () => {
      const config: TemplateConfig = {
        pdf: {
          format: 'A4',
          orientation: 'portrait',
          margin: {
            top: '2cm',
            right: '2cm',
            bottom: '2cm',
            left: '2cm',
          },
          displayHeaderFooter: true,
        },
        headerFooter: {
          header: {
            enabled: true,
            content: '{{title}}',
          },
          footer: {
            enabled: true,
            content: 'Page {{pageNumber}}',
          },
        },
        styles: {
          theme: 'clean',
          fonts: {
            body: 'Inter',
          },
          colors: {},
          codeBlock: {
            theme: 'github',
            lineNumbers: false,
          },
        },
        features: {
          toc: true,
          tocDepth: 3,
          pageNumbers: true,
          anchorLinks: true,
          anchorDepth: 3,
        },
      };

      expect(config.pdf.format).toBe('A4');
      expect(config.pdf.orientation).toBe('portrait');
      expect(config.features.toc).toBe(true);
      expect(config.features.tocDepth).toBe(3);
      expect(config.features.anchorLinks).toBe(true);
      expect(config.features.anchorDepth).toBe(3);
    });
  });

  describe('Template', () => {
    it('should create valid template', () => {
      const template: Template = {
        id: 'test-123',
        name: 'Test Template',
        description: 'A test template',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: {
          pdf: {
            format: 'A4',
            orientation: 'portrait',
            margin: {
              top: '2cm',
              right: '2cm',
              bottom: '2cm',
              left: '2cm',
            },
            displayHeaderFooter: false,
          },
          headerFooter: {
            header: { enabled: false },
            footer: { enabled: false },
          },
          styles: {
            theme: 'clean',
            fonts: {},
            colors: {},
            codeBlock: {},
          },
          features: {
            toc: false,
            tocDepth: 2,
            pageNumbers: false,
            anchorLinks: false,
            anchorDepth: 2,
          },
        },
      };

      expect(template.id).toBe('test-123');
      expect(template.name).toBe('Test Template');
      expect(template.type).toBe('custom');
    });
  });

  describe('TemplateInput', () => {
    it('should create valid template input without id', () => {
      const input: TemplateInput = {
        name: 'New Template',
        description: 'A new template',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: {
          pdf: {
            format: 'A4',
            orientation: 'portrait',
            margin: {
              top: '2cm',
              right: '2cm',
              bottom: '2cm',
              left: '2cm',
            },
            displayHeaderFooter: false,
          },
          headerFooter: {
            header: { enabled: false },
            footer: { enabled: false },
          },
          styles: {
            theme: 'clean',
            fonts: {},
            colors: {},
            codeBlock: {},
          },
          features: {
            toc: false,
            tocDepth: 2,
            pageNumbers: false,
            anchorLinks: false,
            anchorDepth: 2,
          },
        },
      };

      expect(input.name).toBe('New Template');
      // @ts-expect-error - id should not exist on TemplateInput
      expect(input.id).toBeUndefined();
    });
  });

  describe('TemplateCollection', () => {
    it('should create valid template collection', () => {
      const collection: TemplateCollection = {
        system: [],
        custom: [],
      };

      expect(collection.system).toEqual([]);
      expect(collection.custom).toEqual([]);
    });
  });

  describe('TemplateFilter', () => {
    it('should create valid template filter with all fields', () => {
      const filter: TemplateFilter = {
        type: 'system',
        category: 'technical',
        tags: ['test'],
        searchTerm: 'example',
      };

      expect(filter.type).toBe('system');
      expect(filter.category).toBe('technical');
      expect(filter.tags).toEqual(['test']);
      expect(filter.searchTerm).toBe('example');
    });

    it('should create valid empty filter', () => {
      const filter: TemplateFilter = {};

      expect(filter.type).toBeUndefined();
      expect(filter.category).toBeUndefined();
      expect(filter.tags).toBeUndefined();
      expect(filter.searchTerm).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('should create valid validation error', () => {
      const error: ValidationError = {
        field: 'name',
        message: 'Name is required',
        severity: 'error',
      };

      expect(error.field).toBe('name');
      expect(error.message).toBe('Name is required');
      expect(error.severity).toBe('error');
    });

    it('should create validation warning', () => {
      const warning: ValidationError = {
        field: 'metadata',
        message: 'Metadata is incomplete',
        severity: 'warning',
      };

      expect(warning.severity).toBe('warning');
    });
  });

  describe('ValidationResult', () => {
    it('should create valid validation result', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
      };

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should create invalid validation result with errors', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            field: 'name',
            message: 'Name is required',
            severity: 'error',
          },
        ],
      };

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('ConfigValidationResult', () => {
    it('should create valid config validation result', () => {
      const result: ConfigValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      };

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should create config validation result with warnings', () => {
      const result: ConfigValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          {
            field: 'config.styles',
            message: 'Styles configuration is incomplete',
            severity: 'warning',
          },
        ],
      };

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('TemplateStorageOptions', () => {
    it('should create valid storage options', () => {
      const options: TemplateStorageOptions = {
        basePath: '/path/to/base',
        systemTemplatesPath: '/path/to/system',
        customTemplatesPath: '/path/to/custom',
      };

      expect(options.basePath).toBe('/path/to/base');
      expect(options.systemTemplatesPath).toBe('/path/to/system');
      expect(options.customTemplatesPath).toBe('/path/to/custom');
    });

    it('should create empty storage options', () => {
      const options: TemplateStorageOptions = {};

      expect(options.basePath).toBeUndefined();
      expect(options.systemTemplatesPath).toBeUndefined();
      expect(options.customTemplatesPath).toBeUndefined();
    });
  });
});
