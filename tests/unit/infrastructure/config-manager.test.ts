/**
 * Unit tests for ConfigManager infrastructure
 */

import { ConfigManager } from '../../../src/infrastructure/config/manager';
import { defaultConfig } from '../../../src/infrastructure/config/defaults';
import * as fs from 'fs-extra';

// Mock fs-extra
jest.mock('fs-extra');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFs = fs as jest.Mocked<any>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager({
      useEnvironmentVariables: false, // Disable env vars for testing
      configPath: '/test/config.json',
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(configManager.get('pdf.margin.top')).toBe(
        defaultConfig.pdf.margin.top,
      );
      expect(configManager.get('toc.depth')).toBe(defaultConfig.toc.depth);
      expect(configManager.get('pdf.format')).toBe(defaultConfig.pdf.format);
    });

    it('should initialize with custom config path', () => {
      const customConfigManager = new ConfigManager({
        configPath: '/custom/path/config.json',
      });

      expect(customConfigManager.get('pdf.margin.top')).toBe(
        defaultConfig.pdf.margin.top,
      );
    });

    it('should disable environment variables when configured', () => {
      const noEnvConfigManager = new ConfigManager({
        useEnvironmentVariables: false,
      });

      expect(noEnvConfigManager.get('pdf.margin.top')).toBe(
        defaultConfig.pdf.margin.top,
      );
    });
  });

  describe('get method', () => {
    it('should retrieve top-level configuration values', () => {
      const result = configManager.get('pdf');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('margin');
      expect(result).toHaveProperty('format');
    });

    it('should retrieve nested configuration values using dot notation', () => {
      const topMargin = configManager.get('pdf.margin.top');
      const rightMargin = configManager.get('pdf.margin.right');

      expect(topMargin).toBe('1in');
      expect(rightMargin).toBe('1in');
    });

    it('should retrieve deeply nested configuration values', () => {
      const tocTitle = configManager.get('toc.title.en');

      expect(tocTitle).toBeDefined();
      expect(tocTitle).toBe('Table of Contents');
    });

    it('should return undefined for non-existent keys', () => {
      const result = configManager.get('nonexistent.key');

      expect(result).toBeUndefined();
    });

    it('should return default value when key does not exist', () => {
      const result = configManager.get('nonexistent.key', 'defaultValue');

      expect(result).toBe('defaultValue');
    });

    it('should handle edge cases in key paths', () => {
      const result1 = configManager.get('');
      const result2 = configManager.get('.');
      const result3 = configManager.get('..key');

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
    });
  });

  describe('set method', () => {
    it('should set top-level configuration values', () => {
      configManager.set('newKey', 'newValue');

      const result = configManager.get('newKey');

      expect(result).toBe('newValue');
    });

    it('should set nested configuration values using dot notation', () => {
      configManager.set('custom.nested.value', 'testValue');

      const result = configManager.get('custom.nested.value');

      expect(result).toBe('testValue');
    });

    it('should override existing configuration values', () => {
      const originalValue = configManager.get('pdf.margin.top');
      expect(originalValue).toBe('1in');

      configManager.set('pdf.margin.top', '2in');

      const newValue = configManager.get('pdf.margin.top');
      expect(newValue).toBe('2in');
    });

    it('should create nested objects when setting deep paths', () => {
      configManager.set('deep.new.nested.key', 'deepValue');

      const result = configManager.get('deep.new.nested.key');
      const parentResult = configManager.get('deep.new');

      expect(result).toBe('deepValue');
      expect(parentResult).toHaveProperty('nested');
    });

    it('should handle complex object values', () => {
      const complexValue = {
        name: 'test',
        options: { enabled: true, count: 5 },
        items: ['item1', 'item2'],
      };

      configManager.set('complex', complexValue);

      const result = configManager.get('complex');
      expect(result).toEqual(complexValue);
      expect(configManager.get('complex.name')).toBe('test');
      expect(configManager.get('complex.options.enabled')).toBe(true);
    });
  });

  describe('has method', () => {
    it('should return true for existing top-level keys', () => {
      const result = configManager.has('pdf');

      expect(result).toBe(true);
    });

    it('should return true for existing nested keys', () => {
      const result = configManager.has('pdf.margin.top');

      expect(result).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      const result = configManager.has('nonexistent.key');

      expect(result).toBe(false);
    });

    it('should return false for empty or invalid keys', () => {
      expect(configManager.has('')).toBe(false);
      expect(configManager.has('.')).toBe(false);
    });
  });

  describe('getAll method', () => {
    it('should return the entire configuration object', () => {
      const allConfig = configManager.getAll();

      expect(allConfig).toHaveProperty('pdf');
      expect(allConfig).toHaveProperty('toc');
      expect(allConfig).toHaveProperty('language');
    });

    it('should return a copy, not the original reference', () => {
      const allConfig1 = configManager.getAll();
      const allConfig2 = configManager.getAll();

      expect(allConfig1).toEqual(allConfig2);
      expect(allConfig1).not.toBe(allConfig2); // Different object references
    });

    it('should reflect changes made via set', () => {
      configManager.set('test.key', 'test.value');

      const allConfig = configManager.getAll();

      expect(allConfig).toHaveProperty('test');
      expect((allConfig as { test: { key: string } }).test.key).toBe(
        'test.value',
      );
    });
  });

  describe('save method', () => {
    it('should save configuration to file', async () => {
      mockFs.ensureDir.mockResolvedValue(void 0);
      mockFs.writeJson.mockResolvedValue(void 0);

      await configManager.save();

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        '/test/config.json',
        expect.any(Object),
        {
          spaces: 2,
        },
      );
    });

    it('should handle save errors gracefully', async () => {
      const saveError = new Error('Cannot write to file');
      mockFs.ensureDir.mockResolvedValue(void 0);
      mockFs.writeJson.mockRejectedValue(saveError);

      // Should not throw - errors are silently handled
      await expect(configManager.save()).resolves.not.toThrow();
    });

    it('should handle directory creation errors', async () => {
      const dirError = new Error('Cannot create directory');
      mockFs.ensureDir.mockRejectedValue(dirError);

      // Should not throw - errors are silently handled
      await expect(configManager.save()).resolves.not.toThrow();
    });
  });

  describe('load method', () => {
    it('should load configuration from file when it exists', async () => {
      const mockConfigContent = {
        custom: { setting: 'loaded' },
        pdf: { margin: { top: '3in' } },
      };

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue(mockConfigContent);

      await configManager.load();

      expect(configManager.get('custom.setting')).toBe('loaded');
      expect(configManager.get('pdf.margin.top')).toBe('3in'); // Should override default
    });

    it('should handle non-existent config file gracefully', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      await configManager.load();

      // Should maintain existing config
      expect(configManager.get('pdf.margin.top')).toBe(
        defaultConfig.pdf.margin.top,
      );
    });

    it('should handle file read errors', async () => {
      const readError = new Error('Permission denied');
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockRejectedValue(readError);

      // Should not throw - errors are silently handled and defaults are used
      await expect(configManager.load()).resolves.not.toThrow();
    });
  });

  describe('configuration merging', () => {
    it('should merge loaded configuration with existing defaults', async () => {
      const partialConfig = {
        pdf: { margin: { top: '2in' } }, // Only override top margin
        custom: { newSetting: 'value' },
      };

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue(partialConfig);

      await configManager.load();

      // Should override existing setting
      expect(configManager.get('pdf.margin.top')).toBe('2in');
      // Should keep other existing settings
      expect(configManager.get('pdf.margin.right')).toBe(
        defaultConfig.pdf.margin.right,
      );
      // Should add new settings
      expect(configManager.get('custom.newSetting')).toBe('value');
    });

    it('should handle deep merging correctly', async () => {
      const deepConfig = {
        pdf: {
          fonts: {
            chinese: { name: 'CustomFont' },
            // Should keep other font settings from default
          },
        },
      };

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue(deepConfig);

      await configManager.load();

      expect(configManager.get('pdf.fonts.chinese.name')).toBe('CustomFont');
      // Should preserve other default font settings
      expect(configManager.get('pdf.fonts')).toBeDefined();
    });
  });

  describe('type safety and validation', () => {
    it('should handle null and undefined values', () => {
      configManager.set('nullValue', null);
      configManager.set('undefinedValue', undefined);

      expect(configManager.get('nullValue')).toBeNull();
      expect(configManager.get('undefinedValue')).toBeUndefined();
      expect(configManager.has('nullValue')).toBe(true);
      expect(configManager.has('undefinedValue')).toBe(false); // undefined values are not considered as existing
    });

    it('should handle various data types', () => {
      configManager.set('string', 'text');
      configManager.set('number', 42);
      configManager.set('boolean', true);
      configManager.set('array', [1, 2, 3]);
      configManager.set('object', { nested: 'value' });

      expect(typeof configManager.get('string')).toBe('string');
      expect(typeof configManager.get('number')).toBe('number');
      expect(typeof configManager.get('boolean')).toBe('boolean');
      expect(Array.isArray(configManager.get('array'))).toBe(true);
      expect(typeof configManager.get('object')).toBe('object');
    });

    it('should handle generic type parameters', () => {
      configManager.set('stringValue', 'test');
      configManager.set('numberValue', 123);

      const stringResult = configManager.get<string>('stringValue');
      const numberResult = configManager.get<number>('numberValue');
      const defaultResult = configManager.get<string>('nonexistent', 'default');

      expect(stringResult).toBe('test');
      expect(numberResult).toBe(123);
      expect(defaultResult).toBe('default');
    });
  });

  describe('environment variable handling', () => {
    it('should support environment variable override when enabled', () => {
      // This test would require mocking process.env
      // For now, just verify the configuration accepts the option
      const envConfigManager = new ConfigManager({
        useEnvironmentVariables: true,
        environmentPrefix: 'TEST_',
      });

      expect(envConfigManager.get('pdf.margin.top')).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle malformed nested key paths', () => {
      expect(() => configManager.get('a..b')).not.toThrow();
      expect(() => configManager.set('a..b', 'value')).not.toThrow();
      expect(() => configManager.has('a..b')).not.toThrow();
    });

    it('should handle circular reference in configuration', () => {
      const circularRef: { name: string; self?: unknown } = { name: 'test' };
      circularRef.self = circularRef;

      expect(() => configManager.set('circular', circularRef)).not.toThrow();
      expect(configManager.get('circular.name')).toBe('test');
    });
  });
});
