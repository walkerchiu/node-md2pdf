/**
 * Application services container
 * Provides registration and factory methods for all application layer services
 */

import { FileCollector } from '../core/batch/file-collector';
import { EnvironmentAwareServices } from '../infrastructure/logging/environment-aware.services';
import { ServiceContainer, IServiceContainer } from '../shared/container';

import {
  BatchProcessorService,
  FileProcessorService,
  MarkdownParserService,
  PageStructureService,
  PDFGeneratorService,
  SmartDefaultsService,
  TOCGeneratorService,
  type IBatchProcessorService,
  type IFileProcessorService,
  type IMarkdownParserService,
  type IPageStructureService,
  type IPDFGeneratorService,
  type ISmartDefaultsService,
  type ITOCGeneratorService,
} from './services';

import type { IConfigManager } from '../infrastructure/config/types';
import type { ILogger } from '../infrastructure/logging/types';

export const APPLICATION_SERVICE_NAMES = {
  PDF_GENERATOR: 'pdfGenerator',
  MARKDOWN_PARSER: 'markdownParser',
  TOC_GENERATOR: 'tocGenerator',
  FILE_PROCESSOR: 'fileProcessor',
  BATCH_PROCESSOR: 'batchProcessor',
  SMART_DEFAULTS: 'smartDefaults',
  PAGE_STRUCTURE: 'pageStructure',
} as const;

export class ApplicationServices {
  /**
   * Create complete application container with infrastructure and application services
   */
  static createContainer(): ServiceContainer {
    // Start with infrastructure container
    const container = EnvironmentAwareServices.createContainer();

    // Register application services
    ApplicationServices.registerServices(container as ServiceContainer);

    return container as ServiceContainer;
  }

  /**
   * Register all application services in the container
   */
  static registerServices(container: IServiceContainer): void {
    // Register Page Structure Service
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.PAGE_STRUCTURE,
      (c) =>
        new PageStructureService(
          c.resolve('logger'),
          c.resolve('errorHandler'),
          c.resolve('config'),
        ),
    );

    // Register PDF Generator Service
    container.registerSingleton(
      APPLICATION_SERVICE_NAMES.PDF_GENERATOR,
      (c) =>
        new PDFGeneratorService(
          c.resolve('logger'),
          c.resolve('errorHandler'),
          c.resolve('config'),
          c.resolve('translator'),
          c.resolve(APPLICATION_SERVICE_NAMES.PAGE_STRUCTURE),
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
          c.resolve(APPLICATION_SERVICE_NAMES.PDF_GENERATOR),
          c.resolve('translator'),
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

  static createPageStructureService(
    logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info',
  ): IPageStructureService {
    const container = ApplicationServices.createContainer();

    // Configure logging level
    const logger = container.resolve<ILogger>('logger');
    logger.setLevel(logLevel);

    return container.resolve(APPLICATION_SERVICE_NAMES.PAGE_STRUCTURE);
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
