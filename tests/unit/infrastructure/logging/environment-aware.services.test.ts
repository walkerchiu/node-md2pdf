/**
 * Tests for Environment-aware Services
 */

import { EnvironmentAwareServices } from '../../../../src/infrastructure/logging/environment-aware.services';
import { ServiceContainer } from '../../../../src/shared/container/container';
import { Logger } from '../../../../src/infrastructure/logging/logger';
import {
  LoggingEnvironmentConfig,
  EnvironmentAwareLoggingFactory,
} from '../../../../src/infrastructure/logging/environment-aware-factory';

import type { ILogger } from '../../../../src/infrastructure/logging/types';

// Mock dependencies
jest.mock('../../../../src/infrastructure/logging/environment-aware-factory');
jest.mock('../../../../src/infrastructure/logging/logger');
jest.mock('../../../../src/infrastructure/services');

const mockLoggingEnvironmentConfig = LoggingEnvironmentConfig as jest.Mocked<
  typeof LoggingEnvironmentConfig
>;
const mockLogger = Logger as jest.MockedClass<typeof Logger>;
const mockEnvironmentAwareLoggingFactory =
  EnvironmentAwareLoggingFactory as jest.Mocked<
    typeof EnvironmentAwareLoggingFactory
  >;

describe('EnvironmentAwareServices', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock LoggingEnvironmentConfig methods
    mockLoggingEnvironmentConfig.fromEnvironment = jest.fn().mockReturnValue({
      logLevel: 'info',
      enableFileLogging: false,
      filePath: '/tmp/test.log',
    });
    mockLoggingEnvironmentConfig.getLogLevel = jest
      .fn()
      .mockReturnValue('info');
    mockLoggingEnvironmentConfig.isFileLoggingEnabled = jest
      .fn()
      .mockReturnValue(false);

    // Mock EnvironmentAwareLoggingFactory methods
    mockEnvironmentAwareLoggingFactory.createLogManagementService = jest
      .fn()
      .mockReturnValue({
        start: jest.fn(),
        stop: jest.fn(),
        getStats: jest.fn(),
      });

    // Mock Logger constructor and methods
    const mockLoggerInstance = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      enableFileLogging: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockLogger.mockImplementation(() => mockLoggerInstance);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createContainer', () => {
    it('should create a service container with base infrastructure services', () => {
      const container = EnvironmentAwareServices.createContainer();

      expect(container).toBeInstanceOf(ServiceContainer);
    });

    it('should register environment-aware logger services', () => {
      const container = EnvironmentAwareServices.createContainer();

      // Verify that enhanced logger is registered
      expect(container.isRegistered('enhancedLogger')).toBe(true);
      expect(container.isRegistered('logger')).toBe(true);
      expect(container.isRegistered('logManagement')).toBe(true);
    });

    it('should resolve enhanced logger with environment configuration', () => {
      mockLoggingEnvironmentConfig.getLogLevel.mockReturnValue('debug');
      mockLoggingEnvironmentConfig.isFileLoggingEnabled.mockReturnValue(true);

      const container = EnvironmentAwareServices.createContainer();
      const logger = container.resolve('enhancedLogger');

      expect(mockLoggingEnvironmentConfig.fromEnvironment).toHaveBeenCalled();
      expect(mockLoggingEnvironmentConfig.getLogLevel).toHaveBeenCalled();
      expect(mockLogger).toHaveBeenCalledWith({ level: 'debug' });
      expect(logger).toBeDefined();
    });

    it('should handle file logging enablement with environment config', () => {
      mockLoggingEnvironmentConfig.isFileLoggingEnabled.mockReturnValue(true);
      const mockEnvConfig = { filePath: '/tmp/test.log' };
      mockLoggingEnvironmentConfig.fromEnvironment.mockReturnValue(
        mockEnvConfig,
      );

      const mockLoggerInstance = {
        enableFileLogging: jest.fn().mockResolvedValue(undefined),
      } as any;
      mockLogger.mockImplementation(() => mockLoggerInstance);

      const container = EnvironmentAwareServices.createContainer();
      container.resolve('enhancedLogger');

      expect(mockLoggerInstance.enableFileLogging).toHaveBeenCalledWith(
        mockEnvConfig,
      );
    });

    it('should handle file logging enablement failure gracefully', async () => {
      mockLoggingEnvironmentConfig.isFileLoggingEnabled.mockReturnValue(true);

      const mockLoggerInstance = {
        enableFileLogging: jest
          .fn()
          .mockRejectedValue(new Error('File logging failed')),
      } as any;
      mockLogger.mockImplementation(() => mockLoggerInstance);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const container = EnvironmentAwareServices.createContainer();
      await container.resolve('enhancedLogger');

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to enable file logging:',
        'File logging failed',
      );

      consoleSpy.mockRestore();
    });

    it('should provide backward compatible logger service', () => {
      const container = EnvironmentAwareServices.createContainer();
      const logger = container.resolve('logger');

      expect(logger).toBeDefined();
    });
  });

  describe('createEnvironmentLogger', () => {
    it('should create logger with environment configuration', () => {
      mockLoggingEnvironmentConfig.getLogLevel.mockReturnValue('warn');
      mockLoggingEnvironmentConfig.isFileLoggingEnabled.mockReturnValue(false);

      const logger = EnvironmentAwareServices.createEnvironmentLogger();

      expect(mockLoggingEnvironmentConfig.fromEnvironment).toHaveBeenCalled();
      expect(mockLoggingEnvironmentConfig.getLogLevel).toHaveBeenCalled();
      expect(mockLogger).toHaveBeenCalledWith({ level: 'warn' });
      expect(logger).toBeDefined();
    });

    it('should enable file logging when configured', () => {
      mockLoggingEnvironmentConfig.isFileLoggingEnabled.mockReturnValue(true);
      const mockEnvConfig = { filePath: '/custom/path.log' };
      mockLoggingEnvironmentConfig.fromEnvironment.mockReturnValue(
        mockEnvConfig,
      );

      const mockLoggerInstance = {
        enableFileLogging: jest.fn().mockResolvedValue(undefined),
      } as any;
      mockLogger.mockImplementation(() => mockLoggerInstance);

      const logger = EnvironmentAwareServices.createEnvironmentLogger();

      expect(mockLoggerInstance.enableFileLogging).toHaveBeenCalledWith(
        mockEnvConfig,
      );
      expect(logger).toBeDefined();
    });

    it('should handle file logging errors gracefully', async () => {
      mockLoggingEnvironmentConfig.isFileLoggingEnabled.mockReturnValue(true);

      const mockLoggerInstance = {
        enableFileLogging: jest
          .fn()
          .mockRejectedValue(new Error('Permission denied')),
      } as any;
      mockLogger.mockImplementation(() => mockLoggerInstance);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      EnvironmentAwareServices.createEnvironmentLogger();

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to enable file logging:',
        'Permission denied',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('createEnvironmentLogManagement', () => {
    it('should create log management service with environment logger', () => {
      const logManagement =
        EnvironmentAwareServices.createEnvironmentLogManagement();

      expect(logManagement).toBeDefined();
      expect(mockLoggingEnvironmentConfig.fromEnvironment).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should work with different log levels', () => {
      const logLevels = ['debug', 'info', 'warn', 'error'] as const;

      logLevels.forEach((level) => {
        mockLoggingEnvironmentConfig.getLogLevel.mockReturnValue(level);

        const logger = EnvironmentAwareServices.createEnvironmentLogger();

        expect(mockLogger).toHaveBeenCalledWith({ level });
        expect(logger).toBeDefined();

        jest.clearAllMocks();
      });
    });

    it('should handle missing enhanced logger in container', () => {
      const container = new ServiceContainer();

      // Register a mock logger service that returns undefined for enhanced logger
      container.registerSingleton('logger', (c) => {
        const enhancedLogger = c.tryResolve('enhancedLogger');
        return (
          enhancedLogger || EnvironmentAwareServices.createEnvironmentLogger()
        );
      });

      const logger = container.resolve('logger');

      expect(logger).toBeDefined();
    });

    it('should use environment variables correctly', () => {
      // Test with different environment variable configurations
      process.env.MD2PDF_LOG_LEVEL = 'debug';
      process.env.MD2PDF_LOG_FILE_ENABLED = 'true';
      process.env.MD2PDF_LOG_PATH = '/var/log/md2pdf.log';

      mockLoggingEnvironmentConfig.getLogLevel.mockReturnValue('debug');
      mockLoggingEnvironmentConfig.isFileLoggingEnabled.mockReturnValue(true);
      mockLoggingEnvironmentConfig.fromEnvironment.mockReturnValue({
        filePath: '/var/log/md2pdf.log',
      });

      const logger = EnvironmentAwareServices.createEnvironmentLogger();

      expect(logger).toBeDefined();
      expect(mockLoggingEnvironmentConfig.fromEnvironment).toHaveBeenCalled();
      expect(mockLoggingEnvironmentConfig.getLogLevel).toHaveBeenCalled();
      expect(
        mockLoggingEnvironmentConfig.isFileLoggingEnabled,
      ).toHaveBeenCalled();
    });

    it('should handle log management service when logger resolution fails', () => {
      const container = new ServiceContainer();

      // Register log management service with manual factory to simulate lines 64-66
      container.registerSingleton('logManagement', (c) => {
        const logger = c.tryResolve<ILogger>('logger'); // This should return undefined
        return EnvironmentAwareLoggingFactory.createLogManagementService(
          logger,
        );
      });

      const logManagement = container.resolve('logManagement');

      expect(logManagement).toBeDefined();
      expect(
        mockEnvironmentAwareLoggingFactory.createLogManagementService,
      ).toHaveBeenCalledWith(undefined);
    });
  });
});
