/**
 * Tests for ImagePathResolver utility
 */

import { ImagePathResolver } from '../../../src/utils/image-path-resolver';
import * as path from 'path';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ImagePathResolver', () => {
  const testFilePath = '/test/path/document.md';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processImagePaths', () => {
    it('should return original HTML if filePath is empty', () => {
      const html = '<img src="test.jpg" alt="test">';
      const result = ImagePathResolver.processImagePaths(html, '');

      expect(result).toBe(html);
    });

    it('should skip absolute paths', () => {
      const html = '<img src="/absolute/path/image.jpg" alt="test">';
      const result = ImagePathResolver.processImagePaths(html, testFilePath);

      expect(result).toBe(html);
    });

    it('should skip HTTP URLs', () => {
      const html = '<img src="https://example.com/image.jpg" alt="test">';
      const result = ImagePathResolver.processImagePaths(html, testFilePath);

      expect(result).toBe(html);
    });

    it('should skip data URLs', () => {
      const html =
        '<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABA" alt="test">';
      const result = ImagePathResolver.processImagePaths(html, testFilePath);

      expect(result).toBe(html);
    });

    it('should convert relative image path to base64 data URI', () => {
      const html = '<img src="image.jpg" alt="test image">';
      const mockBuffer = Buffer.from('fake image data');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockBuffer);

      const result = ImagePathResolver.processImagePaths(html, testFilePath);

      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.resolve('/test/path', 'image.jpg'),
      );
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.resolve('/test/path', 'image.jpg'),
      );
      expect(result).toContain('data:image/jpeg;base64,');
      expect(result).toContain(mockBuffer.toString('base64'));
      expect(result).toContain('alt="test image"');
    });

    it('should handle different image formats with correct MIME types', () => {
      const testCases = [
        { filename: 'image.png', expectedMime: 'image/png' },
        { filename: 'image.gif', expectedMime: 'image/gif' },
        { filename: 'image.webp', expectedMime: 'image/webp' },
        { filename: 'image.svg', expectedMime: 'image/svg+xml' },
        { filename: 'image.bmp', expectedMime: 'image/bmp' },
        { filename: 'image.jpeg', expectedMime: 'image/jpeg' },
        { filename: 'image.unknown', expectedMime: 'image/jpeg' }, // default
      ];

      const mockBuffer = Buffer.from('fake image data');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockBuffer);

      testCases.forEach(({ filename, expectedMime }) => {
        const html = `<img src="${filename}" alt="test">`;
        const result = ImagePathResolver.processImagePaths(html, testFilePath);

        expect(result).toContain(`data:${expectedMime};base64,`);
      });
    });

    it('should return original HTML if image file does not exist', () => {
      const html = '<img src="missing.jpg" alt="test">';

      mockFs.existsSync.mockReturnValue(false);

      const result = ImagePathResolver.processImagePaths(html, testFilePath);

      expect(result).toBe(html);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Image file not found:'),
      );
    });

    it('should handle read errors gracefully', () => {
      const html = '<img src="error.jpg" alt="test">';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = ImagePathResolver.processImagePaths(html, testFilePath);

      expect(result).toBe(html);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process image'),
        expect.any(Error),
      );
    });

    it('should process multiple images in single HTML', () => {
      const html = `
        <p>First image:</p>
        <img src="image1.jpg" alt="Image 1">
        <p>Second image:</p>
        <img src="image2.png" alt="Image 2">
        <img src="https://example.com/remote.jpg" alt="Remote">
      `;

      const mockBuffer = Buffer.from('fake image data');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockBuffer);

      const result = ImagePathResolver.processImagePaths(html, testFilePath);

      // Should convert local images to base64
      expect(result).toContain('data:image/jpeg;base64,');
      expect(result).toContain('data:image/png;base64,');

      // Should leave remote image unchanged
      expect(result).toContain('https://example.com/remote.jpg');

      // Should preserve alt texts
      expect(result).toContain('alt="Image 1"');
      expect(result).toContain('alt="Image 2"');
      expect(result).toContain('alt="Remote"');
    });

    it('should preserve image attributes other than src', () => {
      const html =
        '<img class="responsive" src="image.jpg" alt="test" width="300" height="200">';

      const mockBuffer = Buffer.from('fake image data');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockBuffer);

      const result = ImagePathResolver.processImagePaths(html, testFilePath);

      expect(result).toContain('class="responsive"');
      expect(result).toContain('alt="test"');
      expect(result).toContain('width="300"');
      expect(result).toContain('height="200"');
      expect(result).toContain('data:image/jpeg;base64,');
    });

    it('should log conversion information', () => {
      const html = '<img src="image.jpg" alt="test">';
      const mockBuffer = Buffer.from('x'.repeat(1024)); // 1KB

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockBuffer);

      ImagePathResolver.processImagePaths(html, testFilePath);

      expect(console.log).toHaveBeenCalledWith(
        'Converted image to base64: image.jpg (1KB)',
      );
    });
  });

  describe('extractImageInfo', () => {
    it('should extract relative image paths from markdown', () => {
      const markdown = `
        # Test Document
        ![Image 1](image1.jpg)
        Some text
        ![Image 2](subfolder/image2.png)
        ![Remote](https://example.com/remote.jpg)
        ![Absolute](/absolute/path.jpg)
      `;

      mockFs.existsSync.mockImplementation((filePath) => {
        return typeof filePath === 'string' && filePath.includes('image1.jpg');
      });

      const result = ImagePathResolver.extractImageInfo(markdown, testFilePath);

      expect(result).toHaveLength(2); // Only relative paths
      expect(result[0]).toEqual({
        originalPath: 'image1.jpg',
        absolutePath: path.resolve('/test/path', 'image1.jpg'),
        exists: true,
      });
      expect(result[1]).toEqual({
        originalPath: 'subfolder/image2.png',
        absolutePath: path.resolve('/test/path', 'subfolder/image2.png'),
        exists: false,
      });
    });

    it('should handle empty markdown content', () => {
      const result = ImagePathResolver.extractImageInfo('', testFilePath);
      expect(result).toEqual([]);
    });

    it('should handle markdown with no images', () => {
      const markdown = '# Title\n\nSome text without images.';
      const result = ImagePathResolver.extractImageInfo(markdown, testFilePath);
      expect(result).toEqual([]);
    });

    it('should handle fs.existsSync errors gracefully', () => {
      const markdown = '![Test](test.jpg)';

      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = ImagePathResolver.extractImageInfo(markdown, testFilePath);

      expect(result).toHaveLength(1);
      expect(result[0].exists).toBe(false);
    });
  });
});
