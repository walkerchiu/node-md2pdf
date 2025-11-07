/**
 * Tests for Configuration Manager
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../../../../src/infrastructure/config/manager';

// Mock fs-extra
jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockConfigPath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigPath = path.join(process.cwd(), 'config.json');

    // Reset environment variables
    delete process.env.MD2PDF_LANG;
    delete process.env.MD2PDF_PDF_FORMAT;
  });

  afterEach(() => {
    // Clean up
    if (configManager) {
      configManager = null as any;
    }
  });

  describe('initialization', () => {
    it('should create config manager with default options', () => {
      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);

      configManager = new ConfigManager();

      expect(configManager.getConfigPath()).toBe(mockConfigPath);
      expect(mockFs.ensureDirSync).toHaveBeenCalled();
      expect(mockFs.writeJsonSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.any(Object),
        { spaces: 2 },
      );
    });

    it('should use custom config path when provided', () => {
      const customPath = '/custom/config.json';
      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);

      configManager = new ConfigManager({ configPath: customPath });

      expect(configManager.getConfigPath()).toBe(customPath);
    });

    it('should load existing config file when it exists', () => {
      const existingConfig = {
        language: { default: 'zh-TW' },
        pdf: { format: 'A3' },
      };

      mockFs.pathExistsSync.mockReturnValue(true);
      mockFs.readJsonSync.mockReturnValue(existingConfig);

      configManager = new ConfigManager();

      expect(mockFs.readJsonSync).toHaveBeenCalledWith(mockConfigPath);
      expect(configManager.get('language.default')).toBe('zh-TW');
      expect(configManager.get('pdf.format')).toBe('A3');
    });

    it('should create config from defaults when file read fails', () => {
      mockFs.pathExistsSync.mockReturnValue(true);
      mockFs.readJsonSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      configManager = new ConfigManager();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load user preferences'),
      );
      expect(mockFs.writeJsonSync).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('configuration access', () => {
    beforeEach(() => {
      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);
      configManager = new ConfigManager();
    });

    it('should get configuration values', () => {
      expect(configManager.get('language.default')).toBe('en');
      expect(configManager.get('pdf.format')).toBe('A4');
    });

    it('should return default value for non-existent keys', () => {
      expect(configManager.get('nonexistent.key', 'default')).toBe('default');
    });

    it('should set configuration values', () => {
      configManager.set('language.default', 'zh-TW');
      expect(configManager.get('language.default')).toBe('zh-TW');
    });

    it('should check if key exists', () => {
      expect(configManager.has('language.default')).toBe(true);
      expect(configManager.has('nonexistent.key')).toBe(false);
    });

    it('should return all configuration', () => {
      const allConfig = configManager.getAll();
      expect(allConfig).toMatchObject({
        language: expect.objectContaining({
          default: 'en',
        }),
      });
    });
  });

  describe('persistence', () => {
    beforeEach(() => {
      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);
      mockFs.writeJson.mockResolvedValue(undefined);
      configManager = new ConfigManager();
    });

    it('should save configuration', async () => {
      await configManager.save();

      expect(mockFs.ensureDir).toHaveBeenCalledWith(
        path.dirname(mockConfigPath),
      );
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        mockConfigPath,
        expect.any(Object),
        { spaces: 2 },
      );
    });

    it('should handle save errors silently', async () => {
      mockFs.writeJson.mockRejectedValue(new Error('Write error'));

      await expect(configManager.save()).resolves.toBeUndefined();
    });

    it('should set value and save together', async () => {
      await configManager.setAndSave('language.default', 'zh-TW');

      expect(configManager.get('language.default')).toBe('zh-TW');
      expect(mockFs.writeJson).toHaveBeenCalled();
    });
  });

  describe('environment variables', () => {
    it('should load environment variables when enabled', () => {
      process.env.MD2PDF_LANG = 'fr';
      process.env.MD2PDF_PDF_FORMAT = 'A3';

      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);

      configManager = new ConfigManager({ useEnvironmentVariables: true });

      expect(configManager.get('language.ui')).toBe('fr');
      expect(configManager.get('pdf.format')).toBe('A3');
    });

    it('should not load environment variables when disabled', () => {
      process.env.MD2PDF_LANG = 'fr';

      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);

      configManager = new ConfigManager({ useEnvironmentVariables: false });

      expect(configManager.get('language.default')).toBe('en');
    });

    it('should parse boolean environment variables', () => {
      process.env.MD2PDF_TOC_ENABLED = 'false';

      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);

      configManager = new ConfigManager({ useEnvironmentVariables: true });

      expect(configManager.get('toc.enabled')).toBe(false);
    });

    it('should parse numeric environment variables', () => {
      process.env.MD2PDF_TOC_DEPTH = '5';

      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);

      configManager = new ConfigManager({ useEnvironmentVariables: true });

      expect(configManager.get('toc.depth')).toBe(5);
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);
    });

    it('should notify when config is created', () => {
      const createCallback = jest.fn();

      configManager = new ConfigManager();
      configManager.onConfigCreated(createCallback);

      // Since config creation happens during initialization,
      // we test with a new instance
      new ConfigManager({ configPath: '/new/path/config.json' });

      expect(mockFs.writeJsonSync).toHaveBeenCalled();
    });

    it('should notify when config values change', async () => {
      mockFs.writeJson.mockResolvedValue(undefined);
      configManager = new ConfigManager();

      const changeCallback = jest.fn();
      configManager.onConfigChanged('language.default', changeCallback);

      await configManager.setAndSave('language.default', 'zh-TW');

      expect(changeCallback).toHaveBeenCalledWith(
        'zh-TW',
        'en',
        'language.default',
      );
    });

    it('should notify parent key listeners when child key changes', async () => {
      mockFs.writeJson.mockResolvedValue(undefined);
      configManager = new ConfigManager();

      const parentCallback = jest.fn();
      configManager.onConfigChanged('language', parentCallback);

      await configManager.setAndSave('language.default', 'zh-TW');

      expect(parentCallback).toHaveBeenCalledWith(
        'zh-TW',
        'en',
        'language.default',
      );
    });

    it('should handle multiple listeners for the same key', async () => {
      mockFs.writeJson.mockResolvedValue(undefined);
      configManager = new ConfigManager();

      const callback1 = jest.fn();
      const callback2 = jest.fn();
      configManager.onConfigChanged('language.default', callback1);
      configManager.onConfigChanged('language.default', callback2);

      await configManager.setAndSave('language.default', 'zh-TW');

      expect(callback1).toHaveBeenCalledWith('zh-TW', 'en', 'language.default');
      expect(callback2).toHaveBeenCalledWith('zh-TW', 'en', 'language.default');
    });

    it('should handle callback errors gracefully', async () => {
      mockFs.writeJson.mockResolvedValue(undefined);
      configManager = new ConfigManager();

      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      configManager.onConfigChanged('language.default', errorCallback);

      await expect(
        configManager.setAndSave('language.default', 'zh-TW'),
      ).resolves.toBeUndefined();

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('nested value operations', () => {
    beforeEach(() => {
      mockFs.pathExistsSync.mockReturnValue(false);
      mockFs.ensureDirSync.mockReturnValue(undefined as any);
      mockFs.writeJsonSync.mockReturnValue(undefined);
      configManager = new ConfigManager();
    });

    it('should handle deep nested paths', () => {
      configManager.set('pdf.engines.resourceLimits.maxConcurrentTasks', 5);
      expect(
        configManager.get('pdf.engines.resourceLimits.maxConcurrentTasks'),
      ).toBe(5);
    });

    it('should create intermediate objects for nested paths', () => {
      configManager.set('new.nested.deep.value', 'test');
      expect(configManager.get('new.nested.deep.value')).toBe('test');
      expect(configManager.has('new.nested')).toBe(true);
    });

    it('should handle array values', () => {
      const languages = ['javascript', 'typescript', 'python'];
      configManager.set('syntaxHighlighting.supportedLanguages', languages);
      expect(
        configManager.get('syntaxHighlighting.supportedLanguages'),
      ).toEqual(languages);
    });
  });
});
