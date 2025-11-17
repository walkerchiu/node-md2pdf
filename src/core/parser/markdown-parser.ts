/**
 * Markdown Parser Module
 * Handles parsing of Markdown content to HTML with support for various plugins
 */

import { readFileSync } from 'fs';

import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';

import { ParsedMarkdown, Heading } from '../../types/index';
import { SyntaxHighlighter } from '../rendering/processors/syntax-highlighter';

import admonitionsPlugin from './plugins/markdown-it-admonitions';

export interface MarkdownParserOptions {
  html: boolean;
  breaks: boolean;
  linkify: boolean;
  typographer: boolean;
  quotes: string;
  highlight?: (str: string, lang: string) => string;
  syntaxHighlighting?: {
    theme?: string;
    enableLineNumbers?: boolean;
    lineNumberStart?: number;
  };
}

export class MarkdownParser {
  private md: MarkdownIt;
  private syntaxHighlighter: SyntaxHighlighter;

  constructor(options?: Partial<MarkdownParserOptions>) {
    // Initialize syntax highlighter with provided configuration
    const syntaxConfig: any = {
      enableLineNumbers: options?.syntaxHighlighting?.enableLineNumbers ?? true,
      lineNumberStart: options?.syntaxHighlighting?.lineNumberStart ?? 1,
    };

    // Only add theme if it's defined
    if (options?.syntaxHighlighting?.theme) {
      syntaxConfig.theme = options.syntaxHighlighting.theme;
    }

    this.syntaxHighlighter = new SyntaxHighlighter(syntaxConfig);
    const defaultOptions: MarkdownParserOptions = {
      html: true,
      breaks: true,
      linkify: true,
      typographer: true,
      quotes: '""\'\'',
      // Custom highlight function to ensure proper HTML structure for diagram processors
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
   * Note: Anchors are added for all heading levels here.
   * The actual depth limiting for TOC and bookmarks happens during rendering.
   */
  private configurePlugins(): void {
    // Add anchor plugin for heading anchors
    // Use headerLink to wrap the entire heading content in the anchor
    this.md.use(anchor, {
      permalink: anchor.permalink.headerLink(),
      level: [1, 2, 3, 4, 5, 6],
      slugify: this.slugify.bind(this),
    });

    // Add admonitions plugin for callout blocks
    this.md.use(admonitionsPlugin);

    // Note: markdown-it-attrs plugin disabled for now due to type issues
    // this.md.use(attrs);
  }

  /**
   * Remove HTML tags from text
   */
  private stripHtml(text: string): string {
    return (
      text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&hellip;/g, '...')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        // Remove any remaining HTML entities
        .replace(/&[a-zA-Z0-9#]+;/g, '')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    );
  }

  /**
   * Generate slug for headings - must match markdown-it-anchor plugin
   * This function should match exactly what markdown-it-anchor does
   */
  private slugify(text: string): string {
    // First strip HTML tags, then create slug
    // This must match the behavior of markdown-it-anchor plugin
    const cleanText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove remaining HTML entities
      .trim();

    return cleanText
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
   * Code highlighting function - ensures proper HTML structure for all language types
   */
  private highlightCode(str: string, lang: string): string {
    const language = (lang || '').toLowerCase();

    // For diagram languages (mermaid, plantuml), ensure both <pre> and <code> have the language class
    // This is required for the diagram processors to correctly identify and process them
    if (language === 'mermaid' || language === 'plantuml') {
      const escapedStr = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      return `<pre class="language-${language}"><code class="language-${language}">${escapedStr}</code></pre>`;
    }

    // For all other languages, return plain HTML structure without highlighting
    // The SyntaxHighlighter post-processor will handle these later
    const escapedStr = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // If language is specified, add the language class
    // If no language, omit the class attribute entirely - SyntaxHighlighter will still add line numbers
    if (lang && lang.trim() !== '') {
      return `<pre><code class="language-${lang}">${escapedStr}</code></pre>`;
    } else {
      // No language specified - plain code block without language class
      return `<pre><code>${escapedStr}</code></pre>`;
    }
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
   * Remove user-defined links from headings while preserving header-anchor links
   */
  private removeUserLinksFromHeadings(html: string): string {
    // Match heading tags (h1-h6) and remove user links within them
    return html.replace(
      /(<h[1-6][^>]*>)(.*?)(<\/h[1-6]>)/g,
      (_match, openTag, content, closeTag) => {
        // Only remove non-header-anchor links from heading content
        const cleanContent = content.replace(
          /<a(?![^>]*class="header-anchor")[^>]*>(.*?)<\/a>/g,
          '$1',
        );
        return openTag + cleanContent + closeTag;
      },
    );
  }

  /**
   * Parse markdown content to HTML
   */
  public parse(content: string): ParsedMarkdown {
    try {
      // Preprocess content to fix formatting issues
      const preprocessedContent = this.preprocessContent(content);

      // Render HTML (highlight function handles initial code block structure)
      let html = this.md.render(preprocessedContent);

      // Post-process HTML: remove user-defined links from headings to prevent nested anchor issues
      html = this.removeUserLinksFromHeadings(html);

      // Post-process HTML for syntax highlighting (only for non-diagram code blocks)
      html = this.syntaxHighlighter.processContent(html);

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
        const rawText = atxMatch[2].trim();
        const text = this.stripHtml(rawText); // Strip HTML from heading text for display
        const baseId = this.slugify(rawText); // Use original text for ID generation
        const uniqueId = this.generateUniqueId(baseId, usedIds);

        headings.push({
          level,
          text, // Clean text without HTML for display
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
          const rawText = trimmedLine;
          const text = this.stripHtml(rawText); // Strip HTML from heading text for display
          const baseId = this.slugify(rawText); // Use original text for ID generation
          const uniqueId = this.generateUniqueId(baseId, usedIds);
          headings.push({
            level: 1,
            text, // Clean text without HTML for display
            id: uniqueId,
            anchor: `#${uniqueId}`,
          });
          i++; // Skip the underline
        } else if (nextLine.match(/^-{3,}$/)) {
          // H2 - underlined with --- (must be 3 or more dashes to avoid conflicts with horizontal rules)
          const rawText = trimmedLine;
          const text = this.stripHtml(rawText); // Strip HTML from heading text for display
          const baseId = this.slugify(rawText); // Use original text for ID generation
          const uniqueId = this.generateUniqueId(baseId, usedIds);
          headings.push({
            level: 2,
            text, // Clean text without HTML for display
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
