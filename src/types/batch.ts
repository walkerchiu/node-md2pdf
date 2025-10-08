/**
 * Batch processing type definitions
 */

import { ConversionConfig, MD2PDFError } from './index';

// Batch processing types
export interface BatchConversionConfig
  extends Omit<ConversionConfig, 'inputPath' | 'outputPath'> {
  inputPattern: string; // Glob pattern like "*.md" or "**/*.md"
  inputFiles?: string[]; // Pre-collected file list (optional, takes precedence over inputPattern)
  outputDirectory: string;
  preserveDirectoryStructure: boolean;
  filenameFormat: BatchFilenameFormat;
  maxConcurrentProcesses: number;
  continueOnError: boolean;
  customFilenamePattern?: string; // Used when filenameFormat is CUSTOM
}

export enum BatchFilenameFormat {
  ORIGINAL = 'original',
  WITH_TIMESTAMP = 'with_timestamp',
  WITH_DATE = 'with_date',
  CUSTOM = 'custom',
}

export interface BatchFileInfo {
  inputPath: string;
  outputPath: string;
  relativeInputPath: string;
  size: number;
  lastModified: Date;
}

export interface BatchProgressInfo {
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  skippedFiles: number;
  currentFile?: string | undefined;
  startTime: Date;
  estimatedTimeRemaining?: number | undefined;
  averageProcessingTime: number;
}

export interface BatchConversionResult {
  success: boolean;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  skippedFiles: number;
  processingTime: number;
  results: SingleBatchResult[];
  errors: BatchError[];
}

export interface SingleBatchResult {
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: MD2PDFError | undefined;
  processingTime: number;
  stats?:
    | {
        inputSize: number;
        outputSize: number;
        pageCount: number;
      }
    | undefined;
}

export interface BatchError {
  inputPath: string;
  error: MD2PDFError;
  canRetry: boolean;
}

// Progress events
export interface BatchProgressEvent {
  type: 'start' | 'progress' | 'file_complete' | 'file_error' | 'complete';
  data: BatchProgressInfo;
  currentFile?: string | undefined;
  error?: MD2PDFError | undefined;
}

// Batch processing options
export interface BatchProcessingOptions {
  onProgress?: (event: BatchProgressEvent) => void;
  onFileComplete?: (result: SingleBatchResult) => void;
  onFileError?: (error: BatchError) => void;
  signal?: AbortSignal | undefined; // For cancellation support
}
