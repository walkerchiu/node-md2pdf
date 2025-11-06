/**
 * Tests for BookmarkGenerator class
 */

import { BookmarkGenerator } from '../../../../src/core/bookmarks/bookmark-generator';
import { Logger } from '../../../../src/infrastructure/logging/logger';
import {
  BookmarkOptions,
  BookmarkGenerationResult,
  BookmarkItem,
} from '../../../../src/core/bookmarks/types';
import { TOCItemFlat, TOCItemNested } from '../../../../src/core/toc/types';

// Mock logger to avoid console output during tests
jest.mock('../../../../src/infrastructure/logging/logger');

describe('BookmarkGenerator', () => {
  let generator: BookmarkGenerator;

  beforeEach(() => {
    // Create BookmarkGenerator with default logger (no params)
    generator = new BookmarkGenerator();
  });

  describe('generateFromTOC', () => {
    const sampleTOCItems: TOCItemFlat[] = [
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
        title: 'Section 1.2',
        level: 2,
        anchor: '#section-1-2',
        pageNumber: 5,
        index: 2,
      },
      {
        title: 'Chapter 2',
        level: 1,
        anchor: '#chapter-2',
        pageNumber: 7,
        index: 3,
      },
    ];

    const sampleTOCTree: TOCItemNested[] = [
      {
        title: 'Chapter 1',
        level: 1,
        anchor: '#chapter-1',
        pageNumber: 2,
        children: [
          {
            title: 'Section 1.1',
            level: 2,
            anchor: '#section-1-1',
            pageNumber: 3,
            children: [],
          },
          {
            title: 'Section 1.2',
            level: 2,
            anchor: '#section-1-2',
            pageNumber: 5,
            children: [],
          },
        ],
      },
      {
        title: 'Chapter 2',
        level: 1,
        anchor: '#chapter-2',
        pageNumber: 7,
        children: [],
      },
    ];

    it('should generate bookmarks from TOC data successfully', async () => {
      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
        useExistingTOC: true,
      };

      const result = await generator.generateFromTOC(
        sampleTOCItems,
        sampleTOCTree,
        options,
      );

      expect(result).toHaveProperty('bookmarks');
      expect(result).toHaveProperty('tree');
      expect(result).toHaveProperty('outline');
      expect(result).toHaveProperty('metadata');

      expect(result.bookmarks).toHaveLength(4);
      expect(result.tree).toHaveLength(2);
      expect(result.outline).toHaveLength(2);

      // Verify first bookmark
      const firstBookmark = result.bookmarks[0];
      expect(firstBookmark).toEqual({
        title: 'Chapter 1',
        level: 1,
        page: 2,
        destination: '#chapter-1',
        id: 'bookmark-0',
        parentId: undefined,
        childIds: ['bookmark-1', 'bookmark-2'],
        tocItem: sampleTOCItems[0],
      });

      // Verify metadata
      expect(result.metadata).toEqual({
        totalBookmarks: 4,
        maxDepth: 2,
        bookmarksByLevel: { 1: 2, 2: 2 },
        generationTime: expect.any(Number),
        sourceType: 'toc',
      });

      // Note: Logger output is mocked, so we don't test logging calls directly
    });

    it('should filter bookmarks by maxDepth', async () => {
      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 1, // Only H1 headings
        includePageNumbers: true,
        useExistingTOC: true,
      };

      const result = await generator.generateFromTOC(
        sampleTOCItems,
        sampleTOCTree,
        options,
      );

      expect(result.bookmarks).toHaveLength(2);
      expect(result.bookmarks.every((b) => b.level === 1)).toBe(true);
      expect(result.metadata.maxDepth).toBe(1);
      expect(result.metadata.bookmarksByLevel).toEqual({ 1: 2 });
    });

    it('should handle empty TOC data', async () => {
      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
      };

      const result = await generator.generateFromTOC([], [], options);

      expect(result.bookmarks).toHaveLength(0);
      expect(result.tree).toHaveLength(0);
      expect(result.outline).toHaveLength(0);
      expect(result.metadata.totalBookmarks).toBe(0);
    });

    it('should handle bookmarks without page numbers', async () => {
      const tocWithoutPages: TOCItemFlat[] = [
        { title: 'Chapter 1', level: 1, anchor: '#chapter-1', index: 0 },
        { title: 'Section 1.1', level: 2, anchor: '#section-1-1', index: 1 },
      ];

      const tocTreeWithoutPages: TOCItemNested[] = [
        {
          title: 'Chapter 1',
          level: 1,
          anchor: '#chapter-1',
          children: [
            {
              title: 'Section 1.1',
              level: 2,
              anchor: '#section-1-1',
              children: [],
            },
          ],
        },
      ];

      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: false,
      };

      const result = await generator.generateFromTOC(
        tocWithoutPages,
        tocTreeWithoutPages,
        options,
      );

      expect(result.bookmarks).toHaveLength(2);
      expect(result.bookmarks.every((b) => b.page === 1)).toBe(true); // Default page
    });

    it('should handle error during generation', async () => {
      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
      };

      // Force an error by passing invalid data
      const invalidTOCItems = null as any;

      await expect(
        generator.generateFromTOC(invalidTOCItems, [], options),
      ).rejects.toThrow();

      // Note: Logger error output is mocked, so we don't test logging calls directly
    });
  });

  describe('generateFromHeadings', () => {
    const sampleHeadings = [
      {
        level: 1,
        text: 'Introduction',
        id: 'intro',
        anchor: '#intro',
        page: 1,
      },
      {
        level: 2,
        text: 'Overview',
        id: 'overview',
        anchor: '#overview',
        page: 2,
      },
      { level: 1, text: 'Main Content', id: 'main', anchor: '#main', page: 3 },
    ];

    it('should generate bookmarks from heading data', async () => {
      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 2,
        includePageNumbers: true,
      };

      const result = await generator.generateFromHeadings(
        sampleHeadings,
        options,
      );

      expect(result.bookmarks).toHaveLength(3);
      expect(result.tree).toHaveLength(2);
      expect(result.outline).toHaveLength(2);
      expect(result.metadata.sourceType).toBe('headings');

      const firstBookmark = result.bookmarks[0];
      expect(firstBookmark).toEqual({
        title: 'Introduction',
        level: 1,
        page: 1,
        destination: '#intro',
        id: 'bookmark-0',
        parentId: undefined,
        childIds: ['bookmark-1'],
      });
    });

    it('should filter headings by maxDepth', async () => {
      const deepHeadings = [
        { level: 1, text: 'H1', id: 'h1', anchor: '#h1' },
        { level: 2, text: 'H2', id: 'h2', anchor: '#h2' },
        { level: 3, text: 'H3', id: 'h3', anchor: '#h3' },
        { level: 4, text: 'H4', id: 'h4', anchor: '#h4' },
        { level: 5, text: 'H5', id: 'h5', anchor: '#h5' },
      ];

      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
      };

      const result = await generator.generateFromHeadings(
        deepHeadings,
        options,
      );

      expect(result.bookmarks).toHaveLength(3);
      expect(result.bookmarks.every((b) => b.level <= 3)).toBe(true);
    });

    it('should handle headings without page numbers', async () => {
      const headingsWithoutPages = [
        { level: 1, text: 'H1', id: 'h1', anchor: '#h1' },
        { level: 2, text: 'H2', id: 'h2', anchor: '#h2' },
      ];

      const options: BookmarkOptions = { enabled: true };

      const result = await generator.generateFromHeadings(
        headingsWithoutPages,
        options,
      );

      expect(result.bookmarks).toHaveLength(2);
      expect(result.bookmarks.every((b) => b.page === 1)).toBe(true);
    });
  });

  describe('validateOptions', () => {
    it('should validate correct options', () => {
      const validOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
      };

      expect(() =>
        BookmarkGenerator.validateOptions(validOptions),
      ).not.toThrow();
    });

    it('should throw error for invalid enabled property', () => {
      const invalidOptions = {
        enabled: 'true' as any,
      };

      expect(() => BookmarkGenerator.validateOptions(invalidOptions)).toThrow(
        'BookmarkOptions.enabled must be a boolean',
      );
    });

    it('should throw error for invalid maxDepth', () => {
      const invalidOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 0, // Invalid
      };

      expect(() => BookmarkGenerator.validateOptions(invalidOptions)).toThrow(
        'BookmarkOptions.maxDepth must be an integer between 1 and 6',
      );
    });

    it('should throw error for maxDepth too high', () => {
      const invalidOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 7, // Invalid
      };

      expect(() => BookmarkGenerator.validateOptions(invalidOptions)).toThrow(
        'BookmarkOptions.maxDepth must be an integer between 1 and 6',
      );
    });

    it('should throw error for invalid includePageNumbers', () => {
      const invalidOptions = {
        enabled: true,
        includePageNumbers: 'yes' as any,
      };

      expect(() => BookmarkGenerator.validateOptions(invalidOptions)).toThrow(
        'BookmarkOptions.includePageNumbers must be a boolean',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle deeply nested bookmark hierarchy', async () => {
      const deepTOCItems: TOCItemFlat[] = [
        { title: 'H1', level: 1, anchor: '#h1', index: 0 },
        { title: 'H2', level: 2, anchor: '#h2', index: 1 },
        { title: 'H3', level: 3, anchor: '#h3', index: 2 },
        { title: 'H4', level: 4, anchor: '#h4', index: 3 },
        { title: 'H5', level: 5, anchor: '#h5', index: 4 },
        { title: 'H6', level: 6, anchor: '#h6', index: 5 },
      ];

      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 6,
      };

      const result = await generator.generateFromTOC(deepTOCItems, [], options);

      expect(result.bookmarks).toHaveLength(6);
      expect(result.metadata.maxDepth).toBe(6);

      // Verify hierarchical structure
      const h1Bookmark = result.bookmarks.find((b) => b.title === 'H1');
      const h6Bookmark = result.bookmarks.find((b) => b.title === 'H6');

      expect(h1Bookmark?.parentId).toBeUndefined();
      expect(h6Bookmark?.parentId).toBeDefined();
    });

    it('should handle bookmark titles with special characters', async () => {
      const specialTOC: TOCItemFlat[] = [
        {
          title: 'Chapter & Section "1"',
          level: 1,
          anchor: '#special',
          index: 0,
        },
        {
          title: 'Sub-section <test>',
          level: 2,
          anchor: '#special-2',
          index: 1,
        },
      ];

      const options: BookmarkOptions = { enabled: true };

      const result = await generator.generateFromTOC(specialTOC, [], options);

      expect(result.bookmarks).toHaveLength(2);
      expect(result.bookmarks[0].title).toBe('Chapter & Section "1"');
      expect(result.bookmarks[1].title).toBe('Sub-section <test>');

      // Verify outline handles special characters properly
      expect(result.outline[0].title).toBe('Chapter & Section "1"');
    });
  });
});
