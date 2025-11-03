/**
 * src/infrastructure/i18n index tests
 */

import * as moduleExports from '../../../../src/infrastructure/i18n/index';

describe('src/infrastructure/i18n index', () => {
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
