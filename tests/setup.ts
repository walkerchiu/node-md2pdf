/**
 * Jest test environment setup
 */

// Global test configuration
beforeAll(() => {
  // Global setup before tests
  // Set test timeout for Puppeteer operations
  jest.setTimeout(10000);
});

afterAll(async () => {
  // Clean up all global resources
  // Remove any event listeners
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
export const createMockConfig = () => ({
  inputPath: 'test.md',
  outputPath: 'test.pdf',
  tocDepth: 3,
  includePageNumbers: true,
  chineseFontSupport: true
});
