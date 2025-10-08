/**
 * Test cleanup utilities
 * Handles cleanup of test-generated files
 */

import { existsSync, unlinkSync, readdirSync, statSync, rmSync } from 'fs';
import path from 'path';

export class TestCleanup {
  private static testFilePatterns = [
    /.*-e2e\.pdf$/,
    /.*-test\.pdf$/,
    /test-.*\.txt$/,
    /temp-.*\.(md|pdf|txt)$/,
  ];

  /**
   * Clean up test-generated files in a directory
   */
  static cleanupTestFiles(directory: string): void {
    if (!existsSync(directory)) {
      return;
    }

    try {
      const files = readdirSync(directory);

      files.forEach((file) => {
        const filePath = path.join(directory, file);

        try {
          const stats = statSync(filePath);

          // Only process files, not directories
          if (stats.isFile()) {
            const shouldCleanup = this.testFilePatterns.some((pattern) =>
              pattern.test(file),
            );

            if (shouldCleanup) {
              unlinkSync(filePath);
              // eslint-disable-next-line no-console
              console.log(`🧹 Cleaned up test file: ${file}`);
            }
          }
        } catch (error) {
          // Ignore errors for individual files
          // eslint-disable-next-line no-console
          console.warn(`⚠️  Could not clean up ${file}:`, error);
        }
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️  Could not read directory ${directory}:`, error);
    }
  }

  /**
   * Clean up specific files by pattern
   */
  static cleanupSpecificFiles(directory: string, patterns: string[]): void {
    patterns.forEach((pattern) => {
      const filePath = path.join(directory, pattern);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
          // eslint-disable-next-line no-console
          console.log(`🧹 Cleaned up: ${pattern}`);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`⚠️  Could not clean up ${pattern}:`, error);
        }
      }
    });
  }

  /**
   * Clean up entire temp directory (for integration tests)
   */
  static cleanupTempDirectory(directory: string): void {
    if (!existsSync(directory)) {
      return;
    }

    try {
      rmSync(directory, { recursive: true, force: true });
      // eslint-disable-next-line no-console
      console.log(`🧹 Cleaned up temp directory: ${directory}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️  Could not clean up temp directory ${directory}:`,
        error,
      );
    }
  }

  /**
   * Get all test-generated files in a directory (for debugging)
   */
  static listTestFiles(directory: string): string[] {
    if (!existsSync(directory)) {
      return [];
    }

    try {
      const files = readdirSync(directory);
      return files.filter((file) =>
        this.testFilePatterns.some((pattern) => pattern.test(file)),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️  Could not list files in ${directory}:`, error);
      return [];
    }
  }
}
