/**
 * Unit tests for PageEstimator
 */

import { PageEstimator } from '../../../../src/core/toc/page-estimator';
import { Heading } from '../../../../src/types';

describe('PageEstimator', () => {
  let estimator: PageEstimator;

  beforeEach(() => {
    estimator = new PageEstimator();
  });

  describe('Constructor and options', () => {
    it('should create estimator with default options', () => {
      const defaultEstimator = new PageEstimator();
      const options = defaultEstimator.getOptions();

      expect(options.wordsPerPage).toBe(500);
      expect(options.averageWordsPerLine).toBe(10);
      expect(options.linesPerPage).toBe(50);
      expect(options.tocOffset).toBe(1);
    });

    it('should create estimator with custom options', () => {
      const customOptions = {
        wordsPerPage: 400,
        linesPerPage: 40,
        tocOffset: 2,
      };

      const customEstimator = new PageEstimator(customOptions);
      const options = customEstimator.getOptions();

      expect(options.wordsPerPage).toBe(400);
      expect(options.linesPerPage).toBe(40);
      expect(options.tocOffset).toBe(2);
      expect(options.averageWordsPerLine).toBe(10); // Default value
    });

    it('should update options', () => {
      estimator.updateOptions({ linesPerPage: 60 });
      const options = estimator.getOptions();

      expect(options.linesPerPage).toBe(60);
      expect(options.wordsPerPage).toBe(500); // Unchanged
    });
  });

  describe('Page number estimation', () => {
    const mockHeadings: Heading[] = [
      { level: 1, text: '第一章', id: 'chapter-1', anchor: '#chapter-1' },
      { level: 2, text: '1.1 小節', id: 'section-1-1', anchor: '#section-1-1' },
      { level: 2, text: '1.2 另一小節', id: 'section-1-2', anchor: '#section-1-2' },
      { level: 1, text: '第二章', id: 'chapter-2', anchor: '#chapter-2' },
    ];

    it('should estimate page numbers for simple markdown content', () => {
      const markdownContent = `# 第一章

這是第一章的內容。

## 1.1 小節

這裡有一些內容。

## 1.2 另一小節

更多內容在這裡。

# 第二章

第二章的內容。`;

      const pageNumbers = estimator.estimatePageNumbers(mockHeadings, markdownContent);

      expect(pageNumbers['chapter-1']).toBeDefined();
      expect(pageNumbers['section-1-1']).toBeDefined();
      expect(pageNumbers['section-1-2']).toBeDefined();
      expect(pageNumbers['chapter-2']).toBeDefined();

      // All headings should be on page 2 or later (after TOC)
      Object.values(pageNumbers).forEach(pageNum => {
        expect(pageNum).toBeGreaterThanOrEqual(2);
      });
    });

    it('should handle long content with multiple pages', () => {
      // Create content that would span multiple pages
      const longContent = Array(200).fill('這是一行很長的內容，用來測試多頁面的情況。').join('\n');
      const markdownWithLongContent = `# 第一章

${longContent}

# 第二章

${longContent}`;

      const headings: Heading[] = [
        { level: 1, text: '第一章', id: 'chapter-1', anchor: '#chapter-1' },
        { level: 1, text: '第二章', id: 'chapter-2', anchor: '#chapter-2' },
      ];

      const pageNumbers = estimator.estimatePageNumbers(headings, markdownWithLongContent);

      expect(pageNumbers['chapter-1']).toBe(2); // First content page
      expect(pageNumbers['chapter-2']).toBeGreaterThan(2); // Should be on a later page
    });

    it('should handle empty headings array', () => {
      const markdownContent = '# 測試\n\n這是測試內容。';
      const pageNumbers = estimator.estimatePageNumbers([], markdownContent);

      expect(Object.keys(pageNumbers)).toHaveLength(0);
    });

    it('should handle empty markdown content', () => {
      const pageNumbers = estimator.estimatePageNumbers(mockHeadings, '');

      // Should still return page numbers starting from content start page
      Object.values(pageNumbers).forEach(pageNum => {
        expect(pageNum).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Heading key generation', () => {
    it('should generate keys from anchor', () => {
      const headings: Heading[] = [
        { level: 1, text: '測試標題', id: 'test', anchor: '#test-heading' },
      ];

      const markdownContent = '# 測試標題\n\n內容';
      const pageNumbers = estimator.estimatePageNumbers(headings, markdownContent);

      expect(pageNumbers['test-heading']).toBeDefined();
    });

    it('should fallback to id when anchor is not available', () => {
      const headings: Heading[] = [{ level: 1, text: '測試標題', id: 'test-id', anchor: '' }];

      const markdownContent = '# 測試標題\n\n內容';
      const pageNumbers = estimator.estimatePageNumbers(headings, markdownContent);

      expect(pageNumbers['test-id']).toBeDefined();
    });

    it('should create slug from text when anchor and id are not available', () => {
      const headings: Heading[] = [{ level: 1, text: '測試 標題！', id: '', anchor: '' }];

      const markdownContent = '# 測試 標題！\n\n內容';
      const pageNumbers = estimator.estimatePageNumbers(headings, markdownContent);

      // Should create a slug-like key
      const keys = Object.keys(pageNumbers);
      expect(keys.length).toBe(1);
      expect(keys[0]).toMatch(/測試.*標題/);
    });
  });

  describe('TOC position detection', () => {
    it('should find TOC position at first heading', () => {
      const contentWithIntro = `這是一個簡介段落。

還有更多介紹內容。

# 第一章

這是第一章。`;

      const headings: Heading[] = [
        { level: 1, text: '第一章', id: 'chapter-1', anchor: '#chapter-1' },
      ];

      const pageNumbers = estimator.estimatePageNumbers(headings, contentWithIntro);

      expect(pageNumbers['chapter-1']).toBeDefined();
      expect(pageNumbers['chapter-1']).toBeGreaterThanOrEqual(2);
    });

    it('should handle content with no headings', () => {
      const contentWithoutHeadings = `這是一些內容。

沒有標題的文件。`;

      const pageNumbers = estimator.estimatePageNumbers([], contentWithoutHeadings);

      expect(Object.keys(pageNumbers)).toHaveLength(0);
    });
  });

  describe('Chinese content support', () => {
    it('should handle Chinese headings correctly', () => {
      const chineseContent = `# 中文標題

這是中文內容。

## 子標題

更多中文內容。`;

      const headings: Heading[] = [
        { level: 1, text: '中文標題', id: 'chinese-title', anchor: '#chinese-title' },
        { level: 2, text: '子標題', id: 'sub-title', anchor: '#sub-title' },
      ];

      const pageNumbers = estimator.estimatePageNumbers(headings, chineseContent);

      expect(pageNumbers['chinese-title']).toBeDefined();
      expect(pageNumbers['sub-title']).toBeDefined();
    });

    it('should create proper slugs for Chinese text', () => {
      const headings: Heading[] = [{ level: 1, text: '系統架構 & 設計', id: '', anchor: '' }];

      const markdownContent = '# 系統架構 & 設計\n\n內容';
      const pageNumbers = estimator.estimatePageNumbers(headings, markdownContent);

      const keys = Object.keys(pageNumbers);
      expect(keys.length).toBe(1);
      expect(keys[0]).toContain('系統架構');
      expect(keys[0]).toContain('設計');
    });
  });

  describe('Edge cases', () => {
    it('should handle headings not found in content', () => {
      const headings: Heading[] = [
        { level: 1, text: '不存在的標題', id: 'non-existent', anchor: '#non-existent' },
      ];

      const markdownContent = '# 實際標題\n\n內容';
      const pageNumbers = estimator.estimatePageNumbers(headings, markdownContent);

      // Should still provide page numbers even if heading is not found
      expect(pageNumbers['non-existent']).toBeDefined();
      expect(pageNumbers['non-existent']).toBeGreaterThanOrEqual(2);
    });

    it('should handle duplicate heading text', () => {
      const headings: Heading[] = [
        { level: 1, text: '重複標題', id: 'duplicate-1', anchor: '#duplicate-1' },
        { level: 2, text: '重複標題', id: 'duplicate-2', anchor: '#duplicate-2' },
      ];

      const markdownContent = `# 重複標題

第一個

## 重複標題

第二個`;

      const pageNumbers = estimator.estimatePageNumbers(headings, markdownContent);

      expect(pageNumbers['duplicate-1']).toBeDefined();
      expect(pageNumbers['duplicate-2']).toBeDefined();
    });

    it('should handle very large TOC', () => {
      // Create a large number of headings
      const manyHeadings: Heading[] = Array.from({ length: 100 }, (_, i) => ({
        level: 1,
        text: `標題 ${i + 1}`,
        id: `heading-${i + 1}`,
        anchor: `#heading-${i + 1}`,
      }));

      const markdownContent = manyHeadings.map(h => `# ${h.text}\n\n一些內容。`).join('\n\n');

      const pageNumbers = estimator.estimatePageNumbers(manyHeadings, markdownContent);

      expect(Object.keys(pageNumbers)).toHaveLength(100);

      // With 100 headings, TOC should take multiple pages
      const firstHeadingPage = pageNumbers['heading-1'];
      expect(firstHeadingPage).toBeGreaterThan(2); // More than 1 TOC page
    });
  });
});
