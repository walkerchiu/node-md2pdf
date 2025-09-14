/**
 * Unit tests for PDFTemplates
 */

import { PDFTemplates } from '../../../../src/core/pdf/templates';
import { StyleOptions } from '../../../../src/core/pdf/types';

describe('PDFTemplates', () => {
  describe('getDefaultCSS', () => {
    it('should generate default CSS with default options', () => {
      const css = PDFTemplates.getDefaultCSS();

      expect(css).toContain('font-family: system-ui');
      expect(css).toContain('font-size: 16px');
      expect(css).toContain('line-height: 1.6');
      expect(css).toContain('max-width: 800px');
    });

    it('should generate CSS with custom options', () => {
      const customOptions: StyleOptions = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineHeight: 1.8,
        maxWidth: '900px',
      };

      const css = PDFTemplates.getDefaultCSS(customOptions);

      expect(css).toContain('font-family: Arial, sans-serif');
      expect(css).toContain('font-size: 14px');
      expect(css).toContain('line-height: 1.8');
      expect(css).toContain('max-width: 900px');
    });

    it('should include heading styles', () => {
      const css = PDFTemplates.getDefaultCSS();

      expect(css).toContain('h1 {');
      expect(css).toContain('font-size: 2.25em');
      expect(css).toContain('border-bottom: 2px solid');
    });

    it('should include code block styles', () => {
      const css = PDFTemplates.getDefaultCSS();

      expect(css).toContain('pre {');
      expect(css).toContain('background: #f6f8fa');
      expect(css).toContain('border-radius: 6px');
      expect(css).toContain("font-family: 'SFMono-Regular'");
    });

    it('should include table styles', () => {
      const css = PDFTemplates.getDefaultCSS();

      expect(css).toContain('table {');
      expect(css).toContain('border-collapse: collapse');
      expect(css).toContain('th, td {');
      expect(css).toContain('border: 1px solid');
    });

    it('should include print media styles', () => {
      const css = PDFTemplates.getDefaultCSS();

      expect(css).toContain('@media print');
      expect(css).toContain('page-break-after: avoid');
      expect(css).toContain('page-break-inside: avoid');
    });
  });

  describe('getChineseCSS', () => {
    it('should generate Chinese font CSS', () => {
      const css = PDFTemplates.getChineseCSS();

      expect(css).toContain('Noto Sans CJK SC');
      expect(css).toContain('Source Han Sans SC');
      expect(css).toContain('PingFang SC');
      expect(css).toContain('Microsoft YaHei');
    });

    it('should include Chinese text formatting', () => {
      const css = PDFTemplates.getChineseCSS();

      expect(css).toContain('text-align: justify');
      expect(css).toContain('word-wrap: break-word');
      expect(css).toContain('word-break: break-all');
    });

    it('should set appropriate font weights for Chinese text', () => {
      const css = PDFTemplates.getChineseCSS();

      expect(css).toContain('font-weight: 500');
    });
  });

  describe('getFullHTML', () => {
    it('should generate complete HTML document', () => {
      const content = '<h1>Test Content</h1><p>This is a test.</p>';
      const html = PDFTemplates.getFullHTML(content);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="zh-TW">');
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<title>MD2PDF Document</title>');
      expect(html).toContain(content);
    });

    it('should use custom title when provided', () => {
      const content = '<h1>Test</h1>';
      const title = 'Custom Document Title';
      const html = PDFTemplates.getFullHTML(content, title);

      expect(html).toContain(`<title>${title}</title>`);
    });

    it('should include default CSS', () => {
      const content = '<h1>Test</h1>';
      const html = PDFTemplates.getFullHTML(content);

      expect(html).toContain('font-family: system-ui');
      expect(html).toContain('Noto Sans CJK SC');
    });

    it('should include custom CSS when provided', () => {
      const content = '<h1>Test</h1>';
      const customCSS = 'body { background: red; }';
      const html = PDFTemplates.getFullHTML(content, undefined, customCSS);

      expect(html).toContain(customCSS);
      expect(html).toContain('font-family: system-ui'); // Should still include default CSS
    });

    it('should properly structure the HTML document', () => {
      const content = '<h1>Test</h1><p>Content</p>';
      const html = PDFTemplates.getFullHTML(content);

      // Check structure
      expect(html.indexOf('<!DOCTYPE html>')).toBe(0);
      expect(html.indexOf('<html')).toBeGreaterThan(0);
      expect(html.indexOf('<head>')).toBeGreaterThan(0);
      expect(html.indexOf('<style>')).toBeGreaterThan(0);
      expect(html.indexOf('<body>')).toBeGreaterThan(0);
      expect(html.indexOf(content)).toBeGreaterThan(0);
      expect(html).toMatch(/<\/body>\s*<\/html>\s*$/);
    });

    it('should handle empty content', () => {
      const html = PDFTemplates.getFullHTML('');

      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
      expect(html).toContain('<title>MD2PDF Document</title>');
    });

    it('should escape HTML entities properly in content', () => {
      const content = '<script>alert("xss")</script>';
      const html = PDFTemplates.getFullHTML(content);

      // Content should be included as-is (the content is already processed HTML)
      expect(html).toContain(content);
    });

    it('should set proper viewport meta tag', () => {
      const html = PDFTemplates.getFullHTML('<h1>Test</h1>');

      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
    });

    it('should trim whitespace from final HTML', () => {
      const html = PDFTemplates.getFullHTML('<h1>Test</h1>');

      expect(html).not.toMatch(/^\s/);
      expect(html).not.toMatch(/\s$/);
    });
  });

  describe('CSS Integration', () => {
    it('should properly combine default and Chinese CSS', () => {
      const content = '<h1>測試</h1>';
      const html = PDFTemplates.getFullHTML(content);

      // Should contain both default styles and Chinese styles
      expect(html).toContain('font-family: system-ui'); // Default CSS
      expect(html).toContain('Noto Sans CJK SC'); // Chinese CSS
      expect(html).toContain('text-align: justify'); // Chinese text formatting
    });

    it('should properly combine all three CSS sources when custom CSS is provided', () => {
      const content = '<h1>測試</h1>';
      const customCSS = '.custom { color: blue; }';
      const html = PDFTemplates.getFullHTML(content, 'Title', customCSS);

      expect(html).toContain('font-family: system-ui'); // Default
      expect(html).toContain('Noto Sans CJK SC'); // Chinese
      expect(html).toContain('.custom { color: blue; }'); // Custom
    });
  });

  describe('getFullHTMLWithTOC', () => {
    it('should generate HTML with TOC included', () => {
      const tocHTML =
        '<div class="toc-container"><h2>目錄</h2><ul><li><a href="#heading1">Test Heading</a></li></ul></div>';
      const content = '<h1 id="heading1">Test Heading</h1><p>Content</p>';
      const html = PDFTemplates.getFullHTMLWithTOC(tocHTML, content, 'Test Document');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Document</title>');
      expect(html).toContain(tocHTML);
      expect(html).toContain(content);
      expect(html.indexOf(tocHTML)).toBeLessThan(html.indexOf(content));
    });

    it('should handle empty TOC', () => {
      const content = '<h1>Test Heading</h1><p>Content</p>';
      const html = PDFTemplates.getFullHTMLWithTOC('', content);

      expect(html).toContain(content);
      // TOC CSS is always included, but no actual TOC content
      expect(html).toContain('toc-container'); // CSS class definition
      expect(html).not.toContain('<div class="toc-container">'); // No actual TOC div
    });

    it('should include custom CSS with TOC', () => {
      const tocHTML = '<div class="toc-container">TOC</div>';
      const content = '<h1>Test</h1>';
      const customCSS = '.custom { color: red; }';
      const html = PDFTemplates.getFullHTMLWithTOC(tocHTML, content, 'Title', customCSS);

      expect(html).toContain(customCSS);
      expect(html).toContain('toc-container'); // TOC CSS should be included
      expect(html).toContain('font-family: system-ui'); // Default CSS
      expect(html).toContain('Noto Sans CJK SC'); // Chinese CSS
    });

    it('should handle null TOC HTML', () => {
      const content = '<h1>Test</h1>';
      const html = PDFTemplates.getFullHTMLWithTOC(null as any, content);

      expect(html).toContain(content);
      expect(html).toContain('<!DOCTYPE html>');
    });
  });
});
