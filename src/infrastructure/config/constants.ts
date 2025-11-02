/**
 * Configuration constants
 * Pure constants without dependencies to avoid test issues
 */

// Default margin values
export const DEFAULT_MARGINS = {
  NORMAL: {
    top: '0.75in',
    right: '0.75in',
    bottom: '0.75in',
    left: '0.75in',
  },
  WITH_HEADER_FOOTER: {
    top: '1.25in',
    right: '0.75in',
    bottom: '1.25in',
    left: '0.75in',
  },
} as const;

// Default CSS template values
export const DEFAULT_CSS_TEMPLATE = {
  FONT_FAMILY:
    'system-ui, -apple-system, "Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  FONT_SIZE: '16px',
  LINE_HEIGHT: 1.6,
  MAX_WIDTH: '800px',
  MARGIN: '0 auto',
  PADDING: '1.5rem',
  CODE: {
    FONT_FAMILY:
      '"SFMono-Regular", "Monaco", "Inconsolata", "Liberation Mono", "Courier New", monospace',
    FONT_FAMILY_WITH_CHINESE:
      '"SFMono-Regular", "Monaco", "Source Han Sans SC", "Noto Sans Mono CJK SC", "Liberation Mono", "Courier New", monospace',
    FONT_SIZE: '14px',
    LINE_HEIGHT: 1.45,
  },
} as const;

// Default PDF generator options
export const DEFAULT_PDF_OPTIONS = {
  FORMAT: 'A4' as const,
  ORIENTATION: 'portrait' as const,
  DISPLAY_HEADER_FOOTER: false,
  PRINT_BACKGROUND: true,
  SCALE: 1,
  PREFER_CSS_PAGE_SIZE: false,
} as const;

// Default PlantUML values
export const DEFAULT_PLANTUML = {
  SERVER_URL: 'https://www.plantuml.com/plantuml',
  FORMAT: 'png' as const,
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
  TIMEOUT: 10000,
  ENABLE_CACHING: true,
  USE_LOCAL_RENDERER: true, // Default to using local renderer
  LOCAL_RENDERER: (() => {
    // Dynamic PlantUML path resolution
    try {
      const {
        getDefaultPlantUMLConfig,
      } = require('../../utils/plantuml-path-resolver');
      return getDefaultPlantUMLConfig();
    } catch (error) {
      // Fallback to static configuration
      return {
        JAVA_PATH: 'java',
        JAR_PATH:
          process.platform === 'win32'
            ? 'C:\\plantuml\\plantuml.jar'
            : '/usr/local/bin/plantuml.jar',
        COMMAND_PATH: undefined,
        USE_COMMAND: false,
        JAVA_OPTIONS: ['-Xmx1024m', '-Djava.awt.headless=true'],
        TIMEOUT: 30000,
        DEBUG: false,
      };
    }
  })(),
  CACHE: {
    ENABLED: true,
    MAX_AGE: 3600000, // 1 hour in milliseconds
    MAX_SIZE: 100,
  },
  FALLBACK: {
    SHOW_ERROR_PLACEHOLDER: true,
    ERROR_MESSAGE: 'PlantUML diagram rendering failed',
  },
} as const;

// Default Mermaid values
export const DEFAULT_MERMAID = {
  THEME: 'default' as const,
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
  TIMEOUT: 10000,
  ENABLE_CACHING: true,
  BACKGROUND_COLOR: 'white',
  CDN_URL: 'https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.min.js',
  VIEWPORT_WIDTH: 1200,
  VIEWPORT_HEIGHT: 800,
} as const;

// Default Syntax Highlighting values
export const DEFAULT_SYNTAX_HIGHLIGHTING = {
  DEFAULT_THEME: 'default' as const,
  ENABLE_LINE_NUMBERS: true,
  LINE_NUMBER_START: 1,
  ENABLE_CACHE: true,
  TIMEOUT: 5000,
  SUPPORTED_LANGUAGES: [
    'apacheconf',
    'bash',
    'c',
    'clojure',
    'cpp',
    'csharp',
    'css',
    'dart',
    'diff',
    'docker',
    'elixir',
    'erlang',
    'git',
    'go',
    'graphql',
    'groovy',
    'haskell',
    'hcl',
    'html', // Core language
    'ini',
    'java',
    'javascript',
    'json',
    'jsx',
    'kotlin',
    'latex',
    'less',
    'lua',
    'makefile',
    'markdown',
    'matlab',
    'nginx',
    'perl',
    'php',
    'powershell',
    'protobuf',
    'python',
    'r',
    'ruby',
    'rust',
    'scala',
    'scss',
    'shell', // Alias for bash
    'sql',
    'swift',
    'toml',
    'tsx',
    'typescript',
    'verilog',
    'vhdl',
    'vim',
    'vue',
    'xml', // Core language
    'yaml',
  ],
  LANGUAGE_ALIASES: {
    ansible: 'yaml',
    apache: 'apacheconf',
    'c#': 'csharp',
    'c++': 'cpp',
    cs: 'csharp',
    css: 'css',
    dockerfile: 'docker',
    go: 'go',
    html: 'html',
    js: 'javascript',
    json: 'json',
    kt: 'kotlin',
    less: 'less',
    make: 'makefile',
    md: 'markdown',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    scala: 'scala',
    scss: 'scss',
    sh: 'bash',
    shell: 'bash',
    sql: 'sql',
    swift: 'swift',
    terraform: 'hcl',
    ts: 'typescript',
    xml: 'xml',
    yml: 'yaml',
  },
} as const;

