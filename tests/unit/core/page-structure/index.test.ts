/**
 * src/core/page-structure index tests
 */

import * as moduleExports from '../../../../src/core/page-structure/index';

describe('src/core/page-structure index', () => {
  it('should export expected modules', () => {
    expect(moduleExports).toBeDefined();
    expect(typeof moduleExports).toBe('object');
  });

  it('should not have undefined exports', () => {
    const exportValues = Object.values(moduleExports);

    exportValues.forEach((exportValue) => {
      expect(exportValue).toBeDefined();
    });
  });
});
