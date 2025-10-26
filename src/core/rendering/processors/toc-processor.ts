/**
 * TOC Processor for two-stage rendering
 * Handles Table of Contents generation with accurate page numbers
 */

import puppeteer from 'puppeteer';

import { Heading } from '../../../types/index';
import { PDFTemplates } from '../../pdf/templates';
import { TOCGenerator } from '../../toc/toc-generator';
import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
  ContentDimensions,
  RealPageNumbers,
} from '../types';

import { BaseProcessor } from './base-processor';

import type { ITranslationManager } from '../../../infrastructure/i18n/types';

export class TOCProcessor extends BaseProcessor {
  private tocGenerator: TOCGenerator;

  constructor(translator?: ITranslationManager) {
    super(DynamicContentType.TOC, 'TOC Processor');

    // Initialize TOC generator with default options
    // Note: maxDepth will be updated dynamically in the process method based on context
    this.tocGenerator = new TOCGenerator(
      {
        maxDepth: 3, // Default value, will be overridden per request
        includePageNumbers: true,
        cssClasses: {
          container: 'toc-container',
          title: 'toc-title',
          list: 'toc-list',
          item: 'toc-item',
          link: 'toc-link',
          pageNumber: 'toc-page-number',
        },
      },
      translator,
    );
  }

  async detect(_content: string, context: ProcessingContext): Promise<number> {
    // Check if TOC is enabled and has page numbers
    if (!context.tocOptions?.enabled) {
      return 0;
    }

    if (!context.tocOptions.includePageNumbers) {
      return 0;
    }

    // Check if content has headings
    const headings = context.headings || [];
    if (headings.length === 0) {
      return 0;
    }

    // Higher confidence if header/footer is enabled (margin changes affect accuracy)
    if (context.pdfOptions?.includePageNumbers) {
      return 1.0; // Maximum confidence
    }

    return 0.8; // High confidence for TOC with page numbers
  }

