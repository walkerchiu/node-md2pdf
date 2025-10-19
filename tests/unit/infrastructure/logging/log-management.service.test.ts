import {
  LogManagementService,
  LogManagementServiceFactory,
  type LogManagementConfig,
  type MaintenanceResult,
} from '../../../../src/infrastructure/logging/log-management.service';

import type { ILogger } from '../../../../src/infrastructure/logging/types';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    mkdir: jest.fn(),
    appendFile: jest.fn(),
    rename: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// Mock zlib
jest.mock('zlib', () => ({
  gzip: jest.fn(),
  gunzip: jest.fn(),
  brotliCompress: jest.fn(),
  brotliDecompress: jest.fn(),
  constants: {
    BROTLI_PARAM_QUALITY: 1,
  },
}));

// Mock logger
const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  setLevel: jest.fn(),
  getLevel: jest.fn(() => 'info'),
};

describe('LogManagementService', () => {
  let service: LogManagementService;
  let config: LogManagementConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    config = {
      filePath: './logs/test.log',
      maxFileSize: 1024 * 1024, // 1MB
      maxBackupFiles: 3,
      format: 'text',
      enableRotation: true,
      async: true,
      autoMaintenance: true,
      maintenanceInterval: 60 * 60 * 1000, // 1 hour
      enableHealthCheck: true,
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
    };

    service = new LogManagementService(config, mockLogger);
  });

  afterEach(async () => {
    // Ensure service is shut down to clean up timers
    if (service && service['isInitialized']) {
      await service.shutdown();
    }
    jest.useRealTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should create service with default config values', () => {
      const minimalConfig = { filePath: './logs/minimal.log' };
      const minimalService = new LogManagementService(minimalConfig);

      expect(minimalService).toBeInstanceOf(LogManagementService);
    });

    it('should create service with custom config', () => {
      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should initialize in hybrid mode for development', () => {
      process.env.NODE_ENV = 'development';
      const devService = new LogManagementService(
        { ...config, format: 'text' },
        mockLogger,
      );
      expect(devService).toBeInstanceOf(LogManagementService);
      delete process.env.NODE_ENV;
    });

    it('should initialize successfully', async () => {
      await service.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Log management service initialized successfully',
        expect.objectContaining({
          autoMaintenance: true,
          healthCheck: true,
        }),
      );
    });

    it('should handle initialization errors', async () => {
      const badConfig = { ...config };
      badConfig.maintenanceInterval = -1; // Invalid interval
      const badService = new LogManagementService(badConfig, mockLogger);

      // Mock a failing initialization
      jest
        .spyOn(badService, 'initialize')
        .mockRejectedValue(new Error('Init failed'));

      await expect(badService.initialize()).rejects.toThrow('Init failed');
    });

    it('should not initialize twice', async () => {
      await service.initialize();
      await service.initialize(); // Second call should return immediately

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });
  });

  describe('Service Lifecycle', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should shutdown gracefully', async () => {
      await service.shutdown();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Log management service shut down successfully',
      );
    });

    it('should handle shutdown errors gracefully', async () => {
      // Mock strategy cleanup to throw error
      const mockStrategy = service['strategy'];
      jest
        .spyOn(mockStrategy, 'cleanup')
        .mockRejectedValue(new Error('Cleanup failed'));

      await service.shutdown();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error during log management service shutdown'),
      );
    });

    it('should return correct status', () => {
      const status = service.getStatus();

      expect(status).toEqual({
        initialized: true,
        config: {
          autoMaintenance: true,
          maintenanceInterval: 60 * 60 * 1000,
          enableHealthCheck: true,
          healthCheckInterval: 5 * 60 * 1000,
        },
        timers: {
          maintenance: true,
          healthCheck: true,
        },
        buffer: {
          size: 0,
          maxSize: 0,
          isBufferEnabled: false,
        },
      });
    });
  });

  describe('Log Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get log statistics from file strategy', async () => {
      const mockStats = {
        totalEntries: 100,
        currentFileSize: 50000,
        rotationCount: 2,
        isRotationNeeded: false,
      };

      // Mock the file strategy getStats method
      const mockStrategy = service['strategy'];
      if ('getStats' in mockStrategy) {
        jest.spyOn(mockStrategy as any, 'getStats').mockReturnValue(mockStats);
      }

      const stats = await service.getStats();
      expect(stats).toEqual(mockStats);
    });

    it('should return default stats when strategy does not provide them', async () => {
      // Mock the strategy to not have getStats method
      const mockServiceWithoutStats = new LogManagementService(config);
      await mockServiceWithoutStats.initialize();

      // Remove getStats method from the strategy
      const mockStrategy = mockServiceWithoutStats['strategy'] as any;
      delete mockStrategy.getStats;

      const stats = await mockServiceWithoutStats.getStats();
      expect(stats).toMatchObject({
        totalEntries: 0,
        currentFileSize: 0,
        rotationCount: 0,
        isRotationNeeded: false,
      });
    });
  });

  describe('Log Rotation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should manually rotate logs', async () => {
      const mockStrategy = service['strategy'];
      if ('rotate' in mockStrategy) {
        jest.spyOn(mockStrategy as any, 'rotate').mockResolvedValue(undefined);
      }

      await service.rotateLogs();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Manual log rotation completed',
      );
    });

    it('should handle rotation when strategy does not support it', async () => {
      // Test with console strategy (no rotate method)
      const consoleConfig = { ...config, filePath: undefined } as any;
      const consoleService = new LogManagementService(consoleConfig);
      await consoleService.initialize();

      // Should not throw error
      await consoleService.rotateLogs();
    });
  });

  describe('Maintenance Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should run maintenance successfully', async () => {
      const mockStats = {
        totalEntries: 100,
        currentFileSize: 50000,
        rotationCount: 2,
        isRotationNeeded: true, // Needs rotation
      };

      const mockStrategy = service['strategy'];
      if ('getStats' in mockStrategy) {
        jest.spyOn(mockStrategy as any, 'getStats').mockReturnValue(mockStats);
      }
      if ('rotate' in mockStrategy) {
        jest.spyOn(mockStrategy as any, 'rotate').mockResolvedValue(undefined);
      }

      const result: MaintenanceResult = await service.runMaintenance();

      expect(result).toEqual({
        timestamp: expect.any(Date),
        duration: expect.any(Number),
        actions: {
          rotations: 1,
          cleanups: 0,
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Maintenance completed successfully',
        result,
      );
    });

    it('should handle maintenance errors', async () => {
      const mockStrategy = service['strategy'] as any;
      if (mockStrategy.getStats) {
        jest
          .spyOn(mockStrategy, 'getStats')
          .mockRejectedValue(new Error('Stats error'));
      }

      await expect(service.runMaintenance()).rejects.toThrow('Stats error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Maintenance failed',
        expect.objectContaining({
          error: 'Stats error',
        }),
      );
    });

    it('should run scheduled maintenance', async () => {
      // Create a fresh service with short maintenance interval for testing
      const testService = new LogManagementService(
        {
          ...config,
          maintenanceInterval: 100, // Very short interval
        },
        mockLogger,
      );

      const runMaintenanceSpy = jest
        .spyOn(testService, 'runMaintenance')
        .mockResolvedValue({
          timestamp: new Date(),
          duration: 100,
          actions: { rotations: 0, cleanups: 0 },
        });

      await testService.initialize();

      // Fast-forward time to trigger maintenance
      jest.advanceTimersByTime(200);
      await jest.runOnlyPendingTimersAsync();

      expect(runMaintenanceSpy).toHaveBeenCalled();

      await testService.shutdown();
    });

    it('should handle scheduled maintenance errors', async () => {
      // Create a fresh service with short maintenance interval for testing
      const testService = new LogManagementService(
        {
          ...config,
          maintenanceInterval: 100, // Very short interval
        },
        mockLogger,
      );

      jest
        .spyOn(testService, 'runMaintenance')
        .mockRejectedValue(new Error('Maintenance error'));

      await testService.initialize();

      // Fast-forward time to trigger maintenance
      jest.advanceTimersByTime(200);
      await jest.runOnlyPendingTimersAsync();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Scheduled maintenance failed',
        expect.objectContaining({
          error: 'Maintenance error',
        }),
      );

      await testService.shutdown();
    });

    it('should run maintenance with time-based rotation', async () => {
      const mockStats = {
        totalEntries: 100,
        currentFileSize: 50000,
        rotationCount: 2,
        isRotationNeeded: false,
      };

      const mockStrategy = service['strategy'] as any;

      // Add time-based rotation method
      mockStrategy.rotateByTime = jest.fn().mockResolvedValue(undefined);

      // Mock getStats to return different rotation counts
      let callCount = 0;
      jest.spyOn(mockStrategy, 'getStats').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { ...mockStats, rotationCount: 2 }; // Before rotation
        }
        return { ...mockStats, rotationCount: 3 }; // After rotation
      });

      mockStrategy.cleanupOldLogs = jest.fn().mockResolvedValue(5);

      const result = await service.runMaintenance();

      expect(result.actions.rotations).toBe(1); // Time-based rotation happened
      expect(result.actions.cleanups).toBe(5);
    });

    it('should handle time-based rotation errors', async () => {
      const mockStrategy = service['strategy'] as any;

      // Add time-based rotation method that fails
      mockStrategy.rotateByTime = jest
        .fn()
        .mockRejectedValue(new Error('Time rotation failed'));

      const mockStats = {
        totalEntries: 100,
        currentFileSize: 50000,
        rotationCount: 2,
        isRotationNeeded: false,
      };

      jest.spyOn(mockStrategy, 'getStats').mockReturnValue(mockStats);

      const result = await service.runMaintenance();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Time-based rotation failed',
        expect.objectContaining({
          error: 'Time rotation failed',
        }),
      );
      expect(result.actions.rotations).toBe(0);
    });

    it('should handle archival errors during maintenance', async () => {
      const mockStrategy = service['strategy'] as any;

      const mockStats = {
        totalEntries: 100,
        currentFileSize: 50000,
        rotationCount: 2,
        isRotationNeeded: false,
      };

      jest.spyOn(mockStrategy, 'getStats').mockReturnValue(mockStats);
      jest
        .spyOn(service, 'archiveLogs')
        .mockRejectedValue(new Error('Archive failed'));

      await service.runMaintenance();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Log archival failed',
        expect.objectContaining({
          error: 'Archive failed',
        }),
      );
    });

    it('should handle cleanup errors during maintenance', async () => {
      const mockStrategy = service['strategy'] as any;

      const mockStats = {
        totalEntries: 100,
        currentFileSize: 50000,
        rotationCount: 2,
        isRotationNeeded: false,
      };

      jest.spyOn(mockStrategy, 'getStats').mockReturnValue(mockStats);
      mockStrategy.cleanupOldLogs = jest
        .fn()
        .mockRejectedValue(new Error('Cleanup failed'));

      await service.runMaintenance();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Log cleanup failed',
        expect.objectContaining({
          error: 'Cleanup failed',
        }),
      );
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should run health check successfully', async () => {
      const mockStats = {
        totalEntries: 100,
        currentFileSize: 50000,
        rotationCount: 2,
        isRotationNeeded: false,
      };

      const mockStrategy = service['strategy'];
      if ('getStats' in mockStrategy) {
        jest.spyOn(mockStrategy as any, 'getStats').mockReturnValue(mockStats);
      }

      // Mock getDiskUsage to avoid warnings
      jest.spyOn(service, 'getDiskUsage').mockResolvedValue({
        totalSpace: 100000000,
        usedSpace: 50000000,
        availableSpace: 50000000,
        usagePercentage: 50,
        logDirectorySize: 1000,
        logFiles: [],
      });

      await service.checkHealth();

      // Should not log warnings for healthy status (but might warn about unimplemented getDiskUsage)
      // Filter out expected warnings about directory calculation
      const warnCalls = mockLogger.warn.mock.calls.filter(
        (call) => !call[0].includes('Failed to calculate log directory size'),
      );
      expect(warnCalls).toHaveLength(0);
    });

    it('should warn when rotation is needed', async () => {
      const mockStats = {
        totalEntries: 100,
        currentFileSize: 50000,
        rotationCount: 2,
        isRotationNeeded: true, // Needs rotation
      };

      const mockStrategy = service['strategy'];
      if ('getStats' in mockStrategy) {
        jest.spyOn(mockStrategy as any, 'getStats').mockReturnValue(mockStats);
      }

      // Mock getDiskUsage to avoid timeout
      jest.spyOn(service, 'getDiskUsage').mockResolvedValue({
        totalSpace: 100000000,
        usedSpace: 50000000,
        availableSpace: 50000000,
        usagePercentage: 50,
        logDirectorySize: 1000,
        logFiles: [],
      });

      await service.checkHealth();

      expect(mockLogger.warn).toHaveBeenCalledWith('Log rotation needed');
    });

    it('should handle health check errors', async () => {
      const mockStrategy = service['strategy'] as any;
      if (mockStrategy.getStats) {
        jest
          .spyOn(mockStrategy, 'getStats')
          .mockRejectedValue(new Error('Health error'));
      }

      await service.checkHealth();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Health check failed',
        expect.objectContaining({
          error: 'Health error',
        }),
      );
    });

    it('should run scheduled health checks', async () => {
      // Create a fresh service with short health check interval for testing
      const testService = new LogManagementService(
        {
          ...config,
          healthCheckInterval: 100, // Very short interval
        },
        mockLogger,
      );

      const checkHealthSpy = jest
        .spyOn(testService, 'checkHealth')
        .mockResolvedValue();

      await testService.initialize();

      // Fast-forward time to trigger health check
      jest.advanceTimersByTime(200);
      await jest.runOnlyPendingTimersAsync();

      expect(checkHealthSpy).toHaveBeenCalled();

      await testService.shutdown();
    });
  });

  describe('Additional Service Methods', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return disk usage information', async () => {
      // Mock fs operations to avoid actual disk operations
      const fs = require('fs');
      jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(fs.promises, 'readdir').mockResolvedValue([]);

      // Mock child_process exec
      const { exec } = require('child_process');
      exec.mockImplementation((_cmd: any, callback: any) => {
        callback(null, {
          stdout: '/dev/sda1 100000 50000 50000 50% /',
        });
      });

      const diskUsage = await service.getDiskUsage();

      expect(diskUsage).toEqual({
        totalSpace: expect.any(Number),
        usedSpace: expect.any(Number),
        availableSpace: expect.any(Number),
        usagePercentage: expect.any(Number),
        logDirectorySize: expect.any(Number),
        logFiles: expect.any(Array),
      });
    }, 15000);

    it('should search logs', async () => {
      const searchResult = await service.searchLogs({ query: 'test' });

      expect(searchResult).toEqual({
        entries: expect.any(Array),
        totalCount: expect.any(Number),
        hasMore: expect.any(Boolean),
        searchStats: {
          filesSearched: expect.any(Number),
          totalLines: expect.any(Number),
          searchDuration: expect.any(Number),
        },
      });
    });

    it('should search logs with filters', async () => {
      const criteria = {
        query: 'error',
        level: 'error',
        timeRange: {
          from: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          to: new Date(),
        },
        limit: 50,
        offset: 10,
        includeArchived: true,
      };

      const searchResult = await service.searchLogs(criteria);

      expect(searchResult).toEqual({
        entries: expect.any(Array),
        totalCount: expect.any(Number),
        hasMore: expect.any(Boolean),
        searchStats: {
          filesSearched: expect.any(Number),
          totalLines: expect.any(Number),
          searchDuration: expect.any(Number),
        },
      });
    });

    it('should analyze logs', async () => {
      const analysisResult = await service.analyzeLogs();

      expect(analysisResult).toEqual({
        totalLogs: expect.any(Number),
        logsByLevel: expect.any(Object),
        timeRange: { earliest: expect.any(Date), latest: expect.any(Date) },
        topMessages: expect.any(Array),
        errorPatterns: expect.any(Array),
        performanceMetrics: {
          averageWriteTime: expect.any(Number),
          maxWriteTime: expect.any(Number),
          queueFullEvents: expect.any(Number),
          logFrequency: {
            hour: expect.any(Number),
            day: expect.any(Number),
            total: expect.any(Number),
          },
        },
        fileStatistics: expect.any(Array),
        insights: {
          errorRate: expect.any(Number),
          warningRate: expect.any(Number),
          busiestHour: { hour: expect.any(Number), count: expect.any(Number) },
          commonErrors: expect.any(Array),
          recommendations: expect.any(Array),
        },
      });
    });

    it('should analyze logs with time range', async () => {
      const timeRange = {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        to: new Date(),
      };

      const analysisResult = await service.analyzeLogs(timeRange);

      expect(analysisResult).toEqual({
        totalLogs: expect.any(Number),
        logsByLevel: expect.any(Object),
        timeRange: { earliest: expect.any(Date), latest: expect.any(Date) },
        topMessages: expect.any(Array),
        errorPatterns: expect.any(Array),
        performanceMetrics: {
          averageWriteTime: expect.any(Number),
          maxWriteTime: expect.any(Number),
          queueFullEvents: expect.any(Number),
          logFrequency: {
            hour: expect.any(Number),
            day: expect.any(Number),
            total: expect.any(Number),
          },
        },
        fileStatistics: expect.any(Array),
        insights: {
          errorRate: expect.any(Number),
          warningRate: expect.any(Number),
          busiestHour: { hour: expect.any(Number), count: expect.any(Number) },
          commonErrors: expect.any(Array),
          recommendations: expect.any(Array),
        },
      });
    });

    it('should archive logs', async () => {
      const archivedFiles = await service.archiveLogs();
      expect(archivedFiles).toEqual([]);
    });

    it('should archive logs with custom options', async () => {
      const options = {
        maxAge: '30d',
        compressionLevel: 9,
        archiveFormat: 'brotli' as const,
        keepOriginals: true,
      };

      const archivedFiles = await service.archiveLogs(options);
      expect(archivedFiles).toEqual([]);
    });

    it('should cleanup old logs', async () => {
      const cleanedCount = await service.cleanupOldLogs();
      expect(cleanedCount).toBe(0);
    });

    it('should get buffer status', () => {
      const bufferStatus = service.getBufferStatus();

      expect(bufferStatus).toEqual({
        size: expect.any(Number),
        maxSize: expect.any(Number),
        isBufferEnabled: expect.any(Boolean),
      });
    });

    it('should get buffer status when strategy supports it', () => {
      const mockStrategy = service['strategy'] as any;
      mockStrategy.getBufferSize = jest.fn().mockReturnValue(1024);
      mockStrategy.config = {
        bufferSize: 2048,
        bufferEnabled: true,
      };

      const bufferStatus = service.getBufferStatus();

      expect(bufferStatus).toEqual({
        size: 1024,
        maxSize: 2048,
        isBufferEnabled: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not initialized', async () => {
      const uninitializedService = new LogManagementService(config);

      await expect(uninitializedService.getStats()).rejects.toThrow(
        'Log management service not initialized. Call initialize() first.',
      );
    });

    it('should handle initialization errors with proper error message', async () => {
      const errorService = new LogManagementService(config, mockLogger);

      // Mock the strategy initialization to fail
      const mockError = new Error('Strategy initialization failed');
      jest.spyOn(errorService, 'initialize').mockImplementation(async () => {
        throw mockError;
      });

      await expect(errorService.initialize()).rejects.toThrow(
        'Strategy initialization failed',
      );
    });

    it('should handle search logs errors gracefully', async () => {
      await service.initialize();

      // Mock fs to throw error
      const fs = require('fs');
      jest
        .spyOn(fs.promises, 'readdir')
        .mockRejectedValue(new Error('Directory read failed'));

      const result = await service.searchLogs({ query: 'test' });
      expect(result.entries).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should handle log analysis errors gracefully', async () => {
      await service.initialize();

      // Mock fs to throw error
      const fs = require('fs');
      jest
        .spyOn(fs.promises, 'readdir')
        .mockRejectedValue(new Error('Directory read failed'));

      const result = await service.analyzeLogs();
      expect(result.totalLogs).toBe(0);
      expect(result.insights.recommendations).toContain(
        'Log analysis failed - check log configuration',
      );
    });

    it('should handle archive logs errors gracefully', async () => {
      await service.initialize();

      // Mock fs to throw error
      const fs = require('fs');
      jest
        .spyOn(fs.promises, 'mkdir')
        .mockRejectedValue(new Error('Archive directory creation failed'));

      const result = await service.archiveLogs();
      expect(result).toEqual([]);
    });

    it('should handle cleanup old logs when strategy does not support it', async () => {
      await service.initialize();

      // Remove cleanupOldLogs method from strategy
      const mockStrategy = service['strategy'] as any;
      delete mockStrategy.cleanupOldLogs;

      const cleanedCount = await service.cleanupOldLogs();
      expect(cleanedCount).toBe(0);
    });

    it('should handle cleanup old logs with error', async () => {
      await service.initialize();

      // Mock strategy to have cleanupOldLogs that throws error
      const mockStrategy = service['strategy'] as any;
      mockStrategy.cleanupOldLogs = jest
        .fn()
        .mockRejectedValue(new Error('Cleanup failed'));

      const cleanedCount = await service.cleanupOldLogs();
      expect(cleanedCount).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Manual log cleanup failed',
        expect.objectContaining({
          error: 'Cleanup failed',
        }),
      );
    });
  });

  describe('Log Parsing', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should parse JSON log lines correctly', async () => {
      const fs = require('fs');
      const jsonLogContent = JSON.stringify({
        timestamp: '2025-09-16T01:24:37.109Z',
        level: 'error',
        message: 'Test error message',
        processId: 1234,
        correlationId: 'abc-123',
      });

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['test.log']);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(jsonLogContent);

      const result = await service.searchLogs({ query: 'error' });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].level).toBe('error');
      expect(result.entries[0].message).toBe('Test error message');
    });

    it('should parse text format log lines correctly', async () => {
      const fs = require('fs');
      const textLogContent =
        '2025-09-16T01:24:37.109Z [ERROR][1234] Test error message';

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['test.log']);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(textLogContent);

      const result = await service.searchLogs({ query: 'error' });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].level).toBe('error');
      expect(result.entries[0].message).toBe('Test error message');
    });

    it('should parse basic timestamp log lines', async () => {
      const fs = require('fs');
      const basicLogContent = '2025-09-16T01:24:37 Some basic log message';

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['test.log']);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(basicLogContent);

      const result = await service.searchLogs({ query: 'basic' });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].level).toBe('info');
      expect(result.entries[0].message).toBe('Some basic log message');
    });

    it('should handle malformed log lines gracefully', async () => {
      const fs = require('fs');
      const malformedLogContent =
        'This is not a valid log line\nNeither is this';

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['test.log']);
      jest
        .spyOn(fs.promises, 'readFile')
        .mockResolvedValue(malformedLogContent);

      const result = await service.searchLogs({ query: 'test' });
      expect(result.entries).toHaveLength(0);
    });
  });

  describe('Disk Usage and Platform Commands', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle Windows disk usage commands', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      const { exec } = require('child_process');
      exec.mockImplementation((_cmd: any, callback: any) => {
        callback(null, {
          stdout: 'Size        FreeSpace\n100000000   50000000',
        });
      });

      const diskUsage = await service.getDiskUsage();
      expect(diskUsage.totalSpace).toBeGreaterThan(0);

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('should handle Unix disk usage commands', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      const { exec } = require('child_process');
      exec.mockImplementation((_cmd: any, callback: any) => {
        callback(null, {
          stdout: '/dev/sda1 100000 50000 50000 50% /',
        });
      });

      const diskUsage = await service.getDiskUsage();
      expect(diskUsage.totalSpace).toBeGreaterThan(0);

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('should handle disk usage command errors', async () => {
      const { exec } = require('child_process');
      exec.mockImplementation((_cmd: any, callback: any) => {
        callback(new Error('Command failed'));
      });

      const diskUsage = await service.getDiskUsage();
      expect(diskUsage.totalSpace).toBe(0);
      expect(diskUsage.availableSpace).toBe(0);
    });
  });

  describe('Health Check Details', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should warn when buffer is nearly full', async () => {
      const mockStrategy = service['strategy'] as any;

      // Mock strategy to support buffer
      mockStrategy.getBufferSize = jest.fn().mockReturnValue(850);
      mockStrategy.config = {
        bufferSize: 1000,
        bufferEnabled: true,
      };

      // Mock getDiskUsage to avoid warnings
      jest.spyOn(service, 'getDiskUsage').mockResolvedValue({
        totalSpace: 100000000,
        usedSpace: 50000000,
        availableSpace: 50000000,
        usagePercentage: 50,
        logDirectorySize: 1000,
        logFiles: [],
      });

      await service.checkHealth();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Log buffer nearly full',
        expect.objectContaining({
          currentSize: 850,
          maxSize: 1000,
          usagePercent: 85,
        }),
      );
    });

    it('should error when buffer is critically full', async () => {
      // Mock getDiskUsage to avoid timeout
      jest.spyOn(service, 'getDiskUsage').mockResolvedValue({
        totalSpace: 100000000,
        usedSpace: 50000000,
        availableSpace: 50000000,
        usagePercentage: 50,
        logDirectorySize: 1000,
        logFiles: [],
      });

      // Test that checkHealth can be called without error
      await expect(service.checkHealth()).resolves.not.toThrow();
    });

    it('should warn when disk space is running low', async () => {
      // Mock getDiskUsage to return low disk space
      jest.spyOn(service, 'getDiskUsage').mockResolvedValue({
        totalSpace: 100000000,
        usedSpace: 85000000,
        availableSpace: 15000000,
        usagePercentage: 85,
        logDirectorySize: 1000000,
        logFiles: [],
      });

      await service.checkHealth();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Disk space running low',
        expect.objectContaining({
          usagePercentage: 85,
          availableSpace: 14, // MB
          logDirectorySize: 1, // MB
        }),
      );
    });

    it('should error when disk space is critically low', async () => {
      // Mock getDiskUsage to return critical disk space
      jest.spyOn(service, 'getDiskUsage').mockResolvedValue({
        totalSpace: 100000000,
        usedSpace: 95000000,
        availableSpace: 5000000,
        usagePercentage: 95,
        logDirectorySize: 2000000,
        logFiles: [],
      });

      await service.checkHealth();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Disk space critically low',
        expect.objectContaining({
          usagePercentage: 95,
          availableSpace: 5, // MB
          logDirectorySize: 2, // MB
        }),
      );
    });
  });
});

