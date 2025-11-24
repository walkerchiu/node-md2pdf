/**
 * Unit tests for configuration constants
 */

import {
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
  DEFAULT_PDF_OPTIONS,
  DEFAULT_PLANTUML,
  DEFAULT_MERMAID,
  CONFIG_KEYS,
} from '../../../../src/infrastructure/config/constants';

describe('Configuration Constants', () => {
  describe('DEFAULT_MARGINS', () => {
    it('should define NORMAL margins', () => {
      expect(DEFAULT_MARGINS.NORMAL).toBeDefined();
      expect(DEFAULT_MARGINS.NORMAL.top).toBe('2cm');
      expect(DEFAULT_MARGINS.NORMAL.right).toBe('2cm');
      expect(DEFAULT_MARGINS.NORMAL.bottom).toBe('2cm');
      expect(DEFAULT_MARGINS.NORMAL.left).toBe('2cm');
    });

    it('should define WITH_HEADER_FOOTER margins', () => {
      expect(DEFAULT_MARGINS.WITH_HEADER_FOOTER).toBeDefined();
      expect(DEFAULT_MARGINS.WITH_HEADER_FOOTER.top).toBe('1.25in');
      expect(DEFAULT_MARGINS.WITH_HEADER_FOOTER.right).toBe('0.75in');
      expect(DEFAULT_MARGINS.WITH_HEADER_FOOTER.bottom).toBe('1.25in');
      expect(DEFAULT_MARGINS.WITH_HEADER_FOOTER.left).toBe('0.75in');
    });

    it('should have larger top/bottom margins for header/footer layout', () => {
      // Parse margin values for comparison (convert all to cm)
      const parseMargin = (margin: string) => {
        const value = parseFloat(margin);
        if (margin.includes('in')) {
          return value * 2.54; // Convert inches to cm
        }
        return value; // Already in cm
      };

      expect(
        parseMargin(DEFAULT_MARGINS.WITH_HEADER_FOOTER.top),
      ).toBeGreaterThan(parseMargin(DEFAULT_MARGINS.NORMAL.top));
      expect(
        parseMargin(DEFAULT_MARGINS.WITH_HEADER_FOOTER.bottom),
      ).toBeGreaterThan(parseMargin(DEFAULT_MARGINS.NORMAL.bottom));
    });
  });

  describe('DEFAULT_CSS_TEMPLATE', () => {
    it('should define all required CSS properties', () => {
      expect(DEFAULT_CSS_TEMPLATE.FONT_FAMILY).toBeTruthy();
      expect(DEFAULT_CSS_TEMPLATE.FONT_SIZE).toBe('16px');
      expect(DEFAULT_CSS_TEMPLATE.LINE_HEIGHT).toBe(1.6);
      expect(DEFAULT_CSS_TEMPLATE.MAX_WIDTH).toBe('800px');
      expect(DEFAULT_CSS_TEMPLATE.MARGIN).toBe('0 auto');
      expect(DEFAULT_CSS_TEMPLATE.PADDING).toBe('1.5rem');
    });

    it('should use system fonts for better compatibility', () => {
      expect(DEFAULT_CSS_TEMPLATE.FONT_FAMILY).toContain('system-ui');
      expect(DEFAULT_CSS_TEMPLATE.FONT_FAMILY).toContain('-apple-system');
    });

    it('should have reasonable default values', () => {
      expect(parseFloat(DEFAULT_CSS_TEMPLATE.FONT_SIZE)).toBe(16);
      expect(DEFAULT_CSS_TEMPLATE.LINE_HEIGHT).toBeGreaterThan(1);
      expect(parseInt(DEFAULT_CSS_TEMPLATE.MAX_WIDTH)).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_PDF_OPTIONS', () => {
    it('should define all required PDF options', () => {
      expect(DEFAULT_PDF_OPTIONS.FORMAT).toBe('A4');
      expect(DEFAULT_PDF_OPTIONS.ORIENTATION).toBe('portrait');
      expect(DEFAULT_PDF_OPTIONS.DISPLAY_HEADER_FOOTER).toBe(false);
      expect(DEFAULT_PDF_OPTIONS.PRINT_BACKGROUND).toBe(true);
      expect(DEFAULT_PDF_OPTIONS.SCALE).toBe(1);
      expect(DEFAULT_PDF_OPTIONS.PREFER_CSS_PAGE_SIZE).toBe(false);
    });

    it('should use standard A4 portrait settings', () => {
      expect(DEFAULT_PDF_OPTIONS.FORMAT).toBe('A4');
      expect(DEFAULT_PDF_OPTIONS.ORIENTATION).toBe('portrait');
    });

    it('should have sensible defaults for printing', () => {
      expect(DEFAULT_PDF_OPTIONS.PRINT_BACKGROUND).toBe(true);
      expect(DEFAULT_PDF_OPTIONS.SCALE).toBe(1);
    });
  });

  describe('DEFAULT_PLANTUML', () => {
    it('should define all required PlantUML options', () => {
      expect(DEFAULT_PLANTUML.SERVER_URL).toBe(
        'https://www.plantuml.com/plantuml',
      );
      expect(DEFAULT_PLANTUML.FORMAT).toBe('png');
      expect(DEFAULT_PLANTUML.DEFAULT_WIDTH).toBe(800);
      expect(DEFAULT_PLANTUML.DEFAULT_HEIGHT).toBe(600);
      expect(DEFAULT_PLANTUML.TIMEOUT).toBe(10000);
      expect(DEFAULT_PLANTUML.ENABLE_CACHING).toBe(true);
    });

    it('should use public PlantUML server by default', () => {
      expect(DEFAULT_PLANTUML.SERVER_URL).toContain('plantuml.com');
    });

    it('should have reasonable timeout and dimensions', () => {
      expect(DEFAULT_PLANTUML.TIMEOUT).toBeGreaterThan(0);
      expect(DEFAULT_PLANTUML.DEFAULT_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_PLANTUML.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it('should enable caching by default for performance', () => {
      expect(DEFAULT_PLANTUML.ENABLE_CACHING).toBe(true);
    });

    it('should define local renderer configuration', () => {
      expect(DEFAULT_PLANTUML.USE_LOCAL_RENDERER).toBe(true);
      expect(DEFAULT_PLANTUML.LOCAL_RENDERER).toBeDefined();
      expect(DEFAULT_PLANTUML.LOCAL_RENDERER.JAVA_PATH).toBe('java');
      expect(DEFAULT_PLANTUML.LOCAL_RENDERER.JAVA_OPTIONS).toEqual([
        '-Xmx1024m',
        '-Djava.awt.headless=true',
      ]);
      expect(DEFAULT_PLANTUML.LOCAL_RENDERER.TIMEOUT).toBe(30000);
      expect(DEFAULT_PLANTUML.LOCAL_RENDERER.DEBUG).toBe(false);
    });

    it('should define cache configuration', () => {
      expect(DEFAULT_PLANTUML.CACHE).toBeDefined();
      expect(DEFAULT_PLANTUML.CACHE.ENABLED).toBe(true);
      expect(DEFAULT_PLANTUML.CACHE.MAX_AGE).toBe(3600000);
      expect(DEFAULT_PLANTUML.CACHE.MAX_SIZE).toBe(100);
    });

    it('should define fallback configuration', () => {
      expect(DEFAULT_PLANTUML.FALLBACK).toBeDefined();
      expect(DEFAULT_PLANTUML.FALLBACK.SHOW_ERROR_PLACEHOLDER).toBe(true);
      expect(DEFAULT_PLANTUML.FALLBACK.ERROR_MESSAGE).toBe(
        'PlantUML diagram rendering failed',
      );
    });

    it('should have platform-specific JAR path', () => {
      const expectedPath =
        process.platform === 'win32'
          ? 'C:\\plantuml\\plantuml.jar'
          : '/usr/local/bin/plantuml.jar';
      expect(DEFAULT_PLANTUML.LOCAL_RENDERER.JAR_PATH).toBe(expectedPath);
    });

    it('should prefer local rendering by default', () => {
      expect(DEFAULT_PLANTUML.USE_LOCAL_RENDERER).toBe(true);
    });

    it('should have reasonable cache settings', () => {
      expect(DEFAULT_PLANTUML.CACHE.MAX_AGE).toBeGreaterThan(0);
      expect(DEFAULT_PLANTUML.CACHE.MAX_SIZE).toBeGreaterThan(0);
      expect(DEFAULT_PLANTUML.LOCAL_RENDERER.TIMEOUT).toBeGreaterThan(
        DEFAULT_PLANTUML.TIMEOUT,
      );
    });
  });

  describe('DEFAULT_MERMAID', () => {
    it('should define all required Mermaid options', () => {
      expect(DEFAULT_MERMAID.THEME).toBe('default');
      expect(DEFAULT_MERMAID.DEFAULT_WIDTH).toBe(800);
      expect(DEFAULT_MERMAID.DEFAULT_HEIGHT).toBe(600);
      expect(DEFAULT_MERMAID.TIMEOUT).toBe(10000);
      expect(DEFAULT_MERMAID.ENABLE_CACHING).toBe(true);
      expect(DEFAULT_MERMAID.BACKGROUND_COLOR).toBe('white');
      expect(DEFAULT_MERMAID.CDN_URL).toBe(
        'https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.min.js',
      );
      expect(DEFAULT_MERMAID.VIEWPORT_WIDTH).toBe(1200);
      expect(DEFAULT_MERMAID.VIEWPORT_HEIGHT).toBe(800);
    });

    it('should use public CDN for Mermaid library', () => {
      expect(DEFAULT_MERMAID.CDN_URL).toContain('jsdelivr.net');
      expect(DEFAULT_MERMAID.CDN_URL).toContain('mermaid');
    });

    it('should have reasonable timeout and dimensions', () => {
      expect(DEFAULT_MERMAID.TIMEOUT).toBeGreaterThan(0);
      expect(DEFAULT_MERMAID.DEFAULT_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_MERMAID.DEFAULT_HEIGHT).toBeGreaterThan(0);
      expect(DEFAULT_MERMAID.VIEWPORT_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_MERMAID.VIEWPORT_HEIGHT).toBeGreaterThan(0);
    });

    it('should enable caching by default for performance', () => {
      expect(DEFAULT_MERMAID.ENABLE_CACHING).toBe(true);
    });

    it('should use default theme and white background', () => {
      expect(DEFAULT_MERMAID.THEME).toBe('default');
      expect(DEFAULT_MERMAID.BACKGROUND_COLOR).toBe('white');
    });

    it('should have larger viewport than default dimensions', () => {
      expect(DEFAULT_MERMAID.VIEWPORT_WIDTH).toBeGreaterThan(
        DEFAULT_MERMAID.DEFAULT_WIDTH,
      );
      expect(DEFAULT_MERMAID.VIEWPORT_HEIGHT).toBeGreaterThan(
        DEFAULT_MERMAID.DEFAULT_HEIGHT,
      );
    });
  });

  describe('CONFIG_KEYS', () => {
    it('should define PDF configuration keys', () => {
      expect(CONFIG_KEYS.PDF.FORMAT).toBe('pdf.format');
      expect(CONFIG_KEYS.PDF.ORIENTATION).toBe('pdf.orientation');
      expect(CONFIG_KEYS.PDF.MARGIN.TOP).toBe('pdf.margin.top');
      expect(CONFIG_KEYS.PDF.MARGIN.ALL).toBe('pdf.margin');
      expect(CONFIG_KEYS.PDF.DISPLAY_HEADER_FOOTER).toBe(
        'pdf.displayHeaderFooter',
      );
    });

    it('should define PDF engine configuration keys', () => {
      expect(CONFIG_KEYS.PDF.ENGINES.PRIMARY).toBe('pdf.engines.primary');
      expect(CONFIG_KEYS.PDF.ENGINES.FALLBACK).toBe('pdf.engines.fallback');
      expect(CONFIG_KEYS.PDF.ENGINES.STRATEGY).toBe('pdf.engines.strategy');
      expect(CONFIG_KEYS.PDF.ENGINES.HEALTH_CHECK.ENABLED).toBe(
        'pdf.engines.healthCheck.enabled',
      );
      expect(CONFIG_KEYS.PDF.ENGINES.HEALTH_CHECK.INTERVAL).toBe(
        'pdf.engines.healthCheck.interval',
      );
    });

    it('should define resource limit configuration keys', () => {
      expect(CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.MAX_CONCURRENT_TASKS).toBe(
        'pdf.engines.resourceLimits.maxConcurrentTasks',
      );
      expect(CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.TASK_TIMEOUT).toBe(
        'pdf.engines.resourceLimits.taskTimeout',
      );
      expect(CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.MEMORY_LIMIT).toBe(
        'pdf.engines.resourceLimits.memoryLimit',
      );
    });

    it('should define template configuration keys', () => {
      expect(CONFIG_KEYS.TEMPLATE.CSS.FONT_FAMILY).toBe(
        'template.css.fontFamily',
      );
      expect(CONFIG_KEYS.TEMPLATE.CSS.FONT_SIZE).toBe('template.css.fontSize');
      expect(CONFIG_KEYS.TEMPLATE.CSS.LINE_HEIGHT).toBe(
        'template.css.lineHeight',
      );
      expect(CONFIG_KEYS.TEMPLATE.CSS.MAX_WIDTH).toBe('template.css.maxWidth');
      expect(CONFIG_KEYS.TEMPLATE.CSS.MARGIN).toBe('template.css.margin');
      expect(CONFIG_KEYS.TEMPLATE.CSS.PADDING).toBe('template.css.padding');
    });

    it('should define TOC configuration keys', () => {
      expect(CONFIG_KEYS.TOC.ENABLED).toBe('toc.enabled');
      expect(CONFIG_KEYS.TOC.DEPTH).toBe('toc.depth');
      expect(CONFIG_KEYS.TOC.TITLE).toBe('toc.title');
    });

    it('should define language configuration keys', () => {
      expect(CONFIG_KEYS.LANGUAGE.DEFAULT).toBe('language.default');
      expect(CONFIG_KEYS.LANGUAGE.AVAILABLE).toBe('language.available');
    });

    it('should define performance configuration keys', () => {
      expect(CONFIG_KEYS.PERFORMANCE.MAX_WORKERS).toBe(
        'performance.maxWorkers',
      );
      expect(CONFIG_KEYS.PERFORMANCE.TIMEOUT).toBe('performance.timeout');
      expect(CONFIG_KEYS.PERFORMANCE.MEMORY_LIMIT).toBe(
        'performance.memoryLimit',
      );
    });

    it('should define PlantUML configuration keys', () => {
      expect(CONFIG_KEYS.PLANTUML.ENABLED).toBe('plantuml.enabled');
      expect(CONFIG_KEYS.PLANTUML.SERVER_URL).toBe('plantuml.serverUrl');
      expect(CONFIG_KEYS.PLANTUML.FORMAT).toBe('plantuml.format');
      expect(CONFIG_KEYS.PLANTUML.DEFAULT_WIDTH).toBe('plantuml.defaultWidth');
      expect(CONFIG_KEYS.PLANTUML.DEFAULT_HEIGHT).toBe(
        'plantuml.defaultHeight',
      );
      expect(CONFIG_KEYS.PLANTUML.TIMEOUT).toBe('plantuml.timeout');
      expect(CONFIG_KEYS.PLANTUML.ENABLE_CACHING).toBe(
        'plantuml.enableCaching',
      );
    });

    it('should define PlantUML cache configuration keys', () => {
      expect(CONFIG_KEYS.PLANTUML.CACHE.ENABLED).toBe('plantuml.cache.enabled');
      expect(CONFIG_KEYS.PLANTUML.CACHE.MAX_AGE).toBe('plantuml.cache.maxAge');
      expect(CONFIG_KEYS.PLANTUML.CACHE.MAX_SIZE).toBe(
        'plantuml.cache.maxSize',
      );
    });

    it('should define PlantUML fallback configuration keys', () => {
      expect(CONFIG_KEYS.PLANTUML.FALLBACK.SHOW_ERROR_PLACEHOLDER).toBe(
        'plantuml.fallback.showErrorPlaceholder',
      );
      expect(CONFIG_KEYS.PLANTUML.FALLBACK.ERROR_MESSAGE).toBe(
        'plantuml.fallback.errorMessage',
      );
    });

    it('should define Mermaid configuration keys', () => {
      expect(CONFIG_KEYS.MERMAID.ENABLED).toBe('mermaid.enabled');
      expect(CONFIG_KEYS.MERMAID.THEME).toBe('mermaid.theme');
      expect(CONFIG_KEYS.MERMAID.DEFAULT_WIDTH).toBe('mermaid.defaultWidth');
      expect(CONFIG_KEYS.MERMAID.DEFAULT_HEIGHT).toBe('mermaid.defaultHeight');
      expect(CONFIG_KEYS.MERMAID.TIMEOUT).toBe('mermaid.timeout');
      expect(CONFIG_KEYS.MERMAID.ENABLE_CACHING).toBe('mermaid.enableCaching');
      expect(CONFIG_KEYS.MERMAID.BACKGROUND_COLOR).toBe(
        'mermaid.backgroundColor',
      );
      expect(CONFIG_KEYS.MERMAID.CDN_URL).toBe('mermaid.cdnUrl');
      expect(CONFIG_KEYS.MERMAID.VIEWPORT_WIDTH).toBe('mermaid.viewportWidth');
      expect(CONFIG_KEYS.MERMAID.VIEWPORT_HEIGHT).toBe(
        'mermaid.viewportHeight',
      );
    });

    it('should define Mermaid cache configuration keys', () => {
      expect(CONFIG_KEYS.MERMAID.CACHE.ENABLED).toBe('mermaid.cache.enabled');
      expect(CONFIG_KEYS.MERMAID.CACHE.MAX_AGE).toBe('mermaid.cache.maxAge');
      expect(CONFIG_KEYS.MERMAID.CACHE.MAX_SIZE).toBe('mermaid.cache.maxSize');
    });

    it('should define Mermaid fallback configuration keys', () => {
      expect(CONFIG_KEYS.MERMAID.FALLBACK.SHOW_ERROR_PLACEHOLDER).toBe(
        'mermaid.fallback.showErrorPlaceholder',
      );
      expect(CONFIG_KEYS.MERMAID.FALLBACK.ERROR_MESSAGE).toBe(
        'mermaid.fallback.errorMessage',
      );
    });
  });

  describe('Constants validation', () => {
    it('should have defined constants objects', () => {
      expect(DEFAULT_MARGINS).toBeDefined();
      expect(DEFAULT_CSS_TEMPLATE).toBeDefined();
      expect(DEFAULT_PDF_OPTIONS).toBeDefined();
      expect(DEFAULT_PLANTUML).toBeDefined();
      expect(DEFAULT_MERMAID).toBeDefined();
      expect(CONFIG_KEYS).toBeDefined();
    });

    it('should have nested objects defined', () => {
      expect(DEFAULT_MARGINS.NORMAL).toBeDefined();
      expect(DEFAULT_MARGINS.WITH_HEADER_FOOTER).toBeDefined();
      expect(CONFIG_KEYS.PDF).toBeDefined();
      expect(CONFIG_KEYS.PDF.MARGIN).toBeDefined();
      expect(CONFIG_KEYS.PLANTUML).toBeDefined();
      expect(CONFIG_KEYS.MERMAID).toBeDefined();
    });

    it('should be read-only objects (as const)', () => {
      // These objects are declared with 'as const' which provides compile-time immutability
      expect(typeof DEFAULT_MARGINS).toBe('object');
      expect(typeof CONFIG_KEYS).toBe('object');
    });
  });
});
