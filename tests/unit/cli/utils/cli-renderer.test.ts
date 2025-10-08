/**
 * CLI Renderer tests
 * Tests for unified CLI rendering utility
 */

import { CliRenderer } from '../../../../src/cli/utils/cli-renderer';

// Mock chalk to return plain text for easier testing
jest.mock('chalk', () => ({
  red: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
}));

describe('CliRenderer', () => {
  let renderer: CliRenderer;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    renderer = new CliRenderer();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('info method', () => {
    it('should render info messages with text', () => {
      renderer.info('Test message');
      expect(mockConsoleLog).toHaveBeenCalledWith('Test message');
    });

    it('should render empty line when message is undefined', () => {
      renderer.info(undefined);
      expect(mockConsoleLog).toHaveBeenCalledWith();
    });

    it('should handle empty string', () => {
      renderer.info('');
      expect(mockConsoleLog).toHaveBeenCalledWith('');
    });
  });

  describe('warn method', () => {
    it('should render warning messages', () => {
      renderer.warn('Warning message');
      expect(mockConsoleWarn).toHaveBeenCalledWith('Warning message');
    });
  });

  describe('error method', () => {
    it('should render error messages without error object', () => {
      renderer.error('Error message');
      expect(mockConsoleError).toHaveBeenCalledWith('Error message');
    });

    it('should render error messages with error object', () => {
      const error = new Error('Test error');
      renderer.error('Error message', error);
      expect(mockConsoleError).toHaveBeenCalledWith('Error message', error);
    });
  });

  describe('errorBox method', () => {
    it('should render error box without suggestions', () => {
      renderer.errorBox('Error Title', 'This is an error message');
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls.length).toBeGreaterThan(3);
    });

    it('should render error box with suggestions', () => {
      renderer.errorBox('Error Title', 'This is an error message', [
        'Try this',
        'Or this',
      ]);
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls.length).toBeGreaterThan(5);
    });

    it('should render error box with empty suggestions array', () => {
      renderer.errorBox('Error Title', 'This is an error message', []);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle long messages that need wrapping', () => {
      const longMessage =
        'This is a very long error message that should wrap across multiple lines in the error box';
      renderer.errorBox('Error Title', longMessage);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle long suggestions that need wrapping', () => {
      const longSuggestion =
        'This is a very long suggestion that should wrap across multiple lines in the suggestions section';
      renderer.errorBox('Error Title', 'Short message', [longSuggestion]);
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('successBox method', () => {
    it('should render success box', () => {
      renderer.successBox('Success Title', 'This is a success message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle long success messages', () => {
      const longMessage =
        'This is a very long success message that should wrap across multiple lines in the success box';
      renderer.successBox('Success Title', longMessage);
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('wrapText method edge cases', () => {
    it('should handle single very long word', () => {
      // Test through errorBox which uses wrapText
      const veryLongWord = 'supercalifragilisticexpialidocious';
      renderer.errorBox('Title', veryLongWord);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle empty text', () => {
      renderer.errorBox('Title', '');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle text with multiple spaces', () => {
      renderer.errorBox('Title', 'Word1    Word2     Word3');
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('header method', () => {
    it('should render header lines', () => {
      const lines = ['Line 1', 'Line 2'];
      renderer.header(lines);
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
    });

    it('should handle empty header array', () => {
      renderer.header([]);
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('newline method', () => {
    it('should render empty line', () => {
      renderer.newline();
      expect(mockConsoleLog).toHaveBeenCalledWith();
    });
  });
});
