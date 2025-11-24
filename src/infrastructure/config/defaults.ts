/**
 * Default configuration values
 * Single source of truth for all default settings
 */

import { DEFAULT_HEADERS_FOOTERS_CONFIG } from '../../core/headers-footers';

import {
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
  DEFAULT_PDF_OPTIONS,
  DEFAULT_PLANTUML,
  DEFAULT_MERMAID,
  DEFAULT_SYNTAX_HIGHLIGHTING,
  DEFAULT_METADATA,
  CONFIG_KEYS,
  SYSTEM_DEFINED_KEYS,
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
  plantuml: {
    enabled: true,
    serverUrl: DEFAULT_PLANTUML.SERVER_URL,
    format: DEFAULT_PLANTUML.FORMAT,
    defaultWidth: DEFAULT_PLANTUML.DEFAULT_WIDTH,
    defaultHeight: DEFAULT_PLANTUML.DEFAULT_HEIGHT,
    timeout: DEFAULT_PLANTUML.TIMEOUT,
    enableCaching: DEFAULT_PLANTUML.ENABLE_CACHING,
    cache: {
      enabled: true,
      maxAge: 3600000, // 1 hour in milliseconds
      maxSize: 100, // max 100 cache entries
    },
    fallback: {
      showErrorPlaceholder: true,
      errorMessage: 'PlantUML diagram rendering failed',
    },
  },
  mermaid: {
    enabled: true,
    theme: DEFAULT_MERMAID.THEME,
    defaultWidth: DEFAULT_MERMAID.DEFAULT_WIDTH,
    defaultHeight: DEFAULT_MERMAID.DEFAULT_HEIGHT,
    timeout: DEFAULT_MERMAID.TIMEOUT,
    enableCaching: DEFAULT_MERMAID.ENABLE_CACHING,
    backgroundColor: DEFAULT_MERMAID.BACKGROUND_COLOR,
    cdnUrl: DEFAULT_MERMAID.CDN_URL,
    viewportWidth: DEFAULT_MERMAID.VIEWPORT_WIDTH,
    viewportHeight: DEFAULT_MERMAID.VIEWPORT_HEIGHT,
    cache: {
      enabled: true,
      maxAge: 3600000, // 1 hour in milliseconds
      maxSize: 100, // max 100 cache entries
    },
    fallback: {
      showErrorPlaceholder: true,
      errorMessage: 'Mermaid diagram rendering failed',
    },
  },
  syntaxHighlighting: {
    enabled: true,
    theme: DEFAULT_SYNTAX_HIGHLIGHTING.DEFAULT_THEME,
    enableLineNumbers: DEFAULT_SYNTAX_HIGHLIGHTING.ENABLE_LINE_NUMBERS,
    lineNumberStart: DEFAULT_SYNTAX_HIGHLIGHTING.LINE_NUMBER_START,
    timeout: DEFAULT_SYNTAX_HIGHLIGHTING.TIMEOUT,
    enableCaching: DEFAULT_SYNTAX_HIGHLIGHTING.ENABLE_CACHE,
    supportedLanguages: [...DEFAULT_SYNTAX_HIGHLIGHTING.SUPPORTED_LANGUAGES],
    languageAliases: DEFAULT_SYNTAX_HIGHLIGHTING.LANGUAGE_ALIASES,
  },
  metadata: {
    enabled: DEFAULT_METADATA.ENABLED,
    autoExtraction: {
      fromFrontmatter: DEFAULT_METADATA.AUTO_EXTRACTION.FROM_FRONTMATTER,
      fromContent: DEFAULT_METADATA.AUTO_EXTRACTION.FROM_CONTENT,
      fromFilename: DEFAULT_METADATA.AUTO_EXTRACTION.FROM_FILENAME,
      computeStats: DEFAULT_METADATA.AUTO_EXTRACTION.COMPUTE_STATS,
    },
    defaults: {
      language: DEFAULT_METADATA.DEFAULTS.LANGUAGE,
      title: DEFAULT_METADATA.DEFAULTS.TITLE,
      author: DEFAULT_METADATA.DEFAULTS.AUTHOR,
      subject: DEFAULT_METADATA.DEFAULTS.SUBJECT,
      keywords: DEFAULT_METADATA.DEFAULTS.KEYWORDS,
      creator: DEFAULT_METADATA.DEFAULTS.CREATOR,
      producer: DEFAULT_METADATA.DEFAULTS.PRODUCER,
    },
    frontmatterMapping: DEFAULT_METADATA.FRONTMATTER_MAPPING,
    validation: {
      requireTitle: DEFAULT_METADATA.VALIDATION.REQUIRE_TITLE,
      requireAuthor: DEFAULT_METADATA.VALIDATION.REQUIRE_AUTHOR,
      maxKeywordLength: DEFAULT_METADATA.VALIDATION.MAX_KEYWORD_LENGTH,
      maxSubjectLength: DEFAULT_METADATA.VALIDATION.MAX_SUBJECT_LENGTH,
    },
  },
  headersFooters: DEFAULT_HEADERS_FOOTERS_CONFIG,
};

