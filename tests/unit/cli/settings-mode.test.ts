/**
 * Tests for SettingsMode
 */

import { SettingsMode } from '../../../src/cli/settings-mode';
import type { ServiceContainer } from '../../../src/shared/container';
import type { ILogger } from '../../../src/infrastructure/logging/types';
import type { ITranslationManager } from '../../../src/infrastructure/i18n/types';
import type { IConfigManager } from '../../../src/infrastructure/config/types';

// Mock chalk
jest.mock('chalk', () => ({
  blue: (text: string) => text,
  green: (text: string) => text,
  yellow: (text: string) => text,
  red: (text: string) => text,
  gray: (text: string) => text,
}));

// Mock inquirer
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: jest.fn(),
  },
}));

describe('SettingsMode', () => {
  let settingsMode: SettingsMode;
  let mockContainer: ServiceContainer;
  let mockLogger: ILogger;
  let mockTranslationManager: ITranslationManager;
  let mockConfigManager: IConfigManager;
  let mockInquirer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockLogger = {
      log: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(),
    };

    mockTranslationManager = {
      getCurrentLocale: jest.fn().mockReturnValue('en'),
      getSupportedLocales: jest.fn().mockReturnValue(['en', 'zh-TW']),
      setLocale: jest.fn(),
      translate: jest.fn(),
      t: jest.fn().mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          'cli.prompts.selectLanguage': 'Select settings option:',
          'cli.settingsMenu.returnToMain': '0. Return to Main Menu',
          'cli.settingsMenu.languageSettings': '1. Language & Localization',
          'cli.settingsMenu.loggingSettings': '2. Logging Settings',
          'cli.settingsMenu.returnToSettings': '0. Return to Settings Menu',
          'cli.settingsMenu.title': '🔧 Settings & Preferences',
          'cli.languageMenu.title': '🌐 Language & Localization',
          'cli.languageMenu.subtitle': 'Choose your preferred language',
          'cli.languageMenu.currentLanguage': 'Current Language',
          'cli.languageMenu.current': 'Current',
          'cli.languages.en': 'English',
          'cli.languages.zh-TW': '正體中文',
          'success.settingsUpdated': 'Settings updated',
        };
        return translations[key] || key;
      }),
      hasTranslation: jest.fn(),
      loadTranslations: jest.fn(),
      getTranslations: jest.fn(),
    };

    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      load: jest.fn().mockResolvedValue(undefined),
    };

    mockContainer = {
      resolve: jest.fn((key: string) => {
        if (key === 'logger') return mockLogger;
        if (key === 'translator') return mockTranslationManager;
        if (key === 'config') return mockConfigManager;
        throw new Error(`Unknown service: ${key}`);
      }),
    } as any;

    mockInquirer = require('inquirer').default;

    // Mock console methods
    global.console = {
      ...console,
      log: jest.fn(),
      error: jest.fn(),
    };

    settingsMode = new SettingsMode(mockContainer);
  });

  describe('constructor', () => {
    it('should resolve services from container', () => {
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockContainer.resolve).toHaveBeenCalledWith('translator');
      expect(mockContainer.resolve).toHaveBeenCalledWith('config');
    });
  });

  describe('start', () => {
    it('should start settings mode and handle back navigation', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'startup.startingSettingsMode',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'startup.returningToMainMenuFromSettings',
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Settings & Preferences'),
      );
    });

    it('should handle language settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'language' }) // main settings menu
        .mockResolvedValueOnce({ language: 'back' }) // language selection menu - go back
        .mockResolvedValueOnce({ option: 'back' }); // main settings menu - go back

      await settingsMode.start();

      // Language settings now shows a different interface
      expect(mockTranslationManager.getCurrentLocale).toHaveBeenCalled();
      expect(mockTranslationManager.getSupportedLocales).toHaveBeenCalled();
    });

    it('should handle logging settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'logging' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('cli.settingsMenu.loggingComingSoon'),
      );
    });

    it('should handle errors and rethrow', async () => {
      const error = new Error('Test error');
      mockInquirer.prompt.mockRejectedValue(error);

      await expect(settingsMode.start()).rejects.toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'startup.settingsModeError',
        error,
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('customization.customizationError'),
        error,
      );
    });
  });

  describe('selectSettingsOption', () => {
    it('should present correct choices', async () => {
      mockInquirer.prompt.mockResolvedValue({ option: 'language' });

      // Access private method for testing
      const selectMethod = (settingsMode as any).selectSettingsOption.bind(
        settingsMode,
      );
      const result = await selectMethod();

      expect(result).toBe('language');
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'option',
          message: 'Select settings option:',
          choices: expect.arrayContaining([
            {
              name: '0. Return to Main Menu',
              value: 'back',
              short: 'short.back',
            },
            {
              name: '1. Language & Localization',
              value: 'language',
              short: 'short.languageSettings',
            },
            {
              name: '2. Logging Settings',
              value: 'logging',
              short: 'short.loggingSettings',
            },
          ]),
          default: 'language',
          pageSize: 12,
        }),
      ]);
    });
  });

  describe('showSettingsHeader', () => {
    it('should display settings header', () => {
      const showHeaderMethod = (settingsMode as any).showSettingsHeader.bind(
        settingsMode,
      );
      showHeaderMethod();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Current Language: English'),
      );
    });
  });

  describe('pressAnyKey', () => {
    it('should prompt user to press any key', async () => {
      mockInquirer.prompt.mockResolvedValue({ continue: '' });

      const pressAnyKeyMethod = (settingsMode as any).pressAnyKey.bind(
        settingsMode,
      );
      await pressAnyKeyMethod();

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'continue',
          message: 'cli.settingsMenu.pressEnterToContinue',
        },
      ]);
    });
  });
});
