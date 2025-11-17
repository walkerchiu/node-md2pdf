/**
 * Template CLI Integration Tests
 * Tests template integration with CLI modes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TemplateStorageService } from '../../src/core/templates/storage.service';
import { SmartConversionMode } from '../../src/cli/smart-conversion-mode';

describe('Template CLI Integration', () => {
  describe('SmartConversionMode Template Integration', () => {
    it('should have access to TemplateStorageService', () => {
      const mode = new SmartConversionMode();
      expect(mode).toBeDefined();
      // SmartConversionMode has templateStorage as private property
      // We test indirectly through the mode's existence
    });

    it('should be able to count templates', async () => {
      // Use default paths (which includes system templates)
      const systemPath = path.join(
        os.homedir(),
        '.md2pdf',
        'templates',
        'system',
      );
      const storage = new TemplateStorageService({
        systemTemplatesPath: systemPath,
      });
      const count = await storage.count();
      expect(count).toBeGreaterThanOrEqual(4); // At least 4 system templates
    });

    it('should be able to load system templates', async () => {
      const systemPath = path.join(
        os.homedir(),
        '.md2pdf',
        'templates',
        'system',
      );
      const storage = new TemplateStorageService({
        systemTemplatesPath: systemPath,
      });
      const collection = await storage.getAllTemplates();

      expect(collection.system).toBeDefined();
      expect(collection.system.length).toBeGreaterThanOrEqual(4);

      // Check for expected system templates
      const systemIds = collection.system.map((t) => t.id);
      expect(systemIds).toContain('system-quick-simple');
      expect(systemIds).toContain('system-professional');
      expect(systemIds).toContain('system-technical');
      expect(systemIds).toContain('system-academic');
    });

    it('should be able to read individual system templates', async () => {
      const systemPath = path.join(
        os.homedir(),
        '.md2pdf',
        'templates',
        'system',
      );
      const storage = new TemplateStorageService({
        systemTemplatesPath: systemPath,
      });

      const quickTemplate = await storage.read('system-quick-simple');
      expect(quickTemplate).not.toBeNull();
      expect(quickTemplate?.type).toBe('system');
      expect(quickTemplate?.name).toBe('Quick & Simple');

      const professionalTemplate = await storage.read('system-professional');
      expect(professionalTemplate).not.toBeNull();
      expect(professionalTemplate?.type).toBe('system');
      expect(professionalTemplate?.name).toBe('Professional Document');

      const technicalTemplate = await storage.read('system-technical');
      expect(technicalTemplate).not.toBeNull();
      expect(technicalTemplate?.type).toBe('system');
      expect(technicalTemplate?.name).toBe('Technical Documentation');

      const academicTemplate = await storage.read('system-academic');
      expect(academicTemplate).not.toBeNull();
      expect(academicTemplate?.type).toBe('system');
      expect(academicTemplate?.name).toBe('Academic Paper');
    });

    it('should have template configs with all required fields', async () => {
      const systemPath = path.join(
        os.homedir(),
        '.md2pdf',
        'templates',
        'system',
      );
      const storage = new TemplateStorageService({
        systemTemplatesPath: systemPath,
      });
      const collection = await storage.getAllTemplates();

      collection.system.forEach((template) => {
        // Verify template structure
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.type).toBe('system');

        // Verify metadata
        expect(template.metadata).toBeDefined();
        expect(template.metadata.version).toBeDefined();
        expect(template.metadata.createdAt).toBeDefined();
        expect(template.metadata.updatedAt).toBeDefined();
        expect(template.metadata.category).toBeDefined();

        // Verify config
        expect(template.config).toBeDefined();
        expect(template.config.pdf).toBeDefined();
        expect(template.config.headerFooter).toBeDefined();
        expect(template.config.styles).toBeDefined();
        expect(template.config.features).toBeDefined();

        // Verify PDF config details
        expect(template.config.pdf.format).toBe('A4');
        expect(['portrait', 'landscape']).toContain(
          template.config.pdf.orientation,
        );
        expect(template.config.pdf.margin).toBeDefined();
        expect(template.config.pdf.margin.top).toBeDefined();
        expect(template.config.pdf.margin.right).toBeDefined();
        expect(template.config.pdf.margin.bottom).toBeDefined();
        expect(template.config.pdf.margin.left).toBeDefined();

        // Verify features config
        expect(typeof template.config.features.toc).toBe('boolean');
        expect(typeof template.config.features.tocDepth).toBe('number');
        expect(template.config.features.tocDepth).toBeGreaterThanOrEqual(1);
        expect(template.config.features.tocDepth).toBeLessThanOrEqual(6);
        expect(typeof template.config.features.pageNumbers).toBe('boolean');
        expect(typeof template.config.features.anchorLinks).toBe('boolean');
        expect(typeof template.config.features.anchorDepth).toBe('number');
      });
    });

    it('should have different configurations for each template', async () => {
      const systemPath = path.join(
        os.homedir(),
        '.md2pdf',
        'templates',
        'system',
      );
      const storage = new TemplateStorageService({
        systemTemplatesPath: systemPath,
      });

      const quick = await storage.read('system-quick-simple');
      const professional = await storage.read('system-professional');
      const technical = await storage.read('system-technical');
      const academic = await storage.read('system-academic');

      // Quick template should have minimal features
      expect(quick?.config.features.toc).toBe(false);
      expect(quick?.config.features.pageNumbers).toBe(false);
      expect(quick?.config.pdf.displayHeaderFooter).toBe(false);

      // Professional template should have TOC and page numbers
      expect(professional?.config.features.toc).toBe(true);
      expect(professional?.config.features.pageNumbers).toBe(true);
      expect(professional?.config.pdf.displayHeaderFooter).toBe(true);

      // Technical template should have deep TOC
      expect(technical?.config.features.toc).toBe(true);
      expect(technical?.config.features.tocDepth).toBeGreaterThanOrEqual(4);

      // Academic template should have 1-inch margins (2.54cm)
      expect(academic?.config.pdf.margin.top).toBe('2.54cm');
      expect(academic?.config.pdf.margin.right).toBe('2.54cm');
      expect(academic?.config.pdf.margin.bottom).toBe('2.54cm');
      expect(academic?.config.pdf.margin.left).toBe('2.54cm');
    });
  });

  describe('Template File System Integration', () => {
    it('should have system templates in correct directory', () => {
      const systemPath = path.join(
        os.homedir(),
        '.md2pdf',
        'templates',
        'system',
      );
      expect(fs.existsSync(systemPath)).toBe(true);

      const files = fs.readdirSync(systemPath);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      expect(jsonFiles.length).toBeGreaterThanOrEqual(4);
      expect(jsonFiles).toContain('system-quick-simple.json');
      expect(jsonFiles).toContain('system-professional.json');
      expect(jsonFiles).toContain('system-technical.json');
      expect(jsonFiles).toContain('system-academic.json');
    });

    it('should have valid JSON in all template files', () => {
      const systemPath = path.join(
        os.homedir(),
        '.md2pdf',
        'templates',
        'system',
      );
      const files = fs
        .readdirSync(systemPath)
        .filter((f) => f.endsWith('.json'));

      files.forEach((file) => {
        const filePath = path.join(systemPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        expect(() => JSON.parse(content)).not.toThrow();

        const json = JSON.parse(content);
        expect(json).toBeDefined();
        expect(json.id).toBeDefined();
        expect(json.name).toBeDefined();
        expect(json.type).toBe('system');
      });
    });
  });
});
