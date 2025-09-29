/**
 * Page Number Estimator
 * Estimates page numbers for headings based on content analysis
 */

import { Heading } from '../../types/index';

export interface PageEstimationOptions {
  wordsPerPage?: number;
  averageWordsPerLine?: number;
  linesPerPage?: number;
  tocOffset?: number; // Pages consumed by TOC
}

export class PageEstimator {
  private options: Required<PageEstimationOptions>;

  constructor(options: PageEstimationOptions = {}) {
    this.options = {
      wordsPerPage: 500, // Approximate words per page
      averageWordsPerLine: 10, // Average words per line
      linesPerPage: 50, // Lines per page (considering margins)
      tocOffset: 1, // TOC typically takes 1 page
      ...options,
    };
  }

  /**
   * Estimate page numbers for headings based on content position
   */
  estimatePageNumbers(headings: Heading[], markdownContent: string): Record<string, number> {
    const result: Record<string, number> = {};
    const keyUsageCount: Record<string, number> = {};

    // Split content into sections for each heading
    const contentLines = markdownContent.split('\n');

    // Calculate approximate content before TOC (introduction, etc.)
    const tocLinePosition = this.findTocPosition(contentLines);
    const preTocLines = Math.max(0, tocLinePosition);

    // Estimate TOC pages more accurately
    // Consider heading text length and nesting levels
    let tocEntryLines = 0;
    for (const heading of headings) {
      // Each TOC entry takes approximately 1-2 lines depending on level and text length
      const textLength = heading.text.length;
      const indentFactor = Math.max(1, heading.level - 1) * 0.5; // Deeper levels take more space
      const estimatedLines = Math.ceil(textLength / 50 + indentFactor + 1);
      tocEntryLines += estimatedLines;
    }

    // Add TOC title and spacing
    const tocTitleLines = 3;
    const totalTocLines = tocTitleLines + tocEntryLines;
    const tocPages = Math.max(1, Math.ceil(totalTocLines / this.options.linesPerPage));

    const contentStartPage = tocPages + 1;

    // Find all heading positions in content first
    const headingPositions: { line: number; level: number; text: string }[] = [];
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i].trim();
      if (line.startsWith('#')) {
        const level = (line.match(/^#+/) || [''])[0].length;
        const text = line.replace(/^#+\s*/, '').trim();
        headingPositions.push({ line: i, level, text });
      }
    }

    // Process headings in order and match them with content positions
    let contentHeadingIndex = 0;

    for (let headingIndex = 0; headingIndex < headings.length; headingIndex++) {
      const heading = headings[headingIndex];
      let finalPage: number;

      // Find matching heading in content by order and text
      let headingLine = -1;
      for (let j = contentHeadingIndex; j < headingPositions.length; j++) {
        const contentHeading = headingPositions[j];
        if (contentHeading.level === heading.level && contentHeading.text === heading.text.trim()) {
          headingLine = contentHeading.line;
          contentHeadingIndex = j + 1; // Start from next position for subsequent headings
          break;
        }
      }

      if (headingLine !== -1) {
        // Analyze content density - count non-empty lines for more accurate estimation
        let meaningfulLines = 0;
        for (let i = preTocLines; i < headingLine; i++) {
          const line = contentLines[i]?.trim();
          if (line && line.length > 0) {
            // Weight different types of content
            if (line.startsWith('#')) {
              meaningfulLines += 1.5; // Headings take more visual space
            } else if (line.startsWith('*') || line.startsWith('-') || line.startsWith('+')) {
              meaningfulLines += 1.2; // List items are slightly more dense
            } else if (line.startsWith('```') || line.startsWith('    ')) {
              meaningfulLines += 0.8; // Code blocks are typically more compact
            } else if (line.startsWith('|')) {
              meaningfulLines += 1.3; // Table rows need more space
            } else {
              meaningfulLines += 1; // Regular text
            }
          } else {
            meaningfulLines += 0.3; // Empty lines still consume space
          }
        }

        // Convert meaningful lines to pages with more realistic estimation
        const effectiveLinesPerPage = this.options.linesPerPage * 0.8; // Account for margins and spacing
        const estimatedPage =
          contentStartPage + Math.floor(meaningfulLines / effectiveLinesPerPage);

        // Ensure page is at least the content start page
        finalPage = Math.max(contentStartPage, estimatedPage);
      } else {
        // If heading not found in content, estimate based on position in heading array
        finalPage = contentStartPage + Math.floor(headingIndex / 10); // ~10 headings per page
      }

      const baseKey = this.getHeadingKey(heading);
      if (baseKey) {
        // Handle duplicate keys by appending a counter
        let uniqueKey = baseKey;
        if (keyUsageCount[baseKey]) {
          keyUsageCount[baseKey]++;
          uniqueKey = `${baseKey}-${keyUsageCount[baseKey]}`;
        } else {
          keyUsageCount[baseKey] = 1;
        }
        result[uniqueKey] = finalPage;
      }
    }

    return result;
  }

  /**
   * Find the position where TOC would be inserted
   */
  private findTocPosition(lines: string[]): number {
    // Look for first heading or return 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#')) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Get key for heading (for mapping page numbers)
   */
  private getHeadingKey(heading: Heading): string | null {
    // Try different key strategies
    if (heading.anchor && heading.anchor.startsWith('#')) {
      return heading.anchor.substring(1);
    }

    if (heading.id) {
      return heading.id;
    }

    // Fallback to text-based key
    if (heading.text) {
      return this.createSlug(heading.text);
    }

    return null;
  }

  /**
   * Create a URL-friendly slug from text
   */
  private createSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fff\w\s-]/g, '') // Keep Chinese characters, letters, numbers, spaces, hyphens
      .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  }

  /**
   * Update estimation options
   */
  updateOptions(newOptions: Partial<PageEstimationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): Required<PageEstimationOptions> {
    return { ...this.options };
  }
}
