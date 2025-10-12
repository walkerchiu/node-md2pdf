/**
 * Configuration management types
 */

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
}

export interface ConfigOptions {
  configPath?: string;
  useEnvironmentVariables?: boolean;
  environmentPrefix?: string;
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
    margin: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
    displayHeaderFooter: boolean;
    printBackground: boolean;
  };

  // TOC settings
  toc: {
    enabled: boolean;
    depth: number;
    title: {
      en: string;
      'zh-tw': string;
    };
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

  // Feature flags
  features: {
    enhancedServices: boolean;
    enhancedCli: boolean;
    newOrchestrator: boolean;
    forceLegacyMode: boolean;
  };
}
