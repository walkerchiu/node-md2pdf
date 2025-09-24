/**
 * Central error handler implementation
 */

import {
  MD2PDFError,
  FileNotFoundError,
  FilePermissionError,
  MarkdownParsingError,
  PDFGenerationError,
  PuppeteerError,
} from './errors';

import type { IErrorHandler, ErrorCategory } from './types';
import type { ILogger } from '../logging/types';

export class ErrorHandler implements IErrorHandler {
  constructor(private logger?: ILogger) {}

  async handleError(error: Error, context?: string): Promise<void> {
    const category = this.categorizeError(error);
    const formattedError = this.formatError(error);

    // Log the error
    if (this.logger) {
      this.logger.error(`[${category}] ${formattedError}`, error);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[${category}] ${formattedError}`, error);
    }

    // Add context if provided
    if (context) {
      const contextMessage = `Error context: ${context}`;
      if (this.logger) {
        this.logger.error(contextMessage);
      } else {
        // eslint-disable-next-line no-console
        console.error(contextMessage);
      }
    }
  }

  formatError(error: Error): string {
    if (error instanceof MD2PDFError) {
      return `${error.code}: ${error.message}`;
    }

    return `${error.name}: ${error.message}`;
  }

  isRecoverable(error: Error): boolean {
    if (error instanceof MD2PDFError) {
      return error.recoverable;
    }

    // Default to non-recoverable for unknown errors
    return false;
  }

  categorizeError(error: Error): ErrorCategory {
    if (error instanceof MD2PDFError) {
      return error.category as ErrorCategory;
    }

    // Try to categorize common Node.js errors
    if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      return 'file_system';
    }
    if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      return 'file_system';
    }
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return 'configuration';
    }
    if (error.message.includes('timeout') || error.message.includes('network')) {
      return 'network';
    }

    return 'unknown';
  }

  /**
   * Create error-specific suggestion messages
   */
  getSuggestions(error: Error): string[] {
    if (error instanceof FileNotFoundError) {
      return [
        'Check if the file path is correct',
        'Ensure the file exists and is accessible',
        'Try using an absolute path instead of relative path',
        'Verify file permissions',
      ];
    }

    if (error instanceof FilePermissionError) {
      return [
        'Check file permissions with: ls -la <file>',
        'Ensure you have read/write access to the file',
        'Try running with appropriate permissions',
        'Check if the file is being used by another process',
      ];
    }

    if (error instanceof MarkdownParsingError) {
      return [
        'Check the Markdown syntax in your file',
        'Ensure all code blocks are properly closed',
        'Verify table formatting is correct',
        'Try validating your Markdown with an online checker',
      ];
    }

    if (error instanceof PDFGenerationError) {
      return [
        'Try reducing the document size',
        'Check if Puppeteer is properly installed',
        'Ensure sufficient memory is available',
        'Try disabling complex styling or images',
      ];
    }

    if (error instanceof PuppeteerError) {
      return [
        'Reinstall Puppeteer: npm install puppeteer',
        'Check if Chrome/Chromium is available on your system',
        'Ensure sufficient memory for browser operations',
        'Try updating to the latest version of Puppeteer',
      ];
    }

    return [
      'Check the console output for more details',
      'Ensure all dependencies are properly installed',
      'Try restarting the application',
      'Report this issue if the problem persists',
    ];
  }
}
