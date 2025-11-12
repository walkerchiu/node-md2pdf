/**
 * Tests for BaseProcessor abstract class
 */

import { BaseProcessor } from '../../../../../src/core/rendering/processors/base-processor';
import { IContentCache } from '../../../../../src/core/rendering/interfaces';
import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
  ContentDimensions,
} from '../../../../../src/core/rendering/types';

// Mock implementation for testing abstract BaseProcessor
class TestProcessor extends BaseProcessor {
  constructor(cache?: IContentCache) {
    super(DynamicContentType.TOC, 'TestProcessor', cache);
  }

  async detect(content: string, _context: ProcessingContext): Promise<number> {
    return content.includes('test') ? 0.8 : 0.1;
  }

  async process(
    content: string,
    _context: ProcessingContext,
  ): Promise<ProcessedContent> {
    const startTime = Date.now();
    const html = `<div class="test">${content}</div>`;
    const processingTime = Date.now() - startTime;

    return {
      html,
      metadata: this.createMetadata(processingTime, [], { testProperty: true }),
    };
  }

  async getDimensions(
    _processedContent: ProcessedContent,
    _context: ProcessingContext,
  ): Promise<ContentDimensions> {
    return {
      pageCount: 1,
      height: 800,
      width: 600,
      headingPositions: [],
      imagePositions: [],
    };
  }
}

// Mock cache implementation
class MockCache implements IContentCache {
  private cache = new Map<string, ProcessedContent>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  async get(key: string): Promise<ProcessedContent | null> {
    const result = this.cache.get(key) || null;
    if (result) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return result;
  }

