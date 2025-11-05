/**
 * TOC Generator - Generates table of contents from Markdown headings
 */

import { Heading } from '../../types/index';

import {
  TOCGeneratorOptions,
  TOCGenerationResult,
  TOCItemFlat,
  TOCItemNested,
} from './types';

import type { ITranslationManager } from '../../infrastructure/i18n/types';

export class TOCGenerator {
  private options: Required<TOCGeneratorOptions>;
  private translator: ITranslationManager | undefined;

  constructor(options: TOCGeneratorOptions, translator?: ITranslationManager) {
    // Validate maxDepth first
    const maxDepth = options.maxDepth;
    if (maxDepth < 1 || maxDepth > 6) {
      throw new Error('TOC maxDepth must be between 1 and 6');
    }

    this.translator = translator;
    this.options = {
      maxDepth,
      includePageNumbers: options.includePageNumbers || false,
      cssClasses: {
        container: 'toc-container',
        title: 'toc-title',
        list: 'toc-list',
        item: 'toc-item',
        link: 'toc-link',
        pageNumber: 'toc-page-number',
        ...options.cssClasses,
      },
    };
  }

  /**
   * Generate TOC from headings
   */
  generateTOC(headings: Heading[]): TOCGenerationResult {
    if (!headings || headings.length === 0) {
      return this.createEmptyResult();
    }

    // Filter headings by depth and convert to flat structure
    const filteredHeadings = this.filterHeadingsByDepth(headings);
    const flatItems = this.convertToFlatItems(filteredHeadings);

    // Build hierarchical structure
    const tree = this.buildHierarchy(flatItems);

    // Generate HTML
    const html = this.generateHTML(tree);

    // Calculate statistics
    const stats = this.calculateStats(flatItems);

    return {
      html,
      items: flatItems,
      tree,
      stats,
    };
  }

  /**
   * Filter headings by maximum depth
   */
  private filterHeadingsByDepth(headings: Heading[]): Heading[] {
    return headings.filter((heading) => heading.level <= this.options.maxDepth);
  }

  /**
   * Convert headings to flat TOC items
   */
  private convertToFlatItems(headings: Heading[]): TOCItemFlat[] {
    return headings.map((heading, index) => ({
      title: heading.text.trim(),
      level: heading.level,
      anchor: heading.anchor || (heading.id ? `#${heading.id}` : ''),
      index,
    }));
  }

  /**
   * Build hierarchical structure from flat items
   */
  private buildHierarchy(flatItems: TOCItemFlat[]): TOCItemNested[] {
    const root: TOCItemNested[] = [];
    const stack: TOCItemNested[] = [];

    for (const item of flatItems) {
      const tocItem: TOCItemNested = {
        title: item.title,
        level: item.level,
        anchor: item.anchor,
        children: [],
      };

      // Add pageNumber if it exists
      if (item.pageNumber !== undefined) {
        tocItem.pageNumber = item.pageNumber;
      }

      // Find appropriate parent
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }

      // Add to parent or root
      if (stack.length === 0) {
        root.push(tocItem);
      } else {
        const parent = stack[stack.length - 1];
        tocItem.parent = parent;
        parent.children.push(tocItem);
      }

      stack.push(tocItem);
    }

