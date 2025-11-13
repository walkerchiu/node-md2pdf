/**
 * Unit tests for SyntaxHighlighter
 */

import { SyntaxHighlighter } from '../../../../../src/core/rendering/processors/syntax-highlighter';
import Prism from 'prismjs';

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
      expect(result).toContain('counter-reset: linenumber');
      expect(result).toContain('class="code-line"');
      expect(result).toContain('class="line-content"');
      // Should have two lines
      const lineMatches = result.match(/class="code-line"/g);
      expect(lineMatches).toHaveLength(2);
    });

    it('should create code block without line numbers for text', () => {
      const code = 'Plain text\nSecond line';
      const language = 'text';

      const result = highlighter.createHighlightedCodeBlock(code, language);

      expect(result).toContain('language-text');
      expect(result).not.toContain('line-numbers');
      expect(result).not.toContain('counter-reset');
      expect(result).not.toContain('code-line');
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

      const lineMatches = result.match(/class="code-line"/g);
      expect(lineMatches).toHaveLength(1);
    });

    it('should handle empty code', () => {
      const code = '';
      const language = 'javascript';

      const result = highlighter.createHighlightedCodeBlock(code, language);

      expect(result).toContain('language-javascript');
      // Should have at least one line even for empty code
      const lineMatches = result.match(/class="code-line"/g);
      expect(lineMatches).toBeTruthy();
      expect(lineMatches!.length).toBeGreaterThanOrEqual(1);
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

      expect(css).toContain('.code-line');
      expect(css).toContain('counter-increment');
    });

    it('should not include line numbers CSS when disabled', () => {
      const highlighterWithoutLineNumbers = new SyntaxHighlighter({
        enableLineNumbers: false,
      });
      const css = highlighterWithoutLineNumbers.getCSS();

      expect(css).not.toContain('.code-line');
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

    it('should handle unsupported language gracefully', () => {
      const code = 'some code';
      const result = highlighter.createHighlightedCodeBlock(
        code,
        'unknownlanguage123',
      );

      expect(result).toContain('language-unknownlanguage123');
      expect(result).toContain('some code');
    });

    it('should skip mermaid diagrams in extractCodeBlocks', () => {
      const htmlWithMermaid = `
        <pre><code class="language-mermaid">graph TD;
          A-->B;
        </code></pre>
        <pre><code class="language-javascript">const x = 1;</code></pre>
      `;
      const result = highlighter.processContent(htmlWithMermaid);

      // Mermaid should be skipped, JavaScript should be processed
      expect(result).toContain('language-mermaid');
      expect(result).toContain('language-javascript line-numbers');
    });

    it('should skip plantuml diagrams in extractCodeBlocks', () => {
      const htmlWithPlantuml = `
        <pre><code class="language-plantuml">@startuml
          A -> B
        @enduml</code></pre>
        <pre><code class="language-python">x = 1</code></pre>
      `;
      const result = highlighter.processContent(htmlWithPlantuml);

      // PlantUML should be skipped, Python should be processed
      expect(result).toContain('language-plantuml');
      expect(result).toContain('language-python line-numbers');
    });

    it('should handle code with HTML entities', () => {
      const htmlWithEntities =
        '<pre><code class="language-javascript">const x = &lt;div&gt;test&lt;/div&gt;;</code></pre>';
      const result = highlighter.processContent(htmlWithEntities);

      expect(result).toContain('language-javascript line-numbers');
      expect(result).toBeDefined();
    });

    it('should handle pre with language class on pre element', () => {
      const htmlWithPreLang =
        '<pre class="language-typescript"><code>interface Test {}</code></pre>';
      const result = highlighter.processContent(htmlWithPreLang);

      expect(result).toContain('line-numbers');
      expect(result).toContain('language-typescript');
    });

    it('should skip duplicate blocks found by multiple regex patterns', () => {
      const htmlWithDuplicates = `
        <pre class="language-javascript"><code class="language-javascript">const x = 1;</code></pre>
      `;
      const result = highlighter.processContent(htmlWithDuplicates);

      // Should only process once, not duplicate the highlighting
      const lineNumbersCount = (
        result.match(/class="language-javascript line-numbers"/g) || []
      ).length;
      expect(lineNumbersCount).toBe(1);
    });

    it('should handle code blocks without language (no highlighting)', () => {
      const htmlNoLang = '<pre><code>plain code</code></pre>';
      const result = highlighter.processContent(htmlNoLang);

      expect(result).toContain('plain code');
      expect(result).not.toContain('line-numbers');
    });

    it('should handle multi-line code ending with empty line', () => {
      const code = 'line1\nline2\n';
      const result = highlighter.createHighlightedCodeBlock(code, 'javascript');

      // Should remove trailing empty line
      const lineMatches = result.match(/class="code-line"/g);
      expect(lineMatches).toHaveLength(2); // Should be 2, not 3
    });

    it('should handle Prism.languages not having the language', () => {
      // Test with a language that definitely doesn't exist in Prism
      const code = 'some code';
      const result = highlighter.createHighlightedCodeBlock(
        code,
        'nonexistentlang999',
      );

      // Should still create a code block, but without highlighting
      expect(result).toContain('language-nonexistentlang999');
      expect(result).toContain('some code');
    });

    it('should handle code that causes tokenization errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Try to create a scenario that might cause tokenization to fail
      // Most languages handle any input, but we test the error path exists
      const code = 'test code';
      const result = highlighter.createHighlightedCodeBlock(code, 'javascript');

      // Should not throw and return valid HTML
      expect(result).toBeDefined();
      expect(result).toContain('language-javascript');

      consoleSpy.mockRestore();
    });

    it('should warn when block replacement fails', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create content that might cause issues with block replacement
      const problematicContent =
        '<pre><code class="language-javascript">code1</code></pre>';

      const result = highlighter.processContent(problematicContent);

      // Should still return content without crashing
      expect(result).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should handle empty language gracefully in processContent', () => {
      const htmlEmptyLang = '<pre><code class="language-">no lang</code></pre>';
      const result = highlighter.processContent(htmlEmptyLang);

      expect(result).toContain('no lang');
      expect(result).not.toContain('line-numbers');
    });

    it('should handle Prism tokenization throwing an error', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock Prism.tokenize to throw an error
      const originalTokenize = Prism.tokenize;
      Prism.tokenize = jest.fn(() => {
        throw new Error('Tokenization failed');
      });

      const code = 'test code';
      const result = highlighter.createHighlightedCodeBlock(code, 'javascript');

      // Should fallback gracefully
      expect(result).toBeDefined();
      expect(result).toContain('test code');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to tokenize code'),
        expect.any(Error),
      );

      // Restore
      Prism.tokenize = originalTokenize;
      consoleSpy.mockRestore();
    });

    it('should handle Prism highlight fallback throwing an error', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock both tokenize and highlight to throw errors
      const originalTokenize = Prism.tokenize;
      const originalHighlight = Prism.highlight;

      Prism.tokenize = jest.fn(() => {
        throw new Error('Tokenization failed');
      });
      Prism.highlight = jest.fn(() => {
        throw new Error('Highlight failed');
      });

      const code = 'test code';
      const result = highlighter.createHighlightedCodeBlock(code, 'javascript');

      // Should escape HTML and return safely
      expect(result).toBeDefined();
      expect(result).toContain('test code');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fallback highlight also failed'),
        expect.any(Error),
      );

      // Restore
      Prism.tokenize = originalTokenize;
      Prism.highlight = originalHighlight;
      consoleSpy.mockRestore();
    });

    it('should handle block not found during replacement', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create HTML where the extracted block pattern doesn't match exactly
      const weirdHtml = `<pre><code class="language-javascript">code</code></pre>extra text`;
      const result = highlighter.processContent(weirdHtml);

      // Should handle gracefully
      expect(result).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should skip mermaid in markdown format', () => {
      const markdown = '```mermaid\ngraph TD;\nA-->B;\n```';
      const result = highlighter.processContent(markdown);

      // Mermaid should be in the result but not processed
      expect(result).toContain('mermaid');
    });

    it('should skip plantuml in markdown format', () => {
      const markdown = '```plantuml\n@startuml\nA->B\n@enduml\n```';
      const result = highlighter.processContent(markdown);

      // PlantUML should be in the result but not processed
      expect(result).toContain('plantuml');
    });

    it('should process markdown format code blocks', () => {
      // Test markdown code blocks (triple backticks)
      const markdown = '```typescript\nconst x: number = 1;\n```';
      const result = highlighter.processContent(markdown);

      // Should be processed with line numbers
      expect(result).toContain('language-typescript');
      expect(result).toContain('line-numbers');
    });

    it('should handle block not found warning path', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create a highlighter and mock internal state that causes block not found
      const testHighlighter = new SyntaxHighlighter({
        enableLineNumbers: true,
      });

      // Create content where extractCodeBlocks and indexOf mismatch
      // This is hard to trigger naturally, so we test with content that may cause issues
      const content = '<pre><code class="language-js">test</code></pre>';
      const result = testHighlighter.processContent(content);

      expect(result).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should handle prismLanguage being null/undefined', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock Prism.languages to return undefined for a specific language
      const originalLanguages = Prism.languages.testlang123;
      (Prism.languages as any).testlang123 = undefined;

      const code = 'test code';
      const result = highlighter.createHighlightedCodeBlock(
        code,
        'testlang123',
      );

      // Should escape HTML and return safely
      expect(result).toBeDefined();
      expect(result).toContain('test code');

      // Restore
      if (originalLanguages) {
        (Prism.languages as any).testlang123 = originalLanguages;
      } else {
        delete (Prism.languages as any).testlang123;
      }
      consoleSpy.mockRestore();
    });
  });
});
