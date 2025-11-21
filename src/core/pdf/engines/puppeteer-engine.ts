/**
 * Puppeteer PDF Engine Adapter
 * Wraps existing PDFGenerator with the new engine interface
 */

import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

import { PDFDocument } from 'pdf-lib';
import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';

import { DEFAULT_MARGINS } from '../../../infrastructure/config/constants';
import { PDFTemplates } from '../templates';

import {
  IPDFEngine,
  PDFEngineOptions,
  PDFGenerationContext,
  PDFEngineResult,
  PDFEngineHealthStatus,
  PDFEngineCapabilities,
  PDFEngineMetrics,
} from './types';

export class PuppeteerPDFEngine implements IPDFEngine {
  public readonly name = 'puppeteer';
  public readonly version: string;
  public readonly capabilities: PDFEngineCapabilities = {
    supportedFormats: ['A4', 'A3', 'A5', 'Letter', 'Legal'],
    maxConcurrentJobs: 3,
    supportsCustomCSS: true,
    supportsChineseText: true,
    supportsTOC: true,
    supportsHeaderFooter: true,
    supportsBookmarks: true,
    supportsOutlineGeneration: true,
  };

  private browser: Browser | null = null;
  private isInitialized = false;
  private metrics: PDFEngineMetrics;
  private activeTasks = 0;
  private initStartTime: number;

  constructor() {
    this.version = this.getPuppeteerVersion();
    this.initStartTime = Date.now();
    this.metrics = {
      engineName: this.name,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageTime: 0,
      peakMemoryUsage: 0,
      uptime: 0,
    };
  }

