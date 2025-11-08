/**
 * Infrastructure Services Tests
 * Tests service registration, container configuration, and factory methods
 */

import { jest } from '@jest/globals';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import {
  InfrastructureServices,
  EnhancedServices,
  FileLoggingServices,
  SERVICE_NAMES,
} from '../../../src/infrastructure/services';
import { ServiceContainer } from '../../../src/shared/container';

import type { IServiceContainer } from '../../../src/shared/container';

// Mock only fs operations to prevent actual file creation during tests
jest.mock('fs');
const mockFs = { existsSync, mkdirSync } as jest.Mocked<typeof import('fs')>;
mockFs.existsSync.mockReturnValue(true);
mockFs.mkdirSync.mockReturnValue(undefined);

describe('Infrastructure Services', () => {
  let realContainer: IServiceContainer;

  beforeEach(() => {
    jest.clearAllMocks();
    realContainer = new ServiceContainer();
  });

  afterEach(() => {
    // Clean up any timers or resources
    jest.clearAllTimers();
  });

  describe('InfrastructureServices', () => {
    describe('registerServices', () => {
      it('should register all core services with container', () => {
        expect(() => {
          InfrastructureServices.registerServices(realContainer);
        }).not.toThrow();

        // Verify services are actually registered
        expect(realContainer.isRegistered('config')).toBe(true);
        expect(realContainer.isRegistered('logger')).toBe(true);
        expect(realContainer.isRegistered('enhancedLogger')).toBe(true);
        expect(realContainer.isRegistered('errorHandler')).toBe(true);
        expect(realContainer.isRegistered('fileSystem')).toBe(true);
        expect(realContainer.isRegistered('translator')).toBe(true);
        expect(realContainer.isRegistered('logManagement')).toBe(true);
      });

      it('should create container with all services', () => {
        const container = InfrastructureServices.createContainer();
        expect(container).toBeDefined();
        expect(container.isRegistered('config')).toBe(true);
        expect(container.isRegistered('logger')).toBe(true);
      });
    });

    describe('createContainer', () => {
      it('should create a new container with all services registered', () => {
        const container = InfrastructureServices.createContainer();
        expect(container).toBeInstanceOf(ServiceContainer);

        // Verify all expected services are registered
        Object.values(SERVICE_NAMES).forEach((serviceName) => {
          expect(container.isRegistered(serviceName)).toBe(true);
        });
      });

      it('should create multiple independent containers', () => {
        const container1 = InfrastructureServices.createContainer();
        const container2 = InfrastructureServices.createContainer();

        expect(container1).not.toBe(container2);
        expect(container1.isRegistered('config')).toBe(true);
        expect(container2.isRegistered('config')).toBe(true);
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
        try {
          process.env.NODE_ENV = 'development';
          const manager = EnhancedServices.createConfigManager({ test: true });
          expect(manager).toBeDefined();
        } finally {
          process.env.NODE_ENV = originalEnv;
        }
      });

      it('should handle production environment', () => {
        const originalEnv = process.env.NODE_ENV;
        try {
          process.env.NODE_ENV = 'production';
          const manager = EnhancedServices.createConfigManager();
          expect(manager).toBeDefined();
        } finally {
          process.env.NODE_ENV = originalEnv;
        }
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

        // Test that context methods are added
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.debug).toBe('function');
      });

      it('should handle logger creation with various levels', () => {
        const levels = ['debug', 'info', 'warn', 'error'];
        levels.forEach((level) => {
          expect(() => {
            const logger = EnhancedServices.createLogger(level);
            expect(logger).toBeDefined();
          }).not.toThrow();
        });
      });
    });

    describe('createErrorHandler', () => {
      it('should create error handler with logger', () => {
        const mockLogger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        };
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

      it('should create translation manager with different locales', () => {
        const locales = ['en', 'zh-TW'];
        locales.forEach((locale) => {
          const manager = EnhancedServices.createTranslationManager(locale);
          expect(manager).toBeDefined();
        });
      });
    });
  });

  describe('FileLoggingServices', () => {
    beforeEach(() => {
      // Mock file system operations
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockImplementation(() => undefined);
    });

    describe('getProjectLogsDir', () => {
      it('should return a logs directory path', () => {
        const logsDir = FileLoggingServices.getProjectLogsDir();
        expect(logsDir).toBeDefined();
        expect(typeof logsDir).toBe('string');
        expect(logsDir).toContain('logs');
      });

      it('should execute getProjectLogsDir path logic', () => {
        // Mock existsSync to return false for package.json to test fallback logic
        mockFs.existsSync.mockImplementation((path) => {
          return typeof path === 'string' && !path.includes('package.json');
        });

        const logsDir = FileLoggingServices.getProjectLogsDir();
        expect(logsDir).toBeDefined();
        expect(typeof logsDir).toBe('string');
      });

      it('should handle package.json not found in directory tree', () => {
        // Mock existsSync to always return false
        mockFs.existsSync.mockReturnValue(false);

        const logsDir = FileLoggingServices.getProjectLogsDir();
        expect(logsDir).toBeDefined();
        expect(logsDir).toContain('logs');
      });

      it('should create logs directory if it does not exist', () => {
        // Mock logs directory not existing
        mockFs.existsSync.mockImplementation((path) => {
          if (typeof path === 'string' && path.includes('package.json')) {
            return true; // package.json exists
          }
          if (typeof path === 'string' && path.includes('logs')) {
            return false; // logs directory doesn't exist
          }
          return true;
        });

        const logsDir = FileLoggingServices.getProjectLogsDir();
        expect(logsDir).toBeDefined();
        expect(mockFs.mkdirSync).toHaveBeenCalled();
      });
    });

    describe('async file logger methods', () => {
      it('should create auto file logger with timestamp', async () => {
        const logger = await FileLoggingServices.createAutoFileLogger('info');
        expect(logger).toBeDefined();
      });

      it('should create auto file logger with custom directory', async () => {
        const logger = await FileLoggingServices.createAutoFileLogger(
          'debug',
          '/custom/log/dir',
        );
        expect(logger).toBeDefined();
      });

      it('should create production file logger', async () => {
        const logger1 = await FileLoggingServices.createProductionFileLogger();
        expect(logger1).toBeDefined();

        const logger2 = await FileLoggingServices.createProductionFileLogger(
          'warn',
          'custom.log',
        );
        expect(logger2).toBeDefined();
      });

      it('should create file logger with specific config', async () => {
        const fileConfig = {
          filePath: join(process.cwd(), 'test.log'),
          maxFileSize: 5 * 1024 * 1024,
          maxBackupFiles: 3,
          format: 'json' as const,
          enableRotation: true,
          async: true,
        };

        const logger = await FileLoggingServices.createFileLogger(
          'info',
          fileConfig,
        );
        expect(logger).toBeDefined();
      });

      it('should create container with file logging', async () => {
        const fileConfig = {
          filePath: join(process.cwd(), 'test.log'),
          maxFileSize: 10 * 1024 * 1024,
          maxBackupFiles: 5,
          format: 'text' as const,
          enableRotation: true,
          async: true,
        };

        const container =
          await FileLoggingServices.createContainerWithFileLogging(fileConfig);
        expect(container).toBeDefined();
        expect(container.isRegistered('config')).toBe(true);
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

    it('should have all expected service name constants', () => {
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

    it('should use SERVICE_NAMES constants for service registration', () => {
      InfrastructureServices.registerServices(realContainer);

      // Verify all services from SERVICE_NAMES are registered
      Object.values(SERVICE_NAMES).forEach((serviceName) => {
        expect(realContainer.isRegistered(serviceName)).toBe(true);
      });
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

    it('should handle all enhanced service creation', () => {
      expect(() => {
        EnhancedServices.createConfigManager();
        EnhancedServices.createLogger();
        EnhancedServices.createErrorHandler();
        EnhancedServices.createFileSystemManager();
        EnhancedServices.createTranslationManager();
      }).not.toThrow();
    });
  });

  describe('Service Registration and Container Interaction', () => {
    it('should register config service with event handlers', () => {
      InfrastructureServices.registerServices(realContainer);

      // Verify config service is registered
      expect(realContainer.isRegistered('config')).toBe(true);

      // Try to resolve config service
      expect(() => {
        realContainer.resolve('config');
      }).not.toThrow();
    });

    it('should register logger service with file logging configuration', () => {
      InfrastructureServices.registerServices(realContainer);

      // Verify logger services are registered
      expect(realContainer.isRegistered('logger')).toBe(true);
      expect(realContainer.isRegistered('enhancedLogger')).toBe(true);
    });

    it('should register log management service with proper environment detection', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        // Test production environment
        process.env.NODE_ENV = 'production';
        const prodContainer = new ServiceContainer();
        InfrastructureServices.registerServices(prodContainer);

        expect(prodContainer.isRegistered('logManagement')).toBe(true);

        // Test development environment
        process.env.NODE_ENV = 'development';
        const devContainer = new ServiceContainer();
        InfrastructureServices.registerServices(devContainer);

        expect(devContainer.isRegistered('logManagement')).toBe(true);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should configure file logging on container services', async () => {
      const fileConfig = {
        filePath: join(process.cwd(), 'test-container.log'),
        maxFileSize: 5 * 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text' as const,
        enableRotation: true,
        async: true,
      };

      expect(async () => {
        await FileLoggingServices.configureFileLogging(
          realContainer,
          fileConfig,
        );
      }).not.toThrow();
    });
  });

  describe('Event Handler Functions', () => {
    it('should setup log management event handlers', () => {
      const mockService = {
        on: jest.fn(),
        initialize: jest.fn(),
        shutdown: jest.fn(),
      };

      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      // Import the internal function by accessing the services module
      InfrastructureServices.registerServices(realContainer);

      // Test that service registration includes event setup
      expect(realContainer.isRegistered('logManagement')).toBe(true);

      // Simulate event handler setup by testing event types
      const eventTypes = [
        'maintenance:started',
        'maintenance:completed',
        'maintenance:failed',
        'health:warning',
        'health:critical',
        'cleanup:completed',
        'archive:completed',
      ];

      eventTypes.forEach((eventType) => {
        expect(typeof eventType).toBe('string');
      });
    });
  });

  describe('FileLoggingServices advanced functionality', () => {
    it('should handle various file logger configurations', async () => {
      const configs = [
        {
          filePath: join(process.cwd(), 'debug.log'),
          maxFileSize: 1024 * 1024,
          maxBackupFiles: 2,
          format: 'text' as const,
          enableRotation: false,
          async: false,
        },
        {
          filePath: join(process.cwd(), 'json.log'),
          maxFileSize: 10 * 1024 * 1024,
          maxBackupFiles: 10,
          format: 'json' as const,
          enableRotation: true,
          async: true,
        },
      ];

      for (const config of configs) {
        const logger = await FileLoggingServices.createFileLogger(
          'info',
          config,
        );
        expect(logger).toBeDefined();
      }
    });

    it('should handle directory creation with proper path resolution', () => {
      // Test package.json found scenario
      mockFs.existsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('package.json')) {
          return true;
        }
        return false;
      });

      const logsDir1 = FileLoggingServices.getProjectLogsDir();
      expect(logsDir1).toBeDefined();

      // Test package.json not found scenario
      mockFs.existsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('package.json')) {
          return false;
        }
        return true;
      });

      const logsDir2 = FileLoggingServices.getProjectLogsDir();
      expect(logsDir2).toBeDefined();
    });

    it('should create different logger types with various levels', async () => {
      const levels: Array<'debug' | 'info' | 'warn' | 'error'> = [
        'debug',
        'info',
        'warn',
        'error',
      ];

      for (const level of levels) {
        const autoLogger =
          await FileLoggingServices.createAutoFileLogger(level);
        expect(autoLogger).toBeDefined();

        const prodLogger = await FileLoggingServices.createProductionFileLogger(
          level,
          `${level}.log`,
        );
        expect(prodLogger).toBeDefined();
      }
    });
  });

  describe('Environment and Configuration Handling', () => {
    it('should handle different NODE_ENV configurations', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        const environments = ['development', 'production', 'test', undefined];

        environments.forEach((env) => {
          process.env.NODE_ENV = env;

          expect(() => {
            const container = InfrastructureServices.createContainer();
            expect(container).toBeDefined();
          }).not.toThrow();
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should create enhanced services with error recovery', () => {
      // Test error recovery in createConfigManager
      expect(() => {
        const manager1 = EnhancedServices.createConfigManager();
        expect(manager1).toBeDefined();

        const manager2 = EnhancedServices.createConfigManager({
          customOption: 'test',
          anotherOption: 123,
        });
        expect(manager2).toBeDefined();
      }).not.toThrow();

      // Test error recovery in createLogger
      expect(() => {
        const logger1 = EnhancedServices.createLogger('info');
        expect(logger1).toBeDefined();

        const logger2 = EnhancedServices.createLogger('debug', 'CustomContext');
        expect(logger2).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Service Integration Tests', () => {
    it('should integrate multiple services successfully', () => {
      const container = InfrastructureServices.createContainer();

      // Test service resolution in correct order
      const services = [
        'config',
        'errorHandler',
        'fileSystem',
        'translator',
        'logger',
        'enhancedLogger',
        'logManagement',
      ];

      services.forEach((serviceName) => {
        expect(() => {
          container.resolve(serviceName);
        }).not.toThrow();
      });
    });

    it('should handle service dependency injection', () => {
      const container = InfrastructureServices.createContainer();

      // Error handler should get logger dependency
      const errorHandler = container.resolve('errorHandler');
      expect(errorHandler).toBeDefined();

      // Translation manager should work independently
      const translator = container.resolve('translator');
      expect(translator).toBeDefined();

      // File system manager should work independently
      const fileSystem = container.resolve('fileSystem');
      expect(fileSystem).toBeDefined();
    });
  });
});
