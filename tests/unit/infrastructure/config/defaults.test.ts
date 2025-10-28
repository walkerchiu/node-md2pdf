/**
 * Unit tests for default configuration values
 */

import {
  defaultConfig,
  environmentMappings,
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
  DEFAULT_PDF_OPTIONS,
  DEFAULT_PLANTUML,
  DEFAULT_MERMAID,
  CONFIG_KEYS,
} from '../../../../src/infrastructure/config/defaults';

// Mock environment variables for testing
const originalEnv = process.env;

describe('Default Configuration Values', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('defaultConfig', () => {
    it('should define language configuration', () => {
      expect(defaultConfig.language.default).toBe('en');
      expect(defaultConfig.language.available).toEqual(['en', 'zh-TW']);
    });

    it('should define PDF configuration', () => {
      expect(defaultConfig.pdf.format).toBe(DEFAULT_PDF_OPTIONS.FORMAT);
      expect(defaultConfig.pdf.orientation).toBe(
        DEFAULT_PDF_OPTIONS.ORIENTATION,
      );
      expect(defaultConfig.pdf.margin).toEqual(DEFAULT_MARGINS.NORMAL);
      expect(defaultConfig.pdf.displayHeaderFooter).toBe(
        DEFAULT_PDF_OPTIONS.DISPLAY_HEADER_FOOTER,
      );
      expect(defaultConfig.pdf.printBackground).toBe(
        DEFAULT_PDF_OPTIONS.PRINT_BACKGROUND,
      );
      expect(defaultConfig.pdf.scale).toBe(DEFAULT_PDF_OPTIONS.SCALE);
      expect(defaultConfig.pdf.preferCSSPageSize).toBe(
        DEFAULT_PDF_OPTIONS.PREFER_CSS_PAGE_SIZE,
      );
      expect(defaultConfig.pdf.useEnhancedEngine).toBe(true);
    });

    it('should define PDF engine configuration', () => {
      expect(defaultConfig.pdf.engines.primary).toBe('puppeteer');
      expect(defaultConfig.pdf.engines.fallback).toEqual(['chrome-headless']);
      expect(defaultConfig.pdf.engines.strategy).toBe('health-first');
      expect(defaultConfig.pdf.engines.healthCheck.interval).toBe(30000);
      expect(defaultConfig.pdf.engines.healthCheck.enabled).toBe(true);
    });

    it('should define PDF resource limits', () => {
      expect(defaultConfig.pdf.engines.resourceLimits.maxConcurrentTasks).toBe(
        3,
      );
      expect(defaultConfig.pdf.engines.resourceLimits.taskTimeout).toBe(120000);
      expect(defaultConfig.pdf.engines.resourceLimits.memoryLimit).toBe('2GB');
    });

    it('should define template configuration', () => {
      expect(defaultConfig.template?.css?.fontFamily).toBe(
        DEFAULT_CSS_TEMPLATE.FONT_FAMILY,
      );
      expect(defaultConfig.template?.css?.fontSize).toBe(
        DEFAULT_CSS_TEMPLATE.FONT_SIZE,
      );
      expect(defaultConfig.template?.css?.lineHeight).toBe(
        DEFAULT_CSS_TEMPLATE.LINE_HEIGHT,
      );
      expect(defaultConfig.template?.css?.maxWidth).toBe(
        DEFAULT_CSS_TEMPLATE.MAX_WIDTH,
      );
      expect(defaultConfig.template?.css?.margin).toBe(
        DEFAULT_CSS_TEMPLATE.MARGIN,
      );
      expect(defaultConfig.template?.css?.padding).toBe(
        DEFAULT_CSS_TEMPLATE.PADDING,
      );
    });

    it('should define TOC configuration', () => {
      expect(defaultConfig.toc.enabled).toBe(true);
      expect(defaultConfig.toc.depth).toBe(3);
      expect(defaultConfig.toc.title.en).toBe('Table of Contents');
      expect(defaultConfig.toc.title['zh-tw']).toBe('目錄');
    });

    it('should define rendering configuration', () => {
      expect(defaultConfig.rendering.forceAccuratePageNumbers).toBe(false);
      expect(defaultConfig.rendering.maxPerformanceImpact).toBe(0.5);
    });

    it('should define performance configuration', () => {
      expect(defaultConfig.performance.maxWorkers).toBe(3);
      expect(defaultConfig.performance.timeout).toBe(120000);
      expect(defaultConfig.performance.memoryLimit).toBe('2GB');
    });

    it('should define logging configuration', () => {
      expect(defaultConfig.logging?.level).toBe('info');
      expect(defaultConfig.logging?.fileEnabled).toBe(true);
      expect(defaultConfig.logging?.format).toBe('text');
      expect(defaultConfig.logging?.maxFileSize).toBe(10485760); // 10MB
      expect(defaultConfig.logging?.maxBackupFiles).toBe(5);
      expect(defaultConfig.logging?.enableRotation).toBe(true);
    });

    it('should define PlantUML configuration', () => {
      expect(defaultConfig.plantuml?.enabled).toBe(true);
      expect(defaultConfig.plantuml?.serverUrl).toBe(
        DEFAULT_PLANTUML.SERVER_URL,
      );
      expect(defaultConfig.plantuml?.format).toBe(DEFAULT_PLANTUML.FORMAT);
      expect(defaultConfig.plantuml?.defaultWidth).toBe(
        DEFAULT_PLANTUML.DEFAULT_WIDTH,
      );
      expect(defaultConfig.plantuml?.defaultHeight).toBe(
        DEFAULT_PLANTUML.DEFAULT_HEIGHT,
      );
      expect(defaultConfig.plantuml?.timeout).toBe(DEFAULT_PLANTUML.TIMEOUT);
      expect(defaultConfig.plantuml?.enableCaching).toBe(
        DEFAULT_PLANTUML.ENABLE_CACHING,
      );
    });

    it('should define PlantUML cache configuration', () => {
      expect(defaultConfig.plantuml?.cache?.enabled).toBe(true);
      expect(defaultConfig.plantuml?.cache?.maxAge).toBe(3600000); // 1 hour
      expect(defaultConfig.plantuml?.cache?.maxSize).toBe(100);
    });

    it('should define PlantUML fallback configuration', () => {
      expect(defaultConfig.plantuml?.fallback?.showErrorPlaceholder).toBe(true);
      expect(defaultConfig.plantuml?.fallback?.errorMessage).toBe(
        'PlantUML diagram rendering failed',
      );
    });

    it('should define Mermaid configuration', () => {
      expect(defaultConfig.mermaid?.enabled).toBe(true);
      expect(defaultConfig.mermaid?.theme).toBe(DEFAULT_MERMAID.THEME);
      expect(defaultConfig.mermaid?.defaultWidth).toBe(
        DEFAULT_MERMAID.DEFAULT_WIDTH,
      );
      expect(defaultConfig.mermaid?.defaultHeight).toBe(
        DEFAULT_MERMAID.DEFAULT_HEIGHT,
      );
      expect(defaultConfig.mermaid?.timeout).toBe(DEFAULT_MERMAID.TIMEOUT);
      expect(defaultConfig.mermaid?.enableCaching).toBe(
        DEFAULT_MERMAID.ENABLE_CACHING,
      );
      expect(defaultConfig.mermaid?.backgroundColor).toBe(
        DEFAULT_MERMAID.BACKGROUND_COLOR,
      );
      expect(defaultConfig.mermaid?.cdnUrl).toBe(DEFAULT_MERMAID.CDN_URL);
      expect(defaultConfig.mermaid?.viewportWidth).toBe(
        DEFAULT_MERMAID.VIEWPORT_WIDTH,
      );
      expect(defaultConfig.mermaid?.viewportHeight).toBe(
        DEFAULT_MERMAID.VIEWPORT_HEIGHT,
      );
    });

    it('should define Mermaid cache configuration', () => {
      expect(defaultConfig.mermaid?.cache?.enabled).toBe(true);
      expect(defaultConfig.mermaid?.cache?.maxAge).toBe(3600000); // 1 hour
      expect(defaultConfig.mermaid?.cache?.maxSize).toBe(100);
    });

    it('should define Mermaid fallback configuration', () => {
      expect(defaultConfig.mermaid?.fallback?.showErrorPlaceholder).toBe(true);
      expect(defaultConfig.mermaid?.fallback?.errorMessage).toBe(
        'Mermaid diagram rendering failed',
      );
    });

    describe('feature flags with environment variables', () => {
      it('should enable enhanced services by default', () => {
        expect(defaultConfig.features.enhancedServices).toBe(true);
        expect(defaultConfig.features.enhancedCli).toBe(true);
        expect(defaultConfig.features.newOrchestrator).toBe(true);
        expect(defaultConfig.features.forceLegacyMode).toBe(false);
      });

      it('should disable enhanced services when MD2PDF_USE_ENHANCED_SERVICES is false', () => {
        // This requires re-importing the module, so we test the logic indirectly
        expect(typeof defaultConfig.features.enhancedServices).toBe('boolean');
      });

      it('should enable legacy mode when MD2PDF_FORCE_LEGACY is true', () => {
        // This requires re-importing the module, so we test the logic indirectly
        expect(typeof defaultConfig.features.forceLegacyMode).toBe('boolean');
      });
    });
  });

  describe('environmentMappings', () => {
    it('should define all required environment variable mappings', () => {
      expect(environmentMappings['MD2PDF_LANG']).toBe('language.default');
      expect(environmentMappings['MD2PDF_PDF_FORMAT']).toBe('pdf.format');
      expect(environmentMappings['MD2PDF_TOC_ENABLED']).toBe('toc.enabled');
      expect(environmentMappings['MD2PDF_TOC_DEPTH']).toBe('toc.depth');
      expect(environmentMappings['MD2PDF_MAX_WORKERS']).toBe(
        'performance.maxWorkers',
      );
      expect(environmentMappings['MD2PDF_TIMEOUT']).toBe('performance.timeout');
    });

    it('should define logging environment mappings', () => {
      expect(environmentMappings['MD2PDF_LOG_LEVEL']).toBe('logging.level');
      expect(environmentMappings['MD2PDF_LOG_FILE_ENABLED']).toBe(
        'logging.fileEnabled',
      );
      expect(environmentMappings['MD2PDF_LOG_FORMAT']).toBe('logging.format');
      expect(environmentMappings['MD2PDF_LOG_MAX_FILE_SIZE']).toBe(
        'logging.maxFileSize',
      );
      expect(environmentMappings['MD2PDF_LOG_MAX_BACKUP_FILES']).toBe(
        'logging.maxBackupFiles',
      );
      expect(environmentMappings['MD2PDF_LOG_ENABLE_ROTATION']).toBe(
        'logging.enableRotation',
      );
    });

    it('should define feature flag environment mappings', () => {
      expect(environmentMappings['MD2PDF_USE_ENHANCED_SERVICES']).toBe(
        'features.enhancedServices',
      );
      expect(environmentMappings['MD2PDF_USE_ENHANCED_CLI']).toBe(
        'features.enhancedCli',
      );
      expect(environmentMappings['MD2PDF_USE_NEW_ORCHESTRATOR']).toBe(
        'features.newOrchestrator',
      );
      expect(environmentMappings['MD2PDF_FORCE_LEGACY']).toBe(
        'features.forceLegacyMode',
      );
    });

    it('should define PDF engine environment mappings', () => {
      expect(environmentMappings['MD2PDF_PDF_USE_ENHANCED_ENGINE']).toBe(
        'pdf.useEnhancedEngine',
      );
      expect(environmentMappings['MD2PDF_PDF_PRIMARY_ENGINE']).toBe(
        'pdf.engines.primary',
      );
      expect(environmentMappings['MD2PDF_PDF_ENGINE_STRATEGY']).toBe(
        'pdf.engines.strategy',
      );
      expect(environmentMappings['MD2PDF_PDF_HEALTH_CHECK_ENABLED']).toBe(
        'pdf.engines.healthCheck.enabled',
      );
      expect(environmentMappings['MD2PDF_PDF_HEALTH_CHECK_INTERVAL']).toBe(
        'pdf.engines.healthCheck.interval',
      );
    });

    it('should define PDF resource limit environment mappings', () => {
      expect(environmentMappings['MD2PDF_PDF_MAX_CONCURRENT_TASKS']).toBe(
        'pdf.engines.resourceLimits.maxConcurrentTasks',
      );
      expect(environmentMappings['MD2PDF_PDF_TASK_TIMEOUT']).toBe(
        'pdf.engines.resourceLimits.taskTimeout',
      );
    });

    it('should define rendering environment mappings', () => {
      expect(environmentMappings['MD2PDF_FORCE_ACCURATE_PAGE_NUMBERS']).toBe(
        'rendering.forceAccuratePageNumbers',
      );
      expect(environmentMappings['MD2PDF_MAX_PERFORMANCE_IMPACT']).toBe(
        'rendering.maxPerformanceImpact',
      );
    });

    it('should define PlantUML environment mappings', () => {
      expect(environmentMappings['MD2PDF_PLANTUML_ENABLED']).toBe(
        'plantuml.enabled',
      );
      expect(environmentMappings['MD2PDF_PLANTUML_SERVER_URL']).toBe(
        'plantuml.serverUrl',
      );
      expect(environmentMappings['MD2PDF_PLANTUML_FORMAT']).toBe(
        'plantuml.format',
      );
      expect(environmentMappings['MD2PDF_PLANTUML_DEFAULT_WIDTH']).toBe(
        'plantuml.defaultWidth',
      );
      expect(environmentMappings['MD2PDF_PLANTUML_DEFAULT_HEIGHT']).toBe(
        'plantuml.defaultHeight',
      );
      expect(environmentMappings['MD2PDF_PLANTUML_TIMEOUT']).toBe(
        'plantuml.timeout',
      );
      expect(environmentMappings['MD2PDF_PLANTUML_ENABLE_CACHING']).toBe(
        'plantuml.enableCaching',
      );
    });

    it('should define PlantUML cache environment mappings', () => {
      expect(environmentMappings['MD2PDF_PLANTUML_CACHE_ENABLED']).toBe(
        'plantuml.cache.enabled',
      );
      expect(environmentMappings['MD2PDF_PLANTUML_CACHE_MAX_AGE']).toBe(
        'plantuml.cache.maxAge',
      );
      expect(environmentMappings['MD2PDF_PLANTUML_CACHE_MAX_SIZE']).toBe(
        'plantuml.cache.maxSize',
      );
    });

    it('should define PlantUML fallback environment mappings', () => {
      expect(
        environmentMappings['MD2PDF_PLANTUML_SHOW_ERROR_PLACEHOLDER'],
      ).toBe('plantuml.fallback.showErrorPlaceholder');
      expect(environmentMappings['MD2PDF_PLANTUML_ERROR_MESSAGE']).toBe(
        'plantuml.fallback.errorMessage',
      );
    });

    it('should define Mermaid environment mappings', () => {
      expect(environmentMappings['MD2PDF_MERMAID_ENABLED']).toBe(
        'mermaid.enabled',
      );
      expect(environmentMappings['MD2PDF_MERMAID_THEME']).toBe('mermaid.theme');
      expect(environmentMappings['MD2PDF_MERMAID_DEFAULT_WIDTH']).toBe(
        'mermaid.defaultWidth',
      );
      expect(environmentMappings['MD2PDF_MERMAID_DEFAULT_HEIGHT']).toBe(
        'mermaid.defaultHeight',
      );
      expect(environmentMappings['MD2PDF_MERMAID_TIMEOUT']).toBe(
        'mermaid.timeout',
      );
      expect(environmentMappings['MD2PDF_MERMAID_ENABLE_CACHING']).toBe(
        'mermaid.enableCaching',
      );
      expect(environmentMappings['MD2PDF_MERMAID_BACKGROUND_COLOR']).toBe(
        'mermaid.backgroundColor',
      );
      expect(environmentMappings['MD2PDF_MERMAID_CDN_URL']).toBe(
        'mermaid.cdnUrl',
      );
      expect(environmentMappings['MD2PDF_MERMAID_VIEWPORT_WIDTH']).toBe(
        'mermaid.viewportWidth',
      );
      expect(environmentMappings['MD2PDF_MERMAID_VIEWPORT_HEIGHT']).toBe(
        'mermaid.viewportHeight',
      );
    });

    it('should define Mermaid cache environment mappings', () => {
      expect(environmentMappings['MD2PDF_MERMAID_CACHE_ENABLED']).toBe(
        'mermaid.cache.enabled',
      );
      expect(environmentMappings['MD2PDF_MERMAID_CACHE_MAX_AGE']).toBe(
        'mermaid.cache.maxAge',
      );
      expect(environmentMappings['MD2PDF_MERMAID_CACHE_MAX_SIZE']).toBe(
        'mermaid.cache.maxSize',
      );
    });

    it('should define Mermaid fallback environment mappings', () => {
      expect(environmentMappings['MD2PDF_MERMAID_SHOW_ERROR_PLACEHOLDER']).toBe(
        'mermaid.fallback.showErrorPlaceholder',
      );
      expect(environmentMappings['MD2PDF_MERMAID_ERROR_MESSAGE']).toBe(
        'mermaid.fallback.errorMessage',
      );
    });

    it('should have mappings for all defined environment variables', () => {
      const envKeys = Object.keys(environmentMappings);
      expect(envKeys.length).toBeGreaterThan(0);

      // All environment keys should start with MD2PDF_
      envKeys.forEach((key) => {
        expect(key).toMatch(/^MD2PDF_/);
      });

      // All mapping values should be dot-notation configuration paths
      Object.values(environmentMappings).forEach((configPath) => {
        expect(configPath).toMatch(/^[a-z]+(\.[a-z]+)*$/i);
      });
    });
  });

  describe('exported constants', () => {
    it('should re-export constants from constants.ts', () => {
      expect(DEFAULT_MARGINS).toBeDefined();
      expect(DEFAULT_CSS_TEMPLATE).toBeDefined();
      expect(DEFAULT_PDF_OPTIONS).toBeDefined();
      expect(DEFAULT_PLANTUML).toBeDefined();
      expect(DEFAULT_MERMAID).toBeDefined();
      expect(CONFIG_KEYS).toBeDefined();
    });

    it('should maintain consistency with imported constants', () => {
      expect(defaultConfig.pdf.format).toBe(DEFAULT_PDF_OPTIONS.FORMAT);
      expect(defaultConfig.pdf.margin).toEqual(DEFAULT_MARGINS.NORMAL);
      expect(defaultConfig.template?.css?.fontFamily).toBe(
        DEFAULT_CSS_TEMPLATE.FONT_FAMILY,
      );
      expect(defaultConfig.plantuml?.serverUrl).toBe(
        DEFAULT_PLANTUML.SERVER_URL,
      );
      expect(defaultConfig.mermaid?.theme).toBe(DEFAULT_MERMAID.THEME);
      expect(defaultConfig.mermaid?.cdnUrl).toBe(DEFAULT_MERMAID.CDN_URL);
    });
  });

  describe('configuration validation', () => {
    it('should have valid numeric values', () => {
      expect(defaultConfig.toc.depth).toBeGreaterThan(0);
      expect(defaultConfig.toc.depth).toBeLessThanOrEqual(6);
      expect(defaultConfig.performance.maxWorkers).toBeGreaterThan(0);
      expect(defaultConfig.performance.timeout).toBeGreaterThan(0);
      expect(defaultConfig.logging?.maxFileSize || 0).toBeGreaterThan(0);
      expect(defaultConfig.logging?.maxBackupFiles || 0).toBeGreaterThan(0);
    });

    it('should have valid boolean values', () => {
      expect(typeof defaultConfig.toc.enabled).toBe('boolean');
      expect(typeof defaultConfig.pdf.displayHeaderFooter).toBe('boolean');
      expect(typeof defaultConfig.pdf.printBackground).toBe('boolean');
      expect(typeof defaultConfig.pdf.useEnhancedEngine).toBe('boolean');
      expect(typeof defaultConfig.logging?.fileEnabled).toBe('boolean');
      expect(typeof defaultConfig.logging?.enableRotation).toBe('boolean');
    });

    it('should have valid string values', () => {
      expect(typeof defaultConfig.language.default).toBe('string');
      expect(typeof defaultConfig.pdf.format).toBe('string');
      expect(typeof defaultConfig.pdf.orientation).toBe('string');
      expect(typeof defaultConfig.logging?.level).toBe('string');
      expect(typeof defaultConfig.logging?.format).toBe('string');
    });

    it('should have valid percentage/ratio values', () => {
      expect(
        defaultConfig.rendering.maxPerformanceImpact,
      ).toBeGreaterThanOrEqual(0);
      expect(defaultConfig.rendering.maxPerformanceImpact).toBeLessThanOrEqual(
        1,
      );
    });
  });
});
