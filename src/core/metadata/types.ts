/**
 * Document metadata types and interfaces
 * Supports both standard PDF metadata and custom fields
 */

// Standard PDF metadata fields according to PDF specification
export interface StandardPdfMetadata {
  // Required/Common fields
  title?: string; // Document title
  author?: string; // Document author(s)
  subject?: string; // Document subject/description
  keywords?: string; // Document keywords (comma-separated)

  // System fields (usually auto-generated)
  creator?: string; // Application that created the original document
  producer?: string; // Application that converted/produced the PDF
  creationDate?: Date; // Creation date
  modDate?: Date; // Modification date
}

// Extended metadata fields for enhanced functionality
export interface ExtendedMetadata {
  // Organization information
  organization?: string; // Company/organization name
  department?: string; // Department or division
  team?: string; // Team or group

  // Document classification
  category?: string; // Document category (report, manual, etc.)
  version?: string; // Document version
  language?: string; // Document language (ISO 639-1 code)

  // Legal and licensing
  copyright?: string; // Copyright notice
  license?: string; // License information
  confidentiality?: 'public' | 'internal' | 'confidential' | 'restricted';

  // Contact information
  email?: string; // Contact email
  website?: string; // Related website URL

  // Technical information
  format?: string; // Source format (markdown, etc.)
  generator?: string; // Generator tool version

  // Custom fields
  custom?: Record<string, string | number | boolean | Date>;
}

// Complete document metadata interface
export interface DocumentMetadata
  extends StandardPdfMetadata,
    ExtendedMetadata {
  // Additional computed fields
  wordCount?: number; // Estimated word count
  pageCount?: number; // Estimated page count
  tocDepth?: number; // Table of contents depth
  hasImages?: boolean; // Contains images
  hasTables?: boolean; // Contains tables
  hasCodeBlocks?: boolean; // Contains code blocks
  hasDiagrams?: boolean; // Contains diagrams (Mermaid/PlantUML)
}

// Metadata source types
export type MetadataSource =
  | 'frontmatter'
  | 'config'
  | 'cli'
  | 'auto'
  | 'default';

// Metadata with source information for debugging/tracing
export interface MetadataEntry<T = any> {
  value: T;
  source: MetadataSource;
  priority: number; // Higher number = higher priority when merging
}

// Metadata collection with source tracking
export interface MetadataCollection {
  standard: Partial<Record<keyof StandardPdfMetadata, MetadataEntry>>;
  extended: Partial<Record<keyof ExtendedMetadata, MetadataEntry>>;
  computed: Partial<{
    wordCount: MetadataEntry<number>;
    pageCount: MetadataEntry<number>;
    tocDepth: MetadataEntry<number>;
    hasImages: MetadataEntry<boolean>;
    hasTables: MetadataEntry<boolean>;
    hasCodeBlocks: MetadataEntry<boolean>;
    hasDiagrams: MetadataEntry<boolean>;
  }>;
}

// Configuration for metadata extraction and processing
export interface MetadataConfig {
  // Enable/disable metadata extraction
  enabled: boolean;

  // Auto-detection settings
  autoExtraction: {
    fromFrontmatter: boolean; // Extract from YAML frontmatter
    fromContent: boolean; // Auto-detect from content (title from first H1, etc.)
    fromFilename: boolean; // Extract from filename
    computeStats: boolean; // Compute word count, page estimates, etc.
  };

  // Default values
  defaults: Partial<DocumentMetadata>;

  // Field mapping for frontmatter
  frontmatterMapping: Record<string, string>; // frontmatter field -> metadata field

  // Validation rules
  validation: {
    requireTitle: boolean;
    requireAuthor: boolean;
    maxKeywordLength: number;
    maxSubjectLength: number;
  };
}

// Default metadata configuration
export const DEFAULT_METADATA_CONFIG: MetadataConfig = {
  enabled: true,
  autoExtraction: {
    fromFrontmatter: true,
    fromContent: true,
    fromFilename: false,
    computeStats: true,
  },
  defaults: {
    language: 'en',
    title: 'Document Title',
    author: 'Author Name',
    subject: 'Document Subject',
    keywords: 'keywords, tags, categories',
    creator: 'MD2PDF',
    producer: 'MD2PDF',
    format: 'markdown',
  },
  frontmatterMapping: {
    // Standard mappings
    title: 'title',
    author: 'author',
    authors: 'author',
    description: 'subject',
    subject: 'subject',
    keywords: 'keywords',
    tags: 'keywords',

    // Extended mappings
    organization: 'organization',
    org: 'organization',
    company: 'organization',
    department: 'department',
    dept: 'department',
    team: 'team',
    category: 'category',
    type: 'category',
    version: 'version',
    lang: 'language',
    language: 'language',
    copyright: 'copyright',
    license: 'license',
    confidential: 'confidentiality',
    confidentiality: 'confidentiality',
    email: 'email',
    contact: 'email',
    website: 'website',
    url: 'website',
  },
  validation: {
    requireTitle: false,
    requireAuthor: false,
    maxKeywordLength: 255,
    maxSubjectLength: 512,
  },
};

// Metadata extraction result
export interface MetadataExtractionResult {
  metadata: DocumentMetadata;
  sources: MetadataCollection;
  warnings: string[];
  errors: string[];
}

// Context for metadata extraction
export interface MetadataExtractionContext {
  markdownContent: string;
  filePath?: string;
  frontmatter?: Record<string, any>;
  config: MetadataConfig;
  generateDate?: Date;
}
