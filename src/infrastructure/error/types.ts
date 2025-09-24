/**
 * Error handling system types
 */

export interface IErrorHandler {
  handleError(error: Error, context?: string): Promise<void>;
  formatError(error: Error): string;
  isRecoverable(error: Error): boolean;
  categorizeError(error: Error): ErrorCategory;
}

export type ErrorCategory =
  | 'file_system'
  | 'markdown_parsing'
  | 'pdf_generation'
  | 'network'
  | 'validation'
  | 'configuration'
  | 'unknown';

export interface ErrorContext {
  operation: string;
  filePath?: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorRecoveryOptions {
  retry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => Promise<void>;
}
