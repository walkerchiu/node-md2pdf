/**
 * PDF Engine Factory
 * Creates and manages PDF engine instances
 */

import { ChromeHeadlessPDFEngine } from './chrome-headless-engine';
import { PuppeteerPDFEngine } from './puppeteer-engine';
import { IPDFEngine, IPDFEngineFactory } from './types';

export class PDFEngineFactory implements IPDFEngineFactory {
  private engineRegistry = new Map<
    string,
    new (...args: unknown[]) => IPDFEngine
  >();

  constructor() {
    // Register default engines
    this.registerEngine('puppeteer', PuppeteerPDFEngine);
    this.registerEngine('chrome-headless', ChromeHeadlessPDFEngine);
  }

  async createEngine(
    engineName: string,
    options?: Record<string, unknown>,
  ): Promise<IPDFEngine> {
    const EngineClass = this.engineRegistry.get(engineName);

    if (!EngineClass) {
      throw new Error(
        `Unknown PDF engine: ${engineName}. Available engines: ${this.getAvailableEngines().join(', ')}`,
      );
    }

    try {
      const engine = new EngineClass(options);
      return engine;
    } catch (error) {
      throw new Error(
        `Failed to create ${engineName} engine: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getAvailableEngines(): string[] {
    return Array.from(this.engineRegistry.keys());
  }

  registerEngine(
    name: string,
    engineClass: new (...args: unknown[]) => IPDFEngine,
  ): void {
    this.engineRegistry.set(name, engineClass);
  }

  unregisterEngine(name: string): boolean {
    return this.engineRegistry.delete(name);
  }

  hasEngine(name: string): boolean {
    return this.engineRegistry.has(name);
  }
}
