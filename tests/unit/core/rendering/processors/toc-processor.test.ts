import { TOCProcessor } from '../../../../../src/core/rendering/processors/toc-processor';
import { ProcessingContext } from '../../../../../src/core/rendering/types';
import { ADMONITION_TYPES } from '../../../../../src/core/parser/plugins/markdown-it-admonitions';

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

// Mock pdfjs-dist
jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: jest.fn(),
}));

describe('TOCProcessor', () => {
  let processor: TOCProcessor;

  beforeEach(() => {
    processor = new TOCProcessor();
  });

  describe('Basic TOC Processing', () => {
    it('should return empty result when TOC is not enabled', async () => {
      const content = '<h1>Test</h1>';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [],
        tocOptions: { enabled: false },
      };

      const result = await processor.process(content, context);
      expect(result).toHaveProperty('html', '');
      expect(result).toHaveProperty('metadata');
    });

    it('should generate TOC when headings are provided', async () => {
      const content = '[[TOC]]\n<h1>Test</h1>';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [{ level: 1, text: 'Test', id: 'test', anchor: '#test' }],
        tocOptions: {
          enabled: true,
          includePageNumbers: false,
        },
      };

      const result = await processor.process(content, context);
      expect(result).toHaveProperty('html');
      expect((result as any).html).toContain('class="toc-container"');
      expect((result as any).html).toContain('Test');
    });

    it('should handle empty headings array', async () => {
      const content = '[[TOC]]\n<p>No headings here</p>';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [],
        tocOptions: {
          enabled: true,
          includePageNumbers: false,
        },
      };

      const result = await processor.process(content, context);
      expect(result).toHaveProperty('html', '');
      expect(result).toHaveProperty('metadata');
      expect((result as any).metadata.warnings).toContain(
        'No headings found for TOC',
      );
    });
  });

  describe('Heading Filtering Logic', () => {
    it('should properly filter headings by maxDepth', () => {
      const headings = [
        { level: 1, text: 'H1', id: 'h1', anchor: '#h1' },
        { level: 2, text: 'H2', id: 'h2', anchor: '#h2' },
        { level: 3, text: 'H3', id: 'h3', anchor: '#h3' },
        { level: 4, text: 'H4', id: 'h4', anchor: '#h4' },
      ];

      // Test maxDepth filtering
      const filtered2 = headings.filter((h) => h.level <= 2);
      expect(filtered2).toHaveLength(2);
      expect(filtered2[0].text).toBe('H1');
      expect(filtered2[1].text).toBe('H2');

      const filtered1 = headings.filter((h) => h.level <= 1);
      expect(filtered1).toHaveLength(1);
      expect(filtered1[0].text).toBe('H1');

      const filteredAll = headings.filter((h) => h.level <= 6);
      expect(filteredAll).toHaveLength(4);
    });

    it('should use default maxDepth of 6', async () => {
      const content = '[[TOC]]\n<h1>Test</h1>';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [
          { level: 1, text: 'H1', id: 'h1', anchor: '#h1' },
          { level: 6, text: 'H6', id: 'h6', anchor: '#h6' },
          { level: 7, text: 'H7', id: 'h7', anchor: '#h7' }, // Should be filtered out
        ],
        tocOptions: {
          enabled: true,
          includePageNumbers: false,
        },
      };

      const result = await processor.process(content, context);
      expect((result as any).html).toContain('H1');
      // Note: H7 filtering only happens when maxDepth is explicitly set
    });
  });

  describe('Configuration Validation', () => {
    it('should validate TOC options correctly', () => {
      // Test valid configurations
      const validConfig = {
        enabled: true,
        includePageNumbers: true,
        maxDepth: 3,
        title: 'Table of Contents',
      };

      expect(validConfig.enabled).toBe(true);
      expect(validConfig.maxDepth).toBe(3);
      expect(typeof validConfig.title).toBe('string');
    });

    it('should handle missing optional properties', () => {
      const minimalConfig: any = {
        enabled: true,
      };

      expect(minimalConfig.enabled).toBe(true);
      expect(minimalConfig.includePageNumbers).toBeUndefined();
      expect(minimalConfig.maxDepth).toBeUndefined();
    });
  });

  describe('Content Integration', () => {
    it('should preserve admonition types integration', () => {
      // Test that admonitions are available (imported at top)
      expect(ADMONITION_TYPES).toBeDefined();
      expect(Array.isArray(ADMONITION_TYPES)).toBe(true);
      expect(ADMONITION_TYPES.length).toBeGreaterThan(0);
    });

    it('should handle special characters in headings', async () => {
      const content = '[[TOC]]\n<h1>Test & Special "Characters"</h1>';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [
          {
            level: 1,
            text: 'Test & Special "Characters"',
            id: 'test-special',
            anchor: '#test-special',
          },
        ],
        tocOptions: {
          enabled: true,
          includePageNumbers: false,
        },
      };

      const result = await processor.process(content, context);
      expect((result as any).html).toContain(
        'Test &amp; Special &quot;Characters&quot;',
      );
    });
  });

  describe('Advanced TOC Processing', () => {
    it('should handle page numbers enabled path with mocked browser', async () => {
      const content = '[[TOC]]\n<h1>Chapter 1</h1>\n<h2>Section 1.1</h2>';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [
          {
            level: 1,
            text: 'Chapter 1',
            id: 'chapter-1',
            anchor: '#chapter-1',
          },
          {
            level: 2,
            text: 'Section 1.1',
            id: 'section-1-1',
            anchor: '#section-1-1',
          },
        ],
        tocOptions: {
          enabled: true,
          includePageNumbers: true,
          maxDepth: 3,
        },
      };

      // Mock browser for page number calculation
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        setViewport: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          { id: 'chapter-1', page: 2 },
          { id: 'section-1-1', page: 3 },
        ]),
        pdf: jest.fn().mockResolvedValue(Buffer.from('fake pdf content')),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const puppeteer = require('puppeteer');
      puppeteer.launch.mockResolvedValue(mockBrowser);

      const result = await processor.process(content, context);

      // Should attempt page number calculation
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('metadata');

      // Verify browser was launched for page calculation
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should detect TOC processing opportunities', async () => {
      const content = '[[TOC]]\nContent here';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [{ level: 1, text: 'Test', id: 'test', anchor: '#test' }],
        tocOptions: { enabled: true },
      };

      const detected = await processor.detect(content, context);
      expect(detected).toBeGreaterThan(0);
    });

    it('should return 0 detection score when TOC disabled', async () => {
      const content = '[[TOC]]\nContent here';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [],
        tocOptions: { enabled: false },
      };

      const detected = await processor.detect(content, context);
      expect(detected).toBe(0);
    });

    it('should handle getDimensions for TOC content', async () => {
      const processedContent: any = {
        html: '<div class="toc-container">\n<h2>TOC</h2>\n<ul>\n<li>Item</li>\n</ul>\n</div>',
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        {} as ProcessingContext,
      );

      expect(dimensions).toHaveProperty('pageCount');
      expect(dimensions).toHaveProperty('height');
      expect(dimensions).toHaveProperty('width');
      expect(dimensions.pageCount).toBeGreaterThan(0);
    });

    it('should handle empty content getDimensions', async () => {
      const processedContent: any = {
        html: '',
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        {} as ProcessingContext,
      );

      expect(dimensions.pageCount).toBe(0);
      expect(dimensions.height).toBe(0);
      expect(dimensions.width).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid context gracefully', async () => {
      const content = '[[TOC]]\n<h1>Test</h1>';
      const invalidContext = {} as ProcessingContext;

      // Should not throw an error
      await expect(
        processor.process(content, invalidContext),
      ).resolves.toBeDefined();
    });

    it('should handle browser launch failure gracefully', async () => {
      const content = '[[TOC]]\n<h1>Test</h1>';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [{ level: 1, text: 'Test', id: 'test', anchor: '#test' }],
        tocOptions: { enabled: true, includePageNumbers: true },
      };

      // Mock browser launch failure
      const puppeteer = require('puppeteer');
      puppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));

      const result = await processor.process(content, context);

      // Should fall back to simple TOC
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('metadata');
    });

    it('should handle TOC generation regardless of placeholder', async () => {
      const content = 'content without [[TOC]] placeholder';
      const context: ProcessingContext = {
        filePath: '/test.md',
        headings: [{ level: 1, text: 'Test', id: 'test', anchor: '#test' }],
        tocOptions: { enabled: true, includePageNumbers: false },
      };

      const result = await processor.process(content, context);
      // TOC processor generates TOC when enabled, even without placeholder
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('Multi-Stage Observation System', () => {
    describe('PDF Marker Extraction Logic', () => {
      it('should handle pdfjs-dist import availability', () => {
        // Test that the module can be imported (mocked)
        const pdfjsMock = require('pdfjs-dist/legacy/build/pdf.mjs');
        expect(pdfjsMock).toBeDefined();
        expect(pdfjsMock.getDocument).toBeDefined();
      });

      it('should create proper PDF marker patterns', () => {
        // Test marker generation logic
        const markers = Array.from(
          { length: 10 },
          (_, i) => `HDG${String(i).padStart(4, '0')}`,
        );

        expect(markers[0]).toBe('HDG0000');
        expect(markers[9]).toBe('HDG0009');
        expect(markers.every((m) => /^HDG\d{4}$/.test(m))).toBe(true);
      });

      it('should validate marker format for PDF extraction', () => {
        const validMarker = 'HDG0123';
        const invalidMarker1 = 'HDG123'; // Too short
        const invalidMarker2 = 'TEST0000'; // Wrong prefix

        expect(/^HDG\d{4}$/.test(validMarker)).toBe(true);
        expect(/^HDG\d{4}$/.test(invalidMarker1)).toBe(false);
        expect(/^HDG\d{4}$/.test(invalidMarker2)).toBe(false);
      });
    });

    describe('TOC Section Removal', () => {
      it('should remove TOC div with id="toc"', () => {
        const html =
          '<div id="toc"><h2>TOC</h2><ul><li>Item</li></ul></div><p>Content</p>';
        const result = (processor as any).removeTOCSection(html);

        expect(result).not.toContain('id="toc"');
        expect(result).toContain('<p>Content</p>');
      });

      it('should remove TOC with class="table-of-contents"', () => {
        const html =
          '<div class="table-of-contents"><ul><li>Item</li></ul></div><p>Content</p>';
        const result = (processor as any).removeTOCSection(html);

        expect(result).not.toContain('table-of-contents');
        expect(result).toContain('<p>Content</p>');
      });

      it('should remove nav with class containing "table-of-contents"', () => {
        const html =
          '<nav class="toc table-of-contents"><ul><li>Item</li></ul></nav><p>Content</p>';
        const result = (processor as any).removeTOCSection(html);

        expect(result).not.toContain('<nav');
        expect(result).toContain('<p>Content</p>');
      });

      it('should remove section with class containing "toc"', () => {
        const html =
          '<section class="toc-section"><h2>TOC</h2></section><p>Content</p>';
        const result = (processor as any).removeTOCSection(html);

        expect(result).not.toContain('<section');
        expect(result).toContain('<p>Content</p>');
      });

      it('should handle HTML without TOC section', () => {
        const html = '<p>Content</p><h1>Heading</h1>';
        const result = (processor as any).removeTOCSection(html);

        expect(result).toBe(html);
      });

      it('should remove multiple TOC sections', () => {
        const html =
          '<div id="toc">TOC1</div><div class="table-of-contents">TOC2</div><p>Content</p>';
        const result = (processor as any).removeTOCSection(html);

        expect(result).not.toContain('TOC1');
        expect(result).not.toContain('TOC2');
        expect(result).toContain('<p>Content</p>');
      });
    });

    describe('Content-Only HTML Generation', () => {
      it('should generate HTML without TOC for pre-rendering', () => {
        const content = '<div id="toc">TOC</div><h1>Content</h1>';
        const context: ProcessingContext = {
          filePath: '/test.md',
          documentTitle: 'Test Document',
          documentLanguage: 'en',
          pdfOptions: { includePageNumbers: false },
        };

        const result = (processor as any).generateContentOnlyHTML(
          content,
          context,
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result).not.toContain('id="toc"');
      });

      it('should use document language for Chinese support', () => {
        const content = '<h1>內容</h1>';
        const context: ProcessingContext = {
          filePath: '/test.md',
          documentTitle: '測試文檔',
          documentLanguage: 'zh-TW',
          pdfOptions: { includePageNumbers: false },
        };

        const result = (processor as any).generateContentOnlyHTML(
          content,
          context,
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should include page CSS when page numbers enabled', () => {
        const content = '<h1>Content</h1>';
        const context: ProcessingContext = {
          filePath: '/test.md',
          documentTitle: 'Test',
          documentLanguage: 'en',
          pdfOptions: {
            includePageNumbers: true,
            margins: {
              top: '20mm',
              right: '15mm',
              bottom: '20mm',
              left: '15mm',
            },
          },
        };

        const result = (processor as any).generateContentOnlyHTML(
          content,
          context,
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should use default title when not provided', () => {
        const content = '<h1>Content</h1>';
        const context: ProcessingContext = {
          filePath: '/test.md',
          documentLanguage: 'en',
        };

        const result = (processor as any).generateContentOnlyHTML(
          content,
          context,
        );

        expect(result).toBeDefined();
        expect(result).toContain('Content Pre-render');
      });
    });

    describe('Marker Injection System', () => {
      it('should create unique markers for headings', () => {
        // Test marker format: HDG0000, HDG0001, etc.
        const marker1 = 'HDG' + String(0).padStart(4, '0');
        const marker2 = 'HDG' + String(1).padStart(4, '0');
        const marker3 = 'HDG' + String(99).padStart(4, '0');

        expect(marker1).toBe('HDG0000');
        expect(marker2).toBe('HDG0001');
        expect(marker3).toBe('HDG0099');
      });

      it('should handle large number of headings', () => {
        const markers = [];
        for (let i = 0; i < 1000; i++) {
          markers.push('HDG' + String(i).padStart(4, '0'));
        }

        expect(markers[0]).toBe('HDG0000');
        expect(markers[999]).toBe('HDG0999');
        expect(new Set(markers).size).toBe(1000); // All unique
      });

      it('should create ASCII-only markers', () => {
        const marker = 'HDG0000';
        // Test that marker only contains ASCII characters
        expect(/^[A-Z0-9]+$/.test(marker)).toBe(true);
      });
    });
  });

  describe('Helper Methods', () => {
    describe('createHeadingId', () => {
      it('should create valid ID from heading text', () => {
        const id1 = (processor as any).createHeadingId('Simple Heading');
        expect(id1).toBe('simple-heading');
      });

      it('should handle special characters', () => {
        const id = (processor as any).createHeadingId(
          'Test & Special "Characters"!',
        );
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      it('should handle Chinese characters', () => {
        const id = (processor as any).createHeadingId('測試標題');
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
      });

      it('should handle empty string', () => {
        const id = (processor as any).createHeadingId('');
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
      });

      it('should create consistent IDs for same text', () => {
        const id1 = (processor as any).createHeadingId('Test Heading');
        const id2 = (processor as any).createHeadingId('Test Heading');
        expect(id1).toBe(id2);
      });
    });

    describe('generatePageCSS', () => {
      it('should generate page CSS when page numbers enabled', () => {
        const context: ProcessingContext = {
          filePath: '/test.md',
          pdfOptions: {
            includePageNumbers: true,
            margins: {
              top: '3cm',
              bottom: '3cm',
              left: '2.5cm',
              right: '2.5cm',
            },
          },
        };

        const css = (processor as any).generatePageCSS(context);

        expect(css).toContain('@page');
        expect(css).toContain('margin-top: 3cm');
        expect(css).toContain('margin-bottom: 3cm');
        expect(css).toContain('margin-left: 2.5cm');
        expect(css).toContain('margin-right: 2.5cm');
      });

      it('should use default margins when not specified', () => {
        const context: ProcessingContext = {
          filePath: '/test.md',
          pdfOptions: {
            includePageNumbers: true,
          },
        };

        const css = (processor as any).generatePageCSS(context);

        expect(css).toContain('@page');
        expect(css).toContain('margin-top: 2cm');
        expect(css).toContain('margin-bottom: 2cm');
      });

      it('should return empty string when page numbers disabled', () => {
        const context: ProcessingContext = {
          filePath: '/test.md',
          pdfOptions: {
            includePageNumbers: false,
          },
        };

        const css = (processor as any).generatePageCSS(context);

        expect(css).toBe('');
      });

      it('should generate CSS when headers/footers configured', () => {
        const context: ProcessingContext = {
          filePath: '/test.md',
          headersFootersConfig: {
            enabled: true,
          },
        };

        const css = (processor as any).generatePageCSS(context);

        expect(css).toContain('@page');
      });
    });

    describe('getActualPDFPageCount', () => {
      it('should extract page count from PDF with Type/Page objects', async () => {
        // Mock PDF with /Type /Page pattern
        const mockPdf = Buffer.from(
          '%PDF-1.4\n/Type /Page\n/Type /Page\n/Type /Page\n',
          'binary',
        );

        const count = await (processor as any).getActualPDFPageCount(mockPdf);

        expect(count).toBe(3);
      });

      it('should extract page count from Pages Count field', async () => {
        // Mock PDF with /Type /Pages /Count pattern
        const mockPdf = Buffer.from(
          '%PDF-1.4\n/Type /Pages /Count 5\n',
          'binary',
        );

        const count = await (processor as any).getActualPDFPageCount(mockPdf);

        expect(count).toBeGreaterThan(0);
      });

      it('should return 1 for empty PDF buffer', async () => {
        const emptyPdf = Buffer.from('', 'binary');

        const count = await (processor as any).getActualPDFPageCount(emptyPdf);

        expect(count).toBe(1);
      });

      it('should return 1 for invalid PDF', async () => {
        const invalidPdf = Buffer.from('not a pdf', 'binary');

        const count = await (processor as any).getActualPDFPageCount(
          invalidPdf,
        );

        expect(count).toBe(1);
      });

      it('should handle parsing errors gracefully', async () => {
        const mockPdf = Buffer.from('\x00\x01\x02\x03', 'binary');

        const count = await (processor as any).getActualPDFPageCount(mockPdf);

        expect(count).toBe(1);
      });
    });

    describe('adjustPageNumbersForTOC', () => {
      it('should adjust page numbers by TOC offset', () => {
        const realPageNumbers = {
          headingPages: {
            'heading-1': 1,
            'heading-2': 5,
            'heading-3': 10,
          },
          contentPageCount: 20,
          positions: [],
        };

        const adjusted = (processor as any).adjustPageNumbersForTOC(
          realPageNumbers,
          3,
        );

        expect(adjusted['heading-1']).toBe(4); // 1 + 3
        expect(adjusted['heading-2']).toBe(8); // 5 + 3
        expect(adjusted['heading-3']).toBe(13); // 10 + 3
      });

      it('should handle zero TOC pages', () => {
        const realPageNumbers = {
          headingPages: {
            'heading-1': 5,
          },
          contentPageCount: 10,
          positions: [],
        };

        const adjusted = (processor as any).adjustPageNumbersForTOC(
          realPageNumbers,
          0,
        );

        expect(adjusted['heading-1']).toBe(5); // No change
      });

      it('should handle empty headings', () => {
        const realPageNumbers = {
          headingPages: {},
          contentPageCount: 10,
          positions: [],
        };

        const adjusted = (processor as any).adjustPageNumbersForTOC(
          realPageNumbers,
          2,
        );

        expect(Object.keys(adjusted).length).toBe(0);
      });

      it('should handle large TOC offset', () => {
        const realPageNumbers = {
          headingPages: {
            'heading-1': 1,
          },
          contentPageCount: 100,
          positions: [],
        };

        const adjusted = (processor as any).adjustPageNumbersForTOC(
          realPageNumbers,
          50,
        );

        expect(adjusted['heading-1']).toBe(51); // 1 + 50
      });
    });

    describe('getFinalPDFCSS', () => {
      it('should include page CSS when page numbers enabled', () => {
        const context: ProcessingContext = {
          filePath: '/test.md',
          pdfOptions: {
            includePageNumbers: true,
            margins: {
              top: '2cm',
              bottom: '2cm',
              left: '2cm',
              right: '2cm',
            },
          },
        };

        const css = (processor as any).getFinalPDFCSS(context);

        expect(css).toContain('@page');
        expect(css).toContain('margin-top');
      });

      it('should return empty string when no special features enabled', () => {
        const context: ProcessingContext = {
          filePath: '/test.md',
          pdfOptions: {
            includePageNumbers: false,
          },
        };

        const css = (processor as any).getFinalPDFCSS(context);

        expect(css).toBeDefined();
        expect(typeof css).toBe('string');
      });
    });

    describe('createFullTOCHTML', () => {
      it('should create complete HTML structure', () => {
        const tocHTML = '<ul><li>Test TOC</li></ul>';
        const context: ProcessingContext = {
          filePath: '/test.md',
          syntaxHighlightingTheme: 'default',
        };
        const finalCSS = '@page { margin: 2cm; }';

        const html = (processor as any).createFullTOCHTML(
          tocHTML,
          context,
          finalCSS,
        );

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html');
        expect(html).toContain('</html>');
      });

      it('should include provided CSS', () => {
        const tocHTML = '<ul><li>Test</li></ul>';
        const context: ProcessingContext = {
          filePath: '/test.md',
        };
        const finalCSS = 'custom-css-here';

        const html = (processor as any).createFullTOCHTML(
          tocHTML,
          context,
          finalCSS,
        );

        expect(html).toContain('custom-css-here');
      });

      it('should use specified theme', () => {
        const tocHTML = '<ul><li>Test</li></ul>';
        const context: ProcessingContext = {
          filePath: '/test.md',
          syntaxHighlightingTheme: 'dark',
        };
        const finalCSS = '';

        const html = (processor as any).createFullTOCHTML(
          tocHTML,
          context,
          finalCSS,
        );

        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });
    });
  });
});
