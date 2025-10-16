/**
 * Enhanced tests for CliUIManager - Focused on branch coverage improvement
 */

import { jest } from '@jest/globals';
import { CliUIManager } from '../../../../src/cli/ui/cli-ui-manager';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { IConfigManager } from '../../../../src/infrastructure/config/types';

// Mock chalk with proper typing
jest.mock('chalk', () => ({
  default: {
    red: jest.fn((text: string) => `RED:${text}`),
    green: jest.fn((text: string) => `GREEN:${text}`),
    yellow: jest.fn((text: string) => `YELLOW:${text}`),
    blue: jest.fn((text: string) => `BLUE:${text}`),
    cyan: jest.fn((text: string) => `CYAN:${text}`),
    gray: jest.fn((text: string) => `GRAY:${text}`),
    bold: {
      green: jest.fn((text: string) => `BOLD-GREEN:${text}`),
    },
  },
}));

// Mock EnvironmentConfig
jest.mock('../../../../src/infrastructure/config/environment', () => ({
  EnvironmentConfig: {
    isVerboseEnabled: jest.fn(() => false),
  },
}));

describe('CliUIManager - Enhanced Branch Coverage Tests', () => {
  let consoleSpy: {
    log: jest.SpiedFunction<typeof console.log>;
    error: jest.SpiedFunction<typeof console.error>;
    warn: jest.SpiedFunction<typeof console.warn>;
  };

  let mockTranslator: ITranslationManager;
  let mockLogger: ILogger;
  let mockConfigManager: IConfigManager;

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    };

    mockTranslator = {
      t: jest.fn((key: string) => key),
      setLocale: jest.fn(),
      getCurrentLocale: jest.fn(() => 'en'),
      getSupportedLocales: jest.fn(() => ['en', 'zh-TW']),
      translate: jest.fn((key: string) => key),
      hasTranslation: jest.fn(() => true),
      loadTranslations: jest.fn(),
      getTranslations: jest.fn(() => ({})),
    } as ITranslationManager;

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(() => 'info'),
    } as ILogger;

    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(() => false),
      getAll: jest.fn(() => ({})),
      save: jest.fn(),
      onConfigCreated: jest.fn(),
      onConfigChanged: jest.fn(),
      setAndSave: jest.fn(),
      getConfigPath: jest.fn(() => '/mock/config/path'),
    } as IConfigManager;
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
    jest.clearAllMocks();
  });

  describe('Constructor Options Coverage', () => {
    it('should handle undefined options with default values', () => {
      const uiManager = new CliUIManager(mockTranslator);
      expect(uiManager.isVerboseMode()).toBe(false);
    });

    it('should handle partial options with defaults', () => {
      const uiManager = new CliUIManager(mockTranslator, undefined, {
        verbose: true,
      });
      expect(uiManager.isVerboseMode()).toBe(true);
    });

    it('should handle all parameters with custom config manager', () => {
      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        { verbose: true, colors: false },
        mockConfigManager,
      );
      expect(uiManager.isVerboseMode()).toBe(true);
    });
  });

  describe('Header Display Branches', () => {
    let uiManager: CliUIManager;

    beforeEach(() => {
      uiManager = new CliUIManager(mockTranslator, mockLogger);
    });

    it('should display header with title only (no subtitle branch)', () => {
      uiManager.showHeader('Test Title');
      expect(consoleSpy.log).toHaveBeenCalledTimes(4);
    });

    it('should display header with title and subtitle (subtitle branch)', () => {
      uiManager.showHeader('Test Title', 'Test Subtitle');
      expect(consoleSpy.log).toHaveBeenCalledTimes(6);
    });
  });

  describe('Color Options Branch Coverage', () => {
    it('should handle messages with colors disabled', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        colors: false,
      });

      uiManager.showSuccess('Success message');
      uiManager.showError('Error message');
      uiManager.showWarning('Warning message');
      uiManager.showInfo('Info message');
      uiManager.showProgress('Progress message');
      uiManager.showComplete('Complete message');

      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Success message');
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Error message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️ Warning message');
      expect(consoleSpy.log).toHaveBeenCalledWith('ℹ️ Info message');
      expect(consoleSpy.log).toHaveBeenCalledWith('⏳ Progress message');
      expect(consoleSpy.log).toHaveBeenCalledWith('🎉 Complete message');
    });

    it('should handle separator and steps with colors disabled', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        colors: false,
      });

      uiManager.showSeparator();
      uiManager.showSteps(['Step 1', 'Step 2']);

      expect(consoleSpy.log).toHaveBeenCalledWith('─'.repeat(75));
      expect(consoleSpy.log).toHaveBeenCalledWith('   1. Step 1');
      expect(consoleSpy.log).toHaveBeenCalledWith('   2. Step 2');
    });
  });

  describe('Error Handling Branch Coverage', () => {
    it('should handle error with verbose mode and error object', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        verbose: true,
      });

      const testError = new Error('Test error message');
      testError.stack = 'Error stack trace';

      uiManager.showError('Error occurred', testError);

      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Error occurred');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error stack trace');
    });

    it('should handle error with verbose mode but no error.stack', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        verbose: true,
      });

      const testError = new Error('Test error message');
      delete testError.stack; // Remove stack property

      uiManager.showError('Error occurred', testError);

      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Error occurred');
      expect(consoleSpy.error).toHaveBeenCalledWith('Test error message');
    });

    it('should handle error in non-verbose mode', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        verbose: false,
      });

      const testError = new Error('Test error message');
      uiManager.showError('Error occurred', testError);

      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Error occurred');
      expect(consoleSpy.error).not.toHaveBeenCalledWith('Test error message');
    });
  });

  describe('Debug Mode Branch Coverage', () => {
    it('should show debug message with data in verbose mode', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        verbose: true,
      });

      const debugData = { key: 'value', number: 42 };
      uiManager.showDebug('Debug message', debugData);

      expect(consoleSpy.log).toHaveBeenCalledWith('[DEBUG] Debug message');
      expect(mockLogger.debug).toHaveBeenCalledWith('Debug message', debugData);
    });

    it('should show debug message without data in verbose mode', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        verbose: true,
      });

      uiManager.showDebug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalledWith('[DEBUG] Debug message');
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should not show debug message in non-verbose mode', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        verbose: false,
      });

      uiManager.showDebug('Debug message', { data: 'test' });

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('File Logging Branch Coverage', () => {
    it('should log to file when file logging is enabled', () => {
      (mockConfigManager.get as jest.Mock).mockReturnValue(true);

      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      uiManager.showSuccess('Success message');
      uiManager.showError('Error message');
      uiManager.showWarning('Warning message');
      uiManager.showInfo('Info message');
      uiManager.showProgress('Progress message');
      uiManager.showComplete('Complete message');
      uiManager.showMessage('Simple message');

      expect(mockLogger.info).toHaveBeenCalledWith('Success: Success message');
      expect(mockLogger.error).toHaveBeenCalledWith('Error message', undefined);
      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message');
      expect(mockLogger.info).toHaveBeenCalledWith('Info message');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Progress: Progress message',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Complete: Complete message',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Simple message');
    });

    it('should not log to file when file logging is disabled', () => {
      (mockConfigManager.get as jest.Mock).mockReturnValue(false);

      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      uiManager.showSuccess('Success message');
      uiManager.showError('Error message');
      uiManager.showWarning('Warning message');

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should not log to file when no config manager is provided', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger);

      uiManager.showSuccess('Success message');
      uiManager.showError('Error message');

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should not log when no logger is provided', () => {
      (mockConfigManager.get as jest.Mock).mockReturnValue(true);

      const uiManager = new CliUIManager(
        mockTranslator,
        undefined,
        {},
        mockConfigManager,
      );

      uiManager.showSuccess('Success message');

      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Success message');
    });
  });

  describe('New Logging Methods Branch Coverage', () => {
    beforeEach(() => {
      (mockConfigManager.get as jest.Mock).mockReturnValue(true);
    });

    it('should log user access with details', () => {
      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      const details = { userId: '123', action: 'login' };
      uiManager.logUserAccess('auth', 'login', details);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User Access - Module: auth, Action: login',
        details,
      );
    });

    it('should log user access without details', () => {
      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      uiManager.logUserAccess('auth', 'logout');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User Access - Module: auth, Action: logout',
      );
    });

    it('should not log user access when file logging is disabled', () => {
      (mockConfigManager.get as jest.Mock).mockReturnValue(false);

      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      uiManager.logUserAccess('auth', 'login');

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log config changes', () => {
      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      uiManager.logConfigChange('theme', 'dark', 'light');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Config Change - Setting: theme',
        { old: 'dark', new: 'light' },
      );
    });

    it('should log file operations with parameters', () => {
      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      const files = ['file1.md', 'file2.md'];
      const parameters = { format: 'pdf', quality: 'high' };

      uiManager.logFileOperation('convert', files, parameters);

      expect(mockLogger.info).toHaveBeenCalledWith('File Operation - convert', {
        files: files,
        parameters: parameters,
        fileCount: 2,
      });
    });

    it('should log file operations without parameters', () => {
      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      const files = ['file1.md'];
      uiManager.logFileOperation('delete', files);

      expect(mockLogger.info).toHaveBeenCalledWith('File Operation - delete', {
        files: files,
        parameters: {},
        fileCount: 1,
      });
    });

    it('should log conversions', () => {
      const uiManager = new CliUIManager(
        mockTranslator,
        mockLogger,
        {},
        mockConfigManager,
      );

      const parameters = { engine: 'puppeteer', format: 'A4' };
      uiManager.logConversion('input.md', 'output.pdf', parameters);

      expect(mockLogger.info).toHaveBeenCalledWith('PDF Conversion', {
        input: 'input.md',
        output: 'output.pdf',
        parameters: parameters,
      });
    });

    it('should not log when no logger is provided', () => {
      const uiManager = new CliUIManager(
        mockTranslator,
        undefined,
        {},
        mockConfigManager,
      );

      uiManager.logUserAccess('auth', 'login');
      uiManager.logConfigChange('theme', 'dark', 'light');
      uiManager.logFileOperation('convert', ['file.md']);
      uiManager.logConversion('input.md', 'output.pdf', {});

      // No logger calls should have been made
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Center Text Method Coverage', () => {
    it('should handle text centering calculations', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger);

      // Test the header method which uses centerText internally
      uiManager.showHeader('Short');
      uiManager.showHeader('Very Long Title That Might Need Different Padding');

      // Verify console.log was called - specific content depends on centerText logic
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('Verbose Mode Toggles', () => {
    it('should properly toggle verbose mode', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        verbose: false,
      });

      expect(uiManager.isVerboseMode()).toBe(false);

      uiManager.setVerbose(true);
      expect(uiManager.isVerboseMode()).toBe(true);

      uiManager.setVerbose(false);
      expect(uiManager.isVerboseMode()).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty steps array', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger);

      uiManager.showSteps([]);

      // Should still show the final empty line
      expect(consoleSpy.log).toHaveBeenCalledWith();
    });

    it('should handle error with both stack and message', () => {
      const uiManager = new CliUIManager(mockTranslator, mockLogger, {
        verbose: true,
        colors: false,
      });

      const testError = new Error('Test message');
      testError.stack = 'Stack trace';

      uiManager.showError('Error', testError);

      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Error');
      expect(consoleSpy.error).toHaveBeenCalledWith('Stack trace');
    });
  });
});
