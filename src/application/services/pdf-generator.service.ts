/**
 * PDF Generator Service
 * Uses the PDF Engine abstraction layer with failover and health monitoring
 * Provides enterprise-grade PDF generation with multi-engine support
 */

import { BookmarkGenerator } from '../../core/bookmarks/bookmark-generator';
import { BookmarkOptions } from '../../core/bookmarks/types';
import {
  ConversionStartedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  InMemoryEventPublisher,
} from '../../core/domain/events';
import {
  HeaderFooterGenerator,
  HeaderFooterContext,
} from '../../core/headers-footers';
import {
  PDFEngineManager,
  PDFEngineFactory,
  HealthFirstSelectionStrategy,
  PrimaryFirstSelectionStrategy,
  PDFGenerationContext,
  PDFEngineOptions,
  PDFEngineHealthStatus,
  PDFEngineManagerConfig,
  DEFAULT_ENGINE_CONFIG,
  IEngineSelectionStrategy,
} from '../../core/pdf/engines';
import { PDFGeneratorOptions, PDFGenerationResult } from '../../core/pdf/types';
import { ProcessingContext } from '../../core/rendering/types';
import { DEFAULT_MARGINS } from '../../infrastructure/config/constants';
import { MD2PDFError } from '../../infrastructure/error/errors';
import { Heading } from '../../types';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface IPDFGeneratorService {
  generatePDF(
    htmlContent: string,
    outputPath: string,
    options?: {
      title?: string;
      customCSS?: string;
      headings?: Heading[];
      markdownContent?: string;
      enableChineseSupport?: boolean;
      includePageNumbers?: boolean;
      includeTOC?: boolean;
      tocOptions?: {
        enabled: boolean;
        maxDepth: number;
        includePageNumbers: boolean;
        title?: string;
      };
      bookmarkOptions?: BookmarkOptions;
      documentLanguage?: string;
      metadata?: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string;
        creator?: string;
        producer?: string;
        creationDate?: Date | string;
        modDate?: Date | string;
        [key: string]: any;
      };
    },
  ): Promise<PDFGenerationResult>;

  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  getEngineStatus(): Map<string, PDFEngineHealthStatus>;
  getAvailableEngines(): string[];
  forceHealthCheck(engineName?: string): Promise<void>;
}

