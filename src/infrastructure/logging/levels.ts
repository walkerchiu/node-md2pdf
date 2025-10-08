/**
 * Log level definitions and utilities
 */

import type { LogLevel } from './types';

export const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export const LOG_COLORS: Record<LogLevel, string> = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m', // Yellow
  info: '\x1b[36m', // Cyan
  debug: '\x1b[37m', // White
};

export const RESET_COLOR = '\x1b[0m';

export function shouldLog(
  currentLevel: LogLevel,
  messageLevel: LogLevel,
): boolean {
  return LOG_LEVELS[messageLevel] <= LOG_LEVELS[currentLevel];
}

export function formatLevel(
  level: LogLevel,
  useColors: boolean = false,
): string {
  const levelStr = level.toUpperCase().padEnd(5);
  if (useColors) {
    return `${LOG_COLORS[level]}${levelStr}${RESET_COLOR}`;
  }
  return levelStr;
}
