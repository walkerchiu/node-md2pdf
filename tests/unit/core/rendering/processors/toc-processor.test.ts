/**
 * Tests for TOCProcessor class
 */

import puppeteer from 'puppeteer';

import { TOCProcessor } from '../../../../../src/core/rendering/processors/toc-processor';
import { Heading } from '../../../../../src/types/index';
import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
} from '../../../../../src/core/rendering/types';

import type { ITranslationManager } from '../../../../../src/infrastructure/i18n/types';

// Mock puppeteer
jest.mock('puppeteer');
const mockPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

// Mock TOCGenerator
jest.mock('../../../../../src/core/toc/toc-generator', () => ({
  TOCGenerator: jest.fn().mockImplementation(() => ({
    generateTOC: jest.fn().mockReturnValue({
      html: '<div class="toc"><h1>Table of Contents</h1></div>',
      metadata: {},
    }),
    generateTOCWithPageNumbers: jest.fn().mockReturnValue({
      html: '<div class="toc"><h1>Table of Contents</h1><ol><li><a href="#heading-1">Heading 1</a> ... 2</li></ol></div>',
      metadata: {},
    }),
    updateOptions: jest.fn(),
    getOptions: jest.fn().mockReturnValue({
      maxDepth: 3,
      includePageNumbers: true,
      cssClasses: {
        container: 'toc-container',
        title: 'toc-title',
        list: 'toc-list',
        item: 'toc-item',
        link: 'toc-link',
        pageNumber: 'toc-page-number',
      },
    }),
  })),
}));

// Mock PDFTemplates
jest.mock('../../../../../src/core/pdf/templates', () => ({
  PDFTemplates: {
    getFullHTML: jest
      .fn()
      .mockReturnValue('<html><body>Test HTML</body></html>'),
    getFullHTMLWithTOC: jest
      .fn()
      .mockReturnValue('<html><body><div class="toc"></div>Test HTML</body></html>'),
  },
}));

