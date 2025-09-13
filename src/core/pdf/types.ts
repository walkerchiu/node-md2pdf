export interface PDFGeneratorOptions {
  format?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
  scale?: number;
  preferCSSPageSize?: boolean;
  /** Table of contents configuration */
  toc?: {
    /** Enable TOC generation */
    enabled?: boolean;
    /** Maximum depth of headings (1-6) */
    maxDepth?: number;
    /** Include page numbers in TOC */
    includePageNumbers?: boolean;
    /** Custom TOC title */
    title?: string;
  };
}

export interface PDFGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  metadata?: {
    pages: number;
    fileSize: number;
    generationTime: number;
  };
}

export interface StyleOptions {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: number;
  maxWidth?: string;
  margin?: string;
  padding?: string;
}
