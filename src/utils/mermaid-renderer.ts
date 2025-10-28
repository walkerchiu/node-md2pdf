/**
 * Mermaid Renderer Utility
 * Uses Puppeteer to render Mermaid diagrams in a browser environment
 */

import puppeteer, { Browser } from 'puppeteer';

import { DEFAULT_MERMAID } from '../infrastructure/config/constants';

export interface MermaidRenderOptions {
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export interface MermaidRenderResult {
  svg: string;
  metadata: {
    width: number;
    height: number;
    renderTime: number;
  };
}

export class MermaidRenderer {
  private static instance: MermaidRenderer | null = null;
  private browser: Browser | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MermaidRenderer {
    if (!MermaidRenderer.instance) {
      MermaidRenderer.instance = new MermaidRenderer();
    }
    return MermaidRenderer.instance;
  }

  /**
   * Initialize the browser instance
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized && this.browser) {
      return;
    }

    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
    ];

    const configs = [
      {
        headless: 'new' as const,
        timeout: DEFAULT_MERMAID.TIMEOUT,
        args: baseArgs,
      },
      {
        executablePath:
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new' as const,
        timeout: DEFAULT_MERMAID.TIMEOUT,
        args: ['--no-sandbox'],
      },
      {
        executablePath: '/usr/bin/google-chrome',
        headless: 'new' as const,
        timeout: DEFAULT_MERMAID.TIMEOUT,
        args: ['--no-sandbox'],
      },
      {
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new' as const,
        timeout: DEFAULT_MERMAID.TIMEOUT,
        args: ['--no-sandbox'],
      },
    ];

    let lastError: Error | null = null;

    for (const config of configs) {
      try {
        this.browser = await puppeteer.launch(config);

        // Test the browser connection
        const page = await this.browser.newPage();
        await page.close();

        this.isInitialized = true;
        return;
      } catch (error) {
        lastError = error as Error;

        if (this.browser) {
          try {
            await this.browser.close();
          } catch {
            // Ignore cleanup errors
          }
          this.browser = null;
        }
      }
    }

    throw new Error(
      `Failed to initialize Mermaid renderer: ${lastError?.message}`,
    );
  }

  /**
   * Render Mermaid diagram to SVG
   */
  async render(
    diagramCode: string,
    options: MermaidRenderOptions = {},
  ): Promise<MermaidRenderResult> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.browser) {
      await this.initialize();
    }

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      // Set viewport for consistent rendering
      await page.setViewport({
        width: options.width || DEFAULT_MERMAID.VIEWPORT_WIDTH,
        height: options.height || DEFAULT_MERMAID.VIEWPORT_HEIGHT,
      });

      // Create HTML page with Mermaid
      const html = this.createMermaidHTML(diagramCode, options);

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for Mermaid to render
      await page.waitForSelector('#mermaid-diagram svg', {
        timeout: DEFAULT_MERMAID.TIMEOUT,
      });

      // Extract the rendered SVG
      const svgResult = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const svgElement = doc.querySelector('#mermaid-diagram svg');
        if (!svgElement) {
          throw new Error('SVG element not found');
        }

        // Get dimensions
        const rect = svgElement.getBoundingClientRect();
        const svg = svgElement.outerHTML;

        return {
          svg,
          width: rect.width,
          height: rect.height,
        };
      });

      const renderTime = Date.now() - startTime;

      return {
        svg: svgResult.svg,
        metadata: {
          width: svgResult.width,
          height: svgResult.height,
          renderTime,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to render Mermaid diagram: ${(error as Error).message}`,
      );
    } finally {
      await page.close();
    }
  }

  /**
   * Create HTML template for Mermaid rendering
   */
  private createMermaidHTML(
    diagramCode: string,
    options: MermaidRenderOptions,
  ): string {
    const theme = options.theme || DEFAULT_MERMAID.THEME;
    const backgroundColor =
      options.backgroundColor || DEFAULT_MERMAID.BACKGROUND_COLOR;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="${DEFAULT_MERMAID.CDN_URL}"></script>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: ${backgroundColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #mermaid-diagram {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .mermaid {
            background-color: transparent;
        }
    </style>
</head>
<body>
    <div id="mermaid-diagram">
        <div class="mermaid">
${diagramCode}
        </div>
    </div>

    <script>
        mermaid.initialize({
            startOnLoad: true,
            theme: '${theme}',
            securityLevel: 'loose',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true
            },
            sequence: {
                useMaxWidth: true
            },
            gantt: {
                useMaxWidth: true
            }
        });

        // Wait for rendering to complete
        mermaid.run().then(() => {
            console.log('Mermaid rendering completed');
        }).catch((error) => {
            console.error('Mermaid rendering failed:', error);
        });
    </script>
</body>
</html>`;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.warn('Error closing browser:', error);
      } finally {
        this.browser = null;
        this.isInitialized = false;
      }
    }
  }

  /**
   * Check if renderer is available
   */
  async validateEnvironment(): Promise<{
    isSupported: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      await this.initialize();

      // Test basic rendering
      const testDiagram = 'flowchart TD\n    A[Test] --> B[Success]';
      await this.render(testDiagram);
    } catch (error) {
      issues.push(
        `Mermaid renderer not available: ${(error as Error).message}`,
      );
      recommendations.push(
        'Check Puppeteer installation and browser availability',
      );
    }

    return {
      isSupported: issues.length === 0,
      issues,
      recommendations,
    };
  }
}
