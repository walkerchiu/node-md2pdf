/**
 * Utility functions for two-stage rendering system
 */

import { DynamicContentDetector } from './dynamic-content-detector';
import { TwoStageRenderingEngine } from './two-stage-rendering-engine';
import {
  ProcessingContext,
  TwoStageRenderingOptions,
  DynamicContentType,
} from './types';

/**
 * Create a two-stage rendering engine with default configuration
 */
export function createTwoStageEngine(
  options: Partial<TwoStageRenderingOptions> = {},
  translator?: import('../../infrastructure/i18n/types').ITranslationManager,
  configManager?: import('../../infrastructure/config/types').IConfigManager,
): TwoStageRenderingEngine {
  const defaultOptions: TwoStageRenderingOptions = {
    enabled: true,
    forceAccuratePageNumbers: false,
    maxPerformanceImpact: 100,
    enableCaching: true,
    ...options,
  };

  return new TwoStageRenderingEngine(defaultOptions, translator, configManager);
}

/**
 * Create default processing context
 */
export function createDefaultProcessingContext(
  filePath?: string,
  overrides: Partial<ProcessingContext> = {},
): ProcessingContext {
  const baseContext: ProcessingContext = {
    pdfOptions: {
      includePageNumbers: false,
      margins: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
    },
    tocOptions: {
      enabled: true,
      includePageNumbers: true,
      maxDepth: 3,
    },
    isPreRendering: false,
  };

  if (filePath) {
    baseContext.filePath = filePath;
  }

  return {
    ...baseContext,
    ...overrides,
  };
}

/**
 * Estimate rendering performance impact
 */
export async function estimateRenderingPerformance(
  content: string,
  context: ProcessingContext = createDefaultProcessingContext(),
): Promise<{
  shouldUseTwoStage: boolean;
  estimatedTimeIncrease: number;
  estimatedMemoryIncrease: number;
  recommendation: 'low' | 'medium' | 'high';
  detectedContentTypes: DynamicContentType[];
  summary: string;
}> {
  const detection = DynamicContentDetector.detect(content, {
    toc: context.tocOptions
      ? {
          enabled: context.tocOptions.enabled || false,
          includePageNumbers: context.tocOptions.includePageNumbers || false,
        }
      : {
          enabled: false,
          includePageNumbers: false,
        },
    includePageNumbers: context.pdfOptions?.includePageNumbers || false,
  });

  const shouldUseTwoStage =
    DynamicContentDetector.shouldUseTwoStageRendering(detection);
  const performanceImpact =
    DynamicContentDetector.estimatePerformanceImpact(detection);
  const summary = DynamicContentDetector.getDetectionSummary(detection);

  // Determine detected content types
  const detectedContentTypes: DynamicContentType[] = [];
  if (detection.hasTOCWithPageNumbers) {
    detectedContentTypes.push(DynamicContentType.TOC);
  }
  if (detection.hasDynamicImages) {
    detectedContentTypes.push(DynamicContentType.IMAGE);
  }
  if (detection.hasDynamicDiagrams) {
    detectedContentTypes.push(DynamicContentType.DIAGRAM);
  }
  if (detection.hasComplexLayouts) {
    detectedContentTypes.push(DynamicContentType.COMPLEX_LAYOUT);
  }

  return {
    shouldUseTwoStage,
    estimatedTimeIncrease: performanceImpact.timeIncrease,
    estimatedMemoryIncrease: performanceImpact.memoryIncrease,
    recommendation: performanceImpact.recommendation,
    detectedContentTypes,
    summary,
  };
}

/**
 * Quick check if content would benefit from two-stage rendering
 */
