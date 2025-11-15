/**
 * PDF Bookmark Generator
 * Converts TOC data to PDF navigation bookmarks
 */

import { Logger } from '../../infrastructure/logging/logger';
import { TOCItemFlat, TOCItemNested } from '../toc/types';

import {
  BookmarkOptions,
  BookmarkItem,
  BookmarkNode,
  BookmarkGenerationResult,
  PDFOutlineItem,
  BookmarkGeneratorConfig,
} from './types';

/**
 * Default bookmark generation configuration
 */
const DEFAULT_BOOKMARK_CONFIG: BookmarkGeneratorConfig = {
  dataSource: {
    preferTOC: true,
    allowHeadingFallback: true,
    includeCustomBookmarks: false,
  },
  pageNumbers: {
    enabled: true,
    detectionMethod: 'toc',
    retryAttempts: 3,
  },
  hierarchy: {
    maxDepth: 3,
    minLevel: 1,
    autoExpandLevels: 2,
  },
};

/**
 * Performance-optimized cache entry for bookmark generation
 */
interface BookmarkCacheEntry {
  key: string;
  result: BookmarkGenerationResult;
  timestamp: number;
  hitCount: number;
}

/**
 * PDF Bookmark Generator
 * Converts table of contents data into PDF navigation bookmarks with performance optimization
 */
export class BookmarkGenerator {
  private readonly logger: Logger;
  private readonly config: BookmarkGeneratorConfig;

  // Performance optimization: Cache for large document bookmark generation
  private readonly cache = new Map<string, BookmarkCacheEntry>();
  private readonly cacheMaxSize = 50; // Maximum cache entries
  private readonly cacheMaxAge = 5 * 60 * 1000; // 5 minutes cache TTL

  constructor(
    logger: Logger = new Logger({
      format: { prefix: '[BookmarkGenerator]' },
    }),
    config: Partial<BookmarkGeneratorConfig> = {},
  ) {
    this.logger = logger;
    this.config = { ...DEFAULT_BOOKMARK_CONFIG, ...config };
  }

  /**
   * Generate PDF bookmarks from TOC data with performance optimization
   */
  async generateFromTOC(
    tocItems: TOCItemFlat[],
    tocTree: TOCItemNested[],
    options: BookmarkOptions,
  ): Promise<BookmarkGenerationResult> {
    const startTime = Date.now();

    // Performance optimization: Generate cache key for large documents
    const cacheKey = this.generateCacheKey(tocItems, options);

    // Check cache for performance optimization (especially for large documents)
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      this.logger.debug('Cache hit for bookmark generation', {
        cacheKey,
        originalGenerationTime: cachedResult.metadata.generationTime,
        hitCount: this.cache.get(cacheKey)?.hitCount || 0,
      });
      return cachedResult;
    }

    this.logger.debug('Starting bookmark generation from TOC', {
      itemCount: tocItems.length,
      treeDepth: this.calculateMaxDepth(tocTree),
      options,
      cacheKey,
    });

