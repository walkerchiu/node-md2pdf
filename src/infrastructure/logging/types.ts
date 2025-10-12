/**
 * Logging system types
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface ILogger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  log(level: LogLevel, message: string, ...args: unknown[]): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

export interface LoggerOptions {
  level?: LogLevel;
  enableColors?: boolean;
  enableTimestamp?: boolean;
  format?: LogFormat;
}

export interface LogFormat {
  timestamp?: boolean;
  colors?: boolean;
  prefix?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  args: unknown[];
}

/**
 * File logging configuration options
 */
export interface FileLoggingConfig {
  /** Output file path */
  filePath: string;
  /** Maximum file size in bytes before rotation (default: 10MB) */
  maxFileSize?: number;
  /** Maximum number of backup files to keep (default: 5) */
  maxBackupFiles?: number;
  /** Log format: 'json' | 'text' (default: 'text') */
  format?: 'json' | 'text';
  /** Enable automatic log rotation (default: true) */
  enableRotation?: boolean;
  /** Write logs asynchronously (default: true) */
  async?: boolean;
}

/**
 * Enhanced logger interface with file logging capabilities
 */
export interface IEnhancedLogger extends ILogger {
  enableFileLogging(config: FileLoggingConfig): Promise<void>;
  disableFileLogging(): Promise<void>;
  rotateLogs(): Promise<void>;
  getLogStats(): Promise<LogStats>;
  isFileLoggingEnabled(): boolean;
  cleanup(): Promise<void>;
}

/**
 * Log statistics
 */
export interface LogStats {
  totalEntries: number;
  currentFileSize: number;
  rotationCount: number;
  lastRotation?: Date;
  isRotationNeeded: boolean;
}

/**
 * Logger strategy interface for different output methods
 */
export interface ILoggerStrategy {
  write(entry: LogEntry): Promise<void>;
  cleanup(): Promise<void>;
}
