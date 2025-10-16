/**
 * Unit tests for FileBrowser - Essential tests only
 */

import { promises as fs } from 'fs';
import { FileBrowser } from '../../../../src/cli/utils/file-browser';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';

// Mock chalk
jest.mock('chalk', () => ({
  cyan: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text),
  dim: jest.fn((text: string) => text),
  magenta: jest.fn((text: string) => text),
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

// Mock file-search-ui
jest.mock('../../../../src/cli/ui/file-search-ui', () => ({
  FileSearchUI: jest.fn().mockImplementation(() => ({
    displayFiles: jest.fn(),
  })),
}));

// Add static methods to the mock constructor
const FileSearchUIMock =
  require('../../../../src/cli/ui/file-search-ui').FileSearchUI;
FileSearchUIMock.shortenPath = jest.fn((path: string, maxLength?: number) => {
  if (maxLength && path.length > maxLength) {
    return '...' + path.slice(-(maxLength - 3));
  }
  return path;
});

// Mock CliRenderer
jest.mock('../../../../src/cli/utils/cli-renderer', () => ({
  CliRenderer: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock inquirer for dynamic import
const mockPrompt = jest.fn();

// Mock the inquirer module statically
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: mockPrompt,
  },
}));

describe('FileBrowser - Essential Tests', () => {
  let fileBrowser: FileBrowser;
  let mockTranslator: jest.Mocked<ITranslationManager>;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup fs mocks
    mockFs = fs as jest.Mocked<typeof fs>;

    // Mock console methods to prevent output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create mock translator
    mockTranslator = {
      t: jest.fn((key: string, params?: Record<string, string | number>) => {
        if (params && typeof params.count === 'number') {
          return key.replace('{{count}}', params.count.toString());
        }
        return key;
      }),
      getCurrentLocale: jest.fn(() => 'en'),
      setLocale: jest.fn(),
      getSupportedLocales: jest.fn(() => ['en', 'zh-TW']),
      translate: jest.fn(),
      hasTranslation: jest.fn((_key: string, _locale?: any) => true),
      loadTranslations: jest.fn(),
      getTranslations: jest.fn(),
    };

    fileBrowser = new FileBrowser(mockTranslator);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create FileBrowser instance', () => {
      expect(fileBrowser).toBeInstanceOf(FileBrowser);
    });

    it('should have markdown extensions property', () => {
      const markdownExtensions = (fileBrowser as any).markdownExtensions;
      expect(markdownExtensions).toEqual([
        '.md',
        '.markdown',
        '.mdown',
        '.mkd',
      ]);
    });
  });

  describe('utility methods', () => {
    it('should format file size correctly', () => {
      const formatFileSize = (fileBrowser as any).formatFileSize.bind(
        fileBrowser,
      );

      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
    });

    it('should format date correctly', () => {
      const formatDate = (fileBrowser as any).formatDate.bind(fileBrowser);

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      expect(formatDate(today)).toBe('fileBrowser.today');
      expect(formatDate(yesterday)).toBe('fileBrowser.yesterday');
      expect(formatDate(undefined)).toBe('fileBrowser.unknown');
    });
  });

  describe('scanDirectory method', () => {
    it('should scan directory successfully', async () => {
      const scanDirectory = (fileBrowser as any).scanDirectory.bind(
        fileBrowser,
      );

      mockFs.readdir.mockResolvedValue([
        {
          name: 'test.md',
          isDirectory: () => false,
          isFile: () => true,
        } as any,
      ]);

      mockFs.stat.mockResolvedValue({
        size: 2000,
        mtime: new Date('2023-01-15'),
      } as any);

      const result = await scanDirectory('/test', { showHidden: false });

      expect(result).toHaveLength(1);
      expect(result[0].isMarkdown).toBe(true);
    });
  });

  describe('enterFilePath method', () => {
    it('should prompt for file path and return resolved path', async () => {
      const enterFilePath = (fileBrowser as any).enterFilePath.bind(
        fileBrowser,
      );

      mockPrompt.mockResolvedValue({ filePath: ' /test/manual.md ' });

      const result = await enterFilePath();
      expect(result).toBe('/test/manual.md');
    });

    it('should validate empty file path input', async () => {
      const enterFilePath = (fileBrowser as any).enterFilePath.bind(
        fileBrowser,
      );

      mockPrompt.mockResolvedValue({ filePath: '/test/path.md' });

      // Test validation function
      const mockCall = mockPrompt.mock.calls[0];
      expect(mockCall).toBeUndefined(); // No calls yet

      await enterFilePath();

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'input',
        name: 'filePath',
        message: 'fileBrowser.enterFullPath',
        validate: expect.any(Function),
      });

      // Test the validation function
      const validateFn = mockPrompt.mock.calls[0][0].validate;
      expect(validateFn('')).toBe('fileBrowser.pleaseEnterFilePath');
      expect(validateFn(' ')).toBe('fileBrowser.pleaseEnterFilePath');
      expect(validateFn('/valid/path')).toBe(true);
    });
  });

  describe('buildChoices method', () => {
    it('should build choices with navigation options', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);
      const mockItems = [
        {
          name: 'test.md',
          path: '/test/test.md',
          type: 'file',
          isMarkdown: true,
        },
        {
          name: 'folder',
          path: '/test/folder',
          type: 'directory',
          isMarkdown: false,
        },
      ];

      const choices = buildChoices(mockItems, '/test');

      expect(choices.length).toBeGreaterThan(2);
      expect(choices.some((choice: any) => choice.value === '__up__')).toBe(
        true,
      );
      expect(choices.some((choice: any) => choice.value === '__search__')).toBe(
        true,
      );
      expect(
        choices.some((choice: any) => choice.value === '__back_to_main__'),
      ).toBe(true);
    });

    it('should not show up option for root directory', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);
      const mockItems: any[] = [];

      const choices = buildChoices(mockItems, '/');

      expect(choices.some((choice: any) => choice.value === '__up__')).toBe(
        false,
      );
    });

    it('should prioritize directories then markdown files', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);
      const mockItems = [
        {
          name: 'file.md',
          path: '/test/file.md',
          type: 'file',
          isMarkdown: true,
          size: 1000,
          modified: new Date(),
        },
        {
          name: 'folder',
          path: '/test/folder',
          type: 'directory',
          isMarkdown: false,
        },
        {
          name: 'other.txt',
          path: '/test/other.txt',
          type: 'file',
          isMarkdown: false,
          size: 500,
          modified: new Date(),
        },
      ];

      const choices = buildChoices(mockItems, '/test');

      // Find file items (excluding navigation options)
      const fileChoices = choices.filter((c: any) =>
        c.value.startsWith('/test'),
      );

      expect(fileChoices[0].value).toBe('/test/folder'); // Directory first
      expect(fileChoices[1].value).toBe('/test/file.md'); // Then markdown files
    });
  });

  describe('sortItems method', () => {
    it('should sort items by name ascending', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);
      const items = [
        { name: 'z.md', type: 'file' },
        { name: 'a.md', type: 'file' },
        { name: 'folder', type: 'directory' },
      ];

      const sorted = sortItems(items, 'name', 'asc');

      // Directories should come first, then files by name
      expect(sorted[0].name).toBe('folder');
      expect(sorted[1].name).toBe('a.md');
      expect(sorted[2].name).toBe('z.md');
    });

    it('should sort items by size descending', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);
      const items = [
        { name: 'small.md', type: 'file', size: 100 },
        { name: 'large.md', type: 'file', size: 1000 },
        { name: 'folder', type: 'directory' },
      ];

      const sorted = sortItems(items, 'size', 'desc');

      expect(sorted[0].name).toBe('folder'); // Directory first
      expect(sorted[1].name).toBe('large.md'); // Larger file first
      expect(sorted[2].name).toBe('small.md');
    });
  });

  describe('matchesGlob method', () => {
    it('should match glob patterns', () => {
      const matchesGlob = (fileBrowser as any).matchesGlob.bind(fileBrowser);

      expect(matchesGlob('test.md', 'test*')).toBe(true);
      expect(matchesGlob('test.md', '*.md')).toBe(true);
      expect(matchesGlob('test.md', 'test?md')).toBe(true); // ? matches . (dot)
      expect(matchesGlob('test.md', 'test.??')).toBe(true);
      expect(matchesGlob('README.txt', 'readme*')).toBe(true); // case insensitive
      expect(matchesGlob('testXmd', 'test?md')).toBe(true); // ? matches any single char
      expect(matchesGlob('test123md', 'test?md')).toBe(false); // ? only matches single char
    });

    it('should handle special regex characters', () => {
      const matchesGlob = (fileBrowser as any).matchesGlob.bind(fileBrowser);

      expect(matchesGlob('test.md', 'test.md')).toBe(true);
      expect(matchesGlob('test-md', 'test.md')).toBe(false);
    });
  });

  describe('findFiles method', () => {
    it('should find files recursively with pattern matching', async () => {
      const findFiles = (fileBrowser as any).findFiles.bind(fileBrowser);

      // Mock readdir to return files and directories
      mockFs.readdir.mockImplementation((path: any) => {
        if (path === '/test') {
          return Promise.resolve([
            { name: 'readme.md', isFile: () => true, isDirectory: () => false },
            { name: 'subfolder', isFile: () => false, isDirectory: () => true },
          ] as any);
        } else if (path === '/test/subfolder') {
          return Promise.resolve([
            { name: 'nested.md', isFile: () => true, isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      const results = await findFiles('/test', 'readme', {}, 2);

      expect(results).toContain('/test/readme.md');
      expect(mockFs.readdir).toHaveBeenCalledWith('/test', {
        withFileTypes: true,
      });
    });

    it('should respect maxDepth parameter', async () => {
      const findFiles = (fileBrowser as any).findFiles.bind(fileBrowser);

      mockFs.readdir.mockImplementation((path: any) => {
        if (path === '/test') {
          return Promise.resolve([
            { name: 'level1', isFile: () => false, isDirectory: () => true },
          ] as any);
        }
        return Promise.resolve([]);
      });

      await findFiles('/test', 'test', {}, 0); // maxDepth 0

      // Should only call readdir once for base path
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);
      expect(mockFs.readdir).toHaveBeenCalledWith('/test', {
        withFileTypes: true,
      });
    });
  });

  describe('scanDirectory with error handling', () => {
    it('should handle directory access errors gracefully', async () => {
      const scanDirectory = (fileBrowser as any).scanDirectory.bind(
        fileBrowser,
      );

      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await scanDirectory('/restricted');

      expect(result).toEqual([]);
    });

    it('should filter hidden files when showHidden is false', async () => {
      const scanDirectory = (fileBrowser as any).scanDirectory.bind(
        fileBrowser,
      );

      mockFs.readdir.mockResolvedValue([
        { name: '.hidden', isFile: () => true, isDirectory: () => false },
        { name: 'visible.md', isFile: () => true, isDirectory: () => false },
      ] as any);

      mockFs.stat.mockResolvedValue({
        size: 1000,
        mtime: new Date(),
      } as any);

      const result = await scanDirectory('/test', { showHidden: false });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('visible.md');
    });

    it('should include hidden files when showHidden is true', async () => {
      const scanDirectory = (fileBrowser as any).scanDirectory.bind(
        fileBrowser,
      );

      mockFs.readdir.mockResolvedValue([
        { name: '.hidden', isFile: () => true, isDirectory: () => false },
        { name: 'visible.md', isFile: () => true, isDirectory: () => false },
      ] as any);

      mockFs.stat.mockResolvedValue({
        size: 1000,
        mtime: new Date(),
      } as any);

      const result = await scanDirectory('/test', { showHidden: true });

      expect(result).toHaveLength(2);
      expect(result.some((item: any) => item.name === '.hidden')).toBe(true);
    });
  });

  describe('searchFiles method', () => {
    it('should prompt for search pattern and find matching files', async () => {
      const searchFiles = (fileBrowser as any).searchFiles.bind(fileBrowser);

      // Mock the inquirer prompt sequence
      mockPrompt
        .mockResolvedValueOnce({ pattern: 'test' }) // Search pattern input
        .mockResolvedValueOnce({ selectedFile: '/test/result.md' }); // File selection

      // Mock findFiles to return results
      const mockFindFiles = jest
        .spyOn(fileBrowser as any, 'findFiles')
        .mockResolvedValue(['/test/result.md', '/test/another.md']);

      const result = await searchFiles('/test');

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'input',
        name: 'pattern',
        message: 'fileBrowser.enterSearchPattern',
        validate: expect.any(Function),
      });

      expect(mockFindFiles).toHaveBeenCalledWith('/test', 'test', {});
      expect(result).toBe('/test/result.md');
    });

    it('should handle no matching files found', async () => {
      const searchFiles = (fileBrowser as any).searchFiles.bind(fileBrowser);

      mockPrompt
        .mockResolvedValueOnce({ pattern: 'nonexistent' })
        .mockResolvedValueOnce({ nextAction: 'back' });

      jest.spyOn(fileBrowser as any, 'findFiles').mockResolvedValue([]);

      const result = await searchFiles('/test');

      expect(result).toBeNull();
    });

    it('should handle single file found', async () => {
      const searchFiles = (fileBrowser as any).searchFiles.bind(fileBrowser);

      mockPrompt
        .mockResolvedValueOnce({ pattern: 'unique' })
        .mockResolvedValueOnce({ action: 'select' });

      jest
        .spyOn(fileBrowser as any, 'findFiles')
        .mockResolvedValue(['/test/unique.md']);

      const result = await searchFiles('/test');

      expect(result).toBe('/test/unique.md');
    });
  });

  describe('error handling in complex scenarios', () => {
    it('should handle search errors gracefully', async () => {
      const searchFiles = (fileBrowser as any).searchFiles.bind(fileBrowser);

      mockPrompt
        .mockResolvedValueOnce({ pattern: 'test' })
        .mockResolvedValueOnce({ nextAction: 'back' });

      jest
        .spyOn(fileBrowser as any, 'findFiles')
        .mockRejectedValue(new Error('Search failed'));

      const result = await searchFiles('/test');

      expect(result).toBeNull();
    });

    it('should validate pattern input correctly', async () => {
      const searchFiles = (fileBrowser as any).searchFiles.bind(fileBrowser);

      mockPrompt.mockResolvedValueOnce({ pattern: 'valid' });
      jest.spyOn(fileBrowser as any, 'findFiles').mockResolvedValue([]);
      mockPrompt.mockResolvedValueOnce({ nextAction: 'back' });

      await searchFiles('/test');

      const validateFn = mockPrompt.mock.calls[0][0].validate;
      expect(validateFn('')).toBe('fileBrowser.pleaseEnterSearchPattern');
      expect(validateFn(' ')).toBe('fileBrowser.pleaseEnterSearchPattern');
      expect(validateFn('valid')).toBe(true);
    });
  });

  describe('browseDirectory method - Enhanced Coverage', () => {
    it('should handle directory navigation and file selection flow', async () => {
      const browseDirectory = (fileBrowser as any).browseDirectory.bind(
        fileBrowser,
      );

      const mockItems = [
        {
          name: 'test.md',
          path: '/test/test.md',
          type: 'file',
          isMarkdown: true,
        },
      ];

      jest
        .spyOn(fileBrowser as any, 'scanDirectory')
        .mockResolvedValue(mockItems);
      mockPrompt.mockResolvedValue({ action: '/test/test.md' });

      const result = await browseDirectory('/test');
      expect(result).toBe('/test/test.md');
    });

    it('should handle search flow returning result', async () => {
      const browseDirectory = (fileBrowser as any).browseDirectory.bind(
        fileBrowser,
      );

      jest.spyOn(fileBrowser as any, 'scanDirectory').mockResolvedValue([]);
      jest
        .spyOn(fileBrowser as any, 'searchFiles')
        .mockResolvedValue('/found/file.md');
      mockPrompt.mockResolvedValue({ action: '__search__' });

      const result = await browseDirectory('/test');
      expect(result).toBe('/found/file.md');
    });

    it('should handle directory navigation up', async () => {
      const browseDirectory = (fileBrowser as any).browseDirectory.bind(
        fileBrowser,
      );

      jest.spyOn(fileBrowser as any, 'scanDirectory').mockResolvedValue([]);
      mockPrompt
        .mockResolvedValueOnce({ action: '__up__' })
        .mockResolvedValueOnce({ action: '__back_to_main__' });

      try {
        await browseDirectory('/test/subdir');
      } catch (error) {
        expect((error as Error).message).toBe('BACK_TO_MAIN_MENU');
      }
    });

    it('should handle error cases and fallback to manual input', async () => {
      const browseDirectory = (fileBrowser as any).browseDirectory.bind(
        fileBrowser,
      );

      jest
        .spyOn(fileBrowser as any, 'scanDirectory')
        .mockRejectedValue(new Error('Access denied'));
      jest
        .spyOn(fileBrowser as any, 'enterFilePath')
        .mockResolvedValue('/manual/path.md');

      const result = await browseDirectory('/restricted');
      expect(result).toBe('/manual/path.md');
    });
  });

  describe('sortItems - Modified Date Sorting', () => {
    it('should sort by modified date ascending and descending', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);
      const items = [
        { name: 'new.md', type: 'file', modified: new Date('2023-12-01') },
        { name: 'old.md', type: 'file', modified: new Date('2023-01-01') },
        { name: 'folder', type: 'directory' },
      ];

      const sortedAsc = sortItems(items, 'modified', 'asc');
      expect(sortedAsc[0].name).toBe('folder');
      expect(sortedAsc[1].name).toBe('old.md');
      expect(sortedAsc[2].name).toBe('new.md');

      const sortedDesc = sortItems(items, 'modified', 'desc');
      expect(sortedDesc[1].name).toBe('new.md');
      expect(sortedDesc[2].name).toBe('old.md');
    });
  });

  describe('searchFiles - All Flow Branches', () => {
    it('should handle single file found with search again option', async () => {
      const searchFiles = (fileBrowser as any).searchFiles.bind(fileBrowser);

      mockPrompt
        .mockResolvedValueOnce({ pattern: 'unique' })
        .mockResolvedValueOnce({ action: 'search_again' })
        .mockResolvedValueOnce({ pattern: 'new' })
        .mockResolvedValueOnce({ nextAction: 'back' });

      jest
        .spyOn(fileBrowser as any, 'findFiles')
        .mockResolvedValueOnce(['/test/unique.md'])
        .mockResolvedValueOnce([]);

      const result = await searchFiles('/test');
      expect(result).toBeNull();
    });

    it('should handle multiple files found with back option', async () => {
      const searchFiles = (fileBrowser as any).searchFiles.bind(fileBrowser);

      mockPrompt
        .mockResolvedValueOnce({ pattern: 'test' })
        .mockResolvedValueOnce({ selectedFile: '__back__' });

      jest
        .spyOn(fileBrowser as any, 'findFiles')
        .mockResolvedValue(['/test/file1.md', '/test/file2.md']);

      const result = await searchFiles('/test');
      expect(result).toBeNull();
    });

    it('should handle search error with back option', async () => {
      const searchFiles = (fileBrowser as any).searchFiles.bind(fileBrowser);

      mockPrompt
        .mockResolvedValueOnce({ pattern: 'failing' })
        .mockResolvedValueOnce({ nextAction: 'back' });

      jest
        .spyOn(fileBrowser as any, 'findFiles')
        .mockRejectedValueOnce(new Error('Search failed'));

      const result = await searchFiles('/test');
      expect(result).toBeNull();
    });
  });

  describe('formatDate - Complete Time Range Coverage', () => {
    it('should handle all time ranges correctly', () => {
      const formatDate = (fileBrowser as any).formatDate.bind(fileBrowser);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

      expect(formatDate(now)).toBe('fileBrowser.today');
      expect(formatDate(yesterday)).toBe('fileBrowser.yesterday');
      expect(formatDate(threeDaysAgo)).toBe('fileBrowser.daysAgo');
      expect(formatDate(oneWeekAgo)).toBe('fileBrowser.weeksAgo');
      expect(formatDate(twoWeeksAgo)).toBe('fileBrowser.weeksAgo');
      expect(formatDate(oneMonthAgo)).toBe(oneMonthAgo.toLocaleDateString());
      expect(formatDate(undefined)).toBe('fileBrowser.unknown');
    });
  });

  describe('buildChoices - File Count Edge Cases', () => {
    it('should hide other files when there are 5 or more non-markdown files', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      const mockItems = [
        {
          name: 'readme.md',
          path: '/test/readme.md',
          type: 'file',
          isMarkdown: true,
        },
        {
          name: 'file1.txt',
          path: '/test/file1.txt',
          type: 'file',
          isMarkdown: false,
        },
        {
          name: 'file2.txt',
          path: '/test/file2.txt',
          type: 'file',
          isMarkdown: false,
        },
        {
          name: 'file3.txt',
          path: '/test/file3.txt',
          type: 'file',
          isMarkdown: false,
        },
        {
          name: 'file4.txt',
          path: '/test/file4.txt',
          type: 'file',
          isMarkdown: false,
        },
        {
          name: 'file5.txt',
          path: '/test/file5.txt',
          type: 'file',
          isMarkdown: false,
        },
      ];

      const choices = buildChoices(mockItems, '/test');

      // Should show markdown file but not the 5+ other files
      const fileChoices = choices.filter(
        (c: any) => c.value.startsWith('/test') && c.value.includes('file'),
      );
      expect(fileChoices.length).toBe(0); // No .txt files should be shown

      const markdownChoices = choices.filter((c: any) =>
        c.value.includes('readme.md'),
      );
      expect(markdownChoices.length).toBe(1);
    });

    it('should show other files when fewer than 5', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      const mockItems = [
        {
          name: 'readme.md',
          path: '/test/readme.md',
          type: 'file',
          isMarkdown: true,
        },
        {
          name: 'file1.txt',
          path: '/test/file1.txt',
          type: 'file',
          isMarkdown: false,
        },
        {
          name: 'file2.txt',
          path: '/test/file2.txt',
          type: 'file',
          isMarkdown: false,
        },
      ];

      const choices = buildChoices(mockItems, '/test');

      const fileChoices = choices.filter((c: any) =>
        c.value.startsWith('/test'),
      );
      expect(fileChoices.length).toBe(3); // All files should be shown
    });
  });

  describe('findFiles - Glob Matching Coverage', () => {
    it('should find files using glob pattern matching', async () => {
      const findFiles = (fileBrowser as any).findFiles.bind(fileBrowser);

      mockFs.readdir.mockResolvedValue([
        { name: 'test.md', isFile: () => true, isDirectory: () => false },
        { name: 'readme.md', isFile: () => true, isDirectory: () => false },
      ] as any);

      const results = await findFiles('/test', 'test*', {}, 1);
      expect(results).toContain('/test/test.md');
    });
  });
});
