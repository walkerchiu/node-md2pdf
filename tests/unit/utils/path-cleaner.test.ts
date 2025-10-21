/**
 * Path Cleaner Unit Tests
 * Tests for handling drag-and-drop file paths
 */

import path from 'path';

import { PathCleaner } from '../../../src/utils/path-cleaner';

describe('PathCleaner', () => {
  describe('cleanPath', () => {
    it('should handle basic paths without quotes', () => {
      const input = '/Users/test/file.md';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(path.resolve(input));
    });

    it('should remove single quotes from dragged paths', () => {
      const input = "'/Users/test/file with spaces.md'";
      const expected = path.resolve('/Users/test/file with spaces.md');
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should remove double quotes from dragged paths', () => {
      const input = '"/Users/test/file with spaces.md"';
      const expected = path.resolve('/Users/test/file with spaces.md');
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should handle escaped spaces', () => {
      const input = '/Users/test/file\\ with\\ spaces.md';
      const expected = path.resolve('/Users/test/file with spaces.md');
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should handle mixed escaped characters', () => {
      const input = '/Users/test/file\\ with\\(special\\)\\ chars.md';
      const expected = path.resolve('/Users/test/file with(special) chars.md');
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should handle paths with trailing whitespace', () => {
      const input = '  /Users/test/file.md  ';
      const expected = path.resolve('/Users/test/file.md');
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should handle quoted paths with trailing whitespace', () => {
      const input = '  "/Users/test/file with spaces.md"  ';
      const expected = path.resolve('/Users/test/file with spaces.md');
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should handle relative paths', () => {
      const input = './test/file.md';
      const expected = path.resolve('./test/file.md');
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should handle empty strings', () => {
      const input = '';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe('');
    });

    it('should handle whitespace-only strings', () => {
      const input = '   ';
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe('');
    });

    it('should handle complex real-world drag-drop scenarios', () => {
      // Simulate common macOS drag-drop format
      const input = "'/Users/張三/Documents/我的文件 (1)/README.md'";
      const expected = path.resolve(
        '/Users/張三/Documents/我的文件 (1)/README.md',
      );
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should handle Linux-style paths with spaces', () => {
      const input = '/home/user/My\\ Documents/file.md';
      const expected = path.resolve('/home/user/My Documents/file.md');
      const result = PathCleaner.cleanPath(input);
      expect(result).toBe(expected);
    });

    it('should handle Windows-style paths', () => {
      const input = '"C:\\Users\\test\\My Documents\\file.md"';
      const result = PathCleaner.cleanPath(input);

      // Test that the path is cleaned and resolved (actual result depends on platform)
      expect(result).toContain('C:');
      expect(result).toContain('Users');
      expect(result).toContain('test');
      expect(result).toContain('My Documents');
      expect(result).toContain('file.md');
    });
  });

  describe('isValidPath', () => {
    it('should validate absolute paths', () => {
      const input = '/Users/test/file.md';
      expect(PathCleaner.isValidPath(input)).toBe(true);
    });

    it('should validate quoted paths', () => {
      const input = "'/Users/test/file with spaces.md'";
      expect(PathCleaner.isValidPath(input)).toBe(true);
    });

    it('should validate escaped paths', () => {
      const input = '/Users/test/file\\ with\\ spaces.md';
      expect(PathCleaner.isValidPath(input)).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(PathCleaner.isValidPath('')).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      expect(PathCleaner.isValidPath('   ')).toBe(false);
    });

    it('should handle relative paths based on current working directory', () => {
      const input = './test/file.md';
      expect(PathCleaner.isValidPath(input)).toBe(true);
    });
  });

  describe('cleanPaths', () => {
    it('should clean multiple paths', () => {
      const inputs = [
        "'/Users/test/file1.md'",
        '/Users/test/file2.md',
        '"/Users/test/file with spaces.md"',
      ];
      const results = PathCleaner.cleanPaths(inputs);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe(path.resolve('/Users/test/file1.md'));
      expect(results[1]).toBe(path.resolve('/Users/test/file2.md'));
      expect(results[2]).toBe(path.resolve('/Users/test/file with spaces.md'));
    });

    it('should filter out empty results', () => {
      const inputs = [
        "'/Users/test/file1.md'",
        '',
        '   ',
        '/Users/test/file2.md',
      ];
      const results = PathCleaner.cleanPaths(inputs);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(path.resolve('/Users/test/file1.md'));
      expect(results[1]).toBe(path.resolve('/Users/test/file2.md'));
    });

    it('should handle empty array', () => {
      const results = PathCleaner.cleanPaths([]);
      expect(results).toEqual([]);
    });
  });
});
