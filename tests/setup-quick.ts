/**
 * Quick test setup for unit tests only
 * Minimal configuration for fast execution
 */

// Global test configuration for unit tests
beforeAll(() => {
  // Shorter timeout for unit tests
  jest.setTimeout(5000);
});

// Setup before each test
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
});

// Mock heavy dependencies for unit tests
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue(undefined),
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn().mockResolvedValue(undefined),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

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
