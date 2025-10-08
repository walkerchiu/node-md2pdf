/**
 * Unit tests for ErrorHandler infrastructure
 */

import { ErrorHandler } from '../../../src/infrastructure/error/handler';
import {
  MD2PDFError,
  FileNotFoundError,
  ValidationError,
} from '../../../src/infrastructure/error/errors';
import { ILogger } from '../../../src/infrastructure/logging/types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    errorHandler = new ErrorHandler(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle MD2PDFError with proper logging', async () => {
      const error = new MD2PDFError(
        'Test MD2PDF error',
        'TEST_ERROR',
        'test_category',
      );

      await errorHandler.handleError(error, 'test-context');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test_category] TEST_ERROR: Test MD2PDF error',
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error context: test-context',
      );
    });

    it('should handle FileNotFoundError with appropriate logging', async () => {
      const error = new FileNotFoundError('/path/to/file.md');

      await errorHandler.handleError(error, 'file-operation');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[file_system] FILE_NOT_FOUND: File not found: /path/to/file.md',
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error context: file-operation',
      );
    });

    it('should handle ValidationError with proper context', async () => {
      const error = new ValidationError(
        'testField',
        'invalidValue',
        'Invalid input data',
      );

      await errorHandler.handleError(error, 'validation-context');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[validation] VALIDATION_ERROR: Invalid input data',
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error context: validation-context',
      );
    });

    it('should handle generic Error with fallback handling', async () => {
      const error = new Error('Generic error message');

      await errorHandler.handleError(error, 'generic-context');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[unknown] Error: Generic error message',
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error context: generic-context',
      );
    });

    it('should handle error without context', async () => {
      const error = new MD2PDFError('Test error', 'TEST_CODE', 'test_category');

      await errorHandler.handleError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test_category] TEST_CODE: Test error',
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatError', () => {
    it('should format MD2PDFError with error code', () => {
      const error = new MD2PDFError('Test error', 'TEST_CODE', 'test_category');

      const formatted = errorHandler.formatError(error);

      expect(formatted).toContain('Test error');
      expect(formatted).toContain('TEST_CODE');
    });

    it('should format FileNotFoundError with file path', () => {
      const error = new FileNotFoundError('/missing/file.md');

      const formatted = errorHandler.formatError(error);

      expect(formatted).toContain('File not found');
      expect(formatted).toContain('/missing/file.md');
    });

    it('should format ValidationError with details', () => {
      const error = new ValidationError(
        'testField',
        'invalidValue',
        'Validation failed',
      );

      const formatted = errorHandler.formatError(error);

      expect(formatted).toBe('VALIDATION_ERROR: Validation failed');
    });

    it('should format generic Error with basic message', () => {
      const error = new Error('Generic error');

      const formatted = errorHandler.formatError(error);

      expect(formatted).toContain('Generic error');
    });

    it('should handle error with no message', () => {
      const error = new Error();

      const formatted = errorHandler.formatError(error);

      expect(formatted).toBe('Error: ');
    });
  });

  describe('isRecoverable', () => {
    it('should identify FileNotFoundError as recoverable', () => {
      const error = new FileNotFoundError('/test/file.md');

      const result = errorHandler.isRecoverable(error);

      expect(result).toBe(true);
    });

    it('should identify ValidationError as recoverable', () => {
      const error = new ValidationError('testField', 'invalidInput');

      const result = errorHandler.isRecoverable(error);

      expect(result).toBe(true);
    });

    it('should identify system errors as non-recoverable', () => {
      const error = new MD2PDFError('System failure', 'SYSTEM_ERROR', 'system');

      const result = errorHandler.isRecoverable(error);

      expect(result).toBe(false);
    });

    it('should identify generic errors as non-recoverable', () => {
      const error = new Error('Unexpected error');

      const result = errorHandler.isRecoverable(error);

      expect(result).toBe(false);
    });
  });

  describe('categorizeError', () => {
    it('should categorize FileNotFoundError correctly', () => {
      const error = new FileNotFoundError('/test/file.md');

      const category = errorHandler.categorizeError(error);

      expect(category).toBe('file_system');
    });

    it('should categorize ValidationError correctly', () => {
      const error = new ValidationError('testField', 'invalidInput');

      const category = errorHandler.categorizeError(error);

      expect(category).toBe('validation');
    });

    it('should categorize system MD2PDFError correctly', () => {
      const error = new MD2PDFError(
        'System issue',
        'SYSTEM_ERROR',
        'configuration',
      );

      const category = errorHandler.categorizeError(error);

      expect(category).toBe('configuration');
    });

    it('should categorize generic errors as unknown', () => {
      const error = new Error('Random error');

      const category = errorHandler.categorizeError(error);

      expect(category).toBe('unknown');
    });

    it('should handle null/undefined errors', () => {
      expect(() => {
        errorHandler.categorizeError(null as unknown as Error);
      }).toThrow();
    });
  });

  describe('error context and details', () => {
    it('should preserve error stack trace in logging', async () => {
      const error = new Error('Test error');
      error.stack = 'Test stack trace';

      await errorHandler.handleError(error, 'test-context');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[unknown] Error: Test error',
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error context: test-context',
      );
    });

    it('should handle complex error details in ValidationError', () => {
      const complexDetails = {
        constraints: ['must be valid email', 'required field'],
        nested: { level: 2, info: 'deep validation' },
      };
      const error = new ValidationError(
        'email',
        'invalid-email',
        'Complex validation error',
        complexDetails,
      );

      const formatted = errorHandler.formatError(error);

      expect(formatted).toBe('VALIDATION_ERROR: Complex validation error');
    });

    it('should handle missing context gracefully', async () => {
      const error = new MD2PDFError('Test error', 'TEST_CODE', 'test_category');

      await errorHandler.handleError(error, '');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[test_category] TEST_CODE: Test error',
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle sequence of different error types', async () => {
      const errors = [
        new FileNotFoundError('/file1.md'),
        new ValidationError('testField', 'invalidData', 'Invalid data'),
        new MD2PDFError('Processing error', 'PROCESS_ERROR', 'processing'),
        new Error('Generic error'),
      ];

      for (const error of errors) {
        await errorHandler.handleError(error, 'batch-process');
      }

      expect(mockLogger.error).toHaveBeenCalledTimes(8);
      expect(errorHandler.categorizeError(errors[0])).toBe('file_system');
      expect(errorHandler.categorizeError(errors[1])).toBe('validation');
      expect(errorHandler.categorizeError(errors[2])).toBe('processing');
      expect(errorHandler.categorizeError(errors[3])).toBe('unknown');
    });

    it('should maintain consistent categorization across calls', () => {
      const error = new FileNotFoundError('/same/file.md');

      const category1 = errorHandler.categorizeError(error);
      const category2 = errorHandler.categorizeError(error);

      expect(category1).toBe(category2);
      expect(category1).toBe('file_system');
    });
  });
});
