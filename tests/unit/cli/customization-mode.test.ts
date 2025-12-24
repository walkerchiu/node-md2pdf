/**
 * customization-mode Unit Tests
 *
 * Tests the core functionality of customization-mode module
 */

import { jest } from '@jest/globals';
import { CustomizationMode } from '../../../src/cli/customization-mode';
import { DEFAULT_HEADERS_FOOTERS_CONFIG } from '../../../src/core/headers-footers';

// Test constants following DRY principle
const TEST_CONSTANTS = {
  METADATA: {
    TITLE: 'Test Title',
    AUTHOR: 'Test Author',
    SUBJECT: 'Test Subject',
    KEYWORDS: 'test, keywords',
    ORGANIZATION: 'Test Org',
    COPYRIGHT: '© 2024',
    LANGUAGE: 'en',
  },
  TEMPLATE: {
    ID: 'test-template',
    NAME: 'Test Template',
    DESCRIPTION: 'Test Description',
    TYPE: 'custom',
  },
  OPTIONS: {
    BACK: 'back',
    CONTINUE: 'continue',
    PREVIEW: 'preview',
    COVER: 'cover',
    PASSWORD: 'password',
    WATERMARKS: 'watermarks',
    METADATA: 'metadata',
    TEMPLATES: 'templates',
    HEADERS: 'headers',
  },
} as const;

// Test data builders following builder pattern
const createMockMetadata = (overrides = {}) => ({
  title: TEST_CONSTANTS.METADATA.TITLE,
  author: TEST_CONSTANTS.METADATA.AUTHOR,
  subject: '',
  keywords: '',
  organization: '',
  copyright: '',
  language: TEST_CONSTANTS.METADATA.LANGUAGE,
  ...overrides,
});

const createMockTemplate = (overrides = {}) => ({
  id: TEST_CONSTANTS.TEMPLATE.ID,
  name: TEST_CONSTANTS.TEMPLATE.NAME,
  description: TEST_CONSTANTS.TEMPLATE.DESCRIPTION,
  type: TEST_CONSTANTS.TEMPLATE.TYPE,
  config: {
    pdf: {
      format: 'A4',
      orientation: 'portrait',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
    },
    headerFooter: {
      header: { enabled: true },
      footer: { enabled: false },
    },
    styles: {
      fonts: { body: 'Arial' },
      codeBlock: { theme: 'default' },
    },
    features: { toc: true, pageNumbers: true },
  },
  ...overrides,
});

// Mock external ES modules
jest.mock('inquirer');
jest.mock('ora');
jest.mock('chalk', () => {
  // Create chainable mock function for chalk (defined inline to avoid hoisting issues)
  const createChainableMock = () => {
    const mockFn: any = jest.fn((text: string) => text);
    mockFn.bold = jest.fn((text: string) => text);
    mockFn.dim = jest.fn((text: string) => text);
    mockFn.italic = jest.fn((text: string) => text);
    mockFn.underline = jest.fn((text: string) => text);
    return mockFn;
  };

  return {
    green: createChainableMock(),
    red: createChainableMock(),
    yellow: createChainableMock(),
    blue: createChainableMock(),
    cyan: createChainableMock(),
    magenta: createChainableMock(),
    white: createChainableMock(),
    gray: createChainableMock(),
    bold: jest.fn((text: string) => text),
    dim: jest.fn((text: string) => text),
    italic: jest.fn((text: string) => text),
    underline: jest.fn((text: string) => text),
    inverse: jest.fn((text: string) => text),
    strikethrough: jest.fn((text: string) => text),
  };
});

