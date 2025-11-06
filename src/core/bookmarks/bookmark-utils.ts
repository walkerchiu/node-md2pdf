/**
 * PDF Bookmark Utility Functions
 * Helper functions for bookmark conversion and manipulation
 */

import { TOCItemFlat, TOCItemNested } from '../toc/types';

import { BookmarkItem, BookmarkNode, PDFOutlineItem } from './types';

/**
 * Convert TOC tree structure to flat bookmark array
 */
export function flattenTOCTree(tree: TOCItemNested[]): TOCItemFlat[] {
  const flattened: TOCItemFlat[] = [];

  function traverse(items: TOCItemNested[], index = 0): number {
    for (const item of items) {
      flattened.push({
        title: item.title,
        level: item.level,
        anchor: item.anchor,
        pageNumber: item.pageNumber || 1,
        index: index++,
      });

      if (item.children && item.children.length > 0) {
        index = traverse(item.children, index);
      }
    }

    return index;
  }

  traverse(tree);
  return flattened;
}

/**
 * Filter bookmarks by depth and options
 */
export function filterBookmarksByDepth(
  bookmarks: BookmarkItem[],
  maxDepth: number,
  minLevel = 1,
): BookmarkItem[] {
  return bookmarks.filter(
    (bookmark) => bookmark.level >= minLevel && bookmark.level <= maxDepth,
  );
}

/**
 * Find all child bookmarks of a given bookmark
 */
export function findChildBookmarks(
  bookmarks: BookmarkItem[],
  parentId: string,
): BookmarkItem[] {
  return bookmarks.filter((bookmark) => bookmark.parentId === parentId);
}

/**
 * Find parent bookmark of a given bookmark
 */
export function findParentBookmark(
  bookmarks: BookmarkItem[],
  bookmarkId: string,
): BookmarkItem | undefined {
  const bookmark = bookmarks.find((b) => b.id === bookmarkId);
  if (!bookmark || !bookmark.parentId) return undefined;

  return bookmarks.find((b) => b.id === bookmark.parentId);
}

/**
 * Calculate bookmark tree depth
 */
export function calculateBookmarkTreeDepth(tree: BookmarkNode[]): number {
  if (tree.length === 0) return 0;

  return Math.max(
    ...tree.map((node) => {
      if (node.children.length === 0) return node.depth;
      return Math.max(node.depth, calculateBookmarkTreeDepth(node.children));
    }),
  );
}

/**
 * Validate bookmark hierarchy consistency
 */
