/**
 * Environment-aware logging factory
 */

import { join } from 'path';

import {
  LogManagementService,
  LogManagementServiceFactory,
} from './log-management.service';
import { FileLoggerStrategy, HybridLoggerStrategy } from './strategies';

import type { ILogger, FileLoggingConfig } from './types';

export class LoggingEnvironmentConfig {
  /**
   * Parse logging configuration from environment variables
   */
  static fromEnvironment(): FileLoggingConfig {
    return {
      // Basic control
      filePath: this.parseLogDir(),
      format: this.parseLogFormat(),

      // File management
      maxFileSize: this.parseMaxSize(),
      maxBackupFiles: this.parseMaxFiles(),
      maxAge: this.parseMaxAge(),
      enableRotation: this.parseEnableRotation(),

      // Time-based rotation
      enableTimeBasedRotation: this.parseEnableTimeBasedRotation(),
      rotationInterval: this.parseRotationInterval(),

      // Performance optimization
      async: true, // Always async for performance
      bufferEnabled: this.parseBufferEnabled(),
      bufferSize: this.parseBufferSize(),
      flushInterval: this.parseFlushInterval(),
    };
  }

  /**
   * Check if file logging is enabled via environment
   */
  static isFileLoggingEnabled(): boolean {
    const enabled = process.env.MD2PDF_LOG_FILE_ENABLED;
    return enabled !== 'false' && enabled !== '0';
  }

  /**
   * Get log level from environment
   */
  static getLogLevel(): 'error' | 'warn' | 'info' | 'debug' {
    const level = process.env.MD2PDF_LOG_LEVEL?.toLowerCase();
    switch (level) {
      case 'error':
      case 'warn':
      case 'info':
      case 'debug':
        return level;
      default:
        return 'info';
    }
  }

  private static parseLogDir(): string {
    const logDir = process.env.MD2PDF_LOG_DIR;
    if (logDir) {
      return logDir.endsWith('.log') ? logDir : join(logDir, 'md2pdf.log');
    }
    return './logs/md2pdf.log';
  }

  private static parseLogFormat(): 'text' | 'json' {
    const format = process.env.MD2PDF_LOG_FORMAT?.toLowerCase();
    return format === 'json' ? 'json' : 'text';
  }

  private static parseMaxSize(): number {
    const maxSize = process.env.MD2PDF_LOG_MAX_SIZE;
    if (!maxSize) return 10 * 1024 * 1024; // 10MB

    const match = maxSize.match(/^(\d+)(MB|KB|GB)?$/i);
    if (!match) return 10 * 1024 * 1024;

    const [, size, unit] = match;
    const sizeNum = parseInt(size, 10);

    switch (unit?.toUpperCase()) {
      case 'GB':
        return sizeNum * 1024 * 1024 * 1024;
      case 'MB':
        return sizeNum * 1024 * 1024;
      case 'KB':
        return sizeNum * 1024;
      default:
        return sizeNum; // Assume bytes if no unit
    }
  }

  private static parseMaxFiles(): number {
    const maxFiles = process.env.MD2PDF_LOG_MAX_FILES;
    if (!maxFiles) return 5;
    const parsed = parseInt(maxFiles, 10);
    return isNaN(parsed) ? 5 : parsed;
  }

  private static parseMaxAge(): string {
    return process.env.MD2PDF_LOG_MAX_AGE || '7d';
  }

  private static parseEnableRotation(): boolean {
    const enabled = process.env.MD2PDF_LOG_ENABLE_ROTATION;
    return enabled !== 'false' && enabled !== '0';
  }

  private static parseBufferEnabled(): boolean {
    const enabled = process.env.MD2PDF_LOG_BUFFER_ENABLED;
    return enabled === 'true' || enabled === '1';
  }

  private static parseBufferSize(): number {
    const size = process.env.MD2PDF_LOG_BUFFER_SIZE;
    return size ? parseInt(size, 10) : 100;
  }

  private static parseFlushInterval(): number {
    const interval = process.env.MD2PDF_LOG_FLUSH_INTERVAL;
    return interval ? parseInt(interval, 10) : 5000;
  }

  private static parseEnableTimeBasedRotation(): boolean {
    const enabled = process.env.MD2PDF_LOG_ENABLE_TIME_ROTATION;
    return enabled === 'true' || enabled === '1';
  }

  private static parseRotationInterval(): number {
    const interval = process.env.MD2PDF_LOG_ROTATION_INTERVAL;
    const parsed = interval ? parseInt(interval, 10) : 24;
    return isNaN(parsed) || parsed <= 0 ? 24 : parsed;
  }
}

/**
 * Environment-aware logging service factory
 */
export class EnvironmentAwareLoggingFactory {
  /**
   * Create a logging service based on environment configuration
   */
  static createLogManagementService(logger?: ILogger): LogManagementService {
    const config = LoggingEnvironmentConfig.fromEnvironment();

    // Check if advanced features are configured
    const useAdvanced =
      config.bufferEnabled ||
      (config.maxAge && config.maxAge !== '7d') ||
      (config.bufferSize && config.bufferSize !== 100);

    if (useAdvanced) {
      return this.createEnhancedService(config, logger);
    } else {
      return this.createStandardService(config, logger);
    }
  }

  /**
   * Create file logger strategy with enhanced features
   */
  static createFileLogger(): FileLoggerStrategy {
    const config = LoggingEnvironmentConfig.fromEnvironment();
    return new FileLoggerStrategy(config);
  }

  /**
   * Create hybrid logger strategy with enhanced features
   */
  static createHybridLogger(): HybridLoggerStrategy {
    const config = LoggingEnvironmentConfig.fromEnvironment();
    return new HybridLoggerStrategy(
      {
        enableColors: true,
        enableTimestamp: true,
        prefix: '[MD2PDF]',
      },
      config,
    );
  }

  private static createEnhancedService(
    config: FileLoggingConfig,
    logger?: ILogger,
  ): LogManagementService {
    // Convert to LogManagementConfig format
    const managementConfig = {
      filePath: config.filePath,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024,
      maxBackupFiles: config.maxBackupFiles || 5,
      format: config.format || 'text',
      enableRotation: config.enableRotation ?? true,
      async: config.async ?? true,
      autoMaintenance: true,
      maintenanceInterval: 60 * 60 * 1000, // 1 hour
      enableHealthCheck: true,
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
    };

    return new LogManagementService(managementConfig, logger);
  }

  private static createStandardService(
    config: FileLoggingConfig,
    logger?: ILogger,
  ): LogManagementService {
    // Use factory method for standard service
    return LogManagementServiceFactory.createProductionService(config, logger);
  }
}

/**
 * Convenience functions for common use cases
 */
export const createEnvironmentLogger = () => {
  if (LoggingEnvironmentConfig.isFileLoggingEnabled()) {
    return EnvironmentAwareLoggingFactory.createHybridLogger();
  } else {
    // Return console-only logger
    return {
      write: async (entry: any) => {
        const formattedMessage = `[${entry.timestamp.toISOString()}] [MD2PDF] [${entry.level.toUpperCase()}] ${entry.message}`;
        switch (entry.level) {
          case 'error':
            console.error(formattedMessage, ...entry.args);
            break;
          case 'warn':
            console.warn(formattedMessage, ...entry.args);
            break;
          case 'debug':
            console.debug(formattedMessage, ...entry.args);
            break;
          default:
            console.log(formattedMessage, ...entry.args);
        }
      },
      cleanup: async () => {},
    };
  }
};
