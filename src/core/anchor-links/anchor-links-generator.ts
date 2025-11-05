/**
 * Anchor Links Generator - Generate back-to-TOC anchor links at the end of sections within specified depth
 */

import { Heading } from '../../types/index';

import {
  AnchorLinksOptions,
  AnchorLinksGenerationResult,
  ProcessedSection,
  AnchorLinkTemplate,
} from './types';

import type { ITranslationManager } from '../../infrastructure/i18n/types';

export class AnchorLinksGenerator {
  private options: Required<AnchorLinksOptions>;
  private translator: ITranslationManager | undefined;

  constructor(options: AnchorLinksOptions, translator?: ITranslationManager) {
    this.translator = translator;

    // Set default values
    this.options = {
      enabled: options.enabled,
      anchorDepth: options.anchorDepth || 3,
      linkText: options.linkText || this.getDefaultLinkText(),
      cssClasses: {
        container: 'anchor-link-container',
        link: 'anchor-link',
        text: 'anchor-link-text',
        ...options.cssClasses,
      },
      alignment: options.alignment || 'right',
    };
  }

  /**
   * Insert anchor links into HTML content
   */
  insertAnchorLinks(
    htmlContent: string,
    headings: Heading[],
    hasTOC?: boolean,
  ): AnchorLinksGenerationResult {
    if (!this.options.enabled || !headings || headings.length === 0) {
      return {
        modifiedHtml: htmlContent,
        linksInserted: 0,
        processedSections: [],
      };
    }

    // Filter headings within specified depth range
    const anchorDepth =
      typeof this.options.anchorDepth === 'number'
        ? this.options.anchorDepth
        : 3;
    const targetHeadings = headings.filter(
      (heading) => heading.level <= anchorDepth,
    );

    if (targetHeadings.length === 0) {
      return {
        modifiedHtml: htmlContent,
        linksInserted: 0,
        processedSections: [],
      };
    }

    let modifiedHtml = htmlContent;
    const processedSections: ProcessedSection[] = [];
    let linksInserted = 0;

    // Create anchor link template
    const template = this.createAnchorLinkTemplate(hasTOC);

    // Insert anchor links at the end of each target heading section
    for (let i = 0; i < targetHeadings.length; i++) {
      const currentHeading = targetHeadings[i];
      const nextHeading = targetHeadings[i + 1];

      // Check if next heading is the first sub-section of current heading
      // This affects whether we insert anchor link after current heading
      let nextIsFirstSubSection = false;
      if (nextHeading && nextHeading.level > currentHeading.level) {
        // Next heading is a sub-heading, it's the first one under current heading
        // since it immediately follows current heading and is deeper level
        nextIsFirstSubSection = true;
      }

      try {
        const { html, inserted } = this.insertAnchorLinkForSection(
          modifiedHtml,
          currentHeading,
          nextHeading,
          template,
          nextIsFirstSubSection,
        );

        modifiedHtml = html;
        if (inserted) {
          linksInserted++;
        }

        processedSections.push({
          title: currentHeading.text,
          level: currentHeading.level,
          anchor: currentHeading.anchor,
          hasAnchorLink: inserted,
        });
      } catch (error) {
        // Log error but continue processing other sections
        console.warn(
          `Failed to insert anchor link for section "${currentHeading.text}":`,
          error,
        );
        processedSections.push({
          title: currentHeading.text,
          level: currentHeading.level,
          anchor: currentHeading.anchor,
          hasAnchorLink: false,
        });
      }
    }

    return {
      modifiedHtml,
      linksInserted,
      processedSections,
    };
  }

