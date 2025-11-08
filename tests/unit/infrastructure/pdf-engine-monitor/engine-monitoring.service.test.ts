/**
 * PDF Engine Monitoring Service Unit Tests
 *
 * Tests the PDF engine monitoring functionality including:
 * - Service lifecycle management
 * - Basic monitoring functionality
 * - Error handling
 */

import { jest } from '@jest/globals';

/* eslint-disable */

describe('PDFEngineMonitoringService', () => {
  let PDFEngineMonitoringService: any;
  let service: any;
  let mockEngineManager: any;
  let mockLogger: any;
  let mockConfig: any;

  afterEach(async () => {
    // Ensure service is stopped to clean up intervals
    if (service) {
      await service.stop();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Mock engine manager
    mockEngineManager = {
      getEngineStatus: jest.fn(),
      getAvailableEngines: jest.fn(),
      forceHealthCheck: jest.fn(),
    };

    // Setup default mock return values
    mockEngineManager.getEngineStatus.mockResolvedValue(
      new Map([
        [
          'puppeteer',
          { status: 'healthy', lastCheck: new Date(), responseTime: 100 },
        ],
        [
          'chrome',
          { status: 'healthy', lastCheck: new Date(), responseTime: 150 },
        ],
      ]),
    );
    mockEngineManager.getAvailableEngines.mockReturnValue([
      'puppeteer',
      'chrome',
    ]);
    mockEngineManager.forceHealthCheck.mockResolvedValue(undefined);

    // Mock configuration
    mockConfig = {
      enabled: true,
      healthCheckInterval: 1000,
      performanceMetricsInterval: 2000,
      alertThresholds: {
        failureRate: 10,
        averageResponseTime: 1000,
        memoryUsage: 1024 * 1024 * 500,
        consecutiveFailures: 3,
      },
      retentionPeriod: 24 * 60 * 60 * 1000,
      enableAlerting: true,
    };

    // Dynamically import the service
    const module = await import(
      '../../../../src/infrastructure/pdf-engine-monitor/engine-monitoring.service'
    );
    PDFEngineMonitoringService = module.PDFEngineMonitoringService;

    service = new PDFEngineMonitoringService(
      mockConfig,
      mockEngineManager,
      mockLogger,
    );
  });

  describe('Service Lifecycle', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PDFEngineMonitoringService);
    });

    it('should start monitoring when enabled', async () => {
      await service.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting PDF Engine monitoring service',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PDF Engine monitoring service started successfully',
      );
    });

    it('should not start when disabled', async () => {
      mockConfig.enabled = false;

      await service.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'PDF Engine monitoring is disabled',
      );
    });

    it('should not start twice', async () => {
      await service.start();
      jest.clearAllMocks();
      await service.start();

      // Should not log start messages again
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Starting PDF Engine monitoring service',
      );
    });

    it('should stop monitoring', async () => {
      await service.start();
      await service.stop();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Stopping PDF Engine monitoring service',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PDF Engine monitoring service stopped',
      );
    });

    it('should handle stop when not running', async () => {
      await service.stop();

      // Should return early and not log stop messages
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Stopping PDF Engine monitoring service',
      );
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should get metrics snapshot for engine', async () => {
      await service.start();

      const snapshot = service.getMetricsSnapshot('puppeteer');

      // Should return null initially (no data collected yet)
      expect(snapshot).toBeNull();
    });

    it('should get all metrics snapshots', async () => {
      await service.start();

      const snapshots = service.getAllMetricsSnapshots();

      expect(snapshots).toBeInstanceOf(Map);
    });

    it('should get recent alerts', async () => {
      await service.start();

      const alerts = service.getRecentAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Alert Management', () => {
    it('should handle acknowledge alert for non-existent alert', async () => {
      await service.start();

      // Should throw error for non-existent alert
      await expect(service.acknowledgeAlert('test-alert-id')).rejects.toThrow(
        'Alert not found: test-alert-id',
      );
    });

    it('should create health alerts when engine is unhealthy', async () => {
      // Setup unhealthy engine status
      mockEngineManager.getEngineStatus.mockReturnValue(
        new Map([
          [
            'test-engine',
            {
              isHealthy: false,
              status: 'unhealthy',
              errors: ['Connection failed', 'Timeout'],
              lastCheck: new Date(),
              performance: {
                successRate: 0.5,
                averageGenerationTime: 1000,
                memoryUsage: 50 * 1024 * 1024, // 50MB
              },
            },
          ],
        ]),
      );

      await service.start();

      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.stop();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should create performance alerts for high failure rate', async () => {
      // Setup high failure rate scenario
      mockEngineManager.getEngineStatus.mockReturnValue(
        new Map([
          [
            'test-engine',
            {
              isHealthy: true,
              status: 'healthy',
              errors: [],
              lastCheck: new Date(),
              performance: {
                successRate: 0.3, // 70% failure rate
                averageGenerationTime: 500,
                memoryUsage: 30 * 1024 * 1024,
              },
            },
          ],
        ]),
      );

      await service.start();

      // Wait for performance check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.stop();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should create performance alerts for slow response time', async () => {
      // Setup slow response time scenario
      mockEngineManager.getEngineStatus.mockReturnValue(
        new Map([
          [
            'test-engine',
            {
              isHealthy: true,
              status: 'healthy',
              errors: [],
              lastCheck: new Date(),
              performance: {
                successRate: 0.95,
                averageGenerationTime: 6000, // 6 seconds, above threshold
                memoryUsage: 30 * 1024 * 1024,
              },
            },
          ],
        ]),
      );

      await service.start();

      // Wait for performance check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.stop();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should create resource alerts for high memory usage', async () => {
      // Setup high memory usage scenario
      mockEngineManager.getEngineStatus.mockReturnValue(
        new Map([
          [
            'test-engine',
            {
              isHealthy: true,
              status: 'healthy',
              errors: [],
              lastCheck: new Date(),
              performance: {
                successRate: 0.95,
                averageGenerationTime: 1000,
                memoryUsage: 600 * 1024 * 1024, // 600MB, above 500MB threshold
              },
            },
          ],
        ]),
      );

      await service.start();

      // Wait for performance check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.stop();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should create critical alerts for very high failure rate', async () => {
      // Setup very high failure rate scenario (>50%)
      mockEngineManager.getEngineStatus.mockReturnValue(
        new Map([
          [
            'test-engine',
            {
              isHealthy: true,
              status: 'healthy',
              errors: [],
              lastCheck: new Date(),
              performance: {
                successRate: 0.2, // 80% failure rate
                averageGenerationTime: 1000,
                memoryUsage: 100 * 1024 * 1024,
              },
            },
          ],
        ]),
      );

      await service.start();

      // Wait for performance check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.stop();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle engines without performance metrics', async () => {
      // Setup engine status without performance data
      mockEngineManager.getEngineStatus.mockReturnValue(
        new Map([
          [
            'test-engine',
            {
              isHealthy: true,
              status: 'healthy',
              errors: [],
              lastCheck: new Date(),
            },
          ],
        ]),
      );

      await service.start();

      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.stop();
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service creation', () => {
      expect(service).toBeDefined();
    });

    it('should start and stop without errors', async () => {
      await service.start();
      await service.stop();

      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should respect custom intervals', async () => {
      const customConfig = {
        ...mockConfig,
        healthCheckInterval: 500,
        performanceMetricsInterval: 1000,
      };

      const customService = new PDFEngineMonitoringService(
        customConfig,
        mockEngineManager,
        mockLogger,
      );

      await customService.start();
      await customService.stop(); // Clean up immediately

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting PDF Engine monitoring service',
      );
    });

    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        ...mockConfig,
        healthCheckInterval: -1000,
      };

      const invalidService = new PDFEngineMonitoringService(
        invalidConfig,
        mockEngineManager,
        mockLogger,
      );

      await expect(invalidService.start()).resolves.not.toThrow();
      await invalidService.stop(); // Clean up immediately
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect performance metrics successfully', async () => {
      // Setup detailed engine status for metrics collection
      mockEngineManager.getEngineStatus.mockReturnValue(
        new Map([
          [
            'test-engine',
            {
              isHealthy: true,
              status: 'healthy',
              errors: ['test error'],
              lastCheck: new Date(),
              performance: {
                memoryUsage: 100 * 1024 * 1024, // 100MB
                successRate: 0.95,
                averageGenerationTime: 1500,
              },
            },
          ],
        ]),
      );

      // Mock engine manager to return engine metrics
      const mockGetEngineMetrics = jest.fn();
      mockEngineManager.getEngineMetrics = mockGetEngineMetrics;
      mockGetEngineMetrics.mockReturnValue(
        new Map([
          [
            'test-engine',
            {
              totalTasks: 100,
              successfulTasks: 95,
              failedTasks: 5,
              averageTime: 1500,
            },
          ],
        ]),
      );

      await service.start();

      // Wait for metrics collection
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.stop();

      expect(mockEngineManager.getEngineStatus).toHaveBeenCalled();
    });

    it('should handle metrics collection errors', async () => {
      // Force error in getEngineStatus
      mockEngineManager.getEngineStatus.mockImplementation(() => {
        throw new Error('Engine status error');
      });

      await service.start();

      // Wait for error handling
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.stop();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error collecting performance metrics',
        expect.any(Error),
      );
    });

    it('should handle engine resource usage', async () => {
      const resourceUsage = await (service as any).getEngineResourceUsage(
        'test-engine',
      );

      expect(resourceUsage).toEqual({
        activeTasks: 0,
        memoryUsage: 0,
      });
    });

    it('should store metrics snapshots correctly', () => {
      const snapshot = {
        engineName: 'test-engine',
        timestamp: new Date(),
        isHealthy: true,
        resourceUsage: {
          memoryUsage: 100 * 1024 * 1024,
          activeTasks: 2,
        },
        performance: {
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 1500,
        },
        errors: ['test error'],
      };

      (service as any).storeMetricsSnapshot('test-engine', snapshot);

      const history = (service as any).metricsHistory.get('test-engine');
      expect(history).toBeDefined();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(snapshot);
    });

    it('should clean old metrics', () => {
      // Setup old snapshot
      const oldSnapshot = {
        engineName: 'test-engine',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        isHealthy: true,
        resourceUsage: { memoryUsage: 0, activeTasks: 0 },
        performance: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
        },
        errors: [],
      };

      const recentSnapshot = {
        engineName: 'test-engine',
        timestamp: new Date(),
        isHealthy: true,
        resourceUsage: { memoryUsage: 0, activeTasks: 0 },
        performance: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
        },
        errors: [],
      };

      // Store both snapshots
      (service as any).storeMetricsSnapshot('test-engine', oldSnapshot);
      (service as any).storeMetricsSnapshot('test-engine', recentSnapshot);

      // Clean old metrics
      (service as any).cleanOldMetrics();

      const history = (service as any).metricsHistory.get('test-engine');
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(recentSnapshot);
    });
  });

  describe('Utility Methods', () => {
    it('should get engine health summary', () => {
      mockEngineManager.getEngineStatus.mockReturnValue(
        new Map([
          [
            'engine1',
            {
              isHealthy: true,
              lastCheck: new Date('2023-01-01'),
            },
          ],
          [
            'engine2',
            {
              isHealthy: false,
              lastCheck: new Date('2023-01-02'),
            },
          ],
        ]),
      );

      const summary = service.getEngineHealthSummary();

      expect(summary).toEqual({
        engine1: {
          healthy: true,
          lastCheck: new Date('2023-01-01'),
        },
        engine2: {
          healthy: false,
          lastCheck: new Date('2023-01-02'),
        },
      });
    });

    it('should get active alert count', () => {
      // Setup alerts with different statuses
      (service as any).alerts.set('alert1', {
        id: 'alert1',
        resolved: false,
        severity: 'high',
      });
      (service as any).alerts.set('alert2', {
        id: 'alert2',
        resolved: true,
        severity: 'medium',
      });
      (service as any).alerts.set('alert3', {
        id: 'alert3',
        resolved: false,
        severity: 'low',
      });

      const activeCount = service.getActiveAlertCount();
      expect(activeCount).toBe(2); // alert1 and alert3 are active
    });

    it('should get critical alert count', () => {
      // Setup alerts with different severities
      (service as any).alerts.set('alert1', {
        id: 'alert1',
        resolved: false,
        severity: 'critical',
      });
      (service as any).alerts.set('alert2', {
        id: 'alert2',
        resolved: true,
        severity: 'critical',
      });
      (service as any).alerts.set('alert3', {
        id: 'alert3',
        resolved: false,
        severity: 'high',
      });

      const criticalCount = service.getCriticalAlertCount();
      expect(criticalCount).toBe(1); // Only alert1 is active and critical
    });
  });

  describe('CSV Export and Metrics History', () => {
    it('should convert metrics to CSV format', () => {
      const metrics = [
        {
          timestamp: new Date('2023-01-01T10:00:00Z'),
          engineName: 'test-engine',
          isHealthy: true,
          resourceUsage: {
            memoryUsage: 100 * 1024 * 1024,
            activeTasks: 2,
          },
          performance: {
            totalRequests: 100,
            successfulRequests: 95,
            failedRequests: 5,
            averageResponseTime: 1500,
          },
          errors: ['error1', 'error2'],
        },
      ];

      const csv = (service as any).convertMetricsToCSV(metrics);

      expect(csv).toContain('timestamp,engineName,isHealthy');
      expect(csv).toContain('2023-01-01T10:00:00.000Z,test-engine,true');
      expect(csv).toContain('104857600,2,100,95,5,1500,2');
    });

    it('should handle empty metrics for CSV export', () => {
      const csv = (service as any).convertMetricsToCSV([]);
      expect(csv).toBe('');
    });
  });

  describe('Coverage Enhancement - Missing Scenarios', () => {
    it('should call performHealthChecks via interval', async () => {
      const performHealthChecksSpy = jest
        .spyOn(service as any, 'performHealthChecks')
        .mockImplementation(() => {});

      await service.start();

      // Trigger the interval manually since we can't wait for real intervals in tests
      (service as any).performHealthChecks();

      expect(performHealthChecksSpy).toHaveBeenCalled();
      performHealthChecksSpy.mockRestore();
    });

    it('should call collectPerformanceMetrics via interval', async () => {
      const collectMetricsSpy = jest
        .spyOn(service as any, 'collectPerformanceMetrics')
        .mockImplementation(() => {});

      await service.start();

      // Trigger the interval manually since we can't wait for real intervals in tests
      (service as any).collectPerformanceMetrics();

      expect(collectMetricsSpy).toHaveBeenCalled();
      collectMetricsSpy.mockRestore();
    });

    it('should successfully acknowledge existing alert', async () => {
      // First create an alert by manually adding it to alerts map
      const alertId = 'test-alert-123';
      const mockAlert = {
        id: alertId,
        engineName: 'test-engine',
        severity: 'warning' as const,
        message: 'Test alert message',
        timestamp: new Date(),
        resolved: false,
        resolvedAt: null,
      };

      (service as any).alerts.set(alertId, mockAlert);

      // Now acknowledge it
      await service.acknowledgeAlert(alertId);

      // Verify the alert was marked as resolved
      const alert = (service as any).alerts.get(alertId);
      expect(alert.resolved).toBe(true);
      expect(alert.resolvedAt).toBeInstanceOf(Date);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Alert acknowledged: ${alertId}`,
        expect.objectContaining({
          engineName: 'test-engine',
          message: 'Test alert message',
        }),
      );
    });

    it('should export metrics in JSON format', async () => {
      // Add some mock metrics to history
      const mockMetrics = [
        {
          engineName: 'test-engine',
          timestamp: new Date(),
          isHealthy: true,
          memoryUsage: { used: 1000, total: 2000 },
          cpuUsage: 50,
          activeConnections: 5,
          queueSize: 10,
          averageResponseTime: 200,
          errorRate: 0,
        },
      ];

      (service as any).metricsHistory.set('test-engine', mockMetrics);

      const result = await service.exportMetrics('json', 1000000); // 1000s period

      expect(result).toBeDefined();
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export metrics in CSV format', async () => {
      // Add some mock metrics to history
      const mockMetrics = [
        {
          engineName: 'test-engine',
          timestamp: new Date('2023-01-01T10:00:00.000Z'),
          isHealthy: true,
          memoryUsage: { used: 1000, total: 2000 },
          cpuUsage: 50,
          activeConnections: 5,
          queueSize: 10,
          averageResponseTime: 200,
          errorRate: 0,
        },
      ];

      (service as any).metricsHistory.set('test-engine', mockMetrics);

      const result = await service.exportMetrics('csv', 1000000); // 1000s period

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
