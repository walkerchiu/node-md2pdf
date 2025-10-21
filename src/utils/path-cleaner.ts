/**
 * Path cleaning utilities for handling drag-and-drop file paths
 * Handles various edge cases when users drag files into terminal
 */

import path from 'path';

export class PathCleaner {
  /**
   * Clean and normalize file paths from user input
   * Handles common cases when files are dragged into terminal:
   * - Quoted paths: '/path/to/file.md' or "/path/to/file.md"
   * - Escaped spaces: /path/to/file\ with\ spaces.md
   * - Mixed formats and trailing whitespace
   */
  static cleanPath(inputPath: string): string {
    if (!inputPath) {
      return inputPath;
    }

    let cleanedPath = inputPath.trim();

    // Return empty string if input is only whitespace
    if (!cleanedPath) {
      return '';
    }

    // Remove surrounding quotes (single or double)
    if (
      (cleanedPath.startsWith("'") && cleanedPath.endsWith("'")) ||
      (cleanedPath.startsWith('"') && cleanedPath.endsWith('"'))
    ) {
      cleanedPath = cleanedPath.slice(1, -1);
    }

    // Handle escaped spaces and other characters
    cleanedPath = cleanedPath.replace(/\\(.)/g, '$1');

    // Normalize path separators and resolve relative paths
    cleanedPath = path.resolve(cleanedPath);

    return cleanedPath;
  }

  /**
   * Validate if the cleaned path looks like a valid file path
   */
  static isValidPath(inputPath: string): boolean {
    try {
      const cleaned = this.cleanPath(inputPath);
      // Basic validation - should be an absolute path after cleaning
      return path.isAbsolute(cleaned) && cleaned.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clean multiple paths (for batch processing)
   */
  static cleanPaths(inputPaths: string[]): string[] {
    return inputPaths.map((p) => this.cleanPath(p)).filter((p) => p.length > 0);
  }
}
