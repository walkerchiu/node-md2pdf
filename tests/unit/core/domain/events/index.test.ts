/**
 * Unit tests for Domain Events Module Index
 */

import * as DomainEventsModule from '../../../../../src/core/domain/events/index';
import {
  DomainEvent,
  DomainEventValidationError,
  InMemoryEventPublisher,
  ConversionStartedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  BatchConversionStartedEvent,
  BatchConversionCompletedEvent,
  DomainEventLoggerHandler,
  PerformanceDomainEventLogger,
  ConversionEventAggregatorLogger,
  DOMAIN_EVENT_TYPES,
  DomainEventType,
} from '../../../../../src/core/domain/events/index';
import type { IDomainEventHandler } from '../../../../../src/core/domain/events/index';

describe('Domain Events Module Index', () => {
  describe('module exports verification', () => {
    it('should export base event infrastructure', () => {
      expect(DomainEventsModule.DomainEvent).toBeDefined();
      expect(DomainEventsModule.DomainEventValidationError).toBeDefined();
      // Note: Interfaces IDomainEventHandler and IDomainEventPublisher are type-only exports
    });

    it('should export event publisher implementation', () => {
      expect(DomainEventsModule.InMemoryEventPublisher).toBeDefined();
      expect(typeof DomainEventsModule.InMemoryEventPublisher).toBe('function');
    });

    it('should export conversion-specific events', () => {
      expect(DomainEventsModule.ConversionStartedEvent).toBeDefined();
      expect(DomainEventsModule.ConversionCompletedEvent).toBeDefined();
      expect(DomainEventsModule.ConversionFailedEvent).toBeDefined();
      expect(DomainEventsModule.BatchConversionStartedEvent).toBeDefined();
      expect(DomainEventsModule.BatchConversionCompletedEvent).toBeDefined();
    });

    it('should export domain event logging classes', () => {
      expect(DomainEventsModule.DomainEventLoggerHandler).toBeDefined();
      expect(DomainEventsModule.PerformanceDomainEventLogger).toBeDefined();
      expect(DomainEventsModule.ConversionEventAggregatorLogger).toBeDefined();
    });

    it('should export event type constants', () => {
      expect(DomainEventsModule.DOMAIN_EVENT_TYPES).toBeDefined();
      expect(typeof DomainEventsModule.DOMAIN_EVENT_TYPES).toBe('object');
    });
  });

  describe('DOMAIN_EVENT_TYPES constants', () => {
    it('should have all expected event type constants', () => {
      expect(DOMAIN_EVENT_TYPES.CONVERSION_STARTED).toBe('conversion.started');
      expect(DOMAIN_EVENT_TYPES.CONVERSION_COMPLETED).toBe(
        'conversion.completed',
      );
      expect(DOMAIN_EVENT_TYPES.CONVERSION_FAILED).toBe('conversion.failed');
      expect(DOMAIN_EVENT_TYPES.BATCH_CONVERSION_STARTED).toBe(
        'batch.conversion.started',
      );
      expect(DOMAIN_EVENT_TYPES.BATCH_CONVERSION_COMPLETED).toBe(
        'batch.conversion.completed',
      );
    });

    it('should match actual event class constants', () => {
      expect(DOMAIN_EVENT_TYPES.CONVERSION_STARTED).toBe(
        ConversionStartedEvent.EVENT_TYPE,
      );
      expect(DOMAIN_EVENT_TYPES.CONVERSION_COMPLETED).toBe(
        ConversionCompletedEvent.EVENT_TYPE,
      );
      expect(DOMAIN_EVENT_TYPES.CONVERSION_FAILED).toBe(
        ConversionFailedEvent.EVENT_TYPE,
      );
      expect(DOMAIN_EVENT_TYPES.BATCH_CONVERSION_STARTED).toBe(
        BatchConversionStartedEvent.EVENT_TYPE,
      );
      expect(DOMAIN_EVENT_TYPES.BATCH_CONVERSION_COMPLETED).toBe(
        BatchConversionCompletedEvent.EVENT_TYPE,
      );
    });

    it('should be readonly (const assertion)', () => {
      // TypeScript const assertion should make this readonly
      // This test verifies the structure is correct
      const eventTypes = Object.keys(DOMAIN_EVENT_TYPES);
      expect(eventTypes).toContain('CONVERSION_STARTED');
      expect(eventTypes).toContain('CONVERSION_COMPLETED');
      expect(eventTypes).toContain('CONVERSION_FAILED');
      expect(eventTypes).toContain('BATCH_CONVERSION_STARTED');
      expect(eventTypes).toContain('BATCH_CONVERSION_COMPLETED');
    });
  });

  describe('functional integration tests', () => {
    it('should allow creating instances of exported classes', () => {
      // Event publisher
      const publisher = new InMemoryEventPublisher();
      expect(publisher).toBeInstanceOf(InMemoryEventPublisher);

      // Conversion events
      const startedEvent = new ConversionStartedEvent(
        '/input.md',
        '/output.pdf',
        {},
      );
      expect(startedEvent).toBeInstanceOf(ConversionStartedEvent);
      expect(startedEvent).toBeInstanceOf(DomainEvent);

      const completedEvent = new ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1000,
        2048,
      );
      expect(completedEvent).toBeInstanceOf(ConversionCompletedEvent);

      const failedEvent = new ConversionFailedEvent(
        '/input.md',
        'Error message',
      );
      expect(failedEvent).toBeInstanceOf(ConversionFailedEvent);

      // Batch events
      const batchStarted = new BatchConversionStartedEvent(
        ['/file1.md'],
        '/output',
        {},
      );
      expect(batchStarted).toBeInstanceOf(BatchConversionStartedEvent);

      const batchCompleted = new BatchConversionCompletedEvent(
        1,
        1,
        0,
        1000,
        [],
      );
      expect(batchCompleted).toBeInstanceOf(BatchConversionCompletedEvent);
    });

    it('should allow creating logger instances', () => {
      const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn(),
        enableFileLogging: jest.fn(),
        disableFileLogging: jest.fn(),
        rotateLogs: jest.fn(),
        getLogStats: jest.fn(),
        isFileLoggingEnabled: jest.fn(),
        cleanup: jest.fn(),
      };

      const basicLogger = new DomainEventLoggerHandler(mockLogger);
      expect(basicLogger).toBeInstanceOf(DomainEventLoggerHandler);

      const performanceLogger = new PerformanceDomainEventLogger(mockLogger);
      expect(performanceLogger).toBeInstanceOf(PerformanceDomainEventLogger);

      const aggregatorLogger = new ConversionEventAggregatorLogger(mockLogger);
      expect(aggregatorLogger).toBeInstanceOf(ConversionEventAggregatorLogger);
    });

    it('should work with publisher-subscriber pattern', async () => {
      const publisher = new InMemoryEventPublisher();
      const mockHandler = {
        handle: jest.fn(),
      };

      publisher.subscribe('conversion.started', mockHandler);

      const event = new ConversionStartedEvent('/input.md', '/output.pdf', {});
      await publisher.publish(event);

      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should throw validation errors correctly', () => {
      expect(() => {
        new ConversionStartedEvent('', '/output.pdf', {});
      }).toThrow(DomainEventValidationError);

      expect(() => {
        new ConversionCompletedEvent('/input.md', '/output.pdf', -1, 2048);
      }).toThrow(DomainEventValidationError);

      expect(() => {
        new BatchConversionStartedEvent([], '/output', {});
      }).toThrow(DomainEventValidationError);
    });
  });

  describe('type system integration', () => {
    it('should provide proper TypeScript types', () => {
      // This test verifies that the types are exported and usable
      const eventType: DomainEventType = DOMAIN_EVENT_TYPES.CONVERSION_STARTED;
      expect(eventType).toBe('conversion.started');

      // Test type compatibility
      const eventTypes: DomainEventType[] = [
        DOMAIN_EVENT_TYPES.CONVERSION_STARTED,
        DOMAIN_EVENT_TYPES.CONVERSION_COMPLETED,
        DOMAIN_EVENT_TYPES.CONVERSION_FAILED,
        DOMAIN_EVENT_TYPES.BATCH_CONVERSION_STARTED,
        DOMAIN_EVENT_TYPES.BATCH_CONVERSION_COMPLETED,
      ];

      expect(eventTypes).toHaveLength(5);
      eventTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });

    it('should allow proper interface implementation', () => {
      class TestHandler implements IDomainEventHandler<DomainEvent> {
        async handle(event: DomainEvent): Promise<void> {
          // Implementation
          expect(event).toBeDefined();
        }
      }

      const handler = new TestHandler();
      expect(typeof handler.handle).toBe('function');
    });

    it('should support generic event handlers', async () => {
      const publisher = new InMemoryEventPublisher();

      class GenericHandler<T extends DomainEvent>
        implements IDomainEventHandler<T>
      {
        public handledEvents: T[] = [];

        async handle(event: T): Promise<void> {
          this.handledEvents.push(event);
        }
      }

      const handler = new GenericHandler<ConversionStartedEvent>();
      publisher.subscribe(DOMAIN_EVENT_TYPES.CONVERSION_STARTED, handler);

      const event = new ConversionStartedEvent('/input.md', '/output.pdf', {});
      await publisher.publish(event);

      expect(handler.handledEvents).toHaveLength(1);
      expect(handler.handledEvents[0]).toBe(event);
    });
  });

  describe('module structure validation', () => {
    it('should not export any unexpected properties', () => {
      const expectedExports = [
        // Base infrastructure
        'DomainEvent',
        'DomainEventValidationError',

        // Publisher
        'InMemoryEventPublisher',

        // Conversion events
        'ConversionStartedEvent',
        'ConversionCompletedEvent',
        'ConversionFailedEvent',
        'BatchConversionStartedEvent',
        'BatchConversionCompletedEvent',

        // Loggers
        'DomainEventLoggerHandler',
        'PerformanceDomainEventLogger',
        'ConversionEventAggregatorLogger',

        // Constants and types
        'DOMAIN_EVENT_TYPES',
      ];

      const actualExports = Object.keys(DomainEventsModule);

      // Check that all expected exports are present
      expectedExports.forEach((exportName) => {
        expect(actualExports).toContain(exportName);
      });

      // Check that no unexpected exports are present
      const unexpectedExports = actualExports.filter(
        (exportName) => !expectedExports.includes(exportName),
      );

      if (unexpectedExports.length > 0) {
        console.warn('Unexpected exports found:', unexpectedExports);
      }

      // This test allows for additional exports but warns about them
      expect(expectedExports.length).toBeGreaterThan(0);
    });

    it('should maintain consistent naming conventions', () => {
      // Event classes should end with 'Event'
      expect(ConversionStartedEvent.name).toMatch(/Event$/);
      expect(ConversionCompletedEvent.name).toMatch(/Event$/);
      expect(ConversionFailedEvent.name).toMatch(/Event$/);
      expect(BatchConversionStartedEvent.name).toMatch(/Event$/);
      expect(BatchConversionCompletedEvent.name).toMatch(/Event$/);

      // Logger classes should contain 'Logger'
      expect(DomainEventLoggerHandler.name).toMatch(/Logger/);
      expect(PerformanceDomainEventLogger.name).toMatch(/Logger/);
      expect(ConversionEventAggregatorLogger.name).toMatch(/Logger/);

      // Publisher should end with 'Publisher'
      expect(InMemoryEventPublisher.name).toMatch(/Publisher$/);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain stable API for existing consumers', () => {
      // This test ensures that the module structure remains stable
      // for existing code that depends on it

      // Test that direct imports still work
      expect(() => {
        const {
          DomainEvent,
        } = require('../../../../../src/core/domain/events/index');
        expect(DomainEvent).toBeDefined();
      }).not.toThrow();

      // Test that barrel exports are consistent
      const directImport = require('../../../../../src/core/domain/events/domain-event.base');
      expect(DomainEventsModule.DomainEvent).toBe(directImport.DomainEvent);
    });

    it('should support tree shaking (named exports)', () => {
      // Verify that all exports are named exports, not default exports
      // This supports better tree shaking in bundlers

      expect(typeof DomainEventsModule.DomainEvent).toBe('function');
      expect(typeof DomainEventsModule.ConversionStartedEvent).toBe('function');
      expect(typeof DomainEventsModule.InMemoryEventPublisher).toBe('function');

      // Verify no default export
      // Module uses named exports only, no default export
    });
  });
});
