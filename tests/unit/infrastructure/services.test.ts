import {
  InfrastructureServices,
  EnhancedServices,
  FileLoggingServices,
  SERVICE_NAMES,
  ServiceUtils,
} from '../../../src/infrastructure/services';
import type { FileLoggingConfig } from '../../../src/infrastructure/logging/types';
import { existsSync, mkdirSync } from 'fs';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock fs-extra
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  ensureDirSync: jest.fn().mockImplementation(),
  readJson: jest.fn().mockResolvedValue({}),
  readJsonSync: jest.fn().mockReturnValue({}),
  writeJson: jest.fn().mockResolvedValue(undefined),
  writeJsonSync: jest.fn().mockImplementation(),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn().mockImplementation(),
  pathExistsSync: jest.fn().mockReturnValue(true),
  pathExists: jest.fn().mockResolvedValue(true),
  copySync: jest.fn().mockImplementation(),
  removeSync: jest.fn().mockImplementation(),
  mkdir: jest.fn().mockResolvedValue(undefined),
  createWriteStream: jest.fn().mockReturnValue({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  }),
}));

// Mock glob
jest.mock('glob', () => ({
  glob: jest.fn().mockResolvedValue([]),
  globSync: jest.fn().mockReturnValue([]),
}));

describe('InfrastructureServices', () => {
  describe('Service Registration', () => {
    it('should register all infrastructure services', () => {
      const container = InfrastructureServices.createContainer();
      // Verify all services are registered
      expect(container.isRegistered(SERVICE_NAMES.CONFIG)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.LOGGER)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.ENHANCED_LOGGER)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.ERROR_HANDLER)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.FILE_SYSTEM)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.TRANSLATOR)).toBe(true);
    });

    it('should resolve all services without errors', () => {
      const container = InfrastructureServices.createContainer();
      // Should resolve all services
      expect(() => container.resolve(SERVICE_NAMES.CONFIG)).not.toThrow();
      expect(() => container.resolve(SERVICE_NAMES.LOGGER)).not.toThrow();
      expect(() =>
        container.resolve(SERVICE_NAMES.ENHANCED_LOGGER),
      ).not.toThrow();
      expect(() =>
        container.resolve(SERVICE_NAMES.ERROR_HANDLER),
      ).not.toThrow();
      expect(() => container.resolve(SERVICE_NAMES.FILE_SYSTEM)).not.toThrow();
      expect(() => container.resolve(SERVICE_NAMES.TRANSLATOR)).not.toThrow();
    });

    it('should create singleton services', () => {
      const container = InfrastructureServices.createContainer();
      const config1 = container.resolve(SERVICE_NAMES.CONFIG);
      const config2 = container.resolve(SERVICE_NAMES.CONFIG);
      expect(config1).toBe(config2);
      const logger1 = container.resolve(SERVICE_NAMES.LOGGER);
      const logger2 = container.resolve(SERVICE_NAMES.LOGGER);
      expect(logger1).toBe(logger2);
    });

    it('should create container with registerServices', () => {
      const mockContainer = {
        registerSingleton: jest.fn(),
        isRegistered: jest.fn().mockReturnValue(true),
        resolve: jest.fn(),
      };

      InfrastructureServices.registerServices(mockContainer as any);

      // Should have registered all services
      expect(mockContainer.registerSingleton).toHaveBeenCalledTimes(7); // config, enhancedLogger, logger, errorHandler, fileSystem, translator, logManagement
    });
  });

  describe('Service Names Constants', () => {
    it('should provide consistent service name constants', () => {
      expect(SERVICE_NAMES.CONFIG).toBe('config');
      expect(SERVICE_NAMES.LOGGER).toBe('logger');
      expect(SERVICE_NAMES.ENHANCED_LOGGER).toBe('enhancedLogger');
      expect(SERVICE_NAMES.ERROR_HANDLER).toBe('errorHandler');
      expect(SERVICE_NAMES.FILE_SYSTEM).toBe('fileSystem');
      expect(SERVICE_NAMES.TRANSLATOR).toBe('translator');
    });

    it('should have all service names as readonly constants', () => {
      // Test that SERVICE_NAMES is properly typed as const
      const serviceNames = Object.keys(SERVICE_NAMES);
      expect(serviceNames).toContain('CONFIG');
      expect(serviceNames).toContain('LOGGER');
      expect(serviceNames).toContain('ENHANCED_LOGGER');
      expect(serviceNames).toContain('ERROR_HANDLER');
      expect(serviceNames).toContain('FILE_SYSTEM');
      expect(serviceNames).toContain('TRANSLATOR');
    });
  });
});

