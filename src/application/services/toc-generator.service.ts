/**
 * Application service for TOC generation
 * Integrates core TOC functionality with infrastructure services
 */

import { TOCGenerator } from '../../core/toc/toc-generator';
import { TOCGeneratorOptions, TOCGenerationResult } from '../../core/toc/types';
import { MD2PDFError } from '../../infrastructure/error/errors';
import { Heading } from '../../types/index';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface ITOCGeneratorService {
  generateTOC(
    headings: Heading[],
    documentLanguage?: string,
    options?: Partial<TOCGeneratorOptions>,
  ): Promise<TOCGenerationResult>;
  validateHeadings(headings: Heading[]): Promise<boolean>;
}

export class TOCGeneratorService implements ITOCGeneratorService {
  private tocGenerator: TOCGenerator | null = null;
  private isInitialized = false;

  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly configManager: IConfigManager,
    private readonly translationManager: ITranslationManager,
  ) {}

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing TOC generator service');

      const tocConfig = this.configManager.get('toc', {
        maxDepth: 3,
        includePageNumbers: false,
        cssClasses: {
          container: 'toc-container',
          title: 'toc-title',
          list: 'toc-list',
          item: 'toc-item',
          link: 'toc-link',
          pageNumber: 'toc-page-number',
        },
      }) as TOCGeneratorOptions;

      this.tocGenerator = new TOCGenerator(tocConfig, this.translationManager);

      this.isInitialized = true;
      this.logger.info('TOC generator service initialized successfully');
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to initialize TOC generator service: ${(error as Error).message}`,
        'TOC_INIT_ERROR',
        'markdown_parsing',
        false,
        { originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'TOCGeneratorService.initialize',
      );
      throw wrappedError;
    }
  }

  async generateTOC(
    headings: Heading[],
    documentLanguage?: string,
    options?: Partial<TOCGeneratorOptions>,
  ): Promise<TOCGenerationResult> {
    if (!this.isInitialized || !this.tocGenerator) {
      await this.initialize();
    }

    try {
      this.logger.debug(`Generating TOC from ${headings.length} headings`);

      let generator = this.tocGenerator!;

      if (options) {
        const mergedOptions = {
          ...this.configManager.get('toc', {}),
          ...options,
        } as TOCGeneratorOptions;

        generator = new TOCGenerator(mergedOptions, this.translationManager);
      }

      const startTime = Date.now();
      const result = generator.generateTOC(headings, documentLanguage);
      const duration = Date.now() - startTime;

      this.logger.info(
        `TOC generated successfully (${duration}ms), created ${result.items.length} items`,
      );

      return result;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `TOC generation failed: ${(error as Error).message}`,
        'TOC_GENERATION_ERROR',
        'markdown_parsing',
        true,
        {
          headingsCount: headings.length,
          options,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'TOCGeneratorService.generateTOC',
      );
      throw wrappedError;
    }
  }

  async validateHeadings(headings: Heading[]): Promise<boolean> {
    try {
      this.logger.debug(`Validating ${headings.length} headings`);

      if (!headings || headings.length === 0) {
        this.logger.warn('No headings provided for validation');
        return false;
      }

      const invalidHeadings = headings.filter(
        (heading) =>
          !heading.id ||
          !heading.text ||
          heading.level < 1 ||
          heading.level > 6,
      );

      if (invalidHeadings.length > 0) {
        this.logger.warn(`Found ${invalidHeadings.length} invalid headings`);
        return false;
      }

      this.logger.info(`All ${headings.length} headings are valid`);

      return true;
    } catch (error) {
      this.logger.warn(`Heading validation error: ${(error as Error).message}`);
      return false;
    }
  }
}
