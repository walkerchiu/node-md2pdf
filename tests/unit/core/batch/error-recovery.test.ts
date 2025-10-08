/**
 * Comprehensive tests for ErrorRecoveryManager
 * Tests error recovery, analysis, cleanup, and system health validation
 */

import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ErrorRecoveryManager } from '../../../../src/core/batch/error-recovery';
import type { RecoveryStrategy } from '../../../../src/core/batch/error-recovery';
import type {
  BatchError,
  BatchConversionConfig,
  BatchFilenameFormat,
} from '../../../../src/types/batch';
import { ErrorType, MD2PDFError } from '../../../../src/types';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, prettier/prettier, indent */

// Mock all external dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    statfs: jest.fn(),
  },
  constants: {
    F_OK: 0,
  },
}));

jest.mock('path', () => ({
  basename: jest.fn(),
  extname: jest.fn(),
  join: jest.fn(),
}));

jest.mock('os', () => ({
  totalmem: jest.fn(),
  tmpdir: jest.fn(),
  loadavg: jest.fn(),
  cpus: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockOs = os as jest.Mocked<typeof os>;

describe('ErrorRecoveryManager', () => {
  let errorRecoveryManager: ErrorRecoveryManager;
  let mockConfig: BatchConversionConfig;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    jest.clearAllMocks();
    errorRecoveryManager = new ErrorRecoveryManager();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockConfig = {
      inputPattern: '*.md',
      outputDirectory: '/test/output',
      preserveDirectoryStructure: false,
      filenameFormat: 'original' as BatchFilenameFormat,
      maxConcurrentProcesses: 2,
      continueOnError: true,
      tocDepth: 3,
      includePageNumbers: true,
      chineseFontSupport: false,
    };

    // Setup default mocks
    mockPath.basename.mockImplementation((filePath: string, ext?: string) => {
      const name = filePath.split('/').pop() || '';
      return ext ? name.replace(ext, '') : name;
    });
    mockPath.extname.mockImplementation((filePath: string) => {
      const parts = filePath.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });
    mockPath.join.mockImplementation((...parts: string[]) => parts.join('/'));

    mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
    mockOs.tmpdir.mockReturnValue('/tmp');
    mockOs.loadavg.mockReturnValue([1, 1, 1]);
    mockOs.cpus.mockReturnValue([
      {
        model: 'Intel',
        speed: 2400,
        times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
      },
      {
        model: 'Intel',
        speed: 2400,
        times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
      },
      {
        model: 'Intel',
        speed: 2400,
        times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
      },
      {
        model: 'Intel',
        speed: 2400,
        times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
      },
    ] as unknown as os.CpuInfo[]);

    // Setup process.memoryUsage mock
    (
      process as unknown as { memoryUsage: () => NodeJS.MemoryUsage }
    ).memoryUsage = (): NodeJS.MemoryUsage => ({
      rss: 100 * 1024 * 1024,
      heapTotal: 50 * 1024 * 1024,
      heapUsed: 30 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      arrayBuffers: 1 * 1024 * 1024,
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create ErrorRecoveryManager instance with default strategy', () => {
      expect(errorRecoveryManager).toBeInstanceOf(ErrorRecoveryManager);
    });
  });

  describe('recoverFromErrors', () => {
    it('should handle empty error list', async () => {
      const result = await errorRecoveryManager.recoverFromErrors(
        [],
        mockConfig,
      );

      expect(result.recoveredFiles).toEqual([]);
      expect(result.permanentFailures).toEqual([]);
      expect(result.totalAttempts).toBe(0);
    });

    it('should categorize recoverable vs non-recoverable errors', async () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/recoverable.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
        {
          inputPath: '/test/non-recoverable.md',
          error: {
            type: ErrorType.INVALID_FORMAT,
            message: 'Invalid format',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: false,
        },
      ];

      const result = await errorRecoveryManager.recoverFromErrors(
        errors,
        mockConfig,
      );

      expect(result.totalAttempts).toBe(2);
      expect(result.permanentFailures).toHaveLength(2); // Both fail in mock
    });

    it('should use custom recovery strategy when provided', async () => {
      const customStrategy: Partial<RecoveryStrategy> = {
        maxRetries: 1,
        retryDelay: 500,
      };

      const errors: BatchError[] = [
        {
          inputPath: '/test/file.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const result = await errorRecoveryManager.recoverFromErrors(
        errors,
        mockConfig,
        customStrategy,
      );

      expect(result.totalAttempts).toBe(1);
      expect(result.recoveredFiles).toHaveLength(1); // Should succeed with maxRetries=1
    });

    it('should skip non-retryable errors', async () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/file.md',
          error: {
            type: ErrorType.PARSE_ERROR,
            message: 'Parse error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: false,
        },
      ];

      const result = await errorRecoveryManager.recoverFromErrors(
        errors,
        mockConfig,
      );

      expect(result.permanentFailures).toHaveLength(1);
      expect(result.recoveredFiles).toHaveLength(0);
      expect(result.totalAttempts).toBe(1);
    });
  });

  describe('generateRecoverySuggestions', () => {
    it('should generate suggestions for FILE_NOT_FOUND errors', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/missing.md',
          error: {
            type: ErrorType.FILE_NOT_FOUND,
            message: 'File not found',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const suggestions =
        errorRecoveryManager.generateRecoverySuggestions(errors);

      expect(suggestions.immediate).toContain(
        'Check if input files still exist',
      );
      expect(suggestions.immediate).toContain('Verify file paths are correct');
    });

    it('should generate suggestions for PERMISSION_DENIED errors', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/protected.md',
          error: {
            type: ErrorType.PERMISSION_DENIED,
            message: 'Permission denied',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const suggestions =
        errorRecoveryManager.generateRecoverySuggestions(errors);

      expect(suggestions.immediate).toContain(
        'Check file and directory permissions',
      );
      expect(suggestions.systemLevel).toContain(
        'Run with appropriate user permissions',
      );
    });

    it('should generate suggestions for SYSTEM_ERROR errors', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/file.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const suggestions =
        errorRecoveryManager.generateRecoverySuggestions(errors);

      expect(suggestions.immediate).toContain('Check available disk space');
      expect(suggestions.immediate).toContain(
        'Ensure system resources are available',
      );
      expect(suggestions.longTerm).toContain(
        'Consider processing fewer files concurrently',
      );
    });

    it('should generate suggestions for PDF_GENERATION_ERROR', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/complex.md',
          error: {
            type: ErrorType.PDF_GENERATION_ERROR,
            message: 'PDF generation failed',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const suggestions =
        errorRecoveryManager.generateRecoverySuggestions(errors);

      expect(suggestions.immediate).toContain(
        'Try processing files individually',
      );
      expect(suggestions.longTerm).toContain(
        'Check for corrupted or very large input files',
      );
      expect(suggestions.systemLevel).toContain(
        'Increase system memory if processing large files',
      );
    });

    it('should handle multiple error types', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/file1.md',
          error: {
            type: ErrorType.PARSE_ERROR,
            message: 'Parse error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
        {
          inputPath: '/test/file2.md',
          error: {
            type: ErrorType.INVALID_FORMAT,
            message: 'Invalid format',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const suggestions =
        errorRecoveryManager.generateRecoverySuggestions(errors);

      expect(suggestions.immediate).toContain(
        'Validate Markdown syntax in failed files',
      );
      expect(suggestions.immediate).toContain(
        'Check file extensions and formats',
      );
    });
  });

  describe('analyzeErrorPatterns', () => {
    it('should analyze error patterns and provide recommendations', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/file1.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
        {
          inputPath: '/test/file2.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const analysis = errorRecoveryManager.analyzeErrorPatterns(
        errors,
        mockConfig,
      );

      expect(analysis.patterns).toContain(
        'High failure rate detected: 2 errors',
      );
      expect(analysis.patterns).toContain(
        'Multiple SYSTEM_ERROR errors: 2 occurrences',
      );
      expect(analysis.recommendations).toContain(
        'Monitor system resources during processing',
      );
    });

    it('should recommend reducing concurrent processes for system errors', () => {
      const highConcurrencyConfig = {
        ...mockConfig,
        maxConcurrentProcesses: 8,
      };

      const errors: BatchError[] = [
        {
          inputPath: '/test/file.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const analysis = errorRecoveryManager.analyzeErrorPatterns(
        errors,
        highConcurrencyConfig,
      );

      expect(analysis.recommendations).toContain(
        'Reduce concurrent processes to improve stability',
      );
    });

    it('should provide file permission recommendations', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/file.md',
          error: {
            type: ErrorType.PERMISSION_DENIED,
            message: 'Permission denied',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const analysis = errorRecoveryManager.analyzeErrorPatterns(
        errors,
        mockConfig,
      );

      expect(analysis.recommendations).toContain(
        'Verify file system permissions and paths',
      );
    });

    it('should suggest Chinese font optimization for PDF errors', () => {
      const configWithChinese = {
        ...mockConfig,
        chineseFontSupport: true,
      };

      const errors: BatchError[] = [
        {
          inputPath: '/test/chinese.md',
          error: {
            type: ErrorType.PDF_GENERATION_ERROR,
            message: 'PDF generation failed',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const analysis = errorRecoveryManager.analyzeErrorPatterns(
        errors,
        configWithChinese,
      );

      expect(analysis.recommendations).toContain(
        'Try disabling Chinese font support for faster processing',
      );
    });
  });

  describe('createRecoveryPlan', () => {
    it('should create comprehensive recovery plan', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/recoverable.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
        {
          inputPath: '/test/manual.md',
          error: {
            type: ErrorType.INVALID_FORMAT,
            message: 'Invalid format',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: false,
        },
      ];

      const plan = errorRecoveryManager.createRecoveryPlan(errors, mockConfig);

      expect(plan.retryableFiles).toContain('/test/recoverable.md');
      expect(plan.manualReviewFiles).toContain('/test/manual.md');
      expect(plan.configSuggestions.maxConcurrentProcesses).toBe(1); // Half of 2
      expect(plan.estimatedTime).toBeGreaterThan(0);
    });

    it('should suggest continue on error for PDF generation errors', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/pdf.md',
          error: {
            type: ErrorType.PDF_GENERATION_ERROR,
            message: 'PDF failed',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const plan = errorRecoveryManager.createRecoveryPlan(errors, mockConfig);

      expect(plan.configSuggestions.continueOnError).toBe(true);
    });

    it('should calculate estimated recovery time', () => {
      const errors: BatchError[] = Array.from({ length: 5 }, (_, i) => ({
        inputPath: `/test/file${i}.md`,
        error: {
          type: ErrorType.SYSTEM_ERROR,
          message: 'System error',
          name: 'MD2PDFError',
        } as MD2PDFError,
        canRetry: true,
      }));

      const plan = errorRecoveryManager.createRecoveryPlan(errors, mockConfig);

      expect(plan.estimatedTime).toBe(5 * 30000 * 3); // 5 files * 30s * 3 retries
      expect(plan.retryableFiles).toHaveLength(5);
    });
  });

  describe('cleanupAfterFailure', () => {
    it('should clean up output files and temp files', async () => {
      mockFs.promises.access.mockResolvedValue(undefined); // Files exist
      mockFs.promises.unlink.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFs.promises.readdir.mockResolvedValue([
        'file.tmp',
        'file.temp',
        'other.pdf',
      ] as any);

      const failedFiles = ['/input/file.md'];

      await errorRecoveryManager.cleanupAfterFailure(failedFiles, '/output');

      expect(mockPath.basename).toHaveBeenCalledWith('/input/file.md', '.md');
      expect(mockPath.join).toHaveBeenCalledWith('/output', 'file.pdf');
      expect(mockFs.promises.unlink).toHaveBeenCalled();
    });

    it('should skip cleanup when strategy disabled', async () => {
      const strategy = { cleanupOnFailure: false };
      const failedFiles = ['/input/file.md'];

      await errorRecoveryManager.cleanupAfterFailure(
        failedFiles,
        '/output',
        strategy,
      );

      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.promises.access.mockResolvedValue(undefined);
      mockFs.promises.unlink.mockRejectedValue(new Error('Cleanup failed'));
      mockFs.promises.readdir.mockResolvedValue([]);

      const failedFiles = ['/input/file.md'];

      await expect(
        errorRecoveryManager.cleanupAfterFailure(failedFiles, '/output'),
      ).resolves.not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cleanup warning for /input/file.md:',
        expect.any(Error),
      );
    });

    it('should handle temp file discovery errors', async () => {
      mockFs.promises.access.mockResolvedValue(undefined);
      mockFs.promises.unlink.mockResolvedValue(undefined);
      mockFs.promises.readdir.mockRejectedValue(
        new Error('Cannot read directory'),
      );

      const failedFiles = ['/input/file.md'];

      await expect(
        errorRecoveryManager.cleanupAfterFailure(failedFiles, '/output'),
      ).resolves.not.toThrow();
    });
  });

  describe('validateSystemHealth', () => {
    it('should report healthy system', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFs.promises.statfs.mockResolvedValue({
        bavail: 80,
        blocks: 100,
      } as any);

      const health = await errorRecoveryManager.validateSystemHealth();

      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
      expect(health.warnings).toHaveLength(0);
    });

    it('should detect high memory usage', async () => {
      // Mock high memory usage
      (process as any).memoryUsage = (): NodeJS.MemoryUsage => ({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 7 * 1024 * 1024 * 1024, // 7GB used
        external: 5 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
      });

      const health = await errorRecoveryManager.validateSystemHealth();

      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('High memory usage detected');
    });

    it('should detect elevated memory usage warning', async () => {
      (process as any).memoryUsage = (): NodeJS.MemoryUsage => ({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 5 * 1024 * 1024 * 1024, // 5GB used (62.5%)
        external: 5 * 1024 * 1024,
        arrayBuffers: 1 * 1024 * 1024,
      });

      const health = await errorRecoveryManager.validateSystemHealth();

      expect(health.healthy).toBe(true);
      expect(health.warnings).toContain('Elevated memory usage');
    });

    it('should detect low disk space', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFs.promises.statfs.mockResolvedValue({
        bavail: 3, // 3% free
        blocks: 100,
      } as any);

      const health = await errorRecoveryManager.validateSystemHealth();

      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Very low disk space');
    });

    it('should detect high CPU load', async () => {
      mockOs.loadavg.mockReturnValue([4, 3, 2]); // Load of 4 on 4 cores = 100%
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockOs.cpus.mockReturnValue([
        {
          model: 'Intel',
          speed: 2400,
          times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
        },
        {
          model: 'Intel',
          speed: 2400,
          times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
        },
        {
          model: 'Intel',
          speed: 2400,
          times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
        },
        {
          model: 'Intel',
          speed: 2400,
          times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
        },
      ] as unknown as os.CpuInfo[]);

      const health = await errorRecoveryManager.validateSystemHealth();

      expect(health.warnings).toContain('High CPU load detected');
    });

    it('should handle statfs not supported', async () => {
      mockFs.promises.statfs.mockRejectedValue(new Error('Not supported'));

      const health = await errorRecoveryManager.validateSystemHealth();

      expect(health.warnings).toContain('Could not verify disk space');
    });

    it('should handle system health check failure', async () => {
      // Mock a general error in system health check
      mockOs.totalmem.mockImplementation(() => {
        throw new Error('System error');
      });

      const health = await errorRecoveryManager.validateSystemHealth();

      expect(health.warnings).toContain('System health check failed');
    });
  });

  describe('private methods integration', () => {
    it('should correctly identify recoverable errors', async () => {
      const recoverableError: BatchError = {
        inputPath: '/test/recoverable.md',
        error: {
          type: ErrorType.SYSTEM_ERROR,
          message: 'System error',
          name: 'MD2PDFError',
        } as MD2PDFError,
        canRetry: true,
      };

      const nonRecoverableError: BatchError = {
        inputPath: '/test/non-recoverable.md',
        error: {
          type: ErrorType.INVALID_FORMAT,
          message: 'Invalid format',
          name: 'MD2PDFError',
        } as MD2PDFError,
        canRetry: false,
      };

      const result1 = await errorRecoveryManager.recoverFromErrors(
        [recoverableError],
        mockConfig,
      );
      const result2 = await errorRecoveryManager.recoverFromErrors(
        [nonRecoverableError],
        mockConfig,
      );

      expect(result1.permanentFailures).toHaveLength(1); // Still fails in mock environment
      expect(result2.permanentFailures).toHaveLength(1); // Should fail immediately
    });

    it('should handle retry with system health validation', async () => {
      // Mock unhealthy system
      mockOs.totalmem.mockReturnValue(1024 * 1024 * 1024); // 1GB
      (process.memoryUsage as unknown as () => NodeJS.MemoryUsage) = jest
        .fn()
        .mockReturnValue({
          rss: 100 * 1024 * 1024,
          heapTotal: 50 * 1024 * 1024,
          heapUsed: 900 * 1024 * 1024, // 90% of 1GB
          external: 5 * 1024 * 1024,
          arrayBuffers: 1 * 1024 * 1024,
        }) as unknown as () => NodeJS.MemoryUsage;

      const error: BatchError = {
        inputPath: '/test/file.md',
        error: {
          type: ErrorType.SYSTEM_ERROR,
          message: 'System error',
          name: 'MD2PDFError',
        } as MD2PDFError,
        canRetry: true,
      };

      const result = await errorRecoveryManager.recoverFromErrors(
        [error],
        mockConfig,
      );

      expect(result.permanentFailures).toHaveLength(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'System health issues detected, skipping retry for /test/file.md',
        ),
      );
    });

    it('should group errors by type correctly', () => {
      const errors: BatchError[] = [
        {
          inputPath: '/test/file1.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
        {
          inputPath: '/test/file2.md',
          error: {
            type: ErrorType.SYSTEM_ERROR,
            message: 'System error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
        {
          inputPath: '/test/file3.md',
          error: {
            type: ErrorType.PARSE_ERROR,
            message: 'Parse error',
            name: 'MD2PDFError',
          } as MD2PDFError,
          canRetry: true,
        },
      ];

      const analysis = errorRecoveryManager.analyzeErrorPatterns(
        errors,
        mockConfig,
      );

      expect(analysis.patterns).toContain(
        'Multiple SYSTEM_ERROR errors: 2 occurrences',
      );
    });

    it('should handle file existence check', async () => {
      mockFs.promises.access.mockResolvedValue(undefined);
      const failedFiles = ['/input/existing.md'];

      await errorRecoveryManager.cleanupAfterFailure(failedFiles, '/output');

      expect(mockFs.promises.access).toHaveBeenCalledWith(
        '/output/existing.pdf',
        0,
      );
    });
  });
});
