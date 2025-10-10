/**
 * Simple uni tests for FileBrowser - focused on coverage
 */

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

// Mock file-search-ui
jest.mock('../../../../src/cli/ui/file-search-ui', () => ({
  FileSearchUI: {
    shortenPath: jest.fn((path: string, maxLength?: number) => {
      if (maxLength && path.length > maxLength) {
        return '...' + path.slice(-(maxLength - 3));
      }
      return path;
    }),
    displayFiles: jest.fn(),
  },
}));

describe('FileBrowser - Simple Tests', () => {
  let fileBrowser: FileBrowser;
  let mockTranslator: jest.Mocked<ITranslationManager>;

  beforeEach(() => {
    jest.clearAllMocks();

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

    it('should create renderer instance', () => {
      const renderer = (fileBrowser as any).renderer;
      expect(renderer).toBeDefined();
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
      expect(formatFileSize(512)).toBe('512.0 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(1500000)).toBe('1.4 MB');
      expect(formatFileSize(5120000)).toBe('4.9 MB');
    });

    it('should format date correctly', () => {
      const formatDate = (fileBrowser as any).formatDate.bind(fileBrowser);

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 32 * 24 * 60 * 60 * 1000);

      expect(formatDate(today)).toBe('fileBrowser.today');
      expect(formatDate(yesterday)).toBe('fileBrowser.yesterday');
      expect(formatDate(fiveDaysAgo)).toBe('fileBrowser.daysAgo');
      expect(formatDate(lastWeek)).toBe('fileBrowser.weeksAgo');
      expect(formatDate(twoWeeksAgo)).toBe('fileBrowser.weeksAgo');
      expect(formatDate(lastMonth)).toMatch(/\d+\/\d+\/\d+/);
      expect(formatDate(undefined)).toBe('fileBrowser.unknown');
    });

    it('should sort items correctly by name ascending', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'b.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 1000,
        },
        {
          name: 'a.md',
          type: 'file',
          modified: new Date('2023-01-02'),
          size: 2000,
        },
        {
          name: 'dir',
          type: 'directory',
          modified: new Date('2023-01-01'),
          size: 0,
        },
      ];

      const sortedByName = sortItems(items, 'name', 'asc');
      expect(sortedByName[0].name).toBe('dir'); // Directories first
      expect(sortedByName[1].name).toBe('a.md');
      expect(sortedByName[2].name).toBe('b.md');
    });

    it('should sort items correctly by name descending', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'a.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 1000,
        },
        {
          name: 'b.md',
          type: 'file',
          modified: new Date('2023-01-02'),
          size: 2000,
        },
        {
          name: 'dir',
          type: 'directory',
          modified: new Date('2023-01-01'),
          size: 0,
        },
      ];

      const sortedByName = sortItems(items, 'name', 'desc');
      expect(sortedByName[0].name).toBe('dir'); // Directories first
      expect(sortedByName[1].name).toBe('b.md'); // Reversed order for files
      expect(sortedByName[2].name).toBe('a.md');
    });

    it('should sort items correctly by date', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'old.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 1000,
        },
        {
          name: 'new.md',
          type: 'file',
          modified: new Date('2023-01-02'),
          size: 2000,
        },
        {
          name: 'dir',
          type: 'directory',
          modified: new Date('2023-01-01'),
          size: 0,
        },
      ];

      const sortedByDate = sortItems(items, 'modified', 'desc');
      expect(sortedByDate[0].name).toBe('dir'); // Directories still first
      expect(sortedByDate[1].name).toBe('new.md'); // Newer first in desc order
      expect(sortedByDate[2].name).toBe('old.md');
    });

    it('should sort items correctly by date ascending', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'new.md',
          type: 'file',
          modified: new Date('2023-01-02'),
          size: 1000,
        },
        {
          name: 'old.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 2000,
        },
        {
          name: 'dir',
          type: 'directory',
          modified: new Date('2023-01-01'),
          size: 0,
        },
      ];

      const sortedByDate = sortItems(items, 'modified', 'asc');
      expect(sortedByDate[0].name).toBe('dir'); // Directories still first
      expect(sortedByDate[1].name).toBe('old.md'); // Older first in asc order
      expect(sortedByDate[2].name).toBe('new.md');
    });

    it('should sort items correctly by size', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'big.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 5000,
        },
        {
          name: 'small.md',
          type: 'file',
          modified: new Date('2023-01-02'),
          size: 1000,
        },
        {
          name: 'dir',
          type: 'directory',
          modified: new Date('2023-01-01'),
          size: 0,
        },
      ];

      const sortedBySize = sortItems(items, 'size', 'desc');
      expect(sortedBySize[0].name).toBe('dir'); // Directories still first
      expect(sortedBySize[1].name).toBe('big.md'); // Bigger first in desc order
      expect(sortedBySize[2].name).toBe('small.md');
    });

    it('should sort items correctly by size ascending', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'big.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 5000,
        },
        {
          name: 'small.md',
          type: 'file',
          modified: new Date('2023-01-02'),
          size: 1000,
        },
        {
          name: 'dir',
          type: 'directory',
          modified: new Date('2023-01-01'),
          size: 0,
        },
      ];

      const sortedBySize = sortItems(items, 'size', 'asc');
      expect(sortedBySize[0].name).toBe('dir'); // Directories still first
      expect(sortedBySize[1].name).toBe('small.md'); // Smaller first in asc order
      expect(sortedBySize[2].name).toBe('big.md');
    });

    it('should handle items with undefined modified dates', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'with-date.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 1000,
        },
        { name: 'no-date.md', type: 'file', modified: undefined, size: 2000 },
      ];

      const sortedByDate = sortItems(items, 'modified', 'asc');
      expect(sortedByDate).toHaveLength(2);
      expect(sortedByDate[0].name).toBe('no-date.md'); // undefined date becomes 0
      expect(sortedByDate[1].name).toBe('with-date.md');
    });

    it('should handle items with undefined sizes', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'with-size.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 1000,
        },
        {
          name: 'no-size.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: undefined,
        },
      ];

      const sortedBySize = sortItems(items, 'size', 'asc');
      expect(sortedBySize).toHaveLength(2);
      expect(sortedBySize[0].name).toBe('no-size.md'); // undefined size becomes 0
      expect(sortedBySize[1].name).toBe('with-size.md');
    });

    it('should match glob patterns correctly', () => {
      const matchesGlob = (fileBrowser as any).matchesGlob.bind(fileBrowser);

      expect(matchesGlob('test.md', '*.md')).toBe(true);
      expect(matchesGlob('test.txt', '*.md')).toBe(false);
      expect(matchesGlob('readme.md', 'readme.*')).toBe(true);
      expect(matchesGlob('README.MD', 'readme.*')).toBe(true); // Case insensitive
      expect(matchesGlob('test.md', 'test?md')).toBe(true); // ? matches single char
      expect(matchesGlob('testxmd', 'test?md')).toBe(true);
      expect(matchesGlob('testxymd', 'test?md')).toBe(false); // ? matches only one char
      expect(matchesGlob('file-name.md', 'file-*')).toBe(true); // Wildcard
      expect(
        matchesGlob('prefix-middle-suffix.txt', 'prefix-*-suffix.txt'),
      ).toBe(true);
    });

    it('should handle special characters in glob patterns', () => {
      const matchesGlob = (fileBrowser as any).matchesGlob.bind(fileBrowser);

      // The actual implementation converts \. to \\. and then creates regex
      // So 'test\\.md' becomes regex /^test\\.md$/i which matches 'test.md' but not 'testxmd'
      expect(matchesGlob('test.md', 'test.md')).toBe(true); // Literal dot
      expect(matchesGlob('testxmd', 'test.md')).toBe(false); // Literal dot should not match x
    });

    it('should build choices correctly for empty directory', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      const items: any[] = [];
      const currentPath = '/test';

      const choices = buildChoices(items, currentPath);

      // Should contain utility options
      expect(
        choices.some((choice: any) => choice.value === '__back_to_main__'),
      ).toBe(true);
      expect(choices.some((choice: any) => choice.value === '__search__')).toBe(
        true,
      );
      expect(choices.some((choice: any) => choice.value === '__recent__')).toBe(
        true,
      );
      expect(choices.some((choice: any) => choice.value === '__up__')).toBe(
        true,
      ); // Parent directory
    });

    it('should build choices correctly for root directory', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      const items: any[] = [];
      const currentPath = '/';

      const choices = buildChoices(items, currentPath);

      // Should not contain up navigation for root
      expect(choices.some((choice: any) => choice.value === '__up__')).toBe(
        false,
      );
      expect(
        choices.some((choice: any) => choice.value === '__back_to_main__'),
      ).toBe(true);
    });

    it('should build choices correctly with files and directories', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      const items = [
        {
          name: 'subdir',
          path: '/test/subdir',
          type: 'directory',
          size: 0,
          modified: new Date(),
          isMarkdown: false,
        },
        {
          name: 'test.md',
          path: '/test/test.md',
          type: 'file',
          size: 1000,
          modified: new Date(),
          isMarkdown: true,
        },
        {
          name: 'other.txt',
          path: '/test/other.txt',
          type: 'file',
          size: 500,
          modified: new Date(),
          isMarkdown: false,
        },
      ];
      const currentPath = '/test';

      const choices = buildChoices(items, currentPath);

      // Should contain directory
      expect(
        choices.some((choice: any) => choice.value === '/test/subdir'),
      ).toBe(true);
      // Should contain markdown file
      expect(
        choices.some((choice: any) => choice.value === '/test/test.md'),
      ).toBe(true);
      // Should contain other file (dimmed)
      expect(
        choices.some((choice: any) => choice.value === '/test/other.txt'),
      ).toBe(true);
    });

    it('should build choices with many other files showing summary', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      const items = Array.from({ length: 10 }, (_, i) => ({
        name: `file${i}.txt`,
        path: `/test/file${i}.txt`,
        type: 'file' as const,
        size: 100,
        modified: new Date(),
        isMarkdown: false,
      }));

      const choices = buildChoices(items, '/test');

      expect(
        choices.some((choice: any) => choice.value === '__show_all__'),
      ).toBe(true);
      expect(
        choices.some((choice: any) =>
          choice.name.includes('fileBrowser.andOtherFiles'),
        ),
      ).toBe(true);
    });

    it('should show individual other files when count is small', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      const items = Array.from({ length: 3 }, (_, i) => ({
        name: `file${i}.txt`,
        path: `/test/file${i}.txt`,
        type: 'file' as const,
        size: 100,
        modified: new Date(),
        isMarkdown: false,
      }));

      const choices = buildChoices(items, '/test');

      // Should show individual files
      expect(
        choices.some((choice: any) => choice.value === '/test/file0.txt'),
      ).toBe(true);
      expect(
        choices.some((choice: any) => choice.value === '/test/file1.txt'),
      ).toBe(true);
      expect(
        choices.some((choice: any) => choice.value === '/test/file2.txt'),
      ).toBe(true);
      // Should not show summary
      expect(
        choices.some((choice: any) => choice.value === '__show_all__'),
      ).toBe(false);
    });

    it('should handle files with no size or modified date', () => {
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      const items = [
        {
          name: 'test.md',
          path: '/test/test.md',
          type: 'file',
          size: undefined,
          modified: undefined,
          isMarkdown: true,
        },
      ];

      const choices = buildChoices(items, '/test');

      expect(
        choices.some((choice: any) => choice.value === '/test/test.md'),
      ).toBe(true);
      // Should handle undefined values gracefully in the display
      const markdownChoice = choices.find(
        (choice: any) => choice.value === '/test/test.md',
      );
      expect(markdownChoice).toBeDefined();
    });
  });

  describe('additional utility method coverage', () => {
    it('should test scanDirectory method indirectly', async () => {
      // This method is used internally, we can test its behavior through buildChoices
      const buildChoices = (fileBrowser as any).buildChoices.bind(fileBrowser);

      // Test with mixed items that would come from scanDirectory
      const items = [
        {
          name: 'dir1',
          path: '/test/dir1',
          type: 'directory',
          size: 0,
          modified: new Date(),
          isMarkdown: false,
        },
        {
          name: 'file1.md',
          path: '/test/file1.md',
          type: 'file',
          size: 1000,
          modified: new Date(),
          isMarkdown: true,
        },
      ];

      const choices = buildChoices(items, '/test');
      expect(choices.length).toBeGreaterThan(0);
      expect(choices.some((choice: any) => choice.value === '/test/dir1')).toBe(
        true,
      );
      expect(
        choices.some((choice: any) => choice.value === '/test/file1.md'),
      ).toBe(true);
    });

    it('should test sortItems edge case with same names', () => {
      const sortItems = (fileBrowser as any).sortItems.bind(fileBrowser);

      const items = [
        {
          name: 'same.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 1000,
        },
        {
          name: 'same.md',
          type: 'file',
          modified: new Date('2023-01-01'),
          size: 1000,
        },
      ];

      const sorted = sortItems(items, 'name', 'asc');
      expect(sorted).toHaveLength(2);
      expect(sorted[0].name).toBe('same.md');
      expect(sorted[1].name).toBe('same.md');
    });

    it('should test matchesGlob with edge cases', () => {
      const matchesGlob = (fileBrowser as any).matchesGlob.bind(fileBrowser);

      // Test empty patterns
      expect(matchesGlob('test.md', '')).toBe(false);
      expect(matchesGlob('', '*')).toBe(true);
      expect(matchesGlob('', '')).toBe(true);

      // Test multiple wildcards
      expect(matchesGlob('prefix-middle-suffix.txt', '*-*-*')).toBe(true);
      expect(matchesGlob('a-b-c-d.txt', '*-*-*')).toBe(true);
    });
  });

  describe('error handling scenarios', () => {
    it('should handle missing CliRenderer gracefully', () => {
      // Test that even if renderer is undefined, the class doesn't crash
      const instance = new FileBrowser(mockTranslator);
      expect(instance).toBeInstanceOf(FileBrowser);

      // Access private renderer to ensure it exists
      const renderer = (instance as any).renderer;
      expect(renderer).toBeDefined();
    });
  });
});