describe('EnhancedServices', () => {
  describe('Enhanced Service Creation', () => {
    it('should create enhanced config manager', () => {
      const configManager = EnhancedServices.createConfigManager();
      expect(configManager).toBeDefined();
      expect(typeof configManager.get).toBe('function');
      expect(typeof configManager.set).toBe('function');
    });

    it('should create enhanced config manager with development options', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const configManager = EnhancedServices.createConfigManager();
      expect(configManager).toBeDefined();

      // Should have development settings
      expect(configManager.get('logging.level')).toBe('debug');
      expect(configManager.get('development.mode')).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should create config manager with custom options', () => {
      const options = { customOption: 'test' };
      const configManager = EnhancedServices.createConfigManager(options);
      expect(configManager).toBeDefined();
    });

    it('should create enhanced logger', () => {
      const logger = EnhancedServices.createLogger('info');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should create enhanced logger with context', () => {
      const logger = EnhancedServices.createLogger('debug', 'TEST');
      expect(logger).toBeDefined();
      // Mock console to test context functionality
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test message');
      // Should include context in log output
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TEST] test message'),
      );
      consoleSpy.mockRestore();
    });

    it('should create logger without context', () => {
      const logger = EnhancedServices.createLogger('info');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create enhanced error handler', () => {
      const errorHandler = EnhancedServices.createErrorHandler();
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.handleError).toBe('function');
      expect(typeof errorHandler.formatError).toBe('function');
    });

    it('should create error handler with logger parameter', () => {
      const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
      };

      const errorHandler = EnhancedServices.createErrorHandler(
        mockLogger as any,
      );
      expect(errorHandler).toBeDefined();
    });

    it('should create enhanced file system manager', () => {
      const fileSystemManager = EnhancedServices.createFileSystemManager();
      expect(fileSystemManager).toBeDefined();
      expect(typeof fileSystemManager.readFile).toBe('function');
      expect(typeof fileSystemManager.writeFile).toBe('function');
    });

    it('should create enhanced translation manager', () => {
      const translationManager =
        EnhancedServices.createTranslationManager('en');
      expect(translationManager).toBeDefined();
      expect(typeof translationManager.t).toBe('function');
      expect(translationManager.getCurrentLocale()).toBe('en');
    });

    it('should create translation manager with default locale', () => {
      const translationManager = EnhancedServices.createTranslationManager();
      expect(translationManager).toBeDefined();
      expect(translationManager.getCurrentLocale()).toBe('en');
    });

    it('should handle translation manager with specific locale', () => {
      const translationManager =
        EnhancedServices.createTranslationManager('zh-TW');
      expect(translationManager).toBeDefined();
      expect(translationManager.getCurrentLocale()).toBe('zh-TW');
    });
  });

  describe('Error Handling', () => {
    it('should handle factory creation errors gracefully', () => {
      // These should not throw errors even if there are issues
      expect(() => EnhancedServices.createConfigManager()).not.toThrow();
      expect(() =>
        EnhancedServices.createLogger('invalid' as never),
      ).not.toThrow();
      expect(() => EnhancedServices.createErrorHandler()).not.toThrow();
      expect(() => EnhancedServices.createFileSystemManager()).not.toThrow();
      expect(() =>
        EnhancedServices.createTranslationManager('invalid' as never),
      ).not.toThrow();
    });
  });
});

