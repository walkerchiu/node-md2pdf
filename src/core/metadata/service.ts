/**
 * Metadata service for managing document metadata throughout the conversion pipeline
 */

import { MetadataExtractor } from './extractor';

import type {
  DocumentMetadata,
  MetadataConfig,
  MetadataExtractionContext,
  MetadataExtractionResult,
} from './types';
import type { ILogger } from '../../infrastructure/logging/types';

export class MetadataService {
  private extractor: MetadataExtractor;

  constructor(private readonly logger: ILogger) {
    this.extractor = new MetadataExtractor(logger);
  }

  /**
   * Extract metadata from markdown content and context
   */
  async extractMetadata(
    context: MetadataExtractionContext,
  ): Promise<MetadataExtractionResult> {
    this.logger.debug('Starting metadata extraction', {
      filePath: context.filePath,
      hasFrontmatter: !!context.frontmatter,
    });

    return await this.extractor.extractMetadata(context);
  }

  /**
   * Extract metadata with simple parameters (convenience method)
   */
  async extractMetadataSimple(
    markdownContent: string,
    filePath?: string,
    config?: Partial<MetadataConfig>,
  ): Promise<MetadataExtractionResult> {
    const context = MetadataExtractor.createContext(
      markdownContent,
      filePath,
      config,
    );
    return await this.extractMetadata(context);
  }

  /**
   * Convert metadata to PDF info object format
   * Compatible with Puppeteer and other PDF generators
   */
  toPdfInfo(metadata: DocumentMetadata): Record<string, string> {
    const pdfInfo: Record<string, string> = {};

    // Standard PDF fields
    if (metadata.title) pdfInfo.Title = metadata.title;
    if (metadata.author) pdfInfo.Author = metadata.author;
    if (metadata.subject) pdfInfo.Subject = metadata.subject;
    if (metadata.keywords) pdfInfo.Keywords = metadata.keywords;
    if (metadata.creator) pdfInfo.Creator = metadata.creator;
    if (metadata.producer) pdfInfo.Producer = metadata.producer;

    // Handle dates
    if (metadata.creationDate) {
      pdfInfo.CreationDate = metadata.creationDate.toISOString();
    }
    if (metadata.modDate) {
      pdfInfo.ModDate = metadata.modDate.toISOString();
    }

    return pdfInfo;
  }

  /**
   * Convert metadata to HTML meta tags
   * Useful for including metadata in the HTML before PDF conversion
   */
  toHtmlMetaTags(metadata: DocumentMetadata): string {
    const tags: string[] = [];

    // Standard meta tags
    if (metadata.title) {
      tags.push(`<title>${this.escapeHtml(metadata.title)}</title>`);
    }
    if (metadata.author) {
      tags.push(
        `<meta name="author" content="${this.escapeHtml(metadata.author)}">`,
      );
    }
    if (metadata.subject) {
      tags.push(
        `<meta name="description" content="${this.escapeHtml(metadata.subject)}">`,
      );
    }
    if (metadata.keywords) {
      tags.push(
        `<meta name="keywords" content="${this.escapeHtml(metadata.keywords)}">`,
      );
    }
    if (metadata.language) {
      tags.push(
        `<meta name="language" content="${this.escapeHtml(metadata.language)}">`,
      );
    }

    // Extended meta tags
    if (metadata.organization) {
      tags.push(
        `<meta name="organization" content="${this.escapeHtml(metadata.organization)}">`,
      );
    }
    if (metadata.copyright) {
      tags.push(
        `<meta name="copyright" content="${this.escapeHtml(metadata.copyright)}">`,
      );
    }
    if (metadata.version) {
      tags.push(
        `<meta name="version" content="${this.escapeHtml(metadata.version)}">`,
      );
    }

    // Dublin Core tags
    if (metadata.title) {
      tags.push(
        `<meta name="DC.title" content="${this.escapeHtml(metadata.title)}">`,
      );
    }
    if (metadata.author) {
      tags.push(
        `<meta name="DC.creator" content="${this.escapeHtml(metadata.author)}">`,
      );
    }
    if (metadata.subject) {
      tags.push(
        `<meta name="DC.description" content="${this.escapeHtml(metadata.subject)}">`,
      );
    }
    if (metadata.language) {
      tags.push(
        `<meta name="DC.language" content="${this.escapeHtml(metadata.language)}">`,
      );
    }

    return tags.join('\\n');
  }

