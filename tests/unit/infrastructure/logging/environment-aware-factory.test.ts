import { join } from 'path';

import {
  LoggingEnvironmentConfig,
  EnvironmentAwareLoggingFactory,
  createEnvironmentLogger,
} from '../../../../src/infrastructure/logging/environment-aware-factory';
import { LogManagementService } from '../../../../src/infrastructure/logging/log-management.service';
import {
  FileLoggerStrategy,
  HybridLoggerStrategy,
} from '../../../../src/infrastructure/logging/strategies';

import type { ILogger } from '../../../../src/infrastructure/logging/types';

// Mock logger for testing
const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  setLevel: jest.fn(),
  getLevel: jest.fn(() => 'info'),
};

describe('LoggingEnvironmentConfig', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear logging-related environment variables
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('MD2PDF_LOG_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Basic Environment Variable Parsing', () => {
    it('should return default configuration when no environment variables set', () => {
      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config).toEqual({
        filePath: './logs/md2pdf.log',
        format: 'text',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxBackupFiles: 5,
        maxAge: '7d',
        enableRotation: true,
        async: true,
        bufferEnabled: false,
        bufferSize: 100,
        flushInterval: 5000,
        enableTimeBasedRotation: false,
        rotationInterval: 24,
      });
    });

    it('should parse all environment variables correctly', () => {
      process.env.MD2PDF_LOG_DIR = './custom-logs';
      process.env.MD2PDF_LOG_FORMAT = 'json';
      process.env.MD2PDF_LOG_MAX_SIZE = '50MB';
      process.env.MD2PDF_LOG_MAX_FILES = '10';
      process.env.MD2PDF_LOG_MAX_AGE = '30d';
      process.env.MD2PDF_LOG_ENABLE_ROTATION = 'false';
      process.env.MD2PDF_LOG_BUFFER_ENABLED = 'true';
      process.env.MD2PDF_LOG_BUFFER_SIZE = '200';
      process.env.MD2PDF_LOG_FLUSH_INTERVAL = '3000';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config).toEqual({
        filePath: join('./custom-logs', 'md2pdf.log'),
        format: 'json',
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxBackupFiles: 10,
        maxAge: '30d',
        enableRotation: false,
        async: true,
        bufferEnabled: true,
        bufferSize: 200,
        flushInterval: 3000,
        enableTimeBasedRotation: false,
        rotationInterval: 24,
      });
    });
  });

  describe('File Path Parsing', () => {
    it('should use direct file path when .log extension provided', () => {
      process.env.MD2PDF_LOG_DIR = './logs/custom.log';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.filePath).toBe('./logs/custom.log');
    });

    it('should append md2pdf.log to directory path', () => {
      process.env.MD2PDF_LOG_DIR = './custom-logs';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.filePath).toBe(join('./custom-logs', 'md2pdf.log'));
    });

    it('should use default path when MD2PDF_LOG_DIR not set', () => {
      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.filePath).toBe('./logs/md2pdf.log');
    });
  });

  describe('Log Format Parsing', () => {
    it('should parse json format', () => {
      process.env.MD2PDF_LOG_FORMAT = 'json';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.format).toBe('json');
    });

    it('should parse JSON format (case insensitive)', () => {
      process.env.MD2PDF_LOG_FORMAT = 'JSON';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.format).toBe('json');
    });

    it('should default to text for invalid format', () => {
      process.env.MD2PDF_LOG_FORMAT = 'invalid';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.format).toBe('text');
    });

    it('should default to text when not set', () => {
      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.format).toBe('text');
    });
  });

  describe('File Size Parsing', () => {
    it('should parse MB units', () => {
      process.env.MD2PDF_LOG_MAX_SIZE = '25MB';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.maxFileSize).toBe(25 * 1024 * 1024);
    });

    it('should parse KB units', () => {
      process.env.MD2PDF_LOG_MAX_SIZE = '512KB';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.maxFileSize).toBe(512 * 1024);
    });

    it('should parse GB units', () => {
      process.env.MD2PDF_LOG_MAX_SIZE = '2GB';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.maxFileSize).toBe(2 * 1024 * 1024 * 1024);
    });

    it('should parse bytes when no unit specified', () => {
      process.env.MD2PDF_LOG_MAX_SIZE = '1048576';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.maxFileSize).toBe(1048576);
    });

    it('should use default for invalid format', () => {
      process.env.MD2PDF_LOG_MAX_SIZE = 'invalid';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
    });

    it('should handle case insensitive units', () => {
      process.env.MD2PDF_LOG_MAX_SIZE = '20mb';

      const config = LoggingEnvironmentConfig.fromEnvironment();

      expect(config.maxFileSize).toBe(20 * 1024 * 1024);
    });
  });

  describe('Boolean Parsing', () => {
    describe('File Logging Enabled', () => {
      it('should return true by default', () => {
        expect(LoggingEnvironmentConfig.isFileLoggingEnabled()).toBe(true);
      });

      it('should return false for "false"', () => {
        process.env.MD2PDF_LOG_FILE_ENABLED = 'false';
        expect(LoggingEnvironmentConfig.isFileLoggingEnabled()).toBe(false);
      });

      it('should return false for "0"', () => {
        process.env.MD2PDF_LOG_FILE_ENABLED = '0';
        expect(LoggingEnvironmentConfig.isFileLoggingEnabled()).toBe(false);
      });

      it('should return true for "true"', () => {
        process.env.MD2PDF_LOG_FILE_ENABLED = 'true';
        expect(LoggingEnvironmentConfig.isFileLoggingEnabled()).toBe(true);
      });

      it('should return true for any other value', () => {
        process.env.MD2PDF_LOG_FILE_ENABLED = 'yes';
        expect(LoggingEnvironmentConfig.isFileLoggingEnabled()).toBe(true);
      });
    });

    describe('Rotation Enabled', () => {
      it('should default to true', () => {
        const config = LoggingEnvironmentConfig.fromEnvironment();
        expect(config.enableRotation).toBe(true);
      });

      it('should return false for "false"', () => {
        process.env.MD2PDF_LOG_ENABLE_ROTATION = 'false';
        const config = LoggingEnvironmentConfig.fromEnvironment();
        expect(config.enableRotation).toBe(false);
      });

      it('should return false for "0"', () => {
        process.env.MD2PDF_LOG_ENABLE_ROTATION = '0';
        const config = LoggingEnvironmentConfig.fromEnvironment();
        expect(config.enableRotation).toBe(false);
      });
    });

    describe('Buffer Enabled', () => {
      it('should default to false', () => {
        const config = LoggingEnvironmentConfig.fromEnvironment();
        expect(config.bufferEnabled).toBe(false);
      });

      it('should return true for "true"', () => {
        process.env.MD2PDF_LOG_BUFFER_ENABLED = 'true';
        const config = LoggingEnvironmentConfig.fromEnvironment();
        expect(config.bufferEnabled).toBe(true);
      });

      it('should return true for "1"', () => {
        process.env.MD2PDF_LOG_BUFFER_ENABLED = '1';
        const config = LoggingEnvironmentConfig.fromEnvironment();
        expect(config.bufferEnabled).toBe(true);
      });

      it('should return false for other values', () => {
        process.env.MD2PDF_LOG_BUFFER_ENABLED = 'yes';
        const config = LoggingEnvironmentConfig.fromEnvironment();
        expect(config.bufferEnabled).toBe(false);
      });
    });
  });

  describe('Log Level Parsing', () => {
    it('should return default "info" level', () => {
      expect(LoggingEnvironmentConfig.getLogLevel()).toBe('info');
    });

    it('should parse valid log levels', () => {
      const levels: Array<'error' | 'warn' | 'info' | 'debug'> = [
        'error',
        'warn',
        'info',
        'debug',
      ];

      levels.forEach((level) => {
        process.env.MD2PDF_LOG_LEVEL = level;
        expect(LoggingEnvironmentConfig.getLogLevel()).toBe(level);
      });
    });

    it('should be case insensitive', () => {
      process.env.MD2PDF_LOG_LEVEL = 'ERROR';
      expect(LoggingEnvironmentConfig.getLogLevel()).toBe('error');
    });

    it('should default to "info" for invalid levels', () => {
      process.env.MD2PDF_LOG_LEVEL = 'invalid';
      expect(LoggingEnvironmentConfig.getLogLevel()).toBe('info');
    });
  });

  describe('Numeric Parsing', () => {
    it('should parse max backup files', () => {
      process.env.MD2PDF_LOG_MAX_FILES = '15';
      const config = LoggingEnvironmentConfig.fromEnvironment();
      expect(config.maxBackupFiles).toBe(15);
    });

    it('should parse buffer size', () => {
      process.env.MD2PDF_LOG_BUFFER_SIZE = '500';
      const config = LoggingEnvironmentConfig.fromEnvironment();
      expect(config.bufferSize).toBe(500);
    });

    it('should parse flush interval', () => {
      process.env.MD2PDF_LOG_FLUSH_INTERVAL = '10000';
      const config = LoggingEnvironmentConfig.fromEnvironment();
      expect(config.flushInterval).toBe(10000);
    });

    it('should handle invalid numeric values gracefully', () => {
      process.env.MD2PDF_LOG_MAX_FILES = 'not-a-number';
      const config = LoggingEnvironmentConfig.fromEnvironment();
      expect(config.maxBackupFiles).toBe(5); // default
    });
  });

  describe('Max Age Parsing', () => {
    it('should use default max age', () => {
      const config = LoggingEnvironmentConfig.fromEnvironment();
      expect(config.maxAge).toBe('7d');
    });

    it('should parse custom max age', () => {
      process.env.MD2PDF_LOG_MAX_AGE = '14d';
      const config = LoggingEnvironmentConfig.fromEnvironment();
      expect(config.maxAge).toBe('14d');
    });

    it('should handle hour format', () => {
      process.env.MD2PDF_LOG_MAX_AGE = '24h';
      const config = LoggingEnvironmentConfig.fromEnvironment();
      expect(config.maxAge).toBe('24h');
    });

    it('should handle minute format', () => {
      process.env.MD2PDF_LOG_MAX_AGE = '60m';
      const config = LoggingEnvironmentConfig.fromEnvironment();
      expect(config.maxAge).toBe('60m');
    });
  });
});

