/**
 * Translation manager implementation with parameter interpolation support
 */

import { enTranslations, zhTWTranslations } from './translations';

import type {
  ITranslationManager,
  SupportedLocale,
  TranslationKey,
  TranslationOptions,
} from './types';

export class TranslationManager implements ITranslationManager {
  private currentLocale: SupportedLocale;
  private fallbackLocale: SupportedLocale;
  private translations: Map<SupportedLocale, TranslationKey>;

  constructor(options: TranslationOptions = {}) {
    this.currentLocale = this.detectLocale(options);
    this.fallbackLocale = options.fallbackLocale || 'en';
    this.translations = new Map();

    // Load default translations
    this.loadDefaultTranslations();
  }

  private detectLocale(options: TranslationOptions): SupportedLocale {
    if (options.defaultLocale) {
      return options.defaultLocale;
    }

    if (options.useEnvironmentLocale !== false) {
      // Check environment variables
      const envLocale =
        process.env.MD2PDF_LOCALE || process.env.LANG || process.env.LANGUAGE;

      if (envLocale) {
        const locale = this.normalizeLocale(envLocale);
        if (this.isValidLocale(locale)) {
          return locale;
        }
      }
    }

    return 'en'; // Default to English
  }

  private normalizeLocale(locale: string): string {
    // Convert common locale formats to our supported locales
    const normalized = locale.toLowerCase().replace('_', '-');

    if (normalized.startsWith('zh')) {
      // Chinese variants
      if (normalized.includes('tw') || normalized.includes('hant')) {
        return 'zh-TW';
      }

      // Default to Traditional Chinese for now
      return 'zh-TW';
    }

    if (normalized.startsWith('en')) {
      return 'en';
    }

    return normalized;
  }

  private isValidLocale(locale: string): locale is SupportedLocale {
    return ['en', 'zh-TW'].includes(locale);
  }

  private loadDefaultTranslations(): void {
    this.translations.set('en', enTranslations);
    this.translations.set('zh-TW', zhTWTranslations);
  }

  setLocale(locale: SupportedLocale): void {
    if (this.isValidLocale(locale)) {
      this.currentLocale = locale;
    } else {
      throw new Error(`Unsupported locale: ${locale}`);
    }
  }

  getCurrentLocale(): SupportedLocale {
    return this.currentLocale;
  }

  getSupportedLocales(): SupportedLocale[] {
    return ['en', 'zh-TW'];
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.translate(key, this.currentLocale, params);
  }

  translate(
    key: string,
    locale: SupportedLocale,
    params?: Record<string, string | number>,
  ): string {
    const translation = this.getTranslationValue(key, locale);

    if (typeof translation !== 'string') {
      // If translation is not found or not a string, try fallback
      const fallbackTranslation = this.getTranslationValue(key, this.fallbackLocale);

      if (typeof fallbackTranslation === 'string') {
        return this.interpolate(fallbackTranslation, params);
      }

      // Return key as fallback
      return key;
    }

    return this.interpolate(translation, params);
  }

  hasTranslation(key: string, locale?: SupportedLocale): boolean {
    const targetLocale = locale || this.currentLocale;
    const translation = this.getTranslationValue(key, targetLocale);
    return typeof translation === 'string';
  }

  loadTranslations(locale: SupportedLocale, translations: TranslationKey): void {
    const existing = this.translations.get(locale) || {};
    this.translations.set(locale, this.mergeTranslations(existing, translations));
  }

  getTranslations(locale: SupportedLocale): TranslationKey {
    return this.translations.get(locale) || {};
  }

  private getTranslationValue(
    key: string,
    locale: SupportedLocale,
  ): string | TranslationKey | undefined {
    const translations = this.translations.get(locale);
    if (!translations) {
      return undefined;
    }

    const keyParts = key.split('.');
    let current: unknown = translations;

    for (const part of keyParts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current as string | TranslationKey | undefined;
  }

  private interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) {
      return template;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  private mergeTranslations(target: TranslationKey, source: TranslationKey): TranslationKey {
    const result: TranslationKey = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (
          typeof target[key] === 'object' &&
          target[key] !== null &&
          !Array.isArray(target[key])
        ) {
          result[key] = this.mergeTranslations(
            target[key] as TranslationKey,
            value as TranslationKey,
          );
        } else {
          result[key] = { ...value };
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Utility method to get available translation keys for debugging
   */
  getAvailableKeys(locale?: SupportedLocale): string[] {
    const targetLocale = locale || this.currentLocale;
    const translations = this.translations.get(targetLocale);
    if (!translations) {
      return [];
    }

    return this.flattenKeys(translations);
  }

  private flattenKeys(obj: TranslationKey, prefix: string = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        keys.push(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        keys.push(...this.flattenKeys(value as TranslationKey, fullKey));
      }
    }

    return keys.sort();
  }
}
