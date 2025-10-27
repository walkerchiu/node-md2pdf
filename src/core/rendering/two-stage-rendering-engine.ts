/**
 * Two-Stage Rendering Engine
 * Core implementation for handling dynamic content with accurate page numbers
 */

import {
  DynamicContentDetector,
  DynamicContentDetection,
} from './dynamic-content-detector';
import {
  ITwoStageRenderingEngine,
  IDynamicContentProcessor,
  IContentCache,
} from './interfaces';
import { PlantUMLProcessor } from './processors/plantuml-processor';
import { TOCProcessor } from './processors/toc-processor';
import {
  DynamicContentType,
  ProcessingContext,
  RenderingResult,
  TwoStageRenderingOptions,
} from './types';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';

export class TwoStageRenderingEngine implements ITwoStageRenderingEngine {
  private processors: Map<DynamicContentType, IDynamicContentProcessor> =
    new Map();
  private cache: IContentCache | null = null;
  private options: TwoStageRenderingOptions;
  private translator: ITranslationManager | undefined;
  private configManager: IConfigManager | undefined;

  constructor(
    options: Partial<TwoStageRenderingOptions> = {},
    translator?: ITranslationManager,
    configManager?: IConfigManager,
  ) {
    this.options = {
      enabled: true,
      forceAccuratePageNumbers: false,
      maxPerformanceImpact: 100, // 100% increase acceptable by default
      enableCaching: true,
      ...options,
    };

    this.translator = translator;
    this.configManager = configManager;

    // Register default processors
    this.registerDefaultProcessors();
  }

  async render(
    content: string,
    context: ProcessingContext,
  ): Promise<RenderingResult> {
    const startTime = Date.now();

    try {
      // Detect dynamic content
      const detection = DynamicContentDetector.detect(content, {
        toc: context.tocOptions
          ? {
              enabled: context.tocOptions.enabled !== false, // Default to true if not explicitly false
              includePageNumbers:
                context.tocOptions.includePageNumbers !== false, // Default to true if not explicitly false
            }
          : {
              enabled: false,
              includePageNumbers: false,
            },
        includePageNumbers: context.pdfOptions?.includePageNumbers || false,
        twoStageRendering: {
          enabled: this.options.enabled,
          forceAccuratePageNumbers: this.options.forceAccuratePageNumbers,
        },
      });

      // Check if two-stage rendering is needed
      const shouldUseTwoStage = this.shouldUseTwoStageRendering(
        detection,
        context,
      );

      if (!shouldUseTwoStage) {
        // Use single-stage rendering
        return await this.singleStageRender(
          content,
          context,
          detection,
          startTime,
        );
      }

      // Use two-stage rendering
      return await this.twoStageRender(content, context, detection, startTime);
    } catch (error) {
      return {
        html: content,
        usedTwoStageRendering: false,
        performance: {
          totalTime: Date.now() - startTime,
        },
        metadata: {
          processedContentTypes: [],
          warnings: [`Rendering failed: ${(error as Error).message}`],
          cacheHits: 0,
          cacheMisses: 0,
        },
      };
    }
  }

  registerProcessor(processor: IDynamicContentProcessor): void {
    if (this.cache) {
      processor.setCache(this.cache);
    }
    this.processors.set(processor.type, processor);
  }

  unregisterProcessor(type: DynamicContentType): void {
    this.processors.delete(type);
  }

  getRegisteredProcessors(): DynamicContentType[] {
    return Array.from(this.processors.keys());
  }

  setCache(cache: IContentCache): void {
    this.cache = cache;
    // Update all processors with new cache
    for (const processor of this.processors.values()) {
      processor.setCache(cache);
    }
  }

  getCache(): IContentCache | null {
    return this.cache;
  }

  async validateEnvironment(): Promise<{
    isReady: boolean;
    processorIssues: Partial<Record<DynamicContentType, string[]>>;
    recommendations: string[];
  }> {
    const processorIssues: Partial<Record<DynamicContentType, string[]>> = {};
    const recommendations: string[] = [];
    let isReady = true;

    // Validate all processors
    for (const [type, processor] of this.processors) {
      const validation = await processor.validateEnvironment();
      if (!validation.isSupported) {
        isReady = false;
        processorIssues[type] = validation.issues;
        recommendations.push(...validation.recommendations);
      }
    }

    // Add general recommendations
    if (this.options.enableCaching && !this.cache) {
      recommendations.push(
        'Consider implementing caching for better performance',
      );
    }

    return {
      isReady,
      processorIssues,
      recommendations,
    };
  }

