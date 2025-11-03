/**
 * Unit tests for CliRenderer
 */

import { CliRenderer } from '../../../../src/cli/utils/cli-renderer';

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text),
  bold: jest.fn((text: string) => text),
}));

describe('CliRenderer', () => {
  let renderer: CliRenderer;
  let consoleSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    renderer = new CliRenderer();

    // Mock console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('initialization', () => {
    it('should create CliRenderer instance', () => {
      expect(renderer).toBeInstanceOf(CliRenderer);
    });
  });

  describe('info method', () => {
    it('should log message to console', () => {
      const message = 'Test info message';
      renderer.info(message);

      expect(consoleSpy).toHaveBeenCalledWith(message);
    });

    it('should log empty line when message is undefined', () => {
      renderer.info(undefined);

      expect(consoleSpy).toHaveBeenCalledWith();
    });

    it('should handle empty string', () => {
      renderer.info('');

      expect(consoleSpy).toHaveBeenCalledWith('');
    });
  });

  describe('warn method', () => {
    it('should log warning message', () => {
      const message = 'Test warning message';
      renderer.warn(message);

      expect(consoleWarnSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('error method', () => {
    it('should log error message only', () => {
      const message = 'Test error message';
      renderer.error(message);

      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });

    it('should log error message with error object', () => {
      const message = 'Test error message';
      const error = new Error('Test error');
      renderer.error(message, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(message, error);
    });

    it('should handle undefined error parameter', () => {
      const message = 'Test error message';
      renderer.error(message, undefined);

      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('errorBox method', () => {
    it('should display error box with title and message', () => {
      const title = 'Error Title';
      const message = 'Error message';

      renderer.errorBox(title, message);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(5); // Top border, title, separator, message, bottom border
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('┌─────────────────────────────────────────┐'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`❌ ${title}`),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('└─────────────────────────────────────────┘'),
      );
    });

    it('should display error box with suggestions', () => {
      const title = 'Error Title';
      const message = 'Error message';
      const suggestions = ['Suggestion 1', 'Suggestion 2'];

      renderer.errorBox(title, message, suggestions);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Suggestions:'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('• Suggestion 1'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('• Suggestion 2'),
      );
    });

    it('should handle empty suggestions array', () => {
      const title = 'Error Title';
      const message = 'Error message';
      const suggestions: string[] = [];

      renderer.errorBox(title, message, suggestions);

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('💡 Suggestions:'),
      );
    });
  });

  describe('successBox method', () => {
    it('should display success box', () => {
      const title = 'Success Title';
      const message = 'Success message';

      renderer.successBox(title, message);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('┌─────────────────────────────────────────┐'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`✅ ${title}`),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('└─────────────────────────────────────────┘'),
      );
    });
  });

  describe('header method', () => {
    it('should display header lines', () => {
      const lines = ['Header Line 1', 'Header Line 2'];

      renderer.header(lines);

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('Header Line 1');
      expect(consoleSpy).toHaveBeenCalledWith('Header Line 2');
    });

    it('should handle empty lines array', () => {
      const lines: string[] = [];

      renderer.header(lines);

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('newline method', () => {
    it('should display empty line', () => {
      renderer.newline();

      expect(consoleSpy).toHaveBeenCalledWith();
    });
  });

  describe('text wrapping', () => {
    it('should wrap long text in error box', () => {
      const title = 'Error';
      const longMessage =
        'This is a very long error message that should be wrapped to fit within the box boundaries and display properly';

      renderer.errorBox(title, longMessage);

      // Should have multiple console.error calls due to text wrapping
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/This is a very long error message/),
      );
    });

    it('should wrap text in suggestions', () => {
      const title = 'Error';
      const message = 'Error';
      const longSuggestion =
        'This is a very long suggestion that should be wrapped to fit within the box boundaries';

      renderer.errorBox(title, message, [longSuggestion]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/This is a very long suggestion/),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very long title in error box', () => {
      const longTitle = 'This is a very long title that exceeds normal length';
      const message = 'Message';

      renderer.errorBox(longTitle, message);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(longTitle.substring(0, 33)),
      );
    });

    it('should handle special characters in messages', () => {
      const title = 'Special';
      const message = 'Message with special chars: @#$%^&*()';

      renderer.errorBox(title, message);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('@#$%^&*()'),
      );
    });

    it('should handle null/undefined gracefully in suggestions', () => {
      const title = 'Error';
      const message = 'Message';

      expect(() => renderer.errorBox(title, message, undefined)).not.toThrow();
      expect(() =>
        renderer.errorBox(title, message, null as any),
      ).not.toThrow();
    });
  });
});
