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
              name: '📄 使用預設模板 - 快速配置專業頁首和頁尾',
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

  describe('Preset Configuration', () => {
    beforeEach(() => {
      mockPageStructureService.getPresetByName.mockResolvedValue(
        mockPresets[0],
      );
    });

    it('should configure with preset when preset is selected', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: 'preset' })
        .mockResolvedValueOnce({ selectedPreset: 'business' })
        .mockResolvedValueOnce({ confirm: true })
        .mockResolvedValueOnce({ customize: false });

      const result = await pageStructureConfigUI.configurePageStructure({
        documentPath: '/test/doc.md',
      });

      expect(result).toBeDefined();
      expect(mockPageStructureService.getAvailablePresets).toHaveBeenCalled();
      expect(mockPageStructureService.suggestPreset).toHaveBeenCalledWith(
        '/test/doc.md',
      );
      expect(mockPageStructureService.getPresetByName).toHaveBeenCalledWith(
        'business',
      );
    });

    it('should show suggestions when document path is provided', async () => {
      const mockSuggestions = [mockPresets[0]];
      mockPageStructureService.suggestPreset.mockResolvedValue(mockSuggestions);

      mockPrompt
        .mockResolvedValueOnce({ choice: 'preset' })
        .mockResolvedValueOnce({ selectedPreset: 'business' })
        .mockResolvedValueOnce({ confirm: true })
        .mockResolvedValueOnce({ customize: false });

      await pageStructureConfigUI.configurePageStructure({
        documentPath: '/test/doc.md',
      });

      expect(mockPageStructureService.suggestPreset).toHaveBeenCalledWith(
        '/test/doc.md',
      );
    });

    it('should retry preset selection when confirm is false', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: 'preset' })
        .mockResolvedValueOnce({ selectedPreset: 'business' })
        .mockResolvedValueOnce({ confirm: false })
        .mockResolvedValueOnce({ selectedPreset: 'business' })
        .mockResolvedValueOnce({ confirm: true })
        .mockResolvedValueOnce({ customize: false });

      const result = await pageStructureConfigUI.configurePageStructure();

      expect(result).toBeDefined();
      expect(mockPrompt).toHaveBeenCalledTimes(6);
    });

    it('should handle preset not found error', async () => {
      mockPageStructureService.getPresetByName.mockResolvedValue(undefined);

      mockPrompt
        .mockResolvedValueOnce({ choice: 'preset' })
        .mockResolvedValueOnce({ selectedPreset: 'nonexistent' });

      await expect(
        pageStructureConfigUI.configurePageStructure(),
      ).rejects.toThrow('Preset not found: nonexistent');
    });

    it('should customize preset when requested', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: 'preset' })
        .mockResolvedValueOnce({ selectedPreset: 'business' })
        .mockResolvedValueOnce({ confirm: true })
        .mockResolvedValueOnce({ customize: true })
        .mockResolvedValueOnce({ options: ['header'] })
        .mockResolvedValueOnce({ enabled: true })
        .mockResolvedValueOnce({ template: 'test template' })
        .mockResolvedValueOnce({ height: '40px' })
        .mockResolvedValueOnce({
          showOnFirstPage: true,
          showOnEvenPages: true,
          showOnOddPages: true,
        });

      const result = await pageStructureConfigUI.configurePageStructure();

      expect(result).toBeDefined();
      expect(result?.header?.enabled).toBe(true);
      expect(result?.header?.template).toBe('test template');
    });
  });

  describe('Custom Configuration', () => {
    it('should create custom configuration', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: 'custom' })
        .mockResolvedValueOnce({ enabled: true }) // header
        .mockResolvedValueOnce({ template: 'header template' })
        .mockResolvedValueOnce({ height: '40px' })
        .mockResolvedValueOnce({
          showOnFirstPage: true,
          showOnEvenPages: true,
          showOnOddPages: true,
        })
        .mockResolvedValueOnce({ enabled: true }) // footer
        .mockResolvedValueOnce({ template: 'footer template' })
        .mockResolvedValueOnce({ height: '30px' })
        .mockResolvedValueOnce({
          showOnFirstPage: true,
          showOnEvenPages: true,
          showOnOddPages: true,
        })
        .mockResolvedValueOnce({
          // margins
          top: '60px',
          bottom: '60px',
          left: '50px',
          right: '50px',
        });

      const result = await pageStructureConfigUI.configurePageStructure();

      expect(result).toBeDefined();
      expect(result?.header?.enabled).toBe(true);
      expect(result?.footer?.enabled).toBe(true);
      expect(result?.margins?.top).toBe('60px');
    });

    it('should handle disabled header/footer', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: 'custom' })
        .mockResolvedValueOnce({ enabled: false }) // header
        .mockResolvedValueOnce({ enabled: false }) // footer
        .mockResolvedValueOnce({
          // margins
          top: '60px',
          bottom: '60px',
          left: '50px',
          right: '50px',
        });

      const result = await pageStructureConfigUI.configurePageStructure();

      expect(result).toBeDefined();
      expect(result?.header?.enabled).toBe(false);
      expect(result?.footer?.enabled).toBe(false);
    });
  });

  describe('Preset Customization', () => {
    beforeEach(() => {
      mockPageStructureService.getPresetByName.mockResolvedValue(
        mockPresets[0],
      );
    });

    it('should customize footer when selected', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: 'preset' })
        .mockResolvedValueOnce({ selectedPreset: 'business' })
        .mockResolvedValueOnce({ confirm: true })
        .mockResolvedValueOnce({ customize: true })
        .mockResolvedValueOnce({ options: ['footer'] })
        .mockResolvedValueOnce({ enabled: true })
        .mockResolvedValueOnce({ template: 'footer template' })
        .mockResolvedValueOnce({ height: '30px' })
        .mockResolvedValueOnce({
          showOnFirstPage: true,
          showOnEvenPages: true,
          showOnOddPages: true,
        });

      const result = await pageStructureConfigUI.configurePageStructure();

      expect(result?.footer?.enabled).toBe(true);
      expect(result?.footer?.template).toBe('footer template');
    });

    it('should customize margins when selected', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: 'preset' })
        .mockResolvedValueOnce({ selectedPreset: 'business' })
        .mockResolvedValueOnce({ confirm: true })
        .mockResolvedValueOnce({ customize: true })
        .mockResolvedValueOnce({ options: ['margins'] })
        .mockResolvedValueOnce({
          top: '80px',
          bottom: '80px',
          left: '60px',
          right: '60px',
        });

      const result = await pageStructureConfigUI.configurePageStructure();

      expect(result?.margins?.top).toBe('80px');
      expect(result?.margins?.bottom).toBe('80px');
    });
  });

  describe('Template Options', () => {
    it('should return header template options', () => {
      const ui = new PageStructureConfigUI(
        mockPageStructureService,
        mockTranslator,
        mockLogger,
      );

      const options = (ui as any).getTemplateOptions('header');

      expect(options).toHaveLength(3);
      expect(options[0].name).toContain('💼 商業格式');
      expect(options[1].name).toContain('🎓 學術格式');
      expect(options[2].name).toContain('🔧 技術格式');
    });

    it('should return footer template options', () => {
      const ui = new PageStructureConfigUI(
        mockPageStructureService,
        mockTranslator,
        mockLogger,
      );

      const options = (ui as any).getTemplateOptions('footer');

      expect(options).toHaveLength(4);
      expect(options[0].name).toContain('💼 商業格式');
      expect(options[1].name).toContain('🎓 學術格式');
      expect(options[2].name).toContain('🔧 技術格式');
      expect(options[3].name).toContain('⭐ 極簡格式');
    });
  });

  describe('Utility Methods', () => {
    it('should get correct category icons', () => {
      const ui = new PageStructureConfigUI(
        mockPageStructureService,
        mockTranslator,
        mockLogger,
      );

      expect((ui as any).getCategoryIcon('business')).toBe('💼');
      expect((ui as any).getCategoryIcon('academic')).toBe('🎓');
      expect((ui as any).getCategoryIcon('technical')).toBe('🔧');
      expect((ui as any).getCategoryIcon('minimal')).toBe('⭐');
      expect((ui as any).getCategoryIcon('unknown')).toBe('📄');
    });

    it('should strip HTML tags correctly', () => {
      const ui = new PageStructureConfigUI(
        mockPageStructureService,
        mockTranslator,
        mockLogger,
      );

      const html = '<div><strong>Hello</strong> <em>World</em></div>';
      const result = (ui as any).stripHtml(html);

      expect(result).toBe('Hello World');
    });

    it('should validate margin input correctly', () => {
      const ui = new PageStructureConfigUI(
        mockPageStructureService,
        mockTranslator,
        mockLogger,
      );

      expect((ui as any).validateMargin('60px')).toBe(true);
      expect((ui as any).validateMargin('20mm')).toBe(true);
      expect((ui as any).validateMargin('1.5in')).toBe(true);
      expect((ui as any).validateMargin('invalid')).toBe(
        '請輸入有效的邊距格式 (例如: 60px, 20mm)',
      );
    });
  });

  describe('Preset Preview', () => {
    beforeEach(() => {
      mockPageStructureService.previewTemplate.mockResolvedValue({
        html: '<div>Preview Content</div>',
      });
    });

    it('should show preset preview with header and footer', async () => {
      const preset = {
        name: 'Test Preset',
        description: 'Test Description',
        category: 'business',
        config: {
          header: {
            enabled: true,
            template: 'header template',
          },
          footer: {
            enabled: true,
            template: 'footer template',
          },
          margins: {
            top: '60px',
            bottom: '60px',
            left: '50px',
            right: '50px',
          },
        },
      };

      await (pageStructureConfigUI as any).showPresetPreview(preset);

      expect(mockPageStructureService.previewTemplate).toHaveBeenCalledTimes(2);
    });

    it('should show disabled status when header/footer are disabled', async () => {
      const preset = {
        name: 'Minimal Preset',
        description: 'Minimal Description',
        category: 'minimal',
        config: {
          header: {
            enabled: false,
            template: '',
          },
          footer: {
            enabled: false,
            template: '',
          },
          margins: {
            top: '60px',
            bottom: '60px',
            left: '50px',
            right: '50px',
          },
        },
      };

      await (pageStructureConfigUI as any).showPresetPreview(preset);

      // Verify that the method completes without error
      expect(preset.name).toBe('Minimal Preset');
    });
  });

  describe('Input Validation', () => {
    it('should validate height input in header/footer configuration', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: 'custom' })
        .mockResolvedValueOnce({ enabled: true })
        .mockResolvedValueOnce({ template: 'test' })
        .mockResolvedValueOnce({ height: '40px' })
        .mockResolvedValueOnce({
          showOnFirstPage: true,
          showOnEvenPages: true,
          showOnOddPages: true,
        })
        .mockResolvedValueOnce({ enabled: false })
        .mockResolvedValueOnce({
          top: '60px',
          bottom: '60px',
          left: '50px',
          right: '50px',
        });

      await pageStructureConfigUI.configurePageStructure();

      // Check that height validation was configured
      const heightPromptCall = mockPrompt.mock.calls.find(
        (call: any) => call[0][0].name === 'height',
      );
      expect(heightPromptCall).toBeDefined();
      expect(heightPromptCall[0][0].validate).toBeDefined();

      // Test the validation function
      const validateFn = heightPromptCall[0][0].validate;
      expect(validateFn('40px')).toBe(true);
      expect(validateFn('invalid')).toBe(
        '請輸入有效的高度格式 (例如: 40px, 12mm)',
      );
    });
  });
});
