import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { PDFGeneratorOptions, PDFGenerationResult, StyleOptions } from './types';
import { PDFTemplates } from './templates';

export class PDFGenerator {
  private browser: Browser | null = null;
  private options: PDFGeneratorOptions;

  constructor(options: PDFGeneratorOptions = {}) {
    this.options = {
      format: 'A4',
      orientation: 'portrait',
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      },
      displayHeaderFooter: false,
      printBackground: true,
      scale: 1,
      preferCSSPageSize: false,
      ...options
    };
  }

  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
          '--disable-font-subpixel-positioning'
        ]
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`Failed to initialize PDF generator: ${errorMsg}`);
    }
  }

  async generatePDF(
    htmlContent: string,
    outputPath: string,
    options: {
      title?: string;
      customCSS?: string;
      styleOptions?: StyleOptions;
    } = {}
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

      const fullHTML = PDFTemplates.getFullHTML(
        htmlContent,
        options.title,
        options.customCSS
      );

      const page = await this.browser.newPage();

      try {
        await page.setContent(fullHTML, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        const pdfOptions: PDFOptions = {
          path: resolvedOutputPath,
          format: this.options.format as any,
          landscape: this.options.orientation === 'landscape',
          margin: this.options.margin || { top: '1in', right: '1in', bottom: '1in', left: '1in' },
          displayHeaderFooter: this.options.displayHeaderFooter || false,
          headerTemplate: this.options.headerTemplate || '',
          footerTemplate: this.options.footerTemplate || '',
          printBackground: this.options.printBackground || true,
          scale: this.options.scale || 1,
          preferCSSPageSize: this.options.preferCSSPageSize || false
        };

        const pdfBuffer = await page.pdf(pdfOptions);

        const generationTime = Date.now() - startTime;

        const result: PDFGenerationResult = {
          success: true,
          outputPath: resolvedOutputPath,
          metadata: {
            pages: await this.getPageCount(page),
            fileSize: pdfBuffer.length,
            generationTime
          }
        };

        return result;

      } finally {
        await page.close();
      }

    } catch (error) {
      return {
        success: false,
        error: `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`
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
    } = {}
  ): Promise<PDFGenerationResult> {
    try {
      if (!existsSync(inputPath)) {
        return {
          success: false,
          error: `Input file not found: ${inputPath}`
        };
      }

      const { readFileSync } = await import('fs');
      const htmlContent = readFileSync(inputPath, 'utf-8');

      return await this.generatePDF(htmlContent, outputPath, options);

    } catch (error) {
      return {
        success: false,
        error: `Failed to read input file: ${error instanceof Error ? error.message : String(error)}`
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
      errors.push(`Puppeteer initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        // Add timeout to prevent hanging
        await Promise.race([
          this.browser.close(),
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Browser close timeout')), 3000)
          )
        ]);
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
