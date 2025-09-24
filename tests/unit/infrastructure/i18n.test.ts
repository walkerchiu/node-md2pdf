import { TranslationManager } from '../../../src/infrastructure/i18n';

describe('TranslationManager', () => {
  let translator: TranslationManager;

  beforeEach(() => {
    translator = new TranslationManager({ defaultLocale: 'en' });
  });

  describe('Locale Management', () => {
    it('should set and get current locale', () => {
      expect(translator.getCurrentLocale()).toBe('en');
      translator.setLocale('zh-TW');
      expect(translator.getCurrentLocale()).toBe('zh-TW');
    });

    it('should return supported locales', () => {
      const locales = translator.getSupportedLocales();
      expect(locales).toEqual(['en', 'zh-TW']);
    });

    it('should throw error for unsupported locale', () => {
      expect(() => translator.setLocale('fr' as never)).toThrow('Unsupported locale: fr');
    });
  });

  describe('Translation', () => {
    it('should translate keys to current locale', () => {
      const result = translator.t('app.name');
      expect(result).toBe('MD2PDF');
    });

    it('should translate keys to specific locale', () => {
      const enResult = translator.translate('cli.options.yes', 'en');
      const zhResult = translator.translate('cli.options.yes', 'zh-TW');
      expect(enResult).toBe('Yes');
      expect(zhResult).toBe('是');
    });

    it('should return key for missing translations', () => {
      const result = translator.t('nonexistent.key');
      expect(result).toBe('nonexistent.key');
    });

    it('should interpolate parameters', () => {
      const result = translator.t('file.notFound', { path: '/test/file.txt' });
      expect(result).toBe('File not found: /test/file.txt');
    });

    it('should handle complex parameter interpolation', () => {
      const result = translator.t('pdf.pageCount', { count: 42 });
      expect(result).toBe('Total pages: 42');
    });
  });

  describe('Translation Management', () => {
    it('should check if translation exists', () => {
      expect(translator.hasTranslation('app.name')).toBe(true);
      expect(translator.hasTranslation('nonexistent')).toBe(false);
    });

    it('should load additional translations', () => {
      translator.loadTranslations('en', {
        custom: {
          message: 'Custom message',
        },
      });
      const result = translator.t('custom.message');
      expect(result).toBe('Custom message');
    });

    it('should get all translations for locale', () => {
      const translations = translator.getTranslations('en');
      expect(translations).toHaveProperty('app');
      expect(translations.app).toHaveProperty('name', 'MD2PDF');
    });
  });

  describe('Environment Detection', () => {
    it('should create with environment locale detection', () => {
      // Set environment variable for testing
      const originalLang = process.env.LANG;
      process.env.LANG = 'zh_TW.UTF-8';
      const envTranslator = new TranslationManager({ useEnvironmentLocale: true });
      expect(envTranslator.getCurrentLocale()).toBe('zh-TW');

      // Restore original environment
      if (originalLang) {
        process.env.LANG = originalLang;
      } else {
        delete process.env.LANG;
      }
    });

    it('should fallback to English for unknown environment locale', () => {
      const originalLang = process.env.LANG;
      process.env.LANG = 'fr_FR.UTF-8';
      const envTranslator = new TranslationManager({ useEnvironmentLocale: true });
      expect(envTranslator.getCurrentLocale()).toBe('en');

      // Restore original environment
      if (originalLang) {
        process.env.LANG = originalLang;
      } else {
        delete process.env.LANG;
      }
    });
  });

  describe('Utility Methods', () => {
    it('should get available translation keys', () => {
      const keys = translator.getAvailableKeys('en');
      expect(keys).toContain('app.name');
      expect(keys).toContain('cli.options.yes');
      expect(keys).toContain('file.notFound');
    });

    it('should return empty array for non-existent locale keys', () => {
      const keys = translator.getAvailableKeys('fr' as never);
      expect(keys).toEqual([]);
    });
  });
});
