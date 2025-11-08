/**
 * Log Management Service
 * Provides high-level log management capabilities including:
 * - Standard logging strategies
 * - Automatic maintenance
 * - Basic monitoring
 * - Service lifecycle management
 */

import { EventEmitter } from 'events';
import { join } from 'path';

import { HybridLoggerStrategy, FileLoggerStrategy } from './strategies';

import type {
  ILogger,
  FileLoggingConfig,
  LogStats,
  ILoggerStrategy,
} from './types';

/**
 * Log management configuration
 */
export interface LogManagementConfig extends FileLoggingConfig {
  /** Enable automatic maintenance tasks */
  autoMaintenance?: boolean;
  /** Maintenance interval in milliseconds (default: 1 hour) */
  maintenanceInterval?: number;
  /** Enable health monitoring */
  enableHealthCheck?: boolean;
  /** Health check interval in milliseconds (default: 5 minutes) */
  healthCheckInterval?: number;
}

/**
 * Maintenance result
 */
export interface MaintenanceResult {
  timestamp: Date;
  duration: number;
  actions: {
    rotations: number;
    cleanups: number;
  };
}

/**
 * Log Management Service
 */
export class LogManagementService extends EventEmitter {
  private config: Required<LogManagementConfig>;
  private strategy: ILoggerStrategy;
  private maintenanceTimer?: NodeJS.Timeout | undefined;
  private healthCheckTimer?: NodeJS.Timeout | undefined;
  private isInitialized = false;
  private logger?: ILogger | undefined;

  constructor(config: LogManagementConfig, logger?: ILogger) {
    super();

    this.config = {
      ...config,
      autoMaintenance: config.autoMaintenance ?? true,
      maintenanceInterval: config.maintenanceInterval ?? 60 * 60 * 1000, // 1 hour
      enableHealthCheck: config.enableHealthCheck ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 5 * 60 * 1000, // 5 minutes
      // Base config defaults
      filePath: config.filePath ?? join(process.cwd(), 'logs', 'app.log'),
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024,
      maxBackupFiles: config.maxBackupFiles ?? 5,
      format: config.format ?? 'text',
      enableRotation: config.enableRotation ?? true,
      async: config.async ?? true,
    } as Required<LogManagementConfig>;

    this.logger = logger || undefined;

    // Create strategy based on configuration
    if (this.isHybridMode()) {
      this.strategy = new HybridLoggerStrategy(
        {
          enableColors: true,
          enableTimestamp: true,
          prefix: '[MD2PDF]',
        },
        this.config,
      );
    } else {
      this.strategy = new FileLoggerStrategy(this.config);
    }
  }

