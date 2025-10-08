/**
 * PDF Engine Monitoring Service
 * Provides comprehensive monitoring, alerting, and metrics collection for PDF engines
 */

import {
  IEngineMonitoringService,
  PDFEngineMonitorConfig,
  PDFEngineMetricsSnapshot,
  PDFEngineAlert,
} from './types';

import type { PDFEngineManager } from '../../core/pdf/engines/engine-manager';
import type { ILogger } from '../../infrastructure/logging/types';

export class PDFEngineMonitoringService implements IEngineMonitoringService {
  private isRunning = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  private metricsHistory = new Map<string, PDFEngineMetricsSnapshot[]>();
  private alerts = new Map<string, PDFEngineAlert>();
  private alertCounter = 0;

  constructor(
    private readonly config: PDFEngineMonitorConfig,
    private readonly engineManager: PDFEngineManager,
    private readonly logger: ILogger,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('PDF Engine monitoring is disabled');
      return;
    }

    this.logger.info('Starting PDF Engine monitoring service');

    // Start health check monitoring
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckInterval,
    );
    // Unref the timer so it doesn't prevent Node.js from exiting
    this.healthCheckInterval.unref();

    // Start performance metrics collection
    this.metricsInterval = setInterval(
      () => this.collectPerformanceMetrics(),
      this.config.performanceMetricsInterval,
    );
    // Unref the timer so it doesn't prevent Node.js from exiting
    this.metricsInterval.unref();

    // Perform initial checks
    await this.performHealthChecks();
    await this.collectPerformanceMetrics();

    this.isRunning = true;
    this.logger.info('PDF Engine monitoring service started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping PDF Engine monitoring service');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.isRunning = false;
    this.logger.info('PDF Engine monitoring service stopped');
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const engineStatuses = this.engineManager.getEngineStatus();
      // const currentTime = new Date();

      for (const [engineName, healthStatus] of engineStatuses) {
        // Check for health issues
        if (!healthStatus.isHealthy) {
          await this.createAlert({
            engineName,
            type: 'health',
            severity: 'high',
            message: `Engine ${engineName} is unhealthy: ${healthStatus.errors.join(', ')}`,
            metadata: {
              errors: healthStatus.errors,
              lastCheck: healthStatus.lastCheck,
            },
          });
        }

        // Check performance thresholds
        if (healthStatus.performance) {
          const { successRate, averageGenerationTime, memoryUsage } =
            healthStatus.performance;

          // Check failure rate
          const failureRate = (1 - successRate) * 100;
          if (failureRate > this.config.alertThresholds.failureRate) {
            await this.createAlert({
              engineName,
              type: 'performance',
              severity: failureRate > 50 ? 'critical' : 'high',
              message: `High failure rate for ${engineName}: ${failureRate.toFixed(1)}%`,
              metadata: {
                failureRate,
                threshold: this.config.alertThresholds.failureRate,
              },
            });
          }

          // Check response time
          if (
            averageGenerationTime >
            this.config.alertThresholds.averageResponseTime
          ) {
            await this.createAlert({
              engineName,
              type: 'performance',
              severity: 'medium',
              message: `Slow response time for ${engineName}: ${averageGenerationTime}ms`,
              metadata: {
                averageResponseTime: averageGenerationTime,
                threshold: this.config.alertThresholds.averageResponseTime,
              },
            });
          }

          // Check memory usage
          if (memoryUsage > this.config.alertThresholds.memoryUsage) {
            await this.createAlert({
              engineName,
              type: 'resource',
              severity: 'medium',
              message: `High memory usage for ${engineName}: ${(memoryUsage / 1024 / 1024).toFixed(1)}MB`,
              metadata: {
                memoryUsage,
                threshold: this.config.alertThresholds.memoryUsage,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error during health checks', error);
    }
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const engineStatuses = this.engineManager.getEngineStatus();
      const engineMetrics = this.engineManager.getEngineMetrics();
      const currentTime = new Date();

      for (const [engineName, healthStatus] of engineStatuses) {
        const metrics = engineMetrics.get(engineName);
        const resourceUsage = await this.getEngineResourceUsage(engineName);

        const snapshot: PDFEngineMetricsSnapshot = {
          engineName,
          timestamp: currentTime,
          isHealthy: healthStatus.isHealthy,
          resourceUsage: {
            memoryUsage: healthStatus.performance?.memoryUsage || 0,
            activeTasks: resourceUsage?.activeTasks || 0,
          },
          performance: {
            totalRequests: metrics?.totalTasks || 0,
            successfulRequests: metrics?.successfulTasks || 0,
            failedRequests: metrics?.failedTasks || 0,
            averageResponseTime: metrics?.averageTime || 0,
          },
          errors: healthStatus.errors,
        };

        // Store snapshot
        this.storeMetricsSnapshot(engineName, snapshot);
      }

      // Clean old metrics
      this.cleanOldMetrics();
    } catch (error) {
      this.logger.error('Error collecting performance metrics', error);
    }
  }

  private async getEngineResourceUsage(_engineName: string) {
    try {
      // const engines = this.engineManager.getAvailableEngines();
      // This would need to be implemented to get actual resource usage
      // For now, return placeholder data
      return {
        activeTasks: 0,
        memoryUsage: 0,
      };
    } catch {
      return null;
    }
  }

  private storeMetricsSnapshot(
    engineName: string,
    snapshot: PDFEngineMetricsSnapshot,
  ): void {
    if (!this.metricsHistory.has(engineName)) {
      this.metricsHistory.set(engineName, []);
    }

    const history = this.metricsHistory.get(engineName)!;
    history.push(snapshot);

    // Keep only recent metrics based on retention period
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    const filteredHistory = history.filter((s) => s.timestamp > cutoffTime);
    this.metricsHistory.set(engineName, filteredHistory);
  }

  private cleanOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);

    for (const [engineName, history] of this.metricsHistory) {
      const filteredHistory = history.filter((s) => s.timestamp > cutoffTime);
      this.metricsHistory.set(engineName, filteredHistory);
    }

    // Clean old alerts
    for (const [alertId, alert] of this.alerts) {
      if (alert.timestamp < cutoffTime && alert.resolved) {
        this.alerts.delete(alertId);
      }
    }
  }

  private async createAlert(alertData: {
    engineName: string;
    type: PDFEngineAlert['type'];
    severity: PDFEngineAlert['severity'];
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    // Check if similar alert already exists
    const existingAlert = Array.from(this.alerts.values()).find(
      (alert) =>
        alert.engineName === alertData.engineName &&
        alert.type === alertData.type &&
        !alert.resolved &&
        alert.message === alertData.message,
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: PDFEngineAlert = {
      id: `alert_${++this.alertCounter}`,
      engineName: alertData.engineName,
      type: alertData.type,
      severity: alertData.severity,
      message: alertData.message,
      timestamp: new Date(),
      resolved: false,
      metadata: alertData.metadata || {},
    };

    this.alerts.set(alert.id, alert);

    this.logger.warn(`PDF Engine Alert [${alert.severity}]: ${alert.message}`, {
      alertId: alert.id,
      engineName: alert.engineName,
      type: alert.type,
      metadata: alert.metadata,
    });

    // TODO: Implement external alerting (email, Slack, etc.) if enabled
    if (this.config.enableAlerting) {
      await this.sendExternalAlert(alert);
    }
  }

  private async sendExternalAlert(alert: PDFEngineAlert): Promise<void> {
    // Placeholder for external alerting implementation
    this.logger.info(`Would send external alert: ${alert.message}`);
  }

  getMetricsSnapshot(engineName: string): PDFEngineMetricsSnapshot | null {
    const history = this.metricsHistory.get(engineName);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  getAllMetricsSnapshots(): Map<string, PDFEngineMetricsSnapshot> {
    const snapshots = new Map<string, PDFEngineMetricsSnapshot>();

    for (const [engineName, history] of this.metricsHistory) {
      if (history.length > 0) {
        snapshots.set(engineName, history[history.length - 1]);
      }
    }

    return snapshots;
  }

  getRecentAlerts(since?: Date): PDFEngineAlert[] {
    const cutoffTime = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    return Array.from(this.alerts.values())
      .filter((alert) => alert.timestamp > cutoffTime)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.logger.info(`Alert acknowledged: ${alertId}`, {
      engineName: alert.engineName,
      message: alert.message,
    });
  }

  async exportMetrics(format: 'json' | 'csv', period: number): Promise<string> {
    const since = new Date(Date.now() - period);
    const allMetrics: PDFEngineMetricsSnapshot[] = [];

    for (const history of this.metricsHistory.values()) {
      allMetrics.push(
        ...history.filter((snapshot) => snapshot.timestamp > since),
      );
    }

    if (format === 'json') {
      return JSON.stringify(allMetrics, null, 2);
    } else {
      return this.convertMetricsToCSV(allMetrics);
    }
  }

  private convertMetricsToCSV(metrics: PDFEngineMetricsSnapshot[]): string {
    if (metrics.length === 0) {
      return '';
    }

    const headers = [
      'timestamp',
      'engineName',
      'isHealthy',
      'memoryUsage',
      'activeTasks',
      'totalRequests',
      'successfulRequests',
      'failedRequests',
      'averageResponseTime',
      'errorCount',
    ];

    const rows = metrics.map((metric) => [
      metric.timestamp.toISOString(),
      metric.engineName,
      metric.isHealthy,
      metric.resourceUsage.memoryUsage,
      metric.resourceUsage.activeTasks,
      metric.performance.totalRequests,
      metric.performance.successfulRequests,
      metric.performance.failedRequests,
      metric.performance.averageResponseTime,
      metric.errors.length,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  // Utility methods for external monitoring integration

  getEngineHealthSummary(): Record<
    string,
    { healthy: boolean; lastCheck: Date }
  > {
    const summary: Record<string, { healthy: boolean; lastCheck: Date }> = {};
    const engineStatuses = this.engineManager.getEngineStatus();

    for (const [engineName, status] of engineStatuses) {
      summary[engineName] = {
        healthy: status.isHealthy,
        lastCheck: status.lastCheck,
      };
    }

    return summary;
  }

  getActiveAlertCount(): number {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved)
      .length;
  }

  getCriticalAlertCount(): number {
    return Array.from(this.alerts.values()).filter(
      (alert) => !alert.resolved && alert.severity === 'critical',
    ).length;
  }
}
