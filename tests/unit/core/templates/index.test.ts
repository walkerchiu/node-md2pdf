/**
 * Template Module Index Tests
 */

import * as TemplateModule from '../../../../src/core/templates';

describe('Template Module Exports', () => {
  describe('module structure', () => {
    it('should export all required types', () => {
      expect(TemplateModule).toBeDefined();
      expect(typeof TemplateModule).toBe('object');
    });

    it('should export TemplateStorageService', () => {
      expect(TemplateModule.TemplateStorageService).toBeDefined();
      expect(typeof TemplateModule.TemplateStorageService).toBe('function');
    });

    it('should export TemplateValidator', () => {
      expect(TemplateModule.TemplateValidator).toBeDefined();
      expect(typeof TemplateModule.TemplateValidator).toBe('function');
    });

    it('should be able to create TemplateStorageService instance', () => {
      const storageService = new TemplateModule.TemplateStorageService();
      expect(storageService).toBeDefined();
      expect(storageService).toBeInstanceOf(
        TemplateModule.TemplateStorageService,
      );
    });

    it('should be able to create TemplateValidator instance', () => {
      const validator = new TemplateModule.TemplateValidator();
      expect(validator).toBeDefined();
      expect(validator).toBeInstanceOf(TemplateModule.TemplateValidator);
    });
  });

  describe('type exports', () => {
    it('should export Template type', () => {
      // Type checking - if this compiles, the type is exported
      const template: TemplateModule.Template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        type: 'custom',
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
            toc: false,
            tocDepth: 3,
            pageNumbers: false,
            anchorLinks: false,
            anchorDepth: 3,
          },
        },
        metadata: {
          version: '1.0.0',
          author: 'Test Author',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      expect(template).toBeDefined();
      expect(template.id).toBe('test-template');
    });

    it('should export TemplateType type', () => {
      const types: TemplateModule.TemplateType[] = ['system', 'custom'];
      expect(types).toHaveLength(2);
      expect(types).toContain('system');
      expect(types).toContain('custom');
    });

    it('should export TemplateCategory type', () => {
      const categories: TemplateModule.TemplateCategory[] = [
        'quick',
        'professional',
        'technical',
        'academic',
        'custom',
      ];
      expect(categories).toHaveLength(5);
      expect(categories).toContain('quick');
      expect(categories).toContain('custom');
    });
  });

  describe('service functionality', () => {
    it('should have working TemplateStorageService methods', async () => {
      const storageService = new TemplateModule.TemplateStorageService();

      // Check that the service has the expected methods
      expect(typeof storageService.create).toBe('function');
      expect(typeof storageService.read).toBe('function');
      expect(typeof storageService.update).toBe('function');
      expect(typeof storageService.delete).toBe('function');
      expect(typeof storageService.list).toBe('function');
      expect(typeof storageService.getSystemTemplates).toBe('function');
      expect(typeof storageService.getAllTemplates).toBe('function');

      // Test that system templates can be retrieved
      const systemTemplates = await storageService.getSystemTemplates();
      expect(Array.isArray(systemTemplates)).toBe(true);
      expect(systemTemplates.length).toBeGreaterThan(0);
    });

    it('should have working TemplateValidator methods', () => {
      const validator = new TemplateModule.TemplateValidator();

      expect(typeof validator.validate).toBe('function');
      expect(typeof validator.validateConfig).toBe('function');

      // Test validation with a valid template
      const validTemplate: TemplateModule.Template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        type: 'custom',
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
            toc: false,
            tocDepth: 3,
            pageNumbers: false,
            anchorLinks: false,
            anchorDepth: 3,
          },
        },
        metadata: {
          version: '1.0.0',
          author: 'Test Author',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const result = validator.validate(validTemplate);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('module integrity', () => {
    it('should not have undefined exports', () => {
      const exports = Object.keys(TemplateModule);
      exports.forEach((key) => {
        expect(
          TemplateModule[key as keyof typeof TemplateModule],
        ).toBeDefined();
      });
    });

    it('should export at least the core components', () => {
      const exports = Object.keys(TemplateModule);
      expect(exports).toContain('TemplateStorageService');
      expect(exports).toContain('TemplateValidator');
    });
  });
});
