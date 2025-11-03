/**
 * PathCleaner Tests
 * Tests path cleaning utilities for drag-and-drop file paths
 */

import { PathCleaner } from '../../../src/utils/path-cleaner';
import path from 'path';

describe('PathCleaner', () => {
  describe('cleanPath', () => {
    it('should return empty string for empty input', () => {
      expect(PathCleaner.cleanPath('')).toBe('');
      expect(PathCleaner.cleanPath(null as any)).toBe(null);
      expect(PathCleaner.cleanPath(undefined as any)).toBe(undefined);
    });

    it('should trim whitespace', () => {
      const input = '  /path/to/file.md  ';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('/path/to/file.md'));
    });

    it('should return empty string for whitespace-only input', () => {
      expect(PathCleaner.cleanPath('   ')).toBe('');
      expect(PathCleaner.cleanPath('\t\n  ')).toBe('');
    });

    it('should remove single quotes', () => {
      const input = "'/path/to/file with spaces.md'";
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('/path/to/file with spaces.md'));
    });

    it('should remove double quotes', () => {
      const input = '"/path/to/file with spaces.md"';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('/path/to/file with spaces.md'));
    });

    it('should handle escaped spaces', () => {
      const input = '/path/to/file\\ with\\ spaces.md';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('/path/to/file with spaces.md'));
    });

    it('should handle escaped characters', () => {
      const input = '/path/to/file\\(with\\)\\[brackets\\].md';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('/path/to/file(with)[brackets].md'));
    });

    it('should handle mixed quoting and escaping', () => {
      const input = '"/path/to/file\\ with\\ spaces.md"';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('/path/to/file with spaces.md'));
    });

    it('should resolve relative paths', () => {
      const input = './relative/path.md';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('./relative/path.md'));
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should handle paths with special characters', () => {
      const input = '/path/to/file-with_special.chars@123.md';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(
        path.resolve('/path/to/file-with_special.chars@123.md'),
      );
    });

    it('should preserve absolute paths', () => {
      const input = '/absolute/path/to/file.md';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('/absolute/path/to/file.md'));
    });

    it('should handle Windows-style paths on Windows', () => {
      const input = 'C:\\Windows\\Path\\file.md';
      const result = PathCleaner.cleanPath(input);
      // On non-Windows systems, backslashes are treated as literal characters
      if (process.platform === 'win32') {
        expect(result).toBe(path.resolve('C:\\Windows\\Path\\file.md'));
      } else {
        // On Unix-like systems, backslashes are removed by cleanPath
        expect(result).toBe(
          path.resolve(process.cwd(), 'C:WindowsPathfile.md'),
        );
      }
    });

    it('should handle mismatched quotes', () => {
      const input = '"/path/to/file.md\'';
      const result = PathCleaner.cleanPath(input);
      // Should not remove quotes if they don't match
      expect(result).toBe(path.resolve('"/path/to/file.md\''));
    });
  });

  describe('isValidPath', () => {
    it('should return true for valid absolute paths', () => {
      expect(PathCleaner.isValidPath('/valid/absolute/path.md')).toBe(true);
      expect(PathCleaner.isValidPath('"/valid/quoted/path.md"')).toBe(true);
    });

    it('should return true for relative paths (converted to absolute)', () => {
      expect(PathCleaner.isValidPath('./relative/path.md')).toBe(true);
      expect(PathCleaner.isValidPath('../parent/path.md')).toBe(true);
    });

    it('should return false for empty or invalid inputs', () => {
      expect(PathCleaner.isValidPath('')).toBe(false);
      expect(PathCleaner.isValidPath('   ')).toBe(false);
      expect(PathCleaner.isValidPath(null as any)).toBe(false);
      expect(PathCleaner.isValidPath(undefined as any)).toBe(false);
    });

    it('should handle errors gracefully', () => {
      // Mock path.resolve to throw an error
      const originalResolve = path.resolve;
      jest.spyOn(path, 'resolve').mockImplementation(() => {
        throw new Error('Invalid path');
      });

      expect(PathCleaner.isValidPath('/some/path')).toBe(false);

      // Restore original implementation
      path.resolve = originalResolve;
    });

    it('should return true for paths with spaces and special characters', () => {
      expect(PathCleaner.isValidPath('/path/with spaces/file.md')).toBe(true);
      expect(PathCleaner.isValidPath('/path/with-special_chars@123.md')).toBe(
        true,
      );
    });

    it('should validate Windows-style paths', () => {
      expect(PathCleaner.isValidPath('C:\\\\Windows\\\\Path\\\\file.md')).toBe(
        true,
      );
    });
  });

  describe('cleanPaths', () => {
    it('should clean multiple paths', () => {
      const inputs = [
        '"/path/to/file1.md"',
        '/path/to/file2.md',
        './relative/path.md',
        '/path/with\\ spaces.md',
      ];

      const results = PathCleaner.cleanPaths(inputs);

      expect(results).toHaveLength(4);
      expect(results[0]).toBe(path.resolve('/path/to/file1.md'));
      expect(results[1]).toBe(path.resolve('/path/to/file2.md'));
      expect(results[2]).toBe(path.resolve('./relative/path.md'));
      expect(results[3]).toBe(path.resolve('/path/with spaces.md'));
    });

    it('should filter out empty paths', () => {
      const inputs = ['/valid/path.md', '', '   ', '/another/valid/path.md'];

      const results = PathCleaner.cleanPaths(inputs);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(path.resolve('/valid/path.md'));
      expect(results[1]).toBe(path.resolve('/another/valid/path.md'));
    });

    it('should handle empty array', () => {
      const results = PathCleaner.cleanPaths([]);
      expect(results).toEqual([]);
    });

    it('should handle array with only invalid paths', () => {
      const inputs = ['', '   ', '\t\n'];
      const results = PathCleaner.cleanPaths(inputs);
      expect(results).toEqual([]);
    });

    it('should preserve order of valid paths', () => {
      const inputs = [
        '/first/path.md',
        '',
        '/second/path.md',
        '   ',
        '/third/path.md',
      ];

      const results = PathCleaner.cleanPaths(inputs);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe(path.resolve('/first/path.md'));
      expect(results[1]).toBe(path.resolve('/second/path.md'));
      expect(results[2]).toBe(path.resolve('/third/path.md'));
    });
  });

  describe('edge cases', () => {
    it('should handle very long paths', () => {
      const longPath = '/very/long/path/' + 'segment/'.repeat(100) + 'file.md';
      const result = PathCleaner.cleanPath(longPath);
      expect(result).toBe(path.resolve(longPath));
    });

    it('should handle paths with unicode characters', () => {
      const unicodePath = '/path/to/文件/测试.md';
      const result = PathCleaner.cleanPath(unicodePath);
      expect(result).toBe(path.resolve(unicodePath));
    });

    it('should handle multiple consecutive escapes', () => {
      const input = '/path/with\\\\\\\\multiple\\\\escapes.md';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('/path/with\\\\multiple\\escapes.md'));
    });

    it('should handle path with only dots', () => {
      const input = '...';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve('...'));
    });
  });
});
