/**
 * Unit tests for RecentFilesManager
 */

import { RecentFilesManager } from '../../../../src/cli/config/recent-files';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
  },
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockJoin = join as jest.MockedFunction<typeof join>;

describe('RecentFilesManager', () => {
  let recentFilesManager: RecentFilesManager;
  let consoleSpy: jest.SpyInstance;
  let originalCwd: () => string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console.warn to prevent output during tests
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock process.cwd to return a consistent test path
    originalCwd = process.cwd;
    process.cwd = jest.fn().mockReturnValue('/test/current/dir');

    // Setup default mocks
    mockJoin.mockImplementation((...args) => args.join('/'));

    recentFilesManager = new RecentFilesManager();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.cwd = originalCwd;
  });

  describe('constructor', () => {
    it('should create RecentFilesManager instance', () => {
      expect(recentFilesManager).toBeInstanceOf(RecentFilesManager);
    });
  });

  describe('formatFilePath', () => {
    it('should return full path if under max length', () => {
      const filePath = '/short/path/file.md';
      const result = recentFilesManager.formatFilePath(filePath, 60);
      expect(result).toBe(filePath);
    });

    it('should truncate long paths correctly', () => {
      const longPath =
        '/very/long/path/to/some/nested/directory/structure/file.md';
      const result = recentFilesManager.formatFilePath(longPath, 30);
      expect(result).toBe('.../structure/file.md');
    });

    it('should handle paths with few parts', () => {
      const shortPath = '/file.md';
      const result = recentFilesManager.formatFilePath(shortPath, 10);
      expect(result).toBe(shortPath);
    });

    it('should fall back to filename only if still too long', () => {
      const longPath = '/path/to/very-long-filename-that-exceeds-limit.md';
      const result = recentFilesManager.formatFilePath(longPath, 20);
      expect(result).toBe('.../very-long-filename-that-exceeds-limit.md');
    });
  });

  describe('formatFileSize', () => {
    it('should return empty string for undefined bytes', () => {
      expect(recentFilesManager.formatFileSize()).toBe('');
      expect(recentFilesManager.formatFileSize(undefined)).toBe('');
    });

    it('should return empty string for zero bytes due to falsy check', () => {
      // The actual implementation has !bytes check first, which returns '' for 0
      expect(recentFilesManager.formatFileSize(0)).toBe('');
    });

    it('should format bytes correctly', () => {
      expect(recentFilesManager.formatFileSize(1024)).toBe('1.0 KB');
      expect(recentFilesManager.formatFileSize(1048576)).toBe('1.0 MB');
      expect(recentFilesManager.formatFileSize(512)).toBe('512.0 B');
      expect(recentFilesManager.formatFileSize(1500)).toBe('1.5 KB');
    });
  });

  describe('formatLastUsed', () => {
    it('should format recent times correctly', () => {
      // Use real dates without mocking Date.now to avoid timing issues
      const now = new Date();

      // Just now (30 seconds ago)
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      expect(recentFilesManager.formatLastUsed(thirtySecondsAgo)).toBe(
        'Just now',
      );

      // 30 minutes ago
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      expect(recentFilesManager.formatLastUsed(thirtyMinutesAgo)).toBe(
        '30m ago',
      );

      // 5 hours ago
      const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      expect(recentFilesManager.formatLastUsed(fiveHoursAgo)).toBe('5h ago');

      // 3 days ago
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(recentFilesManager.formatLastUsed(threeDaysAgo)).toBe('3d ago');

      // 2 weeks ago
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(recentFilesManager.formatLastUsed(twoWeeksAgo)).toBe('2w ago');

      // 2 months ago (should use date format)
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(recentFilesManager.formatLastUsed(twoMonthsAgo)).toMatch(
        /\d+\/\d+\/\d+/,
      );
    });

    it('should handle edge cases for time formatting', () => {
      const now = new Date();

      // Less than 1 minute (59 seconds)
      const almostOneMinute = new Date(now.getTime() - 59 * 1000);
      expect(recentFilesManager.formatLastUsed(almostOneMinute)).toBe(
        'Just now',
      );

      // Exactly 1 minute
      const oneMinute = new Date(now.getTime() - 60 * 1000);
      expect(recentFilesManager.formatLastUsed(oneMinute)).toBe('1m ago');

      // Exactly 1 hour
      const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
      expect(recentFilesManager.formatLastUsed(oneHour)).toBe('1h ago');

      // Exactly 1 day
      const oneDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(recentFilesManager.formatLastUsed(oneDay)).toBe('1d ago');
    });
  });

  describe('addFile', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Config not found'));
    });

    it('should add file successfully', async () => {
      const testPath = '/test/file.md';
      const testSize = 1000;

      mockFs.stat.mockResolvedValue({ size: testSize } as any);

      await recentFilesManager.addFile(testPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/current/dir', {
        recursive: true,
      });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/current/dir/recent-files.json',
        expect.stringContaining(testPath),
        'utf-8',
      );
    });

    it('should handle file stat errors gracefully', async () => {
      const testPath = '/test/file.md';

      mockFs.stat.mockRejectedValue(new Error('File not found'));

      await recentFilesManager.addFile(testPath);

      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle config save errors gracefully', async () => {
      const testPath = '/test/file.md';

      mockFs.stat.mockResolvedValue({ size: 1000 } as any);
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await recentFilesManager.addFile(testPath);

      // The actual error message comes from saveConfig, not addFile
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save recent files config'),
      );
    });

    it('should remove existing file and add to beginning', async () => {
      const testPath = '/test/file.md';
      const existingConfig = {
        maxFiles: 10,
        files: [
          {
            path: '/other/file.md',
            lastUsed: '2023-01-01T09:00:00Z',
            size: 500,
          },
          { path: testPath, lastUsed: '2023-01-01T08:00:00Z', size: 800 },
        ],
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingConfig));
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);

      await recentFilesManager.addFile(testPath);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedConfig = JSON.parse(writeCall[1] as string);

      expect(savedConfig.files).toHaveLength(2);
      expect(savedConfig.files[0].path).toBe(testPath);
      expect(savedConfig.files[0].size).toBe(1000);
      expect(savedConfig.files[1].path).toBe('/other/file.md');
    });

    it('should limit files to maxFiles', async () => {
      const existingFiles = Array.from({ length: 10 }, (_, i) => ({
        path: `/file${i}.md`,
        lastUsed: new Date(2023, 0, i + 1).toISOString(),
        size: 1000,
      }));

      const existingConfig = {
        maxFiles: 10,
        files: existingFiles,
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingConfig));
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);

      await recentFilesManager.addFile('/new/file.md');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedConfig = JSON.parse(writeCall[1] as string);

      expect(savedConfig.files).toHaveLength(10);
      expect(savedConfig.files[0].path).toBe('/new/file.md');
    });

    it('should set correct file type based on extension', async () => {
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);

      await recentFilesManager.addFile('/test/file.md');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedConfig = JSON.parse(writeCall[1] as string);

      expect(savedConfig.files[0].type).toBe('md');
    });

    it('should set markdown type for .markdown extension', async () => {
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);

      await recentFilesManager.addFile('/test/file.markdown');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedConfig = JSON.parse(writeCall[1] as string);

      expect(savedConfig.files[0].type).toBe('markdown');
    });
  });

  describe('getRecentFiles', () => {
    it('should return empty array when no config exists', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Config not found'));

      const result = await recentFilesManager.getRecentFiles();

      expect(result).toEqual([]);
    });

    it('should return valid files and filter out invalid ones', async () => {
      const configContent = {
        maxFiles: 10,
        files: [
          {
            path: '/valid/file1.md',
            lastUsed: '2023-01-01T10:00:00Z',
            size: 1000,
          },
          {
            path: '/invalid/file2.md',
            lastUsed: '2023-01-01T09:00:00Z',
            size: 2000,
          },
          {
            path: '/valid/file3.md',
            lastUsed: '2023-01-01T08:00:00Z',
            size: 1500,
          },
        ],
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(configContent));
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock access to simulate file existence
      mockFs.access
        .mockRejectedValueOnce(new Error('Not found')) // /valid/file1.md - doesn't exist
        .mockResolvedValueOnce(undefined) // /invalid/file2.md - exists
        .mockResolvedValueOnce(undefined); // /valid/file3.md - exists

      const result = await recentFilesManager.getRecentFiles();

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('/invalid/file2.md');
      expect(result[1].path).toBe('/valid/file3.md');
      expect(result[0].lastUsed).toBeInstanceOf(Date);
    });

    it('should handle config read errors gracefully', async () => {
      // Since the method catches all errors internally, we need to force an error in the main try-catch
      // The method will return empty array but won't log unless there's a specific error in the main catch block
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await recentFilesManager.getRecentFiles();

      expect(result).toEqual([]);
      // getRecentFiles catches all errors and returns empty array, console.warn is only called for outer errors
    });

    it('should convert date strings to Date objects', async () => {
      const configContent = {
        maxFiles: 10,
        files: [
          {
            path: '/test/file.md',
            lastUsed: '2023-01-01T10:00:00Z',
            size: 1000,
          },
        ],
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(configContent));
      mockFs.access.mockResolvedValue(undefined);

      const result = await recentFilesManager.getRecentFiles();

      expect(result).toHaveLength(1);
      expect(result[0].lastUsed).toBeInstanceOf(Date);
      expect(result[0].lastUsed.toISOString()).toBe('2023-01-01T10:00:00.000Z');
    });

    it('should update config when files are filtered out', async () => {
      const configContent = {
        maxFiles: 10,
        files: [
          {
            path: '/exists/file.md',
            lastUsed: '2023-01-01T10:00:00Z',
            size: 1000,
          },
          {
            path: '/missing/file.md',
            lastUsed: '2023-01-01T09:00:00Z',
            size: 2000,
          },
        ],
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(configContent));
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock access - first file exists, second doesn't
      mockFs.access
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await recentFilesManager.getRecentFiles();

      expect(result).toHaveLength(1);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/current/dir/recent-files.json',
        expect.stringContaining('/exists/file.md'),
        'utf-8',
      );
    });
  });

  describe('clearRecentFiles', () => {
    it('should clear all recent files', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await recentFilesManager.clearRecentFiles();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/current/dir/recent-files.json',
        expect.stringContaining('"files": []'),
        'utf-8',
      );
    });

    it('should handle clear errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await recentFilesManager.clearRecentFiles();

      // The actual error message comes from saveConfig, not clearRecentFiles
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save recent files config'),
      );
    });

    it('should set maxFiles correctly in cleared config', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await recentFilesManager.clearRecentFiles();

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedConfig = JSON.parse(writeCall[1] as string);

      expect(savedConfig.maxFiles).toBe(10);
      expect(savedConfig.files).toEqual([]);
    });
  });

  describe('getRecentFilePaths', () => {
    it('should return only file paths', async () => {
      const configContent = {
        maxFiles: 10,
        files: [
          { path: '/file1.md', lastUsed: '2023-01-01T10:00:00Z' },
          { path: '/file2.md', lastUsed: '2023-01-01T09:00:00Z' },
        ],
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(configContent));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.access.mockResolvedValue(undefined);

      const result = await recentFilesManager.getRecentFilePaths();

      expect(result).toEqual(['/file1.md', '/file2.md']);
    });

    it('should return empty array when no files exist', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Config not found'));

      const result = await recentFilesManager.getRecentFilePaths();

      expect(result).toEqual([]);
    });
  });

  describe('ensureConfig', () => {
    it('should create new config when none exists', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Config not found'));
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);
      mockFs.writeFile.mockResolvedValue(undefined);

      await recentFilesManager.addFile('/test/file.md');

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/current/dir', {
        recursive: true,
      });
      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/test/current/dir/recent-files.json',
        'utf-8',
      );
    });

    it('should handle invalid JSON in config file', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('invalid json');
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);
      mockFs.writeFile.mockResolvedValue(undefined);

      await recentFilesManager.addFile('/test/file.md');

      // Should still work, creating new config
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle mkdir errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      mockFs.readFile.mockRejectedValue(new Error('Config not found'));
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await recentFilesManager.addFile('/test/file.md');

      // Should still work with fallback empty config, but fail on saveConfig
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save recent files config'),
      );
    });
  });
});