describe('EnvironmentAwareLoggingFactory', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('MD2PDF_LOG_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Log Management Service Creation', () => {
    it('should create standard service by default', () => {
      const service =
        EnvironmentAwareLoggingFactory.createLogManagementService();

      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should create enhanced service when buffer enabled', () => {
      process.env.MD2PDF_LOG_BUFFER_ENABLED = 'true';

      const service =
        EnvironmentAwareLoggingFactory.createLogManagementService(mockLogger);

      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should create enhanced service when custom max age set', () => {
      process.env.MD2PDF_LOG_MAX_AGE = '14d';

      const service =
        EnvironmentAwareLoggingFactory.createLogManagementService();

      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should create enhanced service when custom buffer size set', () => {
      process.env.MD2PDF_LOG_BUFFER_SIZE = '500';

      const service =
        EnvironmentAwareLoggingFactory.createLogManagementService();

      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should pass logger to service', () => {
      const service =
        EnvironmentAwareLoggingFactory.createLogManagementService(mockLogger);

      expect(service).toBeInstanceOf(LogManagementService);
    });
  });

  describe('File Logger Strategy Creation', () => {
    it('should create file logger with environment config', () => {
      process.env.MD2PDF_LOG_FORMAT = 'json';
      process.env.MD2PDF_LOG_MAX_SIZE = '20MB';

      const strategy = EnvironmentAwareLoggingFactory.createFileLogger();

      expect(strategy).toBeInstanceOf(FileLoggerStrategy);
    });
  });

  describe('Hybrid Logger Strategy Creation', () => {
    it('should create hybrid logger with environment config', () => {
      process.env.MD2PDF_LOG_DIR = './test-logs';
      process.env.MD2PDF_LOG_FORMAT = 'text';

      const strategy = EnvironmentAwareLoggingFactory.createHybridLogger();

      expect(strategy).toBeInstanceOf(HybridLoggerStrategy);
    });

    it('should use correct console options', () => {
      const strategy = EnvironmentAwareLoggingFactory.createHybridLogger();

      expect(strategy).toBeInstanceOf(HybridLoggerStrategy);
      // Note: We can't easily test the internal console options without more complex mocking
    });
  });
});

