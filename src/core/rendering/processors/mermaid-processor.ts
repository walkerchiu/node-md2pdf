/**
 * Mermaid Processor for Two-Stage Rendering
 * Handles Mermaid diagram rendering with accurate size calculation
 */

import { DEFAULT_MERMAID } from '../../../infrastructure/config/constants';
import { MermaidRenderer } from '../../../utils/mermaid-renderer';
import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
  ContentDimensions,
} from '../types';

import { BaseProcessor } from './base-processor';

export interface MermaidConfig {
  /** Mermaid theme */
  theme?: 'default' | 'forest' | 'dark' | 'neutral' | 'null';

  /** Default diagram width in pixels */
  defaultWidth?: number;

  /** Default diagram height in pixels */
  defaultHeight?: number;

  /** Timeout for diagram generation in milliseconds */
  timeout?: number;

  /** Enable caching of generated diagrams */
  enableCaching?: boolean;

  /** Background color for diagrams */
  backgroundColor?: string;
}

export class MermaidProcessor extends BaseProcessor {
  private readonly config: Required<MermaidConfig>;
  private readonly mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  private readonly htmlMermaidRegex =
    /<pre[^>]*class="language-mermaid"[^>]*><code[^>]*class="language-mermaid"[^>]*>([\s\S]*?)<\/code><\/pre>/g;
  private readonly renderer: MermaidRenderer;

  constructor(config: MermaidConfig = {}) {
    super(DynamicContentType.MERMAID, 'Mermaid Diagram Processor');

    this.config = {
      theme: config.theme || DEFAULT_MERMAID.THEME,
      defaultWidth: config.defaultWidth || DEFAULT_MERMAID.DEFAULT_WIDTH,
      defaultHeight: config.defaultHeight || DEFAULT_MERMAID.DEFAULT_HEIGHT,
      timeout: config.timeout || DEFAULT_MERMAID.TIMEOUT,
      enableCaching: config.enableCaching ?? DEFAULT_MERMAID.ENABLE_CACHING,
      backgroundColor:
        config.backgroundColor || DEFAULT_MERMAID.BACKGROUND_COLOR,
    };

    this.renderer = MermaidRenderer.getInstance();
  }

  async detect(content: string, _context: ProcessingContext): Promise<number> {
    const mermaidBlocks = this.extractMermaidBlocks(content);

    if (mermaidBlocks.length === 0) {
      return 0;
    }

    // High confidence if we find Mermaid blocks
    return 0.95;
  }

  async process(
    content: string,
    context: ProcessingContext,
  ): Promise<ProcessedContent> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Check cache first if enabled
      if (this.config.enableCaching) {
        const cachedContent = await this.getCachedContent(content, context);
        if (cachedContent) {
          return cachedContent;
        }
      }

      // Extract Mermaid blocks
      const mermaidBlocks = this.extractMermaidBlocks(content);

      if (mermaidBlocks.length === 0) {
        const processingTime = Date.now() - startTime;
        return {
          html: content,
          metadata: this.createMetadataWithCache(processingTime, [
            'No Mermaid blocks found',
          ]),
        };
      }

      // Process each Mermaid block
      let processedHTML = content;

      for (const block of mermaidBlocks) {
        try {
          const renderResult = await this.renderer.render(block.content, {
            theme: this.config.theme as
              | 'default'
              | 'dark'
              | 'forest'
              | 'neutral',
            width: this.config.defaultWidth,
            height: this.config.defaultHeight,
            backgroundColor: this.config.backgroundColor,
          });

          const diagramHTML = this.createDiagramHTML(
            renderResult.svg,
            block.content,
            renderResult.metadata,
          );

          // Replace the original block with the rendered diagram
          processedHTML = processedHTML.replace(block.fullMatch, diagramHTML);
        } catch (error) {
          const errorMessage = `Failed to render Mermaid diagram: ${
            (error as Error).message
          }`;
          warnings.push(errorMessage);

          // Create fallback HTML with error message
          const fallbackHTML = this.createFallbackHTML(
            block.content,
            errorMessage,
          );
          processedHTML = processedHTML.replace(block.fullMatch, fallbackHTML);
        }
      }

      const processingTime = Date.now() - startTime;

      const result = {
        html: processedHTML,
        metadata: this.createMetadataWithCache(processingTime, warnings, {
          diagramCount: mermaidBlocks.length,
          theme: this.config.theme,
          cacheEnabled: this.config.enableCaching,
        }),
      };

      // Cache the result if enabled
      if (this.config.enableCaching) {
        await this.setCachedContent(content, context, result);
      }

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = `Mermaid processing failed: ${
        (error as Error).message
      }`;