  /**
   * Initialize the log management service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Start maintenance scheduler
      if (this.config.autoMaintenance) {
        this.startMaintenanceScheduler();
      }

      // Start health monitoring
      if (this.config.enableHealthCheck) {
        this.startHealthMonitoring();
      }

      this.isInitialized = true;

      this.logger?.info('Log management service initialized successfully', {
        autoMaintenance: this.config.autoMaintenance,
        healthCheck: this.config.enableHealthCheck,
      });
    } catch (error) {
      const errorMsg = `Failed to initialize log management service: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.logger?.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Shutdown the log management service
   */
  async shutdown(): Promise<void> {
    try {
      // Stop timers
      if (this.maintenanceTimer) {
        clearInterval(this.maintenanceTimer);
        this.maintenanceTimer = undefined;
      }

      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = undefined;
      }

      // Cleanup strategy
      await this.strategy.cleanup();

      this.isInitialized = false;

      this.logger?.info('Log management service shut down successfully');
    } catch (error) {
      const errorMsg = `Error during log management service shutdown: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.logger?.warn(errorMsg);
    }
  }

  /**
   * Get log statistics
   */
  async getStats(): Promise<LogStats> {
    this.ensureInitialized();

    if ('getStats' in this.strategy) {
      return (this.strategy as FileLoggerStrategy).getStats();
    }

    // Default stats if strategy doesn't provide them
    return {
      totalEntries: 0,
      currentFileSize: 0,
      rotationCount: 0,
      isRotationNeeded: false,
    };
  }

  /**
   * Manually trigger log rotation
   */
  async rotateLogs(): Promise<void> {
    this.ensureInitialized();

    if ('rotate' in this.strategy) {
      await (this.strategy as any).rotate();
      this.logger?.info('Manual log rotation completed');
    }
  }

  /**
   * Run comprehensive maintenance
   */
  async runMaintenance(): Promise<MaintenanceResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    this.emit('maintenance:started');

    try {
      let actions = {
        rotations: 0,
        cleanups: 0,
      };

      // Step 1: Check for time-based rotation first
      if ('rotateByTime' in this.strategy) {
        try {
          // Get stats before rotation to check if rotation happened
          const statsBefore = await this.getStats();
          const rotationCountBefore = statsBefore.rotationCount;

          await (this.strategy as any).rotateByTime();

          // Check if rotation actually happened
          const statsAfter = await this.getStats();
          if (statsAfter.rotationCount > rotationCountBefore) {
            actions.rotations++;
            this.logger?.info('Time-based log rotation completed');
          } else {
            this.logger?.debug(
              'Time-based rotation check completed (no rotation needed)',
            );
          }
        } catch (error) {
          this.logger?.warn('Time-based rotation failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Step 2: Rotate current logs if needed (size-based)
      const stats = await this.getStats();
      if (stats.isRotationNeeded) {
        await this.rotateLogs();
        actions.rotations++;
        this.logger?.info('Size-based log rotation completed');
      }

      // Step 3: Archive very old log files before cleanup
      try {
        const archivedFiles = await this.archiveLogs({
          maxAge: '60d', // Archive logs older than 60 days
          compressionLevel: 6,
          archiveFormat: 'gzip',
          keepOriginals: false,
        });
        if (archivedFiles.length > 0) {
          this.logger?.info(
            `Log archival completed: ${archivedFiles.length} files archived`,
          );
        }
      } catch (error) {
        this.logger?.warn('Log archival failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Step 4: Cleanup old log files
      if ('cleanupOldLogs' in this.strategy) {
        try {
          const cleanedFiles = await (this.strategy as any).cleanupOldLogs(
            this.config.maxAge || '7d',
          );
          actions.cleanups = cleanedFiles;
          if (cleanedFiles > 0) {
            this.emit('cleanup:completed', cleanedFiles);
            this.logger?.info(
              `Log cleanup completed: ${cleanedFiles} files removed`,
            );
          }
        } catch (error) {
          this.logger?.warn('Log cleanup failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const result: MaintenanceResult = {
        timestamp: new Date(),
        duration: Date.now() - startTime,
        actions,
      };

      this.emit('maintenance:completed', result);
      this.logger?.info('Maintenance completed successfully', result);

      return result;
    } catch (error) {
      const maintenanceError =
        error instanceof Error ? error : new Error('Unknown maintenance error');
      this.emit('maintenance:failed', maintenanceError);
      this.logger?.error('Maintenance failed', {
        error: maintenanceError.message,
      });
      throw maintenanceError;
    }
  }

  /**
   * Enhanced health check with buffer and disk monitoring
   */
  async checkHealth(): Promise<void> {
    this.ensureInitialized();

    try {
      const stats = await this.getStats();
      const bufferStatus = this.getBufferStatus();
      const diskUsage = await this.getDiskUsage();

      // Basic health checks
      if (stats.isRotationNeeded) {
        this.logger?.warn('Log rotation needed');
      }

      // Buffer health checks
      if (bufferStatus.isBufferEnabled && bufferStatus.maxSize > 0) {
        const bufferUsagePercent =
          (bufferStatus.size / bufferStatus.maxSize) * 100;

        if (bufferUsagePercent > 80) {
          this.logger?.warn('Log buffer nearly full', {
            currentSize: bufferStatus.size,
            maxSize: bufferStatus.maxSize,
            usagePercent: Math.round(bufferUsagePercent),
          });
        } else if (bufferUsagePercent > 90) {
          this.logger?.error('Log buffer critically full', {
            currentSize: bufferStatus.size,
            maxSize: bufferStatus.maxSize,
            usagePercent: Math.round(bufferUsagePercent),
          });
        }
      }

      // Disk usage health checks
      if (diskUsage.usagePercentage > 90) {
        this.logger?.error('Disk space critically low', {
          usagePercentage: diskUsage.usagePercentage,
          availableSpace: Math.round(diskUsage.availableSpace / (1024 * 1024)), // MB
          logDirectorySize: Math.round(
            diskUsage.logDirectorySize / (1024 * 1024),
          ), // MB
        });
      } else if (diskUsage.usagePercentage > 80) {
        this.logger?.warn('Disk space running low', {
          usagePercentage: diskUsage.usagePercentage,
          availableSpace: Math.round(diskUsage.availableSpace / (1024 * 1024)), // MB
          logDirectorySize: Math.round(
            diskUsage.logDirectorySize / (1024 * 1024),
          ), // MB
        });
      }

      // Emit comprehensive health information
      this.emit('health:status', {
        stats,
        bufferStatus,
        diskUsage,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger?.warn('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get disk usage information for log directory
   */
  async getDiskUsage(): Promise<{
    totalSpace: number;
    usedSpace: number;
    availableSpace: number;
    usagePercentage: number;
    logDirectorySize: number;
    logFiles: Array<{ name: string; size: number; lastModified: Date }>;
  }> {
    this.ensureInitialized();

    try {
      const { promises: fs } = await import('fs');
      const { dirname } = await import('path');
      const { execPromise } = await this.getExecPromise();

      const logDir = dirname(this.config.filePath);

      // Get disk usage for the log directory
      let totalSpace = 0;
      let availableSpace = 0;
      let usedSpace = 0;
      let usagePercentage = 0;

      try {
        // Use different commands based on platform
        const platform = process.platform;
        let command: string;

        if (platform === 'win32') {
          // Windows: use wmic or PowerShell
          command = `powershell "Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq '${logDir.charAt(0)}:'} | Select-Object Size,FreeSpace"`;
        } else {
          // Unix-like systems: use df
          command = `df -k "${logDir}" | tail -1`;
        }

        const { stdout } = await execPromise(command);

        if (platform === 'win32') {
          // Parse Windows PowerShell output
          const lines = stdout.trim().split('\n');
          for (const line of lines) {
            if (line.includes('Size') || line.includes('FreeSpace')) continue;
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              totalSpace = parseInt(parts[0]) || 0;
              availableSpace = parseInt(parts[1]) || 0;
              usedSpace = totalSpace - availableSpace;
              usagePercentage =
                totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
              break;
            }
          }
        } else {
          // Parse Unix df output: filesystem, total, used, available, percentage, mountpoint
          const parts = stdout.trim().split(/\s+/);
          if (parts.length >= 4) {
            totalSpace = parseInt(parts[1]) * 1024; // Convert from KB to bytes
            usedSpace = parseInt(parts[2]) * 1024;
            availableSpace = parseInt(parts[3]) * 1024;
            usagePercentage =
              totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
          }
        }
      } catch (error) {
        this.logger?.warn('Failed to get disk usage info', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Calculate log directory size and list files
      let logDirectorySize = 0;
      const logFiles: Array<{
        name: string;
        size: number;
        lastModified: Date;
      }> = [];

      try {
        // Ensure log directory exists
        await fs.mkdir(logDir, { recursive: true });

        const files = await fs.readdir(logDir);

        for (const file of files) {
          try {
            const filePath = `${logDir}/${file}`;
            const stat = await fs.stat(filePath);

            if (
              stat.isFile() &&
              (file.endsWith('.log') || file.includes('.log.'))
            ) {
              logDirectorySize += stat.size;
              logFiles.push({
                name: file,
                size: stat.size,
                lastModified: stat.mtime,
              });
            }
          } catch (fileError) {
            // Ignore individual file errors
            continue;
          }
        }
      } catch (error) {
        this.logger?.warn('Failed to calculate log directory size', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      const result = {
        totalSpace,
        usedSpace,
        availableSpace,
        usagePercentage: Math.round(usagePercentage * 100) / 100, // Round to 2 decimal places
        logDirectorySize,
        logFiles: logFiles.sort(
          (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
        ),
      };

      // Emit disk usage event for monitoring
      this.emit('disk:usage', result);

      return result;
    } catch (error) {
      const errorMsg = `Failed to get disk usage: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.logger?.error(errorMsg);

      // Return default values on error
      return {
        totalSpace: 0,
        usedSpace: 0,
        availableSpace: 0,
        usagePercentage: 0,
        logDirectorySize: 0,
        logFiles: [],
      };
    }
  }

  /**
   * Get exec promise utility
   */
  private async getExecPromise(): Promise<{
    execPromise: (cmd: string) => Promise<{ stdout: string; stderr: string }>;
  }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execPromise = promisify(exec);
    return { execPromise };
  }

  /**
   * Search logs with advanced filtering capabilities
   */
  async searchLogs(criteria: {
    query?: string;
    level?: string;
    timeRange?: { from: Date; to: Date };
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
  }): Promise<{
    entries: Array<{
      timestamp: Date;
      level: string;
      message: string;
      file: string;
      lineNumber: number;
      metadata?: Record<string, any>;
    }>;
    totalCount: number;
    hasMore: boolean;
    searchStats: {
      filesSearched: number;
      totalLines: number;
      searchDuration: number;
    };
  }> {
    this.ensureInitialized();

    const startTime = Date.now();
    const config = {
      query: criteria.query || '',
      level: criteria.level?.toLowerCase(),
      timeRange: criteria.timeRange,
      limit: criteria.limit || 100,
      offset: criteria.offset || 0,
      includeArchived: criteria.includeArchived || false,
    };

    try {
      const { promises: fs } = await import('fs');
      const { dirname, join } = await import('path');

      const logDir = dirname(this.config.filePath);
      const entries: Array<{
        timestamp: Date;
        level: string;
        message: string;
        file: string;
        lineNumber: number;
        metadata?: Record<string, any>;
      }> = [];

      let filesSearched = 0;
      let totalLines = 0;

      // Get list of log files to search
      const filesToSearch: string[] = [];

      // Add current log files
      try {
        const files = await fs.readdir(logDir);
        for (const file of files) {
          if (file.endsWith('.log') || file.match(/\.log\.\d+$/)) {
            filesToSearch.push(join(logDir, file));
          }
        }
      } catch (error) {
        this.logger?.warn('Failed to read log directory for search', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Add archived files if requested
      if (config.includeArchived) {
        try {
          const archiveDir = join(logDir, 'archive');
          const archiveFiles = await fs.readdir(archiveDir);
          for (const file of archiveFiles) {
            if (file.endsWith('.gz') || file.endsWith('.br')) {
              filesToSearch.push(join(archiveDir, file));
            }
          }
        } catch {
          // Archive directory doesn't exist or can't be read - that's fine
        }
      }

      // Search through each file
      for (const filePath of filesToSearch) {
        try {
          let fileContent: string;
          filesSearched++;

          // Handle compressed files
          if (filePath.endsWith('.gz') || filePath.endsWith('.br')) {
            fileContent = await this.readCompressedFile(filePath);
          } else {
            fileContent = await fs.readFile(filePath, 'utf8');
          }

          const lines = fileContent.split('\n');
          totalLines += lines.length;

          // Parse each line
          for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber].trim();
            if (!line) continue;

            try {
              const logEntry = this.parseLogLine(
                line,
                filePath,
                lineNumber + 1,
              );
              if (!logEntry) continue;

              // Apply filters
              if (
                config.level &&
                logEntry.level.toLowerCase() !== config.level
              ) {
                continue;
              }

              if (config.timeRange) {
                const entryTime = logEntry.timestamp.getTime();
                const fromTime = config.timeRange.from.getTime();
                const toTime = config.timeRange.to.getTime();
                if (entryTime < fromTime || entryTime > toTime) {
                  continue;
                }
              }

              if (config.query) {
                const searchText =
                  `${logEntry.message} ${JSON.stringify(logEntry.metadata || {})}`.toLowerCase();
                if (!searchText.includes(config.query.toLowerCase())) {
                  continue;
                }
              }

              entries.push(logEntry);
            } catch (parseError) {
              // Skip malformed log lines
              continue;
            }
          }
        } catch (fileError) {
          this.logger?.warn('Failed to search log file', {
            file: filePath,
            error:
              fileError instanceof Error ? fileError.message : 'Unknown error',
          });
          continue;
        }
      }

      // Sort entries by timestamp (newest first)
      entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      const totalCount = entries.length;
      const paginatedEntries = entries.slice(
        config.offset,
        config.offset + config.limit,
      );
      const hasMore = config.offset + config.limit < totalCount;

      const searchDuration = Date.now() - startTime;

      const result = {
        entries: paginatedEntries,
        totalCount,
        hasMore,
        searchStats: {
          filesSearched,
          totalLines,
          searchDuration,
        },
      };

      this.logger?.info('Log search completed', {
        query: config.query,
        level: config.level,
        resultsFound: totalCount,
        searchDuration,
        filesSearched,
      });

      return result;
    } catch (error) {
      const errorMsg = `Log search failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.logger?.error(errorMsg);

      return {
        entries: [],
        totalCount: 0,
        hasMore: false,
        searchStats: {
          filesSearched: 0,
          totalLines: 0,
          searchDuration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Read compressed log file content
   */
  private async readCompressedFile(filePath: string): Promise<string> {
    const { promises: fs } = await import('fs');
    const zlib = await import('zlib');
    const { promisify } = await import('util');

    const fileContent = await fs.readFile(filePath);

    if (filePath.endsWith('.gz')) {
      const gunzip = promisify(zlib.gunzip);
      const decompressed = await gunzip(fileContent);
      return decompressed.toString('utf8');
    } else if (filePath.endsWith('.br')) {
      const brotliDecompress = promisify(zlib.brotliDecompress);
      const decompressed = await brotliDecompress(fileContent);
      return decompressed.toString('utf8');
    }

    return fileContent.toString('utf8');
  }

  /**
   * Parse a single log line into structured format
   */
  private parseLogLine(
    line: string,
    filePath: string,
    lineNumber: number,
  ): {
    timestamp: Date;
    level: string;
    message: string;
    file: string;
    lineNumber: number;
    metadata?: Record<string, any>;
  } | null {
    try {
      // Try to parse as JSON first (for JSON format logs)
      if (line.startsWith('{')) {
        const jsonLog = JSON.parse(line);
        return {
          timestamp: new Date(jsonLog.timestamp),
          level: jsonLog.level?.toLowerCase() || 'info',
          message: jsonLog.message || '',
          file: filePath,
          lineNumber,
          metadata: {
            processId: jsonLog.processId,
            correlationId: jsonLog.correlationId,
            args: jsonLog.args,
            ...jsonLog,
          },
        };
      }

      // Parse text format logs
      // Format: 2025-09-16T01:24:37.109Z [LEVEL][PID] Message
      const textMatch = line.match(
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[([^\]]+)\](?:\[(\d+)\])?\s+(.+)$/,
      );

      if (textMatch) {
        const [, timestamp, level, processId, message] = textMatch;
        return {
          timestamp: new Date(timestamp),
          level: level.toLowerCase(),
          message: message.trim(),
          file: filePath,
          lineNumber,
          ...(processId && { metadata: { processId: parseInt(processId) } }),
        };
      }

      // Fallback: try to extract basic info
      const basicMatch = line.match(
        /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/,
      );
      if (basicMatch) {
        const timestamp = new Date(basicMatch[1]);
        return {
          timestamp,
          level: 'info',
          message: line.replace(basicMatch[0], '').trim(),
          file: filePath,
          lineNumber,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Analyze logs with comprehensive statistics and pattern recognition
   */
  async analyzeLogs(timeRange?: { from: Date; to: Date }): Promise<{
    totalLogs: number;
    logsByLevel: {
      error: number;
      warn: number;
      info: number;
      debug: number;
    } & { [key: string]: number };
    timeRange: { earliest: Date; latest: Date };
    topMessages: Array<{
      message: string;
      count: number;
      level: string;
      lastSeen: Date;
    }>;
    errorPatterns: Array<{
      pattern: string;
      count: number;
      examples: string[];
    }>;
    performanceMetrics: {
      averageWriteTime: number;
      maxWriteTime: number;
      queueFullEvents: number;
      logFrequency: { hour: number; day: number; total: number };
    };
    fileStatistics: Array<{
      file: string;
      size: number;
      lineCount: number;
      firstEntry: Date | null;
      lastEntry: Date | null;
    }>;
    insights: {
      errorRate: number;
      warningRate: number;
      busiestHour: { hour: number; count: number };
      commonErrors: string[];
      recommendations: string[];
    };
  }> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      const { promises: fs } = await import('fs');
      const { dirname, join, basename } = await import('path');

      const logDir = dirname(this.config.filePath);

      // Initialize analysis data structures
      const logsByLevel: { [key: string]: number } = {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
      };

      const messageFrequency = new Map<
        string,
        { count: number; level: string; lastSeen: Date }
      >();
      const errorPatterns = new Map<
        string,
        { count: number; examples: string[] }
      >();
      const hourlyDistribution = Array(24).fill(0);
      const fileStatistics: Array<{
        file: string;
        size: number;
        lineCount: number;
        firstEntry: Date | null;
        lastEntry: Date | null;
      }> = [];

      let totalLogs = 0;
      let earliestTime = new Date();
      let latestTime = new Date(0);
      let totalWriteTime = 0;
      let maxWriteTime = 0;
      let writeTimeCount = 0;

      // Get all log files
      const files = await fs.readdir(logDir);
      const logFiles = files.filter(
        (file) => file.endsWith('.log') || file.match(/\.log\.\d+$/),
      );

      // Analyze each file
      for (const file of logFiles) {
        const filePath = join(logDir, file);
        let fileSize = 0;
        let lineCount = 0;
        let firstEntry: Date | null = null;
        let lastEntry: Date | null = null;

        try {
          const stat = await fs.stat(filePath);
          fileSize = stat.size;

          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n');
          lineCount = lines.length;

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const logEntry = this.parseLogLine(line, filePath, 0);
              if (!logEntry) continue;

              totalLogs++;

              // Apply time range filter if specified
              if (timeRange) {
                const entryTime = logEntry.timestamp.getTime();
                const fromTime = timeRange.from.getTime();
                const toTime = timeRange.to.getTime();
                if (entryTime < fromTime || entryTime > toTime) {
                  continue;
                }
              }

              // Update time boundaries
              if (!firstEntry || logEntry.timestamp < firstEntry) {
                firstEntry = logEntry.timestamp;
              }
              if (!lastEntry || logEntry.timestamp > lastEntry) {
                lastEntry = logEntry.timestamp;
              }

              if (logEntry.timestamp < earliestTime) {
                earliestTime = logEntry.timestamp;
              }
              if (logEntry.timestamp > latestTime) {
                latestTime = logEntry.timestamp;
              }

              // Count by level
              const level = logEntry.level.toLowerCase();
              logsByLevel[level] = (logsByLevel[level] || 0) + 1;

              // Track message frequency
              const messageKey = this.normalizeMessage(logEntry.message);
              const existing = messageFrequency.get(messageKey);
              if (existing) {
                existing.count++;
                existing.lastSeen = logEntry.timestamp;
              } else {
                messageFrequency.set(messageKey, {
                  count: 1,
                  level: logEntry.level,
                  lastSeen: logEntry.timestamp,
                });
              }

              // Analyze error patterns
              if (level === 'error') {
                const pattern = this.extractErrorPattern(logEntry.message);
                if (pattern) {
                  const existing = errorPatterns.get(pattern);
                  if (existing) {
                    existing.count++;
                    if (existing.examples.length < 3) {
                      existing.examples.push(logEntry.message);
                    }
                  } else {
                    errorPatterns.set(pattern, {
                      count: 1,
                      examples: [logEntry.message],
                    });
                  }
                }
              }

              // Track hourly distribution
              const hour = logEntry.timestamp.getHours();
              hourlyDistribution[hour]++;

              // Extract performance metrics from metadata
              if (logEntry.metadata?.writeStartTime) {
                const writeTime = Date.now() - logEntry.metadata.writeStartTime;
                totalWriteTime += writeTime;
                writeTimeCount++;
                maxWriteTime = Math.max(maxWriteTime, writeTime);
              }
            } catch (parseError) {
              // Skip malformed entries
              continue;
            }
          }

          fileStatistics.push({
            file: basename(filePath),
            size: fileSize,
            lineCount,
            firstEntry,
            lastEntry,
          });
        } catch (fileError) {
          this.logger?.warn('Failed to analyze log file', {
            file: filePath,
            error:
              fileError instanceof Error ? fileError.message : 'Unknown error',
          });
          continue;
        }
      }

      // Calculate metrics
      const averageWriteTime =
        writeTimeCount > 0 ? totalWriteTime / writeTimeCount : 0;
      const errorRate =
        totalLogs > 0 ? (logsByLevel.error / totalLogs) * 100 : 0;
      const warningRate =
        totalLogs > 0 ? (logsByLevel.warn / totalLogs) * 100 : 0;

      // Find busiest hour
      const busiestHourIndex = hourlyDistribution.indexOf(
        Math.max(...hourlyDistribution),
      );
      const busiestHour = {
        hour: busiestHourIndex,
        count: hourlyDistribution[busiestHourIndex],
      };

      // Calculate log frequency
      const timeSpanHours =
        totalLogs > 0
          ? (latestTime.getTime() - earliestTime.getTime()) / (1000 * 60 * 60)
          : 0;
      const logFrequency = {
        hour: timeSpanHours > 0 ? totalLogs / timeSpanHours : 0,
        day: timeSpanHours > 0 ? (totalLogs / timeSpanHours) * 24 : 0,
        total: totalLogs,
      };

      // Get top messages
      const topMessages = Array.from(messageFrequency.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([message, data]) => ({
          message,
          count: data.count,
          level: data.level,
          lastSeen: data.lastSeen,
        }));

      // Get error patterns
      const topErrorPatterns = Array.from(errorPatterns.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([pattern, data]) => ({
          pattern,
          count: data.count,
          examples: data.examples,
        }));

      // Generate insights and recommendations
      const commonErrors = topErrorPatterns.slice(0, 3).map((p) => p.pattern);
      const recommendations = this.generateRecommendations({
        errorRate,
        warningRate,
        totalLogs,
        logFrequency,
        fileStatistics,
      });

      const result = {
        totalLogs,
        logsByLevel: {
          error: logsByLevel.error || 0,
          warn: logsByLevel.warn || 0,
          info: logsByLevel.info || 0,
          debug: logsByLevel.debug || 0,
          ...logsByLevel,
        },
        timeRange: { earliest: earliestTime, latest: latestTime },
        topMessages,
        errorPatterns: topErrorPatterns,
        performanceMetrics: {
          averageWriteTime,
          maxWriteTime,
          queueFullEvents: 0, // TODO: Implement queue monitoring
          logFrequency,
        },
        fileStatistics,
        insights: {
          errorRate: Math.round(errorRate * 100) / 100,
          warningRate: Math.round(warningRate * 100) / 100,
          busiestHour,
          commonErrors,
          recommendations,
        },
      };

      const analysisDuration = Date.now() - startTime;
      this.logger?.info('Log analysis completed', {
        totalLogs,
        filesAnalyzed: logFiles.length,
        errorRate,
        analysisDuration,
      });

      return result;
    } catch (error) {
      const errorMsg = `Log analysis failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.logger?.error(errorMsg);

      // Return empty analysis on error
      return {
        totalLogs: 0,
        logsByLevel: { error: 0, warn: 0, info: 0, debug: 0 },
        timeRange: { earliest: new Date(), latest: new Date() },
        topMessages: [],
        errorPatterns: [],
        performanceMetrics: {
          averageWriteTime: 0,
          maxWriteTime: 0,
          queueFullEvents: 0,
          logFrequency: { hour: 0, day: 0, total: 0 },
        },
        fileStatistics: [],
        insights: {
          errorRate: 0,
          warningRate: 0,
          busiestHour: { hour: 0, count: 0 },
          commonErrors: [],
          recommendations: ['Log analysis failed - check log configuration'],
        },
      };
    }
  }

  /**
   * Normalize message for frequency analysis
   */
  private normalizeMessage(message: string): string {
    // Remove timestamps, IDs, and other variable parts
    return message
      .replace(
        /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/g,
        '[TIMESTAMP]',
      )
      .replace(
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
        '[UUID]',
      )
      .replace(/\b\d+\b/g, '[NUMBER]')
      .replace(/\/[^\s]+/g, '[PATH]')
      .trim();
  }

  /**
   * Extract error pattern from error message
   */
  private extractErrorPattern(message: string): string | null {
    // Extract common error patterns
    const patterns = [
      /Error: (.+?)(?:\s+at\s+|$)/,
      /(\w+Error): /,
      /Failed to (.+)/,
      /Cannot (.+)/,
      /Unable to (.+)/,
      /(.+) not found/,
      /Permission denied (.+)/,
      /Timeout (.+)/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    // Fallback: return first 50 characters
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  }

  /**
   * Generate insights and recommendations
   */
  private generateRecommendations(metrics: {
    errorRate: number;
    warningRate: number;
    totalLogs: number;
    logFrequency: { hour: number; day: number; total: number };
    fileStatistics: Array<{ size: number; lineCount: number }>;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.errorRate > 5) {
      recommendations.push(
        'High error rate detected - investigate error patterns and root causes',
      );
    }

    if (metrics.warningRate > 20) {
      recommendations.push(
        'High warning rate - consider reviewing warning conditions',
      );
    }

    if (metrics.logFrequency.hour > 1000) {
      recommendations.push(
        'High log frequency - consider adjusting log levels or implementing log sampling',
      );
    }

    const totalSize = metrics.fileStatistics.reduce(
      (sum, file) => sum + file.size,
      0,
    );
    if (totalSize > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push(
        'Large log files detected - enable log rotation and archival',
      );
    }

    if (metrics.totalLogs < 10) {
      recommendations.push(
        'Very few log entries - verify logging configuration is working correctly',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Log health appears normal - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Archive old log files with compression
   */
  async archiveLogs(options?: {
    maxAge?: string;
    compressionLevel?: number;
    archiveFormat?: 'gzip' | 'brotli';
    keepOriginals?: boolean;
  }): Promise<string[]> {
    this.ensureInitialized();

    const config = {
      maxAge: options?.maxAge || '30d',
      compressionLevel: options?.compressionLevel || 6,
      archiveFormat: options?.archiveFormat || 'gzip',
      keepOriginals: options?.keepOriginals || false,
    };

    try {
      const { promises: fs } = await import('fs');
      const { dirname, basename, extname, join } = await import('path');
      const zlib = await import('zlib');
      const { promisify } = await import('util');

      const logDir = dirname(this.config.filePath);
      const archiveDir = join(logDir, 'archive');
      const archivedFiles: string[] = [];

      // Ensure archive directory exists
      await fs.mkdir(archiveDir, { recursive: true });

      // Get max age in milliseconds
      const maxAgeMs = this.parseMaxAgeString(config.maxAge);
      const now = Date.now();

      // Find log files to archive
      const files = await fs.readdir(logDir);
      const logFiles = files.filter(
        (file) => file.endsWith('.log') || file.match(/\.log\.\d+$/),
      );

      for (const logFile of logFiles) {
        try {
          const logFilePath = join(logDir, logFile);
          const stat = await fs.stat(logFilePath);

          // Check if file is old enough to archive
          const fileAge = now - stat.mtime.getTime();
          if (fileAge < maxAgeMs) {
            continue;
          }

          // Skip if it's the current active log file
          if (logFilePath === this.config.filePath) {
            continue;
          }

          // Generate archive filename with timestamp
          const timestamp = stat.mtime.toISOString().replace(/[:.]/g, '-');
          const archiveBaseName = `${basename(logFile, extname(logFile))}_${timestamp}`;
          const archiveExtension =
            config.archiveFormat === 'gzip' ? '.gz' : '.br';
          const archiveFileName = `${archiveBaseName}${archiveExtension}`;
          const archiveFilePath = join(archiveDir, archiveFileName);

          // Read the log file
          const fileContent = await fs.readFile(logFilePath);

          // Compress the content
          let compressedContent: Buffer;
          if (config.archiveFormat === 'gzip') {
            const gzip = promisify(zlib.gzip);
            compressedContent = await gzip(fileContent, {
              level: config.compressionLevel,
            });
          } else {
            const brotliCompress = promisify(zlib.brotliCompress);
            compressedContent = await brotliCompress(fileContent, {
              params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: config.compressionLevel,
              },
            });
          }

          // Write compressed file
          await fs.writeFile(archiveFilePath, compressedContent);

          // Verify the compressed file was created successfully
          const archiveStat = await fs.stat(archiveFilePath);
          if (archiveStat.size > 0) {
            archivedFiles.push(archiveFileName);

            // Remove original file if not keeping originals
            if (!config.keepOriginals) {
              await fs.unlink(logFilePath);
            }

            this.logger?.info('Log file archived successfully', {
              originalFile: logFile,
              archiveFile: archiveFileName,
              originalSize: fileContent.length,
              compressedSize: compressedContent.length,
              compressionRatio: Math.round(
                ((fileContent.length - compressedContent.length) /
                  fileContent.length) *
                  100,
              ),
              format: config.archiveFormat,
            });
          }
        } catch (fileError) {
          this.logger?.warn('Failed to archive log file', {
            file: logFile,
            error:
              fileError instanceof Error ? fileError.message : 'Unknown error',
          });
          continue;
        }
      }

      if (archivedFiles.length > 0) {
        this.emit('archive:completed', {
          archivedFiles,
          archiveDir,
          config,
          timestamp: new Date(),
        });

        this.logger?.info('Log archival completed', {
          archivedCount: archivedFiles.length,
          archiveDir,
          format: config.archiveFormat,
        });
      }

      return archivedFiles;
    } catch (error) {
      const errorMsg = `Log archival failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.logger?.error(errorMsg);
      this.emit('archive:failed', { error: errorMsg, timestamp: new Date() });
      return [];
    }
  }

  /**
   * Parse max age string to milliseconds
   */
  private parseMaxAgeString(maxAge: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = maxAge.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(
        `Invalid max age format: ${maxAge}. Use format like '7d', '24h', '60m', '30s'`,
      );
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    return value * units[unit];
  }

  /**
   * Cleanup old logs
   */
  async cleanupOldLogs(): Promise<number> {
    this.ensureInitialized();

    if ('cleanupOldLogs' in this.strategy) {
      try {
        const cleanedFiles = await (this.strategy as any).cleanupOldLogs(
          this.config.maxAge || '7d',
        );

        if (cleanedFiles > 0) {
          this.emit('cleanup:completed', cleanedFiles);
          this.logger?.info(
            `Manual log cleanup completed: ${cleanedFiles} files removed`,
          );
        }

        return cleanedFiles;
      } catch (error) {
        this.logger?.error('Manual log cleanup failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return 0;
      }
    }

    // Strategy doesn't support cleanup
    return 0;
  }

  /**
   * Get buffer status information
   */
  getBufferStatus(): {
    size: number;
    maxSize: number;
    isBufferEnabled: boolean;
  } {
    const defaultStatus = {
      size: 0,
      maxSize: 0,
      isBufferEnabled: false,
    };

    // Return default status if not initialized
    if (!this.isInitialized) {
      return defaultStatus;
    }

    if ('getBufferSize' in this.strategy) {
      const bufferSize = (this.strategy as any).getBufferSize();

      // Try to get buffer configuration
      let maxSize = 0;
      let isEnabled = false;

      // Check if strategy has buffer configuration
      if ('config' in this.strategy) {
        const strategyConfig = (this.strategy as any).config;
        maxSize = strategyConfig?.bufferSize || 0;
        isEnabled = strategyConfig?.bufferEnabled || false;
      }

      return {
        size: bufferSize,
        maxSize,
        isBufferEnabled: isEnabled,
      };
    }

    return defaultStatus;
  }

  /**
   * Get comprehensive service status information
   */
  getStatus() {
    const bufferStatus = this.getBufferStatus();

    return {
      initialized: this.isInitialized,
      config: {
        autoMaintenance: this.config.autoMaintenance,
        maintenanceInterval: this.config.maintenanceInterval,
        enableHealthCheck: this.config.enableHealthCheck,
        healthCheckInterval: this.config.healthCheckInterval,
      },
      timers: {
        maintenance: !!this.maintenanceTimer,
        healthCheck: !!this.healthCheckTimer,
      },
      buffer: bufferStatus,
    };
  }

  private isHybridMode(): boolean {
    // Determine if we should use hybrid mode (console + file)
    return (
      process.env.NODE_ENV !== 'production' || this.config.format === 'text'
    );
  }

  private startMaintenanceScheduler(): void {
    this.maintenanceTimer = setInterval(async () => {
      try {
        await this.runMaintenance();
      } catch (error) {
        this.logger?.error('Scheduled maintenance failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, this.config.maintenanceInterval);

    // Unref the timer so it doesn't prevent Node.js from exiting
    this.maintenanceTimer.unref();

    this.logger?.debug('Maintenance scheduler started', {
      interval: this.config.maintenanceInterval,
    });
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        this.logger?.warn('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, this.config.healthCheckInterval);

    // Unref the timer so it doesn't prevent Node.js from exiting
    this.healthCheckTimer.unref();

    this.logger?.debug('Health monitoring started', {
      interval: this.config.healthCheckInterval,
    });
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'Log management service not initialized. Call initialize() first.',
      );
    }
  }
}

/**
 * Factory for creating log management service
 */
export class LogManagementServiceFactory {
  /**
   * Create a production-ready log management service
   */
  static createProductionService(
    config: Partial<LogManagementConfig> = {},
    logger?: ILogger,
  ): LogManagementService {
    const defaultConfig: LogManagementConfig = {
      filePath: join(process.cwd(), 'logs', 'md2pdf.log'),
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxBackupFiles: 10,
      format: 'json',
      enableRotation: true,
      async: true,
      autoMaintenance: true,
      maintenanceInterval: 2 * 60 * 60 * 1000, // 2 hours
      enableHealthCheck: true,
      healthCheckInterval: 10 * 60 * 1000, // 10 minutes
      ...config,
    };

    return new LogManagementService(defaultConfig, logger);
  }

  /**
   * Create a development-friendly log management service
   */
  static createDevelopmentService(
    config: Partial<LogManagementConfig> = {},
    logger?: ILogger,
  ): LogManagementService {
    const defaultConfig: LogManagementConfig = {
      filePath: join(process.cwd(), 'logs', 'dev.log'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxBackupFiles: 3,
      format: 'text',
      enableRotation: true,
      async: false, // Synchronous for easier debugging
      autoMaintenance: false,
      enableHealthCheck: false,
      ...config,
    };

    return new LogManagementService(defaultConfig, logger);
  }
}
