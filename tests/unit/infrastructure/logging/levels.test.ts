/**
 * levels tests
 */

import {
  LOG_LEVELS,
  LOG_COLORS,
  RESET_COLOR,
  shouldLog,
  formatLevel,
} from '../../../../src/infrastructure/logging/levels';
import type { LogLevel } from '../../../../src/infrastructure/logging/types';

describe('levels', () => {
  describe('Constants', () => {
    it('should define LOG_LEVELS with correct numeric values', () => {
      expect(LOG_LEVELS).toEqual({
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
      });
    });

    it('should define LOG_COLORS with ANSI color codes', () => {
      expect(LOG_COLORS).toEqual({
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        info: '\x1b[36m', // Cyan
        debug: '\x1b[37m', // White
      });
    });

    it('should define RESET_COLOR as ANSI reset code', () => {
      expect(RESET_COLOR).toBe('\x1b[0m');
    });
  });

  describe('shouldLog function', () => {
    it('should return true when message level is less than or equal to current level', () => {
      // Error level (0) should log for all current levels
      expect(shouldLog('error', 'error')).toBe(true);
      expect(shouldLog('warn', 'error')).toBe(true);
      expect(shouldLog('info', 'error')).toBe(true);
      expect(shouldLog('debug', 'error')).toBe(true);

      // Warn level (1) should log for warn, info, debug current levels
      expect(shouldLog('error', 'warn')).toBe(false);
      expect(shouldLog('warn', 'warn')).toBe(true);
      expect(shouldLog('info', 'warn')).toBe(true);
      expect(shouldLog('debug', 'warn')).toBe(true);

      // Info level (2) should log for info, debug current levels
      expect(shouldLog('error', 'info')).toBe(false);
      expect(shouldLog('warn', 'info')).toBe(false);
      expect(shouldLog('info', 'info')).toBe(true);
      expect(shouldLog('debug', 'info')).toBe(true);

      // Debug level (3) should only log for debug current level
      expect(shouldLog('error', 'debug')).toBe(false);
      expect(shouldLog('warn', 'debug')).toBe(false);
      expect(shouldLog('info', 'debug')).toBe(false);
      expect(shouldLog('debug', 'debug')).toBe(true);
    });
  });

  describe('formatLevel function', () => {
    it('should format level without colors by default', () => {
      expect(formatLevel('error')).toBe('ERROR');
      expect(formatLevel('warn')).toBe('WARN ');
      expect(formatLevel('info')).toBe('INFO ');
      expect(formatLevel('debug')).toBe('DEBUG');
    });

    it('should format level without colors when useColors is false', () => {
      expect(formatLevel('error', false)).toBe('ERROR');
      expect(formatLevel('warn', false)).toBe('WARN ');
      expect(formatLevel('info', false)).toBe('INFO ');
      expect(formatLevel('debug', false)).toBe('DEBUG');
    });

    it('should format level with colors when useColors is true', () => {
      expect(formatLevel('error', true)).toBe(
        `${LOG_COLORS.error}ERROR${RESET_COLOR}`,
      );
      expect(formatLevel('warn', true)).toBe(
        `${LOG_COLORS.warn}WARN ${RESET_COLOR}`,
      );
      expect(formatLevel('info', true)).toBe(
        `${LOG_COLORS.info}INFO ${RESET_COLOR}`,
      );
      expect(formatLevel('debug', true)).toBe(
        `${LOG_COLORS.debug}DEBUG${RESET_COLOR}`,
      );
    });

    it('should pad level strings to 5 characters', () => {
      // Test that all levels are padded to exactly 5 characters
      const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];

      levels.forEach((level) => {
        const formatted = formatLevel(level, false);
        expect(formatted).toHaveLength(5);
      });
    });

    it('should handle all log levels correctly', () => {
      const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];

      levels.forEach((level) => {
        // Test without colors
        const withoutColors = formatLevel(level, false);
        expect(withoutColors).toBe(level.toUpperCase().padEnd(5));

        // Test with colors
        const withColors = formatLevel(level, true);
        expect(withColors).toBe(
          `${LOG_COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET_COLOR}`,
        );
      });
    });
  });

  describe('Integration tests', () => {
    it('should work together - shouldLog and formatLevel', () => {
      const currentLevel: LogLevel = 'info';
      const testCases: Array<{ level: LogLevel; shouldShow: boolean }> = [
        { level: 'error', shouldShow: true },
        { level: 'warn', shouldShow: true },
        { level: 'info', shouldShow: true },
        { level: 'debug', shouldShow: false },
      ];

      testCases.forEach(({ level, shouldShow }) => {
        const canLog = shouldLog(currentLevel, level);
        expect(canLog).toBe(shouldShow);

        if (canLog) {
          const formatted = formatLevel(level, true);
          expect(formatted).toContain(level.toUpperCase());
          expect(formatted).toContain(LOG_COLORS[level]);
          expect(formatted).toContain(RESET_COLOR);
        }
      });
    });
  });
});
