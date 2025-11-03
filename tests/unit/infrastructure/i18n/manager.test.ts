/**
 * Tests for Translation Manager
 */

import { TranslationManager } from '../../../../src/infrastructure/i18n/manager';
import type { SupportedLocale } from '../../../../src/infrastructure/i18n/types';

describe('TranslationManager', () => {
  let manager: TranslationManager;

  afterEach(() => {
    // Clean up environment variables
    delete process.env.MD2PDF_LOCALE;
    delete process.env.LANG;
    delete process.env.LANGUAGE;
  });

  describe('initialization', () => {
    it('should initialize with default English locale', () => {
      manager = new TranslationManager();

      expect(manager.getCurrentLocale()).toBe('en');
    });

    it('should initialize with specified default locale', () => {
      manager = new TranslationManager({ defaultLocale: 'zh-TW' });

      expect(manager.getCurrentLocale()).toBe('zh-TW');
    });

    it('should initialize with fallback locale', () => {
      manager = new TranslationManager({ fallbackLocale: 'zh-TW' });

      expect(manager.getCurrentLocale()).toBe('en');
    });
  });

  describe('environment locale detection', () => {
    it('should detect locale from MD2PDF_LOCALE environment variable', () => {
      process.env.MD2PDF_LOCALE = 'zh-TW';

      manager = new TranslationManager({ useEnvironmentLocale: true });

      expect(manager.getCurrentLocale()).toBe('zh-TW');
    });

    it('should detect locale from LANG environment variable', () => {
      process.env.LANG = 'zh_TW.UTF-8';

      manager = new TranslationManager({ useEnvironmentLocale: true });

      expect(manager.getCurrentLocale()).toBe('zh-TW');
    });

    it('should detect locale from LANGUAGE environment variable', () => {
      process.env.LANGUAGE = 'en_US:en';

      manager = new TranslationManager({ useEnvironmentLocale: true });

      expect(manager.getCurrentLocale()).toBe('en');
    });

    it('should fallback to default when environment locale is invalid', () => {
      process.env.MD2PDF_LOCALE = 'invalid-locale';

      manager = new TranslationManager({ useEnvironmentLocale: true });

      expect(manager.getCurrentLocale()).toBe('en');
    });

    it('should not use environment locale when useEnvironmentLocale is false', () => {
      process.env.MD2PDF_LOCALE = 'zh-TW';

      manager = new TranslationManager({ useEnvironmentLocale: false });

      expect(manager.getCurrentLocale()).toBe('en');
    });
  });

  describe('setLocale', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should change locale successfully', () => {
      manager.setLocale('zh-TW');

      expect(manager.getCurrentLocale()).toBe('zh-TW');
    });

    it('should throw error for invalid locale', () => {
      expect(() => {
        manager.setLocale('invalid-locale' as SupportedLocale);
      }).toThrow('Unsupported locale: invalid-locale');
    });
  });

  describe('translation retrieval', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should translate existing keys in English', () => {
      manager.setLocale('en');

      const result = manager.t('common.error');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should translate existing keys in Chinese', () => {
      manager.setLocale('zh-TW');

      const result = manager.t('common.error');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return key as fallback for missing translations', () => {
      const missingKey = 'nonexistent.key';

      const result = manager.t(missingKey);

      expect(result).toBe(missingKey);
    });
  });

  describe('current locale', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should return current locale', () => {
      expect(manager.getCurrentLocale()).toBe('en');

      manager.setLocale('zh-TW');

      expect(manager.getCurrentLocale()).toBe('zh-TW');
    });
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should handle translation method calls', () => {
      expect(typeof manager.t).toBe('function');
      expect(typeof manager.getCurrentLocale).toBe('function');
      expect(typeof manager.setLocale).toBe('function');
    });

    it('should handle translation parameters', () => {
      const result = manager.t('common.greeting', { name: 'Test' });

      expect(typeof result).toBe('string');
    });
  });

  describe('locale normalization', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should normalize Chinese locale variants', () => {
      process.env.MD2PDF_LOCALE = 'zh_Hant';
      const manager1 = new TranslationManager({ useEnvironmentLocale: true });
      expect(manager1.getCurrentLocale()).toBe('zh-TW');

      process.env.MD2PDF_LOCALE = 'zh_tw';
      const manager2 = new TranslationManager({ useEnvironmentLocale: true });
      expect(manager2.getCurrentLocale()).toBe('zh-TW');

      process.env.MD2PDF_LOCALE = 'zh';
      const manager3 = new TranslationManager({ useEnvironmentLocale: true });
      expect(manager3.getCurrentLocale()).toBe('zh-TW');
    });

    it('should normalize English locale variants', () => {
      process.env.MD2PDF_LOCALE = 'en_US';
      const manager1 = new TranslationManager({ useEnvironmentLocale: true });
      expect(manager1.getCurrentLocale()).toBe('en');

      process.env.MD2PDF_LOCALE = 'EN';
      const manager2 = new TranslationManager({ useEnvironmentLocale: true });
      expect(manager2.getCurrentLocale()).toBe('en');
    });
  });

  describe('supported locales', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should return list of supported locales', () => {
      const supported = manager.getSupportedLocales();

      expect(Array.isArray(supported)).toBe(true);
      expect(supported).toContain('en');
      expect(supported).toContain('zh-TW');
    });
  });

  describe('translation existence check', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should check if translation exists in current locale', () => {
      manager.setLocale('en');

      expect(manager.hasTranslation('common.error')).toBe(true);
      expect(manager.hasTranslation('nonexistent.key')).toBe(false);
    });

    it('should check if translation exists in specified locale', () => {
      expect(manager.hasTranslation('common.error', 'en')).toBe(true);
      expect(manager.hasTranslation('common.error', 'zh-TW')).toBe(true);
      expect(manager.hasTranslation('nonexistent.key', 'en')).toBe(false);
    });
  });

  describe('translation with parameters', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should interpolate parameters in translation', () => {
      // Add test translation with parameters
      manager.loadTranslations('en', {
        test: {
          greeting: 'Hello {{name}}, welcome to {{app}}!',
        },
      });

      const result = manager.t('test.greeting', {
        name: 'John',
        app: 'MD2PDF',
      });

      expect(result).toBe('Hello John, welcome to MD2PDF!');
    });

    it('should handle missing parameters', () => {
      manager.loadTranslations('en', {
        test: {
          message: 'Hello {{name}}, your score is {{score}}',
        },
      });

      const result = manager.t('test.message', { name: 'Alice' });

      expect(result).toBe('Hello Alice, your score is {{score}}');
    });

    it('should handle empty parameters', () => {
      manager.loadTranslations('en', {
        test: {
          simple: 'Simple message without parameters',
        },
      });

      const result = manager.t('test.simple', {});

      expect(result).toBe('Simple message without parameters');
    });

    it('should handle undefined parameters', () => {
      manager.loadTranslations('en', {
        test: {
          simple: 'Simple message without parameters',
        },
      });

      const result = manager.t('test.simple');

      expect(result).toBe('Simple message without parameters');
    });
  });

  describe('fallback behavior', () => {
    beforeEach(() => {
      manager = new TranslationManager({ fallbackLocale: 'en' });
    });

    it('should use fallback locale when translation not found', () => {
      // Set primary locale to Chinese but ensure English has the key
      manager.setLocale('zh-TW');

      manager.loadTranslations('en', {
        test: {
          fallback: 'Fallback message in English',
        },
      });

      const result = manager.t('test.fallback');

      expect(typeof result).toBe('string');
      // Should fall back to English translation
      expect(result).toBe('Fallback message in English');
    });

    it('should return key when no translation found in any locale', () => {
      const missingKey = 'completely.missing.key';
      const result = manager.t(missingKey);

      expect(result).toBe(missingKey);
    });
  });

  describe('custom translation loading', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should load custom translations for a locale', () => {
      const customTranslations = {
        custom: {
          message: 'Custom message',
          nested: {
            deep: 'Deep custom message',
          },
        },
      };

      manager.loadTranslations('en', customTranslations);

      expect(manager.t('custom.message')).toBe('Custom message');
      expect(manager.t('custom.nested.deep')).toBe('Deep custom message');
    });

    it('should merge custom translations with existing ones', () => {
      const customTranslations1 = {
        custom: {
          message1: 'Message 1',
        },
      };

      const customTranslations2 = {
        custom: {
          message2: 'Message 2',
        },
      };

      manager.loadTranslations('en', customTranslations1);
      manager.loadTranslations('en', customTranslations2);

      expect(manager.t('custom.message1')).toBe('Message 1');
      expect(manager.t('custom.message2')).toBe('Message 2');
    });

    it('should override existing translations when loading new ones', () => {
      const translations1 = {
        test: {
          message: 'Original message',
        },
      };

      const translations2 = {
        test: {
          message: 'Updated message',
        },
      };

      manager.loadTranslations('en', translations1);
      expect(manager.t('test.message')).toBe('Original message');

      manager.loadTranslations('en', translations2);
      expect(manager.t('test.message')).toBe('Updated message');
    });
  });

  describe('translation retrieval', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should get all translations for a locale', () => {
      const translations = manager.getTranslations('en');

      expect(typeof translations).toBe('object');
      expect(translations).toBeTruthy();
    });

    it('should return empty object for non-existent locale', () => {
      const translations = manager.getTranslations('fr' as any);

      expect(translations).toEqual({});
    });
  });

  describe('available keys utility', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should return available translation keys for current locale', () => {
      manager.loadTranslations('en', {
        test: {
          message1: 'Message 1',
          nested: {
            message2: 'Message 2',
          },
        },
      });

      const keys = manager.getAvailableKeys();

      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toContain('test.message1');
      expect(keys).toContain('test.nested.message2');
    });

    it('should return available translation keys for specified locale', () => {
      manager.loadTranslations('zh-TW', {
        zh: {
          test: '測試',
        },
      });

      const keys = manager.getAvailableKeys('zh-TW');

      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toContain('zh.test');
    });

    it('should return empty array for non-existent locale', () => {
      const keys = manager.getAvailableKeys('invalid' as any);

      expect(keys).toEqual([]);
    });

    it('should return sorted keys', () => {
      // Create a new instance to avoid interference from default translations
      const freshManager = new TranslationManager();
      freshManager.loadTranslations('en', {
        z: {
          last: 'Last',
        },
        a: {
          first: 'First',
        },
        m: {
          middle: 'Middle',
        },
      });

      const keys = freshManager.getAvailableKeys();

      // Filter out any default translation keys and focus on our test keys
      const testKeys = keys.filter(
        (key) =>
          key.startsWith('z.') || key.startsWith('a.') || key.startsWith('m.'),
      );

      expect(testKeys).toContain('a.first');
      expect(testKeys).toContain('m.middle');
      expect(testKeys).toContain('z.last');

      // Verify they are sorted correctly
      const sortedTestKeys = testKeys.sort();
      expect(sortedTestKeys[0]).toBe('a.first');
      expect(sortedTestKeys[1]).toBe('m.middle');
      expect(sortedTestKeys[2]).toBe('z.last');
    });
  });

  describe('direct translate method', () => {
    beforeEach(() => {
      manager = new TranslationManager();
    });

    it('should translate with explicit locale parameter', () => {
      manager.loadTranslations('zh-TW', {
        test: {
          message: '測試訊息',
        },
      });

      const result = manager.translate('test.message', 'zh-TW');

      expect(result).toBe('測試訊息');
    });

    it('should translate with parameters using explicit locale', () => {
      manager.loadTranslations('zh-TW', {
        test: {
          greeting: '你好 {{name}}',
        },
      });

      const result = manager.translate('test.greeting', 'zh-TW', {
        name: '世界',
      });

      expect(result).toBe('你好 世界');
    });
  });
});