  async set(
    key: string,
    content: ProcessedContent,
    _ttl?: number,
  ): Promise<void> {
    this.cache.set(key, content);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getStats() {
    return {
      totalItems: this.cache.size,
      totalSize: JSON.stringify(Array.from(this.cache.values())).length,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      oldestItem: null,
    };
  }
}

describe('BaseProcessor', () => {
  let processor: TestProcessor;
  let mockCache: MockCache;
  let context: ProcessingContext;

  beforeEach(() => {
    mockCache = new MockCache();
    processor = new TestProcessor(mockCache);
    context = {
      filePath: '/test/file.md',
      pdfOptions: {
        includePageNumbers: true,
        margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
      },
      tocOptions: {
        enabled: true,
        includePageNumbers: true,
        maxDepth: 3,
      },
      headings: [
        { id: 'heading-1', text: 'Heading 1', level: 1, anchor: 'heading-1' },
        { id: 'heading-2', text: 'Heading 2', level: 2, anchor: 'heading-2' },
      ],
      isPreRendering: false,
    };
  });

  describe('constructor', () => {
    it('should initialize with type and name', () => {
      const proc = new TestProcessor();
      expect(proc.type).toBe(DynamicContentType.TOC);
      expect(proc.name).toBe('TestProcessor');
    });

    it('should initialize with cache when provided', () => {
      const proc = new TestProcessor(mockCache);
      expect(proc.getCache()).toBe(mockCache);
    });

    it('should initialize without cache when not provided', () => {
      const proc = new TestProcessor();
      expect(proc.getCache()).toBeNull();
    });
  });

  describe('cache functionality', () => {
    it('should generate consistent cache keys', () => {
      const content = 'test content';
      const key1 = (processor as any).generateCacheKey(content, context);
      const key2 = (processor as any).generateCacheKey(content, context);
      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different content', () => {
      const key1 = (processor as any).generateCacheKey('content1', context);
      const key2 = (processor as any).generateCacheKey('content2', context);
      expect(key1).not.toBe(key2);
    });

    it('should generate different cache keys for different contexts', () => {
      const content = 'test content';
      const context2 = { ...context, isPreRendering: true };
      const key1 = (processor as any).generateCacheKey(content, context);
      const key2 = (processor as any).generateCacheKey(content, context2);
      expect(key1).not.toBe(key2);
    });

    it('should get cached content when available', async () => {
      const content = 'test content';
      const processedContent = await processor.process(content, context);

      // Store in cache
      await (processor as any).setCachedContent(
        content,
        context,
        processedContent,
      );

      // Retrieve from cache
      const cached = await (processor as any).getCachedContent(
        content,
        context,
      );
      expect(cached).toEqual(processedContent);
    });

    it('should return null when no cache is available', async () => {
      const procWithoutCache = new TestProcessor();
      const content = 'test content';
      const cached = await (procWithoutCache as any).getCachedContent(
        content,
        context,
      );
      expect(cached).toBeNull();
    });

    it('should not store in cache when no cache is available', async () => {
      const procWithoutCache = new TestProcessor();
      const content = 'test content';
      const processedContent = await procWithoutCache.process(content, context);

      // This should not throw
      await expect(
        (procWithoutCache as any).setCachedContent(
          content,
          context,
          processedContent,
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('validateEnvironment', () => {
    it('should return successful validation by default', async () => {
      const result = await processor.validateEnvironment();
      expect(result).toEqual({
        isSupported: true,
        issues: [],
        recommendations: [],
      });
    });
  });

  describe('createMetadata', () => {
    it('should create metadata with required fields', () => {
      const metadata = (processor as any).createMetadata(100, ['warning'], {
        extra: 'data',
      });
      expect(metadata).toEqual({
        type: DynamicContentType.TOC,
        processingTime: 100,
        warnings: ['warning'],
        details: { extra: 'data' },
      });
    });

    it('should create metadata with defaults', () => {
      const metadata = (processor as any).createMetadata(50);
      expect(metadata).toEqual({
        type: DynamicContentType.TOC,
        processingTime: 50,
        warnings: [],
        details: {},
      });
    });
  });

  describe('content hashing', () => {
    it('should generate consistent hashes for same content', () => {
      const content = 'test content';
      const hash1 = (processor as any).hashContent(content);
      const hash2 = (processor as any).hashContent(content);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = (processor as any).hashContent('content1');
      const hash2 = (processor as any).hashContent('content2');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate consistent context hashes', () => {
      const hash1 = (processor as any).hashContext(context);
      const hash2 = (processor as any).hashContext(context);
      expect(hash1).toBe(hash2);
    });
  });

  describe('heading extraction', () => {
    it('should extract headings from markdown content', () => {
      const content = `# Heading 1
Some content here.
## Heading 2
More content.
### Heading 3`;

      const headings = (processor as any).extractHeadings(content);
      expect(headings).toEqual([
        { level: 1, text: 'Heading 1', id: 'heading-1' },
        { level: 2, text: 'Heading 2', id: 'heading-2' },
        { level: 3, text: 'Heading 3', id: 'heading-3' },
      ]);
    });

    it('should handle duplicate heading texts with unique IDs', () => {
      const content = `# Heading
## Heading
### Heading`;

      const headings = (processor as any).extractHeadings(content);
      expect(headings).toEqual([
        { level: 1, text: 'Heading', id: 'heading' },
        { level: 2, text: 'Heading', id: 'heading-1' }, // New implementation starts from -1
        { level: 3, text: 'Heading', id: 'heading-2' }, // Then -2, etc.
      ]);
    });

    it('should create clean heading IDs', () => {
      const content = `# Heading with Special Characters! @#$%
## 中文標題 (Chinese Title)
### Heading_with_underscores`;

      const headings = (processor as any).extractHeadings(content);
      expect(headings).toEqual([
        {
          level: 1,
          text: 'Heading with Special Characters! @#$%',
          id: 'heading-with-special-characters',
        },
        {
          level: 2,
          text: '中文標題 (Chinese Title)',
          id: '中文標題-chinese-title',
        },
        {
          level: 3,
          text: 'Heading_with_underscores',
          id: 'heading-with-underscores',
        },
      ]);
    });
  });

  describe('createHeadingId', () => {
    it('should create clean IDs from text', () => {
      const tests = [
        { input: 'Simple Heading', expected: 'simple-heading' },
        {
          input: 'Heading with Special Characters!@#$',
          expected: 'heading-with-special-characters',
        },
        { input: '中文標題', expected: '中文標題' },
        { input: 'Multiple    Spaces', expected: 'multiple-spaces' },
        {
          input: 'Heading_with_underscores',
          expected: 'heading-with-underscores',
        },
        {
          input: '---Leading and Trailing---',
          expected: 'leading-and-trailing',
        },
      ];

      tests.forEach(({ input, expected }) => {
        const result = (processor as any).createHeadingId(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('utility methods', () => {
    it('should count elements correctly', () => {
      const content = 'This is a test. This is another test.';
      const pattern = /test/g;
      const count = (processor as any).countElements(content, pattern);
      expect(count).toBe(2);
    });

    it('should detect patterns correctly', () => {
      const content = 'This contains a test pattern.';
      const pattern = /test/;
      const hasPattern = (processor as any).containsPattern(content, pattern);
      expect(hasPattern).toBe(true);
    });

    it('should extract elements correctly', () => {
      const content = 'test1 and test2 and test3';
      const pattern = /test\d/g;
      const elements = (processor as any).extractElements(content, pattern);
      expect(elements).toEqual(['test1', 'test2', 'test3']);
    });

    it('should measure processing time', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      };

      const { result, time } = await (processor as any).measureTime(operation);
      expect(result).toBe('result');
      expect(time).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should set cache implementation', () => {
      const newCache = new MockCache();
      processor.setCache(newCache);
      expect(processor.getCache()).toBe(newCache);
    });

    it('should get current cache implementation', () => {
      expect(processor.getCache()).toBe(mockCache);
    });

    it('should return null when no cache is set', () => {
      const procWithoutCache = new TestProcessor();
      expect(procWithoutCache.getCache()).toBeNull();
    });
  });

  describe('abstract methods implementation', () => {
    it('should implement detect method', async () => {
      const result1 = await processor.detect('test content', context);
      expect(result1).toBe(0.8);

      const result2 = await processor.detect('other content', context);
      expect(result2).toBe(0.1);
    });

    it('should implement process method', async () => {
      const content = 'test content';
      const result = await processor.process(content, context);

      expect(result.html).toBe('<div class="test">test content</div>');
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.warnings).toEqual([]);
      expect(result.metadata.details).toEqual({ testProperty: true });
    });

    it('should implement getDimensions method', async () => {
      const processedContent: ProcessedContent = {
        html: '<div>test</div>',
        metadata: {
          type: DynamicContentType.TOC,
          processingTime: 10,
          warnings: [],
        },
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        context,
      );
      expect(dimensions).toEqual({
        pageCount: 1,
        height: 800,
        width: 600,
        headingPositions: [],
        imagePositions: [],
      });
    });
  });
});