export class PDFGeneratorService implements IPDFGeneratorService {
  private engineManager: PDFEngineManager | null = null;
  private isInitialized = false;
  private eventPublisher: InMemoryEventPublisher;
  private headerFooterGenerator: HeaderFooterGenerator;

  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly configManager: IConfigManager,
    private readonly translationManager: ITranslationManager,
  ) {
    this.eventPublisher = new InMemoryEventPublisher();
    // Initialize HeaderFooterGenerator with dependencies
    this.headerFooterGenerator = new HeaderFooterGenerator(
      this.translationManager,
      this.logger,
    );
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing advanced PDF generator service');

      // Get configuration from config manager
      const engineConfig = this.buildEngineConfig();

      // Create engine factory and selection strategy
      const factory = new PDFEngineFactory();
      const selectionStrategy = this.createSelectionStrategy(engineConfig);

      // Create and initialize engine manager
      this.engineManager = new PDFEngineManager(
        engineConfig,
        factory,
        selectionStrategy,
      );
      await this.engineManager.initialize();

      this.isInitialized = true;
      this.logger.info(
        'Advanced PDF generator service initialized successfully',
      );

      // Log available engines
      const availableEngines = this.engineManager.getAvailableEngines();
      this.logger.info(`Available PDF engines: ${availableEngines.join(', ')}`);
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to initialize advanced PDF generator service: ${(error as Error).message}`,
        'PDF_ENGINE_INIT_ERROR',
        'pdf_generation',
        false,
        { originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PDFGeneratorService.initialize',
      );
      throw wrappedError;
    }
  }

  private buildEngineConfig(): PDFEngineManagerConfig {
    // Get configuration from config manager with defaults
    const baseConfig = this.configManager.get(
      'pdfEngine',
      {},
    ) as Partial<PDFEngineManagerConfig>;

    return {
      ...DEFAULT_ENGINE_CONFIG,
      ...baseConfig,
      // Ensure required fields have defaults
      primaryEngine: baseConfig.primaryEngine || 'puppeteer',
      fallbackEngines: baseConfig.fallbackEngines || [],
      healthCheckInterval: baseConfig.healthCheckInterval || 30000,
      maxRetries: baseConfig.maxRetries || 2,
      retryDelay: baseConfig.retryDelay || 1000,
      enableMetrics: baseConfig.enableMetrics ?? true,
      resourceLimits: {
        ...DEFAULT_ENGINE_CONFIG.resourceLimits,
        ...baseConfig.resourceLimits,
      },
    };
  }

  private createSelectionStrategy(
    config: PDFEngineManagerConfig,
  ): IEngineSelectionStrategy {
    const strategyType = this.configManager.get(
      'pdfEngine.selectionStrategy',
      'health-first',
    ) as 'health-first' | 'primary-first';

    switch (strategyType) {
      case 'primary-first':
        return new PrimaryFirstSelectionStrategy(config.primaryEngine);
      case 'health-first':
      default:
        return new HealthFirstSelectionStrategy();
    }
  }

  async generatePDF(
    htmlContent: string,
    outputPath: string,
    options: {
      title?: string;
      customCSS?: string;
      headings?: Heading[];
      markdownContent?: string;
      enableChineseSupport?: boolean;
      includePageNumbers?: boolean;
      includeTOC?: boolean;
      tocOptions?: {
        enabled: boolean;
        maxDepth: number;
        includePageNumbers: boolean;
        title?: string;
      };
      bookmarkOptions?: BookmarkOptions;
    } = {},
  ): Promise<PDFGenerationResult> {
    if (!this.isInitialized || !this.engineManager) {
      await this.initialize();
    }

    try {
      this.logger.debug(`Generating PDF with advanced service: ${outputPath}`);
      this.logger.debug('PDF Generator received options:', {
        includeTOC: options.includeTOC,
        tocOptions: options.tocOptions,
        markdownContentLength: options.markdownContent?.length || 0,
      });
      const startTime = Date.now();

      // Always use two-stage rendering for consistent translation and accurate page numbers
      this.logger.info('Using two-stage rendering for all PDFs');

      return await this.generateWithTwoStageRendering(
        htmlContent,
        outputPath,
        options,
        startTime,
      );
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Advanced PDF generation failed: ${(error as Error).message}`,
        'PDF_GENERATION_ERROR',
        'pdf_generation',
        true,
        {
          outputPath,
          htmlContentLength: htmlContent.length,
          options,
          originalError: error,
        },
      );

      // Publish conversion failed event for exceptions
      try {
        const inputPath = outputPath.replace('.pdf', '.md');
        const failedEvent = new ConversionFailedEvent(
          inputPath,
          wrappedError.message,
        );
        await this.eventPublisher.publish(failedEvent);
      } catch (eventError) {
        this.logger.warn(
          'Failed to publish conversion failed event',
          eventError,
        );
      }

      await this.errorHandler.handleError(
        wrappedError,
        'PDFGeneratorService.generatePDF',
      );

      return {
        success: false,
        error: wrappedError.message,
      };
    }
  }

  private async convertToEngineOptions(
    _context: PDFGenerationContext,
  ): Promise<PDFEngineOptions> {
    // Get PDF configuration from config manager
    const pdfConfig = this.configManager.get('pdf', {}) as PDFGeneratorOptions;

    // Base options from configuration - Force disable displayHeaderFooter
    const baseOptions: PDFEngineOptions = {
      format: pdfConfig.format || 'A4',
      orientation: pdfConfig.orientation || 'portrait',
      margin: pdfConfig.margin || DEFAULT_MARGINS.NORMAL,
      displayHeaderFooter: false, // Force disable Puppeteer's header/footer system
      headerTemplate: '', // Disable Puppeteer templates
      footerTemplate: '', // Disable Puppeteer templates
      printBackground: pdfConfig.printBackground ?? true,
      scale: pdfConfig.scale || 1,
      preferCSSPageSize: pdfConfig.preferCSSPageSize || false,
    };

    // Since we're using CSS @page approach, we no longer use Puppeteer's header/footer templates
    // The header/footer will be injected directly into the HTML content via CSS
    this.logger.debug(
      'Using CSS @page approach - Puppeteer header/footer templates disabled',
    );

    return baseOptions;
  }

  /**
   * Inject CSS @page rules directly into HTML content for header/footer
   * Integrates with the new headers/footers configuration system
   */
  private injectCSSPageRules(
    htmlContent: string,
    options: {
      title?: string;
      headings?: Heading[];
      markdownContent?: string;
      enableChineseSupport?: boolean;
      tocOptions?: {
        enabled: boolean;
        maxDepth: number;
        includePageNumbers: boolean;
        title?: string;
      };
    },
    includePageNumbers: boolean = false,
  ): string {
    try {
      this.logger.debug(
        `Injecting CSS @page rules for header/footer - includePageNumbers: ${includePageNumbers}`,
      );

      // Check if headers/footers are configured in user settings
      const config = this.configManager.getConfig();
      const headersFootersConfig = config.headersFooters;

      let cssPageRules = '';

      if (
        headersFootersConfig &&
        (headersFootersConfig.header.enabled ||
          headersFootersConfig.footer.enabled)
      ) {
        this.logger.debug('Using configured headers/footers system');

        // Prepare context for HeaderFooterGenerator
        const firstH1 = options.headings?.find((h) => h.level === 1);

        const context = {
          documentTitle: options.title,
          firstH1Title: firstH1?.text,
          pageNumber: 1, // CSS counters will handle actual page numbers
          totalPages: 1, // CSS counters will handle actual total pages
          currentDate: new Date(),
          // author: undefined, // Can be extended later
          // customMessage: undefined, // Can be extended later
        } as HeaderFooterContext;

        // Get current margins from ConfigManager
        const pdfConfig = this.configManager.get('pdf', {}) as any;
        const margins = pdfConfig.margin;

        // Generate CSS using the new HeaderFooterGenerator with current margins
        cssPageRules = this.headerFooterGenerator.generateCSSPageRules(
          headersFootersConfig,
          context,
          margins,
        );
      } else if (includePageNumbers) {
        this.logger.debug('Falling back to legacy includePageNumbers mode');

        // Fallback to backward-compatible mode
        const firstH1 = options.headings?.find((h) => h.level === 1);
        const documentTitle =
          firstH1?.text || options.title || 'Markdown Document';

        const context = {
          documentTitle: options.title,
          firstH1Title: firstH1?.text,
          pageNumber: 1,
          totalPages: 1,
          currentDate: new Date(),
        } as HeaderFooterContext;

        // Get current margins from ConfigManager
        const pdfConfig = this.configManager.get('pdf', {}) as any;
        const margins = pdfConfig.margin;

        cssPageRules = this.headerFooterGenerator.generateBackwardCompatibleCSS(
          includePageNumbers,
          documentTitle,
          context,
          margins,
        );
      } else {
        this.logger.debug(
          'Page numbers not enabled - skipping CSS @page injection',
        );
        return htmlContent;
      }

      // If no CSS was generated, return original content
      if (!cssPageRules.trim()) {
        this.logger.debug(
          'No CSS rules generated - returning original content',
        );
        return htmlContent;
      }

      this.logger.debug(
        `Generated CSS @page rules: ${cssPageRules.slice(0, 200)}...`,
      );

      // Inject CSS into HTML content
      return this.injectCSSIntoHTML(htmlContent, cssPageRules);
    } catch (error) {
      this.logger.warn(
        `Failed to inject CSS @page rules: ${(error as Error).message}`,
        error,
      );
      // Return original content if injection fails
      return htmlContent;
    }
  }

  /**
   * Helper method to inject CSS rules into HTML content
   */
  private injectCSSIntoHTML(htmlContent: string, cssRules: string): string {
    // Check if HTML already has a <head> section
    if (htmlContent.includes('<head>')) {
      // Insert CSS rules into existing <head>
      const result = htmlContent.replace('</head>', `${cssRules}</head>`);
      this.logger.debug(
        `CSS injected into existing <head> - result length: ${result.length}`,
      );
      return result;
    } else if (htmlContent.includes('<html>')) {
      // Add <head> section with CSS rules after <html> tag
      const result = htmlContent.replace(
        '<html>',
        `<html><head>${cssRules}</head>`,
      );
      this.logger.debug(
        `CSS injected with new <head> section - result length: ${result.length}`,
      );
      return result;
    } else {
      // Wrap content with full HTML structure
      const result = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${cssRules}
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;
      this.logger.debug(
        `CSS injected with full HTML wrapper - result length: ${result.length}`,
      );
      return result;
    }
  }

  getEngineStatus(): Map<string, PDFEngineHealthStatus> {
    if (!this.engineManager) {
      return new Map();
    }
    return this.engineManager.getEngineStatus();
  }

  getAvailableEngines(): string[] {
    if (!this.engineManager) {
      return [];
    }
    return this.engineManager.getAvailableEngines();
  }

  async forceHealthCheck(engineName?: string): Promise<void> {
    if (!this.engineManager) {
      throw new Error('Engine manager not initialized');
    }
    await this.engineManager.forceHealthCheck(engineName);
  }

  async cleanup(): Promise<void> {
    if (!this.engineManager) {
      return;
    }

    try {
      this.logger.info('Cleaning up advanced PDF generator service');
      await this.engineManager.cleanup();
      this.engineManager = null;
      this.isInitialized = false;
      this.logger.info(
        'Advanced PDF generator service cleaned up successfully',
      );
    } catch (error) {
      this.logger.warn(
        `Error during advanced PDF generator cleanup: ${(error as Error).message}`,
      );
      // Don't throw on cleanup errors, just log them
    }
  }

  // Additional utility methods for monitoring and diagnostics
  getHealthyEngines(): string[] {
    if (!this.engineManager) {
      return [];
    }
    return this.engineManager.getHealthyEngines();
  }

  getEngineMetrics(): Map<string, unknown> {
    if (!this.engineManager) {
      return new Map();
    }
    return this.engineManager.getEngineMetrics();
  }

  updateEngineConfig(newConfig: Partial<PDFEngineManagerConfig>): void {
    if (!this.engineManager) {
      throw new Error('Engine manager not initialized');
    }

    this.engineManager.updateConfig(newConfig);
    this.logger.info('Engine configuration updated', newConfig);
  }

  // Two-stage rendering methods

  /**
   * Generate PDF using two-stage rendering
   */
  private async generateWithTwoStageRendering(
    htmlContent: string,
    outputPath: string,
    options: {
      title?: string;
      customCSS?: string;
      headings?: Heading[];
      markdownContent?: string;
      enableChineseSupport?: boolean;
      includePageNumbers?: boolean;
      tocOptions?: {
        enabled: boolean;
        maxDepth: number;
        includePageNumbers: boolean;
        title?: string;
      };
      bookmarkOptions?: BookmarkOptions;
      documentLanguage?: string;
      metadata?: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string;
        creator?: string;
        producer?: string;
        creationDate?: Date | string;
        modDate?: Date | string;
        [key: string]: any;
      };
      twoStageRendering?: {
        enabled?: boolean;
        forceAccuratePageNumbers?: boolean;
        maxPerformanceImpact?: number;
      };
    },
    startTime: number,
  ): Promise<PDFGenerationResult> {
    this.logger.info('Starting two-stage rendering process');

    // Publish conversion started event
    const inputPath = outputPath.replace('.pdf', '.md');
    const startedEvent = new ConversionStartedEvent(
      inputPath,
      outputPath,
      options,
    );
    await this.eventPublisher.publish(startedEvent);

    // Stage 1: Pre-render to get accurate page information
    this.logger.debug('Stage 1: Pre-rendering for accurate page calculations');
    const preRenderStart = Date.now();

    const enhancedContent = await this.performTwoStageAnalysis(
      htmlContent,
      options,
    );

    const preRenderTime = Date.now() - preRenderStart;
    this.logger.debug(`Pre-rendering completed in ${preRenderTime}ms`);

    // Stage 2: Generate final PDF with accurate content
    this.logger.debug('Stage 2: Final PDF generation with accurate layout');
    const finalRenderStart = Date.now();

    // Check if page numbers should be included
    const includePageNumbers =
      options.includePageNumbers ??
      options.tocOptions?.includePageNumbers ??
      false;

    // Inject CSS @page rules for header/footer
    let enhancedHtmlContent = this.injectCSSPageRules(
      enhancedContent.html,
      options,
      includePageNumbers,
    );

    // Remove IDs from headings that exceed TOC/bookmark maxDepth to prevent Puppeteer
    // from generating bookmarks for them (Puppeteer auto-generates bookmarks for all headings with IDs)
    const effectiveMaxDepth =
      options.tocOptions?.maxDepth || options.bookmarkOptions?.maxDepth || 3;
    this.logger.debug(
      `Removing IDs from headings deeper than level ${effectiveMaxDepth}`,
    );
    enhancedHtmlContent = this.removeDeepHeadingIds(
      enhancedHtmlContent,
      effectiveMaxDepth,
    );

    // Generate bookmarks if enabled
    let bookmarkData;
    if (options.bookmarkOptions?.enabled) {
      try {
        const bookmarkGenerator = new BookmarkGenerator();

        // Extract headings from HTML content if not provided
        const headingsToUse =
          options.headings || this.extractHeadingsFromHTML(enhancedHtmlContent);

        // Ensure bookmark maxDepth matches TOC maxDepth for consistency
        const tocMaxDepth = options.tocOptions?.maxDepth || 3;
        const bookmarkMaxDepth =
          options.bookmarkOptions.maxDepth ?? tocMaxDepth;

        // Generate bookmarks from headings
        const result = await bookmarkGenerator.generateFromHeadings(
          headingsToUse,
          {
            ...options.bookmarkOptions,
            maxDepth: bookmarkMaxDepth,
          },
        );

        bookmarkData = {
          enabled: true,
          maxDepth: bookmarkMaxDepth,
          includePageNumbers:
            options.bookmarkOptions.includePageNumbers || false,
          useExistingTOC: options.bookmarkOptions.useExistingTOC || false,
          outline: result.outline.map((item) => ({
            title: item.title,
            dest: item.dest || '',
            children:
              item.children?.map((child) => ({
                title: child.title,
                dest: child.dest || '',
                children: child.children || [],
              })) || [],
          })),
        };

        this.logger.info('Generated bookmarks', {
          totalBookmarks: result.metadata.totalBookmarks,
          maxDepth: result.metadata.maxDepth,
        });
      } catch (error) {
        this.logger.warn('Failed to generate bookmarks', {
          error: (error as Error).message,
        });
        bookmarkData = undefined;
      }
    }

    // Get syntax highlighting theme from config
    const syntaxHighlightingTheme =
      (this.configManager.get('syntaxHighlighting.theme') as string) ||
      'default';

    this.logger.info(`Syntax highlighting theme: ${syntaxHighlightingTheme}`);

    // Build generation context
    const context: PDFGenerationContext = {
      htmlContent: enhancedHtmlContent,
      outputPath,
      title: options.title || '',
      customCSS: options.customCSS || '',
      enableChineseSupport: options.enableChineseSupport || false,
      syntaxHighlightingTheme,
      ...(options.metadata && { metadata: options.metadata }),
      toc: options.tocOptions || {
        enabled: false,
        maxDepth: 3,
        includePageNumbers: true,
      },
    };

    // Add bookmarks if they were successfully generated
    if (bookmarkData) {
      context.bookmarks = bookmarkData;
    }

    // Build engine options
    const engineOptions: PDFEngineOptions =
      await this.convertToEngineOptions(context);

    // Generate PDF using engine manager
    const result = await this.engineManager!.generatePDF(
      context,
      engineOptions,
    );

    const finalRenderTime = Date.now() - finalRenderStart;
    const totalTime = Date.now() - startTime;

    this.logger.info(
      `Two-stage rendering completed: Pre-render ${preRenderTime}ms, Final ${finalRenderTime}ms, Total ${totalTime}ms`,
    );

    if (result.success) {
      this.logger.info(
        `PDF generated successfully with two-stage rendering: ${outputPath} (${totalTime}ms)`,
      );

      // Publish conversion completed event
      const completedEvent = new ConversionCompletedEvent(
        inputPath,
        outputPath,
        totalTime,
        result.metadata?.fileSize || 0,
      );
      await this.eventPublisher.publish(completedEvent);

      return {
        success: true,
        outputPath: result.outputPath || outputPath,
        metadata: result.metadata
          ? {
              pages: result.metadata.pages,
              fileSize: result.metadata.fileSize,
              generationTime: result.metadata.generationTime,
              renderingStrategy: 'two-stage',
              pageNumberAccuracy: 'exact',
              performance: {
                preRenderTime,
                finalRenderTime,
                totalTime,
                performanceIncrease: Math.round(
                  (preRenderTime / totalTime) * 100,
                ),
              },
              enhancedFeatures: enhancedContent.features,
            }
          : {
              pages: 0,
              fileSize: 0,
              generationTime: 0,
              renderingStrategy: 'two-stage',
              pageNumberAccuracy: 'exact',
              performance: {
                preRenderTime,
                finalRenderTime,
                totalTime,
                performanceIncrease: Math.round(
                  (preRenderTime / totalTime) * 100,
                ),
              },
              enhancedFeatures: enhancedContent.features,
            },
      };
    } else {
      this.logger.error(`Two-stage PDF generation failed: ${result.error}`);

      // Publish conversion failed event
      const failedEvent = new ConversionFailedEvent(
        inputPath,
        result.error || 'Two-stage PDF generation failed',
      );
      await this.eventPublisher.publish(failedEvent);

      return {
        success: false,
        error: result.error || 'Two-stage PDF generation failed',
      };
    }
  }

  /**
   * Perform two-stage content analysis and enhancement
   */
  private async performTwoStageAnalysis(
    htmlContent: string,
    options: {
      markdownContent?: string;
      headings?: Heading[];
      documentLanguage?: string;
      tocOptions?: {
        enabled: boolean;
        maxDepth: number;
        includePageNumbers: boolean;
        title?: string;
      };
    },
  ): Promise<{
    html: string;
    pageNumbers: Record<string, number>;
    features: string[];
  }> {
    this.logger.debug(
      'Starting two-stage analysis with actual rendering engine',
    );

    const features: string[] = [];
    let enhancedHtml = htmlContent;
    let pageNumbers: Record<string, number> = {};

    try {
      // Import and use the actual two-stage rendering engine
      const { TwoStageRenderingEngine } = await import(
        '../../core/rendering/two-stage-rendering-engine'
      );

      // Create rendering engine instance
      const renderingEngine = new TwoStageRenderingEngine(
        {
          enabled: true,
          forceAccuratePageNumbers: true,
          maxPerformanceImpact: 100,
          enableCaching: true,
        },
        this.translationManager,
        this.configManager,
      );

      // Get syntax highlighting theme from config
      const syntaxTheme =
        (this.configManager.get('syntaxHighlighting.theme') as string) ||
        'default';

      // Get current margins from ConfigManager for TOC page number calculation
      const pdfConfig = this.configManager.get('pdf', {}) as any;
      const currentMargins = pdfConfig.margin;

      // Prepare processing context
      const context: ProcessingContext = {
        headings: options.headings || [],
        tocOptions: {
          enabled: options.tocOptions?.enabled || false,
          includePageNumbers: options.tocOptions?.includePageNumbers || false,
          maxDepth: options.tocOptions?.maxDepth || 3,
        },
        pdfOptions: {
          includePageNumbers: options.tocOptions?.includePageNumbers || false,
          margins: currentMargins, // Pass margins for TOC page number calculation
        },
        syntaxHighlightingTheme: syntaxTheme,
        isPreRendering: false,
        logger: this.logger,
        ...(options.documentLanguage && {
          documentLanguage: options.documentLanguage,
        }),
      };

      this.logger.debug('Calling two-stage rendering engine with context:', {
        headingsCount: context.headings?.length || 0,
        tocEnabled: context.tocOptions?.enabled,
        includePageNumbers: context.tocOptions?.includePageNumbers,
        margins: currentMargins,
      });

      // Perform actual two-stage rendering
      const renderingResult = await renderingEngine.render(
        htmlContent,
        context,
      );

      enhancedHtml = renderingResult.html;
      pageNumbers = renderingResult.pageNumbers?.headingPages || {};

      // Remove IDs from headings deeper than maxDepth
      const effectiveMaxDepth = options.tocOptions?.maxDepth || 3;
      this.logger.debug(
        `Two-stage: Removing IDs from headings deeper than level ${effectiveMaxDepth}`,
      );
      enhancedHtml = this.removeDeepHeadingIds(enhancedHtml, effectiveMaxDepth);

      // Add TOC feature if generated
      if (
        context.tocOptions?.enabled &&
        renderingResult.html.includes('toc-container')
      ) {
        features.push('Table of Contents with accurate page numbers');
      }

      this.logger.info(
        `Two-stage rendering completed. Total time: ${renderingResult.performance.totalTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        'Two-stage rendering failed, falling back to simple processing:',
        error,
      );

      // Fallback: Detect other dynamic content manually
      if (options.markdownContent) {
        if (
          options.markdownContent.includes('```mermaid') ||
          options.markdownContent.includes('```plantuml')
        ) {
          features.push('Dynamic diagram layout optimization');
        }

        if (/!\[.*?\]\([^)]+\)/.test(options.markdownContent)) {
          features.push('Image path resolution');
        }
      }
    }

    return {
      html: enhancedHtml,
      pageNumbers,
      features,
    };
  }

  /**
   * Convert deep headings to div elements to prevent Puppeteer from generating bookmarks
   * Puppeteer's outline:true generates bookmarks for ALL h1-h6 tags regardless of ID
   */
  private removeDeepHeadingIds(html: string, maxDepth: number): string {
    // Match ALL heading tags (with or without id) and convert deep ones to divs
    return html.replace(
      /<h([1-6])([^>]*?)>(.*?)<\/h\1>/gi,
      (match, level, attributes, content) => {
        const headingLevel = parseInt(level, 10);
        // If heading level exceeds maxDepth, convert to styled div
        if (headingLevel > maxDepth) {
          // Preserve styling but remove id to prevent bookmark generation
          const cleanAttributes = attributes.replace(/\s*id="[^"]*"/gi, '');
          // Add heading class for styling
          const styleClass = cleanAttributes.includes('class=')
            ? cleanAttributes
            : cleanAttributes + ` class="heading-level-${level}"`;
          return `<div${styleClass} style="font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; font-size: ${1.5 - level * 0.1}em;">${content}</div>`;
        }
        // Keep headings within maxDepth as-is
        return match;
      },
    );
  }

  /**
   * Extract headings from HTML content for bookmark generation
   */
  private extractHeadingsFromHTML(htmlContent: string): Heading[] {
    const headings: Heading[] = [];
    const headingRegex =
      /<h([1-6])[^>]*(?:id="([^"]+)")?[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;
    let index = 0;

    while ((match = headingRegex.exec(htmlContent)) !== null) {
      const level = parseInt(match[1], 10);
      const id = match[2] || `heading-${index}`;
      const text = match[3].replace(/<[^>]+>/g, '').trim(); // Strip HTML tags from text

      if (text) {
        headings.push({
          level,
          text,
          id,
          anchor: `#${id}`,
        });
        index++;
      }
    }

    return headings;
  }

  // Old TOC generation methods removed
  // TOC is now handled exclusively by the two-stage rendering engine
}
