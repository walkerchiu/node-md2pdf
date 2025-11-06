/**
 * PDF Bookmarks type definitions
 * Extends TOC types for PDF navigation bookmarks
 */

import { TOCItemFlat, TOCItemNested } from '../toc/types';

/**
 * PDF Bookmark configuration options
 */
export interface BookmarkOptions {
  /** Enable PDF bookmarks generation */
  enabled: boolean;
  /** Maximum depth of bookmarks (1-6) */
  maxDepth?: number;
  /** Whether to include page numbers in bookmarks */
  includePageNumbers?: boolean;
  /** Use TOC data for bookmark generation */
  useExistingTOC?: boolean;
  /** Custom bookmark styling options */
  styling?: {
    /** Font size for bookmark text */
    fontSize?: number;
    /** Text color for bookmarks */
    textColor?: string;
    /** Highlight color for active bookmark */
    highlightColor?: string;
  };
}

/**
 * Individual PDF bookmark item
 */
export interface BookmarkItem {
  /** Bookmark title text */
  title: string;
  /** Heading level (1-6) */
  level: number;
  /** Target page number */
  page: number;
  /** Target anchor/destination ID */
  destination: string;
  /** Unique bookmark ID */
  id: string;
  /** Parent bookmark ID (for hierarchical structure) */
  parentId?: string | undefined;
  /** Child bookmark IDs */
  childIds: string[];
  /** Original TOC item reference */
  tocItem?: TOCItemFlat | TOCItemNested;
}

/**
 * Hierarchical bookmark structure for PDF outline
 */
export interface BookmarkNode {
  /** Bookmark item data */
  item: BookmarkItem;
  /** Child bookmark nodes */
  children: BookmarkNode[];
  /** Parent node reference */
  parent?: BookmarkNode;
  /** Depth level in hierarchy */
  depth: number;
}

/**
 * Complete bookmark generation result
 */
export interface BookmarkGenerationResult {
  /** Flat array of all bookmarks */
  bookmarks: BookmarkItem[];
  /** Hierarchical bookmark tree structure */
  tree: BookmarkNode[];
  /** PDF outline structure for engine integration */
  outline: PDFOutlineItem[];
  /** Generation metadata */
  metadata: {
    totalBookmarks: number;
    maxDepth: number;
    bookmarksByLevel: Record<number, number>;
    generationTime: number;
    sourceType: 'toc' | 'headings' | 'mixed';
  };
}

/**
 * PDF Outline item for engine integration
 * Compatible with Puppeteer and Chrome Headless engines
 */
export interface PDFOutlineItem {
  /** Outline title */
  title: string;
  /** Destination page number or anchor */
  dest?: number | string;
  /** Child outline items */
  children?: PDFOutlineItem[];
  /** Whether this item is expanded by default */
  expanded?: boolean;
  /** Custom styling for this outline item */
  style?: {
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
  };
}

/**
 * Bookmark generation configuration
 */
export interface BookmarkGeneratorConfig {
  /** Source data preference */
  dataSource: {
    /** Prefer TOC data if available */
    preferTOC: boolean;
    /** Fall back to heading analysis */
    allowHeadingFallback: boolean;
    /** Include custom bookmark annotations */
    includeCustomBookmarks: boolean;
  };
  /** Page number integration */
  pageNumbers: {
    /** Enable page number detection */
    enabled: boolean;
    /** Method for page detection */
    detectionMethod: 'toc' | 'dom' | 'pdf-analysis';
    /** Retry attempts for page detection */
    retryAttempts: number;
  };
  /** Bookmark hierarchy options */
  hierarchy: {
    /** Maximum nesting depth */
    maxDepth: number;
    /** Minimum heading level to include */
    minLevel: number;
    /** Auto-expand levels */
    autoExpandLevels: number;
  };
}

/**
 * Bookmark conversion context
 */
export interface BookmarkConversionContext {
  /** Source TOC data */
  tocData?: {
    items: TOCItemFlat[];
    tree: TOCItemNested[];
  };
  /** Document metadata */
  document: {
    filePath: string;
    title?: string;
    totalPages?: number;
  };
  /** Conversion options */
  options: BookmarkOptions;
  /** Processing context */
  processing: {
    startTime: number;
    engineType: string;
    htmlContent: string;
  };
}
