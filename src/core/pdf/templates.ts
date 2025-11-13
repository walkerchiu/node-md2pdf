import { ConfigAccessor } from '../../infrastructure/config';
import { DEFAULT_CSS_TEMPLATE } from '../../infrastructure/config/constants';

import { StyleOptions } from './types';

export class PDFTemplates {
  /**
   * Get default CSS with configuration support
   * @param options Style options override
   * @param configAccessor Optional configuration accessor for dynamic config
   */
  static getDefaultCSS(
    options: StyleOptions = {},
    configAccessor?: ConfigAccessor,
  ): string {
    // Get configuration from ConfigAccessor if available, otherwise use defaults
    const config = configAccessor?.getCSSTemplateConfig() || {
      fontFamily: DEFAULT_CSS_TEMPLATE.FONT_FAMILY,
      fontSize: DEFAULT_CSS_TEMPLATE.FONT_SIZE,
      lineHeight: DEFAULT_CSS_TEMPLATE.LINE_HEIGHT,
      maxWidth: DEFAULT_CSS_TEMPLATE.MAX_WIDTH,
      margin: DEFAULT_CSS_TEMPLATE.MARGIN,
      padding: DEFAULT_CSS_TEMPLATE.PADDING,
    };

    // Override with provided options (maintains backward compatibility)
    const {
      fontFamily = config.fontFamily,
      fontSize = config.fontSize,
      lineHeight = config.lineHeight,
      maxWidth = config.maxWidth,
      margin = config.margin,
      padding = config.padding,
    } = options;

    return `
      * {
        box-sizing: border-box;
      }

      body {
        font-family: ${fontFamily};
        font-size: ${fontSize};
        line-height: ${lineHeight};
        color: #333;
        max-width: ${maxWidth};
        margin: ${margin};
        padding: ${padding};
        background: white;
      }

      h1, h2, h3, h4, h5, h6 {
        margin-top: 2em;
        margin-bottom: 0.5em;
        font-weight: 600;
        line-height: 1.25;
      }

      h1 { font-size: 2.25em; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.3em; }
      h2 { font-size: 1.875em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3em; }
      h3 { font-size: 1.5em; }
      h4 { font-size: 1.25em; }
      h5 { font-size: 1.125em; }
      h6 { font-size: 1em; }

      p {
        margin-bottom: 1em;
        orphans: 3;
        widows: 3;
      }

      pre {
        background: #f6f8fa;
        border-radius: 6px;
        padding: 16px;
        overflow-x: auto;
        font-family: 'SFMono-Regular', 'Monaco', 'Inconsolata', 'Liberation Mono', 'Courier New', monospace;
        font-size: 0.875em;
        line-height: 1.45;
        page-break-inside: avoid;
      }

      code {
        background: #f6f8fa;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: 'SFMono-Regular', 'Monaco', 'Inconsolata', 'Liberation Mono', 'Courier New', monospace;
        font-size: 0.875em;
      }

      pre code {
        background: none;
        padding: 0;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 1em;
      }

      th, td {
        border: 1px solid #dfe2e5;
        padding: 6px 13px;
        text-align: left;
      }

      th {
        font-weight: 600;
        background-color: #f6f8fa;
      }

      tr:nth-child(even) {
        background-color: #f6f8fa;
      }

      ul, ol {
        padding-left: 2em;
        margin-bottom: 1em;
      }

      li {
        margin-bottom: 0.25em;
      }

      blockquote {
        margin: 0 0 1em;
        padding: 0 1em;
        color: #6a737d;
        border-left: 0.25em solid #dfe2e5;
      }

      a {
        color: #0366d6;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      /* Text alignment utility classes */
      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-justify { text-align: justify; }

      /* Superscript and subscript support */
      sup {
        font-size: 0.75em;
        line-height: 0;
        position: relative;
        vertical-align: baseline;
        top: -0.5em;
      }

      sub {
        font-size: 0.75em;
        line-height: 0;
        position: relative;
        vertical-align: baseline;
        bottom: -0.25em;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      .page-break {
        page-break-after: always;
      }

      @media print {
        body {
          margin: 0;
          padding: 0;
        }

        h1, h2, h3 {
          page-break-after: avoid;
        }

        pre, blockquote {
          page-break-inside: avoid;
        }
      }
    `;
  }

  static getChineseCSS(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
      }

