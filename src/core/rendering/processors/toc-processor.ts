/**
 * TOC Processor for two-stage rendering
 * Handles Table of Contents generation with accurate page numbers
 */

import puppeteer from 'puppeteer';

import { Heading } from '../../../types/index';
import { getGlobalBrowserPool } from '../../../utils/browser-pool';
import {
  calculateTotalPages,
  getEffectiveMargins,
  type MarginConfig,
} from '../../../utils/margin-calculator';
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
    // Check if TOC is enabled
    if (!context.tocOptions?.enabled) {
      console.debug('TOC: Disabled, skipping');
      return 0;
    }

    // Check if content has headings
    const headings = context.headings || [];
    if (headings.length === 0) {
      console.debug('TOC: No headings found, skipping');
      return 0;
    }

    // TOC processor should handle all cases with TOC, regardless of page numbers
    // Page number handling is determined in the process() method
    if (context.tocOptions.includePageNumbers) {
      console.debug(
        `TOC: Detected with page numbers (${headings.length} headings)`,
      );
      return 1.0; // Maximum confidence for TOC with page numbers
    } else {
      console.debug(
        `TOC: Detected without page numbers (${headings.length} headings)`,
      );
      return 0.9; // High confidence for TOC without page numbers
    }
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
        console.info(
          'TOC: Pre-rendering stage - generating TOC without page numbers',
        );
        const tocResult = this.tocGenerator.generateTOC(
          headings,
          context.documentLanguage,
        );
        tocHTML = tocResult.html;
      } else {
        // Final rendering stage: check if page numbers are needed
        if (context.tocOptions?.includePageNumbers) {
          console.info(
            'TOC: Starting multi-stage process for accurate page numbers',
          );
          // Use multi-stage process for accurate page numbers
          const { html, pageNumbers } =
            await this.generateTOCWithAccuratePageNumbers(
              content,
              headings,
              context,
            );
          tocHTML = html;
          console.info(
            `TOC: Generated with ${Object.keys(pageNumbers).length} page number entries`,
          );

          if (Object.keys(pageNumbers).length === 0) {
            warnings.push('Could not calculate accurate page numbers');
          }
        } else {
          // Generate TOC without page numbers
          console.info('TOC: Generating simple TOC without page numbers');
          const tocResult = this.tocGenerator.generateTOC(
            headings,
            context.documentLanguage,
          );
          tocHTML = tocResult.html;
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
      console.info('TOC: Starting 3-stage accurate page number generation');

      // Filter headings based on maxDepth from context at the beginning
      const maxDepth = context.tocOptions?.maxDepth || 6;
      const filteredHeadings = headings.filter((h) => h.level <= maxDepth);
      console.debug(
        `TOC: Filtered ${headings.length} headings to ${filteredHeadings.length} headings (maxDepth=${maxDepth})`,
      );

      // Stage 1: Pre-render content to get real page numbers
      console.info(
        'TOC Stage 1: Pre-rendering content to calculate real page numbers',
      );
      const realPageNumbers = await this.getRealPageNumbers(content, context);
      console.debug(
        `TOC Stage 1: Found ${Object.keys(realPageNumbers.headingPages).length} heading positions, total content pages: ${realPageNumbers.contentPageCount}`,
      );

      // Stage 2: Calculate TOC page count and adjust page numbers
      console.info(
        'TOC Stage 2: Calculating TOC page count and adjusting page numbers',
      );

      const tocPageCount = await this.estimateTOCPageCount(
        filteredHeadings,
        realPageNumbers.headingPages,
        context,
      );
      console.info(
        `TOC Stage 2: Estimated TOC will occupy ${tocPageCount} pages`,
      );

      const adjustedPageNumbers = this.adjustPageNumbersForTOC(
        realPageNumbers,
        tocPageCount,
      );
      console.debug(
        `TOC Stage 2: Adjusted ${Object.keys(adjustedPageNumbers).length} page numbers`,
      );

      // Stage 3: Generate TOC with accurate page numbers
      console.info(
        'TOC Stage 3: Generating final TOC with accurate page numbers',
      );
      console.debug(
        `TOC Stage 3: Using ${filteredHeadings.length} filtered page numbers for ${filteredHeadings.length} headings`,
      );

      const tocResult = this.tocGenerator.generateTOCWithPageNumbers(
        filteredHeadings,
        adjustedPageNumbers,
        context.documentLanguage,
      );

      // Log validation results
      if (tocResult.validation) {
        console.info(
          `TOC: Page number mapping - ${tocResult.validation.matched} matched, ${tocResult.validation.unmatched.length} unmatched`,
        );

        if (tocResult.validation.warnings.length > 0) {
          console.warn(
            `TOC: Page number mapping warnings:\n${tocResult.validation.warnings.join('\n')}`,
          );
        }

        if (tocResult.validation.unmatched.length > 0) {
          console.error(
            `TOC: Unmatched headings (no page numbers):\n${tocResult.validation.unmatched.join('\n')}`,
          );
        }
      }

      console.info('TOC: 3-stage process completed successfully');
      return {
        html: tocResult.html,
        pageNumbers: adjustedPageNumbers,
      };
    } catch (error) {
      console.error(
        'TOC: Multi-stage process failed, falling back to simple TOC',
        error,
      );
      // Fallback to regular TOC generation
      const tocResult = this.tocGenerator.generateTOC(
        headings,
        context.documentLanguage,
      );
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
    const browserPool = getGlobalBrowserPool();
    let browser: import('puppeteer').Browser | null = null;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.debug(
          `TOC: Page number calculation attempt ${attempt}/${maxRetries}`,
        );

        // Acquire browser from pool instead of launching new one
        browser = await browserPool.acquire();

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

        // Get effective margins considering all configuration sources
        const hasPageNumbers = context.pdfOptions?.includePageNumbers || false;
        const hasHeaderFooter =
          hasPageNumbers || !!context.headersFootersConfig;
        const margins = getEffectiveMargins(
          context.pdfOptions?.margins,
          hasHeaderFooter,
        );

        console.debug(
          `TOC: Using margins for page calculation - T:${margins.top} R:${margins.right} B:${margins.bottom} L:${margins.left}`,
        );

        // Generate actual PDF to get accurate page count
        // CRITICAL: Use the SAME PDF options as final PDF to ensure identical pagination
        console.debug('TOC: Generating actual PDF to measure page count');

        // Check if final PDF will have header/footer
        const willHaveHeaderFooter = hasHeaderFooter;

        const pdfOptions = {
          format: 'A4' as const,
          // Important: Set margin to 0 because CSS @page already handles margins
          margin: {
            top: '0',
            right: '0',
            bottom: '0',
            left: '0',
          },
          printBackground: true,
          // CRITICAL: Must match final PDF generation to get same pagination
          displayHeaderFooter: willHaveHeaderFooter,
          preferCSSPageSize: false,
          tagged: true, // Generate tagged PDF for better accessibility and text extraction
        } as any; // 'tagged' is not in the type definition but supported by Puppeteer

        console.debug(
          'TOC: Multi-stage observation - Step 1: Inject page markers',
        );

        // Step 1: Inject unique numeric markers for each heading
        const headingInfo = await page.evaluate(() => {
          const headings = (globalThis as any).document.querySelectorAll(
            'h1, h2, h3, h4, h5, h6',
          );

          return Array.from(headings).map((heading: any, index: number) => {
            // Generate unique marker using only ASCII characters
            const markerId = `HDG${String(index).padStart(4, '0')}`;

            // Insert nearly-invisible marker with explicit font
            // Key: inline-block + explicit font for PDF text layer extraction
            const markerSpan = (globalThis as any).document.createElement(
              'span',
            );
            markerSpan.textContent = `${markerId}`;
            markerSpan.className = 'toc-page-marker';
            markerSpan.style.fontSize = '0.5pt'; // Extremely small
            markerSpan.style.color = '#fefefe'; // Nearly white (not pure white)
            markerSpan.style.fontFamily = 'Arial, sans-serif';
            markerSpan.style.display = 'inline-block'; // CRITICAL for PDF extraction
            markerSpan.style.opacity = '0.01'; // Nearly invisible
            markerSpan.setAttribute('aria-hidden', 'true');

            // Insert before heading content
            heading.insertBefore(markerSpan, heading.firstChild);

            return {
              index: index,
              id: heading.id || '',
              text: (heading.textContent || '').replace(markerId, '').trim(),
              marker: markerId,
              tagName: heading.tagName.toLowerCase(),
            };
          });
        });

        console.debug(
          `TOC: Injected ${headingInfo.length} page markers into headings`,
        );

        // Step 2: Generate PDF with markers
        console.debug(
          'TOC: Multi-stage observation - Step 2: Generate PDF with markers',
        );
        const pdfBuffer = await page.pdf(pdfOptions);
        const actualTotalPages = await this.getActualPDFPageCount(pdfBuffer);
        console.debug(`TOC: Generated PDF has ${actualTotalPages} pages`);

        // Step 3: Extract page numbers by searching for markers in PDF
        console.debug(
          'TOC: Multi-stage observation - Step 3: Extract page numbers from PDF',
        );
        const markerPages = await this.extractPageNumbersFromPDF(
          pdfBuffer,
          headingInfo.map((h) => h.marker),
        );

        console.debug(
          `TOC: Found ${markerPages.size}/${headingInfo.length} markers in PDF`,
        );

        // Step 4: Build page number mapping
        const contentPageCount = actualTotalPages;
        const headingPages: Record<string, number> = {};
        const positions: Array<{
          id: string;
          text: string;
          pageNumber: number;
          offsetTop: number;
          elementType: 'heading';
        }> = [];

        for (const heading of headingInfo) {
          const pageNumber = markerPages.get(heading.marker) || 1;

          if (!markerPages.has(heading.marker)) {
            console.warn(
              `TOC: Marker ${heading.marker} not found in PDF for "${heading.text.substring(0, 40)}...", defaulting to page 1`,
            );
          }

          if (heading.id) {
            headingPages[heading.id] = pageNumber;
          } else {
            const generatedId = this.createHeadingId(heading.text);
            headingPages[generatedId] = pageNumber;
          }

          positions.push({
            id: heading.id || this.createHeadingId(heading.text),
            text: heading.text,
            pageNumber: pageNumber,
            offsetTop: 0,
            elementType: 'heading' as const,
          });

          // Debug: log first few and key headings
          if (heading.index < 5 || heading.text.includes('測試實作')) {
            console.debug(
              `TOC: "${heading.text.substring(0, 40)}..." - marker: ${heading.marker}, observed page: ${pageNumber}`,
            );
          }
        }

        console.info(
          `TOC: Page number calculation successful - found ${headingInfo.length} headings across ${contentPageCount} pages`,
        );

        // Release browser back to pool
        if (browser) {
          await browserPool.release(browser);
          browser = null;
        }

        return {
          headingPages,
          contentPageCount,
          positions,
        };
      } catch (error) {
        lastError = error as Error;
        // Debug: Page number calculation failed on attempt, will retry
        // Error details are captured in lastError for final error handling

        // Release browser back to pool before retry
        if (browser) {
          try {
            await browserPool.release(browser);
          } catch (releaseError) {
            // Silently handle browser release errors during retry
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
        // Ensure browser is released if still held
        if (browser) {
          try {
            await browserPool.release(browser);
          } catch (releaseError) {
            // Silently handle browser release errors
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
   * CRITICAL: Must use processed content to match final PDF rendering
   */
  private generateContentOnlyHTML(
    content: string,
    context: ProcessingContext,
  ): string {
    // Content is already processed HTML from two-stage renderer
    // (includes PlantUML/Mermaid diagrams)
    let htmlContent = content;

    // CRITICAL: Remove TOC section to get accurate content-only page numbers
    // The content may include a pre-rendered TOC from earlier stage
    // We need pure content to calculate correct page numbers
    htmlContent = this.removeTOCSection(htmlContent);

    // Use same theme and CSS generation as final PDF
    const theme = context.syntaxHighlightingTheme || 'default';

    // Generate CSS with correct margins for header/footer
    const customCSS = context.pdfOptions?.includePageNumbers
      ? this.generatePageCSS(context)
      : '';

    // Enable Chinese support based on document language
    const enableChineseSupport = context.documentLanguage === 'zh-TW';

    return PDFTemplates.getFullHTML(
      htmlContent,
      context.documentTitle || 'Content Pre-render',
      customCSS,
      enableChineseSupport,
      undefined, // configAccessor
      theme,
    );
  }

  /**
   * Remove TOC section from HTML content
   */
  private removeTOCSection(html: string): string {
    // Remove the TOC div and its contents
    // Our TOC generator creates: <div id="toc" class="...">
    return html
      .replace(/<div[^>]*id="toc"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(
        /<div[^>]*class="[^"]*table-of-contents[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        '',
      )
      .replace(
        /<nav[^>]*class="[^"]*table-of-contents[^"]*"[^>]*>[\s\S]*?<\/nav>/gi,
        '',
      )
      .replace(
        /<section[^>]*class="[^"]*toc[^"]*"[^>]*>[\s\S]*?<\/section>/gi,
        '',
      );
  }

  /**
   * Generate CSS for pages with header/footer
   * Uses dynamic margins from context configuration
   *
   * Note: This method generates CSS @page rules with correct margins for TOC page calculation.
   * The actual headers/footers content will be handled by HeaderFooterGenerator in main PDF generator,
   * but we need the same margins here for accurate TOC page count estimation.
   */
  private generatePageCSS(context: ProcessingContext): string {
    if (
      !context.pdfOptions?.includePageNumbers &&
      !context.headersFootersConfig
    ) {
      return '';
    }

    // Use margins from context (set by template configuration)
    const margins = {
      top: context.pdfOptions?.margins?.top || '2cm',
      bottom: context.pdfOptions?.margins?.bottom || '2cm',
      left: context.pdfOptions?.margins?.left || '2cm',
      right: context.pdfOptions?.margins?.right || '2cm',
    };

    // Important: Use the SAME margins as final PDF generation
    // Don't add extra headerFooterSpace - the margins already account for this
    // This ensures TOC page count matches final PDF pagination
    return `
      @page {
        margin-top: ${margins.top};
        margin-bottom: ${margins.bottom};
        margin-left: ${margins.left};
        margin-right: ${margins.right};
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
    pageNumbers: Record<string, number>,
    context: ProcessingContext,
  ): Promise<number> {
    return await this.estimateTOCPageCountWithPuppeteer(
      headings,
      pageNumbers,
      context,
    );
  }

  private async estimateTOCPageCountWithPuppeteer(
    headings: Heading[],
    pageNumbers: Record<string, number>,
    context: ProcessingContext,
  ): Promise<number> {
    console.debug(
      `TOC: Starting accurate page count measurement for ${headings.length} headings`,
    );

    const browserPool = getGlobalBrowserPool();
    let browser: import('puppeteer').Browser | null = null;
    try {
      // Generate actual TOC HTML
      const tocResult = this.tocGenerator.generateTOCWithPageNumbers(
        headings,
        pageNumbers,
        context.documentLanguage,
      );

      if (!tocResult.html) {
        console.warn('TOC: No HTML generated, returning 1 page');
        return 1;
      }

      // Use exactly the same HTML template and settings as final PDF generation
      // This ensures headers, footers, TOC title, and all user-defined styles are correctly calculated

      // 1. Get all CSS that's the same as final PDF generation
      const finalCSS = this.getFinalPDFCSS(context);

      // 2. Create complete HTML structure same as final PDF
      // Include headers, footers, TOC title, TOC content, but exclude main content
      const fullTocHtml = this.createFullTOCHTML(
        tocResult.html,
        context,
        finalCSS,
      );

      // Acquire browser from pool
      browser = await browserPool.acquire();

      const page = await browser.newPage();
      await page.setContent(fullTocHtml, { waitUntil: 'networkidle0' });

      // Generate actual PDF and let Puppeteer tell us the page count - use exactly the same settings as final PDF
      // Important: CSS @page rules have already set margins, so PDF margin should be set to 0
      // to avoid double margins causing calculation errors
      const pdfOptions = {
        format: 'A4' as const,
        margin: context.pdfOptions?.includePageNumbers
          ? {
              top: '0',
              right: '0',
              bottom: '0',
              left: '0',
            }
          : {
              top: '2cm',
              right: '2cm',
              bottom: '2cm',
              left: '2cm',
            },
        printBackground: true,
        // Force disable Puppeteer headers/footers (use CSS @page instead)
        displayHeaderFooter: false,
      };

      console.debug('TOC: Generating PDF to measure actual page count');
      const pdfBuffer = await page.pdf(pdfOptions);

      // Use Node.js to check actual generated PDF page count
      // This is the most direct method: let PDF engine generate PDF, then check the result
      const pageCount = await this.getActualPDFPageCount(pdfBuffer);
      console.debug(`TOC: PDF engine reported ${pageCount} pages`);

      // Validate page count by calculating expected pages from content height
      const tocContentHeight = await page.evaluate(() => {
        const tocContainer = (globalThis as any).document.getElementById('toc');
        return tocContainer ? tocContainer.scrollHeight : 0;
      });

      if (tocContentHeight > 0) {
        const margins: MarginConfig = {
          top: context.pdfOptions?.margins?.top || '2cm',
          right: context.pdfOptions?.margins?.right || '2cm',
          bottom: context.pdfOptions?.margins?.bottom || '2cm',
          left: context.pdfOptions?.margins?.left || '2cm',
        };

        const expectedPages = calculateTotalPages(
          tocContentHeight,
          'A4',
          margins,
          context.pdfOptions?.includePageNumbers || false,
        );

        // If there's a significant discrepancy (>1 page), use the higher value for safety
        if (Math.abs(expectedPages - pageCount) > 1) {
          const safePageCount = Math.max(expectedPages, pageCount);
          console.warn(
            `TOC: Page count discrepancy detected. PDF reported ${pageCount}, calculated ${expectedPages}. Using ${safePageCount} for safety.`,
          );
          return safePageCount;
        }
      }

      console.info(`TOC: Final page count estimation: ${pageCount} pages`);
      return pageCount;
    } catch (error) {
      console.error(
        'TOC: Page count measurement failed, using fallback',
        error,
      );
      // Fallback: If measurement fails, use simple 1-page estimation
      return 1;
    } finally {
      if (browser) {
        try {
          await browserPool.release(browser);
        } catch (releaseError) {
          // Ignore release errors
        }
      }
    }
  }

  /**
   * Parse actual page count from real PDF binary data
   */
  private async getActualPDFPageCount(pdfBuffer: Buffer): Promise<number> {
    try {
      const pdfString = pdfBuffer.toString('binary');

      // Method 1: Find /Type /Page objects (most direct method)
      const pageObjectMatches = pdfString.match(/\/Type\s*\/Page\b/g);
      if (pageObjectMatches && pageObjectMatches.length > 0) {
        return pageObjectMatches.length;
      }

      // Method 2: Find Count in Pages object
      const pagesCountMatch = pdfString.match(
        /\/Type\s*\/Pages[\s\S]{0,1000}?\/Count\s+(\d+)/,
      );
      if (pagesCountMatch) {
        const count = parseInt(pagesCountMatch[1], 10);
        return count;
      }

      // Method 3: Find any /Count (less reliable)
      const anyCountMatch = pdfString.match(/\/Count\s+(\d+)/);
      if (anyCountMatch) {
        const count = parseInt(anyCountMatch[1], 10);
        return count;
      }

      // If none found, return 1
      return 1;
    } catch (error) {
      return 1;
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
      const adjustedPageNumber = originalPageNumber + tocPageCount;
      adjustedPageNumbers[headingId] = adjustedPageNumber;
    }

    return adjustedPageNumbers;
  }

  /**
   * Get complete CSS same as final PDF generation
   */
  private getFinalPDFCSS(context: ProcessingContext): string {
    // Include all CSS that affects pagination: page numbers, headers/footers, user-defined styles, etc.
    const css = [];

    // 1. Page number CSS
    if (context.pdfOptions?.includePageNumbers) {
      css.push(this.generatePageCSS(context));
    }

    // 2. Future: can add header/footer CSS here

    // 3. User-defined CSS

    return css.join('\n');
  }

  /**
   * Create complete HTML structure same as final PDF
   * Include headers, footers, TOC title, TOC content, but exclude main content
   */
  private createFullTOCHTML(
    tocHTML: string,
    context: ProcessingContext,
    finalCSS: string,
  ): string {
    // Use the same template function as final PDF generation
    // This ensures headers, footers, title format, etc. are completely consistent
    const theme = context.syntaxHighlightingTheme || 'default';

    return PDFTemplates.getFullHTMLWithTOC(
      tocHTML,
      '', // No main content, only TOC
      'TOC Page Count Calculation', // Document title
      finalCSS,
      true, // Enable Chinese support
      undefined, // configAccessor
      theme,
    );
  }

  /**
   * Extract page numbers by searching for markers in PDF
   * Uses pdfjs-dist to parse PDF and find which page each marker appears on
   */
  private async extractPageNumbersFromPDF(
    pdfBuffer: Buffer,
    markers: string[],
  ): Promise<Map<string, number>> {
    const markerPages = new Map<string, number>();

    try {
      // Import pdfjs-dist
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

      // Convert Buffer to Uint8Array (required by pdfjs-dist)
      const uint8Array = new Uint8Array(pdfBuffer);

      // Load PDF
      const loadingTask = getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;

      console.debug(
        `TOC: Parsing ${pdfDoc.numPages} pages to find ${markers.length} markers`,
      );

      // Search each page for markers
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Combine all text items on this page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        // Search for each marker
        for (const marker of markers) {
          if (!markerPages.has(marker) && pageText.includes(marker)) {
            markerPages.set(marker, pageNum);
            console.debug(`TOC: Found marker ${marker} on page ${pageNum}`);
          }
        }

        // Early exit if all markers found
        if (markerPages.size === markers.length) {
          console.debug(
            `TOC: All ${markers.length} markers found, stopping page scan at page ${pageNum}/${pdfDoc.numPages}`,
          );
          break;
        }
      }

      const foundCount = markerPages.size;
      const missingCount = markers.length - foundCount;

      if (missingCount > 0) {
        console.warn(
          `TOC: ${missingCount} markers not found in PDF (found ${foundCount}/${markers.length})`,
        );

        // Log first few missing markers
        const missingMarkers = markers
          .filter((m) => !markerPages.has(m))
          .slice(0, 5);
        console.warn(`TOC: Missing markers: ${missingMarkers.join(', ')}...`);
      } else {
        console.info(
          `TOC: Successfully found all ${markers.length} markers in PDF`,
        );
      }

      return markerPages;
    } catch (error) {
      console.error('TOC: Failed to extract page numbers from PDF:', error);
      console.error('TOC: Falling back to empty page mapping');
      return markerPages;
    }
  }

  /**
   * Convert extracted headings to Heading interface
   */
}
