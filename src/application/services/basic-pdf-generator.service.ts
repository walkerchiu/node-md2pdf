/**
 * Basic PDF Generator Service
 * Provides simple PDF generation using single engine approach
 * Integrates core PDF functionality with infrastructure services
 */

import { PDFGenerator } from '../../core/pdf/pdf-generator';
import { PDFGeneratorOptions, PDFGenerationResult } from '../../core/pdf/types';
import { MD2PDFError } from '../../infrastructure/error/errors';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface IBasicPDFGeneratorService {
  generatePDF(
    htmlContent: string,
    outputPath: string,
    options?: Partial<PDFGeneratorOptions>,
  ): Promise<PDFGenerationResult>;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export class BasicPDFGeneratorService implements IBasicPDFGeneratorService {
  private pdfGenerator: PDFGenerator | null = null;
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
      this.logger.info('Initializing basic PDF generator service');

      const pdfConfig = this.configManager.get('pdf', {
        format: 'A4',
        orientation: 'portrait',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
        },
        displayHeaderFooter: false,
        printBackground: true,
        scale: 1,
        preferCSSPageSize: false,
      }) as PDFGeneratorOptions;

      this.pdfGenerator = new PDFGenerator(pdfConfig);
      await this.pdfGenerator.initialize();

      this.isInitialized = true;
      this.logger.info('Basic PDF generator service initialized successfully');
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to initialize basic PDF generator service: ${(error as Error).message}`,
        'PDF_INIT_ERROR',
        'pdf_generation',
        false,
        { originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'BasicPDFGeneratorService.initialize',
      );
      throw wrappedError;
    }
  }

  async generatePDF(
    htmlContent: string,
    outputPath: string,
    options?: Partial<PDFGeneratorOptions>,
  ): Promise<PDFGenerationResult> {
    if (!this.isInitialized || !this.pdfGenerator) {
      await this.initialize();
    }

    try {
      this.logger.debug(`Generating PDF: ${outputPath}`);

      const startTime = Date.now();
      // Use basic options for now - full option mapping can be implemented later
      const result = await this.pdfGenerator!.generatePDF(
        htmlContent,
        outputPath,
        {},
      );
      const duration = Date.now() - startTime;

      this.logger.info(
        `PDF generated successfully: ${outputPath} (${duration}ms)`,
      );

      return result;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `PDF generation failed: ${(error as Error).message}`,
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
        'BasicPDFGeneratorService.generatePDF',
      );
      throw wrappedError;
    }
  }

  async cleanup(): Promise<void> {
    if (!this.pdfGenerator) {
      return;
    }

    try {
      this.logger.info('Cleaning up basic PDF generator service');
      await this.pdfGenerator.close();
      this.pdfGenerator = null;
      this.isInitialized = false;
      this.logger.info('Basic PDF generator service cleaned up successfully');
    } catch (error) {
      this.logger.warn(
        `Error during basic PDF generator cleanup: ${(error as Error).message}`,
      );
      // Don't throw on cleanup errors, just log them
    }
  }
}