    return root;
  }

  /**
   * Generate HTML from hierarchical structure
   */
  private generateHTML(tree: TOCItemNested[]): string {
    if (tree.length === 0) {
      return '';
    }

    const { cssClasses } = this.options;
    const listHtml = this.generateListHTML(tree, cssClasses);

    // Get localized TOC title
    const tocTitle = this.getTOCTitle();

    return `
<div id="toc" class="${cssClasses.container}">
  <h2 class="${cssClasses.title}">${tocTitle}</h2>
  ${listHtml}
</div>`.trim();
  }

  /**
   * Get localized TOC title
   */
  private getTOCTitle(): string {
    if (this.translator) {
      return this.translator.t('pdfContent.tocTitle');
    }

    // Fallback to English if no translator is available
    return 'Table of Contents';
  }

  /**
   * Generate HTML list from TOC items
   */
  private generateListHTML(
    items: TOCItemNested[],
    cssClasses: Required<TOCGeneratorOptions>['cssClasses'],
  ): string {
    if (items.length === 0) {
      return '';
    }

    const listItems = items
      .map((item) => {
        const pageNumberHtml = this.options.includePageNumbers
          ? ` <span class="${cssClasses.pageNumber}">${item.pageNumber || ''}</span>`
          : '';

        const childrenHtml =
          item.children.length > 0
            ? `\n${this.generateListHTML(item.children, cssClasses)}`
            : '';

        return `<li class="${cssClasses.item}">
  <a href="${item.anchor}" class="${cssClasses.link}">
    ${this.escapeHtml(item.title)}${pageNumberHtml}
  </a>${childrenHtml}
</li>`;
      })
      .join('\n');

    return `<ul class="${cssClasses.list}">\n${listItems}\n</ul>`;
  }

  /**
   * Calculate TOC statistics
   */
  private calculateStats(items: TOCItemFlat[]): {
    totalItems: number;
    maxDepth: number;
    itemsByLevel: Record<number, number>;
  } {
    const itemsByLevel: Record<number, number> = {};
    let maxDepth = 0;

    for (const item of items) {
      itemsByLevel[item.level] = (itemsByLevel[item.level] || 0) + 1;
      maxDepth = Math.max(maxDepth, item.level);
    }

    return {
      totalItems: items.length,
      maxDepth,
      itemsByLevel,
    };
  }

  /**
   * Create empty result when no headings
   */
  private createEmptyResult(): TOCGenerationResult {
    return {
      html: '',
      items: [],
      tree: [],
      stats: {
        totalItems: 0,
        maxDepth: 0,
        itemsByLevel: {},
      },
    };
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Update page numbers in generated TOC items
   */
  updatePageNumbers(
    items: TOCItemFlat[],
    pageNumbers: Record<string, number>,
  ): void {
    for (const item of items) {
      const anchor = item.anchor.startsWith('#')
        ? item.anchor.substring(1)
        : item.anchor;

      // Try exact match first
      if (pageNumbers[anchor] !== undefined) {
        item.pageNumber = pageNumbers[anchor];
      } else {
        // If no exact match, the ID generation should be consistent
        // This fallback handles legacy cases
        const fallbackPageNumber = Object.entries(pageNumbers).find(([key]) =>
          key.startsWith(anchor),
        )?.[1];

        if (fallbackPageNumber !== undefined) {
          item.pageNumber = fallbackPageNumber;
        }
      }
    }
  }

  /**
   * Generate TOC with updated page numbers
   */
  generateTOCWithPageNumbers(
    headings: Heading[],
    pageNumbers: Record<string, number>,
  ): TOCGenerationResult {
    const result = this.generateTOC(headings);

    // Update flat items with page numbers
    this.updatePageNumbers(result.items, pageNumbers);

    // Rebuild hierarchy with updated page numbers
    const tree = this.buildHierarchy(result.items);

    // Regenerate HTML with page numbers
    const html = this.generateHTML(tree);

    return {
      ...result,
      html,
      tree,
    };
  }

  /**
   * Get current options
   */
  getOptions(): Required<TOCGeneratorOptions> {
    return { ...this.options };
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<TOCGeneratorOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions,
      cssClasses: {
        ...this.options.cssClasses,
        ...newOptions.cssClasses,
      },
    };

    // Re-validate maxDepth if updated
    if (newOptions.maxDepth !== undefined) {
      if (this.options.maxDepth < 1 || this.options.maxDepth > 6) {
        throw new Error('TOC maxDepth must be between 1 and 6');
      }
    }
  }
}
