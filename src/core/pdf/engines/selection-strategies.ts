/**
 * PDF Engine Selection Strategies
 * Different strategies for selecting the best PDF engine based on context and health
 */

import {
  IEngineSelectionStrategy,
  IPDFEngine,
  PDFGenerationContext,
  PDFEngineHealthStatus,
} from './types';

/**
 * Health-First Selection Strategy
 * Selects the healthiest engine with the best performance metrics
 */
export class HealthFirstSelectionStrategy implements IEngineSelectionStrategy {
  async selectEngine(
    context: PDFGenerationContext,
    availableEngines: IPDFEngine[],
    healthStatuses: PDFEngineHealthStatus[],
  ): Promise<IPDFEngine | null> {
    if (availableEngines.length === 0) {
      return null;
    }

    // Parallel-check which engines can handle the context and are healthy
    const checks = await Promise.all(
      availableEngines.map(async (engine) => {
        const status = healthStatuses.find((s) => s.engineName === engine.name);
        const can = await engine.canHandle(context);
        return { engine, status, can };
      }),
    );

    const healthyEngines = checks
      .filter((c) => c.status?.isHealthy && c.can)
      .map((c) => ({ engine: c.engine, status: c.status! }));

    if (healthyEngines.length === 0) return null;

    // Sort by health score (success rate, low memory usage, fast response)
    healthyEngines.sort((a, b) => {
      const scoreA = this.calculateHealthScore(a.status);
      const scoreB = this.calculateHealthScore(b.status);
      return scoreB - scoreA; // Higher score is better
    });

    return healthyEngines[0].engine;
  }

  private calculateHealthScore(status: PDFEngineHealthStatus): number {
    let score = 0;

    // Base health score
    if (status.isHealthy) {
      score += 100;
    }

    // Performance factors
    if (status.performance) {
      // Success rate (0-100)
      score += status.performance.successRate * 50;

      // Inverse of average generation time (faster is better)
      if (status.performance.averageGenerationTime > 0) {
        score += Math.max(
          0,
          50 - status.performance.averageGenerationTime / 1000,
        );
      }

      // Inverse of memory usage (lower is better)
      const memoryGB = status.performance.memoryUsage / (1024 * 1024 * 1024);
      score += Math.max(0, 25 - memoryGB);
    }

    // Error penalty
    score -= status.errors.length * 10;

    return Math.max(0, score);
  }
}

/**
 * Primary-First Selection Strategy
 * Prefers primary engine, falls back to others based on capability and health
 */
export class PrimaryFirstSelectionStrategy implements IEngineSelectionStrategy {
  constructor(private readonly primaryEngineName: string) {}

  async selectEngine(
    context: PDFGenerationContext,
    availableEngines: IPDFEngine[],
    healthStatuses: PDFEngineHealthStatus[],
  ): Promise<IPDFEngine | null> {
    if (availableEngines.length === 0) {
      return null;
    }

    // Try primary engine first
    const primaryEngine = availableEngines.find(
      (e) => e.name === this.primaryEngineName,
    );
    if (primaryEngine) {
      const primaryStatus = healthStatuses.find(
        (s) => s.engineName === this.primaryEngineName,
      );
      if (
        primaryStatus?.isHealthy &&
        (await primaryEngine.canHandle(context))
      ) {
        return primaryEngine;
      }
    }

    // Fall back to health-first strategy for other engines
    const fallbackStrategy = new HealthFirstSelectionStrategy();
    const nonPrimaryEngines = availableEngines.filter(
      (e) => e.name !== this.primaryEngineName,
    );
    const nonPrimaryStatuses = healthStatuses.filter(
      (s) => s.engineName !== this.primaryEngineName,
    );

    return fallbackStrategy.selectEngine(
      context,
      nonPrimaryEngines,
      nonPrimaryStatuses,
    );
  }
}

/**
 * Load Balanced Selection Strategy
 * Distributes load across multiple healthy engines
 */
export class LoadBalancedSelectionStrategy implements IEngineSelectionStrategy {
  private roundRobinIndex = 0;

