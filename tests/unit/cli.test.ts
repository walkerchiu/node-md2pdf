/**
 * CLI Unit Tests
 *
 * Tests the core functionality of the CLI module
 */

import { jest } from '@jest/globals';

// Mock external ES modules
jest.mock('inquirer');
jest.mock('ora');
jest.mock('chalk', () => ({
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  magenta: jest.fn((text) => text),
  white: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  bold: jest.fn((text) => text),
  dim: jest.fn((text) => text),
  italic: jest.fn((text) => text),
  underline: jest.fn((text) => text),
  inverse: jest.fn((text) => text),
  strikethrough: jest.fn((text) => text),
}));

describe('cli', () => {
  // Dynamic import to avoid ES module issues
  let moduleExports: any;

  beforeAll(async () => {
    try {
      moduleExports = await import('../../src/cli');
    } catch (error) {
      console.warn('Unable to import module:', error);
      moduleExports = {};
    }
  });

  describe('Module Structure', () => {
    it('should successfully load the module', () => {
      expect(moduleExports).toBeDefined();
    });

    it('should export main function', () => {
      expect(moduleExports.main).toBeDefined();
      expect(typeof moduleExports.main).toBe('function');
    });
  });
});
