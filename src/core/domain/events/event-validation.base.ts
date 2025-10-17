/**
 * Event Validation Base Classes
 * Provides common validation utilities for domain events
 */

import { DomainEventValidationError } from './domain-event.base';

export interface ValidationRule {
  field: string;
  value: unknown;
  ruleName: string;
  errorMessage: string;
}

/**
 * Base validation utilities for domain events
 */
export class EventValidation {
  /**
   * Validate that a value is a non-empty string
   */
  static validateNonEmptyString(
    eventType: string,
    _field: string,
    value: unknown,
    fieldName: string,
  ): void {
    if (!value || typeof value !== 'string') {
      throw new DomainEventValidationError(
        eventType,
        value,
        'non-empty-string',
        `${fieldName} must be a non-empty string`,
      );
    }
  }

  /**
   * Validate that a value is a positive number
   */
  static validatePositiveNumber(
    eventType: string,
    _field: string,
    value: unknown,
    fieldName: string,
  ): void {
    if (typeof value !== 'number' || value < 0) {
      throw new DomainEventValidationError(
        eventType,
        value,
        'positive-number',
        `${fieldName} must be a positive number`,
      );
    }
  }

  /**
   * Validate that a value is a valid object
   */
  static validateValidObject(
    eventType: string,
    _field: string,
    value: unknown,
    fieldName: string,
  ): void {
    if (!value || typeof value !== 'object') {
      throw new DomainEventValidationError(
        eventType,
        value,
        'valid-object',
        `${fieldName} must be a valid object`,
      );
    }
  }

  /**
   * Validate that a value is a non-empty array
   */
  static validateNonEmptyArray(
    eventType: string,
    _field: string,
    value: unknown,
    fieldName: string,
  ): void {
    if (!Array.isArray(value) || value.length === 0) {
      throw new DomainEventValidationError(
        eventType,
        value,
        'non-empty-array',
        `${fieldName} must be a non-empty array`,
      );
    }
  }

  /**
   * Validate that a value is a valid array
   */
  static validateValidArray(
    eventType: string,
    _field: string,
    value: unknown,
    fieldName: string,
  ): void {
    if (!Array.isArray(value)) {
      throw new DomainEventValidationError(
        eventType,
        value,
        'valid-array',
        `${fieldName} must be a valid array`,
      );
    }
  }

  /**
   * Execute multiple validation rules
   */
  static validateRules(eventType: string, rules: ValidationRule[]): void {
    rules.forEach((rule) => {
      const { field, value, ruleName, errorMessage } = rule;

      switch (ruleName) {
        case 'non-empty-string':
          EventValidation.validateNonEmptyString(
            eventType,
            field,
            value,
            errorMessage,
          );
          break;
        case 'positive-number':
          EventValidation.validatePositiveNumber(
            eventType,
            field,
            value,
            errorMessage,
          );
          break;
        case 'valid-object':
          EventValidation.validateValidObject(
            eventType,
            field,
            value,
            errorMessage,
          );
          break;
        case 'non-empty-array':
          EventValidation.validateNonEmptyArray(
            eventType,
            field,
            value,
            errorMessage,
          );
          break;
        case 'valid-array':
          EventValidation.validateValidArray(
            eventType,
            field,
            value,
            errorMessage,
          );
          break;
        default:
          throw new Error(`Unknown validation rule: ${ruleName}`);
      }
    });
  }
}

/**
 * Mixin for adding validation capabilities to domain events
 */
export interface ValidatedEvent {
  validateInputs(): void;
}

/**
 * Validation configuration for different event types
 */
export const EVENT_VALIDATION_CONFIGS = {
  'conversion.started': [
    { field: 'inputFile', rule: 'non-empty-string', message: 'Input file' },
    { field: 'outputFile', rule: 'non-empty-string', message: 'Output file' },
    {
      field: 'conversionOptions',
      rule: 'valid-object',
      message: 'Conversion options',
    },
  ],
  'conversion.completed': [
    { field: 'inputFile', rule: 'non-empty-string', message: 'Input file' },
    { field: 'outputFile', rule: 'non-empty-string', message: 'Output file' },
    {
      field: 'processingTime',
      rule: 'positive-number',
      message: 'Processing time',
    },
    { field: 'fileSize', rule: 'positive-number', message: 'File size' },
  ],
  'conversion.failed': [
    { field: 'inputFile', rule: 'non-empty-string', message: 'Input file' },
    { field: 'error', rule: 'non-empty-string', message: 'Error message' },
  ],
  'batch.conversion.started': [
    { field: 'inputFiles', rule: 'non-empty-array', message: 'Input files' },
    {
      field: 'outputDirectory',
      rule: 'non-empty-string',
      message: 'Output directory',
    },
    { field: 'batchOptions', rule: 'valid-object', message: 'Batch options' },
  ],
  'batch.conversion.completed': [
    { field: 'totalFiles', rule: 'positive-number', message: 'Total files' },
    {
      field: 'successCount',
      rule: 'positive-number',
      message: 'Success count',
    },
    {
      field: 'failureCount',
      rule: 'positive-number',
      message: 'Failure count',
    },
    { field: 'results', rule: 'valid-array', message: 'Results' },
  ],
} as const;