  private getPuppeteerVersion(): string {
    try {
      // Use dynamic import to load package.json in ESM/TypeScript
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require('puppeteer/package.json');
      return pkg.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async initialize(): Promise<void> {
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
      '--generate-pdf-document-outline', // Enable PDF document outline generation
    ];

    const configs = [
      {
        headless: true, // Use headless mode (Puppeteer 24.x compatibility)
        timeout: 10000,
        args: baseArgs,
      },
      {
        executablePath:
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true, // Use headless mode (Puppeteer 24.x compatibility)
        timeout: 10000,
        args: ['--no-sandbox'],
      },
      {
        executablePath: '/usr/bin/google-chrome',
        headless: true, // Use headless mode (Puppeteer 24.x compatibility)
        timeout: 10000,
        args: ['--no-sandbox'],
      },
      {
        executablePath: '/usr/bin/chromium-browser',
        headless: true, // Use headless mode (Puppeteer 24.x compatibility)
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
      `Failed to initialize Puppeteer engine: ${lastError?.message}`,
    );
  }

  async generatePDF(
    context: PDFGenerationContext,
    options: PDFEngineOptions,
  ): Promise<PDFEngineResult> {
    const startTime = Date.now();
    this.activeTasks++;
    this.metrics.totalTasks++;

    try {
      if (!this.isInitialized || !this.browser) {
        await this.initialize();
      }

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      // Ensure output directory exists
      const outputDir = dirname(context.outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const resolvedOutputPath = resolve(context.outputPath);
      if (!resolvedOutputPath.toLowerCase().endsWith('.pdf')) {
        throw new Error('Output path must end with .pdf extension');
      }

      // Generate full HTML with TOC if enabled
      const fullHTML = await this.generateFullHTML(context);

      const page = await this.browser.newPage();

      try {
        await page.setContent(fullHTML, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        const pdfOptions = this.buildPDFOptions(
          resolvedOutputPath,
          options,
          context,
        );

        // Clean up TOC page markers before bookmark generation
        if (context.bookmarks?.enabled) {
          await this.cleanupTOCPageMarkers(page);
        }

        // Generate PDF with Puppeteer (without path to get buffer)
        const tempPdfOptions = { ...pdfOptions };
        delete tempPdfOptions.path; // Remove path to get buffer instead of writing to file
        const pdfUint8Array = await page.pdf(tempPdfOptions);
        const pdfBuffer = Buffer.from(pdfUint8Array); // Convert Uint8Array to Buffer for Puppeteer 24.x compatibility

        // Add metadata and process bookmarks using pdf-lib
        let finalPdfBuffer = pdfBuffer;
        if (context.metadata || context.bookmarks?.enabled) {
          try {
            const processedBuffer = await this.processPdfWithLib(
              pdfBuffer,
              context.metadata,
              context.bookmarks,
            );
            finalPdfBuffer = Buffer.from(processedBuffer);
          } catch (error) {
            // Log error but continue with original PDF if processing fails
            console.warn('Failed to process PDF with pdf-lib:', error);
          }
        }

        // Write the final PDF to file
        const fs = await import('fs/promises');
        await fs.writeFile(resolvedOutputPath, finalPdfBuffer as Buffer);

        const generationTime = Date.now() - startTime;
        this.updateMetrics(true, generationTime);

        return {
          success: true,
          outputPath: resolvedOutputPath,
          metadata: {
            pages: await this.getPageCount(page),
            fileSize: finalPdfBuffer.length,
            generationTime,
            engineUsed: this.name,
          },
        };
      } finally {
        await page.close();
      }
    } catch (error) {
      const generationTime = Date.now() - startTime;
      this.updateMetrics(false, generationTime);
      this.metrics.lastFailure = {
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
        context,
      };

      return {
        success: false,
        error: `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      this.activeTasks--;
    }
  }

  private async generateFullHTML(
    context: PDFGenerationContext,
  ): Promise<string> {
    // Since we're now using two-stage rendering exclusively,
    // TOC generation is handled by TwoStageRenderingEngine
    // This method only handles basic HTML generation
    // PDF metadata is now handled by pdf-lib post-processing
    const theme = context.syntaxHighlightingTheme || 'default';

    return PDFTemplates.getFullHTML(
      context.htmlContent,
      context.title,
      context.customCSS,
      context.enableChineseSupport || false,
      undefined, // configAccessor
      theme,
    );
  }

  /**
   * Process PDF with pdf-lib (metadata and bookmark filtering)
   */
  private async processPdfWithLib(
    pdfBuffer: Buffer,
    metadata: any,
    _bookmarkConfig?: any,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Add metadata if provided
    if (metadata) {
      // Set standard PDF metadata fields
      if (metadata.title) {
        pdfDoc.setTitle(metadata.title);
      }
      if (metadata.author) {
        pdfDoc.setAuthor(metadata.author);
      }
      if (metadata.subject) {
        pdfDoc.setSubject(metadata.subject);
      }
      if (metadata.keywords) {
        // Split keywords string into array if it contains commas
        const keywordsArray =
          typeof metadata.keywords === 'string'
            ? metadata.keywords.split(',').map((k: string) => k.trim())
            : [metadata.keywords];
        pdfDoc.setKeywords(keywordsArray);
      }
      // Set system fixed creator and producer
      pdfDoc.setCreator('MD2PDF');
      pdfDoc.setProducer('MD2PDF with pdf-lib');

      // Set creation and modification dates
      const now = new Date();
      if (metadata.creationDate) {
        pdfDoc.setCreationDate(metadata.creationDate);
      } else {
        pdfDoc.setCreationDate(now);
      }
      if (metadata.modDate) {
        pdfDoc.setModificationDate(metadata.modDate);
      } else {
        pdfDoc.setModificationDate(now);
      }
    }

    // Filter bookmarks by maxDepth if bookmarks are enabled
    // Note: pdf-lib doesn't provide direct API to manipulate outlines/bookmarks
    // So we rely on filtering headings in HTML before PDF generation
    // The bookmark maxDepth filtering happens at the HTML generation stage

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    return Buffer.from(modifiedPdfBytes) as Buffer;
  }

  private buildPDFOptions(
    outputPath: string,
    options: PDFEngineOptions,
    context: PDFGenerationContext,
  ): PDFOptions {
    const pdfOptions: PDFOptions = {
      path: outputPath,
      format: options.format as 'A4' | 'A3' | 'A5' | 'Legal' | 'Letter',
      landscape: options.orientation === 'landscape',
      margin: options.margin || DEFAULT_MARGINS.NORMAL,
      displayHeaderFooter: options.displayHeaderFooter || false,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || '',
      printBackground: options.printBackground || true,
      scale: options.scale || 1,
      preferCSSPageSize: options.preferCSSPageSize || false,
    };

    // Note: Puppeteer doesn't directly support PDF metadata in PDFOptions
    // Metadata is set via HTML meta tags in generateFullHTML method

    // Enable Puppeteer's native outline generation for bookmarks
    if (context.bookmarks?.enabled) {
      (pdfOptions as any).outline = true;
      (pdfOptions as any).tagged = true; // Recommended for accessibility and better bookmark support
    }

    return pdfOptions;
  }

  /**
   * Convert bookmark outline to Puppeteer outline format
   */
  private convertToOutline(
    bookmarkOutline: Array<{
      title: string;
      dest: number | string;
      children?: unknown[];
    }>,
  ): unknown[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return bookmarkOutline.map((item: any) => {
      const result: any = {
        title: item.title,
        dest: item.dest,
      };

      if (
        item.children &&
        Array.isArray(item.children) &&
        item.children.length > 0
      ) {
        result.children = this.convertToOutline(item.children);
      }

      return result;
    });
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

  private updateMetrics(success: boolean, generationTime: number): void {
    if (success) {
      this.metrics.successfulTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    // Update average time
    const totalSuccessful = this.metrics.successfulTasks;
    if (totalSuccessful > 0) {
      this.metrics.averageTime =
        (this.metrics.averageTime * (totalSuccessful - 1) + generationTime) /
        totalSuccessful;
    }

    this.metrics.uptime = Date.now() - this.initStartTime;
  }

  async healthCheck(): Promise<PDFEngineHealthStatus> {
    const errors: string[] = [];
    let isHealthy = true;

    try {
      if (!this.browser || !this.isInitialized) {
        await this.initialize();
      }

      if (!this.browser) {
        errors.push('Browser not available');
        isHealthy = false;
      } else {
        // Test basic functionality
        const page = await this.browser.newPage();
        try {
          await page.setContent(
            '<html><body><h1>Health Check</h1></body></html>',
          );
          await page.close();
        } catch (error) {
          errors.push(
            `Page operation failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          isHealthy = false;
        }
      }
    } catch (error) {
      errors.push(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      isHealthy = false;
    }

    return {
      isHealthy,
      engineName: this.name,
      version: this.version,
      lastCheck: new Date(),
      errors,
      performance: {
        averageGenerationTime: this.metrics.averageTime,
        successRate:
          this.metrics.totalTasks > 0
            ? this.metrics.successfulTasks / this.metrics.totalTasks
            : 0,
        memoryUsage: this.getCurrentMemoryUsage(),
      },
    };
  }

  async getResourceUsage(): Promise<{
    memoryUsage: number;
    activeTasks: number;
    averageTaskTime: number;
  }> {
    return {
      memoryUsage: this.getCurrentMemoryUsage(),
      activeTasks: this.activeTasks,
      averageTaskTime: this.metrics.averageTime,
    };
  }

  private getCurrentMemoryUsage(): number {
    try {
      const usage = process.memoryUsage();
      return usage.heapUsed;
    } catch {
      return 0;
    }
  }

  async canHandle(_context: PDFGenerationContext): Promise<boolean> {
    // Puppeteer can handle most contexts
    return true;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        const timeoutPromise = new Promise<void>((_, reject) => {
          const timeoutId = setTimeout(
            () => reject(new Error('Browser close timeout')),
            3000,
          );
          if (timeoutId.unref) {
            timeoutId.unref();
          }
        });

        await Promise.race([this.browser.close(), timeoutPromise]);
      } catch (error) {
        try {
          await this.browser.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      } finally {
        this.browser = null;
        this.isInitialized = false;
      }
    }
  }

  getMetrics(): PDFEngineMetrics {
    return { ...this.metrics };
  }

  /**
   * Clean up TOC page markers that were injected during two-stage rendering
   * This prevents marker text from being included in Puppeteer's native bookmark generation
   */
  private async cleanupTOCPageMarkers(page: Page): Promise<void> {
    try {
      const cleanupResults = await page.evaluate(() => {
        // Step 1: Find and remove all TOC page markers with the class
        const markers = (globalThis as any).document.querySelectorAll(
          '.toc-page-marker',
        );
        const markerCount = markers.length;

        markers.forEach((marker: any) => {
          marker.remove();
        });

        // Step 1.5: Clean up anchor-link elements that might interfere with bookmark generation
        // These are inserted by AnchorLinksGenerator in Interactive Mode + Technical Documentation template
        const anchorLinkContainers = (
          globalThis as any
        ).document.querySelectorAll('.anchor-link-container');
        let anchorLinksRemoved = 0;

        anchorLinkContainers.forEach((container: any) => {
          // Move anchor links away from headings to prevent bookmark interference
          // Instead of removing them, move them to the document body to preserve functionality
          if (
            container.parentNode &&
            container.parentNode !== (globalThis as any).document.body
          ) {
            (globalThis as any).document.body.appendChild(container);
            anchorLinksRemoved++;
          }
        });

        // Step 2: More aggressive cleanup - search ALL elements for HDG patterns
        // This catches cases where markers might not have the expected class
        const allElements = (globalThis as any).document.querySelectorAll('*');
        let elementsProcessed = 0;

        allElements.forEach((element: any) => {
          // Check if element contains HDG pattern in text content
          if (element.textContent && /HDG\d{4}/.test(element.textContent)) {
            // If this is a direct text node or span, clean it
            if (
              element.nodeType === 1 &&
              (element.tagName === 'SPAN' || element.children.length === 0)
            ) {
              const cleaned = element.textContent.replace(/HDG\d{4}/g, '');
              if (cleaned !== element.textContent) {
                element.textContent = cleaned;
                elementsProcessed++;
              }
            }
          }
        });

        // Step 3: Walk through all text nodes to catch any remaining markers
        const walker = (globalThis as any).document.createTreeWalker(
          (globalThis as any).document.body,
          (globalThis as any).NodeFilter.SHOW_TEXT,
          null,
          false,
        );

        const textNodesToClean: any[] = [];
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent && /HDG\d{4}/.test(node.textContent)) {
            textNodesToClean.push(node);
          }
        }

        textNodesToClean.forEach((textNode: any) => {
          const original = textNode.textContent;
          textNode.textContent = textNode.textContent.replace(/HDG\d{4}/g, '');
          if (original !== textNode.textContent) {
            elementsProcessed++;
          }
        });

        // Step 4: Special cleanup for heading elements - most aggressive approach
        const headings = (globalThis as any).document.querySelectorAll(
          'h1, h2, h3, h4, h5, h6',
        );
        const headingsWithMarkers: string[] = [];
        let headingsCleaned = 0;

        headings.forEach((heading: any) => {
          if (heading.textContent && /HDG\d{4}/.test(heading.textContent)) {
            const originalText = heading.textContent;

            // Try multiple cleanup approaches
            // Approach 1: Remove HDG pattern from innerHTML
            if (heading.innerHTML && /HDG\d{4}/.test(heading.innerHTML)) {
              heading.innerHTML = heading.innerHTML.replace(/HDG\d{4}/g, '');
            }

            // Approach 2: Clean textContent directly
            heading.textContent = heading.textContent.replace(/HDG\d{4}/g, '');

            // Approach 3: Remove any child elements that might contain markers
            const childSpans = heading.querySelectorAll('span');
            childSpans.forEach((span: any) => {
              if (span.textContent && /HDG\d{4}/.test(span.textContent)) {
                span.remove();
              }
            });

            if (originalText !== heading.textContent) {
              headingsCleaned++;
            }

            // Check if cleanup was successful
            if (heading.textContent && /HDG\d{4}/.test(heading.textContent)) {
              headingsWithMarkers.push(
                `${heading.tagName}: "${heading.textContent.substring(0, 60)}..."`,
              );
            }
          }
        });

        return {
          markersRemoved: markerCount,
          anchorLinksRemoved: anchorLinksRemoved,
          elementsProcessed: elementsProcessed,
          textNodesProcessed: textNodesToClean.length,
          headingsCleaned: headingsCleaned,
          remainingHeadingsWithMarkers: headingsWithMarkers,
        };
      });

      if (cleanupResults.remainingHeadingsWithMarkers.length > 0) {
        // Final attempt: Force cleanup of remaining headings
        await page.evaluate(() => {
          const problemHeadings = (globalThis as any).document.querySelectorAll(
            'h1, h2, h3, h4, h5, h6',
          );
          problemHeadings.forEach((heading: any) => {
            if (heading.textContent && /HDG\d{4}/.test(heading.textContent)) {
              // Nuclear option: rebuild heading content without markers
              const cleanText = heading.textContent
                .replace(/HDG\d{4}/g, '')
                .trim();
              heading.innerHTML = cleanText;
            }
          });
        });
      }
    } catch (error) {
      console.warn('[Puppeteer] Failed to clean up TOC page markers:', error);
      // Don't throw error - continue with PDF generation even if cleanup fails
    }
  }
}