      h1, h2, h3, h4, h5, h6 {
        font-weight: 500;
      }

      p {
        text-align: justify;
        word-wrap: break-word;
        word-break: break-all;
      }
    `;
  }

  static getPlantUMLCSS(): string {
    return `
      /* PlantUML Diagram Styles */
      .plantuml-diagram {
        margin: 1.5em 0;
        text-align: center;
        page-break-inside: avoid;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        padding: 16px;
      }

      .plantuml-diagram svg,
      .plantuml-diagram img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      .plantuml-error {
        border: 2px dashed #dc3545;
        padding: 16px;
        margin: 16px 0;
        background-color: #f8d7da;
        border-radius: 4px;
        color: #721c24;
        font-family: monospace;
        font-size: 0.9em;
        page-break-inside: avoid;
      }

      .plantuml-error strong {
        color: #5a1a1a;
        font-weight: bold;
      }

      @media print {
        .plantuml-diagram {
          box-shadow: none;
          border: 1px solid #ddd;
        }

        .plantuml-diagram img {
          box-shadow: none;
        }

        .plantuml-error {
          background-color: #f0f0f0 !important;
          border-color: #999 !important;
          color: #333 !important;
        }
      }
    `;
  }

  static getTOCCSS(): string {
    return `
      /* Table of Contents Styles */
      .toc-container {
        margin-bottom: 3em;
        background: #f9f9f9;
        page-break-after: always;
      }

      .toc-title {
        font-size: 1.5em;
        font-weight: 600;
        margin: 0 0 1em 0;
        color: #333;
        border-bottom: 2px solid #0366d6;
        padding-bottom: 0.5em;
        text-align: center;
      }

      .toc-list {
        list-style: none;
        margin: 0;
        padding: 0;
        line-height: 1.4;
      }

      .toc-list .toc-list {
        margin-left: 1.5em;
        margin-top: 0.25em;
        border-left: 1px solid #e5e5e5;
        padding-left: 1em;
      }

      .toc-item {
        margin: 0.25em 0;
        position: relative;
      }

