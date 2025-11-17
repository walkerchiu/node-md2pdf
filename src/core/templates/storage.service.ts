/**
 * Template Storage Service
 * Handles CRUD operations for template management
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

import type {
  Template,
  TemplateInput,
  TemplateCollection,
  TemplateFilter,
  TemplateStorageOptions,
} from './types';

/**
 * Default storage paths
 */
const DEFAULT_BASE_PATH = path.join(os.homedir(), '.md2pdf');
const DEFAULT_TEMPLATES_DIR = 'templates';
const SYSTEM_TEMPLATES_DIR = 'system';
const CUSTOM_TEMPLATES_DIR = 'custom';

/**
 * Template Storage Service
 * Manages template persistence and retrieval
 */
export class TemplateStorageService {
  private readonly basePath: string;
  private readonly systemTemplatesPath: string;
  private readonly customTemplatesPath: string;

  constructor(options: TemplateStorageOptions = {}) {
    this.basePath = options.basePath || DEFAULT_BASE_PATH;
    const templatesDir = path.join(this.basePath, DEFAULT_TEMPLATES_DIR);

    this.systemTemplatesPath =
      options.systemTemplatesPath ||
      path.join(templatesDir, SYSTEM_TEMPLATES_DIR);
    this.customTemplatesPath =
      options.customTemplatesPath ||
      path.join(templatesDir, CUSTOM_TEMPLATES_DIR);

    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    [this.basePath, this.systemTemplatesPath, this.customTemplatesPath].forEach(
      (dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      },
    );
  }

  /**
   * Get template file path
   */
  private getTemplatePath(id: string, type: 'system' | 'custom'): string {
    const dir =
      type === 'system' ? this.systemTemplatesPath : this.customTemplatesPath;
    return path.join(dir, `${id}.json`);
  }

  /**
   * Create a new template
   */
  async create(templateInput: TemplateInput): Promise<Template> {
    const id = uuidv4();
    const template: Template = {
      id,
      ...templateInput,
    };

    // Only custom templates can be created
    if (template.type !== 'custom') {
      throw new Error('Only custom templates can be created');
    }

    const filePath = this.getTemplatePath(id, 'custom');

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      throw new Error(`Template with ID ${id} already exists`);
    }

