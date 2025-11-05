/**
 * Comprehensive tests for anchor links type definitions
 * Tests type compatibility and interface validation
 */

import {
  AnchorLinksOptions,
  AnchorLinksGenerationResult,
  ProcessedSection,
  AnchorLinkTemplate,
  AnchorLinksDepth,
} from '../../../../src/core/anchor-links/types';

describe('Core Anchor Links Types', () => {
  describe('AnchorLinksDepth Type', () => {
    it('should accept valid depth values', () => {
      const validDepths: AnchorLinksDepth[] = ['none', 2, 3, 4, 5, 6];

      validDepths.forEach((depth) => {
        expect(['none', 2, 3, 4, 5, 6]).toContain(depth);
      });
    });

    it('should represent all supported anchor depth options', () => {
      const noneValue: AnchorLinksDepth = 'none';
      const numericValue: AnchorLinksDepth = 3;
      const maxValue: AnchorLinksDepth = 6;

      expect(noneValue).toBe('none');
      expect(numericValue).toBe(3);
      expect(maxValue).toBe(6);
    });
  });

  describe('AnchorLinksOptions Interface', () => {
    it('should validate required properties', () => {
      const minimalOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
      };

      expect(minimalOptions.enabled).toBe(true);
      expect(minimalOptions.anchorDepth).toBe(3);
    });

    it('should validate complete options with all optional properties', () => {
      const completeOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 4,
        linkText: 'Back to Table of Contents',
        cssClasses: {
          container: 'back-to-toc-container',
          link: 'back-to-toc-link',
          text: 'back-to-toc-text',
        },
        alignment: 'right',
      };

      expect(completeOptions.enabled).toBe(true);
      expect(completeOptions.anchorDepth).toBe(4);
      expect(completeOptions.linkText).toBe('Back to Table of Contents');
      expect(completeOptions.cssClasses).toBeDefined();
      expect(completeOptions.cssClasses?.container).toBe(
        'back-to-toc-container',
      );
      expect(completeOptions.cssClasses?.link).toBe('back-to-toc-link');
      expect(completeOptions.cssClasses?.text).toBe('back-to-toc-text');
      expect(completeOptions.alignment).toBe('right');
    });

    it('should validate all alignment options', () => {
      const leftAlignment: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        alignment: 'left',
      };
      const centerAlignment: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        alignment: 'center',
      };
      const rightAlignment: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        alignment: 'right',
      };

      expect(leftAlignment.alignment).toBe('left');
      expect(centerAlignment.alignment).toBe('center');
      expect(rightAlignment.alignment).toBe('right');
    });

    it('should handle disabled state correctly', () => {
      const disabledOptions: AnchorLinksOptions = {
        enabled: false,
        anchorDepth: 'none',
      };

      expect(disabledOptions.enabled).toBe(false);
      expect(disabledOptions.anchorDepth).toBe('none');
    });

    it('should validate partial CSS classes', () => {
      const partialCssOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 2,
        cssClasses: {
          container: 'custom-container',
          // link and text are optional
        },
      };

      expect(partialCssOptions.cssClasses?.container).toBe('custom-container');
      expect(partialCssOptions.cssClasses?.link).toBeUndefined();
      expect(partialCssOptions.cssClasses?.text).toBeUndefined();
    });
  });

  describe('AnchorLinksGenerationResult Interface', () => {
    it('should validate successful generation result', () => {
      const successResult: AnchorLinksGenerationResult = {
        modifiedHtml: '<h1>Modified content</h1>',
        linksInserted: 3,
        processedSections: [
          {
            title: 'Introduction',
            level: 1,
            anchor: '#introduction',
            hasAnchorLink: true,
          },
        ],
      };

      expect(successResult.modifiedHtml).toBe('<h1>Modified content</h1>');
      expect(successResult.linksInserted).toBe(3);
      expect(successResult.processedSections).toHaveLength(1);
      expect(successResult.processedSections[0].title).toBe('Introduction');
      expect(successResult.processedSections[0].hasAnchorLink).toBe(true);
    });

    it('should validate empty generation result', () => {
      const emptyResult: AnchorLinksGenerationResult = {
        modifiedHtml: '<p>No changes</p>',
        linksInserted: 0,
        processedSections: [],
      };

      expect(emptyResult.modifiedHtml).toBe('<p>No changes</p>');
      expect(emptyResult.linksInserted).toBe(0);
      expect(emptyResult.processedSections).toHaveLength(0);
    });

    it('should validate multiple processed sections', () => {
      const multiSectionResult: AnchorLinksGenerationResult = {
        modifiedHtml: '<h1>Content</h1>',
        linksInserted: 2,
        processedSections: [
          {
            title: 'Chapter 1',
            level: 1,
            anchor: '#chapter-1',
            hasAnchorLink: true,
          },
          {
            title: 'Chapter 2',
            level: 1,
            anchor: '#chapter-2',
            hasAnchorLink: false,
          },
        ],
      };

      expect(multiSectionResult.processedSections).toHaveLength(2);
      expect(multiSectionResult.processedSections[0].hasAnchorLink).toBe(true);
      expect(multiSectionResult.processedSections[1].hasAnchorLink).toBe(false);
    });
  });

  describe('ProcessedSection Interface', () => {
    it('should validate section with anchor link', () => {
      const sectionWithLink: ProcessedSection = {
        title: 'Getting Started',
        level: 2,
        anchor: '#getting-started',
        hasAnchorLink: true,
      };

      expect(sectionWithLink.title).toBe('Getting Started');
      expect(sectionWithLink.level).toBe(2);
      expect(sectionWithLink.anchor).toBe('#getting-started');
      expect(sectionWithLink.hasAnchorLink).toBe(true);
    });

    it('should validate section without anchor link', () => {
      const sectionWithoutLink: ProcessedSection = {
        title: 'Brief Overview',
        level: 3,
        anchor: '#brief-overview',
        hasAnchorLink: false,
      };

      expect(sectionWithoutLink.title).toBe('Brief Overview');
      expect(sectionWithoutLink.level).toBe(3);
      expect(sectionWithoutLink.anchor).toBe('#brief-overview');
      expect(sectionWithoutLink.hasAnchorLink).toBe(false);
    });

    it('should validate different heading levels', () => {
      const levels = [1, 2, 3, 4, 5, 6];

      levels.forEach((level) => {
        const section: ProcessedSection = {
          title: `Heading Level ${level}`,
          level: level,
          anchor: `#heading-level-${level}`,
          hasAnchorLink: level <= 3,
        };

        expect(section.level).toBe(level);
        expect(section.title).toBe(`Heading Level ${level}`);
        expect(section.anchor).toBe(`#heading-level-${level}`);
      });
    });
  });

  describe('AnchorLinkTemplate Interface', () => {
    it('should validate complete template structure', () => {
      const template: AnchorLinkTemplate = {
        template:
          '<div class="anchor-link"><a href="#toc">Back to TOC</a></div>',
        styles: '.anchor-link { text-align: right; }',
      };

      expect(template.template).toContain('<div class="anchor-link">');
      expect(template.template).toContain('<a href="#toc">');
      expect(template.template).toContain('Back to TOC');
      expect(template.styles).toContain('.anchor-link');
      expect(template.styles).toContain('text-align: right');
    });

    it('should validate empty template', () => {
      const emptyTemplate: AnchorLinkTemplate = {
        template: '',
        styles: '',
      };

      expect(emptyTemplate.template).toBe('');
      expect(emptyTemplate.styles).toBe('');
    });

    it('should validate complex template with multiple elements', () => {
      const complexTemplate: AnchorLinkTemplate = {
        template: `
          <div class="back-to-toc-container anchor-link-right">
            <a href="#toc" class="back-to-toc-link">
              <span class="back-to-toc-text">↑ Back to TOC</span>
            </a>
          </div>
        `,
        styles: `
          .back-to-toc-container { margin: 1rem 0; }
          .anchor-link-right { text-align: right; }
          .back-to-toc-link { color: #666; text-decoration: none; }
          .back-to-toc-link:hover { color: #333; background-color: #f5f5f5; }
        `,
      };

      expect(complexTemplate.template).toContain('back-to-toc-container');
      expect(complexTemplate.template).toContain('anchor-link-right');
      expect(complexTemplate.template).toContain('back-to-toc-link');
      expect(complexTemplate.template).toContain('back-to-toc-text');
      expect(complexTemplate.styles).toContain('.back-to-toc-container');
      expect(complexTemplate.styles).toContain('.anchor-link-right');
      expect(complexTemplate.styles).toContain(':hover');
    });
  });

  describe('Type Integration Tests', () => {
    it('should validate complete workflow types', () => {
      const options: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        linkText: '↑ Back to TOC',
        cssClasses: {
          container: 'anchor-container',
          link: 'anchor-link',
          text: 'anchor-text',
        },
        alignment: 'right',
      };

      const template: AnchorLinkTemplate = {
        template: `<div class="${options.cssClasses?.container}"><a href="#toc" class="${options.cssClasses?.link}"><span class="${options.cssClasses?.text}">${options.linkText}</span></a></div>`,
        styles: '.anchor-container { text-align: right; }',
      };

      const sections: ProcessedSection[] = [
        {
          title: 'Introduction',
          level: 1,
          anchor: '#introduction',
          hasAnchorLink: true,
        },
        {
          title: 'Getting Started',
          level: 2,
          anchor: '#getting-started',
          hasAnchorLink: true,
        },
      ];

      const result: AnchorLinksGenerationResult = {
        modifiedHtml:
          '<h1 id="introduction">Introduction</h1><div class="anchor-container">...</div>',
        linksInserted: 2,
        processedSections: sections,
      };

      expect(options.enabled).toBe(true);
      expect(template.template).toContain(options.linkText);
      expect(result.processedSections).toEqual(sections);
      expect(result.linksInserted).toBe(
        sections.filter((s) => s.hasAnchorLink).length,
      );
    });

    it('should validate disabled anchor links configuration', () => {
      const disabledOptions: AnchorLinksOptions = {
        enabled: false,
        anchorDepth: 'none',
      };

      const noOpResult: AnchorLinksGenerationResult = {
        modifiedHtml: '<h1>Original content</h1>',
        linksInserted: 0,
        processedSections: [],
      };

      expect(disabledOptions.enabled).toBe(false);
      expect(disabledOptions.anchorDepth).toBe('none');
      expect(noOpResult.linksInserted).toBe(0);
      expect(noOpResult.processedSections).toHaveLength(0);
    });
  });
});