// Export constants for use in other parts of the system
export {
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
  DEFAULT_PDF_OPTIONS,
  DEFAULT_PLANTUML,
  DEFAULT_MERMAID,
  DEFAULT_SYNTAX_HIGHLIGHTING,
  DEFAULT_METADATA,
  CONFIG_KEYS,
  SYSTEM_DEFINED_KEYS,
};

/**
 * Environment variable mappings
 */
export const environmentMappings: Record<string, string> = {
  MD2PDF_LANG: 'language.ui',
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
  MD2PDF_PLANTUML_ENABLED: 'plantuml.enabled',
  MD2PDF_PLANTUML_SERVER_URL: 'plantuml.serverUrl',
  MD2PDF_PLANTUML_FORMAT: 'plantuml.format',
  MD2PDF_PLANTUML_DEFAULT_WIDTH: 'plantuml.defaultWidth',
  MD2PDF_PLANTUML_DEFAULT_HEIGHT: 'plantuml.defaultHeight',
  MD2PDF_PLANTUML_TIMEOUT: 'plantuml.timeout',
  MD2PDF_PLANTUML_ENABLE_CACHING: 'plantuml.enableCaching',
  MD2PDF_PLANTUML_CACHE_ENABLED: 'plantuml.cache.enabled',
  MD2PDF_PLANTUML_CACHE_MAX_AGE: 'plantuml.cache.maxAge',
  MD2PDF_PLANTUML_CACHE_MAX_SIZE: 'plantuml.cache.maxSize',
  MD2PDF_PLANTUML_SHOW_ERROR_PLACEHOLDER:
    'plantuml.fallback.showErrorPlaceholder',
  MD2PDF_PLANTUML_ERROR_MESSAGE: 'plantuml.fallback.errorMessage',
  MD2PDF_MERMAID_ENABLED: 'mermaid.enabled',
  MD2PDF_MERMAID_THEME: 'mermaid.theme',
  MD2PDF_MERMAID_DEFAULT_WIDTH: 'mermaid.defaultWidth',
  MD2PDF_MERMAID_DEFAULT_HEIGHT: 'mermaid.defaultHeight',
  MD2PDF_MERMAID_TIMEOUT: 'mermaid.timeout',
  MD2PDF_MERMAID_ENABLE_CACHING: 'mermaid.enableCaching',
  MD2PDF_MERMAID_BACKGROUND_COLOR: 'mermaid.backgroundColor',
  MD2PDF_MERMAID_CDN_URL: 'mermaid.cdnUrl',
  MD2PDF_MERMAID_VIEWPORT_WIDTH: 'mermaid.viewportWidth',
  MD2PDF_MERMAID_VIEWPORT_HEIGHT: 'mermaid.viewportHeight',
  MD2PDF_MERMAID_CACHE_ENABLED: 'mermaid.cache.enabled',
  MD2PDF_MERMAID_CACHE_MAX_AGE: 'mermaid.cache.maxAge',
  MD2PDF_MERMAID_CACHE_MAX_SIZE: 'mermaid.cache.maxSize',
  MD2PDF_MERMAID_SHOW_ERROR_PLACEHOLDER:
    'mermaid.fallback.showErrorPlaceholder',
  MD2PDF_MERMAID_ERROR_MESSAGE: 'mermaid.fallback.errorMessage',
};
