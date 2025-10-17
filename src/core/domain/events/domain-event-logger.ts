/**
 * Domain Event Logger
 * Specialized logger for domain events with structured logging capabilities
 */

import type { DomainEvent, IDomainEventHandler } from './domain-event.base';
import type { IEnhancedLogger } from '../../../infrastructure/logging/types';

export interface DomainEventLogEntry {
  eventId: string;
  eventType: string;
  occurredAt: string;
  data: Record<string, unknown>;
  processingTime?: number;
  handlerResults?: Array<{
    handlerName: string;
    success: boolean;
    error?: string;
    duration: number;
  }>;
}

/**
 * Domain Event Logger Handler
 * Automatically logs all domain events to the enhanced logger
 */
export class DomainEventLoggerHandler
  implements IDomainEventHandler<DomainEvent>
{
  constructor(
    private readonly logger: IEnhancedLogger,
    private readonly logLevel: 'info' | 'debug' = 'info',
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const logEntry = this.createLogEntry(event);

    if (this.logLevel === 'debug') {
      this.logger.debug('Domain Event', logEntry);
    } else {
      this.logger.info('Domain Event', logEntry);
    }
  }

  private createLogEntry(event: DomainEvent): DomainEventLogEntry {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      data: event.getEventData(),
    };
  }
}

/**
 * Enhanced Domain Event Logger with Performance Tracking
 */
export class PerformanceDomainEventLogger
  implements IDomainEventHandler<DomainEvent>
{
  private readonly performanceTracker = new Map<
    string,
    { total: number; count: number }
  >();

  constructor(
    private readonly logger: IEnhancedLogger,
    private readonly trackPerformance: boolean = true,
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const startTime = this.trackPerformance ? performance.now() : 0;

    const logEntry: DomainEventLogEntry = {
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      data: event.getEventData(),
    };

    if (this.trackPerformance) {
      const processingTime = performance.now() - startTime;
      logEntry.processingTime = processingTime;

      // Track performance metrics
      this.updatePerformanceMetrics(event.eventType, processingTime);
    }

    this.logger.info('Domain Event Performance', logEntry);
  }

  private updatePerformanceMetrics(
    eventType: string,
    processingTime: number,
  ): void {
    const current = this.performanceTracker.get(eventType) || {
      total: 0,
      count: 0,
    };
    current.total += processingTime;
    current.count += 1;
    this.performanceTracker.set(eventType, current);
  }

  /**
   * Get performance statistics for event types
   */
  getPerformanceStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [eventType, data] of this.performanceTracker.entries()) {
      stats[eventType] = data.count > 0 ? data.total / data.count : 0;
    }
    return stats;
  }

  /**
   * Reset performance tracking
   */
  resetPerformanceStats(): void {
    this.performanceTracker.clear();
  }
}

/**
 * Conversion Event Aggregator Logger
 * Aggregates conversion events for reporting purposes
 */
export class ConversionEventAggregatorLogger
  implements IDomainEventHandler<DomainEvent>
{
  private conversionStats = {
    totalConversions: 0,
    successfulConversions: 0,
    failedConversions: 0,
    totalProcessingTime: 0,
    averageFileSize: 0,
    lastConversionTime: null as Date | null,
  };

  constructor(private readonly logger: IEnhancedLogger) {}

  async handle(event: DomainEvent): Promise<void> {
    this.updateConversionStats(event);

    // Log aggregated stats periodically
    if (this.conversionStats.totalConversions % 10 === 0) {
      await this.logAggregatedStats();
    }
  }

  private updateConversionStats(event: DomainEvent): void {
    const eventData = event.getEventData();

    switch (event.eventType) {
      case 'conversion.started':
        this.conversionStats.totalConversions++;
        break;

      case 'conversion.completed':
        this.conversionStats.successfulConversions++;
        this.conversionStats.lastConversionTime = event.occurredAt;

        if (typeof eventData.processingTime === 'number') {
          this.conversionStats.totalProcessingTime += eventData.processingTime;
        }

        if (typeof eventData.fileSize === 'number') {
          const currentAvg = this.conversionStats.averageFileSize;
          const count = this.conversionStats.successfulConversions;
          this.conversionStats.averageFileSize =
            (currentAvg * (count - 1) + eventData.fileSize) / count;
        }
        break;

      case 'conversion.failed':
        this.conversionStats.failedConversions++;
        break;
    }
  }

  private async logAggregatedStats(): Promise<void> {
    const stats = {
      ...this.conversionStats,
      successRate:
        this.conversionStats.totalConversions > 0
          ? this.conversionStats.successfulConversions /
            this.conversionStats.totalConversions
          : 0,
      averageProcessingTime:
        this.conversionStats.successfulConversions > 0
          ? this.conversionStats.totalProcessingTime /
            this.conversionStats.successfulConversions
          : 0,
    };

    this.logger.info('Conversion Aggregated Stats', stats);
  }

  /**
   * Get current conversion statistics
   */
  getConversionStats(): typeof this.conversionStats & {
    successRate: number;
    averageProcessingTime: number;
  } {
    return {
      ...this.conversionStats,
      successRate:
        this.conversionStats.totalConversions > 0
          ? this.conversionStats.successfulConversions /
            this.conversionStats.totalConversions
          : 0,
      averageProcessingTime:
        this.conversionStats.successfulConversions > 0
          ? this.conversionStats.totalProcessingTime /
            this.conversionStats.successfulConversions
          : 0,
    };
  }

  /**
   * Reset conversion statistics
   */
  resetStats(): void {
    this.conversionStats = {
      totalConversions: 0,
      successfulConversions: 0,
      failedConversions: 0,
      totalProcessingTime: 0,
      averageFileSize: 0,
      lastConversionTime: null,
    };
  }

  /**
   * Force log current stats
   */
  async forceLogStats(): Promise<void> {
    await this.logAggregatedStats();
  }
}
