/**
 * Tests for SettingsMode
 */

import { SettingsMode } from '../../../src/cli/settings-mode';
import type { ServiceContainer } from '../../../src/shared/container';
import type { ILogger } from '../../../src/infrastructure/logging/types';

// Mock chalk
jest.mock('chalk', () => ({
  blue: (text: string) => text,
  green: (text: string) => text,
  yellow: (text: string) => text,
  red: (text: string) => text,
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

    mockContainer = {
      resolve: jest.fn((key: string) => {
        if (key === 'logger') return mockLogger;
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
    it('should resolve logger from container', () => {
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
    });
  });

  describe('start', () => {
    it('should start settings mode and handle back navigation', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting settings mode');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Returning to main menu from settings',
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Settings & Preferences'),
      );
    });

    it('should handle language settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'language' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Language Settings'),
      );
      expect(console.log).toHaveBeenCalledWith(
        'Current language: English (en-US)',
      );
      expect(console.log).toHaveBeenCalledWith('Available languages:');
    });

    it('should handle defaults settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'defaults' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Default Settings features coming soon'),
      );
    });

    it('should handle performance settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'performance' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Performance Settings features coming soon'),
      );
    });

    it('should handle cache settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'cache' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache Settings features coming soon'),
      );
    });

    it('should handle logging settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'logging' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Logging Settings features coming soon'),
      );
    });

    it('should handle reset settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'reset' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Reset Settings features coming soon'),
      );
    });

    it('should handle export settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'export' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Export Settings features coming soon'),
      );
    });

    it('should handle import settings option', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ option: 'import' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await settingsMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Import Settings features coming soon'),
      );
    });

    it('should handle errors and rethrow', async () => {
      const error = new Error('Test error');
      mockInquirer.prompt.mockRejectedValue(error);

      await expect(settingsMode.start()).rejects.toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Settings mode error',
        error,
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Settings error:'),
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
            { name: '0. Return to Main Menu', value: 'back', short: 'Back' },
            {
              name: '1. Language & Localization',
              value: 'language',
              short: 'Language Settings',
            },
            {
              name: '2. Default Preferences',
              value: 'defaults',
              short: 'Default Settings',
            },
            {
              name: '3. Performance & Memory',
              value: 'performance',
              short: 'Performance Settings',
            },
            {
              name: '4. Cache Management',
              value: 'cache',
              short: 'Cache Settings',
            },
            {
              name: '5. Logging & Diagnostics',
              value: 'logging',
              short: 'Logging Settings',
            },
            {
              name: '6. Reset to Factory Defaults',
              value: 'reset',
              short: 'Reset Settings',
            },
            {
              name: '7. Export Configuration',
              value: 'export',
              short: 'Export Settings',
            },
            {
              name: '8. Import Configuration',
              value: 'import',
              short: 'Import Settings',
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
        expect.stringContaining('Settings & Preferences'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Language, defaults, and system config'),
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
          message: 'Press Enter to continue...',
        },
      ]);
    });
  });
});
