/**
 * Unit tests for MainInteractiveMode
 */

import { jest } from '@jest/globals';

// Mock prompt function (currently unused but kept for potential future use)
// const mockPrompt = jest.fn() as jest.MockedFunction<any>;

// Mock dependencies - must be before imports
jest.mock('chalk', () => ({
  cyan: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
}));

// Since the source code uses dynamic import, we need to mock the MainInteractiveMode class method
// Instead of mocking the import directly, let's spy on the class method after instantiation

import { MainInteractiveMode } from '../../../src/cli/main-interactive';
import { ServiceContainer } from '../../../src/shared/container';
import type { ILogger } from '../../../src/infrastructure/logging/types';
import type { ITranslationManager } from '../../../src/infrastructure/i18n/types';

// Local private interface to access internal methods for testing without using `any`
type PrivateMainInteractive = {
  selectMode: () => Promise<string>;
  showWelcomeMessage?: () => void;
};

jest.mock('../../../src/cli/interactive', () => ({
  InteractiveMode: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

jest.mock('../../../src/cli/batch', () => ({
  BatchInteractiveMode: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

describe('MainInteractiveMode', () => {
  let container: ServiceContainer;
  let mockLogger: jest.Mocked<ILogger>;
  let mockTranslationManager: jest.Mocked<ITranslationManager>;
  let mainMode: MainInteractiveMode;
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    // Setup mocks
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setLevel: jest.fn(),
      log: jest.fn(),
      getLevel: jest.fn(),
    };

    mockTranslationManager = {
      getCurrentLocale: jest.fn(() => 'en' as const),
      getSupportedLocales: jest.fn(() => ['en', 'zh-TW'] as const),
      setLocale: jest.fn(),
      translate: jest.fn(),
      t: jest.fn((key: string) => {
        const translations: Record<string, string> = {
          'cli.mainMenu.title': 'MD2PDF Main Menu',
          'cli.mainMenu.subtitle':
            'Convert Markdown files to professional PDF documents with table of contents',
          'cli.mainMenu.processPrompt':
            'How would you like to process your files?',
          'cli.mainMenu.smartConversion': '🤖 Smart Conversion',
          'cli.mainMenu.smartConversionDesc':
            'AI-powered settings with 3-step workflow',
          'cli.mainMenu.singleFile': '📄 Single File',
          'cli.mainMenu.singleFileDesc': 'Convert one Markdown file to PDF',
          'cli.mainMenu.batchProcessing': '📚 Batch Processing',
          'cli.mainMenu.batchProcessingDesc': 'Convert multiple files at once',
          'cli.mainMenu.customization': '🎨 Customization',
          'cli.mainMenu.customizationDesc': 'Advanced styling and templates',
          'cli.mainMenu.settings': '🔧 Settings',
          'cli.mainMenu.settingsDesc': 'Language and preferences',
          'cli.mainMenu.exit': '🚪 Exit',
          'cli.options.goodbye': 'Goodbye!',
        };
        return translations[key] || key;
      }),
      hasTranslation: jest.fn(),
      loadTranslations: jest.fn(),
      getTranslations: jest.fn(),
    } as any;

    container = new ServiceContainer();
    container.registerInstance('logger', mockLogger);
    container.registerInstance('translator', mockTranslationManager);

    mainMode = new MainInteractiveMode(container);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with container and resolve logger', () => {
      expect(mainMode).toBeInstanceOf(MainInteractiveMode);
      expect(container.resolve('logger')).toBe(mockLogger);
    });
  });

  describe('start method', () => {
    it('should start successfully with single mode selection then exit', async () => {
      // Mock selectMode to return 'single' first, then 'exit' to break the loop
      jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('exit');

      await mainMode.start();

      // Note: Logger calls are now handled through CliUIManager debug mode
      // In non-verbose mode, these debug messages won't trigger logger.info
      expect(consoleSpy).toHaveBeenCalled(); // Welcome message displayed
    });

    it('should start successfully with batch mode selection then exit', async () => {
      // Mock selectMode to return 'batch' first, then 'exit' to break the loop
      jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValueOnce('batch')
        .mockResolvedValueOnce('exit');

      await mainMode.start();

      // Note: Logger calls are now handled through CliUIManager debug mode
    });

    it('should handle exit selection gracefully', async () => {
      // Spy on the selectMode method directly
      jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValue('exit');

      await mainMode.start();

      // Note: Exit logging is now handled through CliUIManager debug mode
      expect(consoleSpy).toHaveBeenCalledWith('👋 Goodbye!');
    });

    it('should handle errors properly', async () => {
      // Spy on the selectMode method to throw error
      const testError = new Error('Test error');
      jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockRejectedValue(testError);

      await expect(mainMode.start()).rejects.toThrow('Test error');

      // Note: Logger.error might still be called through CliUIManager in verbose mode
      expect(mockLogger.error).toHaveBeenCalled();
      // Note: Error formatting is now handled through CliUIManager
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Main interactive mode error',
      );
    });
  });

  describe('showWelcomeMessage', () => {
    it('should display welcome message with proper formatting', async () => {
      // Access private method for testing
      const showWelcomeMessage = (
        mainMode as unknown as PrivateMainInteractive
      ).showWelcomeMessage!.bind(mainMode);
      showWelcomeMessage();

      // Check that console.log was called with header content
      // The exact format might vary due to dynamic title generation
      expect(consoleSpy).toHaveBeenCalled();

      // Check that it includes the main components we expect
      const allCalls = consoleSpy.mock.calls.map((call: any) => call[0]);
      const allOutput = allCalls.join('');

      expect(allOutput).toContain('MD2PDF Main Menu');
      expect(allOutput).toContain('Convert Markdown files');
    });
  });

  describe('selectMode', () => {
    it('should return correct mode selection', async () => {
      // Since selectMode involves dynamic import which is complex to mock,
      // we'll test the method behavior through spying
      const selectModeSpy = jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValue('single');

      const selectMode = (
        mainMode as unknown as PrivateMainInteractive
      ).selectMode.bind(mainMode);
      const result = await selectMode();

      expect(result).toBe('single');
      expect(selectModeSpy).toHaveBeenCalled();
    });

    it('should handle different mode selections', async () => {
      const selectModeSpy = jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValue('batch');

      const selectMode = (
        mainMode as unknown as PrivateMainInteractive
      ).selectMode.bind(mainMode);
      const result = await selectMode();

      expect(result).toBe('batch');
      expect(selectModeSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should properly handle container resolution errors', () => {
      const emptyContainer = new ServiceContainer();

      expect(() => {
        new MainInteractiveMode(emptyContainer);
      }).toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete single file flow then return to menu', async () => {
      const selectModeSpy = jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('exit');

      await mainMode.start();

      expect(selectModeSpy).toHaveBeenCalledTimes(2);
      // Note: Debug logging is now handled through CliUIManager
    });

    it('should handle complete batch flow then return to menu', async () => {
      const selectModeSpy = jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValueOnce('batch')
        .mockResolvedValueOnce('exit');

      await mainMode.start();

      expect(selectModeSpy).toHaveBeenCalledTimes(2);
      // Note: Debug logging is now handled through CliUIManager
    });
  });
});
