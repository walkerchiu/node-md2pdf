/**
 * PDF Engine Abstraction Layer Types
 * Provides interfaces for multiple PDF generation engines
 */

export interface PDFEngineOptions {
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
}

export interface PDFGenerationContext {
  htmlContent: string;
  outputPath: string;
  title?: string;
  customCSS?: string;
  enableChineseSupport?: boolean;
  syntaxHighlightingTheme?: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date | string;
    modDate?: Date | string;
    // Extended metadata fields (will be passed as custom properties)
    [key: string]: any;
  };
  toc?: {
    enabled: boolean;
    maxDepth: number;
    includePageNumbers: boolean;
    title?: string;
  };
  bookmarks?: {
    enabled: boolean;
    maxDepth?: number;
    includePageNumbers?: boolean;
    useExistingTOC?: boolean;
    outline?: Array<{
      title: string;
      dest: number | string;
      children?: Array<{
        title: string;
        dest: number | string;
        children?: unknown[];
      }>;
    }>;
  };
  pdfOptions?: {
    includePageNumbers?: boolean;
  };
  passwordProtection?: {
    userPassword?: string;
    ownerPassword?: string;
    permissions?: {
      printing?: boolean;
      modifying?: boolean;
      copying?: boolean;
      annotating?: boolean;
      fillingForms?: boolean;
      contentAccessibility?: boolean;
      documentAssembly?: boolean;
    };
  };
}

export interface PDFEngineResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  metadata?: {
    pages: number;
    fileSize: number;
    generationTime: number;
    engineUsed: string;
  };
}

export interface PDFEngineHealthStatus {
  isHealthy: boolean;
  engineName: string;
  version?: string;
  lastCheck: Date;
  errors: string[];
  performance?: {
    averageGenerationTime: number;
    successRate: number;
    memoryUsage: number;
  };
}

export interface PDFEngineCapabilities {
  supportedFormats: string[];
  maxConcurrentJobs: number;
  supportsCustomCSS: boolean;
  supportsChineseText: boolean;
  supportsTOC: boolean;
  supportsHeaderFooter: boolean;
  supportsBookmarks: boolean;
  supportsOutlineGeneration: boolean;
}

/**
 * Core PDF Engine Interface
 * All PDF engines must implement this interface
 */
export interface IPDFEngine {
  readonly name: string;
  readonly version: string;
  readonly capabilities: PDFEngineCapabilities;

  /**
   * Initialize the PDF engine
   */
  initialize(): Promise<void>;

  /**
   * Generate PDF from HTML content
   */
  generatePDF(
    context: PDFGenerationContext,
    options: PDFEngineOptions,
  ): Promise<PDFEngineResult>;

  /**
   * Check engine health and availability
   */
  healthCheck(): Promise<PDFEngineHealthStatus>;

  /**
   * Get current resource usage
   */
  getResourceUsage(): Promise<{
    memoryUsage: number;
    activeTasks: number;
    averageTaskTime: number;
  }>;

  /**
   * Cleanup and shutdown the engine
   */
  cleanup(): Promise<void>;

  /**
   * Validate if the engine can handle the given context
   */
  canHandle(context: PDFGenerationContext): Promise<boolean>;
}

/**
 * PDF Engine Factory Interface
 */
export interface IPDFEngineFactory {
  /**
   * Create and initialize a PDF engine by name
   */
  createEngine(
    engineName: string,
    options?: Record<string, unknown>,
  ): Promise<IPDFEngine>;

  /**
   * Get all available engine names
   */
  getAvailableEngines(): string[];

  /**
   * Register a new engine type
   */
  registerEngine(
    name: string,
    engineClass: new (...args: unknown[]) => IPDFEngine,
  ): void;
}

/**
 * Engine Selection Strategy Interface
 */
export interface IEngineSelectionStrategy {
  /**
   * Select the best engine for the given context
   */
  selectEngine(
    context: PDFGenerationContext,
    availableEngines: IPDFEngine[],
    healthStatuses: PDFEngineHealthStatus[],
  ): Promise<IPDFEngine | null>;
}

/**
 * PDF Engine Manager Configuration
 */
export interface PDFEngineManagerConfig {
  primaryEngine: string;
  fallbackEngines: string[];
  healthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableMetrics: boolean;
  resourceLimits: {
    maxMemoryUsage: number;
    maxConcurrentTasks: number;
    taskTimeout: number;
  };
}

export type PDFEngineType =
  | 'puppeteer'
  | 'playwright'
  | 'chrome-headless'
  | 'wkhtmltopdf';

export interface PDFEngineMetrics {
  engineName: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageTime: number;
  peakMemoryUsage: number;
  uptime: number;
  lastFailure?: {
    timestamp: Date;
    error: string;
    context: PDFGenerationContext;
  };
}
