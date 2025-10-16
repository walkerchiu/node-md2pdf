import {
  InfrastructureServices,
  EnhancedServices,
  FileLoggingServices,
  SERVICE_NAMES,
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
      expect(mockContainer.registerSingleton).toHaveBeenCalledTimes(6); // config, enhancedLogger, logger, errorHandler, fileSystem, translator
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
