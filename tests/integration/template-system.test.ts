/**
 * Template System Integration Tests
 * Tests the complete template management workflow
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TemplateStorageService } from '../../src/core/templates/storage.service';
import { TemplateValidator } from '../../src/core/templates/validator';
import type { Template } from '../../src/core/templates/types';

describe('Template System Integration', () => {
  let storageService: TemplateStorageService;
  let validator: TemplateValidator;
  let testBasePath: string;

  beforeEach(() => {
    // Create temporary test directory
    testBasePath = path.join(os.tmpdir(), `md2pdf-integration-${Date.now()}`);
    storageService = new TemplateStorageService({ basePath: testBasePath });
    validator = new TemplateValidator();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true });
    }
  });

  describe('System Templates', () => {
    it('should load all 4 system templates from memory', async () => {
      // System templates are now loaded from memory, not from filesystem
      const systemTemplates = await storageService.getSystemTemplates();

      expect(systemTemplates).toHaveLength(4);

      // Check for all expected system template IDs
      const expectedIds = [
        'system-quick-simple',
        'system-technical',
        'system-business',
        'system-academic',
      ];

      const actualIds = systemTemplates.map((t) => t.id);
      expectedIds.forEach((id) => {
        expect(actualIds).toContain(id);
      });
    });

    it('should validate all system templates', async () => {
      // Get system templates from memory
      const systemTemplates = await storageService.getSystemTemplates();

      for (const template of systemTemplates) {
        // Validate template structure
        const validationResult = validator.validate(template);

        expect(validationResult.valid).toBe(true);
        expect(
          validationResult.errors.filter((e) => e.severity === 'error'),
        ).toHaveLength(0);
        expect(template.type).toBe('system');
      }
    });

    it('should have correct IDs for system templates', async () => {
      // Get system templates from memory
      const systemTemplates = await storageService.getSystemTemplates();

      const expectedIds = [
        'system-quick-simple',
        'system-technical',
        'system-business',
        'system-academic',
      ];

      const actualIds = systemTemplates.map((t) => t.id);

      expectedIds.forEach((expectedId) => {
        expect(actualIds).toContain(expectedId);
      });
    });

    it('should have all required metadata fields', async () => {
      // Get system templates from memory
      const systemTemplates = await storageService.getSystemTemplates();

      for (const template of systemTemplates) {
        expect(template.metadata).toBeDefined();
        expect(template.metadata.version).toBeDefined();
        expect(template.metadata.author).toBe('MD2PDF');
        expect(template.metadata.createdAt).toBeDefined();
        expect(template.metadata.updatedAt).toBeDefined();
        expect(template.metadata.tags).toBeDefined();
        expect(template.metadata.category).toBeDefined();
      }
    });

    it('should have complete PDF configuration', async () => {
      // Get system templates from memory
      const systemTemplates = await storageService.getSystemTemplates();

      for (const template of systemTemplates) {
        // PDF config
        expect(template.config.pdf).toBeDefined();
        expect(template.config.pdf.format).toBe('A4');
        expect(template.config.pdf.orientation).toMatch(
          /^(portrait|landscape)$/,
        );
        expect(template.config.pdf.margin).toBeDefined();
        expect(template.config.pdf.margin.top).toBeDefined();
        expect(template.config.pdf.margin.right).toBeDefined();
        expect(template.config.pdf.margin.bottom).toBeDefined();
        expect(template.config.pdf.margin.left).toBeDefined();
        expect(typeof template.config.pdf.displayHeaderFooter).toBe('boolean');

        // Header/Footer config
        expect(template.config.headerFooter).toBeDefined();
        expect(typeof template.config.headerFooter.header.enabled).toBe(
          'boolean',
        );
        expect(typeof template.config.headerFooter.footer.enabled).toBe(
          'boolean',
        );

        // Styles config
        expect(template.config.styles).toBeDefined();
        expect(template.config.styles.theme).toBeDefined();

        // Features config
        expect(template.config.features).toBeDefined();
        expect(typeof template.config.features.toc).toBe('boolean');
        expect(typeof template.config.features.tocDepth).toBe('number');
        expect(typeof template.config.features.pageNumbers).toBe('boolean');
        expect(typeof template.config.features.anchorLinks).toBe('boolean');
        expect(typeof template.config.features.anchorDepth).toBe('number');
      }
    });
  });

  describe('Template Storage Integration', () => {
    it('should create, read, update, and delete custom template', async () => {
      // Create
      const templateInput = {
        name: 'Integration Test Template',
        description: 'Template for integration testing',
        type: 'custom' as const,
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'custom' as const,
        },
        config: {
          pdf: {
            format: 'A4',
            orientation: 'portrait' as const,
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
        },
      };

      const created = await storageService.create(templateInput);
      expect(created.id).toBeDefined();
      expect(created.name).toBe(templateInput.name);

      // Read
      const read = await storageService.read(created.id);
      expect(read).not.toBeNull();
      expect(read?.name).toBe(created.name);

      // Update
      const updated = await storageService.update(created.id, {
        name: 'Updated Template Name',
      });
      expect(updated.name).toBe('Updated Template Name');

      // Delete
      const deleted = await storageService.delete(created.id);
      expect(deleted).toBe(true);

      // Verify deletion
      const afterDelete = await storageService.read(created.id);
      expect(afterDelete).toBeNull();
    });

    it('should validate template before storage', async () => {
      const invalidTemplate = {
        name: '<script>alert("xss")</script>Malicious',
        description: 'Test template',
        type: 'custom' as const,
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'custom' as const,
        },
        config: {
          pdf: {
            format: 'A4',
            orientation: 'portrait' as const,
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
        },
      };

      const created = await storageService.create(invalidTemplate);

      // Sanitize and validate
      const sanitized = validator.sanitizeTemplate(created);
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.name).toBe('Malicious');
    });

    it('should list templates with filtering', async () => {
      // Create multiple templates
      const template1 = await storageService.create({
        name: 'Quick Template',
        description: 'A quick template',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'quick',
          tags: ['quick', 'simple'],
        },
        config: createMinimalConfig(),
      });

      const template2 = await storageService.create({
        name: 'Professional Template',
        description: 'A professional template',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'professional',
          tags: ['professional', 'business'],
        },
        config: createMinimalConfig(),
      });

      // List all
      const all = await storageService.list();
      expect(all.length).toBeGreaterThanOrEqual(2);

      // Filter by category
      const quickOnly = await storageService.list({ category: 'quick' });
      expect(quickOnly.some((t) => t.id === template1.id)).toBe(true);

      // Filter by tags
      const businessOnly = await storageService.list({ tags: ['business'] });
      expect(businessOnly.some((t) => t.id === template2.id)).toBe(true);

      // Clean up
      await storageService.delete(template1.id);
      await storageService.delete(template2.id);
    });
  });

  describe('Template Import/Export', () => {
    it('should export and import template', async () => {
      // Create a template
      const original = await storageService.create({
        name: 'Export Test Template',
        description: 'Template for export testing',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'custom',
        },
        config: createMinimalConfig(),
      });

      // Export
      const exported = await storageService.exportTemplate(original.id);
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      // Parse to verify
      const parsed = JSON.parse(exported);
      expect(parsed.name).toBe(original.name);

      // Import
      const imported = await storageService.importTemplate(exported);
      expect(imported.name).toBe(original.name);
      expect(imported.id).not.toBe(original.id); // New ID assigned

      // Clean up
      await storageService.delete(original.id);
      await storageService.delete(imported.id);
    });
  });
});

// Helper function
function createMinimalConfig() {
  return {
    pdf: {
      format: 'A4',
      orientation: 'portrait' as const,
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
