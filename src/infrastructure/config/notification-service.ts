/**
 * Configuration Notification Service
 *
 * Provides user-friendly notifications for configuration events
 * Following Clean Architecture principles with proper dependency injection
 */

import chalk from 'chalk';

import type { ITranslationManager } from '../i18n/types';
import type { ILogger } from '../logging/types';

export interface IConfigNotificationService {
  notifyConfigCreated(configPath: string): void;
  notifyConfigLoaded(configPath: string): void;
  notifyConfigError(error: Error, configPath: string): void;
}

/**
 * Clean Architecture implementation of configuration notifications
 * Properly injected dependencies for testability and maintainability
 */
export class ConfigNotificationService implements IConfigNotificationService {
  constructor(
    private readonly logger?: ILogger,
    private readonly translator?: ITranslationManager,
  ) {}

  /**
   * Display user-friendly notification when config file is created
   * Uses proper translation and logging systems
   */
  notifyConfigCreated(configPath: string): void {
    try {
      const message = this.getTranslatedMessage(
        'config.notifications.created',
        {
          path: configPath,
        },
      );

      const instructions = this.getTranslatedMessage(
        'config.notifications.instructions',
      );

      // Display user-friendly formatted message
      console.log('');
      console.log(chalk.green('✅ ' + message));
      console.log(chalk.blue(`📁 ${configPath}`));
      console.log(chalk.yellow('💡 ' + instructions));
      console.log('');

      // Log to file if logger available (for debugging)
      if (this.logger) {
        this.logger.info(`User preferences file created: ${configPath}`);
      }
    } catch (error) {
      // Graceful fallback to plain text
      this.fallbackNotifyConfigCreated(configPath);
    }
  }

  /**
   * Notify when existing config file is loaded
   */
  notifyConfigLoaded(configPath: string): void {
    if (this.logger) {
      const message = this.getTranslatedMessage('config.notifications.loaded', {
        path: configPath,
      });
      this.logger.debug(message);
    }
  }

  /**
   * Notify about configuration errors
   */
  notifyConfigError(error: Error, configPath: string): void {
    const message = this.getTranslatedMessage('config.notifications.error', {
      error: error.message,
      path: configPath,
    });

    console.warn(chalk.yellow(`⚠️  ${message}`));

    if (this.logger) {
      this.logger.warn(`Configuration error: ${error.message}`, {
        configPath,
        error,
      });
    }
  }

  /**
   * Get translated message with fallback to English
   */
  private getTranslatedMessage(
    key: string,
    params?: Record<string, string>,
  ): string {
    if (!this.translator) {
      return this.getEnglishFallback(key, params);
    }

    try {
      return this.translator.t(key, params);
    } catch (error) {
      return this.getEnglishFallback(key, params);
    }
  }

  /**
   * English fallback messages for when translation system is not available
   */
  private getEnglishFallback(
    key: string,
    params?: Record<string, string>,
  ): string {
    const messages: Record<string, string> = {
      'config.notifications.created': 'User preferences initialized',
      'config.notifications.instructions':
        'You can edit this file to customize your preferences',
      'config.notifications.loaded': `Configuration loaded from: ${params?.path || 'unknown'}`,
      'config.notifications.error': `Configuration error: ${params?.error || 'unknown error'}`,
    };

    return messages[key] || key;
  }

  /**
   * Fallback notification without styling when chalk fails
   */
  private fallbackNotifyConfigCreated(configPath: string): void {
    console.log('');
    console.log('✅ User preferences initialized');
    console.log(`📁 Configuration file: ${configPath}`);
    console.log('💡 You can edit this file to customize your preferences');
    console.log('');
  }
}

/**
 * Factory function for creating notification service with proper dependencies
 * This follows the factory pattern for better testability
 */
export function createConfigNotificationService(
  logger?: ILogger,
  translator?: ITranslationManager,
): IConfigNotificationService {
  return new ConfigNotificationService(logger, translator);
}