    try {
      // Convert TOC items to bookmarks
      const bookmarks = this.convertTOCItemsToBookmarks(tocItems, options);

      // Build hierarchical structure
      const effectiveMaxDepth =
        options.maxDepth ?? this.config.hierarchy.maxDepth;
      const tree = this.buildBookmarkTree(bookmarks, effectiveMaxDepth);

      // Generate PDF outline
      const outline = this.generatePDFOutline(tree, options);

      // Calculate metadata
      const metadata = this.generateMetadata(bookmarks, tree, startTime, 'toc');

      const result: BookmarkGenerationResult = {
        bookmarks,
        tree,
        outline,
        metadata,
      };

      // Cache result for performance optimization (especially for large documents)
      this.setToCache(cacheKey, result);

      this.logger.info('Bookmark generation completed successfully', {
        totalBookmarks: metadata.totalBookmarks,
        maxDepth: metadata.maxDepth,
        generationTime: metadata.generationTime,
        cached: true,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to generate bookmarks from TOC', {
        error: error instanceof Error ? error.message : String(error),
        tocItemsCount: tocItems.length,
        options,
      });
      throw error;
    }
  }

  /**
   * Generate PDF bookmarks from heading data (fallback method)
   */
  async generateFromHeadings(
    headings: Array<{
      level: number;
      text: string;
      id: string;
      anchor: string;
      page?: number;
    }>,
    options: BookmarkOptions,
  ): Promise<BookmarkGenerationResult> {
    const startTime = Date.now();

    this.logger.debug('Starting bookmark generation from headings', {
      headingCount: headings.length,
      options,
    });

    try {
      // Use configured maxDepth or fallback to hierarchy config default
      const effectiveMaxDepth =
        options.maxDepth ?? this.config.hierarchy.maxDepth;

      // Convert headings to bookmark items
      const bookmarks = headings
        .filter((h) => h.level <= effectiveMaxDepth)
        .map((heading, index) =>
          this.createBookmarkFromHeading(heading, index),
        );

      // Build hierarchical structure
      const tree = this.buildBookmarkTree(bookmarks, effectiveMaxDepth);

      // Generate PDF outline
      const outline = this.generatePDFOutline(tree, options);

      // Calculate metadata
      const metadata = this.generateMetadata(
        bookmarks,
        tree,
        startTime,
        'headings',
      );

      const result: BookmarkGenerationResult = {
        bookmarks,
        tree,
        outline,
        metadata,
      };

      this.logger.info('Bookmark generation from headings completed', {
        totalBookmarks: metadata.totalBookmarks,
        maxDepth: metadata.maxDepth,
        generationTime: metadata.generationTime,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to generate bookmarks from headings', {
        error: error instanceof Error ? error.message : String(error),
        headingCount: headings.length,
        options,
      });
      throw error;
    }
  }

  /**
   * Convert TOC items to bookmark items
   */
  private convertTOCItemsToBookmarks(
    tocItems: TOCItemFlat[],
    options: BookmarkOptions,
  ): BookmarkItem[] {
    const effectiveMaxDepth =
      options.maxDepth ?? this.config.hierarchy.maxDepth;

    return tocItems
      .filter((item) => item.level <= effectiveMaxDepth)
      .map((item, index) => ({
        title: item.title,
        level: item.level,
        page: item.pageNumber || 1,
        destination: item.anchor,
        id: `bookmark-${index}`,
        parentId: undefined, // Will be set during tree building
        childIds: [],
        tocItem: item,
      }));
  }

  /**
   * Create bookmark item from heading data
   */
  private createBookmarkFromHeading(
    heading: {
      level: number;
      text: string;
      id: string;
      anchor: string;
      page?: number;
    },
    index: number,
  ): BookmarkItem {
    return {
      title: heading.text,
      level: heading.level,
      page: heading.page || 1,
      destination: heading.anchor,
      id: `bookmark-${index}`,
      parentId: undefined,
      childIds: [],
    };
  }

  /**
   * Build hierarchical bookmark tree structure
   */
  private buildBookmarkTree(
    bookmarks: BookmarkItem[],
    maxDepth: number,
  ): BookmarkNode[] {
    const tree: BookmarkNode[] = [];
    const nodeMap = new Map<string, BookmarkNode>();
    const parentStack: BookmarkNode[] = [];

    for (const bookmark of bookmarks) {
      if (bookmark.level > maxDepth) continue;

      const node: BookmarkNode = {
        item: bookmark,
        children: [],
        depth: bookmark.level,
      };

      nodeMap.set(bookmark.id, node);

      // Find appropriate parent
      while (
        parentStack.length > 0 &&
        parentStack[parentStack.length - 1].item.level >= bookmark.level
      ) {
        parentStack.pop();
      }

      if (parentStack.length > 0) {
        // Add as child to parent
        const parent = parentStack[parentStack.length - 1];
        parent.children.push(node);
        node.parent = parent;
        bookmark.parentId = parent.item.id;
        parent.item.childIds.push(bookmark.id);
      } else {
        // Add as root item
        tree.push(node);
      }

      parentStack.push(node);
    }

    return tree;
  }

  /**
   * Generate PDF outline structure for engine integration
   */
  private generatePDFOutline(
    tree: BookmarkNode[],
    options: BookmarkOptions,
  ): PDFOutlineItem[] {
    return tree.map((node) => this.convertNodeToOutline(node, options));
  }

  /**
   * Convert bookmark node to PDF outline item
   */
  private convertNodeToOutline(
    node: BookmarkNode,
    options: BookmarkOptions,
  ): PDFOutlineItem {
    const outline: PDFOutlineItem = {
      title: node.item.title,
      dest: options.includePageNumbers ? node.item.page : node.item.destination,
      expanded: node.depth <= (this.config.hierarchy.autoExpandLevels || 2),
    };

    // Add children if they exist
    if (node.children.length > 0) {
      outline.children = node.children.map((child) =>
        this.convertNodeToOutline(child, options),
      );
    }

    // Apply styling based on level
    const style = this.getOutlineStyle(node.item.level);
    if (style) {
      outline.style = style;
    }

    return outline;
  }

  /**
   * Get outline styling based on heading level
   */
  private getOutlineStyle(level: number): PDFOutlineItem['style'] {
    const baseSize = 12;
    const sizeDecrement = Math.min(level - 1, 3) * 1;

    return {
      fontSize: baseSize - sizeDecrement,
      bold: level <= 2,
      color: level === 1 ? '#000000' : '#333333',
    };
  }

  /**
   * Calculate maximum depth in TOC tree
   */
  private calculateMaxDepth(tree: TOCItemNested[]): number {
    if (tree.length === 0) return 0;

    return Math.max(
      ...tree.map((item) => {
        if (item.children.length === 0) return item.level;
        return Math.max(item.level, this.calculateMaxDepth(item.children));
      }),
    );
  }

  /**
   * Generate bookmark generation metadata
   */
  private generateMetadata(
    bookmarks: BookmarkItem[],
    _tree: BookmarkNode[],
    startTime: number,
    sourceType: 'toc' | 'headings' | 'mixed',
  ) {
    const bookmarksByLevel: Record<number, number> = {};
    let maxDepth = 0;

    for (const bookmark of bookmarks) {
      bookmarksByLevel[bookmark.level] =
        (bookmarksByLevel[bookmark.level] || 0) + 1;
      maxDepth = Math.max(maxDepth, bookmark.level);
    }

    return {
      totalBookmarks: bookmarks.length,
      maxDepth,
      bookmarksByLevel,
      generationTime: Date.now() - startTime,
      sourceType,
    };
  }

  /**
   * Generate cache key for bookmark generation (performance optimization)
   */
  private generateCacheKey(
    tocItems: TOCItemFlat[],
    options: BookmarkOptions,
  ): string {
    const tocHash = tocItems
      .map((item) => `${item.level}:${item.title}:${item.anchor || ''}`)
      .join('|');
    const optionsHash = JSON.stringify({
      enabled: options.enabled,
      maxDepth: options.maxDepth,
      includePageNumbers: options.includePageNumbers,
      useExistingTOC: options.useExistingTOC,
    });

    // Create simple hash
    const combined = tocHash + optionsHash;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `bookmark_${Math.abs(hash)}_${tocItems.length}`;
  }

  /**
   * Get result from cache (performance optimization)
   */
  private getFromCache(key: string): BookmarkGenerationResult | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check cache expiry
    const now = Date.now();
    if (now - entry.timestamp > this.cacheMaxAge) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hitCount++;
    return entry.result;
  }

  /**
   * Store result in cache with automatic cleanup (performance optimization)
   */
  private setToCache(key: string, result: BookmarkGenerationResult): void {
    // Clean up expired entries
    this.cleanupExpiredCache();

    // Clean up old entries if cache is full
    if (this.cache.size >= this.cacheMaxSize) {
      this.evictLeastUsedEntries();
    }

    const entry: BookmarkCacheEntry = {
      key,
      result: { ...result }, // Deep clone to avoid references
      timestamp: Date.now(),
      hitCount: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Clean up expired cache entries (performance maintenance)
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheMaxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict least used cache entries (performance maintenance)
   */
  private evictLeastUsedEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.hitCount - b.hitCount);

    // Remove the least used 20% of entries
    const removeCount = Math.floor(entries.length * 0.2) || 1;
    for (let i = 0; i < removeCount; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Get cache statistics (for monitoring and debugging)
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number | null;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalEntries = entries.length;
    const oldestTimestamp =
      entries.length > 0
        ? Math.min(...entries.map((entry) => entry.timestamp))
        : null;

    return {
      size: totalEntries,
      maxSize: this.cacheMaxSize,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
      oldestEntry: oldestTimestamp,
    };
  }

  /**
   * Clear all cached entries (useful for testing or memory cleanup)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validate bookmark options
   */
  static validateOptions(options: BookmarkOptions): void {
    if (typeof options.enabled !== 'boolean') {
      throw new Error('BookmarkOptions.enabled must be a boolean');
    }

    if (options.maxDepth !== undefined) {
      if (
        !Number.isInteger(options.maxDepth) ||
        options.maxDepth < 1 ||
        options.maxDepth > 6
      ) {
        throw new Error(
          'BookmarkOptions.maxDepth must be an integer between 1 and 6',
        );
      }
    }

    if (
      options.includePageNumbers !== undefined &&
      typeof options.includePageNumbers !== 'boolean'
    ) {
      throw new Error('BookmarkOptions.includePageNumbers must be a boolean');
    }
  }
}
