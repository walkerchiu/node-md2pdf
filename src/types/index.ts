/**
 * MD2PDF core type definitions
 */

// TOC return link level type
export type TOCReturnLinkLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Configuration types
export interface ConversionConfig {
  inputPath: string;
  outputPath?: string;
  includeTOC: boolean;
  tocDepth: number;
  tocReturnLinksLevel?: TOCReturnLinkLevel;
  includePageNumbers: boolean;
  theme?: string;
}

// Markdown parsing result
export interface ParsedMarkdown {
  content: string;
  headings: Heading[];
  metadata?: Record<string, unknown>;
}

// Heading structure
export interface Heading {
  level: number;
  text: string;
  id: string;
  anchor: string;
  children?: Heading[];
}

// TOC item
export interface TOCItem {
  title: string;
  level: number;
  pageNumber?: number;
  anchor: string;
  children?: TOCItem[];
}

// PDF generation options
export interface PDFOptions {
  format: 'A4' | 'Letter' | 'Legal';
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter: boolean;
}

// Error types
export enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  PARSE_ERROR = 'PARSE_ERROR',
  PDF_GENERATION_ERROR = 'PDF_GENERATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

// Custom error interface
export interface MD2PDFError extends Error {
  type: ErrorType;
  details?: Record<string, unknown>;
  suggestions?: string[];
}

// CLI interactive options
export interface InteractiveOptions {
  inputFile?: string;
  outputDir?: string;
  tocDepth?: number;
  includePageNumbers?: boolean;
  theme?: string;
}

// Conversion result
export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  error?: MD2PDFError;
  stats?: {
    inputSize: number;
    outputSize: number;
    processingTime: number;
    pageCount: number;
  };
}