  /**
   * Insert anchor link for a specific section
   */
  private insertAnchorLinkForSection(
    htmlContent: string,
    currentHeading: Heading,
    nextHeading: Heading | undefined,
    template: AnchorLinkTemplate,
    isFirstSubSection?: boolean,
  ): { html: string; inserted: boolean } {
    // Clean anchor - remove # prefix if present for HTML id matching
    const cleanAnchor = currentHeading.anchor?.startsWith('#')
      ? currentHeading.anchor.substring(1)
      : currentHeading.anchor ||
        `heading-${currentHeading.level}-${Date.now()}`;

    // Build current heading HTML tag pattern
    const currentHeadingPattern = new RegExp(
      `<h${currentHeading.level}[^>]*id="${cleanAnchor}"[^>]*>.*?</h${currentHeading.level}>`,
      'i',
    );

    // Find current heading position in HTML
    const currentMatch = htmlContent.match(currentHeadingPattern);
    if (!currentMatch) {
      return { html: htmlContent, inserted: false };
    }

    let insertionPoint: number = 0;
    let hasContent = false;

    if (nextHeading) {
      // If there's a next heading, insert before the next heading
      const cleanNextAnchor = nextHeading.anchor.startsWith('#')
        ? nextHeading.anchor.substring(1)
        : nextHeading.anchor;
      const nextHeadingPattern = new RegExp(
        `<h${nextHeading.level}[^>]*id="${cleanNextAnchor}"[^>]*>`,
        'i',
      );
      const nextMatch = htmlContent.match(nextHeadingPattern);

      if (nextMatch && nextMatch.index !== undefined) {
        // Find appropriate insertion point, avoiding insertion inside tables or other structures
        const contentBetween = htmlContent.slice(
          currentMatch.index! + currentMatch[0].length,
          nextMatch.index,
        );

        // Look for the last structural element end tag as insertion point
        const lastParagraphEnd = contentBetween.lastIndexOf('</p>');
        const lastTableEnd = contentBetween.lastIndexOf('</table>');
        const lastPreEnd = contentBetween.lastIndexOf('</pre>'); // Code blocks
        const lastBlockquoteEnd = contentBetween.lastIndexOf('</blockquote>'); // Quotes
        const lastListEnd = Math.max(
          contentBetween.lastIndexOf('</ul>'), // Unordered lists
          contentBetween.lastIndexOf('</ol>'), // Ordered lists
        );

        // Find special content div elements (diagrams, admonitions)
        const lastAdmonitionEnd = this.findLastAdmonitionEnd(contentBetween);
        const lastDiagramEnd = this.findLastDiagramEnd(contentBetween);
        const lastGenericDivEnd = contentBetween.lastIndexOf('</div>'); // Generic divs

        const structuralEndPoints = [
          { pos: lastParagraphEnd, tagLength: 4 }, // </p>
          { pos: lastTableEnd, tagLength: 8 }, // </table>
          { pos: lastPreEnd, tagLength: 6 }, // </pre>
          { pos: lastBlockquoteEnd, tagLength: 13 }, // </blockquote>
          { pos: lastListEnd, tagLength: 5 }, // </ul> or </ol>
          { pos: lastAdmonitionEnd, tagLength: 6 }, // </div> for admonitions
          { pos: lastDiagramEnd, tagLength: 6 }, // </div> for diagrams
          { pos: lastGenericDivEnd, tagLength: 6 }, // </div> generic
        ];

        // Find the last occurring structural element
        const lastStructuralElement = structuralEndPoints
          .filter((point) => point.pos > -1)
          .sort((a, b) => b.pos - a.pos)[0];

        if (lastStructuralElement) {
          // Insert after the last structural element
          insertionPoint =
            currentMatch.index! +
            currentMatch[0].length +
            lastStructuralElement.pos +
            lastStructuralElement.tagLength;
        } else {
          insertionPoint = nextMatch.index;
        }

        // Don't insert anchor link if next heading is the first sub-section
        if (isFirstSubSection) {
          hasContent = false;
        } else {
          hasContent = true;
        }
      } else {
        // If next heading not found, insert after current heading
        insertionPoint = currentMatch.index! + currentMatch[0].length;
        hasContent = true; // Insert after current heading
      }
    } else {
      // If this is the last heading, always insert anchor link at document end
      hasContent = true;
      insertionPoint = htmlContent.length;
    }

    // Don't insert anchor link if no sufficient content
    if (!hasContent) {
      return { html: htmlContent, inserted: false };
    }

    // Insert anchor link
    const anchorLinkHtml = this.generateAnchorLinkHtml(template);
    const modifiedHtml =
      htmlContent.slice(0, insertionPoint) +
      anchorLinkHtml +
      htmlContent.slice(insertionPoint);

    return { html: modifiedHtml, inserted: true };
  }

  /**
   * Create anchor link template
   */
  private createAnchorLinkTemplate(hasTOC?: boolean): AnchorLinkTemplate {
    const alignClass = `anchor-link-${this.options.alignment}`;
    // Use #toc if TOC exists, otherwise use #top or just # for document top
    const linkTarget = hasTOC ? '#toc' : '#top';

    const template = `
      <div class="${this.options.cssClasses.container} ${alignClass}">
        <a href="${linkTarget}" class="${this.options.cssClasses.link}">
          <span class="${this.options.cssClasses.text}">${this.options.linkText}</span>
        </a>
      </div>
    `;

    const styles = `
      .${this.options.cssClasses.container} {
        margin: 1rem 0;
        padding: 0.5rem 0;
      }

      .anchor-link-right {
        text-align: right;
      }

      .anchor-link-center {
        text-align: center;
      }

      .anchor-link-left {
        text-align: left;
      }

      .${this.options.cssClasses.link} {
        color: #666;
        text-decoration: none;
        font-size: 0.85em;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        transition: all 0.2s ease;
      }

      .${this.options.cssClasses.link}:hover {
        color: #333;
        background-color: #f5f5f5;
        text-decoration: none;
      }

    `;

    return { template, styles };
  }

  /**
   * Generate anchor link HTML
   */
  private generateAnchorLinkHtml(template: AnchorLinkTemplate): string {
    return `\n${template.template}\n`;
  }

  /**
   * Get CSS styles
   */
  getStyles(): string {
    const template = this.createAnchorLinkTemplate();
    return template.styles;
  }

  /**
   * Find the last admonition div end tag position
   */
  private findLastAdmonitionEnd(content: string): number {
    const admonitionPattern = /<div class="admonition[^"]*"[^>]*>.*?<\/div>/gs;
    let lastMatch = -1;
    let match;

    while ((match = admonitionPattern.exec(content)) !== null) {
      lastMatch = match.index + match[0].length - 6; // Position of </div>
    }

    return lastMatch;
  }

  /**
   * Find the last diagram div end tag position (Mermaid, PlantUML)
   */
  private findLastDiagramEnd(content: string): number {
    // Look for both mermaid-diagram and plantuml-diagram classes
    const diagramPattern =
      /<div class="(?:mermaid-diagram|plantuml-diagram)"[^>]*>.*?<\/div>/gs;
    let lastMatch = -1;
    let match;

    while ((match = diagramPattern.exec(content)) !== null) {
      lastMatch = match.index + match[0].length - 6; // Position of </div>
    }

    return lastMatch;
  }

  /**
   * Get default link text
   */
  private getDefaultLinkText(): string {
    if (this.translator) {
      return this.translator.t('anchorLinks.backToToc');
    }
    return '↑ Back to TOC';
  }
}
