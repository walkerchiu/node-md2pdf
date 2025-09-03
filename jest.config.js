module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 測試檔案路徑
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.ts'
  ],
  
  // 模組路徑對應
  moduleNameMapper: {
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/cli/(.*)$': '<rootDir>/src/cli/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/types$': '<rootDir>/src/types/index.ts'
  },
  
  // 覆蓋率設定
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 忽略檔案
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // 測試設定
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true,
  clearMocks: true,
  restoreMocks: true
};
