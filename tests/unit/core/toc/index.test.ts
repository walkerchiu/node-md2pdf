/**
 * Tests for Core TOC Module Exports
 */

import * as TOCModule from '../../../../src/core/toc';
import { TOCGenerator } from '../../../../src/core/toc/toc-generator';

describe('Core TOC Module Exports', () => {
  it('should export TOCGenerator class', () => {
    expect(TOCModule.TOCGenerator).toBe(TOCGenerator);
    expect(typeof TOCModule.TOCGenerator).toBe('function');
  });

  it('should export types from types module', () => {
    // Test that type exports are available (these are compile-time checks)
    // We can't directly test type exports at runtime, but we can ensure the module loads
    expect(TOCModule).toBeDefined();
    expect(typeof TOCModule).toBe('object');
  });

  it('should have TOCGenerator as a constructor', () => {
    const mockOptions = {
      maxDepth: 3,
      includePageNumbers: true,
      title: 'Contents',
      style: 'detailed' as const,
    };
    const tocGenerator = new TOCModule.TOCGenerator(mockOptions);
    expect(tocGenerator).toBeInstanceOf(TOCGenerator);
  });

  it('should have all expected exports', () => {
    expect(TOCModule.TOCGenerator).toBeDefined();
    expect(typeof TOCModule.TOCGenerator).toBe('function');
  });
});
