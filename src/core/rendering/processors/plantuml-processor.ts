/**
 * PlantUML Processor for Two-Stage Rendering
 * Handles PlantUML diagram rendering with accurate size calculation
 */

import { DEFAULT_PLANTUML } from '../../../infrastructure/config/constants';
import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
  ContentDimensions,
} from '../types';

import { BaseProcessor } from './base-processor';

// Import plantuml-encoder as any to avoid type issues
const plantumlEncoder = require('plantuml-encoder');

export interface PlantUMLConfig {
  /** PlantUML server URL (default: public server) */
  serverUrl?: string;

  /** Output format for diagrams */
  format?: 'svg' | 'png';

  /** Default diagram width in pixels */
  defaultWidth?: number;

  /** Default diagram height in pixels */
  defaultHeight?: number;

  /** Timeout for diagram generation in milliseconds */
  timeout?: number;

  /** Enable caching of generated diagrams */
  enableCaching?: boolean;
}

export class PlantUMLProcessor extends BaseProcessor {
  private readonly config: Required<PlantUMLConfig>;
  private readonly plantUMLRegex = /```plantuml\n([\s\S]*?)```/g;
  private readonly htmlPlantUMLRegex =
    /<pre[^>]*class="language-plantuml"[^>]*><code[^>]*class="language-plantuml"[^>]*>([\s\S]*?)<\/code><\/pre>/g;

  constructor(config: PlantUMLConfig = {}) {
    super(DynamicContentType.PLANTUML, 'PlantUML Diagram Processor');

    this.config = {
      serverUrl: config.serverUrl || DEFAULT_PLANTUML.SERVER_URL,
      format: config.format || DEFAULT_PLANTUML.FORMAT,
      defaultWidth: config.defaultWidth || DEFAULT_PLANTUML.DEFAULT_WIDTH,
      defaultHeight: config.defaultHeight || DEFAULT_PLANTUML.DEFAULT_HEIGHT,
      timeout: config.timeout || DEFAULT_PLANTUML.TIMEOUT,
      enableCaching: config.enableCaching ?? DEFAULT_PLANTUML.ENABLE_CACHING,
    };
  }

  async detect(content: string, _context: ProcessingContext): Promise<number> {
    const plantUMLBlocks = this.extractPlantUMLBlocks(content);

    if (plantUMLBlocks.length === 0) {
      return 0;
    }

    // High confidence if we find PlantUML blocks
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

      // Extract PlantUML blocks
      const plantUMLBlocks = this.extractPlantUMLBlocks(content);

      if (plantUMLBlocks.length === 0) {
        const processingTime = Date.now() - startTime;
        return {
          html: content,
          metadata: this.createMetadataWithCache(processingTime, [
            'No PlantUML blocks found',
          ]),
        };
      }

      // Process each PlantUML block
      let processedHTML = content;

      for (const block of plantUMLBlocks) {
        try {
          const diagramHTML = await this.renderPlantUMLDiagram(block.source);
          processedHTML = processedHTML.replace(block.raw, diagramHTML);
        } catch (error) {
          const errorMessage = `Failed to render PlantUML diagram: ${(error as Error).message}`;
          warnings.push(errorMessage);

          // Replace with error placeholder
          const errorHTML = this.createErrorPlaceholder(errorMessage);
          processedHTML = processedHTML.replace(block.raw, errorHTML);
        }
      }

      const processingTime = Date.now() - startTime;
      const processedContent: ProcessedContent = {
        html: processedHTML,
        metadata: this.createMetadataWithCache(processingTime, warnings, {
          diagramCount: plantUMLBlocks.length,
          format: this.config.format,
          serverUrl: this.config.serverUrl,
        }),
      };

      // Cache the result if enabled
      if (this.config.enableCaching) {
        await this.setCachedContent(content, context, processedContent);
      }

      return processedContent;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = `PlantUML processing failed: ${(error as Error).message}`;

      return {
        html: content,
        metadata: this.createMetadataWithCache(processingTime, [errorMessage]),
      };
    }
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

  async validateEnvironment(): Promise<{
    isSupported: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test server connectivity
      const testDiagram = '@startuml\nAlice -> Bob: Hello\n@enduml';
      await this.renderPlantUMLDiagram(testDiagram);
    } catch (error) {
      issues.push(
        `PlantUML server not accessible: ${(error as Error).message}`,
      );
      recommendations.push(
        'Check internet connection or configure alternative PlantUML server',
      );
    }

    // Check if fetch is available
    if (typeof fetch === 'undefined') {
      issues.push('Fetch API not available');
      recommendations.push('Node.js version 18+ required for fetch support');
    }

    return {
      isSupported: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Extract PlantUML blocks from content (both Markdown and HTML formats)
   */
  private extractPlantUMLBlocks(content: string): Array<{
    raw: string;
    source: string;
  }> {
    const blocks: Array<{ raw: string; source: string }> = [];
    let match;

    // Reset regex state
    this.plantUMLRegex.lastIndex = 0;
    this.htmlPlantUMLRegex.lastIndex = 0;

    // First, try to find Markdown-style PlantUML blocks
    while ((match = this.plantUMLRegex.exec(content)) !== null) {
      blocks.push({
        raw: match[0],
        source: match[1].trim(),
      });
    }

    // If no Markdown blocks found, look for HTML-style blocks
    if (blocks.length === 0) {
      while ((match = this.htmlPlantUMLRegex.exec(content)) !== null) {
        // Decode HTML entities in the source
        const decodedSource = this.decodeHtmlEntities(match[1]);
        blocks.push({
          raw: match[0],
          source: decodedSource.trim(),
        });
      }
    }

    return blocks;
  }

  /**
   * Decode HTML entities to get original PlantUML source
   */
  private decodeHtmlEntities(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Render PlantUML diagram to HTML
   */
  private async renderPlantUMLDiagram(source: string): Promise<string> {
    try {
      // Encode PlantUML source
      const encoded = plantumlEncoder.encode(source);

      // Construct URL
      const url = `${this.config.serverUrl}/${this.config.format}/${encoded}`;

      // Fetch diagram with timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      try {
        const response = await fetch(url, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (this.config.format === 'svg') {
          const svgContent = await response.text();
          return `<div class="plantuml-diagram">${svgContent}</div>`;
        } else {
          // For PNG format, create img tag
          return `<div class="plantuml-diagram">
            <img src="${url}"
                 alt="PlantUML Diagram"
                 style="max-width: 100%; height: auto;" />
          </div>`;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(
            `PlantUML request timed out after ${this.config.timeout}ms`,
          );
        }
        throw error;
      }
    } catch (error) {
      throw new Error(
        `Failed to render PlantUML diagram: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Create error placeholder HTML
   */
  private createErrorPlaceholder(errorMessage: string): string {
    return `<div class="plantuml-error" style="
      border: 2px dashed #dc3545;
      padding: 16px;
      margin: 16px 0;
      background-color: #f8d7da;
      border-radius: 4px;
      color: #721c24;
    ">
      <strong>PlantUML Error:</strong><br>
      ${errorMessage}
    </div>`;
  }

  /**
   * Get configuration
   */
  getConfig(): Required<PlantUMLConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PlantUMLConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Create metadata for ProcessedContent with cache statistics
   */
  private createMetadataWithCache(
    processingTime: number,
    warnings: string[] = [],
    details: Record<string, any> = {},
    cacheHits: number = 0,
    cacheMisses: number = 0,
  ): ProcessedContent['metadata'] {
    return {
      type: this.type,
      processingTime,
      warnings,
      cacheHits,
      cacheMisses,
      details,
    };
  }
}
