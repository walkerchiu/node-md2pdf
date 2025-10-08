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

  describe('Export Functionality', () => {
    it('should export metrics in JSON format', async () => {
      await service.start();

      const exported = await service.exportMetrics('json', 3600000); // 1 hour

      expect(typeof exported).toBe('string');
    });

    it('should export metrics in CSV format', async () => {
      await service.start();

      const exported = await service.exportMetrics('csv', 3600000); // 1 hour

      expect(typeof exported).toBe('string');
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
});
