/**
 * Markdown Parser Module
 * Handles parsing of Markdown content to HTML with support for various plugins
 */

import { readFileSync } from 'fs';

import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';

import { ParsedMarkdown, Heading } from '../../types/index';

export interface MarkdownParserOptions {
  html: boolean;
  breaks: boolean;
  linkify: boolean;
  typographer: boolean;
  quotes: string;
  highlight?: (str: string, lang: string) => string;
}

export class MarkdownParser {
  private md: MarkdownIt;
  constructor(options?: Partial<MarkdownParserOptions>) {
    const defaultOptions: MarkdownParserOptions = {
      html: true,
      breaks: true,
      linkify: true,
      typographer: true,
      quotes: '""\'\'',
      highlight: this.highlightCode.bind(this),
    };
    const finalOptions = { ...defaultOptions, ...options };

    // Initialize markdown-it with options
    this.md = new MarkdownIt({
      html: finalOptions.html,
      breaks: finalOptions.breaks,
      linkify: finalOptions.linkify,
      typographer: finalOptions.typographer,
      quotes: finalOptions.quotes,
      highlight: finalOptions.highlight,
    });

    // Configure plugins
    this.configurePlugins();
  }

  /**
   * Configure markdown-it plugins
   */
  private configurePlugins(): void {
    // Add anchor plugin for heading anchors
    this.md.use(anchor, {
      permalink: anchor.permalink.headerLink(),
      level: [1, 2, 3, 4, 5, 6],
      slugify: this.slugify.bind(this),
    });
    // Note: markdown-it-attrs plugin disabled for now due to type issues
    // this.md.use(attrs);
  }

  /**
   * Generate slug for headings
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fff]/g, '') // Keep Chinese characters
      .replace(/-{2,}/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /**
   * Generate unique ID for headings, handling duplicates
   */
  private generateUniqueId(
    baseId: string,
    usedIds: Record<string, number>,
  ): string {
    if (usedIds[baseId]) {
      usedIds[baseId]++;
      return `${baseId}-${usedIds[baseId]}`;
    } else {
      usedIds[baseId] = 1;
      return baseId;
    }
  }

  /**
   * Code highlighting function
   */
  private highlightCode(str: string, lang: string): string {
    // Basic code highlighting - can be enhanced with prism.js later
    const escapedStr = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return `<pre class="language-${lang}"><code class="language-${lang}">${escapedStr}</code></pre>`;
  }

  /**
   * Preprocess markdown content to fix common formatting issues
   */
  private preprocessContent(content: string): string {
    // Fix bold syntax in lists where there's no space after colon
    // Pattern: **text:** or **text：** immediately followed by non-space character
    // Replace with: **text:** or **text：** followed by a space
    return content
      .replace(/(\*\*[^*]+：\*\*)([^\s])/g, '$1 $2') // Chinese colon
      .replace(/(\*\*[^*]+:\*\*)([^\s])/g, '$1 $2'); // English colon
  }

  /**
   * Parse markdown content to HTML
   */
  public parse(content: string): ParsedMarkdown {
    try {
      // Preprocess content to fix formatting issues
      const preprocessedContent = this.preprocessContent(content);

      // Render HTML
      const html = this.md.render(preprocessedContent);

      // Extract headings
      const headings = this.extractHeadings(content);
      return {
        content: html,
        headings,
        metadata: this.extractMetadata(content),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse markdown: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Read and parse markdown file
   */
  public parseFile(filePath: string): ParsedMarkdown {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return this.parse(content);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`File not found: ${filePath}`);
        }
        throw new Error(`Failed to read file ${filePath}: ${error.message}`);
      }
      throw new Error(`Failed to read file ${filePath}: Unknown error`);
    }
  }

  /**
   * Extract headings from markdown content
   */
  private extractHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const usedIds: Record<string, number> = {}; // Track used IDs for uniqueness
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockFence = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for code block boundaries
      const fenceMatch = trimmedLine.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        const currentFence = fenceMatch[1][0]; // Get the fence character (` or ~)
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockFence = currentFence;
        } else if (currentFence === codeBlockFence) {
          inCodeBlock = false;
          codeBlockFence = '';
        }
        continue;
      }

      // Skip processing if we're inside a code block
      if (inCodeBlock) {
        continue;
      }

      // ATX-style headings (# ## ### etc.)
      const atxMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (atxMatch) {
        const level = atxMatch[1].length;
        const text = atxMatch[2].trim();
        const baseId = this.slugify(text);
        const uniqueId = this.generateUniqueId(baseId, usedIds);

        headings.push({
          level,
          text,
          id: uniqueId,
          anchor: `#${uniqueId}`,
        });
        continue;
      }

      // Setext-style headings (underlined with = or -)
      // Only process if current line has content (not empty/whitespace only)
      if (i + 1 < lines.length && trimmedLine.length > 0) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.match(/^=+$/)) {
          // H1 - underlined with ===
          const text = trimmedLine;
          const baseId = this.slugify(text);
          const uniqueId = this.generateUniqueId(baseId, usedIds);
          headings.push({
            level: 1,
            text,
            id: uniqueId,
            anchor: `#${uniqueId}`,
          });
          i++; // Skip the underline
        } else if (nextLine.match(/^-{3,}$/)) {
          // H2 - underlined with --- (must be 3 or more dashes to avoid conflicts with horizontal rules)
          const text = trimmedLine;
          const baseId = this.slugify(text);
          const uniqueId = this.generateUniqueId(baseId, usedIds);
          headings.push({
            level: 2,
            text,
            id: uniqueId,
            anchor: `#${uniqueId}`,
          });
          i++; // Skip the underline
        }
      }
    }

    return headings;
  }

  /**
   * Extract metadata from markdown content
   */
  private extractMetadata(content: string): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    // Extract YAML frontmatter if present
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];

      // Simple YAML parsing (can be enhanced with yaml library later)
      const lines = frontmatter.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();

          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          metadata[key] = cleanValue;
        }
      }
    }

    // Extract document statistics
    const wordCount = content
      .replace(/^---[\s\S]*?---/, '') // Remove frontmatter
      .replace(/[#*_`[\]()]/g, '') // Remove markdown syntax
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    const characterCount = content.length;
    const lineCount = content.split('\n').length;

    metadata.statistics = {
      wordCount,
      characterCount,
      lineCount,
      headingCount: this.extractHeadings(content).length,
    };

    return metadata;
  }

  /**
   * Validate markdown content
   */
  public validate(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Try to parse the content
      this.parse(content);

      // Additional validation rules can be added here

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : 'Unknown parsing error',
      );
      return { isValid: false, errors };
    }
  }
}
