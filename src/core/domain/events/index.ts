/**
 * Domain Events Module
 * Centralized export of all domain event classes and interfaces
 */

// Base event infrastructure
export {
  DomainEvent,
  IDomainEventHandler,
  IDomainEventPublisher,
  DomainEventValidationError,
} from './domain-event.base';

// Event publisher implementation
export { InMemoryEventPublisher } from './event-publisher';

// Conversion-specific events
export {
  ConversionStartedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  BatchConversionStartedEvent,
  BatchConversionCompletedEvent,
} from './conversion-events';

// Domain event logging
export {
  DomainEventLoggerHandler,
  PerformanceDomainEventLogger,
  ConversionEventAggregatorLogger,
} from './domain-event-logger';
export type { DomainEventLogEntry } from './domain-event-logger';

// Event type constants for easy reference
export const DOMAIN_EVENT_TYPES = {
  CONVERSION_STARTED: 'conversion.started',
  CONVERSION_COMPLETED: 'conversion.completed',
  CONVERSION_FAILED: 'conversion.failed',
  BATCH_CONVERSION_STARTED: 'batch.conversion.started',
  BATCH_CONVERSION_COMPLETED: 'batch.conversion.completed',
} as const;

// Type for all domain event types
export type DomainEventType =
  (typeof DOMAIN_EVENT_TYPES)[keyof typeof DOMAIN_EVENT_TYPES];
