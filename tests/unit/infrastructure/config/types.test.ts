/**
 * Unit tests for config types
 * Tests the structure and validity of configuration schema types
 */

import { ConfigSchema } from '../../../../src/infrastructure/config/types';

describe('ConfigSchema', () => {
  describe('configuration schema structure', () => {
    it('should have all required properties defined', () => {
      // Test that the ConfigSchema interface has the expected structure
      const mockConfig: Partial<ConfigSchema> = {
        language: {
          default: 'en',
          available: ['en', 'zh-tw'],
        },
        pdf: {
          margin: {
            top: '1in',
            right: '1in',
            bottom: '1in',
            left: '1in',
          },
          format: 'A4',
          displayHeaderFooter: false,
          printBackground: true,
        },
        toc: {
          enabled: true,
          depth: 3,
          title: {
            en: 'Table of Contents',
            'zh-tw': '目錄',
          },
        },
        performance: {
          maxWorkers: 4,
          timeout: 30000,
          memoryLimit: '512MB',
        },
        features: {
          enhancedServices: false,
          enhancedCli: false,
          newOrchestrator: false,
          forceLegacyMode: false,
        },
      };

      // Validate required properties exist
      expect(mockConfig.language).toBeDefined();
      expect(mockConfig.pdf).toBeDefined();
      expect(mockConfig.toc).toBeDefined();
      expect(mockConfig.performance).toBeDefined();
      expect(mockConfig.features).toBeDefined();
    });

    it('should support optional logging configuration', () => {
      const mockConfigWithLogging: Partial<ConfigSchema> = {
        logging: {
          level: 'info',
          fileEnabled: true,
          filePath: '/logs/test.log',
          format: 'json',
          maxFileSize: 10485760, // 10MB
          maxBackupFiles: 5,
          enableRotation: true,
        },
      };

      expect(mockConfigWithLogging.logging).toBeDefined();
      expect(mockConfigWithLogging.logging?.level).toBe('info');
      expect(mockConfigWithLogging.logging?.fileEnabled).toBe(true);
      expect(mockConfigWithLogging.logging?.format).toBe('json');
      expect(mockConfigWithLogging.logging?.maxFileSize).toBe(10485760);
      expect(mockConfigWithLogging.logging?.maxBackupFiles).toBe(5);
      expect(mockConfigWithLogging.logging?.enableRotation).toBe(true);
    });

    it('should validate logging level options', () => {
      const validLevels: Array<'error' | 'warn' | 'info' | 'debug'> = [
        'error',
        'warn',
        'info',
        'debug',
      ];

      validLevels.forEach((level) => {
        const configWithLevel: Partial<ConfigSchema> = {
          logging: {
            level,
            fileEnabled: false,
            format: 'text',
            maxFileSize: 1048576,
            maxBackupFiles: 3,
            enableRotation: false,
          },
        };

        expect(configWithLevel.logging?.level).toBe(level);
      });
    });

    it('should validate logging format options', () => {
      const validFormats: Array<'text' | 'json'> = ['text', 'json'];

      validFormats.forEach((format) => {
        const configWithFormat: Partial<ConfigSchema> = {
          logging: {
            level: 'info',
            fileEnabled: true,
            format,
            maxFileSize: 1048576,
            maxBackupFiles: 3,
            enableRotation: true,
          },
        };

        expect(configWithFormat.logging?.format).toBe(format);
      });
    });

    it('should handle logging configuration without optional properties', () => {
      const minimalLoggingConfig: Partial<ConfigSchema> = {
        logging: {
          level: 'info',
          fileEnabled: false,
          format: 'text',
          maxFileSize: 1048576,
          maxBackupFiles: 3,
          enableRotation: false,
        },
      };

      expect(minimalLoggingConfig.logging?.filePath).toBeUndefined();
      expect(minimalLoggingConfig.logging?.level).toBe('info');
    });

    it('should support pdf configuration structure', () => {
      const pdfConfig: Partial<ConfigSchema> = {
        pdf: {
          margin: {
            top: '2cm',
            right: '2cm',
            bottom: '2cm',
            left: '2cm',
          },
          format: 'A3',
          displayHeaderFooter: true,
          printBackground: false,
        },
      };

      expect(pdfConfig.pdf?.margin.top).toBe('2cm');
      expect(pdfConfig.pdf?.format).toBe('A3');
      expect(pdfConfig.pdf?.displayHeaderFooter).toBe(true);
    });

    it('should support performance configuration structure', () => {
      const performanceConfig: Partial<ConfigSchema> = {
        performance: {
          maxWorkers: 8,
          timeout: 60000,
          memoryLimit: '1GB',
        },
      };

      expect(performanceConfig.performance?.maxWorkers).toBe(8);
      expect(performanceConfig.performance?.timeout).toBe(60000);
      expect(performanceConfig.performance?.memoryLimit).toBe('1GB');
    });

    it('should support feature flags configuration', () => {
      const featuresConfig: Partial<ConfigSchema> = {
        features: {
          enhancedServices: true,
          enhancedCli: true,
          newOrchestrator: false,
          forceLegacyMode: false,
        },
      };

      expect(featuresConfig.features?.enhancedServices).toBe(true);
      expect(featuresConfig.features?.enhancedCli).toBe(true);
      expect(featuresConfig.features?.newOrchestrator).toBe(false);
      expect(featuresConfig.features?.forceLegacyMode).toBe(false);
    });
  });
});
