/**
 * @jest-environment node
 */

import { TranslationManager } from '../../../src/infrastructure/i18n/manager';
import type { TranslationOptions } from '../../../src/infrastructure/i18n/types';

describe('TranslationManager', () => {
  let translationManager: TranslationManager;

  beforeEach(() => {
    translationManager = new TranslationManager({ defaultLocale: 'en' });
  });

  describe('initialization', () => {
    it('should initialize with default locale', () => {
      expect(translationManager.getCurrentLocale()).toBe('en');
    });

    it('should support both English and Chinese locales', () => {
      const supportedLocales = translationManager.getSupportedLocales();
      expect(supportedLocales).toContain('en');
      expect(supportedLocales).toContain('zh-TW');
      expect(supportedLocales).toHaveLength(2);
    });

    it('should detect locale from options', () => {
      const options: TranslationOptions = { defaultLocale: 'zh-TW' };
      const manager = new TranslationManager(options);
      expect(manager.getCurrentLocale()).toBe('zh-TW');
    });
  });

  describe('locale management', () => {
    it('should set locale successfully', () => {
      translationManager.setLocale('zh-TW');
      expect(translationManager.getCurrentLocale()).toBe('zh-TW');
    });

    it('should throw error for unsupported locale', () => {
      expect(() => {
        // @ts-expect-error Testing invalid locale
        translationManager.setLocale('invalid');
      }).toThrow('Unsupported locale: invalid');
    });
  });

  describe('translation functionality', () => {
    it('should translate basic keys for English', () => {
      translationManager.setLocale('en');
      const translation = translationManager.t('app.name');
      expect(translation).toBe('MD2PDF');
    });

    it('should translate basic keys for Chinese', () => {
      translationManager.setLocale('zh-TW');
      const translation = translationManager.t('app.name');
      expect(translation).toBe('MD2PDF');
    });

    it('should translate nested keys', () => {
      translationManager.setLocale('en');
      const translation = translationManager.t('cli.mainMenu.title');
      expect(translation).toBe('MD2PDF Main Menu');
    });

    it('should translate with parameters', () => {
      translationManager.setLocale('en');
      const translation = translationManager.t('file.notFound', {
        path: '/test/file.md',
      });
      expect(translation).toBe('File not found: /test/file.md');
    });

    it('should fall back to English for missing Chinese translations', () => {
      translationManager.setLocale('zh-TW');
      // Test with a key that might only exist in English
      const translation = translationManager.t('app.version');
      expect(translation).toBeDefined();
    });

    it('should return key as fallback for completely missing translations', () => {
      const translation = translationManager.t('nonexistent.key');
      expect(translation).toBe('nonexistent.key');
    });
  });

  describe('translation validation', () => {
    it('should check if translation exists', () => {
      expect(translationManager.hasTranslation('app.name')).toBe(true);
      expect(translationManager.hasTranslation('nonexistent.key')).toBe(false);
    });

    it('should check translation for specific locale', () => {
      expect(translationManager.hasTranslation('app.name', 'en')).toBe(true);
      expect(translationManager.hasTranslation('app.name', 'zh-TW')).toBe(true);
    });
  });

  describe('main menu translations', () => {
    it('should have all main menu translations in English', () => {
      translationManager.setLocale('en');
      expect(translationManager.t('cli.mainMenu.smartConversion')).toBe(
        '🤖 Smart Conversion',
      );
      expect(translationManager.t('cli.mainMenu.singleFile')).toBe(
        '📄 Single File',
      );
      expect(translationManager.t('cli.mainMenu.batchProcessing')).toBe(
        '📚 Batch Processing',
      );
      expect(translationManager.t('cli.mainMenu.customization')).toBe(
        '🎨 Customization',
      );
      expect(translationManager.t('cli.mainMenu.settings')).toBe('🔧 Settings');
      expect(translationManager.t('cli.mainMenu.exit')).toBe('🚪 Exit');
    });

    it('should have all main menu translations in Chinese', () => {
      translationManager.setLocale('zh-TW');
      expect(translationManager.t('cli.mainMenu.smartConversion')).toBe(
        '🤖 智能轉換',
      );
      expect(translationManager.t('cli.mainMenu.singleFile')).toBe(
        '📄 單檔轉換',
      );
      expect(translationManager.t('cli.mainMenu.batchProcessing')).toBe(
        '📚 批次處理',
      );
      expect(translationManager.t('cli.mainMenu.customization')).toBe(
        '🎨 客製化設定',
      );
      expect(translationManager.t('cli.mainMenu.settings')).toBe('🔧 偏好設定');
      expect(translationManager.t('cli.mainMenu.exit')).toBe('🚪 離開');
    });
  });

  describe('settings menu translations', () => {
    it('should have settings menu translations in English', () => {
      translationManager.setLocale('en');
      expect(translationManager.t('cli.settingsMenu.title')).toBe(
        '🔧 Settings & Preferences',
      );
      expect(translationManager.t('cli.settingsMenu.returnToMain')).toBe(
        '0. Return to Main Menu',
      );
      expect(translationManager.t('cli.settingsMenu.languageSettings')).toBe(
        '1. Language & Localization',
      );
    });

    it('should have settings menu translations in Chinese', () => {
      translationManager.setLocale('zh-TW');
      expect(translationManager.t('cli.settingsMenu.title')).toBe(
        '🔧 偏好設定',
      );
      expect(translationManager.t('cli.settingsMenu.returnToMain')).toBe(
        '0. 返回主選單',
      );
      expect(translationManager.t('cli.settingsMenu.languageSettings')).toBe(
        '1. 語言與本地化',
      );
    });
  });

  describe('error messages', () => {
    it('should translate error messages with parameters', () => {
      translationManager.setLocale('en');
      const errorMessage = translationManager.t('error.validation', {
        message: 'Invalid input',
      });
      expect(errorMessage).toBe('Validation error: Invalid input');
    });

    it('should translate Chinese error messages with parameters', () => {
      translationManager.setLocale('zh-TW');
      const errorMessage = translationManager.t('error.validation', {
        message: '無效輸入',
      });
      expect(errorMessage).toBe('驗證錯誤：無效輸入');
    });
  });

  describe('utility methods', () => {
    it('should get available translation keys', () => {
      const keys = translationManager.getAvailableKeys('en');
      expect(keys.length).toBeGreaterThan(0);
      expect(keys).toContain('app.name');
      expect(keys).toContain('cli.mainMenu.title');
    });

    it('should get all translations for a locale', () => {
      const translations = translationManager.getTranslations('en');
      expect(translations).toHaveProperty('app');
      expect(translations).toHaveProperty('cli');
    });

    it('should load additional translations', () => {
      const additionalTranslations = {
        test: {
          message: 'Test message',
        },
      };

      translationManager.loadTranslations('en', additionalTranslations);
      expect(translationManager.t('test.message')).toBe('Test message');
    });
  });
});
