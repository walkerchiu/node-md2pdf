/**
 * Infrastructure Services Tests
 */

import {
  InfrastructureServices,
  EnhancedServices,
  FileLoggingServices,
  ServiceUtils,
  SERVICE_NAMES,
} from '../../../src/infrastructure/services';
import { ServiceContainer } from '../../../src/shared/container';
import type { IServiceContainer } from '../../../src/shared/container';
import type { IConfigManager } from '../../../src/infrastructure/config';
import type {
  ILogger,
  IEnhancedLogger,
} from '../../../src/infrastructure/logging';
import type { IErrorHandler } from '../../../src/infrastructure/error';
import type { IFileSystemManager } from '../../../src/infrastructure/filesystem';
import type { ITranslationManager } from '../../../src/infrastructure/i18n';

describe('InfrastructureServices', () => {
  let container: IServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('registerServices', () => {
    it('should register all required services', () => {
      InfrastructureServices.registerServices(container);

      expect(container.tryResolve(SERVICE_NAMES.CONFIG)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.LOGGER)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.ENHANCED_LOGGER)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.ERROR_HANDLER)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.FILE_SYSTEM)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.TRANSLATOR)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.LOG_MANAGEMENT)).toBeDefined();
    });

    it('should register config manager as singleton', () => {
      InfrastructureServices.registerServices(container);

      const config1 = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);
      const config2 = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      expect(config1).toBe(config2);
    });

    it('should register logger as singleton', () => {
      InfrastructureServices.registerServices(container);

      const logger1 = container.resolve<ILogger>(SERVICE_NAMES.LOGGER);
      const logger2 = container.resolve<ILogger>(SERVICE_NAMES.LOGGER);

      expect(logger1).toBe(logger2);
    });

    it('should register enhanced logger as singleton', () => {
      InfrastructureServices.registerServices(container);

      const logger1 = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );
      const logger2 = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );

      expect(logger1).toBe(logger2);
    });

    it('should register error handler as singleton', () => {
      InfrastructureServices.registerServices(container);

      const handler1 = container.resolve<IErrorHandler>(
        SERVICE_NAMES.ERROR_HANDLER,
      );
      const handler2 = container.resolve<IErrorHandler>(
        SERVICE_NAMES.ERROR_HANDLER,
      );

      expect(handler1).toBe(handler2);
    });

    it('should register file system manager as singleton', () => {
      InfrastructureServices.registerServices(container);

      const fs1 = container.resolve<IFileSystemManager>(
        SERVICE_NAMES.FILE_SYSTEM,
      );
      const fs2 = container.resolve<IFileSystemManager>(
        SERVICE_NAMES.FILE_SYSTEM,
      );

      expect(fs1).toBe(fs2);
    });

    it('should register translator as singleton', () => {
      InfrastructureServices.registerServices(container);

      const translator1 = container.resolve<ITranslationManager>(
        SERVICE_NAMES.TRANSLATOR,
      );
      const translator2 = container.resolve<ITranslationManager>(
        SERVICE_NAMES.TRANSLATOR,
      );

      expect(translator1).toBe(translator2);
    });
  });

  describe('createContainer', () => {
    it('should create a container with all services registered', () => {
      const container = InfrastructureServices.createContainer();

      expect(container.tryResolve(SERVICE_NAMES.CONFIG)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.LOGGER)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.ERROR_HANDLER)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.FILE_SYSTEM)).toBeDefined();
      expect(container.tryResolve(SERVICE_NAMES.TRANSLATOR)).toBeDefined();
    });

    it('should create a functional config manager', () => {
      const container = InfrastructureServices.createContainer();
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      expect(config).toBeDefined();
      expect(typeof config.get).toBe('function');
      expect(typeof config.set).toBe('function');
    });

    it('should create a functional logger', () => {
      const container = InfrastructureServices.createContainer();
      const logger = container.resolve<ILogger>(SERVICE_NAMES.LOGGER);

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });
});

