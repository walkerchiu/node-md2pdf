/**
 * PDF Service Factory
 * Provides a factory method to create PDF generators based on configuration
 */

import {
  EnhancedPDFGeneratorService,
  type IEnhancedPDFGeneratorService,
} from './enhanced-pdf-generator.service';
import {
  PDFGeneratorService,
  type IPDFGeneratorService,
} from './pdf-generator.service';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface IPDFServiceFactory {
  createPDFGenerator(): Promise<
    IPDFGeneratorService | IEnhancedPDFGeneratorService
  >;
  getEngineType(): 'legacy' | 'enhanced';
}

export class PDFServiceFactory implements IPDFServiceFactory {
  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly configManager: IConfigManager,
  ) {}

  async createPDFGenerator(): Promise<
    IPDFGeneratorService | IEnhancedPDFGeneratorService
  > {
    const useEnhancedEngine = this.configManager.get(
      'pdf.useEnhancedEngine',
      false,
    );

    if (useEnhancedEngine) {
      this.logger.info(
        'Creating Enhanced PDF Generator Service with engine abstraction layer',
      );
      const enhancedService = new EnhancedPDFGeneratorService(
        this.logger,
        this.errorHandler,
        this.configManager,
      );

      try {
        await enhancedService.initialize();
        return enhancedService;
      } catch (error) {
        this.logger.warn(
          'Failed to initialize Enhanced PDF Generator Service, falling back to legacy',
          { error },
        );
        return this.createLegacyService();
      }
    }

    return this.createLegacyService();
  }

  getEngineType(): 'legacy' | 'enhanced' {
    return this.configManager.get('pdf.useEnhancedEngine', false)
      ? 'enhanced'
      : 'legacy';
  }

  private createLegacyService(): PDFGeneratorService {
    this.logger.info('Creating Legacy PDF Generator Service');
    return new PDFGeneratorService(
      this.logger,
      this.errorHandler,
      this.configManager,
    );
  }
}
