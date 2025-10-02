/**
 * Batch processing progress UI
 * Handles visual feedback for batch operations
 */

/* eslint-disable no-console */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import {
  BatchProgressEvent,
  BatchProgressInfo,
  SingleBatchResult,
  BatchError,
} from '../../types/batch';

type DisplayErrorShape = { message?: string; suggestions?: string[] };

export class BatchProgressUI {
  private spinner: Ora;
  private lastUpdateTime = 0;
  private updateInterval = 500; // Update every 500ms

  constructor() {
    this.spinner = ora();
  }

  /**
   * Start progress display
   */
  start(totalFiles: number): void {
    this.spinner.start(chalk.cyan(`🚀 Starting batch conversion of ${totalFiles} files...`));
  }

  /**
   * Update progress display
   */
  updateProgress(event: BatchProgressEvent): void {
    const now = Date.now();

    // Throttle updates to avoid overwhelming the console
    if (now - this.lastUpdateTime < this.updateInterval && event.type !== 'complete') {
      return;
    }
    this.lastUpdateTime = now;

    switch (event.type) {
      case 'start':
        this.handleStart(event.data);
        break;
      case 'progress':
        this.handleProgress(event.data);
        break;
      case 'file_complete':
        this.handleFileComplete(event.data, event.currentFile);
        break;
      case 'file_error':
        this.handleFileError(event.data, event.currentFile, event.error);
        break;
      case 'complete':
        this.handleComplete(event.data);
        break;
    }
  }

