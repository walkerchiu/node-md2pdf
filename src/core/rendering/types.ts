/**
 * Types for two-stage rendering system
 */

import { Heading } from '../../types/index';

export enum DynamicContentType {
  TOC = 'toc',
  IMAGE = 'image',
  DIAGRAM = 'diagram',
  PLANTUML = 'plantuml',
  MERMAID = 'mermaid',
  COMPLEX_LAYOUT = 'complex_layout',
}

export interface ProcessingContext {
  /** Original file path for resolving relative paths */
  filePath?: string;

  /** PDF generation options */
  pdfOptions?: {
    includePageNumbers?: boolean;
    margins?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  };

  /** TOC configuration */
  tocOptions?: {
    enabled?: boolean;
    includePageNumbers?: boolean;
    maxDepth?: number;
  };

  /** PlantUML configuration */
  plantUMLConfig?: {
    serverUrl?: string;
    format?: 'svg' | 'png';
    defaultWidth?: number;
    defaultHeight?: number;
    timeout?: number;
    enableCaching?: boolean;
  };

  /** Mermaid configuration */
  mermaidConfig?: {
    theme?: 'default' | 'forest' | 'dark' | 'neutral' | 'null';
    defaultWidth?: number;
    defaultHeight?: number;
    timeout?: number;
    enableCaching?: boolean;
    backgroundColor?: string;
  };

  /** Syntax highlighting theme */
  syntaxHighlightingTheme?: string;

  /** Headings extracted from content */
  headings?: Heading[];

  /** Whether this is a pre-rendering stage */
  isPreRendering?: boolean;

  /** Logger instance for debug and info messages */
  logger?: any;

  /** Document language for content localization */
  documentLanguage?: string;

  /** Document title for header/footer display */
  documentTitle?: string;

  /** Headers and footers configuration */
  headersFootersConfig?: any; // TODO: import proper type from headers-footers module
}

export interface ProcessedContent {
  /** Processed HTML content */
  html: string;

  /** Metadata about processed content */
  metadata: {
    /** Content type that was processed */
    type: DynamicContentType;

    /** Processing time in milliseconds */
    processingTime: number;

    /** Any warnings or issues during processing */
    warnings: string[];

    /** Cache statistics */
    cacheHits?: number;
    cacheMisses?: number;

    /** Additional type-specific metadata */
    details?: Record<string, any>;
  };
}

export interface ContentDimensions {
  /** Estimated page count */
  pageCount: number;

  /** Height in pixels */
  height: number;

  /** Width in pixels */
  width: number;

  /** Element positions for headings */
  headingPositions?: Array<{
    id: string;
    pageNumber: number;
    offsetTop: number;
  }>;

  /** Element positions for images */
  imagePositions?: Array<{
    src: string;
    pageNumber: number;
    offsetTop: number;
    height: number;
  }>;
}

export interface RealPageNumbers {
  /** Map of heading ID to page number */
  headingPages: Record<string, number>;

  /** Total content page count (excluding TOC) */
  contentPageCount: number;

  /** Detailed position information */
  positions: Array<{
    id: string;
    pageNumber: number;
    offsetTop: number;
    elementType: 'heading' | 'image' | 'diagram';
  }>;
}

export interface TwoStageRenderingOptions {
  /** Enable two-stage rendering */
  enabled: boolean;

  /** Force accurate page numbers even if performance impact is high */
  forceAccuratePageNumbers: boolean;

  /** Maximum acceptable rendering time increase (percentage) */
  maxPerformanceImpact: number;

  /** Enable caching of intermediate results */
  enableCaching: boolean;

  /** Cache directory for storing intermediate results */
  cacheDirectory?: string;
}

export interface RenderingResult {
  /** Final processed HTML content */
  html: string;

  /** Whether two-stage rendering was used */
  usedTwoStageRendering: boolean;

  /** Performance metrics */
  performance: {
    totalTime: number;
    preRenderTime?: number;
    finalRenderTime?: number;
  };

  /** Page number information */
  pageNumbers?: RealPageNumbers;

  /** Processing metadata */
  metadata: {
    processedContentTypes: DynamicContentType[];
    warnings: string[];
    cacheHits: number;
    cacheMisses: number;
  };
}
