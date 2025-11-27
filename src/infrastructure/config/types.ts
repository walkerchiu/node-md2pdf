/**
 * Configuration management types
 */

import type { HeadersFootersConfig } from '../../core/headers-footers';

export interface IConfigManager {
  get<T = unknown>(key: string, defaultValue?: T): T;
  set<T = unknown>(key: string, value: T): void;
  has(key: string): boolean;
  getAll(): Record<string, unknown>;
  save(): Promise<void>;
  onConfigCreated(callback: (path: string) => void): void;
  onConfigChanged(
    key: string | string[],
    callback: (newValue: unknown, oldValue: unknown, key: string) => void,
  ): void;
  setAndSave<T = unknown>(key: string, value: T): Promise<void>;
  getConfigPath(): string;

  // High-level config management methods
  getConfig(): MD2PDFConfig;
  updateConfig(config: MD2PDFConfig): Promise<void>;
}

export interface ConfigOptions {
  configPath?: string;
  useEnvironmentVariables?: boolean;
  environmentPrefix?: string;
}

export type PDFEngineStrategy =
  | 'health-first'
  | 'primary-first'
  | 'load-balanced'
  | 'capability-based'
  | 'adaptive';

export interface PDFMarginConfig {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface CSSTemplateConfig {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: number;
  maxWidth?: string;
  margin?: string;
  padding?: string;
}

export interface ConfigSchema {
  // Core settings
  language: {
    default: string;
    available: string[];
  };

  // PDF generation settings
  pdf: {
    format: 'A4' | 'A3' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    margin: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
    displayHeaderFooter: boolean;
    printBackground: boolean;
    scale?: number;
    preferCSSPageSize?: boolean;
    useEnhancedEngine: boolean;
    engines: {
      primary: string;
      fallback: string[];
      strategy:
        | 'health-first'
        | 'primary-first'
        | 'load-balanced'
        | 'capability-based'
        | 'adaptive';
      healthCheck: {
        interval: number;
        enabled: boolean;
      };
      resourceLimits: {
        maxConcurrentTasks: number;
        taskTimeout: number;
        memoryLimit: string;
      };
    };
  };

  // Template settings
  template?: {
    css?: {
      fontFamily?: string;
      fontSize?: string;
      lineHeight?: number;
      maxWidth?: string;
      margin?: string;
      padding?: string;
    };
  };

  // TOC settings
  toc: {
    enabled: boolean;
    depth: number;
    title?: {
      en: string;
      'zh-tw': string;
    };
  };

  // Rendering settings
  rendering: {
    forceAccuratePageNumbers: boolean;
    maxPerformanceImpact: number;
  };

  // Performance settings
  performance: {
    maxWorkers: number;
    timeout: number;
    memoryLimit: string;
  };

  // Logging settings (optional for backward compatibility)
  logging?: {
    level: 'error' | 'warn' | 'info' | 'debug';
    fileEnabled: boolean;
    filePath?: string;
    format: 'text' | 'json';
    maxFileSize: number;
    maxBackupFiles: number;
    enableRotation: boolean;
  };

  // PlantUML settings
  plantuml: {
    enabled: boolean;
    serverUrl: string;
    format: 'svg' | 'png';
    defaultWidth: number;
    defaultHeight: number;
    timeout: number; // request timeout in milliseconds
    enableCaching: boolean;
    cache: {
      enabled: boolean;
      maxAge: number; // in milliseconds
      maxSize: number; // max cache entries
    };
    fallback: {
      showErrorPlaceholder: boolean;
      errorMessage: string;
    };
  };

  // Mermaid settings
  mermaid: {
    enabled: boolean;
    theme: 'default' | 'dark' | 'forest' | 'neutral';
    defaultWidth: number;
    defaultHeight: number;
    timeout: number; // request timeout in milliseconds
    enableCaching: boolean;
    backgroundColor: string;
    cdnUrl: string;
    viewportWidth: number;
    viewportHeight: number;
    cache: {
      enabled: boolean;
      maxAge: number; // in milliseconds
      maxSize: number; // max cache entries
    };
    fallback: {
      showErrorPlaceholder: boolean;
      errorMessage: string;
    };
  };

  // Syntax highlighting settings
  syntaxHighlighting: {
    enabled: boolean;
    theme: string;
    enableLineNumbers: boolean;
    lineNumberStart: number;
    timeout: number;
    enableCaching: boolean;
    supportedLanguages: string[];
    languageAliases: Record<string, string>;
  };

  // Document metadata settings
  metadata: {
    enabled: boolean;
    autoExtraction: {
      fromFrontmatter: boolean;
      fromContent: boolean;
      fromFilename: boolean;
      computeStats: boolean;
    };
    defaults: {
      language: string;
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string;
      creator?: string;
      producer?: string;
    };
    frontmatterMapping: Record<string, string>;
    validation: {
      requireTitle: boolean;
      requireAuthor: boolean;
      maxKeywordLength: number;
      maxSubjectLength: number;
    };
  };

  // Password protection settings
  passwordProtection?: {
    enabled: boolean;
    userPassword?: string;
    ownerPassword?: string;
    permissions?: {
      printing?: boolean;
      modifying?: boolean;
      copying?: boolean;
      annotating?: boolean;
      fillingForms?: boolean;
      contentAccessibility?: boolean;
      documentAssembly?: boolean;
    };
  };

  // Headers and footers settings
  headersFooters: HeadersFootersConfig;
}

// Main configuration type alias
export type MD2PDFConfig = ConfigSchema;