export function quickTwoStageCheck(
  content: string,
  options: {
    hasPageNumbers?: boolean;
    hasTOC?: boolean;
  } = {},
): boolean {
  // Fast heuristic checks
  const hasHeadings = /^#{1,6}\s/.test(content);
  const hasImages = /!\[.*?\]\([^)]+\)/.test(content);
  const hasDiagrams =
    content.includes('```mermaid') || content.includes('```plantuml');

  // Quick decision based on obvious indicators
  if (hasDiagrams) {
    return true; // Always use two-stage for diagrams
  }

  if (hasHeadings && options.hasTOC && options.hasPageNumbers) {
    return true; // TOC with page numbers benefits from two-stage
  }

  if (hasImages && hasHeadings && options.hasTOC) {
    return true; // Complex content with TOC
  }

  return false;
}

/**
 * Get recommended configuration based on content analysis
 */
export async function getRecommendedConfiguration(
  content: string,
  currentContext: Partial<ProcessingContext> = {},
): Promise<{
  recommendedContext: ProcessingContext;
  twoStageOptions: TwoStageRenderingOptions;
  reasoning: string[];
}> {
  const context = createDefaultProcessingContext(undefined, currentContext);
  const performance = await estimateRenderingPerformance(content, context);

  const reasoning: string[] = [];
  const recommendedContext = { ...context };
  const twoStageOptions: TwoStageRenderingOptions = {
    enabled: performance.shouldUseTwoStage,
    forceAccuratePageNumbers: false,
    maxPerformanceImpact: 100,
    enableCaching: true,
  };

  // Adjust recommendations based on detected content
  if (performance.detectedContentTypes.includes(DynamicContentType.TOC)) {
    reasoning.push(
      'TOC with page numbers detected - two-stage rendering recommended for accuracy',
    );
    twoStageOptions.enabled = true;
  }

  if (performance.detectedContentTypes.includes(DynamicContentType.DIAGRAM)) {
    reasoning.push('Dynamic diagrams detected - two-stage rendering required');
    twoStageOptions.enabled = true;
    twoStageOptions.forceAccuratePageNumbers = true;
  }

  if (performance.estimatedTimeIncrease > 50) {
    reasoning.push(
      `Estimated ${performance.estimatedTimeIncrease}% time increase - consider enabling caching`,
    );
    twoStageOptions.enableCaching = true;
  }

  if (performance.recommendation === 'high') {
    reasoning.push('High priority for accurate page numbers detected');
    twoStageOptions.forceAccuratePageNumbers = true;
  }

  // Adjust max performance impact based on content complexity
  if (performance.detectedContentTypes.length > 2) {
    twoStageOptions.maxPerformanceImpact = 150; // Allow more impact for complex content
    reasoning.push(
      'Complex content detected - allowing higher performance impact',
    );
  }

  return {
    recommendedContext,
    twoStageOptions,
    reasoning,
  };
}

/**
 * Validate that a two-stage rendering setup is working correctly
 */
export async function validateTwoStageSetup(
  engine: TwoStageRenderingEngine,
): Promise<{
  isValid: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check engine initialization
    const processors = engine.getRegisteredProcessors();
    if (processors.length === 0) {
      issues.push('No processors registered in rendering engine');
    }

    // Validate environment
    const validation = await engine.validateEnvironment();
    if (!validation.isReady) {
      issues.push('Rendering environment is not ready');
      for (const [type, typeIssues] of Object.entries(
        validation.processorIssues,
      )) {
        issues.push(`${type} processor issues: ${typeIssues.join(', ')}`);
      }
    }

    // Check cache availability
    const cache = engine.getCache();
    if (!cache) {
      warnings.push('No cache configured - performance may be impacted');
      recommendations.push(
        'Consider implementing a cache for better performance',
      );
    }

    // Test with sample content
    const testContent = '# Test Heading\n\nSample content for validation.';
    const testContext = createDefaultProcessingContext();

    try {
      const result = await engine.render(testContent, testContext);
      if (!result.html) {
        issues.push('Engine failed to produce HTML output');
      }
    } catch (error) {
      issues.push(`Engine test render failed: ${(error as Error).message}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      recommendations: [...recommendations, ...validation.recommendations],
    };
  } catch (error) {
    return {
      isValid: false,
      issues: [`Validation failed: ${(error as Error).message}`],
      warnings,
      recommendations,
    };
  }
}
