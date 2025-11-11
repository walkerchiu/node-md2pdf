/**
 * I18n helper utilities for CLI components
 * Provides convenient methods for creating internationalized CLI elements
 */

import type { ITranslationManager } from '../../infrastructure/i18n/types';

// Import chalk at the top level
let chalk: any;
try {
  const chalkModule = require('chalk');
  chalk = chalkModule.default || chalkModule;
} catch {
  // Fallback if chalk is not available
  chalk = {
    gray: (text: string) => text,
  };
}

/**
 * Helper class for creating internationalized CLI components
 */
export class I18nHelpers {
  constructor(private readonly translator: ITranslationManager) {}

  /**
   * Create internationalized inquirer choices
   */
  createChoices(items: Array<{ key: string; value: string }>) {
    return items.map((item) => ({
      name: this.translator.t(item.key),
      value: item.value,
      short: this.translator
        .t(item.key)
        .replace(/^[\d\.]\s*/, '')
        .replace(/🔧|📄|📚|🤖|🎨|🚪/, '')
        .trim(),
    }));
  }

  /**
   * Create numbered menu choices dynamically
   */
  createNumberedChoices(
    items: Array<{ key: string; value: string }>,
    startNumber: number = 0,
  ) {
    return items.map((item, index) => ({
      name: `${startNumber + index}. ${this.translator.t(item.key)}`,
      value: item.value,
      short: this.translator.t(item.key),
    }));
  }

  /**
   * Create internationalized menu choice with description
   */
  createMenuChoice(nameKey: string, descKey: string, value: string) {
    const name = this.translator.t(nameKey);
    const description = this.translator.t(descKey);

    return {
      name: `${name} ${chalk.gray(`- ${description}`)}`,
      value,
      short: name
        .replace(/^[\d\.]\s*/, '')
        .replace(/🔧|📄|📚|🤖|🎨|🚪/, '')
        .trim(),
    };
  }

  /**
   * Create internationalized CLI header
   */
  createHeader(titleKey: string, subtitleKey?: string): string[] {
    const title = this.translator.t(titleKey);
    const subtitle = subtitleKey ? this.translator.t(subtitleKey) : '';

    // Fixed width for consistent display
    const headerWidth = 79; // Standard terminal width - 1
    const border = '─'.repeat(headerWidth);

    const header = [
      border,
      title.padStart((headerWidth + title.length) / 2).padEnd(headerWidth),
    ];

    if (subtitle) {
      header.push(border);
      header.push(
        subtitle
          .padStart((headerWidth + subtitle.length) / 2)
          .padEnd(headerWidth),
      );
    }

    header.push(border);

    return header;
  }

  /**
   * Get translation with fallback
   */
  t(key: string, params?: Record<string, string | number>): string {
    return this.translator.t(key, params);
  }

  /**
   * Get current locale
   */
  getCurrentLocale() {
    return this.translator.getCurrentLocale();
  }

  /**
   * Set locale
   */
  setLocale(locale: 'en' | 'zh-TW') {
    this.translator.setLocale(locale);
  }

  /**
   * Create language selection choices
   */
  createLanguageChoices() {
    return [
      {
        name: this.translator.translate('common.menu.returnToMain', 'en'),
        value: 'back',
        short: this.translator.t('common.actions.back'),
      },
      {
        name: 'English',
        value: 'en',
        short: this.translator.t('short.english'),
      },
      {
        name: '正體中文',
        value: 'zh-TW',
        short: this.translator.t('short.traditionalChinese'),
      },
    ];
  }
}
