/**
 * Tests for utils validation module index
 */

describe('Utils Validation Module Index', () => {
  it('should export environment validation functions', async () => {
    const validationModule = await import(
      '../../../../src/utils/validation/index'
    );

    // Should export environment related modules
    expect(validationModule).toBeDefined();
    expect(typeof validationModule).toBe('object');

    // Verify that the module has exports from environment
    const keys = Object.keys(validationModule);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('should re-export environment functionality', async () => {
    // Import both modules to verify they match
    const validationIndex = await import(
      '../../../../src/utils/validation/index'
    );
    const environmentModule = await import(
      '../../../../src/utils/validation/environment'
    );

    // The validation index should re-export the same things as environment
    const indexKeys = Object.keys(validationIndex);
    const environmentKeys = Object.keys(environmentModule);

    // Should have the same number of exports
    expect(indexKeys.length).toBe(environmentKeys.length);

    // Each key from environment should exist in index
    environmentKeys.forEach((key) => {
      expect(indexKeys).toContain(key);
    });
  });
});
