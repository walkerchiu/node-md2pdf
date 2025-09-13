/**
 * TOC generation type definitions
 */

// TOC generation options
export interface TOCGeneratorOptions {
  /** Maximum depth of headings to include in TOC (1-6) */
  maxDepth: number;
  /** Include page numbers in TOC */
  includePageNumbers?: boolean;
  /** Custom CSS classes for styling */
  cssClasses?: {
    container?: string;
    title?: string;
    list?: string;
    item?: string;
    link?: string;
    pageNumber?: string;
  };
}

// TOC generation result
export interface TOCGenerationResult {
  /** Generated HTML content for TOC */
  html: string;
  /** Structured TOC items data */
  items: TOCItemFlat[];
  /** Hierarchical TOC structure */
  tree: TOCItemNested[];
  /** TOC statistics */
  stats: {
    totalItems: number;
    maxDepth: number;
    itemsByLevel: Record<number, number>;
  };
}

// Flat TOC item structure
export interface TOCItemFlat {
  /** Heading text content */
  title: string;
  /** Heading level (1-6) */
  level: number;
  /** Unique anchor ID */
  anchor: string;
  /** Page number (if available) */
  pageNumber?: number;
  /** Index in original heading sequence */
  index: number;
}

// Nested TOC item structure for hierarchical display
export interface TOCItemNested {
  /** Heading text content */
  title: string;
  /** Heading level (1-6) */
  level: number;
  /** Unique anchor ID */
  anchor: string;
  /** Page number (if available) */
  pageNumber?: number;
  /** Child TOC items */
  children: TOCItemNested[];
  /** Parent reference (for traversal) */
  parent?: TOCItemNested;
}
