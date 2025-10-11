/**
 * Tests for CliUIManager
 */

import { jest } from '@jest/globals';
import { CliUIManager } from '../../../../src/cli/ui/cli-ui-manager';

// Mock chalk
jest.mock('chalk', () => ({
  default: {
    red: jest.fn((text: string) => text),
    green: jest.fn((text: string) => text),
    yellow: jest.fn((text: string) => text),
    blue: jest.fn((text: string) => text),
    cyan: jest.fn((text: string) => text),
    gray: jest.fn((text: string) => text),
    bold: jest.fn((text: string) => text),
  },
  red: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
}));

describe('CliUIManager', () => {
  let consoleSpy: {
    log: jest.SpiedFunction<typeof console.log>;
    error: jest.SpiedFunction<typeof console.error>;
    warn: jest.SpiedFunction<typeof console.warn>;
  };

  let mockTranslator: {
    t: jest.MockedFunction<
      (key: string, params?: Record<string, unknown>) => string
    >;
  };

  let mockLogger: {
    info: jest.MockedFunction<(message: string, ...args: unknown[]) => void>;
    error: jest.MockedFunction<(message: string, ...args: unknown[]) => void>;
    warn: jest.MockedFunction<(message: string, ...args: unknown[]) => void>;
    debug: jest.MockedFunction<(message: string, ...args: unknown[]) => void>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    };

    mockTranslator = {
      t: jest.fn((key: string) => key), // Return key as-is for testing
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      const uiManager = new CliUIManager(mockTranslator as any);
      expect(uiManager).toBeDefined();
      expect(uiManager.isVerboseMode()).toBe(false);
    });

    it('should create instance with logger and custom options', () => {
      const uiManager = new CliUIManager(
        mockTranslator as any,
        mockLogger as any,
        {
          verbose: true,
          colors: false,
        },
      );
      expect(uiManager).toBeDefined();
      expect(uiManager.isVerboseMode()).toBe(true);
    });
  });

  describe('Message display methods', () => {
    let uiManager: CliUIManager;

    beforeEach(() => {
      uiManager = new CliUIManager(mockTranslator as any, mockLogger as any);
    });

    it('should show success message', () => {
      uiManager.showSuccess('Test success');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Test success');
    });

    it('should show error message', () => {
      uiManager.showError('Test error');
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Test error');
    });

    it('should show warning message', () => {
      uiManager.showWarning('Test warning');
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️ Test warning');
    });

    it('should show info message', () => {
      uiManager.showInfo('Test info');
      expect(consoleSpy.log).toHaveBeenCalledWith('ℹ️ Test info');
    });

    it('should show progress message', () => {
      uiManager.showProgress('Test progress');
      expect(consoleSpy.log).toHaveBeenCalledWith('⏳ Test progress');
    });

    it('should show complete message', () => {
      uiManager.showComplete('Test complete');
      expect(consoleSpy.log).toHaveBeenCalledWith('🎉 Test complete');
    });

    it('should show simple message', () => {
      uiManager.showMessage('Test message');
      expect(consoleSpy.log).toHaveBeenCalledWith('Test message');
    });
  });

  describe('Header display', () => {
    let uiManager: CliUIManager;

    beforeEach(() => {
      uiManager = new CliUIManager(mockTranslator as any, mockLogger as any);
    });

    it('should display header with title only', () => {
      uiManager.showHeader('Test Title');
      expect(consoleSpy.log).toHaveBeenCalledTimes(4); // Top, title, bottom, empty line
    });

    it('should display header with title and subtitle', () => {
      uiManager.showHeader('Test Title', 'Test Subtitle');
      expect(consoleSpy.log).toHaveBeenCalledTimes(6); // Top, title, separator, subtitle, bottom, empty line
    });
  });

  describe('Steps display', () => {
    let uiManager: CliUIManager;

    beforeEach(() => {
      uiManager = new CliUIManager(mockTranslator as any, mockLogger as any);
    });

    it('should display numbered steps', () => {
      uiManager.showSteps(['First step', 'Second step', 'Third step']);

      expect(consoleSpy.log).toHaveBeenCalledWith('   1. First step');
      expect(consoleSpy.log).toHaveBeenCalledWith('   2. Second step');
      expect(consoleSpy.log).toHaveBeenCalledWith('   3. Third step');
      expect(consoleSpy.log).toHaveBeenCalledWith(); // Empty line at end
    });
  });

  describe('Verbose mode handling', () => {
    it('should handle debug messages in verbose mode', () => {
      const uiManager = new CliUIManager(
        mockTranslator as any,
        mockLogger as any,
        {
          verbose: true,
        },
      );

      uiManager.showDebug('Debug message');
      expect(consoleSpy.log).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should not show debug messages in non-verbose mode', () => {
      const uiManager = new CliUIManager(
        mockTranslator as any,
        mockLogger as any,
        {
          verbose: false,
        },
      );

      uiManager.showDebug('Debug message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should toggle verbose mode', () => {
      const uiManager = new CliUIManager(
        mockTranslator as any,
        mockLogger as any,
      );

      expect(uiManager.isVerboseMode()).toBe(false);
      uiManager.setVerbose(true);
      expect(uiManager.isVerboseMode()).toBe(true);
    });
  });

  describe('Logger integration', () => {
    it('should call logger methods in verbose mode', () => {
      const uiManager = new CliUIManager(
        mockTranslator as any,
        mockLogger as any,
        {
          verbose: true,
        },
      );

      uiManager.showSuccess('Test success');
      uiManager.showError('Test error');
      uiManager.showWarning('Test warning');

      expect(mockLogger.info).toHaveBeenCalledWith('Success: Test success');
      expect(mockLogger.error).toHaveBeenCalledWith('Test error', undefined);
      expect(mockLogger.warn).toHaveBeenCalledWith('Test warning');
    });

    it('should not call logger methods in non-verbose mode without logger', () => {
      const uiManager = new CliUIManager(mockTranslator as any);

      uiManager.showSuccess('Test success');
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Utility methods', () => {
    let uiManager: CliUIManager;

    beforeEach(() => {
      uiManager = new CliUIManager(mockTranslator as any, mockLogger as any);
    });

    it('should show newline', () => {
      uiManager.showNewline();
      expect(consoleSpy.log).toHaveBeenCalledWith();
    });

    it('should show separator', () => {
      uiManager.showSeparator();
      expect(consoleSpy.log).toHaveBeenCalledWith('─'.repeat(75));
    });
  });
});
