/**
 * Service registration utilities for the Infrastructure layer
 */

import { ServiceContainer } from '../shared/container';

import { ConfigManager } from './config';
import { ErrorHandler } from './error';
import { FileSystemManager } from './filesystem';
import { TranslationManager } from './i18n';
import { ConsoleLogger } from './logging';

import type { IConfigManager } from './config';
import type { IErrorHandler } from './error';
import type { IFileSystemManager } from './filesystem';
import type { ITranslationManager, SupportedLocale } from './i18n';
import type { ILogger, LogLevel } from './logging';
import type { IServiceContainer } from '../shared/container';

export class InfrastructureServices {
  /**
   * Register all infrastructure services with the container
   */
  static registerServices(container: IServiceContainer): void {
    // Register configuration manager as singleton
    container.registerSingleton<IConfigManager>('config', () => {
      const config = new ConfigManager();
      // Load configuration on initialization
      config.load().catch(() => {
        // Ignore load errors, use defaults
      });
      return config;
    });

    // Register logger as singleton
    container.registerSingleton<ILogger>('logger', (c) => {
      const config = c.tryResolve<IConfigManager>('config');
      const logLevel = config?.get<string>('logging.level', 'info') || 'info';
      return new ConsoleLogger({ level: logLevel as LogLevel });
    });

    // Register error handler as singleton
    container.registerSingleton<IErrorHandler>('errorHandler', (c) => {
      const logger = c.tryResolve<ILogger>('logger');
      return new ErrorHandler(logger);
    });

    // Register file system manager as singleton
    container.registerSingleton<IFileSystemManager>('fileSystem', () => {
      return new FileSystemManager();
    });

    // Register translation manager as singleton
    container.registerSingleton<ITranslationManager>('translator', (c) => {
      const config = c.tryResolve<IConfigManager>('config');
      const locale = config?.get<string>('language.default', 'en') || 'en';
      return new TranslationManager({
        defaultLocale: locale as SupportedLocale,
        useEnvironmentLocale: false,
        fallbackLocale: 'en',
      });
    });
  }

  /**
   * Create a pre-configured container with all infrastructure services
   */
  static createContainer(): IServiceContainer {
    const container = new ServiceContainer();
    this.registerServices(container);
    return container;
  }
}

/**
 * Service name constants for type-safe service resolution
 */
export const SERVICE_NAMES = {
  CONFIG: 'config',
  LOGGER: 'logger',
  ERROR_HANDLER: 'errorHandler',
  FILE_SYSTEM: 'fileSystem',
  TRANSLATOR: 'translator',
} as const;

/**
 * Enhanced service factories with better type safety and error handling
 */
export class EnhancedServices {
  /**
   * Create enhanced configuration manager with better error handling
   */
  static createConfigManager(
    options?: Record<string, unknown>,
  ): IConfigManager {
    try {
      const manager = new ConfigManager(options);
      // Add environment-specific defaults
      if (process.env.NODE_ENV === 'development') {
        manager.set('logging.level', 'debug');
        manager.set('development.mode', true);
      }

      return manager;
    } catch (error) {
      // Fallback to basic config manager
      // eslint-disable-next-line no-console
      console.warn(
        'Enhanced ConfigManager failed, using basic version:',
        error,
      );
      return new ConfigManager(options);
    }
  }

  /**
   * Create enhanced logger with context support
   */
  static createLogger(level: string = 'info', context?: string): ILogger {
    try {
      const logger = new ConsoleLogger({ level: level as LogLevel });
      // Add context support if provided
      if (context) {
        const originalMethods = {
          error: logger.error.bind(logger),
          warn: logger.warn.bind(logger),
          info: logger.info.bind(logger),
          debug: logger.debug.bind(logger),
        };

        logger.error = (message: string, ...args: unknown[]): void =>
          originalMethods.error(`[${context}] ${message}`, ...args);
        logger.warn = (message: string, ...args: unknown[]): void =>
          originalMethods.warn(`[${context}] ${message}`, ...args);
        logger.info = (message: string, ...args: unknown[]): void =>
          originalMethods.info(`[${context}] ${message}`, ...args);
        logger.debug = (message: string, ...args: unknown[]): void =>
          originalMethods.debug(`[${context}] ${message}`, ...args);
      }

      return logger;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Enhanced Logger failed, using basic version:', error);
      return new ConsoleLogger({ level: level as LogLevel });
    }
  }

  /**
   * Create enhanced error handler with better categorization
   */
  static createErrorHandler(logger?: ILogger): IErrorHandler {
    try {
      return new ErrorHandler(logger);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Enhanced ErrorHandler failed, using basic version:', error);
      return new ErrorHandler(logger);
    }
  }

  /**
   * Create enhanced file system manager with caching support
   */
  static createFileSystemManager(): IFileSystemManager {
    try {
      return new FileSystemManager();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        'Enhanced FileSystemManager failed, using basic version:',
        error,
      );
      return new FileSystemManager();
    }
  }

  /**
   * Create enhanced translation manager with environment detection
   */
  static createTranslationManager(locale?: string): ITranslationManager {
    try {
      return new TranslationManager({
        defaultLocale: (locale as SupportedLocale) || 'en',
        useEnvironmentLocale: false,
        fallbackLocale: 'en',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        'Enhanced TranslationManager failed, using basic version:',
        error,
      );
      return new TranslationManager({ defaultLocale: 'en' });
    }
  }
}