      .toc-link {
        display: block;
        padding: 0.25em 0;
        color: #0366d6;
        text-decoration: none;
        font-size: 0.95em;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .toc-link:hover {
        background: #f0f6ff;
        text-decoration: none;
        padding-left: 0.5em;
      }

      .toc-page-number {
        float: right;
        font-weight: 500;
        color: #666;
        margin-left: 1em;
      }

      .toc-page-number::before {
        content: "·";
        margin-right: 0.5em;
        color: #ccc;
      }

      /* Level-specific styling */
      .toc-list > .toc-item > .toc-link {
        font-weight: 600;
        font-size: 1em;
      }

      .toc-list .toc-list > .toc-item > .toc-link {
        font-weight: 500;
        font-size: 0.9em;
        color: #586069;
      }

      .toc-list .toc-list .toc-list > .toc-item > .toc-link {
        font-weight: 400;
        font-size: 0.85em;
        color: #6a737d;
      }

      @media print {
        .toc-container {
          background: white;
        }

        .toc-link:hover {
          background: none;
          padding-left: 0;
        }
      }
    `;
  }

  static getSyntaxHighlightingCSS(
    enableChineseSupport: boolean = false,
  ): string {
    const codeFontFamily = enableChineseSupport
      ? DEFAULT_CSS_TEMPLATE.CODE.FONT_FAMILY_WITH_CHINESE
      : DEFAULT_CSS_TEMPLATE.CODE.FONT_FAMILY;

    return `
      /* PrismJS Syntax Highlighting Styles */
      .code-block-container {
        margin: 20px 0;
        page-break-inside: avoid;
        font-family: ${codeFontFamily};
        font-size: 14px;
        line-height: 1.45;
      }

      .code-block-container pre {
        border-radius: 4px;
        overflow-x: auto;
        padding: 1em;
        margin: 0;
        background: #f6f8fa;
        border: 1px solid #e1e4e8;
      }

      .code-block-container code {
        font-family: inherit;
        background: transparent;
        padding: 0;
        border-radius: 0;
      }

      /* PrismJS Line Numbers - Simple block layout for maximum compatibility */
      pre[class*="language-"].line-numbers {
        padding: 1em !important;
        padding-left: 0 !important;
        overflow-x: auto;
        /* counter-reset is now controlled by inline style in HTML */
      }

      pre[class*="language-"].line-numbers > code {
        display: block;
      }

      /* Each line is a simple block element */
      .line-numbers .code-line {
        display: block;
        position: relative;
        padding-left: 4.5em;
        page-break-inside: avoid;
        -webkit-column-break-inside: avoid;
        break-inside: avoid;
        counter-increment: linenumber;
        min-height: 1.45em;
      }

      /* Line number using before pseudo-element with absolute positioning */
      .line-numbers .code-line:before {
        content: counter(linenumber);
        position: absolute;
        left: 0;
        top: 0;
        width: 4em;
        height: 100%;
        text-align: right;
        padding-right: 0.75em;
        padding-top: 0;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        color: #666;
        background-color: #f6f8fa;
        border-right: 1px solid #e1e4e8;
        font-family: ${codeFontFamily};
        font-size: 14px;
        line-height: 1.45;
        box-sizing: border-box;
      }

      /* Code content as simple inline element */
      .line-numbers .line-content {
        display: inline-block;
        width: calc(100% - 4.5em);
        padding-left: 0.75em;
        font-family: ${codeFontFamily};
        font-size: 14px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-wrap: break-word;
        vertical-align: top;
        box-sizing: border-box;
      }

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

  static getAdmonitionsCSS(): string {
    return `
      /* Light Theme Admonition Styles with Proper Spacing */
      .admonition {
        margin: 1.5em 0;
        border-radius: 8px;
        page-break-inside: avoid;
        border: 1px solid var(--admonition-border);
        background: var(--admonition-bg);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        font-size: 0.95em;
        line-height: 1.6;
      }

      .admonition-title {
        display: flex;
        align-items: center;
        padding: 12px 18px;
        margin: 0;
        font-weight: 600;
        font-size: 1em;
        color: var(--admonition-title-color);
        background: var(--admonition-title-bg);
        border-bottom: 1px solid var(--admonition-border);
        line-height: 1.4;
      }

      .admonition-icon {
        margin-right: 8px;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.2em;
        height: 1.2em;
      }

      .admonition-icon svg {
        width: 1.3em;
        height: 1.3em;
        display: block;
      }

      /* Content area padding */
      .admonition > p,
      .admonition > div:not(.admonition-title),
      .admonition > ul,
      .admonition > ol,
      .admonition > blockquote,
      .admonition > pre {
        padding: 16px 18px;
        margin: 0;
        color: var(--admonition-content-color);
      }

      .admonition > *:last-child {
        padding-bottom: 18px;
      }

      .admonition > p + p {
        padding-top: 0;
        margin-top: -8px;
      }

      /* Info admonition - Distinct blue theme */
      .admonition-info {
        --admonition-bg: #f0f8ff;
        --admonition-border: #4a90e2;
        --admonition-title-bg: #e3f2fd;
        --admonition-title-color: #1565c0;
        --admonition-content-color: #0d47a1;
      }

      /* Note admonition - Neutral gray theme */
      .admonition-note {
        --admonition-bg: #f8f9fa;
        --admonition-border: #8e8e93;
        --admonition-title-bg: #e9ecef;
        --admonition-title-color: #495057;
        --admonition-content-color: #212529;
      }

      /* Tip admonition - Bright green theme */
      .admonition-tip {
        --admonition-bg: #f0fff0;
        --admonition-border: #32cd32;
        --admonition-title-bg: #e8f5e8;
        --admonition-title-color: #228b22;
        --admonition-content-color: #006400;
      }

      /* Success admonition - Emerald green theme */
      .admonition-success {
        --admonition-bg: #f6ffed;
        --admonition-border: #52c41a;
        --admonition-title-bg: #d9f7be;
        --admonition-title-color: #389e0d;
        --admonition-content-color: #237804;
      }

      /* Warning admonition - Amber/yellow theme */
      .admonition-warning {
        --admonition-bg: #fffdf0;
        --admonition-border: #ffc107;
        --admonition-title-bg: #fff8c4;
        --admonition-title-color: #e65100;
        --admonition-content-color: #bf360c;
      }

      /* Danger admonition - Bright red theme */
      .admonition-danger {
        --admonition-bg: #fff5f5;
        --admonition-border: #f5222d;
        --admonition-title-bg: #ffebee;
        --admonition-title-color: #d32f2f;
        --admonition-content-color: #b71c1c;
      }

      /* Important admonition - Purple theme */
      .admonition-important {
        --admonition-bg: #fdf4ff;
        --admonition-border: #d946ef;
        --admonition-title-bg: #fae8ff;
        --admonition-title-color: #a21caf;
        --admonition-content-color: #86198f;
      }

      /* Example admonition - Teal theme */
      .admonition-example {
        --admonition-bg: #f0fdfa;
        --admonition-border: #14b8a6;
        --admonition-title-bg: #ccfbf1;
        --admonition-title-color: #0f766e;
        --admonition-content-color: #134e4a;
      }

      /* Print media styles */
      @media print {
        .admonition {
          box-shadow: none;
          border: 1px solid var(--admonition-border) !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }

        .admonition-title {
          background: var(--admonition-title-bg) !important;
          color: var(--admonition-title-color) !important;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }

        .admonition p {
          color: var(--admonition-content-color) !important;
        }
      }

      /* Nested content styling */
      .admonition ul,
      .admonition ol {
        padding-left: 40px;
        margin-top: 4px;
        margin-bottom: 4px;
      }

      /* Reduce space between paragraphs and lists inside admonitions */
      .admonition > p + ul,
      .admonition > p + ol {
        margin-top: -4px !important;
        padding-top: 0 !important;
      }

      .admonition li {
        margin: 4px 0;
      }

      .admonition code {
        background: rgba(175, 184, 193, 0.2);
        padding: 0.2em 0.4em;
        border-radius: 4px;
        font-size: 0.85em;
        color: #e36209;
      }

      .admonition pre {
        background: rgba(175, 184, 193, 0.1);
        border: 1px solid rgba(175, 184, 193, 0.2);
        border-radius: 6px;
        padding: 16px;
        margin: 12px 0;
        overflow-x: auto;
      }

      .admonition blockquote {
        border-left: 4px solid rgba(175, 184, 193, 0.3);
        padding-left: 18px;
        margin: 12px 0;
        color: var(--admonition-content-color);
        font-style: italic;
      }
    `;
  }

  static getFullHTML(
    content: string,
    title?: string,
    customCSS?: string,
    enableChineseSupport: boolean = false,
    configAccessor?: ConfigAccessor,
  ): string {
    const baseCSS = this.getDefaultCSS({}, configAccessor);
    const chineseCSS = enableChineseSupport ? this.getChineseCSS() : '';
    const tocCSS = this.getTOCCSS();
    const plantUMLCSS = this.getPlantUMLCSS();
    const syntaxHighlightingCSS =
      this.getSyntaxHighlightingCSS(enableChineseSupport);
    const admonitionsCSS = this.getAdmonitionsCSS();
    const css = customCSS
      ? `${baseCSS}\n${chineseCSS}\n${tocCSS}\n${plantUMLCSS}\n${syntaxHighlightingCSS}\n${admonitionsCSS}\n${customCSS}`
      : `${baseCSS}\n${chineseCSS}\n${tocCSS}\n${plantUMLCSS}\n${syntaxHighlightingCSS}\n${admonitionsCSS}`;

    return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'MD2PDF Document'}</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${content}
</body>
</html>
    `.trim();
  }

  static getFullHTMLWithTOC(
    tocHTML: string,
    content: string,
    title?: string,
    customCSS?: string,
    enableChineseSupport: boolean = false,
    configAccessor?: ConfigAccessor,
  ): string {
    const baseCSS = this.getDefaultCSS({}, configAccessor);
    const chineseCSS = enableChineseSupport ? this.getChineseCSS() : '';
    const tocCSS = this.getTOCCSS();
    const plantUMLCSS = this.getPlantUMLCSS();
    const syntaxHighlightingCSS =
      this.getSyntaxHighlightingCSS(enableChineseSupport);
    const admonitionsCSS = this.getAdmonitionsCSS();
    const css = customCSS
      ? `${baseCSS}\n${chineseCSS}\n${tocCSS}\n${plantUMLCSS}\n${syntaxHighlightingCSS}\n${admonitionsCSS}\n${customCSS}`
      : `${baseCSS}\n${chineseCSS}\n${tocCSS}\n${plantUMLCSS}\n${syntaxHighlightingCSS}\n${admonitionsCSS}`;

    const fullContent = tocHTML ? `${tocHTML}\n\n${content}` : content;

    return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'MD2PDF Document'}</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${fullContent}
</body>
</html>
    `.trim();
  }
}
