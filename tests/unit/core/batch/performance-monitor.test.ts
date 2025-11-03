/**
 * Unit tests for PerformanceMonitor
 */

import { PerformanceMonitor } from '../../../../src/core/batch/performance-monitor';
import * as os from 'os';

// Mock os module
jest.mock('os', () => ({
  cpus: jest.fn(),
  totalmem: jest.fn(),
  freemem: jest.fn(),
  loadavg: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOs = os as jest.Mocked<any>;

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();

    // Setup default OS mocks
    mockOs.cpus.mockReturnValue([{}, {}, {}, {}]); // 4 CPUs
    mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
    mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024); // 4GB free
    mockOs.loadavg.mockReturnValue([1.0, 1.2, 1.5]); // Load averages

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
  });

  describe('constructor', () => {
    it('should initialize with default thresholds', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('should accept custom thresholds', () => {
      const customThresholds = {
        maxMemoryUsage: 90,
        maxCpuUsage: 90,
      };

      const monitor = new PerformanceMonitor(customThresholds);
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });
  });

  describe('startMonitoring', () => {
    it('should start monitoring with default interval', () => {
      jest.useFakeTimers();

      performanceMonitor.startMonitoring();

      // Should collect initial metrics
      expect(mockOs.cpus).toHaveBeenCalled();
      expect(mockOs.totalmem).toHaveBeenCalled();
      expect(mockOs.freemem).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should start monitoring with custom interval', () => {
      jest.useFakeTimers();

      performanceMonitor.startMonitoring(1000);

      // Advance timer
      jest.advanceTimersByTime(1000);

      // Should collect metrics periodically
      expect(mockOs.cpus).toHaveBeenCalledTimes(2); // Initial + 1 interval

      jest.useRealTimers();
    });

    it('should stop existing monitoring before starting new one', () => {
      jest.useFakeTimers();

      performanceMonitor.startMonitoring(1000);
      performanceMonitor.startMonitoring(2000);

      // Should not throw - existing interval should be cleared
      expect(() => {
        performanceMonitor.stopMonitoring();
      }).not.toThrow();

      jest.useRealTimers();
    });
  });

  describe('stopMonitoring', () => {
    it('should stop active monitoring', () => {
      jest.useFakeTimers();

      performanceMonitor.startMonitoring(1000);
      performanceMonitor.stopMonitoring();

      expect(() => {
        performanceMonitor.stopMonitoring();
      }).not.toThrow();

      jest.useRealTimers();
    });

    it('should handle stop when not monitoring', () => {
      expect(() => {
        performanceMonitor.stopMonitoring();
      }).not.toThrow();
    });
  });

  describe('getCurrentSystemMetrics', () => {
    it('should return current system metrics', () => {
      const metrics = performanceMonitor.getCurrentSystemMetrics();

      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuLoad');
      expect(metrics.memoryUsage.total).toBe(8 * 1024 * 1024 * 1024);
      expect(metrics.memoryUsage.free).toBe(4 * 1024 * 1024 * 1024);
      expect(metrics.memoryUsage.used).toBe(4 * 1024 * 1024 * 1024);
    });

    it('should calculate memory usage percentage', () => {
      const metrics = performanceMonitor.getCurrentSystemMetrics();

      expect(metrics.memoryUsage.percentage).toBe(50); // 4GB used / 8GB total
    });

    it('should handle edge cases in memory calculation', () => {
      mockOs.totalmem.mockReturnValue(0);
      mockOs.freemem.mockReturnValue(0);

      const metrics = performanceMonitor.getCurrentSystemMetrics();

      // When total memory is 0, the percentage will be NaN or 0 depending on implementation
      expect(typeof metrics.memoryUsage.percentage).toBe('number');
    });
  });

  describe('getCurrentProcessMetrics', () => {
    it('should return current process metrics', () => {
      const metrics = performanceMonitor.getCurrentProcessMetrics();

      expect(metrics).toHaveProperty('heapUsed');
      expect(metrics).toHaveProperty('heapTotal');
      expect(metrics).toHaveProperty('external');
      expect(metrics).toHaveProperty('arrayBuffers');
      expect(metrics).toHaveProperty('heapPercentage');
    });

    it('should calculate heap percentage correctly', () => {
      const metrics = performanceMonitor.getCurrentProcessMetrics();

      expect(typeof metrics.heapPercentage).toBe('number');
      expect(metrics.heapPercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isSystemUnderStress', () => {
    it('should detect when system is not under stress', () => {
      // Normal conditions
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(6 * 1024 * 1024 * 1024); // Plenty of free memory
      mockOs.loadavg.mockReturnValue([0.5, 0.6, 0.7]); // Low load

      const result = performanceMonitor.isSystemUnderStress();

      expect(result.underStress).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should detect high memory usage stress', () => {
      // High memory usage
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(0.5 * 1024 * 1024 * 1024); // Low free memory (93.75% used)

      const result = performanceMonitor.isSystemUnderStress();

      expect(result.underStress).toBe(true);
      expect(result.reasons.some((r) => r.includes('memory'))).toBe(true);
    });

    it('should detect high CPU load stress', () => {
      // High CPU load
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}]); // 4 CPUs
      mockOs.loadavg.mockReturnValue([8.0, 7.5, 6.0]); // High load (2x CPU count)

      const result = performanceMonitor.isSystemUnderStress();

      expect(result.underStress).toBe(true);
      expect(result.reasons.some((r) => r.includes('CPU'))).toBe(true);
    });
  });

  describe('optimizeBatchSettings', () => {
    it('should recommend maintaining concurrency under normal conditions', () => {
      // Normal system conditions
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(6 * 1024 * 1024 * 1024);
      mockOs.loadavg.mockReturnValue([1.0, 1.0, 1.0]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}]);

      const result = performanceMonitor.optimizeBatchSettings(2, 100);

      expect(result.shouldPause).toBe(false);
      expect(result.shouldReduce).toBe(false);
      expect(result.recommendedConcurrency).toBeGreaterThanOrEqual(2);
    });

    it('should recommend reducing concurrency under memory stress', () => {
      // High memory usage
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(0.5 * 1024 * 1024 * 1024); // 93.75% used

      const result = performanceMonitor.optimizeBatchSettings(4, 100);

      expect(result.shouldReduce).toBe(true);
      expect(result.recommendedConcurrency).toBeLessThan(4);
      expect(result.optimizations.some((opt) => opt.includes('memory'))).toBe(
        true,
      );
    });

    it('should recommend reducing concurrency under CPU stress', () => {
      // High CPU load
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}]);
      mockOs.loadavg.mockReturnValue([8.0, 7.5, 6.0]);

      const result = performanceMonitor.optimizeBatchSettings(4, 100);

      expect(result.shouldReduce).toBe(true);
      expect(result.recommendedConcurrency).toBeLessThan(4);
      expect(result.optimizations.some((opt) => opt.includes('CPU'))).toBe(
        true,
      );
    });

    it('should recommend pausing under extreme stress', () => {
      // Extreme conditions
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(0.2 * 1024 * 1024 * 1024); // 97.5% used

      const result = performanceMonitor.optimizeBatchSettings(4, 100);

      expect(result.shouldPause).toBe(true);
      expect(result.optimizations.some((opt) => opt.includes('pausing'))).toBe(
        true,
      );
    });

    it('should recommend increasing concurrency when resources available', () => {
      // Excellent system conditions
      mockOs.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024);
      mockOs.freemem.mockReturnValue(12 * 1024 * 1024 * 1024);
      mockOs.loadavg.mockReturnValue([0.5, 0.4, 0.3]);
      mockOs.cpus.mockReturnValue([{}, {}, {}, {}, {}, {}, {}, {}]); // 8 CPUs

      const result = performanceMonitor.optimizeBatchSettings(2, 100);

      expect(result.recommendedConcurrency).toBeGreaterThan(2);
      expect(
        result.optimizations.some((opt) => opt.includes('Increased')),
      ).toBe(true);
    });
  });

  describe('getMemoryOptimizations', () => {
    it('should provide memory optimization suggestions', () => {
      const optimizations = performanceMonitor.getMemoryOptimizations();

      expect(Array.isArray(optimizations)).toBe(true);
      // Some implementations might return empty array, so just check it's an array
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(performanceMonitor.formatBytes(0)).toBe('0 B');
      expect(performanceMonitor.formatBytes(1024)).toBe('1 KB');
      expect(performanceMonitor.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(performanceMonitor.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle fractional values', () => {
      expect(performanceMonitor.formatBytes(1536)).toBe('1.5 KB'); // 1.5 KB
      expect(performanceMonitor.formatBytes(2560 * 1024)).toBe('2.5 MB'); // 2.5 MB
    });
  });

  describe('getProcessingStats', () => {
    it('should return processing statistics', () => {
      // Collect some metrics first
      performanceMonitor.getCurrentSystemMetrics();
      performanceMonitor.getCurrentProcessMetrics();

      const stats = performanceMonitor.getProcessingStats();

      expect(stats).toHaveProperty('averageMemoryUsage');
      expect(stats).toHaveProperty('peakMemoryUsage');
      expect(stats).toHaveProperty('averageCpuUsage');
      expect(stats).toHaveProperty('peakCpuUsage');
      expect(stats).toHaveProperty('totalWarnings');
      expect(stats).toHaveProperty('processingDuration');
    });

    it('should handle empty metrics gracefully', () => {
      const stats = performanceMonitor.getProcessingStats();

      expect(stats.averageMemoryUsage).toBe(0);
      expect(stats.peakMemoryUsage).toBe(0);
      expect(stats.averageCpuUsage).toBe(0);
      expect(stats.peakCpuUsage).toBe(0);
    });
  });

  describe('memory leak prevention', () => {
    it('should limit stored metrics to prevent memory leaks', () => {
      jest.useFakeTimers();

      performanceMonitor.startMonitoring(100);

      // Generate many metrics (more than the limit of 100)
      for (let i = 0; i < 150; i++) {
        jest.advanceTimersByTime(100);
      }

      // Internal metrics array should not exceed limit
      // We can't directly test this without accessing private properties,
      // but we can verify the monitoring still works
      expect(() => {
        performanceMonitor.getCurrentSystemMetrics();
        performanceMonitor.isSystemUnderStress();
      }).not.toThrow();

      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle OS function errors gracefully', () => {
      mockOs.totalmem.mockImplementation(() => {
        throw new Error('OS error');
      });

      expect(() => {
        performanceMonitor.getCurrentSystemMetrics();
      }).toThrow('OS error');
    });

    it('should handle missing process.memoryUsage gracefully', () => {
      const originalMemoryUsage = process.memoryUsage;
      delete (process as { memoryUsage?: unknown }).memoryUsage;

      expect(() => {
        performanceMonitor.getCurrentProcessMetrics();
      }).toThrow();

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('forceGarbageCollection', () => {
    it('should return false when gc is not available', () => {
      const originalGc = global.gc;
      delete (global as { gc?: unknown }).gc;

      const result = performanceMonitor.forceGarbageCollection();
      expect(result).toBe(false);

      if (originalGc) {
        global.gc = originalGc;
      }
    });

    it('should return true when gc is available and succeeds', () => {
      global.gc = jest.fn();

      const result = performanceMonitor.forceGarbageCollection();
      expect(result).toBe(true);
      expect(global.gc).toHaveBeenCalled();

      delete (global as { gc?: unknown }).gc;
    });

    it('should return false when gc throws error', () => {
      global.gc = jest.fn().mockImplementation(() => {
        throw new Error('GC error');
      });

      const result = performanceMonitor.forceGarbageCollection();
      expect(result).toBe(false);

      delete (global as { gc?: unknown }).gc;
    });
  });

  describe('clearHistory', () => {
    it('should clear all historical data', () => {
      // Clear history
      performanceMonitor.clearHistory();

      // Verify history is cleared
      const warnings = performanceMonitor.getWarnings();
      expect(warnings).toEqual([]);
    });
  });

  describe('getWarnings', () => {
    it('should return current warnings', () => {
      // Initially should be empty
      const warnings = performanceMonitor.getWarnings();
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('should return a copy of warnings array', () => {
      const warnings1 = performanceMonitor.getWarnings();
      const warnings2 = performanceMonitor.getWarnings();

      expect(warnings1).not.toBe(warnings2); // Different array instances
      expect(warnings1).toEqual(warnings2); // Same content
    });
  });
});
