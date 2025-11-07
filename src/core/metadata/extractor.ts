/**
 * Document metadata extraction service
 * Extracts metadata from various sources including frontmatter, content analysis, and configuration
 */

import { basename, extname } from 'path';

import { DEFAULT_METADATA_CONFIG } from './types';

import type {
  DocumentMetadata,
  MetadataConfig,
  MetadataExtractionContext,
  MetadataExtractionResult,
  MetadataCollection,
  MetadataEntry,
  StandardPdfMetadata,
  ExtendedMetadata,
} from './types';
import type { ILogger } from '../../infrastructure/logging/types';

export class MetadataExtractor {
  constructor(private readonly logger: ILogger) {}

  /**
   * Extract complete metadata from context
   */
  async extractMetadata(
    context: MetadataExtractionContext,
  ): Promise<MetadataExtractionResult> {
    const result: MetadataExtractionResult = {
      metadata: {},
      sources: {
        standard: {},
        extended: {},
        computed: {},
      },
      warnings: [],
      errors: [],
    };

    try {
      this.logger.info('Starting metadata extraction', {
        enabled: context.config.enabled,
        sources: {
          frontmatter: context.config.autoExtraction.fromFrontmatter,
          content: context.config.autoExtraction.fromContent,
          filename: context.config.autoExtraction.fromFilename,
          stats: context.config.autoExtraction.computeStats,
        },
        hasFile: !!context.filePath,
        hasFrontmatter: !!context.frontmatter,
      });

      // 1. Extract from configuration defaults (always)
      await this.extractFromDefaults(context, result);
      this.logger.debug('Extracted defaults', {
        fields:
          Object.keys(result.sources.standard).length +
          Object.keys(result.sources.extended).length,
      });

      // Only proceed with auto-extraction if metadata extraction is enabled
      if (context.config.enabled) {
        // 2. Extract from frontmatter
        if (
          context.config.autoExtraction.fromFrontmatter &&
          context.frontmatter
        ) {
          const beforeCount =
            Object.keys(result.sources.standard).length +
            Object.keys(result.sources.extended).length;
          await this.extractFromFrontmatter(context, result);
          const afterCount =
            Object.keys(result.sources.standard).length +
            Object.keys(result.sources.extended).length;
          this.logger.info('Extracted from frontmatter', {
            fieldsAdded: afterCount - beforeCount,
            totalFields: afterCount,
          });
        } else if (context.frontmatter) {
          this.logger.debug('Frontmatter extraction disabled', {
            hasData: true,
          });
        }

        // 3. Extract from content analysis
        if (context.config.autoExtraction.fromContent) {
          const beforeCount =
            Object.keys(result.sources.standard).length +
            Object.keys(result.sources.extended).length;
          await this.extractFromContent(context, result);
          const afterCount =
            Object.keys(result.sources.standard).length +
            Object.keys(result.sources.extended).length;
          this.logger.info('Extracted from content', {
            fieldsAdded: afterCount - beforeCount,
            totalFields: afterCount,
          });
        }

        // 4. Extract from filename
        if (context.config.autoExtraction.fromFilename && context.filePath) {
          const beforeCount = Object.keys(result.sources.extended).length;
          await this.extractFromFilename(context, result);
          const afterCount = Object.keys(result.sources.extended).length;
          this.logger.info('Extracted from filename', {
            fieldsAdded: afterCount - beforeCount,
            filename: context.filePath,
          });
        }

        // 5. Compute statistics
        if (context.config.autoExtraction.computeStats) {
          const beforeCount = Object.keys(result.sources.computed).length;
          await this.computeStatistics(context, result);
          const afterCount = Object.keys(result.sources.computed).length;
          this.logger.info('Computed document statistics', {
            statsGenerated: afterCount - beforeCount,
            totalStats: afterCount,
          });
        }
      } else {
        this.logger.info(
          'Metadata auto-extraction disabled, using defaults only',
        );
      }

      // 6. Merge all sources into final metadata
      result.metadata = this.mergeMetadataSources(result.sources);

      // 7. Validate metadata
      this.validateMetadata(result.metadata, context.config, result);

      this.logger.debug(
        `Extracted metadata with ${Object.keys(result.metadata).length} fields`,
      );
    } catch (error) {
      result.errors.push(
        `Metadata extraction failed: ${(error as Error).message}`,
      );
      this.logger.error('Metadata extraction error', { error });
    }

    return result;
  }

