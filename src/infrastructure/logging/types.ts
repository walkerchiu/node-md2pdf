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
  // Additional metadata fields (optional for backward compatibility)
  processId?: number;
  writeStartTime?: number;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
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
  /** Maximum file age before cleanup (default: '7d') */
  maxAge?: string;
  /** Enable time-based rotation (default: false) */
  enableTimeBasedRotation?: boolean;
  /** Time interval for rotation in hours (default: 24) */
  rotationInterval?: number;
  /** Enable write buffering for performance (default: false) */
  bufferEnabled?: boolean;
  /** Buffer size in number of entries (default: 100) */
  bufferSize?: number;
  /** Buffer flush interval in milliseconds (default: 5000) */
  flushInterval?: number;
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

  // Buffering features (optional, not all strategies need to implement)
  getBufferSize?(): number;
  flush?(): Promise<void>;

  // Rotation features (optional, mainly for file-based strategies)
  rotate?(): Promise<void>;
  rotateByTime?(): Promise<void>;

  // Maintenance features (optional, mainly for file-based strategies)
  cleanupOldLogs?(maxAge: string): Promise<number>;

  // Statistics (optional, mainly for file-based strategies)
  getStats?(): LogStats;
}
