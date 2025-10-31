/**
 * PlantUML Processor for Two-Stage Rendering
 * Handles PlantUML diagram rendering with accurate size calculation
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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

export interface PlantUMLLocalRendererConfig {
  /** Path to Java executable */
  javaPath?: string;

  /** Path to PlantUML JAR file */
  jarPath?: string;

  /** Path to PlantUML command */
  commandPath?: string;

  /** Whether to use plantuml command instead of java -jar */
  useCommand?: boolean;

  /** Java options for PlantUML execution */
  javaOptions?: string[];

  /** Timeout for local rendering in milliseconds */
  timeout?: number;

  /** Enable debug output for local renderer */
  debug?: boolean;
}

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

  /** Use local renderer instead of remote server */
  useLocalRenderer?: boolean;

  /** Local renderer configuration */
  localRenderer?: PlantUMLLocalRendererConfig;

  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    maxAge?: number;
    maxSize?: number;
  };

  /** Fallback configuration */
  fallback?: {
    showErrorPlaceholder?: boolean;
    errorMessage?: string;
  };
}

export class PlantUMLProcessor extends BaseProcessor {
  private readonly config: Required<
    Omit<PlantUMLConfig, 'localRenderer' | 'cache' | 'fallback'> & {
      localRenderer: Required<PlantUMLLocalRendererConfig>;
      cache: Required<NonNullable<PlantUMLConfig['cache']>>;
      fallback: Required<NonNullable<PlantUMLConfig['fallback']>>;
    }
  >;
  private readonly plantUMLRegex = /```plantuml\n([\s\S]*?)```/g;
  private readonly htmlPlantUMLRegex =
    /<pre[^>]*class="language-plantuml"[^>]*><code[^>]*class="language-plantuml"[^>]*>([\s\S]*?)<\/code><\/pre>/g;
  private logger: any = null; // Will be injected via context

