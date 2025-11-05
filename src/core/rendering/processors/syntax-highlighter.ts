/**
 * Simple PrismJS Syntax Highlighter
 * Provides basic syntax highlighting functionality without complex dependencies
 */

import Prism from 'prismjs';

import {
  DEFAULT_SYNTAX_HIGHLIGHTING,
  DEFAULT_CSS_TEMPLATE,
} from '../../../infrastructure/config/constants';

// Load core and commonly used language components
import 'prismjs/components/prism-apacheconf';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-clojure';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-dart';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-elixir';
import 'prismjs/components/prism-erlang';
import 'prismjs/components/prism-git';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-groovy';
import 'prismjs/components/prism-haskell';
import 'prismjs/components/prism-hcl';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-latex';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-lua';
import 'prismjs/components/prism-makefile';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-matlab';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-perl';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-protobuf';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-scala';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-verilog';
import 'prismjs/components/prism-vhdl';
import 'prismjs/components/prism-vim';
import 'prismjs/components/prism-yaml';

export interface SyntaxHighlightConfig {
  theme?: string;
  enableLineNumbers?: boolean;
  lineNumberStart?: number;
  supportedLanguages?: string[];
  languageAliases?: Record<string, string>;
}

export class SyntaxHighlighter {
  private config: Required<SyntaxHighlightConfig>;
  private languageMap: Map<string, string> = new Map();

  constructor(config: SyntaxHighlightConfig = {}) {
    this.config = {
      theme: config.theme || DEFAULT_SYNTAX_HIGHLIGHTING.DEFAULT_THEME,
      enableLineNumbers:
        config.enableLineNumbers ??
        DEFAULT_SYNTAX_HIGHLIGHTING.ENABLE_LINE_NUMBERS,
      lineNumberStart:
        config.lineNumberStart || DEFAULT_SYNTAX_HIGHLIGHTING.LINE_NUMBER_START,
      supportedLanguages: config.supportedLanguages || [
        ...DEFAULT_SYNTAX_HIGHLIGHTING.SUPPORTED_LANGUAGES,
      ],
      languageAliases:
        config.languageAliases || DEFAULT_SYNTAX_HIGHLIGHTING.LANGUAGE_ALIASES,
    };

    this.initializeLanguageMap();
    this.initializePrism();
  }

  private initializeLanguageMap(): void {
    Object.entries(this.config.languageAliases).forEach(([alias, language]) => {
      this.languageMap.set(alias.toLowerCase(), language);
    });
  }

  private initializePrism(): void {
    // Ensure Prism is available globally
    if (typeof global !== 'undefined') {
      global.Prism = Prism;
    }
  }

  /**
   * Process HTML content and highlight code blocks
   */
  processContent(content: string): string {
    const codeBlocks = this.extractCodeBlocks(content);

    if (codeBlocks.length === 0) {
      return content;
    }

    let processedContent = content;
    let offset = 0; // Track offset due to replacements

    // Sort blocks by their position in the content for safer replacement
    const sortedBlocks = codeBlocks
      .map((block) => ({
        ...block,
        originalIndex: content.indexOf(block.fullMatch),
      }))
      .filter((block) => block.originalIndex !== -1)
      .sort((a, b) => a.originalIndex - b.originalIndex);

    for (let i = 0; i < sortedBlocks.length; i++) {
      const block = sortedBlocks[i];
      try {
        const highlightedHTML = this.createHighlightedCodeBlock(
          block.code,
          block.language,
        );

        // Find the current position considering previous replacements
        const currentIndex = processedContent.indexOf(block.fullMatch, offset);
        if (currentIndex !== -1) {
          const before = processedContent.slice(0, currentIndex);
          const after = processedContent.slice(
            currentIndex + block.fullMatch.length,
          );
          processedContent = before + highlightedHTML + after;

          // Update offset for next replacement
          offset = currentIndex + highlightedHTML.length;
        } else {
          console.warn(
            `[SyntaxHighlighter] Could not find block ${i + 1} for replacement`,
          );
        }
      } catch (error) {
        console.warn(
          `Failed to highlight code block with language '${block.language}':`,
          error,
        );
        // Keep original code block on error
      }
    }

    return processedContent;
  }

