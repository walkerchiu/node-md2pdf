import { promises as fs } from 'fs';
import { dirname } from 'path';

import { formatLevel } from './levels';

import type {
  ILoggerStrategy,
  LogEntry,
  FileLoggingConfig,
  LogStats,
} from './types';

/**
 * Console output strategy for logging
 */
export class ConsoleLoggerStrategy implements ILoggerStrategy {
  constructor(
    private options: {
      enableColors?: boolean;
      enableTimestamp?: boolean;
      prefix?: string;
    } = {},
  ) {}

  async write(entry: LogEntry): Promise<void> {
    const formattedMessage = this.formatMessage(entry);

    // Route to appropriate console method
    switch (entry.level) {
      case 'error':
        // eslint-disable-next-line no-console
        console.error(formattedMessage, ...entry.args);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(formattedMessage, ...entry.args);
        break;
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(formattedMessage, ...entry.args);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(formattedMessage, ...entry.args);
    }
  }

  async cleanup(): Promise<void> {
    // Console strategy doesn't need cleanup
  }

  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    // Add timestamp if enabled
    if (this.options.enableTimestamp) {
      const timestamp = entry.timestamp.toISOString();
      parts.push(`[${timestamp}]`);
    }

    // Add prefix if provided
    if (this.options.prefix) {
      parts.push(this.options.prefix);
    }

    // Add level
    const useColors = this.options.enableColors && process.stdout.isTTY;
    const levelStr = formatLevel(entry.level, useColors);
    parts.push(`[${levelStr}]`);

    // Add message
    parts.push(entry.message);

    return parts.join(' ');
  }
}

/**
 * File output strategy for logging with rotation support
 */
export class FileLoggerStrategy implements ILoggerStrategy {
  private config: Required<FileLoggingConfig>;
  private stats: LogStats;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(config: FileLoggingConfig) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      maxBackupFiles: 5,
      format: 'text',
      enableRotation: true,
      async: true,
      ...config,
    };

    this.stats = {
      totalEntries: 0,
      currentFileSize: 0,
      rotationCount: 0,
      isRotationNeeded: false,
    };
  }

  async write(entry: LogEntry): Promise<void> {
    if (this.config.async) {
      // Async write - queue the operation
      this.writeQueue = this.writeQueue.then(() => this.performWrite(entry));
      return this.writeQueue;
    } else {
      // Sync write
      return this.performWrite(entry);
    }
  }

  async cleanup(): Promise<void> {
    // Wait for any pending writes to complete
    await this.writeQueue;
  }

  async rotate(): Promise<void> {
    try {
      // Create backup files
      for (let i = this.config.maxBackupFiles - 1; i >= 0; i--) {
        const currentFile =
          i === 0 ? this.config.filePath : `${this.config.filePath}.${i}`;
        const nextFile = `${this.config.filePath}.${i + 1}`;

        try {
          await fs.access(currentFile);
          await fs.rename(currentFile, nextFile);
        } catch {
          // File doesn't exist, continue
        }
      }

      // Reset stats
      this.stats.currentFileSize = 0;
      this.stats.rotationCount++;
      this.stats.lastRotation = new Date();
      this.stats.isRotationNeeded = false;
    } catch (error) {
      throw new Error(
        `Failed to rotate log files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  getStats(): LogStats {
    return { ...this.stats };
  }

  private async performWrite(entry: LogEntry): Promise<void> {
    try {
      // Check if rotation is needed
      if (this.config.enableRotation && this.stats.isRotationNeeded) {
        await this.rotate();
      }

      // Ensure directory exists
      await this.ensureDirectoryExists();

      // Format message
      const formattedMessage = this.formatFileMessage(entry);

      // Write to file
      await fs.appendFile(
        this.config.filePath,
        formattedMessage + '\n',
        'utf8',
      );

      // Update stats
      this.stats.totalEntries++;
      this.stats.currentFileSize += Buffer.byteLength(
        formattedMessage + '\n',
        'utf8',
      );

      // Check if rotation is needed for next time
      if (
        this.config.enableRotation &&
        this.stats.currentFileSize >= this.config.maxFileSize
      ) {
        this.stats.isRotationNeeded = true;
      }
    } catch (error) {
      throw new Error(
        `Failed to write log entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    const dir = dirname(this.config.filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create log directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private formatFileMessage(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: entry.level.toUpperCase(),
        message: entry.message,
        args: entry.args.length > 0 ? entry.args : undefined,
      });
    } else {
      // Text format
      const timestamp = entry.timestamp.toISOString();
      const level = entry.level.toUpperCase().padEnd(5);
      const argsStr =
        entry.args.length > 0
          ? ` ${entry.args
              .map((arg) =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
              )
              .join(' ')}`
          : '';

      return `${timestamp} [${level}] ${entry.message}${argsStr}`;
    }
  }
}

/**
 * Hybrid strategy that outputs to both console and file
 */
export class HybridLoggerStrategy implements ILoggerStrategy {
  private consoleStrategy: ConsoleLoggerStrategy;
  private fileStrategy: FileLoggerStrategy;

  constructor(
    consoleOptions: {
      enableColors?: boolean;
      enableTimestamp?: boolean;
      prefix?: string;
    } = {},
    fileConfig: FileLoggingConfig,
  ) {
    this.consoleStrategy = new ConsoleLoggerStrategy(consoleOptions);
    this.fileStrategy = new FileLoggerStrategy(fileConfig);
  }

  async write(entry: LogEntry): Promise<void> {
    // Write to both console and file in parallel
    await Promise.all([
      this.consoleStrategy.write(entry),
      this.fileStrategy.write(entry),
    ]);
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.consoleStrategy.cleanup(),
      this.fileStrategy.cleanup(),
    ]);
  }

  async rotate(): Promise<void> {
    return this.fileStrategy.rotate();
  }

  getStats(): LogStats {
    return this.fileStrategy.getStats();
  }
}
