/**
 * TOC Module
 * Table of contents generation functionality
 */

export * from './types';
export * from './toc-generator';

// Re-export for convenience
export { TOCGenerator } from './toc-generator';
export type { TOCGeneratorOptions, TOCGenerationResult, TOCItemFlat, TOCItemNested } from './types';
export * from './page-estimator';
export { PageEstimator } from './page-estimator';