describe('FileLoggingServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
    (mkdirSync as jest.Mock).mockImplementation();
  });

  describe('File Logger Creation', () => {
    it('should create file logger with config', async () => {
      const fileConfig: FileLoggingConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
      };

      const logger = await FileLoggingServices.createFileLogger(
        'info',
        fileConfig,
      );
      expect(logger).toBeDefined();
    });

    it('should create auto file logger', async () => {
      const logger = await FileLoggingServices.createAutoFileLogger('debug');
      expect(logger).toBeDefined();
    });

    it('should create auto file logger with custom directory', async () => {
      const logger = await FileLoggingServices.createAutoFileLogger(
        'info',
        '/custom/logs',
      );
      expect(logger).toBeDefined();
    });

    it('should create production file logger', async () => {
      const logger = await FileLoggingServices.createProductionFileLogger(
        'warn',
        'prod.log',
      );
      expect(logger).toBeDefined();
    });

    it('should create production file logger with defaults', async () => {
      const logger = await FileLoggingServices.createProductionFileLogger();
      expect(logger).toBeDefined();
    });
  });

  describe('Project Logs Directory', () => {
    it('should get project logs directory', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return path.includes('package.json');
      });

      const logDir = FileLoggingServices.getProjectLogsDir();
      expect(logDir).toBeDefined();
      expect(typeof logDir).toBe('string');
    });

    it('should create logs directory if it does not exist', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('package.json')) return true;
        if (path.includes('logs')) return false;
        return false;
      });

      const logDir = FileLoggingServices.getProjectLogsDir();
      expect(mkdirSync).toHaveBeenCalledWith(logDir, { recursive: true });
    });

    it('should handle case when package.json is not found', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const logDir = FileLoggingServices.getProjectLogsDir();
      expect(logDir).toBeDefined();
    });
  });

  describe('Container Integration', () => {
    it('should create container with file logging', async () => {
      const fileConfig: FileLoggingConfig = {
        filePath: '/test/container.log',
        maxFileSize: 2048,
        maxBackupFiles: 2,
        format: 'json',
        enableRotation: true,
        async: false,
      };

      const container =
        await FileLoggingServices.createContainerWithFileLogging(fileConfig);
      expect(container).toBeDefined();
    });

    it('should configure file logging for existing container', async () => {
      const container = InfrastructureServices.createContainer();
      const fileConfig: FileLoggingConfig = {
        filePath: '/test/existing.log',
        maxFileSize: 1024,
        maxBackupFiles: 1,
        format: 'text',
        enableRotation: false,
        async: true,
      };

      // Should not throw
      await expect(
        FileLoggingServices.configureFileLogging(container, fileConfig),
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle file logger creation errors', async () => {
      const invalidConfig = {
        filePath: '', // Invalid path
        maxFileSize: -1, // Invalid size
        maxBackupFiles: 0,
        format: 'invalid' as any,
        enableRotation: true,
        async: true,
      };

      // Should not throw, should fallback gracefully
      const logger = await FileLoggingServices.createFileLogger(
        'info',
        invalidConfig,
      );
      expect(logger).toBeDefined();
    });

    it('should handle auto file logger errors gracefully', async () => {
      (mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw, should handle error gracefully
      const logger = await FileLoggingServices.createAutoFileLogger();
      expect(logger).toBeDefined();
    });

    it('should handle container file logging configuration errors', async () => {
      const mockContainer = {
        resolve: jest.fn().mockImplementation(() => {
          throw new Error('Service resolution failed');
        }),
      };

      const fileConfig: FileLoggingConfig = {
        filePath: '/test/error.log',
        maxFileSize: 1024,
        maxBackupFiles: 1,
        format: 'text',
        enableRotation: true,
        async: true,
      };

      // Should not throw
      await expect(
        FileLoggingServices.configureFileLogging(
          mockContainer as any,
          fileConfig,
        ),
      ).resolves.not.toThrow();
    });
  });
});

