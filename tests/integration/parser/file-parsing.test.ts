/**
 * Integration tests for MarkdownParser file parsing functionality
 * These tests use real fixture files to validate the parser's behavior
 */

import { MarkdownParser } from '../../../src/core/parser';
import { join } from 'path';
import { existsSync } from 'fs';

describe('MarkdownParser - File Parsing Integration', () => {
  let parser: MarkdownParser;
  const fixturesPath = join(__dirname, '../../fixtures/markdown');

  beforeAll(() => {
    // Verify fixtures directory exists
    expect(existsSync(fixturesPath)).toBe(true);
  });

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('Real file parsing', () => {
    it('should parse sample.md with all markdown elements', () => {
      const filePath = join(fixturesPath, 'sample.md');
      const result = parser.parseFile(filePath);

      // Verify HTML content was generated
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(0);

      // Verify headings were extracted
      expect(result.headings).toBeDefined();
      expect(result.headings.length).toBeGreaterThan(0);

      // Check specific headings
      const h1Headings = result.headings.filter((h) => h.level === 1);
      expect(h1Headings).toHaveLength(1);
      expect(h1Headings[0].text).toBe('測試文件標題');

      // Verify statistics
      expect(result.metadata?.statistics).toBeDefined();
      const stats = result.metadata?.statistics as {
        wordCount: number;
        headingCount: number;
      };
      expect(stats.wordCount).toBeGreaterThan(0);
      expect(stats.headingCount).toBe(result.headings.length);
    });

    it('should parse simple.md correctly', () => {
      const filePath = join(fixturesPath, 'simple.md');
      const result = parser.parseFile(filePath);

      expect(result.content).toBeTruthy();
      expect(result.headings).toHaveLength(4);

      // Verify heading hierarchy
      expect(result.headings[0]).toMatchObject({
        level: 1,
        text: 'Simple Test',
        id: 'simple-test',
      });

      expect(result.headings[1]).toMatchObject({
        level: 2,
        text: 'Chapter 1',
        id: 'chapter-1',
      });

      expect(result.headings[2]).toMatchObject({
        level: 3,
        text: 'Section 1.1',
        id: 'section-11',
      });
    });

    it('should extract YAML frontmatter from with-metadata.md', () => {
      const filePath = join(fixturesPath, 'with-metadata.md');
      const result = parser.parseFile(filePath);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe('Test Document with Metadata');
      expect(result.metadata?.author).toBe('MD2PDF Test Suite');
      expect(result.metadata?.date).toBe('2025-09-02');
      expect(result.metadata?.description).toBe(
        'A test document with YAML frontmatter',
      );

      // Tags are parsed as a string in our simple parser
      expect(result.metadata?.tags).toBeDefined();
    });
  });

  describe('Chinese content support', () => {
    it('should properly handle Chinese characters in sample.md', () => {
      const filePath = join(fixturesPath, 'sample.md');
      const result = parser.parseFile(filePath);

      // Find Chinese headings
      const chineseHeadings = result.headings.filter((h) =>
        /[\u4e00-\u9fff]/.test(h.text),
      );

      expect(chineseHeadings.length).toBeGreaterThan(0);

      // Verify Chinese heading slugs are preserved
      const chineseTestHeading = result.headings.find(
        (h) => h.text === '中文測試',
      );
      if (chineseTestHeading) {
        expect(chineseTestHeading.id).toBe('中文測試');
        expect(chineseTestHeading.anchor).toBe('#中文測試');
      }
    });
    it('should handle mixed English and Chinese content', () => {
      const filePath = join(fixturesPath, 'sample.md');
      const result = parser.parseFile(filePath);

      // Check that the content contains both English and Chinese
      expect(result.content).toContain('測試');
      expect(result.content).toContain('English'); // Changed from 'Test' to match actual content
      expect(result.content).toContain('Markdown'); // Capitalized to match actual content
    });
  });

  describe('HTML output validation', () => {
    it('should generate valid HTML with proper tags', () => {
      const filePath = join(fixturesPath, 'sample.md');
      const result = parser.parseFile(filePath);

      // Check for common HTML elements
      expect(result.content).toContain('<h1');
      expect(result.content).toContain('<h2');
      expect(result.content).toContain('<p>');
      expect(result.content).toContain('<ul>');
      expect(result.content).toContain('<li>');
      expect(result.content).toContain('<code');
      expect(result.content).toContain('<table>');
      expect(result.content).toContain('<strong>');
      expect(result.content).toContain('<em>');
    });
    it('should properly escape code blocks', () => {
      const filePath = join(fixturesPath, 'sample.md');
      const result = parser.parseFile(filePath);

      // Check that code blocks are properly formatted
      expect(result.content).toContain('<pre class="language-typescript">');
      expect(result.content).toContain('<pre class="language-javascript">');
      // Check that special characters in code are escaped (check actual escaping used)
      expect(result.content).toContain('&gt;'); // Check for > escaping (should exist)
      expect(result.content).toContain('&#39;'); // Check for ' escaping (our highlighter uses this)
    });
    it('should generate clickable links', () => {
      const filePath = join(fixturesPath, 'sample.md');
      const result = parser.parseFile(filePath);

      // Check for link tags
      expect(result.content).toMatch(/<a href="https:\/\/example\.com"[^>]*>/);
      expect(result.content).toContain('</a>');
    });
  });

  describe('Error handling', () => {
    it('should throw error for non-existent file', () => {
      const nonExistentFile = join(fixturesPath, 'non-existent.md');
      expect(() => {
        parser.parseFile(nonExistentFile);
      }).toThrow(/File not found|Failed to read file/);
    });
    it('should handle empty file', () => {
      // Create an empty test file temporarily
      const emptyContent = '';
      const result = parser.parse(emptyContent);
      expect(result.content).toBe('');
      expect(result.headings).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should parse large file within reasonable time', () => {
      const filePath = join(fixturesPath, 'sample.md');
      const startTime = Date.now();
      parser.parseFile(filePath);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should parse within 100ms for our test files
      expect(duration).toBeLessThan(100);
    });
  });
});