export function validateBookmarkHierarchy(bookmarks: BookmarkItem[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const bookmarkMap = new Map<string, BookmarkItem>();

  // Build bookmark map
  for (const bookmark of bookmarks) {
    bookmarkMap.set(bookmark.id, bookmark);
  }

  // Validate each bookmark
  for (const bookmark of bookmarks) {
    // Check parent-child consistency
    if (bookmark.parentId) {
      const parent = bookmarkMap.get(bookmark.parentId);
      if (!parent) {
        errors.push(
          `Bookmark ${bookmark.id} has invalid parent ${bookmark.parentId}`,
        );
      } else if (parent.level >= bookmark.level) {
        errors.push(
          `Bookmark ${bookmark.id} (level ${bookmark.level}) cannot be child of ${parent.id} (level ${parent.level})`,
        );
      } else if (!parent.childIds.includes(bookmark.id)) {
        errors.push(
          `Parent ${parent.id} does not include ${bookmark.id} in childIds`,
        );
      }
    }

    // Check child references
    for (const childId of bookmark.childIds) {
      const child = bookmarkMap.get(childId);
      if (!child) {
        errors.push(
          `Bookmark ${bookmark.id} references non-existent child ${childId}`,
        );
      } else if (child.parentId !== bookmark.id) {
        errors.push(
          `Child ${childId} does not reference ${bookmark.id} as parent`,
        );
      }
    }

    // Validate level progression
    if (bookmark.level < 1 || bookmark.level > 6) {
      errors.push(
        `Bookmark ${bookmark.id} has invalid level ${bookmark.level}`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sort bookmarks by document order (level and position)
 */
export function sortBookmarksByDocumentOrder(
  bookmarks: BookmarkItem[],
): BookmarkItem[] {
  return [...bookmarks].sort((a, b) => {
    // Primary sort: by page number if available
    if (a.page !== b.page) {
      return a.page - b.page;
    }

    // Secondary sort: by level (higher level = more specific)
    if (a.level !== b.level) {
      return a.level - b.level;
    }

    // Tertiary sort: by title alphabetically
    return a.title.localeCompare(b.title);
  });
}

/**
 * Generate unique bookmark ID based on content
 */
export function generateBookmarkId(
  title: string,
  level: number,
  index: number,
): string {
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `bookmark-${level}-${sanitizedTitle}-${index}`;
}

/**
 * Convert bookmark tree to simple outline format
 */
export function bookmarkTreeToSimpleOutline(tree: BookmarkNode[]): string[] {
  const outline: string[] = [];

  function traverse(nodes: BookmarkNode[], indent = 0): void {
    for (const node of nodes) {
      const prefix = '  '.repeat(indent);
      const pageInfo = node.item.page > 1 ? ` (Page ${node.item.page})` : '';
      outline.push(`${prefix}- ${node.item.title}${pageInfo}`);

      if (node.children.length > 0) {
        traverse(node.children, indent + 1);
      }
    }
  }

  traverse(tree);
  return outline;
}

/**
 * Extract bookmark statistics
 */
export function extractBookmarkStatistics(bookmarks: BookmarkItem[]): {
  total: number;
  byLevel: Record<number, number>;
  maxDepth: number;
  withPageNumbers: number;
  hierarchical: number;
} {
  const stats = {
    total: bookmarks.length,
    byLevel: {} as Record<number, number>,
    maxDepth: 0,
    withPageNumbers: 0,
    hierarchical: 0,
  };

  for (const bookmark of bookmarks) {
    // Count by level
    stats.byLevel[bookmark.level] = (stats.byLevel[bookmark.level] || 0) + 1;

    // Track max depth
    stats.maxDepth = Math.max(stats.maxDepth, bookmark.level);

    // Count bookmarks with page numbers
    if (bookmark.page > 1) {
      stats.withPageNumbers++;
    }

    // Count hierarchical bookmarks (those with parent or children)
    if (bookmark.parentId || bookmark.childIds.length > 0) {
      stats.hierarchical++;
    }
  }

  return stats;
}

/**
 * Merge multiple bookmark trees
 */
export function mergeBookmarkTrees(trees: BookmarkNode[][]): BookmarkNode[] {
  const mergedTree: BookmarkNode[] = [];
  const processedIds = new Set<string>();

  for (const tree of trees) {
    for (const node of tree) {
      if (!processedIds.has(node.item.id)) {
        mergedTree.push(node);
        processedIds.add(node.item.id);
      }
    }
  }

  return mergedTree;
}

/**
 * Convert PDF outline back to bookmark items (for testing/debugging)
 */
export function outlineToBookmarks(
  outline: PDFOutlineItem[],
  parentId?: string,
): BookmarkItem[] {
  const bookmarks: BookmarkItem[] = [];
  let index = 0;

  function traverse(items: PDFOutlineItem[], parent?: string, level = 1): void {
    for (const item of items) {
      const bookmarkId = `converted-${index++}`;
      const bookmark: BookmarkItem = {
        title: item.title,
        level,
        page: typeof item.dest === 'number' ? item.dest : 1,
        destination:
          typeof item.dest === 'string' ? item.dest : `#page${item.dest || 1}`,
        id: bookmarkId,
        parentId: parent,
        childIds: [],
      };

      bookmarks.push(bookmark);

      if (item.children && item.children.length > 0) {
        traverse(item.children, bookmarkId, level + 1);
        bookmark.childIds = item.children.map(() => `converted-${index}`);
      }
    }
  }

  traverse(outline, parentId);
  return bookmarks;
}
