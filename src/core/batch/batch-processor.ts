/**
 * Core batch processor
 * Orchestrates the entire batch conversion workflow
 */

import * as path from 'path';
import * as fs from 'fs';
import { MarkdownParser } from '../parser';
import { PDFGenerator } from '../pdf';
import { FileCollector } from './file-collector';
import { ProgressTracker } from './progress-tracker';
import { OutputManager } from './output-manager';
import {
  BatchConversionConfig,
  BatchConversionResult,
  SingleBatchResult,
  BatchError,
  BatchFileInfo,
  BatchProcessingOptions,
} from '../../types/batch';
import { ErrorType, MD2PDFError } from '../../types';
import { Heading } from '../../types';
import { StyleOptions } from '../pdf/types';

export class BatchProcessor {
  private fileCollector: FileCollector;
  private outputManager: OutputManager;
  private abortSignal?: AbortSignal;

  /**
   * Allow dependency injection for easier testing and customization.
   * If dependencies are not provided, default instances will be created.
   */
  constructor(fileCollector?: FileCollector, outputManager?: OutputManager) {
    this.fileCollector = fileCollector ?? new FileCollector();
    this.outputManager = outputManager ?? new OutputManager();
  }

  /**
   * Process batch conversion
   */
  async processBatch(
    config: BatchConversionConfig,
    options: BatchProcessingOptions = {},
  ): Promise<BatchConversionResult> {
    const startTime = Date.now();
    if (options.signal) {
      this.abortSignal = options.signal;
    }
    try {
      // Step 1: Collect files
      const allFiles = await this.fileCollector.collectFiles(config);
      // Step 2: Validate files
      const { valid: validFiles, invalid: invalidFiles } =
        await this.fileCollector.validateFiles(allFiles);
      // Step 3: Resolve output conflicts
      const resolvedFiles =
        await this.outputManager.resolveFileNameConflicts(validFiles);
      // Step 4: Validate output paths
      const { valid: outputValidFiles, invalid: outputInvalidFiles } =
        await this.outputManager.validateOutputPaths(resolvedFiles);
      // Step 5: Prepare output directories
      await this.outputManager.prepareOutputDirectories(outputValidFiles);
      // Initialize progress tracker
      const progressTracker = new ProgressTracker(outputValidFiles.length);
      // Set up progress tracking
      if (options.onProgress) {
        progressTracker.on('progress', options.onProgress);
      }
      progressTracker.start();
      // Step 6: Process files with concurrent processing
      const results = await this.processFilesWithConcurrency(
        outputValidFiles,
        config,
        progressTracker,
        options,
      );
      // Step 7: Handle skipped/invalid files
      const allErrors: BatchError[] = [
        ...invalidFiles.map(({ file, error }) => ({
          inputPath: file.inputPath,
          error,
          canRetry: this.canRetry(error),
        })),
        ...outputInvalidFiles.map(({ file, error }) => ({
          inputPath: file.inputPath,
          error,
          canRetry: this.canRetry(error),
        })),
        ...results.errors,
      ];
      progressTracker.complete();
      const totalProcessingTime = Date.now() - startTime;

      return {
        success: results.results.length > 0,
        totalFiles: allFiles.length,
        successfulFiles: results.results.filter(r => r.success).length,
        failedFiles:
          results.results.filter(r => !r.success).length +
          invalidFiles.length +
          outputInvalidFiles.length,
        skippedFiles: 0,
        processingTime: totalProcessingTime,
        results: results.results,
        errors: allErrors,
      };
    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      return {
        success: false,
        totalFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        skippedFiles: 0,
        processingTime: totalProcessingTime,
        results: [],
        errors: [
          {
            inputPath: config.inputPattern,
            error: this.createError(
              ErrorType.SYSTEM_ERROR,
              `Batch processing failed: ${error instanceof Error ? error.message : String(error)}`,
              { config }
            ),
            canRetry: true,
          },
        ],
      };
    }
  }