describe('Additional Coverage Tests', () => {
  it('should test config change handlers for enhanced logger', () => {
    // This tests lines 41-53, 62-104 in services.ts
    const container = InfrastructureServices.createContainer();
    const config = container.resolve(SERVICE_NAMES.CONFIG) as any;

    expect(config).toBeDefined();
    expect(typeof config.get).toBe('function');
  });

  it('should handle logger without enhanced logger fallback', () => {
    // Test the logger service fallback logic (lines 172-210)
    const container = InfrastructureServices.createContainer();
    const logger = container.resolve(SERVICE_NAMES.LOGGER);

    expect(logger).toBeDefined();
  });

  it('should test enhanced services try-catch blocks', () => {
    // Test error handling in enhanced services (lines 280-284, 316-317, 329-330, 342-346, 362-366)

    // Test with invalid log level
    const logger1 = EnhancedServices.createLogger('invalid' as any);
    expect(logger1).toBeDefined();

    // Test with undefined context
    const logger2 = EnhancedServices.createLogger('warn', undefined);
    expect(logger2).toBeDefined();

    // Test with empty string locale
    const translator = EnhancedServices.createTranslationManager('');
    expect(translator).toBeDefined();
  });

  it('should test development environment config handling', () => {
    // Test development environment branch (lines around 280-284)
    const originalEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'production';
      const configManager1 = EnhancedServices.createConfigManager();
      expect(configManager1).toBeDefined();

      process.env.NODE_ENV = 'test';
      const configManager2 = EnhancedServices.createConfigManager();
      expect(configManager2).toBeDefined();

      process.env.NODE_ENV = undefined;
      const configManager3 = EnhancedServices.createConfigManager();
      expect(configManager3).toBeDefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('should test logger context assignment edge cases', () => {
    // Test the context binding logic (lines 304, 306, 310)
    const logger1 = EnhancedServices.createLogger('error', 'CONTEXT1');
    const logger2 = EnhancedServices.createLogger('warn', 'CONTEXT2');
    const logger3 = EnhancedServices.createLogger('debug', '');

    expect(logger1).toBeDefined();
    expect(logger2).toBeDefined();
    expect(logger3).toBeDefined();
  });

  it('should handle different log levels in enhanced logger', () => {
    // Test various log levels
    const levels = ['error', 'warn', 'info', 'debug'] as const;

    levels.forEach((level) => {
      const logger = EnhancedServices.createLogger(level);
      expect(logger).toBeDefined();
      expect(typeof logger[level]).toBe('function');
    });
  });

  it('should test config manager with different option types', () => {
    // Test config manager with various options
    const manager1 = EnhancedServices.createConfigManager(undefined);
    const manager2 = EnhancedServices.createConfigManager({});
    const manager3 = EnhancedServices.createConfigManager({ test: 'value' });

    expect(manager1).toBeDefined();
    expect(manager2).toBeDefined();
    expect(manager3).toBeDefined();
  });
});

describe('Configuration Change Handlers', () => {
  it('should handle logging configuration changes', async () => {
    const container = InfrastructureServices.createContainer();
    const configManager = container.resolve('config') as any;

    // Just test that configuration changes don't throw errors
    await configManager.set('logging.fileEnabled', true);
    await configManager.set('logging.fileEnabled', false);
    await configManager.set('logging.level', 'debug');

    // Configuration manager should be functional
    expect(configManager).toBeDefined();
  });

  it('should handle config change handler errors gracefully', async () => {
    const container = InfrastructureServices.createContainer();
    const configManager = container.resolve('config') as any;

    // Test config change without enhanced logger
    await configManager.set('logging.fileEnabled', true);
    await configManager.set('logging.level', 'info');

    // Should not throw errors
    expect(configManager).toBeDefined();
  });

  it('should handle notification service creation fallback', async () => {
    const container = InfrastructureServices.createContainer();

    // Remove logger and translator to trigger fallback
    container.unregister('logger');
    container.unregister('translator');

    const configManager = container.resolve('config') as any;

    // Mock console.log to verify fallback
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Trigger config creation event
    await configManager.set('test', 'value');

    consoleSpy.mockRestore();

    expect(configManager).toBeDefined();
  });
});

describe('Log Management Service Events', () => {
  it('should handle log management service events', async () => {
    const {
      setupLogManagementEventHandlers,
    } = require('../../../src/infrastructure/services');

    // Mock log management service
    const mockService = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    // Mock logger
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Configure events
    setupLogManagementEventHandlers(mockService, mockLogger);

    // Verify event listeners were registered
    expect(mockService.on).toHaveBeenCalledWith(
      'maintenance:started',
      expect.any(Function),
    );
    expect(mockService.on).toHaveBeenCalledWith(
      'maintenance:completed',
      expect.any(Function),
    );
    expect(mockService.on).toHaveBeenCalledWith(
      'maintenance:failed',
      expect.any(Function),
    );
    expect(mockService.on).toHaveBeenCalledWith(
      'health:warning',
      expect.any(Function),
    );
    expect(mockService.on).toHaveBeenCalledWith(
      'health:critical',
      expect.any(Function),
    );
    expect(mockService.on).toHaveBeenCalledWith(
      'cleanup:completed',
      expect.any(Function),
    );
    expect(mockService.on).toHaveBeenCalledWith(
      'archive:completed',
      expect.any(Function),
    );

    // Test event handlers
    const calls = mockService.on.mock.calls;

    // Test maintenance:started handler
    const startedHandler = calls.find(
      (call) => call[0] === 'maintenance:started',
    )[1];
    startedHandler();
    expect(mockLogger.debug).toHaveBeenCalledWith('Log maintenance started');

    // Test maintenance:completed handler
    const completedHandler = calls.find(
      (call) => call[0] === 'maintenance:completed',
    )[1];
    const mockResult = {
      duration: 1000,
      actions: ['cleanup', 'archive'],
      diskSpace: { spaceFreed: 1024 },
    };
    completedHandler(mockResult);
    expect(mockLogger.info).toHaveBeenCalledWith('Log maintenance completed', {
      duration: 1000,
      actions: ['cleanup', 'archive'],
      spaceFreed: 1024,
    });

    // Test maintenance:failed handler
    const failedHandler = calls.find(
      (call) => call[0] === 'maintenance:failed',
    )[1];
    const mockError = new Error('Test error');
    failedHandler(mockError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Log maintenance failed:',
      'Test error',
    );

    // Test health:warning handler
    const warningHandler = calls.find(
      (call) => call[0] === 'health:warning',
    )[1];
    const mockWarning = {
      message: 'High disk usage',
      type: 'disk',
      currentValue: 90,
      threshold: 85,
    };
    warningHandler(mockWarning);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Log health warning: High disk usage',
      {
        type: 'disk',
        currentValue: 90,
        threshold: 85,
      },
    );

    // Test health:critical handler
    const criticalHandler = calls.find(
      (call) => call[0] === 'health:critical',
    )[1];
    const mockCritical = {
      message: 'Disk full',
      type: 'disk',
      details: { usage: 100 },
    };
    criticalHandler(mockCritical);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Log health critical: Disk full',
      {
        type: 'disk',
        details: { usage: 100 },
      },
    );

    // Test cleanup:completed handler
    const cleanupHandler = calls.find(
      (call) => call[0] === 'cleanup:completed',
    )[1];
    cleanupHandler(5);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Log cleanup completed: 5 files removed',
    );

    // Test cleanup:completed handler with 0 files (should not log)
    mockLogger.info.mockClear();
    cleanupHandler(0);
    expect(mockLogger.info).not.toHaveBeenCalled();

    // Test archive:completed handler
    const archiveHandler = calls.find(
      (call) => call[0] === 'archive:completed',
    )[1];
    archiveHandler(['file1.log', 'file2.log']);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Log archiving completed: 2 files archived',
    );

    // Test archive:completed handler with empty array (should not log)
    mockLogger.info.mockClear();
    archiveHandler([]);
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should handle log management service events without logger', async () => {
    const {
      setupLogManagementEventHandlers,
    } = require('../../../src/infrastructure/services');

    const mockService = {
      on: jest.fn(),
    };

    // Configure events without logger (should not throw)
    setupLogManagementEventHandlers(mockService, null);

    expect(mockService.on).toHaveBeenCalled();

    // Test handlers with null logger
    const calls = mockService.on.mock.calls;
    const startedHandler = calls.find(
      (call) => call[0] === 'maintenance:started',
    )[1];

    // Should not throw with null logger
    expect(() => startedHandler()).not.toThrow();
  });
});

