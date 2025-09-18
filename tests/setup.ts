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
  // Clean up all test-generated files
  const fixturesDir = path.join(__dirname, 'fixtures/markdown');
  // eslint-disable-next-line no-console
  console.log('\n🧹 Cleaning up test-generated files...');
  TestCleanup.cleanupTestFiles(fixturesDir);
  // Clean up all global resources
  // Remove any event listeners
  process.removeAllListeners('unhandledRejection');
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  // eslint-disable-next-line no-console
  console.log('✅ Test cleanup completed\n');
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
