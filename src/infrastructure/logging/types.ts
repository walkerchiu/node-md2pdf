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
