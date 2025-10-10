/**
 * Unit tests for CustomizationMode
 */

import { CustomizationMode } from '../../../src/cli/customization-mode';
import type { ServiceContainer } from '../../../src/shared/container';

// Mock inquirer
const mockPrompt = jest.fn();
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: mockPrompt,
  },
}));

// Mock chalk
jest.mock('chalk', () => ({
  blue: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  magenta: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text),
}));

describe('CustomizationMode', () => {
  let customizationMode: CustomizationMode;
  let mockContainer: ServiceContainer;
  let mockLogger: any;
  let mockTranslationManager: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create mock translation manager
    mockTranslationManager = {
      t: jest.fn().mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          'cli.customizationMenu.title': '🎨 Customization Settings',
          'cli.customizationMenu.subtitle':
            'Advanced styling and template management options',
          'cli.customizationMenu.returnToMain': '0. Return to Main Menu',
          'cli.customizationMenu.coverDesign': '1. Cover Design',
          'cli.customizationMenu.headersFooters': '2. Headers & Footers',
          'cli.customizationMenu.documentMetadata': '3. Document Metadata',
          'cli.customizationMenu.securitySettings': '4. Security & Watermarks',
          'cli.customizationMenu.templateManagement': '5. Template Management',
          'customization.selectCustomizationOption':
            'Select customization option',
          'customization.coverDesignComingSoon':
            'Cover Design features coming soon...',
          'customization.headersFootersComingSoon':
            'Headers & Footers features coming soon...',
          'customization.documentMetadataComingSoon':
            'Document Metadata features coming soon...',
          'customization.securitySettingsComingSoon':
            'Security & Watermarks features coming soon...',
          'customization.templateManagementComingSoon':
            'Template Management features coming soon...',
          'customization.customizationError': 'Customization error',
          'customization.pressEnterToContinue': 'Press Enter to continue...',
        };
        return translations[key] || key;
      }),
      getCurrentLocale: jest.fn().mockReturnValue('en'),
      setLocale: jest.fn(),
    };

    // Create mock container
    mockContainer = {
      resolve: jest.fn((key: string) => {
        switch (key) {
          case 'logger':
            return mockLogger;
          case 'translator':
            return mockTranslationManager;
          default:
            return {};
        }
      }),
      tryResolve: jest.fn(),
      register: jest.fn(),
      registerSingleton: jest.fn(),
      registerFactory: jest.fn(),
    } as any;

    customizationMode = new CustomizationMode(mockContainer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with container dependencies', () => {
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockContainer.resolve).toHaveBeenCalledWith('translator');
    });
  });

  describe('start method', () => {
    it('should display customization header', async () => {
      mockPrompt.mockResolvedValue({ option: 'back' });

      await customizationMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🎨 Customization Settings'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Advanced styling'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'startup.startingCustomizationMode',
      );
    });

    it('should handle cover design option', async () => {
      mockPrompt
        .mockResolvedValueOnce({ option: 'cover' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await customizationMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cover Design'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('coming soon'),
      );
    });

    it('should handle headers & footers option', async () => {
      mockPrompt
        .mockResolvedValueOnce({ option: 'headers' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await customizationMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Headers & Footers'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('coming soon'),
      );
    });

    it('should handle document metadata option', async () => {
      mockPrompt
        .mockResolvedValueOnce({ option: 'metadata' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await customizationMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Document Metadata'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('coming soon'),
      );
    });

    it('should handle security & watermarks option', async () => {
      mockPrompt
        .mockResolvedValueOnce({ option: 'security' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await customizationMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Security & Watermarks'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('coming soon'),
      );
    });

    it('should handle template management option', async () => {
      mockPrompt
        .mockResolvedValueOnce({ option: 'templates' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await customizationMode.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Template Management'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('coming soon'),
      );
    });

    it('should handle back to main menu option', async () => {
      mockPrompt.mockResolvedValueOnce({ option: 'back' });

      await customizationMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'startup.returningToMainMenuFromCustomization',
      );
    });

    it('should continue showing menu until back is selected', async () => {
      mockPrompt
        .mockResolvedValueOnce({ option: 'cover' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'themes' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await customizationMode.start();

      expect(mockPrompt).toHaveBeenCalledTimes(5); // 3 option selections + 2 pressAnyKey
      expect(mockLogger.info).toHaveBeenCalledWith(
        'startup.returningToMainMenuFromCustomization',
      );
    });

    it('should handle all menu options in correct order', async () => {
      mockPrompt.mockResolvedValue({ option: 'back' });

      await customizationMode.start();

      const selectCustomizationOptionCall = mockPrompt.mock.calls.find(
        (call) =>
          call[0].some &&
          call[0].some((q: any) => q.message === 'Select customization option'),
      );

      expect(selectCustomizationOptionCall).toBeDefined();
      type Question = { name: string; choices?: any[] };
      const choices = selectCustomizationOptionCall[0].find(
        (q: Question) => q.name === 'option',
      ).choices;

      expect(choices).toHaveLength(6);
      expect(choices[0]).toEqual(expect.objectContaining({ value: 'back' }));
      expect(choices[1]).toEqual(expect.objectContaining({ value: 'cover' }));
      expect(choices[2]).toEqual(expect.objectContaining({ value: 'headers' }));
      expect(choices[3]).toEqual(
        expect.objectContaining({ value: 'metadata' }),
      );
      expect(choices[4]).toEqual(
        expect.objectContaining({ value: 'security' }),
      );
      expect(choices[5]).toEqual(
        expect.objectContaining({ value: 'templates' }),
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors in customization mode', async () => {
      const testError = new Error('Customization error');
      mockPrompt.mockRejectedValue(testError);

      await expect(customizationMode.start()).rejects.toThrow(
        'Customization error',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'startup.customizationModeError',
        testError,
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Customization error:'),
        testError,
      );
    });

    it('should handle specific option selection errors', async () => {
      const testError = new Error('Option selection failed');
      mockPrompt
        .mockResolvedValueOnce({ option: 'cover' })
        .mockRejectedValueOnce(testError); // pressAnyKey fails

      await expect(customizationMode.start()).rejects.toThrow(
        'Option selection failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'startup.customizationModeError',
        testError,
      );
    });
  });

  describe('pressAnyKey method', () => {
    it('should prompt user to press Enter to continue', async () => {
      mockPrompt
        .mockResolvedValueOnce({ option: 'cover' })
        .mockResolvedValueOnce({ continue: '' }) // pressAnyKey
        .mockResolvedValueOnce({ option: 'back' });

      await customizationMode.start();

      type PromptQuestion = { message?: string };
      const pressAnyKeyCall = mockPrompt.mock.calls.find(
        (call) =>
          call[0].some &&
          call[0].some(
            (q: PromptQuestion) => q.message === 'Press Enter to continue...',
          ),
      );

      expect(pressAnyKeyCall).toBeDefined();
      expect(pressAnyKeyCall[0]).toEqual([
        {
          type: 'input',
          name: 'continue',
          message: 'Press Enter to continue...',
        },
      ]);
    });
  });
});
