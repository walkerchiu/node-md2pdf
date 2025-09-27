/**
 * Simplified application service for batch processing
 */

import * as path from 'path';
import * as fs from 'fs';

import {
  IFileProcessorService,
  FileProcessingOptions,
  FileProcessingResult,
} from './file-processor.service';
import {
  BatchConversionConfig,
  BatchConversionResult,
  BatchError,
  BatchProcessingOptions,
} from '../../types/batch';
import { MD2PDFError } from '../../infrastructure/error/errors';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { IFileSystemManager } from '../../infrastructure/filesystem/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface BatchProcessingServiceOptions extends BatchProcessingOptions {
  maxConcurrency?: number;
  continueOnError?: boolean;
  generateReport?: boolean;
}

export interface BatchProcessingServiceResult extends BatchConversionResult {
  serviceResults: FileProcessingResult[];
}

export interface IBatchProcessorService {
  processBatch(
    config: BatchConversionConfig,
    fileOptions?: FileProcessingOptions,
    batchOptions?: BatchProcessingServiceOptions,
  ): Promise<BatchProcessingServiceResult>;

  validateBatchConfig(config: BatchConversionConfig): Promise<boolean>;
  estimateBatchSize(config: BatchConversionConfig): Promise<number>;
  generateProgressCallback(
    onProgress?: (progress: number, current: string) => void,
  ): (progress: number, current: string) => void;
}