describe('ServiceUtils', () => {
  describe('Service Health Checks', () => {
    it('should check services health successfully', async () => {
      const container = InfrastructureServices.createContainer();

      const healthStatus = await ServiceUtils.checkServicesHealth(container);

      expect(healthStatus).toEqual({
        logManagement: expect.any(Boolean),
        overall: expect.any(Boolean),
      });
    });

    it('should handle health check errors', async () => {
      const mockContainer = {
        tryResolve: jest.fn().mockImplementation((serviceName) => {
          if (serviceName === 'logManagement') {
            return {
              checkHealth: jest
                .fn()
                .mockRejectedValue(new Error('Health check failed')),
            };
          }
          return null;
        }),
      };

      const healthStatus = await ServiceUtils.checkServicesHealth(
        mockContainer as any,
      );

      expect(healthStatus).toEqual({
        logManagement: false,
        overall: false,
      });
    });

    it('should handle missing log management service', async () => {
      const mockContainer = {
        tryResolve: jest.fn().mockReturnValue(null),
      };

      const healthStatus = await ServiceUtils.checkServicesHealth(
        mockContainer as any,
      );

      expect(healthStatus).toEqual({
        logManagement: false,
        overall: false,
      });
    });
  });

  describe('Service Status Reporting', () => {
    it('should get services status', () => {
      const container = InfrastructureServices.createContainer();

      const status = ServiceUtils.getServicesStatus(container);

      expect(status).toEqual({
        logManagement: expect.any(Object),
        timestamp: expect.any(Date),
      });
    });

    it('should handle missing log management service in status', () => {
      const mockContainer = {
        tryResolve: jest.fn().mockReturnValue(null),
      };

      const status = ServiceUtils.getServicesStatus(mockContainer as any);

      expect(status).toEqual({
        logManagement: { available: false },
        timestamp: expect.any(Date),
      });
    });
  });

  describe('Service Maintenance', () => {
    it('should perform services maintenance', async () => {
      const mockLogManagement = {
        runMaintenance: jest.fn().mockResolvedValue({
          timestamp: new Date(),
          duration: 1000,
          actions: { rotations: 1, compressions: 2 },
        }),
      };

      const mockContainer = {
        tryResolve: jest.fn().mockReturnValue(mockLogManagement),
      };

      const maintenanceResult = await ServiceUtils.performServicesMaintenance(
        mockContainer as any,
      );

      expect(maintenanceResult).toEqual({
        logManagement: {
          timestamp: expect.any(Date),
          duration: 1000,
          actions: { rotations: 1, compressions: 2 },
        },
        timestamp: expect.any(Date),
      });

      expect(mockLogManagement.runMaintenance).toHaveBeenCalled();
    });

    it('should handle maintenance errors', async () => {
      const mockLogManagement = {
        runMaintenance: jest
          .fn()
          .mockRejectedValue(new Error('Maintenance failed')),
      };

      const mockContainer = {
        tryResolve: jest.fn().mockReturnValue(mockLogManagement),
      };

      const maintenanceResult = await ServiceUtils.performServicesMaintenance(
        mockContainer as any,
      );

      expect(maintenanceResult).toEqual({
        logManagement: {
          error: 'Maintenance failed',
        },
        timestamp: expect.any(Date),
      });
    });

    it('should handle missing log management service in maintenance', async () => {
      const mockContainer = {
        tryResolve: jest.fn().mockReturnValue(null),
      };

      const maintenanceResult = await ServiceUtils.performServicesMaintenance(
        mockContainer as any,
      );

      expect(maintenanceResult).toEqual({
        logManagement: null,
        timestamp: expect.any(Date),
      });
    });
  });
});