/**
 * Configuration constants and keys for type-safe access
 */
export const CONFIG_KEYS = {
  PDF: {
    FORMAT: 'pdf.format',
    ORIENTATION: 'pdf.orientation',
    MARGIN: {
      TOP: 'pdf.margin.top',
      RIGHT: 'pdf.margin.right',
      BOTTOM: 'pdf.margin.bottom',
      LEFT: 'pdf.margin.left',
      ALL: 'pdf.margin',
    },
    DISPLAY_HEADER_FOOTER: 'pdf.displayHeaderFooter',
    PRINT_BACKGROUND: 'pdf.printBackground',
    USE_ENHANCED_ENGINE: 'pdf.useEnhancedEngine',
    ENGINES: {
      PRIMARY: 'pdf.engines.primary',
      FALLBACK: 'pdf.engines.fallback',
      STRATEGY: 'pdf.engines.strategy',
      HEALTH_CHECK: {
        INTERVAL: 'pdf.engines.healthCheck.interval',
        ENABLED: 'pdf.engines.healthCheck.enabled',
      },
      RESOURCE_LIMITS: {
        MAX_CONCURRENT_TASKS: 'pdf.engines.resourceLimits.maxConcurrentTasks',
        TASK_TIMEOUT: 'pdf.engines.resourceLimits.taskTimeout',
        MEMORY_LIMIT: 'pdf.engines.resourceLimits.memoryLimit',
      },
    },
  },
  TEMPLATE: {
    CSS: {
      FONT_FAMILY: 'template.css.fontFamily',
      FONT_SIZE: 'template.css.fontSize',
      LINE_HEIGHT: 'template.css.lineHeight',
      MAX_WIDTH: 'template.css.maxWidth',
      MARGIN: 'template.css.margin',
      PADDING: 'template.css.padding',
    },
  },
  TOC: {
    ENABLED: 'toc.enabled',
    DEPTH: 'toc.depth',
    TITLE: 'toc.title',
  },
  LANGUAGE: {
    DEFAULT: 'language.default',
    AVAILABLE: 'language.available',
  },
  PERFORMANCE: {
    MAX_WORKERS: 'performance.maxWorkers',
    TIMEOUT: 'performance.timeout',
    MEMORY_LIMIT: 'performance.memoryLimit',
  },
  PLANTUML: {
    ENABLED: 'plantuml.enabled',
    SERVER_URL: 'plantuml.serverUrl',
    FORMAT: 'plantuml.format',
    DEFAULT_WIDTH: 'plantuml.defaultWidth',
    DEFAULT_HEIGHT: 'plantuml.defaultHeight',
    TIMEOUT: 'plantuml.timeout',
    ENABLE_CACHING: 'plantuml.enableCaching',
    CACHE: {
      ENABLED: 'plantuml.cache.enabled',
      MAX_AGE: 'plantuml.cache.maxAge',
      MAX_SIZE: 'plantuml.cache.maxSize',
    },
    FALLBACK: {
      SHOW_ERROR_PLACEHOLDER: 'plantuml.fallback.showErrorPlaceholder',
      ERROR_MESSAGE: 'plantuml.fallback.errorMessage',
    },
  },
  MERMAID: {
    ENABLED: 'mermaid.enabled',
    THEME: 'mermaid.theme',
    DEFAULT_WIDTH: 'mermaid.defaultWidth',
    DEFAULT_HEIGHT: 'mermaid.defaultHeight',
    TIMEOUT: 'mermaid.timeout',
    ENABLE_CACHING: 'mermaid.enableCaching',
    BACKGROUND_COLOR: 'mermaid.backgroundColor',
    CDN_URL: 'mermaid.cdnUrl',
    VIEWPORT_WIDTH: 'mermaid.viewportWidth',
    VIEWPORT_HEIGHT: 'mermaid.viewportHeight',
    CACHE: {
      ENABLED: 'mermaid.cache.enabled',
      MAX_AGE: 'mermaid.cache.maxAge',
      MAX_SIZE: 'mermaid.cache.maxSize',
    },
    FALLBACK: {
      SHOW_ERROR_PLACEHOLDER: 'mermaid.fallback.showErrorPlaceholder',
      ERROR_MESSAGE: 'mermaid.fallback.errorMessage',
    },
  },
  SYNTAX_HIGHLIGHTING: {
    ENABLED: 'syntaxHighlighting.enabled',
    THEME: 'syntaxHighlighting.theme',
    ENABLE_LINE_NUMBERS: 'syntaxHighlighting.enableLineNumbers',
    LINE_NUMBER_START: 'syntaxHighlighting.lineNumberStart',
    TIMEOUT: 'syntaxHighlighting.timeout',
    ENABLE_CACHING: 'syntaxHighlighting.enableCaching',
    SUPPORTED_LANGUAGES: 'syntaxHighlighting.supportedLanguages',
    LANGUAGE_ALIASES: 'syntaxHighlighting.languageAliases',
  },
  FEATURES: {
    ENHANCED_SERVICES: 'features.enhancedServices',
    ENHANCED_CLI: 'features.enhancedCli',
    NEW_ORCHESTRATOR: 'features.newOrchestrator',
    FORCE_LEGACY_MODE: 'features.forceLegacyMode',
  },
} as const;
