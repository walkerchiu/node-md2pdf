/**
 * Default configuration values
 * Single source of truth for all default settings
 */

import {
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
  DEFAULT_PDF_OPTIONS,
  CONFIG_KEYS,
} from './constants';

import type { ConfigSchema } from './types';

export const defaultConfig: ConfigSchema = {
  language: {
    default: 'en',
    available: ['en', 'zh-TW'],
  },
  pdf: {
    format: DEFAULT_PDF_OPTIONS.FORMAT,
    orientation: DEFAULT_PDF_OPTIONS.ORIENTATION,
    margin: DEFAULT_MARGINS.NORMAL,
    displayHeaderFooter: DEFAULT_PDF_OPTIONS.DISPLAY_HEADER_FOOTER,
    printBackground: DEFAULT_PDF_OPTIONS.PRINT_BACKGROUND,
    scale: DEFAULT_PDF_OPTIONS.SCALE,
    preferCSSPageSize: DEFAULT_PDF_OPTIONS.PREFER_CSS_PAGE_SIZE,
    useEnhancedEngine: true,
    engines: {
      primary: 'puppeteer',
      fallback: ['chrome-headless'],
      strategy: 'health-first',
      healthCheck: {
        interval: 30000,
        enabled: true,
      },
      resourceLimits: {
        maxConcurrentTasks: 3,
        taskTimeout: 120000,
        memoryLimit: '2GB',
      },
    },
  },
  template: {
    css: {
      fontFamily: DEFAULT_CSS_TEMPLATE.FONT_FAMILY,
      fontSize: DEFAULT_CSS_TEMPLATE.FONT_SIZE,
      lineHeight: DEFAULT_CSS_TEMPLATE.LINE_HEIGHT,
      maxWidth: DEFAULT_CSS_TEMPLATE.MAX_WIDTH,
      margin: DEFAULT_CSS_TEMPLATE.MARGIN,
      padding: DEFAULT_CSS_TEMPLATE.PADDING,
    },
  },
  toc: {
    enabled: true,
    depth: 3,
    title: {
      en: 'Table of Contents',
      'zh-tw': '目錄',
    },
  },
  rendering: {
    forceAccuratePageNumbers: false,
    maxPerformanceImpact: 0.5,
  },
  performance: {
    maxWorkers: 3,
    timeout: 120000, // 2 minutes
    memoryLimit: '2GB',
  },
  logging: {
    level: 'info',
    fileEnabled: true,
    format: 'text',
    maxFileSize: 10485760, // 10MB
    maxBackupFiles: 5,
    enableRotation: true,
  },
  features: {
    enhancedServices: process.env.MD2PDF_USE_ENHANCED_SERVICES !== 'false',
    enhancedCli: process.env.MD2PDF_USE_ENHANCED_CLI !== 'false',
    newOrchestrator: process.env.MD2PDF_USE_NEW_ORCHESTRATOR !== 'false',
    forceLegacyMode: process.env.MD2PDF_FORCE_LEGACY === 'true',
  },
};

// Export constants for use in other parts of the system
export {
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
  DEFAULT_PDF_OPTIONS,
  CONFIG_KEYS,
};

/**
 * Environment variable mappings
 */
export const environmentMappings: Record<string, string> = {
  MD2PDF_LANG: 'language.default',
  MD2PDF_PDF_FORMAT: 'pdf.format',
  MD2PDF_TOC_ENABLED: 'toc.enabled',
  MD2PDF_TOC_DEPTH: 'toc.depth',
  MD2PDF_MAX_WORKERS: 'performance.maxWorkers',
  MD2PDF_TIMEOUT: 'performance.timeout',
  MD2PDF_LOG_LEVEL: 'logging.level',
  MD2PDF_LOG_FILE_ENABLED: 'logging.fileEnabled',
  MD2PDF_LOG_FORMAT: 'logging.format',
  MD2PDF_LOG_MAX_FILE_SIZE: 'logging.maxFileSize',
  MD2PDF_LOG_MAX_BACKUP_FILES: 'logging.maxBackupFiles',
  MD2PDF_LOG_ENABLE_ROTATION: 'logging.enableRotation',
  MD2PDF_USE_ENHANCED_SERVICES: 'features.enhancedServices',
  MD2PDF_USE_ENHANCED_CLI: 'features.enhancedCli',
  MD2PDF_USE_NEW_ORCHESTRATOR: 'features.newOrchestrator',
  MD2PDF_FORCE_LEGACY: 'features.forceLegacyMode',
  MD2PDF_PDF_USE_ENHANCED_ENGINE: 'pdf.useEnhancedEngine',
  MD2PDF_PDF_PRIMARY_ENGINE: 'pdf.engines.primary',
  MD2PDF_PDF_ENGINE_STRATEGY: 'pdf.engines.strategy',
  MD2PDF_PDF_HEALTH_CHECK_ENABLED: 'pdf.engines.healthCheck.enabled',
  MD2PDF_PDF_HEALTH_CHECK_INTERVAL: 'pdf.engines.healthCheck.interval',
  MD2PDF_PDF_MAX_CONCURRENT_TASKS:
    'pdf.engines.resourceLimits.maxConcurrentTasks',
  MD2PDF_PDF_TASK_TIMEOUT: 'pdf.engines.resourceLimits.taskTimeout',
  MD2PDF_FORCE_ACCURATE_PAGE_NUMBERS: 'rendering.forceAccuratePageNumbers',
  MD2PDF_MAX_PERFORMANCE_IMPACT: 'rendering.maxPerformanceImpact',
};
