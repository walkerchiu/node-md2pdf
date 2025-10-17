/**
 * Unit tests for Domain Event Loggers
 */

import {
  DomainEventLoggerHandler,
  PerformanceDomainEventLogger,
  ConversionEventAggregatorLogger,
  DomainEventLogEntry,
} from '../../../../../src/core/domain/events/domain-event-logger';
import { DomainEvent } from '../../../../../src/core/domain/events/domain-event.base';
import {
  ConversionStartedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
} from '../../../../../src/core/domain/events/conversion-events';

// Mock Enhanced Logger
const mockEnhancedLogger = {
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

// Test event class
class TestEvent extends DomainEvent {
  public static readonly EVENT_TYPE = 'test.event';

  constructor(public readonly testData: string) {
    super(TestEvent.EVENT_TYPE);
  }

  getEventData(): Record<string, unknown> {
    return { testData: this.testData };
  }
}

describe('Domain Event Loggers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations
    mockEnhancedLogger.info.mockImplementation(jest.fn());
    mockEnhancedLogger.debug.mockImplementation(jest.fn());
    mockEnhancedLogger.error.mockImplementation(jest.fn());
    // Reset performance global if available
    if (typeof global.performance !== 'undefined') {
      global.performance.now = jest.fn(() => Date.now());
    }
  });

  describe('DomainEventLoggerHandler', () => {
    it('should log events at info level by default', async () => {
      const logger = new DomainEventLoggerHandler(mockEnhancedLogger);
      const event = new TestEvent('test data');

      await logger.handle(event);

      expect(mockEnhancedLogger.info).toHaveBeenCalledWith(
        'Domain Event',
        expect.objectContaining({
          eventId: event.eventId,
          eventType: event.eventType,
          occurredAt: event.occurredAt.toISOString(),
          data: { testData: 'test data' },
        }),
      );
      expect(mockEnhancedLogger.debug).not.toHaveBeenCalled();
    });

    it('should log events at debug level when configured', async () => {
      const logger = new DomainEventLoggerHandler(mockEnhancedLogger, 'debug');
      const event = new TestEvent('debug data');

      await logger.handle(event);

      expect(mockEnhancedLogger.debug).toHaveBeenCalledWith(
        'Domain Event',
        expect.objectContaining({
          eventId: event.eventId,
          eventType: event.eventType,
          occurredAt: event.occurredAt.toISOString(),
          data: { testData: 'debug data' },
        }),
      );
      expect(mockEnhancedLogger.info).not.toHaveBeenCalled();
    });

    it('should create proper log entry structure', async () => {
      const logger = new DomainEventLoggerHandler(mockEnhancedLogger);
      const event = new ConversionStartedEvent('/input.md', '/output.pdf', {
        theme: 'default',
      });

      await logger.handle(event);

      const logEntry: DomainEventLogEntry =
        mockEnhancedLogger.info.mock.calls[0][1];
      expect(logEntry).toEqual({
        eventId: event.eventId,
        eventType: 'conversion.started',
        occurredAt: event.occurredAt.toISOString(),
        data: {
          inputFile: '/input.md',
          outputFile: '/output.pdf',
          conversionOptions: { theme: 'default' },
        },
      });
    });

    it('should handle events with complex data structures', async () => {
      const logger = new DomainEventLoggerHandler(mockEnhancedLogger);
      const event = new ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1500,
        2048,
        { pages: 3, metadata: { author: 'Test Author' } },
      );

      await logger.handle(event);

      const logEntry: DomainEventLogEntry =
        mockEnhancedLogger.info.mock.calls[0][1];
      expect(logEntry.data).toEqual({
        inputFile: '/input.md',
        outputFile: '/output.pdf',
        processingTime: 1500,
        fileSize: 2048,
        metadata: { pages: 3, metadata: { author: 'Test Author' } },
      });
    });
  });

  describe('PerformanceDomainEventLogger', () => {
    beforeEach(() => {
      // Mock performance.now() with incrementing values
      let counter = 0;
      global.performance = {
        now: jest.fn(() => (counter += 100)), // Each call adds 100ms
      } as any;
    });

    it('should track performance when enabled', async () => {
      const logger = new PerformanceDomainEventLogger(mockEnhancedLogger, true);
      const event = new TestEvent('performance test');

      await logger.handle(event);

      const logEntry: DomainEventLogEntry =
        mockEnhancedLogger.info.mock.calls[0][1];
      expect(logEntry).toHaveProperty('processingTime');
      expect(typeof logEntry.processingTime).toBe('number');
      expect(logEntry.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should not track performance when disabled', async () => {
      const logger = new PerformanceDomainEventLogger(
        mockEnhancedLogger,
        false,
      );
      const event = new TestEvent('no performance test');

      await logger.handle(event);

      const logEntry: DomainEventLogEntry =
        mockEnhancedLogger.info.mock.calls[0][1];
      expect(logEntry).not.toHaveProperty('processingTime');
    });

    it('should track performance statistics by event type', async () => {
      const logger = new PerformanceDomainEventLogger(mockEnhancedLogger, true);
      const event1 = new TestEvent('test 1');
      const event2 = new TestEvent('test 2');

      await logger.handle(event1);
      await logger.handle(event2);

      const stats = logger.getPerformanceStats();
      expect('test.event' in stats).toBe(true);
      expect(typeof stats['test.event']).toBe('number');
    });

    it('should calculate average processing time correctly', async () => {
      const logger = new PerformanceDomainEventLogger(mockEnhancedLogger, true);

      // Mock performance.now to return predictable values
      // First call returns 0, second call returns 100, third call returns 200, fourth call returns 300
      let callCount = 0;
      global.performance.now = jest.fn(() => callCount++ * 100);

      const event1 = new TestEvent('test 1'); // Duration: 100ms (100 - 0)
      const event2 = new TestEvent('test 2'); // Duration: 100ms (300 - 200)

      await logger.handle(event1);
      await logger.handle(event2);

      const stats = logger.getPerformanceStats();
      expect(stats['test.event']).toBe(100); // Average of 100 and 100
    });

    it('should reset performance statistics', async () => {
      const logger = new PerformanceDomainEventLogger(mockEnhancedLogger, true);
      const event = new TestEvent('test');

      await logger.handle(event);
      expect(Object.keys(logger.getPerformanceStats())).toHaveLength(1);

      logger.resetPerformanceStats();
      expect(Object.keys(logger.getPerformanceStats())).toHaveLength(0);
    });

    it('should handle multiple event types separately', async () => {
      const logger = new PerformanceDomainEventLogger(mockEnhancedLogger, true);
      const testEvent = new TestEvent('test');
      const conversionEvent = new ConversionStartedEvent(
        '/input.md',
        '/output.pdf',
        {},
      );

      await logger.handle(testEvent);
      await logger.handle(conversionEvent);

      const stats = logger.getPerformanceStats();
      expect('test.event' in stats).toBe(true);
      expect('conversion.started' in stats).toBe(true);
    });
  });

  describe('ConversionEventAggregatorLogger', () => {
    it('should track conversion started events', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);
      const event = new ConversionStartedEvent('/input.md', '/output.pdf', {});

      await logger.handle(event);

      const stats = logger.getConversionStats();
      expect(stats.totalConversions).toBe(1);
      expect(stats.successfulConversions).toBe(0);
      expect(stats.failedConversions).toBe(0);
    });

    it('should track conversion completed events', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);
      const startEvent = new ConversionStartedEvent(
        '/input.md',
        '/output.pdf',
        {},
      );
      const completeEvent = new ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1500,
        2048,
      );

      await logger.handle(startEvent);
      await logger.handle(completeEvent);

      const stats = logger.getConversionStats();
      expect(stats.totalConversions).toBe(1);
      expect(stats.successfulConversions).toBe(1);
      expect(stats.failedConversions).toBe(0);
      expect(stats.totalProcessingTime).toBe(1500);
      expect(stats.averageFileSize).toBe(2048);
      expect(stats.lastConversionTime).toEqual(completeEvent.occurredAt);
    });

    it('should track conversion failed events', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);
      const startEvent = new ConversionStartedEvent(
        '/input.md',
        '/output.pdf',
        {},
      );
      const failedEvent = new ConversionFailedEvent('/input.md', 'Parse error');

      await logger.handle(startEvent);
      await logger.handle(failedEvent);

      const stats = logger.getConversionStats();
      expect(stats.totalConversions).toBe(1);
      expect(stats.successfulConversions).toBe(0);
      expect(stats.failedConversions).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    it('should calculate success rate correctly', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);

      // Start 3 conversions
      await logger.handle(
        new ConversionStartedEvent('/input1.md', '/output1.pdf', {}),
      );
      await logger.handle(
        new ConversionStartedEvent('/input2.md', '/output2.pdf', {}),
      );
      await logger.handle(
        new ConversionStartedEvent('/input3.md', '/output3.pdf', {}),
      );

      // Complete 2, fail 1
      await logger.handle(
        new ConversionCompletedEvent('/input1.md', '/output1.pdf', 1000, 1024),
      );
      await logger.handle(
        new ConversionCompletedEvent('/input2.md', '/output2.pdf', 2000, 2048),
      );
      await logger.handle(new ConversionFailedEvent('/input3.md', 'Error'));

      const stats = logger.getConversionStats();
      expect(stats.totalConversions).toBe(3);
      expect(stats.successfulConversions).toBe(2);
      expect(stats.failedConversions).toBe(1);
      expect(stats.successRate).toBeCloseTo(2 / 3, 2);
    });

    it('should calculate average processing time correctly', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);

      await logger.handle(
        new ConversionCompletedEvent('/input1.md', '/output1.pdf', 1000, 1024),
      );
      await logger.handle(
        new ConversionCompletedEvent('/input2.md', '/output2.pdf', 3000, 2048),
      );

      const stats = logger.getConversionStats();
      expect(stats.averageProcessingTime).toBe(2000); // (1000 + 3000) / 2
    });

    it('should calculate average file size correctly', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);

      await logger.handle(
        new ConversionCompletedEvent('/input1.md', '/output1.pdf', 1000, 1000),
      );
      await logger.handle(
        new ConversionCompletedEvent('/input2.md', '/output2.pdf', 2000, 3000),
      );

      const stats = logger.getConversionStats();
      expect(stats.averageFileSize).toBe(2000); // (1000 + 3000) / 2
    });

    it('should log aggregated stats every 10 conversions', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);

      // Trigger 10 conversions to trigger logging
      for (let i = 1; i <= 10; i++) {
        await logger.handle(
          new ConversionStartedEvent(`/input${i}.md`, `/output${i}.pdf`, {}),
        );
      }

      expect(mockEnhancedLogger.info).toHaveBeenCalledWith(
        'Conversion Aggregated Stats',
        expect.objectContaining({
          totalConversions: 10,
          successRate: expect.any(Number),
          averageProcessingTime: expect.any(Number),
        }),
      );
    });

    it('should handle zero division for empty stats', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);

      const stats = logger.getConversionStats();
      expect(stats.successRate).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
    });

    it('should reset statistics correctly', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);

      await logger.handle(
        new ConversionStartedEvent('/input.md', '/output.pdf', {}),
      );
      await logger.handle(
        new ConversionCompletedEvent('/input.md', '/output.pdf', 1500, 2048),
      );

      let stats = logger.getConversionStats();
      expect(stats.totalConversions).toBe(1);

      logger.resetStats();
      stats = logger.getConversionStats();
      expect(stats.totalConversions).toBe(0);
      expect(stats.successfulConversions).toBe(0);
      expect(stats.failedConversions).toBe(0);
      expect(stats.totalProcessingTime).toBe(0);
      expect(stats.averageFileSize).toBe(0);
      expect(stats.lastConversionTime).toBeNull();
    });

    it('should force log current stats', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);

      await logger.handle(
        new ConversionStartedEvent('/input.md', '/output.pdf', {}),
      );
      await logger.forceLogStats();

      expect(mockEnhancedLogger.info).toHaveBeenCalledWith(
        'Conversion Aggregated Stats',
        expect.objectContaining({
          totalConversions: 1,
        }),
      );
    });

    it('should ignore non-conversion events', async () => {
      const logger = new ConversionEventAggregatorLogger(mockEnhancedLogger);
      const testEvent = new TestEvent('not a conversion event');

      await logger.handle(testEvent);

      const stats = logger.getConversionStats();
      expect(stats.totalConversions).toBe(0);
      expect(stats.successfulConversions).toBe(0);
      expect(stats.failedConversions).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple loggers for the same event', async () => {
      const basicLogger = new DomainEventLoggerHandler(mockEnhancedLogger);
      const performanceLogger = new PerformanceDomainEventLogger(
        mockEnhancedLogger,
      );
      const aggregatorLogger = new ConversionEventAggregatorLogger(
        mockEnhancedLogger,
      );

      const event = new ConversionCompletedEvent(
        '/input.md',
        '/output.pdf',
        1500,
        2048,
      );

      await Promise.all([
        basicLogger.handle(event),
        performanceLogger.handle(event),
        aggregatorLogger.handle(event),
      ]);

      // Basic logger should log
      expect(mockEnhancedLogger.info).toHaveBeenCalledWith(
        'Domain Event',
        expect.objectContaining({ eventType: 'conversion.completed' }),
      );

      // Performance logger should log with performance data
      expect(mockEnhancedLogger.info).toHaveBeenCalledWith(
        'Domain Event Performance',
        expect.objectContaining({ eventType: 'conversion.completed' }),
      );

      // Aggregator should update stats
      const stats = aggregatorLogger.getConversionStats();
      expect(stats.successfulConversions).toBe(1);
    });

    it('should handle large event data efficiently', async () => {
      const logger = new DomainEventLoggerHandler(mockEnhancedLogger);
      const largeData = Array.from({ length: 1000 }, (_, i) => `item${i}`);

      class LargeDataEvent extends DomainEvent {
        constructor() {
          super('large.data.event');
        }

        getEventData() {
          return { largeArray: largeData };
        }
      }

      const event = new LargeDataEvent();
      await logger.handle(event);

      expect(mockEnhancedLogger.info).toHaveBeenCalledWith(
        'Domain Event',
        expect.objectContaining({
          data: { largeArray: largeData },
        }),
      );
    });
  });

  describe('Error handling scenarios', () => {
    beforeEach(() => {
      // Reset all mocks before error handling tests
      jest.clearAllMocks();
      mockEnhancedLogger.info.mockImplementation(jest.fn());
      mockEnhancedLogger.debug.mockImplementation(jest.fn());
      mockEnhancedLogger.error.mockImplementation(jest.fn());
    });

    it('should handle error conditions gracefully', async () => {
      const logger = new DomainEventLoggerHandler(mockEnhancedLogger);

      // Mock logger to throw error
      mockEnhancedLogger.info.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const event = new TestEvent('error test');

      // Should throw error as logger throws
      await expect(logger.handle(event)).rejects.toThrow('Logging failed');
    });
  });

  describe('Type safety and contracts', () => {
    beforeEach(() => {
      // Reset all mocks before type safety tests
      jest.clearAllMocks();
      mockEnhancedLogger.info.mockImplementation(jest.fn());
      mockEnhancedLogger.debug.mockImplementation(jest.fn());
      mockEnhancedLogger.error.mockImplementation(jest.fn());
    });

    it('should implement IDomainEventHandler interface correctly', () => {
      const basicLogger = new DomainEventLoggerHandler(mockEnhancedLogger);
      const performanceLogger = new PerformanceDomainEventLogger(
        mockEnhancedLogger,
      );
      const aggregatorLogger = new ConversionEventAggregatorLogger(
        mockEnhancedLogger,
      );

      expect(typeof basicLogger.handle).toBe('function');
      expect(typeof performanceLogger.handle).toBe('function');
      expect(typeof aggregatorLogger.handle).toBe('function');
    });

    it('should handle async operations correctly', async () => {
      const logger = new DomainEventLoggerHandler(mockEnhancedLogger);
      const event = new TestEvent('async test');

      const promise = logger.handle(event);
      expect(promise).toBeInstanceOf(Promise);

      await expect(promise).resolves.toBeUndefined();
    });
  });
});
