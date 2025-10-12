/**
 * Unit tests for logging types
 * Tests the structure and validity of logging-related type definitions
 */

import {
  ILogger,
  IEnhancedLogger,
  ILoggerStrategy,
  LogLevel,
  LoggerOptions,
  LogFormat,
  LogEntry,
  FileLoggingConfig,
  LogStats,
} from '../../../../src/infrastructure/logging/types';

describe('Logging Types', () => {
  describe('LogLevel', () => {
    it('should support all standard log levels', () => {
      const validLevels: LogLevel[] = ['error', 'warn', 'info', 'debug'];

      validLevels.forEach((level) => {
        expect(['error', 'warn', 'info', 'debug']).toContain(level);
      });
    });
  });

  describe('LogFormat', () => {
    it('should have correct interface structure', () => {
      const logFormat: LogFormat = {
        timestamp: true,
        colors: false,
        prefix: '[TEST]',
      };

      expect(typeof logFormat.timestamp).toBe('boolean');
      expect(typeof logFormat.colors).toBe('boolean');
      expect(typeof logFormat.prefix).toBe('string');
    });

    it('should allow optional properties', () => {
      const minimalFormat: LogFormat = {};
      expect(minimalFormat).toBeDefined();

      const partialFormat: LogFormat = { timestamp: true };
      expect(partialFormat.timestamp).toBe(true);
      expect(partialFormat.colors).toBeUndefined();
      expect(partialFormat.prefix).toBeUndefined();
    });
  });

  describe('LoggerOptions', () => {
    it('should support logger configuration options', () => {
      const options: LoggerOptions = {
        level: 'info',
        format: {
          timestamp: true,
          colors: true,
          prefix: '[TEST]',
        },
        enableColors: true,
        enableTimestamp: true,
      };

      expect(options.level).toBe('info');
      expect(options.format).toBeDefined();
      expect(options.format?.prefix).toBe('[TEST]');
      expect(options.enableColors).toBe(true);
      expect(options.enableTimestamp).toBe(true);
    });

    it('should support minimal logger options', () => {
      const minimalOptions: Partial<LoggerOptions> = {
        level: 'error',
      };

      expect(minimalOptions.level).toBe('error');
      expect(minimalOptions.format).toBeUndefined();
    });
  });

  describe('LogEntry', () => {
    it('should support log entry structure', () => {
      const logEntry: LogEntry = {
        level: 'info',
        message: 'Test message',
        timestamp: new Date('2025-01-01T00:00:00Z'),
        args: ['arg1', { key: 'value' }, 123],
      };

      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('Test message');
      expect(logEntry.timestamp instanceof Date).toBe(true);
      expect(Array.isArray(logEntry.args)).toBe(true);
      expect(logEntry.args).toHaveLength(3);
    });

    it('should support log entry with empty args', () => {
      const logEntry: LogEntry = {
        level: 'warn',
        message: 'Warning message',
        timestamp: new Date(),
        args: [],
      };

      expect(logEntry.args).toHaveLength(0);
      expect(Array.isArray(logEntry.args)).toBe(true);
    });
  });

  describe('FileLoggingConfig', () => {
    it('should support complete file logging configuration', () => {
      const config: FileLoggingConfig = {
        filePath: '/logs/app.log',
        maxFileSize: 10485760, // 10MB
        maxBackupFiles: 5,
        format: 'json',
        enableRotation: true,
        async: true,
      };

      expect(config.filePath).toBe('/logs/app.log');
      expect(config.maxFileSize).toBe(10485760);
      expect(config.maxBackupFiles).toBe(5);
      expect(config.format).toBe('json');
      expect(config.enableRotation).toBe(true);
      expect(config.async).toBe(true);
    });

    it('should support minimal file logging configuration', () => {
      const minimalConfig: FileLoggingConfig = {
        filePath: '/logs/minimal.log',
      };

      expect(minimalConfig.filePath).toBe('/logs/minimal.log');
      expect(minimalConfig.maxFileSize).toBeUndefined();
      expect(minimalConfig.format).toBeUndefined();
      expect(minimalConfig.enableRotation).toBeUndefined();
      expect(minimalConfig.async).toBeUndefined();
    });

    it('should support text format configuration', () => {
      const textConfig: FileLoggingConfig = {
        filePath: '/logs/text.log',
        format: 'text',
        enableRotation: false,
        async: false,
      };

      expect(textConfig.format).toBe('text');
      expect(textConfig.enableRotation).toBe(false);
      expect(textConfig.async).toBe(false);
    });
  });

  describe('LogStats', () => {
    it('should support complete log statistics', () => {
      const stats: LogStats = {
        totalEntries: 1000,
        currentFileSize: 5242880, // 5MB
        rotationCount: 3,
        lastRotation: new Date('2025-01-01T12:00:00Z'),
        isRotationNeeded: false,
      };

      expect(stats.totalEntries).toBe(1000);
      expect(stats.currentFileSize).toBe(5242880);
      expect(stats.rotationCount).toBe(3);
      expect(stats.lastRotation instanceof Date).toBe(true);
      expect(stats.isRotationNeeded).toBe(false);
    });

    it('should support log statistics without last rotation', () => {
      const stats: LogStats = {
        totalEntries: 50,
        currentFileSize: 1024,
        rotationCount: 0,
        isRotationNeeded: true,
      };

      expect(stats.totalEntries).toBe(50);
      expect(stats.rotationCount).toBe(0);
      expect(stats.lastRotation).toBeUndefined();
      expect(stats.isRotationNeeded).toBe(true);
    });
  });

  describe('ILogger Interface', () => {
    it('should define basic logger methods', () => {
      // This test verifies that the ILogger interface has the expected shape
      // We can't instantiate interfaces directly, but we can create objects that implement them
      const mockLogger: ILogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
      };

      expect(typeof mockLogger.debug).toBe('function');
      expect(typeof mockLogger.info).toBe('function');
      expect(typeof mockLogger.warn).toBe('function');
      expect(typeof mockLogger.error).toBe('function');
      expect(typeof mockLogger.log).toBe('function');
      expect(typeof mockLogger.setLevel).toBe('function');
      expect(typeof mockLogger.getLevel).toBe('function');
    });
  });

  describe('IEnhancedLogger Interface', () => {
    it('should extend ILogger with additional methods', () => {
      const mockEnhancedLogger: IEnhancedLogger = {
        // Base ILogger methods
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
        // Enhanced methods
        enableFileLogging: jest.fn().mockResolvedValue(undefined),
        disableFileLogging: jest.fn().mockResolvedValue(undefined),
        rotateLogs: jest.fn().mockResolvedValue(undefined),
        getLogStats: jest.fn().mockResolvedValue({
          totalEntries: 0,
          currentFileSize: 0,
          rotationCount: 0,
          isRotationNeeded: false,
        }),
        isFileLoggingEnabled: jest.fn().mockReturnValue(false),
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      expect(typeof mockEnhancedLogger.enableFileLogging).toBe('function');
      expect(typeof mockEnhancedLogger.disableFileLogging).toBe('function');
      expect(typeof mockEnhancedLogger.rotateLogs).toBe('function');
      expect(typeof mockEnhancedLogger.getLogStats).toBe('function');
      expect(typeof mockEnhancedLogger.isFileLoggingEnabled).toBe('function');
      expect(typeof mockEnhancedLogger.cleanup).toBe('function');
    });
  });

  describe('ILoggerStrategy Interface', () => {
    it('should define strategy methods', () => {
      const mockStrategy: ILoggerStrategy = {
        write: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      expect(typeof mockStrategy.write).toBe('function');
      expect(typeof mockStrategy.cleanup).toBe('function');
    });
  });

  describe('Type compatibility', () => {
    it('should support log entry with different log levels', () => {
      const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];

      levels.forEach((level) => {
        const entry: LogEntry = {
          level,
          message: `Message for ${level}`,
          timestamp: new Date(),
          args: [],
        };

        expect(entry.level).toBe(level);
      });
    });

    it('should support file config with different formats', () => {
      const formats: ('text' | 'json')[] = ['text', 'json'];

      formats.forEach((format) => {
        const config: FileLoggingConfig = {
          filePath: `/logs/${format}.log`,
          format,
        };

        expect(config.format).toBe(format);
      });
    });
  });
});
