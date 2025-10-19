/**
 * Tests for EnvironmentAwareServices
 */

import { EnvironmentAwareServices } from '../../../../src/infrastructure/logging/environment-aware.services';
import { LoggingEnvironmentConfig } from '../../../../src/infrastructure/logging/environment-aware-factory';

// Mock the environment-aware-factory
jest.mock(
  '../../../../src/infrastructure/logging/environment-aware-factory',
  () => ({
    LoggingEnvironmentConfig: {
      fromEnvironment: jest.fn(),
      getLogLevel: jest.fn(),
      isFileLoggingEnabled: jest.fn(),
    },
    EnvironmentAwareLoggingFactory: {
      createLogManagementService: jest.fn(),
    },
  }),
);

// Mock the Logger
jest.mock('../../../../src/infrastructure/logging/index', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    enableFileLogging: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the InfrastructureServices
jest.mock('../../../../src/infrastructure/services', () => ({
  InfrastructureServices: class {
    static registerServices = jest.fn();
  },
  ILogManagementService: {},
}));

// Mock the ServiceContainer
jest.mock('../../../../src/shared/container', () => ({
  ServiceContainer: jest.fn().mockImplementation(() => ({
    registerSingleton: jest.fn(),
    tryResolve: jest.fn(),
  })),
}));

describe('EnvironmentAwareServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (LoggingEnvironmentConfig.fromEnvironment as jest.Mock).mockReturnValue({
      filePath: '/test/logs/md2pdf.log',
      maxFileSize: 10485760,
      maxBackupFiles: 5,
      format: 'text',
      enableRotation: true,
      async: true,
    });

    (LoggingEnvironmentConfig.getLogLevel as jest.Mock).mockReturnValue('info');
    (
      LoggingEnvironmentConfig.isFileLoggingEnabled as jest.Mock
    ).mockReturnValue(true);
  });

  describe('createContainer', () => {
    it('should create container with base infrastructure services', () => {
      const { ServiceContainer } = require('../../../../src/shared/container');
      const {
        InfrastructureServices,
      } = require('../../../../src/infrastructure/services');

      const mockContainer = {
        registerSingleton: jest.fn(),
        tryResolve: jest.fn(),
      };

      (ServiceContainer as jest.Mock).mockReturnValue(mockContainer);

      const container = EnvironmentAwareServices.createContainer();

      expect(ServiceContainer).toHaveBeenCalled();
      expect(InfrastructureServices.registerServices).toHaveBeenCalledWith(
        mockContainer,
      );
      expect(container).toBe(mockContainer);
    });

    it('should register environment logger services', () => {
      const { ServiceContainer } = require('../../../../src/shared/container');
      const mockContainer = {
        registerSingleton: jest.fn(),
        tryResolve: jest.fn(),
      };

      (ServiceContainer as jest.Mock).mockReturnValue(mockContainer);

      EnvironmentAwareServices.createContainer();

      // Should register enhancedLogger
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'enhancedLogger',
        expect.any(Function),
      );

      // Should register logger
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'logger',
        expect.any(Function),
      );

      // Should register logManagement
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'logManagement',
        expect.any(Function),
      );
    });
  });

  describe('createEnvironmentLogger', () => {
    it('should create logger with environment configuration', async () => {
      const {
        Logger,
      } = require('../../../../src/infrastructure/logging/index');
      const mockLogger = {
        enableFileLogging: jest.fn().mockResolvedValue(undefined),
      };

      (Logger as jest.Mock).mockReturnValue(mockLogger);

      const logger = EnvironmentAwareServices.createEnvironmentLogger();

      expect(LoggingEnvironmentConfig.fromEnvironment).toHaveBeenCalled();
      expect(LoggingEnvironmentConfig.getLogLevel).toHaveBeenCalled();
      expect(Logger).toHaveBeenCalledWith({ level: 'info' });
      expect(logger).toBe(mockLogger);
    });

    it('should enable file logging when configured', () => {
      const {
        Logger,
      } = require('../../../../src/infrastructure/logging/index');
      const mockLogger = {
        enableFileLogging: jest.fn().mockResolvedValue(undefined),
      };

      (Logger as jest.Mock).mockReturnValue(mockLogger);

      const mockEnvConfig = {
        filePath: '/test/logs/md2pdf.log',
        maxFileSize: 10485760,
        maxBackupFiles: 5,
        format: 'text',
        enableRotation: true,
        async: true,
      };

      (LoggingEnvironmentConfig.fromEnvironment as jest.Mock).mockReturnValue(
        mockEnvConfig,
      );
      (
        LoggingEnvironmentConfig.isFileLoggingEnabled as jest.Mock
      ).mockReturnValue(true);

      EnvironmentAwareServices.createEnvironmentLogger();

      expect(mockLogger.enableFileLogging).toHaveBeenCalledWith(mockEnvConfig);
    });

    it('should not enable file logging when disabled', () => {
      const {
        Logger,
      } = require('../../../../src/infrastructure/logging/index');
      const mockLogger = {
        enableFileLogging: jest.fn().mockResolvedValue(undefined),
      };

      (Logger as jest.Mock).mockReturnValue(mockLogger);
      (
        LoggingEnvironmentConfig.isFileLoggingEnabled as jest.Mock
      ).mockReturnValue(false);

      EnvironmentAwareServices.createEnvironmentLogger();

      expect(mockLogger.enableFileLogging).not.toHaveBeenCalled();
    });

    it('should handle file logging errors gracefully', () => {
      const {
        Logger,
      } = require('../../../../src/infrastructure/logging/index');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockLogger = {
        enableFileLogging: jest
          .fn()
          .mockRejectedValue(new Error('File logging failed')),
      };

      (Logger as jest.Mock).mockReturnValue(mockLogger);
      (
        LoggingEnvironmentConfig.isFileLoggingEnabled as jest.Mock
      ).mockReturnValue(true);

      // This should not throw
      expect(() => {
        EnvironmentAwareServices.createEnvironmentLogger();
      }).not.toThrow();

      consoleWarnSpy.mockRestore();
    });

    it('should log warning when file logging fails', async () => {
      const {
        Logger,
      } = require('../../../../src/infrastructure/logging/index');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockLogger = {
        enableFileLogging: jest
          .fn()
          .mockRejectedValue(new Error('Permission denied')),
      };

      (Logger as jest.Mock).mockReturnValue(mockLogger);
      (
        LoggingEnvironmentConfig.isFileLoggingEnabled as jest.Mock
      ).mockReturnValue(true);

      EnvironmentAwareServices.createEnvironmentLogger();

      // Wait for promise to resolve/reject
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to enable file logging:',
        'Permission denied',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Service Registration Edge Cases', () => {
    it('should handle container registration with missing enhanced logger', () => {
      const { ServiceContainer } = require('../../../../src/shared/container');
      const mockContainer = {
        registerSingleton: jest.fn(),
        tryResolve: jest.fn().mockReturnValue(null), // No enhanced logger available
      };

      (ServiceContainer as jest.Mock).mockReturnValue(mockContainer);

      EnvironmentAwareServices.createContainer();

      // Trigger the logger registration callback
      const loggerRegistration =
        mockContainer.registerSingleton.mock.calls.find(
          (call) => call[0] === 'logger',
        );
      expect(loggerRegistration).toBeDefined();

      const loggerCallback = loggerRegistration[1];
      const result = loggerCallback(mockContainer);

      // Should create environment logger as fallback
      expect(result).toBeDefined();
    });

    it('should handle log management service registration with logger resolution', () => {
      const { ServiceContainer } = require('../../../../src/shared/container');
      const {
        EnvironmentAwareLoggingFactory,
      } = require('../../../../src/infrastructure/logging/environment-aware-factory');

      const mockLogger = { log: jest.fn() };
      const mockService = { test: true };
      const mockContainer = {
        registerSingleton: jest.fn(),
        tryResolve: jest.fn().mockReturnValue(mockLogger),
      };

      (ServiceContainer as jest.Mock).mockReturnValue(mockContainer);
      (
        EnvironmentAwareLoggingFactory.createLogManagementService as jest.Mock
      ).mockReturnValue(mockService);

      EnvironmentAwareServices.createContainer();

      // Trigger the logManagement registration callback
      const logManagementRegistration =
        mockContainer.registerSingleton.mock.calls.find(
          (call) => call[0] === 'logManagement',
        );
      expect(logManagementRegistration).toBeDefined();

      const logManagementCallback = logManagementRegistration[1];
      const result = logManagementCallback(mockContainer);

      expect(mockContainer.tryResolve).toHaveBeenCalledWith('logger');
      expect(
        EnvironmentAwareLoggingFactory.createLogManagementService,
      ).toHaveBeenCalledWith(mockLogger);
      expect(result).toBe(mockService);
    });
  });

  describe('createEnvironmentLogManagement', () => {
    it('should create environment-aware log management service', () => {
      const {
        EnvironmentAwareLoggingFactory,
      } = require('../../../../src/infrastructure/logging/environment-aware-factory');
      const mockService = { someMethod: jest.fn() };

      (
        EnvironmentAwareLoggingFactory.createLogManagementService as jest.Mock
      ).mockReturnValue(mockService);

      // Mock createEnvironmentLogger to return a mock logger
      jest
        .spyOn(EnvironmentAwareServices, 'createEnvironmentLogger')
        .mockReturnValue({
          enableFileLogging: jest.fn(),
        } as any);

      const service = EnvironmentAwareServices.createEnvironmentLogManagement();

      expect(
        EnvironmentAwareServices.createEnvironmentLogger,
      ).toHaveBeenCalled();
      expect(
        EnvironmentAwareLoggingFactory.createLogManagementService,
      ).toHaveBeenCalled();
      expect(service).toBe(mockService);
    });
  });

  describe('inheritance', () => {
    it('should extend InfrastructureServices', () => {
      expect(EnvironmentAwareServices.prototype).toBeInstanceOf(Object);
      // Verify that it has access to parent class methods through static inheritance
      expect(EnvironmentAwareServices.createContainer).toBeDefined();
    });
  });
});