export class BatchProcessorService implements IBatchProcessorService {
  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly _configManager: IConfigManager,
    private readonly fileSystemManager: IFileSystemManager,
    private readonly fileProcessorService: IFileProcessorService,
  ) {
    void this._configManager;
  }

  async processBatch(
    config: BatchConversionConfig,
    fileOptions: FileProcessingOptions = {},
    batchOptions: BatchProcessingServiceOptions = {},
  ): Promise<BatchProcessingServiceResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`Starting batch processing: ${config.inputPattern}`);

      await this.validateBatchConfig(config);

      // Collect files
      const files = await this.collectFiles(config);

      if (files.length === 0) {
        this.logger.warn(
          `No files found matching pattern: ${config.inputPattern}`,
        );
        this.logger.info(
          `Batch processing completed: 0/${files.length} files successful, 0 failed`,
        );
        return {
          success: true,
          totalFiles: 0,
          successfulFiles: 0,
          failedFiles: 0,
          skippedFiles: 0,
          processingTime: Date.now() - startTime,
          errors: [],
          results: [],
          serviceResults: [],
        };
      }

      this.logger.info(`Found ${files.length} files to process`);

      const maxConcurrency =
        batchOptions.maxConcurrency || config.maxConcurrentProcesses || 2;
      const continueOnError =
        batchOptions.continueOnError ?? config.continueOnError ?? true;

      const results: FileProcessingResult[] = [];
      const errors: BatchError[] = [];
      let successCount = 0;
      let failedCount = 0;

      // Process files in batches
      for (let i = 0; i < files.length; i += maxConcurrency) {
        const batch = files.slice(i, i + maxConcurrency);
        const batchPromises = batch.map(async (filePath) => {
          try {
            const outputPath = this.generateOutputPath(filePath, config);
            const processOptions: FileProcessingOptions = {
              ...fileOptions,
              outputPath,
            };

            const result = await this.fileProcessorService.processFile(
              filePath,
              processOptions,
            );
            successCount++;
            return result;
          } catch (error) {
            failedCount++;
            const mdError =
              error instanceof MD2PDFError
                ? error
                : new MD2PDFError(
                    `File processing failed: ${(error as Error).message}`,
                    'FILE_PROCESSING_ERROR',
                    'file_processing',
                    true,
                    { inputPath: filePath, originalError: error },
                  );

            const errorInfo: BatchError = {
              inputPath: filePath,
              error: mdError as unknown as BatchError['error'],
              canRetry: true,
            };

            errors.push(errorInfo);

            if (!continueOnError) {
              throw error;
            }

            this.logger.error(`Failed to process file: ${filePath}`, error);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          } else if (result.status === 'rejected') {
            this.logger.error(
              `Batch processing error for ${batch[index]}:`,
              result.reason,
            );
          }
        });
      }

      const processingTime = Date.now() - startTime;

      const finalResult: BatchProcessingServiceResult = {
        success: failedCount === 0 || continueOnError,
        totalFiles: files.length,
        successfulFiles: successCount,
        failedFiles: failedCount,
        skippedFiles: 0,
        processingTime,
        errors,
        results: results.map((r) => ({
          inputPath: r.inputPath,
          outputPath: r.outputPath,
          success: r.success,
          processingTime: r.processingTime,
          fileSize: r.fileSize,
          error: undefined,
        })),
        serviceResults: results,
      };

      this.logger.info(
        `Batch processing completed: ${successCount}/${files.length} files successful, ${failedCount} failed`,
      );

      return finalResult;
    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      const wrappedError = new MD2PDFError(
        `Batch processing failed: ${(error as Error).message}`,
        'BATCH_PROCESSING_ERROR',
        'file_system',
        false,
        {
          config,
          fileOptions,
          batchOptions,
          totalProcessingTime,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'BatchProcessorService.processBatch',
      );
      throw wrappedError;
    }
  }

  async validateBatchConfig(config: BatchConversionConfig): Promise<boolean> {
    try {
      this.logger.debug('Validating batch configuration');

      if (!config.inputPattern) {
        throw new MD2PDFError(
          'No input pattern specified',
          'INVALID_BATCH_CONFIG',
          'validation',
          false,
          { config },
        );
      }

      if (config.outputDirectory) {
        const outputExists = await this.fileSystemManager.exists(
          config.outputDirectory,
        );
        if (!outputExists) {
          await this.fileSystemManager.createDirectory(config.outputDirectory);
        }
      }

      this.logger.info('Batch configuration validation passed');
      return true;
    } catch (error) {
      if (error instanceof MD2PDFError) {
        await this.errorHandler.handleError(
          error,
          'BatchProcessorService.validateBatchConfig',
        );
        throw error;
      }

      const wrappedError = new MD2PDFError(
        `Batch configuration validation failed: ${(error as Error).message}`,
        'BATCH_CONFIG_VALIDATION_ERROR',
        'validation',
        false,
        { config, originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'BatchProcessorService.validateBatchConfig',
      );
      throw wrappedError;
    }
  }

  async estimateBatchSize(config: BatchConversionConfig): Promise<number> {
    try {
      this.logger.debug('Estimating batch size');
      const files = await this.collectFiles(config);
      const estimatedSize = files.length;
      this.logger.info(`Estimated batch size: ${estimatedSize} files`);
      return estimatedSize;
    } catch (error) {
      this.logger.warn(
        `Failed to estimate batch size: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  generateProgressCallback(
    onProgress?: (progress: number, current: string) => void,
  ): (progress: number, current: string) => void {
    return (progress: number, current: string) => {
      this.logger.debug(`Batch progress: ${progress.toFixed(1)}% - ${current}`);
      onProgress?.(progress, current);
    };
  }

  private async collectFiles(config: BatchConversionConfig): Promise<string[]> {
    const { inputPattern, inputFiles } = config;

    try {
      let files: string[] = [];

      // If inputFiles is provided, use it directly (takes precedence over pattern matching)
      if (inputFiles && inputFiles.length > 0) {
        this.logger.debug(
          `Using pre-collected files list (${inputFiles.length} files)`,
        );
        files = inputFiles;
      } else {
        // Otherwise, use pattern-based collection

        // If underlying filesystem manager exposes findFiles, prefer it (tests may mock it).
        type FsWithFind = {
          findFiles?: (pattern: string) => Promise<string[]>;
        };
        const fsWithFind = this.fileSystemManager as unknown as FsWithFind;
        let usedFsFind = false;

        if (typeof fsWithFind.findFiles === 'function') {
          usedFsFind = true;
          try {
            const found = await fsWithFind.findFiles!(inputPattern);
            files = Array.isArray(found) ? found : [];
          } catch {
            // Treat errors as empty result; do not fallback to local discovery when findFiles exists.
            files = [];
          }
        }

        // Only run fallback discovery if findFiles was not used.
        if (!usedFsFind) {
          if (inputPattern.includes(',')) {
            files = inputPattern
              .split(',')
              .map((f) => f.trim().replace(/['"]/g, ''));
          } else if (inputPattern === '*.md' || inputPattern === '**/*.md') {
            const allFiles = fs.readdirSync(process.cwd());
            files = allFiles
              .filter(
                (file) => file.endsWith('.md') || file.endsWith('.markdown'),
              )
              .map((file) => path.join(process.cwd(), file));
          } else {
            if (fs.existsSync(inputPattern)) {
              const stat = fs.statSync(inputPattern);
              if (stat.isDirectory()) {
                files = this.findMarkdownFilesInDirectory(inputPattern);
              } else if (this.isMarkdownFile(inputPattern)) {
                files = [inputPattern];
              }
            }
          }
        }
      }

      const markdownFiles = files
        .filter((f) => this.isMarkdownFile(f))
        .map((f) => path.resolve(f))
        .filter((f) => fs.existsSync(f));

      this.logger.debug(`Collected ${markdownFiles.length} markdown files`);
      return markdownFiles;
    } catch (error) {
      this.logger.error('Error collecting files:', error);
      throw new MD2PDFError(
        `Failed to collect files: ${(error as Error).message}`,
        'FILE_COLLECTION_ERROR',
        'file_system',
        true,
        { inputPattern, originalError: error },
      );
    }
  }

  private findMarkdownFilesInDirectory(dirPath: string): string[] {
    const results: string[] = [];

    const traverse = (currentPath: string): void => {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
            traverse(fullPath);
          }
        } else if (this.isMarkdownFile(fullPath)) {
          results.push(fullPath);
        }
      }
    };

    traverse(dirPath);
    return results;
  }

  private generateOutputPath(
    inputPath: string,
    config: BatchConversionConfig,
  ): string {
    const parsedInput = path.parse(inputPath);
    let outputName = parsedInput.name;

    switch (config.filenameFormat) {
      case 'with_timestamp':
        outputName = `${parsedInput.name}_${Date.now()}`;
        break;
      case 'with_date':
        outputName = `${parsedInput.name}_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'custom':
        if (config.customFilenamePattern) {
          outputName = config.customFilenamePattern
            .replace('{name}', parsedInput.name)
            .replace('{date}', new Date().toISOString().split('T')[0])
            .replace('{timestamp}', Date.now().toString());
        }
        break;
      default:
        break;
    }

    const outputFileName = `${outputName}.pdf`;

    if (config.outputDirectory) {
      if (config.preserveDirectoryStructure) {
        const relativePath = path.relative(process.cwd(), parsedInput.dir);
        const outputDir = path.join(config.outputDirectory, relativePath);
        return path.join(outputDir, outputFileName);
      } else {
        return path.join(config.outputDirectory, outputFileName);
      }
    }

    return path.join(parsedInput.dir, outputFileName);
  }

  private isMarkdownFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.md', '.markdown'].includes(ext);
  }
}