describe('customization-mode', () => {
  let mockContainer: any;
  let mockLogger: any;
  let mockTranslator: any;
  let mockConfig: any;
  let inquirerMock: any;
  let instance: CustomizationMode;

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
      t: jest.fn((key: string) => key) as any,
      getCurrentLocale: jest.fn().mockReturnValue('en'),
      getSupportedLocales: jest.fn().mockReturnValue(['en', 'zh-TW']),
      setLocale: jest.fn(),
    };

    mockConfig = {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
      save: jest.fn(() => Promise.resolve()) as any,
      has: jest.fn().mockReturnValue(false),
      getAll: jest.fn().mockReturnValue({}),
      onConfigChanged: jest.fn(),
      onConfigCreated: jest.fn(),
      setAndSave: jest.fn(() => Promise.resolve()) as any,
      getConfigPath: jest.fn().mockReturnValue('/mock/path'),
      getConfig: jest.fn().mockReturnValue({
        headersFooters: DEFAULT_HEADERS_FOOTERS_CONFIG,
      }),
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
    const inquirer = require('inquirer');
    inquirer.default = inquirerMock;
    Object.assign(inquirer, inquirerMock);

    // Spy on console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'clear').mockImplementation(() => {});

    instance = new CustomizationMode(mockContainer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Module Structure', () => {
    it('should successfully create instance', () => {
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(CustomizationMode);
    });

    it('should resolve all required services from container', () => {
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockContainer.resolve).toHaveBeenCalledWith('translator');
      expect(mockContainer.resolve).toHaveBeenCalledWith('config');
    });
  });

  describe('start', () => {
    it('should start and exit with back option', async () => {
      inquirerMock.prompt.mockResolvedValue({ option: 'back' });

      await instance.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'startup.startingCustomizationMode',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'startup.returningToMainMenuFromCustomization',
      );
    });

    it('should handle cover design option', async () => {
      inquirerMock.prompt
        .mockResolvedValueOnce({ option: 'cover' })
        .mockResolvedValueOnce({ key: 'continue' })
        .mockResolvedValueOnce({ option: 'back' });

      await instance.start();

      expect(mockTranslator.t).toHaveBeenCalledWith(
        'customization.coverDesignComingSoon',
      );
    });

    it('should handle headers option entry', async () => {
      inquirerMock.prompt
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.HEADERS })
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK })
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK });

      await instance.start();

      // Verify headers option was accessed
      expect(mockTranslator.t).toHaveBeenCalled();
    });

    it('should handle headers option and preview settings', async () => {
      inquirerMock.prompt
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.HEADERS })
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.PREVIEW })
        .mockResolvedValueOnce({ key: TEST_CONSTANTS.OPTIONS.CONTINUE })
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK })
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK });

      await instance.start();

      expect(console.log).toHaveBeenCalled();
    });

    // Note: Complex interactive header/footer configuration tests are covered by integration tests
    // These unit tests focus on basic flow and service interactions

    it('should handle metadata option', async () => {
      inquirerMock.prompt
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.METADATA })
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK }) // selectMetadataOption returns back
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK });

      await instance.start();

      expect(mockTranslator.t).toHaveBeenCalled();
    });

    it('should handle password protection option', async () => {
      inquirerMock.prompt
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.PASSWORD })
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK })
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK });

      await instance.start();

      expect(mockTranslator.t).toHaveBeenCalledWith(
        'cli.customizationMenu.passwordProtection',
      );
    });

    it('should handle watermarks option', async () => {
      inquirerMock.prompt
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.WATERMARKS })
        .mockResolvedValueOnce({ key: TEST_CONSTANTS.OPTIONS.CONTINUE }) // pressAnyKey
        .mockResolvedValueOnce({ option: TEST_CONSTANTS.OPTIONS.BACK });

      await instance.start();

      expect(mockTranslator.t).toHaveBeenCalledWith(
        'cli.customizationMenu.watermarks',
      );
    });

    it('should handle templates option', async () => {
      inquirerMock.prompt
        .mockResolvedValueOnce({ option: 'templates' })
        .mockResolvedValueOnce({ option: 'back' })
        .mockResolvedValueOnce({ option: 'back' });

      await instance.start();

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      inquirerMock.prompt.mockRejectedValue(error);

      await expect(instance.start()).rejects.toThrow('Test error');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('showCustomizationHeader', () => {
    it('should display customization header', () => {
      mockTranslator.t
        .mockReturnValueOnce('Customization Menu')
        .mockReturnValueOnce('Configure your PDF settings');

      (instance as any).showCustomizationHeader();

      expect(console.log).toHaveBeenCalled();
      expect(mockTranslator.t).toHaveBeenCalledWith(
        'cli.customizationMenu.title',
      );
      expect(mockTranslator.t).toHaveBeenCalledWith(
        'cli.customizationMenu.subtitle',
      );
    });
  });

  describe('selectCustomizationOption', () => {
    it('should prompt for customization option', async () => {
      inquirerMock.prompt.mockResolvedValue({ option: 'cover' });

      const result = await (instance as any).selectCustomizationOption();

      expect(result).toBe('cover');
      expect(inquirerMock.prompt).toHaveBeenCalled();
    });
  });

  describe('coverDesign', () => {
    it('should show coming soon message', async () => {
      inquirerMock.prompt.mockResolvedValue({ key: 'continue' });

      await (instance as any).coverDesign();

      expect(mockTranslator.t).toHaveBeenCalledWith(
        'customization.coverDesignComingSoon',
      );
    });
  });

  describe('documentMetadata', () => {
    it('should handle metadata configuration', async () => {
      // Mock metadata service
      mockContainer.resolve = jest.fn((key: string) => {
        const mocks: Record<string, any> = {
          logger: mockLogger,
          translator: mockTranslator,
          config: mockConfig,
          metadataService: {
            getUserMetadata: jest.fn().mockReturnValue({}),
          },
        };
        return mocks[key] || {};
      });

      inquirerMock.prompt.mockResolvedValueOnce({ action: 'back' });

      await (instance as any).documentMetadata();

      expect(mockTranslator.t).toHaveBeenCalled();
    });
  });

  describe('pressAnyKey', () => {
    it('should prompt user to press any key', async () => {
      inquirerMock.prompt.mockResolvedValue({ key: 'continue' });

      await (instance as any).pressAnyKey();

      expect(inquirerMock.prompt).toHaveBeenCalled();
    });
  });
});
