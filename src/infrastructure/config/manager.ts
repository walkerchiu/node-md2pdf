/**
 * Configuration Manager implementation
 */

import * as os from 'os';
import * as path from 'path';

import * as fs from 'fs-extra';

import { defaultConfig, environmentMappings } from './defaults';

import type { IConfigManager, ConfigOptions } from './types';

export class ConfigManager implements IConfigManager {
  private config: Record<string, unknown>;
  private configPath: string;
  private options: ConfigOptions;

  constructor(options: ConfigOptions = {}) {
    this.options = {
      useEnvironmentVariables: true,
      environmentPrefix: 'MD2PDF_',
      ...options,
    };
    this.configPath =
      options.configPath || path.join(os.homedir(), '.md2pdf', 'config.json');
    this.config = this.deepClone(defaultConfig) as Record<string, unknown>;

    // Load environment variables if enabled
    if (this.options.useEnvironmentVariables) {
      this.loadEnvironmentVariables();
    }
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
      await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    } catch (error) {
      // Silently fail for now, as config saving is not critical
      // In a real implementation, we might want to log this
    }
  }

  async load(): Promise<void> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const savedConfig = await fs.readJson(this.configPath);
        this.config = this.mergeDeep(this.config, savedConfig) as Record<
          string,
          unknown
        >;
      }
    } catch (error) {
      // Silently fail and use defaults
      // In a real implementation, we might want to log this
    }

    // Reload environment variables to override file config
    if (this.options.useEnvironmentVariables) {
      this.loadEnvironmentVariables();
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
}
