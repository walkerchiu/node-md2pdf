/**
 * Unit tests for Conversion Events
 */

import {
  ConversionStartedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  BatchConversionStartedEvent,
  BatchConversionCompletedEvent,
} from '../../../../../src/core/domain/events/conversion-events';
import { DomainEventValidationError } from '../../../../../src/core/domain/events/domain-event.base';

describe('Conversion Events', () => {
  describe('ConversionStartedEvent', () => {
    const validData = {
      inputFile: '/path/to/input.md',
      outputFile: '/path/to/output.pdf',
      conversionOptions: { theme: 'default', toc: true },
    };

    it('should create event with valid data', () => {
      const event = new ConversionStartedEvent(
        validData.inputFile,
        validData.outputFile,
        validData.conversionOptions,
      );

      expect(event.eventType).toBe(ConversionStartedEvent.EVENT_TYPE);
      expect(event.inputFile).toBe(validData.inputFile);
      expect(event.outputFile).toBe(validData.outputFile);
      expect(event.conversionOptions).toEqual(validData.conversionOptions);
    });

    it('should throw error for empty input file', () => {
      expect(
        () =>
          new ConversionStartedEvent(
            '',
            validData.outputFile,
            validData.conversionOptions,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for null input file', () => {
      expect(
        () =>
          new ConversionStartedEvent(
            null as any,
            validData.outputFile,
            validData.conversionOptions,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for empty output file', () => {
      expect(
        () =>
          new ConversionStartedEvent(
            validData.inputFile,
            '',
            validData.conversionOptions,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for invalid conversion options', () => {
      expect(
        () =>
          new ConversionStartedEvent(
            validData.inputFile,
            validData.outputFile,
            null as any,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should return correct event data', () => {
      const event = new ConversionStartedEvent(
        validData.inputFile,
        validData.outputFile,
        validData.conversionOptions,
      );

      const eventData = event.getEventData();
      expect(eventData).toEqual(validData);
    });

    it('should have unique event ID and timestamp', () => {
      const event1 = new ConversionStartedEvent(
        validData.inputFile,
        validData.outputFile,
        validData.conversionOptions,
      );
      const event2 = new ConversionStartedEvent(
        validData.inputFile,
        validData.outputFile,
        validData.conversionOptions,
      );

      expect(event1.eventId).not.toBe(event2.eventId);
      expect(event1.occurredAt).toBeDefined();
    });
  });

  describe('ConversionCompletedEvent', () => {
    const validData = {
      inputFile: '/path/to/input.md',
      outputFile: '/path/to/output.pdf',
      processingTime: 1500,
      fileSize: 2048,
      metadata: { pages: 3, wordCount: 500 },
    };

    it('should create event with valid data', () => {
      const event = new ConversionCompletedEvent(
        validData.inputFile,
        validData.outputFile,
        validData.processingTime,
        validData.fileSize,
        validData.metadata,
      );

      expect(event.eventType).toBe(ConversionCompletedEvent.EVENT_TYPE);
      expect(event.inputFile).toBe(validData.inputFile);
      expect(event.outputFile).toBe(validData.outputFile);
      expect(event.processingTime).toBe(validData.processingTime);
      expect(event.fileSize).toBe(validData.fileSize);
      expect(event.metadata).toEqual(validData.metadata);
    });

    it('should create event with default empty metadata', () => {
      const event = new ConversionCompletedEvent(
        validData.inputFile,
        validData.outputFile,
        validData.processingTime,
        validData.fileSize,
      );

      expect(event.metadata).toEqual({});
    });

    it('should throw error for negative processing time', () => {
      expect(
        () =>
          new ConversionCompletedEvent(
            validData.inputFile,
            validData.outputFile,
            -100,
            validData.fileSize,
            validData.metadata,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for negative file size', () => {
      expect(
        () =>
          new ConversionCompletedEvent(
            validData.inputFile,
            validData.outputFile,
            validData.processingTime,
            -1,
            validData.metadata,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should accept zero values for processing time and file size', () => {
      expect(
        () =>
          new ConversionCompletedEvent(
            validData.inputFile,
            validData.outputFile,
            0,
            0,
            validData.metadata,
          ),
      ).not.toThrow();
    });

    it('should return correct event data', () => {
      const event = new ConversionCompletedEvent(
        validData.inputFile,
        validData.outputFile,
        validData.processingTime,
        validData.fileSize,
        validData.metadata,
      );

      const eventData = event.getEventData();
      expect(eventData).toEqual(validData);
    });
  });

  describe('ConversionFailedEvent', () => {
    const validData = {
      inputFile: '/path/to/input.md',
      error: 'File parsing failed',
      errorCode: 'PARSE_ERROR',
      context: { line: 42, column: 15 },
    };

    it('should create event with valid data', () => {
      const event = new ConversionFailedEvent(
        validData.inputFile,
        validData.error,
        validData.errorCode,
        validData.context,
      );

      expect(event.eventType).toBe(ConversionFailedEvent.EVENT_TYPE);
      expect(event.inputFile).toBe(validData.inputFile);
      expect(event.error).toBe(validData.error);
      expect(event.errorCode).toBe(validData.errorCode);
      expect(event.context).toEqual(validData.context);
    });

    it('should create event with optional parameters undefined', () => {
      const event = new ConversionFailedEvent(
        validData.inputFile,
        validData.error,
      );

      expect(event.errorCode).toBeUndefined();
      expect(event.context).toBeUndefined();
    });

    it('should throw error for empty input file', () => {
      expect(
        () =>
          new ConversionFailedEvent(
            '',
            validData.error,
            validData.errorCode,
            validData.context,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for empty error message', () => {
      expect(
        () =>
          new ConversionFailedEvent(
            validData.inputFile,
            '',
            validData.errorCode,
            validData.context,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should return correct event data with default context', () => {
      const event = new ConversionFailedEvent(
        validData.inputFile,
        validData.error,
      );

      const eventData = event.getEventData();
      expect(eventData).toEqual({
        inputFile: validData.inputFile,
        error: validData.error,
        errorCode: undefined,
        context: {},
      });
    });
  });

  describe('BatchConversionStartedEvent', () => {
    const validData = {
      inputFiles: ['/path/file1.md', '/path/file2.md', '/path/file3.md'],
      outputDirectory: '/output/dir',
      batchOptions: { parallelProcessing: true, maxConcurrency: 3 },
    };

    it('should create event with valid data', () => {
      const event = new BatchConversionStartedEvent(
        validData.inputFiles,
        validData.outputDirectory,
        validData.batchOptions,
      );

      expect(event.eventType).toBe(BatchConversionStartedEvent.EVENT_TYPE);
      expect(event.inputFiles).toEqual(validData.inputFiles);
      expect(event.outputDirectory).toBe(validData.outputDirectory);
      expect(event.batchOptions).toEqual(validData.batchOptions);
    });

    it('should throw error for empty input files array', () => {
      expect(
        () =>
          new BatchConversionStartedEvent(
            [],
            validData.outputDirectory,
            validData.batchOptions,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for non-array input files', () => {
      expect(
        () =>
          new BatchConversionStartedEvent(
            null as any,
            validData.outputDirectory,
            validData.batchOptions,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for empty output directory', () => {
      expect(
        () =>
          new BatchConversionStartedEvent(
            validData.inputFiles,
            '',
            validData.batchOptions,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for invalid batch options', () => {
      expect(
        () =>
          new BatchConversionStartedEvent(
            validData.inputFiles,
            validData.outputDirectory,
            null as any,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should return correct event data with file count', () => {
      const event = new BatchConversionStartedEvent(
        validData.inputFiles,
        validData.outputDirectory,
        validData.batchOptions,
      );

      const eventData = event.getEventData();
      expect(eventData).toEqual({
        ...validData,
        fileCount: validData.inputFiles.length,
      });
    });
  });

  describe('BatchConversionCompletedEvent', () => {
    const validData = {
      totalFiles: 5,
      successCount: 4,
      failureCount: 1,
      totalProcessingTime: 3000,
      results: [
        { inputFile: 'file1.md', outputFile: 'file1.pdf', success: true },
        { inputFile: 'file2.md', outputFile: 'file2.pdf', success: true },
        { inputFile: 'file3.md', success: false, error: 'Parse error' },
        { inputFile: 'file4.md', outputFile: 'file4.pdf', success: true },
        { inputFile: 'file5.md', outputFile: 'file5.pdf', success: true },
      ],
    };

    it('should create event with valid data', () => {
      const event = new BatchConversionCompletedEvent(
        validData.totalFiles,
        validData.successCount,
        validData.failureCount,
        validData.totalProcessingTime,
        validData.results,
      );

      expect(event.eventType).toBe(BatchConversionCompletedEvent.EVENT_TYPE);
      expect(event.totalFiles).toBe(validData.totalFiles);
      expect(event.successCount).toBe(validData.successCount);
      expect(event.failureCount).toBe(validData.failureCount);
      expect(event.totalProcessingTime).toBe(validData.totalProcessingTime);
      expect(event.results).toEqual(validData.results);
    });

    it('should throw error for negative total files', () => {
      expect(
        () =>
          new BatchConversionCompletedEvent(
            -1,
            validData.successCount,
            validData.failureCount,
            validData.totalProcessingTime,
            validData.results,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for negative success count', () => {
      expect(
        () =>
          new BatchConversionCompletedEvent(
            validData.totalFiles,
            -1,
            validData.failureCount,
            validData.totalProcessingTime,
            validData.results,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for negative failure count', () => {
      expect(
        () =>
          new BatchConversionCompletedEvent(
            validData.totalFiles,
            validData.successCount,
            -1,
            validData.totalProcessingTime,
            validData.results,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should throw error for invalid results array', () => {
      expect(
        () =>
          new BatchConversionCompletedEvent(
            validData.totalFiles,
            validData.successCount,
            validData.failureCount,
            validData.totalProcessingTime,
            null as any,
          ),
      ).toThrow(DomainEventValidationError);
    });

    it('should accept zero values', () => {
      expect(
        () => new BatchConversionCompletedEvent(0, 0, 0, 0, []),
      ).not.toThrow();
    });

    it('should return correct event data with success rate', () => {
      const event = new BatchConversionCompletedEvent(
        validData.totalFiles,
        validData.successCount,
        validData.failureCount,
        validData.totalProcessingTime,
        validData.results,
      );

      const eventData = event.getEventData();
      expect(eventData).toEqual({
        ...validData,
        successRate: validData.successCount / validData.totalFiles,
      });
    });

    it('should handle zero total files for success rate calculation', () => {
      const event = new BatchConversionCompletedEvent(0, 0, 0, 0, []);
      const eventData = event.getEventData();
      expect(eventData.successRate).toBe(0);
    });
  });

  describe('Event inheritance and polymorphism', () => {
    it('should all extend DomainEvent properly', () => {
      const conversionStarted = new ConversionStartedEvent(
        '/input.md',
        '/output.pdf',
        {},
      );
      const conversionCompleted = new ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1000,
        2048,
      );
      const conversionFailed = new ConversionFailedEvent(
        '/input.md',
        'Error message',
      );
      const batchStarted = new BatchConversionStartedEvent(
        ['/file1.md'],
        '/output',
        {},
      );
      const batchCompleted = new BatchConversionCompletedEvent(
        1,
        1,
        0,
        1000,
        [],
      );

      // Check that all events have required DomainEvent properties
      [
        conversionStarted,
        conversionCompleted,
        conversionFailed,
        batchStarted,
        batchCompleted,
      ].forEach((event) => {
        expect(event.eventId).toBeDefined();
        expect(event.occurredAt).toBeInstanceOf(Date);
        expect(event.eventType).toBeDefined();
        expect(typeof event.getEventData).toBe('function');
        expect(typeof event.toJSON).toBe('function');
        expect(typeof event.equals).toBe('function');
      });
    });

    it('should have distinct event types', () => {
      const eventTypes = [
        ConversionStartedEvent.EVENT_TYPE,
        ConversionCompletedEvent.EVENT_TYPE,
        ConversionFailedEvent.EVENT_TYPE,
        BatchConversionStartedEvent.EVENT_TYPE,
        BatchConversionCompletedEvent.EVENT_TYPE,
      ];

      const uniqueTypes = new Set(eventTypes);
      expect(uniqueTypes.size).toBe(eventTypes.length);
    });

    it('should be serializable to JSON', () => {
      const event = new ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1500,
        2048,
        { pages: 3 },
      );

      const json = event.toJSON();
      expect(json).toHaveProperty('eventId');
      expect(json).toHaveProperty('eventType');
      expect(json).toHaveProperty('occurredAt');
      expect(json).toHaveProperty('data');

      // Should be able to stringify
      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });

  describe('Business logic validation', () => {
    it('should validate file paths have appropriate extensions', () => {
      // This could be enhanced in the future to validate file extensions
      const event = new ConversionStartedEvent(
        '/path/document.md',
        '/path/document.pdf',
        { format: 'pdf' },
      );
      expect(event.inputFile.endsWith('.md')).toBe(true);
      expect(event.outputFile.endsWith('.pdf')).toBe(true);
    });

    it('should handle complex batch scenarios', () => {
      const largeResults = Array.from({ length: 100 }, (_, i) => ({
        inputFile: `file${i}.md`,
        outputFile: `file${i}.pdf`,
        success: i % 10 !== 0, // 90% success rate
        error: i % 10 === 0 ? 'Simulated error' : '',
      }));

      const event = new BatchConversionCompletedEvent(
        100,
        90,
        10,
        15000,
        largeResults,
      );

      expect(event.totalFiles).toBe(100);
      expect(event.results.length).toBe(100);

      const eventData = event.getEventData();
      expect(eventData.successRate).toBe(0.9);
    });

    it('should handle edge case with empty conversion options', () => {
      const event = new ConversionStartedEvent(
        '/input.md',
        '/output.pdf',
        {}, // Empty but valid object
      );

      expect(event.conversionOptions).toEqual({});
      expect(event.getEventData().conversionOptions).toEqual({});
    });
  });
});
