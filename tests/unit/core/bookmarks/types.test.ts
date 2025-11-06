/**
 * Tests for PDF Bookmarks type definitions
 */

import {
  BookmarkOptions,
  BookmarkItem,
  BookmarkNode,
  BookmarkGenerationResult,
  PDFOutlineItem,
  BookmarkGeneratorConfig,
  BookmarkConversionContext,
} from '../../../../src/core/bookmarks/types';

describe('Bookmark Types', () => {
  describe('BookmarkOptions', () => {
    it('should have correct interface structure', () => {
      const options: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
        useExistingTOC: false,
      };

      expect(options.enabled).toBe(true);
      expect(options.maxDepth).toBe(3);
      expect(options.includePageNumbers).toBe(true);
      expect(options.useExistingTOC).toBe(false);
    });

    it('should support styling options', () => {
      const options: BookmarkOptions = {
        enabled: true,
        styling: {
          fontSize: 12,
          textColor: '#333333',
          highlightColor: '#007ACC',
        },
      };

      expect(options.styling).toBeDefined();
      expect(options.styling?.fontSize).toBe(12);
      expect(options.styling?.textColor).toBe('#333333');
      expect(options.styling?.highlightColor).toBe('#007ACC');
    });

    it('should support minimal configuration', () => {
      const options: BookmarkOptions = {
        enabled: false,
      };

      expect(options.enabled).toBe(false);
      expect(options.maxDepth).toBeUndefined();
      expect(options.includePageNumbers).toBeUndefined();
      expect(options.useExistingTOC).toBeUndefined();
    });
  });

  describe('BookmarkItem', () => {
    it('should have correct interface structure', () => {
      const bookmark: BookmarkItem = {
        title: 'Chapter 1',
        level: 1,
        page: 2,
        destination: '#chapter-1',
        id: 'bookmark-1',
        parentId: undefined,
        childIds: ['bookmark-1-1', 'bookmark-1-2'],
      };

      expect(bookmark.title).toBe('Chapter 1');
      expect(bookmark.level).toBe(1);
      expect(bookmark.page).toBe(2);
      expect(bookmark.destination).toBe('#chapter-1');
      expect(bookmark.id).toBe('bookmark-1');
      expect(bookmark.parentId).toBeUndefined();
      expect(bookmark.childIds).toEqual(['bookmark-1-1', 'bookmark-1-2']);
    });

    it('should support hierarchical structure', () => {
      const parentBookmark: BookmarkItem = {
        title: 'Parent',
        level: 1,
        page: 1,
        destination: '#parent',
        id: 'parent',
        parentId: undefined,
        childIds: ['child'],
      };

      const childBookmark: BookmarkItem = {
        title: 'Child',
        level: 2,
        page: 2,
        destination: '#child',
        id: 'child',
        parentId: 'parent',
        childIds: [],
      };

      expect(parentBookmark.childIds).toContain('child');
      expect(childBookmark.parentId).toBe('parent');
    });
  });

  describe('BookmarkNode', () => {
    it('should have correct interface structure', () => {
      const bookmarkItem: BookmarkItem = {
        title: 'Test Chapter',
        level: 1,
        page: 1,
        destination: '#test',
        id: 'test',
        parentId: undefined,
        childIds: [],
      };

      const node: BookmarkNode = {
        item: bookmarkItem,
        children: [],
        depth: 1,
      };

      expect(node.item).toBe(bookmarkItem);
      expect(node.children).toEqual([]);
      expect(node.parent).toBeUndefined();
      expect(node.depth).toBe(1);
    });

    it('should support hierarchical node structure', () => {
      const parentItem: BookmarkItem = {
        title: 'Parent',
        level: 1,
        page: 1,
        destination: '#parent',
        id: 'parent',
        parentId: undefined,
        childIds: ['child'],
      };

      const childItem: BookmarkItem = {
        title: 'Child',
        level: 2,
        page: 2,
        destination: '#child',
        id: 'child',
        parentId: 'parent',
        childIds: [],
      };

      const parentNode: BookmarkNode = {
        item: parentItem,
        children: [],
        depth: 1,
      };

      const childNode: BookmarkNode = {
        item: childItem,
        children: [],
        parent: parentNode,
        depth: 2,
      };

      parentNode.children = [childNode];

      expect(parentNode.children.length).toBe(1);
      expect(childNode.parent).toBe(parentNode);
      expect(childNode.depth).toBe(2);
    });
  });

  describe('BookmarkGenerationResult', () => {
    it('should have correct interface structure', () => {
      const bookmark: BookmarkItem = {
        title: 'Test',
        level: 1,
        page: 1,
        destination: '#test',
        id: 'test',
        parentId: undefined,
        childIds: [],
      };

      const node: BookmarkNode = {
        item: bookmark,
        children: [],
        depth: 1,
      };

      const outline: PDFOutlineItem = {
        title: 'Test',
        dest: '#test',
      };

      const result: BookmarkGenerationResult = {
        bookmarks: [bookmark],
        tree: [node],
        outline: [outline],
        metadata: {
          totalBookmarks: 1,
          maxDepth: 1,
          bookmarksByLevel: { 1: 1 },
          generationTime: 100,
          sourceType: 'headings',
        },
      };

      expect(result.bookmarks.length).toBe(1);
      expect(result.tree.length).toBe(1);
      expect(result.outline.length).toBe(1);
      expect(result.metadata.totalBookmarks).toBe(1);
      expect(result.metadata.maxDepth).toBe(1);
      expect(result.metadata.sourceType).toBe('headings');
    });
  });

  describe('PDFOutlineItem', () => {
    it('should have correct interface structure', () => {
      const outline: PDFOutlineItem = {
        title: 'Chapter 1',
        dest: '#chapter-1',
        expanded: true,
        style: {
          fontSize: 14,
          color: '#000000',
          bold: true,
          italic: false,
        },
      };

      expect(outline.title).toBe('Chapter 1');
      expect(outline.dest).toBe('#chapter-1');
      expect(outline.expanded).toBe(true);
      expect(outline.style?.fontSize).toBe(14);
      expect(outline.style?.bold).toBe(true);
    });

    it('should support nested outline structure', () => {
      const childOutline: PDFOutlineItem = {
        title: 'Section 1.1',
        dest: '#section-1-1',
      };

      const parentOutline: PDFOutlineItem = {
        title: 'Chapter 1',
        dest: '#chapter-1',
        children: [childOutline],
      };

      expect(parentOutline.children?.length).toBe(1);
      expect(parentOutline.children?.[0]).toBe(childOutline);
    });

    it('should support minimal outline configuration', () => {
      const outline: PDFOutlineItem = {
        title: 'Simple Title',
      };

      expect(outline.title).toBe('Simple Title');
      expect(outline.dest).toBeUndefined();
      expect(outline.children).toBeUndefined();
      expect(outline.expanded).toBeUndefined();
      expect(outline.style).toBeUndefined();
    });
  });

  describe('BookmarkGeneratorConfig', () => {
    it('should have correct interface structure', () => {
      const config: BookmarkGeneratorConfig = {
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
          maxDepth: 6,
          minLevel: 1,
          autoExpandLevels: 2,
        },
      };

      expect(config.dataSource.preferTOC).toBe(true);
      expect(config.pageNumbers.enabled).toBe(true);
      expect(config.pageNumbers.detectionMethod).toBe('toc');
      expect(config.hierarchy.maxDepth).toBe(6);
    });
  });

  describe('BookmarkConversionContext', () => {
    it('should have correct interface structure', () => {
      const context: BookmarkConversionContext = {
        document: {
          filePath: '/path/to/file.md',
          title: 'Test Document',
          totalPages: 10,
        },
        options: {
          enabled: true,
          maxDepth: 3,
        },
        processing: {
          startTime: Date.now(),
          engineType: 'puppeteer',
          htmlContent: '<html><body></body></html>',
        },
      };

      expect(context.document.filePath).toBe('/path/to/file.md');
      expect(context.document.title).toBe('Test Document');
      expect(context.document.totalPages).toBe(10);
      expect(context.options.enabled).toBe(true);
      expect(context.processing.engineType).toBe('puppeteer');
    });

    it('should support optional TOC data', () => {
      const context: BookmarkConversionContext = {
        tocData: {
          items: [],
          tree: [],
        },
        document: {
          filePath: '/path/to/file.md',
        },
        options: {
          enabled: true,
        },
        processing: {
          startTime: Date.now(),
          engineType: 'puppeteer',
          htmlContent: '<html></html>',
        },
      };

      expect(context.tocData).toBeDefined();
      expect(context.tocData?.items).toEqual([]);
      expect(context.tocData?.tree).toEqual([]);
    });
  });
});
