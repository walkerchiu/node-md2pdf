/**
 * Integration tests for batch processing functionality
 */

import { BatchProcessor } from '../../src/core/batch';
import { FileCollector } from '../../src/core/batch/file-collector';
import { OutputManager } from '../../src/core/batch/output-manager';
import {
  BatchConversionConfig,
  BatchFilenameFormat,
} from '../../src/types/batch';
import type { BatchProgressEvent } from '../../src/types/batch';
import * as fs from 'fs';
import * as path from 'path';

describe('Batch Processing Integration', () => {
  let batchProcessor: BatchProcessor;
  let testDir: string;
  let outputDir: string;
  let config: BatchConversionConfig;

  beforeEach(async () => {
    batchProcessor = new BatchProcessor(
      new FileCollector(),
      new OutputManager(),
    );
    testDir = path.join(__dirname, '../temp/batch-integration-test');
    outputDir = path.join(testDir, 'output');
    // Create test directory structure
    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.mkdir(outputDir, { recursive: true });
    // Create test markdown files
    const testFiles = [
      {
        name: 'document1.md',
        content: `# Document 1
## Introduction
This is the first test document for batch processing.
## Features
- Feature A
- Feature B
- Feature C
## Conclusion
End of document 1.`,
      },
      {
        name: 'document2.md',
        content: `# Document 2
## Overview
This is the second test document.
### Details
Some detailed information here.
## Summary
Document 2 summary.`,
      },
      {
        name: 'simple.md',
        content: `# Simple Document
Just a simple markdown file for testing.`,
      },
    ];
    // Write test files
    for (const testFile of testFiles) {
      await fs.promises.writeFile(
        path.join(testDir, testFile.name),
        testFile.content,
      );
    }
    // Create subdirectory with file
    const subDir = path.join(testDir, 'sub');
    await fs.promises.mkdir(subDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(subDir, 'subdoc.md'),
      `# Subdirectory Document\n\nA document in a subdirectory.`,
    );
    config = {
      inputPattern: path.join(testDir, '*.md'),
      outputDirectory: outputDir,
      preserveDirectoryStructure: false,
      filenameFormat: BatchFilenameFormat.ORIGINAL,
      maxConcurrentProcesses: 1, // Sequential for predictable testing
      continueOnError: true,
      tocDepth: 2,
      includePageNumbers: true,
      chineseFontSupport: false,
    };
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
      // eslint-disable-next-line no-console
      console.warn('Test cleanup failed:', error);
    }
  });

  describe('Basic batch processing', () => {
    test('should process multiple markdown files successfully', async () => {
      const result = await batchProcessor.processBatch(config);
      expect(result.success).toBe(true);
      expect(result.totalFiles).toBe(3); // document1.md, document2.md, simple.md
      expect(result.successfulFiles).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      // Check that PDF files were created
      const outputFiles = await fs.promises.readdir(outputDir);
      const pdfFiles = outputFiles.filter((f) => f.endsWith('.pdf'));
      expect(pdfFiles.length).toBeGreaterThan(0);
    }, 90000); // Extended timeout for batch PDF generation
    test('should handle recursive file discovery', async () => {
      const recursiveConfig = {
        ...config,
        inputPattern: path.join(testDir, '**/*.md'),
        preserveDirectoryStructure: true,
      };
      const result = await batchProcessor.processBatch(recursiveConfig);
      expect(result.success).toBe(true);
      expect(result.totalFiles).toBe(4); // Includes subdoc.md
      // Check that subdirectory structure is preserved
      const subOutputDir = path.join(outputDir, 'sub');
      const subDirExists = await fs.promises
        .access(subOutputDir)
        .then(() => true)
        .catch(() => false);
      expect(subDirExists).toBe(true);
    }, 60000);
  });

  describe('Error handling', () => {
    test('should continue processing when continueOnError is true', async () => {
      // Create a problematic file
      await fs.promises.writeFile(
        path.join(testDir, 'problematic.md'),
        '# Problematic\n\n[Invalid link](missing-file.pdf)',
      );
      const result = await batchProcessor.processBatch({
        ...config,
        continueOnError: true,
      });
      // Should still process other files even if one fails
      expect(result.totalFiles).toBe(4);
      expect(result.successfulFiles).toBeGreaterThanOrEqual(1);
    }, 60000);
    test('should handle non-existent input pattern gracefully', async () => {
      const invalidConfig = {
        ...config,
        inputPattern: path.join(testDir, 'nonexistent', '*.md'),
      };
      const result = await batchProcessor.processBatch(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.totalFiles).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Different filename formats', () => {
    test('should handle timestamp filename format', async () => {
      const timestampConfig = {
        ...config,
        filenameFormat: BatchFilenameFormat.WITH_TIMESTAMP,
      };
      const result = await batchProcessor.processBatch(timestampConfig);
      expect(result.success).toBe(true);
      const outputFiles = await fs.promises.readdir(outputDir);
      const pdfFiles = outputFiles.filter((f) => f.endsWith('.pdf'));
      // Check that timestamps are included in filenames
      pdfFiles.forEach((filename) => {
        expect(filename).toMatch(/.*_\d+\.pdf$/);
      });
    }, 60000);
    test('should handle date filename format', async () => {
      const dateConfig = {
        ...config,
        filenameFormat: BatchFilenameFormat.WITH_DATE,
      };
      const result = await batchProcessor.processBatch(dateConfig);
      expect(result.success).toBe(true);
      const outputFiles = await fs.promises.readdir(outputDir);
      const pdfFiles = outputFiles.filter((f) => f.endsWith('.pdf'));
      // Check that dates are included in filenames
      pdfFiles.forEach((filename) => {
        expect(filename).toMatch(/.*_\d{4}-\d{2}-\d{2}\.pdf$/);
      });
    }, 60000);
  });

  describe('Progress tracking', () => {
    test('should provide progress updates during processing', async () => {
      const progressEvents: BatchProgressEvent[] = [];
      const result = await batchProcessor.processBatch(config, {
        onProgress: (event) => {
          progressEvents.push(event);
        },
      });
      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);
      // Should have start and complete events at minimum
      const eventTypes = progressEvents.map((e) => e.type);
      expect(eventTypes).toContain('start');
      expect(eventTypes).toContain('complete');
    }, 60000);
    test('should track individual file completion', async () => {
      const completedFiles: string[] = [];
      const result = await batchProcessor.processBatch(config, {
        onFileComplete: (result) => {
          if (result.success) {
            completedFiles.push(result.inputPath);
          }
        },
      });
      expect(result.success).toBe(true);
      expect(completedFiles.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Output directory management', () => {
    test('should create output directory if it does not exist', async () => {
      const newOutputDir = path.join(testDir, 'new-output');
      const configWithNewOutput = {
        ...config,
        outputDirectory: newOutputDir,
      };
      // Ensure directory doesn't exist
      await fs.promises.rm(newOutputDir, { recursive: true, force: true });
      const result = await batchProcessor.processBatch(configWithNewOutput);
      expect(result.success).toBe(true);
      // Check that directory was created
      const dirExists = await fs.promises
        .access(newOutputDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    }, 60000);
    test('should handle file name conflicts', async () => {
      // Create duplicate input files in different locations
      const subDir = path.join(testDir, 'another-sub');
      await fs.promises.mkdir(subDir, { recursive: true });
      // Copy a file to create potential naming conflict
      await fs.promises.copyFile(
        path.join(testDir, 'document1.md'),
        path.join(subDir, 'document1.md'),
      );
      const result = await batchProcessor.processBatch({
        ...config,
        inputPattern: path.join(testDir, '**/*.md'),
        preserveDirectoryStructure: false, // This should cause naming conflicts
      });
      expect(result.success).toBe(true);
      // Check that files were processed without overwriting
      const outputFiles = await fs.promises.readdir(outputDir);
      const pdfFiles = outputFiles.filter((f) => f.endsWith('.pdf'));
      expect(pdfFiles.length).toBeGreaterThan(1);
    }, 60000);
  });

  describe('Cancellation support', () => {
    test('should support cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      // Cancel after a short delay
      setTimeout(() => {
        controller.abort();
      }, 100);
      try {
        await batchProcessor.processBatch(config, {
          signal: controller.signal,
        });
        // If we reach here, cancellation didn't work as expected
        fail('Expected processing to be cancelled');
      } catch (error) {
        expect((error as Error).message).toContain('cancelled');
      }
    });
  });
});
