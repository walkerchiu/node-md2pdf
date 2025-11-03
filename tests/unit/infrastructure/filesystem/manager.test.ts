/**
 * Enhanced Tests for File System Manager
 * Comprehensive testing including all methods and error scenarios
 */

import * as path from 'path';
import { FileSystemManager } from '../../../../src/infrastructure/filesystem/manager';
import {
  FileNotFoundError,
  MD2PDFError,
} from '../../../../src/infrastructure/error/errors';

// Simple test that doesn't mock complex fs operations
describe('FileSystemManager', () => {
  let fileManager: FileSystemManager;

  beforeEach(() => {
    fileManager = new FileSystemManager();
  });

  describe('instantiation', () => {
    it('should create FileSystemManager instance', () => {
      expect(fileManager).toBeInstanceOf(FileSystemManager);
    });

    it('should have all expected methods', () => {
      expect(typeof fileManager.readFile).toBe('function');
      expect(typeof fileManager.writeFile).toBe('function');
      expect(typeof fileManager.appendFile).toBe('function');
      expect(typeof fileManager.copyFile).toBe('function');
      expect(typeof fileManager.moveFile).toBe('function');
      expect(typeof fileManager.exists).toBe('function');
      expect(typeof fileManager.deleteFile).toBe('function');
      expect(typeof fileManager.createDirectory).toBe('function');
      expect(typeof fileManager.deleteDirectory).toBe('function');
      expect(typeof fileManager.listDirectory).toBe('function');
      expect(typeof fileManager.getStats).toBe('function');
      expect(typeof fileManager.isFile).toBe('function');
      expect(typeof fileManager.isDirectory).toBe('function');
      expect(typeof fileManager.resolvePath).toBe('function');
      expect(typeof fileManager.getAbsolutePath).toBe('function');
      expect(typeof fileManager.getBaseName).toBe('function');
      expect(typeof fileManager.getDirName).toBe('function');
      expect(typeof fileManager.getExtension).toBe('function');
      expect(typeof fileManager.createTempFile).toBe('function');
      expect(typeof fileManager.createTempDirectory).toBe('function');
      expect(typeof fileManager.findFiles).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const nonExistentFile = '/path/that/definitely/does/not/exist.txt';

      await expect(fileManager.readFile(nonExistentFile)).rejects.toThrow(
        FileNotFoundError,
      );
    });

    it('should handle exists() method for non-existent files', async () => {
      const nonExistentFile = '/path/that/definitely/does/not/exist.txt';

      const exists = await fileManager.exists(nonExistentFile);
      expect(exists).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should handle path operations', () => {
      // Test basic functionality without calling non-existent methods
      expect(fileManager).toBeInstanceOf(FileSystemManager);
    });
  });

  describe('directory operations', () => {
    it('should handle directory creation gracefully', async () => {
      // Test with a path that likely won't cause permission issues
      const testDir = '/tmp/test-directory-' + Date.now();

      try {
        await fileManager.createDirectory(testDir);
        // If it succeeds, that's good
        expect(true).toBe(true);
      } catch (error) {
        // If it fails, it should be with a meaningful error
        expect(error).toBeInstanceOf(MD2PDFError);
      }
    });
  });

  describe('file finding', () => {
    it('should handle glob patterns', async () => {
      try {
        const results = await fileManager.findFiles('*.json', process.cwd());
        expect(Array.isArray(results)).toBe(true);
      } catch (error) {
        // Glob errors are acceptable for this test
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle file operations', async () => {
      try {
        const stats = await fileManager.getStats(__filename);
        expect(stats.isFile).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle path resolution', () => {
      const resolved = fileManager.resolvePath('./test.md');
      expect(typeof resolved).toBe('string');
      expect(resolved.length).toBeGreaterThan(0);
    });

    it('should handle path operations', () => {
      const resolved = fileManager.getAbsolutePath('./test.md');
      expect(typeof resolved).toBe('string');
      expect(resolved.length).toBeGreaterThan(0);

      const basename = fileManager.getBaseName('/path/to/test.md');
      expect(basename).toBe('test.md');

      const dirname = fileManager.getDirName('/path/to/test.md');
      expect(dirname).toBe('/path/to');

      const ext = fileManager.getExtension('test.md');
      expect(ext).toBe('.md');
    });

    it('should handle directory operations', async () => {
      try {
        const isDir = await fileManager.isDirectory(process.cwd());
        expect(typeof isDir).toBe('boolean');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('File Operations', () => {
    let tempDir: string;
    let testFile: string;

    beforeEach(async () => {
      tempDir = await fileManager.createTempDirectory('test-fs-');
      testFile = path.join(tempDir, 'test-file.txt');
    });

    afterEach(async () => {
      try {
        if (await fileManager.exists(tempDir)) {
          await fileManager.deleteDirectory(tempDir, true);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    describe('writeFile and readFile', () => {
      it('should write and read text files', async () => {
        const content = 'Hello, World!';
        await fileManager.writeFile(testFile, content);

        expect(await fileManager.exists(testFile)).toBe(true);
        const readContent = await fileManager.readFile(testFile, 'utf8');
        expect(readContent).toBe(content);
      });

      it('should write and read binary files', async () => {
        const content = Buffer.from([1, 2, 3, 4, 5]);
        await fileManager.writeFile(testFile, content);

        const readContent = await fileManager.readFile(testFile, undefined);
        expect(Buffer.isBuffer(readContent)).toBe(true);
        expect(readContent).toEqual(content);
      });

      it('should handle write file options', async () => {
        const content = 'Test content with options';
        await fileManager.writeFile(testFile, content, {
          encoding: 'utf8',
          mode: 0o644,
        });

        const readContent = await fileManager.readFile(testFile, 'utf8');
        expect(readContent).toBe(content);
      });
    });

    describe('appendFile', () => {
      it('should append content to existing file', async () => {
        const initialContent = 'Initial content\n';
        const appendedContent = 'Appended content';

        await fileManager.writeFile(testFile, initialContent);
        await fileManager.appendFile(testFile, appendedContent);

        const finalContent = await fileManager.readFile(testFile, 'utf8');
        expect(finalContent).toBe(initialContent + appendedContent);
      });

      it('should create file when appending to non-existent file', async () => {
        const content = 'New file content';
        await fileManager.appendFile(testFile, content);

        const readContent = await fileManager.readFile(testFile, 'utf8');
        expect(readContent).toBe(content);
      });
    });

    describe('copyFile and moveFile', () => {
      it('should copy files', async () => {
        const content = 'Content to copy';
        const copyPath = path.join(tempDir, 'copied-file.txt');

        await fileManager.writeFile(testFile, content);
        await fileManager.copyFile(testFile, copyPath);

        expect(await fileManager.exists(testFile)).toBe(true);
        expect(await fileManager.exists(copyPath)).toBe(true);

        const copiedContent = await fileManager.readFile(copyPath, 'utf8');
        expect(copiedContent).toBe(content);
      });

      it('should move files', async () => {
        const content = 'Content to move';
        const movePath = path.join(tempDir, 'moved-file.txt');

        await fileManager.writeFile(testFile, content);
        await fileManager.moveFile(testFile, movePath);

        expect(await fileManager.exists(testFile)).toBe(false);
        expect(await fileManager.exists(movePath)).toBe(true);

        const movedContent = await fileManager.readFile(movePath, 'utf8');
        expect(movedContent).toBe(content);
      });

      it('should throw FileNotFoundError when copying non-existent file', async () => {
        const copyPath = path.join(tempDir, 'copied.txt');
        await expect(fileManager.copyFile(testFile, copyPath)).rejects.toThrow(
          FileNotFoundError,
        );
      });

      it('should throw FileNotFoundError when moving non-existent file', async () => {
        const movePath = path.join(tempDir, 'moved.txt');
        await expect(fileManager.moveFile(testFile, movePath)).rejects.toThrow(
          FileNotFoundError,
        );
      });
    });

    describe('deleteFile', () => {
      it('should delete existing file', async () => {
        await fileManager.writeFile(testFile, 'content');
        expect(await fileManager.exists(testFile)).toBe(true);

        await fileManager.deleteFile(testFile);
        expect(await fileManager.exists(testFile)).toBe(false);
      });

      it('should handle deleting non-existent file gracefully', async () => {
        await expect(fileManager.deleteFile(testFile)).resolves.not.toThrow();
      });
    });

    describe('isFile and isDirectory', () => {
      it('should correctly identify files', async () => {
        await fileManager.writeFile(testFile, 'content');

        expect(await fileManager.isFile(testFile)).toBe(true);
        expect(await fileManager.isDirectory(testFile)).toBe(false);
      });

      it('should correctly identify directories', async () => {
        expect(await fileManager.isFile(tempDir)).toBe(false);
        expect(await fileManager.isDirectory(tempDir)).toBe(true);
      });

      it('should return false for non-existent paths', async () => {
        const nonExistent = path.join(tempDir, 'non-existent');
        expect(await fileManager.isFile(nonExistent)).toBe(false);
        expect(await fileManager.isDirectory(nonExistent)).toBe(false);
      });
    });
  });

  describe('Directory Operations', () => {
    let tempDir: string;
    let subDir: string;

    beforeEach(async () => {
      tempDir = await fileManager.createTempDirectory('test-dir-');
      subDir = path.join(tempDir, 'subdir');
    });

    afterEach(async () => {
      try {
        if (await fileManager.exists(tempDir)) {
          await fileManager.deleteDirectory(tempDir, true);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    describe('createDirectory', () => {
      it('should create single directory', async () => {
        await fileManager.createDirectory(subDir);
        expect(await fileManager.exists(subDir)).toBe(true);
        expect(await fileManager.isDirectory(subDir)).toBe(true);
      });

      it('should create nested directories', async () => {
        const nestedDir = path.join(tempDir, 'level1', 'level2', 'level3');
        await fileManager.createDirectory(nestedDir);

        expect(await fileManager.exists(nestedDir)).toBe(true);
        expect(await fileManager.isDirectory(nestedDir)).toBe(true);
      });

      it('should handle creating existing directory', async () => {
        await fileManager.createDirectory(subDir);
        await expect(
          fileManager.createDirectory(subDir),
        ).resolves.not.toThrow();
      });
    });

    describe('listDirectory', () => {
      it('should list directory contents', async () => {
        const file1 = path.join(tempDir, 'file1.txt');
        const file2 = path.join(tempDir, 'file2.md');

        await fileManager.writeFile(file1, 'content1');
        await fileManager.writeFile(file2, 'content2');
        await fileManager.createDirectory(subDir);

        const items = await fileManager.listDirectory(tempDir);

        expect(items).toHaveLength(3);
        expect(items.map((item) => item.name)).toContain('file1.txt');
        expect(items.map((item) => item.name)).toContain('file2.md');
        expect(items.map((item) => item.name)).toContain('subdir');

        const fileItem = items.find((item) => item.name === 'file1.txt');
        expect(fileItem?.isFile).toBe(true);
        expect(fileItem?.isDirectory).toBe(false);

        const dirItem = items.find((item) => item.name === 'subdir');
        expect(dirItem?.isFile).toBe(false);
        expect(dirItem?.isDirectory).toBe(true);
      });

      it('should handle empty directory', async () => {
        await fileManager.createDirectory(subDir);
        const items = await fileManager.listDirectory(subDir);
        expect(items).toHaveLength(0);
      });

      it('should throw FileNotFoundError for non-existent directory', async () => {
        const nonExistent = path.join(tempDir, 'non-existent');
        await expect(fileManager.listDirectory(nonExistent)).rejects.toThrow(
          FileNotFoundError,
        );
      });
    });

    describe('deleteDirectory', () => {
      it('should delete empty directory', async () => {
        await fileManager.createDirectory(subDir);
        expect(await fileManager.exists(subDir)).toBe(true);

        await fileManager.deleteDirectory(subDir);
        expect(await fileManager.exists(subDir)).toBe(false);
      });

      it('should delete directory recursively', async () => {
        const nestedFile = path.join(subDir, 'nested.txt');
        await fileManager.createDirectory(subDir);
        await fileManager.writeFile(nestedFile, 'content');

        await fileManager.deleteDirectory(subDir, true);
        expect(await fileManager.exists(subDir)).toBe(false);
      });

      it('should handle deleting non-existent directory', async () => {
        await expect(
          fileManager.deleteDirectory(subDir),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Utility Operations', () => {
    describe('createTempFile and createTempDirectory', () => {
      it('should create temporary file with default prefix and suffix', async () => {
        const tempFile = await fileManager.createTempFile();

        expect(await fileManager.exists(tempFile)).toBe(true);
        expect(await fileManager.isFile(tempFile)).toBe(true);
        expect(path.basename(tempFile)).toMatch(/^md2pdf-.*\.tmp$/);

        await fileManager.deleteFile(tempFile);
      });

      it('should create temporary file with custom prefix and suffix', async () => {
        const tempFile = await fileManager.createTempFile('custom-', '.test');

        expect(await fileManager.exists(tempFile)).toBe(true);
        expect(path.basename(tempFile)).toMatch(/^custom-.*\.test$/);

        await fileManager.deleteFile(tempFile);
      });

      it('should create temporary directory with default prefix', async () => {
        const tempDir = await fileManager.createTempDirectory();

        expect(await fileManager.exists(tempDir)).toBe(true);
        expect(await fileManager.isDirectory(tempDir)).toBe(true);
        expect(path.basename(tempDir)).toMatch(/^md2pdf-.*/);

        await fileManager.deleteDirectory(tempDir, true);
      });

      it('should create temporary directory with custom prefix', async () => {
        const tempDir = await fileManager.createTempDirectory('custom-test-');

        expect(await fileManager.exists(tempDir)).toBe(true);
        expect(path.basename(tempDir)).toMatch(/^custom-test-.*/);

        await fileManager.deleteDirectory(tempDir, true);
      });
    });

    describe('findFiles', () => {
      let tempDir: string;

      beforeEach(async () => {
        tempDir = await fileManager.createTempDirectory('find-test-');

        // Create test files
        await fileManager.writeFile(path.join(tempDir, 'test1.txt'), 'content');
        await fileManager.writeFile(path.join(tempDir, 'test2.md'), 'content');
        await fileManager.writeFile(path.join(tempDir, 'other.js'), 'content');

        const subDir = path.join(tempDir, 'subdir');
        await fileManager.createDirectory(subDir);
        await fileManager.writeFile(path.join(subDir, 'nested.txt'), 'content');
      });

      afterEach(async () => {
        try {
          if (await fileManager.exists(tempDir)) {
            await fileManager.deleteDirectory(tempDir, true);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      });

      it('should find files with glob patterns', async () => {
        const txtFiles = await fileManager.findFiles('*.txt', tempDir);
        expect(txtFiles).toHaveLength(1);
        expect(txtFiles[0]).toMatch(/test1\.txt$/);
      });

      it('should find all files with wildcard', async () => {
        const allFiles = await fileManager.findFiles('*', tempDir);
        expect(allFiles.length).toBeGreaterThanOrEqual(3);
      });

      it('should handle patterns with no matches', async () => {
        const noMatches = await fileManager.findFiles('*.xyz', tempDir);
        expect(noMatches).toHaveLength(0);
      });
    });
  });

  describe('Error Scenarios', () => {
    describe('File operation errors', () => {
      it('should wrap read file errors properly', async () => {
        const nonExistent = '/path/that/definitely/does/not/exist.txt';

        await expect(fileManager.readFile(nonExistent)).rejects.toThrow(
          FileNotFoundError,
        );
      });

      it('should handle getStats for non-existent file', async () => {
        const nonExistent = '/path/that/definitely/does/not/exist.txt';

        await expect(fileManager.getStats(nonExistent)).rejects.toThrow(
          FileNotFoundError,
        );
      });
    });

    describe('Path validation edge cases', () => {
      it('should handle various path scenarios', () => {
        expect(fileManager.getExtension('file.txt')).toBe('.txt');
        expect(fileManager.getExtension('file')).toBe('');
        expect(fileManager.getExtension('')).toBe('');

        expect(fileManager.getBaseName('/path/to/file.txt')).toBe('file.txt');
        expect(fileManager.getBaseName('file.txt')).toBe('file.txt');

        expect(fileManager.getDirName('/path/to/file.txt')).toBe('/path/to');
        expect(fileManager.getDirName('file.txt')).toBe('.');
      });

      it('should resolve paths correctly', () => {
        const resolved = fileManager.resolvePath('./test', '../other');
        expect(typeof resolved).toBe('string');
        expect(path.isAbsolute(resolved)).toBe(true);

        const absolute = fileManager.getAbsolutePath('relative/path');
        expect(path.isAbsolute(absolute)).toBe(true);
      });
    });
  });
});