  async selectEngine(
    context: PDFGenerationContext,
    availableEngines: IPDFEngine[],
    healthStatuses: PDFEngineHealthStatus[],
  ): Promise<IPDFEngine | null> {
    if (availableEngines.length === 0) {
      return null;
    }

    // Parallel canHandle checks for available engines
    const checks = await Promise.all(
      availableEngines.map(async (engine) => {
        const status = healthStatuses.find((s) => s.engineName === engine.name);
        const can = await engine.canHandle(context);
        return { engine, status, can };
      }),
    );

    const healthyEngines = checks
      .filter((c) => c.status?.isHealthy && c.can)
      .map((c) => c.engine);
    if (healthyEngines.length === 0) return null;

    // Round-robin selection
    const selectedEngine =
      healthyEngines[this.roundRobinIndex % healthyEngines.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % healthyEngines.length;

    return selectedEngine;
  }
}

/**
 * Capability-Based Selection Strategy
 * Selects engine based on specific capabilities required by the context
 */
export class CapabilityBasedSelectionStrategy
  implements IEngineSelectionStrategy
{
  async selectEngine(
    context: PDFGenerationContext,
    availableEngines: IPDFEngine[],
    healthStatuses: PDFEngineHealthStatus[],
  ): Promise<IPDFEngine | null> {
    if (availableEngines.length === 0) {
      return null;
    }

    // Score engines based on capabilities match
    const scoredEngines: Array<{ engine: IPDFEngine; score: number }> = [];

    // Parallel capability checks
    const checks = await Promise.all(
      availableEngines.map(async (engine) => {
        const status = healthStatuses.find((s) => s.engineName === engine.name);
        const can = await engine.canHandle(context);
        return { engine, status, can };
      }),
    );

    const valid = checks.filter((c) => c.status?.isHealthy && c.can);
    if (valid.length === 0) return null;

    for (const c of valid) {
      const score = this.calculateCapabilityScore(c.engine, context);
      scoredEngines.push({ engine: c.engine, score });
    }

    // Sort by capability score (higher is better)
    scoredEngines.sort((a, b) => b.score - a.score);

    return scoredEngines[0].engine;
  }

  private calculateCapabilityScore(
    engine: IPDFEngine,
    context: PDFGenerationContext,
  ): number {
    let score = 0;
    const capabilities = engine.capabilities;

    // TOC support
    if (context.toc?.enabled && capabilities.supportsTOC) {
      score += 20;
    }

    // Chinese text support
    if (context.enableChineseSupport && capabilities.supportsChineseText) {
      score += 20;
    }

    // Custom CSS support
    if (context.customCSS && capabilities.supportsCustomCSS) {
      score += 15;
    }

    // Base capability score
    score += capabilities.maxConcurrentJobs * 2;

    return score;
  }
}

/**
 * Adaptive Selection Strategy
 * Learns from past performance and adapts selection over time
 */
export class AdaptiveSelectionStrategy implements IEngineSelectionStrategy {
  private performanceHistory = new Map<string, number[]>();
  private readonly maxHistorySize = 100;

  async selectEngine(
    context: PDFGenerationContext,
    availableEngines: IPDFEngine[],
    healthStatuses: PDFEngineHealthStatus[],
  ): Promise<IPDFEngine | null> {
    if (availableEngines.length === 0) {
      return null;
    }

    // Parallel-check which engines are healthy and can handle the context
    const checks = await Promise.all(
      availableEngines.map(async (engine) => {
        const status = healthStatuses.find((s) => s.engineName === engine.name);
        const can = await engine.canHandle(context);
        return { engine, status, can };
      }),
    );

    const healthyEngines = checks
      .filter((c) => c.status?.isHealthy && c.can)
      .map((c) => c.engine);
    if (healthyEngines.length === 0) return null;

    // Calculate adaptive scores based on historical performance
    let bestEngine = healthyEngines[0];
    let bestScore = -1;

    for (const engine of healthyEngines) {
      const score = this.calculateAdaptiveScore(engine);
      if (score > bestScore) {
        bestScore = score;
        bestEngine = engine;
      }
    }

    return bestEngine;
  }

  private calculateAdaptiveScore(engine: IPDFEngine): number {
    const history = this.performanceHistory.get(engine.name) || [];

    if (history.length === 0) {
      // No history, give medium score
      return 50;
    }

    // Calculate average performance score
    const averageScore =
      history.reduce((sum, score) => sum + score, 0) / history.length;

    // Add recency bias (recent performance matters more)
    const recentHistory = history.slice(-10);
    const recentScore =
      recentHistory.reduce((sum, score) => sum + score, 0) /
      recentHistory.length;

    return averageScore * 0.3 + recentScore * 0.7;
  }

  recordPerformance(
    engineName: string,
    success: boolean,
    generationTime: number,
  ): void {
    // Score based on success and speed
    let score = success ? 50 : 0;

    // Bonus for speed (under 5 seconds is good)
    if (success && generationTime < 5000) {
      score += Math.max(0, 50 - generationTime / 100);
    }

    const history = this.performanceHistory.get(engineName) || [];
    history.push(score);

    // Keep only recent history
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.performanceHistory.set(engineName, history);
  }
}
