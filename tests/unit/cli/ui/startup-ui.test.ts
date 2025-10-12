/**
 * Unit tests for startup-ui.ts
 */

import { jest } from '@jest/globals';
import { StartupUI } from '../../../../src/cli/ui/startup-ui';

// Mock chalk to avoid ANSI code issues in tests
jest.mock('chalk', () => ({
  cyan: {
    bold: jest.fn((text: string) => text),
  },
  gray: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
}));

// Mock EnvironmentConfig
jest.mock('../../../../src/infrastructure/config/environment', () => ({
  EnvironmentConfig: {
    isVerboseEnabled: jest.fn().mockReturnValue(false),
  },
}));

describe('StartupUI', () => {
  let startupUI: StartupUI;
  let mockTranslator: any;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    // Mock translator
    mockTranslator = {
      t: jest.fn().mockImplementation((...args: any[]) => {
        const [key] = args;
        const translations: Record<string, string> = {
          'startup.description': 'Convert Markdown to PDF with smart defaults',
        };
        return translations[key] || key;
      }),
    };

    // Create StartupUI instance
    startupUI = new StartupUI(mockTranslator);

    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with translator', () => {
      expect(startupUI).toBeInstanceOf(StartupUI);
    });
  });

  describe('showBanner', () => {
    it('should display welcome banner with version', () => {
      const version = '1.2.3';

      startupUI.showBanner(version);

      expect(consoleSpy).toHaveBeenCalledWith('MD2PDF v1.2.3 🚀');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Convert Markdown to PDF with smart defaults',
      );
      expect(consoleSpy).toHaveBeenCalledWith(); // Empty line
      expect(mockTranslator.t).toHaveBeenCalledWith('startup.description');
    });
  });

  describe('showEnvironmentCheck', () => {
    it('should display environment check results with all systems ready', async () => {
      await startupUI.showEnvironmentCheck('v18.17.0', 2048, true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Environment ready'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Node.js: v18.17.0'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory: 2048MB'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Puppeteer: Ready'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(); // Empty line
    });

    it('should display environment check results with Puppeteer not ready', async () => {
      await startupUI.showEnvironmentCheck('v18.17.0', 1024, false);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Environment ready'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Puppeteer: Not Ready'),
      );
    });

    it('should use default puppeteerReady value when not provided', async () => {
      await startupUI.showEnvironmentCheck('v18.17.0', 1024);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Puppeteer: Ready'),
      );
    });
  });

  describe('showStarting', () => {
    it('should display starting message', () => {
      startupUI.showStarting();

      expect(consoleSpy).toHaveBeenCalledWith('Starting interactive mode...');
      expect(consoleSpy).toHaveBeenCalledWith(); // Empty line
    });
  });

  describe('showError', () => {
    it('should display error message without stack trace in non-verbose mode', async () => {
      const { EnvironmentConfig } = await import(
        '../../../../src/infrastructure/config/environment'
      );
      (EnvironmentConfig.isVerboseEnabled as jest.Mock).mockReturnValue(false);
      const error = new Error('Test error message');

      startupUI.showError('Something went wrong', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Something went wrong');
      expect(consoleSpy).toHaveBeenCalledWith(); // Empty line
      // Should not show stack trace in non-verbose mode
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Test error message'),
      );
    });

    it('should display error message with stack trace in verbose mode', async () => {
      const { EnvironmentConfig } = await import(
        '../../../../src/infrastructure/config/environment'
      );
      (EnvironmentConfig.isVerboseEnabled as jest.Mock).mockReturnValue(true);
      const error = new Error('Test error message');

      startupUI.showError('Something went wrong', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Something went wrong');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error message'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(); // Empty line
    });

    it('should display error message without error object', () => {
      startupUI.showError('Something went wrong');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Something went wrong');
      expect(consoleSpy).toHaveBeenCalledWith(); // Empty line
    });

    it('should handle error with no stack trace', async () => {
      const { EnvironmentConfig } = await import(
        '../../../../src/infrastructure/config/environment'
      );
      (EnvironmentConfig.isVerboseEnabled as jest.Mock).mockReturnValue(true);
      const error = new Error('Test error message');
      delete error.stack;

      startupUI.showError('Something went wrong', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Something went wrong');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Test error message');
      expect(consoleSpy).toHaveBeenCalledWith(); // Empty line
    });
  });

  describe('showWarning', () => {
    it('should display warning message', () => {
      startupUI.showWarning('This is a warning');

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ This is a warning');
    });
  });

  describe('isVerbose', () => {
    it('should return true when verbose mode is enabled', async () => {
      const { EnvironmentConfig } = await import(
        '../../../../src/infrastructure/config/environment'
      );
      (EnvironmentConfig.isVerboseEnabled as jest.Mock).mockReturnValue(true);

      const result = startupUI.isVerbose();

      expect(result).toBe(true);
      expect(EnvironmentConfig.isVerboseEnabled).toHaveBeenCalled();
    });

    it('should return false when verbose mode is disabled', async () => {
      const { EnvironmentConfig } = await import(
        '../../../../src/infrastructure/config/environment'
      );
      (EnvironmentConfig.isVerboseEnabled as jest.Mock).mockReturnValue(false);

      const result = startupUI.isVerbose();

      expect(result).toBe(false);
      expect(EnvironmentConfig.isVerboseEnabled).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete startup flow', async () => {
      const version = '1.0.0';

      // Show banner
      startupUI.showBanner(version);

      // Show environment check
      await startupUI.showEnvironmentCheck('v18.17.0', 2048, true);

      // Show starting message
      startupUI.showStarting();

      // Verify all outputs
      expect(consoleSpy).toHaveBeenCalledWith('MD2PDF v1.0.0 🚀');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Environment ready'),
      );
      expect(consoleSpy).toHaveBeenCalledWith('Starting interactive mode...');

      // Should have multiple empty lines from different methods
      expect(consoleSpy).toHaveBeenCalledWith();
    });

    it('should handle error scenario with verbose output', async () => {
      const { EnvironmentConfig } = await import(
        '../../../../src/infrastructure/config/environment'
      );
      (EnvironmentConfig.isVerboseEnabled as jest.Mock).mockReturnValue(true);

      const error = new Error('Critical startup error');
      error.stack = 'Error: Critical startup error\n  at test.js:1:1';

      startupUI.showError('Failed to initialize application', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to initialize application',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error: Critical startup error'),
      );
    });
  });
});
