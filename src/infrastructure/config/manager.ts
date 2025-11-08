/**
 * Improved Configuration Manager implementation
 *
 * Core principles:
 * 1. Single source of truth: User preferences file (config.json in current directory)
 * 2. Default configuration used only for initialization
 * 3. All system behavior follows user preferences
 * 4. Changes immediately persisted
 * 5. UI display matches actual configuration
 */

import * as path from 'path';

import * as fs from 'fs-extra';

import {
  defaultConfig,
  environmentMappings,
  SYSTEM_DEFINED_KEYS,
} from './defaults';

import type { IConfigManager, ConfigOptions } from './types';

export class ConfigManager implements IConfigManager {
  private config!: Record<string, unknown>;
  private configPath: string;
  private options: ConfigOptions;
  private configCreatedCallbacks: ((path: string) => void)[] = [];
  private configChangedCallbacks: Map<
    string,
    ((newValue: unknown, oldValue: unknown, key: string) => void)[]
  > = new Map();

  constructor(options: ConfigOptions = {}) {
    this.options = {
      useEnvironmentVariables: true,
      environmentPrefix: 'MD2PDF_',
      ...options,
    };
    this.configPath =
      options.configPath || path.join(process.cwd(), 'config.json');

    // Initialize configuration with proper user preferences management
    this.initializeConfiguration();
  }

