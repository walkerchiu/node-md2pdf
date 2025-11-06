/**
 * Tests for BookmarksPrompt class
 */

import { BookmarksPrompt } from '../../../../src/cli/shared/bookmarks-prompt';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import type { BookmarkOptions } from '../../../../src/core/bookmarks/types';

// Mock inquirer
const mockPrompt = jest.fn();

// Mock the inquirer module including default export for dynamic import compatibility
jest.mock('inquirer', () => {
  const mockPrompt = jest.fn();
  return {
    default: {
      prompt: mockPrompt,
    },
    prompt: mockPrompt,
  };
});

// Re-import the mock to get access to the mockPrompt function
const inquirer = require('inquirer');
const mockInquirerPrompt = inquirer.default.prompt;

// Mock translation manager
const mockTranslationManager: jest.Mocked<ITranslationManager> = {
  t: jest.fn((key: string, params?: any) => {
    // Simple mock implementation that returns key with params
    if (params) {
      return `${key}:${JSON.stringify(params)}`;
    }
    return key;
  }),
  setLocale: jest.fn(),
  getCurrentLocale: jest.fn(() => 'en'),
  getSupportedLocales: jest.fn(() => ['en', 'zh-TW']),
  translate: jest.fn((key: string, locale: any, params?: any) => key),
  hasTranslation: jest.fn((key: string, locale?: any) => true),
  loadTranslations: jest.fn(),
  getTranslations: jest.fn((locale: any) => ({})),
};