  constructor(config: PlantUMLConfig = {}) {
    super(DynamicContentType.PLANTUML, 'PlantUML Diagram Processor');

    this.config = {
      serverUrl: config.serverUrl || DEFAULT_PLANTUML.SERVER_URL,
      format: config.format || DEFAULT_PLANTUML.FORMAT,
      defaultWidth: config.defaultWidth || DEFAULT_PLANTUML.DEFAULT_WIDTH,
      defaultHeight: config.defaultHeight || DEFAULT_PLANTUML.DEFAULT_HEIGHT,
      timeout: config.timeout || DEFAULT_PLANTUML.TIMEOUT,
      enableCaching: config.enableCaching ?? DEFAULT_PLANTUML.ENABLE_CACHING,
      useLocalRenderer:
        config.useLocalRenderer ?? DEFAULT_PLANTUML.USE_LOCAL_RENDERER,
      localRenderer: {
        javaPath:
          config.localRenderer?.javaPath ||
          DEFAULT_PLANTUML.LOCAL_RENDERER.JAVA_PATH,
        jarPath:
          config.localRenderer?.jarPath ||
          DEFAULT_PLANTUML.LOCAL_RENDERER.JAR_PATH,
        commandPath:
          config.localRenderer?.commandPath ||
          DEFAULT_PLANTUML.LOCAL_RENDERER.COMMAND_PATH,
        useCommand:
          config.localRenderer?.useCommand ??
          DEFAULT_PLANTUML.LOCAL_RENDERER.USE_COMMAND,
        javaOptions: config.localRenderer?.javaOptions || [
          ...DEFAULT_PLANTUML.LOCAL_RENDERER.JAVA_OPTIONS,
        ],
        timeout:
          config.localRenderer?.timeout ||
          DEFAULT_PLANTUML.LOCAL_RENDERER.TIMEOUT,
        debug:
          config.localRenderer?.debug || DEFAULT_PLANTUML.LOCAL_RENDERER.DEBUG,
      },
      cache: {
        enabled: config.cache?.enabled ?? DEFAULT_PLANTUML.CACHE.ENABLED,
        maxAge: config.cache?.maxAge || DEFAULT_PLANTUML.CACHE.MAX_AGE,
        maxSize: config.cache?.maxSize || DEFAULT_PLANTUML.CACHE.MAX_SIZE,
      },
      fallback: {
        showErrorPlaceholder:
          config.fallback?.showErrorPlaceholder ??
          DEFAULT_PLANTUML.FALLBACK.SHOW_ERROR_PLACEHOLDER,
        errorMessage:
          config.fallback?.errorMessage ||
          DEFAULT_PLANTUML.FALLBACK.ERROR_MESSAGE,
      },
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
    let cacheHits = 0;
    let cacheMisses = 0;

    // Set up logger from context if available
    if (context && context.logger) {
      this.logger = context.logger;
    }

    try {
      // Check cache first if enabled
      if (this.config.enableCaching) {
        const cachedContent = await this.getCachedContent(content, context);
        if (cachedContent) {
          this.log('info', 'PlantUML cache hit, using cached content');
          cacheHits = 1;
          return {
            ...cachedContent,
            metadata: {
              ...cachedContent.metadata,
              cacheHits,
              cacheMisses,
            },
          };
        } else {
          cacheMisses = 1;
        }
      }

      // Extract PlantUML blocks
      const plantUMLBlocks = this.extractPlantUMLBlocks(content);

      if (plantUMLBlocks.length === 0) {
        const processingTime = Date.now() - startTime;
        return {
          html: content,
          metadata: this.createMetadataWithCache(
            processingTime,
            ['No PlantUML blocks found'],
            {},
            cacheHits,
            cacheMisses,
          ),
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
        metadata: this.createMetadataWithCache(
          processingTime,
          warnings,
          {
            diagramCount: plantUMLBlocks.length,
            format: this.config.format,
            serverUrl: this.config.serverUrl,
          },
          cacheHits,
          cacheMisses,
        ),
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
        metadata: this.createMetadataWithCache(
          processingTime,
          [errorMessage],
          {},
          cacheHits,
          cacheMisses,
        ),
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

    // Check local renderer if enabled
    if (this.config.useLocalRenderer) {
      try {
        await this.validateLocalRenderer();
        this.log('info', 'Local PlantUML renderer is available');
      } catch (error) {
        issues.push(
          `Local PlantUML renderer not available: ${(error as Error).message}`,
        );
        recommendations.push(
          'Install Java and PlantUML JAR, or disable local rendering to use remote server',
        );
      }
    }

    // Test remote server connectivity (as fallback or primary)
    try {
      const testDiagram = '@startuml\nAlice -> Bob: Hello\n@enduml';
      await this.renderPlantUMLRemotely(testDiagram);
      this.log('info', 'Remote PlantUML server is accessible');
    } catch (error) {
      if (!this.config.useLocalRenderer) {
        // Remote is primary, this is critical
        issues.push(
          `PlantUML server not accessible: ${(error as Error).message}`,
        );
        recommendations.push(
          'Check internet connection or configure alternative PlantUML server',
        );
      } else {
        // Remote is fallback, this is a warning
        recommendations.push(
          `Remote PlantUML fallback not available: ${(error as Error).message}`,
        );
      }
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
   * Validate local PlantUML renderer availability
   */
  private async validateLocalRenderer(): Promise<void> {
    if (
      this.config.localRenderer.useCommand &&
      this.config.localRenderer.commandPath
    ) {
      // Validate plantuml command
      try {
        const result = await this.executeCommand(
          this.config.localRenderer.commandPath,
          ['-version'],
          5000,
        );

        if (result.exitCode !== 0) {
          throw new Error(`PlantUML command not available: ${result.stderr}`);
        }
      } catch (error) {
        throw new Error(
          `PlantUML command validation failed: ${(error as Error).message}`,
        );
      }
    } else {
      // Validate Java + JAR approach
      // Check if Java is available
      try {
        const javaResult = await this.executeJavaCommand(
          this.config.localRenderer.javaPath,
          ['-version'],
          5000,
        );

        if (javaResult.exitCode !== 0) {
          throw new Error(`Java not available: ${javaResult.stderr}`);
        }
      } catch (error) {
        throw new Error(`Java validation failed: ${(error as Error).message}`);
      }

      // Check if PlantUML JAR exists
      try {
        await fs.access(this.config.localRenderer.jarPath);
      } catch (error) {
        throw new Error(
          `PlantUML JAR not found at: ${this.config.localRenderer.jarPath}`,
        );
      }
    }

    // Test PlantUML JAR execution with a simple diagram
    try {
      const testDiagram = '@startuml\nAlice -> Bob: Hello\n@enduml';
      await this.renderPlantUMLLocally(testDiagram);
    } catch (error) {
      throw new Error(`PlantUML JAR test failed: ${(error as Error).message}`);
    }
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
   * Render PlantUML diagram to HTML (with local-first approach)
   */
  private async renderPlantUMLDiagram(source: string): Promise<string> {
    // Try local rendering first if enabled
    if (this.config.useLocalRenderer) {
      try {
        this.log('info', 'Attempting PlantUML local rendering');
        const localResult = await this.renderPlantUMLLocally(source);
        this.log('info', 'PlantUML local rendering successful');
        return localResult;
      } catch (error) {
        this.log(
          'warn',
          `PlantUML local rendering failed: ${(error as Error).message}. Falling back to remote rendering`,
        );
        // Continue to remote rendering fallback
      }
    }

    // Fallback to remote rendering
    return await this.renderPlantUMLRemotely(source);
  }

  /**
   * Render PlantUML diagram using local installation
   */
  private async renderPlantUMLLocally(source: string): Promise<string> {
    const tmpDir = tmpdir();
    const timestamp = Date.now();
    const inputFile = join(tmpDir, `plantuml-input-${timestamp}.puml`);
    const outputFile = join(
      tmpDir,
      `plantuml-input-${timestamp}.${this.config.format}`,
    );

    try {
      // Write PlantUML source to temporary file
      await fs.writeFile(inputFile, source, 'utf8');

      let result: { exitCode: number; stdout: string; stderr: string };

      if (
        this.config.localRenderer.useCommand &&
        this.config.localRenderer.commandPath
      ) {
        // Use plantuml command directly
        const args = [`-t${this.config.format}`, '-o', tmpDir, inputFile];

        if (this.config.localRenderer.debug) {
          this.log(
            'debug',
            `PlantUML command: ${this.config.localRenderer.commandPath} ${args.join(' ')}`,
          );
        }

        result = await this.executeCommand(
          this.config.localRenderer.commandPath,
          args,
          this.config.localRenderer.timeout,
        );
      } else {
        // Use Java + JAR approach
        const javaArgs = [
          ...this.config.localRenderer.javaOptions,
          '-jar',
          this.config.localRenderer.jarPath,
          `-t${this.config.format}`,
          '-o',
          tmpDir,
          inputFile,
        ];

        if (this.config.localRenderer.debug) {
          this.log(
            'debug',
            `Java command: ${this.config.localRenderer.javaPath} ${javaArgs.join(' ')}`,
          );
        }

        result = await this.executeJavaCommand(
          this.config.localRenderer.javaPath,
          javaArgs,
          this.config.localRenderer.timeout,
        );
      }

      if (result.exitCode !== 0) {
        throw new Error(`PlantUML execution failed: ${result.stderr}`);
      }

      // Read the generated output file
      const outputContent = await fs.readFile(outputFile, 'utf8');

      if (this.config.format === 'svg') {
        return `<div class="plantuml-diagram">${outputContent}</div>`;
      } else {
        // For PNG, we need to convert to base64 and create img tag
        const outputBuffer = await fs.readFile(outputFile);
        const base64Content = outputBuffer.toString('base64');
        return `<div class="plantuml-diagram">
          <img src="data:image/png;base64,${base64Content}"
               alt="PlantUML Diagram"
               style="max-width: 100%; height: auto;" />
        </div>`;
      }
    } finally {
      // Clean up temporary files
      try {
        await fs.unlink(inputFile);
        await fs.unlink(outputFile);
      } catch (cleanupError) {
        this.log(
          'debug',
          `Failed to clean up temporary files: ${cleanupError}`,
        );
      }
    }
  }

  /**
   * Render PlantUML diagram using remote server
   */
  private async renderPlantUMLRemotely(source: string): Promise<string> {
    this.log('info', 'Using PlantUML remote rendering');

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

        this.log('info', 'PlantUML remote rendering successful');

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
        `Failed to render PlantUML diagram remotely: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Execute Java command with PlantUML JAR
   */
  private async executeJavaCommand(
    javaPath: string,
    args: string[],
    timeout: number,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(javaPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn Java process: ${error.message}`));
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Java process timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * Execute generic command (for plantuml command)
   */
  private async executeCommand(
    command: string,
    args: string[],
    timeout: number,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Log message with optional fallback to console
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
  ): void {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](message);
    } else {
      // Fallback to console if logger not available
      console.log(`[PlantUML-${level.toUpperCase()}] ${message}`);
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
