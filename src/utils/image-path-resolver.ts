/**
 * Image Path Resolver Utility
 * Handles conversion of relative image paths to absolute paths for proper PDF rendering
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, isAbsolute } from 'path';

export class ImagePathResolver {
  /**
   * Process HTML content and convert relative image paths to base64 data URIs
   * This approach ensures compatibility with Puppeteer by embedding images directly
   * @param html HTML content from markdown parser
   * @param filePath Original markdown file path (used as base directory)
   * @returns HTML content with converted image paths
   */
  public static processImagePaths(html: string, filePath: string): string {
    if (!filePath) {
      return html;
    }

    const baseDir = dirname(filePath);

    // Regular expression to match img tags with src attributes
    const imgRegex = /<img([^>]+)src=["']([^"']+)["']([^>]*)>/gi;

    return html.replace(imgRegex, (match, beforeSrc, srcPath, afterSrc) => {
      // Skip if already absolute path, http/https URL, or data URL
      if (
        isAbsolute(srcPath) ||
        srcPath.startsWith('http') ||
        srcPath.startsWith('data:')
      ) {
        return match;
      }

      try {
        // Convert relative path to absolute path
        const absolutePath = resolve(baseDir, srcPath);

        // Check if file exists
        if (!existsSync(absolutePath)) {
          console.warn(`Image file not found: ${absolutePath}`);
          return match; // Return original if file doesn't exist
        }

        // Read image file and convert to base64
        const imageBuffer = readFileSync(absolutePath);
        const ext = absolutePath.toLowerCase().split('.').pop();

        // Determine MIME type based on extension
        let mimeType = 'image/jpeg'; // default
        switch (ext) {
          case 'png':
            mimeType = 'image/png';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
          case 'svg':
            mimeType = 'image/svg+xml';
            break;
          case 'bmp':
            mimeType = 'image/bmp';
            break;
          case 'jpg':
          case 'jpeg':
          default:
            mimeType = 'image/jpeg';
            break;
        }

        // Create base64 data URI
        const base64Data = imageBuffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;

        console.log(
          `Converted image to base64: ${srcPath} (${Math.round(imageBuffer.length / 1024)}KB)`,
        );

        return `<img${beforeSrc}src="${dataUri}"${afterSrc}>`;
      } catch (error) {
        console.error(`Failed to process image ${srcPath}:`, error);
        return match; // Return original if processing fails
      }
    });
  }

  /**
   * Extract and validate image paths from markdown content
   * @param content Markdown content
   * @param filePath Base file path
   * @returns Array of image information objects
   */
  public static extractImageInfo(
    content: string,
    filePath: string,
  ): Array<{
    originalPath: string;
    absolutePath: string;
    exists: boolean;
  }> {
    const baseDir = dirname(filePath);
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images: Array<{
      originalPath: string;
      absolutePath: string;
      exists: boolean;
    }> = [];

    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      const originalPath = match[2];

      if (
        !isAbsolute(originalPath) &&
        !originalPath.startsWith('http') &&
        !originalPath.startsWith('data:')
      ) {
        const absolutePath = resolve(baseDir, originalPath);

        try {
          const fs = require('fs');
          const exists = fs.existsSync(absolutePath);
          images.push({ originalPath, absolutePath, exists });
        } catch {
          images.push({ originalPath, absolutePath, exists: false });
        }
      }
    }

    return images;
  }
}