  private extractCodeBlocks(content: string): Array<{
    fullMatch: string;
    language: string;
    code: string;
  }> {
    const blocks: Array<{
      fullMatch: string;
      language: string;
      code: string;
    }> = [];

    // Extract markdown code blocks
    const markdownRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = markdownRegex.exec(content)) !== null) {
      const language = (match[1] || '').toLowerCase();

      // Skip diagram languages (handled by other processors)
      if (language === 'mermaid' || language === 'plantuml') {
        continue;
      }

      blocks.push({
        fullMatch: match[0],
        language: match[1] || '',
        code: match[2].trim(),
      });
    }

    // Extract HTML pre/code blocks with language - more flexible regex
    const htmlWithLangRegex =
      /<pre[^>]*><code[^>]*class="language-(\w+)"[^>]*>([\s\S]*?)<\/code><\/pre>/g;
    let htmlMatch;

    while ((htmlMatch = htmlWithLangRegex.exec(content)) !== null) {
      const language = (htmlMatch[1] || '').toLowerCase();

      // Skip diagram languages - they should be handled by their respective processors
      if (language === 'mermaid' || language === 'plantuml') {
        continue;
      }

      // Decode HTML entities
      const decodedCode = htmlMatch[2]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      blocks.push({
        fullMatch: htmlMatch[0],
        language: htmlMatch[1] || '',
        code: decodedCode.trim(),
      });
    }

    // Also try to catch blocks where pre has language class
    const htmlPreLangRegex =
      /<pre[^>]*class="[^"]*language-(\w+)[^"]*"[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g;
    let preLangMatch: RegExpExecArray | null;

    while ((preLangMatch = htmlPreLangRegex.exec(content)) !== null) {
      const language = (preLangMatch[1] || '').toLowerCase();

      // Skip diagram languages
      if (language === 'mermaid' || language === 'plantuml') {
        continue;
      }

      // Skip if already found by previous regex
      if (blocks.some((block) => block.fullMatch === preLangMatch![0])) {
        continue;
      }

      // Decode HTML entities
      const decodedCode = preLangMatch[2]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      blocks.push({
        fullMatch: preLangMatch[0],
        language: preLangMatch[1] || '',
        code: decodedCode.trim(),
      });
    }

    // Extract HTML pre/code blocks without language (plain code blocks)
    const htmlNoLangRegex =
      /<pre><code(?!\s+class="language-")([^>]*)>([\s\S]*?)<\/code><\/pre>/g;
    let noLangMatch;

    while ((noLangMatch = htmlNoLangRegex.exec(content)) !== null) {
      // Skip if this was already processed as a language block
      if (noLangMatch[0].includes('class="language-')) {
        continue;
      }

      // Decode HTML entities
      const decodedCode = noLangMatch[2]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      blocks.push({
        fullMatch: noLangMatch[0],
        language: '', // No language specified
        code: decodedCode.trim(),
      });
    }

    return blocks;
  }

  public createHighlightedCodeBlock(code: string, language: string): string {
    const normalizedLanguage = this.normalizeLanguage(language);
    const highlightedCode = this.highlightCode(code, normalizedLanguage);

    // Skip line numbers for text blocks or blocks without language
    const shouldSkipLineNumbers =
      !this.config.enableLineNumbers ||
      !language ||
      language.trim() === '' ||
      normalizedLanguage === 'text';

    if (shouldSkipLineNumbers) {
      return `<pre class="language-${normalizedLanguage}"><code class="language-${normalizedLanguage}">${highlightedCode}</code></pre>`;
    }

    // For line numbers, count actual lines more accurately
    const lines = code.split('\n');
    let lineCount = lines.length;

    // Only reduce count if the last line is truly empty (not just whitespace)
    if (lines.length > 1 && lines[lines.length - 1].trim() === '') {
      lineCount = lines.length - 1;
    }

    // Ensure minimum of 1 line
    lineCount = Math.max(1, lineCount);

    const lineNumberHTML = this.generateSimpleLineNumbers(lineCount);

    return `<pre class="language-${normalizedLanguage} line-numbers"><code class="language-${normalizedLanguage}">${highlightedCode}</code>${lineNumberHTML}</pre>`;
  }

  private generateSimpleLineNumbers(lineCount: number): string {
    const lineNumbers = [];
    const startNum = this.config.lineNumberStart;

    // Ensure we have a valid line count
    const validLineCount = Math.max(1, Math.floor(lineCount));

    for (let i = 0; i < validLineCount; i++) {
      lineNumbers.push(`<span data-line="${startNum + i}"></span>`);
    }

    return `<span aria-hidden="true" class="line-numbers-rows">${lineNumbers.join('')}</span>`;
  }

  private normalizeLanguage(language: string): string {
    if (!language) return '';

    const lowercaseLanguage = language.toLowerCase();
    return this.languageMap.get(lowercaseLanguage) || lowercaseLanguage;
  }

  private highlightCode(code: string, language: string): string {
    if (!language || !this.isLanguageSupported(language)) {
      return this.escapeHtml(code);
    }

    // First try: Direct tokenization to avoid highlight() issues
    try {
      const prismLanguage = Prism.languages[language];
      if (!prismLanguage) {
        return this.escapeHtml(code);
      }

      // Use tokenization directly to avoid the problematic highlight() method
      const tokens = Prism.tokenize(code, prismLanguage);
      return this.tokensToHtml(tokens);
    } catch (error) {
      console.warn(
        `Failed to tokenize code with language '${language}':`,
        error,
      );

      // Fallback: Try PrismJS highlight method as last resort
      try {
        const prismLanguage = Prism.languages[language];
        if (prismLanguage) {
          return Prism.highlight(code, prismLanguage, language);
        }
      } catch (highlightError) {
        console.warn(
          `Fallback highlight also failed for '${language}':`,
          highlightError,
        );
      }

      return this.escapeHtml(code);
    }
  }

  private tokensToHtml(tokens: Array<string | Prism.Token>): string {
    return tokens
      .map((token) => {
        if (typeof token === 'string') {
          return this.escapeHtml(token);
        } else {
          const className = Array.isArray(token.type)
            ? token.type.join(' ')
            : token.type;
          const content =
            typeof token.content === 'string'
              ? this.escapeHtml(token.content)
              : this.tokensToHtml(
                  Array.isArray(token.content)
                    ? token.content
                    : [String(token.content)],
                );
          return `<span class="token ${className}">${content}</span>`;
        }
      })
      .join('');
  }

  private isLanguageSupported(language: string): boolean {
    return (
      this.config.supportedLanguages.includes(language) ||
      Prism.languages[language] !== undefined
    );
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get CSS for syntax highlighting
   */
  getCSS(): string {
    return this.generateSyntaxHighlightingCSS();
  }

  private generateSyntaxHighlightingCSS(): string {
    const lineNumbersCSS = this.config.enableLineNumbers
      ? this.getLineNumbersCSS()
      : '';

    return `
      /* PrismJS Syntax Highlighting Styles */
      pre[class*="language-"] {
        margin: 20px 0;
        page-break-inside: avoid;
        font-family: ${DEFAULT_CSS_TEMPLATE.CODE.FONT_FAMILY} !important;
        font-size: ${DEFAULT_CSS_TEMPLATE.CODE.FONT_SIZE} !important;
        line-height: ${DEFAULT_CSS_TEMPLATE.CODE.LINE_HEIGHT} !important;
        border: 1px solid #e1e4e8;
        border-radius: 4px;
        overflow-x: auto;
        padding: 1em;
        background: #f6f8fa;
      }

      pre[class*="language-"] code {
        font-family: ${DEFAULT_CSS_TEMPLATE.CODE.FONT_FAMILY} !important;
        font-size: ${DEFAULT_CSS_TEMPLATE.CODE.FONT_SIZE} !important;
        line-height: ${DEFAULT_CSS_TEMPLATE.CODE.LINE_HEIGHT} !important;
        background: transparent;
        padding: 0;
        border: none;
        border-radius: 0;
        vertical-align: baseline;
        white-space: pre;
      }

      ${lineNumbersCSS}

      /* Default Theme Syntax Colors */
      .token.comment,
      .token.prolog,
      .token.doctype,
      .token.cdata {
        color: slategray;
      }

      .token.punctuation {
        color: #999;
      }

      .token.property,
      .token.tag,
      .token.boolean,
      .token.number,
      .token.constant,
      .token.symbol,
      .token.deleted {
        color: #905;
      }

      .token.selector,
      .token.attr-name,
      .token.string,
      .token.char,
      .token.builtin,
      .token.inserted {
        color: #690;
      }

      .token.operator,
      .token.entity,
      .token.url,
      .language-css .token.string,
      .style .token.string {
        color: #9a6e3a;
        background: hsla(0, 0%, 100%, .5);
      }

      .token.atrule,
      .token.attr-value,
      .token.keyword {
        color: #07a;
      }

      .token.function,
      .token.class-name {
        color: #dd4a68;
      }

      .token.regex,
      .token.important,
      .token.variable {
        color: #e90;
      }

      .token.important,
      .token.bold {
        font-weight: bold;
      }

      .token.italic {
        font-style: italic;
      }

      .token.entity {
        cursor: help;
      }

      @media print {
        .code-block-container {
          break-inside: avoid;
        }
        .code-block-container pre {
          border: 1px solid #ddd;
          background: #f9f9f9 !important;
        }
      }
    `;
  }

  private getLineNumbersCSS(): string {
    return `
      /* PrismJS Line Numbers Plugin CSS */
      pre[class*="language-"].line-numbers {
        position: relative;
        padding-left: 3.8em;
      }

      pre[class*="language-"].line-numbers > code {
        position: relative;
        white-space: inherit;
      }

      .line-numbers .line-numbers-rows {
        position: absolute;
        pointer-events: none;
        top: 0;
        bottom: 0;
        left: 0;
        width: 3.3em;
        border-right: 1px solid #e1e4e8;
        user-select: none;
        background-color: #f6f8fa;
        box-sizing: border-box;
      }


      .line-numbers-rows > span {
        display: block;
        line-height: ${DEFAULT_CSS_TEMPLATE.CODE.LINE_HEIGHT} !important;
        text-align: right;
        padding-right: 0.75em;
        color: #666;
        font-family: ${DEFAULT_CSS_TEMPLATE.CODE.FONT_FAMILY} !important;
        font-size: ${DEFAULT_CSS_TEMPLATE.CODE.FONT_SIZE} !important;
        vertical-align: baseline;
        box-sizing: border-box;
      }

      .line-numbers-rows > span:first-child {
        margin-top: 1em;
      }

      .line-numbers-rows > span:last-child {
        margin-bottom: 1em;
      }

      .line-numbers-rows > span:before {
        content: attr(data-line);
        display: inline-block;
        width: 100%;
        line-height: ${DEFAULT_CSS_TEMPLATE.CODE.LINE_HEIGHT} !important;
        vertical-align: baseline;
        font-size: ${DEFAULT_CSS_TEMPLATE.CODE.FONT_SIZE} !important;
        font-family: ${DEFAULT_CSS_TEMPLATE.CODE.FONT_FAMILY} !important;
      }
    `;
  }
}

// Export singleton instance
export const syntaxHighlighter = new SyntaxHighlighter();
