/**
 * Jest environment setup for Puppeteer tests
 * This file sets up environment variables and configurations before tests run
 */

// Set Puppeteer environment variables for better compatibility with Apple Silicon and CI environments
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
process.env.PUPPETEER_EXECUTABLE_PATH = '';

// Increase memory and handle limits for Puppeteer
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Set reasonable defaults for test environment
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Disable Puppeteer's download progress during tests
process.env.npm_config_progress = 'false';

// Handle uncaught rejections in tests gracefully
process.on('unhandledRejection', (reason, promise) => {
  // eslint-disable-next-line no-console
  console.warn('Unhandled Promise Rejection in test:', promise, 'reason:', reason);
});

// Increase the default timeout for async operations
jest.setTimeout(30000);
