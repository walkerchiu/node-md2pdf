/**
 * Template Validator Tests
 */

import { TemplateValidator } from '../../../../src/core/templates/validator';
import type {
  Template,
  TemplateConfig,
} from '../../../../src/core/templates/types';

describe('TemplateValidator', () => {
  let validator: TemplateValidator;

  beforeEach(() => {
    validator = new TemplateValidator();
  });

  describe('validate', () => {
    it('should validate a valid template', () => {
      const template = createValidTemplate();
      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors.filter((e) => e.severity === 'error')).toHaveLength(
        0,
      );
    });

    it('should return errors for invalid template structure', () => {
      const invalidTemplate = { name: 'Incomplete' } as Template;
      const result = validator.validate(invalidTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate required fields', () => {
      const template = createValidTemplate();
      delete (template as any).name;

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should validate metadata', () => {
      const template = createValidTemplate();
      template.metadata.version = '' as any;

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'metadata.version')).toBe(
        true,
      );
    });

    it('should validate configuration', () => {
      const template = createValidTemplate();
      template.config.pdf.format = '' as any;

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'config.pdf.format')).toBe(
        true,
      );
    });
  });

  describe('validateStructure', () => {
    it('should return true for valid template structure', () => {
      const template = createValidTemplate();
      expect(validator.validateStructure(template)).toBe(true);
    });

    it('should return false for null or non-object', () => {
      expect(validator.validateStructure(null)).toBe(false);
      expect(validator.validateStructure('string')).toBe(false);
      expect(validator.validateStructure(123)).toBe(false);
      expect(validator.validateStructure([])).toBe(false);
    });

    it('should return false for objects missing required fields', () => {
      expect(validator.validateStructure({})).toBe(false);
      expect(validator.validateStructure({ name: 'Test' })).toBe(false);
      expect(
        validator.validateStructure({ name: 'Test', description: 'Desc' }),
      ).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = createValidConfig();
      const result = validator.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors.filter((e) => e.severity === 'error')).toHaveLength(
        0,
      );
    });

    it('should validate PDF configuration', () => {
      const config = createValidConfig();
      config.pdf.orientation = 'invalid' as any;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'config.pdf.orientation'),
      ).toBe(true);
    });

    it('should validate margin configuration', () => {
      const config = createValidConfig();
      delete (config.pdf.margin as any).top;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'config.pdf.margin.top'),
      ).toBe(true);
    });

    it('should validate all margin fields', () => {
      const config = createValidConfig();
      config.pdf.margin = { top: '1cm' } as any;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field.includes('config.pdf.margin')),
      ).toBe(true);
    });

    it('should validate displayHeaderFooter is boolean', () => {
      const config = createValidConfig();
      config.pdf.displayHeaderFooter = 'true' as any;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'config.pdf.displayHeaderFooter'),
      ).toBe(true);
    });

    it('should validate header enabled flag', () => {
      const config = createValidConfig();
      config.headerFooter.header.enabled = 'yes' as any;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === 'config.headerFooter.header.enabled',
        ),
      ).toBe(true);
    });

    it('should validate footer enabled flag', () => {
      const config = createValidConfig();
      delete (config.headerFooter.footer as any).enabled;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === 'config.headerFooter.footer.enabled',
        ),
      ).toBe(true);
    });

    it('should validate theme is required', () => {
      const config = createValidConfig();
      config.styles.theme = '' as any;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'config.styles.theme')).toBe(
        true,
      );
    });

    it('should validate color values', () => {
      const config = createValidConfig();
      config.styles.colors = {
        primary: 'invalid-color',
      };

      const result = validator.validateConfig(config);

      expect(
        result.errors.some(
          (e) =>
            e.field === 'config.styles.colors.primary' &&
            e.severity === 'warning',
        ),
      ).toBe(true);
    });

    it('should accept valid hex colors', () => {
      const config = createValidConfig();
      config.styles.colors = {
        primary: '#FF5733',
        secondary: '#333',
      };

      const result = validator.validateConfig(config);

      expect(
        result.errors.some((e) => e.field.includes('config.styles.colors')),
      ).toBe(false);
    });

    it('should accept valid rgb/rgba colors', () => {
      const config = createValidConfig();
      config.styles.colors = {
        primary: 'rgb(255, 87, 51)',
        secondary: 'rgba(0, 0, 0, 0.5)',
      };

      const result = validator.validateConfig(config);

      expect(
        result.errors.some((e) => e.field.includes('config.styles.colors')),
      ).toBe(false);
    });

    it('should validate TOC flag is boolean', () => {
      const config = createValidConfig();
      config.features.toc = 1 as any;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'config.features.toc')).toBe(
        true,
      );
    });

    it('should validate TOC depth is in range 1-6', () => {
      const config = createValidConfig();
      config.features.tocDepth = 7;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'config.features.tocDepth'),
      ).toBe(true);
    });

    it('should validate TOC depth minimum value', () => {
      const config = createValidConfig();
      config.features.tocDepth = 0;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'config.features.tocDepth'),
      ).toBe(true);
    });

    it('should validate page numbers is boolean', () => {
      const config = createValidConfig();
      config.features.pageNumbers = 'true' as any;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'config.features.pageNumbers'),
      ).toBe(true);
    });

    it('should validate anchor links is boolean', () => {
      const config = createValidConfig();
      delete (config.features as any).anchorLinks;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'config.features.anchorLinks'),
      ).toBe(true);
    });

    it('should validate anchor depth is in range 1-6', () => {
      const config = createValidConfig();
      config.features.anchorDepth = 10;

      const result = validator.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field === 'config.features.anchorDepth'),
      ).toBe(true);
    });

    it('should generate warning for header/footer mismatch', () => {
      const config = createValidConfig();
      config.headerFooter.header.enabled = true;
      config.pdf.displayHeaderFooter = false;

      const result = validator.validateConfig(config);

      expect(
        result.warnings.some(
          (w) => w.field === 'config.pdf.displayHeaderFooter',
        ),
      ).toBe(true);
    });

    it('should generate warning for shallow TOC depth', () => {
      const config = createValidConfig();
      config.features.toc = true;
      config.features.tocDepth = 1;

      const result = validator.validateConfig(config);

      expect(
        result.warnings.some((w) => w.field === 'config.features.tocDepth'),
      ).toBe(true);
    });

    it('should generate warning for disabled anchor links', () => {
      const config = createValidConfig();
      config.features.anchorLinks = false;

      const result = validator.validateConfig(config);

      expect(
        result.warnings.some((w) => w.field === 'config.features.anchorLinks'),
      ).toBe(true);
    });
  });

  describe('sanitizeTemplate', () => {
    it('should remove HTML tags from name', () => {
      const template = createValidTemplate();
      template.name = '<script>alert("xss")</script>Safe Name';

      const sanitized = validator.sanitizeTemplate(template);

      expect(sanitized.name).toBe('Safe Name');
      expect(sanitized.name).not.toContain('<script>');
    });

    it('should remove HTML tags from description', () => {
      const template = createValidTemplate();
      template.description = '<b>Bold</b> description';

      const sanitized = validator.sanitizeTemplate(template);

      expect(sanitized.description).toBe('Bold description');
      expect(sanitized.description).not.toContain('<b>');
    });

    it('should sanitize author field', () => {
      const template = createValidTemplate();
      template.metadata.author = '<img src=x onerror=alert(1)>Author';

      const sanitized = validator.sanitizeTemplate(template);

      expect(sanitized.metadata.author).toBe('Author');
      expect(sanitized.metadata.author).not.toContain('<img');
    });

    it('should sanitize tags', () => {
      const template = createValidTemplate();
      template.metadata.tags = [
        '<b>tag1</b>',
        'safe-tag',
        '<script>evil</script>good',
      ];

      const sanitized = validator.sanitizeTemplate(template);

      expect(sanitized.metadata.tags).toEqual(['tag1', 'safe-tag', 'good']);
    });

    it('should sanitize header content', () => {
      const template = createValidTemplate();
      template.config.headerFooter.header.content =
        '<script>evil()</script>Header';

      const sanitized = validator.sanitizeTemplate(template);

      expect(sanitized.config.headerFooter.header.content).toBe('Header');
    });

    it('should sanitize footer content', () => {
      const template = createValidTemplate();
      template.config.headerFooter.footer.content = '<b>Footer</b>';

      const sanitized = validator.sanitizeTemplate(template);

      expect(sanitized.config.headerFooter.footer.content).toBe('Footer');
    });

    it('should not modify valid content', () => {
      const template = createValidTemplate();
      const original = JSON.stringify(template);

      const sanitized = validator.sanitizeTemplate(template);

      expect(JSON.stringify(sanitized)).toBe(original);
    });

    it('should create a deep copy', () => {
      const template = createValidTemplate();
      const sanitized = validator.sanitizeTemplate(template);

      sanitized.name = 'Modified';
      expect(template.name).not.toBe('Modified');
    });
  });

  describe('metadata validation', () => {
    it('should validate version is string', () => {
      const template = createValidTemplate();
      template.metadata.version = 123 as any;

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'metadata.version')).toBe(
        true,
      );
    });

    it('should validate createdAt is valid ISO date', () => {
      const template = createValidTemplate();
      template.metadata.createdAt = 'not-a-date';

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'metadata.createdAt')).toBe(
        true,
      );
    });

    it('should validate updatedAt is valid ISO date', () => {
      const template = createValidTemplate();
      template.metadata.updatedAt = '2024-13-45'; // Invalid date

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'metadata.updatedAt')).toBe(
        true,
      );
    });

    it('should validate category is valid value', () => {
      const template = createValidTemplate();
      template.metadata.category = 'invalid' as any;

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'metadata.category')).toBe(
        true,
      );
    });

    it('should accept valid categories', () => {
      const validCategories = [
        'quick',
        'professional',
        'technical',
        'academic',
        'custom',
      ];

      validCategories.forEach((category) => {
        const template = createValidTemplate();
        template.metadata.category = category as any;

        const result = validator.validate(template);

        expect(result.errors.some((e) => e.field === 'metadata.category')).toBe(
          false,
        );
      });
    });
  });

  describe('type validation', () => {
    it('should validate type is either system or custom', () => {
      const template = createValidTemplate();
      template.type = 'invalid' as any;

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
    });

    it('should accept system type', () => {
      const template = createValidTemplate();
      template.type = 'system';

      const result = validator.validate(template);

      expect(result.errors.some((e) => e.field === 'type')).toBe(false);
    });

    it('should accept custom type', () => {
      const template = createValidTemplate();
      template.type = 'custom';

      const result = validator.validate(template);

      expect(result.errors.some((e) => e.field === 'type')).toBe(false);
    });
  });
});

// Helper functions

function createValidTemplate(): Template {
  return {
    id: 'test-template-1',
    name: 'Test Template',
    description: 'A test template for validation',
    type: 'custom',
    metadata: {
      version: '1.0.0',
      author: 'Test Author',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['test', 'validation'],
      category: 'custom',
    },
    config: createValidConfig(),
  };
}

function createValidConfig(): TemplateConfig {
  return {
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
      header: {
        enabled: false,
      },
      footer: {
        enabled: false,
      },
    },
    styles: {
      theme: 'default',
      fonts: {},
      colors: {},
      codeBlock: {},
    },
    features: {
      toc: true,
      tocDepth: 3,
      pageNumbers: true,
      anchorLinks: true,
      anchorDepth: 2,
    },
  };
}