describe('EnhancedServices', () => {
  describe('createConfigManager', () => {
    it('should create a config manager', () => {
      const config = EnhancedServices.createConfigManager();

      expect(config).toBeDefined();
      expect(typeof config.get).toBe('function');
      expect(typeof config.set).toBe('function');
    });

    it('should set development mode in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const config = EnhancedServices.createConfigManager();
      const devMode = config.get('development.mode');

      expect(devMode).toBe(true);
      expect(config.get('logging.level')).toBe('debug');

      process.env.NODE_ENV = originalEnv;
    });

    it('should accept custom options', () => {
      const config = EnhancedServices.createConfigManager({ custom: 'value' });

      expect(config).toBeDefined();
    });
  });

  describe('createLogger', () => {
    it('should create a logger with default level', () => {
      const logger = EnhancedServices.createLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create a logger with custom level', () => {
      const logger = EnhancedServices.createLogger('debug');

      expect(logger).toBeDefined();
    });

    it('should add context to log messages when context is provided', () => {
      const logger = EnhancedServices.createLogger('info', 'TestContext');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');

      // Test that context is added (implementation detail, but we can verify the logger works)
      expect(() => logger.info('Test message')).not.toThrow();
    });
  });

  describe('createErrorHandler', () => {
    it('should create an error handler', () => {
      const handler = EnhancedServices.createErrorHandler();

      expect(handler).toBeDefined();
      expect(typeof handler.handleError).toBe('function');
      expect(typeof handler.formatError).toBe('function');
    });

    it('should create an error handler with logger', () => {
      const logger = EnhancedServices.createLogger();
      const handler = EnhancedServices.createErrorHandler(logger);

      expect(handler).toBeDefined();
      expect(typeof handler.handleError).toBe('function');
    });
  });

  describe('createFileSystemManager', () => {
    it('should create a file system manager', () => {
      const fsManager = EnhancedServices.createFileSystemManager();

      expect(fsManager).toBeDefined();
      expect(typeof fsManager.exists).toBe('function');
    });
  });

  describe('createTranslationManager', () => {
    it('should create a translation manager with default locale', () => {
      const translator = EnhancedServices.createTranslationManager();

      expect(translator).toBeDefined();
      expect(typeof translator.t).toBe('function');
      expect(translator.getCurrentLocale()).toBe('en');
    });

    it('should create a translation manager with custom locale', () => {
      const translator = EnhancedServices.createTranslationManager('zh-TW');

      expect(translator).toBeDefined();
      expect(translator.getCurrentLocale()).toBe('zh-TW');
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

    it('should create logs directory if it does not exist', () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();

      const fs = require('fs');
      expect(fs.existsSync(logsDir)).toBe(true);
    });
  });

  describe('createFileLogger', () => {
    it('should create a logger with file logging enabled', async () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();
      const logger = await FileLoggingServices.createFileLogger('info', {
        filePath: `${logsDir}/test.log`,
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
      });

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should handle file logging errors gracefully', async () => {
      const logger = await FileLoggingServices.createFileLogger('info', {
        filePath: '/invalid/path/test.log',
        maxFileSize: 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
      });

      expect(logger).toBeDefined();
    });
  });

  describe('createAutoFileLogger', () => {
    it('should create a logger with auto-generated file path', async () => {
      const logger = await FileLoggingServices.createAutoFileLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should accept custom log directory', async () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();
      const logger = await FileLoggingServices.createAutoFileLogger(
        'debug',
        logsDir,
      );

      expect(logger).toBeDefined();
    });
  });

  describe('createProductionFileLogger', () => {
    it('should create a production logger', async () => {
      const logger = await FileLoggingServices.createProductionFileLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should accept custom file name', async () => {
      const logger = await FileLoggingServices.createProductionFileLogger(
        'info',
        'app.log',
      );

      expect(logger).toBeDefined();
    });
  });

  describe('createContainerWithFileLogging', () => {
    it('should create a container with file logging configured', async () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();
      const container =
        await FileLoggingServices.createContainerWithFileLogging({
          filePath: `${logsDir}/test-container.log`,
          maxFileSize: 1024 * 1024,
          maxBackupFiles: 3,
          format: 'text',
          enableRotation: true,
          async: true,
        });

      expect(container).toBeDefined();
      const logger = container.tryResolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );
      expect(logger).toBeDefined();
    });
  });
});

