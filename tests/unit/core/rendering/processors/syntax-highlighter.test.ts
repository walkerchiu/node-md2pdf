/**
 * Unit tests for SyntaxHighlighter
 */

import { SyntaxHighlighter } from '../../../../../src/core/rendering/processors/syntax-highlighter';

describe('SyntaxHighlighter', () => {
  let highlighter: SyntaxHighlighter;

  beforeEach(() => {
    highlighter = new SyntaxHighlighter({
      enableLineNumbers: true,
      lineNumberStart: 1,
    });
  });

  describe('Basic Functionality', () => {
    it('should initialize with default configuration', () => {
      const defaultHighlighter = new SyntaxHighlighter();
      expect(defaultHighlighter).toBeInstanceOf(SyntaxHighlighter);
    });

    it('should initialize with custom configuration', () => {
      const customHighlighter = new SyntaxHighlighter({
        enableLineNumbers: false,
        lineNumberStart: 10,
      });
      expect(customHighlighter).toBeInstanceOf(SyntaxHighlighter);
    });
  });

  describe('Code Block Processing', () => {
    it('should process simple HTML content without code blocks', () => {
      const htmlContent = '<h1>Title</h1><p>Some content</p>';
      const result = highlighter.processContent(htmlContent);
      expect(result).toBe(htmlContent);
    });

    it('should process code blocks with syntax highlighting', () => {
      const htmlContent =
        '<pre><code class="language-javascript">const x = 1;</code></pre>';
      const result = highlighter.processContent(htmlContent);

      expect(result).toContain('language-javascript');
      expect(result).toContain('line-numbers');
      expect(result).toContain('token');
    });

    it('should skip line numbers for text blocks', () => {
      const htmlContent =
        '<pre><code class="language-text">Plain text content</code></pre>';
      const result = highlighter.processContent(htmlContent);

      expect(result).toContain('language-text');
      expect(result).not.toContain('line-numbers');
    });

    it('should skip line numbers for blocks without language', () => {
      const htmlContent = '<pre><code>No language specified</code></pre>';
      const result = highlighter.processContent(htmlContent);

      expect(result).not.toContain('line-numbers');
    });

    it('should handle multiple code blocks', () => {
      const htmlContent = `
        <pre><code class="language-javascript">const x = 1;</code></pre>
        <p>Some text</p>
        <pre><code class="language-python">x = 1</code></pre>
      `;
      const result = highlighter.processContent(htmlContent);

      expect(result).toContain('language-javascript');
      expect(result).toContain('language-python');
      // Count only "line-numbers"" (class with quotes) to exclude "line-numbers-rows"
      expect((result.match(/line-numbers"/g) || []).length).toBe(2);
    });
  });

  describe('Code Block Creation', () => {
    it('should create highlighted code block with line numbers', () => {
      const code = 'const x = 1;\nconsole.log(x);';
      const language = 'javascript';

      const result = highlighter.createHighlightedCodeBlock(code, language);

      expect(result).toContain('language-javascript');
      expect(result).toContain('line-numbers');
      expect(result).toContain('line-numbers-rows');
      expect(result).toContain('data-line="1"');
      expect(result).toContain('data-line="2"');
    });

    it('should create code block without line numbers for text', () => {
      const code = 'Plain text\nSecond line';
      const language = 'text';

      const result = highlighter.createHighlightedCodeBlock(code, language);

      expect(result).toContain('language-text');
      expect(result).not.toContain('line-numbers');
      expect(result).not.toContain('line-numbers-rows');
    });

    it('should create code block without line numbers for empty language', () => {
      const code = 'Some code\nSecond line';
      const language = '';

      const result = highlighter.createHighlightedCodeBlock(code, language);

      expect(result).not.toContain('line-numbers');
      expect(result).not.toContain('line-numbers-rows');
    });

    it('should handle single line code', () => {
      const code = 'const x = 1;';
      const language = 'javascript';

      const result = highlighter.createHighlightedCodeBlock(code, language);

      expect(result).toContain('data-line="1"');
      expect(result).not.toContain('data-line="2"');
    });

    it('should handle empty code', () => {
      const code = '';
      const language = 'javascript';

      const result = highlighter.createHighlightedCodeBlock(code, language);

      expect(result).toContain('language-javascript');
      expect(result).toContain('data-line="1"'); // Should have at least one line
    });
  });

  describe('Language Support', () => {
    it('should support common programming languages', () => {
      const languages = ['javascript', 'typescript', 'python', 'java', 'cpp'];

      languages.forEach((language) => {
        const result = highlighter.createHighlightedCodeBlock('code', language);
        expect(result).toContain(`language-${language}`);
      });
    });

    it('should handle language aliases', () => {
      const result = highlighter.createHighlightedCodeBlock('code', 'js');
      expect(result).toContain('language-javascript');
    });

    it('should handle unsupported languages gracefully', () => {
      const result = highlighter.createHighlightedCodeBlock(
        'code',
        'unknownlang',
      );
      expect(result).toContain('language-unknownlang');
    });
  });

  describe('CSS Generation', () => {
    it('should generate CSS for syntax highlighting', () => {
      const css = highlighter.getCSS();

      expect(css).toContain('pre[class*="language-"]');
      expect(css).toContain('.token');
      expect(css).toContain('line-numbers');
      expect(css).toContain('font-family');
      expect(css).toContain('font-size');
    });

    it('should include line numbers CSS when enabled', () => {
      const highlighterWithLineNumbers = new SyntaxHighlighter({
        enableLineNumbers: true,
      });
      const css = highlighterWithLineNumbers.getCSS();

      expect(css).toContain('.line-numbers-rows');
      expect(css).toContain('data-line');
    });

    it('should not include line numbers CSS when disabled', () => {
      const highlighterWithoutLineNumbers = new SyntaxHighlighter({
        enableLineNumbers: false,
      });
      const css = highlighterWithoutLineNumbers.getCSS();

      expect(css).not.toContain('.line-numbers-rows');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed HTML gracefully', () => {
      const malformedHtml =
        '<pre><code class="language-javascript">const x = 1;</code>';
      const result = highlighter.processContent(malformedHtml);

      // Should not throw and return the original content
      expect(result).toBeDefined();
    });

    it('should handle special characters in code', () => {
      const codeWithSpecialChars = 'const x = "<>&\'"';
      const result = highlighter.createHighlightedCodeBlock(
        codeWithSpecialChars,
        'javascript',
      );

      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#39;');
    });
  });
});