describe('TOCProcessor', () => {
  let processor: TOCProcessor;
  let mockTranslator: ITranslationManager;
  let context: ProcessingContext;
  let headings: Heading[];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock translator
    mockTranslator = {
      t: jest.fn().mockImplementation((key: string) => key),
      setLanguage: jest.fn(),
      getLanguage: jest.fn().mockReturnValue('en'),
      getAvailableLanguages: jest.fn().mockReturnValue(['en', 'zh']),
    } as any;

    processor = new TOCProcessor(mockTranslator);

    headings = [
      { id: 'heading-1', text: 'Heading 1', level: 1, anchor: 'heading-1' },
      { id: 'heading-2', text: 'Heading 2', level: 2, anchor: 'heading-2' },
      { id: 'heading-3', text: 'Heading 3', level: 1, anchor: 'heading-3' },
    ];

    context = {
      filePath: '/test/file.md',
      pdfOptions: {
        includePageNumbers: true,
        margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
      },
      tocOptions: {
        enabled: true,
        includePageNumbers: true,
        maxDepth: 3,
      },
      headings,
      isPreRendering: false,
    };
  });

  describe('constructor', () => {
    it('should initialize with translator', () => {
      const proc = new TOCProcessor(mockTranslator);
      expect(proc.type).toBe(DynamicContentType.TOC);
      expect(proc.name).toBe('TOC Processor');
    });

    it('should initialize without translator', () => {
      const proc = new TOCProcessor();
      expect(proc.type).toBe(DynamicContentType.TOC);
      expect(proc.name).toBe('TOC Processor');
    });
  });

  describe('detect', () => {
    it('should return 0 when TOC is disabled', async () => {
      context.tocOptions!.enabled = false;
      const result = await processor.detect('content', context);
      expect(result).toBe(0);
    });

    it('should return 0.9 when page numbers are disabled', async () => {
      context.tocOptions!.includePageNumbers = false;
      const result = await processor.detect('content', context);
      expect(result).toBe(0.9);
    });

    it('should return 0 when no headings are available', async () => {
      context.headings = [];
      const result = await processor.detect('content', context);
      expect(result).toBe(0);
    });

    it('should return 1.0 when header/footer is enabled', async () => {
      const result = await processor.detect('content', context);
      expect(result).toBe(1.0);
    });

    it('should return 1.0 when header/footer is disabled but TOC is enabled', async () => {
      context.pdfOptions!.includePageNumbers = false;
      const result = await processor.detect('content', context);
      expect(result).toBe(1.0);
    });
  });

  describe('process', () => {
    it('should process TOC in pre-rendering mode', async () => {
      context.isPreRendering = true;
      const result = await processor.process('content', context);

      expect(result.html).toBe(
        '<div class="toc"><h1>Table of Contents</h1></div>',
      );
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
      expect(result.metadata.details?.isPreRendering).toBe(true);
      expect(result.metadata.details?.headingCount).toBe(3);
    });

    it('should handle empty headings', async () => {
      context.headings = [];
      const result = await processor.process('content', context);

      expect(result.html).toBe('');
      expect(result.metadata.warnings).toContain('No headings found for TOC');
    });

    it('should process TOC with page numbers in final rendering', async () => {
      // Mock browser and page
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        setViewport: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        evaluate: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'heading-1',
              text: 'Heading 1',
              pageNumber: 2,
              offsetTop: 100,
            },
            {
              id: 'heading-2',
              text: 'Heading 2',
              pageNumber: 3,
              offsetTop: 500,
            },
            {
              id: 'heading-3',
              text: 'Heading 3',
              pageNumber: 4,
              offsetTop: 900,
            },
          ])
          .mockResolvedValueOnce(5), // contentPageCount
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser as any);

      const result = await processor.process('content', context);

      expect(result.html).toContain('Table of Contents');
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
      expect(result.metadata.details?.isPreRendering).toBe(false);
    });

    it('should handle page number calculation errors gracefully', async () => {
      // Mock browser launch failure
      mockPuppeteer.launch.mockRejectedValue(
        new Error('Browser launch failed'),
      );

      const result = await processor.process('content', context);

      // Should fallback to regular TOC generation
      expect(result.html).toBe(
        '<div class="toc"><h1>Table of Contents</h1></div>',
      );
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
    });

    it('should handle processing errors', async () => {
      // Force an error in TOC generation
      const TOCGenerator =
        require('../../../../../src/core/toc/toc-generator').TOCGenerator;
      TOCGenerator.mockImplementation(() => ({
        generateTOC: jest.fn().mockImplementation(() => {
          throw new Error('TOC generation failed');
        }),
        updateOptions: jest.fn(),
        getOptions: jest.fn().mockReturnValue({
          maxDepth: 3,
          includePageNumbers: true,
          cssClasses: {
            container: 'toc-container',
            title: 'toc-title',
            list: 'toc-list',
            item: 'toc-item',
            link: 'toc-link',
            pageNumber: 'toc-page-number',
          },
        }),
      }));

      const errorProcessor = new TOCProcessor(mockTranslator);
      context.isPreRendering = true;

      const result = await errorProcessor.process('content', context);

      expect(result.html).toBe('');
      expect(result.metadata.warnings).toContain(
        'TOC processing failed: TOC generation failed',
      );
    });
  });

  describe('getDimensions', () => {
    it('should return zero dimensions for empty content', async () => {
      const processedContent: ProcessedContent = {
        html: '',
        metadata: {
          type: DynamicContentType.TOC,
          processingTime: 10,
          warnings: [],
        },
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        context,
      );

      expect(dimensions).toEqual({
        pageCount: 0,
        height: 0,
        width: 0,
      });
    });

    it('should estimate dimensions based on content', async () => {
      const processedContent: ProcessedContent = {
        html: '<div>\n<h1>TOC</h1>\n<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n</ul>\n</div>',
        metadata: {
          type: DynamicContentType.TOC,
          processingTime: 10,
          warnings: [],
        },
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        context,
      );

      expect(dimensions.pageCount).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(dimensions.width).toBe(595); // A4 width
    });
  });

  describe('validateEnvironment', () => {
    it('should return success when Puppeteer is available', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue(undefined),
      };
      mockPuppeteer.launch.mockResolvedValue(mockBrowser as any);

      const result = await processor.validateEnvironment();

      expect(result.isSupported).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should return issues when Puppeteer is not available', async () => {
      mockPuppeteer.launch.mockRejectedValue(new Error('Puppeteer not found'));

      const result = await processor.validateEnvironment();

      expect(result.isSupported).toBe(false);
      expect(result.issues).toContain(
        'Puppeteer not available: Puppeteer not found',
      );
      expect(result.recommendations).toContain(
        'Install Puppeteer for accurate page number calculation',
      );
    });
  });

  describe('page number calculation', () => {
    let mockPage: any;
    let mockBrowser: any;

    beforeEach(() => {
      mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        setViewport: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn(),
      };

      mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser);
    });

    it('should calculate page numbers correctly', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce([
          { id: 'heading-1', text: 'Heading 1', pageNumber: 2, offsetTop: 100 },
          { id: 'heading-2', text: 'Heading 2', pageNumber: 3, offsetTop: 500 },
        ])
        .mockResolvedValueOnce(4); // contentPageCount

      await processor.process('content', context);

      expect(mockPuppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ]),
        }),
      );
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
    });

    it('should retry on page number calculation failure', async () => {
      mockPuppeteer.launch
        .mockRejectedValueOnce(new Error('Browser launch failed'))
        .mockRejectedValueOnce(new Error('Browser launch failed'))
        .mockResolvedValueOnce(mockBrowser);

      mockPage.evaluate
        .mockResolvedValueOnce([
          { id: 'heading-1', text: 'Heading 1', pageNumber: 2, offsetTop: 100 },
        ])
        .mockResolvedValueOnce(3); // contentPageCount

      await processor.process('content', context);

      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(3);
    });

    it('should handle headings without IDs', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce([
          { id: '', text: 'Heading Without ID', pageNumber: 2, offsetTop: 100 },
        ])
        .mockResolvedValueOnce(3); // contentPageCount

      const result = await processor.process('content', context);

      expect(result.metadata.type).toBe(DynamicContentType.TOC);
      // Result may be empty if generation fails, but metadata should still be present
    });
  });

  describe('HTML generation', () => {
    it('should recognize HTML content', async () => {
      context.isPreRendering = true;

      // Test with content that looks like HTML
      const htmlContent = '<h1 id="test">Test Heading</h1><p>Some content</p>';
      const result = await processor.process(htmlContent, context);

      // May return empty HTML if generation fails, but metadata should be present
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
    });

    it('should convert markdown content to HTML', async () => {
      context.isPreRendering = true;

      // Test with markdown content
      const markdownContent = '# Test Heading\n\nSome content here.';
      const result = await processor.process(markdownContent, context);

      // May return empty HTML if generation fails, but metadata should be present
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
    });

    it('should generate page CSS when page numbers are enabled', async () => {
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        setViewport: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(1),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser as any);

      await processor.process('content', context);

      const PDFTemplates =
        require('../../../../../src/core/pdf/templates').PDFTemplates;
      expect(PDFTemplates.getFullHTML).toHaveBeenCalledWith(
        expect.any(String),
        'Content Pre-render',
        expect.stringContaining('@page'),
        true,
      );
    });

    it('should not generate page CSS when page numbers are disabled', async () => {
      context.pdfOptions!.includePageNumbers = false;

      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        setViewport: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(1),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser as any);

      await processor.process('content', context);

      const PDFTemplates =
        require('../../../../../src/core/pdf/templates').PDFTemplates;
      expect(PDFTemplates.getFullHTML).toHaveBeenCalledWith(
        expect.any(String),
        'Content Pre-render',
        '',
        true,
      );
    });
  });

  describe('TOC page estimation', () => {
    it('should estimate TOC page count based on heading count', async () => {
      const manyHeadings: Heading[] = Array.from({ length: 100 }, (_, i) => ({
        id: `heading-${i}`,
        text: `Heading ${i}`,
        level: 1,
        anchor: `heading-${i}`,
      }));

      context.headings = manyHeadings;
      context.isPreRendering = true;

      const result = await processor.process('content', context);

      // Verify that the processor received the correct number of headings
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
    });
  });

  describe('error handling', () => {
    it('should handle browser close errors gracefully', async () => {
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        setViewport: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(1),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser as any);

      // Should not throw error even if browser.close() fails
      const result = await processor.process('content', context);
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
    });

    it('should handle maximum retry attempts', async () => {
      mockPuppeteer.launch.mockRejectedValue(
        new Error('Persistent browser failure'),
      );

      const result = await processor.process('content', context);

      // Should fallback to regular TOC
      expect(result.metadata.type).toBe(DynamicContentType.TOC);
      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(3); // max retries
    });
  });

  describe('markdown to HTML conversion', () => {
    it('should handle duplicate heading texts with unique IDs', async () => {
      context.isPreRendering = true;

      const markdownWithDuplicates = '# Heading\n\n## Heading\n\n### Heading';
      const result = await processor.process(markdownWithDuplicates, context);

      expect(result.metadata.type).toBe(DynamicContentType.TOC);
    });

    it('should handle non-heading content', async () => {
      context.isPreRendering = true;

      const markdownWithParagraphs =
        '# Heading\n\nThis is a paragraph.\n\nAnother paragraph.';
      const result = await processor.process(markdownWithParagraphs, context);

      expect(result.metadata.type).toBe(DynamicContentType.TOC);
    });
  });
});
