/**
 * Unit tests for markdown-it-admonitions plugin
 * Tests the parsing and rendering of admonition blocks in Markdown
 */

import { MarkdownParser } from '../../../../../src/core/parser/markdown-parser';
import { DEFAULT_ADMONITION_TYPES } from '../../../../../src/core/parser/plugins/markdown-it-admonitions';

describe('Markdown Admonitions Plugin', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('Basic admonition parsing', () => {
    it('should parse info admonition block', () => {
      const markdown = `:::info
This is an info block.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('class="admonition-title"');
      expect(result.content).toContain('This is an info block.');
    });

    it('should parse tip admonition block', () => {
      const markdown = `:::tip
This is a helpful tip.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-tip"');
      expect(result.content).toContain('This is a helpful tip.');
    });

    it('should parse warning admonition block', () => {
      const markdown = `:::warning
This is a warning message.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-warning"');
      expect(result.content).toContain('This is a warning message.');
    });

    it('should parse danger admonition block', () => {
      const markdown = `:::danger
This is a danger alert.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-danger"');
      expect(result.content).toContain('This is a danger alert.');
    });

    it('should parse success admonition block', () => {
      const markdown = `:::success
Operation completed successfully.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-success"');
      expect(result.content).toContain('Operation completed successfully.');
    });

    it('should parse note admonition block', () => {
      const markdown = `:::note
This is an important note.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-note"');
      expect(result.content).toContain('This is an important note.');
    });

    it('should parse important admonition block', () => {
      const markdown = `:::important
This is important information.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain(
        'class="admonition admonition-important"',
      );
      expect(result.content).toContain('This is important information.');
    });

    it('should parse example admonition block', () => {
      const markdown = `:::example
This is an example.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-example"');
      expect(result.content).toContain('This is an example.');
    });
  });

  describe('Admonition with custom titles', () => {
    it('should parse admonition with custom title', () => {
      const markdown = `:::info Custom Information
This block has a custom title.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('Custom Information');
      expect(result.content).toContain('This block has a custom title.');
    });

    it('should parse tip with custom title', () => {
      const markdown = `:::tip Pro Tip
Here is a professional tip for you.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-tip"');
      expect(result.content).toContain('Pro Tip');
      expect(result.content).toContain('Here is a professional tip for you.');
    });

    it('should handle Chinese custom titles', () => {
      const markdown = `:::warning 重要警告
這是一個重要的警告訊息。
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-warning"');
      expect(result.content).toContain('重要警告');
      expect(result.content).toContain('這是一個重要的警告訊息。');
    });
  });

  describe('Complex content in admonitions', () => {
    it('should handle markdown syntax inside admonitions', () => {
      const markdown = `:::info
# Heading inside admonition

This has **bold text** and *italic text*.

- List item 1
- List item 2

\`inline code\` and [link](https://example.com)
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('<h1');
      expect(result.content).toContain('<strong>bold text</strong>');
      expect(result.content).toContain('<em>italic text</em>');
      expect(result.content).toContain('<ul>');
      expect(result.content).toContain('<li>List item 1</li>');
      expect(result.content).toContain('<code>inline code</code>');
      expect(result.content).toContain(
        '<a href="https://example.com">link</a>',
      );
    });

    it('should handle code blocks inside admonitions', () => {
      const markdown = `:::tip
Here's some code:

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-tip"');
      expect(result.content).toContain(
        '<pre class="language-javascript line-numbers">',
      );
      expect(result.content).toContain('class="token keyword">function</span>');
      expect(result.content).toContain('class="token function">hello</span>');
    });

    it('should handle tables inside admonitions', () => {
      const markdown = `:::note
| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
| Value 3  | Value 4  |
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-note"');
      expect(result.content).toContain('<table>');
      expect(result.content).toContain('<th>Column 1</th>');
      expect(result.content).toContain('<td>Value 1</td>');
    });
  });

  describe('Multiple admonitions', () => {
    it('should handle multiple different admonition types', () => {
      const markdown = `:::info
First admonition.
:::

Regular paragraph.

:::warning
Second admonition.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('First admonition.');
      expect(result.content).toContain('class="admonition admonition-warning"');
      expect(result.content).toContain('Second admonition.');
      expect(result.content).toContain('<p>Regular paragraph.</p>');
    });

    it('should handle multiple admonitions of same type', () => {
      const markdown = `:::tip
First tip.
:::

:::tip
Second tip.
:::`;
      const result = parser.parse(markdown);

      const tipMatches = result.content.match(
        /class="admonition admonition-tip"/g,
      );
      expect(tipMatches).toHaveLength(2);
      expect(result.content).toContain('First tip.');
      expect(result.content).toContain('Second tip.');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should ignore unknown admonition types', () => {
      const markdown = `:::unknown
This should not be parsed as admonition.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).not.toContain('class="admonition');
      expect(result.content).toContain(':::unknown');
    });

    it('should handle unclosed admonition blocks', () => {
      const markdown = `:::info
This block is not closed.`;
      const result = parser.parse(markdown);

      expect(result.content).not.toContain('class="admonition');
      expect(result.content).toContain(':::info');
    });

    it('should handle empty admonition blocks', () => {
      const markdown = `:::info
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('Info'); // Default title for empty info block
    });

    it('should handle nested admonition markers', () => {
      const markdown = `:::info
Content with :::nested::: markers.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain(':::nested:::');
    });

    it('should handle whitespace around admonition markers', () => {
      const markdown = `   :::info
Content with whitespace.
   :::   `;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('Content with whitespace.');
    });
  });

  describe('Admonition icons and titles', () => {
    it('should include default icons for each admonition type', () => {
      DEFAULT_ADMONITION_TYPES.forEach((type: any) => {
        const markdown = `:::${type.name}
Test content.
:::`;
        const result = parser.parse(markdown);

        expect(result.content).toContain(
          `class="admonition ${type.className}"`,
        );
        expect(result.content).toContain('class="admonition-icon"');
        expect(result.content).toContain('<svg');
        expect(result.content).toContain('class="admonition-title"');
        expect(result.content).toContain(type.title);
      });
    });
  });

  describe('CSS styling compatibility', () => {
    it('should generate HTML compatible with PDF templates CSS', () => {
      const markdown = `:::info Custom Title
Test content for CSS compatibility.
:::`;
      const result = parser.parse(markdown);

      // Verify structure matches the CSS selectors in templates.ts
      expect(result.content).toContain(
        '<div class="admonition admonition-info">',
      );
      expect(result.content).toContain('<div class="admonition-title">');
      expect(result.content).toContain('<span class="admonition-icon">');
      expect(result.content).toContain('Custom Title');
      expect(result.content).toContain('</div>');
    });
  });

  describe('Indented admonitions', () => {
    it('should handle indented admonition blocks', () => {
      const markdown = `  :::info
  This is an indented info block.
  :::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('This is an indented info block.');
    });

    it('should handle deeply indented admonition blocks', () => {
      const markdown = `    :::warning
    This is a deeply indented warning block.
    With multiple lines of content.
    :::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-warning"');
      expect(result.content).toContain(
        'This is a deeply indented warning block.',
      );
      expect(result.content).toContain('With multiple lines of content.');
    });

    it('should handle indented admonitions with custom titles', () => {
      const markdown = `  :::tip Pro Tip
  This is an indented tip with custom title.
  :::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('class="admonition admonition-tip"');
      expect(result.content).toContain('Pro Tip');
      expect(result.content).toContain(
        'This is an indented tip with custom title.',
      );
    });

    it('should handle admonitions in lists', () => {
      const markdown = `1. First item

   :::info
   Information in list item.
   :::

2. Second item`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('<ol>');
      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('Information in list item.');
    });

    it('should handle admonitions in blockquotes', () => {
      const markdown = `> Quote start
>
> :::note
> Note inside blockquote.
> :::
>
> Quote end`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('<blockquote>');
      expect(result.content).toContain('class="admonition admonition-note"');
      expect(result.content).toContain('Note inside blockquote.');
    });
  });

  describe('Integration with other markdown features', () => {
    it('should work alongside headings', () => {
      const markdown = `# Main Heading

:::info
Information block.
:::

## Sub Heading

:::warning
Warning block.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('<h1');
      expect(result.content).toContain('Main Heading');
      expect(result.content).toContain('<h2');
      expect(result.content).toContain('Sub Heading');
      expect(result.content).toContain('class="admonition admonition-info"');
      expect(result.content).toContain('class="admonition admonition-warning"');
      expect(result.headings).toHaveLength(2);
    });

    it('should work alongside other plugins like anchors', () => {
      const markdown = `# Heading with ID

:::info
Content with anchor support.
:::`;
      const result = parser.parse(markdown);

      expect(result.content).toContain('id="heading-with-id"');
      expect(result.content).toContain('class="admonition admonition-info"');
    });
  });
});
