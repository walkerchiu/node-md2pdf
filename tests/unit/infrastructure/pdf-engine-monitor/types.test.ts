/**
 * types types tests
 */

import * as types from '../../../../src/infrastructure/pdf-engine-monitor/types';

describe('types types', () => {
  it('should export expected type definitions', () => {
    expect(types).toBeDefined();
    expect(typeof types).toBe('object');
  });

  it('should not have undefined exports', () => {
    const exportValues = Object.values(types);
    exportValues.forEach((exportValue) => {
      expect(exportValue).toBeDefined();
    });
  });
});
