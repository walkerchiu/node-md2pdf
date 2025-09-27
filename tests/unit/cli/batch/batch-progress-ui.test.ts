/**
 * Unit tests for BatchProgressUI
 */

import { jest } from '@jest/globals';
import { BatchProgressUI } from '../../../../src/cli/batch/batch-progress-ui';

// Mock dependencies
jest.mock('chalk', () => ({
  cyan: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  bold: jest.fn((text: string) => text),
}));

const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  text: '',
};

jest.mock('ora', () => jest.fn(() => mockSpinner));

describe('BatchProgressUI', () => {
  let progressUI: BatchProgressUI;
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
    progressUI = new BatchProgressUI();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with ora spinner', async () => {
      expect(progressUI).toBeInstanceOf(BatchProgressUI);
      const { default: ora } = await import('ora');
      expect(ora).toHaveBeenCalled();
    });
  });

  describe('start method', () => {
    it('should start spinner with correct message', () => {
      progressUI.start(5);

      expect(mockSpinner.start).toHaveBeenCalledWith('🚀 Starting batch conversion of 5 files...');
    });
  });

  describe('stop method', () => {
    it('should stop the spinner', () => {
      progressUI.stop();
      expect(mockSpinner.stop).toHaveBeenCalled();
    });
  });

  describe('displayResults method', () => {
    it('should display successful batch results without errors', () => {
      const successResults = {
        success: true,
        totalFiles: 5,
        successfulFiles: 5,
        failedFiles: 0,
        skippedFiles: 0,
        processingTime: 15000,
        results: [],
        errors: [],
      };

      expect(() => progressUI.displayResults(successResults)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should display partial success results without errors', () => {
      const partialResults = {
        success: true,
        totalFiles: 5,
        successfulFiles: 3,
        failedFiles: 2,
        skippedFiles: 0,
        processingTime: 12000,
        results: [],
        errors: [
          { inputPath: 'error1.md', error: { ...new Error('File not found'), type: 'FILE_ERROR' }, canRetry: true },
          { inputPath: 'error2.md', error: { ...new Error('Permission denied'), type: 'PERMISSION_ERROR' }, canRetry: false },
        ],
      };

      expect(() => progressUI.displayResults(partialResults as any)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSpinner.warn).toHaveBeenCalled();
    });

    it('should display failure results without errors', () => {
      const failureResults = {
        success: false,
        totalFiles: 5,
        successfulFiles: 0,
        failedFiles: 5,
        skippedFiles: 0,
        processingTime: 5000,
        results: [],
        errors: [{ inputPath: 'error.md', error: { ...new Error('Critical error'), type: 'CRITICAL_ERROR' }, canRetry: false }],
      };

      expect(() => progressUI.displayResults(failureResults as any)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSpinner.fail).toHaveBeenCalled();
    });
  });

  describe('updateProgress method', () => {
    it('should handle start event', () => {
      const startData = {
        totalFiles: 5,
        processedFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        skippedFiles: 0,
        startTime: new Date(),
        averageProcessingTime: 0,
        estimatedTimeRemaining: 30000,
      };
      const startEvent = { type: 'start' as const, data: startData };

      expect(() => progressUI.updateProgress(startEvent)).not.toThrow();
    });

    it('should handle progress event', () => {
      const progressData = {
        totalFiles: 5,
        processedFiles: 3,
        successfulFiles: 2,
        failedFiles: 1,
        skippedFiles: 0,
        startTime: new Date(),
        averageProcessingTime: 1000,
        currentFile: 'test.md',
      };
      const progressEvent = { type: 'progress' as const, data: progressData };

      expect(() => progressUI.updateProgress(progressEvent)).not.toThrow();
    });

    it('should handle complete event', () => {
      const completeData = {
        totalFiles: 5,
        processedFiles: 5,
        successfulFiles: 5,
        failedFiles: 0,
        skippedFiles: 0,
        startTime: new Date(),
        averageProcessingTime: 1000,
      };
      const completeEvent = { type: 'complete' as const, data: completeData };

      expect(() => progressUI.updateProgress(completeEvent)).not.toThrow();
    });
  });
});
