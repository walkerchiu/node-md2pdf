/**
 * In-Memory Domain Event Publisher
 * Simple event bus implementation for domain events
 */

import type {
  DomainEvent,
  IDomainEventHandler,
  IDomainEventPublisher,
} from './domain-event.base';

export class InMemoryEventPublisher implements IDomainEventPublisher {
  private handlers: Map<string, IDomainEventHandler<any>[]> = new Map();

  /**
   * Publish a domain event to all registered handlers
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType) || [];

    // Execute all handlers concurrently
    const handlerPromises = eventHandlers.map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error) {
        // Log error but don't let one handler failure affect others
        console.error(`Error in event handler for ${event.eventType}:`, error);
        throw error;
      }
    });

    await Promise.allSettled(handlerPromises);
  }

  /**
   * Subscribe a handler to an event type
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: IDomainEventHandler<T>,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const eventHandlers = this.handlers.get(eventType)!;
    if (!eventHandlers.includes(handler)) {
      eventHandlers.push(handler);
    }
  }

  /**
   * Unsubscribe a handler from an event type
   */
  unsubscribe(eventType: string, handler: IDomainEventHandler<any>): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }

      // Clean up empty handler arrays
      if (eventHandlers.length === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  /**
   * Check if any handlers are registered for an event type
   */
  hasHandlers(eventType: string): boolean {
    return this.getHandlerCount(eventType) > 0;
  }
}
