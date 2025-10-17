/**
 * Domain Events for PDF Conversion Process
 * Business-specific events related to document conversion
 */

import { DomainEvent } from './domain-event.base';
import {
  EventValidation,
  EVENT_VALIDATION_CONFIGS,
} from './event-validation.base';

/**
 * Event fired when PDF conversion starts
 */
export class ConversionStartedEvent extends DomainEvent {
  public static readonly EVENT_TYPE = 'conversion.started';

  constructor(
    public readonly inputFile: string,
    public readonly outputFile: string,
    public readonly conversionOptions: Record<string, unknown>,
  ) {
    super(ConversionStartedEvent.EVENT_TYPE);
    this.validateInputs();
  }

  private validateInputs(): void {
    const config = EVENT_VALIDATION_CONFIGS['conversion.started'];
    const rules = config.map((rule) => ({
      field: rule.field,
      value: (this as any)[rule.field],
      ruleName: rule.rule,
      errorMessage: rule.message,
    }));
    EventValidation.validateRules(this.eventType, rules);
  }

  getEventData(): Record<string, unknown> {
    return {
      inputFile: this.inputFile,
      outputFile: this.outputFile,
      conversionOptions: this.conversionOptions,
    };
  }
}

/**
 * Event fired when PDF conversion completes successfully
 */
export class ConversionCompletedEvent extends DomainEvent {
  public static readonly EVENT_TYPE = 'conversion.completed';

  constructor(
    public readonly inputFile: string,
    public readonly outputFile: string,
    public readonly processingTime: number,
    public readonly fileSize: number,
    public readonly metadata: Record<string, unknown> = {},
  ) {
    super(ConversionCompletedEvent.EVENT_TYPE);
    this.validateInputs();
  }

  private validateInputs(): void {
    const config = EVENT_VALIDATION_CONFIGS['conversion.completed'];
    const rules = config.map((rule) => ({
      field: rule.field,
      value: (this as any)[rule.field],
      ruleName: rule.rule,
      errorMessage: rule.message,
    }));
    EventValidation.validateRules(this.eventType, rules);
  }

  getEventData(): Record<string, unknown> {
    return {
      inputFile: this.inputFile,
      outputFile: this.outputFile,
      processingTime: this.processingTime,
      fileSize: this.fileSize,
      metadata: this.metadata,
    };
  }
}

/**
 * Event fired when PDF conversion fails
 */
export class ConversionFailedEvent extends DomainEvent {
  public static readonly EVENT_TYPE = 'conversion.failed';

  constructor(
    public readonly inputFile: string,
    public readonly error: string,
    public readonly errorCode?: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(ConversionFailedEvent.EVENT_TYPE);
    this.validateInputs();
  }

  private validateInputs(): void {
    const config = EVENT_VALIDATION_CONFIGS['conversion.failed'];
    const rules = config.map((rule) => ({
      field: rule.field,
      value: (this as any)[rule.field],
      ruleName: rule.rule,
      errorMessage: rule.message,
    }));
    EventValidation.validateRules(this.eventType, rules);
  }

  getEventData(): Record<string, unknown> {
    return {
      inputFile: this.inputFile,
      error: this.error,
      errorCode: this.errorCode,
      context: this.context || {},
    };
  }
}

/**
 * Event fired when batch conversion starts
 */
export class BatchConversionStartedEvent extends DomainEvent {
  public static readonly EVENT_TYPE = 'batch.conversion.started';

  constructor(
    public readonly inputFiles: string[],
    public readonly outputDirectory: string,
    public readonly batchOptions: Record<string, unknown>,
  ) {
    super(BatchConversionStartedEvent.EVENT_TYPE);
    this.validateInputs();
  }

  private validateInputs(): void {
    const config = EVENT_VALIDATION_CONFIGS['batch.conversion.started'];
    const rules = config.map((rule) => ({
      field: rule.field,
      value: (this as any)[rule.field],
      ruleName: rule.rule,
      errorMessage: rule.message,
    }));
    EventValidation.validateRules(this.eventType, rules);
  }

  getEventData(): Record<string, unknown> {
    return {
      inputFiles: this.inputFiles,
      outputDirectory: this.outputDirectory,
      batchOptions: this.batchOptions,
      fileCount: this.inputFiles.length,
    };
  }
}

/**
 * Event fired when batch conversion completes
 */
export class BatchConversionCompletedEvent extends DomainEvent {
  public static readonly EVENT_TYPE = 'batch.conversion.completed';

  constructor(
    public readonly totalFiles: number,
    public readonly successCount: number,
    public readonly failureCount: number,
    public readonly totalProcessingTime: number,
    public readonly results: Array<{
      inputFile: string;
      outputFile?: string;
      success: boolean;
      error?: string;
    }>,
  ) {
    super(BatchConversionCompletedEvent.EVENT_TYPE);
    this.validateInputs();
  }

  private validateInputs(): void {
    const config = EVENT_VALIDATION_CONFIGS['batch.conversion.completed'];
    const rules = config.map((rule) => ({
      field: rule.field,
      value: (this as any)[rule.field],
      ruleName: rule.rule,
      errorMessage: rule.message,
    }));
    EventValidation.validateRules(this.eventType, rules);
  }

  getEventData(): Record<string, unknown> {
    return {
      totalFiles: this.totalFiles,
      successCount: this.successCount,
      failureCount: this.failureCount,
      totalProcessingTime: this.totalProcessingTime,
      successRate:
        this.totalFiles > 0 ? this.successCount / this.totalFiles : 0,
      results: this.results,
    };
  }
}
