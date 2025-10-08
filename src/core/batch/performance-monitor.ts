/**
 * Performance monitoring and memory optimization for batch processing
 */

import * as os from 'os';

export interface SystemMetrics {
  memoryUsage: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cpuLoad: {
    average: number;
    cores: number;
    percentage: number;
  };
  diskSpace?: {
    free: number;
    total: number;
    percentage: number;
  };
}

export interface ProcessMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  heapPercentage: number;
}

export interface PerformanceThresholds {
  maxMemoryUsage: number; // Percentage
  maxCpuUsage: number; // Percentage
  minFreeMemory: number; // MB
  maxHeapUsage: number; // Percentage
}

export class PerformanceMonitor {
  private readonly defaultThresholds: PerformanceThresholds = {
    maxMemoryUsage: 85,
    maxCpuUsage: 90,
    minFreeMemory: 512, // 512 MB
    maxHeapUsage: 80,
  };
  private intervalId: NodeJS.Timeout | null = null;
  private metrics: SystemMetrics[] = [];
  private processMetrics: ProcessMetrics[] = [];
  private warnings: string[] = [];
  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...this.defaultThresholds, ...thresholds };
  }
  private thresholds: PerformanceThresholds;

  /**
   * Start monitoring system performance
   */
  startMonitoring(intervalMs: number = 5000): void {
    this.stopMonitoring(); // Ensure no duplicate monitoring
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Unref the timer so it doesn't prevent Node.js from exiting
    this.intervalId.unref();

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get current system metrics
   */
  getCurrentSystemMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    return {
      memoryUsage: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      cpuLoad: {
        average: loadAvg[0],
        cores: cpuCount,
        percentage: Math.round((loadAvg[0] / cpuCount) * 100),
      },
    };
  }

  /**
   * Get current process metrics
   */
  getCurrentProcessMetrics(): ProcessMetrics {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      heapPercentage: Math.round((memUsage.heapUsed / totalMem) * 100),
    };
  }

  /**
   * Check if system is under stress
   */
  isSystemUnderStress(): {
    underStress: boolean;
    reasons: string[];
    metrics: SystemMetrics;
    processMetrics: ProcessMetrics;
  } {
    const systemMetrics = this.getCurrentSystemMetrics();
    const processMetrics = this.getCurrentProcessMetrics();
    const reasons: string[] = [];

    // Check memory usage
    if (systemMetrics.memoryUsage.percentage > this.thresholds.maxMemoryUsage) {
      reasons.push(
        `High system memory usage: ${systemMetrics.memoryUsage.percentage}%`,
      );
    }
    if (
      systemMetrics.memoryUsage.free <
      this.thresholds.minFreeMemory * 1024 * 1024
    ) {
      const freeMB = Math.round(systemMetrics.memoryUsage.free / (1024 * 1024));
      reasons.push(`Low free memory: ${freeMB}MB`);
    }

    // Check CPU usage
    if (systemMetrics.cpuLoad.percentage > this.thresholds.maxCpuUsage) {
      reasons.push(`High CPU usage: ${systemMetrics.cpuLoad.percentage}%`);
    }

    // Check heap usage
    if (processMetrics.heapPercentage > this.thresholds.maxHeapUsage) {
      reasons.push(`High heap usage: ${processMetrics.heapPercentage}%`);
    }

    return {
      underStress: reasons.length > 0,
      reasons,
      metrics: systemMetrics,
      processMetrics,
    };
  }

  /**
   * Optimize batch processing based on current system state
   */
  optimizeBatchSettings(
    currentConcurrency: number,
    totalFiles: number,
  ): {
    recommendedConcurrency: number;
    shouldPause: boolean;
    shouldReduce: boolean;
    optimizations: string[];
  } {
    const stressCheck = this.isSystemUnderStress();
    const optimizations: string[] = [];
    let recommendedConcurrency = currentConcurrency;
    let shouldPause = false;
    let shouldReduce = false;

    if (stressCheck.underStress) {
      // Reduce concurrency if under stress
      if (stressCheck.reasons.some((r) => r.includes('memory'))) {
        recommendedConcurrency = Math.max(
          1,
          Math.floor(currentConcurrency / 2),
        );
        shouldReduce = true;
        optimizations.push('Reduced concurrency due to high memory usage');
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          optimizations.push('Triggered garbage collection');
        }
      }
      if (stressCheck.reasons.some((r) => r.includes('CPU'))) {
        recommendedConcurrency = Math.max(1, currentConcurrency - 1);
        shouldReduce = true;
        optimizations.push('Reduced concurrency due to high CPU usage');
      }

      // Recommend pause for extreme conditions
      if (
        stressCheck.metrics.memoryUsage.percentage > 95 ||
        stressCheck.processMetrics.heapPercentage > 95
      ) {
        shouldPause = true;
        optimizations.push(
          'Recommend pausing processing due to critical resource usage',
        );
      }
    } else {
      // System is healthy, potentially increase concurrency
      const maxRecommended = Math.min(os.cpus().length, 4); // Cap at 4 for stability
      if (
        currentConcurrency < maxRecommended &&
        totalFiles > currentConcurrency * 2
      ) {
        recommendedConcurrency = Math.min(
          maxRecommended,
          currentConcurrency + 1,
        );
        optimizations.push('Increased concurrency due to available resources');
      }
    }

    return {
      recommendedConcurrency,
      shouldPause,
      shouldReduce,
      optimizations,
    };
  }

  /**
   * Get memory optimization suggestions
   */
  getMemoryOptimizations(): string[] {
    const processMetrics = this.getCurrentProcessMetrics();
    const systemMetrics = this.getCurrentSystemMetrics();
    const suggestions: string[] = [];
    const heapUsageMB = Math.round(processMetrics.heapUsed / (1024 * 1024));
    const externalMB = Math.round(processMetrics.external / (1024 * 1024));

    if (processMetrics.heapPercentage > 60) {
      suggestions.push(`High heap usage detected: ${heapUsageMB}MB`);
      suggestions.push('Consider processing fewer files concurrently');
      if (global.gc) {
        suggestions.push(
          'Garbage collection available - will trigger automatically',
        );
      }
    }
    if (externalMB > 500) {
      suggestions.push(`High external memory usage: ${externalMB}MB`);
      suggestions.push(
        'Large files detected - consider processing sequentially',
      );
    }
    if (systemMetrics.memoryUsage.percentage > 80) {
      const freeMB = Math.round(systemMetrics.memoryUsage.free / (1024 * 1024));
      suggestions.push(`System memory usage high, only ${freeMB}MB free`);
      suggestions.push(
        'Reduce concurrent processes or close other applications',
      );
    }
    return suggestions;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    averageCpuUsage: number;
    peakCpuUsage: number;
    totalWarnings: number;
    processingDuration: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        averageCpuUsage: 0,
        peakCpuUsage: 0,
        totalWarnings: this.warnings.length,
        processingDuration: 0,
      };
    }

    const memoryUsages = this.metrics.map((m) => m.memoryUsage.percentage);
    const cpuUsages = this.metrics.map((m) => m.cpuLoad.percentage);

    return {
      averageMemoryUsage: Math.round(
        memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      ),
      peakMemoryUsage: Math.max(...memoryUsages),
      averageCpuUsage: Math.round(
        cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
      ),
      peakCpuUsage: Math.max(...cpuUsages),
      totalWarnings: this.warnings.length,
      processingDuration: this.metrics.length * 5, // Assuming 5 second intervals
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (global.gc && typeof global.gc === 'function') {
      try {
        global.gc();
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  /**
   * Clear historical data
   */
  clearHistory(): void {
    this.metrics = [];
    this.processMetrics = [];
    this.warnings = [];
  }

  /**
   * Get current warnings
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    const systemMetrics = this.getCurrentSystemMetrics();
    const processMetrics = this.getCurrentProcessMetrics();
    this.metrics.push(systemMetrics);
    this.processMetrics.push(processMetrics);
    // Keep only last 100 measurements to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
      this.processMetrics = this.processMetrics.slice(-100);
    }
    // Check for warnings
    this.checkForWarnings(systemMetrics, processMetrics);
  }

  /**
   * Check for performance warnings
   */
  private checkForWarnings(
    systemMetrics: SystemMetrics,
    processMetrics: ProcessMetrics,
  ): void {
    const timestamp = new Date().toISOString();
    if (systemMetrics.memoryUsage.percentage > this.thresholds.maxMemoryUsage) {
      this.warnings.push(
        `${timestamp}: High system memory usage: ${systemMetrics.memoryUsage.percentage}%`,
      );
    }
    if (systemMetrics.cpuLoad.percentage > this.thresholds.maxCpuUsage) {
      this.warnings.push(
        `${timestamp}: High CPU usage: ${systemMetrics.cpuLoad.percentage}%`,
      );
    }
    if (processMetrics.heapPercentage > this.thresholds.maxHeapUsage) {
      this.warnings.push(
        `${timestamp}: High heap usage: ${processMetrics.heapPercentage}%`,
      );
    }

    // Keep only last 50 warnings
    if (this.warnings.length > 50) {
      this.warnings = this.warnings.slice(-50);
    }
  }
}
