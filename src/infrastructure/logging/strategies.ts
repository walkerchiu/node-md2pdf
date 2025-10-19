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
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout | undefined;

  constructor(config: FileLoggingConfig) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      maxBackupFiles: 5,
      format: 'text',
      enableRotation: true,
      async: true,
      maxAge: '7d',
      enableTimeBasedRotation: false,
      rotationInterval: 24, // 24 hours default
      bufferEnabled: false,
      bufferSize: 100,
      flushInterval: 5000,
      ...config,
    };

    this.stats = {
      totalEntries: 0,
      currentFileSize: 0,
      rotationCount: 0,
      isRotationNeeded: false,
    };

    // Setup automatic buffer flushing if buffering is enabled
    if (this.config.bufferEnabled && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch((error) => {
          console.error('Automatic buffer flush failed:', error);
        });
      }, this.config.flushInterval);

      // Unref the timer so it doesn't prevent Node.js from exiting
      this.flushTimer.unref();
    }
  }

  async write(entry: LogEntry): Promise<void> {
    // Enhance log entry with additional metadata
    const enhancedEntry = this.enhanceLogEntry(entry);

    if (this.config.bufferEnabled) {
      // Add to buffer
      this.buffer.push(enhancedEntry);

      // Flush if buffer size limit reached
      if (this.buffer.length >= this.config.bufferSize) {
        await this.flush();
      }
    } else {
      // Direct write
      if (this.config.async) {
        this.writeQueue = this.writeQueue.then(() =>
          this.performWrite(enhancedEntry),
        );
        return this.writeQueue;
      } else {
        return this.performWrite(enhancedEntry);
      }
    }
  }

  async cleanup(): Promise<void> {
    // Flush any remaining buffer
    if (this.config.bufferEnabled && this.buffer.length > 0) {
      await this.flush();
    }

    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

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

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Flush buffer to file immediately
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entriesToFlush = [...this.buffer];
    this.buffer = [];

    for (const entry of entriesToFlush) {
      await this.performWrite(entry);
    }
  }

  /**
   * Rotate logs based on time
   */
  async rotateByTime(): Promise<void> {
    // Only perform time-based rotation if enabled
    if (!this.config.enableTimeBasedRotation) {
      return;
    }

    const now = new Date();
    const lastRotation = this.stats.lastRotation;

    if (!lastRotation) {
      // No previous rotation recorded, check if we should do initial rotation
      // For safety, don't rotate immediately on first run
      return;
    }

    // Calculate hours since last rotation
    const hoursSinceLastRotation =
      (now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60);

    // Use configured rotation interval (default 24 hours)
    const rotationIntervalHours = this.config.rotationInterval || 24;

    if (hoursSinceLastRotation >= rotationIntervalHours) {
      try {
        await this.rotate();
        console.info(
          `Time-based log rotation completed after ${hoursSinceLastRotation.toFixed(1)} hours`,
        );
      } catch (error) {
        console.error(
          'Time-based log rotation failed:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        throw error;
      }
    }
  }

  /**
   * Clean up old log files based on max age
   */
  async cleanupOldLogs(maxAge: string): Promise<number> {
    try {
      const maxAgeMs = this.parseMaxAge(maxAge);
      const now = Date.now();

      let cleanedCount = 0;

      // Find and clean old log files
      for (let i = 1; i <= this.config.maxBackupFiles; i++) {
        const backupFile = `${this.config.filePath}.${i}`;
        try {
          const stat = await fs.stat(backupFile);
          const fileAge = now - stat.mtime.getTime();

          if (fileAge > maxAgeMs) {
            await fs.unlink(backupFile);
            cleanedCount++;
          }
        } catch {
          // File doesn't exist, ignore
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning old logs:', error);
      return 0;
    }
  }

  /**
   * Enhance log entry with additional metadata
   */
  private enhanceLogEntry(entry: LogEntry): LogEntry {
    const enhanced: LogEntry = {
      ...entry,
      processId: process.pid,
      writeStartTime: Date.now(),
    };

    return enhanced;
  }

  /**
   * Parse max age string to milliseconds
   */
  private parseMaxAge(maxAge: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = maxAge.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(
        `Invalid max age format: ${maxAge}. Use format like '7d', '24h', '60m', '30s'`,
      );
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    return value * units[unit];
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
      const jsonData: any = {
        timestamp: entry.timestamp.toISOString(),
        level: entry.level.toUpperCase(),
        message: entry.message,
        args: entry.args.length > 0 ? entry.args : undefined,
      };

      // Add optional metadata if present
      if (entry.processId !== undefined) {
        jsonData.processId = entry.processId;
      }
      if (entry.writeStartTime !== undefined) {
        jsonData.writeStartTime = entry.writeStartTime;
      }
      if (entry.correlationId !== undefined) {
        jsonData.correlationId = entry.correlationId;
      }

      return JSON.stringify(jsonData);
    } else {
      // Text format
      const timestamp = entry.timestamp.toISOString();
      const level = entry.level.toUpperCase().padEnd(5);

      // Include process ID if available
      const processIdStr = entry.processId ? `[${entry.processId}]` : '';

      const argsStr =
        entry.args.length > 0
          ? ` ${entry.args
              .map((arg) =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
              )
              .join(' ')}`
          : '';

      return `${timestamp} [${level}]${processIdStr} ${entry.message}${argsStr}`;
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

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.fileStrategy.getBufferSize();
  }

  /**
   * Flush buffer to file immediately
   */
  async flush(): Promise<void> {
    return this.fileStrategy.flush();
  }

  /**
   * Rotate logs based on time
   */
  async rotateByTime(): Promise<void> {
    return this.fileStrategy.rotateByTime();
  }

  /**
   * Clean up old log files based on max age
   */
  async cleanupOldLogs(maxAge: string): Promise<number> {
    return this.fileStrategy.cleanupOldLogs(maxAge);
  }
}
