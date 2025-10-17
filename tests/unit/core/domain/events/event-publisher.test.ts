/**
 * Unit tests for InMemoryEventPublisher
 */

import { jest } from '@jest/globals';
import {
  DomainEvent,
  IDomainEventHandler,
} from '../../../../../src/core/domain/events/domain-event.base';
import { InMemoryEventPublisher } from '../../../../../src/core/domain/events/event-publisher';

// Test event implementations
class TestEvent extends DomainEvent {
  public static readonly EVENT_TYPE = 'test.event';

  constructor(public readonly data: string) {
    super(TestEvent.EVENT_TYPE);
  }

  getEventData(): Record<string, unknown> {
    return { data: this.data };
  }
}

class OtherTestEvent extends DomainEvent {
  public static readonly EVENT_TYPE = 'other.test.event';

  constructor(public readonly value: number) {
    super(OtherTestEvent.EVENT_TYPE);
  }

  getEventData(): Record<string, unknown> {
    return { value: this.value };
  }
}

// Test handler implementations
class MockEventHandler implements IDomainEventHandler<TestEvent> {
  public handleCallCount = 0;
  public handledEvents: TestEvent[] = [];
  public shouldThrowError = false;
  public asyncDelay = 0;

  async handle(event: TestEvent): Promise<void> {
    if (this.asyncDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.asyncDelay));
    }

    if (this.shouldThrowError) {
      throw new Error(`Handler error for event ${event.eventId}`);
    }

    this.handleCallCount++;
    this.handledEvents.push(event);
  }

  reset(): void {
    this.handleCallCount = 0;
    this.handledEvents = [];
    this.shouldThrowError = false;
    this.asyncDelay = 0;
  }
}

class SyncMockEventHandler implements IDomainEventHandler<TestEvent> {
  public handleCallCount = 0;

  handle(_event: TestEvent): void {
    this.handleCallCount++;
  }
}

