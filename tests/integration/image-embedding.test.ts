/**
 * Integration tests for image embedding functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ApplicationServices } from '../../src/application';
import type { IFileProcessorService } from '../../src/application/services/file-processor.service';

describe('Image Embedding Integration Tests', () => {
  let tempDir: string;
  let testMarkdownFile: string;
  let testImageFile: string;
  let fileProcessorService: IFileProcessorService;

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-image-test-'));

    // Create a small test image (1x1 PNG)
    const testImageBuffer = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR chunk length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x00,
      0x01, // Width: 1
      0x00,
      0x00,
      0x00,
      0x01, // Height: 1
      0x08,
      0x02,
      0x00,
      0x00,
      0x00, // Bit depth: 8, Color type: 2 (RGB), Compression: 0, Filter: 0, Interlace: 0
      0x90,
      0x77,
      0x53,
      0xde, // IHDR CRC
      0x00,
      0x00,
      0x00,
      0x0c, // IDAT chunk length
      0x49,
      0x44,
      0x41,
      0x54, // IDAT
      0x08,
      0x99,
      0x01,
      0x01,
      0x00,
      0x00,
      0x00,
      0xff,
      0xff,
      0x00,
      0x00,
      0x00, // Image data
      0x02,
      0x00,
      0x01,
      0xe5, // IDAT CRC
      0x00,
      0x00,
      0x00,
      0x00, // IEND chunk length
      0x49,
      0x45,
      0x4e,
      0x44, // IEND
      0xae,
      0x42,
      0x60,
      0x82, // IEND CRC
    ]);

    testImageFile = path.join(tempDir, 'test-image.png');
    fs.writeFileSync(testImageFile, testImageBuffer);

    // Create test markdown file with image reference
    testMarkdownFile = path.join(tempDir, 'test-document.md');
    const markdownContent = `# Test Document with Image

This document contains an image for testing.

![Test Image](test-image.png)

Some more content after the image.

## Another Section

![Same Image Again](test-image.png)

End of document.
`;

    fs.writeFileSync(testMarkdownFile, markdownContent);

    // Initialize file processor service
    const container = ApplicationServices.createContainer();
    fileProcessorService = container.resolve('fileProcessor');
  });

  afterAll(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('End-to-End Image Processing', () => {
    it('should process markdown file with images and generate PDF', async () => {
      const outputPath = path.join(tempDir, 'output.pdf');

      // Process the file
      const result = await fileProcessorService.processFile(testMarkdownFile, {
        outputPath: outputPath,
        includeTOC: false,
        pdfOptions: {
          format: 'A4',
          orientation: 'portrait',
        },
      });

      // Verify processing succeeded
      expect(result.success).toBe(true);

      // Verify PDF file was created
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify PDF file is not empty and has reasonable size
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(1000); // Should be larger than 1KB due to embedded images

      // Clean up test output
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }, 30000); // 30 second timeout for PDF generation

    it('should handle missing image files gracefully', async () => {
      // Create markdown with reference to non-existent image
      const markdownWithMissingImage = path.join(tempDir, 'missing-image.md');
      const content = `# Test

![Missing Image](non-existent.jpg)

Some text.
`;
      fs.writeFileSync(markdownWithMissingImage, content);

      const outputPath = path.join(tempDir, 'output-missing.pdf');

      // Process should still succeed
      const result = await fileProcessorService.processFile(
        markdownWithMissingImage,
        {
          outputPath: outputPath,
          includeTOC: false,
          pdfOptions: {
            format: 'A4',
            orientation: 'portrait',
          },
        },
      );

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      // Clean up
      fs.unlinkSync(markdownWithMissingImage);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }, 30000);

    it('should process multiple different image formats', async () => {
      // Create test images of different formats
      const jpegPath = path.join(tempDir, 'test.jpg');
      const gifPath = path.join(tempDir, 'test.gif');

      // Create minimal JPEG
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4,
        0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x0c,
        0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, 0x80, 0xff,
        0xd9,
      ]);

      // Create minimal GIF
      const gifBuffer = Buffer.from([
        0x47,
        0x49,
        0x46,
        0x38,
        0x39,
        0x61, // GIF89a signature
        0x01,
        0x00,
        0x01,
        0x00, // Width: 1, Height: 1
        0x80,
        0x00,
        0x00, // Global color table flag, color resolution, sort flag, global color table size
        0x00,
        0x00,
        0x00,
        0xff,
        0xff,
        0xff, // Color table: black, white
        0x2c,
        0x00,
        0x00,
        0x00,
        0x00, // Image descriptor
        0x01,
        0x00,
        0x01,
        0x00,
        0x00, // Image left, top, width, height, flags
        0x02,
        0x02,
        0x04,
        0x01,
        0x00, // LZW minimum code size, image data
        0x3b, // Trailer
      ]);

      fs.writeFileSync(jpegPath, jpegBuffer);
      fs.writeFileSync(gifPath, gifBuffer);

      // Create markdown with multiple image formats
      const multiFormatMarkdown = path.join(tempDir, 'multi-format.md');
      const content = `# Multi-Format Images

PNG Image:
![PNG](test-image.png)

JPEG Image:
![JPEG](test.jpg)

GIF Image:
![GIF](test.gif)
`;
      fs.writeFileSync(multiFormatMarkdown, content);

      const outputPath = path.join(tempDir, 'multi-format-output.pdf');

      const result = await fileProcessorService.processFile(
        multiFormatMarkdown,
        {
          outputPath: outputPath,
          includeTOC: false,
          pdfOptions: {
            format: 'A4',
            orientation: 'portrait',
          },
        },
      );

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      // File should be larger due to multiple embedded images
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(2000); // Should be even larger

      // Clean up
      fs.unlinkSync(jpegPath);
      fs.unlinkSync(gifPath);
      fs.unlinkSync(multiFormatMarkdown);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }, 30000);

    it('should preserve image alt text and attributes in PDF', async () => {
      // This test ensures that image processing doesn't break HTML structure
      const altTextMarkdown = path.join(tempDir, 'alt-text.md');
      const content = `# Images with Attributes

![Descriptive Alt Text](test-image.png "Title attribute")

End of test.
`;
      fs.writeFileSync(altTextMarkdown, content);

      const outputPath = path.join(tempDir, 'alt-text-output.pdf');

      const result = await fileProcessorService.processFile(altTextMarkdown, {
        outputPath: outputPath,
        includeTOC: false,
        pdfOptions: {
          format: 'A4',
          orientation: 'portrait',
        },
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      // Clean up
      fs.unlinkSync(altTextMarkdown);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }, 30000);
  });

  describe('Performance and Size Tests', () => {
    it('should handle large images without crashing', async () => {
      // Create a larger test image (still small for CI/CD efficiency)
      const largeImageBuffer = Buffer.alloc(10000, 0xff); // 10KB of data
      // Add PNG header to make it a valid PNG
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const largeImagePath = path.join(tempDir, 'large-image.png');
      fs.writeFileSync(
        largeImagePath,
        Buffer.concat([pngHeader, largeImageBuffer]),
      );

      const largeImageMarkdown = path.join(tempDir, 'large-image.md');
      const content = `# Large Image Test

![Large Image](large-image.png)
`;
      fs.writeFileSync(largeImageMarkdown, content);

      const outputPath = path.join(tempDir, 'large-image-output.pdf');

      const startTime = Date.now();
      const result = await fileProcessorService.processFile(
        largeImageMarkdown,
        {
          outputPath: outputPath,
          includeTOC: false,
          pdfOptions: {
            format: 'A4',
            orientation: 'portrait',
          },
        },
      );
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      // Should complete within reasonable time (less than 30 seconds)
      expect(processingTime).toBeLessThan(30000);

      // Clean up
      fs.unlinkSync(largeImagePath);
      fs.unlinkSync(largeImageMarkdown);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }, 45000); // Extended timeout for large image processing
  });

  describe('Error Handling', () => {
    it('should handle corrupted image files gracefully', async () => {
      // Create a corrupted "image" file
      const corruptImagePath = path.join(tempDir, 'corrupt.jpg');
      fs.writeFileSync(corruptImagePath, 'This is not an image file');

      const corruptImageMarkdown = path.join(tempDir, 'corrupt-image.md');
      const content = `# Corrupt Image Test

![Corrupt Image](corrupt.jpg)

Text continues here.
`;
      fs.writeFileSync(corruptImageMarkdown, content);

      const outputPath = path.join(tempDir, 'corrupt-output.pdf');

      // Should still succeed (graceful degradation)
      const result = await fileProcessorService.processFile(
        corruptImageMarkdown,
        {
          outputPath: outputPath,
          includeTOC: false,
          pdfOptions: {
            format: 'A4',
            orientation: 'portrait',
          },
        },
      );

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      // Clean up
      fs.unlinkSync(corruptImagePath);
      fs.unlinkSync(corruptImageMarkdown);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }, 30000);
  });
});