  /**
   * Extract metadata from configuration defaults
   */
  private async extractFromDefaults(
    context: MetadataExtractionContext,
    result: MetadataExtractionResult,
  ): Promise<void> {
    const defaults = context.config.defaults || {};

    for (const [key, value] of Object.entries(defaults)) {
      if (value !== undefined) {
        // Skip placeholder values unless they're custom values
        if (key === 'title' && value === 'Document Title') {
          continue;
        }
        if (key === 'author' && value === 'Author Name') {
          continue;
        }

        const entry: MetadataEntry = {
          value,
          source: 'default',
          priority: 1,
        };

        if (this.isStandardField(key)) {
          result.sources.standard[key as keyof StandardPdfMetadata] = entry;
        } else if (this.isExtendedField(key)) {
          result.sources.extended[key as keyof ExtendedMetadata] = entry;
        }
      }
    }

    // Add system defaults
    const now = context.generateDate || new Date();
    result.sources.standard.creationDate = {
      value: now,
      source: 'default',
      priority: 1,
    };
    result.sources.standard.modDate = {
      value: now,
      source: 'default',
      priority: 1,
    };
  }

  /**
   * Extract metadata from YAML frontmatter
   */
  private async extractFromFrontmatter(
    context: MetadataExtractionContext,
    result: MetadataExtractionResult,
  ): Promise<void> {
    if (!context.frontmatter) return;

    const mapping = context.config.frontmatterMapping || {};

    for (const [frontmatterKey, metadataKey] of Object.entries(mapping)) {
      const frontmatterValue = context.frontmatter[frontmatterKey];
      if (frontmatterValue !== undefined) {
        let processedValue = frontmatterValue;

        // Handle array fields (like tags/keywords)
        if (Array.isArray(frontmatterValue)) {
          if (metadataKey === 'keywords' || metadataKey === 'tags') {
            processedValue = frontmatterValue.join(', ');
          } else if (metadataKey === 'author' || metadataKey === 'authors') {
            processedValue = Array.isArray(frontmatterValue)
              ? frontmatterValue.join(', ')
              : frontmatterValue;
          }
        }

        // Handle date fields
        if (
          frontmatterValue instanceof Date ||
          typeof frontmatterValue === 'string'
        ) {
          if (metadataKey.includes('date') || metadataKey.includes('Date')) {
            processedValue = new Date(frontmatterValue);
          }
        }

        const entry: MetadataEntry = {
          value: processedValue,
          source: 'frontmatter',
          priority: 3,
        };

        if (this.isStandardField(metadataKey)) {
          result.sources.standard[metadataKey as keyof StandardPdfMetadata] =
            entry;
        } else if (this.isExtendedField(metadataKey)) {
          result.sources.extended[metadataKey as keyof ExtendedMetadata] =
            entry;
        }
      }
    }

    // Handle unmapped frontmatter fields
    for (const [key, value] of Object.entries(context.frontmatter)) {
      if (!mapping[key] && value !== undefined) {
        // Try direct mapping for common fields
        if (this.isStandardField(key) || this.isExtendedField(key)) {
          const entry: MetadataEntry = {
            value,
            source: 'frontmatter',
            priority: 3,
          };

          if (this.isStandardField(key)) {
            result.sources.standard[key as keyof StandardPdfMetadata] = entry;
          } else if (this.isExtendedField(key)) {
            result.sources.extended[key as keyof ExtendedMetadata] = entry;
          }
        }
      }
    }
  }

