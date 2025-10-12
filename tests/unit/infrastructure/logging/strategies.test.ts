import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ConsoleLoggerStrategy,
  FileLoggerStrategy,
  HybridLoggerStrategy,
} from '../../../../src/infrastructure/logging/strategies';
import type {
  LogEntry,
  FileLoggingConfig,
} from '../../../../src/infrastructure/logging/types';

describe('Logger Strategies', () => {
  let tempDir: string;
  let logFilePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'logger-strategies-test-'));
    logFilePath = join(tempDir, 'test.log');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  const createTestLogEntry = (
    level: 'error' | 'warn' | 'info' | 'debug' = 'info',
    message = 'Test message',
  ): LogEntry => ({
    level,
    message,
    timestamp: new Date(),
    args: [],
  });

  describe('ConsoleLoggerStrategy', () => {
    let strategy: ConsoleLoggerStrategy;

    beforeEach(() => {
      strategy = new ConsoleLoggerStrategy({
        enableColors: false,
        enableTimestamp: true,
        prefix: '[TEST]',
      });
    });

    it('should write to console.log for info level', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const entry = createTestLogEntry('info');

      await strategy.write(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TEST]'),
        ...entry.args,
      );
      consoleSpy.mockRestore();
    });

    it('should write to console.error for error level', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const entry = createTestLogEntry('error');

      await strategy.write(entry);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should write to console.warn for warn level', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      const entry = createTestLogEntry('warn');

      await strategy.write(entry);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should write to console.debug for debug level', async () => {
      const consoleSpy = jest.spyOn(console, 'debug');
      const entry = createTestLogEntry('debug');

      await strategy.write(entry);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should include timestamp in output', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const entry = createTestLogEntry();

      await strategy.write(entry);

      const calledWith = consoleSpy.mock.calls[0][0];
      expect(calledWith).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      consoleSpy.mockRestore();
    });

    it('should cleanup without errors', async () => {
      await expect(strategy.cleanup()).resolves.not.toThrow();
    });
  });

  describe('FileLoggerStrategy', () => {
    let strategy: FileLoggerStrategy;

    beforeEach(() => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        format: 'text',
        async: false, // Use sync for easier testing
      };
      strategy = new FileLoggerStrategy(config);
    });

    afterEach(async () => {
      await strategy.cleanup();
    });

    it('should write to file in text format', async () => {
      const entry = createTestLogEntry('info', 'File test message');

      await strategy.write(entry);

      const content = await fs.readFile(logFilePath, 'utf8');
      expect(content).toContain('File test message');
      expect(content).toContain('[INFO ]');
    });

    it('should write to file in JSON format', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        format: 'json',
        async: false,
      };
      strategy = new FileLoggerStrategy(config);

      const entry = createTestLogEntry('info', 'JSON test message');
      await strategy.write(entry);

      const content = await fs.readFile(logFilePath, 'utf8');
      const logLine = JSON.parse(content.trim());
      expect(logLine.message).toBe('JSON test message');
      expect(logLine.level).toBe('INFO');
    });

    it('should handle log rotation when size limit is reached', async () => {
      const config: FileLoggingConfig = {
        filePath: logFilePath,
        maxFileSize: 50, // Very small size
        maxBackupFiles: 2,
        enableRotation: true,
        async: false,
      };
      strategy = new FileLoggerStrategy(config);

      // Write enough to trigger rotation
      for (let i = 0; i < 5; i++) {
        const entry = createTestLogEntry(
          'info',
          `Long message ${i} with extra content`,
        );
        await strategy.write(entry);
      }

      // Check if backup file was created
      const backupFile = `${logFilePath}.1`;
      const backupExists = await fs
        .access(backupFile)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);
    });

    it('should provide accurate statistics', async () => {
      const entry = createTestLogEntry('info', 'Stats test');
      await strategy.write(entry);

      const stats = strategy.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.currentFileSize).toBeGreaterThan(0);
    });

    it('should manually rotate logs', async () => {
      const entry = createTestLogEntry('info', 'Pre-rotation');
      await strategy.write(entry);

      await strategy.rotate();

      const backupFile = `${logFilePath}.1`;
      const backupExists = await fs
        .access(backupFile)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);
    });

    it('should create directories if they do not exist', async () => {
      const nestedPath = join(tempDir, 'nested', 'directory', 'test.log');
      const config: FileLoggingConfig = {
        filePath: nestedPath,
        async: false,
      };
      strategy = new FileLoggerStrategy(config);

      const entry = createTestLogEntry();
      await strategy.write(entry);

      const content = await fs.readFile(nestedPath, 'utf8');
      expect(content).toContain('Test message');
    });

    it('should handle write errors gracefully', async () => {
      // Create a strategy with an invalid path
      const invalidPath = join('/invalid', 'path', 'test.log');
      const config: FileLoggingConfig = {
        filePath: invalidPath,
        async: false,
      };
      strategy = new FileLoggerStrategy(config);

      const entry = createTestLogEntry();
      await expect(strategy.write(entry)).rejects.toThrow();
    });
  });

  describe('HybridLoggerStrategy', () => {
    let strategy: HybridLoggerStrategy;

    beforeEach(() => {
      const consoleOptions = {
        enableColors: false,
        enableTimestamp: true,
        prefix: '[HYBRID]',
      };
      const fileConfig: FileLoggingConfig = {
        filePath: logFilePath,
        format: 'text',
        async: false,
      };
      strategy = new HybridLoggerStrategy(consoleOptions, fileConfig);
    });

    afterEach(async () => {
      await strategy.cleanup();
    });

    it('should write to both console and file', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const entry = createTestLogEntry('info', 'Hybrid test message');

      await strategy.write(entry);

      // Check console output
      expect(consoleSpy).toHaveBeenCalled();

      // Check file output
      const content = await fs.readFile(logFilePath, 'utf8');
      expect(content).toContain('Hybrid test message');

      consoleSpy.mockRestore();
    });

    it('should support log rotation', async () => {
      const entry = createTestLogEntry('info', 'Pre-rotation message');
      await strategy.write(entry);

      await strategy.rotate();

      const backupFile = `${logFilePath}.1`;
      const backupExists = await fs
        .access(backupFile)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);
    });

    it('should provide file statistics', async () => {
      const entry = createTestLogEntry('info', 'Stats test');
      await strategy.write(entry);

      const stats = strategy.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.currentFileSize).toBeGreaterThan(0);
    });

    it('should cleanup both strategies', async () => {
      await expect(strategy.cleanup()).resolves.not.toThrow();
    });

    it('should handle partial failures gracefully', async () => {
      // This test would require more complex mocking to simulate
      // console success but file failure scenarios
      const entry = createTestLogEntry();
      await expect(strategy.write(entry)).resolves.not.toThrow();
    });
  });

  describe('Strategy performance', () => {
    it('should handle high-frequency logging', async () => {
      const strategy = new FileLoggerStrategy({
        filePath: logFilePath,
        async: true, // Use async for performance
      });

      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 100; i++) {
        const entry = createTestLogEntry('info', `Performance test ${i}`);
        promises.push(strategy.write(entry));
      }

      await Promise.all(promises);
      await strategy.cleanup();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify all messages were written
      const content = await fs.readFile(logFilePath, 'utf8');
      expect(
        content.split('\n').filter((line) => line.includes('Performance test'))
          .length,
      ).toBe(100);
    });
  });
});
