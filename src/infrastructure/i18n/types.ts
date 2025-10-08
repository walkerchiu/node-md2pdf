/**
 * Internationalization types and interfaces
 */

export type SupportedLocale = 'en' | 'zh-TW';

export interface TranslationKey {
  [key: string]: string | TranslationKey;
}

export interface ITranslationManager {
  /**
   * Set the current locale
   */
  setLocale(locale: SupportedLocale): void;
  /**
   * Get the current locale
   */
  getCurrentLocale(): SupportedLocale;
  /**
   * Get supported locales
   */
  getSupportedLocales(): SupportedLocale[];
  /**
   * Translate a key to the current locale
   */
  t(key: string, params?: Record<string, string | number>): string;
  /**
   * Translate a key to a specific locale
   */
  translate(
    key: string,
    locale: SupportedLocale,
    params?: Record<string, string | number>,
  ): string;
  /**
   * Check if a translation key exists
   */
  hasTranslation(key: string, locale?: SupportedLocale): boolean;
  /**
   * Load additional translations
   */
  loadTranslations(locale: SupportedLocale, translations: TranslationKey): void;
  /**
   * Get all translations for a locale
   */
  getTranslations(locale: SupportedLocale): TranslationKey;
}

export interface TranslationOptions {
  defaultLocale?: SupportedLocale;
  fallbackLocale?: SupportedLocale;
  useEnvironmentLocale?: boolean;
}
