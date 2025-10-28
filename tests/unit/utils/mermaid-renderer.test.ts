/**
 * Unit tests for MermaidRenderer
 * Tests the Mermaid diagram rendering utility using Puppeteer
 */

import { jest } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';

import { DEFAULT_MERMAID } from '../../../src/infrastructure/config/constants';
import {
  MermaidRenderer,
  MermaidRenderOptions,
} from '../../../src/utils/mermaid-renderer';

// Mock Puppeteer
jest.mock('puppeteer');
const mockPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('MermaidRenderer', () => {
  let renderer: MermaidRenderer;
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    // Reset singleton
    (MermaidRenderer as any).instance = null;

    // Setup mocks
    mockPage = {
      setViewport: jest.fn(),
      setContent: jest.fn(),
      waitForSelector: jest.fn(),
      evaluate: jest.fn().mockImplementation(async () => ({
        svg: '<svg width="200" height="100">test diagram</svg>',
        width: 200,
        height: 100,
      })),
      close: jest.fn(),
    } as any;

    mockBrowser = {
      newPage: jest.fn().mockImplementation(async () => mockPage),
      close: jest.fn(),
    } as any;

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);

    renderer = MermaidRenderer.getInstance();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (renderer) {
      await renderer.cleanup();
    }
    // Reset singleton
    (MermaidRenderer as any).instance = null;
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MermaidRenderer.getInstance();
      const instance2 = MermaidRenderer.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return different instances after reset', () => {
      const instance1 = MermaidRenderer.getInstance();
      (MermaidRenderer as any).instance = null;
      const instance2 = MermaidRenderer.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('initialization', () => {
    it('should initialize browser with default configuration', async () => {
      const testDiagram = 'flowchart TD\n    A[Test] --> B[Success]';

      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test</svg>',
        width: 100,
        height: 50,
      });

      await renderer.render(testDiagram);

      expect(mockPuppeteer.launch).toHaveBeenCalledWith({
        headless: 'new',
        timeout: DEFAULT_MERMAID.TIMEOUT,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });
    });

    it('should try fallback configurations if first fails', async () => {
      const testDiagram = 'flowchart TD\n    A[Test] --> B[Success]';

      mockPuppeteer.launch
        .mockRejectedValueOnce(new Error('First config failed'))
        .mockResolvedValueOnce(mockBrowser);

      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test</svg>',
        width: 100,
        height: 50,
      });

      await renderer.render(testDiagram);

      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(2);
      expect(mockPuppeteer.launch).toHaveBeenNthCalledWith(2, {
        executablePath:
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        timeout: DEFAULT_MERMAID.TIMEOUT,
        args: ['--no-sandbox'],
      });
    });

    it('should throw error if all configurations fail', async () => {
      mockPuppeteer.launch.mockRejectedValue(new Error('All configs failed'));

      const testDiagram = 'flowchart TD\n    A[Test] --> B[Success]';

      await expect(renderer.render(testDiagram)).rejects.toThrow(
        'Failed to initialize Mermaid renderer: All configs failed',
      );
    });

    it('should clean up browser on failed initialization', async () => {
      const mockFailedBrowser = {
        newPage: jest.fn().mockImplementation(async () => {
          throw new Error('Page creation failed');
        }),
        close: jest.fn(),
      } as any;

      mockPuppeteer.launch
        .mockResolvedValueOnce(mockFailedBrowser)
        .mockResolvedValueOnce(mockBrowser);

      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test</svg>',
        width: 100,
        height: 50,
      });

      const testDiagram = 'flowchart TD\n    A[Test] --> B[Success]';
      await renderer.render(testDiagram);

      expect(mockFailedBrowser.close).toHaveBeenCalled();
    });
  });

  describe('render method', () => {
    beforeEach(() => {
      mockPage.evaluate.mockResolvedValue({
        svg: '<svg width="200" height="100">test diagram</svg>',
        width: 200,
        height: 100,
      });
    });

    it('should render Mermaid diagram with default options', async () => {
      const testDiagram = 'flowchart TD\n    A[Start] --> B[End]';

      const result = await renderer.render(testDiagram);

      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: DEFAULT_MERMAID.VIEWPORT_WIDTH,
        height: DEFAULT_MERMAID.VIEWPORT_HEIGHT,
      });
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining(testDiagram),
        {
          waitUntil: 'networkidle0',
          timeout: 30000,
        },
      );
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#mermaid-diagram svg',
        {
          timeout: DEFAULT_MERMAID.TIMEOUT,
        },
      );

      expect(result).toEqual({
        svg: '<svg width="200" height="100">test diagram</svg>',
        metadata: {
          width: 200,
          height: 100,
          renderTime: expect.any(Number),
        },
      });
    });

    it('should render with custom options', async () => {
      const testDiagram = 'graph LR\n    A --> B';
      const options: MermaidRenderOptions = {
        theme: 'dark',
        width: 800,
        height: 600,
        backgroundColor: '#1a1a1a',
      };

      await renderer.render(testDiagram, options);

      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 800,
        height: 600,
      });

      const setContentCall = mockPage.setContent.mock.calls[0][0];
      expect(setContentCall).toContain("theme: 'dark'");
      expect(setContentCall).toContain('background-color: #1a1a1a');
      expect(setContentCall).toContain(testDiagram);
    });

    it('should handle different theme options', async () => {
      const testDiagram = 'sequenceDiagram\n    A->>B: Hello';
      const themes = ['default', 'forest', 'neutral'] as const;

      for (const theme of themes) {
        await renderer.render(testDiagram, { theme });

        const setContentCall =
          mockPage.setContent.mock.calls[
            mockPage.setContent.mock.calls.length - 1
          ][0];
        expect(setContentCall).toContain(`theme: '${theme}'`);
      }
    });

    it('should close page after rendering', async () => {
      const testDiagram = 'flowchart TD\n    A[Test]';

      await renderer.render(testDiagram);

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close page even if rendering fails', async () => {
      const testDiagram = 'invalid diagram';
      mockPage.evaluate.mockRejectedValue(new Error('Rendering failed'));

      await expect(renderer.render(testDiagram)).rejects.toThrow(
        'Failed to render Mermaid diagram: Rendering failed',
      );

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should include CDN URL in generated HTML', async () => {
      const testDiagram = 'flowchart TD\n    A[Test]';

      await renderer.render(testDiagram);

      const setContentCall = mockPage.setContent.mock.calls[0][0];
      expect(setContentCall).toContain(DEFAULT_MERMAID.CDN_URL);
    });

    it('should include Mermaid configuration in HTML', async () => {
      const testDiagram = 'flowchart TD\n    A[Test]';

      await renderer.render(testDiagram);

      const setContentCall = mockPage.setContent.mock.calls[0][0];
      expect(setContentCall).toContain('mermaid.initialize');
      expect(setContentCall).toContain('startOnLoad: true');
      expect(setContentCall).toContain("securityLevel: 'loose'");
      expect(setContentCall).toContain('flowchart:');
      expect(setContentCall).toContain('useMaxWidth: true');
    });

    it('should throw error if browser not initialized', async () => {
      const testDiagram = 'flowchart TD\n    A[Test]';
      mockPuppeteer.launch.mockRejectedValue(new Error('No browser'));

      await expect(renderer.render(testDiagram)).rejects.toThrow(
        'Failed to initialize Mermaid renderer: No browser',
      );
    });

    it('should measure render time', async () => {
      const testDiagram = 'flowchart TD\n    A[Test]';

      // Add some delay to measure
      (mockPage.evaluate as jest.Mock).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          svg: '<svg>test</svg>',
          width: 100,
          height: 50,
        };
      });

      const result = await renderer.render(testDiagram);

      expect(result.metadata.renderTime).toBeGreaterThan(0);
      expect(typeof result.metadata.renderTime).toBe('number');
    });
  });

  describe('cleanup method', () => {
    it('should close browser and reset state', async () => {
      // Initialize renderer
      const testDiagram = 'flowchart TD\n    A[Test]';
      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test</svg>',
        width: 100,
        height: 50,
      });
      await renderer.render(testDiagram);

      await renderer.cleanup();

      expect(mockBrowser.close).toHaveBeenCalled();
      expect((renderer as any).browser).toBeNull();
      expect((renderer as any).isInitialized).toBe(false);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Initialize renderer
      const testDiagram = 'flowchart TD\n    A[Test]';
      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test</svg>',
        width: 100,
        height: 50,
      });
      await renderer.render(testDiagram);

      // Mock cleanup error
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockBrowser.close.mockRejectedValue(new Error('Cleanup failed'));

      await renderer.cleanup();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error closing browser:',
        expect.any(Error),
      );
      expect((renderer as any).browser).toBeNull();
      expect((renderer as any).isInitialized).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should handle cleanup when browser is null', async () => {
      await renderer.cleanup();

      expect(mockBrowser.close).not.toHaveBeenCalled();
    });
  });

  describe('validateEnvironment method', () => {
    it('should return success when environment is valid', async () => {
      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test</svg>',
        width: 100,
        height: 50,
      });

      const result = await renderer.validateEnvironment();

      expect(result.isSupported).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should return failure when environment is invalid', async () => {
      mockPuppeteer.launch.mockRejectedValue(
        new Error('Browser not available'),
      );

      const result = await renderer.validateEnvironment();

      expect(result.isSupported).toBe(false);
      expect(result.issues).toContain(
        'Mermaid renderer not available: Failed to initialize Mermaid renderer: Browser not available',
      );
      expect(result.recommendations).toContain(
        'Check Puppeteer installation and browser availability',
      );
    });

    it('should test actual rendering in validation', async () => {
      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test</svg>',
        width: 100,
        height: 50,
      });

      await renderer.validateEnvironment();

      const renderCall = mockPage.setContent.mock.calls[0][0];
      expect(renderCall).toContain('flowchart TD');
      expect(renderCall).toContain('A[Test] --> B[Success]');
    });
  });

  describe('HTML generation', () => {
    it('should generate valid HTML structure', async () => {
      const testDiagram = 'flowchart TD\n    A[Start] --> B[End]';

      await renderer.render(testDiagram);

      const html = mockPage.setContent.mock.calls[0][0];

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('<div id="mermaid-diagram">');
      expect(html).toContain('<div class="mermaid">');
      expect(html).toContain(testDiagram);
      expect(html).toContain('mermaid.run()');
    });

    it('should include proper styling', async () => {
      const testDiagram = 'graph LR\n    A --> B';

      await renderer.render(testDiagram, {
        backgroundColor: '#ffffff',
      });

      const html = mockPage.setContent.mock.calls[0][0];

      expect(html).toContain('background-color: #ffffff');
      expect(html).toContain('font-family:');
      expect(html).toContain('display: flex');
      expect(html).toContain('justify-content: center');
    });
  });

  describe('error scenarios', () => {
    it('should handle page creation failure', async () => {
      mockBrowser.newPage.mockRejectedValue(new Error('Page creation failed'));

      const testDiagram = 'flowchart TD\n    A[Test]';

      await expect(renderer.render(testDiagram)).rejects.toThrow(
        'Failed to initialize Mermaid renderer: Page creation failed',
      );
    });

    it('should handle setContent failure', async () => {
      mockPage.setContent.mockRejectedValue(
        new Error('Content loading failed'),
      );

      const testDiagram = 'flowchart TD\n    A[Test]';

      await expect(renderer.render(testDiagram)).rejects.toThrow(
        'Failed to render Mermaid diagram: Content loading failed',
      );
    });

    it('should handle waitForSelector timeout', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Selector timeout'));

      const testDiagram = 'flowchart TD\n    A[Test]';

      await expect(renderer.render(testDiagram)).rejects.toThrow(
        'Failed to render Mermaid diagram: Selector timeout',
      );
    });

    it('should handle evaluate failure', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'));

      const testDiagram = 'flowchart TD\n    A[Test]';

      await expect(renderer.render(testDiagram)).rejects.toThrow(
        'Failed to render Mermaid diagram: Evaluation failed',
      );
    });
  });

  describe('reinitialization', () => {
    it('should reinitialize if browser becomes unavailable', async () => {
      // First render
      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test1</svg>',
        width: 100,
        height: 50,
      });
      await renderer.render('flowchart TD\n    A[Test1]');

      // Clear the initialized state
      (renderer as any).isInitialized = false;
      (renderer as any).browser = null;

      // Second render should reinitialize
      mockPage.evaluate.mockResolvedValue({
        svg: '<svg>test2</svg>',
        width: 100,
        height: 50,
      });
      await renderer.render('flowchart TD\n    A[Test2]');

      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(2);
    });
  });
});
