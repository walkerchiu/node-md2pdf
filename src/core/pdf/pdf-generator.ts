import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';

import {
  DEFAULT_MARGINS,
  DEFAULT_PDF_OPTIONS,
} from '../../infrastructure/config/constants';
import { Heading } from '../../types/index';
import { TwoStageRenderingEngine } from '../rendering/two-stage-rendering-engine';

import { PDFTemplates } from './templates';
import {
  PDFGeneratorOptions,
  PDFGenerationResult,
  StyleOptions,
} from './types';

export class PDFGenerator {
  private browser: Browser | null = null;
  private options: PDFGeneratorOptions;

  constructor(options: PDFGeneratorOptions = {}) {
    this.options = {
      format: DEFAULT_PDF_OPTIONS.FORMAT,
      orientation: DEFAULT_PDF_OPTIONS.ORIENTATION,
      margin: DEFAULT_MARGINS.NORMAL,
      displayHeaderFooter: DEFAULT_PDF_OPTIONS.DISPLAY_HEADER_FOOTER,
      printBackground: DEFAULT_PDF_OPTIONS.PRINT_BACKGROUND,
      scale: DEFAULT_PDF_OPTIONS.SCALE,
      preferCSSPageSize: DEFAULT_PDF_OPTIONS.PREFER_CSS_PAGE_SIZE,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.browser) {
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

    // Configuration attempts in order of preference
    const configs = [
      // Try bundled Chromium first
      {
        headless: 'new' as const, // Use new headless mode with enhanced stability configuration
        timeout: 10000,
        args: baseArgs,
      },
      // Fallback to system Chrome on macOS/Unix systems
      {
        executablePath:
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new' as const, // Use new headless mode with enhanced stability configuration
        timeout: 10000,
        args: ['--no-sandbox'],
      },
      // Fallback to system Chrome on Linux
      {
        executablePath: '/usr/bin/google-chrome',
        headless: 'new' as const, // Use new headless mode with enhanced stability configuration
        timeout: 10000,
        args: ['--no-sandbox'],
      },
      // Fallback to system Chromium on Linux
      {
        executablePath: '/usr/bin/chromium-browser',
        headless: 'new' as const, // Use new headless mode with enhanced stability configuration
        timeout: 10000,
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

        // If we get here, the browser launched successfully
        return;
      } catch (error) {
        lastError = error as Error;

        // Clean up failed browser instance
        if (this.browser) {
          try {
            await this.browser.close();
          } catch {
            // Ignore cleanup errors
          }
          this.browser = null;
        }

        // Only log in development/debug mode
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
          // eslint-disable-next-line no-console
          console.warn(
            'Puppeteer config failed, trying next:',
            config.executablePath || 'bundled',
          );
        }
      }
    }

    // If all configurations failed
    const errorMsg = lastError?.message || 'Unknown error';
    throw new Error(`Failed to initialize PDF generator: ${errorMsg}`);
  }

