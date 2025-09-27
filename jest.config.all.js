/**
 * Jest Configuration for Complete Test Suite
 * 
 * Purpose: Comprehensive testing including all test types and resource-heavy operations
 * Scope: All tests (unit + integration + E2E + PDF generation + batch processing)
 * Execution Time: ~3 minutes (full execution with heavy operations)
 * Coverage: Disabled to focus on functionality validation
 * 
 * Used by commands:
 * - npm run test:all (complete test suite validation)
 * 
 * Features:
 * - 5-minute timeout for heavy Puppeteer and PDF operations
 * - Single worker to prevent resource conflicts and timeouts
 * - Includes all test directories without exceptions
 * - Full Puppeteer environment setup with complete lifecycle
 * - Comprehensive functionality validation across all components
 * 
 * Included tests:
 * - tests/unit/**.test.ts (unit tests)
 * - tests/integration/**.test.ts (all integration tests including PDF)
 * - tests/e2e/**.test.ts (end-to-end tests)
 * 
 * Note: This configuration is designed for CI/CD and comprehensive validation
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ansi-styles|strip-ansi|ansi-regex|wrap-ansi|string-width|emoji-regex|is-fullwidth-code-point)/)',
  ],

  // Extended timeout for all tests including heavy Puppeteer operations
  testTimeout: 300000, // 5 minutes for complete test suite

  // Include ALL test types
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.ts'
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

  // Disable coverage for complete tests to focus on functionality
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
