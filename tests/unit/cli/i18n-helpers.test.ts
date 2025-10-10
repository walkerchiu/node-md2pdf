/**
 * @jest-environment node
 */

import { I18nHelpers } from '../../../src/cli/utils/i18n-helpers';
import { TranslationManager } from '../../../src/infrastructure/i18n/manager';
import type { ITranslationManager } from '../../../src/infrastructure/i18n/types';

// Mock chalk to avoid issues in test environment
jest.mock('chalk', () => ({
  gray: jest.fn((text: string) => text),
}));

describe('I18nHelpers', () => {
  let translationManager: ITranslationManager;
  let i18nHelpers: I18nHelpers;

  beforeEach(() => {
    translationManager = new TranslationManager({ defaultLocale: 'en' });
    i18nHelpers = new I18nHelpers(translationManager);
  });

  describe('createChoices', () => {
    it('should create choices array with translations', () => {
      const items = [
        { key: 'cli.settingsMenu.languageSettings', value: 'language' },
      ];

      const choices = i18nHelpers.createChoices(items);

      expect(choices).toHaveLength(1);
      expect(choices[0]).toHaveProperty('name', '1. Language & Localization');
      expect(choices[0]).toHaveProperty('value', 'language');
      expect(choices[0]).toHaveProperty('short');
    });

    it('should create choices with Chinese translations', () => {
      translationManager.setLocale('zh-TW');

      const items = [
        { key: 'cli.settingsMenu.languageSettings', value: 'language' },
      ];

      const choices = i18nHelpers.createChoices(items);

      expect(choices[0]).toHaveProperty('name', '1. 語言與本地化');
      expect(choices[0]).toHaveProperty('value', 'language');
    });

    it('should clean short names by removing icons and numbers', () => {
      const items = [
        { key: 'cli.mainMenu.settings', value: 'settings' },
        { key: 'cli.mainMenu.exit', value: 'exit' },
      ];

      const choices = i18nHelpers.createChoices(items);

      // Short names should not contain icons
      expect(choices[0].short).not.toContain('🔧');
      expect(choices[1].short).not.toContain('🚪');
    });
  });

  describe('createMenuChoice', () => {
    it('should create menu choice with name and description', () => {
      const choice = i18nHelpers.createMenuChoice(
        'cli.mainMenu.smartConversion',
        'cli.mainMenu.smartConversionDesc',
        'smart',
      );

      expect(choice.value).toBe('smart');
      expect(choice.name).toContain('🤖 Smart Conversion');
      expect(choice.name).toContain('AI-powered settings with 3-step workflow');
      expect(choice.short).not.toContain('🤖');
    });

    it('should create Chinese menu choice', () => {
      translationManager.setLocale('zh-TW');

      const choice = i18nHelpers.createMenuChoice(
        'cli.mainMenu.smartConversion',
        'cli.mainMenu.smartConversionDesc',
        'smart',
      );

      expect(choice.name).toContain('🤖 智能轉換');
      expect(choice.name).toContain('AI 驅動的三步驟智能設定流程');
    });
  });

  describe('createHeader', () => {
    it('should create header with title only', () => {
      const header = i18nHelpers.createHeader('cli.mainMenu.title');

      expect(header).toBeInstanceOf(Array);
      expect(header.length).toBeGreaterThan(2);
      expect(header[0]).toMatch(/^┌/); // Starts with top-left corner
      expect(header[header.length - 1]).toMatch(/^└/); // Ends with bottom-left corner
    });

    it('should create header with title and subtitle', () => {
      const header = i18nHelpers.createHeader(
        'cli.mainMenu.title',
        'cli.mainMenu.subtitle',
      );

      expect(header).toBeInstanceOf(Array);
      expect(header.length).toBeGreaterThan(4); // More lines for subtitle
      expect(header.some((line) => line.includes('MD2PDF Main Menu'))).toBe(
        true,
      );
      expect(
        header.some((line) => line.includes('Convert Markdown files')),
      ).toBe(true);
    });

    it('should create Chinese header', () => {
      translationManager.setLocale('zh-TW');

      const header = i18nHelpers.createHeader('cli.mainMenu.title');

      expect(header.some((line) => line.includes('MD2PDF 主選單'))).toBe(true);
    });
  });

  describe('translation delegation', () => {
    it('should delegate t() method to translation manager', () => {
      const result = i18nHelpers.t('app.name');
      expect(result).toBe('MD2PDF');
    });

    it('should delegate t() with parameters', () => {
      const result = i18nHelpers.t('file.notFound', { path: '/test.md' });
      expect(result).toBe('File not found: /test.md');
    });

    it('should get current locale', () => {
      const locale = i18nHelpers.getCurrentLocale();
      expect(locale).toBe('en');
    });

    it('should set locale', () => {
      i18nHelpers.setLocale('zh-TW');
      expect(i18nHelpers.getCurrentLocale()).toBe('zh-TW');
    });
  });

  describe('createLanguageChoices', () => {
    it('should create language selection choices', () => {
      const choices = i18nHelpers.createLanguageChoices();

      expect(choices).toHaveLength(3); // back, en, zh-TW
      expect(choices[0].value).toBe('back');
      expect(choices[1].value).toBe('en');
      expect(choices[2].value).toBe('zh-TW');
    });

    it('should have proper language names', () => {
      const choices = i18nHelpers.createLanguageChoices();

      expect(choices[1].name).toBe('English');
      expect(choices[2].name).toBe('正體中文');
    });

    it('should include return option', () => {
      const choices = i18nHelpers.createLanguageChoices();
      const backChoice = choices.find((choice) => choice.value === 'back');

      expect(backChoice).toBeDefined();
      expect(backChoice!.name).toContain('Return to Main Menu');
    });
  });

  describe('edge cases', () => {
    it('should handle missing translation keys gracefully', () => {
      const items = [{ key: 'nonexistent.key', value: 'test' }];

      const choices = i18nHelpers.createChoices(items);
      expect(choices[0].name).toBe('nonexistent.key'); // Fallback to key
    });

    it('should handle empty header creation', () => {
      const header = i18nHelpers.createHeader('nonexistent.title');
      expect(header).toBeInstanceOf(Array);
      expect(header.length).toBeGreaterThan(0);
    });
  });
});