  /**
   * Display file preview
   */
  displayFilePreview(files: string[], maxDisplay = 10): void {
    console.log(chalk.cyan('\n📁 Files to be processed:'));
    console.log(chalk.gray('─'.repeat(60)));
    const displayFiles = files.slice(0, maxDisplay);
    displayFiles.forEach((file, index) => {
      const shortPath = this.shortenPath(file);
      console.log(chalk.gray(`  ${index + 1}. `) + chalk.white(shortPath));
    });
    if (files.length > maxDisplay) {
      const remaining = files.length - maxDisplay;
      console.log(chalk.gray(`  ... and ${remaining} more files`));
    }
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.bold(`Total: ${files.length} files\n`));
  }

  /**
   * Display configuration summary
   */
  displayConfigSummary(config: {
    inputPattern: string;
    outputDirectory: string;
    preserveDirectoryStructure: boolean;
    maxConcurrentProcesses: number;
    continueOnError: boolean;
  }): void {
    console.log(chalk.cyan('🔧  Batch Configuration:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`${chalk.bold('Input Pattern:')} ${config.inputPattern}`);
    console.log(`${chalk.bold('Output Directory:')} ${config.outputDirectory}`);
    console.log(
      `${chalk.bold('Preserve Structure:')} ${config.preserveDirectoryStructure ? 'Yes' : 'No'}`
    );
    console.log(`${chalk.bold('Concurrent Processes:')} ${config.maxConcurrentProcesses}`);
    console.log(`${chalk.bold('Continue on Error:')} ${config.continueOnError ? 'Yes' : 'No'}`);
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Display final results
   */
  displayResults(result: {
    success: boolean;
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    skippedFiles: number;
    processingTime: number;
    results: SingleBatchResult[];
    errors: BatchError[];
  }): void {
    console.log();
    if (result.success && result.failedFiles === 0) {
      this.spinner.succeed(chalk.green('✅ Batch conversion completed successfully!'));
    } else if (result.successfulFiles > 0) {
      this.spinner.warn(chalk.yellow('⚠️  Batch conversion completed with some failures'));
    } else {
      this.spinner.fail(chalk.red('❌ Batch conversion failed'));
    }

    console.log();
    console.log(chalk.cyan('📊 Batch Processing Results:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`${chalk.bold('Total files:')} ${result.totalFiles}`);
    console.log(`${chalk.bold('Successful:')} ${chalk.green(result.successfulFiles.toString())}`);

    if (result.failedFiles > 0) {
      console.log(`${chalk.bold('Failed:')} ${chalk.red(result.failedFiles.toString())}`);
    }
    if (result.skippedFiles > 0) {
      console.log(`${chalk.bold('Skipped:')} ${chalk.yellow(result.skippedFiles.toString())}`);
    }
    const processingTimeText = this.formatDuration(result.processingTime);
    console.log(`${chalk.bold('Processing time:')} ${processingTimeText}`);
    if (result.successfulFiles > 0) {
      const avgTime = result.processingTime / result.successfulFiles;
      console.log(`${chalk.bold('Average per file:')} ${this.formatDuration(avgTime)}`);
    }
    console.log(chalk.gray('─'.repeat(60)));

    // Show errors if any
    if (result.errors.length > 0) {
      this.displayErrors(result.errors);
    }

    // Show successful files summary
    if (result.results.some(r => r.success)) {
      this.displaySuccessfulFiles(result.results.filter(r => r.success));
    }
  }

  /**
   * Display errors
   */
  private displayErrors(errors: BatchError[]): void {
    console.log();
    console.log(chalk.red('❌ Errors encountered:'));
    console.log(chalk.gray('─'.repeat(60)));
    errors.forEach((error, index) => {
      const shortPath = this.shortenPath(error.inputPath);
      console.log(chalk.red(`  ${index + 1}. ${shortPath}`));
      const err = error.error as unknown;
      if (err && typeof err === 'object') {
        const e = err as DisplayErrorShape;
        if (e.message) {
          console.log(chalk.gray(`     ${e.message}`));
        }
        if (Array.isArray(e.suggestions) && e.suggestions.length > 0) {
          console.log(chalk.gray('     Suggestions:'));
          e.suggestions.forEach(suggestion => {
            console.log(chalk.gray(`     • ${suggestion}`));
          });
        }
      }
    });
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Display successful files
   */
  private displaySuccessfulFiles(results: SingleBatchResult[]): void {
    console.log();
    console.log(chalk.green('✅ Successfully converted files:'));
    console.log(chalk.gray('─'.repeat(60)));

    results.forEach((result, index) => {
      const inputShort = this.shortenPath(result.inputPath);
      const outputShort = this.shortenPath(result.outputPath);
      console.log(chalk.gray(`  ${index + 1}. `) + chalk.white(inputShort));
      console.log(chalk.gray(`     → ${outputShort}`));
      if (result.stats) {
        const inputSize = this.formatBytes(result.stats.inputSize);
        const outputSize = this.formatBytes(result.stats.outputSize);
        const pages = result.stats.pageCount;
        const time = this.formatDuration(result.processingTime);
        console.log(chalk.gray(`     ${inputSize} → ${outputSize}, ${pages} pages, ${time}`));
      }
    });
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Handle start event
   */
  private handleStart(data: BatchProgressInfo): void {
    this.spinner.text = chalk.cyan(`🚀 Batch processing started (${data.totalFiles} files)`);
  }

  /**
   * Handle progress event
   */
  private handleProgress(data: BatchProgressInfo): void {
    const percentage = Math.round((data.processedFiles / data.totalFiles) * 100);
    const progress = this.generateProgressBar(percentage);
    let text = `${progress} ${percentage}% (${data.processedFiles}/${data.totalFiles})`;
    if (data.currentFile) {
      const shortPath = this.shortenPath(data.currentFile);
      text += ` - ${shortPath}`;
    }
    if (data.estimatedTimeRemaining) {
      const eta = this.formatDuration(data.estimatedTimeRemaining);
      text += ` - ETA: ${eta}`;
    }
    this.spinner.text = text;
  }

  /**
   * Handle file completion
   */
  private handleFileComplete(_data: BatchProgressInfo, _currentFile?: string): void {
    // Progress update will be handled by handleProgress
    // This is mainly for logging purposes if needed
  }

  /**
   * Handle file error
   */
  private handleFileError(_data: BatchProgressInfo, currentFile?: string, error?: unknown): void {
    if (currentFile) {
      const shortPath = this.shortenPath(currentFile);
      console.log(chalk.red(`\n❌ Failed: ${shortPath}`));
      if (error && typeof error === 'object') {
        const e = error as DisplayErrorShape;
        if (e.message) {
          console.log(chalk.gray(`   Error: ${e.message}`));
        }
      }
    }
  }

  /**
   * Handle completion
   */
  private handleComplete(data: BatchProgressInfo): void {
    const successRate = Math.round((data.successfulFiles / data.totalFiles) * 100);
    if (successRate === 100) {
      this.spinner.succeed(chalk.green(`✅ All ${data.totalFiles} files processed successfully!`));
    } else if (data.successfulFiles > 0) {
      this.spinner.warn(
        chalk.yellow(
          `⚠️  Processed ${data.successfulFiles}/${data.totalFiles} files (${successRate}% success rate)`
        )
      );
    } else {
      this.spinner.fail(chalk.red(`❌ Failed to process any files`));
    }
  }

  /**
   * Generate progress bar
   */
  private generateProgressBar(percentage: number, width = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    return chalk.green(filledBar) + chalk.gray(emptyBar);
  }

  /**
   * Shorten file path for display
   */
  private shortenPath(filePath: string, maxLength = 50): string {
    if (filePath.length <= maxLength) {
      return filePath;
    }
    const parts = filePath.split('/');
    if (parts.length <= 2) {
      return filePath;
    }
    // Try to keep filename and immediate parent
    const filename = parts[parts.length - 1];
    const parent = parts[parts.length - 2];
    const shortened = `.../${parent}/${filename}`;
    if (shortened.length <= maxLength) {
      return shortened;
    }
    // Just show filename if still too long
    return `.../${filename}`;
  }

  /**
   * Format duration in human readable format
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Stop and cleanup
   */
  stop(): void {
    this.spinner.stop();
  }
}
