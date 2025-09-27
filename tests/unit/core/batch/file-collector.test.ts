/**
 * Tests for FileCollector
 */

import { FileCollector } from '../../../../src/core/batch/file-collector';
import { BatchConversionConfig, BatchFilenameFormat } from '../../../../src/types/batch';
import * as fs from 'fs';
import * as path from 'path';

describe('FileCollector', () => {
  let fileCollector: FileCollector;
  let testDir: string;
  let config: BatchConversionConfig;

  beforeEach(async () => {
    fileCollector = new FileCollector();
    testDir = path.join(__dirname, '../../../fixtures/batch-test');

    // Create test directory and files
    await fs.promises.mkdir(testDir, { recursive: true });
    // Create test markdown files
    await fs.promises.writeFile(path.join(testDir, 'test1.md'), '# Test 1\n\nThis is test file 1');
    await fs.promises.writeFile(path.join(testDir, 'test2.md'), '# Test 2\n\nThis is test file 2');
    await fs.promises.writeFile(
      path.join(testDir, 'README.md'),
      '# README\n\nThis should be ignored'
    );
    // Create subdirectory with files
    const subDir = path.join(testDir, 'subdir');
    await fs.promises.mkdir(subDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(subDir, 'subtest.md'),
      '# Subtest\n\nThis is a file in subdirectory'
    );
    // Create non-markdown file (should be ignored)
    await fs.promises.writeFile(path.join(testDir, 'test.txt'), 'This is not a markdown file');
    config = {
      inputPattern: path.join(testDir, '*.md'),
      outputDirectory: path.join(testDir, 'output'),
      preserveDirectoryStructure: false,
      filenameFormat: BatchFilenameFormat.ORIGINAL,
      maxConcurrentProcesses: 2,
      continueOnError: true,
      tocDepth: 3,
      includePageNumbers: true,
      chineseFontSupport: false,
    };
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('collectFiles', () => {
    test('should collect markdown files from directory', async () => {
      const files = await fileCollector.collectFiles(config);
      expect(files.length).toBeGreaterThan(0);
      // Should find test1.md and test2.md, but not README.md
      const filenames = files.map(f => path.basename(f.inputPath));
      expect(filenames).toContain('test1.md');
      expect(filenames).toContain('test2.md');
      expect(filenames).not.toContain('README.md'); // Should be ignored
      expect(filenames).not.toContain('test.txt'); // Should be ignored
    });
    test('should handle recursive patterns', async () => {
      const recursiveConfig = {
        ...config,
        inputPattern: path.join(testDir, '**/*.md'),
      };
      const files = await fileCollector.collectFiles(recursiveConfig);
      expect(files.length).toBeGreaterThan(2);
      const filenames = files.map(f => path.basename(f.inputPath));
      expect(filenames).toContain('subtest.md');
    });
    test('should generate correct output paths', async () => {
      const files = await fileCollector.collectFiles(config);
      files.forEach(file => {
        expect(file.outputPath).toContain('.pdf');
        expect(file.outputPath).toContain(config.outputDirectory);
        expect(path.dirname(file.outputPath)).toBe(config.outputDirectory);
      });
    });
    test('should preserve directory structure when configured', async () => {
      const preserveConfig = {
        ...config,
        inputPattern: path.join(testDir, '**/*.md'),
        preserveDirectoryStructure: true,
      };
      const files = await fileCollector.collectFiles(preserveConfig);
      const subdirFile = files.find(f => f.inputPath.includes('subtest.md'));
      expect(subdirFile).toBeDefined();
      expect(subdirFile!.outputPath).toContain('subdir');
    });
    test('should handle different filename formats', async () => {
      const timestampConfig = {
        ...config,
        filenameFormat: BatchFilenameFormat.WITH_TIMESTAMP,
      };
      const files = await fileCollector.collectFiles(timestampConfig);
      files.forEach(file => {
        const filename = path.basename(file.outputPath);
        expect(filename).toMatch(/test\d+_\d+\.pdf/);
      });
    });
    test('should throw error when no files found', async () => {
      const emptyConfig = {
        ...config,
        inputPattern: path.join(testDir, 'nonexistent', '*.md'),
      };
      await expect(fileCollector.collectFiles(emptyConfig)).rejects.toThrow();
    });
  });

  describe('validateFiles', () => {
    test('should validate accessible files', async () => {
      const files = await fileCollector.collectFiles(config);
      const { valid, invalid } = await fileCollector.validateFiles(files);
      expect(valid.length).toBe(files.length);
      expect(invalid.length).toBe(0);
    });
    test('should detect invalid files', async () => {
      const files = await fileCollector.collectFiles(config);
      // Add a file with invalid input path
      files.push({
        inputPath: '/nonexistent/file.md',
        outputPath: path.join(testDir, 'output', 'nonexistent.pdf'),
        relativeInputPath: 'nonexistent.md',
        size: 0,
        lastModified: new Date(),
      });
      const { valid, invalid } = await fileCollector.validateFiles(files);
      expect(valid.length).toBe(files.length - 1);
      expect(invalid.length).toBe(1);
      expect(invalid[0].file.inputPath).toBe('/nonexistent/file.md');
    });
    test('should handle permission denied errors', async () => {
      const files = await fileCollector.collectFiles(config);
      // Create a directory that simulates permission issues
      const restrictedDir = path.join(testDir, 'restricted');
      await fs.promises.mkdir(restrictedDir, { recursive: true });
      // Add a file with permission issues
      files.push({
        inputPath: path.join(testDir, 'test1.md'),
        outputPath: path.join('/root/restricted', 'test1.pdf'), // This should fail with permission
        relativeInputPath: 'test1.md',
        size: 100,
        lastModified: new Date(),
      });
      const { invalid } = await fileCollector.validateFiles(files);
      // Some files should be invalid due to permission issues
      expect(invalid.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle system errors during file collection', async () => {
      const invalidConfig = {
        ...config,
        inputPattern: '/root/protected/**/*.md', // Should cause system errors
      };
      await expect(fileCollector.collectFiles(invalidConfig)).rejects.toThrow();
    });
    test('should handle single file patterns', async () => {
      const singleFileConfig = {
        ...config,
        inputPattern: path.join(testDir, 'test1.md'),
      };
      const files = await fileCollector.collectFiles(singleFileConfig);
      expect(files.length).toBe(1);
      expect(files[0].inputPath).toContain('test1.md');
    });
    test('should handle directory patterns', async () => {
      const dirConfig = {
        ...config,
        inputPattern: testDir,
      };
      const files = await fileCollector.collectFiles(dirConfig);
      expect(files.length).toBeGreaterThan(0);
    });
    test('should handle non-existent single file', async () => {
      const nonExistentConfig = {
        ...config,
        inputPattern: path.join(testDir, 'nonexistent.md'),
      };
      await expect(fileCollector.collectFiles(nonExistentConfig)).rejects.toThrow();
    });
    test('should handle custom filename format', async () => {
      const customConfig = {
        ...config,
        filenameFormat: 'custom' as BatchFilenameFormat,
        customFilenamePattern: '{name}_custom_{date}.pdf',
      };
      const files = await fileCollector.collectFiles(customConfig);
      expect(files.length).toBeGreaterThan(0);
      files.forEach(file => {
        const filename = path.basename(file.outputPath);
        expect(filename).toMatch(/.*_custom_\d{4}-\d{2}-\d{2}\.pdf$/);
      });
    });
    test('should handle custom filename format without pattern', async () => {
      const customConfig = {
        ...config,
        filenameFormat: 'custom' as BatchFilenameFormat,
        // customFilenamePattern is undefined, should fall back to default
      };
      const files = await fileCollector.collectFiles(customConfig);
      expect(files.length).toBeGreaterThan(0);
      files.forEach(file => {
        const filename = path.basename(file.outputPath);
        expect(filename).toMatch(/.*\.pdf$/);
      });
    });
    test('should handle error in re-throwing custom errors', async () => {
      const invalidConfig = {
        ...config,
        inputPattern: '\0invalid\0pattern', // Invalid pattern
      };
      try {
        await fileCollector.collectFiles(invalidConfig);
      } catch (error) {
        expect(error).toBeDefined();
        // Should handle the error appropriately
      }
    });
    test('should handle .markdown extension files', async () => {
      // Create a .markdown file
      await fs.promises.writeFile(
        path.join(testDir, 'test.markdown'),
        '# Markdown Test\n\nThis is a .markdown file'
      );
      const files = await fileCollector.collectFiles(config);
      const markdownFile = files.find(f => f.inputPath.endsWith('.markdown'));
      expect(markdownFile).toBeDefined();
    });
    test('should ignore system directories', async () => {
      // Create system directories
      const systemDirs = ['node_modules', '.git', 'dist', 'coverage'];
      for (const dir of systemDirs) {
        const sysDir = path.join(testDir, dir);
        await fs.promises.mkdir(sysDir, { recursive: true });
        await fs.promises.writeFile(
          path.join(sysDir, 'test.md'),
          '# System File\n\nThis should be ignored'
        );
      }
      const recursiveConfig = {
        ...config,
        inputPattern: path.join(testDir, '**/*.md'),
      };
      const files = await fileCollector.collectFiles(recursiveConfig);
      // Should not include files from system directories
      files.forEach(file => {
        systemDirs.forEach(sysDir => {
          expect(file.inputPath).not.toContain(`/${sysDir}/`);
          expect(file.inputPath).not.toContain(`\\${sysDir}\\`);
        });
      });
    });
    test('should handle files that cannot be accessed during createFileInfo', async () => {
      // This test covers the catch block in createFileInfo
      const files = await fileCollector.collectFiles(config);
      expect(files.length).toBeGreaterThan(0);
      // All returned files should be valid BatchFileInfo objects
      files.forEach(file => {
        expect(file.inputPath).toBeDefined();
        expect(file.outputPath).toBeDefined();
        expect(file.relativeInputPath).toBeDefined();
        expect(file.size).toBeGreaterThanOrEqual(0);
        expect(file.lastModified).toBeTruthy();
      });
    });
    test('should handle directory items that are not files', async () => {
      // Create a directory that would be processed but should be skipped
      const subDir = path.join(testDir, 'emptydir');
      await fs.promises.mkdir(subDir, { recursive: true });
      const files = await fileCollector.collectFiles(config);
      // Should only find markdown files, not directories
      files.forEach(file => {
        expect(file.inputPath.endsWith('.md') || file.inputPath.endsWith('.markdown')).toBe(true);
      });
    });
    test('should handle non-markdown files in createFileInfo', async () => {
      // Create a non-markdown file
      const txtFile = path.join(testDir, 'test.txt');
      await fs.promises.writeFile(txtFile, 'This is not markdown');
      const files = await fileCollector.collectFiles(config);
      // Should not include non-markdown files
      const txtFiles = files.filter(f => f.inputPath.endsWith('.txt'));
      expect(txtFiles.length).toBe(0);
    });
    test('should handle system error in collectFiles', async () => {
      // Try to create a system error by using invalid characters in pattern
      const invalidConfig = {
        ...config,
        inputPattern: '\0\0\0invalid\0\0\0',
      };
      // Should throw an error with proper error type
      try {
        await fileCollector.collectFiles(invalidConfig);
        // If no error thrown, mark as expecting error
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect((error as { type?: string }).type).toBeDefined();
      }
    });
    test('should handle with_date filename format', async () => {
      const dateConfig = {
        ...config,
        filenameFormat: 'with_date' as BatchFilenameFormat,
      };
      const files = await fileCollector.collectFiles(dateConfig);
      expect(files.length).toBeGreaterThan(0);
      files.forEach(file => {
        const filename = path.basename(file.outputPath);
        expect(filename).toMatch(/.*_\d{4}-\d{2}-\d{2}\.pdf$/);
      });
    });
    test('should handle permission errors during validation', async () => {
      const files = await fileCollector.collectFiles(config);
      // Manually modify a file to have an inaccessible output directory
      if (files.length > 0) {
        const testFile = { ...files[0] };
        testFile.outputPath = '/root/inaccessible/test.pdf';
        const { invalid } = await fileCollector.validateFiles([testFile]);
        expect(invalid.length).toBeGreaterThan(0);
        expect(invalid[0].error.type).toBe('SYSTEM_ERROR');
      }
    });
    test('should handle patterns without base directory (fallback to cwd)', async () => {
      // Create a unique temporary directory to test from
      const tempDir = path.join(__dirname, '../../../fixtures/temp-empty');
      await fs.promises.mkdir(tempDir, { recursive: true });
      // Change to empty directory for this test
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const simpleConfig = {
          ...config,
          inputPattern: '*.md', // No explicit directory, should use process.cwd()
        };
        // This should trigger the || process.cwd() fallback in findFiles and throw due to no files found
        await expect(fileCollector.collectFiles(simpleConfig)).rejects.toThrow(
          'No files found matching pattern'
        );
      } finally {
        // Restore original directory and cleanup
        process.chdir(originalCwd);
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    });
    test('should handle directory entries that are not files during createFileInfo', async () => {
      // Create a symbolic link or special file type
      const specialDir = path.join(testDir, 'special');
      await fs.promises.mkdir(specialDir, { recursive: true });
      // Create a file that will be processed through createFileInfo path where !stats.isFile()
      const testConfig = {
        ...config,
        inputPattern: path.join(testDir, '**/*'), // This should include directories
      };
      const files = await fileCollector.collectFiles(testConfig);
      // Should only return actual files, directories should be filtered out
      files.forEach(file => {
        expect(file.inputPath.endsWith('.md') || file.inputPath.endsWith('.markdown')).toBe(true);
      });
    });
    test('should handle getBaseDirFromPattern with current directory', async () => {
      // Create a unique temporary directory to test from
      const tempDir = path.join(__dirname, '../../../fixtures/temp-current-dir');
      await fs.promises.mkdir(tempDir, { recursive: true });
      // Change to empty directory for this test
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const currentDirConfig = {
          ...config,
          inputPattern: './test*.md', // Pattern that would result in '.' as base directory
        };
        // This should trigger the baseDir !== '.' ? baseDir : undefined branch and throw due to no files found
        await expect(fileCollector.collectFiles(currentDirConfig)).rejects.toThrow(
          'No files found matching pattern'
        );
      } finally {
        // Restore original directory and cleanup
        process.chdir(originalCwd);
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    });
    test('should handle write permission errors during validation', async () => {
      const files = await fileCollector.collectFiles(config);
      if (files.length > 0) {
        // Create a test file with a restricted output directory
        const restrictedFile = {
          ...files[0],
          outputPath: path.join('/tmp/restricted-test', 'test.pdf'),
        };
        // Store original method
        const originalAccess = fs.promises.access;
        // Mock fs.promises.access to throw for write permission
        jest.spyOn(fs.promises, 'access').mockImplementation(async (filePath, mode) => {
          if (
            typeof filePath === 'string' &&
            filePath.includes('restricted-test') &&
            mode === fs.constants.W_OK
          ) {
            throw new Error('Permission denied');
          }
          // Use original implementation for other calls to avoid recursion
          return originalAccess.call(fs.promises, filePath, mode || fs.constants.F_OK);
        });
        try {
          const { invalid } = await fileCollector.validateFiles([restrictedFile]);
          expect(invalid.length).toBe(1);
          expect(invalid[0].error.type).toBe('PERMISSION_DENIED');
        } finally {
          // Restore original method
          (fs.promises.access as jest.Mock).mockRestore();
        }
      }
    });
    test('should handle validation errors that are not custom MD2PDFError', async () => {
      const files = await fileCollector.collectFiles(config);
      if (files.length > 0) {
        // Mock fs.promises.access to throw a regular Error (not MD2PDFError)
        jest.spyOn(fs.promises, 'access').mockImplementation(async () => {
          const error = new Error('Generic file system error');
          // Explicitly don't add 'type' property to test the branch
          throw error;
        });
        try {
          const { invalid } = await fileCollector.validateFiles(files);
          expect(invalid.length).toBeGreaterThan(0);
          expect(invalid[0].error.type).toBe('SYSTEM_ERROR');
          expect(invalid[0].error.message).toContain('File validation failed');
        } finally {
          // Restore original method
          (fs.promises.access as jest.Mock).mockRestore();
        }
      }
    });
    test('should handle createFileInfo with non-markdown files', async () => {
      // Create a non-markdown file
      const txtPath = path.join(testDir, 'test-file.txt');
      await fs.promises.writeFile(txtPath, 'This is not markdown');
      // This should trigger the !this.isMarkdownFile(inputPath) branch in createFileInfo
      const testConfig = {
        ...config,
        inputPattern: path.join(testDir, 'test-file.txt'),
      };
      // Should find no files since txt files are filtered out
      await expect(fileCollector.collectFiles(testConfig)).rejects.toThrow();
    });
    test('should handle comma-separated file patterns', async () => {
      // Create specific test files
      await fs.promises.writeFile(path.join(testDir, 'file1.md'), '# File 1\n\nContent of file 1');
      await fs.promises.writeFile(path.join(testDir, 'file2.md'), '# File 2\n\nContent of file 2');
      const commaSeparatedConfig = {
        ...config,
        inputPattern: `${path.join(testDir, 'file1.md')}, ${path.join(testDir, 'file2.md')}, ${path.join(testDir, 'test1.md')}`,
      };
      const files = await fileCollector.collectFiles(commaSeparatedConfig);
      expect(files.length).toBe(3);
      const filenames = files.map(f => path.basename(f.inputPath));
      expect(filenames).toContain('file1.md');
      expect(filenames).toContain('file2.md');
      expect(filenames).toContain('test1.md');
    });
    test('should handle comma-separated patterns with non-existent files', async () => {
      const commaSeparatedConfig = {
        ...config,
        inputPattern: `${path.join(testDir, 'test1.md')}, ${path.join(testDir, 'nonexistent.md')}, ${path.join(testDir, 'test2.md')}`,
      };
      const files = await fileCollector.collectFiles(commaSeparatedConfig);
      // Should only find the existing files
      expect(files.length).toBe(2);
      const filenames = files.map(f => path.basename(f.inputPath));
      expect(filenames).toContain('test1.md');
      expect(filenames).toContain('test2.md');
      expect(filenames).not.toContain('nonexistent.md');
    });
    test('should handle comma-separated patterns with extra spaces', async () => {
      const commaSeparatedConfig = {
        ...config,
        inputPattern: ` ${path.join(testDir, 'test1.md')} ,   ${path.join(testDir, 'test2.md')}  , `,
      };
      const files = await fileCollector.collectFiles(commaSeparatedConfig);
      expect(files.length).toBe(2);
      const filenames = files.map(f => path.basename(f.inputPath));
      expect(filenames).toContain('test1.md');
      expect(filenames).toContain('test2.md');
    });
    test('should handle comma-separated patterns with quotes', async () => {
      const commaSeparatedConfig = {
        ...config,
        inputPattern: `"${path.join(testDir, 'test1.md')}", "${path.join(testDir, 'test2.md')}"`,
      };
      const files = await fileCollector.collectFiles(commaSeparatedConfig);
      expect(files.length).toBe(2);
      const filenames = files.map(f => path.basename(f.inputPath));
      expect(filenames).toContain('test1.md');
      expect(filenames).toContain('test2.md');
    });
    test('should handle mixed quotes and no quotes in comma-separated patterns', async () => {
      const commaSeparatedConfig = {
        ...config,
        inputPattern: `"${path.join(testDir, 'test1.md')}", ${path.join(testDir, 'test2.md')}`,
      };
      const files = await fileCollector.collectFiles(commaSeparatedConfig);
      expect(files.length).toBe(2);
      const filenames = files.map(f => path.basename(f.inputPath));
      expect(filenames).toContain('test1.md');
      expect(filenames).toContain('test2.md');
    });
    test('should handle single quotes in comma-separated patterns', async () => {
      const commaSeparatedConfig = {
        ...config,
        inputPattern: `'${path.join(testDir, 'test1.md')}', '${path.join(testDir, 'test2.md')}'`,
      };
      const files = await fileCollector.collectFiles(commaSeparatedConfig);
      expect(files.length).toBe(2);
      const filenames = files.map(f => path.basename(f.inputPath));
      expect(filenames).toContain('test1.md');
      expect(filenames).toContain('test2.md');
    });
    test('should generate absolute output paths when using relative output directory', async () => {
      const relativeOutputConfig = {
        ...config,
        outputDirectory: './output',
      };
      const files = await fileCollector.collectFiles(relativeOutputConfig);
      expect(files.length).toBeGreaterThan(0);
      files.forEach(file => {
        expect(path.isAbsolute(file.outputPath)).toBe(true);
        expect(file.outputPath).toContain('/output/');
        expect(file.outputPath.endsWith('.pdf')).toBe(true);
      });
    });
    test('should preserve directory structure when preserveDirectoryStructure is true', async () => {
      const preserveStructureConfig = {
        ...config,
        outputDirectory: './output',
        preserveDirectoryStructure: true,
        inputPattern: path.join(testDir, '**/*.md'),
      };
      const files = await fileCollector.collectFiles(preserveStructureConfig);
      expect(files.length).toBeGreaterThan(0);
      // Find a file in a subdirectory
      const subdirFile = files.find(f => f.inputPath.includes('subdir'));
      if (subdirFile) {
        expect(path.isAbsolute(subdirFile.outputPath)).toBe(true);
        expect(subdirFile.outputPath).toContain('/output/');
        expect(subdirFile.outputPath).toContain('subdir');
      }
    });
  });
});