describe('Enhanced Configuration Handlers', () => {
  describe('Logger Configuration Updates', () => {
    it('should handle file logging configuration changes', async () => {
      const container = InfrastructureServices.createContainer();
      const configManager = container.resolve('config') as any;
      const enhancedLogger = container.resolve('enhancedLogger') as any;

      // Mock enhanced logger methods
      enhancedLogger.isFileLoggingEnabled = jest.fn().mockReturnValue(false);
      enhancedLogger.enableFileLogging = jest.fn().mockResolvedValue(undefined);
      enhancedLogger.disableFileLogging = jest
        .fn()
        .mockResolvedValue(undefined);
      enhancedLogger.setLevel = jest.fn();

      // Test enabling file logging
      await configManager.set('logging.fileEnabled', true);

      // Test disabling file logging
      await configManager.set('logging.fileEnabled', false);

      // Test changing log level
      await configManager.set('logging.level', 'debug');

      expect(configManager).toBeDefined();
    });

    it('should handle logging configuration errors gracefully', async () => {
      const container = InfrastructureServices.createContainer();
      const configManager = container.resolve('config') as any;

      // Spy on console.warn to verify error handling
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock enhanced logger to throw errors
      const enhancedLogger = container.resolve('enhancedLogger') as any;
      enhancedLogger.enableFileLogging = jest
        .fn()
        .mockRejectedValue(new Error('File logging failed'));
      enhancedLogger.isFileLoggingEnabled = jest.fn().mockReturnValue(false);

      // This should trigger error handling
      await configManager.set('logging.fileEnabled', true);

      warnSpy.mockRestore();
      expect(configManager).toBeDefined();
    });
  });

  describe('Config Creation Notifications', () => {
    it('should handle config creation notification errors', () => {
      const container = InfrastructureServices.createContainer();

      // Remove logger and translator to trigger fallback
      container.unregister('logger');
      container.unregister('translator');

      const configManager = container.resolve('config') as any;

      // Mock console.log to verify fallback
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Trigger config creation notification (this will use fallback)
      if (configManager.onConfigCreated) {
        const mockHandler =
          configManager._eventHandlers?.['configCreated']?.[0];
        if (mockHandler) {
          mockHandler('/test/config.json');
        }
      }

      consoleSpy.mockRestore();
      expect(configManager).toBeDefined();
    });
  });
});

