/**
 * Service registration utilities for the Infrastructure layer
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';

import { ServiceContainer } from '../shared/container';

import { ConfigManager } from './config';
import { createConfigNotificationService } from './config/notification.service';
import { ErrorHandler } from './error';
import { FileSystemManager } from './filesystem';
import { TranslationManager } from './i18n';
import { Logger } from './logging';
import {
  LogManagementService,
  LogManagementServiceFactory,
} from './logging/log-management.service';

import type { IConfigManager } from './config';
import type { IErrorHandler } from './error';
import type { IFileSystemManager } from './filesystem';
import type { ITranslationManager, SupportedLocale } from './i18n';
import type {
  ILogger,
  IEnhancedLogger,
  LogLevel,
  FileLoggingConfig,
} from './logging';
import type { IServiceContainer } from '../shared/container';
import type { LogManagementConfig } from './logging/log-management.service';

/**
 * Log management service interface
 */
export interface ILogManagementService {
  getStats(): Promise<any>;
  getDiskUsage(): Promise<any>;
  searchLogs(criteria: any): Promise<any>;
  analyzeLogs(timeRange?: { from: Date; to: Date }): Promise<any>;
  rotateLogs(): Promise<void>;
  archiveLogs(): Promise<string[]>;
  cleanupOldLogs(): Promise<number>;
  runMaintenance(): Promise<any>;
  checkHealth(): Promise<void>;
  getStatus(): any;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export class InfrastructureServices {
  /**
   * Register all infrastructure services with the container
   */
  static registerServices(container: IServiceContainer): void {
    // Register configuration manager as singleton
    container.registerSingleton<IConfigManager>('config', (c) => {
      // ConfigManager now loads user config synchronously in constructor
      const configManager = new ConfigManager();

      // Setup config creation notification handler using proper service
      configManager.onConfigCreated((configPath: string) => {
        try {
          const logger = c.tryResolve<ILogger>('logger');
          const translator = c.tryResolve<ITranslationManager>('translator');

          // Create notification service with proper dependencies
          const notificationService = createConfigNotificationService(
            logger,
            translator,
          );
          notificationService.notifyConfigCreated(configPath);
        } catch (error) {
          // Fallback to simple console message
          console.log(`User preferences file created: ${configPath}`);
        }
      });

      // Setup dynamic logging configuration updates
      configManager.onConfigChanged(
        ['logging', 'logging.fileEnabled', 'logging.level'],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (newValue, _oldValue, key) => {
          try {
            const enhancedLogger =
              c.tryResolve<IEnhancedLogger>('enhancedLogger');
            if (!enhancedLogger) return;

            if (key === 'logging.fileEnabled') {
              const fileEnabled = newValue as boolean;
              if (fileEnabled && !enhancedLogger.isFileLoggingEnabled()) {
                // Enable file logging
                const logDir = FileLoggingServices.getProjectLogsDir();
                const format =
                  configManager.get<string>('logging.format', 'text') || 'text';
                const maxFileSize =
                  configManager.get<number>(
                    'logging.maxFileSize',
                    10 * 1024 * 1024,
                  ) || 10 * 1024 * 1024;
                const maxBackupFiles =
                  configManager.get<number>('logging.maxBackupFiles', 5) || 5;

                const fileConfig: FileLoggingConfig = {
                  filePath: join(logDir, 'md2pdf.log'),
                  maxFileSize,
                  maxBackupFiles,
                  format: format as 'text' | 'json',
                  enableRotation: true,
                  async: true,
                };

                await enhancedLogger.enableFileLogging(fileConfig);
              } else if (
                !fileEnabled &&
                enhancedLogger.isFileLoggingEnabled()
              ) {
                // Disable file logging
                await enhancedLogger.disableFileLogging();
              }
            } else if (key === 'logging.level') {
              // Update log level
              enhancedLogger.setLevel(newValue as LogLevel);
            }
          } catch (error) {
            console.warn('Failed to update logging configuration:', error);
          }
        },
      );

      return configManager;
    });

    // Register enhanced logger as singleton (supports file logging)
    container.registerSingleton<IEnhancedLogger>('enhancedLogger', (c) => {
      const config = c.tryResolve<IConfigManager>('config');
      const logLevel = config?.get<string>('logging.level', 'info') || 'info';
      const fileEnabled =
        config?.get<boolean>('logging.fileEnabled', true) ?? true;
      const format = config?.get<string>('logging.format', 'text') || 'text';
      const maxFileSize =
        config?.get<number>('logging.maxFileSize', 10 * 1024 * 1024) ||
        10 * 1024 * 1024;
      const maxBackupFiles =
        config?.get<number>('logging.maxBackupFiles', 5) || 5;
      const enableRotation =
        config?.get<boolean>('logging.enableRotation', true) ?? true;

      const logger = new Logger({ level: logLevel as LogLevel });

      // Enable file logging if configured
      if (fileEnabled) {
        const logDir = FileLoggingServices.getProjectLogsDir();
        const fileConfig: FileLoggingConfig = {
          filePath: join(logDir, 'md2pdf.log'),
          maxFileSize,
          maxBackupFiles,
          format: format as 'text' | 'json',
          enableRotation,
          async: true,
        };

        // Enable file logging asynchronously
        logger.enableFileLogging(fileConfig).catch((error) => {
          // If file logging fails, continue with console logging
          console.warn(
            'Failed to enable file logging:',
            error instanceof Error ? error.message : 'Unknown error',
          );
        });
      }

      return logger;
    });

    // Register logger as singleton (backward compatibility)
    container.registerSingleton<ILogger>('logger', (c) => {
      const config = c.tryResolve<IConfigManager>('config');
      const logLevel = config?.get<string>('logging.level', 'info') || 'info';
      const fileEnabled =
        config?.get<boolean>('logging.fileEnabled', true) ?? true;

      // Check if we should use enhanced logger with file support
      if (fileEnabled) {
        try {
          // Use enhanced logger for file logging capability
          const enhancedLogger =
            c.tryResolve<IEnhancedLogger>('enhancedLogger');
          if (enhancedLogger) {
            return enhancedLogger as unknown as ILogger;
          }

          // Fallback to creating enhanced logger directly
          const logger = new Logger({ level: logLevel as LogLevel });
          const logDir = FileLoggingServices.getProjectLogsDir();
          const format =
            config?.get<string>('logging.format', 'text') || 'text';
          const maxFileSize =
            config?.get<number>('logging.maxFileSize', 10 * 1024 * 1024) ||
            10 * 1024 * 1024;
          const maxBackupFiles =
            config?.get<number>('logging.maxBackupFiles', 5) || 5;
          const enableRotation =
            config?.get<boolean>('logging.enableRotation', true) ?? true;

          const fileConfig = {
            filePath: join(logDir, 'md2pdf.log'),
            maxFileSize,
            maxBackupFiles,
            format: format as 'text' | 'json',
            enableRotation,
            async: true,
          };

          logger.enableFileLogging(fileConfig).catch((error: Error) => {
            console.warn(
              'Failed to enable file logging:',
              error instanceof Error ? error.message : 'Unknown error',
            );
          });

          return logger;
        } catch (error) {
          console.warn(
            'Failed to create enhanced logger, falling back to console logger:',
            error,
          );
          return new Logger({ level: logLevel as LogLevel });
        }
      }

      return new Logger({ level: logLevel as LogLevel });
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

    // Register log management service as singleton
    container.registerSingleton<ILogManagementService>('logManagement', (c) => {
      const config = c.tryResolve<IConfigManager>('config');
      const logger = c.tryResolve<ILogger>('logger');

      // Get logging configuration from config manager
      const loggingEnabled =
        config?.get<boolean>('logging.enabled', true) ?? true;

      if (!loggingEnabled) {
        // Return a no-op service if logging is disabled
        return createNoOpLogManagementService();
      }

      // Determine environment and create appropriate service
      const isProduction = process.env.NODE_ENV === 'production';

      const logManagementConfig: LogManagementConfig = {
        // Required base configuration
        filePath: join(process.cwd(), 'logs', 'md2pdf.log'),
        maxFileSize:
          config?.get<number>('logging.maxFileSize') ?? 10 * 1024 * 1024,
        maxBackupFiles: config?.get<number>('logging.maxBackupFiles') ?? 5,
        format: (config?.get<string>('logging.format') ?? 'text') as
          | 'text'
          | 'json',
        enableRotation: config?.get<boolean>('logging.enableRotation') ?? true,
        async: config?.get<boolean>('logging.async') ?? true,
        // Management configuration
        autoMaintenance:
          config?.get<boolean>('logging.autoMaintenance') ?? isProduction,
        enableHealthCheck:
          config?.get<boolean>('logging.enableHealthCheck') ?? isProduction,
      };

      // Create service based on environment
      const service = isProduction
        ? LogManagementServiceFactory.createProductionService(
            logManagementConfig,
            logger,
          )
        : LogManagementServiceFactory.createDevelopmentService(
            logManagementConfig,
            logger,
          );

      // Setup event handlers
      setupLogManagementEventHandlers(service, logger);

      // Initialize the service
      service.initialize().catch((error) => {
        logger?.warn('Failed to initialize log management service:', error);
      });

      // Setup graceful shutdown
      setupGracefulShutdown(service, logger);

      return service as ILogManagementService;
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
  ENHANCED_LOGGER: 'enhancedLogger',
  ERROR_HANDLER: 'errorHandler',
  FILE_SYSTEM: 'fileSystem',
  TRANSLATOR: 'translator',
  LOG_MANAGEMENT: 'logManagement',
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
      const logger = new Logger({ level: level as LogLevel });
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
      return new Logger({ level: level as LogLevel });
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

/**
 * Enhanced service factories with file logging support
 */
export class FileLoggingServices {
  /**
   * Create enhanced logger with file logging pre-configured
   */
  static async createFileLogger(
    level: LogLevel = 'info',
    fileConfig: FileLoggingConfig,
  ): Promise<IEnhancedLogger> {
    try {
      const logger = new Logger({ level });
      await logger.enableFileLogging(fileConfig);
      return logger;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        'Failed to create file logger, falling back to console:',
        error,
      );
      return new Logger({ level });
    }
  }

  /**
   * Create a complete application container with file logging enabled
   */
  static async createContainerWithFileLogging(
    fileConfig: FileLoggingConfig,
  ): Promise<IServiceContainer> {
    const container = InfrastructureServices.createContainer();
    await this.configureFileLogging(container, fileConfig);
    return container;
  }

  /**
   * Configure file logging for enhanced logger in container
   */
  static async configureFileLogging(
    container: IServiceContainer,
    config: FileLoggingConfig,
  ): Promise<void> {
    try {
      const enhancedLogger =
        container.resolve<IEnhancedLogger>('enhancedLogger');
      await enhancedLogger.enableFileLogging(config);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to configure file logging:', error);
    }
  }

  /**
   * Get project logs directory (creates if not exists)
   */
  static getProjectLogsDir(): string {
    // Find project root by looking for package.json
    let currentDir = process.cwd();

    // Walk up the directory tree to find package.json
    while (currentDir !== dirname(currentDir)) {
      // Stop at filesystem root
      if (existsSync(join(currentDir, 'package.json'))) {
        break;
      }
      currentDir = dirname(currentDir);
    }

    // If we didn't find package.json, use current working directory
    if (!existsSync(join(currentDir, 'package.json'))) {
      currentDir = process.cwd();
    }

    const logsDir = resolve(currentDir, 'logs');

    // Create logs directory if it doesn't exist
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    return logsDir;
  }

  /**
   * Create logger service with automatic file path generation in project logs directory
   */
  static async createAutoFileLogger(
    level: LogLevel = 'info',
    customLogDir?: string,
  ): Promise<IEnhancedLogger> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = customLogDir || this.getProjectLogsDir();
    const fileName = `md2pdf-${timestamp}.log`;

    const fileConfig: FileLoggingConfig = {
      filePath: join(logDir, fileName),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxBackupFiles: 5,
      format: 'text',
      enableRotation: true,
      async: true,
    };

    return this.createFileLogger(level, fileConfig);
  }

  /**
   * Create production file logger in project logs directory
   */
  static async createProductionFileLogger(
    level: LogLevel = 'info',
    fileName: string = 'md2pdf.log',
  ): Promise<IEnhancedLogger> {
    const logDir = this.getProjectLogsDir();

    const fileConfig: FileLoggingConfig = {
      filePath: join(logDir, fileName),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxBackupFiles: 5,
      format: 'text',
      enableRotation: true,
      async: true,
    };

    return this.createFileLogger(level, fileConfig);
  }
}

/**
 * Setup event handlers for log management service
 */
function setupLogManagementEventHandlers(
  service: LogManagementService,
  logger?: ILogger,
): void {
  // Maintenance events
  service.on('maintenance:started', () => {
    logger?.debug('Log maintenance started');
  });

  service.on('maintenance:completed', (result) => {
    logger?.info('Log maintenance completed', {
      duration: result.duration,
      actions: result.actions,
      spaceFreed: result.diskSpace.spaceFreed,
    });
  });

  service.on('maintenance:failed', (error) => {
    logger?.error('Log maintenance failed:', error.message);
  });

  // Health monitoring events
  service.on('health:warning', (warning) => {
    logger?.warn(`Log health warning: ${warning.message}`, {
      type: warning.type,
      currentValue: warning.currentValue,
      threshold: warning.threshold,
    });
  });

  service.on('health:critical', (critical) => {
    logger?.error(`Log health critical: ${critical.message}`, {
      type: critical.type,
      details: critical.details,
    });
  });

  // Cleanup events
  service.on('cleanup:completed', (filesRemoved) => {
    if (filesRemoved > 0) {
      logger?.info(`Log cleanup completed: ${filesRemoved} files removed`);
    }
  });

  service.on('archive:completed', (archivedFiles) => {
    if (archivedFiles.length > 0) {
      logger?.info(
        `Log archiving completed: ${archivedFiles.length} files archived`,
      );
    }
  });
}

/**
 * Setup graceful shutdown for log management service
 */
function setupGracefulShutdown(
  service: LogManagementService,
  logger?: ILogger,
): void {
  const shutdownHandler = async (signal: string) => {
    logger?.info(`Received ${signal}, shutting down log management service...`);
    try {
      await service.shutdown();
      logger?.info('Log management service shut down gracefully');
    } catch (error) {
      logger?.error('Error during log management shutdown:', error);
    }
  };

  // Handle various shutdown signals
  process.on('SIGINT', () => shutdownHandler('SIGINT'));
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGHUP', () => shutdownHandler('SIGHUP'));

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger?.error('Uncaught exception, shutting down log management:', error);
    try {
      await service.shutdown();
    } catch (shutdownError) {
      logger?.error('Error during emergency shutdown:', shutdownError);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    logger?.error('Unhandled rejection at:', promise, 'reason:', reason);
    try {
      await service.shutdown();
    } catch (shutdownError) {
      logger?.error('Error during emergency shutdown:', shutdownError);
    }
    process.exit(1);
  });
}

/**
 * Create a no-op log management service for when advanced features are disabled
 */
function createNoOpLogManagementService(): ILogManagementService {
  return {
    async getStats() {
      return {
        totalEntries: 0,
        currentFileSize: 0,
        rotationCount: 0,
        isRotationNeeded: false,
      };
    },
    async getDiskUsage() {
      return {
        totalSpace: 0,
        usedSpace: 0,
        availableSpace: 0,
        usagePercentage: 0,
        logDirectorySize: 0,
      };
    },
    async searchLogs() {
      console.warn(
        '[MD2PDF] Log search skipped: Log management is disabled in configuration',
      );
      return {
        entries: [],
        totalCount: 0,
        hasMore: false,
        searchStats: {
          filesSearched: 0,
          totalLines: 0,
          searchDuration: 0,
        },
        warning: 'Log management is disabled in configuration',
      };
    },
    async analyzeLogs() {
      console.warn(
        '[MD2PDF] Log analysis skipped: Log management is disabled in configuration',
      );
      return {
        totalLogs: 0,
        logsByLevel: { error: 0, warn: 0, info: 0, debug: 0 },
        timeRange: { earliest: new Date(), latest: new Date() },
        topMessages: [],
        errorPatterns: [],
        performanceMetrics: {
          averageWriteTime: 0,
          maxWriteTime: 0,
          queueFullEvents: 0,
          logFrequency: { hour: 0, day: 0, total: 0 },
        },
        fileStatistics: [],
        insights: {
          errorRate: 0,
          warningRate: 0,
          busiestHour: { hour: 0, count: 0 },
          commonErrors: [],
          recommendations: ['Log management is disabled in configuration'],
        },
        warning: 'Log management is disabled in configuration',
      };
    },
    async rotateLogs() {
      console.warn(
        '[MD2PDF] Log rotation skipped: Log management is disabled in configuration',
      );
    },
    async archiveLogs() {
      console.warn(
        '[MD2PDF] Log archival skipped: Log management is disabled in configuration',
      );
      return [];
    },
    async cleanupOldLogs() {
      console.warn(
        '[MD2PDF] Log cleanup skipped: Log management is disabled in configuration',
      );
      return 0;
    },
    async runMaintenance() {
      return {
        timestamp: new Date(),
        duration: 0,
        actions: { rotations: 0, compressions: 0, archives: 0, cleanups: 0 },
        diskSpace: {
          before: {
            totalSpace: 0,
            usedSpace: 0,
            availableSpace: 0,
            usagePercentage: 0,
            logDirectorySize: 0,
          },
          after: {
            totalSpace: 0,
            usedSpace: 0,
            availableSpace: 0,
            usagePercentage: 0,
            logDirectorySize: 0,
          },
          spaceFreed: 0,
        },
      };
    },
    async checkHealth() {
      console.warn(
        '[MD2PDF] Health check skipped: Log management is disabled in configuration',
      );
    },
    getStatus() {
      return {
        initialized: false,
        config: { autoMaintenance: false, enableHealthCheck: false },
        timers: { maintenance: false, healthCheck: false },
      };
    },
    async initialize() {
      console.warn(
        '[MD2PDF] Log management initialization skipped: Log management is disabled in configuration',
      );
    },
    async shutdown() {
      console.warn(
        '[MD2PDF] Log management shutdown skipped: Log management is disabled in configuration',
      );
    },
  };
}

/**
 * Service utilities for checking and managing services
 */
export class ServiceUtils {
  /**
   * Check if services are available and properly configured
   */
  static async checkServicesHealth(container: IServiceContainer): Promise<{
    logManagement: boolean;
    overall: boolean;
  }> {
    try {
      const logManagement =
        container.tryResolve<ILogManagementService>('logManagement');
      const logManagementHealthy = logManagement !== null;

      if (logManagementHealthy && logManagement) {
        // Perform basic health check
        await logManagement.checkHealth();
      }

      return {
        logManagement: logManagementHealthy,
        overall: logManagementHealthy,
      };
    } catch (error) {
      return {
        logManagement: false,
        overall: false,
      };
    }
  }

  /**
   * Get services status report
   */
  static getServicesStatus(container: IServiceContainer): {
    logManagement: any;
    timestamp: Date;
  } {
    const logManagement =
      container.tryResolve<ILogManagementService>('logManagement');

    return {
      logManagement: logManagement
        ? logManagement.getStatus()
        : { available: false },
      timestamp: new Date(),
    };
  }

  /**
   * Perform services maintenance
   */
  static async performServicesMaintenance(
    container: IServiceContainer,
  ): Promise<{
    logManagement: any;
    timestamp: Date;
  }> {
    const results = {
      logManagement: null as any,
      timestamp: new Date(),
    };

    try {
      const logManagement =
        container.tryResolve<ILogManagementService>('logManagement');
      if (logManagement) {
        results.logManagement = await logManagement.runMaintenance();
      }
    } catch (error) {
      results.logManagement = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return results;
  }
}

// Export functions for testing
export { setupLogManagementEventHandlers, createNoOpLogManagementService };