  /**
   * Process files with controlled concurrency
   */
  private async processFilesWithConcurrency(
    files: BatchFileInfo[],
    config: BatchConversionConfig,
    progressTracker: ProgressTracker,
    options: BatchProcessingOptions,
  ): Promise<{ results: SingleBatchResult[]; errors: BatchError[] }> {
    const results: SingleBatchResult[] = [];
    const errors: BatchError[] = [];
    const maxConcurrent = Math.min(config.maxConcurrentProcesses, files.length);

    // Process files in chunks to control concurrency
    for (let i = 0; i < files.length; i += maxConcurrent) {
      // Check for cancellation
      if (this.abortSignal?.aborted) {
        throw new Error('Batch processing was cancelled');
      }
      const chunk = files.slice(i, i + maxConcurrent);
      const chunkPromises = chunk.map((file) =>
        this.processFile(file, config, progressTracker, options),
      );
      const chunkResults = await Promise.allSettled(chunkPromises);
      chunkResults.forEach((result, index) => {
        const file = chunk[index];
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success && options.onFileComplete) {
            options.onFileComplete(result.value);
          } else if (!result.value.success && options.onFileError) {
            const batchError: BatchError = {
              inputPath: file.inputPath,
              error: result.value.error!,
              canRetry: this.canRetry(result.value.error!),
            };
            errors.push(batchError);
            options.onFileError(batchError);
          }
        } else {
          const error = this.createError(
            ErrorType.SYSTEM_ERROR,
            `Processing failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
            { inputPath: file.inputPath },
          );
          const batchError: BatchError = {
            inputPath: file.inputPath,
            error,
            canRetry: true,
          };
          errors.push(batchError);
          if (options.onFileError) {
            options.onFileError(batchError);
          }
          results.push({
            inputPath: file.inputPath,
            outputPath: file.outputPath,
            success: false,
            error,
            processingTime: 0,
          });
        }
      });

      // If continueOnError is false and we have errors, stop processing
      if (!config.continueOnError && errors.length > 0) {
        break;
      }
    }

    return { results, errors };
  }

  /**
   * Process a single file
   */
  private async processFile(
    file: BatchFileInfo,
    config: BatchConversionConfig,
    progressTracker: ProgressTracker,
    _options: BatchProcessingOptions,
  ): Promise<SingleBatchResult> {
    const startTime = Date.now();
    try {
      progressTracker.startFile(file.inputPath);

      // Check for cancellation
      if (this.abortSignal?.aborted) {
        throw new Error('Processing was cancelled');
      }

      // Parse markdown
      const parser = new MarkdownParser();
      const parsed = parser.parseFile(file.inputPath);
      // Read original content for processing
      const originalContent = await fs.promises.readFile(file.inputPath, 'utf-8');
      // Generate PDF
      const pdfGenerator = new PDFGenerator({
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
        },
        displayHeaderFooter: config.includePageNumbers,
        footerTemplate: config.includePageNumbers
          ? '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
          : '',
        printBackground: true,
        toc: {
          enabled: true,
          maxDepth: config.tocDepth,
          includePageNumbers: config.includePageNumbers,
          title: '目錄',
        },
      });
      const pdfOptions: {
        title?: string;
        customCSS?: string;
        styleOptions?: StyleOptions;
        headings: Heading[];
        markdownContent?: string;
        enableChineseSupport?: boolean;
      } = {
        title: path.basename(file.inputPath, path.extname(file.inputPath)),
        headings: parsed.headings,
        markdownContent: originalContent,
        enableChineseSupport: config.chineseFontSupport,
      };
      if (config.chineseFontSupport) {
        pdfOptions.styleOptions = {
          fontFamily: 'Noto Sans CJK SC, Arial, sans-serif',
        };
      }
      const result = await pdfGenerator.generatePDF(parsed.content, file.outputPath, pdfOptions);
      await pdfGenerator.close();
      const processingTime = Date.now() - startTime;
      const stats = await fs.promises.stat(file.inputPath);
      const outputStats = result.success ? await fs.promises.stat(file.outputPath) : null;
      const singleResult: SingleBatchResult = {
        inputPath: file.inputPath,
        outputPath: file.outputPath,
        success: result.success,
        error: result.success
          ? undefined
          : this.createError(
              ErrorType.PDF_GENERATION_ERROR,
              result.error || 'PDF generation failed',
              { inputPath: file.inputPath, outputPath: file.outputPath }
            ),
        processingTime,
        stats:
          result.success && outputStats
            ? {
                inputSize: stats.size,
                outputSize: outputStats.size,
                pageCount: result.metadata?.pages || 0,
              }
            : undefined,
      };
      if (result.success) {
        progressTracker.completeFile(singleResult);
      } else {
        const batchError: BatchError = {
          inputPath: file.inputPath,
          error: singleResult.error!,
          canRetry: true,
        };
        progressTracker.failFile(batchError);
      }
      return singleResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const conversionError = this.createError(
        ErrorType.SYSTEM_ERROR,
        `File processing failed: ${error instanceof Error ? error.message : String(error)}`,
        { inputPath: file.inputPath, outputPath: file.outputPath }
      );
      const singleResult: SingleBatchResult = {
        inputPath: file.inputPath,
        outputPath: file.outputPath,
        success: false,
        error: conversionError,
        processingTime,
      };
      const batchError: BatchError = {
        inputPath: file.inputPath,
        error: conversionError,
        canRetry: this.canRetry(conversionError),
      };
      progressTracker.failFile(batchError);
      return singleResult;
    }
  }

  /**
   * Determine if an error is retryable
   */
  private canRetry(error: MD2PDFError): boolean {
    switch (error.type) {
      case ErrorType.PERMISSION_DENIED:
      case ErrorType.INVALID_FORMAT:
        return false;
      case ErrorType.FILE_NOT_FOUND:
      case ErrorType.SYSTEM_ERROR:
      case ErrorType.PARSE_ERROR:
      case ErrorType.PDF_GENERATION_ERROR:
        return true;
      default:
        return true;
    }
  }

  /**
   * Create standardized error
   */
  private createError(
    type: ErrorType,
    message: string,
    details?: Record<string, unknown>,
    suggestions?: string[]
  ): MD2PDFError {
    const error = new Error(message) as MD2PDFError;
    error.type = type;
    if (details !== undefined) {
      error.details = details;
    }
    if (suggestions !== undefined) {
      error.suggestions = suggestions;
    }
    return error;
  }

  /**
   * Cancel current batch processing
   */
  cancel(): void {
    // The AbortSignal will be checked in the processing loops
    // This is mainly for external cancellation support
  }
}