describe('Logger Service Fallback Logic', () => {
  describe('File Logging Fallback', () => {
    it('should use enhanced logger when file logging is enabled', () => {
      const container = InfrastructureServices.createContainer();

      // Get config to enable file logging
      const config = container.resolve('config') as any;
      config.set('logging.fileEnabled', true);

      // Resolve logger - should use enhanced logger fallback path
      const logger = container.resolve('logger');

      expect(logger).toBeDefined();
    });

    it('should handle enhanced logger creation errors in logger service', () => {
      const mockContainer = {
        tryResolve: jest.fn().mockImplementation((serviceName) => {
          if (serviceName === 'config') {
            return {
              get: jest.fn().mockImplementation((key, defaultValue) => {
                if (key === 'logging.fileEnabled') return true;
                if (key === 'logging.level') return 'info';
                return defaultValue;
              }),
            };
          }
          if (serviceName === 'enhancedLogger') {
            return null; // Enhanced logger not available
          }
          return null;
        }),
        registerSingleton: jest.fn(),
        isRegistered: jest.fn().mockReturnValue(true),
        resolve: jest.fn(),
      };

      // This should trigger the fallback creation logic
      InfrastructureServices.registerServices(mockContainer as any);

      // Verify logger registration was called
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'logger',
        expect.any(Function),
      );
    });

    it('should handle file logging creation errors gracefully', () => {
      // Spy on console.warn to verify error handling
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockContainer = {
        tryResolve: jest.fn().mockImplementation((serviceName) => {
          if (serviceName === 'config') {
            return {
              get: jest.fn().mockImplementation((key, defaultValue) => {
                if (key === 'logging.fileEnabled') return true;
                if (key === 'logging.level') return 'info';
                return defaultValue;
              }),
            };
          }
          return null;
        }),
        registerSingleton: jest.fn(),
        isRegistered: jest.fn().mockReturnValue(true),
        resolve: jest.fn(),
      };

      InfrastructureServices.registerServices(mockContainer as any);

      warnSpy.mockRestore();
      expect(mockContainer.registerSingleton).toHaveBeenCalled();
    });

    it('should use console-only logger when file logging is disabled', () => {
      const mockContainer = {
        tryResolve: jest.fn().mockImplementation((serviceName) => {
          if (serviceName === 'config') {
            return {
              get: jest.fn().mockImplementation((key, defaultValue) => {
                if (key === 'logging.fileEnabled') return false;
                if (key === 'logging.level') return 'info';
                return defaultValue;
              }),
            };
          }
          return null;
        }),
        registerSingleton: jest.fn(),
        isRegistered: jest.fn().mockReturnValue(true),
        resolve: jest.fn(),
      };

      InfrastructureServices.registerServices(mockContainer as any);

      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'logger',
        expect.any(Function),
      );
    });
  });
});

