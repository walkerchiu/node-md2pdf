/**
 * Application services container
 * Provides registration and factory methods for all application layer services
 */

import { FileCollector } from '../core/batch/file-collector';
import { InfrastructureServices } from '../infrastructure/services';
import { ServiceContainer, IServiceContainer } from '../shared/container';

import {
  PDFGeneratorService,
  EnhancedPDFGeneratorService,
  MarkdownParserService,
  TOCGeneratorService,
  FileProcessorService,
  BatchProcessorService,
  SmartDefaultsService,
  type IPDFGeneratorService,
  type IEnhancedPDFGeneratorService,
  type IMarkdownParserService,
  type ITOCGeneratorService,
  type IFileProcessorService,
  type IBatchProcessorService,
  type ISmartDefaultsService,
} from './services';

import type { IConfigManager } from '../infrastructure/config/types';
import type { ILogger } from '../infrastructure/logging/types';

export const APPLICATION_SERVICE_NAMES = {
  PDF_GENERATOR: 'pdfGenerator',
  ENHANCED_PDF_GENERATOR: 'enhancedPdfGenerator',
  MARKDOWN_PARSER: 'markdownParser',
  TOC_GENERATOR: 'tocGenerator',
  FILE_PROCESSOR: 'fileProcessor',
  BATCH_PROCESSOR: 'batchProcessor',
  SMART_DEFAULTS: 'smartDefaults',
} as const;

export class ApplicationServices {
  /**
   * Create complete application container with infrastructure and application services
   */
  static createContainer(): ServiceContainer {
    // Start with infrastructure container
    const container = InfrastructureServices.createContainer();

    // Register application services
    ApplicationServices.registerServices(container as ServiceContainer);

    return container as ServiceContainer;
  }

  /**
   * Register all application services in the container
   */
  static registerServices(container: IServiceContainer): void {
    // Register PDF Generator Service
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.PDF_GENERATOR,
      (c) =>
        new PDFGeneratorService(
          c.resolve('logger'),
          c.resolve('errorHandler'),
          c.resolve('config'),
        ),
    );

    // Register Enhanced PDF Generator Service (new engine-based)
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.ENHANCED_PDF_GENERATOR,
      (c) =>
        new EnhancedPDFGeneratorService(
          c.resolve('logger'),
          c.resolve('errorHandler'),
          c.resolve('config'),
        ),
    );

    // Register Markdown Parser Service
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER,
      (c) =>
        new MarkdownParserService(
          c.resolve('logger'),
          c.resolve('errorHandler'),
          c.resolve('config'),
          c.resolve('fileSystem'),
        ),
    );

    // Register TOC Generator Service
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.TOC_GENERATOR,
      (c) =>
        new TOCGeneratorService(
          c.resolve('logger'),
          c.resolve('errorHandler'),
          c.resolve('config'),
          c.resolve('translator'),
        ),
    );

    // Register File Processor Service (depends on other application services)
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.FILE_PROCESSOR,
      (c) =>
        new FileProcessorService(
          c.resolve('logger'),
          c.resolve('errorHandler'),
          c.resolve('config'),
          c.resolve('fileSystem'),
          c.resolve(APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER),
          c.resolve(APPLICATION_SERVICE_NAMES.TOC_GENERATOR),
          c.resolve(APPLICATION_SERVICE_NAMES.PDF_GENERATOR),
        ),
    );

    // Register Batch Processor Service (depends on file processor)
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR,
      (c) =>
        new BatchProcessorService(
          c.resolve('logger'),
          c.resolve('errorHandler'),
          c.resolve('config'),
          c.resolve('fileSystem'),
          c.resolve(APPLICATION_SERVICE_NAMES.FILE_PROCESSOR),
          new FileCollector(),
        ),
    );

    // Register Smart Defaults Service
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.SMART_DEFAULTS,
      (c) => new SmartDefaultsService(c.resolve('logger')),
    );
  }

  /**
   * Enhanced service factory methods for easier access
   */
  static createPDFGeneratorService(
    logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info',
  ): IPDFGeneratorService {
    const container = ApplicationServices.createContainer();

    // Configure logging level
    const logger = container.resolve<ILogger>('logger');
    logger.setLevel(logLevel);

    return container.resolve(APPLICATION_SERVICE_NAMES.PDF_GENERATOR);
  }

  static createEnhancedPDFGeneratorService(
    logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info',
  ): IEnhancedPDFGeneratorService {
    const container = ApplicationServices.createContainer();

    // Configure logging level
    const logger = container.resolve<ILogger>('logger');
    logger.setLevel(logLevel);

    return container.resolve(APPLICATION_SERVICE_NAMES.ENHANCED_PDF_GENERATOR);
  }

  static createMarkdownParserService(
    logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info',
  ): IMarkdownParserService {
    const container = ApplicationServices.createContainer();

    // Configure logging level
    const logger = container.resolve<ILogger>('logger');
    logger.setLevel(logLevel);

    return container.resolve(APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER);
  }

  static createTOCGeneratorService(
    logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info',
  ): ITOCGeneratorService {
    const container = ApplicationServices.createContainer();

    // Configure logging level
    const logger = container.resolve<ILogger>('logger');
    logger.setLevel(logLevel);

    return container.resolve(APPLICATION_SERVICE_NAMES.TOC_GENERATOR);
  }

  static createFileProcessorService(
    logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info',
  ): IFileProcessorService {
    const container = ApplicationServices.createContainer();

    // Configure logging level
    const logger = container.resolve<ILogger>('logger');
    logger.setLevel(logLevel);

    return container.resolve(APPLICATION_SERVICE_NAMES.FILE_PROCESSOR);
  }

  static createBatchProcessorService(
    logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info',
  ): IBatchProcessorService {
    const container = ApplicationServices.createContainer();

    // Configure logging level
    const logger = container.resolve<ILogger>('logger');
    logger.setLevel(logLevel);

    return container.resolve(APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR);
  }

  static createSmartDefaultsService(
    logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info',
  ): ISmartDefaultsService {
    const container = ApplicationServices.createContainer();

    // Configure logging level
    const logger = container.resolve<ILogger>('logger');
    logger.setLevel(logLevel);

    return container.resolve(APPLICATION_SERVICE_NAMES.SMART_DEFAULTS);
  }

  /**
   * Create a fully configured application container with custom configuration
   */
  static createConfiguredContainer(
    config?: Record<string, unknown>,
  ): ServiceContainer {
    const container = ApplicationServices.createContainer();

    if (config) {
      const configManager = container.resolve<IConfigManager>('config');
      Object.entries(config).forEach(([key, value]) => {
        configManager.set(key, value);
      });
    }

    return container;
  }
}
