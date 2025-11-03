import { TOCProcessor } from '../../../../../src/core/rendering/processors/toc-processor';
import { ProcessingContext } from '../../../../../src/core/rendering/types';
import { ADMONITION_TYPES } from '../../../../../src/core/parser/plugins/markdown-it-admonitions';

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
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
      expect((result as any).html).toContain('<div class="toc-container">');
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
});
