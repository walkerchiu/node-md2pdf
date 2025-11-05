/**
 * Anchor links related type definitions
 */

// Anchor links depth options
export type AnchorLinksDepth = 'none' | 2 | 3 | 4 | 5 | 6;

// Anchor links configuration options
export interface AnchorLinksOptions {
  /** Whether to enable anchor links */
  enabled: boolean;
  /** Independent anchor links depth (not tied to TOC depth) */
  anchorDepth: AnchorLinksDepth;
  /** Anchor link text */
  linkText?: string;
  /** Custom CSS classes */
  cssClasses?: {
    container?: string;
    link?: string;
    text?: string;
  };
  /** Alignment options */
  alignment?: 'left' | 'center' | 'right';
}

// Anchor links generation result
export interface AnchorLinksGenerationResult {
  /** Modified HTML content */
  modifiedHtml: string;
  /** Number of anchor links inserted */
  linksInserted: number;
  /** List of processed sections */
  processedSections: ProcessedSection[];
}

// Processed section information
export interface ProcessedSection {
  /** Heading text */
  title: string;
  /** Heading level */
  level: number;
  /** Anchor ID */
  anchor: string;
  /** Whether anchor link was inserted */
  hasAnchorLink: boolean;
}

// Anchor link template configuration
export interface AnchorLinkTemplate {
  /** HTML template for anchor link */
  template: string;
  /** CSS styles */
  styles: string;
}