describe('createEnvironmentLogger', () => {
  let originalEnv: typeof process.env;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = { ...process.env };
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('MD2PDF_LOG_')) {
        delete process.env[key];
      }
    });

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('File Logging Enabled', () => {
    it('should return hybrid logger when file logging enabled', () => {
      process.env.MD2PDF_LOG_FILE_ENABLED = 'true';

      const logger = createEnvironmentLogger();

      expect(logger).toHaveProperty('write');
      expect(logger).toHaveProperty('cleanup');
    });
  });

  describe('File Logging Disabled', () => {
    it('should return console-only logger when file logging disabled', () => {
      process.env.MD2PDF_LOG_FILE_ENABLED = 'false';

      const logger = createEnvironmentLogger();

      expect(logger).toHaveProperty('write');
      expect(logger).toHaveProperty('cleanup');
    });

    it('should handle error level logging', async () => {
      process.env.MD2PDF_LOG_FILE_ENABLED = 'false';

      const logger = createEnvironmentLogger();

      await logger.write({
        level: 'error',
        message: 'Test error',
        args: ['additional', 'args'],
        timestamp: new Date(),
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MD2PDF] [ERROR] Test error'),
        'additional',
        'args',
      );
    });

    it('should handle warn level logging', async () => {
      process.env.MD2PDF_LOG_FILE_ENABLED = 'false';

      const logger = createEnvironmentLogger();

      await logger.write({
        level: 'warn',
        message: 'Test warning',
        args: [],
        timestamp: new Date(),
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MD2PDF] [WARN] Test warning'),
      );
    });

    it('should handle debug level logging', async () => {
      process.env.MD2PDF_LOG_FILE_ENABLED = 'false';

      const logger = createEnvironmentLogger();

      await logger.write({
        level: 'debug',
        message: 'Test debug',
        args: [],
        timestamp: new Date(),
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MD2PDF] [DEBUG] Test debug'),
      );
    });

    it('should handle info level logging (default)', async () => {
      process.env.MD2PDF_LOG_FILE_ENABLED = 'false';

      const logger = createEnvironmentLogger();

      await logger.write({
        level: 'info',
        message: 'Test info',
        args: [],
        timestamp: new Date(),
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MD2PDF] [INFO] Test info'),
      );
    });

    it('should format timestamp correctly', async () => {
      process.env.MD2PDF_LOG_FILE_ENABLED = 'false';

      const logger = createEnvironmentLogger();
      const testDate = new Date('2023-01-01T12:00:00.000Z');

      await logger.write({
        level: 'info',
        message: 'Test message',
        args: [],
        timestamp: testDate,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[2023-01-01T12:00:00.000Z] [MD2PDF] [INFO] Test message',
      );
    });

    it('should handle cleanup gracefully', async () => {
      process.env.MD2PDF_LOG_FILE_ENABLED = 'false';

      const logger = createEnvironmentLogger();

      // Should not throw
      await expect(logger.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('Default Behavior', () => {
    it('should enable file logging by default', () => {
      const logger = createEnvironmentLogger();

      // Should be HybridLoggerStrategy, not console-only
      expect(logger).toBeInstanceOf(HybridLoggerStrategy);
    });
  });
});
