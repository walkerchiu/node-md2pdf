/**
 * Progress tracker for batch processing
 * Manages conversion progress and statistics
 */

import {
  BatchProgressInfo,
  BatchProgressEvent,
  SingleBatchResult,
  BatchError,
} from '../../types/batch';
import { EventEmitter } from 'events';

export class ProgressTracker extends EventEmitter {
  private progress: BatchProgressInfo;
  private processingTimes: number[] = [];
  private startTimes: Map<string, number> = new Map();

  constructor(totalFiles: number) {
    super();
    this.progress = {
      totalFiles,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      startTime: new Date(),
      averageProcessingTime: 0,
    };
  }

  /**
   * Mark batch processing as started
   */
  start(): void {
    this.progress.startTime = new Date();
    this.emitProgressEvent('start');
  }

  /**
   * Mark a file processing as started
   */
  startFile(filePath: string): void {
    this.startTimes.set(filePath, Date.now());
    this.progress.currentFile = filePath;
    this.emitProgressEvent('progress');
  }

  /**
   * Mark a file processing as completed successfully
   */
  completeFile(result: SingleBatchResult): void {
    this.progress.processedFiles++;
    this.progress.successfulFiles++;
    // Update processing time statistics
    const startTime = this.startTimes.get(result.inputPath);
    if (startTime) {
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      this.startTimes.delete(result.inputPath);
      this.updateAverageProcessingTime();
    }
    this.progress.currentFile = undefined;
    this.updateEstimatedTime();
    this.emitProgressEvent('file_complete');
  }

  /**
   * Mark a file processing as failed
   */
  failFile(error: BatchError): void {
    this.progress.processedFiles++;
    this.progress.failedFiles++;
    // Update processing time even for failed files
    const startTime = this.startTimes.get(error.inputPath);
    if (startTime) {
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      this.startTimes.delete(error.inputPath);
      this.updateAverageProcessingTime();
    }
    this.progress.currentFile = undefined;
    this.updateEstimatedTime();
    this.emitProgressEvent('file_error', undefined, error.error);
  }

  /**
   * Mark a file as skipped
   */
  skipFile(filePath: string): void {
    this.progress.processedFiles++;
    this.progress.skippedFiles++;
    this.startTimes.delete(filePath);
    this.progress.currentFile = undefined;
    this.updateEstimatedTime();
    this.emitProgressEvent('progress');
  }

  /**
   * Mark batch processing as completed
   */
  complete(): void {
    this.progress.currentFile = undefined;
    this.emitProgressEvent('complete');
  }

  /**
   * Get current progress information
   */
  getProgress(): BatchProgressInfo {
    return { ...this.progress };
  }

  /**
   * Get progress percentage (0-100)
   */
  getProgressPercentage(): number {
    if (this.progress.totalFiles === 0) return 100;
    return Math.round((this.progress.processedFiles / this.progress.totalFiles) * 100);
  }

  /**
   * Get remaining files count
   */
  getRemainingFiles(): number {
    return this.progress.totalFiles - this.progress.processedFiles;
  }

  /**
   * Get total processing time so far
   */
  getTotalProcessingTime(): number {
    return Date.now() - this.progress.startTime.getTime();
  }

  /**
   * Check if processing is complete
   */
  isComplete(): boolean {
    return this.progress.processedFiles >= this.progress.totalFiles;
  }

  /**
   * Reset progress (for retry scenarios)
   */
  reset(): void {
    this.progress = {
      totalFiles: this.progress.totalFiles,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      startTime: new Date(),
      averageProcessingTime: 0,
    };
    this.processingTimes = [];
    this.startTimes.clear();
  }

  /**
   * Update estimated remaining time
   */
  private updateEstimatedTime(): void {
    if (this.progress.averageProcessingTime > 0) {
      const remainingFiles = this.getRemainingFiles();
      this.progress.estimatedTimeRemaining = remainingFiles * this.progress.averageProcessingTime;
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(): void {
    if (this.processingTimes.length > 0) {
      const sum = this.processingTimes.reduce((a, b) => a + b, 0);
      this.progress.averageProcessingTime = Math.round(sum / this.processingTimes.length);
    }
  }

  /**
   * Emit progress event
   */
  private emitProgressEvent(
    type: BatchProgressEvent['type'],
    currentFile?: string,
    error?: BatchError['error']
  ): void {
    const event: BatchProgressEvent = {
      type,
      data: this.getProgress(),
      currentFile,
      error,
    };
    this.emit('progress', event);
  }

  /**
   * Format time duration in human readable format
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.progress.processedFiles === 0) return 0;
    return Math.round((this.progress.successfulFiles / this.progress.processedFiles) * 100);
  }

  /**
   * Get processing rate (files per minute)
   */
  getProcessingRate(): number {
    const totalTimeMinutes = this.getTotalProcessingTime() / (1000 * 60);
    if (totalTimeMinutes === 0) return 0;
    return Math.round(this.progress.processedFiles / totalTimeMinutes);
  }
}
