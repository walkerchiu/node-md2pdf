/**
 * Advanced PDF Generator Service
 * Uses the PDF Engine abstraction layer with failover and health monitoring
 * Provides enterprise-grade PDF generation with multi-engine support
 */

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
import { Heading } from '../../types';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface IAdvancedPDFGeneratorService {
  generatePDF(
    htmlContent: string,
    outputPath: string,
    options?: {
      title?: string;
      customCSS?: string;
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
  ): Promise<PDFGenerationResult>;

  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  getEngineStatus(): Map<string, PDFEngineHealthStatus>;
  getAvailableEngines(): string[];
  forceHealthCheck(engineName?: string): Promise<void>;
}

export class AdvancedPDFGeneratorService
  implements IAdvancedPDFGeneratorService
{
  private engineManager: PDFEngineManager | null = null;
  private isInitialized = false;

  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly configManager: IConfigManager,
  ) {}

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
        'AdvancedPDFGeneratorService.initialize',
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

      // Build generation context
      const context: PDFGenerationContext = {
        htmlContent,
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
      const engineOptions: PDFEngineOptions = this.convertToEngineOptions();

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

      await this.errorHandler.handleError(
        wrappedError,
        'AdvancedPDFGeneratorService.generatePDF',
      );

      return {
        success: false,
        error: wrappedError.message,
      };
    }
  }

  private convertToEngineOptions(): PDFEngineOptions {
    // Get PDF configuration from config manager
    const pdfConfig = this.configManager.get('pdf', {}) as PDFGeneratorOptions;

    return {
      format: pdfConfig.format || 'A4',
      orientation: pdfConfig.orientation || 'portrait',
      margin: pdfConfig.margin || {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
      displayHeaderFooter: pdfConfig.displayHeaderFooter || false,
      headerTemplate: pdfConfig.headerTemplate || '',
      footerTemplate: pdfConfig.footerTemplate || '',
      printBackground: pdfConfig.printBackground ?? true,
      scale: pdfConfig.scale || 1,
      preferCSSPageSize: pdfConfig.preferCSSPageSize || false,
    };
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