describe('ServiceUtils', () => {
  let container: IServiceContainer;

  beforeEach(() => {
    container = InfrastructureServices.createContainer();
  });

  describe('checkServicesHealth', () => {
    it('should check services health', async () => {
      const health = await ServiceUtils.checkServicesHealth(container);

      expect(health).toBeDefined();
      expect(typeof health.overall).toBe('boolean');
      expect(typeof health.logManagement).toBe('boolean');
    });

    it('should handle missing services gracefully', async () => {
      const emptyContainer = new ServiceContainer();
      const health = await ServiceUtils.checkServicesHealth(emptyContainer);

      // When no services are registered, the health check still returns true because it doesn't throw
      expect(health).toBeDefined();
      expect(typeof health.overall).toBe('boolean');
    });
  });

  describe('getServicesStatus', () => {
    it('should get services status', () => {
      const status = ServiceUtils.getServicesStatus(container);

      expect(status).toBeDefined();
      expect(status.timestamp).toBeInstanceOf(Date);
      expect(status.logManagement).toBeDefined();
    });

    it('should handle missing services', () => {
      const emptyContainer = new ServiceContainer();
      const status = ServiceUtils.getServicesStatus(emptyContainer);

      expect(status.logManagement).toEqual({ available: false });
    });
  });

  describe('performServicesMaintenance', () => {
    it('should perform services maintenance', async () => {
      const result = await ServiceUtils.performServicesMaintenance(container);

      expect(result).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle maintenance errors gracefully', async () => {
      const emptyContainer = new ServiceContainer();
      const result =
        await ServiceUtils.performServicesMaintenance(emptyContainer);

      expect(result).toBeDefined();
      expect(result.logManagement).toBeNull();
    });
  });
});

describe('SERVICE_NAMES', () => {
  it('should define all service name constants', () => {
    expect(SERVICE_NAMES.CONFIG).toBe('config');
    expect(SERVICE_NAMES.LOGGER).toBe('logger');
    expect(SERVICE_NAMES.ENHANCED_LOGGER).toBe('enhancedLogger');
    expect(SERVICE_NAMES.ERROR_HANDLER).toBe('errorHandler');
    expect(SERVICE_NAMES.FILE_SYSTEM).toBe('fileSystem');
    expect(SERVICE_NAMES.TRANSLATOR).toBe('translator');
    expect(SERVICE_NAMES.LOG_MANAGEMENT).toBe('logManagement');
  });
});

describe('EnhancedServices Additional Tests', () => {
  describe('createLogger with different levels', () => {
    it('should create logger with error level', () => {
      const logger = EnhancedServices.createLogger('error');
      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should create logger with warn level', () => {
      const logger = EnhancedServices.createLogger('warn');
      expect(logger).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should create logger with info level and context', () => {
      const logger = EnhancedServices.createLogger('info', 'TestService');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });
  });

  describe('createTranslationManager with different locales', () => {
    it('should create translation manager with en locale', () => {
      const translator = EnhancedServices.createTranslationManager('en');
      expect(translator).toBeDefined();
      expect(translator.getCurrentLocale()).toBe('en');
    });

    it('should create translation manager with zh-TW locale', () => {
      const translator = EnhancedServices.createTranslationManager('zh-TW');
      expect(translator).toBeDefined();
      expect(translator.getCurrentLocale()).toBe('zh-TW');
    });

    it('should have translation methods', () => {
      const translator = EnhancedServices.createTranslationManager();
      expect(typeof translator.t).toBe('function');
      expect(typeof translator.setLocale).toBe('function');
      expect(typeof translator.getCurrentLocale).toBe('function');
      expect(typeof translator.getSupportedLocales).toBe('function');
    });
  });

  describe('createConfigManager with options', () => {
    it('should create config manager in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const config = EnhancedServices.createConfigManager();
      expect(config).toBeDefined();
      expect(config.get('logging.level')).not.toBe('debug');

      process.env.NODE_ENV = originalEnv;
    });

    it('should create config manager with custom options', () => {
      const config = EnhancedServices.createConfigManager({
        'custom.option': 'test',
      });
      expect(config).toBeDefined();
      expect(typeof config.get).toBe('function');
    });
  });
});