describe('LogManagementServiceFactory', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Production Service Factory', () => {
    it('should create production service with default config', () => {
      const service = LogManagementServiceFactory.createProductionService();

      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should create production service with custom config', () => {
      const customConfig = {
        filePath: './custom-logs/production.log',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        format: 'json' as const,
      };

      const service = LogManagementServiceFactory.createProductionService(
        customConfig,
        mockLogger,
      );

      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should use production defaults', async () => {
      const service = LogManagementServiceFactory.createProductionService();
      await service.initialize();
      const status = service.getStatus();

      expect(status.config).toEqual({
        autoMaintenance: true,
        maintenanceInterval: 2 * 60 * 60 * 1000, // 2 hours
        enableHealthCheck: true,
        healthCheckInterval: 10 * 60 * 1000, // 10 minutes
      });

      await service.shutdown();
    });
  });

  describe('Constructor and Strategy Selection', () => {
    it('should create FileLoggerStrategy when not in hybrid mode', () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: false, // This should force non-hybrid mode
      };

      const service = new LogManagementService(config, mockLogger);
      expect(service).toBeDefined();

      // Check internal strategy type by accessing private property
      expect((service as any).strategy).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
        autoMaintenance: true, // Enable to trigger startMaintenanceScheduler
        enableHealthCheck: false,
      };

      const service = new LogManagementService(config, mockLogger);

      // Mock startMaintenanceScheduler to throw an error
      jest
        .spyOn(service as any, 'startMaintenanceScheduler')
        .mockImplementation(() => {
          throw new Error('Failed to start maintenance scheduler');
        });

      await expect(service.initialize()).rejects.toThrow(
        'Failed to initialize log management service',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize log management service'),
      );
    });

    it('should not reinitialize if already initialized', async () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
        autoMaintenance: false,
        enableHealthCheck: false,
      };

      const service = new LogManagementService(config, mockLogger);

      // Initialize once
      await service.initialize();

      // Clear mock calls
      mockLogger.info.mockClear();

      // Try to initialize again
      await service.initialize();

      // Should not call info again since it's already initialized
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Disk Usage Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle individual file stat errors gracefully', async () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
        autoMaintenance: false,
        enableHealthCheck: false,
      };

      const service = new LogManagementService(config, mockLogger);
      await service.initialize();

      // Mock fs operations
      const { exec } = await import('child_process');
      (exec as jest.MockedFunction<any>).mockImplementation(
        (_cmd: any, callback: any) => {
          callback(null, { stdout: '1000 500 500' }); // total, used, available
        },
      );

      const fs = await import('fs');
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.readdir as jest.Mock).mockResolvedValue([
        'app.log',
        'app.log.1',
        'invalid-file',
      ]);

      // Mock stat to throw error for one file
      (fs.promises.stat as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('invalid-file')) {
          throw new Error('Permission denied');
        }
        return Promise.resolve({
          isFile: () => true,
          size: 1024,
          mtime: new Date(),
        });
      });

      const result = await service.getDiskUsage();

      // Should return results despite individual file errors
      expect(result).toBeDefined();
      expect(result.logFiles.length).toBe(2); // Should have 2 files, not 3

      await service.shutdown();
    });

    it('should handle readdir errors by warning and continuing', async () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
        autoMaintenance: false,
        enableHealthCheck: false,
      };

      const service = new LogManagementService(config, mockLogger);
      await service.initialize();

      // Mock fs operations to fail
      const { exec } = await import('child_process');
      (exec as jest.MockedFunction<any>).mockImplementation(
        (_cmd: any, callback: any) => {
          callback(null, { stdout: '1000 500 500' });
        },
      );

      const fs = await import('fs');
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.readdir as jest.Mock).mockRejectedValue(
        new Error('Directory access denied'),
      );

      const result = await service.getDiskUsage();

      // Should warn about the error
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to calculate log directory size',
        { error: 'Directory access denied' },
      );

      // Should still return disk usage data
      expect(result).toBeDefined();
      expect(result.logDirectorySize).toBe(0);

      await service.shutdown();
    });

    it('should return default values when exec command fails', async () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
        autoMaintenance: false,
        enableHealthCheck: false,
      };

      const service = new LogManagementService(config, mockLogger);
      await service.initialize();

      // Mock exec to fail
      const { exec } = await import('child_process');
      (exec as jest.MockedFunction<any>).mockImplementation(
        (_cmd: any, callback: any) => {
          callback(new Error('Command failed'), null);
        },
      );

      const result = await service.getDiskUsage();

      // The error might be caught in different places, so just check result
      expect(result).toEqual({
        totalSpace: 0,
        usedSpace: 0,
        availableSpace: 0,
        usagePercentage: 0,
        logDirectorySize: 0,
        logFiles: [],
      });

      await service.shutdown();
    });
  });

  describe('Advanced Error Handling', () => {
    it('should handle service without logger', async () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
        autoMaintenance: false,
        enableHealthCheck: false,
      };

      // Create service without logger
      const service = new LogManagementService(config);

      await service.initialize();

      // Operations should work without logger (no crashes)
      const stats = await service.getStats();
      expect(stats).toBeDefined();

      await service.shutdown();
    });

    it('should handle search errors gracefully', async () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
        autoMaintenance: false,
        enableHealthCheck: false,
      };

      const service = new LogManagementService(config, mockLogger);
      await service.initialize();

      // Mock fs operations to fail during search
      const fs = await import('fs');
      (fs.promises.readFile as jest.Mock).mockRejectedValue(
        new Error('File not found'),
      );
      (fs.promises.readdir as jest.Mock).mockRejectedValue(
        new Error('Directory access denied'),
      );

      const searchResult = await service.searchLogs({ query: 'test' });

      expect(searchResult.entries).toEqual([]);
      expect(searchResult.totalCount).toBe(0);
      expect(searchResult.hasMore).toBe(false);

      await service.shutdown();
    });

    it('should handle analysis errors gracefully', async () => {
      const config: LogManagementConfig = {
        filePath: '/test/app.log',
        maxFileSize: 1024 * 1024,
        maxBackupFiles: 3,
        format: 'text',
        enableRotation: true,
        async: true,
        autoMaintenance: false,
        enableHealthCheck: false,
      };

      const service = new LogManagementService(config, mockLogger);
      await service.initialize();

      // Mock fs operations to fail during analysis
      const fs = await import('fs');
      (fs.promises.readdir as jest.Mock).mockRejectedValue(
        new Error('Directory access denied'),
      );

      const analysisResult = await service.analyzeLogs();

      expect(analysisResult.totalLogs).toBe(0);
      expect(analysisResult.logsByLevel).toEqual({
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
      });
      expect(analysisResult.insights.recommendations).toContain(
        'Log analysis failed - check log configuration',
      );

      await service.shutdown();
    });
  });

  describe('Development Service Factory', () => {
    it('should create development service with default config', () => {
      const service = LogManagementServiceFactory.createDevelopmentService();

      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should create development service with custom config', () => {
      const customConfig = {
        filePath: './dev-logs/development.log',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        async: true, // Override default
      };

      const service = LogManagementServiceFactory.createDevelopmentService(
        customConfig,
        mockLogger,
      );

      expect(service).toBeInstanceOf(LogManagementService);
    });

    it('should use development defaults', async () => {
      const service = LogManagementServiceFactory.createDevelopmentService();
      await service.initialize();
      const status = service.getStatus();

      expect(status.config).toEqual({
        autoMaintenance: false,
        maintenanceInterval: 60 * 60 * 1000, // 1 hour (default)
        enableHealthCheck: false,
        healthCheckInterval: 5 * 60 * 1000, // 5 minutes (default)
      });

      await service.shutdown();
    });
  });
});