  async process(
    content: string,
    context: ProcessingContext,
  ): Promise<ProcessedContent> {
    const startTime = Date.now();

    try {
      // Update TOC generator options based on context
      if (context.tocOptions?.maxDepth !== undefined) {
        this.tocGenerator.updateOptions({
          maxDepth: context.tocOptions.maxDepth,
          includePageNumbers: context.tocOptions.includePageNumbers !== false,
        });
      }

      // Check cache first
      const cachedContent = await this.getCachedContent(content, context);
      if (cachedContent) {
        return cachedContent;
      }

      // Use headings from context (already parsed from Markdown)
      const headings = context.headings || [];

      if (headings.length === 0) {
        const processingTime = Date.now() - startTime;
        return {
          html: '',
          metadata: this.createMetadata(processingTime, [
            'No headings found for TOC',
          ]),
        };
      }

      let tocHTML: string;
      const warnings: string[] = [];

      if (context.isPreRendering) {
        // Pre-rendering stage: generate TOC without page numbers
        const tocResult = this.tocGenerator.generateTOC(headings);
        tocHTML = tocResult.html;
      } else {
        // Final rendering stage: use two-stage process for accurate page numbers
        const { html, pageNumbers } =
          await this.generateTOCWithAccuratePageNumbers(
            content,
            headings,
            context,
          );
        tocHTML = html;

        if (Object.keys(pageNumbers).length === 0) {
          warnings.push('Could not calculate accurate page numbers');
        }
      }

      const processingTime = Date.now() - startTime;
      const processedContent: ProcessedContent = {
        html: tocHTML,
        metadata: this.createMetadata(processingTime, warnings, {
          headingCount: headings.length,
          includesPageNumbers: context.tocOptions?.includePageNumbers || false,
          isPreRendering: context.isPreRendering || false,
        }),
      };

      // Cache the result
      await this.setCachedContent(content, context, processedContent);

      return processedContent;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        html: '',
        metadata: this.createMetadata(processingTime, [
          `TOC processing failed: ${(error as Error).message}`,
        ]),
      };
    }
  }

  async getDimensions(
    processedContent: ProcessedContent,
    _context: ProcessingContext,
  ): Promise<ContentDimensions> {
    if (!processedContent.html) {
      return {
        pageCount: 0,
        height: 0,
        width: 0,
      };
    }

    // Estimate TOC dimensions based on content
    const lines = processedContent.html.split('\n').length;
    const estimatedHeight = lines * 20; // Rough estimate: 20px per line
    const estimatedPageCount = Math.max(1, Math.ceil(estimatedHeight / 800)); // Assuming ~800px per page

    return {
      pageCount: estimatedPageCount,
      height: estimatedHeight,
      width: 595, // A4 width in pixels at 72 DPI
    };
  }

  async validateEnvironment(): Promise<{
    isSupported: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test Puppeteer availability for accurate page number calculation
      const browser = await puppeteer.launch({
        headless: true, // Use legacy headless mode for stability
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      await browser.close();
    } catch (error) {
      issues.push(`Puppeteer not available: ${(error as Error).message}`);
      recommendations.push(
        'Install Puppeteer for accurate page number calculation',
      );
    }

    return {
      isSupported: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Generate TOC with accurate page numbers using two-stage rendering
   */
  private async generateTOCWithAccuratePageNumbers(
    content: string,
    headings: Heading[],
    context: ProcessingContext,
  ): Promise<{ html: string; pageNumbers: Record<string, number> }> {
    try {
      // Stage 1: Pre-render content to get real page numbers
      const realPageNumbers = await this.getRealPageNumbers(content, context);

      // Stage 2: Calculate TOC page count and adjust page numbers
      const tocPageCount = await this.estimateTOCPageCount(
        headings,
        realPageNumbers.headingPages,
        context,
      );

      const adjustedPageNumbers = this.adjustPageNumbersForTOC(
        realPageNumbers,
        tocPageCount,
      );

      // Stage 3: Generate TOC with accurate page numbers
      const tocResult = this.tocGenerator.generateTOCWithPageNumbers(
        headings,
        adjustedPageNumbers,
      );

      return {
        html: tocResult.html,
        pageNumbers: adjustedPageNumbers,
      };
    } catch (error) {
      // Silently fallback to TOC without page numbers
      // The error is not critical and doesn't need to be displayed to user

      // Fallback to regular TOC generation
      const tocResult = this.tocGenerator.generateTOC(headings);
      return {
        html: tocResult.html,
        pageNumbers: {},
      };
    }
  }

  /**
   * Get real page numbers by rendering content without TOC
   */
  private async getRealPageNumbers(
    content: string,
    context: ProcessingContext,
  ): Promise<RealPageNumbers> {
    let browser: import('puppeteer').Browser | null = null;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Calculating page numbers (attempt ${attempt}/${maxRetries})`,
        );

        // Launch browser with stable configuration for page number calculation
        // Note: Using legacy headless mode for stability in page calculation
        browser = await puppeteer.launch({
          headless: true, // Use legacy headless mode for stability in page calculation
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',
            '--disable-notifications',
            '--disable-default-apps',
            '--disable-sync',
            '--metrics-recording-only',
            '--no-crash-upload',
            '--disable-crash-reporter',
            // Additional args for new headless mode stability
            '--disable-features=VizDisplayCompositor',
            '--disable-ipc-flooding-protection',
            '--disable-background-networking',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--no-pings',
          ],
          timeout: 60000, // Increased timeout for browser launch
          protocolTimeout: 60000, // Protocol timeout
        });

        const page = await browser.newPage();

        // Generate content-only HTML with correct margins
        const contentHTML = this.generateContentOnlyHTML(content, context);

        // Load content and wait for rendering
        await page.setContent(contentHTML, {
          waitUntil: 'networkidle0',
          timeout: 90000, // Increased timeout for complex content
        });

        // Set PDF viewport to get accurate page calculations
        await page.setViewport({ width: 794, height: 1123 }); // A4 size at 96 DPI

        // Wait for rendering to complete
        await page.waitForTimeout(1000);

        // Get real page positions for headings using PDF dimensions
        const headingPositions = await page.evaluate((hasPageNumbers) => {
          const headings = (globalThis as any).document.querySelectorAll(
            'h1, h2, h3, h4, h5, h6',
          );

          // Calculate page margins based on whether page numbers are enabled
          // Base margins: 2cm top/bottom (as defined in CSS @page rules)
          const baseMarginTopPx = Math.round((2 * 96) / 2.54); // 2cm top margin
          const baseMarginBottomPx = Math.round((2 * 96) / 2.54); // 2cm bottom margin

          // Additional space for header/footer when page numbers are enabled
          // CSS @page header/footer typically add ~1cm each
          const headerFooterSpace = hasPageNumbers
            ? Math.round((1 * 96) / 2.54)
            : 0; // 1cm if enabled

          const effectiveMarginTop = baseMarginTopPx + headerFooterSpace;
          const effectiveMarginBottom = baseMarginBottomPx + headerFooterSpace;
          const pageHeight = 1123 - effectiveMarginTop - effectiveMarginBottom; // A4 height minus effective margins

          return Array.from(headings).map((heading: any) => {
            const rect = heading.getBoundingClientRect();
            const absoluteTop =
              rect.top + (globalThis as any).window.pageYOffset;

            // Calculate page number more accurately
            const pageNumber =
              Math.floor((absoluteTop - effectiveMarginTop) / pageHeight) + 1;

            return {
              id: heading.id || '', // Use the actual ID from the element
              text: heading.textContent || '',
              pageNumber: Math.max(1, pageNumber), // Ensure page number is at least 1
              offsetTop: absoluteTop,
            };
          });
        }, context.pdfOptions?.includePageNumbers || false);

        // Calculate total content page count
        const contentPageCount = await page.evaluate((hasPageNumbers) => {
          // Use same margin calculations as above
          const baseMarginTopPx = Math.round((2 * 96) / 2.54); // 2cm
          const baseMarginBottomPx = Math.round((2 * 96) / 2.54); // 2cm
          const headerFooterSpace = hasPageNumbers
            ? Math.round((1 * 96) / 2.54)
            : 0;

          const effectiveMarginTop = baseMarginTopPx + headerFooterSpace;
          const effectiveMarginBottom = baseMarginBottomPx + headerFooterSpace;
          const pageHeight = 1123 - effectiveMarginTop - effectiveMarginBottom;
          const totalHeight = (globalThis as any).document.body.scrollHeight;

          return Math.max(
            1,
            Math.ceil((totalHeight - effectiveMarginTop) / pageHeight),
          );
        }, context.pdfOptions?.includePageNumbers || false);

        // Build page number mapping
        const headingPages: Record<string, number> = {};
        const positions = headingPositions.map((pos: any) => ({
          ...pos,
          elementType: 'heading' as const,
        }));

        // Map by ID if available, otherwise try to generate consistent IDs
        for (const pos of headingPositions) {
          if (pos.id) {
            headingPages[pos.id] = pos.pageNumber;
          } else if (pos.text) {
            // Generate ID if missing (fallback)
            const generatedId = this.createHeadingId(pos.text);
            headingPages[generatedId] = pos.pageNumber;
          }
        }

        console.log(`Page number calculation successful on attempt ${attempt}`);

        return {
          headingPages,
          contentPageCount,
          positions,
        };
      } catch (error) {
        lastError = error as Error;
        // Debug: Page number calculation failed on attempt, will retry
        // Error details are captured in lastError for final error handling

        // Close browser before retry
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            // Silently handle browser close errors during retry
          }
          browser = null;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw new Error(
            `Page number calculation failed after ${maxRetries} attempts: ${lastError.message || String(lastError)}`,
          );
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      } finally {
        // Clean up browser if this is the last attempt or successful
        if (browser && (attempt === maxRetries || !lastError)) {
          try {
            await browser.close();
          } catch (closeError) {
            // Silently handle browser close errors
          }
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error(
      `Page number calculation failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Generate HTML content without TOC for pre-rendering
   */
  private generateContentOnlyHTML(
    content: string,
    context: ProcessingContext,
  ): string {
    // The content parameter should already be HTML content, not Markdown
    // Since this is called from the two-stage renderer, it receives the processed HTML
    let htmlContent: string;

    // Check if content is already HTML or if it's Markdown
    if (
      content.trim().startsWith('<') ||
      content.includes('<h1') ||
      content.includes('<h2')
    ) {
      // Content is already HTML
      htmlContent = content;
    } else {
      // Content is Markdown, convert it
      htmlContent = this.convertMarkdownToHTML(content);
    }

    // Apply correct margins if header/footer is enabled
    const enableChineseSupport = true; // This should come from context
    const customCSS = context.pdfOptions?.includePageNumbers
      ? this.generatePageCSS(context)
      : '';

    return PDFTemplates.getFullHTML(
      htmlContent,
      'Content Pre-render',
      customCSS,
      enableChineseSupport,
    );
  }

  /**
   * Simple markdown to HTML conversion (placeholder)
   */
  private convertMarkdownToHTML(content: string): string {
    // This is a simplified implementation
    // In real usage, you'd use the actual markdown parser from the system
    const lines = content.split('\n');
    const usedIds = new Set<string>();

    return lines
      .map((line) => {
        const trimmed = line.trim();

        // Handle headings
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          const baseId = this.createHeadingId(text);

          // Ensure unique ID
          let id = baseId;
          let counter = 1;
          while (usedIds.has(id)) {
            counter++;
            id = `${baseId}-${counter}`;
          }
          usedIds.add(id);

          return `<h${level} id="${id}">${text}</h${level}>`;
        }

        // Handle paragraphs
        if (trimmed && !trimmed.startsWith('#')) {
          return `<p>${trimmed}</p>`;
        }

        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Generate CSS for pages with header/footer
   */
  private generatePageCSS(context: ProcessingContext): string {
    if (!context.pdfOptions?.includePageNumbers) {
      return '';
    }

    return `
      @page {
        margin-top: 2cm;
        margin-bottom: 2cm;

        @top-center {
          content: "Document Title";
          font-size: 10pt;
          color: #666;
        }

        @bottom-center {
          content: "Page " counter(page);
          font-size: 10pt;
          color: #666;
        }
      }
    `;
  }

  /**
   * Estimate how many pages the TOC will occupy by actually rendering it
   *
   * This method renders the TOC with actual page numbers to get precise page count
   */
  private async estimateTOCPageCount(
    headings: Heading[],
    _pageNumbers: Record<string, number>,
    context: ProcessingContext,
  ): Promise<number> {
    try {
      // Generate TOC with placeholder page numbers first to estimate size
      const placeholderPageNumbers: Record<string, number> = {};
      headings.forEach((heading, index) => {
        const id = heading.id || this.createHeadingId(heading.text);
        placeholderPageNumbers[id] = index + 1; // Use sequential numbers for estimation
      });

      // Generate actual TOC HTML
      const tocResult = this.tocGenerator.generateTOCWithPageNumbers(
        headings,
        placeholderPageNumbers,
      );

      if (!tocResult.html) {
        return 1;
      }

      // Use Puppeteer to measure actual TOC height
      let browser: import('puppeteer').Browser | null = null;
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // Create a simplified HTML document with just the TOC
        const tocHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
      padding: 2cm;
    }
    .toc-container {
      margin: 0;
    }
    .toc-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .toc-list {
      list-style: none;
      padding: 0;
    }
    .toc-item {
      margin: 8px 0;
      display: flex;
      justify-content: space-between;
    }
    .toc-link {
      text-decoration: none;
      color: #333;
    }
    .toc-page-number {
      margin-left: 10px;
    }
  </style>
</head>
<body>
  ${tocResult.html}
</body>
</html>`;

        await page.setContent(tocHtml, { waitUntil: 'networkidle0' });
        await page.setViewport({ width: 794, height: 1123 }); // A4 size

        // Calculate how many pages the TOC would occupy
        const contentHeight = await page.evaluate(() => {
          return (globalThis as any).document.body.scrollHeight;
        });

        // Use same page height calculation as in getRealPageNumbers
        const baseMarginTopPx = Math.round((2 * 96) / 2.54); // 2cm
        const baseMarginBottomPx = Math.round((2 * 96) / 2.54); // 2cm

        // Consider header/footer space if page numbers are enabled
        // Check from the processing context for accurate header/footer detection
        const hasPageNumbers = context.pdfOptions?.includePageNumbers || false;
        const headerFooterSpace = hasPageNumbers
          ? Math.round((1 * 96) / 2.54)
          : 0;

        const effectiveMarginTop = baseMarginTopPx + headerFooterSpace;
        const effectiveMarginBottom = baseMarginBottomPx + headerFooterSpace;
        const pageHeight = 1123 - effectiveMarginTop - effectiveMarginBottom;

        const estimatedPages = Math.max(
          1,
          Math.ceil(contentHeight / pageHeight),
        );

        return estimatedPages;
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    } catch (error) {
      // Fall back to line-based estimation silently

      // Fallback to line-based estimation
      let totalLines = 5; // Title and spacing, more conservative

      for (const heading of headings) {
        if (heading.level <= this.tocGenerator.getOptions().maxDepth) {
          if (heading.level === 1) {
            totalLines += 1.8; // More spacing for level 1
          } else if (heading.level === 2) {
            totalLines += 1.5;
          } else {
            totalLines += 1.3;
          }
        }
      }

      // More conservative estimate for complex documents
      const linesPerPage = 35; // Reduced from 42 to be more conservative
      return Math.max(1, Math.ceil(totalLines / linesPerPage));
    }
  }

  /**
   * Adjust page numbers to account for TOC offset
   *
   * The logic here is:
   * 1. TOC is inserted at the beginning of the document
   * 2. All content pages are shifted by the number of TOC pages
   * 3. Page numbers in TOC should reflect the final position after TOC insertion
   */
  private adjustPageNumbersForTOC(
    realPageNumbers: RealPageNumbers,
    tocPageCount: number,
  ): Record<string, number> {
    const adjustedPageNumbers: Record<string, number> = {};

    // When TOC is inserted at the beginning:
    // - TOC occupies pages 1 to tocPageCount
    // - Original content page 1 becomes page (tocPageCount + 1)
    // - Original content page N becomes page (tocPageCount + N)
    for (const [headingId, originalPageNumber] of Object.entries(
      realPageNumbers.headingPages,
    )) {
      adjustedPageNumbers[headingId] = originalPageNumber + tocPageCount;
    }

    return adjustedPageNumbers;
  }

  /**
   * Convert extracted headings to Heading interface
   */
}
