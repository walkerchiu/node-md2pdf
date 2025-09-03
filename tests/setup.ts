/**
 * Jest test environment setup
 */

// Global test configuration
beforeAll(() => {
  // Global setup before tests
});

afterAll(() => {
  // Cleanup after tests
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
