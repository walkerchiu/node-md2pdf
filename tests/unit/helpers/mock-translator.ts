/**
 * Standard mock translator for tests
 */
import type { ITranslationManager } from '../../../src/infrastructure/i18n/types';

export function createMockTranslator(): jest.Mocked<ITranslationManager> {
  return {
    t: jest.fn((key: string, params?: Record<string, string | number>) => {
      // Simple mock implementation that returns the key or applies basic parameter substitution
      if (params) {
        let result = key;
        for (const [param, value] of Object.entries(params)) {
          result = result.replace(`{{${param}}}`, value.toString());
        }
        return result;
      }
      return key;
    }),
    getCurrentLocale: jest.fn(() => 'en'),
    setLocale: jest.fn(),
    getSupportedLocales: jest.fn(() => ['en', 'zh-TW']),
    translate: jest.fn(
      (_key: string, _locale: any, _params?: any) => 'translated',
    ),
    hasTranslation: jest.fn((_key: string, _locale?: any) => true),
    loadTranslations: jest.fn(),
    getTranslations: jest.fn((_locale: any) => ({})),
  };
}