      return {
        html: content,
        metadata: this.createMetadataWithCache(processingTime, [errorMessage]),
      };
    }
  }

  async calculateDimensions(
    content: string,
    _context: ProcessingContext,
  ): Promise<ContentDimensions> {
    const mermaidBlocks = this.extractMermaidBlocks(content);

    if (mermaidBlocks.length === 0) {
      return {
        pageCount: 0,
        height: 0,
        width: 0,
      };
    }

    // Estimate dimensions based on diagram complexity and count
    let totalHeight = 0;
    let maxWidth = 0;

    for (const block of mermaidBlocks) {
      const complexity = this.analyzeComplexity(block.content);
      const estimatedHeight = this.estimateHeight(complexity);
      const estimatedWidth = Math.min(this.config.defaultWidth, 800);

      totalHeight += estimatedHeight;
      maxWidth = Math.max(maxWidth, estimatedWidth);
    }

    // Estimate page count (assuming 800px per page)
    const pageCount = Math.ceil(totalHeight / 800);

    return {
      pageCount,
      height: totalHeight,
      width: maxWidth,
    };
  }

  private extractMermaidBlocks(content: string): Array<{
    fullMatch: string;
    content: string;
    startIndex: number;
  }> {
    const blocks: Array<{
      fullMatch: string;
      content: string;
      startIndex: number;
    }> = [];

    // Extract from markdown code blocks
    let match;
    while ((match = this.mermaidRegex.exec(content)) !== null) {
      blocks.push({
        fullMatch: match[0],
        content: match[1].trim(),
        startIndex: match.index,
      });
    }

    // Reset regex
    this.mermaidRegex.lastIndex = 0;

    // Extract from HTML code blocks
    while ((match = this.htmlMermaidRegex.exec(content)) !== null) {
      blocks.push({
        fullMatch: match[0],
        content: match[1].trim(),
        startIndex: match.index,
      });
    }

    // Reset regex
    this.htmlMermaidRegex.lastIndex = 0;

    return blocks.sort((a, b) => a.startIndex - b.startIndex);
  }

  private analyzeComplexity(
    diagramCode: string,
  ): 'simple' | 'medium' | 'complex' {
    const lines = diagramCode.split('\n').filter((line) => line.trim());
    const nodeCount = lines.filter((line) =>
      /^[A-Za-z0-9_-]+(\[|\(|\{)/.test(line.trim()),
    ).length;

    if (nodeCount <= 5) return 'simple';
    if (nodeCount <= 15) return 'medium';
    return 'complex';
  }

  private estimateHeight(complexity: 'simple' | 'medium' | 'complex'): number {
    switch (complexity) {
      case 'simple':
        return 200;
      case 'medium':
        return 400;
      case 'complex':
        return 600;
      default:
        return this.config.defaultHeight;
    }
  }

  private createDiagramHTML(
    svg: string,
    originalCode: string,
    metadata?: { width: number; height: number; renderTime: number },
  ): string {
    return `
      <div class="mermaid-diagram" style="text-align: center; margin: 20px 0; page-break-inside: avoid;">
        ${svg}
        <!-- Rendered in ${metadata?.renderTime || 'unknown'}ms, dimensions: ${metadata?.width || 'unknown'}x${metadata?.height || 'unknown'} -->
        <!-- Original code: ${originalCode.substring(0, 50)}... -->
      </div>
    `;
  }

  private createFallbackHTML(
    originalCode: string,
    errorMessage: string,
  ): string {
    return `
      <div class="mermaid-error" style="border: 2px solid #ff6b6b; padding: 15px; margin: 20px 0; background-color: #ffe6e6;">
        <h4 style="color: #d63031; margin: 0 0 10px 0;">⚠️  Mermaid Diagram Error</h4>
        <p style="color: #2d3436; margin: 0 0 10px 0;"><strong>Error:</strong> ${errorMessage}</p>
        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; color: #636e72;">Show original code</summary>
          <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 10px 0 0 0;"><code>${originalCode}</code></pre>
        </details>
      </div>
    `;
  }

  protected generateCacheKey(content: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `mermaid_${Math.abs(hash)}_${this.config.theme}`;
  }

  protected async getCachedContent(
    _content: string,
    _context: ProcessingContext,
  ): Promise<ProcessedContent | null> {
    // Simple in-memory cache implementation
    // In a production environment, this could be extended to use file-based caching

    // For now, return null as we're using diagram-level caching
    return null;
  }

  protected async setCachedContent(
    _content: string,
    _context: ProcessingContext,
    _result: ProcessedContent,
  ): Promise<void> {
    // Simple in-memory cache implementation
    // In a production environment, this could be extended to use file-based caching
    // For now, do nothing as we're using diagram-level caching
  }

  private createMetadataWithCache(
    processingTime: number,
    warnings: string[],
    additional?: Record<string, any>,
  ) {
    return {
      type: this.type,
      processingTime,
      warnings,
      cacheHits: 0,
      cacheMisses: 0,
      details: {
        processor: this.name,
        config: this.config,
        ...additional,
      },
    };
  }

  async getDimensions(
    processedContent: ProcessedContent,
    _context: ProcessingContext,
  ): Promise<ContentDimensions> {
    // Extract diagram count from metadata
    const diagramCount = processedContent.metadata.details?.diagramCount || 0;

    // Estimate dimensions based on number of diagrams
    const estimatedHeight = diagramCount * this.config.defaultHeight;
    const estimatedPageCount = Math.max(1, Math.ceil(estimatedHeight / 1000)); // Assume 1000px per page

    return {
      pageCount: estimatedPageCount,
      height: estimatedHeight,
      width: this.config.defaultWidth,
      imagePositions: [], // TODO: Calculate actual positions if needed
    };
  }

  /**
   * Get configuration
   */
  getConfig(): Required<MermaidConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MermaidConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Validate environment
   */
  async validateEnvironment(): Promise<{
    isSupported: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    return await this.renderer.validateEnvironment();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.renderer.cleanup();
  }
}
