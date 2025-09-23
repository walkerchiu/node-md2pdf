/**
 * Jest test environment setup
 */

import path from 'path';
import { TestCleanup } from './utils/test-cleanup';

// Global test configuration
beforeAll(() => {
  // Global setup before tests
  // Set test timeout for Puppeteer operations
  jest.setTimeout(10000);
});

afterAll(async () => {
  // Clean up all test-generated files (only once at the end)
  const fixturesDir = path.join(__dirname, 'fixtures/markdown');
  const tempDir = path.join(__dirname, 'temp');

  TestCleanup.cleanupTestFiles(fixturesDir);
  TestCleanup.cleanupTempDirectory(tempDir);

  // Clean up all global resources
  process.removeAllListeners('unhandledRejection');

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Setup before each test
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
});

// Test utility functions
export const createMockConfig = (): {
  inputPath: string;
  outputPath: string;
  tocDepth: number;
  includePageNumbers: boolean;
  chineseFontSupport: boolean;
} => ({
  inputPath: 'test.md',
  outputPath: 'test.pdf',
  tocDepth: 3,
  includePageNumbers: true,
  chineseFontSupport: true,
});
