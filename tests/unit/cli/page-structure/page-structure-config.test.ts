/**
 * Page Structure Config UI Test Suite
 * Tests CLI interface for page structure configuration
 */

import { PageStructureConfigUI } from '../../../../src/cli/page-structure/page-structure-config';
import type { IPageStructureService } from '../../../../src/application/services/page-structure.service';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { PageStructurePreset } from '../../../../src/core/page-structure/types';

// Mock inquirer
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: jest.fn(),
  },
}));

// Mock console.log to prevent output during tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('PageStructureConfigUI', () => {
  let pageStructureConfigUI: PageStructureConfigUI;
  let mockPageStructureService: jest.Mocked<IPageStructureService>;
  let mockTranslator: jest.Mocked<ITranslationManager>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockPrompt: jest.MockedFunction<any>;

  const mockPresets: PageStructurePreset[] = [
    {
      name: 'business',
      description: 'Business preset',
      category: 'business',
      config: {
        header: {
          enabled: true,
          template: 'Business Header',
        },
        footer: {
          enabled: true,
          template: 'Business Footer',
        },
        margins: {
          top: '1in',
          bottom: '1in',
          left: '1in',
          right: '1in',
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    const inquirer = require('inquirer');
    mockPrompt = inquirer.default.prompt;

    // Set default mock behavior
    mockPrompt.mockResolvedValue({ choice: 'skip' });

    mockPageStructureService = {
      generatePageStructure: jest.fn(),
      generateHeader: jest.fn(),
      generateFooter: jest.fn(),
      getAvailablePresets: jest.fn().mockResolvedValue(mockPresets),
      getPresetByName: jest.fn(),
      suggestPreset: jest.fn().mockResolvedValue([]),
      validateConfiguration: jest.fn(),
      previewTemplate: jest
        .fn()
        .mockResolvedValue({ html: '<div>Preview</div>' }),
    } as any;

    mockTranslator = {
      t: jest.fn((key: string) => key),
      getCurrentLanguage: jest.fn(),
      getSupportedLanguages: jest.fn(),
      setLanguage: jest.fn(),
      addTranslations: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    pageStructureConfigUI = new PageStructureConfigUI(
      mockPageStructureService,
      mockTranslator,
      mockLogger,
    );
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe('Constructor', () => {
    it('should create instance with required dependencies', () => {
      expect(pageStructureConfigUI).toBeDefined();
      expect(pageStructureConfigUI).toBeInstanceOf(PageStructureConfigUI);
    });
  });

  describe('configurePageStructure', () => {
    it('should return null when skip is selected', async () => {
      mockPrompt.mockResolvedValue({ choice: 'skip' });

      const result = await pageStructureConfigUI.configurePageStructure();

      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting page structure configuration',
      );
    });

    it('should return null for unknown choice', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: 'unknown' });

      const result = await pageStructureConfigUI.configurePageStructure();

      expect(result).toBeNull();
    });

    it('should handle errors and log them', async () => {
      const testError = new Error('Configuration failed');
      mockPrompt.mockRejectedValueOnce(testError);

      await expect(
        pageStructureConfigUI.configurePageStructure(),
      ).rejects.toThrow(testError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Page structure configuration failed',
        testError,
      );
    });

    it('should log initialization', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: 'skip' });

      await pageStructureConfigUI.configurePageStructure();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting page structure configuration',
      );
    });

    it('should handle custom configuration choice', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: 'custom' });

      const result = await pageStructureConfigUI.configurePageStructure();

      // Custom configuration returns a valid configuration object
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('header');
      expect(result).toHaveProperty('footer');
    });
  });

  describe('Service Integration', () => {
    it('should call translation service for menu title', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: 'skip' });

      await pageStructureConfigUI.configurePageStructure();

      expect(mockTranslator.t).toHaveBeenCalledWith('pageStructure.menu.title');
    });

    it('should validate configuration options interface', () => {
      const options = {
        documentPath: '/test/path',
        preset: 'business',
        customConfig: true,
      };

      // Should not throw when passing options
      expect(() => {
        pageStructureConfigUI.configurePageStructure(options);
      }).not.toThrow();
    });
  });

  describe('Menu Display Validation', () => {
    it('should show main menu with correct structure', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: 'skip' });

      await pageStructureConfigUI.configurePageStructure();

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'choice',
          message: 'pageStructure.menu.title',
          choices: [
            {
              name: '📄 使用預設模板 - 快速配置專業頁首頁尾',
              value: 'preset',
            },
            {
              name: '🎨 自定義配置 - 完全客製化頁面結構',
              value: 'custom',
            },
            {
              name: '⏭️  跳過 - 使用預設頁面設定',
              value: 'skip',
            },
          ],
          default: 'preset',
        },
      ]);
    });
  });
});