  async generatePDF(
    htmlContent: string,
    outputPath: string,
    options: {
      title?: string;
      customCSS?: string;
      styleOptions?: StyleOptions;
      headings?: Heading[];
      markdownContent?: string;
      enableChineseSupport?: boolean;
      tocOptions?: {
        enabled: boolean;
        maxDepth?: number;
        includePageNumbers?: boolean;
        title?: string;
      };
      forceAccuratePageNumbers?: boolean;
      maxPerformanceImpact?: number;
    } = {},
  ): Promise<PDFGenerationResult> {
    const startTime = Date.now();

    try {
      await this.initialize();

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const resolvedOutputPath = resolve(outputPath);
      if (!resolvedOutputPath.toLowerCase().endsWith('.pdf')) {
        throw new Error('Output path must end with .pdf extension');
      }

      // Always use two-stage rendering for consistent page number handling
      let fullHTML: string;
      const renderingStrategy: 'two-stage' = 'two-stage';

      // Check if TOC is explicitly enabled and we have headings
      const shouldGenerateTOC =
        (this.options.toc?.enabled || options.tocOptions?.enabled) &&
        options.headings &&
        options.headings.length > 0;

      if (shouldGenerateTOC) {
        const twoStageEngine = new TwoStageRenderingEngine({
          enabled: true,
          forceAccuratePageNumbers: options.forceAccuratePageNumbers || false,
          maxPerformanceImpact: options.maxPerformanceImpact || 100,
        });

        const tocConfig = options.tocOptions || this.options.toc;
        const renderingResult = await twoStageEngine.render(htmlContent, {
          headings: options.headings || [],
          tocOptions: {
            enabled: true,
            maxDepth: tocConfig?.maxDepth || 3,
            includePageNumbers: tocConfig?.includePageNumbers !== false,
          },
          pdfOptions: {
            includePageNumbers: tocConfig?.includePageNumbers !== false,
          },
        });

        // Apply full HTML template with TOC CSS styles
        fullHTML = PDFTemplates.getFullHTML(
          renderingResult.html,
          options.title,
          options.customCSS,
          options.enableChineseSupport || false,
        );
      } else {
        // No TOC needed - use simple HTML template directly
        fullHTML = PDFTemplates.getFullHTML(
          htmlContent,
          options.title,
          options.customCSS,
          options.enableChineseSupport || false,
        );
      }

      const page = await this.browser.newPage();

      try {
        await page.setContent(fullHTML, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        const pdfOptions: PDFOptions = {
          path: resolvedOutputPath,
          format: this.options.format as
            | 'A4'
            | 'A3'
            | 'A5'
            | 'Legal'
            | 'Letter'
            | 'Tabloid',
          landscape: this.options.orientation === 'landscape',
          margin: this.options.margin || DEFAULT_MARGINS.NORMAL,
          displayHeaderFooter:
            this.options.displayHeaderFooter ||
            DEFAULT_PDF_OPTIONS.DISPLAY_HEADER_FOOTER,
          headerTemplate: this.options.headerTemplate || '',
          footerTemplate: this.options.footerTemplate || '',
          printBackground:
            this.options.printBackground ??
            DEFAULT_PDF_OPTIONS.PRINT_BACKGROUND,
          scale: this.options.scale || DEFAULT_PDF_OPTIONS.SCALE,
          preferCSSPageSize:
            this.options.preferCSSPageSize ??
            DEFAULT_PDF_OPTIONS.PREFER_CSS_PAGE_SIZE,
        };

        const pdfBuffer = await page.pdf(pdfOptions);

        const generationTime = Date.now() - startTime;

        const result: PDFGenerationResult = {
          success: true,
          outputPath: resolvedOutputPath,
          metadata: {
            pages: await this.getPageCount(page),
            fileSize: pdfBuffer.length,
            generationTime,
            renderingStrategy,
            pageNumberAccuracy: 'exact',
          },
        };

        return result;
      } finally {
        await page.close();
      }
    } catch (error) {
      return {
        success: false,
        error: `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async generatePDFFromFile(
    inputPath: string,
    outputPath: string,
    options: {
      title?: string;
      customCSS?: string;
      styleOptions?: StyleOptions;
      markdownContent?: string;
      headings?: Heading[];
      enableChineseSupport?: boolean;
    } = {},
  ): Promise<PDFGenerationResult> {
    try {
      if (!existsSync(inputPath)) {
        return {
          success: false,
          error: `Input file not found: ${inputPath}`,
        };
      }

      const { readFileSync } = await import('fs');
      const htmlContent = readFileSync(inputPath, 'utf-8');

      return await this.generatePDF(htmlContent, outputPath, options);
    } catch (error) {
      return {
        success: false,
        error: `Failed to read input file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async getPageCount(page: Page): Promise<number> {
    try {
      const pageCount = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = (globalThis as any).window;
        return Math.ceil(doc.body.scrollHeight / win.innerHeight);
      });
      return Math.max(1, pageCount);
    } catch {
      return 1;
    }
  }

  async validateEnvironment(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      await this.initialize();

      if (!this.browser) {
        errors.push('Failed to launch Puppeteer browser');
      } else {
        const page = await this.browser.newPage();
        await page.setContent('<html><body><h1>Test</h1></body></html>');
        await page.close();
      }
    } catch (error) {
      errors.push(
        `Puppeteer initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        // Add timeout to prevent hanging with proper cleanup
        let timeoutId: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<void>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Browser close timeout')),
            3000,
          );
          // Ensure timeout doesn't keep the process alive
          if (timeoutId.unref) {
            timeoutId.unref();
          }
        });

        await Promise.race([this.browser.close(), timeoutPromise]);

        // Clear the timeout if it exists
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        // Force kill browser process if normal close fails
        try {
          await this.browser.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      } finally {
        this.browser = null;
      }
    }
  }

  updateOptions(newOptions: Partial<PDFGeneratorOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  getOptions(): PDFGeneratorOptions {
    return { ...this.options };
  }
}
