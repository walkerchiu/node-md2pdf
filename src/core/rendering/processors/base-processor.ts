/**
 * Base implementation for dynamic content processors
 */

import { IDynamicContentProcessor, IContentCache } from '../interfaces';
import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
  ContentDimensions,
} from '../types';

export abstract class BaseProcessor implements IDynamicContentProcessor {
  protected cache?: IContentCache;

  constructor(
    public readonly type: DynamicContentType,
    public readonly name: string,
    cache?: IContentCache,
  ) {
    if (cache) {
      this.cache = cache;
    }
  }

  /**
   * Abstract method to detect content compatibility
   */
  abstract detect(content: string, context: ProcessingContext): Promise<number>;

  /**
   * Abstract method to process content
   */
  abstract process(
    content: string,
    context: ProcessingContext,
  ): Promise<ProcessedContent>;

  /**
   * Abstract method to get content dimensions
   */
  abstract getDimensions(
    processedContent: ProcessedContent,
    context: ProcessingContext,
  ): Promise<ContentDimensions>;

  /**
   * Generate cache key for content
   */
  protected generateCacheKey(
    content: string,
    context: ProcessingContext,
  ): string {
    const contentHash = this.hashContent(content);
    const contextHash = this.hashContext(context);
    return `${this.type}:${contentHash}:${contextHash}`;
  }

  /**
   * Get cached processed content if available
   */
  protected async getCachedContent(
    content: string,
    context: ProcessingContext,
  ): Promise<ProcessedContent | null> {
    if (!this.cache) {
      return null;
    }

    const cacheKey = this.generateCacheKey(content, context);
    return await this.cache.get(cacheKey);
  }

  /**
   * Store processed content in cache
   */
  protected async setCachedContent(
    content: string,
    context: ProcessingContext,
    processedContent: ProcessedContent,
    ttl?: number,
  ): Promise<void> {
    if (!this.cache) {
      return;
    }

    const cacheKey = this.generateCacheKey(content, context);
    await this.cache.set(cacheKey, processedContent, ttl);
  }

  /**
   * Default environment validation
   */
  async validateEnvironment(): Promise<{
    isSupported: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    return {
      isSupported: true,
      issues: [],
      recommendations: [],
    };
  }

  /**
   * Create processing metadata
   */
  protected createMetadata(
    processingTime: number,
    warnings: string[] = [],
    details: Record<string, any> = {},
  ) {
    return {
      type: this.type,
      processingTime,
      warnings,
      details,
    };
  }

  /**
   * Simple content hashing
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Hash processing context
   */
  private hashContext(context: ProcessingContext): string {
    const contextString = JSON.stringify({
      filePath: context.filePath,
      includePageNumbers: context.pdfOptions?.includePageNumbers,
      margins: context.pdfOptions?.margins,
      tocEnabled: context.tocOptions?.enabled,
      tocIncludePageNumbers: context.tocOptions?.includePageNumbers,
      isPreRendering: context.isPreRendering,
    });

    return this.hashContent(contextString);
  }

  /**
   * Extract headings from markdown content
   */
  protected extractHeadings(content: string): Array<{
    level: number;
    text: string;
    id: string;
  }> {
    const lines = content.split('\n');
    const headings: Array<{ level: number; text: string; id: string }> = [];
    const usedIds = new Set<string>();

    for (const line of lines) {
      const trimmedLine = line.trim();
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const baseId = this.createHeadingId(text);

        // Ensure unique ID by adding suffix if needed
        let id = baseId;
        let counter = 1;
        while (usedIds.has(id)) {
          counter++;
          id = `${baseId}-${counter}`;
        }

        usedIds.add(id);
        headings.push({ level, text, id });
      }
    }

    return headings;
  }

  /**
   * Create heading ID from text
   */
  protected createHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fff\w\s-]/g, '') // Keep Chinese characters, letters, numbers, spaces, hyphens
      .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  }

  /**
   * Count elements of specific type in content
   */
  protected countElements(content: string, pattern: RegExp): number {
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Check if content contains specific patterns
   */
  protected containsPattern(content: string, pattern: RegExp): boolean {
    return pattern.test(content);
  }

  /**
   * Extract elements matching pattern
   */
  protected extractElements(content: string, pattern: RegExp): string[] {
    const matches = content.match(pattern);
    return matches || [];
  }

  /**
   * Measure processing time
   */
  protected async measureTime<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; time: number }> {
    const startTime = Date.now();
    const result = await operation();
    const time = Date.now() - startTime;
    return { result, time };
  }

  /**
   * Set cache implementation
   */
  setCache(cache: IContentCache): void {
    this.cache = cache;
  }

  /**
   * Get current cache implementation
   */
  getCache(): IContentCache | null {
    return this.cache || null;
  }
}
