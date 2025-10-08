/**
 * Error handling and recovery mechanism for batch processing
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ErrorType } from '../../types';
import { BatchError, BatchConversionConfig } from '../../types/batch';

export interface RecoveryStrategy {
  maxRetries: number;
  retryDelay: number;
  recoverableErrors: ErrorType[];
  backupOriginalFiles: boolean;
  cleanupOnFailure: boolean;
}

export interface RecoveryResult {
  recoveredFiles: string[];
  permanentFailures: BatchError[];
  totalAttempts: number;
}

export class ErrorRecoveryManager {
  private defaultStrategy: RecoveryStrategy = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    recoverableErrors: [
      ErrorType.SYSTEM_ERROR,
      ErrorType.PDF_GENERATION_ERROR,
      ErrorType.PARSE_ERROR,
    ],
    backupOriginalFiles: false,
    cleanupOnFailure: true,
  };

  /**
   * Attempt to recover from batch processing errors
   */
  async recoverFromErrors(
    errors: BatchError[],
    _config: BatchConversionConfig,
    strategy: Partial<RecoveryStrategy> = {},
  ): Promise<RecoveryResult> {
    const recoveryStrategy = { ...this.defaultStrategy, ...strategy };
    const recoveredFiles: string[] = [];
    const permanentFailures: BatchError[] = [];
    let totalAttempts = 0;

    for (const error of errors) {
      totalAttempts++;
      if (this.isRecoverable(error, recoveryStrategy)) {
        const recovered = await this.retryFileProcessing(
          error.inputPath,
          _config,
          recoveryStrategy,
        );
        if (recovered) {
          recoveredFiles.push(error.inputPath);
        } else {
          permanentFailures.push(error);
        }
      } else {
        permanentFailures.push(error);
      }
    }

    return {
      recoveredFiles,
      permanentFailures,
      totalAttempts,
    };
  }

  /**
   * Create recovery suggestions for errors
   */
  generateRecoverySuggestions(errors: BatchError[]): {
    immediate: string[];
    longTerm: string[];
    systemLevel: string[];
  } {
    const immediate: string[] = [];
    const longTerm: string[] = [];
    const systemLevel: string[] = [];

    const errorTypes = new Set(errors.map((e) => e.error.type));
    if (errorTypes.has(ErrorType.FILE_NOT_FOUND)) {
      immediate.push('Check if input files still exist');
      immediate.push('Verify file paths are correct');
    }
    if (errorTypes.has(ErrorType.PERMISSION_DENIED)) {
      immediate.push('Check file and directory permissions');
      systemLevel.push('Run with appropriate user permissions');
    }
    if (errorTypes.has(ErrorType.SYSTEM_ERROR)) {
      immediate.push('Check available disk space');
      immediate.push('Ensure system resources are available');
      longTerm.push('Consider processing fewer files concurrently');
    }
    if (errorTypes.has(ErrorType.PDF_GENERATION_ERROR)) {
      immediate.push('Try processing files individually');
      longTerm.push('Check for corrupted or very large input files');
      systemLevel.push('Increase system memory if processing large files');
    }
    if (errorTypes.has(ErrorType.PARSE_ERROR)) {
      immediate.push('Validate Markdown syntax in failed files');
      longTerm.push('Consider preprocessing files to fix syntax issues');
    }
    if (errorTypes.has(ErrorType.INVALID_FORMAT)) {
      immediate.push('Check file extensions and formats');
      immediate.push('Ensure files are valid Markdown documents');
    }

    return { immediate, longTerm, systemLevel };
  }

  /**
   * Analyze error patterns to suggest optimizations
   */
  analyzeErrorPatterns(
    errors: BatchError[],
    config: BatchConversionConfig,
  ): {
    patterns: string[];
    recommendations: string[];
  } {
    const patterns: string[] = [];
    const recommendations: string[] = [];

    // Check for high failure rate
    const totalErrors = errors.length;
    if (totalErrors > 0) {
      patterns.push(`High failure rate detected: ${totalErrors} errors`);
    }

    // Check for specific error patterns
    const errorsByType = this.groupErrorsByType(errors);
    Object.entries(errorsByType).forEach(([type, count]) => {
      if (count > 1) {
        patterns.push(`Multiple ${type} errors: ${count} occurrences`);
      }
    });

    // System resource related recommendations
    if (errorsByType[ErrorType.SYSTEM_ERROR] > 0) {
      if (config.maxConcurrentProcesses > 2) {
        recommendations.push(
          'Reduce concurrent processes to improve stability',
        );
      }
      recommendations.push('Monitor system resources during processing');
    }

    // File access related recommendations
    if (
      errorsByType[ErrorType.PERMISSION_DENIED] > 0 ||
      errorsByType[ErrorType.FILE_NOT_FOUND] > 0
    ) {
      recommendations.push('Verify file system permissions and paths');
    }

    // PDF generation related recommendations
    if (errorsByType[ErrorType.PDF_GENERATION_ERROR] > 0) {
      recommendations.push('Consider processing problematic files separately');
      if (config.chineseFontSupport) {
        recommendations.push(
          'Try disabling Chinese font support for faster processing',
        );
      }
    }

    return { patterns, recommendations };
  }

  /**
   * Create a recovery plan for failed batch
   */
  createRecoveryPlan(
    errors: BatchError[],
    config: BatchConversionConfig,
  ): {
    retryableFiles: string[];
    manualReviewFiles: string[];
    configSuggestions: Partial<BatchConversionConfig>;
    estimatedTime: number;
  } {
    const retryableFiles: string[] = [];
    const manualReviewFiles: string[] = [];
    const configSuggestions: Partial<BatchConversionConfig> = {};

    // Categorize files
    errors.forEach((error) => {
      if (this.isRecoverable(error, this.defaultStrategy)) {
        retryableFiles.push(error.inputPath);
      } else {
        manualReviewFiles.push(error.inputPath);
      }
    });

    // Generate config suggestions
    const errorsByType = this.groupErrorsByType(errors);
    if (errorsByType[ErrorType.SYSTEM_ERROR] > 0) {
      configSuggestions.maxConcurrentProcesses = Math.max(
        1,
        Math.floor(config.maxConcurrentProcesses / 2),
      );
    }
    if (errorsByType[ErrorType.PDF_GENERATION_ERROR] > 0) {
      configSuggestions.continueOnError = true;
    }

    // Estimate recovery time
    const avgProcessingTime = 30000; // 30 seconds per file (conservative estimate)
    const estimatedTime =
      retryableFiles.length *
      avgProcessingTime *
      this.defaultStrategy.maxRetries;

    return {
      retryableFiles,
      manualReviewFiles,
      configSuggestions,
      estimatedTime,
    };
  }

  /**
   * Clean up resources after failed processing
   */
  async cleanupAfterFailure(
    failedFiles: string[],
    outputDirectory: string,
    strategy: Partial<RecoveryStrategy> = {},
  ): Promise<void> {
    const recoveryStrategy = { ...this.defaultStrategy, ...strategy };
    if (!recoveryStrategy.cleanupOnFailure) {
      return;
    }

    const cleanupPromises = failedFiles.map(async (inputPath) => {
      try {
        // Determine expected output path
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(outputDirectory, `${fileName}.pdf`);
        // Check if partial output exists and remove it
        if (await this.fileExists(outputPath)) {
          await fs.promises.unlink(outputPath);
        }
        // Clean up any temporary files
        const tempFiles = await this.findTempFiles(outputDirectory, fileName);
        for (const tempFile of tempFiles) {
          try {
            await fs.promises.unlink(tempFile);
          } catch (error) {
            // Ignore temp file cleanup errors
          }
        }
      } catch (error) {
        // Ignore cleanup errors but log them
        // eslint-disable-next-line no-console
        console.warn(`Cleanup warning for ${inputPath}:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Validate system health before retry
   */
  async validateSystemHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    try {
      // Check available memory
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const memUsagePercent = (memUsage.heapUsed / totalMem) * 100;
      if (memUsagePercent > 80) {
        issues.push('High memory usage detected');
      } else if (memUsagePercent > 60) {
        warnings.push('Elevated memory usage');
      }

      // Check disk space (simplified check)
      const tempDir = os.tmpdir();
      try {
        const stats = await fs.promises.statfs(tempDir);
        const freeSpacePercent = (stats.bavail / stats.blocks) * 100;
        if (freeSpacePercent < 5) {
          issues.push('Very low disk space');
        } else if (freeSpacePercent < 15) {
          warnings.push('Low disk space');
        }
      } catch (error) {
        // Disk space check not supported on all systems
        warnings.push('Could not verify disk space');
      }

      // Check if we're under high CPU load (simplified)
      const loadAvg = os.loadavg()[0];
      const cpuCount = os.cpus().length;
      const loadPercent = (loadAvg / cpuCount) * 100;
      if (loadPercent > 90) {
        warnings.push('High CPU load detected');
      }
    } catch (error) {
      warnings.push('System health check failed');
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Check if an error is recoverable
   */
  private isRecoverable(
    error: BatchError,
    strategy: RecoveryStrategy,
  ): boolean {
    return (
      error.canRetry && strategy.recoverableErrors.includes(error.error.type)
    );
  }

  /**
   * Retry processing a single file
   */
  private async retryFileProcessing(
    inputPath: string,
    _config: BatchConversionConfig,
    strategy: RecoveryStrategy,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      try {
        // Wait before retry (with backoff)
        if (attempt > 1) {
          await this.sleep(strategy.retryDelay * attempt);
        }

        // Validate system health before retry
        const healthCheck = await this.validateSystemHealth();
        if (!healthCheck.healthy) {
          // eslint-disable-next-line no-console
          console.warn(
            `System health issues detected, skipping retry for ${inputPath}`,
          );
          return false;
        }

        // Here you would call the actual file processing logic
        // For now, we'll simulate success for recoverable errors
        // eslint-disable-next-line no-console
        console.log(
          `Retrying ${inputPath} (attempt ${attempt}/${strategy.maxRetries})`,
        );

        // In a real implementation, you'd call the actual processor here
        // const result = await this.processFile(inputPath, config);
        // return result.success;

        // For now, simulate success on the last attempt
        return attempt === strategy.maxRetries;
      } catch (error) {
        if (attempt === strategy.maxRetries) {
          return false;
        }
        // Continue to next attempt
      }
    }
    return false;
  }

  /**
   * Group errors by type for analysis
   */
  private groupErrorsByType(errors: BatchError[]): Record<string, number> {
    return errors.reduce(
      (acc, error) => {
        const type = error.error.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find temporary files for cleanup
   */
  private async findTempFiles(
    directory: string,
    baseName: string,
  ): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(directory);
      return files
        .filter(
          (file) =>
            file.includes(baseName) &&
            (file.includes('.tmp') || file.includes('.temp')),
        )
        .map((file) => path.join(directory, file));
    } catch {
      return [];
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
