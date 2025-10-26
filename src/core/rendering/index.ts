/**
 * Two-Stage Rendering System
 * Entry point for dynamic content processing with accurate page numbers
 */

// Core types and interfaces
export * from './types';
export * from './interfaces';

// Main engine
export { TwoStageRenderingEngine } from './two-stage-rendering-engine';

// Detection and analysis
export { DynamicContentDetector } from './dynamic-content-detector';
export type {
  DynamicContentDetection,
  DynamicContentOptions,
} from './dynamic-content-detector';

// Base processor for extensibility
export { BaseProcessor } from './processors/base-processor';

// Built-in processors
export { TOCProcessor } from './processors/toc-processor';

// Convenience functions
export {
  createTwoStageEngine,
  createDefaultProcessingContext,
  estimateRenderingPerformance,
} from './utils';