describe('BookmarksPrompt', () => {
  let bookmarksPrompt: BookmarksPrompt;

  beforeEach(() => {
    bookmarksPrompt = new BookmarksPrompt(mockTranslationManager);

    // Reset mocks
    jest.clearAllMocks();
    mockInquirerPrompt.mockReset();
  });

  describe('promptBookmarks', () => {
    it('should prompt for bookmark settings and return complete configuration', async () => {
      // Mock inquirer responses
      mockInquirerPrompt
        .mockResolvedValueOnce({ enableBookmarks: true })
        .mockResolvedValueOnce({
          maxDepth: 3,
          includePageNumbers: true,
          useExistingTOC: true,
        });

      const result = await bookmarksPrompt.promptBookmarks();

      expect(result).toEqual({
        enableBookmarks: true,
        maxDepth: 3,
        includePageNumbers: true,
        useExistingTOC: true,
      });

      // Verify translation calls
      expect(mockTranslationManager.t).toHaveBeenCalledWith(
        'interactive.enablePdfBookmarks',
      );
      expect(mockTranslationManager.t).toHaveBeenCalledWith(
        'interactive.bookmarkMaxDepth',
      );
      expect(mockTranslationManager.t).toHaveBeenCalledWith(
        'interactive.bookmarkIncludePageNumbers',
      );
      expect(mockTranslationManager.t).toHaveBeenCalledWith(
        'interactive.bookmarkUseExistingTOC',
      );

      // Verify inquirer calls
      expect(mockInquirerPrompt).toHaveBeenCalledTimes(2);
    });

    it('should return disabled configuration when bookmarks are not enabled', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ enableBookmarks: false });

      const result = await bookmarksPrompt.promptBookmarks();

      expect(result).toEqual({
        enableBookmarks: false,
        maxDepth: 3,
        includePageNumbers: false,
        useExistingTOC: true,
      });

      // Should only call inquirer once for the enable question
      expect(mockInquirerPrompt).toHaveBeenCalledTimes(1);
    });

    it('should use correct choices for bookmark depth', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ enableBookmarks: true })
        .mockResolvedValueOnce({
          maxDepth: 4,
          includePageNumbers: false,
          useExistingTOC: false,
        });

      await bookmarksPrompt.promptBookmarks();

      // Check that the second prompt call included depth options
      const secondCall = mockInquirerPrompt.mock.calls[1][0];
      const depthQuestion = secondCall.find((q: any) => q.name === 'maxDepth');

      expect(depthQuestion).toBeDefined();
      expect(depthQuestion.choices).toHaveLength(6); // H1 through H6
      expect(depthQuestion.default).toBe(3);
    });

    it('should handle different depth selections', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ enableBookmarks: true })
        .mockResolvedValueOnce({
          maxDepth: 1, // Only H1
          includePageNumbers: true,
          useExistingTOC: true,
        });

      const result = await bookmarksPrompt.promptBookmarks();

      expect(result.maxDepth).toBe(1);
    });
  });

  describe('createBookmarkOptions', () => {
    it('should create bookmark options from prompt result', () => {
      const promptResult = {
        enableBookmarks: true,
        maxDepth: 4,
        includePageNumbers: true,
        useExistingTOC: false,
      };

      const options = bookmarksPrompt.createBookmarkOptions(promptResult);

      expect(options).toEqual({
        enabled: true,
        maxDepth: 4,
        includePageNumbers: true,
        useExistingTOC: false,
        styling: {
          fontSize: 12,
          textColor: '#000000',
          highlightColor: '#0066cc',
        },
      });
    });

    it('should return undefined when bookmarks are disabled', () => {
      const promptResult = {
        enableBookmarks: false,
        maxDepth: 3,
        includePageNumbers: false,
        useExistingTOC: true,
      };

      const options = bookmarksPrompt.createBookmarkOptions(promptResult);

      expect(options).toBeUndefined();
    });
  });

  describe('formatBookmarksSummary', () => {
    it('should format enabled bookmarks summary', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
        useExistingTOC: true,
      };

      const summary = bookmarksPrompt.formatBookmarksSummary(bookmarkOptions);

      expect(summary).toContain('interactive.bookmarkSummaryEnabled');
      expect(summary).toContain('interactive.bookmarkSummaryDepth');
      expect(summary).toContain('interactive.bookmarkSummaryWithPageNumbers');
      expect(summary).toContain('interactive.bookmarkSummaryUseTOC');
    });

    it('should format disabled bookmarks summary', () => {
      const summary = bookmarksPrompt.formatBookmarksSummary(undefined);

      expect(summary).toBe('interactive.no');
      expect(mockTranslationManager.t).toHaveBeenCalledWith('interactive.no');
    });

    it('should handle bookmarks without page numbers', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 2,
        includePageNumbers: false,
        useExistingTOC: false,
      };

      const summary = bookmarksPrompt.formatBookmarksSummary(bookmarkOptions);

      expect(summary).toContain('interactive.bookmarkSummaryEnabled');
      expect(summary).toContain('interactive.bookmarkSummaryDepth');
      expect(summary).not.toContain(
        'interactive.bookmarkSummaryWithPageNumbers',
      );
      expect(summary).not.toContain('interactive.bookmarkSummaryUseTOC');
    });
  });

  describe('getBookmarkStatusText', () => {
    it('should return status text for enabled bookmarks', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
      };

      const statusText = bookmarksPrompt.getBookmarkStatusText(bookmarkOptions);

      expect(statusText).toContain('interactive.bookmarkDepthShort');
      expect(statusText).toContain('interactive.withPageNumbers');
    });

    it('should return status text for bookmarks without page numbers', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 2,
        includePageNumbers: false,
      };

      const statusText = bookmarksPrompt.getBookmarkStatusText(bookmarkOptions);

      expect(statusText).toContain('interactive.bookmarkDepthShort');
      expect(statusText).toContain('interactive.withoutPageNumbers');
    });

    it('should return disabled status for undefined options', () => {
      const statusText = bookmarksPrompt.getBookmarkStatusText(undefined);

      expect(statusText).toBe('interactive.bookmarkDisabled');
    });
  });

  describe('validateBookmarkSettings', () => {
    it('should validate bookmark settings with TOC available', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
        useExistingTOC: true,
      };

      const validation = bookmarksPrompt.validateBookmarkSettings(
        bookmarkOptions,
        true,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toEqual([]);
    });

    it('should warn when TOC is not available but requested', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        useExistingTOC: true,
      };

      const validation = bookmarksPrompt.validateBookmarkSettings(
        bookmarkOptions,
        false,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.warnings).toContain('interactive.bookmarkWarningNoTOC');
    });

    it('should warn about page numbers without TOC', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
        includePageNumbers: true,
        useExistingTOC: false,
      };

      const validation = bookmarksPrompt.validateBookmarkSettings(
        bookmarkOptions,
        false,
      );

      expect(validation.warnings).toContain(
        'interactive.bookmarkWarningPageNumbers',
      );
    });

    it('should warn about deep hierarchy', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 5,
      };

      const validation = bookmarksPrompt.validateBookmarkSettings(
        bookmarkOptions,
        true,
      );

      expect(validation.warnings).toContain(
        'interactive.bookmarkWarningDeepHierarchy',
      );
    });

    it('should return valid for disabled bookmarks', () => {
      const validation = bookmarksPrompt.validateBookmarkSettings(
        undefined,
        false,
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toEqual([]);
    });

    it('should handle multiple warnings', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 6, // Deep hierarchy
        includePageNumbers: true,
        useExistingTOC: true,
      };

      const validation = bookmarksPrompt.validateBookmarkSettings(
        bookmarkOptions,
        false,
      ); // No TOC

      expect(validation.warnings).toHaveLength(3);
      expect(validation.warnings).toContain('interactive.bookmarkWarningNoTOC');
      expect(validation.warnings).toContain(
        'interactive.bookmarkWarningPageNumbers',
      );
      expect(validation.warnings).toContain(
        'interactive.bookmarkWarningDeepHierarchy',
      );
    });
  });

  describe('integration with translation manager', () => {
    it('should call translation manager with correct keys', () => {
      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
      };

      bookmarksPrompt.formatBookmarksSummary(bookmarkOptions);

      expect(mockTranslationManager.t).toHaveBeenCalledWith(
        'interactive.bookmarkSummaryEnabled',
      );
      expect(mockTranslationManager.t).toHaveBeenCalledWith(
        'interactive.bookmarkSummaryDepth',
        { depth: 3 },
      );
    });

    it('should handle parametrized translations', () => {
      mockTranslationManager.t.mockReturnValue('depth H3');

      const bookmarkOptions: BookmarkOptions = {
        enabled: true,
        maxDepth: 3,
      };

      const statusText = bookmarksPrompt.getBookmarkStatusText(bookmarkOptions);

      expect(mockTranslationManager.t).toHaveBeenCalledWith(
        'interactive.bookmarkDepthShort',
        { depth: 3 },
      );
      expect(statusText).toContain('depth H3');
    });
  });

  describe('error handling', () => {
    it('should handle inquirer errors gracefully', async () => {
      const error = new Error('Inquirer error');
      mockInquirerPrompt.mockRejectedValue(error);

      await expect(bookmarksPrompt.promptBookmarks()).rejects.toThrow(
        'Inquirer error',
      );
    });

    it('should handle translation manager errors', () => {
      mockTranslationManager.t.mockImplementation(() => {
        throw new Error('Translation error');
      });

      expect(() => {
        bookmarksPrompt.getBookmarkStatusText({ enabled: true });
      }).toThrow('Translation error');
    });
  });
});
