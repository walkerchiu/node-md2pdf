/**
 * Simplified application service for batch processing
 */

import * as path from 'path';

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
import { FileCollector } from '../../core/batch/file-collector';
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
  private readonly fileCollector: FileCollector;

  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly _configManager: IConfigManager,
    private readonly fileSystemManager: IFileSystemManager,
    private readonly fileProcessorService: IFileProcessorService,
    private readonly fileCollectorParam?: FileCollector
  ) {
    void this._configManager;
    this.fileCollector = this.fileCollectorParam ?? new FileCollector();
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
      const fileInfos = await this.fileCollector.collectFiles(config);
      const files = fileInfos.map(info => info.inputPath);

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
      const fileInfos = await this.fileCollector.collectFiles(config);
      const estimatedSize = fileInfos.length;
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
}
