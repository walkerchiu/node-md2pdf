/**
 * Simple console-based logger implementation
 */

import { EnvironmentConfig } from '../config/environment';

import { shouldLog, formatLevel } from './levels';

import type { ILogger, LogLevel, LoggerOptions, LogEntry } from './types';

export class ConsoleLogger implements ILogger {
  private level: LogLevel;
  private options: Required<LoggerOptions>;

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
    const formattedMessage = this.formatMessage(entry);

    // Route to appropriate console method
    switch (level) {
      case 'error':
        // eslint-disable-next-line no-console
        console.error(formattedMessage, ...args);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(formattedMessage, ...args);
        break;
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(formattedMessage, ...args);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(formattedMessage, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
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

  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    // Add timestamp if enabled
    if (this.options.format.timestamp) {
      const timestamp = entry.timestamp.toISOString();
      parts.push(`[${timestamp}]`);
    }

    // Add prefix if provided
    if (this.options.format.prefix) {
      parts.push(this.options.format.prefix);
    }

    // Add level
    const useColors = this.options.format.colors && process.stdout.isTTY;
    const levelStr = formatLevel(entry.level, useColors);
    parts.push(`[${levelStr}]`);

    // Add message
    parts.push(entry.message);

    return parts.join(' ');
  }
}
