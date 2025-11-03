/**
 * Tests for Core Analysis Module Exports
 */

import * as AnalysisModule from '../../../../src/core/analysis';
import { ContentAnalyzer } from '../../../../src/core/analysis/content-analyzer';

describe('Core Analysis Module Exports', () => {
  it('should export ContentAnalyzer class', () => {
    expect(AnalysisModule.ContentAnalyzer).toBe(ContentAnalyzer);
    expect(typeof AnalysisModule.ContentAnalyzer).toBe('function');
  });

  it('should export types from types module', () => {
    // Test that type exports are available (these are compile-time checks)
    // We can't directly test type exports at runtime, but we can ensure the module loads
    expect(AnalysisModule).toBeDefined();
    expect(typeof AnalysisModule).toBe('object');
  });

  it('should have ContentAnalyzer as a constructor', () => {
    const analyzer = new AnalysisModule.ContentAnalyzer();
    expect(analyzer).toBeInstanceOf(ContentAnalyzer);
  });
});