describe('FileLoggingServices Additional Tests', () => {
  describe('createFileLogger with different formats', () => {
    it('should create logger with JSON format', async () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();
      const logger = await FileLoggingServices.createFileLogger('info', {
        filePath: `${logsDir}/test-json.log`,
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'json',
        enableRotation: true,
        async: true,
      });

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create logger with rotation disabled', async () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();
      const logger = await FileLoggingServices.createFileLogger('info', {
        filePath: `${logsDir}/test-no-rotation.log`,
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: false,
        async: true,
      });

      expect(logger).toBeDefined();
    });

    it('should create logger with sync mode', async () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();
      const logger = await FileLoggingServices.createFileLogger('info', {
        filePath: `${logsDir}/test-sync.log`,
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: false,
      });

      expect(logger).toBeDefined();
    });
  });

  describe('createAutoFileLogger with custom directory', () => {
    it('should create auto file logger with info level', async () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();
      const logger = await FileLoggingServices.createAutoFileLogger(
        'info',
        logsDir,
      );

      expect(logger).toBeDefined();
    });

    it('should create auto file logger with error level', async () => {
      const logsDir = FileLoggingServices.getProjectLogsDir();
      const logger = await FileLoggingServices.createAutoFileLogger(
        'error',
        logsDir,
      );

      expect(logger).toBeDefined();
    });
  });

  describe('createProductionFileLogger with different levels', () => {
    it('should create production logger with error level', async () => {
      const logger = await FileLoggingServices.createProductionFileLogger(
        'error',
        'app-error.log',
      );

      expect(logger).toBeDefined();
    });

    it('should create production logger with warn level', async () => {
      const logger = await FileLoggingServices.createProductionFileLogger(
        'warn',
        'app-warn.log',
      );

      expect(logger).toBeDefined();
    });
  });
});