    // Write template to file
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(template, null, 2),
      'utf-8',
    );

    return template;
  }

  /**
   * Read a template by ID
   */
  async read(id: string): Promise<Template | null> {
    // Try custom templates first (from file system)
    const filePath = this.getTemplatePath(id, 'custom');
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as Template;
    }

    // Try system templates (from memory/code)
    const systemTemplates = this.getDefaultSystemTemplates();
    const systemTemplate = systemTemplates.find((t) => t.id === id);
    if (systemTemplate) {
      return systemTemplate;
    }

    return null;
  }

  /**
   * Update a template
   */
  async update(id: string, updates: Partial<Template>): Promise<Template> {
    const existing = await this.read(id);
    if (!existing) {
      throw new Error(`Template with ID ${id} not found`);
    }

    // Cannot update system templates
    if (existing.type === 'system') {
      throw new Error('System templates cannot be updated');
    }

    // Merge updates
    const updated: Template = {
      ...existing,
      ...updates,
      id, // Preserve ID
      type: 'custom', // Preserve type
      metadata: {
        ...existing.metadata,
        ...(updates.metadata || {}),
        updatedAt: new Date().toISOString(),
      },
    };

    const filePath = this.getTemplatePath(id, 'custom');
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(updated, null, 2),
      'utf-8',
    );

    return updated;
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.read(id);
    if (!existing) {
      return false;
    }

    // Cannot delete system templates
    if (existing.type === 'system') {
      throw new Error('System templates cannot be deleted');
    }

    const filePath = this.getTemplatePath(id, 'custom');
    await fs.promises.unlink(filePath);
    return true;
  }

  /**
   * List templates with optional filtering
   */
  async list(filter?: TemplateFilter): Promise<Template[]> {
    const templates: Template[] = [];

    // Load custom templates from file system
    if (!filter?.type || filter.type === 'custom') {
      const customTemplates = await this.loadTemplatesFromDirectory(
        this.customTemplatesPath,
      );
      templates.push(...customTemplates);
    }

    // Load system templates from memory (code)
    if (!filter?.type || filter.type === 'system') {
      const systemTemplates = this.getDefaultSystemTemplates();
      templates.push(...systemTemplates);
    }

    // Apply filters
    return this.applyFilters(templates, filter);
  }

  /**
   * Load templates from a directory
   */
  private async loadTemplatesFromDirectory(
    dirPath: string,
  ): Promise<Template[]> {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const files = await fs.promises.readdir(dirPath);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    const templates = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content) as Template;
      }),
    );

    return templates;
  }

  /**
   * Apply filters to template list
   */
  private applyFilters(
    templates: Template[],
    filter?: TemplateFilter,
  ): Template[] {
    if (!filter) {
      return templates;
    }

    let filtered = templates;

    // Filter by category
    if (filter.category) {
      filtered = filtered.filter(
        (t) => t.metadata.category === filter.category,
      );
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter((t) =>
        filter.tags!.some((tag) => t.metadata.tags?.includes(tag)),
      );
    }

    // Filter by search term (name or description)
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term),
      );
    }

    return filtered;
  }

  /**
   * Get system templates
   */
  async getSystemTemplates(): Promise<Template[]> {
    return this.list({ type: 'system' });
  }

  /**
   * Get all templates grouped by type
   */
  async getAllTemplates(): Promise<TemplateCollection> {
    const [system, custom] = await Promise.all([
      this.list({ type: 'system' }),
      this.list({ type: 'custom' }),
    ]);

    return { system, custom };
  }

  /**
   * Import a template from JSON string
   */
  async importTemplate(json: string): Promise<Template> {
    let templateData: Partial<Template>;

    try {
      templateData = JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }

    // Validate required fields
    if (
      !templateData.name ||
      !templateData.description ||
      !templateData.config
    ) {
      throw new Error('Invalid template format: missing required fields');
    }

    // Create template input
    const templateInput: TemplateInput = {
      name: templateData.name,
      description: templateData.description,
      type: 'custom',
      metadata: {
        version: templateData.metadata?.version || '1.0.0',
        ...(templateData.metadata?.author && {
          author: templateData.metadata.author,
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(templateData.metadata?.tags && {
          tags: templateData.metadata.tags,
        }),
        ...(templateData.metadata?.category && {
          category: templateData.metadata.category,
        }),
      },
      config: templateData.config,
    };

    return this.create(templateInput);
  }

  /**
   * Export a template to JSON string
   */
  async exportTemplate(id: string): Promise<string> {
    const template = await this.read(id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Check if a template exists
   */
  async exists(id: string): Promise<boolean> {
    const template = await this.read(id);
    return template !== null;
  }

  /**
   * Get template count
   */
  async count(filter?: TemplateFilter): Promise<number> {
    const templates = await this.list(filter);
    return templates.length;
  }

  /**
   * Initialize system templates
   * @deprecated System templates are now loaded from memory, not files
   * This method is kept for backward compatibility but does nothing
   */
  async initializeSystemTemplates(): Promise<void> {
    // System templates are now loaded directly from getDefaultSystemTemplates()
    // No need to create files on disk
    return;
  }

  /**
   * Get default system templates configuration
   */
  private getDefaultSystemTemplates(): Template[] {
    const now = new Date().toISOString();

    return [
      // 1. Quick & Simple
      {
        id: 'system-quick-simple',
        name: 'presets.quickSimple.name',
        description: 'presets.quickSimple.description',
        type: 'system',
        metadata: {
          version: '1.0.0',
          author: 'MD2PDF',
          createdAt: now,
          updatedAt: now,
          category: 'quick',
          tags: ['quick', 'simple', 'draft'],
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
            header: {
              enabled: false,
            },
            footer: {
              enabled: false,
            },
          },
          styles: {
            theme: 'clean',
            fonts: {
              body: 'Inter',
              heading: 'Inter',
              code: 'Monaco',
            },
            colors: {},
            codeBlock: {
              theme: 'coy',
              // Note: Line numbers are auto-enabled for all code blocks with language
              // (except 'text'/'plaintext' or no language)
            },
          },
          features: {
            toc: false,
            tocDepth: 2,
            pageNumbers: false,
            anchorLinks: false,
            anchorDepth: 2,
          },
        },
      },

      // 2. Technical Documentation
      {
        id: 'system-technical',
        name: 'presets.technical.name',
        description: 'presets.technical.description',
        type: 'system',
        metadata: {
          version: '1.0.0',
          author: 'MD2PDF',
          createdAt: now,
          updatedAt: now,
          category: 'technical',
          tags: ['technical', 'documentation', 'code'],
        },
        config: {
          pdf: {
            format: 'A4',
            orientation: 'portrait',
            margin: {
              top: '2cm',
              right: '1.5cm',
              bottom: '2cm',
              left: '1.5cm',
            },
            displayHeaderFooter: true,
          },
          headerFooter: {
            header: {
              enabled: true,
              content: '{{title}}',
              height: '1.5cm',
            },
            footer: {
              enabled: true,
              content: 'Page {{pageNumber}} of {{totalPages}}',
              height: '1.5cm',
            },
          },
          styles: {
            theme: 'technical',
            fonts: {
              body: 'Inter',
              heading: 'Inter',
              code: 'JetBrains Mono',
            },
            colors: {},
            codeBlock: {
              theme: 'github',
              // Note: Line numbers are auto-enabled for all code blocks with language
              // (except 'text'/'plaintext' or no language)
            },
          },
          features: {
            toc: true,
            tocDepth: 3,
            pageNumbers: true,
            anchorLinks: true,
            anchorDepth: 3,
          },
        },
      },

      // 3. Business Report
      {
        id: 'system-business',
        name: 'presets.business.name',
        description: 'presets.business.description',
        type: 'system',
        metadata: {
          version: '1.0.0',
          author: 'MD2PDF',
          createdAt: now,
          updatedAt: now,
          category: 'professional',
          tags: ['business', 'report', 'professional'],
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
            displayHeaderFooter: true,
          },
          headerFooter: {
            header: {
              enabled: true,
              content: '{{title}}',
              height: '1.5cm',
            },
            footer: {
              enabled: true,
              content: 'Page {{pageNumber}} of {{totalPages}}',
              height: '1.5cm',
            },
          },
          styles: {
            theme: 'professional',
            fonts: {
              body: 'Times New Roman',
              heading: 'Times New Roman',
              code: 'Monaco',
            },
            colors: {},
            codeBlock: {
              theme: 'github',
              // Note: Line numbers are auto-enabled for all code blocks with language
              // (except 'text'/'plaintext' or no language)
            },
          },
          features: {
            toc: true,
            tocDepth: 3,
            pageNumbers: true,
            anchorLinks: true,
            anchorDepth: 3,
          },
        },
      },

      // 4. Academic Paper
      {
        id: 'system-academic',
        name: 'presets.academic.name',
        description: 'presets.academic.description',
        type: 'system',
        metadata: {
          version: '1.0.0',
          author: 'MD2PDF',
          createdAt: now,
          updatedAt: now,
          category: 'academic',
          tags: ['academic', 'paper', 'research'],
        },
        config: {
          pdf: {
            format: 'A4',
            orientation: 'portrait',
            margin: {
              top: '2.25cm',
              right: '2.25cm',
              bottom: '2.25cm',
              left: '2.25cm',
            },
            displayHeaderFooter: true,
          },
          headerFooter: {
            header: {
              enabled: false,
            },
            footer: {
              enabled: true,
              content: '{{pageNumber}}',
              height: '1.5cm',
            },
          },
          styles: {
            theme: 'academic',
            fonts: {
              body: 'Times New Roman',
              heading: 'Times New Roman',
              code: 'Courier New',
            },
            colors: {},
            codeBlock: {
              theme: 'github',
              // Note: Line numbers are auto-enabled for all code blocks with language
              // (except 'text'/'plaintext' or no language)
            },
          },
          features: {
            toc: true,
            tocDepth: 3,
            pageNumbers: true,
            anchorLinks: false,
            anchorDepth: 2,
          },
        },
      },
    ];
  }
}
