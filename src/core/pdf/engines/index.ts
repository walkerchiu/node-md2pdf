/**
 * PDF Engines Module Exports
 * Central export point for all PDF engine related functionality
 */

export * from './types';

import type { PDFEngineManagerConfig } from './types';

// Engine implementations
export { PuppeteerPDFEngine } from './puppeteer-engine';

// Engine management
export { PDFEngineManager } from './engine-manager';
export { PDFEngineFactory } from './engine-factory';

// Selection strategies
export {
  HealthFirstSelectionStrategy,
  PrimaryFirstSelectionStrategy,
  LoadBalancedSelectionStrategy,
  CapabilityBasedSelectionStrategy,
  AdaptiveSelectionStrategy,
} from './selection-strategies';

// Default configurations
export const DEFAULT_ENGINE_CONFIG: PDFEngineManagerConfig = {
  primaryEngine: 'puppeteer',
  fallbackEngines: [] as string[],
  healthCheckInterval: 30000, // 30 seconds
  maxRetries: 2,
  retryDelay: 1000, // 1 second
  enableMetrics: true,
  resourceLimits: {
    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
    maxConcurrentTasks: 3,
    taskTimeout: 60000, // 60 seconds
  },
};

// Utility functions
export function createDefaultEngineManager(): {
  manager: import('./engine-manager').PDFEngineManager;
  factory: import('./engine-factory').PDFEngineFactory;
} {
  // Import dynamically to avoid circular dependency issues in coverage mode
  /* eslint-disable @typescript-eslint/no-var-requires */
  // dynamic require used intentionally to avoid circular imports in coverage / test mode
  const { PDFEngineFactory } = require('./engine-factory');
  const { HealthFirstSelectionStrategy } = require('./selection-strategies');
  const { PDFEngineManager } = require('./engine-manager');
  /* eslint-enable @typescript-eslint/no-var-requires */

  const factory = new PDFEngineFactory();
  const selectionStrategy = new HealthFirstSelectionStrategy();
  const manager = new PDFEngineManager(
    DEFAULT_ENGINE_CONFIG,
    factory,
    selectionStrategy,
  );

  return { manager, factory };
}
