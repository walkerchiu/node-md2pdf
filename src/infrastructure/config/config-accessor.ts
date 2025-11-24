/**
 * Strongly-typed configuration accessor
 * Provides type-safe access to configuration values
 */

import {
  CONFIG_KEYS,
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
} from './constants';

import type { IConfigManager } from './types';

export interface PDFMarginConfig {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface CSSTemplateConfig {
  fontFamily: string;
  fontSize: string;
  lineHeight: number;
  maxWidth: string;
  margin: string;
  padding: string;
}

export interface PDFEngineConfig {
  format: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margin: PDFMarginConfig;
  displayHeaderFooter: boolean;
  printBackground: boolean;
  useEnhancedEngine: boolean;
}

/**
 * Strongly-typed configuration accessor
 * Centralizes all configuration access with type safety
 */
export class ConfigAccessor {
  constructor(private readonly configManager: IConfigManager) {}

  /**
   * Get PDF margin configuration
   * @param includeHeaderFooter Whether to use margins for header/footer
   */
  getPDFMargin(includeHeaderFooter: boolean = false): PDFMarginConfig {
    const defaultMargin = includeHeaderFooter
      ? DEFAULT_MARGINS.WITH_HEADER_FOOTER
      : DEFAULT_MARGINS.NORMAL;

    return {
      top: this.configManager.get(
        CONFIG_KEYS.PDF.MARGIN.TOP,
        defaultMargin.top,
      ),
      right: this.configManager.get(
        CONFIG_KEYS.PDF.MARGIN.RIGHT,
        defaultMargin.right,
      ),
      bottom: this.configManager.get(
        CONFIG_KEYS.PDF.MARGIN.BOTTOM,
        defaultMargin.bottom,
      ),
      left: this.configManager.get(
        CONFIG_KEYS.PDF.MARGIN.LEFT,
        defaultMargin.left,
      ),
    };
  }

  /**
   * Get complete PDF engine configuration
   */
  getPDFEngineConfig(): PDFEngineConfig {
    return {
      format: this.configManager.get(CONFIG_KEYS.PDF.FORMAT, 'A4'),
      orientation: this.configManager.get(
        CONFIG_KEYS.PDF.ORIENTATION,
        'portrait',
      ) as 'portrait' | 'landscape',
      margin: this.getPDFMargin(),
      displayHeaderFooter: this.configManager.get(
        CONFIG_KEYS.PDF.DISPLAY_HEADER_FOOTER,
        false,
      ),
      printBackground: this.configManager.get(
        CONFIG_KEYS.PDF.PRINT_BACKGROUND,
        true,
      ),
      useEnhancedEngine: this.configManager.get(
        CONFIG_KEYS.PDF.USE_ENHANCED_ENGINE,
        true,
      ),
    };
  }

  /**
   * Get CSS template configuration
   */
  getCSSTemplateConfig(): CSSTemplateConfig {
    return {
      fontFamily: this.configManager.get(
        CONFIG_KEYS.TEMPLATE.CSS.FONT_FAMILY,
        DEFAULT_CSS_TEMPLATE.FONT_FAMILY,
      ),
      fontSize: this.configManager.get(
        CONFIG_KEYS.TEMPLATE.CSS.FONT_SIZE,
        DEFAULT_CSS_TEMPLATE.FONT_SIZE,
      ),
      lineHeight: this.configManager.get(
        CONFIG_KEYS.TEMPLATE.CSS.LINE_HEIGHT,
        DEFAULT_CSS_TEMPLATE.LINE_HEIGHT,
      ),
      maxWidth: this.configManager.get(
        CONFIG_KEYS.TEMPLATE.CSS.MAX_WIDTH,
        DEFAULT_CSS_TEMPLATE.MAX_WIDTH,
      ),
      margin: this.configManager.get(
        CONFIG_KEYS.TEMPLATE.CSS.MARGIN,
        DEFAULT_CSS_TEMPLATE.MARGIN,
      ),
      padding: this.configManager.get(
        CONFIG_KEYS.TEMPLATE.CSS.PADDING,
        DEFAULT_CSS_TEMPLATE.PADDING,
      ),
    };
  }

  /**
   * Get TOC configuration
   */
  getTOCConfig() {
    return {
      enabled: this.configManager.get(CONFIG_KEYS.TOC.ENABLED, true),
      depth: this.configManager.get(CONFIG_KEYS.TOC.DEPTH, 3),
      title: this.configManager.get(CONFIG_KEYS.TOC.TITLE, {
        en: 'Table of Contents',
        'zh-tw': '目錄',
      }),
    };
  }

