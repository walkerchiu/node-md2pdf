/**
 * Environment-aware infrastructure services
 * Extends base infrastructure services with environment variable support
 */

import { ServiceContainer } from '../../shared/container';
import { InfrastructureServices, ILogManagementService } from '../services';

import {
  EnvironmentAwareLoggingFactory,
  LoggingEnvironmentConfig,
} from './environment-aware-factory';

import { Logger } from './index';

import type { ILogger, IEnhancedLogger } from './types';
import type { IServiceContainer } from '../../shared/container';

export class EnvironmentAwareServices extends InfrastructureServices {
  /**
   * Create container with environment-driven logging configuration
   */
  static createContainer(): IServiceContainer {
    const container = new ServiceContainer();

    // Register base infrastructure services
    InfrastructureServices.registerServices(container);

    // Override logger registration to use environment factory
    this.registerEnvironmentLoggerServices(container);

    return container;
  }

  /**
   * Register environment-aware logger services
   */
  private static registerEnvironmentLoggerServices(
    container: IServiceContainer,
  ): void {
    // Override enhanced logger with environment-aware configuration
    container.registerSingleton<IEnhancedLogger>('enhancedLogger', () => {
      const envConfig = LoggingEnvironmentConfig.fromEnvironment();
      const logLevel = LoggingEnvironmentConfig.getLogLevel();
      const logger = new Logger({ level: logLevel });

      // Enable file logging if configured
      if (LoggingEnvironmentConfig.isFileLoggingEnabled()) {
        logger.enableFileLogging(envConfig).catch((error: Error) => {
          console.warn('Failed to enable file logging:', error.message);
        });
      }

      return logger;
    });

    // Override logger (backward compatibility) to use environment factory
    container.registerSingleton<ILogger>('logger', (c) => {
      const enhancedLogger = c.tryResolve<IEnhancedLogger>('enhancedLogger');
      return enhancedLogger || this.createEnvironmentLogger();
    });

    // Override log management service to use environment configuration
    container.registerSingleton<ILogManagementService>('logManagement', (c) => {
      const logger = c.tryResolve<ILogger>('logger');
      return EnvironmentAwareLoggingFactory.createLogManagementService(logger);
    });
  }

  /**
   * Quick factory method for environment-aware logger
   */
  static createEnvironmentLogger(): IEnhancedLogger {
    const envConfig = LoggingEnvironmentConfig.fromEnvironment();
    const logLevel = LoggingEnvironmentConfig.getLogLevel();
    const logger = new Logger({ level: logLevel });

    // Enable file logging if configured
    if (LoggingEnvironmentConfig.isFileLoggingEnabled()) {
      logger.enableFileLogging(envConfig).catch((error: Error) => {
        console.warn('Failed to enable file logging:', error.message);
      });
    }

    return logger;
  }

  /**
   * Quick factory method for environment-aware log management service
   */
  static createEnvironmentLogManagement() {
    const logger = this.createEnvironmentLogger();
    return EnvironmentAwareLoggingFactory.createLogManagementService(logger);
  }
}
