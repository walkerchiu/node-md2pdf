/**
 * src/core/domain/events index tests
 */

import * as moduleExports from '../../../../../src/core/domain/events/index';

describe('src/core/domain/events index', () => {
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