  /**
   * Extract metadata from content analysis
   */
  private async extractFromContent(
    context: MetadataExtractionContext,
    result: MetadataExtractionResult,
  ): Promise<void> {
    const content = context.markdownContent;

    // Check if config has a custom title (not the default placeholder)
    const configTitle = context.config.defaults?.title;
    const isDefaultTitle =
      configTitle === 'Document Title' ||
      !configTitle ||
      configTitle.trim() === '';

    // Only auto-extract title if config title is default/empty
    if (isDefaultTitle) {
      // Extract title from first H1 heading
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match) {
        const title = h1Match[1].trim();
        if (
          !result.sources.standard.title ||
          result.sources.standard.title.priority < 2
        ) {
          result.sources.standard.title = {
            value: title,
            source: 'auto',
            priority: 2,
          };
        }
      }

      // Extract title from filename as fallback
      if (context.filePath && !result.sources.standard.title) {
        const filename = basename(context.filePath, extname(context.filePath));
        let title = filename
          .replace(/[._-]v?\d+\.\d+(?:\.\d+)?/gi, '') // Remove version
          .replace(/\d{4}-\d{2}-\d{2}[._-]?/g, '') // Remove date
          .replace(/[._-]/g, ' ') // Replace separators with spaces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        // Capitalize words
        title = title
          .split(' ')
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(' ');

        if (title && title.length > 0) {
          result.sources.standard.title = {
            value: title,
            source: 'auto',
            priority: 1,
          };
        }
      }
    }
  }

  /**
   * Extract metadata from filename
   */
  private async extractFromFilename(
    context: MetadataExtractionContext,
    result: MetadataExtractionResult,
  ): Promise<void> {
    if (!context.filePath) return;

    const filename = basename(context.filePath, extname(context.filePath));

    // Extract version from filename (e.g., document_v1.2.3.md)
    const versionMatch = filename.match(/[._-]v?(\d+\.\d+(?:\.\d+)?)/i);
    if (versionMatch) {
      result.sources.extended.version = {
        value: versionMatch[1],
        source: 'auto',
        priority: 1,
      };
    }

    // Extract date from filename (e.g., 2024-01-15_document.md)
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const date = new Date(dateMatch[1]);
      if (
        !result.sources.standard.creationDate ||
        result.sources.standard.creationDate.priority < 2
      ) {
        result.sources.standard.creationDate = {
          value: date,
          source: 'auto',
          priority: 2,
        };
      }
    }
  }

  /**
   * Compute document statistics
   */
  private async computeStatistics(
    context: MetadataExtractionContext,
    result: MetadataExtractionResult,
  ): Promise<void> {
    const content = context.markdownContent;

    // Word count (rough estimate)
    const wordCount = content
      .replace(/[#*`_~\[\]()]/g, '') // Remove markdown syntax
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    result.sources.computed.wordCount = {
      value: wordCount,
      source: 'auto',
      priority: 1,
    };

    // Page count estimate (rough: ~250 words per page)
    const pageCount = Math.max(1, Math.ceil(wordCount / 250));
    result.sources.computed.pageCount = {
      value: pageCount,
      source: 'auto',
      priority: 1,
    };

    // TOC depth (max heading level)
    const headings = content.match(/^#+\s/gm) || [];
    const maxLevel = headings.reduce((max, heading) => {
      const level = heading.match(/^#+/)?.[0]?.length || 0;
      return Math.max(max, level);
    }, 0);

    result.sources.computed.tocDepth = {
      value: maxLevel,
      source: 'auto',
      priority: 1,
    };

    // Feature detection
    result.sources.computed.hasImages = {
      value: /!\[.*?\]\(.*?\)/.test(content),
      source: 'auto',
      priority: 1,
    };

    result.sources.computed.hasTables = {
      value: /\|.*\|/.test(content),
      source: 'auto',
      priority: 1,
    };

    result.sources.computed.hasCodeBlocks = {
      value: /```/.test(content),
      source: 'auto',
      priority: 1,
    };

    result.sources.computed.hasDiagrams = {
      value: /```(?:mermaid|plantuml)/.test(content),
      source: 'auto',
      priority: 1,
    };
  }

  /**
   * Merge metadata from all sources based on priority
   */
  private mergeMetadataSources(sources: MetadataCollection): DocumentMetadata {
    const merged: DocumentMetadata = {};

    // Collect all entries with their priority
    const allEntries = new Map<string, MetadataEntry>();

    // Add standard fields
    for (const [key, entry] of Object.entries(sources.standard)) {
      if (entry) {
        const existing = allEntries.get(key);
        if (!existing || entry.priority > existing.priority) {
          allEntries.set(key, entry);
        }
      }
    }

    // Add extended fields
    for (const [key, entry] of Object.entries(sources.extended)) {
      if (entry) {
        const existing = allEntries.get(key);
        if (!existing || entry.priority > existing.priority) {
          allEntries.set(key, entry);
        }
      }
    }

    // Add computed fields
    for (const [key, entry] of Object.entries(sources.computed)) {
      if (entry) {
        const existing = allEntries.get(key);
        if (!existing || entry.priority > existing.priority) {
          allEntries.set(key, entry);
        }
      }
    }

    // Build final metadata with highest priority values
    for (const [key, entry] of allEntries) {
      let value = entry.value;

      // Fix keywords formatting - remove extra quotes
      if (key === 'keywords' && typeof value === 'string') {
        value = value.replace(/^["']|["']$/g, ''); // Remove leading/trailing quotes
      }

      (merged as any)[key] = value;
    }

    return merged;
  }

  /**
   * Validate metadata according to configuration rules
   */
  private validateMetadata(
    metadata: DocumentMetadata,
    config: MetadataConfig,
    result: MetadataExtractionResult,
  ): void {
    const validation = config.validation;

    if (validation.requireTitle && !metadata.title) {
      result.warnings.push('Title is required but not provided');
    }

    if (validation.requireAuthor && !metadata.author) {
      result.warnings.push('Author is required but not provided');
    }

    if (
      metadata.keywords &&
      metadata.keywords.length > validation.maxKeywordLength
    ) {
      result.warnings.push(
        `Keywords exceed maximum length (${validation.maxKeywordLength})`,
      );
    }

    if (
      metadata.subject &&
      metadata.subject.length > validation.maxSubjectLength
    ) {
      result.warnings.push(
        `Subject exceeds maximum length (${validation.maxSubjectLength})`,
      );
    }
  }

  /**
   * Check if field is a standard PDF metadata field
   */
  private isStandardField(key: string): key is keyof StandardPdfMetadata {
    return [
      'title',
      'author',
      'subject',
      'keywords',
      'creator',
      'producer',
      'creationDate',
      'modDate',
    ].includes(key);
  }

  /**
   * Check if field is an extended metadata field
   */
  private isExtendedField(key: string): key is keyof ExtendedMetadata {
    return [
      'organization',
      'department',
      'team',
      'category',
      'version',
      'language',
      'copyright',
      'license',
      'confidentiality',
      'email',
      'website',
      'format',
      'generator',
      'custom',
    ].includes(key);
  }

  /**
   * Create a simple extraction context for basic usage
   */
  static createContext(
    markdownContent: string,
    filePath?: string,
    config?: Partial<MetadataConfig>,
  ): MetadataExtractionContext {
    // Simple frontmatter extraction
    let frontmatter: Record<string, any> | undefined;
    const frontmatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---/);

    if (frontmatterMatch) {
      try {
        // Simple YAML parsing (for complex YAML, consider using a proper parser)
        const yamlContent = frontmatterMatch[1];
        frontmatter = {};

        const lines = yamlContent.split('\n');
        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, key, value] = match;
            // Simple value parsing
            if (value.startsWith('[') && value.endsWith(']')) {
              // Array
              frontmatter[key] = value
                .slice(1, -1)
                .split(',')
                .map((item) => item.trim().replace(/^['"]|['"]$/g, ''));
            } else if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
              // Date
              frontmatter[key] = new Date(value);
            } else if (value === 'true' || value === 'false') {
              // Boolean
              frontmatter[key] = value === 'true';
            } else if (!isNaN(Number(value))) {
              // Number
              frontmatter[key] = Number(value);
            } else {
              // String (remove quotes)
              frontmatter[key] = value.replace(/^['"]|['"]$/g, '');
            }
          }
        }
      } catch (error) {
        // Ignore parsing errors for now
      }
    }

    return {
      markdownContent,
      ...(filePath && { filePath }),
      ...(frontmatter && { frontmatter }),
      config: { ...DEFAULT_METADATA_CONFIG, ...config },
      generateDate: new Date(),
    };
  }
}
