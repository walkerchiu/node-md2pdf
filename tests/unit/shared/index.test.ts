/**
 * Tests for shared module index
 */

describe('Shared Module Index', () => {
  it('should export container modules', async () => {
    const shared = await import('../../../src/shared/index');

    // Should export container related modules
    expect(shared).toBeDefined();
    expect(typeof shared).toBe('object');

    // Verify that the module has exports from container
    const keys = Object.keys(shared);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('should re-export container functionality', async () => {
    // Import both modules to verify they match
    const sharedModule = await import('../../../src/shared/index');
    const containerModule = await import('../../../src/shared/container');

    // The shared module should re-export the same things as container
    const sharedKeys = Object.keys(sharedModule);
    const containerKeys = Object.keys(containerModule);

    // Should have the same number of exports
    expect(sharedKeys.length).toBe(containerKeys.length);

    // Each key from container should exist in shared
    containerKeys.forEach((key) => {
      expect(sharedKeys).toContain(key);
    });
  });
});
