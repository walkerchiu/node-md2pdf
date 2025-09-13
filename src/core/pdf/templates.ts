import { StyleOptions } from './types';

export class PDFTemplates {
  static getDefaultCSS(options: StyleOptions = {}): string {
    const {
      fontFamily = 'system-ui, -apple-system, "Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      fontSize = '16px',
      lineHeight = 1.6,
      maxWidth = '800px',
      margin = '0 auto',
      padding = '2rem',
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

  static getTOCCSS(): string {
    return `
      /* Table of Contents Styles */
      .toc-container {
        margin-bottom: 3em;
        padding: 1.5em;
        background: #f9f9f9;
        border-radius: 8px;
        border: 1px solid #e5e5e5;
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
          border: 1px solid #ddd;
        }

        .toc-link:hover {
          background: none;
          padding-left: 0;
        }
      }
    `;
  }

  static getFullHTML(content: string, title?: string, customCSS?: string): string {
    const baseCSS = this.getDefaultCSS();
    const chineseCSS = this.getChineseCSS();
    const tocCSS = this.getTOCCSS();
    const css = customCSS
      ? `${baseCSS}\n${chineseCSS}\n${tocCSS}\n${customCSS}`
      : `${baseCSS}\n${chineseCSS}\n${tocCSS}`;

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
    customCSS?: string
  ): string {
    const baseCSS = this.getDefaultCSS();
    const chineseCSS = this.getChineseCSS();
    const tocCSS = this.getTOCCSS();
    const css = customCSS
      ? `${baseCSS}\n${chineseCSS}\n${tocCSS}\n${customCSS}`
      : `${baseCSS}\n${chineseCSS}\n${tocCSS}`;

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