  /**
   * Single-stage rendering for simple content
   */
  private async singleStageRender(
    content: string,
    context: ProcessingContext,
    _detection: DynamicContentDetection,
    startTime: number,
  ): Promise<RenderingResult> {
    const processedContentTypes: DynamicContentType[] = [];
    const warnings: string[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;

    // Process content with single-stage processors
    let processedHTML = content;

    // Process PlantUML diagrams first
    const plantUMLProcessor = this.processors.get(DynamicContentType.PLANTUML);
    if (plantUMLProcessor) {
      const plantUMLContext = { ...context, isPreRendering: false };
      const plantUMLResult = await plantUMLProcessor.process(
        processedHTML,
        plantUMLContext,
      );

      if (plantUMLResult.html) {
        processedHTML = plantUMLResult.html;
        processedContentTypes.push(DynamicContentType.PLANTUML);
      }

      warnings.push(...plantUMLResult.metadata.warnings);
      cacheHits += plantUMLResult.metadata.cacheHits || 0;
      cacheMisses += plantUMLResult.metadata.cacheMisses || 0;
    }

    // Process TOC based on user configuration (simplified for debugging)
    if (context.tocOptions?.enabled && (context.headings?.length || 0) > 0) {
      console.log(
        'DEBUG: Processing TOC in single-stage - user enabled and headings available',
      );
      const tocProcessor = this.processors.get(DynamicContentType.TOC);

      if (tocProcessor) {
        const tocContext = { ...context, isPreRendering: false };
        const tocResult = await tocProcessor.process(processedHTML, tocContext);

        if (tocResult.html) {
          processedHTML = tocResult.html + '\n\n' + processedHTML;
          processedContentTypes.push(DynamicContentType.TOC);
        }

        warnings.push(...tocResult.metadata.warnings);
      }
    }

    return {
      html: processedHTML,
      usedTwoStageRendering: false,
      performance: {
        totalTime: Date.now() - startTime,
      },
      metadata: {
        processedContentTypes,
        warnings,
        cacheHits,
        cacheMisses,
      },
    };
  }

  /**
   * Two-stage rendering for complex content
   */
  private async twoStageRender(
    content: string,
    context: ProcessingContext,
    _detection: DynamicContentDetection,
    startTime: number,
  ): Promise<RenderingResult> {
    const processedContentTypes: DynamicContentType[] = [];
    const warnings: string[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;

    // Stage 1: Pre-render content to get real dimensions
    const preRenderStart = Date.now();
    // const preRenderContext = { ...context, isPreRendering: true };

    // Process images and other non-TOC content first
    let preRenderedContent = content;

    // Process PlantUML diagrams first
    const plantUMLProcessor = this.processors.get(DynamicContentType.PLANTUML);
    if (plantUMLProcessor) {
      const plantUMLContext = { ...context, isPreRendering: true };
      const plantUMLResult = await plantUMLProcessor.process(
        preRenderedContent,
        plantUMLContext,
      );

      if (plantUMLResult.html) {
        preRenderedContent = plantUMLResult.html;
        processedContentTypes.push(DynamicContentType.PLANTUML);
      }

      warnings.push(...plantUMLResult.metadata.warnings);
      cacheHits += plantUMLResult.metadata.cacheHits || 0;
      cacheMisses += plantUMLResult.metadata.cacheMisses || 0;
    }

    // For TOC, we need special handling
    let pageNumbers: Record<string, number> = {};

    // Process TOC based on user configuration (simplified for debugging)
    if (context.tocOptions?.enabled && (context.headings?.length || 0) > 0) {
      console.log(
        'DEBUG: Processing TOC - user enabled and headings available',
      );
      const tocProcessor = this.processors.get(DynamicContentType.TOC);
      if (tocProcessor) {
        // TOC processor will handle the two-stage process internally
        const tocResult = await tocProcessor.process(content, {
          ...context,
          isPreRendering: false, // Let TOC processor handle its own two-stage logic
        });

        if (tocResult.html) {
          preRenderedContent = tocResult.html + '\n\n' + preRenderedContent;
          processedContentTypes.push(DynamicContentType.TOC);
        }

        warnings.push(...tocResult.metadata.warnings);
      }
    }

    const preRenderTime = Date.now() - preRenderStart;

    // Stage 2: Final rendering (if needed)
    const finalRenderStart = Date.now();
    const finalHTML = preRenderedContent;
    const finalRenderTime = Date.now() - finalRenderStart;

    const result: RenderingResult = {
      html: finalHTML,
      usedTwoStageRendering: true,
      performance: {
        totalTime: Date.now() - startTime,
        preRenderTime,
        finalRenderTime,
      },
      metadata: {
        processedContentTypes,
        warnings,
        cacheHits,
        cacheMisses,
      },
    };

    if (pageNumbers && Object.keys(pageNumbers).length > 0) {
      result.pageNumbers = {
        headingPages: pageNumbers,
        contentPageCount: 0,
        positions: [],
      };
    }

    return result;
  }

  /**
   * Determine if two-stage rendering should be used
   */
  private shouldUseTwoStageRendering(
    detection: DynamicContentDetection,
    context: ProcessingContext,
  ): boolean {
    if (!this.options.enabled) {
      return false;
    }

    // Check performance impact tolerance
    const performanceImpact =
      DynamicContentDetector.estimatePerformanceImpact(detection);
    if (performanceImpact.timeIncrease > this.options.maxPerformanceImpact) {
      // Only use if high priority or forced
      return (
        performanceImpact.recommendation === 'high' ||
        this.options.forceAccuratePageNumbers
      );
    }

    // Use auto-detection
    return DynamicContentDetector.shouldUseTwoStageRendering(detection, {
      toc: context.tocOptions
        ? {
            enabled: context.tocOptions.enabled === true, // Only true if explicitly true
            includePageNumbers: context.tocOptions.includePageNumbers === true, // Only true if explicitly true
          }
        : {
            enabled: false,
            includePageNumbers: false,
          },
      includePageNumbers: context.pdfOptions?.includePageNumbers || false,
      twoStageRendering: {
        enabled: this.options.enabled,
        forceAccuratePageNumbers: this.options.forceAccuratePageNumbers,
      },
    });
  }

  /**
   * Register default processors
   */
  private registerDefaultProcessors(): void {
    // Register TOC processor with translator
    this.registerProcessor(new TOCProcessor(this.translator));

    // Register PlantUML processor with configuration
    const plantUMLConfig = this.configManager?.get('plantuml', {}) || {};
    this.registerProcessor(new PlantUMLProcessor(plantUMLConfig));

    // Future processors will be registered here:
    // this.registerProcessor(new ImageProcessor());
    // this.registerProcessor(new DiagramProcessor());
  }

  /**
   * Update engine options
   */
  updateOptions(newOptions: Partial<TwoStageRenderingOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current engine options
   */
  getOptions(): TwoStageRenderingOptions {
    return { ...this.options };
  }

  /**
   * Get detection summary for debugging
   */
  async getDetectionSummary(
    content: string,
    context: ProcessingContext,
  ): Promise<{
    detection: DynamicContentDetection;
    summary: string;
    shouldUseTwoStage: boolean;
    performanceImpact: ReturnType<
      typeof DynamicContentDetector.estimatePerformanceImpact
    >;
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
      twoStageRendering: {
        enabled: this.options.enabled,
        forceAccuratePageNumbers: this.options.forceAccuratePageNumbers,
      },
    });

    const summary = DynamicContentDetector.getDetectionSummary(detection);
    const shouldUseTwoStage = this.shouldUseTwoStageRendering(
      detection,
      context,
    );
    const performanceImpact =
      DynamicContentDetector.estimatePerformanceImpact(detection);

    return {
      detection,
      summary,
      shouldUseTwoStage,
      performanceImpact,
    };
  }
}