  /**
   * Generate summary of metadata for logging/debugging
   */
  generateSummary(metadata: DocumentMetadata): string {
    const parts: string[] = [];

    if (metadata.title) parts.push(`Title: "${metadata.title}"`);
    if (metadata.author) parts.push(`Author: "${metadata.author}"`);
    if (metadata.organization)
      parts.push(`Organization: "${metadata.organization}"`);
    if (metadata.version) parts.push(`Version: "${metadata.version}"`);

    // Statistics
    if (metadata.wordCount) parts.push(`Words: ${metadata.wordCount}`);
    if (metadata.pageCount) parts.push(`Pages: ~${metadata.pageCount}`);

    // Features
    const features: string[] = [];
    if (metadata.hasImages) features.push('images');
    if (metadata.hasTables) features.push('tables');
    if (metadata.hasCodeBlocks) features.push('code');
    if (metadata.hasDiagrams) features.push('diagrams');
    if (features.length > 0) parts.push(`Features: ${features.join(', ')}`);

    return parts.join(', ');
  }

  /**
   * Merge two metadata objects, with the second taking precedence
   */
  mergeMetadata(
    base: DocumentMetadata,
    override: Partial<DocumentMetadata>,
  ): DocumentMetadata {
    return {
      ...base,
      ...override,
      // Handle nested objects
      custom: {
        ...base.custom,
        ...override.custom,
      },
    };
  }

  /**
   * Filter metadata based on confidence/completeness
   */
  filterMetadata(
    metadata: DocumentMetadata,
    options: {
      requireTitle?: boolean;
      requireAuthor?: boolean;
      includeComputed?: boolean;
      includeExtended?: boolean;
    } = {},
  ): Partial<DocumentMetadata> {
    const filtered: Partial<DocumentMetadata> = {};

    // Standard fields
    if (!options.requireTitle || metadata.title) {
      if (metadata.title) filtered.title = metadata.title;
    }
    if (!options.requireAuthor || metadata.author) {
      if (metadata.author) filtered.author = metadata.author;
    }

    // Always include these standard fields if present
    if (metadata.subject) filtered.subject = metadata.subject;
    if (metadata.keywords) filtered.keywords = metadata.keywords;
    if (metadata.creator) filtered.creator = metadata.creator;
    if (metadata.producer) filtered.producer = metadata.producer;
    if (metadata.creationDate) filtered.creationDate = metadata.creationDate;
    if (metadata.modDate) filtered.modDate = metadata.modDate;

    // Extended fields (optional)
    if (options.includeExtended !== false) {
      if (metadata.organization) filtered.organization = metadata.organization;
      if (metadata.department) filtered.department = metadata.department;
      if (metadata.team) filtered.team = metadata.team;
      if (metadata.category) filtered.category = metadata.category;
      if (metadata.version) filtered.version = metadata.version;
      if (metadata.language) filtered.language = metadata.language;
      if (metadata.copyright) filtered.copyright = metadata.copyright;
      if (metadata.license) filtered.license = metadata.license;
      if (metadata.confidentiality)
        filtered.confidentiality = metadata.confidentiality;
      if (metadata.email) filtered.email = metadata.email;
      if (metadata.website) filtered.website = metadata.website;
      if (metadata.format) filtered.format = metadata.format;
      if (metadata.generator) filtered.generator = metadata.generator;
      if (metadata.custom) filtered.custom = metadata.custom;
    }

    // Computed fields (optional)
    if (options.includeComputed !== false) {
      if (metadata.wordCount) filtered.wordCount = metadata.wordCount;
      if (metadata.pageCount) filtered.pageCount = metadata.pageCount;
      if (metadata.tocDepth) filtered.tocDepth = metadata.tocDepth;
      if (metadata.hasImages !== undefined)
        filtered.hasImages = metadata.hasImages;
      if (metadata.hasTables !== undefined)
        filtered.hasTables = metadata.hasTables;
      if (metadata.hasCodeBlocks !== undefined)
        filtered.hasCodeBlocks = metadata.hasCodeBlocks;
      if (metadata.hasDiagrams !== undefined)
        filtered.hasDiagrams = metadata.hasDiagrams;
    }

    return filtered;
  }

  /**
   * Escape HTML entities in strings
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get the document language from metadata with fallback to UI language
   * @param metadata Document metadata
   * @param uiLanguage UI language as fallback
   * @returns Language code
   */
  getDocumentLanguage(metadata?: DocumentMetadata, uiLanguage = 'en'): string {
    return metadata?.language || uiLanguage;
  }
}
