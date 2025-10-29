/**
 * Unit tests for PlantUML path resolver
 * Tests cross-platform PlantUML installation detection and path resolution
 */

import { jest } from '@jest/globals';
import * as fs from 'fs';
import { execSync } from 'child_process';

import {
  resolvePlantUMLPaths,
  getDefaultPlantUMLConfig,
} from '../../../src/utils/plantuml-path-resolver';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('PlantUML Path Resolver', () => {
  let originalPlatform: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original values
    originalPlatform = process.platform;
    originalEnv = { ...process.env };

    // Reset all mocks
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readdirSync.mockReturnValue([]);
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
    process.env = originalEnv;
  });

  describe('resolvePlantUMLPaths', () => {
    it('should prioritize command path over JAR path', () => {
      // Mock command found
      mockExecSync.mockReturnValue('/usr/local/bin/plantuml\n');
      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/local/bin/plantuml',
      );

      const result = resolvePlantUMLPaths();

      expect(result).toEqual({
        commandPath: '/usr/local/bin/plantuml',
        useCommand: true,
      });
    });

    it('should fallback to JAR path when command not found', () => {
      // Mock command not found
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock JAR file found
      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/local/lib/plantuml.jar',
      );

      // Mock platform as linux for predictable JAR paths
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      const result = resolvePlantUMLPaths();

      expect(result).toEqual({
        jarPath: '/usr/local/lib/plantuml.jar',
        useCommand: false,
      });
    });

    it('should return fallback configuration when nothing found', () => {
      // Mock command not found
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock no JAR files found
      mockFs.existsSync.mockReturnValue(false);

      const result = resolvePlantUMLPaths();

      expect(result).toEqual({
        useCommand: false,
      });
    });

    it('should handle Windows command detection', () => {
      // Mock Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      // Mock 'which' command fails, 'where' command succeeds
      mockExecSync.mockImplementation(((command: string) => {
        if (command === 'which plantuml') {
          throw new Error('Command not found');
        }
        if (command === 'where plantuml') {
          return 'C:\\plantuml\\plantuml.exe\n';
        }
        throw new Error('Unexpected command');
      }) as any);

      mockFs.existsSync.mockImplementation(
        (path) => path === 'C:\\plantuml\\plantuml.exe',
      );

      const result = resolvePlantUMLPaths();

      expect(result).toEqual({
        commandPath: 'C:\\plantuml\\plantuml.exe',
        useCommand: true,
      });
    });
  });

  describe('platform-specific JAR path detection', () => {
    it('should return macOS specific paths for darwin platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock Homebrew Intel path exists
      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/local/lib/plantuml.jar',
      );

      const result = resolvePlantUMLPaths();

      expect(result.jarPath).toBe('/usr/local/lib/plantuml.jar');
      expect(result.useCommand).toBe(false);
    });

    it('should return Linux specific paths for linux platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock system package manager path exists
      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/share/plantuml/plantuml.jar',
      );

      const result = resolvePlantUMLPaths();

      expect(result.jarPath).toBe('/usr/share/plantuml/plantuml.jar');
      expect(result.useCommand).toBe(false);
    });

    it('should return Windows specific paths for win32 platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock common Windows installation path exists
      mockFs.existsSync.mockImplementation(
        (path) => path === 'C:\\plantuml\\plantuml.jar',
      );

      const result = resolvePlantUMLPaths();

      expect(result.jarPath).toBe('C:\\plantuml\\plantuml.jar');
      expect(result.useCommand).toBe(false);
    });

    it('should handle user-specific installation paths', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      process.env.HOME = '/home/testuser';

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock user-specific path exists
      mockFs.existsSync.mockImplementation(
        (path) => path === '/home/testuser/.local/share/plantuml/plantuml.jar',
      );

      const result = resolvePlantUMLPaths();

      expect(result.jarPath).toBe(
        '/home/testuser/.local/share/plantuml/plantuml.jar',
      );
      expect(result.useCommand).toBe(false);
    });
  });

  describe('glob path expansion', () => {
    it('should expand Homebrew version directories', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock Homebrew directory structure
      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/opt/homebrew/Cellar/plantuml/') return true;
        if (
          path === '/opt/homebrew/Cellar/plantuml/1.2025.7/libexec/plantuml.jar'
        )
          return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === '/opt/homebrew/Cellar/plantuml/') {
          return [
            { name: '1.2025.7', isDirectory: () => true },
            { name: '1.2025.6', isDirectory: () => true },
          ] as any;
        }
        return [];
      });

      const result = resolvePlantUMLPaths();

      expect(result.jarPath).toBe(
        '/opt/homebrew/Cellar/plantuml/1.2025.7/libexec/plantuml.jar',
      );
      expect(result.useCommand).toBe(false);
    });

    it('should handle missing base directory in glob expansion', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock directory doesn't exist
      mockFs.existsSync.mockImplementation(() => false);

      const result = resolvePlantUMLPaths();

      expect(result).toEqual({
        useCommand: false,
      });
    });

    it('should handle readdirSync errors in glob expansion', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/opt/homebrew/Cellar/plantuml/') return true;
        return false;
      });

      // Mock readdirSync throws error
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = resolvePlantUMLPaths();

      expect(result).toEqual({
        useCommand: false,
      });
    });
  });

  describe('getDefaultPlantUMLConfig', () => {
    it('should return config with command path when command available', () => {
      // Mock command found
      mockExecSync.mockReturnValue('/usr/local/bin/plantuml\n');
      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/local/bin/plantuml',
      );

      const config = getDefaultPlantUMLConfig();

      expect(config).toEqual({
        JAVA_PATH: 'java',
        JAR_PATH: '/usr/local/bin/plantuml.jar', // fallback value
        COMMAND_PATH: '/usr/local/bin/plantuml',
        USE_COMMAND: true,
        JAVA_OPTIONS: ['-Xmx1024m', '-Djava.awt.headless=true'],
        TIMEOUT: 30000,
        DEBUG: false,
      });
    });

    it('should return config with JAR path when only JAR available', () => {
      // Mock command not found
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      // Mock JAR file found
      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/share/plantuml/plantuml.jar',
      );

      const config = getDefaultPlantUMLConfig();

      expect(config).toEqual({
        JAVA_PATH: 'java',
        JAR_PATH: '/usr/share/plantuml/plantuml.jar',
        COMMAND_PATH: undefined,
        USE_COMMAND: false,
        JAVA_OPTIONS: ['-Xmx1024m', '-Djava.awt.headless=true'],
        TIMEOUT: 30000,
        DEBUG: false,
      });
    });

    it('should return fallback config when nothing found', () => {
      // Mock command not found
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock no JAR files found
      mockFs.existsSync.mockReturnValue(false);

      const config = getDefaultPlantUMLConfig();

      expect(config).toEqual({
        JAVA_PATH: 'java',
        JAR_PATH: '/usr/local/bin/plantuml.jar', // fallback value
        COMMAND_PATH: undefined,
        USE_COMMAND: false,
        JAVA_OPTIONS: ['-Xmx1024m', '-Djava.awt.headless=true'],
        TIMEOUT: 30000,
        DEBUG: false,
      });
    });
  });

  describe('error handling', () => {
    it('should handle execSync exceptions gracefully', () => {
      // Mock execSync throws error
      mockExecSync.mockImplementation(() => {
        throw new Error('Command execution failed');
      });

      expect(() => resolvePlantUMLPaths()).not.toThrow();
    });

    it('should handle fs.existsSync exceptions gracefully', () => {
      // Mock execSync succeeds
      mockExecSync.mockReturnValue('/usr/local/bin/plantuml\n');

      // Mock fs.existsSync throws error only when checking JAR paths
      mockFs.existsSync.mockImplementation((path: any) => {
        if (typeof path === 'string' && path.includes('plantuml.jar')) {
          throw new Error('File system error');
        }
        return path === '/usr/local/bin/plantuml';
      });

      const result = resolvePlantUMLPaths();

      // Should still find the command path despite JAR error
      expect(result).toEqual({
        commandPath: '/usr/local/bin/plantuml',
        useCommand: true,
      });
    });

    it('should handle unknown platform gracefully', () => {
      Object.defineProperty(process, 'platform', {
        value: 'unknown',
      });

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock default fallback path exists
      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/share/plantuml/plantuml.jar',
      );

      const result = resolvePlantUMLPaths();

      expect(result.jarPath).toBe('/usr/share/plantuml/plantuml.jar');
      expect(result.useCommand).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty execSync output', () => {
      mockExecSync.mockReturnValue('');

      const result = resolvePlantUMLPaths();

      // Should fallback to JAR detection or return fallback config
      expect(result.useCommand).toBeDefined();
    });

    it('should handle Windows environment variables', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      process.env.USERPROFILE = 'C:\\Users\\TestUser';
      process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming';
      process.env.LOCALAPPDATA = 'C:\\Users\\TestUser\\AppData\\Local';

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      // Mock user profile path exists
      mockFs.existsSync.mockImplementation(
        (path) => path === 'C:\\Users\\TestUser\\plantuml\\plantuml.jar',
      );

      const result = resolvePlantUMLPaths();

      expect(result.jarPath).toBe(
        'C:\\Users\\TestUser\\plantuml\\plantuml.jar',
      );
      expect(result.useCommand).toBe(false);
    });

    it('should handle missing environment variables gracefully', () => {
      // Clear environment variables
      delete process.env.HOME;
      delete process.env.USERPROFILE;
      delete process.env.APPDATA;
      delete process.env.LOCALAPPDATA;

      // Mock command not found, force JAR detection
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      expect(() => resolvePlantUMLPaths()).not.toThrow();
    });
  });
});
