/**
 * PDF Engine Manager
 * Manages multiple PDF engines with failover, health monitoring, and load balancing
 */

import {
  IPDFEngine,
  IPDFEngineFactory,
  IEngineSelectionStrategy,
  PDFEngineManagerConfig,
  PDFGenerationContext,
  PDFEngineOptions,
  PDFEngineResult,
  PDFEngineHealthStatus,
  PDFEngineMetrics,
} from './types';

import type { ILogger } from '../../../infrastructure/logging/types';

export class PDFEngineManager {
  private engines = new Map<string, IPDFEngine>();
  private healthStatuses = new Map<string, PDFEngineHealthStatus>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics = new Map<string, PDFEngineMetrics>();
  private logger: ILogger;

  constructor(
    private readonly config: PDFEngineManagerConfig,
    private readonly factory: IPDFEngineFactory,
    private readonly selectionStrategy: IEngineSelectionStrategy,
    logger?: ILogger,
  ) {
    // Provide a no-op fallback logger to avoid console usage and keep tests simple.
    this.logger =
      logger ??
      ({
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        log: () => {},
        setLevel: () => {},
        getLevel: () => 'info',
      } as ILogger);
  }

  async initialize(): Promise<void> {
    // Initialize primary engine
    await this.initializeEngine(this.config.primaryEngine);

    // Initialize fallback engines
    for (const engineName of this.config.fallbackEngines) {
      try {
        await this.initializeEngine(engineName);
      } catch (error) {
        this.logger.warn(
          `Failed to initialize fallback engine ${engineName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Start health monitoring
    if (this.config.healthCheckInterval > 0) {
      this.startHealthMonitoring();
    }
  }

  private async initializeEngine(engineName: string): Promise<void> {
    try {
      const engine = await this.factory.createEngine(engineName);
      await engine.initialize();

      this.engines.set(engineName, engine);

      // Initial health check
      const healthStatus = await engine.healthCheck();
      this.healthStatuses.set(engineName, healthStatus);
      this.logger.info(`✅ Initialized ${engineName} engine successfully`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to initialize ${engineName} engine: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Unref the timer so it doesn't prevent Node.js from exiting
    this.healthCheckInterval.unref();
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.engines.entries()).map(
      async ([name, engine]) => {
        try {
          const healthStatus = await engine.healthCheck();
          this.healthStatuses.set(name, healthStatus);

          if (this.config.enableMetrics) {
            const resourceUsage = await engine.getResourceUsage();
            this.updateEngineMetrics(name, resourceUsage);
          }
        } catch (error) {
          this.healthStatuses.set(name, {
            isHealthy: false,
            engineName: name,
            lastCheck: new Date(),
            errors: [
              `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
            ],
          });
        }
      },
    );

    await Promise.allSettled(promises);
  }

  private updateEngineMetrics(
    engineName: string,
    _resourceUsage: {
      memoryUsage: number;
      activeTasks: number;
      averageTaskTime: number;
    },
  ): void {
    // Update metrics tracking
    const engine = this.engines.get(engineName);
    if (
      engine &&
      'getMetrics' in engine &&
      typeof engine.getMetrics === 'function'
    ) {
      const metrics = (
        engine as { getMetrics(): PDFEngineMetrics }
      ).getMetrics();
      this.metrics.set(engineName, metrics);
    }
  }

  async generatePDF(
    context: PDFGenerationContext,
    options: PDFEngineOptions,
  ): Promise<PDFEngineResult> {
    const availableEngines = Array.from(this.engines.values());
    const healthStatuses = Array.from(this.healthStatuses.values());

    // Select best engine
    const selectedEngine = await this.selectionStrategy.selectEngine(
      context,
      availableEngines,
      healthStatuses,
    );

    if (!selectedEngine) {
      return {
        success: false,
        error: 'No healthy PDF engines available',
      };
    }

    // Try generation with retries
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const result = await this.generateWithTimeout(
          selectedEngine,
          context,
          options,
        );

        if (result.success) {
          return result;
        }

        lastError = result.error;

        // If this attempt failed, try with fallback engine
        if (attempt < this.config.maxRetries - 1) {
          const fallbackEngine = await this.selectFallbackEngine(
            selectedEngine,
            context,
          );
          if (fallbackEngine) {
            const fallbackResult = await this.generateWithTimeout(
              fallbackEngine,
              context,
              options,
            );
            if (fallbackResult.success) {
              return fallbackResult;
            }
          }

          // Wait before retry
          if (this.config.retryDelay > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.config.retryDelay),
            );
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      success: false,
      error: `PDF generation failed after ${this.config.maxRetries} attempts. Last error: ${lastError}`,
    };
  }

  private async generateWithTimeout(
    engine: IPDFEngine,
    context: PDFGenerationContext,
    options: PDFEngineOptions,
  ): Promise<PDFEngineResult> {
    const timeoutPromise = new Promise<PDFEngineResult>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `PDF generation timeout after ${this.config.resourceLimits.taskTimeout}ms`,
          ),
        );
      }, this.config.resourceLimits.taskTimeout);
    });

    return Promise.race([engine.generatePDF(context, options), timeoutPromise]);
  }

  private async selectFallbackEngine(
    currentEngine: IPDFEngine,
    context: PDFGenerationContext,
  ): Promise<IPDFEngine | null> {
    const availableEngines = Array.from(this.engines.values()).filter(
      (engine) => engine.name !== currentEngine.name,
    );

    for (const engine of availableEngines) {
      const healthStatus = this.healthStatuses.get(engine.name);
      const canHandle = await engine.canHandle(context);
      if (healthStatus?.isHealthy && canHandle) {
        return engine;
      }
    }

    return null;
  }

  getEngineStatus(): Map<string, PDFEngineHealthStatus> {
    return new Map(this.healthStatuses);
  }

  getEngineMetrics(): Map<string, PDFEngineMetrics> {
    return new Map(this.metrics);
  }

  getAvailableEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  getHealthyEngines(): string[] {
    return Array.from(this.healthStatuses.entries())
      .filter(([_, status]) => status.isHealthy)
      .map(([name, _]) => name);
  }

  async forceHealthCheck(engineName?: string): Promise<void> {
    if (engineName) {
      const engine = this.engines.get(engineName);
      if (engine) {
        const healthStatus = await engine.healthCheck();
        this.healthStatuses.set(engineName, healthStatus);
      }
    } else {
      await this.performHealthChecks();
    }
  }

  async cleanup(): Promise<void> {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Cleanup all engines
    const cleanupPromises = Array.from(this.engines.values()).map((engine) =>
      engine
        .cleanup()
        .catch((error) =>
          this.logger.warn(
            `Engine cleanup error: ${error instanceof Error ? error.message : String(error)}`,
          ),
        ),
    );

    await Promise.allSettled(cleanupPromises);

    this.engines.clear();
    this.healthStatuses.clear();
    this.metrics.clear();
  }

  updateConfig(newConfig: Partial<PDFEngineManagerConfig>): void {
    Object.assign(this.config, newConfig);

    // Restart health monitoring if interval changed
    if (newConfig.healthCheckInterval !== undefined) {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.config.healthCheckInterval > 0) {
        this.startHealthMonitoring();
      }
    }
  }
}
