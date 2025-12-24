/**
 * Integration tests for environment validation utilities
 */

import {
  validateNodeVersion,
  validatePuppeteer,
  checkSystemResources,
  validateEnvironment,
} from '../../../src/utils/validation/environment';
import * as childProcess from 'child_process';

// Mock chalk
jest.mock('chalk', () => ({
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  gray: jest.fn((text) => text),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

// Mock child_process
jest.mock('child_process');
const mockExec = jest.mocked(childProcess.exec);

describe('Environment Validation Integration Tests', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockExec.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateNodeVersion', () => {
    const originalVersion = process.version;

    afterEach(() => {
      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: true,
        configurable: true,
      });
    });

    it('should pass validation for Node.js >= 18', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v18.17.0',
        writable: true,
        configurable: true,
      });

      const result = await validateNodeVersion();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(
          '✅ Node.js version: v18.17.0 (meets requirements)',
        ),
      );
    });

    it('should pass validation for Node.js >= 20', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v20.10.0',
        writable: true,
        configurable: true,
      });

      const result = await validateNodeVersion();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(
          '✅ Node.js version: v20.10.0 (meets requirements)',
        ),
      );
    });

    it('should fail validation for Node.js < 18', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v16.20.2',
        writable: true,
        configurable: true,
      });

      const result = await validateNodeVersion();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(
          '❌ Node.js version too old: v16.20.2, requires >= 18.0.0',
        ),
      );
    });

    it('should handle edge case version numbers', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v18.0.0',
        writable: true,
        configurable: true,
      });

      const result = await validateNodeVersion();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Node.js version: v18.0.0'),
      );
    });

    it('should correctly parse complex version numbers', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v18.19.1-pre',
        writable: true,
        configurable: true,
      });

      const result = await validateNodeVersion();

      expect(result).toBe(true);
    });

    it('should fail for version 17', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v17.9.1',
        writable: true,
        configurable: true,
      });

      const result = await validateNodeVersion();

      expect(result).toBe(false);
    });
  });

  describe('validatePuppeteer', () => {
    it('should pass validation when Puppeteer is available', async () => {
      const result = await validatePuppeteer();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Puppeteer is ready'),
      );
    });

    // Note: The current implementation always returns true
    // Future implementations would include actual Puppeteer checks
    it('should handle Puppeteer availability correctly', async () => {
      const result = await validatePuppeteer();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Puppeteer is ready'),
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('checkSystemResources', () => {
    it('should pass when memory usage is within acceptable limits', async () => {
      const mockStdout = '50000000'; // ~47MB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      const result = await checkSystemResources();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Memory usage: 48 MB'),
      );
    });

    it('should warn but pass when memory usage is high', async () => {
      const mockStdout = '200000000'; // ~190MB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      const result = await checkSystemResources();

      expect(result).toBe(true);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  High memory usage: 191 MB'),
      );
    });

    it('should handle execution errors gracefully', async () => {
      const mockError = new Error('Command failed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(mockError, { stdout: '', stderr: 'Error' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      const result = await checkSystemResources();

      expect(result).toBe(true); // Should still pass
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Unable to check system resources'),
      );
    });

    it('should correctly convert bytes to megabytes', async () => {
      const mockStdout = '104857600'; // Exactly 100MB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      const result = await checkSystemResources();

      expect(result).toBe(true);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  High memory usage: 100 MB'),
      );
    });

    it('should handle edge case at 100MB threshold', async () => {
      const mockStdout = '104857599'; // Just under 100MB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      const result = await checkSystemResources();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Memory usage: 100 MB'),
      );
    });
  });

  describe('validateEnvironment', () => {
    const originalVersion = process.version;

    beforeEach(() => {
      // Reset to a good version by default
      Object.defineProperty(process, 'version', {
        value: 'v18.17.0',
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: true,
        configurable: true,
      });
    });

    it('should pass when all validation checks succeed', async () => {
      const mockStdout = '50000000'; // Low memory usage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      await expect(validateEnvironment()).resolves.toBeUndefined();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Node.js version'),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Puppeteer is ready'),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Memory usage'),
      );
    });

    it('should throw error when Node.js version check fails', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v16.20.2',
        writable: true,
        configurable: true,
      });

      const mockStdout = '50000000';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      await expect(validateEnvironment()).rejects.toThrow(
        'Environment check failed (1 checks not passed)',
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Node.js version too old'),
      );
    });

    it('should pass even when system resource check warns', async () => {
      const mockStdout = '200000000'; // High memory usage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      await expect(validateEnvironment()).resolves.toBeUndefined();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  High memory usage'),
      );
    });

    it('should pass when system resource check fails but other checks pass', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(new Error('Command failed'), { stdout: '', stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      await expect(validateEnvironment()).resolves.toBeUndefined();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Unable to check system resources'),
      );
    });

    it('should run all checks concurrently', async () => {
      const mockStdout = '50000000';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          // Add small delay to verify concurrent execution
          setTimeout(() => {
            callback(null, { stdout: mockStdout, stderr: '' }, '');
          }, 10);
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      const startTime = Date.now();
      await validateEnvironment();
      const endTime = Date.now();

      // Should complete much faster than 30ms if running concurrently
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should provide appropriate error message with failed check count', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v14.21.3', // Old version
        writable: true,
        configurable: true,
      });

      await expect(validateEnvironment()).rejects.toThrow(
        'Environment check failed (1 checks not passed)',
      );
    });
  });

  describe('integration scenarios', () => {
    const originalVersion = process.version;

    afterEach(() => {
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: true,
        configurable: true,
      });
    });

    it('should handle typical development environment successfully', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v20.10.0',
        writable: true,
        configurable: true,
      });

      const mockStdout = '75000000'; // ~71MB - typical
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      await expect(validateEnvironment()).resolves.toBeUndefined();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Node.js version: v20.10.0'),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Puppeteer is ready'),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Memory usage: 72 MB'),
      );
    });

    it('should handle production-like environment with warnings', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v18.19.1',
        writable: true,
        configurable: true,
      });

      const mockStdout = '150000000'; // ~143MB - higher usage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockExec.mockImplementation(((_command: any, callback: any) => {
        if (callback && typeof callback === 'function') {
          callback(null, { stdout: mockStdout, stderr: '' }, '');
        }
        return {} as childProcess.ChildProcess;
      }) as jest.MockedFunction<typeof childProcess.exec>);

      await expect(validateEnvironment()).resolves.toBeUndefined();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  High memory usage: 143 MB'),
      );
    });

    it('should fail gracefully on unsupported systems', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v12.22.12', // Very old version
        writable: true,
        configurable: true,
      });

      await expect(validateEnvironment()).rejects.toThrow(
        expect.stringContaining('Environment check failed'),
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Node.js version too old: v12.22.12'),
      );
    });
  });
});