  get<T = unknown>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.config, key);
    return value !== undefined ? (value as T) : (defaultValue as T);
  }

  set<T = unknown>(key: string, value: T): void {
    this.setNestedValue(this.config, key, value);
  }

  has(key: string): boolean {
    return this.getNestedValue(this.config, key) !== undefined;
  }

  getAll(): Record<string, unknown> {
    return this.deepClone(this.config) as Record<string, unknown>;
  }

  async save(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));

      // Filter out system-defined values before saving
      const userConfigurableSettings = this.filterUserConfigurableSettings(
        this.config,
      );

      await fs.writeJson(this.configPath, userConfigurableSettings, {
        spaces: 2,
      });
    } catch (error) {
      // Silently fail for now, as config saving is not critical
      // In a real implementation, we might want to log this
    }
  }

  /**
   * Initialize configuration with proper user preferences management
   *
   * Configuration loading priority:
   * 1. Check if user preferences file exists
   * 2. If not exists: Create user preferences file from defaults
   * 3. If exists: Load user preferences as primary source
   * 4. Apply environment variable overrides
   */
  private initializeConfiguration(): void {
    // Start with default configuration
    this.config = this.deepClone(defaultConfig) as Record<string, unknown>;

    // Check if user preferences file exists
    if (!fs.pathExistsSync(this.configPath)) {
      // User preferences file doesn't exist, create it from defaults
      this.createUserPreferencesFromDefaultsSync();
    } else {
      // User preferences file exists, load it as the primary source
      this.loadUserConfigSync();
    }

    // Apply environment variable overrides
    if (this.options.useEnvironmentVariables) {
      this.loadEnvironmentVariables();
    }
  }

  /**
   * Filter out system-defined keys from configuration object
   * These keys should not be saved to user config file
   */
  private filterUserConfigurableSettings(
    config: Record<string, unknown>,
  ): Record<string, unknown> {
    const filteredConfig = this.deepClone(config) as Record<string, unknown>;

    // Remove system-defined keys
    SYSTEM_DEFINED_KEYS.forEach((key: string) => {
      this.deleteNestedValue(filteredConfig, key);
    });

    return filteredConfig;
  }

  /**
   * Delete a nested property from an object
   */
  private deleteNestedValue(obj: Record<string, unknown>, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) return;

    let current: Record<string, unknown> = obj;
    for (const key of keys) {
      if (current[key] && typeof current[key] === 'object') {
        current = current[key] as Record<string, unknown>;
      } else {
        return; // Path doesn't exist
      }
    }

    delete current[lastKey];
  }

  /**
   * Synchronously create user preferences file from default configuration
   * This ensures the user has a preferences file they can modify
   */
  private createUserPreferencesFromDefaultsSync(): void {
    try {
      // Ensure the directory exists
      fs.ensureDirSync(path.dirname(this.configPath));

      // Filter out system-defined values before saving
      const userConfigurableSettings = this.filterUserConfigurableSettings(
        this.config,
      );

      // Write the filtered configuration as user preferences
      fs.writeJsonSync(this.configPath, userConfigurableSettings, {
        spaces: 2,
      });

      // Notify listeners that config file was created
      this.notifyConfigCreated();
    } catch (error) {
      // If creation fails, continue with default config in memory
      console.warn(
        `Failed to create user preferences file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Synchronously load user configuration file
   * This is called during construction to ensure config is available immediately
   */
  private loadUserConfigSync(): void {
    try {
      const userConfig = fs.readJsonSync(this.configPath);
      this.config = this.mergeDeep(this.config, userConfig) as Record<
        string,
        unknown
      >;
    } catch (error) {
      // If loading fails, fall back to creating from defaults
      console.warn(
        `Failed to load user preferences, recreating from defaults: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.createUserPreferencesFromDefaultsSync();
    }
  }

  private loadEnvironmentVariables(): void {
    for (const [envVar, configPath] of Object.entries(environmentMappings)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        const parsedValue = this.parseEnvironmentValue(envValue);
        this.setNestedValue(this.config, configPath, parsedValue);
      }
    }
  }

  private parseEnvironmentValue(value: string): unknown {
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try to parse as number
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue)) return numValue;

    // Return as string
    return value;
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
  ): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    }, obj);
    target[lastKey] = value;
  }

  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map((item) => this.deepClone(item));

    const cloned: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return cloned;
  }

  private mergeDeep(target: unknown, source: unknown): unknown {
    const result = this.deepClone(target) as Record<string, unknown>;
    const sourceObj = source as Record<string, unknown>;

    for (const key in sourceObj) {
      if (Object.prototype.hasOwnProperty.call(sourceObj, key)) {
        const sourceValue = sourceObj[key];
        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue)
        ) {
          result[key] = this.mergeDeep(result[key] || {}, sourceValue);
        } else {
          result[key] = sourceValue;
        }
      }
    }

    return result;
  }

  /**
   * Register a callback to be called when user preferences file is created
   * This allows other components to react to config file creation
   */
  onConfigCreated(callback: (path: string) => void): void {
    this.configCreatedCallbacks.push(callback);
  }

  /**
   * Register a callback to be called when specific configuration values change
   * Supports both single key and multiple keys monitoring
   */
  onConfigChanged(
    key: string | string[],
    callback: (newValue: unknown, oldValue: unknown, key: string) => void,
  ): void {
    const keys = Array.isArray(key) ? key : [key];

    keys.forEach((k) => {
      if (!this.configChangedCallbacks.has(k)) {
        this.configChangedCallbacks.set(k, []);
      }
      this.configChangedCallbacks.get(k)!.push(callback);
    });
  }

  /**
   * Enhanced setAndSave with change notification
   */
  async setAndSave<T = unknown>(key: string, value: T): Promise<void> {
    const oldValue = this.getNestedValue(this.config, key);
    this.setNestedValue(this.config, key, value);
    await this.save();

    // Notify listeners of the change
    this.notifyConfigChanged(key, value, oldValue);
  }

  /**
   * Notify all listeners that config file was created
   * This follows the observer pattern for better decoupling
   */
  private notifyConfigCreated(): void {
    this.configCreatedCallbacks.forEach((callback) => {
      try {
        callback(this.configPath);
      } catch (error) {
        // Silently handle callback errors to prevent system disruption
        // In production, this could be logged
      }
    });
  }

  /**
   * Notify all listeners that a configuration value has changed
   * Supports nested key change notifications (e.g., 'logging.fileEnabled')
   */
  private notifyConfigChanged(
    key: string,
    newValue: unknown,
    oldValue: unknown,
  ): void {
    // Direct key match
    if (this.configChangedCallbacks.has(key)) {
      this.configChangedCallbacks.get(key)!.forEach((callback) => {
        try {
          callback(newValue, oldValue, key);
        } catch (error) {
          // Silently handle callback errors to prevent system disruption
        }
      });
    }

    // Check for parent key matches (e.g., 'logging' matches 'logging.fileEnabled')
    const keyParts = key.split('.');
    for (let i = 1; i < keyParts.length; i++) {
      const parentKey = keyParts.slice(0, i).join('.');
      if (this.configChangedCallbacks.has(parentKey)) {
        this.configChangedCallbacks.get(parentKey)!.forEach((callback) => {
          try {
            callback(newValue, oldValue, key);
          } catch (error) {
            // Silently handle callback errors
          }
        });
      }
    }
  }

  /**
   * Get the path where user preferences are stored
   * Useful for external components that need to know the config location
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Get the complete configuration as typed MD2PDFConfig
   */
  getConfig(): import('./types').MD2PDFConfig {
    return this.config as unknown as import('./types').MD2PDFConfig;
  }

  /**
   * Update the complete configuration with typed MD2PDFConfig
   */
  async updateConfig(config: import('./types').MD2PDFConfig): Promise<void> {
    this.config = config as unknown as Record<string, unknown>;
    await this.save();
  }
}
