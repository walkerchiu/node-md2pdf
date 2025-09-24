/**
 * Custom error classes for MD2PDF
 */

export class MD2PDFError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly recoverable: boolean;
  public readonly context?: Record<string, unknown>;
  constructor(
    message: string,
    code: string,
    category: string,
    recoverable: boolean = false,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'MD2PDFError';
    this.code = code;
    this.category = category;
    this.recoverable = recoverable;
    this.context = context || {};
  }
}

export class FileNotFoundError extends MD2PDFError {
  public readonly filePath: string;
  constructor(filePath: string, context?: Record<string, unknown>) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', 'file_system', true, {
      filePath,
      ...context,
    });
    this.name = 'FileNotFoundError';
    this.filePath = filePath;
  }
}

export class FilePermissionError extends MD2PDFError {
  public readonly filePath: string;
  constructor(filePath: string, operation: string, context?: Record<string, unknown>) {
    super(
      `Permission denied: cannot ${operation} file ${filePath}`,
      'FILE_PERMISSION_DENIED',
      'file_system',
      true,
      { filePath, operation, ...context },
    );
    this.name = 'FilePermissionError';
    this.filePath = filePath;
  }
}

export class MarkdownParsingError extends MD2PDFError {
  public readonly filePath: string | undefined;
  public readonly lineNumber: number | undefined;
  constructor(
    message: string,
    filePath?: string,
    lineNumber?: number,
    context?: Record<string, unknown>,
  ) {
    super(
      `Markdown parsing error: ${message}`,
      'MARKDOWN_PARSING_ERROR',
      'markdown_parsing',
      false,
      { filePath, lineNumber, ...context },
    );
    this.name = 'MarkdownParsingError';
    this.filePath = filePath;
    this.lineNumber = lineNumber;
  }
}

export class PDFGenerationError extends MD2PDFError {
  public readonly stage: string;
  constructor(message: string, stage: string, context?: Record<string, unknown>) {
    super(
      `PDF generation error at stage '${stage}': ${message}`,
      'PDF_GENERATION_ERROR',
      'pdf_generation',
      true,
      { stage, ...context },
    );
    this.name = 'PDFGenerationError';
    this.stage = stage;
  }
}

export class ConfigurationError extends MD2PDFError {
  public readonly configKey: string;
  constructor(message: string, configKey: string, context?: Record<string, unknown>) {
    super(
      `Configuration error for key '${configKey}': ${message}`,
      'CONFIGURATION_ERROR',
      'configuration',
      true,
      { configKey, ...context },
    );
    this.name = 'ConfigurationError';
    this.configKey = configKey;
  }
}

export class ValidationError extends MD2PDFError {
  public readonly field: string;
  public readonly value: unknown;
  constructor(field: string, value: unknown, message?: string, context?: Record<string, unknown>) {
    const defaultMessage = `Validation failed for field '${field}' with value: ${value}`;
    super(message || defaultMessage, 'VALIDATION_ERROR', 'validation', true, {
      field,
      value,
      ...context,
    });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class PuppeteerError extends MD2PDFError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Puppeteer error: ${message}`, 'PUPPETEER_ERROR', 'pdf_generation', true, context);
    this.name = 'PuppeteerError';
  }
}

export class ServiceNotAvailableError extends MD2PDFError {
  public readonly serviceName: string;
  constructor(serviceName: string, context?: Record<string, unknown>) {
    super(`Service not available: ${serviceName}`, 'SERVICE_NOT_AVAILABLE', 'configuration', true, {
      serviceName,
      ...context,
    });
    this.name = 'ServiceNotAvailableError';
    this.serviceName = serviceName;
  }
}
