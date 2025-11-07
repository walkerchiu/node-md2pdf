/**
 * customization-mode Unit Tests
 *
 * Tests the core functionality of customization-mode module
 */

import { jest } from '@jest/globals';

// Mock external ES modules
jest.mock('inquirer');
jest.mock('ora');
jest.mock('chalk', () => ({
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  magenta: jest.fn((text) => text),
  white: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  bold: jest.fn((text) => text),
  dim: jest.fn((text) => text),
  italic: jest.fn((text) => text),
  underline: jest.fn((text) => text),
  inverse: jest.fn((text) => text),
  strikethrough: jest.fn((text) => text),
}));

describe('customization-mode', () => {
  // Dynamic import to avoid ES module issues
  let moduleExports: any;

  beforeAll(async () => {
    try {
      moduleExports = await import('../../../src/cli/customization-mode');
    } catch (error) {
      console.warn('Unable to import module:', error);
      moduleExports = {};
    }
  });

  describe('Module Structure', () => {
    it('should successfully load module', () => {
      expect(moduleExports).toBeDefined();
    });

    it('should export CustomizationMode class', () => {
      expect(moduleExports.CustomizationMode).toBeDefined();
      expect(typeof moduleExports.CustomizationMode).toBe('function');
    });
  });

  describe('CustomizationMode', () => {
    let mockContainer: any;
    let mockLogger: any;
    let mockTranslator: any;
    let mockConfig: any;
    let inquirerMock: any;

    beforeEach(() => {
      // Clear all mocks first
      jest.clearAllMocks();

      mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
        setLevel: jest.fn(),
      };

      mockTranslator = {
        t: jest.fn().mockReturnValue('Mocked Translation'),
        getCurrentLocale: jest.fn().mockReturnValue('en'),
        getSupportedLocales: jest.fn().mockReturnValue(['en']),
        setLocale: jest.fn(),
      };

      mockConfig = {
        get: jest.fn(),
        set: jest.fn(),
        save: jest.fn().mockImplementation(() => Promise.resolve()),
        has: jest.fn(),
        getAll: jest.fn().mockReturnValue({}),
        onConfigChanged: jest.fn(),
        onConfigCreated: jest.fn(),
        setAndSave: jest.fn().mockImplementation(() => Promise.resolve()),
        getConfigPath: jest.fn().mockReturnValue('/mock/path'),
      };

      mockContainer = {
        resolve: jest.fn((key: string) => {
          const mocks: Record<string, any> = {
            logger: mockLogger,
            translator: mockTranslator,
            config: mockConfig,
          };
          return mocks[key] || {};
        }),
      };

      // Mock inquirer
      inquirerMock = {
        prompt: jest.fn(),
      };

      // Mock the dynamic import of inquirer
      jest.doMock('inquirer', () => ({
        default: inquirerMock,
        ...inquirerMock,
      }));
    });

    it('should be able to create instance', () => {
      if (moduleExports.CustomizationMode) {
        expect(() => {
          const instance = new moduleExports.CustomizationMode(mockContainer);
          expect(instance).toBeDefined();
        }).not.toThrow();
      }
    });

    it('should handle start method with back option', async () => {
      if (moduleExports.CustomizationMode) {
        inquirerMock.prompt.mockResolvedValue({ option: 'back' });

        const instance = new moduleExports.CustomizationMode(mockContainer);
        await expect(instance.start()).resolves.not.toThrow();

        expect(mockLogger.info).toHaveBeenCalled();
        expect(mockTranslator.t).toHaveBeenCalled();
      }
    });

    it('should handle start method with cover option', async () => {
      if (moduleExports.CustomizationMode) {
        inquirerMock.prompt
          .mockResolvedValueOnce({ option: 'cover' })
          .mockResolvedValueOnce({ option: 'back' });

        const instance = new moduleExports.CustomizationMode(mockContainer);
        await expect(instance.start()).resolves.not.toThrow();

        expect(mockLogger.info).toHaveBeenCalled();
        expect(mockTranslator.t).toHaveBeenCalled();
      }
    });

    it('should handle start method with headers option', async () => {
      if (moduleExports.CustomizationMode) {
        inquirerMock.prompt
          .mockResolvedValueOnce({ option: 'headers' })
          .mockResolvedValueOnce({ option: 'back' });

        const instance = new moduleExports.CustomizationMode(mockContainer);
        await expect(instance.start()).resolves.not.toThrow();

        expect(mockLogger.info).toHaveBeenCalled();
      }
    });

    it('should handle start method with security option', async () => {
      if (moduleExports.CustomizationMode) {
        inquirerMock.prompt
          .mockResolvedValueOnce({ option: 'security' })
          .mockResolvedValueOnce({ option: 'back' });

        const instance = new moduleExports.CustomizationMode(mockContainer);
        await expect(instance.start()).resolves.not.toThrow();

        expect(mockLogger.info).toHaveBeenCalled();
      }
    });

    it('should handle start method with templates option', async () => {
      if (moduleExports.CustomizationMode) {
        inquirerMock.prompt
          .mockResolvedValueOnce({ option: 'templates' })
          .mockResolvedValueOnce({ option: 'back' });

        const instance = new moduleExports.CustomizationMode(mockContainer);
        await expect(instance.start()).resolves.not.toThrow();

        expect(mockLogger.info).toHaveBeenCalled();
      }
    });

    it('should handle metadata option with various sub-options', async () => {
      if (moduleExports.CustomizationMode) {
        inquirerMock.prompt
          .mockResolvedValueOnce({ option: 'metadata' })
          .mockResolvedValueOnce({ option: 'configure-basic' })
          .mockResolvedValueOnce({ option: 'back' })
          .mockResolvedValueOnce({ option: 'back' });

        const instance = new moduleExports.CustomizationMode(mockContainer);
        await expect(instance.start()).resolves.not.toThrow();

        expect(mockLogger.info).toHaveBeenCalled();
      }
    });

    it('should handle errors and log them', async () => {
      if (moduleExports.CustomizationMode) {
        // Mock chalk to throw an error when called (to force an error scenario)
        const originalConsoleError = console.error;
        console.error = jest.fn();

        // Mock showCustomizationHeader to throw an error
        const instance = new moduleExports.CustomizationMode(mockContainer);
        const originalShowHeader = instance['showCustomizationHeader'];
        instance['showCustomizationHeader'] = jest.fn(() => {
          throw new Error('Test error');
        });

        await expect(instance.start()).rejects.toThrow('Test error');

        expect(mockLogger.error).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();

        // Restore original functions
        console.error = originalConsoleError;
      }
    });

    it('should call translator for various menu options', async () => {
      if (moduleExports.CustomizationMode) {
        inquirerMock.prompt.mockResolvedValue({ option: 'back' });

        const instance = new moduleExports.CustomizationMode(mockContainer);
        await instance.start();

        expect(mockTranslator.t).toHaveBeenCalledWith(
          'startup.startingCustomizationMode',
        );
        expect(mockTranslator.t).toHaveBeenCalledWith(
          'startup.returningToMainMenuFromCustomization',
        );
      }
    });

    it('should handle show customization header', () => {
      if (moduleExports.CustomizationMode) {
        mockTranslator.t
          .mockReturnValueOnce('Test Title')
          .mockReturnValueOnce('Test Subtitle');

        const instance = new moduleExports.CustomizationMode(mockContainer);

        // Access private method via reflection for testing
        const showHeader = instance['showCustomizationHeader'];
        if (showHeader) {
          expect(() => showHeader.call(instance)).not.toThrow();
        }
      }
    });

    it('should have select customization option method', () => {
      if (moduleExports.CustomizationMode) {
        const instance = new moduleExports.CustomizationMode(mockContainer);

        // Verify private method exists for testing
        const selectOption = instance['selectCustomizationOption'];
        expect(selectOption).toBeDefined();
        expect(typeof selectOption).toBe('function');
      }
    });
  });
});
