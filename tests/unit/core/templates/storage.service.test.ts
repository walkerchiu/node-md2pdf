/**
 * Template Storage Service Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TemplateStorageService } from '../../../../src/core/templates/storage.service';
import type {
  Template,
  TemplateInput,
} from '../../../../src/core/templates/types';

describe('TemplateStorageService', () => {
  let storageService: TemplateStorageService;
  let testBasePath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testBasePath = path.join(os.tmpdir(), `md2pdf-test-${Date.now()}`);
    storageService = new TemplateStorageService({ basePath: testBasePath });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create required directories', () => {
      const templatesDir = path.join(testBasePath, 'templates');
      const systemDir = path.join(templatesDir, 'system');
      const customDir = path.join(templatesDir, 'custom');

      expect(fs.existsSync(testBasePath)).toBe(true);
      expect(fs.existsSync(systemDir)).toBe(true);
      expect(fs.existsSync(customDir)).toBe(true);
    });

    it('should use default paths when no options provided', () => {
      const defaultService = new TemplateStorageService();
      expect(defaultService).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new custom template', async () => {
      const templateInput: TemplateInput = {
        name: 'Test Template',
        description: 'A test template',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'custom',
        },
        config: createTestConfig(),
      };

      const created = await storageService.create(templateInput);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe(templateInput.name);
      expect(created.description).toBe(templateInput.description);
      expect(created.type).toBe('custom');
    });

    it('should throw error when creating system template', async () => {
      const templateInput: TemplateInput = {
        name: 'System Template',
        description: 'Should not be created',
        type: 'system',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: createTestConfig(),
      };

      await expect(storageService.create(templateInput)).rejects.toThrow(
        'Only custom templates can be created',
      );
    });

    it('should persist template to filesystem', async () => {
      const templateInput: TemplateInput = {
        name: 'Persisted Template',
        description: 'Should be saved to disk',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: createTestConfig(),
      };

      const created = await storageService.create(templateInput);
      const filePath = path.join(
        testBasePath,
        'templates',
        'custom',
        `${created.id}.json`,
      );

      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('read', () => {
    it('should read existing custom template', async () => {
      const templateInput: TemplateInput = {
        name: 'Readable Template',
        description: 'Should be readable',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: createTestConfig(),
      };

      const created = await storageService.create(templateInput);
      const read = await storageService.read(created.id);

      expect(read).toBeDefined();
      expect(read?.id).toBe(created.id);
      expect(read?.name).toBe(created.name);
    });

    it('should return null for non-existent template', async () => {
      const read = await storageService.read('non-existent-id');
      expect(read).toBeNull();
    });

    it('should read system template from memory', async () => {
      // System templates are loaded from getDefaultSystemTemplates()
      // Test with one of the default system templates
      const read = await storageService.read('system-quick-simple');
      expect(read).toBeDefined();
      expect(read?.type).toBe('system');
      expect(read?.id).toBe('system-quick-simple');
    });
  });

  describe('update', () => {
    it('should update existing custom template', async () => {
      const templateInput: TemplateInput = {
        name: 'Original Name',
        description: 'Original description',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: createTestConfig(),
      };

      const created = await storageService.create(templateInput);
      const updated = await storageService.update(created.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.id).toBe(created.id);
    });

    it('should update metadata.updatedAt timestamp', async () => {
      const templateInput: TemplateInput = {
        name: 'Test Template',
        description: 'Test',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: createTestConfig(),
      };

      const created = await storageService.create(templateInput);
      const originalUpdatedAt = created.metadata.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await storageService.update(created.id, {
        name: 'Updated Name',
      });

      expect(updated.metadata.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        storageService.update('non-existent-id', { name: 'New Name' }),
      ).rejects.toThrow('Template with ID non-existent-id not found');
    });

    it('should throw error when updating system template', async () => {
      // Use a default system template ID
      await expect(
        storageService.update('system-quick-simple', { name: 'New Name' }),
      ).rejects.toThrow('System templates cannot be updated');
    });
  });

  describe('delete', () => {
    it('should delete existing custom template', async () => {
      const templateInput: TemplateInput = {
        name: 'Deletable Template',
        description: 'Will be deleted',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: createTestConfig(),
      };

      const created = await storageService.create(templateInput);
      const deleted = await storageService.delete(created.id);

      expect(deleted).toBe(true);

      const read = await storageService.read(created.id);
      expect(read).toBeNull();
    });

    it('should return false for non-existent template', async () => {
      const deleted = await storageService.delete('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should throw error when deleting system template', async () => {
      // Use a default system template ID
      await expect(
        storageService.delete('system-quick-simple'),
      ).rejects.toThrow('System templates cannot be deleted');
    });
  });

  describe('list', () => {
    it('should list all templates', async () => {
      await createTestTemplates(storageService, 3);
      const templates = await storageService.list();
      // Should include 3 custom templates + 4 system templates (from getDefaultSystemTemplates)
      expect(templates.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by type', async () => {
      await createTestTemplates(storageService, 2);

      const customOnly = await storageService.list({ type: 'custom' });
      const systemOnly = await storageService.list({ type: 'system' });

      expect(customOnly.length).toBe(2);
      // Should have 4 default system templates
      expect(systemOnly.length).toBe(4);
    });

    it('should filter by category', async () => {
      const templates = await Promise.all([
        createTemplateWithCategory(storageService, 'professional'),
        createTemplateWithCategory(storageService, 'technical'),
        createTemplateWithCategory(storageService, 'professional'),
      ]);

      const professional = await storageService.list({
        category: 'professional',
      });
      // Should have 2 custom + 1 system (Business Report)
      expect(professional.length).toBe(3);
    });

    it('should filter by search term', async () => {
      await storageService.create({
        name: 'Professional Report',
        description: 'A professional report template',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: createTestConfig(),
      });

      await storageService.create({
        name: 'Technical Document',
        description: 'A technical documentation template',
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        config: createTestConfig(),
      });

      const searchResults = await storageService.list({
        searchTerm: 'professional',
      });
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].name).toBe('Professional Report');
    });

    it('should return system templates even when no custom templates exist', async () => {
      const templates = await storageService.list();
      // Should have 4 default system templates
      expect(templates.length).toBe(4);
      expect(templates.every((t) => t.type === 'system')).toBe(true);
    });
  });

  describe('getSystemTemplates', () => {
    it('should return only system templates', async () => {
      await createTestTemplates(storageService, 2);

      const systemTemplates = await storageService.getSystemTemplates();
      // Should have 4 default system templates
      expect(systemTemplates.length).toBe(4);
      expect(systemTemplates.every((t) => t.type === 'system')).toBe(true);
    });
  });

  describe('getAllTemplates', () => {
    it('should return templates grouped by type', async () => {
      await createTestTemplates(storageService, 2);

      const collection = await storageService.getAllTemplates();
      // Should have 4 default system templates
      expect(collection.system.length).toBe(4);
      expect(collection.custom.length).toBe(2);
    });
  });

  describe('importTemplate', () => {
    it('should import template from valid JSON', async () => {
      const templateJson = JSON.stringify({
        name: 'Imported Template',
        description: 'Imported from JSON',
        config: createTestConfig(),
        metadata: {
          version: '1.0.0',
          category: 'custom',
        },
      });

      const imported = await storageService.importTemplate(templateJson);
      expect(imported.name).toBe('Imported Template');
      expect(imported.type).toBe('custom');
    });

    it('should throw error for invalid JSON', async () => {
      await expect(
        storageService.importTemplate('invalid json'),
      ).rejects.toThrow('Invalid JSON format');
    });

    it('should throw error for incomplete template data', async () => {
      const incompleteJson = JSON.stringify({
        name: 'Incomplete',
        // missing description and config
      });

      await expect(
        storageService.importTemplate(incompleteJson),
      ).rejects.toThrow('Invalid template format: missing required fields');
    });
  });

  describe('exportTemplate', () => {
    it('should export template as JSON string', async () => {
      const created = await createTestTemplates(storageService, 1);
      const exported = await storageService.exportTemplate(created[0].id);

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed.name).toBe(created[0].name);
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        storageService.exportTemplate('non-existent'),
      ).rejects.toThrow('Template with ID non-existent not found');
    });
  });

  describe('exists', () => {
    it('should return true for existing template', async () => {
      const created = await createTestTemplates(storageService, 1);
      const exists = await storageService.exists(created[0].id);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent template', async () => {
      const exists = await storageService.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should return total count of templates', async () => {
      await createTestTemplates(storageService, 5);
      const count = await storageService.count();
      // Should have 5 custom + 4 system templates
      expect(count).toBe(9);
    });

    it('should return filtered count', async () => {
      await createTemplateWithCategory(storageService, 'professional');
      await createTemplateWithCategory(storageService, 'technical');
      await createTemplateWithCategory(storageService, 'professional');

      const count = await storageService.count({ category: 'professional' });
      // Should have 2 custom + 1 system (Business Report)
      expect(count).toBe(3);
    });
  });
});

// Helper functions

function createTestConfig() {
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

async function createTestTemplates(
  service: TemplateStorageService,
  count: number,
): Promise<Template[]> {
  const templates: Template[] = [];
  for (let i = 0; i < count; i++) {
    const template = await service.create({
      name: `Test Template ${i + 1}`,
      description: `Test description ${i + 1}`,
      type: 'custom',
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      config: createTestConfig(),
    });
    templates.push(template);
  }
  return templates;
}

async function createTemplateWithCategory(
  service: TemplateStorageService,
  category: 'professional' | 'technical' | 'academic' | 'quick' | 'custom',
): Promise<Template> {
  return service.create({
    name: `${category} Template`,
    description: `A ${category} template`,
    type: 'custom',
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category,
    },
    config: createTestConfig(),
  });
}
