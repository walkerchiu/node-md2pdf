/**
 * Tests for Custom Error Classes
 */

import {
  MD2PDFError,
  FileNotFoundError,
  FilePermissionError,
  MarkdownParsingError,
  PDFGenerationError,
  ConfigurationError,
  ValidationError,
  PuppeteerError,
  ServiceNotAvailableError,
} from '../../../../src/infrastructure/error/errors';

describe('Error Classes', () => {
  describe('MD2PDFError', () => {
    it('should create base error with required properties', () => {
      const error = new MD2PDFError(
        'Test message',
        'TEST_CODE',
        'test_category',
      );

      expect(error.name).toBe('MD2PDFError');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.category).toBe('test_category');
      expect(error.recoverable).toBe(false);
      expect(error.context).toEqual({});
    });

    it('should create error with all parameters', () => {
      const context = { key: 'value', number: 42 };
      const error = new MD2PDFError(
        'Test message',
        'TEST_CODE',
        'test_category',
        true,
        context,
      );

      expect(error.recoverable).toBe(true);
      expect(error.context).toEqual(context);
    });

    it('should be instance of Error', () => {
      const error = new MD2PDFError('Test', 'CODE', 'category');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MD2PDFError);
    });
  });

  describe('FileNotFoundError', () => {
    it('should create file not found error', () => {
      const filePath = '/path/to/missing/file.md';
      const error = new FileNotFoundError(filePath);

      expect(error.name).toBe('FileNotFoundError');
      expect(error.message).toBe(`File not found: ${filePath}`);
      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.category).toBe('file_system');
      expect(error.recoverable).toBe(true);
      expect(error.filePath).toBe(filePath);
      expect(error.context).toEqual({ filePath });
    });

    it('should include additional context', () => {
      const filePath = '/path/to/file.md';
      const context = { operation: 'read', size: 1024 };
      const error = new FileNotFoundError(filePath, context);

      expect(error.context).toEqual({ filePath, ...context });
    });

    it('should extend MD2PDFError', () => {
      const error = new FileNotFoundError('/test/file');
      expect(error).toBeInstanceOf(MD2PDFError);
      expect(error).toBeInstanceOf(FileNotFoundError);
    });
  });

  describe('FilePermissionError', () => {
    it('should create file permission error', () => {
      const filePath = '/path/to/file.pdf';
      const operation = 'write';
      const error = new FilePermissionError(filePath, operation);

      expect(error.name).toBe('FilePermissionError');
      expect(error.message).toBe(
        `Permission denied: cannot ${operation} file ${filePath}`,
      );
      expect(error.code).toBe('FILE_PERMISSION_DENIED');
      expect(error.category).toBe('file_system');
      expect(error.recoverable).toBe(true);
      expect(error.filePath).toBe(filePath);
      expect(error.context).toEqual({ filePath, operation });
    });

    it('should include additional context', () => {
      const filePath = '/path/to/file.pdf';
      const operation = 'read';
      const context = { userId: 'user123' };
      const error = new FilePermissionError(filePath, operation, context);

      expect(error.context).toEqual({ filePath, operation, ...context });
    });
  });

  describe('MarkdownParsingError', () => {
    it('should create markdown parsing error', () => {
      const message = 'Invalid syntax';
      const error = new MarkdownParsingError(message);

      expect(error.name).toBe('MarkdownParsingError');
      expect(error.message).toBe(`Markdown parsing error: ${message}`);
      expect(error.code).toBe('MARKDOWN_PARSING_ERROR');
      expect(error.category).toBe('markdown_parsing');
      expect(error.recoverable).toBe(false);
      expect(error.filePath).toBeUndefined();
      expect(error.lineNumber).toBeUndefined();
    });

    it('should create error with file path and line number', () => {
      const message = 'Invalid table syntax';
      const filePath = '/path/to/document.md';
      const lineNumber = 42;
      const error = new MarkdownParsingError(message, filePath, lineNumber);

      expect(error.filePath).toBe(filePath);
      expect(error.lineNumber).toBe(lineNumber);
      expect(error.context).toEqual({ filePath, lineNumber });
    });

    it('should include additional context', () => {
      const message = 'Invalid code block';
      const context = { language: 'javascript', block: 'const x = 1;' };
      const error = new MarkdownParsingError(
        message,
        undefined,
        undefined,
        context,
      );

      expect(error.context).toEqual({
        filePath: undefined,
        lineNumber: undefined,
        ...context,
      });
    });
  });

  describe('PDFGenerationError', () => {
    it('should create PDF generation error', () => {
      const message = 'Failed to render HTML';
      const stage = 'html_rendering';
      const error = new PDFGenerationError(message, stage);

      expect(error.name).toBe('PDFGenerationError');
      expect(error.message).toBe(
        `PDF generation error at stage '${stage}': ${message}`,
      );
      expect(error.code).toBe('PDF_GENERATION_ERROR');
      expect(error.category).toBe('pdf_generation');
      expect(error.recoverable).toBe(true);
      expect(error.stage).toBe(stage);
      expect(error.context).toEqual({ stage });
    });

    it('should include additional context', () => {
      const message = 'Puppeteer timeout';
      const stage = 'pdf_creation';
      const context = { timeout: 30000, pageCount: 5 };
      const error = new PDFGenerationError(message, stage, context);

      expect(error.context).toEqual({ stage, ...context });
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const message = 'Invalid value';
      const configKey = 'pdf.format';
      const error = new ConfigurationError(message, configKey);

      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe(
        `Configuration error for key '${configKey}': ${message}`,
      );
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.category).toBe('configuration');
      expect(error.recoverable).toBe(true);
      expect(error.configKey).toBe(configKey);
      expect(error.context).toEqual({ configKey });
    });

    it('should include additional context', () => {
      const message = 'Value must be A4 or A3';
      const configKey = 'pdf.format';
      const context = { providedValue: 'A5', validValues: ['A4', 'A3'] };
      const error = new ConfigurationError(message, configKey, context);

      expect(error.context).toEqual({ configKey, ...context });
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with default message', () => {
      const field = 'email';
      const value = 'invalid-email';
      const error = new ValidationError(field, value);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe(
        `Validation failed for field '${field}' with value: ${value}`,
      );
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe('validation');
      expect(error.recoverable).toBe(true);
      expect(error.field).toBe(field);
      expect(error.value).toBe(value);
      expect(error.context).toEqual({ field, value });
    });

    it('should create validation error with custom message', () => {
      const field = 'age';
      const value = -5;
      const message = 'Age must be positive';
      const error = new ValidationError(field, value, message);

      expect(error.message).toBe(message);
      expect(error.field).toBe(field);
      expect(error.value).toBe(value);
    });

    it('should handle different value types', () => {
      const objectValue = { nested: 'value' };
      const error = new ValidationError('config', objectValue);

      expect(error.value).toEqual(objectValue);
      expect(error.context).toEqual({ field: 'config', value: objectValue });
    });
  });

  describe('PuppeteerError', () => {
    it('should create puppeteer error', () => {
      const message = 'Browser launch failed';
      const error = new PuppeteerError(message);

      expect(error.name).toBe('PuppeteerError');
      expect(error.message).toBe(`Puppeteer error: ${message}`);
      expect(error.code).toBe('PUPPETEER_ERROR');
      expect(error.category).toBe('pdf_generation');
      expect(error.recoverable).toBe(true);
    });

    it('should include context', () => {
      const message = 'Page timeout';
      const context = { timeout: 30000, url: 'data:text/html,...' };
      const error = new PuppeteerError(message, context);

      expect(error.context).toEqual(context);
    });
  });

  describe('ServiceNotAvailableError', () => {
    it('should create service not available error', () => {
      const serviceName = 'PlantUMLRenderer';
      const error = new ServiceNotAvailableError(serviceName);

      expect(error.name).toBe('ServiceNotAvailableError');
      expect(error.message).toBe(`Service not available: ${serviceName}`);
      expect(error.code).toBe('SERVICE_NOT_AVAILABLE');
      expect(error.category).toBe('configuration');
      expect(error.recoverable).toBe(true);
      expect(error.serviceName).toBe(serviceName);
      expect(error.context).toEqual({ serviceName });
    });

    it('should include additional context', () => {
      const serviceName = 'MermaidRenderer';
      const context = { reason: 'dependency_missing', dependency: 'puppeteer' };
      const error = new ServiceNotAvailableError(serviceName, context);

      expect(error.context).toEqual({ serviceName, ...context });
    });
  });

  describe('Error inheritance and properties', () => {
    it('should maintain prototype chain for all errors', () => {
      const errors = [
        new FileNotFoundError('/test'),
        new FilePermissionError('/test', 'read'),
        new MarkdownParsingError('test'),
        new PDFGenerationError('test', 'stage'),
        new ConfigurationError('test', 'key'),
        new ValidationError('field', 'value'),
        new PuppeteerError('test'),
        new ServiceNotAvailableError('test'),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(MD2PDFError);
        expect(error.stack).toBeDefined();
        expect(typeof error.code).toBe('string');
        expect(typeof error.category).toBe('string');
        expect(typeof error.recoverable).toBe('boolean');
        expect(error.context).toBeDefined();
      });
    });

    it('should have proper error names', () => {
      const errorClasses = [
        [FileNotFoundError, 'FileNotFoundError'],
        [FilePermissionError, 'FilePermissionError'],
        [MarkdownParsingError, 'MarkdownParsingError'],
        [PDFGenerationError, 'PDFGenerationError'],
        [ConfigurationError, 'ConfigurationError'],
        [ValidationError, 'ValidationError'],
        [PuppeteerError, 'PuppeteerError'],
        [ServiceNotAvailableError, 'ServiceNotAvailableError'],
      ];

      errorClasses.forEach(([ErrorClass, expectedName]) => {
        const error = new (ErrorClass as any)('test', 'test');
        expect(error.name).toBe(expectedName);
      });
    });
  });
});
