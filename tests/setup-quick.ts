/**
 * Quick test setup for unit tests only
 * Minimal configuration for fast execution
 */

// Set test environment variables to suppress logging
process.env.NODE_ENV = 'test';
process.env.MD2PDF_LOG_LEVEL = 'error'; // Only show errors during tests
process.env.JEST_TESTING = 'true';

// Mock console methods to reduce test output noise
const originalConsole = console;
const mockConsole = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: originalConsole.error,
};

// Global test configuration for unit tests
beforeAll(() => {
  // Shorter timeout for unit tests
  jest.setTimeout(5000);
  // Replace console with mocked version during tests
  global.console = mockConsole as any;
});

// Restore console after all tests
afterAll(() => {
  global.console = originalConsole;
});

// Setup before each test
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();

  // Reset console mocks
  if (typeof mockConsole.log === 'function' && 'mockClear' in mockConsole.log) {
    (mockConsole.log as jest.Mock).mockClear();
  }
  if (
    typeof mockConsole.info === 'function' &&
    'mockClear' in mockConsole.info
  ) {
    (mockConsole.info as jest.Mock).mockClear();
  }
  if (
    typeof mockConsole.warn === 'function' &&
    'mockClear' in mockConsole.warn
  ) {
    (mockConsole.warn as jest.Mock).mockClear();
  }
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
