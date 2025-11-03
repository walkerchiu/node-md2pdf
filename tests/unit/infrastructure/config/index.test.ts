/**
 * Tests for Infrastructure Config Module Exports
 */

import * as ConfigModule from '../../../../src/infrastructure/config';

describe('Infrastructure Config Module', () => {
  it('should export ConfigManager class', () => {
    expect(ConfigModule.ConfigManager).toBeDefined();
    expect(typeof ConfigModule.ConfigManager).toBe('function');
  });

  it('should export ConfigAccessor class', () => {
    expect(ConfigModule.ConfigAccessor).toBeDefined();
    expect(typeof ConfigModule.ConfigAccessor).toBe('function');
  });

  it('should export default configuration', () => {
    expect(ConfigModule.defaultConfig).toBeDefined();
    expect(typeof ConfigModule.defaultConfig).toBe('object');
  });

  it('should export configuration constants', () => {
    expect(ConfigModule.DEFAULT_MARGINS).toBeDefined();
    expect(ConfigModule.DEFAULT_CSS_TEMPLATE).toBeDefined();
    expect(ConfigModule.DEFAULT_PDF_OPTIONS).toBeDefined();
  });

  it('should export environment mappings', () => {
    expect(ConfigModule.environmentMappings).toBeDefined();
    expect(typeof ConfigModule.environmentMappings).toBe('object');
  });

  it('should export config keys constants', () => {
    expect(ConfigModule.CONFIG_KEYS).toBeDefined();
    expect(typeof ConfigModule.CONFIG_KEYS).toBe('object');
  });

  it('should have all expected exports available', () => {
    const expectedExports = [
      'ConfigManager',
      'ConfigAccessor',
      'defaultConfig',
      'DEFAULT_MARGINS',
      'DEFAULT_CSS_TEMPLATE',
      'DEFAULT_PDF_OPTIONS',
      'environmentMappings',
      'CONFIG_KEYS',
    ];

    expectedExports.forEach((exportName) => {
      expect(ConfigModule).toHaveProperty(exportName);
    });
  });

  it('should maintain module structure integrity', () => {
    expect(typeof ConfigModule).toBe('object');
    expect(Object.keys(ConfigModule).length).toBeGreaterThan(0);
  });
});
