/**
 * PDF Bookmarks Module
 * Provides PDF navigation bookmark generation functionality
 */

// Main classes
export { BookmarkGenerator } from './bookmark-generator';

// Import types we need for the exports below
import { BookmarkGenerator } from './bookmark-generator';

import type { BookmarkOptions, BookmarkGeneratorConfig } from './types';

// Type definitions
export type {
  BookmarkOptions,
  BookmarkItem,
  BookmarkNode,
  BookmarkGenerationResult,
  PDFOutlineItem,
  BookmarkGeneratorConfig,
  BookmarkConversionContext,
} from './types';

// Utility functions
export {
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
} from './bookmark-utils';

// Default configurations
export const DEFAULT_BOOKMARK_OPTIONS: BookmarkOptions = {
  enabled: true,
  maxDepth: 3,
  includePageNumbers: true,
  useExistingTOC: true,
  styling: {
    fontSize: 12,
    textColor: '#000000',
    highlightColor: '#0066cc',
  },
};

/**
 * Create a bookmark generator with default configuration
 */
export function createBookmarkGenerator(
  config?: Partial<BookmarkGeneratorConfig>,
): BookmarkGenerator {
  return new BookmarkGenerator(undefined, config);
}

/**
 * Quick bookmark generation from TOC data
 */
export async function generateBookmarksFromTOC(
  tocItems: Array<{
    title: string;
    level: number;
    anchor: string;
    pageNumber?: number;
    index: number;
  }>,
  options: Partial<BookmarkOptions> = {},
) {
  const generator = createBookmarkGenerator();
  const fullOptions = { ...DEFAULT_BOOKMARK_OPTIONS, ...options };

  // Convert to nested structure (simplified for this helper)
  const tocTree = tocItems.map((item) => ({
    ...item,
    children: [],
  }));

  return generator.generateFromTOC(tocItems, tocTree, fullOptions);
}
