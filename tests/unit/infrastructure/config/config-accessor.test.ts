/**
 * ConfigAccessor Test Suite
 * Tests strongly-typed configuration accessor functionality
 */

import { ConfigAccessor } from '../../../../src/infrastructure/config/config-accessor';
import type {
  IConfigManager,
  PDFMarginConfig,
  CSSTemplateConfig,
} from '../../../../src/infrastructure/config/types';
import {
  CONFIG_KEYS,
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
  defaultConfig,
} from '../../../../src/infrastructure/config/defaults';

describe('ConfigAccessor', () => {
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let configAccessor: ConfigAccessor;

  beforeEach(() => {
    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      save: jest.fn(),
      onConfigCreated: jest.fn(),
      onConfigChanged: jest.fn(),
      setAndSave: jest.fn(),
      getConfigPath: jest.fn(),
      getConfig: jest.fn(() => ({ ...defaultConfig })),
      updateConfig: jest.fn(),
    };

    configAccessor = new ConfigAccessor(mockConfigManager);
  });

  describe('getPDFMargin', () => {
    it('should return normal margins by default', () => {
      const expectedMargins = DEFAULT_MARGINS.NORMAL;
      mockConfigManager.get
        .mockReturnValueOnce(expectedMargins.top)
        .mockReturnValueOnce(expectedMargins.right)
        .mockReturnValueOnce(expectedMargins.bottom)
        .mockReturnValueOnce(expectedMargins.left);

      const result = configAccessor.getPDFMargin();

      expect(result).toEqual(expectedMargins);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.TOP,
        expectedMargins.top,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.RIGHT,
        expectedMargins.right,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.BOTTOM,
        expectedMargins.bottom,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.LEFT,
        expectedMargins.left,
      );
    });

    it('should return header/footer margins when includeHeaderFooter is true', () => {
      const expectedMargins = DEFAULT_MARGINS.WITH_HEADER_FOOTER;
      mockConfigManager.get
        .mockReturnValueOnce(expectedMargins.top)
        .mockReturnValueOnce(expectedMargins.right)
        .mockReturnValueOnce(expectedMargins.bottom)
        .mockReturnValueOnce(expectedMargins.left);

      const result = configAccessor.getPDFMargin(true);

      expect(result).toEqual(expectedMargins);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.TOP,
        expectedMargins.top,
      );
    });

    it('should return custom margins from config manager', () => {
      const customMargins = {
        top: '2in',
        right: '1.5in',
        bottom: '2in',
        left: '1.5in',
      };

      mockConfigManager.get
        .mockReturnValueOnce(customMargins.top)
        .mockReturnValueOnce(customMargins.right)
        .mockReturnValueOnce(customMargins.bottom)
        .mockReturnValueOnce(customMargins.left);

      const result = configAccessor.getPDFMargin();

      expect(result).toEqual(customMargins);
    });
  });

  describe('getPDFEngineConfig', () => {
    it('should return complete PDF engine configuration', () => {
      const expectedConfig = {
        format: 'A4' as const,
        orientation: 'portrait' as const,
        margin: DEFAULT_MARGINS.NORMAL,
        displayHeaderFooter: false,
        printBackground: true,
        useEnhancedEngine: true,
      };

      mockConfigManager.get
        .mockReturnValueOnce(expectedConfig.format)
        .mockReturnValueOnce(expectedConfig.orientation)
        // Mock for getPDFMargin calls
        .mockReturnValueOnce(expectedConfig.margin.top)
        .mockReturnValueOnce(expectedConfig.margin.right)
        .mockReturnValueOnce(expectedConfig.margin.bottom)
        .mockReturnValueOnce(expectedConfig.margin.left)
        .mockReturnValueOnce(expectedConfig.displayHeaderFooter)
        .mockReturnValueOnce(expectedConfig.printBackground)
        .mockReturnValueOnce(expectedConfig.useEnhancedEngine);

      const result = configAccessor.getPDFEngineConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.FORMAT,
        'A4',
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ORIENTATION,
        'portrait',
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.DISPLAY_HEADER_FOOTER,
        false,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.PRINT_BACKGROUND,
        true,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.USE_ENHANCED_ENGINE,
        true,
      );
    });

    it('should handle custom PDF engine configuration', () => {
      const customConfig = {
        format: 'Letter' as const,
        orientation: 'landscape' as const,
        margin: { top: '2in', right: '2in', bottom: '2in', left: '2in' },
        displayHeaderFooter: true,
        printBackground: false,
        useEnhancedEngine: false,
      };

      mockConfigManager.get
        .mockReturnValueOnce(customConfig.format)
        .mockReturnValueOnce(customConfig.orientation)
        .mockReturnValueOnce(customConfig.margin.top)
        .mockReturnValueOnce(customConfig.margin.right)
        .mockReturnValueOnce(customConfig.margin.bottom)
        .mockReturnValueOnce(customConfig.margin.left)
        .mockReturnValueOnce(customConfig.displayHeaderFooter)
        .mockReturnValueOnce(customConfig.printBackground)
        .mockReturnValueOnce(customConfig.useEnhancedEngine);

      const result = configAccessor.getPDFEngineConfig();

      expect(result).toEqual(customConfig);
    });
  });

  describe('getCSSTemplateConfig', () => {
    it('should return default CSS template configuration', () => {
      const expectedConfig = {
        fontFamily: DEFAULT_CSS_TEMPLATE.FONT_FAMILY,
        fontSize: DEFAULT_CSS_TEMPLATE.FONT_SIZE,
        lineHeight: DEFAULT_CSS_TEMPLATE.LINE_HEIGHT,
        maxWidth: DEFAULT_CSS_TEMPLATE.MAX_WIDTH,
        margin: DEFAULT_CSS_TEMPLATE.MARGIN,
        padding: DEFAULT_CSS_TEMPLATE.PADDING,
      };

      mockConfigManager.get
        .mockReturnValueOnce(expectedConfig.fontFamily)
        .mockReturnValueOnce(expectedConfig.fontSize)
        .mockReturnValueOnce(expectedConfig.lineHeight)
        .mockReturnValueOnce(expectedConfig.maxWidth)
        .mockReturnValueOnce(expectedConfig.margin)
        .mockReturnValueOnce(expectedConfig.padding);

      const result = configAccessor.getCSSTemplateConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.FONT_FAMILY,
        DEFAULT_CSS_TEMPLATE.FONT_FAMILY,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.FONT_SIZE,
        DEFAULT_CSS_TEMPLATE.FONT_SIZE,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.LINE_HEIGHT,
        DEFAULT_CSS_TEMPLATE.LINE_HEIGHT,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.MAX_WIDTH,
        DEFAULT_CSS_TEMPLATE.MAX_WIDTH,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.MARGIN,
        DEFAULT_CSS_TEMPLATE.MARGIN,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.PADDING,
        DEFAULT_CSS_TEMPLATE.PADDING,
      );
    });

    it('should return custom CSS template configuration', () => {
      const customConfig = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineHeight: 1.4,
        maxWidth: '1000px',
        margin: '0',
        padding: '1rem',
      };

      mockConfigManager.get
        .mockReturnValueOnce(customConfig.fontFamily)
        .mockReturnValueOnce(customConfig.fontSize)
        .mockReturnValueOnce(customConfig.lineHeight)
        .mockReturnValueOnce(customConfig.maxWidth)
        .mockReturnValueOnce(customConfig.margin)
        .mockReturnValueOnce(customConfig.padding);

      const result = configAccessor.getCSSTemplateConfig();

      expect(result).toEqual(customConfig);
    });
  });

  describe('getTOCConfig', () => {
    it('should return default TOC configuration', () => {
      const expectedConfig = {
        enabled: true,
        depth: 3,
        title: {
          en: 'Table of Contents',
          'zh-tw': '目錄',
        },
      };

      mockConfigManager.get
        .mockReturnValueOnce(expectedConfig.enabled)
        .mockReturnValueOnce(expectedConfig.depth)
        .mockReturnValueOnce(expectedConfig.title);

      const result = configAccessor.getTOCConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TOC.ENABLED,
        true,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TOC.DEPTH,
        3,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.TOC.TITLE,
        {
          en: 'Table of Contents',
          'zh-tw': '目錄',
        },
      );
    });

    it('should return custom TOC configuration', () => {
      const customConfig = {
        enabled: false,
        depth: 5,
        title: {
          en: 'Contents',
          'zh-tw': '內容',
        },
      };

      mockConfigManager.get
        .mockReturnValueOnce(customConfig.enabled)
        .mockReturnValueOnce(customConfig.depth)
        .mockReturnValueOnce(customConfig.title);

      const result = configAccessor.getTOCConfig();

      expect(result).toEqual(customConfig);
    });
  });

  describe('getEngineHealthCheckConfig', () => {
    it('should return default engine health check configuration', () => {
      const expectedConfig = {
        interval: 30000,
        enabled: true,
      };

      mockConfigManager.get
        .mockReturnValueOnce(expectedConfig.interval)
        .mockReturnValueOnce(expectedConfig.enabled);

      const result = configAccessor.getEngineHealthCheckConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ENGINES.HEALTH_CHECK.INTERVAL,
        30000,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ENGINES.HEALTH_CHECK.ENABLED,
        true,
      );
    });
  });

  describe('getResourceLimitsConfig', () => {
    it('should return default resource limits configuration', () => {
      const expectedConfig = {
        maxConcurrentTasks: 3,
        taskTimeout: 120000,
        memoryLimit: '2GB',
      };

      mockConfigManager.get
        .mockReturnValueOnce(expectedConfig.maxConcurrentTasks)
        .mockReturnValueOnce(expectedConfig.taskTimeout)
        .mockReturnValueOnce(expectedConfig.memoryLimit);

      const result = configAccessor.getResourceLimitsConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.MAX_CONCURRENT_TASKS,
        3,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.TASK_TIMEOUT,
        120000,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.MEMORY_LIMIT,
        '2GB',
      );
    });
  });

  describe('getEngineConfig', () => {
    it('should return complete engine configuration', () => {
      const expectedConfig = {
        primary: 'puppeteer',
        fallback: [],
        strategy: 'primary-first',
        healthCheck: {
          interval: 30000,
          enabled: true,
        },
        resourceLimits: {
          maxConcurrentTasks: 3,
          taskTimeout: 120000,
          memoryLimit: '2GB',
        },
      };

      // Mock for main engine config
      mockConfigManager.get
        .mockReturnValueOnce(expectedConfig.primary)
        .mockReturnValueOnce(expectedConfig.fallback)
        .mockReturnValueOnce(expectedConfig.strategy)
        // Mock for health check config
        .mockReturnValueOnce(expectedConfig.healthCheck.interval)
        .mockReturnValueOnce(expectedConfig.healthCheck.enabled)
        // Mock for resource limits config
        .mockReturnValueOnce(expectedConfig.resourceLimits.maxConcurrentTasks)
        .mockReturnValueOnce(expectedConfig.resourceLimits.taskTimeout)
        .mockReturnValueOnce(expectedConfig.resourceLimits.memoryLimit);

      const result = configAccessor.getEngineConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ENGINES.PRIMARY,
        'puppeteer',
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ENGINES.FALLBACK,
        [],
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.ENGINES.STRATEGY,
        'primary-first',
      );
    });
  });

  describe('getLanguageConfig', () => {
    it('should return default language configuration', () => {
      const expectedConfig = {
        default: 'en',
        available: ['en', 'zh-TW'],
      };

      mockConfigManager.get
        .mockReturnValueOnce(expectedConfig.default)
        .mockReturnValueOnce(expectedConfig.available);

      const result = configAccessor.getLanguageConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.LANGUAGE.DEFAULT,
        'en',
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.LANGUAGE.AVAILABLE,
        ['en', 'zh-TW'],
      );
    });
  });

  describe('getPerformanceConfig', () => {
    it('should return default performance configuration', () => {
      const expectedConfig = {
        maxWorkers: 3,
        timeout: 120000,
        memoryLimit: '2GB',
      };

      mockConfigManager.get
        .mockReturnValueOnce(expectedConfig.maxWorkers)
        .mockReturnValueOnce(expectedConfig.timeout)
        .mockReturnValueOnce(expectedConfig.memoryLimit);

      const result = configAccessor.getPerformanceConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PERFORMANCE.MAX_WORKERS,
        3,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PERFORMANCE.TIMEOUT,
        120000,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.PERFORMANCE.MEMORY_LIMIT,
        '2GB',
      );
    });
  });

  describe('getFeatureFlags', () => {
    it('should return default feature flags', () => {
      const expectedFlags = {
        enhancedServices: true,
        enhancedCli: true,
        newOrchestrator: true,
        forceLegacyMode: false,
      };

      mockConfigManager.get
        .mockReturnValueOnce(expectedFlags.enhancedServices)
        .mockReturnValueOnce(expectedFlags.enhancedCli)
        .mockReturnValueOnce(expectedFlags.newOrchestrator)
        .mockReturnValueOnce(expectedFlags.forceLegacyMode);

      const result = configAccessor.getFeatureFlags();

      expect(result).toEqual(expectedFlags);
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.FEATURES.ENHANCED_SERVICES,
        true,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.FEATURES.ENHANCED_CLI,
        true,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.FEATURES.NEW_ORCHESTRATOR,
        true,
      );
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        CONFIG_KEYS.FEATURES.FORCE_LEGACY_MODE,
        false,
      );
    });
  });

  describe('updatePDFMargin', () => {
    it('should update all margin properties when provided', async () => {
      const marginUpdates: PDFMarginConfig = {
        top: '2in',
        right: '1.5in',
        bottom: '2in',
        left: '1.5in',
      };

      mockConfigManager.setAndSave.mockResolvedValue();

      await configAccessor.updatePDFMargin(marginUpdates);

      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.TOP,
        marginUpdates.top,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.RIGHT,
        marginUpdates.right,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.BOTTOM,
        marginUpdates.bottom,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.LEFT,
        marginUpdates.left,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledTimes(4);
    });

    it('should update only provided margin properties', async () => {
      const partialMarginUpdates = {
        top: '2in',
        bottom: '2in',
      };

      mockConfigManager.setAndSave.mockResolvedValue();

      await configAccessor.updatePDFMargin(partialMarginUpdates);

      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.TOP,
        partialMarginUpdates.top,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.PDF.MARGIN.BOTTOM,
        partialMarginUpdates.bottom,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledTimes(2);
    });

    it('should handle empty margin updates', async () => {
      mockConfigManager.setAndSave.mockResolvedValue();

      await configAccessor.updatePDFMargin({});

      expect(mockConfigManager.setAndSave).not.toHaveBeenCalled();
    });
  });

  describe('updateCSSTemplate', () => {
    it('should update all CSS template properties when provided', async () => {
      const templateUpdates: CSSTemplateConfig = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineHeight: 1.4,
        maxWidth: '1000px',
        margin: '0',
        padding: '1rem',
      };

      mockConfigManager.setAndSave.mockResolvedValue();

      await configAccessor.updateCSSTemplate(templateUpdates);

      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.FONT_FAMILY,
        templateUpdates.fontFamily,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.FONT_SIZE,
        templateUpdates.fontSize,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.LINE_HEIGHT,
        templateUpdates.lineHeight,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.MAX_WIDTH,
        templateUpdates.maxWidth,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.MARGIN,
        templateUpdates.margin,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.PADDING,
        templateUpdates.padding,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledTimes(6);
    });

    it('should update only provided CSS template properties', async () => {
      const partialTemplateUpdates = {
        fontSize: '14px',
        padding: '1rem',
      };

      mockConfigManager.setAndSave.mockResolvedValue();

      await configAccessor.updateCSSTemplate(partialTemplateUpdates);

      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.FONT_SIZE,
        partialTemplateUpdates.fontSize,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledWith(
        CONFIG_KEYS.TEMPLATE.CSS.PADDING,
        partialTemplateUpdates.padding,
      );
      expect(mockConfigManager.setAndSave).toHaveBeenCalledTimes(2);
    });

    it('should handle empty CSS template updates', async () => {
      mockConfigManager.setAndSave.mockResolvedValue();

      await configAccessor.updateCSSTemplate({});

      expect(mockConfigManager.setAndSave).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle config manager errors gracefully', async () => {
      const error = new Error('Config error');
      mockConfigManager.setAndSave.mockRejectedValue(error);

      await expect(
        configAccessor.updatePDFMargin({ top: '2in' }),
      ).rejects.toThrow('Config error');
    });

    it('should handle concurrent update errors', async () => {
      const error = new Error('Concurrent update error');
      mockConfigManager.setAndSave
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(error);

      await expect(
        configAccessor.updateCSSTemplate({ fontSize: '14px', padding: '1rem' }),
      ).rejects.toThrow('Concurrent update error');
    });
  });
});
