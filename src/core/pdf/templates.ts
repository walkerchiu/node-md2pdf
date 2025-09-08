import { StyleOptions } from './types';

export class PDFTemplates {
  static getDefaultCSS(options: StyleOptions = {}): string {
    const {
      fontFamily = 'system-ui, -apple-system, "Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      fontSize = '16px',
      lineHeight = 1.6,
      maxWidth = '800px',
      margin = '0 auto',
      padding = '2rem'
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

  static getFullHTML(content: string, title?: string, customCSS?: string): string {
    const baseCSS = this.getDefaultCSS();
    const chineseCSS = this.getChineseCSS();
    const css = customCSS ? `${baseCSS}\n${chineseCSS}\n${customCSS}` : `${baseCSS}\n${chineseCSS}`;

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
}
