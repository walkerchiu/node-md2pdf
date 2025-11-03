/**
 * Tests for Core Batch Module Exports
 */

import * as BatchModule from '../../../../src/core/batch';
import { BatchProcessor } from '../../../../src/core/batch/batch-processor';
import { FileCollector } from '../../../../src/core/batch/file-collector';
import { OutputManager } from '../../../../src/core/batch/output-manager';
import { ProgressTracker } from '../../../../src/core/batch/progress-tracker';
import { ErrorRecoveryManager } from '../../../../src/core/batch/error-recovery';
import { PerformanceMonitor } from '../../../../src/core/batch/performance-monitor';

describe('Core Batch Module Exports', () => {
  it('should export BatchProcessor class', () => {
    expect(BatchModule.BatchProcessor).toBe(BatchProcessor);
    expect(typeof BatchModule.BatchProcessor).toBe('function');
  });

  it('should export FileCollector class', () => {
    expect(BatchModule.FileCollector).toBe(FileCollector);
    expect(typeof BatchModule.FileCollector).toBe('function');
  });

  it('should export OutputManager class', () => {
    expect(BatchModule.OutputManager).toBe(OutputManager);
    expect(typeof BatchModule.OutputManager).toBe('function');
  });

  it('should export ProgressTracker class', () => {
    expect(BatchModule.ProgressTracker).toBe(ProgressTracker);
    expect(typeof BatchModule.ProgressTracker).toBe('function');
  });

  it('should export ErrorRecoveryManager class', () => {
    expect(BatchModule.ErrorRecoveryManager).toBe(ErrorRecoveryManager);
    expect(typeof BatchModule.ErrorRecoveryManager).toBe('function');
  });

  it('should export PerformanceMonitor class', () => {
    expect(BatchModule.PerformanceMonitor).toBe(PerformanceMonitor);
    expect(typeof BatchModule.PerformanceMonitor).toBe('function');
  });

  it('should have all exports as constructors', () => {
    expect(() => new BatchModule.FileCollector()).not.toThrow();
    expect(() => new BatchModule.OutputManager()).not.toThrow();
    expect(() => new BatchModule.ProgressTracker(5)).not.toThrow(); // Requires totalFiles parameter
    expect(() => new BatchModule.ErrorRecoveryManager()).not.toThrow();
    expect(() => new BatchModule.PerformanceMonitor()).not.toThrow();
  });
});
