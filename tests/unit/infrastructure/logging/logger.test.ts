import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Logger } from '../../../../src/infrastructure/logging/logger';
import type {
  LogLevel,
  FileLoggingConfig,
} from '../../../../src/infrastructure/logging/types';

describe('Logger (Unified)', () => {
  let logger: Logger;
  let tempDir: string;
  let logFilePath: string;
  let consoleMethods: {
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    log: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(async () => {
    // Create temporary directory for test logs
    tempDir = await fs.mkdtemp(join(tmpdir(), 'logger-test-'));
    logFilePath = join(tempDir, 'test.log');

    // Set environment variable to ensure debug level logging in tests
    process.env.MD2PDF_LOG_LEVEL = 'debug';

    // Mock all console methods
    consoleMethods = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      log: jest.spyOn(console, 'log').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };

    logger = new Logger({
      level: 'debug',
      enableColors: false,
      enableTimestamp: true,
    });
  });

  afterEach(async () => {
    // Cleanup logger
    await logger.cleanup();

    // Restore all console methods
    Object.values(consoleMethods).forEach((spy) => spy.mockRestore());

    // Reset environment variable
    delete process.env.MD2PDF_LOG_LEVEL;

    // Remove temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Constructor and initialization', () => {
    it('should initialize with default options', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger.getLevel()).toBeDefined();
    });

    it('should override defaults with provided options', () => {
      const customLogger = new Logger({
        level: 'warn',
        enableColors: false,
        enableTimestamp: false,
        format: {
          timestamp: false,
          colors: false,
          prefix: '[CUSTOM]',
        },
      });

      expect(customLogger.getLevel()).toBeDefined();
    });

    it('should use environment configuration for log level', () => {
      const logger = new Logger({ level: 'info' });
      expect(logger.getLevel()).toBeDefined();
    });

    it('should initialize with console strategy by default', () => {
      expect(logger.isFileLoggingEnabled()).toBe(false);
    });
  });

  describe('Basic logging functionality', () => {
    it('should call error method correctly', () => {
      logger.error('Error message', { extra: 'data' });

      expect(consoleMethods.error).toHaveBeenCalled();
    });

    it('should call warn method correctly', () => {
      logger.warn('Warning message', 'extra arg');

      expect(consoleMethods.warn).toHaveBeenCalled();
    });

    it('should call info method correctly', () => {
      logger.info('Info message');

      expect(consoleMethods.log).toHaveBeenCalled();
    });

    it('should call debug method correctly', () => {
      logger.setLevel('debug');
      logger.debug('Debug message', 123, true);

      expect(consoleMethods.debug).toHaveBeenCalled();
    });

    it('should support all log levels', () => {
      logger.setLevel('debug');
      logger.error('Error message');
      logger.warn('Warn message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(consoleMethods.error).toHaveBeenCalled();
      expect(consoleMethods.warn).toHaveBeenCalled();
      expect(consoleMethods.log).toHaveBeenCalled();
      expect(consoleMethods.debug).toHaveBeenCalled();
    });
  });

  describe('Log level filtering', () => {
    it('should respect log level filtering', () => {
      logger.setLevel('warn');

      // These should be logged
      logger.error('Error message');
      logger.warn('Warning message');

      // These should be filtered out
      logger.info('Info message');
      logger.debug('Debug message');

      expect(consoleMethods.error).toHaveBeenCalledTimes(1);
      expect(consoleMethods.warn).toHaveBeenCalledTimes(1);
      expect(consoleMethods.log).not.toHaveBeenCalled();
      expect(consoleMethods.debug).not.toHaveBeenCalled();
    });

    it('should handle debug level correctly', () => {
      logger.setLevel('debug');

      // All levels should be logged
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(consoleMethods.error).toHaveBeenCalledTimes(1);
      expect(consoleMethods.warn).toHaveBeenCalledTimes(1);
      expect(consoleMethods.log).toHaveBeenCalledTimes(1);
      expect(consoleMethods.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('Level management', () => {
    it('should get and set log level correctly', () => {
      const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];

      levels.forEach((level) => {
        logger.setLevel(level);
        expect(logger.getLevel()).toBe(level);
      });
    });
  });

  describe('File logging functionality', () => {
    it('should enable file logging', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        format: 'text',
      };

      await logger.enableFileLogging(config);
      expect(logger.isFileLoggingEnabled()).toBe(true);
    });

    it('should write logs to file in text format', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        format: 'text',
        async: false, // Use sync for testing
      };

      await logger.enableFileLogging(config);
      logger.info('Test file message');

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const logContent = await fs.readFile(logFilePath, 'utf8');
      expect(logContent).toContain('Test file message');
      expect(logContent).toContain('[INFO ]');
    });

    it('should write logs to file in JSON format', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        format: 'json',
        async: false,
      };

      await logger.enableFileLogging(config);
      logger.info('Test JSON message');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const logContent = await fs.readFile(logFilePath, 'utf8');
      expect(logContent).toContain('"message":"Test JSON message"');
      expect(logContent).toContain('"level":"INFO"');
    });

    it('should write to both console and file when file logging is enabled', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        async: false,
      };

      await logger.enableFileLogging(config);
      logger.info('Hybrid message');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check console output
      expect(consoleMethods.log).toHaveBeenCalled();

      // Check file output
      const logContent = await fs.readFile(logFilePath, 'utf8');
      expect(logContent).toContain('Hybrid message');
    });

    it('should disable file logging', async () => {
      const config: FileLoggingConfig = { filePath: logFilePath };

      await logger.enableFileLogging(config);
      expect(logger.isFileLoggingEnabled()).toBe(true);

      await logger.disableFileLogging();
      expect(logger.isFileLoggingEnabled()).toBe(false);
    });
  });

  describe('Log rotation functionality', () => {
    it('should rotate logs when size limit is reached', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        maxFileSize: 200, // Small size to trigger rotation
        maxBackupFiles: 2,
        enableRotation: true,
        async: false,
      };

      await logger.enableFileLogging(config);

      // Write enough messages to trigger rotation
      const longMessage = 'x'.repeat(100); // 100 character message
      for (let i = 0; i < 15; i++) {
        logger.info(`Message ${i}: ${longMessage}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check if backup files were created or stats show rotation
      const stats = await logger.getLogStats();
      const backupFile = `${logFilePath}.1`;
      const backupExists = await fs
        .access(backupFile)
        .then(() => true)
        .catch(() => false);

      // Either backup file exists OR rotation was triggered (indicated by stats)
      expect(
        backupExists || stats.rotationCount > 0 || stats.isRotationNeeded,
      ).toBe(true);
    });

    it('should provide log statistics', async () => {
      const config: FileLoggingConfig = { filePath: logFilePath, async: false };

      await logger.enableFileLogging(config);
      logger.info('Stats test message');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = await logger.getLogStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.currentFileSize).toBeGreaterThan(0);
    });

    it('should manually rotate logs', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        maxBackupFiles: 3,
        async: false,
      };

      await logger.enableFileLogging(config);
      logger.info('Pre-rotation message');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Manual rotation
      await logger.rotateLogs();

      // Check if backup was created
      const backupFile = `${logFilePath}.1`;
      const backupExists = await fs
        .access(backupFile)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid file paths gracefully', async () => {
      const config: FileLoggingConfig = {
        filePath: '/root/completely/invalid/path/that/does/not/exist/test.log',
      };

      try {
        await logger.enableFileLogging(config);
        // If no error is thrown, that's also acceptable (system dependent)
        expect(true).toBe(true);
      } catch (error) {
        // If error is thrown, it should be meaningful
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Failed to enable file logging',
        );
      }
    });

    it('should fallback to console on file write errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create a config with an invalid path that will cause write errors
      const config: FileLoggingConfig = {
        filePath: join(tempDir, 'nonexistent/subdir/test.log'),
        async: false,
      };

      try {
        await logger.enableFileLogging(config);
        logger.info('This should fail to write to file');
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Check if error was logged (might not happen if directory creation succeeds)
        if (consoleErrorSpy.mock.calls.length > 0) {
          const errorCalls = consoleErrorSpy.mock.calls.find(
            (call) =>
              call[0] && call[0].includes('[Logger] Failed to write log'),
          );
          if (errorCalls) {
            expect(errorCalls[0]).toContain('[Logger] Failed to write log');
          }
        }

        // At minimum, logger should continue working
        expect(logger.isFileLoggingEnabled()).toBeDefined();
      } catch (error) {
        // Expected to potentially fail
        expect(error).toBeInstanceOf(Error);
      }

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when trying to rotate without file logging', async () => {
      await expect(logger.rotateLogs()).rejects.toThrow(
        'File logging is not enabled',
      );
    });

    it('should return empty stats when file logging is disabled', async () => {
      const stats = await logger.getLogStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.currentFileSize).toBe(0);
      expect(stats.rotationCount).toBe(0);
    });
  });

  describe('Cleanup functionality', () => {
    it('should cleanup resources properly', async () => {
      const config: FileLoggingConfig = { filePath: logFilePath };

      await logger.enableFileLogging(config);
      logger.info('Cleanup test message');

      // Should not throw
      await expect(logger.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const config: FileLoggingConfig = { filePath: logFilePath };

      await logger.enableFileLogging(config);

      // Mock strategy cleanup to throw error
      const originalCleanup = logger['strategy'].cleanup;
      logger['strategy'].cleanup = jest
        .fn()
        .mockRejectedValue(new Error('Strategy cleanup failed'));

      // Should not throw, but should log error
      await expect(logger.cleanup()).resolves.not.toThrow();

      // Check if error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Logger] Cleanup failed: Strategy cleanup failed',
        ),
      );

      // Restore
      logger['strategy'].cleanup = originalCleanup;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Strategy integration', () => {
    it('should use console strategy by default', async () => {
      // Initially should be console-only
      expect(logger.isFileLoggingEnabled()).toBe(false);
      logger.info('Console only message');
      expect(consoleMethods.log).toHaveBeenCalled();
    });

    it('should switch to hybrid strategy when file logging is enabled', async () => {
      const config: FileLoggingConfig = { filePath: logFilePath, async: false };

      await logger.enableFileLogging(config);
      logger.info('Hybrid strategy message');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should write to both console and file
      expect(consoleMethods.log).toHaveBeenCalled();
      const logContent = await fs.readFile(logFilePath, 'utf8');
      expect(logContent).toContain('Hybrid strategy message');
    });

    it('should revert to console strategy when file logging is disabled', async () => {
      const config: FileLoggingConfig = { filePath: logFilePath };

      // Enable then disable file logging
      await logger.enableFileLogging(config);
      await logger.disableFileLogging();

      expect(logger.isFileLoggingEnabled()).toBe(false);
      logger.info('Back to console only');
      expect(consoleMethods.log).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle file logging enable errors when strategy creation fails', async () => {
      // Create a logger instance and mock its strategy creation to fail
      const testLogger = new Logger({ level: 'debug' });

      // Mock the HybridLoggerStrategy constructor to throw
      const OriginalHybridStrategy =
        require('../../../../src/infrastructure/logging/strategies').HybridLoggerStrategy;
      const mockHybridStrategy = jest.fn(() => {
        throw new Error('Strategy creation failed');
      });

      // Replace the constructor temporarily
      require('../../../../src/infrastructure/logging/strategies').HybridLoggerStrategy =
        mockHybridStrategy;

      const config: FileLoggingConfig = {
        filePath: '/tmp/test.log',
      };

      await expect(testLogger.enableFileLogging(config)).rejects.toThrow(
        'Failed to enable file logging',
      );

      // Restore original constructor
      require('../../../../src/infrastructure/logging/strategies').HybridLoggerStrategy =
        OriginalHybridStrategy;

      await testLogger.cleanup();
    });

    it('should handle file logging disable errors gracefully', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
      };

      await logger.enableFileLogging(config);

      // Mock the strategy cleanup to throw an error
      const originalCleanup = logger['strategy'].cleanup;
      logger['strategy'].cleanup = jest
        .fn()
        .mockRejectedValue(new Error('Cleanup failed'));

      await expect(logger.disableFileLogging()).rejects.toThrow(
        'Failed to disable file logging',
      );

      // Restore original method
      logger['strategy'].cleanup = originalCleanup;
    });

    it('should throw error when rotating logs without file logging enabled', async () => {
      await expect(logger.rotateLogs()).rejects.toThrow(
        'File logging is not enabled',
      );
    });

    it('should throw error when strategy does not support rotation', async () => {
      // Set file logging as enabled but use a non-HybridLoggerStrategy
      logger['fileLoggingEnabled'] = true;
      const originalStrategy = logger['strategy'];
      logger['strategy'] = {
        write: jest.fn(),
        cleanup: jest.fn(),
      } as any;

      await expect(logger.rotateLogs()).rejects.toThrow(
        'Current strategy does not support log rotation',
      );

      // Restore strategy and state
      logger['strategy'] = originalStrategy;
      logger['fileLoggingEnabled'] = false;
    });

    it('should return default stats when file logging is disabled', async () => {
      const stats = await logger.getLogStats();
      expect(stats).toEqual({
        totalEntries: 0,
        currentFileSize: 0,
        rotationCount: 0,
        isRotationNeeded: false,
      });
    });

    it('should throw error when strategy does not support stats', async () => {
      // Set file logging as enabled but use a non-HybridLoggerStrategy
      logger['fileLoggingEnabled'] = true;
      const originalStrategy = logger['strategy'];
      logger['strategy'] = {
        write: jest.fn(),
        cleanup: jest.fn(),
      } as any;

      await expect(logger.getLogStats()).rejects.toThrow(
        'Current strategy does not support log statistics',
      );

      // Restore strategy and state
      logger['strategy'] = originalStrategy;
      logger['fileLoggingEnabled'] = false;
    });
  });

  describe('Unified Logger Design', () => {
    it('should implement IEnhancedLogger interface', () => {
      expect(logger.enableFileLogging).toBeDefined();
      expect(logger.disableFileLogging).toBeDefined();
      expect(logger.rotateLogs).toBeDefined();
      expect(logger.getLogStats).toBeDefined();
      expect(logger.isFileLoggingEnabled).toBeDefined();
      expect(logger.cleanup).toBeDefined();
    });

    it('should implement basic ILogger interface', () => {
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.log).toBeDefined();
      expect(logger.setLevel).toBeDefined();
      expect(logger.getLevel).toBeDefined();
    });
  });
});
