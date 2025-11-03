/**
 * Unit tests for FilePath Value Object
 */

import { jest } from '@jest/globals';
import path from 'path';
import { FilePath } from '../../../../../src/core/domain/value-objects/file-path.vo';
import { ValueObjectValidationError } from '../../../../../src/core/domain/value-objects/value-object.base';

// No file system mocking needed as FilePath VO is now pure

describe('FilePath Value Object', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor and validation', () => {
    it('should create FilePath with valid .md file', () => {
      const filePath = new FilePath('/path/to/file.md');
      expect(filePath.value).toBe('/path/to/file.md');
    });

    it('should create FilePath with valid .markdown file', () => {
      const filePath = new FilePath('/path/to/file.markdown');
      expect(filePath.value).toBe('/path/to/file.markdown');
    });

    it('should throw error for empty path', () => {
      expect(() => new FilePath('')).toThrow(ValueObjectValidationError);
    });

    it('should throw error for null/undefined path', () => {
      expect(() => new FilePath(null as any)).toThrow(
        ValueObjectValidationError,
      );
      expect(() => new FilePath(undefined as any)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for non-string path', () => {
      expect(() => new FilePath(123 as any)).toThrow(
        ValueObjectValidationError,
      );
      expect(() => new FilePath({} as any)).toThrow(ValueObjectValidationError);
    });

    it('should throw error for invalid file extension', () => {
      expect(() => new FilePath('/path/to/file.txt')).toThrow(
        ValueObjectValidationError,
      );
      expect(() => new FilePath('/path/to/file.doc')).toThrow(
        ValueObjectValidationError,
      );
      expect(() => new FilePath('/path/to/file')).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for relative paths starting with ./', () => {
      expect(() => new FilePath('./file.md')).toThrow(
        ValueObjectValidationError,
      );
      expect(() => new FilePath('../file.md')).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for paths with invalid characters', () => {
      if (process.platform === 'win32') {
        expect(() => new FilePath('/path/with<invalid>chars.md')).toThrow(
          ValueObjectValidationError,
        );
        expect(() => new FilePath('/path/with|pipe.md')).toThrow(
          ValueObjectValidationError,
        );
      } else {
        expect(() => new FilePath('/path/with\x00null.md')).toThrow(
          ValueObjectValidationError,
        );
      }
    });

    it('should allow paths with spaces and special characters', () => {
      expect(() => new FilePath('/path/to/file with spaces.md')).not.toThrow();
      expect(() => new FilePath('/path/to/文件名.md')).not.toThrow();
      expect(
        () => new FilePath('/path/to/file-with_special.chars.md'),
      ).not.toThrow();
    });
  });

  describe('getter methods', () => {
    it('should return correct basename', () => {
      const filePath = new FilePath('/path/to/my-document.md');
      expect(filePath.basename).toBe('my-document');
    });

    it('should return correct basename for .markdown extension', () => {
      const filePath = new FilePath('/path/to/my-document.markdown');
      expect(filePath.basename).toBe('my-document');
    });

    it('should return correct extension', () => {
      const filePath1 = new FilePath('/path/to/file.md');
      const filePath2 = new FilePath('/path/to/file.markdown');
      expect(filePath1.extension).toBe('.md');
      expect(filePath2.extension).toBe('.markdown');
    });

    it('should return correct directory', () => {
      const filePath = new FilePath('/path/to/subdirectory/file.md');
      expect(filePath.directory).toBe('/path/to/subdirectory');
    });

    it('should return correct filename', () => {
      const filePath = new FilePath('/path/to/my-document.md');
      expect(filePath.filename).toBe('my-document.md');
    });

    it('should handle root directory paths', () => {
      const filePath = new FilePath('/file.md');
      expect(filePath.directory).toBe('/');
      expect(filePath.filename).toBe('file.md');
    });
  });

  describe('isMarkdown method', () => {
    it('should return true for .md files', () => {
      const filePath = new FilePath('/path/to/file.md');
      expect(filePath.isMarkdown()).toBe(true);
    });

    it('should return true for .markdown files', () => {
      const filePath = new FilePath('/path/to/file.markdown');
      expect(filePath.isMarkdown()).toBe(true);
    });

    it('should be true by default since only markdown files are allowed', () => {
      // Since validation only allows .md and .markdown, this should always be true
      const filePath = new FilePath('/path/to/file.md');
      expect(filePath.isMarkdown()).toBe(true);
    });
  });

  describe('toOutputPath method', () => {
    it('should convert to PDF path', () => {
      const filePath = new FilePath('/path/to/document.md');
      const outputPath = filePath.toOutputPath();
      expect(outputPath).toBe('/path/to/document.pdf');
    });

    it('should convert .markdown to PDF path', () => {
      const filePath = new FilePath('/path/to/document.markdown');
      const outputPath = filePath.toOutputPath();
      expect(outputPath).toBe('/path/to/document.pdf');
    });

    it('should accept custom extension', () => {
      const filePath = new FilePath('/path/to/document.md');
      const outputPath = filePath.toOutputPath('.html');
      expect(outputPath).toBe('/path/to/document.html');
    });

    it('should handle complex filenames', () => {
      const filePath = new FilePath('/path/to/my-complex_file.name.md');
      const outputPath = filePath.toOutputPath();
      expect(outputPath).toBe('/path/to/my-complex_file.name.pdf');
    });
  });

  describe('withBasename method', () => {
    it('should create new FilePath with different basename', () => {
      const originalPath = new FilePath('/path/to/original.md');
      const newPath = originalPath.withBasename('modified');

      expect(newPath.value).toBe('/path/to/modified.md');
      expect(originalPath.value).toBe('/path/to/original.md'); // Original unchanged
    });

    it('should preserve extension', () => {
      const originalPath = new FilePath('/path/to/original.markdown');
      const newPath = originalPath.withBasename('modified');

      expect(newPath.value).toBe('/path/to/modified.markdown');
    });

    it('should handle special characters in basename', () => {
      const originalPath = new FilePath('/path/to/original.md');
      const newPath = originalPath.withBasename('文档-with_special.chars');

      expect(newPath.value).toBe('/path/to/文档-with_special.chars.md');
    });
  });

  describe('normalizePath method', () => {
    it('should normalize path separators', () => {
      const filePath = new FilePath('/path/to/file.md');
      const normalized = filePath.normalizePath();

      expect(normalized).toBe(path.normalize('/path/to/file.md'));
    });

    it('should handle different path separators', () => {
      // This test behavior depends on the platform
      const inputPath = '/path//to///file.md';
      const filePath = new FilePath(inputPath);
      const normalized = filePath.normalizePath();

      expect(normalized).toBe(path.normalize(inputPath));
    });
  });

  describe('equality and immutability', () => {
    it('should be equal for same paths', () => {
      const path1 = new FilePath('/path/to/file.md');
      const path2 = new FilePath('/path/to/file.md');
      expect(path1.equals(path2)).toBe(true);
    });

    it('should not be equal for different paths', () => {
      const path1 = new FilePath('/path/to/file1.md');
      const path2 = new FilePath('/path/to/file2.md');
      expect(path1.equals(path2)).toBe(false);
    });

    it('should be immutable', () => {
      const filePath = new FilePath('/path/to/file.md');
      const originalValue = filePath.value;

      // Value should be frozen
      expect(Object.isFrozen(filePath.value)).toBe(true);
      expect(filePath.value).toBe(originalValue);
    });
  });

  describe('withExtension method', () => {
    it('should create FilePath with different extension', () => {
      const originalPath = new FilePath('/path/to/document.md');
      const newPath = originalPath.withExtension('.markdown');

      expect(newPath.value).toBe('/path/to/document.markdown');
      expect(originalPath.value).toBe('/path/to/document.md'); // Original unchanged
    });

    it('should handle extension changes correctly', () => {
      const originalPath = new FilePath('/path/to/document.markdown');
      const newPath = originalPath.withExtension('.md');

      expect(newPath.value).toBe('/path/to/document.md');
      expect(newPath.extension).toBe('.md');
    });
  });

  describe('withDirectory method', () => {
    it('should create FilePath in different directory', () => {
      const originalPath = new FilePath('/original/path/document.md');
      const newPath = originalPath.withDirectory('/new/path');

      expect(newPath.value).toBe('/new/path/document.md');
      expect(newPath.directory).toBe('/new/path');
      expect(originalPath.value).toBe('/original/path/document.md'); // Original unchanged
    });

    it('should preserve filename when changing directory', () => {
      const originalPath = new FilePath('/old/dir/my-file.markdown');
      const newPath = originalPath.withDirectory('/new/directory');

      expect(newPath.filename).toBe('my-file.markdown');
      expect(newPath.basename).toBe('my-file');
    });
  });

  describe('relativeTo method', () => {
    it('should create relative path from base FilePath', () => {
      const targetPath = new FilePath('/projects/myapp/src/document.md');
      const basePath = new FilePath('/projects/myapp/readme.md');

      const relativePath = targetPath.relativeTo(basePath);
      expect(relativePath).toBe('src/document.md');
    });

    it('should handle paths at same level', () => {
      const targetPath = new FilePath('/projects/document1.md');
      const basePath = new FilePath('/projects/document2.md');

      const relativePath = targetPath.relativeTo(basePath);
      expect(relativePath).toBe('document1.md');
    });
  });

  describe('static fromRelative method', () => {
    it('should create FilePath from relative path', () => {
      const filePath = FilePath.fromRelative(
        'subdirectory/file.md',
        '/base/path',
      );

      expect(filePath.value).toBe(
        path.resolve('/base/path', 'subdirectory/file.md'),
      );
      expect(filePath.filename).toBe('file.md');
    });

    it('should handle relative paths with parent directory references', () => {
      const filePath = FilePath.fromRelative(
        '../other/file.markdown',
        '/base/current',
      );

      const expectedPath = path.resolve(
        '/base/current',
        '../other/file.markdown',
      );
      expect(filePath.value).toBe(expectedPath);
    });
  });

  describe('Windows-specific character validation', () => {
    it('should reject Windows invalid characters when on Windows', () => {
      // Mock process.platform to be win32 for this test
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      try {
        expect(() => new FilePath('/path/with<bracket.md')).toThrow(
          ValueObjectValidationError,
        );
        expect(() => new FilePath('/path/with>bracket.md')).toThrow(
          ValueObjectValidationError,
        );
        expect(() => new FilePath('/path/with:colon.md')).toThrow(
          ValueObjectValidationError,
        );
        expect(() => new FilePath('/path/with"quote.md')).toThrow(
          ValueObjectValidationError,
        );
        expect(() => new FilePath('/path/with|pipe.md')).toThrow(
          ValueObjectValidationError,
        );
        expect(() => new FilePath('/path/with?question.md')).toThrow(
          ValueObjectValidationError,
        );
        expect(() => new FilePath('/path/with*asterisk.md')).toThrow(
          ValueObjectValidationError,
        );
      } finally {
        // Restore original platform
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
        });
      }
    });
  });

  describe('edge cases and platform specific behavior', () => {
    it('should handle very long paths', () => {
      const longPath = '/very/long/path/'.repeat(50) + 'file.md';
      // Long paths should throw validation error due to MAX_PATH_LENGTH
      expect(() => new FilePath(longPath)).toThrow(
        'File path exceeds maximum length',
      );
    });

    it('should handle unicode characters', () => {
      const unicodePath = '/path/to/文件名-🚀-emoji.md';
      const filePath = new FilePath(unicodePath);
      expect(filePath.basename).toBe('文件名-🚀-emoji');
    });

    it('should handle case sensitivity based on platform', () => {
      const path1 = new FilePath('/path/to/File.md');
      const path2 = new FilePath('/path/to/file.md');

      // On case-sensitive systems, these should be different
      // On case-insensitive systems, they might be treated as same
      expect(path1.equals(path2)).toBe(false);
    });
  });
});
