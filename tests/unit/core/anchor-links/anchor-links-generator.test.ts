/**
 * Comprehensive tests for AnchorLinksGenerator
 * Tests HTML manipulation, anchor link insertion, and configuration handling
 */

import { jest } from '@jest/globals';
import { AnchorLinksGenerator } from '../../../../src/core/anchor-links/anchor-links-generator';
import {
  AnchorLinksOptions,
  AnchorLinksGenerationResult,
} from '../../../../src/core/anchor-links/types';
import { Heading } from '../../../../src/types/index';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import { createMockTranslator } from '../../helpers/mock-translator';

describe('AnchorLinksGenerator', () => {
  let mockTranslator: ReturnType<typeof createMockTranslator>;
  let generator: AnchorLinksGenerator;

  const basicOptions: AnchorLinksOptions = {
    enabled: true,
    anchorDepth: 3,
    linkText: '↑ Back to TOC',
    alignment: 'right',
  };

  const mockHeadings: Heading[] = [
    {
      level: 1,
      text: 'Introduction',
      id: 'introduction',
      anchor: '#introduction',
    },
    {
      level: 2,
      text: 'Getting Started',
      id: 'getting-started',
      anchor: '#getting-started',
    },
    {
      level: 3,
      text: 'Installation',
      id: 'installation',
      anchor: '#installation',
    },
    {
      level: 2,
      text: 'Configuration',
      id: 'configuration',
      anchor: '#configuration',
    },
    {
      level: 4,
      text: 'Advanced Settings',
      id: 'advanced-settings',
      anchor: '#advanced-settings',
    },
  ];

  beforeEach(() => {
    mockTranslator = createMockTranslator();
    mockTranslator.t.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'anchorLinks.backToToc': '↑ Back to TOC',
      };
      return translations[key] || key;
    });

    generator = new AnchorLinksGenerator(basicOptions, mockTranslator);
  });

  describe('constructor', () => {
    it('should initialize with basic options', () => {
      expect(generator).toBeInstanceOf(AnchorLinksGenerator);
    });

    it('should apply default values for missing options', () => {
      const minimalOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 2,
      };

      const minimalGenerator = new AnchorLinksGenerator(minimalOptions);
      expect(minimalGenerator).toBeInstanceOf(AnchorLinksGenerator);
    });

    it('should use translator for default link text when provided', () => {
      const generatorWithTranslator = new AnchorLinksGenerator(
        basicOptions,
        mockTranslator,
      );
      expect(generatorWithTranslator).toBeInstanceOf(AnchorLinksGenerator);
    });

    it('should handle custom CSS classes', () => {
      const optionsWithCss: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        cssClasses: {
          container: 'custom-container',
          link: 'custom-link',
          text: 'custom-text',
        },
      };

      const customGenerator = new AnchorLinksGenerator(optionsWithCss);
      expect(customGenerator).toBeInstanceOf(AnchorLinksGenerator);
    });

    it('should merge CSS classes with defaults', () => {
      const optionsWithPartialCss: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        cssClasses: {
          container: 'custom-container',
        },
      };

      const partialGenerator = new AnchorLinksGenerator(optionsWithPartialCss);
      expect(partialGenerator).toBeInstanceOf(AnchorLinksGenerator);
    });
  });

  describe('insertAnchorLinks method', () => {
    const basicHtml = `
      <h1 id="introduction">Introduction</h1>
      <p>Introduction content</p>
      <h2 id="getting-started">Getting Started</h2>
      <p>Getting started content</p>
      <h3 id="installation">Installation</h3>
      <p>Installation content</p>
    `;

    it('should return unchanged content when disabled', () => {
      const disabledGenerator = new AnchorLinksGenerator({
        enabled: false,
        anchorDepth: 3,
      });

      const result = disabledGenerator.insertAnchorLinks(
        basicHtml,
        mockHeadings,
      );

      expect(result.modifiedHtml).toBe(basicHtml);
      expect(result.linksInserted).toBe(0);
      expect(result.processedSections).toHaveLength(0);
    });

    it('should return unchanged content when no headings provided', () => {
      const result = generator.insertAnchorLinks(basicHtml, []);

      expect(result.modifiedHtml).toBe(basicHtml);
      expect(result.linksInserted).toBe(0);
      expect(result.processedSections).toHaveLength(0);
    });

    it('should filter headings by depth', () => {
      const shallowGenerator = new AnchorLinksGenerator({
        enabled: true,
        anchorDepth: 2,
      });

      const result = shallowGenerator.insertAnchorLinks(
        basicHtml,
        mockHeadings,
      );

      const expectedSections = mockHeadings.filter((h) => h.level <= 2);
      expect(result.processedSections).toHaveLength(expectedSections.length);
    });

    it('should insert anchor links after content sections', () => {
      const result = generator.insertAnchorLinks(
        basicHtml,
        mockHeadings.slice(0, 3),
      );

      expect(result.modifiedHtml).toContain('anchor-link-container');
      expect(result.modifiedHtml).toContain('↑ Back to TOC');
      expect(result.linksInserted).toBeGreaterThan(0);
    });

    it('should handle headings without content gracefully', () => {
      const emptyHtml =
        '<h1 id="empty">Empty</h1><h2 id="also-empty">Also Empty</h2>';
      const emptyHeadings: Heading[] = [
        { level: 1, text: 'Empty', id: 'empty', anchor: '#empty' },
        {
          level: 2,
          text: 'Also Empty',
          id: 'also-empty',
          anchor: '#also-empty',
        },
      ];

      const result = generator.insertAnchorLinks(emptyHtml, emptyHeadings);

      expect(result.modifiedHtml).toBeDefined();
      expect(result.processedSections).toHaveLength(emptyHeadings.length);
    });

    it('should process multiple sections correctly', () => {
      const multiSectionHtml = `
        <h1 id="chapter-1">Chapter 1</h1>
        <p>Chapter 1 content</p>
        <h1 id="chapter-2">Chapter 2</h1>
        <p>Chapter 2 content</p>
        <h1 id="chapter-3">Chapter 3</h1>
        <p>Chapter 3 content</p>
      `;

      const multiHeadings: Heading[] = [
        { level: 1, text: 'Chapter 1', id: 'chapter-1', anchor: '#chapter-1' },
        { level: 1, text: 'Chapter 2', id: 'chapter-2', anchor: '#chapter-2' },
        { level: 1, text: 'Chapter 3', id: 'chapter-3', anchor: '#chapter-3' },
      ];

      const result = generator.insertAnchorLinks(
        multiSectionHtml,
        multiHeadings,
      );

      expect(result.processedSections).toHaveLength(3);
      expect(result.linksInserted).toBeGreaterThan(0);
    });

    it('should handle TOC presence correctly', () => {
      const resultWithToc = generator.insertAnchorLinks(
        basicHtml,
        mockHeadings.slice(0, 3),
        true,
      );
      const resultWithoutToc = generator.insertAnchorLinks(
        basicHtml,
        mockHeadings.slice(0, 3),
        false,
      );

      expect(resultWithToc.modifiedHtml).toBeDefined();
      expect(resultWithoutToc.modifiedHtml).toBeDefined();
      expect(resultWithToc.modifiedHtml).toContain('#toc');
      expect(resultWithoutToc.modifiedHtml).toContain('#top');
    });

    it('should handle headings with numeric anchor depth properly', () => {
      const numericDepthHeadings = mockHeadings.slice(0, 4);

      const result = generator.insertAnchorLinks(
        basicHtml,
        numericDepthHeadings,
      );

      const filteredHeadings = numericDepthHeadings.filter((h) => h.level <= 3);
      expect(result.processedSections).toHaveLength(filteredHeadings.length);
    });

    it('should skip first sub-sections appropriately', () => {
      const hierarchicalHtml = `
        <h1 id="main">Main Section</h1>
        <h2 id="subsection">Subsection</h2>
        <p>Content</p>
        <h2 id="another">Another Section</h2>
        <p>More content</p>
      `;

      const hierarchicalHeadings: Heading[] = [
        { level: 1, text: 'Main Section', id: 'main', anchor: '#main' },
        {
          level: 2,
          text: 'Subsection',
          id: 'subsection',
          anchor: '#subsection',
        },
        {
          level: 2,
          text: 'Another Section',
          id: 'another',
          anchor: '#another',
        },
      ];

      const result = generator.insertAnchorLinks(
        hierarchicalHtml,
        hierarchicalHeadings,
      );

      expect(result.processedSections).toHaveLength(3);
    });
  });

  describe('CSS and styling', () => {
    it('should generate correct CSS styles', () => {
      const styles = generator.getStyles();

      expect(styles).toContain('anchor-link-container');
      expect(styles).toContain('anchor-link-right');
      expect(styles).toContain('anchor-link-left');
      expect(styles).toContain('anchor-link-center');
      expect(styles).toContain(':hover');
      expect(styles).toContain('text-decoration: none');
    });

    it('should use custom CSS classes when provided', () => {
      const customOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        cssClasses: {
          container: 'my-container',
          link: 'my-link',
          text: 'my-text',
        },
      };

      const customGenerator = new AnchorLinksGenerator(customOptions);
      const styles = customGenerator.getStyles();

      expect(styles).toContain('my-container');
      expect(styles).toContain('my-link');
    });

    it('should handle different alignment options', () => {
      const alignments: ('left' | 'center' | 'right')[] = [
        'left',
        'center',
        'right',
      ];

      alignments.forEach((alignment) => {
        const alignedOptions: AnchorLinksOptions = {
          enabled: true,
          anchorDepth: 3,
          alignment,
        };

        const alignedGenerator = new AnchorLinksGenerator(alignedOptions);
        const styles = alignedGenerator.getStyles();

        expect(styles).toContain(`anchor-link-${alignment}`);
        expect(styles).toContain(`text-align: ${alignment}`);
      });
    });
  });

  describe('HTML structure handling', () => {
    it('should handle complex HTML with tables', () => {
      const htmlWithTable = `
        <h1 id="data">Data Section</h1>
        <table>
          <tr><td>Cell 1</td><td>Cell 2</td></tr>
          <tr><td>Cell 3</td><td>Cell 4</td></tr>
        </table>
        <h2 id="summary">Summary</h2>
        <p>Summary content</p>
      `;

      const tableHeadings: Heading[] = [
        { level: 1, text: 'Data Section', id: 'data', anchor: '#data' },
        { level: 2, text: 'Summary', id: 'summary', anchor: '#summary' },
      ];

      const result = generator.insertAnchorLinks(htmlWithTable, tableHeadings);

      expect(result.modifiedHtml).toBeDefined();
      expect(result.processedSections).toHaveLength(2);
    });

    it('should handle HTML with code blocks', () => {
      const htmlWithCode = `
        <h1 id="code">Code Examples</h1>
        <pre><code>console.log('hello');</code></pre>
        <h2 id="more">More Examples</h2>
        <p>Text content</p>
      `;

      const codeHeadings: Heading[] = [
        { level: 1, text: 'Code Examples', id: 'code', anchor: '#code' },
        { level: 2, text: 'More Examples', id: 'more', anchor: '#more' },
      ];

      const result = generator.insertAnchorLinks(htmlWithCode, codeHeadings);

      expect(result.modifiedHtml).toContain('<pre><code>');
      expect(result.processedSections).toHaveLength(2);
    });

    it('should handle HTML with blockquotes', () => {
      const htmlWithBlockquote = `
        <h1 id="quotes">Quotes</h1>
        <blockquote>
          <p>This is a quote</p>
        </blockquote>
        <h2 id="analysis">Analysis</h2>
        <p>Analysis content</p>
      `;

      const quoteHeadings: Heading[] = [
        { level: 1, text: 'Quotes', id: 'quotes', anchor: '#quotes' },
        { level: 2, text: 'Analysis', id: 'analysis', anchor: '#analysis' },
      ];

      const result = generator.insertAnchorLinks(
        htmlWithBlockquote,
        quoteHeadings,
      );

      expect(result.modifiedHtml).toContain('<blockquote>');
      expect(result.processedSections).toHaveLength(2);
    });

    it('should handle HTML with lists', () => {
      const htmlWithLists = `
        <h1 id="features">Features</h1>
        <ul>
          <li>Feature 1</li>
          <li>Feature 2</li>
        </ul>
        <ol>
          <li>Step 1</li>
          <li>Step 2</li>
        </ol>
        <h2 id="conclusion">Conclusion</h2>
        <p>Conclusion content</p>
      `;

      const listHeadings: Heading[] = [
        { level: 1, text: 'Features', id: 'features', anchor: '#features' },
        {
          level: 2,
          text: 'Conclusion',
          id: 'conclusion',
          anchor: '#conclusion',
        },
      ];

      const result = generator.insertAnchorLinks(htmlWithLists, listHeadings);

      expect(result.modifiedHtml).toContain('<ul>');
      expect(result.modifiedHtml).toContain('<ol>');
      expect(result.processedSections).toHaveLength(2);
    });
  });

  describe('Special content detection', () => {
    it('should handle admonitions correctly', () => {
      const htmlWithAdmonitions = `
        <h1 id="warnings">Warnings</h1>
        <div class="admonition warning">
          <p>This is a warning</p>
        </div>
        <h2 id="next">Next Steps</h2>
        <p>Next content</p>
      `;

      const admonitionHeadings: Heading[] = [
        { level: 1, text: 'Warnings', id: 'warnings', anchor: '#warnings' },
        { level: 2, text: 'Next Steps', id: 'next', anchor: '#next' },
      ];

      const result = generator.insertAnchorLinks(
        htmlWithAdmonitions,
        admonitionHeadings,
      );

      expect(result.modifiedHtml).toContain('admonition warning');
      expect(result.processedSections).toHaveLength(2);
    });

    it('should handle diagram containers correctly', () => {
      const htmlWithDiagrams = `
        <h1 id="diagrams">Diagrams</h1>
        <div class="mermaid-diagram">
          <svg>...</svg>
        </div>
        <div class="plantuml-diagram">
          <img src="diagram.png" alt="diagram" />
        </div>
        <h2 id="explanation">Explanation</h2>
        <p>Explanation content</p>
      `;

      const diagramHeadings: Heading[] = [
        { level: 1, text: 'Diagrams', id: 'diagrams', anchor: '#diagrams' },
        {
          level: 2,
          text: 'Explanation',
          id: 'explanation',
          anchor: '#explanation',
        },
      ];

      const result = generator.insertAnchorLinks(
        htmlWithDiagrams,
        diagramHeadings,
      );

      expect(result.modifiedHtml).toContain('mermaid-diagram');
      expect(result.modifiedHtml).toContain('plantuml-diagram');
      expect(result.processedSections).toHaveLength(2);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed HTML gracefully', () => {
      const malformedHtml =
        '<h1 id="broken">Broken<h2 id="also-broken">Also Broken</h2>';
      const brokenHeadings: Heading[] = [
        { level: 1, text: 'Broken', id: 'broken', anchor: '#broken' },
        {
          level: 2,
          text: 'Also Broken',
          id: 'also-broken',
          anchor: '#also-broken',
        },
      ];

      const result = generator.insertAnchorLinks(malformedHtml, brokenHeadings);

      expect(result.modifiedHtml).toBeDefined();
      expect(result.processedSections).toHaveLength(2);
    });

    it('should handle headings with mismatched anchors', () => {
      const mismatchedHtml = '<h1 id="actual-id">Heading</h1>';
      const mismatchedHeadings: Heading[] = [
        { level: 1, text: 'Heading', id: 'wrong-id', anchor: '#wrong-id' },
      ];

      const result = generator.insertAnchorLinks(
        mismatchedHtml,
        mismatchedHeadings,
      );

      expect(result.processedSections[0].hasAnchorLink).toBe(false);
    });

    it('should handle empty anchor strings', () => {
      const emptyAnchorHeadings: Heading[] = [
        { level: 1, text: 'Test', id: 'test', anchor: '' },
      ];

      const result = generator.insertAnchorLinks(
        '<h1 id="test">Test</h1>',
        emptyAnchorHeadings,
      );

      expect(result.processedSections[0].hasAnchorLink).toBe(false);
    });

    it('should handle anchors with hash prefix', () => {
      const hashPrefixHtml = '<h1 id="with-hash">With Hash</h1>';
      const hashPrefixHeadings: Heading[] = [
        { level: 1, text: 'With Hash', id: 'with-hash', anchor: '#with-hash' },
      ];

      const result = generator.insertAnchorLinks(
        hashPrefixHtml,
        hashPrefixHeadings,
      );

      expect(result.processedSections[0].hasAnchorLink).toBe(true);
    });

    it('should handle console warnings for failed insertions', () => {
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const problematicHtml = '<h1>No ID</h1>';
      const problematicHeadings: Heading[] = [
        { level: 1, text: 'No ID', id: 'no-id', anchor: '#no-id' },
      ];

      const result = generator.insertAnchorLinks(
        problematicHtml,
        problematicHeadings,
      );

      expect(result.processedSections[0].hasAnchorLink).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete document with mixed content', () => {
      const complexDocument = `
        <div id="toc">Table of Contents</div>
        <h1 id="introduction">Introduction</h1>
        <p>Introduction paragraph</p>
        <h2 id="overview">Overview</h2>
        <ul><li>Point 1</li><li>Point 2</li></ul>
        <h3 id="details">Details</h3>
        <table><tr><td>Data</td></tr></table>
        <div class="admonition note">
          <p>Important note</p>
        </div>
        <h2 id="conclusion">Conclusion</h2>
        <p>Final thoughts</p>
      `;

      const complexHeadings: Heading[] = [
        {
          level: 1,
          text: 'Introduction',
          id: 'introduction',
          anchor: '#introduction',
        },
        { level: 2, text: 'Overview', id: 'overview', anchor: '#overview' },
        { level: 3, text: 'Details', id: 'details', anchor: '#details' },
        {
          level: 2,
          text: 'Conclusion',
          id: 'conclusion',
          anchor: '#conclusion',
        },
      ];

      const result = generator.insertAnchorLinks(
        complexDocument,
        complexHeadings,
        true,
      );

      expect(result.processedSections).toHaveLength(4);
      expect(result.linksInserted).toBeGreaterThan(0);
      expect(result.modifiedHtml).toContain('#toc');
      expect(result.modifiedHtml).toContain('anchor-link-container');
    });

    it('should maintain performance with large documents', () => {
      const largeHeadings: Heading[] = [];
      let largeHtml = '';

      for (let i = 1; i <= 100; i++) {
        largeHtml += `<h2 id="section-${i}">Section ${i}</h2><p>Content for section ${i}</p>`;
        largeHeadings.push({
          level: 2,
          text: `Section ${i}`,
          id: `section-${i}`,
          anchor: `#section-${i}`,
        });
      }

      const startTime = Date.now();
      const result = generator.insertAnchorLinks(largeHtml, largeHeadings);
      const endTime = Date.now();

      expect(result.processedSections).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Default behavior', () => {
    it('should use fallback link text when no translator provided', () => {
      const noTranslatorGenerator = new AnchorLinksGenerator({
        enabled: true,
        anchorDepth: 3,
      });

      expect(noTranslatorGenerator).toBeInstanceOf(AnchorLinksGenerator);
    });

    it('should handle undefined link text gracefully', () => {
      const undefinedLinkOptions = {
        enabled: true,
        anchorDepth: 3,
      } as AnchorLinksOptions;

      const undefinedLinkGenerator = new AnchorLinksGenerator(
        undefinedLinkOptions,
        mockTranslator,
      );
      expect(undefinedLinkGenerator).toBeInstanceOf(AnchorLinksGenerator);
    });

    it('should apply default depth when none specified', () => {
      const noDepthOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 'none' as any,
      };

      const noDepthGenerator = new AnchorLinksGenerator(noDepthOptions);
      const testHtml = '<h1 id="test">Test</h1>';
      const result = noDepthGenerator.insertAnchorLinks(testHtml, mockHeadings);

      // 'none' depth still processes sections but doesn't insert links
      expect(result.processedSections.length).toBeGreaterThan(0);
      expect(result.linksInserted).toBe(0);
    });
  });
});
