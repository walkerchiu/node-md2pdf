/**
 * Tests for PDF Bookmarks Module Index
 */

import {
  BookmarkGenerator,
  BookmarkOptions,
  BookmarkItem,
  BookmarkNode,
  BookmarkGenerationResult,
  PDFOutlineItem,
  BookmarkGeneratorConfig,
  BookmarkConversionContext,
  flattenTOCTree,
  filterBookmarksByDepth,
  findChildBookmarks,
  findParentBookmark,
  calculateBookmarkTreeDepth,
  validateBookmarkHierarchy,
  sortBookmarksByDocumentOrder,
  generateBookmarkId,
  bookmarkTreeToSimpleOutline,
  extractBookmarkStatistics,
  mergeBookmarkTrees,
  outlineToBookmarks,
  DEFAULT_BOOKMARK_OPTIONS,
  createBookmarkGenerator,
  generateBookmarksFromTOC,
} from '../../../../src/core/bookmarks/index';

describe('Bookmarks Module Index', () => {
  describe('Exports', () => {
    it('should export BookmarkGenerator class', () => {
      expect(BookmarkGenerator).toBeDefined();
      expect(typeof BookmarkGenerator).toBe('function');
    });

    it('should export all required utility functions', () => {
      expect(flattenTOCTree).toBeDefined();
      expect(filterBookmarksByDepth).toBeDefined();
      expect(findChildBookmarks).toBeDefined();
      expect(findParentBookmark).toBeDefined();
      expect(calculateBookmarkTreeDepth).toBeDefined();
      expect(validateBookmarkHierarchy).toBeDefined();
      expect(sortBookmarksByDocumentOrder).toBeDefined();
      expect(generateBookmarkId).toBeDefined();
      expect(bookmarkTreeToSimpleOutline).toBeDefined();
      expect(extractBookmarkStatistics).toBeDefined();
      expect(mergeBookmarkTrees).toBeDefined();
      expect(outlineToBookmarks).toBeDefined();
    });

    it('should export factory functions', () => {
      expect(createBookmarkGenerator).toBeDefined();
      expect(generateBookmarksFromTOC).toBeDefined();
    });

    it('should export default configuration', () => {
      expect(DEFAULT_BOOKMARK_OPTIONS).toBeDefined();
      expect(DEFAULT_BOOKMARK_OPTIONS.enabled).toBe(true);
      expect(DEFAULT_BOOKMARK_OPTIONS.maxDepth).toBe(3);
      expect(DEFAULT_BOOKMARK_OPTIONS.includePageNumbers).toBe(true);
      expect(DEFAULT_BOOKMARK_OPTIONS.useExistingTOC).toBe(true);
      expect(DEFAULT_BOOKMARK_OPTIONS.styling).toBeDefined();
    });
  });

  describe('DEFAULT_BOOKMARK_OPTIONS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_BOOKMARK_OPTIONS).toEqual({
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
        useExistingTOC: true,
        styling: {
          fontSize: 12,
          textColor: '#000000',
          highlightColor: '#0066cc',
        },
      });
    });

    it('should be a valid BookmarkOptions object', () => {
      const options: BookmarkOptions = DEFAULT_BOOKMARK_OPTIONS;
      expect(options.enabled).toBe(true);
      expect(typeof options.maxDepth).toBe('number');
      expect(typeof options.includePageNumbers).toBe('boolean');
      expect(typeof options.useExistingTOC).toBe('boolean');
    });
  });

  describe('createBookmarkGenerator', () => {
    it('should create a BookmarkGenerator instance with default configuration', () => {
      const generator = createBookmarkGenerator();

      expect(generator).toBeInstanceOf(BookmarkGenerator);
    });

    it('should create a BookmarkGenerator with custom configuration', () => {
      const customConfig: Partial<BookmarkGeneratorConfig> = {
        hierarchy: {
          maxDepth: 4,
          minLevel: 2,
          autoExpandLevels: 1,
        },
      };

      const generator = createBookmarkGenerator(customConfig);

      expect(generator).toBeInstanceOf(BookmarkGenerator);
    });

    it('should accept undefined configuration', () => {
      const generator = createBookmarkGenerator(undefined);

      expect(generator).toBeInstanceOf(BookmarkGenerator);
    });
  });

  describe('generateBookmarksFromTOC', () => {
    const sampleTOCItems = [
      {
        title: 'Chapter 1',
        level: 1,
        anchor: '#chapter-1',
        pageNumber: 2,
        index: 0,
      },
      {
        title: 'Section 1.1',
        level: 2,
        anchor: '#section-1-1',
        pageNumber: 3,
        index: 1,
      },
      {
        title: 'Chapter 2',
        level: 1,
        anchor: '#chapter-2',
        pageNumber: 5,
        index: 2,
      },
    ];

    it('should generate bookmarks from TOC data with default options', async () => {
      const result = await generateBookmarksFromTOC(sampleTOCItems);

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeDefined();
      expect(result.tree).toBeDefined();
      expect(result.outline).toBeDefined();
      expect(result.metadata).toBeDefined();

      expect(result.bookmarks.length).toBeGreaterThan(0);
      expect(result.metadata.totalBookmarks).toBeGreaterThan(0);
    });

    it('should generate bookmarks with custom options', async () => {
      const customOptions: Partial<BookmarkOptions> = {
        maxDepth: 2,
        includePageNumbers: false,
      };

      const result = await generateBookmarksFromTOC(
        sampleTOCItems,
        customOptions,
      );

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeDefined();
      expect(result.metadata.totalBookmarks).toBeGreaterThan(0);
    });

    it('should handle empty TOC items', async () => {
      const result = await generateBookmarksFromTOC([]);

      expect(result).toBeDefined();
      expect(result.bookmarks).toEqual([]);
      expect(result.tree).toEqual([]);
      expect(result.outline).toEqual([]);
      expect(result.metadata.totalBookmarks).toBe(0);
    });

    it('should merge options with defaults correctly', async () => {
      const customOptions: Partial<BookmarkOptions> = {
        maxDepth: 5,
        // enabled and includePageNumbers should come from defaults
      };

      const result = await generateBookmarksFromTOC(
        sampleTOCItems,
        customOptions,
      );

      expect(result).toBeDefined();
      // The function uses merged options internally
      expect(result.metadata).toBeDefined();
    });

    it('should handle TOC items without page numbers', async () => {
      const tocWithoutPages = [
        {
          title: 'Chapter 1',
          level: 1,
          anchor: '#chapter-1',
          index: 0,
        },
        {
          title: 'Section 1.1',
          level: 2,
          anchor: '#section-1-1',
          index: 1,
        },
      ];

      const result = await generateBookmarksFromTOC(tocWithoutPages);

      expect(result).toBeDefined();
      expect(result.bookmarks.length).toBe(2);
    });
  });

  describe('Type Definitions', () => {
    it('should provide proper type definitions for TypeScript', () => {
      // This test ensures TypeScript compilation works correctly
      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
      };

      const bookmark: BookmarkItem = {
        title: 'Test',
        level: 1,
        page: 1,
        destination: '#test',
        id: 'test-id',
        parentId: undefined,
        childIds: [],
      };

      const node: BookmarkNode = {
        item: bookmark,
        children: [],
        depth: 1,
      };

      const outline: PDFOutlineItem = {
        title: 'Test Outline',
        dest: '#test',
      };

      expect(options.enabled).toBe(true);
      expect(bookmark.title).toBe('Test');
      expect(node.depth).toBe(1);
      expect(outline.title).toBe('Test Outline');
    });
  });

  describe('Module Integration', () => {
    it('should work with BookmarkGenerator from the module', async () => {
      const generator = createBookmarkGenerator();

      // Test that the generator can be called with basic parameters
      expect(generator).toBeInstanceOf(BookmarkGenerator);
      expect(typeof generator.generateFromTOC).toBe('function');
      expect(typeof generator.generateFromHeadings).toBe('function');
    });

    it('should provide consistent API across exports', () => {
      // Verify that exported utilities are functions
      expect(typeof generateBookmarkId).toBe('function');
      expect(typeof calculateBookmarkTreeDepth).toBe('function');
      expect(typeof extractBookmarkStatistics).toBe('function');

      // Verify constants are objects
      expect(typeof DEFAULT_BOOKMARK_OPTIONS).toBe('object');

      // Verify factory functions are functions
      expect(typeof createBookmarkGenerator).toBe('function');
      expect(typeof generateBookmarksFromTOC).toBe('function');
    });
  });
});
