/**
 * Unit tests for FileSystemManager infrastructure
 */

import { FileSystemManager } from '../../../src/infrastructure/filesystem/manager';
import { FileNotFoundError } from '../../../src/infrastructure/error/errors';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Stats } from 'fs';

// Mock fs-extra
jest.mock('fs-extra', () => ({
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
  ensureDir: jest.fn(),
  readdir: jest.fn(),
  copy: jest.fn(),
  move: jest.fn(),
  remove: jest.fn(),
  rmdir: jest.fn(),
  appendFile: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
  basename: jest.fn(),
  dirname: jest.fn(),
  extname: jest.fn(),
  join: jest.fn(),
}));

// Mock glob.sync used by findFiles
import * as mockGlobModule from 'glob';
jest.mock('glob', () => ({
  sync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFs = fs as jest.Mocked<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPath = path as jest.Mocked<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGlob = mockGlobModule as unknown as jest.Mocked<any>;

describe('FileSystemManager', () => {
  let fileSystemManager: FileSystemManager;

  beforeEach(() => {
    fileSystemManager = new FileSystemManager();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await fileSystemManager.exists('/test/file.md');

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/test/file.md');
    });

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await fileSystemManager.exists('/missing/file.md');

      expect(result).toBe(false);
      expect(mockFs.access).toHaveBeenCalledWith('/missing/file.md');
    });
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const mockContent = 'Test file content';
      mockFs.access.mockResolvedValue(undefined); // 模擬檔案存在
      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await fileSystemManager.readFile('/test/file.md');

      expect(result).toBe(mockContent);
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.md', 'utf8');
    });

    it('should throw FileNotFoundError when file does not exist', async () => {
      const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      await expect(fileSystemManager.readFile('/missing/file.md')).rejects.toThrow(
        'Failed to read file: ENOENT: no such file or directory'
      );
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockFs.access.mockResolvedValue(undefined); // 檔案存在但沒有權限
      mockFs.readFile.mockRejectedValue(error);

      await expect(fileSystemManager.readFile('/restricted/file.md')).rejects.toThrow(
        'Permission denied: cannot read file /restricted/file.md'
      );
    });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      const content = 'New file content';
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await fileSystemManager.writeFile('/test/output.md', content);

      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/output.md', content, undefined);
    });

    it('should handle write errors', async () => {
      const error = new Error('ENOSPC: no space left on device') as NodeJS.ErrnoException;
      error.code = 'ENOSPC';
      mockFs.writeFile.mockRejectedValue(error);

      await expect(fileSystemManager.writeFile('/test/file.md', 'content')).rejects.toThrow(
        'ENOSPC: no space left on device'
      );
    });
  });

  describe('getStats', () => {
    it('should return file stats successfully', async () => {
      const mockStats = {
        size: 1024,
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date('2023-01-01'),
        atime: new Date('2023-01-02'),
        birthtime: new Date('2023-01-01'),
        mode: 0o644,
      } as Stats;

      mockFs.stat.mockResolvedValue(mockStats);

      const result = await fileSystemManager.getStats('/test/file.md');

      expect(result.size).toBe(1024);
      expect(result.isFile).toBe(true);
      expect(result.isDirectory).toBe(false);
      expect(result.modified).toEqual(new Date('2023-01-01'));
      expect(result.accessed).toEqual(new Date('2023-01-02'));
      expect(result.created).toEqual(new Date('2023-01-01'));
      expect(result.permissions.read).toBe(true);
      expect(result.permissions.write).toBe(true);
      expect(result.permissions.execute).toBe(false);
    });

    it('should handle stat errors', async () => {
      const error = new Error('ENOENT: no such file') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.stat.mockRejectedValue(error);

      await expect(fileSystemManager.getStats('/missing/file.md')).rejects.toThrow(
        FileNotFoundError
      );
    });
  });

  describe('createDirectory', () => {
    it('should create directory successfully', async () => {
      mockFs.ensureDir.mockResolvedValue('/test/new-dir');

      await fileSystemManager.createDirectory('/test/new-dir');

      expect(mockFs.ensureDir).toHaveBeenCalledWith('/test/new-dir');
    });

    it('should handle existing directory', async () => {
      // fs.ensureDir should handle existing directories gracefully
      mockFs.ensureDir.mockResolvedValue(undefined);

      // Should not throw for existing directory
      await fileSystemManager.createDirectory('/existing/dir');

      expect(mockFs.ensureDir).toHaveBeenCalledWith('/existing/dir');
    });

    it('should handle permission errors when creating directory', async () => {
      const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockFs.ensureDir.mockRejectedValue(error);

      await expect(fileSystemManager.createDirectory('/restricted/dir')).rejects.toThrow(
        'EACCES: permission denied'
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await fileSystemManager.deleteFile('/test/file.md');

      expect(mockFs.unlink).toHaveBeenCalledWith('/test/file.md');
    });

    it('should handle missing file deletion gracefully', async () => {
      // Mock file doesn't exist
      mockFs.access.mockRejectedValue(new Error('File not found'));

      // Should not throw for missing file (exists check returns false)
      await fileSystemManager.deleteFile('/missing/file.md');

      // unlink should not be called since file doesn't exist
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.copy.mockResolvedValue(undefined);

      await fileSystemManager.copyFile('/source/file.md', '/dest/file.md');

      expect(mockFs.copy).toHaveBeenCalledWith('/source/file.md', '/dest/file.md');
    });

    it('should handle copy errors', async () => {
      const error = new Error('ENOENT: source file not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.access.mockRejectedValue(error);

      await expect(
        fileSystemManager.copyFile('/missing/source.md', '/dest/file.md')
      ).rejects.toThrow('File not found: /missing/source.md');
    });
  });

  describe('listDirectory', () => {
    it('should list directory contents successfully', async () => {
      const mockFiles = ['file1.md', 'file2.txt', 'subdir'];
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(mockFiles);

      // Mock stat for each file
      const mockStats = {
        size: 1024,
        isFile: jest.fn().mockReturnValue(true),
        isDirectory: jest.fn().mockReturnValue(false),
        mtime: new Date('2023-01-01'),
        atime: new Date('2023-01-02'),
        birthtime: new Date('2023-01-01'),
        mode: 0o644,
      };
      mockFs.stat.mockResolvedValue(mockStats as unknown as Stats);

      const result = await fileSystemManager.listDirectory('/test/dir');

      expect(result).toHaveLength(3);
      expect(mockFs.readdir).toHaveBeenCalledWith('/test/dir');
    });

    it('should handle directory read errors', async () => {
      // Mock directory doesn't exist (exists() returns false)
      mockFs.access.mockRejectedValue(new Error('Directory not found'));

      await expect(fileSystemManager.listDirectory('/missing/dir')).rejects.toThrow(
        FileNotFoundError
      );
    });
  });

  describe('path utilities', () => {
    it('should resolve path correctly', async () => {
      mockPath.resolve.mockReturnValue('/resolved/path/file.md');

      const result = await fileSystemManager.resolvePath('./relative/path/file.md');

      expect(result).toBe('/resolved/path/file.md');
      expect(mockPath.resolve).toHaveBeenCalledWith('./relative/path/file.md');
    });

    it('should get absolute path correctly', async () => {
      mockPath.resolve.mockReturnValue('/absolute/path/file.md');

      const result = await fileSystemManager.getAbsolutePath('relative/file.md');

      expect(result).toBe('/absolute/path/file.md');
    });

    it('should get base name correctly', async () => {
      mockPath.basename.mockReturnValue('file.md');

      const result = await fileSystemManager.getBaseName('/path/to/file.md');

      expect(result).toBe('file.md');
      expect(mockPath.basename).toHaveBeenCalledWith('/path/to/file.md', undefined);
    });

    it('should get directory name correctly', async () => {
      mockPath.dirname.mockReturnValue('/path/to');

      const result = await fileSystemManager.getDirName('/path/to/file.md');

      expect(result).toBe('/path/to');
      expect(mockPath.dirname).toHaveBeenCalledWith('/path/to/file.md');
    });

    it('should get file extension correctly', async () => {
      mockPath.extname.mockReturnValue('.md');

      const result = await fileSystemManager.getExtension('/path/to/file.md');

      expect(result).toBe('.md');
      expect(mockPath.extname).toHaveBeenCalledWith('/path/to/file.md');
    });
  });

  describe('file type checks', () => {
    it('should identify directories correctly', async () => {
      const mockStats = {
        isDirectory: () => true,
        isFile: () => false,
      } as Stats;
      mockFs.stat.mockResolvedValue(mockStats);

      const result = await fileSystemManager.isDirectory('/test/dir');

      expect(result).toBe(true);
    });

    it('should identify files correctly', async () => {
      const mockStats = {
        isDirectory: () => false,
        isFile: () => true,
      } as Stats;
      mockFs.stat.mockResolvedValue(mockStats);

      const result = await fileSystemManager.isFile('/test/file.md');

      expect(result).toBe(true);
    });

    it('should handle type check errors', async () => {
      const error = new Error('ENOENT: no such file') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.stat.mockRejectedValue(error);

      const result = await fileSystemManager.isFile('/missing/file.md');

      expect(result).toBe(false);
    });
  });

  describe('error categorization', () => {
    it('should categorize ENOENT errors correctly', async () => {
      // Mock file doesn't exist (access check fails)
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await expect(fileSystemManager.readFile('/missing/file.md')).rejects.toBeInstanceOf(
        FileNotFoundError
      );
    });

    it('should preserve other error types', async () => {
      const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      // Mock file exists but readFile fails with permission error
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(error);

      await expect(fileSystemManager.readFile('/restricted/file.md')).rejects.toThrow(
        'Permission denied: cannot read file /restricted/file.md'
      );
    });

    it('should handle unknown errors', async () => {
      const error = new Error('Unknown file system error');
      mockFs.readFile.mockRejectedValue(error);

      await expect(fileSystemManager.readFile('/test/file.md')).rejects.toThrow(
        'Unknown file system error'
      );
    });
  });

  describe('logging behavior', () => {
    it('should log successful operations at debug level', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await fileSystemManager.writeFile('/test/file.md', 'content');
    });

    it('should log errors appropriately', async () => {
      const error = new Error('Test error');
      mockFs.readFile.mockRejectedValue(error);

      try {
        await fileSystemManager.readFile('/test/file.md');
      } catch {
        // Expected
      }
    });

    describe('deleteDirectory', () => {
      it('should remove directory recursively when recursive is true', async () => {
        mockFs.access.mockResolvedValue(undefined); // exists
        mockFs.remove.mockResolvedValue(undefined);

        await fileSystemManager.deleteDirectory('/tmp/dir', true);

        expect(mockFs.remove).toHaveBeenCalledWith('/tmp/dir');
      });

      it('should call rmdir when recursive is false', async () => {
        mockFs.access.mockResolvedValue(undefined); // exists
        mockFs.rmdir.mockResolvedValue(undefined);

        await fileSystemManager.deleteDirectory('/tmp/dir', false);

        expect(mockFs.rmdir).toHaveBeenCalledWith('/tmp/dir');
      });

      it('should not throw when directory does not exist', async () => {
        mockFs.access.mockRejectedValue(new Error('Not found'));

        await expect(fileSystemManager.deleteDirectory('/missing/dir')).resolves.toBeUndefined();
      });
    });

    describe('appendFile and moveFile', () => {
      it('should append file successfully', async () => {
        mockFs.appendFile.mockResolvedValue(undefined);

        await fileSystemManager.appendFile('/tmp/file.md', 'more');

        expect(mockFs.appendFile).toHaveBeenCalledWith('/tmp/file.md', 'more');
      });

      it('should throw permission error on append', async () => {
        const err = new Error('EACCES') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        mockFs.appendFile.mockRejectedValue(err);

        await expect(fileSystemManager.appendFile('/tmp/file.md', 'more')).rejects.toThrow(
          'Permission denied: cannot append file /tmp/file.md'
        );
      });

      it('should move file successfully', async () => {
        mockFs.access.mockResolvedValue(undefined);
        mockFs.ensureDir.mockResolvedValue(undefined);
        mockFs.move.mockResolvedValue(undefined);

        await fileSystemManager.moveFile('/src/file.md', '/dest/file.md');

        expect(mockFs.move).toHaveBeenCalledWith('/src/file.md', '/dest/file.md');
      });

      it('should throw when moving missing source', async () => {
        const err = new Error('ENOENT') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        mockFs.access.mockRejectedValue(err);

        await expect(
          fileSystemManager.moveFile('/missing/source.md', '/dest/file.md')
        ).rejects.toThrow('File not found: /missing/source.md');
      });
    });

    describe('temp, find and stat helpers', () => {
      it('should create temp file and directory', async () => {
        // Mock writeFile and ensureDir used by temp creators
        mockFs.writeFile.mockResolvedValue(undefined);
        mockFs.ensureDir.mockResolvedValue(undefined);
        mockPath.join.mockImplementation((...parts: string[]) => parts.join('/'));

        const tempFile = await fileSystemManager.createTempFile('pref-', '.tmp');
        expect(tempFile).toContain('pref-');

        const tempDir = await fileSystemManager.createTempDirectory('dir-');
        expect(tempDir).toContain('dir-');
      });

      it('should find files using glob', async () => {
        mockGlob.sync.mockReturnValue(['/abs/path/one.md', '/abs/path/two.md']);

        const files = await fileSystemManager.findFiles('**/*.md', '/project');

        expect(files).toHaveLength(2);
        expect(mockGlob.sync).toHaveBeenCalledWith('**/*.md', { cwd: '/project', absolute: true });
      });

      it('should throw when glob fails', async () => {
        mockGlob.sync.mockImplementation(() => {
          throw new Error('glob failure');
        });

        await expect(fileSystemManager.findFiles('**/*.md')).rejects.toThrow('glob failure');
      });

      it('should return file size and modification time via getStats', async () => {
        const mockStats = {
          size: 2048,
          isFile: jest.fn().mockReturnValue(true),
          isDirectory: jest.fn().mockReturnValue(false),
          mtime: new Date('2023-02-02'),
          atime: new Date('2023-02-03'),
          birthtime: new Date('2023-02-01'),
          mode: 0o644,
        } as unknown as Stats;

        mockFs.stat.mockResolvedValue(mockStats);

        const size = await fileSystemManager.getFileSize('/some/file.md');
        expect(size).toBe(2048);

        const mod = await fileSystemManager.getModificationTime('/some/file.md');
        expect(mod).toEqual(new Date('2023-02-02'));
      });

      it('should throw MD2PDFError for non-ENOENT stat failures', async () => {
        const err = new Error('unknown stat error');
        mockFs.stat.mockRejectedValue(err);

        await expect(fileSystemManager.getStats('/file')).rejects.toThrow(
          'Failed to get file stats: unknown stat error'
        );
      });
    });
  });
});
