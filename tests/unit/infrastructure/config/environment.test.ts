/**
 * Tests for EnvironmentConfig
 */

import { jest } from '@jest/globals';
import { EnvironmentConfig } from '../../../../src/infrastructure/config/environment';

describe('EnvironmentConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isVerboseEnabled', () => {
    it('should return true when MD2PDF_VERBOSE is "true"', () => {
      process.env.MD2PDF_VERBOSE = 'true';
      expect(EnvironmentConfig.isVerboseEnabled()).toBe(true);
    });

    it('should return false when MD2PDF_VERBOSE is not set', () => {
      delete process.env.MD2PDF_VERBOSE;
      expect(EnvironmentConfig.isVerboseEnabled()).toBe(false);
    });

    it('should return false when MD2PDF_VERBOSE is "false"', () => {
      process.env.MD2PDF_VERBOSE = 'false';
      expect(EnvironmentConfig.isVerboseEnabled()).toBe(false);
    });

    it('should NOT be affected by NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.MD2PDF_VERBOSE;
      expect(EnvironmentConfig.isVerboseEnabled()).toBe(false);
    });
  });

  describe('getDefaultLogLevel', () => {
    it('should return "debug" when NODE_ENV is "development"', () => {
      process.env.NODE_ENV = 'development';
      expect(EnvironmentConfig.getDefaultLogLevel()).toBe('debug');
    });

    it('should return "info" when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';
      expect(EnvironmentConfig.getDefaultLogLevel()).toBe('info');
    });

    it('should return "info" when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(EnvironmentConfig.getDefaultLogLevel()).toBe('info');
    });
  });

  describe('getLogLevel', () => {
    it('should use MD2PDF_LOG_LEVEL when explicitly set', () => {
      process.env.MD2PDF_LOG_LEVEL = 'error';
      process.env.NODE_ENV = 'development';
      expect(EnvironmentConfig.getLogLevel()).toBe('error');
    });

    it('should use default level when MD2PDF_LOG_LEVEL is not set', () => {
      delete process.env.MD2PDF_LOG_LEVEL;
      process.env.NODE_ENV = 'development';
      expect(EnvironmentConfig.getLogLevel()).toBe('debug');
    });

    it('should ignore invalid log levels', () => {
      process.env.MD2PDF_LOG_LEVEL = 'invalid';
      process.env.NODE_ENV = 'production';
      expect(EnvironmentConfig.getLogLevel()).toBe('info');
    });

    it('should handle case insensitive log levels', () => {
      process.env.MD2PDF_LOG_LEVEL = 'DEBUG';
      expect(EnvironmentConfig.getLogLevel()).toBe('debug');
    });
  });

  describe('isDevelopmentMode', () => {
    it('should return true when NODE_ENV is "development"', () => {
      process.env.NODE_ENV = 'development';
      expect(EnvironmentConfig.isDevelopmentMode()).toBe(true);
    });

    it('should return false when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';
      expect(EnvironmentConfig.isDevelopmentMode()).toBe(false);
    });

    it('should return false when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(EnvironmentConfig.isDevelopmentMode()).toBe(false);
    });
  });

  describe('shouldSkipChromiumDownload', () => {
    it('should return true when PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is "true"', () => {
      process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
      expect(EnvironmentConfig.shouldSkipChromiumDownload()).toBe(true);
    });

    it('should return false when not set', () => {
      delete process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD;
      expect(EnvironmentConfig.shouldSkipChromiumDownload()).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return complete configuration object', () => {
      process.env.NODE_ENV = 'development';
      process.env.MD2PDF_VERBOSE = 'true';
      process.env.MD2PDF_LOG_LEVEL = 'debug';
      process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

      const config = EnvironmentConfig.getConfig();

      expect(config).toEqual({
        nodeEnv: 'development',
        verbose: true,
        logLevel: 'debug',
        defaultLogLevel: 'debug',
        developmentMode: true,
        skipChromiumDownload: true,
      });
    });
  });

  describe('validateConfig', () => {
    it('should return valid with no warnings for good config', () => {
      process.env.MD2PDF_VERBOSE = 'true';
      process.env.MD2PDF_LOG_LEVEL = 'debug';

      const result = EnvironmentConfig.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about development mode without verbose', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.MD2PDF_VERBOSE;

      const result = EnvironmentConfig.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Development mode detected. Consider setting MD2PDF_VERBOSE=true for detailed output.',
      );
    });

    it('should warn about conflicting log level and verbose mode', () => {
      process.env.MD2PDF_VERBOSE = 'true';
      process.env.MD2PDF_LOG_LEVEL = 'error';

      const result = EnvironmentConfig.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Verbose mode enabled but log level is "error". Consider using MD2PDF_LOG_LEVEL=debug for full verbose output.',
      );
    });

    it('should not warn when development mode has explicit verbose setting', () => {
      process.env.NODE_ENV = 'development';
      process.env.MD2PDF_VERBOSE = 'true';
      process.env.MD2PDF_LOG_LEVEL = 'debug'; // Set compatible log level

      const result = EnvironmentConfig.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Single Responsibility Principle', () => {
    it('should keep verbose and development mode independent', () => {
      // Verbose disabled, development enabled
      process.env.NODE_ENV = 'development';
      process.env.MD2PDF_VERBOSE = 'false';

      expect(EnvironmentConfig.isVerboseEnabled()).toBe(false);
      expect(EnvironmentConfig.isDevelopmentMode()).toBe(true);

      // Verbose enabled, development disabled
      process.env.NODE_ENV = 'production';
      process.env.MD2PDF_VERBOSE = 'true';

      expect(EnvironmentConfig.isVerboseEnabled()).toBe(true);
      expect(EnvironmentConfig.isDevelopmentMode()).toBe(false);
    });

    it('should allow independent control of each setting', () => {
      process.env.NODE_ENV = 'development'; // affects default log level
      process.env.MD2PDF_VERBOSE = 'false'; // affects verbose output
      process.env.MD2PDF_LOG_LEVEL = 'warn'; // overrides default log level

      expect(EnvironmentConfig.getDefaultLogLevel()).toBe('debug'); // from NODE_ENV
      expect(EnvironmentConfig.isVerboseEnabled()).toBe(false); // from MD2PDF_VERBOSE
      expect(EnvironmentConfig.getLogLevel()).toBe('warn'); // from MD2PDF_LOG_LEVEL
      expect(EnvironmentConfig.isDevelopmentMode()).toBe(true); // from NODE_ENV
    });
  });
});
