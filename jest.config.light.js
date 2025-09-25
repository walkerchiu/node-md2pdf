/**
 * Jest Configuration for Light Integration Tests
 * 
 * Purpose: Lightweight integration testing excluding resource-heavy operations
 * Scope: Unit tests + parser integration tests + E2E tests (excludes PDF and batch processing)
 * Execution Time: ~30 seconds (moderate execution)
 * Coverage: Disabled to focus on functionality over metrics
 * 
 * Used by commands:
 * - npm run test:light (quick functional verification)
 * 
 * Features:
 * - 4-minute timeout for Puppeteer operations
 * - Single worker to avoid resource conflicts
 * - Excludes heavy PDF generation and batch processing tests
 * - Includes parser integration and CLI E2E tests
 * - Full Jest setup with Puppeteer environment support
 * 
 * Excluded tests:
 * - tests/integration/pdf/**.test.ts (heavy PDF generation)
 * - tests/integration/batch-processing.test.ts (resource intensive)
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Extended timeout for integration tests with Puppeteer
  testTimeout: 240000, // 4 minutes for heavy integration tests

  // Include all test types
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/parser/**/*.test.ts',
    '<rootDir>/tests/integration/e2e/**/*.test.ts',
    // Skip heavy PDF tests to avoid timeouts in full run
    // '<rootDir>/tests/integration/pdf/**/*.test.ts',
    // '<rootDir>/tests/integration/batch-processing.test.ts',
  ],

  // Module path mapping
  moduleNameMapper: {
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/cli/(.*)$': '<rootDir>/src/cli/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/types$': '<rootDir>/src/types/index.ts',
    '^@/infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@/shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@/application/(.*)$': '<rootDir>/src/application/$1'
  },

  // Disable coverage for full tests to focus on functionality
  collectCoverage: false,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Test setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,

  // Force single worker for resource-heavy tests
  maxWorkers: 1,

  // Puppeteer environment variables
  setupFiles: ['<rootDir>/tests/jest-setup.ts']
};
