/**
 * Shared PDF bookmarks prompt module
 * Used by single file, batch, and smart conversion modes
 */

import type { BookmarkOptions } from '../../core/bookmarks/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';

type InquirerModule = typeof import('inquirer');

export interface BookmarkPromptResult {
  enableBookmarks: boolean;
  maxDepth: number;
  includePageNumbers: boolean;
  useExistingTOC: boolean;
}

export class BookmarksPrompt {
  constructor(private translationManager: ITranslationManager) {}

  /**
   * Ask user about PDF bookmark configuration
   * Called after TOC configuration, before final conversion settings
   */
  async promptBookmarks(): Promise<BookmarkPromptResult> {
    const inquirer = (await import('inquirer')) as InquirerModule;

    // First, ask if bookmarks should be enabled
    const { enableBookmarks } = await inquirer.default.prompt<{
      enableBookmarks: boolean;
    }>([
      {
        type: 'confirm',
        name: 'enableBookmarks',
        message: this.translationManager.t('interactive.enablePdfBookmarks'),
        default: true,
      },
    ]);

    if (!enableBookmarks) {
      return {
        enableBookmarks: false,
        maxDepth: 3,
        includePageNumbers: false,
        useExistingTOC: true,
      };
    }

    // Configure bookmark details
    const bookmarkSettings = await inquirer.default.prompt<{
      maxDepth: number;
      includePageNumbers: boolean;
      useExistingTOC: boolean;
    }>([
      {
        type: 'list',
        name: 'maxDepth',
        message: this.translationManager.t('interactive.bookmarkMaxDepth'),
        choices: [
          {
            name: this.translationManager.t(
              'interactive.bookmarkDepthOptions.1',
            ),
            value: 1,
            short: 'H1',
          },
          {
            name: this.translationManager.t(
              'interactive.bookmarkDepthOptions.2',
            ),
            value: 2,
            short: 'H2',
          },
          {
            name: this.translationManager.t(
              'interactive.bookmarkDepthOptions.3',
            ),
            value: 3,
            short: 'H3',
          },
          {
            name: this.translationManager.t(
              'interactive.bookmarkDepthOptions.4',
            ),
            value: 4,
            short: 'H4',
          },
          {
            name: this.translationManager.t(
              'interactive.bookmarkDepthOptions.5',
            ),
            value: 5,
            short: 'H5',
          },
          {
            name: this.translationManager.t(
              'interactive.bookmarkDepthOptions.6',
            ),
            value: 6,
            short: 'H6',
          },
        ],
        default: 3, // Default to H3 depth
      },
      {
        type: 'confirm',
        name: 'includePageNumbers',
        message: this.translationManager.t(
          'interactive.bookmarkIncludePageNumbers',
        ),
        default: true,
      },
      {
        type: 'confirm',
        name: 'useExistingTOC',
        message: this.translationManager.t(
          'interactive.bookmarkUseExistingTOC',
        ),
        default: true,
        when: () => true, // Always ask, but could be conditional based on TOC availability
      },
    ]);

    return {
      enableBookmarks,
      ...bookmarkSettings,
    };
  }

  /**
   * Create bookmark options configuration from prompt result
   */
  createBookmarkOptions(
    promptResult: BookmarkPromptResult,
  ): BookmarkOptions | undefined {
    if (!promptResult.enableBookmarks) {
      return undefined;
    }

    return {
      enabled: true,
      maxDepth: promptResult.maxDepth,
      includePageNumbers: promptResult.includePageNumbers,
      useExistingTOC: promptResult.useExistingTOC,
      styling: {
        fontSize: 12,
        textColor: '#000000',
        highlightColor: '#0066cc',
      },
    };
  }

  /**
   * Format bookmark settings summary text (for confirmation screen)
   */
  formatBookmarksSummary(bookmarkOptions: BookmarkOptions | undefined): string {
    if (!bookmarkOptions || !bookmarkOptions.enabled) {
      return this.translationManager.t('interactive.no');
    }

    const parts = [
      this.translationManager.t('interactive.bookmarkSummaryEnabled'),
    ];

    // Add depth info
    parts.push(
      this.translationManager.t('interactive.bookmarkSummaryDepth', {
        depth: bookmarkOptions.maxDepth || 3,
      }),
    );

    // Add page numbers info
    if (bookmarkOptions.includePageNumbers) {
      parts.push(
        this.translationManager.t('interactive.bookmarkSummaryWithPageNumbers'),
      );
    }

    // Add TOC usage info
    if (bookmarkOptions.useExistingTOC) {
      parts.push(
        this.translationManager.t('interactive.bookmarkSummaryUseTOC'),
      );
    }

    return parts.join(', ');
  }

  /**
   * Get a short description of bookmark settings for status display
   */
  getBookmarkStatusText(bookmarkOptions: BookmarkOptions | undefined): string {
    if (!bookmarkOptions || !bookmarkOptions.enabled) {
      return this.translationManager.t('interactive.bookmarkDisabled');
    }

    const depthText = this.translationManager.t(
      'interactive.bookmarkDepthShort',
      {
        depth: bookmarkOptions.maxDepth || 3,
      },
    );

    const pageNumbersText = bookmarkOptions.includePageNumbers
      ? this.translationManager.t('interactive.withPageNumbers')
      : this.translationManager.t('interactive.withoutPageNumbers');

    return `${depthText}, ${pageNumbersText}`;
  }

  /**
   * Validate bookmark configuration against other settings
   */
  validateBookmarkSettings(
    bookmarkOptions: BookmarkOptions | undefined,
    hasTOC: boolean,
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!bookmarkOptions || !bookmarkOptions.enabled) {
      return { isValid: true, warnings: [] };
    }

    // Warn if TOC is not available but user wants to use existing TOC
    if (bookmarkOptions.useExistingTOC && !hasTOC) {
      warnings.push(
        this.translationManager.t('interactive.bookmarkWarningNoTOC'),
      );
    }

    // Warn if page numbers are enabled but might not be accurate
    if (bookmarkOptions.includePageNumbers && !hasTOC) {
      warnings.push(
        this.translationManager.t('interactive.bookmarkWarningPageNumbers'),
      );
    }

    // Warn about very deep bookmark hierarchies
    if ((bookmarkOptions.maxDepth || 3) > 4) {
      warnings.push(
        this.translationManager.t('interactive.bookmarkWarningDeepHierarchy'),
      );
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }
}
