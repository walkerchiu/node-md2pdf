/**
 * PDF Service Factory
 * Provides a factory method to create PDF generators based on configuration
 */

import {
  AdvancedPDFGeneratorService,
  type IAdvancedPDFGeneratorService,
} from './advanced-pdf-generator.service';
import {
  BasicPDFGeneratorService,
  type IBasicPDFGeneratorService,
} from './basic-pdf-generator.service';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface IPDFServiceFactory {
  createPDFGenerator(): Promise<
    IBasicPDFGeneratorService | IAdvancedPDFGeneratorService
  >;
  getEngineType(): 'basic' | 'advanced';
}

export class PDFServiceFactory implements IPDFServiceFactory {
  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly configManager: IConfigManager,
  ) {}

  async createPDFGenerator(): Promise<
    IBasicPDFGeneratorService | IAdvancedPDFGeneratorService
  > {
    const useAdvancedEngine = this.configManager.get(
      'pdf.useEnhancedEngine',
      false,
    );

    if (useAdvancedEngine) {
      this.logger.info(
        'Creating Advanced PDF Generator Service with engine abstraction layer',
      );
      const advancedService = new AdvancedPDFGeneratorService(
        this.logger,
        this.errorHandler,
        this.configManager,
      );

      try {
        await advancedService.initialize();
        return advancedService;
      } catch (error) {
        this.logger.warn(
          'Failed to initialize Advanced PDF Generator Service, falling back to basic',
          { error },
        );
        return this.createBasicService();
      }
    }

    return this.createBasicService();
  }

  getEngineType(): 'basic' | 'advanced' {
    return this.configManager.get('pdf.useEnhancedEngine', false)
      ? 'advanced'
      : 'basic';
  }

  private createBasicService(): BasicPDFGeneratorService {
    this.logger.info('Creating Basic PDF Generator Service');
    return new BasicPDFGeneratorService(
      this.logger,
      this.errorHandler,
      this.configManager,
    );
  }
}
