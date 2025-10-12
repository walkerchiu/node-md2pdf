/**
 * Unified logger implementation with both basic and enhanced capabilities
 * Uses strategy pattern for flexible output options
 */

import { EnvironmentConfig } from '../config/environment';

import { shouldLog } from './levels';
import { ConsoleLoggerStrategy, HybridLoggerStrategy } from './strategies';

import type {
  IEnhancedLogger,
  LogLevel,
  LoggerOptions,
  LogEntry,
  FileLoggingConfig,
  LogStats,
  ILoggerStrategy,
} from './types';

export class Logger implements IEnhancedLogger {
  private level: LogLevel;
  private options: Required<LoggerOptions>;
  private strategy: ILoggerStrategy;
  private fileLoggingEnabled = false;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: 'info',
      enableColors: true,
      enableTimestamp: true,
      format: {
        timestamp: true,
        colors: true,
        prefix: '[MD2PDF]',
      },
      ...options,
    };

    this.level = this.options.level;

    // Use centralized environment configuration
    this.level = EnvironmentConfig.getLogLevel();

    // Initialize with console strategy
    this.strategy = new ConsoleLoggerStrategy({
      enableColors: this.options.format.colors ?? true,
      enableTimestamp: this.options.format.timestamp ?? true,
      prefix: this.options.format.prefix ?? '[MD2PDF]',
    });
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!shouldLog(this.level, level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, args);

    // Use strategy pattern for output
    this.strategy.write(entry).catch((error) => {
      // Fallback to console on error
      // eslint-disable-next-line no-console
      console.error(`[Logger] Failed to write log: ${error.message}`);
      // eslint-disable-next-line no-console
      console.error(`[Logger] Original message: ${message}`, ...args);
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  async enableFileLogging(config: FileLoggingConfig): Promise<void> {
    try {
      // Create hybrid strategy that writes to both console and file
      this.strategy = new HybridLoggerStrategy(
        {
          enableColors: this.options.format.colors ?? true,
          enableTimestamp: this.options.format.timestamp ?? true,
          prefix: this.options.format.prefix ?? '[MD2PDF]',
        },
        config,
      );

      this.fileLoggingEnabled = true;

      // Log the enabling of file logging
      this.info(`File logging enabled: ${config.filePath}`);
    } catch (error) {
      throw new Error(
        `Failed to enable file logging: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async disableFileLogging(): Promise<void> {
    try {
      // Cleanup current strategy
      await this.strategy.cleanup();

      // Revert to console-only strategy
      this.strategy = new ConsoleLoggerStrategy({
        enableColors: this.options.format.colors ?? true,
        enableTimestamp: this.options.format.timestamp ?? true,
        prefix: this.options.format.prefix ?? '[MD2PDF]',
      });

      this.fileLoggingEnabled = false;

      this.info('File logging disabled');
    } catch (error) {
      throw new Error(
        `Failed to disable file logging: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async rotateLogs(): Promise<void> {
    if (!this.fileLoggingEnabled) {
      throw new Error('File logging is not enabled');
    }

    if (this.strategy instanceof HybridLoggerStrategy) {
      await this.strategy.rotate();
      this.info('Log rotation completed');
    } else {
      throw new Error('Current strategy does not support log rotation');
    }
  }

  async getLogStats(): Promise<LogStats> {
    if (!this.fileLoggingEnabled) {
      return {
        totalEntries: 0,
        currentFileSize: 0,
        rotationCount: 0,
        isRotationNeeded: false,
      };
    }

    if (this.strategy instanceof HybridLoggerStrategy) {
      return this.strategy.getStats();
    } else {
      throw new Error('Current strategy does not support log statistics');
    }
  }

  isFileLoggingEnabled(): boolean {
    return this.fileLoggingEnabled;
  }

  /**
   * Graceful cleanup - ensures all pending writes complete
   */
  async cleanup(): Promise<void> {
    try {
      await this.strategy.cleanup();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `[Logger] Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    args: unknown[],
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      args,
    };
  }
}
