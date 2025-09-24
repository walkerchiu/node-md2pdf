/**
 * Error handling system module exports
 */

export { ErrorHandler } from './handler';

export {
  MD2PDFError,
  FileNotFoundError,
  FilePermissionError,
  MarkdownParsingError,
  PDFGenerationError,
  ConfigurationError,
  ValidationError,
  PuppeteerError,
  ServiceNotAvailableError,
} from './errors';

export type { IErrorHandler, ErrorCategory, ErrorContext, ErrorRecoveryOptions } from './types';
