/**
 * Jest Configuration for Unit Tests
 * 
 * Purpose: Unit testing configuration focused on testing individual functions and classes
 * Scope: Only executes test files in tests/unit/ directory
 * Execution Time: ~4 seconds (fast execution)
 * Coverage: Disabled by default for faster testing, enabled only when explicitly requested
 * 
 * Used by commands:
 * - npm test (daily development testing - no coverage)
 * - npm run test:coverage (code quality checks)
 * - npm run test:watch (automatic testing during development)
 * 
 * Features:
 * - 10-second timeout for fast unit tests
 * - Parallel execution (50% CPU cores) for speed
 * - Coverage analysis with threshold enforcement
 * - Excludes CLI entry files and type definition files
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Shorter timeout for unit tests
  testTimeout: 10000,

  // Only unit tests for quick runs
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
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

  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  
  // Include source files in coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli/index.ts',
    '!src/cli.ts',
    '!src/**/types.ts',
  ],
  
  // Lower thresholds for development
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Minimal setup for speed
  setupFilesAfterEnv: ['<rootDir>/tests/setup-quick.ts'],
  verbose: false,
  clearMocks: true,
  restoreMocks: true,
  
  // Enable parallel execution for unit tests
  maxWorkers: '50%',
};