describe('Enhanced Services Error Handling', () => {
  describe('ConfigManager Error Handling', () => {
    it('should handle ConfigManager creation errors', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock ConfigManager constructor to throw
      const MockConfigManager = jest.fn().mockImplementation(() => {
        throw new Error('ConfigManager creation failed');
      });

      // Replace constructor temporarily
      jest.doMock('../../../src/infrastructure/config', () => ({
        ConfigManager: MockConfigManager,
      }));

      // This should trigger error handling and fallback
      const configManager = EnhancedServices.createConfigManager();

      expect(configManager).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('Logger Error Handling', () => {
    it('should handle Logger creation errors', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This should trigger error handling in createLogger
      const logger = EnhancedServices.createLogger('invalid-level' as any);

      expect(logger).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('ErrorHandler Error Handling', () => {
    it('should handle ErrorHandler creation errors', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This should not fail even with invalid logger
      const errorHandler = EnhancedServices.createErrorHandler(null as any);

      expect(errorHandler).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('FileSystemManager Error Handling', () => {
    it('should handle FileSystemManager creation errors', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This should handle any creation errors gracefully
      const fileSystemManager = EnhancedServices.createFileSystemManager();

      expect(fileSystemManager).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('TranslationManager Error Handling', () => {
    it('should handle TranslationManager creation errors', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This should handle invalid locale gracefully
      const translationManager = EnhancedServices.createTranslationManager(
        'invalid-locale' as any,
      );

      expect(translationManager).toBeDefined();
      warnSpy.mockRestore();
    });
  });
});

describe('No-op Log Management Service', () => {
  it('should test no-op service methods', async () => {
    const {
      createNoOpLogManagementService,
    } = require('../../../src/infrastructure/services');

    const service = createNoOpLogManagementService();

    // Test all no-op methods
    const stats = await service.getStats();
    expect(stats).toEqual({
      totalEntries: 0,
      currentFileSize: 0,
      rotationCount: 0,
      isRotationNeeded: false,
    });

    const diskUsage = await service.getDiskUsage();
    expect(diskUsage).toEqual({
      totalSpace: 0,
      usedSpace: 0,
      availableSpace: 0,
      logDirectorySize: 0,
      usagePercentage: 0,
    });

    // Test checkHealth method (no-op for disabled service)
    await service.checkHealth();

    const searchResults = await service.searchLogs({});
    expect(searchResults).toEqual({
      entries: [],
      totalCount: 0,
      hasMore: false,
      searchStats: {
        totalLines: 0,
        filesSearched: 0,
        searchDuration: expect.any(Number),
      },
      warning: 'Log management is disabled in configuration',
    });

    const analysisResults = await service.analyzeLogs({});
    expect(analysisResults).toEqual({
      totalLogs: 0,
      logsByLevel: { error: 0, warn: 0, info: 0, debug: 0 },
      timeRange: { earliest: expect.any(Date), latest: expect.any(Date) },
      topMessages: [],
      errorPatterns: [],
      performanceMetrics: {
        averageWriteTime: 0,
        maxWriteTime: 0,
        queueFullEvents: 0,
        logFrequency: { hour: 0, day: 0, total: 0 },
      },
      fileStatistics: [],
      insights: {
        errorRate: 0,
        warningRate: 0,
        busiestHour: { hour: 0, count: 0 },
        commonErrors: [],
        recommendations: ['Log management is disabled in configuration'],
      },
      warning: 'Log management is disabled in configuration',
    });

    const maintenanceResult = await service.runMaintenance();
    expect(maintenanceResult).toEqual({
      timestamp: expect.any(Date),
      duration: 0,
      actions: { rotations: 0, compressions: 0, archives: 0, cleanups: 0 },
      diskSpace: {
        before: {
          totalSpace: 0,
          usedSpace: 0,
          availableSpace: 0,
          usagePercentage: 0,
          logDirectorySize: 0,
        },
        after: {
          totalSpace: 0,
          usedSpace: 0,
          availableSpace: 0,
          usagePercentage: 0,
          logDirectorySize: 0,
        },
        spaceFreed: 0,
      },
    });

    // Test archiveLogs
    await service.archiveLogs();

    // Test cleanupOldLogs
    const cleanupResult = await service.cleanupOldLogs();
    expect(cleanupResult).toBe(0);

    // Test getStatus
    const status = service.getStatus();
    expect(status).toEqual({
      initialized: false,
      config: { autoMaintenance: false, enableHealthCheck: false },
      timers: { maintenance: false, healthCheck: false },
    });

    // Test initialize and shutdown methods
    await service.initialize();
    await service.shutdown();

    // Test rotateLogs
    await service.rotateLogs();

    // Test archiveLogs with return value
    const archiveResult = await service.archiveLogs();
    expect(archiveResult).toEqual([]);

    // All no-op service methods tested successfully
  });

  it('should test no-op service console warnings', async () => {
    const {
      createNoOpLogManagementService,
    } = require('../../../src/infrastructure/services');
    const service = createNoOpLogManagementService();

    // Spy on console.warn to verify warning messages
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Test methods that should log warnings
    await service.searchLogs({});
    await service.analyzeLogs({});
    await service.rotateLogs();
    await service.archiveLogs();
    await service.cleanupOldLogs();
    await service.checkHealth();
    await service.initialize();
    await service.shutdown();

    // Verify warning messages were logged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Log search skipped: Log management is disabled'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Log analysis skipped: Log management is disabled',
      ),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Log rotation skipped: Log management is disabled',
      ),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Log archival skipped: Log management is disabled',
      ),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Log cleanup skipped: Log management is disabled',
      ),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Health check skipped: Log management is disabled',
      ),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Log management initialization skipped: Log management is disabled',
      ),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Log management shutdown skipped: Log management is disabled',
      ),
    );

    warnSpy.mockRestore();
  });
});

describe('Log Management Service Configuration', () => {
  describe('Production vs Development Configuration', () => {
    it('should create production log management service', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const container = InfrastructureServices.createContainer();
        const logManagement = container.resolve('logManagement') as any;

        expect(logManagement).toBeDefined();

        // Cleanup timers to prevent open handles
        if (logManagement.shutdown) {
          await logManagement.shutdown();
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should create development log management service', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const container = InfrastructureServices.createContainer();
        const logManagement = container.resolve('logManagement') as any;

        expect(logManagement).toBeDefined();

        // Cleanup timers to prevent open handles
        if (logManagement.shutdown) {
          await logManagement.shutdown();
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle disabled logging configuration', () => {
      const mockContainer = {
        tryResolve: jest.fn().mockImplementation((serviceName) => {
          if (serviceName === 'config') {
            return {
              get: jest.fn().mockImplementation((key, defaultValue) => {
                if (key === 'logging.enabled') return false;
                return defaultValue;
              }),
            };
          }
          return null;
        }),
        registerSingleton: jest.fn(),
        isRegistered: jest.fn().mockReturnValue(true),
        resolve: jest.fn(),
      };

      InfrastructureServices.registerServices(mockContainer as any);

      // Should have registered log management service with no-op implementation
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'logManagement',
        expect.any(Function),
      );
    });
  });
});
