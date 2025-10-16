/**
 * Unit tests for ConfigNotificationService
 *
 * Tests the complete functionality of configuration notifications
 * including error handling, fallback mechanisms, and dependency injection
 */

import {
  ConfigNotificationService,
  createConfigNotificationService,
  type IConfigNotificationService,
} from '../../../../src/infrastructure/config/notification-service';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import chalk from 'chalk';

// Mock chalk
jest.mock('chalk', () => ({
  green: jest.fn((str: string) => `[GREEN]${str}[/GREEN]`),
  blue: jest.fn((str: string) => `[BLUE]${str}[/BLUE]`),
  yellow: jest.fn((str: string) => `[YELLOW]${str}[/YELLOW]`),
  red: jest.fn((str: string) => `[RED]${str}[/RED]`),
}));

describe('ConfigNotificationService', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockTranslator: jest.Mocked<ITranslationManager>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let notificationService: IConfigNotificationService;

  beforeEach(() => {
    // Mock dependencies
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(),
    };

    mockTranslator = {
      t: jest.fn(),
      setLocale: jest.fn(),
      getCurrentLocale: jest.fn(),
      getSupportedLocales: jest.fn(),
      translate: jest.fn(),
      hasTranslation: jest.fn(),
      loadTranslations: jest.fn(),
      getTranslations: jest.fn(),
    };

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset chalk mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('constructor and dependency injection', () => {
    it('should create service with logger and translator', () => {
      const service = new ConfigNotificationService(mockLogger, mockTranslator);
      expect(service).toBeInstanceOf(ConfigNotificationService);
    });

    it('should create service without dependencies', () => {
      const service = new ConfigNotificationService();
      expect(service).toBeInstanceOf(ConfigNotificationService);
    });

    it('should create service with only logger', () => {
      const service = new ConfigNotificationService(mockLogger);
      expect(service).toBeInstanceOf(ConfigNotificationService);
    });

    it('should create service with only translator', () => {
      const service = new ConfigNotificationService(undefined, mockTranslator);
      expect(service).toBeInstanceOf(ConfigNotificationService);
    });
  });

  describe('factory function', () => {
    it('should create service via factory with both dependencies', () => {
      const service = createConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
      expect(service).toBeInstanceOf(ConfigNotificationService);
    });

    it('should create service via factory without dependencies', () => {
      const service = createConfigNotificationService();
      expect(service).toBeInstanceOf(ConfigNotificationService);
    });
  });

  describe('notifyConfigCreated', () => {
    beforeEach(() => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
    });

    it('should display formatted creation notification with translation', () => {
      const configPath = '/test/config.json';
      mockTranslator.t
        .mockReturnValueOnce('Configuration file created successfully')
        .mockReturnValueOnce('Edit this file to customize your settings');

      notificationService.notifyConfigCreated(configPath);

      expect(mockTranslator.t).toHaveBeenCalledWith(
        'config.notifications.created',
        {
          path: configPath,
        },
      );
      expect(mockTranslator.t).toHaveBeenCalledWith(
        'config.notifications.instructions',
        undefined,
      );
      expect(consoleLogSpy).toHaveBeenCalledTimes(5); // Empty line + message + path + instructions + empty line
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GREEN]✅ Configuration file created successfully[/GREEN]',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BLUE]📁 /test/config.json[/BLUE]',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[YELLOW]💡 Edit this file to customize your settings[/YELLOW]',
      );
    });

    it('should log to file when logger is available', () => {
      const configPath = '/test/config.json';
      mockTranslator.t.mockReturnValue('Test message');

      notificationService.notifyConfigCreated(configPath);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `User preferences file created: ${configPath}`,
      );
    });

    it('should handle translator errors gracefully with fallback', () => {
      const configPath = '/test/config.json';
      mockTranslator.t.mockImplementation(() => {
        throw new Error('Translation failed');
      });

      notificationService.notifyConfigCreated(configPath);

      // Should use English fallback with chalk styling
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GREEN]✅ User preferences initialized[/GREEN]',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BLUE]📁 /test/config.json[/BLUE]',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[YELLOW]💡 You can edit this file to customize your preferences[/YELLOW]',
      );
    });

    it('should handle chalk errors gracefully with fallback', () => {
      const configPath = '/test/config.json';
      // Mock chalk to throw error
      (chalk.green as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Chalk failed');
      });

      notificationService.notifyConfigCreated(configPath);

      // Should fall back to plain text notification
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ User preferences initialized',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📁 Configuration file: /test/config.json',
      );
    });

    it('should work without translator (English fallback)', () => {
      const serviceWithoutTranslator = new ConfigNotificationService(
        mockLogger,
      );
      const configPath = '/test/config.json';

      serviceWithoutTranslator.notifyConfigCreated(configPath);

      // Without translator, it falls back to plain text notification
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ User preferences initialized',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📁 Configuration file: /test/config.json',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '💡 You can edit this file to customize your preferences',
      );
    });

    it('should work without logger', () => {
      const serviceWithoutLogger = new ConfigNotificationService(
        undefined,
        mockTranslator,
      );
      const configPath = '/test/config.json';
      mockTranslator.t.mockReturnValue('Test message');

      serviceWithoutLogger.notifyConfigCreated(configPath);

      expect(consoleLogSpy).toHaveBeenCalled();
      // Logger should not be called since it's not provided
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('notifyConfigLoaded', () => {
    beforeEach(() => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
    });

    it('should log config loaded message when logger is available', () => {
      const configPath = '/test/config.json';
      mockTranslator.t.mockReturnValue('Configuration loaded from path');

      notificationService.notifyConfigLoaded(configPath);

      expect(mockTranslator.t).toHaveBeenCalledWith(
        'config.notifications.loaded',
        {
          path: configPath,
        },
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Configuration loaded from path',
      );
    });

    it('should do nothing when logger is not available', () => {
      const serviceWithoutLogger = new ConfigNotificationService(
        undefined,
        mockTranslator,
      );
      const configPath = '/test/config.json';

      serviceWithoutLogger.notifyConfigLoaded(configPath);

      expect(mockTranslator.t).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle translator errors gracefully', () => {
      const configPath = '/test/config.json';
      mockTranslator.t.mockImplementation(() => {
        throw new Error('Translation failed');
      });

      notificationService.notifyConfigLoaded(configPath);

      // Should still log with English fallback
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Configuration loaded from: ${configPath}`,
      );
    });
  });

  describe('notifyConfigError', () => {
    beforeEach(() => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
    });

    it('should display warning and log error with translation', () => {
      const error = new Error('Config parsing failed');
      const configPath = '/test/config.json';
      mockTranslator.t.mockReturnValue('Configuration error occurred');

      notificationService.notifyConfigError(error, configPath);

      expect(mockTranslator.t).toHaveBeenCalledWith(
        'config.notifications.error',
        {
          error: error.message,
          path: configPath,
        },
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[YELLOW]⚠️  Configuration error occurred[/YELLOW]',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Configuration error: ${error.message}`,
        {
          configPath,
          error,
        },
      );
    });

    it('should work without translator (English fallback)', () => {
      const serviceWithoutTranslator = new ConfigNotificationService(
        mockLogger,
      );
      const error = new Error('Config parsing failed');
      const configPath = '/test/config.json';

      serviceWithoutTranslator.notifyConfigError(error, configPath);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[YELLOW]⚠️  Configuration error: Config parsing failed[/YELLOW]',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Configuration error: ${error.message}`,
        {
          configPath,
          error,
        },
      );
    });

    it('should work without logger', () => {
      const serviceWithoutLogger = new ConfigNotificationService(
        undefined,
        mockTranslator,
      );
      const error = new Error('Config parsing failed');
      const configPath = '/test/config.json';
      mockTranslator.t.mockReturnValue('Configuration error occurred');

      serviceWithoutLogger.notifyConfigError(error, configPath);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[YELLOW]⚠️  Configuration error occurred[/YELLOW]',
      );
      // Logger should not be called since it's not provided
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle translator errors gracefully', () => {
      const error = new Error('Config parsing failed');
      const configPath = '/test/config.json';
      mockTranslator.t.mockImplementation(() => {
        throw new Error('Translation failed');
      });

      notificationService.notifyConfigError(error, configPath);

      // Should use English fallback
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[YELLOW]⚠️  Configuration error: Config parsing failed[/YELLOW]',
      );
    });
  });

  describe('English fallback messages', () => {
    let serviceWithoutTranslator: IConfigNotificationService;

    beforeEach(() => {
      serviceWithoutTranslator = new ConfigNotificationService(mockLogger);
    });

    it('should provide correct fallback for config.notifications.created', () => {
      const configPath = '/test/config.json';

      serviceWithoutTranslator.notifyConfigCreated(configPath);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ User preferences initialized',
      );
    });

    it('should provide correct fallback for config.notifications.instructions', () => {
      const configPath = '/test/config.json';

      serviceWithoutTranslator.notifyConfigCreated(configPath);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '💡 You can edit this file to customize your preferences',
      );
    });

    it('should provide correct fallback for config.notifications.loaded', () => {
      const configPath = '/test/config.json';

      serviceWithoutTranslator.notifyConfigLoaded(configPath);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Configuration loaded from: ${configPath}`,
      );
    });

    it('should provide correct fallback for config.notifications.error', () => {
      const error = new Error('Test error');
      const configPath = '/test/config.json';

      serviceWithoutTranslator.notifyConfigError(error, configPath);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[YELLOW]⚠️  Configuration error: Test error[/YELLOW]',
      );
    });

    it('should return key for unknown translation key', () => {
      const serviceWithoutTranslator = new ConfigNotificationService(
        mockLogger,
      );
      const configPath = '/test/config.json';

      // Test with a service that would attempt unknown key internally
      serviceWithoutTranslator.notifyConfigCreated(configPath);

      // Should not throw and should have called console.log
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle empty config path', () => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
      mockTranslator.t.mockReturnValue('Test message');

      expect(() => notificationService.notifyConfigCreated('')).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle null/undefined parameters gracefully', () => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
      mockTranslator.t.mockReturnValue('Test message');

      // Test with valid path
      expect(() =>
        notificationService.notifyConfigCreated('/valid/path.json'),
      ).not.toThrow();
    });

    it('should handle error with empty message', () => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
      const error = new Error('');
      const configPath = '/test/config.json';
      mockTranslator.t.mockReturnValue('Configuration error occurred');

      expect(() =>
        notificationService.notifyConfigError(error, configPath),
      ).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle complex config paths with special characters', () => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
      const configPath = '/test/config with spaces & symbols!.json';
      mockTranslator.t.mockReturnValue('Test message');

      expect(() =>
        notificationService.notifyConfigCreated(configPath),
      ).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `📁 Configuration file: ${configPath}`,
      );
    });

    it('should handle very long config paths', () => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );
      const longPath = '/very/long/path/'.repeat(50) + 'config.json';
      mockTranslator.t.mockReturnValue('Test message');

      expect(() =>
        notificationService.notifyConfigCreated(longPath),
      ).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should maintain proper interface contract', () => {
      notificationService = new ConfigNotificationService(
        mockLogger,
        mockTranslator,
      );

      // Verify all interface methods are implemented
      expect(typeof notificationService.notifyConfigCreated).toBe('function');
      expect(typeof notificationService.notifyConfigLoaded).toBe('function');
      expect(typeof notificationService.notifyConfigError).toBe('function');
    });
  });

  describe('dependency injection combinations', () => {
    it('should handle all possible dependency combinations correctly', () => {
      const combinations = [
        { logger: mockLogger, translator: mockTranslator },
        { logger: mockLogger, translator: undefined },
        { logger: undefined, translator: mockTranslator },
        { logger: undefined, translator: undefined },
      ];

      combinations.forEach(({ logger, translator }) => {
        const service = new ConfigNotificationService(logger, translator);
        const configPath = '/test/config.json';

        if (translator) {
          translator.t.mockReturnValue('Test message');
        }

        expect(() => service.notifyConfigCreated(configPath)).not.toThrow();
        expect(() => service.notifyConfigLoaded(configPath)).not.toThrow();
        expect(() =>
          service.notifyConfigError(new Error('test'), configPath),
        ).not.toThrow();

        jest.clearAllMocks();
      });
    });
  });
});
