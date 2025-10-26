/**
 * Interfaces for dynamic content processing system
 */

import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
  ContentDimensions,
} from './types';

/**
 * Interface for dynamic content processors
 */
export interface IDynamicContentProcessor {
  /** Unique identifier for this processor type */
  readonly type: DynamicContentType;

  /** Human-readable name for this processor */
  readonly name: string;

  /**
   * Detect if this processor can handle the given content
   * @param content Raw content to analyze
   * @param context Processing context
   * @returns Promise resolving to detection confidence (0-1)
   */
  detect(content: string, context: ProcessingContext): Promise<number>;

  /**
   * Process the content using this processor
   * @param content Raw content to process
   * @param context Processing context
   * @returns Promise resolving to processed content
   */
  process(
    content: string,
    context: ProcessingContext,
  ): Promise<ProcessedContent>;

  /**
   * Get dimensions of processed content (requires actual rendering)
   * @param processedContent Previously processed content
   * @param context Processing context
   * @returns Promise resolving to content dimensions
   */
  getDimensions(
    processedContent: ProcessedContent,
    context: ProcessingContext,
  ): Promise<ContentDimensions>;

  /**
   * Validate that this processor can handle the current environment
   * @returns Promise resolving to validation result
   */
  validateEnvironment(): Promise<{
    isSupported: boolean;
    issues: string[];
    recommendations: string[];
  }>;

  /**
   * Set cache implementation
   * @param cache Cache implementation
   */
  setCache(cache: IContentCache): void;
}

/**
 * Interface for content caching system
 */
export interface IContentCache {
  /**
   * Get cached processed content
   * @param key Cache key
   * @returns Promise resolving to cached content or null
   */
  get(key: string): Promise<ProcessedContent | null>;

  /**
   * Store processed content in cache
   * @param key Cache key
   * @param content Content to cache
   * @param ttl Time to live in seconds (optional)
   * @returns Promise resolving when storage is complete
   */
  set(key: string, content: ProcessedContent, ttl?: number): Promise<void>;

  /**
   * Check if cache contains the given key
   * @param key Cache key
   * @returns Promise resolving to boolean
   */
  has(key: string): Promise<boolean>;

  /**
   * Remove item from cache
   * @param key Cache key
   * @returns Promise resolving when removal is complete
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cached content
   * @returns Promise resolving when cache is cleared
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   * @returns Promise resolving to cache stats
   */
  getStats(): Promise<{
    totalItems: number;
    totalSize: number;
    hitRate: number;
    oldestItem: Date | null;
  }>;
}

/**
 * Interface for two-stage rendering engine
 */
export interface ITwoStageRenderingEngine {
  /**
   * Process content using appropriate processors
   * @param content Raw markdown content
   * @param context Processing context
   * @returns Promise resolving to rendering result
   */
  render(
    content: string,
    context: ProcessingContext,
  ): Promise<import('./types').RenderingResult>;

  /**
   * Register a new content processor
   * @param processor Processor to register
   */
  registerProcessor(processor: IDynamicContentProcessor): void;

  /**
   * Unregister a content processor
   * @param type Processor type to unregister
   */
  unregisterProcessor(type: DynamicContentType): void;

  /**
   * Get list of registered processors
   * @returns Array of processor types
   */
  getRegisteredProcessors(): DynamicContentType[];

  /**
   * Set cache implementation
   * @param cache Cache implementation
   */
  setCache(cache: IContentCache): void;

  /**
   * Get current cache implementation
   * @returns Current cache or null
   */
  getCache(): IContentCache | null;

  /**
   * Validate that all processors and environment are ready
   * @returns Promise resolving to validation result
   */
  validateEnvironment(): Promise<{
    isReady: boolean;
    processorIssues: Partial<Record<DynamicContentType, string[]>>;
    recommendations: string[];
  }>;
}

/**
 * Interface for page number calculation
 */
export interface IPageNumberCalculator {
  /**
   * Get real page numbers by rendering content
   * @param content HTML content to render
   * @param context Processing context
   * @returns Promise resolving to real page numbers
   */
  getRealPageNumbers(
    content: string,
    context: ProcessingContext,
  ): Promise<import('./types').RealPageNumbers>;

  /**
   * Estimate TOC page count
   * @param headings Array of headings
   * @param pageNumbers Current page number mapping
   * @returns Promise resolving to estimated TOC page count
   */
  estimateTOCPageCount(
    headings: import('../../types/index').Heading[],
    pageNumbers: Record<string, number>,
  ): Promise<number>;

  /**
   * Adjust page numbers to account for TOC offset
   * @param realPageNumbers Original page numbers
   * @param tocPageCount Number of pages TOC will occupy
   * @returns Adjusted page numbers
   */
  adjustPageNumbersForTOC(
    realPageNumbers: import('./types').RealPageNumbers,
    tocPageCount: number,
  ): Record<string, number>;
}

/**
 * Factory interface for creating processors
 */
export interface IProcessorFactory {
  /**
   * Create a processor of the specified type
   * @param type Processor type to create
   * @param options Configuration options
   * @returns Promise resolving to processor instance
   */
  createProcessor(
    type: DynamicContentType,
    options?: Record<string, any>,
  ): Promise<IDynamicContentProcessor>;

  /**
   * Get list of supported processor types
   * @returns Array of supported types
   */
  getSupportedTypes(): DynamicContentType[];

  /**
   * Check if a processor type is supported
   * @param type Processor type to check
   * @returns Whether the type is supported
   */
  isSupported(type: DynamicContentType): boolean;
}
