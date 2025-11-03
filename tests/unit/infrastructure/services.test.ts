/**
 * Infrastructure Services Tests
 * Tests service registration, container configuration, and factory methods
 */

import { jest } from '@jest/globals';

import {
  InfrastructureServices,
  EnhancedServices,
  FileLoggingServices,
  ServiceUtils,
  SERVICE_NAMES,
} from '../../../src/infrastructure/services';
import { ServiceContainer } from '../../../src/shared/container';

import type { IServiceContainer } from '../../../src/shared/container';

// Mock all dependencies
jest.mock('../../../src/infrastructure/config');
jest.mock('../../../src/infrastructure/logging');
jest.mock('../../../src/infrastructure/error');
jest.mock('../../../src/infrastructure/filesystem');
jest.mock('../../../src/infrastructure/i18n');
jest.mock('../../../src/infrastructure/logging/log-management.service');
jest.mock('fs');

describe('Infrastructure Services', () => {
  let mockContainer: jest.Mocked<IServiceContainer>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock container
    mockContainer = {
      registerSingleton: jest.fn(),
      resolve: jest.fn(),
      tryResolve: jest.fn(),
      register: jest.fn(),
      isRegistered: jest.fn(),
      createScope: jest.fn(),
    } as any;
  });

  describe('InfrastructureServices', () => {
    describe('registerServices', () => {
      it('should register all core services with container', () => {
        InfrastructureServices.registerServices(mockContainer);

        expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
          'config',
          expect.any(Function),
        );
        expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
          'enhancedLogger',
          expect.any(Function),
        );
        expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
          'logger',
          expect.any(Function),
        );
        expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
          'errorHandler',
          expect.any(Function),
        );
        expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
          'fileSystem',
          expect.any(Function),
        );
        expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
          'translator',
          expect.any(Function),
        );
        expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
          'logManagement',
          expect.any(Function),
        );
      });

      it('should register exactly 7 services', () => {
        InfrastructureServices.registerServices(mockContainer);
        expect(mockContainer.registerSingleton).toHaveBeenCalledTimes(7);
      });

      it('should handle container registration without throwing errors', () => {
        expect(() => {
          InfrastructureServices.registerServices(mockContainer);
        }).not.toThrow();
      });
    });

    describe('createContainer', () => {
      it('should create container and register all services', () => {
        const container = InfrastructureServices.createContainer();
        expect(container).toBeInstanceOf(ServiceContainer);
      });

      it('should create container successfully', () => {
        expect(() => {
          InfrastructureServices.createContainer();
        }).not.toThrow();
      });
    });
  });

  describe('EnhancedServices', () => {
    describe('createConfigManager', () => {
      it('should create config manager successfully', () => {
        const manager = EnhancedServices.createConfigManager();
        expect(manager).toBeDefined();
      });

      it('should create config manager with options', () => {
        const options = { testOption: true };
        const manager = EnhancedServices.createConfigManager(options);
        expect(manager).toBeDefined();
      });

      it('should handle development environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const manager = EnhancedServices.createConfigManager();
        expect(manager).toBeDefined();

        process.env.NODE_ENV = originalEnv;
      });

      it('should handle production environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const manager = EnhancedServices.createConfigManager();
        expect(manager).toBeDefined();

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('createLogger', () => {
      it('should create logger with specified level', () => {
        const logger = EnhancedServices.createLogger('warn');
        expect(logger).toBeDefined();
      });

      it('should create logger with default level', () => {
        const logger = EnhancedServices.createLogger();
        expect(logger).toBeDefined();
      });

      it('should create logger with context', () => {
        const logger = EnhancedServices.createLogger('info', 'TestContext');
        expect(logger).toBeDefined();
      });
    });

    describe('createErrorHandler', () => {
      it('should create error handler with logger', () => {
        const mockLogger = { info: jest.fn() };
        const handler = EnhancedServices.createErrorHandler(mockLogger as any);
        expect(handler).toBeDefined();
      });

      it('should create error handler without logger', () => {
        const handler = EnhancedServices.createErrorHandler();
        expect(handler).toBeDefined();
      });
    });

    describe('createFileSystemManager', () => {
      it('should create file system manager', () => {
        const manager = EnhancedServices.createFileSystemManager();
        expect(manager).toBeDefined();
      });
    });

    describe('createTranslationManager', () => {
      it('should create translation manager with specified locale', () => {
        const manager = EnhancedServices.createTranslationManager('zh-TW');
        expect(manager).toBeDefined();
      });

      it('should create translation manager with default locale', () => {
        const manager = EnhancedServices.createTranslationManager();
        expect(manager).toBeDefined();
      });
    });
  });

  describe('FileLoggingServices', () => {
    describe('getProjectLogsDir', () => {
      it('should return a logs directory path', () => {
        const logsDir = FileLoggingServices.getProjectLogsDir();
        expect(logsDir).toBeDefined();
        expect(typeof logsDir).toBe('string');
        expect(logsDir).toContain('logs');
      });
    });

    describe('createFileLogger', () => {
      it('should create file logger successfully', async () => {
        const mockFileConfig = {
          filePath: '/test/path/test.log',
          maxFileSize: 1024 * 1024,
          maxBackupFiles: 3,
          format: 'text' as const,
          enableRotation: true,
          async: true,
        };

        const logger = await FileLoggingServices.createFileLogger(
          'debug',
          mockFileConfig,
        );
        expect(logger).toBeDefined();
      });
    });

    describe('createAutoFileLogger', () => {
      it('should create auto file logger successfully', async () => {
        const logger = await FileLoggingServices.createAutoFileLogger('warn');
        expect(logger).toBeDefined();
      });
    });

    describe('createProductionFileLogger', () => {
      it('should create production file logger successfully', async () => {
        const logger =
          await FileLoggingServices.createProductionFileLogger('error');
        expect(logger).toBeDefined();
      });

      it('should create production file logger with custom filename', async () => {
        const logger = await FileLoggingServices.createProductionFileLogger(
          'info',
          'custom.log',
        );
        expect(logger).toBeDefined();
      });
    });

    describe('createContainerWithFileLogging', () => {
      it('should create container with file logging', async () => {
        const mockFileConfig = {
          filePath: '/test/path/test.log',
          maxFileSize: 1024 * 1024,
          maxBackupFiles: 3,
          format: 'text' as const,
          enableRotation: true,
          async: true,
        };

        const container =
          await FileLoggingServices.createContainerWithFileLogging(
            mockFileConfig,
          );
        expect(container).toBeInstanceOf(ServiceContainer);
      });
    });
  });

  describe('ServiceUtils', () => {
    describe('checkServicesHealth', () => {
      it('should return health status', async () => {
        const health = await ServiceUtils.checkServicesHealth(mockContainer);
        expect(health).toBeDefined();
        expect(typeof health.logManagement).toBe('boolean');
        expect(typeof health.overall).toBe('boolean');
      });

      it('should handle null service', async () => {
        mockContainer.tryResolve.mockReturnValue(null);
        const health = await ServiceUtils.checkServicesHealth(mockContainer);
        expect(health.logManagement).toBe(false);
        expect(health.overall).toBe(false);
      });
    });

    describe('getServicesStatus', () => {
      it('should return services status', () => {
        const status = ServiceUtils.getServicesStatus(mockContainer);
        expect(status).toBeDefined();
        expect(status.timestamp).toBeInstanceOf(Date);
      });

      it('should handle unavailable services', () => {
        mockContainer.tryResolve.mockReturnValue(null);
        const status = ServiceUtils.getServicesStatus(mockContainer);
        expect(status.logManagement).toEqual({ available: false });
      });
    });

    describe('performServicesMaintenance', () => {
      it('should perform maintenance', async () => {
        const result =
          await ServiceUtils.performServicesMaintenance(mockContainer);
        expect(result).toBeDefined();
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should handle unavailable services', async () => {
        mockContainer.tryResolve.mockReturnValue(null);
        const result =
          await ServiceUtils.performServicesMaintenance(mockContainer);
        expect(result.logManagement).toBeNull();
      });
    });
  });

  describe('SERVICE_NAMES', () => {
    it('should provide type-safe service name constants', () => {
      expect(SERVICE_NAMES).toEqual({
        CONFIG: 'config',
        LOGGER: 'logger',
        ENHANCED_LOGGER: 'enhancedLogger',
        ERROR_HANDLER: 'errorHandler',
        FILE_SYSTEM: 'fileSystem',
        TRANSLATOR: 'translator',
        LOG_MANAGEMENT: 'logManagement',
      });
    });

    it('should have all expected service names', () => {
      expect(Object.keys(SERVICE_NAMES)).toHaveLength(7);
      expect(SERVICE_NAMES.CONFIG).toBe('config');
      expect(SERVICE_NAMES.LOGGER).toBe('logger');
      expect(SERVICE_NAMES.ENHANCED_LOGGER).toBe('enhancedLogger');
      expect(SERVICE_NAMES.ERROR_HANDLER).toBe('errorHandler');
      expect(SERVICE_NAMES.FILE_SYSTEM).toBe('fileSystem');
      expect(SERVICE_NAMES.TRANSLATOR).toBe('translator');
      expect(SERVICE_NAMES.LOG_MANAGEMENT).toBe('logManagement');
    });

    it('should have string values for all constants', () => {
      Object.values(SERVICE_NAMES).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration tests', () => {
    it('should register and create services without conflicts', () => {
      const container = InfrastructureServices.createContainer();

      expect(container).toBeInstanceOf(ServiceContainer);
      expect(() => {
        InfrastructureServices.registerServices(container);
      }).not.toThrow();
    });

    it('should handle missing dependencies gracefully', () => {
      mockContainer.tryResolve.mockReturnValue(null);

      expect(() => {
        InfrastructureServices.registerServices(mockContainer);
      }).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle service creation errors', () => {
      expect(() => {
        EnhancedServices.createConfigManager();
      }).not.toThrow();
    });

    it('should handle logger creation errors', () => {
      expect(() => {
        EnhancedServices.createLogger('invalid' as any);
      }).not.toThrow();
    });

    it('should handle file system errors gracefully', () => {
      expect(() => {
        FileLoggingServices.getProjectLogsDir();
      }).not.toThrow();
    });
  });
});