describe('InMemoryEventPublisher', () => {
  let publisher: InMemoryEventPublisher;
  let mockHandler: MockEventHandler;
  let otherMockHandler: MockEventHandler;
  let syncHandler: SyncMockEventHandler;

  beforeEach(() => {
    publisher = new InMemoryEventPublisher();
    mockHandler = new MockEventHandler();
    otherMockHandler = new MockEventHandler();
    syncHandler = new SyncMockEventHandler();
  });

  afterEach(() => {
    publisher.clear();
    mockHandler.reset();
    otherMockHandler.reset();
  });

  describe('subscribe method', () => {
    it('should subscribe handler to event type', () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);

      expect(publisher.hasHandlers(TestEvent.EVENT_TYPE)).toBe(true);
      expect(publisher.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(1);
    });

    it('should subscribe multiple handlers to same event type', () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(TestEvent.EVENT_TYPE, otherMockHandler);

      expect(publisher.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(2);
    });

    it('should not add duplicate handlers', () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);

      expect(publisher.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(1);
    });

    it('should subscribe handlers to different event types', () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(OtherTestEvent.EVENT_TYPE, otherMockHandler);

      expect(publisher.hasHandlers(TestEvent.EVENT_TYPE)).toBe(true);
      expect(publisher.hasHandlers(OtherTestEvent.EVENT_TYPE)).toBe(true);
      expect(publisher.getRegisteredEventTypes()).toContain(
        TestEvent.EVENT_TYPE,
      );
      expect(publisher.getRegisteredEventTypes()).toContain(
        OtherTestEvent.EVENT_TYPE,
      );
    });
  });

  describe('unsubscribe method', () => {
    beforeEach(() => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(TestEvent.EVENT_TYPE, otherMockHandler);
    });

    it('should unsubscribe specific handler', () => {
      publisher.unsubscribe(TestEvent.EVENT_TYPE, mockHandler);

      expect(publisher.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(1);
    });

    it('should remove event type when no handlers remain', () => {
      publisher.unsubscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.unsubscribe(TestEvent.EVENT_TYPE, otherMockHandler);

      expect(publisher.hasHandlers(TestEvent.EVENT_TYPE)).toBe(false);
      expect(publisher.getRegisteredEventTypes()).not.toContain(
        TestEvent.EVENT_TYPE,
      );
    });

    it('should handle unsubscribing non-existent handler', () => {
      const nonExistentHandler = new MockEventHandler();

      expect(() => {
        publisher.unsubscribe(TestEvent.EVENT_TYPE, nonExistentHandler);
      }).not.toThrow();

      expect(publisher.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(2);
    });

    it('should handle unsubscribing from non-existent event type', () => {
      expect(() => {
        publisher.unsubscribe('non.existent.event', mockHandler);
      }).not.toThrow();
    });
  });

  describe('publish method', () => {
    it('should publish event to subscribed handlers', async () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      const event = new TestEvent('test data');

      await publisher.publish(event);

      expect(mockHandler.handleCallCount).toBe(1);
      expect(mockHandler.handledEvents[0]).toBe(event);
    });

    it('should publish event to multiple handlers', async () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(TestEvent.EVENT_TYPE, otherMockHandler);
      const event = new TestEvent('test data');

      await publisher.publish(event);

      expect(mockHandler.handleCallCount).toBe(1);
      expect(otherMockHandler.handleCallCount).toBe(1);
    });

    it('should not publish to handlers of different event types', async () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(OtherTestEvent.EVENT_TYPE, otherMockHandler);

      const testEvent = new TestEvent('test data');
      await publisher.publish(testEvent);

      expect(mockHandler.handleCallCount).toBe(1);
      expect(otherMockHandler.handleCallCount).toBe(0);
    });

    it('should handle events with no subscribed handlers', async () => {
      const event = new TestEvent('test data');

      await expect(publisher.publish(event)).resolves.not.toThrow();
    });

    it('should handle synchronous handlers', async () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, syncHandler);
      const event = new TestEvent('test data');

      await publisher.publish(event);

      expect(syncHandler.handleCallCount).toBe(1);
    });
  });

  describe('error handling during publish', () => {
    it('should handle handler errors gracefully', async () => {
      mockHandler.shouldThrowError = true;
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(TestEvent.EVENT_TYPE, otherMockHandler);

      const event = new TestEvent('test data');

      // Should not throw, but should complete
      await expect(publisher.publish(event)).resolves.not.toThrow();

      // Non-erroring handler should still be called
      expect(otherMockHandler.handleCallCount).toBe(1);
    });

    it('should log handler errors to console', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockHandler.shouldThrowError = true;
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);

      const event = new TestEvent('test data');
      await publisher.publish(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler for test.event:'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle multiple handler errors', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockHandler.shouldThrowError = true;
      otherMockHandler.shouldThrowError = true;
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(TestEvent.EVENT_TYPE, otherMockHandler);

      const event = new TestEvent('test data');
      await publisher.publish(event);

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });

  describe('concurrent handler execution', () => {
    it('should execute handlers concurrently', async () => {
      const handler1 = new MockEventHandler();
      const handler2 = new MockEventHandler();

      handler1.asyncDelay = 100;
      handler2.asyncDelay = 100;

      publisher.subscribe(TestEvent.EVENT_TYPE, handler1);
      publisher.subscribe(TestEvent.EVENT_TYPE, handler2);

      const startTime = Date.now();
      const event = new TestEvent('test data');

      await publisher.publish(event);

      const duration = Date.now() - startTime;

      // Should complete in roughly 100ms (concurrent) rather than 200ms (sequential)
      expect(duration).toBeLessThan(150);
      expect(handler1.handleCallCount).toBe(1);
      expect(handler2.handleCallCount).toBe(1);
    });
  });

  describe('clear method', () => {
    it('should remove all handlers', () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(OtherTestEvent.EVENT_TYPE, otherMockHandler);

      publisher.clear();

      expect(publisher.getRegisteredEventTypes()).toHaveLength(0);
      expect(publisher.hasHandlers(TestEvent.EVENT_TYPE)).toBe(false);
      expect(publisher.hasHandlers(OtherTestEvent.EVENT_TYPE)).toBe(false);
    });

    it('should allow resubscription after clear', () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.clear();
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);

      expect(publisher.hasHandlers(TestEvent.EVENT_TYPE)).toBe(true);
      expect(publisher.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(1);
    });
  });

  describe('query methods', () => {
    beforeEach(() => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);
      publisher.subscribe(TestEvent.EVENT_TYPE, otherMockHandler);
      publisher.subscribe(OtherTestEvent.EVENT_TYPE, mockHandler);
    });

    it('should return correct registered event types', () => {
      const eventTypes = publisher.getRegisteredEventTypes();

      expect(eventTypes).toContain(TestEvent.EVENT_TYPE);
      expect(eventTypes).toContain(OtherTestEvent.EVENT_TYPE);
      expect(eventTypes).toHaveLength(2);
    });

    it('should return correct handler count', () => {
      expect(publisher.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(2);
      expect(publisher.getHandlerCount(OtherTestEvent.EVENT_TYPE)).toBe(1);
      expect(publisher.getHandlerCount('non.existent.event')).toBe(0);
    });

    it('should correctly identify handlers existence', () => {
      expect(publisher.hasHandlers(TestEvent.EVENT_TYPE)).toBe(true);
      expect(publisher.hasHandlers(OtherTestEvent.EVENT_TYPE)).toBe(true);
      expect(publisher.hasHandlers('non.existent.event')).toBe(false);
    });
  });

  describe('edge cases and performance', () => {
    it('should handle rapid successive publishes', async () => {
      publisher.subscribe(TestEvent.EVENT_TYPE, mockHandler);

      const events = Array.from(
        { length: 100 },
        (_, i) => new TestEvent(`event-${i}`),
      );

      const publishPromises = events.map((event) => publisher.publish(event));
      await Promise.all(publishPromises);

      expect(mockHandler.handleCallCount).toBe(100);
    });

    it('should handle large number of handlers', async () => {
      const handlers = Array.from({ length: 50 }, () => new MockEventHandler());

      handlers.forEach((handler) => {
        publisher.subscribe(TestEvent.EVENT_TYPE, handler);
      });

      const event = new TestEvent('stress test');
      await publisher.publish(event);

      handlers.forEach((handler) => {
        expect(handler.handleCallCount).toBe(1);
      });
    });

    it('should handle very long event type names', () => {
      const longEventType =
        'very.long.event.type.name.that.exceeds.normal.length.boundaries.and.keeps.going.for.a.while';

      publisher.subscribe(longEventType, mockHandler);

      expect(publisher.hasHandlers(longEventType)).toBe(true);
      expect(publisher.getRegisteredEventTypes()).toContain(longEventType);
    });
  });
});
