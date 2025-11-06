/**
 * Tests for bookmark utility functions
 */

import {
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
} from '../../../../src/core/bookmarks/bookmark-utils';

import { TOCItemNested, TOCItemFlat } from '../../../../src/core/toc/types';
import {
  BookmarkItem,
  BookmarkNode,
  PDFOutlineItem,
} from '../../../../src/core/bookmarks/types';

describe('BookmarkUtils', () => {
  describe('flattenTOCTree', () => {
    it('should flatten a nested TOC tree', () => {
      const tree: TOCItemNested[] = [
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
              pageNumber: 4,
              children: [],
            },
          ],
        },
        {
          title: 'Chapter 2',
          level: 1,
          anchor: '#chapter-2',
          pageNumber: 5,
          children: [],
        },
      ];

      const flattened = flattenTOCTree(tree);

      expect(flattened).toHaveLength(4);
      expect(flattened[0]).toEqual({
        title: 'Chapter 1',
        level: 1,
        anchor: '#chapter-1',
        pageNumber: 2,
        index: 0,
      });
      expect(flattened[1]).toEqual({
        title: 'Section 1.1',
        level: 2,
        anchor: '#section-1-1',
        pageNumber: 3,
        index: 1,
      });
    });

    it('should handle empty tree', () => {
      const flattened = flattenTOCTree([]);
      expect(flattened).toEqual([]);
    });

    it('should handle deeply nested tree', () => {
      const deepTree: TOCItemNested[] = [
        {
          title: 'H1',
          level: 1,
          anchor: '#h1',
          children: [
            {
              title: 'H2',
              level: 2,
              anchor: '#h2',
              children: [
                {
                  title: 'H3',
                  level: 3,
                  anchor: '#h3',
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      const flattened = flattenTOCTree(deepTree);
      expect(flattened).toHaveLength(3);
      expect(flattened.map((item) => item.level)).toEqual([1, 2, 3]);
    });
  });

  describe('filterBookmarksByDepth', () => {
    const bookmarks: BookmarkItem[] = [
      {
        title: 'H1',
        level: 1,
        page: 1,
        destination: '#h1',
        id: 'b1',
        parentId: undefined,
        childIds: [],
      },
      {
        title: 'H2',
        level: 2,
        page: 2,
        destination: '#h2',
        id: 'b2',
        parentId: undefined,
        childIds: [],
      },
      {
        title: 'H3',
        level: 3,
        page: 3,
        destination: '#h3',
        id: 'b3',
        parentId: undefined,
        childIds: [],
      },
      {
        title: 'H4',
        level: 4,
        page: 4,
        destination: '#h4',
        id: 'b4',
        parentId: undefined,
        childIds: [],
      },
    ];

    it('should filter bookmarks by max depth', () => {
      const filtered = filterBookmarksByDepth(bookmarks, 2);
      expect(filtered).toHaveLength(2);
      expect(filtered.every((b) => b.level <= 2)).toBe(true);
    });

    it('should filter bookmarks by min and max depth', () => {
      const filtered = filterBookmarksByDepth(bookmarks, 3, 2);
      expect(filtered).toHaveLength(2); // H2 and H3
      expect(filtered.every((b) => b.level >= 2 && b.level <= 3)).toBe(true);
    });

    it('should return empty array when no bookmarks match', () => {
      const filtered = filterBookmarksByDepth(bookmarks, 0);
      expect(filtered).toEqual([]);
    });
  });

  describe('findChildBookmarks and findParentBookmark', () => {
    const bookmarks: BookmarkItem[] = [
      {
        title: 'Parent',
        level: 1,
        page: 1,
        destination: '#parent',
        id: 'parent',
        parentId: undefined,
        childIds: ['child1', 'child2'],
      },
      {
        title: 'Child 1',
        level: 2,
        page: 2,
        destination: '#child1',
        id: 'child1',
        parentId: 'parent',
        childIds: [],
      },
      {
        title: 'Child 2',
        level: 2,
        page: 3,
        destination: '#child2',
        id: 'child2',
        parentId: 'parent',
        childIds: [],
      },
      {
        title: 'Other',
        level: 1,
        page: 4,
        destination: '#other',
        id: 'other',
        parentId: undefined,
        childIds: [],
      },
    ];

    it('should find child bookmarks', () => {
      const children = findChildBookmarks(bookmarks, 'parent');
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.id)).toEqual(['child1', 'child2']);
    });

    it('should return empty array when no children found', () => {
      const children = findChildBookmarks(bookmarks, 'other');
      expect(children).toEqual([]);
    });

    it('should find parent bookmark', () => {
      const parent = findParentBookmark(bookmarks, 'child1');
      expect(parent).toBeDefined();
      expect(parent!.id).toBe('parent');
    });

    it('should return undefined when no parent found', () => {
      const parent = findParentBookmark(bookmarks, 'parent');
      expect(parent).toBeUndefined();
    });
  });

  describe('calculateBookmarkTreeDepth', () => {
    it('should calculate depth of bookmark tree', () => {
      const tree: BookmarkNode[] = [
        {
          item: {
            title: 'H1',
            level: 1,
            page: 1,
            destination: '#h1',
            id: 'h1',
            parentId: undefined,
            childIds: [],
          },
          children: [
            {
              item: {
                title: 'H2',
                level: 2,
                page: 2,
                destination: '#h2',
                id: 'h2',
                parentId: 'h1',
                childIds: [],
              },
              children: [
                {
                  item: {
                    title: 'H3',
                    level: 3,
                    page: 3,
                    destination: '#h3',
                    id: 'h3',
                    parentId: 'h2',
                    childIds: [],
                  },
                  children: [],
                  depth: 3,
                },
              ],
              depth: 2,
            },
          ],
          depth: 1,
        },
      ];

      const depth = calculateBookmarkTreeDepth(tree);
      expect(depth).toBe(3);
    });

    it('should return 0 for empty tree', () => {
      const depth = calculateBookmarkTreeDepth([]);
      expect(depth).toBe(0);
    });

    it('should handle flat tree', () => {
      const tree: BookmarkNode[] = [
        {
          item: {
            title: 'H1',
            level: 1,
            page: 1,
            destination: '#h1',
            id: 'h1',
            parentId: undefined,
            childIds: [],
          },
          children: [],
          depth: 1,
        },
        {
          item: {
            title: 'H2',
            level: 1,
            page: 2,
            destination: '#h2',
            id: 'h2',
            parentId: undefined,
            childIds: [],
          },
          children: [],
          depth: 1,
        },
      ];

      const depth = calculateBookmarkTreeDepth(tree);
      expect(depth).toBe(1);
    });
  });

  describe('validateBookmarkHierarchy', () => {
    it('should validate correct hierarchy', () => {
      const validBookmarks: BookmarkItem[] = [
        {
          title: 'Parent',
          level: 1,
          page: 1,
          destination: '#parent',
          id: 'parent',
          parentId: undefined,
          childIds: ['child'],
        },
        {
          title: 'Child',
          level: 2,
          page: 2,
          destination: '#child',
          id: 'child',
          parentId: 'parent',
          childIds: [],
        },
      ];

      const result = validateBookmarkHierarchy(validBookmarks);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid parent reference', () => {
      const invalidBookmarks: BookmarkItem[] = [
        {
          title: 'Child',
          level: 2,
          page: 2,
          destination: '#child',
          id: 'child',
          parentId: 'nonexistent',
          childIds: [],
        },
      ];

      const result = validateBookmarkHierarchy(invalidBookmarks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Bookmark child has invalid parent nonexistent',
      );
    });

    it('should detect incorrect level hierarchy', () => {
      const invalidBookmarks: BookmarkItem[] = [
        {
          title: 'Parent',
          level: 2,
          page: 1,
          destination: '#parent',
          id: 'parent',
          parentId: undefined,
          childIds: ['child'],
        },
        {
          title: 'Child',
          level: 1,
          page: 2,
          destination: '#child',
          id: 'child',
          parentId: 'parent',
          childIds: [],
        },
      ];

      const result = validateBookmarkHierarchy(invalidBookmarks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Bookmark child (level 1) cannot be child of parent (level 2)',
      );
    });

    it('should detect invalid child reference', () => {
      const invalidBookmarks: BookmarkItem[] = [
        {
          title: 'Parent',
          level: 1,
          page: 1,
          destination: '#parent',
          id: 'parent',
          parentId: undefined,
          childIds: ['nonexistent'],
        },
      ];

      const result = validateBookmarkHierarchy(invalidBookmarks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Bookmark parent references non-existent child nonexistent',
      );
    });
  });

  describe('sortBookmarksByDocumentOrder', () => {
    it('should sort bookmarks by page number', () => {
      const unsorted: BookmarkItem[] = [
        {
          title: 'C',
          level: 1,
          page: 5,
          destination: '#c',
          id: 'c',
          parentId: undefined,
          childIds: [],
        },
        {
          title: 'A',
          level: 1,
          page: 1,
          destination: '#a',
          id: 'a',
          parentId: undefined,
          childIds: [],
        },
        {
          title: 'B',
          level: 1,
          page: 3,
          destination: '#b',
          id: 'b',
          parentId: undefined,
          childIds: [],
        },
      ];

      const sorted = sortBookmarksByDocumentOrder(unsorted);
      expect(sorted.map((b) => b.title)).toEqual(['A', 'B', 'C']);
    });

    it('should sort by level when page numbers are same', () => {
      const unsorted: BookmarkItem[] = [
        {
          title: 'H2',
          level: 2,
          page: 1,
          destination: '#h2',
          id: 'h2',
          parentId: undefined,
          childIds: [],
        },
        {
          title: 'H1',
          level: 1,
          page: 1,
          destination: '#h1',
          id: 'h1',
          parentId: undefined,
          childIds: [],
        },
        {
          title: 'H3',
          level: 3,
          page: 1,
          destination: '#h3',
          id: 'h3',
          parentId: undefined,
          childIds: [],
        },
      ];

      const sorted = sortBookmarksByDocumentOrder(unsorted);
      expect(sorted.map((b) => b.title)).toEqual(['H1', 'H2', 'H3']);
    });

    it('should sort alphabetically when page and level are same', () => {
      const unsorted: BookmarkItem[] = [
        {
          title: 'Z Section',
          level: 1,
          page: 1,
          destination: '#z',
          id: 'z',
          parentId: undefined,
          childIds: [],
        },
        {
          title: 'A Section',
          level: 1,
          page: 1,
          destination: '#a',
          id: 'a',
          parentId: undefined,
          childIds: [],
        },
        {
          title: 'M Section',
          level: 1,
          page: 1,
          destination: '#m',
          id: 'm',
          parentId: undefined,
          childIds: [],
        },
      ];

      const sorted = sortBookmarksByDocumentOrder(unsorted);
      expect(sorted.map((b) => b.title)).toEqual([
        'A Section',
        'M Section',
        'Z Section',
      ]);
    });
  });

  describe('generateBookmarkId', () => {
    it('should generate valid bookmark ID', () => {
      const id = generateBookmarkId('Chapter 1: Introduction', 1, 0);
      expect(id).toBe('bookmark-1-chapter-1-introduction-0');
    });

    it('should handle special characters', () => {
      const id = generateBookmarkId('Section & Subsection "Test"', 2, 5);
      expect(id).toBe('bookmark-2-section-subsection-test-5');
    });

    it('should handle empty title', () => {
      const id = generateBookmarkId('', 1, 0);
      expect(id).toBe('bookmark-1--0');
    });
  });

  describe('bookmarkTreeToSimpleOutline', () => {
    it('should convert tree to simple outline', () => {
      const tree: BookmarkNode[] = [
        {
          item: {
            title: 'Chapter 1',
            level: 1,
            page: 2,
            destination: '#ch1',
            id: 'ch1',
            parentId: undefined,
            childIds: [],
          },
          children: [
            {
              item: {
                title: 'Section 1.1',
                level: 2,
                page: 3,
                destination: '#s11',
                id: 's11',
                parentId: 'ch1',
                childIds: [],
              },
              children: [],
              depth: 2,
            },
          ],
          depth: 1,
        },
      ];

      const outline = bookmarkTreeToSimpleOutline(tree);
      expect(outline).toEqual([
        '- Chapter 1 (Page 2)',
        '  - Section 1.1 (Page 3)',
      ]);
    });

    it('should handle bookmarks without page numbers', () => {
      const tree: BookmarkNode[] = [
        {
          item: {
            title: 'Chapter',
            level: 1,
            page: 1,
            destination: '#ch',
            id: 'ch',
            parentId: undefined,
            childIds: [],
          },
          children: [],
          depth: 1,
        },
      ];

      const outline = bookmarkTreeToSimpleOutline(tree);
      expect(outline).toEqual(['- Chapter']);
    });
  });

  describe('extractBookmarkStatistics', () => {
    const bookmarks: BookmarkItem[] = [
      {
        title: 'H1',
        level: 1,
        page: 2,
        destination: '#h1',
        id: 'h1',
        parentId: undefined,
        childIds: ['h2'],
      },
      {
        title: 'H2',
        level: 2,
        page: 3,
        destination: '#h2',
        id: 'h2',
        parentId: 'h1',
        childIds: [],
      },
      {
        title: 'H1-2',
        level: 1,
        page: 4,
        destination: '#h1-2',
        id: 'h1-2',
        parentId: undefined,
        childIds: [],
      },
    ];

    it('should extract correct statistics', () => {
      const stats = extractBookmarkStatistics(bookmarks);

      expect(stats).toEqual({
        total: 3,
        byLevel: { 1: 2, 2: 1 },
        maxDepth: 2,
        withPageNumbers: 3,
        hierarchical: 2,
      });
    });

    it('should handle empty bookmarks array', () => {
      const stats = extractBookmarkStatistics([]);
      expect(stats).toEqual({
        total: 0,
        byLevel: {},
        maxDepth: 0,
        withPageNumbers: 0,
        hierarchical: 0,
      });
    });
  });

  describe('mergeBookmarkTrees', () => {
    it('should merge multiple bookmark trees', () => {
      const tree1: BookmarkNode[] = [
        {
          item: {
            title: 'Tree1',
            level: 1,
            page: 1,
            destination: '#t1',
            id: 't1',
            parentId: undefined,
            childIds: [],
          },
          children: [],
          depth: 1,
        },
      ];

      const tree2: BookmarkNode[] = [
        {
          item: {
            title: 'Tree2',
            level: 1,
            page: 2,
            destination: '#t2',
            id: 't2',
            parentId: undefined,
            childIds: [],
          },
          children: [],
          depth: 1,
        },
      ];

      const merged = mergeBookmarkTrees([tree1, tree2]);
      expect(merged).toHaveLength(2);
      expect(merged.map((n) => n.item.title)).toEqual(['Tree1', 'Tree2']);
    });

    it('should remove duplicates', () => {
      const duplicateNode = {
        item: {
          title: 'Same',
          level: 1,
          page: 1,
          destination: '#same',
          id: 'same',
          parentId: undefined,
          childIds: [],
        },
        children: [],
        depth: 1,
      };

      const tree1 = [duplicateNode];
      const tree2 = [duplicateNode];

      const merged = mergeBookmarkTrees([tree1, tree2]);
      expect(merged).toHaveLength(1);
    });
  });

  describe('outlineToBookmarks', () => {
    it('should convert PDF outline back to bookmarks', () => {
      const outline: PDFOutlineItem[] = [
        {
          title: 'Chapter 1',
          dest: 2,
          children: [
            {
              title: 'Section 1.1',
              dest: '#section-1-1',
            },
          ],
        },
      ];

      const bookmarks = outlineToBookmarks(outline);

      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0]).toEqual({
        title: 'Chapter 1',
        level: 1,
        page: 2,
        destination: '#page2',
        id: 'converted-0',
        parentId: undefined,
        childIds: expect.any(Array),
      });

      expect(bookmarks[1]).toEqual({
        title: 'Section 1.1',
        level: 2,
        page: 1,
        destination: '#section-1-1',
        id: 'converted-1',
        parentId: 'converted-0',
        childIds: [],
      });
    });

    it('should handle empty outline', () => {
      const bookmarks = outlineToBookmarks([]);
      expect(bookmarks).toEqual([]);
    });
  });
});
