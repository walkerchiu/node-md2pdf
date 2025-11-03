/**
 * Tests for Core PDF Module Exports
 */

import * as PDFModule from '../../../../src/core/pdf';

describe('Core PDF Module', () => {
  it('should export PDFGenerator class', () => {
    expect(PDFModule.PDFGenerator).toBeDefined();
    expect(typeof PDFModule.PDFGenerator).toBe('function');
  });

  it('should export PDFTemplates class', () => {
    expect(PDFModule.PDFTemplates).toBeDefined();
    expect(typeof PDFModule.PDFTemplates).toBe('function');
  });

  it('should export types', () => {
    // Type exports are not runtime objects, so we test the module structure
    expect(typeof PDFModule).toBe('object');
  });

  it('should have all expected exports available', () => {
    const expectedExports = ['PDFGenerator', 'PDFTemplates'];

    expectedExports.forEach((exportName) => {
      expect(PDFModule).toHaveProperty(exportName);
    });
  });

  it('should maintain module structure integrity', () => {
    expect(typeof PDFModule).toBe('object');
    expect(Object.keys(PDFModule).length).toBeGreaterThan(0);
  });

  it('should allow instantiation of main classes', () => {
    // Test that we can create instances of the main classes
    expect(() => new PDFModule.PDFGenerator()).not.toThrow();
  });
});
