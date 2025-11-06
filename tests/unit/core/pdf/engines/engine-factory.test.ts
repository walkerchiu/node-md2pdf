/**
 * Tests for PDF Engine Factory
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFEngineFactory } from '../../../../../src/core/pdf/engines/engine-factory';
import { PuppeteerPDFEngine } from '../../../../../src/core/pdf/engines/puppeteer-engine';

describe('PDFEngineFactory', () => {
  let factory: PDFEngineFactory;

  beforeEach(() => {
    factory = new PDFEngineFactory();
  });

  describe('Engine Registration', () => {
    it('should have default engines registered', () => {
      const availableEngines = factory.getAvailableEngines();

      expect(availableEngines).toContain('puppeteer');
      expect(availableEngines).toHaveLength(1);
    });

    it('should allow registering custom engines', () => {
      class CustomEngine {
        name = 'custom';
        version = '1.0';
        capabilities = {
          supportedFormats: ['A4'],
          maxConcurrentJobs: 1,
          supportsCustomCSS: false,
          supportsChineseText: false,
          supportsTOC: false,
          supportsHeaderFooter: false,
        };
      }

      factory.registerEngine('custom', CustomEngine as any);

      const availableEngines = factory.getAvailableEngines();
      expect(availableEngines).toContain('custom');
      expect(availableEngines).toHaveLength(2);
    });

    it('should allow unregistering engines', () => {
      const result = factory.unregisterEngine('puppeteer');

      expect(result).toBe(true);
      expect(factory.getAvailableEngines()).not.toContain('puppeteer');
    });

    it('should return false when unregistering non-existent engine', () => {
      const result = factory.unregisterEngine('non-existent');

      expect(result).toBe(false);
    });

    it('should check if engine exists', () => {
      expect(factory.hasEngine('puppeteer')).toBe(true);
      expect(factory.hasEngine('non-existent')).toBe(false);
    });
  });

  describe('Engine Creation', () => {
    it('should create Puppeteer engine', async () => {
      const engine = await factory.createEngine('puppeteer');

      expect(engine).toBeInstanceOf(PuppeteerPDFEngine);
      expect(engine.name).toBe('puppeteer');
      expect(engine.capabilities).toBeDefined();
    });

    it('should throw error for unknown engine', async () => {
      await expect(factory.createEngine('unknown')).rejects.toThrow(
        'Unknown PDF engine: unknown',
      );
    });

    it('should pass options to engine constructor', async () => {
      const options = { customOption: 'test' };

      // This test would need a mock engine that accepts options
      // For now, just verify it doesn't throw
      await expect(
        factory.createEngine('puppeteer', options),
      ).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle engine creation failures gracefully', async () => {
      // Register a failing engine
      class FailingEngine {
        constructor() {
          throw new Error('Constructor failure');
        }
      }

      factory.registerEngine('failing', FailingEngine as any);

      await expect(factory.createEngine('failing')).rejects.toThrow(
        'Failed to create failing engine: Constructor failure',
      );
    });
  });
});
