/**
 * TOCGenerator Unit Tests
 */

import { TOCGenerator } from '../../../../src/core/toc/toc-generator';
import { Heading } from '../../../../src/types/index';

describe('TOCGenerator', () => {
  let tocGenerator: TOCGenerator;

  beforeEach(() => {
    tocGenerator = new TOCGenerator({
      maxDepth: 3,
      includePageNumbers: false,
    });
  });

  describe('constructor', () => {
    it('should create TOCGenerator with default options', () => {
      const generator = new TOCGenerator({ maxDepth: 2 });
      const options = generator.getOptions();

      expect(options.maxDepth).toBe(2);
      expect(options.includePageNumbers).toBe(false);
      expect(options.cssClasses?.container).toBe('toc-container');
    });

    it('should validate maxDepth range', () => {
      expect(() => new TOCGenerator({ maxDepth: 0 })).toThrow(
        'TOC maxDepth must be between 1 and 6',
      );
      expect(() => new TOCGenerator({ maxDepth: 7 })).toThrow(
        'TOC maxDepth must be between 1 and 6',
      );
    });

    it('should accept custom CSS classes', () => {
      const generator = new TOCGenerator({
        maxDepth: 3,
        cssClasses: {
          container: 'custom-toc',
          title: 'custom-title',
        },
      });

      const options = generator.getOptions();
      expect(options.cssClasses?.container).toBe('custom-toc');
      expect(options.cssClasses?.title).toBe('custom-title');
      expect(options.cssClasses?.list).toBe('toc-list'); // Default value should remain
    });
  });

  describe('generateTOC', () => {
    const sampleHeadings: Heading[] = [
      {
        level: 1,
        text: 'Introduction',
        id: 'introduction',
        anchor: '#introduction',
      },
      {
        level: 2,
        text: 'Getting Started',
        id: 'getting-started',
        anchor: '#getting-started',
      },
      {
        level: 3,
        text: 'Installation',
        id: 'installation',
        anchor: '#installation',
      },
      {
        level: 3,
        text: 'Configuration',
        id: 'configuration',
        anchor: '#configuration',
      },
      {
        level: 2,
        text: 'Advanced Topics',
        id: 'advanced-topics',
        anchor: '#advanced-topics',
      },
      {
        level: 4,
        text: 'Deep Nesting',
        id: 'deep-nesting',
        anchor: '#deep-nesting',
      },
      { level: 1, text: 'Conclusion', id: 'conclusion', anchor: '#conclusion' },
    ];

    it('should generate empty result for no headings', () => {
      const result = tocGenerator.generateTOC([]);

      expect(result.html).toBe('');
      expect(result.items).toHaveLength(0);
      expect(result.tree).toHaveLength(0);
      expect(result.stats.totalItems).toBe(0);
    });

    it('should filter headings by maxDepth', () => {
      const generator = new TOCGenerator({ maxDepth: 2 });
      const result = generator.generateTOC(sampleHeadings);

      expect(result.items).toHaveLength(4); // Only H1 and H2
      expect(result.items.every((item) => item.level <= 2)).toBe(true);
      expect(result.stats.maxDepth).toBe(2);
    });

    it('should convert headings to flat items correctly', () => {
      const result = tocGenerator.generateTOC(sampleHeadings);

      expect(result.items).toHaveLength(6); // Excluding H4 (level 4 > maxDepth 3)
      expect(result.items[0]).toEqual({
        title: 'Introduction',
        level: 1,
        anchor: '#introduction',
        index: 0,
      });
    });

    it('should build hierarchical structure correctly', () => {
      const result = tocGenerator.generateTOC(sampleHeadings);

      expect(result.tree).toHaveLength(2); // Two top-level H1 items
      expect(result.tree[0].title).toBe('Introduction');
      expect(result.tree[0].children).toHaveLength(2); // Two H2 children
      expect(result.tree[0].children[0].title).toBe('Getting Started');
      expect(result.tree[0].children[0].children).toHaveLength(2); // Two H3 children
      expect(result.tree[1].title).toBe('Conclusion');
      expect(result.tree[1].children).toHaveLength(0); // No children
    });

    it('should generate correct HTML structure', () => {
      const result = tocGenerator.generateTOC(sampleHeadings.slice(0, 3)); // First 3 headings

      expect(result.html).toContain('<div class="toc-container">');
      expect(result.html).toContain('<h2 class="toc-title">目錄</h2>');
      expect(result.html).toContain('<ul class="toc-list">');
      expect(result.html).toContain('<a href="#introduction"');
      expect(result.html).toContain('Introduction');
      expect(result.html).toContain('Getting Started');
      expect(result.html).toContain('Installation');
    });

    it('should escape HTML in titles', () => {
      const headingsWithHtml: Heading[] = [
        {
          level: 1,
          text: '<script>alert("xss")</script>',
          id: 'unsafe',
          anchor: '#unsafe',
        },
        {
          level: 2,
          text: 'Title with "quotes" & ampersand',
          id: 'quotes',
          anchor: '#quotes',
        },
      ];

      const result = tocGenerator.generateTOC(headingsWithHtml);

      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).toContain('&quot;quotes&quot;');
      expect(result.html).toContain('&amp; ampersand');
      expect(result.html).not.toContain('<script>');
    });

    it('should calculate statistics correctly', () => {
      const result = tocGenerator.generateTOC(sampleHeadings);

      expect(result.stats.totalItems).toBe(6);
      expect(result.stats.maxDepth).toBe(3);
      expect(result.stats.itemsByLevel).toEqual({
        1: 2, // Two H1
        2: 2, // Two H2
        3: 2, // Two H3
      });
    });
  });

  describe('page number handling', () => {
    const headings: Heading[] = [
      { level: 1, text: 'Chapter 1', id: 'chapter-1', anchor: '#chapter-1' },
      {
        level: 2,
        text: 'Section 1.1',
        id: 'section-1-1',
        anchor: '#section-1-1',
      },
    ];

    it('should handle page numbers when enabled', () => {
      const generator = new TOCGenerator({
        maxDepth: 3,
        includePageNumbers: true,
      });

      const result = generator.generateTOC(headings);
      expect(result.html).toContain('toc-page-number');
    });

    it('should update page numbers correctly', () => {
      const result = tocGenerator.generateTOC(headings);
      const pageNumbers = { 'chapter-1': 5, 'section-1-1': 8 };

      tocGenerator.updatePageNumbers(result.items, pageNumbers);

      expect(result.items[0].pageNumber).toBe(5);
      expect(result.items[1].pageNumber).toBe(8);
    });

    it('should generate TOC with page numbers', () => {
      const pageNumbers = { 'chapter-1': 5, 'section-1-1': 8 };

      const result = tocGenerator.generateTOCWithPageNumbers(
        headings,
        pageNumbers,
      );

      expect(result.items[0].pageNumber).toBe(5);
      expect(result.items[1].pageNumber).toBe(8);

      if (tocGenerator.getOptions().includePageNumbers) {
        expect(result.html).toContain('5');
        expect(result.html).toContain('8');
      }
    });
  });

  describe('Chinese content handling', () => {
    const chineseHeadings: Heading[] = [
      { level: 1, text: '第一章：簡介', id: 'chapter-1', anchor: '#chapter-1' },
      {
        level: 2,
        text: '1.1 專案概述',
        id: 'section-1-1',
        anchor: '#section-1-1',
      },
      {
        level: 3,
        text: '技術架構與實現',
        id: 'architecture',
        anchor: '#architecture',
      },
    ];

    it('should handle Chinese headings correctly', () => {
      const result = tocGenerator.generateTOC(chineseHeadings);

      expect(result.html).toContain('第一章：簡介');
      expect(result.html).toContain('1.1 專案概述');
      expect(result.html).toContain('技術架構與實現');
      expect(result.items[0].title).toBe('第一章：簡介');
    });

    it('should preserve Chinese characters in hierarchy', () => {
      const result = tocGenerator.generateTOC(chineseHeadings);

      expect(result.tree[0].title).toBe('第一章：簡介');
      expect(result.tree[0].children[0].title).toBe('1.1 專案概述');
      expect(result.tree[0].children[0].children[0].title).toBe(
        '技術架構與實現',
      );
    });
  });

  describe('updateOptions', () => {
    it('should update options correctly', () => {
      tocGenerator.updateOptions({
        maxDepth: 5,
        includePageNumbers: true,
      });

      const options = tocGenerator.getOptions();
      expect(options.maxDepth).toBe(5);
      expect(options.includePageNumbers).toBe(true);
    });

    it('should merge CSS classes correctly', () => {
      tocGenerator.updateOptions({
        cssClasses: {
          container: 'new-container',
          title: 'new-title',
        },
      });

      const options = tocGenerator.getOptions();
      expect(options.cssClasses?.container).toBe('new-container');
      expect(options.cssClasses?.title).toBe('new-title');
      expect(options.cssClasses?.list).toBe('toc-list'); // Should remain unchanged
    });

    it('should validate maxDepth when updated', () => {
      expect(() => {
        tocGenerator.updateOptions({ maxDepth: 0 });
      }).toThrow('TOC maxDepth must be between 1 and 6');
    });
  });

  describe('edge cases', () => {
    it('should handle empty heading text', () => {
      const headings: Heading[] = [
        { level: 1, text: '', id: 'empty', anchor: '#empty' },
        { level: 2, text: '   ', id: 'whitespace', anchor: '#whitespace' },
      ];

      const result = tocGenerator.generateTOC(headings);

      expect(result.items[0].title).toBe('');
      expect(result.items[1].title).toBe('');
    });

    it('should handle inconsistent heading levels', () => {
      const headings: Heading[] = [
        { level: 1, text: 'H1', id: 'h1', anchor: '#h1' },
        { level: 4, text: 'H4', id: 'h4', anchor: '#h4' }, // This will be filtered out (level 4 > maxDepth 3)
        { level: 2, text: 'H2', id: 'h2', anchor: '#h2' },
      ];

      const result = tocGenerator.generateTOC(headings);

      expect(result.tree).toHaveLength(1); // Only H1 at root
      expect(result.tree[0].children).toHaveLength(1); // Only H2 as child (H4 filtered out)
      expect(result.tree[0].children[0].title).toBe('H2');
    });

    it('should handle missing anchors', () => {
      const headings: Heading[] = [
        { level: 1, text: 'Title', id: '', anchor: '' },
      ];

      const result = tocGenerator.generateTOC(headings);

      expect(result.items[0].anchor).toBe('');
      expect(result.html).toContain('href=""');
    });
  });
});
