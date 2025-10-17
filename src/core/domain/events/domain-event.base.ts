/**
 * Base Domain Event
 * Foundation for all domain events in the system
 */

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly eventType: string;

  constructor(eventType: string) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
    this.eventType = eventType;
  }

  /**
   * Get event data for serialization
   */
  abstract getEventData(): Record<string, unknown>;

  /**
   * Serialize event for logging or transport
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      data: this.getEventData(),
    };
  }

  /**
   * Check if this event equals another
   */
  equals(other: DomainEvent): boolean {
    return (
      this.eventId === other.eventId &&
      this.eventType === other.eventType &&
      this.occurredAt.getTime() === other.occurredAt.getTime()
    );
  }
}

/**
 * Domain Event Handler interface
 */
export interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void> | void;
}

/**
 * Domain Event Publisher interface
 */
export interface IDomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: IDomainEventHandler<T>,
  ): void;
  unsubscribe(eventType: string, handler: IDomainEventHandler<any>): void;
  clear(): void;
}

/**
 * Domain Event Validation Error
 */
export class DomainEventValidationError extends Error {
  constructor(
    public readonly eventType: string,
    public readonly invalidData: unknown,
    public readonly validationRule: string,
    message: string,
  ) {
    super(
      `Domain event validation failed for ${eventType}: ${message} (rule: ${validationRule})`,
    );
    this.name = 'DomainEventValidationError';
  }
}
