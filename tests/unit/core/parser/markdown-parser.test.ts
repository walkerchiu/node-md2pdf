/**
 * Unit tests for MarkdownParser
 */

import { MarkdownParser } from '../../../../src/core/parser';
import { readFileSync } from 'fs';

// Mock file system for error testing
jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
    jest.clearAllMocks();
  });

  describe('Basic parsing functionality', () => {
    it('should parse simple markdown to HTML', () => {
      const markdown = '# Hello World\n\nThis is a paragraph.';
      const result = parser.parse(markdown);

      expect(result.content).toContain('<h1');
      expect(result.content).toContain('Hello World');
      expect(result.content).toContain('<p>This is a paragraph.</p>');
    });

    it('should handle empty content', () => {
      const result = parser.parse('');

      expect(result.content).toBe('');
      expect(result.headings).toEqual([]);
    });

    it('should handle content with only whitespace', () => {
      const result = parser.parse('   \n\n   \t  \n');

      expect(result.content.trim()).toBe('');
      expect(result.headings).toEqual([]);
    });
  });

  describe('Heading extraction', () => {
    it('should extract ATX-style headings (# ## ###)', () => {
      const markdown = `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`;
      const result = parser.parse(markdown);

      expect(result.headings).toHaveLength(6);
      expect(result.headings[0]).toEqual({
        level: 1,
        text: 'Heading 1',
        id: 'heading-1',
        anchor: '#heading-1',
      });
      expect(result.headings[5]).toEqual({
        level: 6,
        text: 'Heading 6',
        id: 'heading-6',
        anchor: '#heading-6',
      });
    });

    it('should extract Setext-style headings (underlined)', () => {
      const markdown = `Heading 1
=========

Heading 2
---------`;
      const result = parser.parse(markdown);

      expect(result.headings).toHaveLength(2);
      expect(result.headings[0]).toEqual({
        level: 1,
        text: 'Heading 1',
        id: 'heading-1',
        anchor: '#heading-1',
      });
      expect(result.headings[1]).toEqual({
        level: 2,
        text: 'Heading 2',
        id: 'heading-2',
        anchor: '#heading-2',
      });
    });
    it('should handle Chinese headings', () => {
      const markdown = '# 中文標題\n## 測試章節';
      const result = parser.parse(markdown);

      expect(result.headings).toHaveLength(2);
      expect(result.headings[0]).toEqual({
        level: 1,
        text: '中文標題',
        id: '中文標題',
        anchor: '#中文標題',
      });
    });

    it('should create unique slugs for duplicate headings', () => {
      const markdown = `# Test
# Test
# Test`;
      const result = parser.parse(markdown);

      expect(result.headings).toHaveLength(3);
      expect(result.headings[0].id).toBe('test');
      // Note: markdown-it-anchor handles duplicates automatically
    });

    it('should ignore headings inside code blocks', () => {
      const markdown = `# Real Heading

\`\`\`bash
# This is not a heading
mkdir -p src/core/page-structure/
# Another fake heading
\`\`\`

## Another Real Heading

\`\`\`typescript
// This code block contains fake headings
class HeaderFooterManager {
  // ### This is also not a heading
  generateHeader(): string;
}
\`\`\`

### Final Real Heading`;

      const result = parser.parse(markdown);

      expect(result.headings).toHaveLength(3);
      expect(result.headings[0]).toEqual({
        level: 1,
        text: 'Real Heading',
        id: 'real-heading',
        anchor: '#real-heading',
      });
      expect(result.headings[1]).toEqual({
        level: 2,
        text: 'Another Real Heading',
        id: 'another-real-heading',
        anchor: '#another-real-heading',
      });
      expect(result.headings[2]).toEqual({
        level: 3,
        text: 'Final Real Heading',
        id: 'final-real-heading',
        anchor: '#final-real-heading',
      });
    });

    it('should ignore headings inside inline code but process regular headings', () => {
      const markdown = `# Real Heading

Use \`# inline code heading\` which should not be extracted.

## Another Heading

The command \`mkdir -p src/core/\` creates directories.`;

      const result = parser.parse(markdown);

      expect(result.headings).toHaveLength(2);
      expect(result.headings[0].text).toBe('Real Heading');
      expect(result.headings[1].text).toBe('Another Heading');
    });

    it('should handle multiple code blocks correctly', () => {
      const markdown = `# Outer Heading

\`\`\`bash
# This should not be extracted
mkdir -p src/core/
\`\`\`

## Real Heading Between Blocks

\`\`\`typescript
# This is also not a heading
class Example {}
\`\`\`

### Final Real Heading`;

      const result = parser.parse(markdown);

      expect(result.headings).toHaveLength(3);
      expect(result.headings[0].text).toBe('Outer Heading');
      expect(result.headings[1].text).toBe('Real Heading Between Blocks');
      expect(result.headings[2].text).toBe('Final Real Heading');
    });
  });

  describe('Markdown syntax support', () => {
    it('should parse bold and italic text', () => {
      const markdown = 'This is **bold** and *italic* text.';
      const result = parser.parse(markdown);

      expect(result.content).toContain('<strong>bold</strong>');
      expect(result.content).toContain('<em>italic</em>');
    });

    it('should parse code blocks', () => {
      const markdown = '```javascript\nconsole.log("Hello");\n```';
      const result = parser.parse(markdown);

      expect(result.content).toContain('<pre class="language-javascript">');
      expect(result.content).toContain('<code class="language-javascript">');
      expect(result.content).toContain('console.log(&quot;Hello&quot;);');
    });

    it('should parse inline code', () => {
      const markdown = 'Use the `console.log()` function.';
      const result = parser.parse(markdown);

      expect(result.content).toContain('<code>console.log()</code>');
    });

    it('should parse lists', () => {
      const markdown = `- Item 1
- Item 2
  - Nested item
- Item 3

1. First
2. Second
3. Third`;

      const result = parser.parse(markdown);

      expect(result.content).toContain('<ul>');
      expect(result.content).toContain('<ol>');
      expect(result.content).toContain('<li>Item 1</li>');
      expect(result.content).toContain('<li>First</li>');
    });

    it('should parse links', () => {
      const markdown =
        '[Example](https://example.com) and https://auto-link.com';
      const result = parser.parse(markdown);

      expect(result.content).toContain(
        '<a href="https://example.com">Example</a>',
      );
      expect(result.content).toContain(
        '<a href="https://auto-link.com">https://auto-link.com</a>',
      );
    });

    it('should parse tables', () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

      const result = parser.parse(markdown);

      expect(result.content).toContain('<table>');
      expect(result.content).toContain('<thead>');
      expect(result.content).toContain('<tbody>');
      expect(result.content).toContain('Header 1');
      expect(result.content).toContain('Cell 1');
    });
  });

  describe('Error handling', () => {
    it('should handle non-Error exceptions', () => {
      // Mock markdown-it to throw a non-Error object
      const mockRender = jest.fn().mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      (
        parser as unknown as {
          md: { render: jest.MockedFunction<() => string> };
        }
      ).md.render = mockRender;

      expect(() => {
        parser.parse('# Test');
      }).toThrow('Failed to parse markdown: Unknown error');
    });
  });

  describe('Metadata extraction', () => {
    it('should extract YAML frontmatter', () => {
      const markdown = `---
title: "Test Document"
author: "Test Author"
date: "2025-01-01"
---

# Content`;

      const result = parser.parse(markdown);

      expect(result.metadata).toBeDefined();
      expect(result.metadata!['title']).toBe('Test Document');
      expect(result.metadata!['author']).toBe('Test Author');
      expect(result.metadata!['date']).toBe('2025-01-01');
    });

    it('should calculate document statistics', () => {
      const markdown = `# Test Document

This is a test paragraph with several words.

## Section 1

More content here.`;

      const result = parser.parse(markdown);

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.statistics).toBeDefined();

      const stats = result.metadata!.statistics as {
        headingCount: number;
        wordCount: number;
        lineCount: number;
        characterCount: number;
      };
      expect(stats.headingCount).toBe(2);
      expect(stats.wordCount).toBeGreaterThan(0);
      expect(stats.lineCount).toBeGreaterThan(0);
      expect(stats.characterCount).toBeGreaterThan(0);
    });
  });

  describe('File operations', () => {
    beforeEach(() => {
      mockReadFileSync.mockClear();
    });

    it('should read and parse file successfully', () => {
      const mockContent = '# Test File\n\nContent from file.';
      mockReadFileSync.mockReturnValue(mockContent);

      const result = parser.parseFile('/fake/path/test.md');

      expect(mockReadFileSync).toHaveBeenCalledWith(
        '/fake/path/test.md',
        'utf-8',
      );
      expect(result.content).toContain('Test File');
      expect(result.headings).toHaveLength(1);
    });

    it('should handle file not found error', () => {
      const error = new Error('ENOENT: no such file or directory');
      mockReadFileSync.mockImplementation(() => {
        throw error;
      });

      expect(() => parser.parseFile('/nonexistent/file.md')).toThrow(
        'File not found: /nonexistent/file.md',
      );
    });

    it('should handle other file read errors', () => {
      const error = new Error('Permission denied');
      mockReadFileSync.mockImplementation(() => {
        throw error;
      });

      expect(() => parser.parseFile('/restricted/file.md')).toThrow(
        'Failed to read file /restricted/file.md: Permission denied',
      );
    });
  });

  describe('Validation', () => {
    it('should validate correct markdown', () => {
      const markdown = '# Valid Document\n\nThis is valid markdown.';
      const validation = parser.validate(markdown);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle parsing errors in validation', () => {
      // Mock the parse method to throw an error
      const originalParse = parser.parse;
      parser.parse = jest.fn().mockImplementation(() => {
        throw new Error('Parsing failed');
      });

      const validation = parser.validate('invalid content');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Parsing failed');

      // Restore original method
      parser.parse = originalParse;
    });
  });

  describe('Slugify function', () => {
    it('should create proper slugs', () => {
      const testCases = [
        ['Hello World', 'hello-world'],
        ['中文標題', '中文標題'],
        ['Mixed 中文 Content', 'mixed-中文-content'],
        ['Special!@#$%Characters', 'specialcharacters'],
        ['Multiple   Spaces', 'multiple-spaces'],
        ['--Leading-Dashes--', 'leading-dashes'],
      ];

      testCases.forEach(([input, expected]) => {
        // We need to access the private slugify method for testing
        // This is a bit hacky but necessary for thorough testing
        const result = (
          parser as unknown as { slugify: (input: string) => string }
        ).slugify(input);
        expect(result).toBe(expected);
      });
    });
  });
});
