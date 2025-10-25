/**
 * PDF Generator Service
 * Uses the PDF Engine abstraction layer with failover and health monitoring
 * Provides enterprise-grade PDF generation with multi-engine support
 */

import {
  ConversionStartedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  InMemoryEventPublisher,
} from '../../core/domain/events';
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
import { MD2PDFError } from '../../infrastructure/error/errors';
import { DEFAULT_MARGINS } from '../../infrastructure/config/constants';
import { Heading } from '../../types';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { IPageStructureService } from './page-structure.service';

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
      tocOptions?: {
        enabled: boolean;
        maxDepth: number;
        includePageNumbers: boolean;
        title?: string;
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

  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly configManager: IConfigManager,
    private readonly translationManager: ITranslationManager,
    // pageStructureService is no longer used since we switched to CSS @page approach
    _pageStructureService?: IPageStructureService,
  ) {
    this.eventPublisher = new InMemoryEventPublisher();
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
      tocOptions?: {
        enabled: boolean;
        maxDepth: number;
        includePageNumbers: boolean;
        title?: string;
      };
    } = {},
  ): Promise<PDFGenerationResult> {
    if (!this.isInitialized || !this.engineManager) {
      await this.initialize();
    }

    try {
      this.logger.debug(`Generating PDF with advanced service: ${outputPath}`);
      const startTime = Date.now();

      // Publish conversion started event
      // For Domain Events, we'll use string paths directly since FilePath has validation constraints
      const inputPath = outputPath.replace('.pdf', '.md');
      const outputPath_ = outputPath;
      const startedEvent = new ConversionStartedEvent(
        inputPath,
        outputPath_,
        options,
      );
      await this.eventPublisher.publish(startedEvent);

      // Check if page numbers should be included - priority: root level > tocOptions > default false
      const includePageNumbers =
        options.includePageNumbers ??
        options.tocOptions?.includePageNumbers ??
        false;

      // Inject CSS @page rules for header/footer directly into HTML content
      const enhancedHtmlContent = this.injectCSSPageRules(
        htmlContent,
        options,
        includePageNumbers,
      );

      // Build generation context
      const context: PDFGenerationContext = {
        htmlContent: enhancedHtmlContent,
        outputPath,
        title: options.title || '',
        customCSS: options.customCSS || '',
        enableChineseSupport: options.enableChineseSupport || false,
        toc: options.tocOptions || {
          enabled: false,
          maxDepth: 3,
          includePageNumbers: true,
        },
      };

      // Build engine options from legacy format
      const engineOptions: PDFEngineOptions =
        await this.convertToEngineOptions(context);

      // Generate PDF using engine manager
      const result = await this.engineManager!.generatePDF(
        context,
        engineOptions,
      );

      const duration = Date.now() - startTime;

      if (result.success) {
        this.logger.info(
          `PDF generated successfully with ${result.metadata?.engineUsed || 'unknown'} engine: ${outputPath} (${duration}ms)`,
        );

        // Publish conversion completed event
        const completedEvent = new ConversionCompletedEvent(
          inputPath,
          outputPath_,
          duration,
          result.metadata?.fileSize || 0,
        );
        await this.eventPublisher.publish(completedEvent);

        // Convert to legacy format
        return {
          success: true,
          outputPath: result.outputPath || outputPath,
          metadata: result.metadata
            ? {
                pages: result.metadata.pages,
                fileSize: result.metadata.fileSize,
                generationTime: result.metadata.generationTime,
              }
            : {
                pages: 0,
                fileSize: 0,
                generationTime: 0,
              },
        };
      } else {
        this.logger.error(`PDF generation failed: ${result.error}`);

        // Publish conversion failed event
        const failedEvent = new ConversionFailedEvent(
          inputPath,
          result.error || 'PDF generation failed',
        );
        await this.eventPublisher.publish(failedEvent);

        return {
          success: false,
          error: result.error || 'PDF generation failed',
        };
      }
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
      this.logger.debug('Injecting CSS @page rules for header/footer');

      // Only generate CSS if page numbers are requested
      if (!includePageNumbers) {
        // No header/footer needed - just return the original content
        return htmlContent;
      }

      // Get the document title - prioritize first H1 heading
      const firstH1 = options.headings?.find((h) => h.level === 1);
      const documentTitle =
        firstH1?.text || options.title || 'Markdown Document';

      // Escape quotes in document title for CSS content property
      const escapedTitle = documentTitle.replace(/"/g, '\\"');

      // Get appropriate margins for pages with header/footer
      const marginsWithHeaderFooter = DEFAULT_MARGINS.WITH_HEADER_FOOTER;

      // Generate CSS for header and footer using @page rules
      const cssPageRules = `
        <style>
          @media print {
            @page {
              margin-top: ${marginsWithHeaderFooter.top};
              margin-bottom: ${marginsWithHeaderFooter.bottom};
              margin-left: ${marginsWithHeaderFooter.left};
              margin-right: ${marginsWithHeaderFooter.right};

              @top-left {
                content: "${escapedTitle}";
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 12px;
                color: #333;
                text-align: left;
                padding: 0;
                border: none;
                background: none;
              }

              @bottom-right {
                content: "${this.getPageNumberFormat()}";
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 12px;
                color: #333;
                text-align: right;
                padding: 0;
                border: none;
                background: none;
              }
            }

            /* Ensure body content doesn't interfere with header/footer */
            body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      `;

      // Check if HTML already has a <head> section
      if (htmlContent.includes('<head>')) {
        // Insert CSS rules into existing <head>
        return htmlContent.replace('</head>', `${cssPageRules}</head>`);
      } else if (htmlContent.includes('<html>')) {
        // Add <head> section with CSS rules after <html> tag
        return htmlContent.replace(
          '<html>',
          `<html><head>${cssPageRules}</head>`,
        );
      } else {
        // Wrap content with full HTML structure
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              ${cssPageRules}
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>
        `;
      }
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
   * Get internationalized page number format for CSS @page rules
   */
  private getPageNumberFormat(): string {
    try {
      // Get localized page number format
      const pageTemplate = this.translationManager.t('pdfContent.pageNumber');

      // Replace placeholders with CSS counter values
      // CSS counter(page) and counter(pages) will be replaced at render time
      return pageTemplate
        .replace(/\{\{page\}\}/g, '" counter(page) "')
        .replace(/\{\{totalPages\}\}/g, '" counter(pages) "');
    } catch (error) {
      // Fallback to default format if translation fails
      this.logger.warn(
        `Failed to get internationalized page number format: ${(error as Error).message}`,
      );
      return '"Page " counter(page) " of " counter(pages)';
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
}