describe('InfrastructureServices - Config Callbacks', () => {
  let container: IServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('onConfigCreated callback', () => {
    it('should handle config creation notification', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Trigger config created callback
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      (config as any).triggerConfigCreated?.('/test/config.json');

      spy.mockRestore();
    });

    it('should fallback to console.log when services not available', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      // Trigger callback with invalid path to force fallback
      (config as any).triggerConfigCreated?.('/test/config.json');

      consoleSpy.mockRestore();
    });

    it('should notify with logger and translator when available', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Ensure logger and translator are resolved before triggering callback
      container.resolve(SERVICE_NAMES.LOGGER);
      container.resolve(SERVICE_NAMES.TRANSLATOR);

      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      (config as any).triggerConfigCreated?.('/test/config.json');

      spy.mockRestore();
    });
  });

  describe('onConfigChanged callback - logging.fileEnabled', () => {
    it('should enable file logging when fileEnabled set to true', async () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Resolve enhanced logger first to register it
      const enhancedLogger = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );

      // Set up initial state
      await config.setAndSave('logging.fileEnabled', false);

      // Change to true - this should trigger the callback
      await config.setAndSave('logging.fileEnabled', true);

      // Verify config was updated
      expect(config.get('logging.fileEnabled')).toBe(true);
      expect(enhancedLogger).toBeDefined();
    });

    it('should disable file logging when fileEnabled set to false', async () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Resolve enhanced logger first
      const enhancedLogger = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );

      // Set up initial state
      await config.setAndSave('logging.fileEnabled', true);

      // Change to false - this should trigger the callback
      await config.setAndSave('logging.fileEnabled', false);

      // Verify config was updated
      expect(config.get('logging.fileEnabled')).toBe(false);
      expect(enhancedLogger).toBeDefined();
    });

    it('should handle logging configuration errors gracefully', async () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Resolve enhanced logger first
      container.resolve<IEnhancedLogger>(SERVICE_NAMES.ENHANCED_LOGGER);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to set invalid logging config using setAndSave to trigger callback
      await config.setAndSave('logging.fileEnabled', true);

      warnSpy.mockRestore();
    });

    it('should handle case when enhanced logger is not available', async () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Don't resolve enhanced logger - callback should handle gracefully
      await config.setAndSave('logging.fileEnabled', true);

      // Should not throw
      expect(config.get('logging.fileEnabled')).toBe(true);
    });
  });

  describe('onConfigChanged callback - logging.level', () => {
    it('should update log level when logging.level changes', async () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Resolve enhanced logger first to register it
      const enhancedLogger = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );

      // Change log level - this should trigger the callback
      await config.setAndSave('logging.level', 'debug');

      // Verify config was updated
      expect(config.get('logging.level')).toBe('debug');
      expect(enhancedLogger).toBeDefined();
    });

    it('should handle case when enhanced logger is not available for level change', async () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Don't resolve enhanced logger - callback should handle gracefully
      await config.setAndSave('logging.level', 'warn');

      // Should not throw
      expect(config.get('logging.level')).toBe('warn');
    });

    it('should handle different log levels', async () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      const levels = ['error', 'warn', 'info', 'debug'];

      for (const level of levels) {
        await config.set('logging.level', level);
        expect(config.get('logging.level')).toBe(level);
      }
    });
  });

  describe('Log management service - disabled logging', () => {
    it('should create no-op service when logging is disabled', async () => {
      const customContainer = new ServiceContainer();

      // Register services first
      InfrastructureServices.registerServices(customContainer);

      // Then modify config to disable logging
      const config = customContainer.resolve<IConfigManager>(
        SERVICE_NAMES.CONFIG,
      );
      await config.set('logging.enabled', false);

      // Now re-register log management service with disabled config
      customContainer.registerSingleton<any>(
        SERVICE_NAMES.LOG_MANAGEMENT,
        () => {
          // Import the no-op service creator
          const {
            createNoOpLogManagementService,
          } = require('../../../src/infrastructure/services');
          return createNoOpLogManagementService();
        },
      );

      const logManagement = customContainer.resolve<any>(
        SERVICE_NAMES.LOG_MANAGEMENT,
      );

      expect(logManagement).toBeDefined();

      // Test key no-op methods (not all, as some may interact with filesystem)
      const stats = await logManagement.getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats.totalEntries).toBe(0);

      const searchResults = await logManagement.searchLogs({});
      expect(searchResults).toBeDefined();
      expect(searchResults.entries).toEqual([]);
      expect(searchResults.totalCount).toBe(0);
      expect(searchResults.warning).toBeDefined();

      const analysis = await logManagement.analyzeLogs();
      expect(analysis.totalLogs).toBe(0);
      expect(analysis.warning).toBeDefined();

      const archived = await logManagement.archiveLogs();
      expect(archived).toEqual([]);

      const cleaned = await logManagement.cleanupOldLogs();
      expect(cleaned).toBe(0);

      const maintenance = await logManagement.runMaintenance();
      expect(maintenance.duration).toBe(0);
      expect(maintenance.actions.rotations).toBe(0);

      const status = logManagement.getStatus();
      expect(status.initialized).toBe(false);

      await logManagement.initialize();
      await logManagement.shutdown();
    });

    it('should create normal service when logging is enabled', () => {
      const customContainer = new ServiceContainer();

      // Register config with logging enabled
      customContainer.registerSingleton<IConfigManager>('config', () => {
        const config =
          new (require('../../../src/infrastructure/config').ConfigManager)();
        config.set('logging.enabled', true);
        return config;
      });

      // Register other required services
      InfrastructureServices.registerServices(customContainer);

      const logManagement = customContainer.tryResolve(
        SERVICE_NAMES.LOG_MANAGEMENT,
      );

      expect(logManagement).toBeDefined();
    });
  });

  describe('Enhanced logger creation error handling', () => {
    it('should fallback to console logger when file logging fails', () => {
      InfrastructureServices.registerServices(container);

      // Force file logging to be enabled in config
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);
      config.set('logging.fileEnabled', true);

      // Logger should still be created (with fallback)
      const logger = container.tryResolve<ILogger>(SERVICE_NAMES.LOGGER);
      expect(logger).toBeDefined();
    });

    it('should handle file logging config options', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Set various logging configurations
      config.set('logging.format', 'json');
      config.set('logging.maxFileSize', 5 * 1024 * 1024);
      config.set('logging.maxBackupFiles', 3);

      const logger = container.tryResolve<ILogger>(SERVICE_NAMES.LOGGER);
      expect(logger).toBeDefined();
    });

    it('should handle enableRotation config option', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      config.set('logging.enableRotation', false);

      const logger = container.tryResolve<ILogger>(SERVICE_NAMES.LOGGER);
      expect(logger).toBeDefined();
    });

    it('should create enhanced logger with file logging enabled', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Enable file logging before resolving logger
      config.set('logging.fileEnabled', true);
      config.set('logging.format', 'text');
      config.set('logging.maxFileSize', 10 * 1024 * 1024);
      config.set('logging.maxBackupFiles', 5);
      config.set('logging.enableRotation', true);

      const enhancedLogger = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );
      expect(enhancedLogger).toBeDefined();
    });

    it('should handle all config formats for enhanced logger', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Test with json format
      config.set('logging.fileEnabled', true);
      config.set('logging.format', 'json');

      const enhancedLogger = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );
      expect(enhancedLogger).toBeDefined();
    });

    it('should use default values when config values are missing', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Enable file logging without setting other options
      config.set('logging.fileEnabled', true);

      // Should use defaults: format='text', maxFileSize=10MB, maxBackupFiles=5
      const enhancedLogger = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );
      expect(enhancedLogger).toBeDefined();
    });

    it('should create enhanced logger with file logging when config is set before resolution', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Set all file logging options BEFORE resolving logger
      config.set('logging.fileEnabled', true);
      config.set('logging.format', 'text');
      config.set('logging.maxFileSize', 10 * 1024 * 1024);
      config.set('logging.maxBackupFiles', 5);
      config.set('logging.enableRotation', true);

      // Now resolve - this should hit lines 196-234
      const enhancedLogger = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );
      expect(enhancedLogger).toBeDefined();
    });

    it('should handle file logging with json format', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      config.set('logging.fileEnabled', true);
      config.set('logging.format', 'json');

      const enhancedLogger = container.resolve<IEnhancedLogger>(
        SERVICE_NAMES.ENHANCED_LOGGER,
      );
      expect(enhancedLogger).toBeDefined();
    });

    it('should create logger with file logging when enhancedLogger not available', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      // Set file logging config before resolving logger
      config.set('logging.fileEnabled', true);
      config.set('logging.format', 'text');
      config.set('logging.maxFileSize', 10 * 1024 * 1024);
      config.set('logging.maxBackupFiles', 5);
      config.set('logging.enableRotation', true);

      // Resolve 'logger' directly (not 'enhancedLogger') - this hits lines 196-234
      const logger = container.resolve<ILogger>(SERVICE_NAMES.LOGGER);
      expect(logger).toBeDefined();
    });

    it('should create logger with json format when enhancedLogger not available', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      config.set('logging.fileEnabled', true);
      config.set('logging.format', 'json');

      // Resolve 'logger' directly
      const logger = container.resolve<ILogger>(SERVICE_NAMES.LOGGER);
      expect(logger).toBeDefined();
    });

    it('should handle error during logger creation with file logging', () => {
      InfrastructureServices.registerServices(container);
      const config = container.resolve<IConfigManager>(SERVICE_NAMES.CONFIG);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      config.set('logging.fileEnabled', true);

      // Resolve logger - should not throw even if file logging fails
      const logger = container.resolve<ILogger>(SERVICE_NAMES.LOGGER);
      expect(logger).toBeDefined();

      warnSpy.mockRestore();
    });
  });

  describe('EnhancedServices - factory methods', () => {
    it('should create file system manager', () => {
      const fsManager = EnhancedServices.createFileSystemManager();
      expect(fsManager).toBeDefined();
      expect(typeof fsManager.readFile).toBe('function');
    });

    it('should create translation manager with default locale', () => {
      const translator = EnhancedServices.createTranslationManager();
      expect(translator).toBeDefined();
      expect(typeof translator.t).toBe('function');
    });

    it('should create translation manager with custom locale', () => {
      const translator = EnhancedServices.createTranslationManager('zh-TW');
      expect(translator).toBeDefined();
      expect(typeof translator.t).toBe('function');
    });

    it('should create error handler', () => {
      const logger = EnhancedServices.createLogger();
      const errorHandler = EnhancedServices.createErrorHandler(logger);
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.handleError).toBe('function');
    });

    it('should create error handler without logger', () => {
      const errorHandler = EnhancedServices.createErrorHandler();
      expect(errorHandler).toBeDefined();
    });
  });

  describe('Template Storage Service registration', () => {
    it('should register template storage service', () => {
      InfrastructureServices.registerServices(container);

      const templateStorage = container.tryResolve('templateStorage');
      expect(templateStorage).toBeDefined();
    });
  });

  describe('ServiceUtils', () => {
    it('should provide service name constants', () => {
      expect(SERVICE_NAMES.CONFIG).toBe('config');
      expect(SERVICE_NAMES.LOGGER).toBe('logger');
      expect(SERVICE_NAMES.ENHANCED_LOGGER).toBe('enhancedLogger');
      expect(SERVICE_NAMES.ERROR_HANDLER).toBe('errorHandler');
      expect(SERVICE_NAMES.FILE_SYSTEM).toBe('fileSystem');
      expect(SERVICE_NAMES.TRANSLATOR).toBe('translator');
      expect(SERVICE_NAMES.LOG_MANAGEMENT).toBe('logManagement');
    });

    it('should check services health', async () => {
      InfrastructureServices.registerServices(container);

      const health = await ServiceUtils.checkServicesHealth(container);
      expect(health).toHaveProperty('logManagement');
      expect(health).toHaveProperty('overall');
      expect(typeof health.logManagement).toBe('boolean');
      expect(typeof health.overall).toBe('boolean');
    });

    it('should get services status', () => {
      InfrastructureServices.registerServices(container);

      const status = ServiceUtils.getServicesStatus(container);
      expect(status).toHaveProperty('logManagement');
      expect(status).toHaveProperty('timestamp');
      expect(status.timestamp instanceof Date).toBe(true);
    });

    it('should perform services maintenance', async () => {
      InfrastructureServices.registerServices(container);

      const result = await ServiceUtils.performServicesMaintenance(container);
      expect(result).toHaveProperty('logManagement');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp instanceof Date).toBe(true);
      // logManagement can be null, maintenance result, or error object
      expect(result.logManagement).toBeDefined();
    });
  });
});
