/**
 * Tests for ProgressTracker
 */

import { ProgressTracker } from '../../../../src/core/batch/progress-tracker';
import { SingleBatchResult, BatchError } from '../../../../src/types/batch';
import { ErrorType } from '../../../../src/types';

describe('ProgressTracker', () => {
  let progressTracker: ProgressTracker;
  const totalFiles = 5;

  beforeEach(() => {
    progressTracker = new ProgressTracker(totalFiles);
  });

  describe('initialization', () => {
    test('should initialize with correct total files', () => {
      const progress = progressTracker.getProgress();
      expect(progress.totalFiles).toBe(totalFiles);
      expect(progress.processedFiles).toBe(0);
      expect(progress.successfulFiles).toBe(0);
      expect(progress.failedFiles).toBe(0);
      expect(progress.skippedFiles).toBe(0);
    });
  });

  describe('progress tracking', () => {
    test('should track file processing start', () => {
      const filePath = '/test/file1.md';
      progressTracker.startFile(filePath);
      const progress = progressTracker.getProgress();
      expect(progress.currentFile).toBe(filePath);
    });
    test('should track successful file completion', () => {
      const result: SingleBatchResult = {
        inputPath: '/test/file1.md',
        outputPath: '/test/file1.pdf',
        success: true,
        processingTime: 1000,
      };
      progressTracker.startFile(result.inputPath);
      progressTracker.completeFile(result);
      const progress = progressTracker.getProgress();
      expect(progress.processedFiles).toBe(1);
      expect(progress.successfulFiles).toBe(1);
      expect(progress.failedFiles).toBe(0);
      expect(progress.currentFile).toBeUndefined();
    });
    test('should track failed file processing', () => {
      const error: BatchError = {
        inputPath: '/test/file1.md',
        error: {
          name: 'TestError',
          message: 'Test error',
          type: ErrorType.PARSE_ERROR,
        },
        canRetry: true,
      };
      progressTracker.startFile(error.inputPath);
      progressTracker.failFile(error);
      const progress = progressTracker.getProgress();
      expect(progress.processedFiles).toBe(1);
      expect(progress.successfulFiles).toBe(0);
      expect(progress.failedFiles).toBe(1);
      expect(progress.currentFile).toBeUndefined();
    });
    test('should track skipped files', () => {
      const filePath = '/test/file1.md';
      progressTracker.skipFile(filePath);
      const progress = progressTracker.getProgress();
      expect(progress.processedFiles).toBe(1);
      expect(progress.skippedFiles).toBe(1);
    });
  });

  describe('progress calculations', () => {
    test('should calculate progress percentage correctly', () => {
      expect(progressTracker.getProgressPercentage()).toBe(0);
      progressTracker.skipFile('/test/file1.md');
      expect(progressTracker.getProgressPercentage()).toBe(20); // 1/5 * 100
      progressTracker.skipFile('/test/file2.md');
      expect(progressTracker.getProgressPercentage()).toBe(40); // 2/5 * 100
    });
    test('should calculate remaining files correctly', () => {
      expect(progressTracker.getRemainingFiles()).toBe(5);
      progressTracker.skipFile('/test/file1.md');
      expect(progressTracker.getRemainingFiles()).toBe(4);
      progressTracker.skipFile('/test/file2.md');
      expect(progressTracker.getRemainingFiles()).toBe(3);
    });
    test('should track completion status', () => {
      expect(progressTracker.isComplete()).toBe(false);
      // Process all files
      for (let i = 1; i <= totalFiles; i++) {
        progressTracker.skipFile(`/test/file${i}.md`);
      }
      expect(progressTracker.isComplete()).toBe(true);
    });
  });

  describe('time tracking', () => {
    test('should track average processing time', async () => {
      const result1: SingleBatchResult = {
        inputPath: '/test/file1.md',
        outputPath: '/test/file1.pdf',
        success: true,
        processingTime: 1000,
      };
      const result2: SingleBatchResult = {
        inputPath: '/test/file2.md',
        outputPath: '/test/file2.pdf',
        success: true,
        processingTime: 2000,
      };
      progressTracker.startFile(result1.inputPath);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      progressTracker.completeFile(result1);
      progressTracker.startFile(result2.inputPath);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      progressTracker.completeFile(result2);
      const progress = progressTracker.getProgress();
      expect(progress.averageProcessingTime).toBeGreaterThan(0);
    });
    test('should estimate remaining time', async () => {
      const result: SingleBatchResult = {
        inputPath: '/test/file1.md',
        outputPath: '/test/file1.pdf',
        success: true,
        processingTime: 1000,
      };
      progressTracker.startFile(result.inputPath);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      progressTracker.completeFile(result);
      const progress = progressTracker.getProgress();
      expect(progress.estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });

  describe('success rate calculation', () => {
    test('should calculate success rate correctly', () => {
      expect(progressTracker.getSuccessRate()).toBe(0);
      // Complete one successfully
      const successResult: SingleBatchResult = {
        inputPath: '/test/file1.md',
        outputPath: '/test/file1.pdf',
        success: true,
        processingTime: 1000,
      };
      progressTracker.completeFile(successResult);
      expect(progressTracker.getSuccessRate()).toBe(100);
      // Fail one
      const error: BatchError = {
        inputPath: '/test/file2.md',
        error: {
          name: 'TestError',
          message: 'Test error',
          type: ErrorType.PARSE_ERROR,
        },
        canRetry: true,
      };
      progressTracker.failFile(error);
      expect(progressTracker.getSuccessRate()).toBe(50); // 1/2 * 100
    });
  });

  describe('reset functionality', () => {
    test('should reset progress correctly', () => {
      // Process some files first
      progressTracker.skipFile('/test/file1.md');
      progressTracker.skipFile('/test/file2.md');
      let progress = progressTracker.getProgress();
      expect(progress.processedFiles).toBe(2);
      // Reset
      progressTracker.reset();
      progress = progressTracker.getProgress();
      expect(progress.processedFiles).toBe(0);
      expect(progress.successfulFiles).toBe(0);
      expect(progress.failedFiles).toBe(0);
      expect(progress.skippedFiles).toBe(0);
      expect(progress.totalFiles).toBe(totalFiles); // Should preserve total
    });
  });

  describe('event emission', () => {
    test('should emit progress events', (done) => {
      let eventCount = 0;
      progressTracker.on('progress', (event) => {
        eventCount++;
        expect(event.type).toBeDefined();
        expect(event.data).toBeDefined();
        if (eventCount === 2) {
          done();
        }
      });
      progressTracker.start();
      progressTracker.startFile('/test/file1.md');
    });
  });

  describe('duration formatting', () => {
    test('should format duration correctly', () => {
      expect(progressTracker.formatDuration(1000)).toBe('1s');
      expect(progressTracker.formatDuration(61000)).toBe('1m 1s');
      expect(progressTracker.formatDuration(3661000)).toBe('1h 1m 1s');
    });
  });

  describe('processing rate calculation', () => {
    test('should calculate processing rate correctly', async () => {
      // Initial rate should be 0
      expect(progressTracker.getProcessingRate()).toBe(0);
      // Complete a few files with some delay
      progressTracker.start();
      const result1: SingleBatchResult = {
        inputPath: '/test/file1.md',
        outputPath: '/test/file1.pdf',
        success: true,
        processingTime: 1000,
      };
      progressTracker.startFile(result1.inputPath);
      await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
      progressTracker.completeFile(result1);
      const result2: SingleBatchResult = {
        inputPath: '/test/file2.md',
        outputPath: '/test/file2.pdf',
        success: true,
        processingTime: 1500,
      };
      progressTracker.startFile(result2.inputPath);
      await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
      progressTracker.completeFile(result2);
      // Should now have a positive processing rate
      const rate = progressTracker.getProcessingRate();
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    test('should handle zero total files for progress percentage', () => {
      const emptyTracker = new ProgressTracker(0);
      expect(emptyTracker.getProgressPercentage()).toBe(100);
    });
    test('should handle complete without setting current file', () => {
      progressTracker.complete();
      const progress = progressTracker.getProgress();
      expect(progress.currentFile).toBeUndefined();
    });
    test('should handle getTotalProcessingTime correctly', () => {
      progressTracker.start();
      const time1 = progressTracker.getTotalProcessingTime();
      expect(time1).toBeGreaterThanOrEqual(0);
      // Wait a bit and check again
      setTimeout(() => {
        const time2 = progressTracker.getTotalProcessingTime();
        expect(time2).toBeGreaterThan(time1);
      }, 10);
    });
    test('should handle processing rate when no time has elapsed', () => {
      const newTracker = new ProgressTracker(5);
      // Immediately get processing rate without any processing
      expect(newTracker.getProcessingRate()).toBe(0);
    });
  });
});
