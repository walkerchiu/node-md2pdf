/**
 * Comprehensive tests for anchor links module exports
 * Tests module structure and export availability
 */

import * as AnchorLinksModule from '../../../../src/core/anchor-links/index';
import { AnchorLinksGenerator } from '../../../../src/core/anchor-links/anchor-links-generator';
import {
  AnchorLinksOptions,
  AnchorLinksGenerationResult,
  ProcessedSection,
  AnchorLinkTemplate,
  AnchorLinksDepth,
} from '../../../../src/core/anchor-links/types';

describe('Core Anchor Links Module Index', () => {
  describe('Module Exports', () => {
    it('should export AnchorLinksGenerator class', () => {
      expect(AnchorLinksModule.AnchorLinksGenerator).toBeDefined();
      expect(AnchorLinksModule.AnchorLinksGenerator).toBe(AnchorLinksGenerator);
    });

    it('should have generator export available', () => {
      expect(AnchorLinksModule).toHaveProperty('AnchorLinksGenerator');
      expect(AnchorLinksModule.AnchorLinksGenerator).toBeDefined();
    });

    it('should maintain proper type exports', () => {
      // Since types are not runtime values, we test type compatibility through usage
      const testOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
      };

      const testResult: AnchorLinksGenerationResult = {
        modifiedHtml: '<h1>Test</h1>',
        linksInserted: 0,
        processedSections: [],
      };

      const testSection: ProcessedSection = {
        title: 'Test Section',
        level: 1,
        anchor: '#test-section',
        hasAnchorLink: false,
      };

      const testTemplate: AnchorLinkTemplate = {
        template: '<div>Test</div>',
        styles: '.test { color: red; }',
      };

      const testDepth: AnchorLinksDepth = 'none';

      expect(testOptions.enabled).toBe(true);
      expect(testResult.modifiedHtml).toBe('<h1>Test</h1>');
      expect(testSection.title).toBe('Test Section');
      expect(testTemplate.template).toBe('<div>Test</div>');
      expect(testDepth).toBe('none');
    });
  });

  describe('Class Export Validation', () => {
    it('should export functional AnchorLinksGenerator class', () => {
      const options: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 2,
      };

      expect(() => {
        new AnchorLinksModule.AnchorLinksGenerator(options);
      }).not.toThrow();
    });

    it('should allow instantiation of exported AnchorLinksGenerator', () => {
      const options: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        linkText: 'Back to TOC',
        alignment: 'right',
      };

      const generator = new AnchorLinksModule.AnchorLinksGenerator(options);
      expect(generator).toBeInstanceOf(AnchorLinksModule.AnchorLinksGenerator);
      expect(generator).toBeInstanceOf(AnchorLinksGenerator);
    });
  });

  describe('Type Compatibility', () => {
    it('should maintain compatibility between imported and direct types', () => {
      const directOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 4,
      };

      // Test type compatibility by assignment
      const moduleOptions = directOptions;

      expect(moduleOptions.enabled).toBe(directOptions.enabled);
      expect(moduleOptions.anchorDepth).toBe(directOptions.anchorDepth);
    });

    it('should allow cross-type assignments', () => {
      const directResult: AnchorLinksGenerationResult = {
        modifiedHtml: '<h1>Direct</h1>',
        linksInserted: 1,
        processedSections: [],
      };

      const moduleResult = directResult;

      expect(moduleResult.modifiedHtml).toBe('<h1>Direct</h1>');
      expect(moduleResult.linksInserted).toBe(1);
    });
  });

  describe('Module Structure', () => {
    it('should export AnchorLinksGenerator', () => {
      const moduleKeys = Object.keys(AnchorLinksModule);

      expect(moduleKeys).toContain('AnchorLinksGenerator');
      expect(typeof AnchorLinksModule.AnchorLinksGenerator).toBe('function');
    });

    it('should export generator as constructor function', () => {
      expect(typeof AnchorLinksModule.AnchorLinksGenerator).toBe('function');
      expect(AnchorLinksModule.AnchorLinksGenerator.prototype).toBeDefined();
    });
  });

  describe('Import/Export Consistency', () => {
    it('should maintain consistent exports across module boundaries', () => {
      const generator1 = new AnchorLinksGenerator({
        enabled: true,
        anchorDepth: 2,
      });

      const generator2 = new AnchorLinksModule.AnchorLinksGenerator({
        enabled: true,
        anchorDepth: 2,
      });

      expect(generator1.constructor).toBe(generator2.constructor);
      expect(Object.getPrototypeOf(generator1)).toEqual(
        Object.getPrototypeOf(generator2),
      );
    });

    it('should allow type interoperability', () => {
      const testOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        linkText: 'Back to Top',
      };

      const testDepth: AnchorLinksDepth = 4;
      const moduleDepth = testDepth;

      expect(moduleDepth).toBe(4);

      const moduleOptions = testOptions;
      expect(moduleOptions.linkText).toBe('Back to Top');
    });
  });
});
