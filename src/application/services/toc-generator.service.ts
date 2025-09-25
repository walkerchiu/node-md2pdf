/**
 * Application service for TOC generation
 * Integrates core TOC functionality with infrastructure services
 */

import { TOCGenerator } from '../../core/toc/toc-generator';
import { PageEstimator } from '../../core/toc/page-estimator';
import { TOCGeneratorOptions, TOCGenerationResult } from '../../core/toc/types';
import { Heading } from '../../types/index';
import { MD2PDFError } from '../../infrastructure/error/errors';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface ITOCGeneratorService {
  generateTOC(
    headings: Heading[],
    options?: Partial<TOCGeneratorOptions>,
  ): Promise<TOCGenerationResult>;
  generateTOCWithPageNumbers(
    headings: Heading[],
    htmlContent: string,
    options?: Partial<TOCGeneratorOptions>,
  ): Promise<TOCGenerationResult>;
  estimatePageNumbers(
    headings: Heading[],
    htmlContent: string,
  ): Promise<Record<string, number>>;
  validateHeadings(headings: Heading[]): Promise<boolean>;
}

export class TOCGeneratorService implements ITOCGeneratorService {
  private tocGenerator: TOCGenerator | null = null;
  private pageEstimator: PageEstimator | null = null;
  private isInitialized = false;

  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly configManager: IConfigManager,
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

      this.tocGenerator = new TOCGenerator(tocConfig);
      this.pageEstimator = new PageEstimator();

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

        generator = new TOCGenerator(mergedOptions);
      }

      const startTime = Date.now();
      const result = generator.generateTOC(headings);
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

  async generateTOCWithPageNumbers(
    headings: Heading[],
    htmlContent: string,
    options?: Partial<TOCGeneratorOptions>,
  ): Promise<TOCGenerationResult> {
    if (!this.isInitialized || !this.tocGenerator || !this.pageEstimator) {
      await this.initialize();
    }

    try {
      this.logger.debug(
        `Generating TOC with page numbers for ${headings.length} headings`,
      );

      const pageNumbers = await this.estimatePageNumbers(headings, htmlContent);

      const tocOptions = {
        ...this.configManager.get('toc', {}),
        ...options,
        includePageNumbers: true,
      } as TOCGeneratorOptions;

      const generator = new TOCGenerator(tocOptions);
      const startTime = Date.now();
      const result = generator.generateTOCWithPageNumbers(
        headings,
        pageNumbers,
      );
      const duration = Date.now() - startTime;

      this.logger.info(
        `TOC with page numbers generated successfully (${duration}ms)`,
      );

      return result;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `TOC with page numbers generation failed: ${(error as Error).message}`,
        'TOC_PAGE_NUMBERS_ERROR',
        'markdown_parsing',
        true,
        {
          headingsCount: headings.length,
          htmlContentLength: htmlContent.length,
          options,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'TOCGeneratorService.generateTOCWithPageNumbers',
      );
      throw wrappedError;
    }
  }

  async estimatePageNumbers(
    headings: Heading[],
    htmlContent: string,
  ): Promise<Record<string, number>> {
    if (!this.isInitialized || !this.pageEstimator) {
      await this.initialize();
    }

    try {
      this.logger.debug('Estimating page numbers for headings');

      const startTime = Date.now();
      const pageNumbers = await this.pageEstimator!.estimatePageNumbers(
        headings,
        htmlContent,
      );
      const duration = Date.now() - startTime;

      this.logger.info(
        `Page numbers estimated successfully (${duration}ms) for ${Object.keys(pageNumbers).length} headings`,
      );

      return pageNumbers;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Page number estimation failed: ${(error as Error).message}`,
        'PAGE_ESTIMATION_ERROR',
        'markdown_parsing',
        true,
        {
          headingsCount: headings.length,
          htmlContentLength: htmlContent.length,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'TOCGeneratorService.estimatePageNumbers',
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
