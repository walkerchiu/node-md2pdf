/**
 * PDF Engine Monitoring Types
 */

export interface PDFEngineMonitorConfig {
  enabled: boolean;
  healthCheckInterval: number; // milliseconds
  performanceMetricsInterval: number; // milliseconds
  alertThresholds: {
    failureRate: number; // percentage (0-100)
    averageResponseTime: number; // milliseconds
    memoryUsage: number; // bytes
    consecutiveFailures: number;
  };
  retentionPeriod: number; // milliseconds
  enableAlerting: boolean;
}

export interface PDFEngineAlert {
  id: string;
  engineName: string;
  type: 'health' | 'performance' | 'resource' | 'failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface PDFEngineMetricsSnapshot {
  engineName: string;
  timestamp: Date;
  isHealthy: boolean;
  resourceUsage: {
    memoryUsage: number;
    activeTasks: number;
    cpuUsage?: number;
  };
  performance: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    responseTimePercentiles?: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  errors: string[];
}

export interface IEngineMonitoringService {
  start(): Promise<void>;
  stop(): Promise<void>;
  getMetricsSnapshot(engineName: string): PDFEngineMetricsSnapshot | null;
  getAllMetricsSnapshots(): Map<string, PDFEngineMetricsSnapshot>;
  getRecentAlerts(since?: Date): PDFEngineAlert[];
  acknowledgeAlert(alertId: string): Promise<void>;
  exportMetrics(format: 'json' | 'csv', period: number): Promise<string>;
}