  /**
   * Get engine health check configuration
   */
  getEngineHealthCheckConfig() {
    return {
      interval: this.configManager.get(
        CONFIG_KEYS.PDF.ENGINES.HEALTH_CHECK.INTERVAL,
        30000,
      ),
      enabled: this.configManager.get(
        CONFIG_KEYS.PDF.ENGINES.HEALTH_CHECK.ENABLED,
        true,
      ),
    };
  }

  /**
   * Get resource limits configuration
   */
  getResourceLimitsConfig() {
    return {
      maxConcurrentTasks: this.configManager.get(
        CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.MAX_CONCURRENT_TASKS,
        3,
      ),
      taskTimeout: this.configManager.get(
        CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.TASK_TIMEOUT,
        120000,
      ),
      memoryLimit: this.configManager.get(
        CONFIG_KEYS.PDF.ENGINES.RESOURCE_LIMITS.MEMORY_LIMIT,
        '2GB',
      ),
    };
  }

  /**
   * Get engine configuration
   */
  getEngineConfig() {
    return {
      primary: this.configManager.get(
        CONFIG_KEYS.PDF.ENGINES.PRIMARY,
        'puppeteer',
      ),
      fallback: this.configManager.get(CONFIG_KEYS.PDF.ENGINES.FALLBACK, []),
      strategy: this.configManager.get(
        CONFIG_KEYS.PDF.ENGINES.STRATEGY,
        'primary-first',
      ),
      healthCheck: this.getEngineHealthCheckConfig(),
      resourceLimits: this.getResourceLimitsConfig(),
    };
  }

  /**
   * Get language configuration
   */
  getLanguageConfig() {
    return {
      default: this.configManager.get(CONFIG_KEYS.LANGUAGE.DEFAULT, 'en'),
      available: this.configManager.get(CONFIG_KEYS.LANGUAGE.AVAILABLE, [
        'en',
        'zh-TW',
      ]),
    };
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig() {
    return {
      maxWorkers: this.configManager.get(
        CONFIG_KEYS.PERFORMANCE.MAX_WORKERS,
        3,
      ),
      timeout: this.configManager.get(CONFIG_KEYS.PERFORMANCE.TIMEOUT, 120000),
      memoryLimit: this.configManager.get(
        CONFIG_KEYS.PERFORMANCE.MEMORY_LIMIT,
        '2GB',
      ),
    };
  }

  /**
   * Update PDF margin configuration
   */
  async updatePDFMargin(margin: Partial<PDFMarginConfig>): Promise<void> {
    const promises = [];

    if (margin.top !== undefined) {
      promises.push(
        this.configManager.setAndSave(CONFIG_KEYS.PDF.MARGIN.TOP, margin.top),
      );
    }
    if (margin.right !== undefined) {
      promises.push(
        this.configManager.setAndSave(
          CONFIG_KEYS.PDF.MARGIN.RIGHT,
          margin.right,
        ),
      );
    }
    if (margin.bottom !== undefined) {
      promises.push(
        this.configManager.setAndSave(
          CONFIG_KEYS.PDF.MARGIN.BOTTOM,
          margin.bottom,
        ),
      );
    }
    if (margin.left !== undefined) {
      promises.push(
        this.configManager.setAndSave(CONFIG_KEYS.PDF.MARGIN.LEFT, margin.left),
      );
    }

    await Promise.all(promises);
  }

  /**
   * Update CSS template configuration
   */
  async updateCSSTemplate(template: Partial<CSSTemplateConfig>): Promise<void> {
    const promises = [];

    if (template.fontFamily !== undefined) {
      promises.push(
        this.configManager.setAndSave(
          CONFIG_KEYS.TEMPLATE.CSS.FONT_FAMILY,
          template.fontFamily,
        ),
      );
    }
    if (template.fontSize !== undefined) {
      promises.push(
        this.configManager.setAndSave(
          CONFIG_KEYS.TEMPLATE.CSS.FONT_SIZE,
          template.fontSize,
        ),
      );
    }
    if (template.lineHeight !== undefined) {
      promises.push(
        this.configManager.setAndSave(
          CONFIG_KEYS.TEMPLATE.CSS.LINE_HEIGHT,
          template.lineHeight,
        ),
      );
    }
    if (template.maxWidth !== undefined) {
      promises.push(
        this.configManager.setAndSave(
          CONFIG_KEYS.TEMPLATE.CSS.MAX_WIDTH,
          template.maxWidth,
        ),
      );
    }
    if (template.margin !== undefined) {
      promises.push(
        this.configManager.setAndSave(
          CONFIG_KEYS.TEMPLATE.CSS.MARGIN,
          template.margin,
        ),
      );
    }
    if (template.padding !== undefined) {
      promises.push(
        this.configManager.setAndSave(
          CONFIG_KEYS.TEMPLATE.CSS.PADDING,
          template.padding,
        ),
      );
    }

    await Promise.all(promises);
  }
}
