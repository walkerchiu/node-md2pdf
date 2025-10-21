/**
 * Style Applicator
 * Applies styles to header and footer content
 */

import { HeaderFooterStyles, HeaderFooterPosition } from './types';

export interface StyledContent {
  html: string;
  css: string;
}

export class StyleApplicator {
  private static readonly DEFAULT_STYLES: HeaderFooterStyles = {
    fontSize: '12px',
    fontFamily: 'Arial, sans-serif',
    color: '#333333',
    padding: '4px 0',
    textAlign: 'center',
    border: 'none',
    borderTop: 'none',
    borderBottom: 'none',
    background: 'none',
    backgroundColor: 'transparent',
  };

  /**
   * Apply styles to content
   */
  applyStyles(
    content: string,
    styles?: HeaderFooterStyles,
    position?: HeaderFooterPosition,
    height?: string,
  ): StyledContent {
    const finalStyles = this.mergeStyles(
      StyleApplicator.DEFAULT_STYLES,
      styles,
    );

    const className = this.generateClassName(position);
    const css = this.generateCSS(className, finalStyles, height);
    const html = this.wrapContent(content, className);

    return { html, css };
  }

  /**
   * Generate inline styles
   */
  generateInlineStyles(styles?: HeaderFooterStyles): string {
    if (!styles) return '';

    const finalStyles = this.mergeStyles(
      StyleApplicator.DEFAULT_STYLES,
      styles,
    );

    const styleEntries: string[] = [];

    // Add standard styles
    if (finalStyles.fontSize) {
      styleEntries.push(`font-size: ${finalStyles.fontSize}`);
    }
    if (finalStyles.fontFamily) {
      styleEntries.push(`font-family: ${finalStyles.fontFamily}`);
    }
    if (finalStyles.color) {
      styleEntries.push(`color: ${finalStyles.color}`);
    }
    if (finalStyles.backgroundColor) {
      styleEntries.push(`background-color: ${finalStyles.backgroundColor}`);
    }
    if (finalStyles.padding) {
      styleEntries.push(`padding: ${finalStyles.padding}`);
    }
    if (finalStyles.margin) {
      styleEntries.push(`margin: ${finalStyles.margin}`);
    }
    if (finalStyles.textAlign) {
      styleEntries.push(`text-align: ${finalStyles.textAlign}`);
    }
    if (finalStyles.borderTop) {
      styleEntries.push(`border-top: ${finalStyles.borderTop}`);
    }
    if (finalStyles.borderBottom) {
      styleEntries.push(`border-bottom: ${finalStyles.borderBottom}`);
    }

    return styleEntries.join('; ');
  }

  /**
   * Merge multiple style objects
   */
  mergeStyles(
    ...styleObjects: (HeaderFooterStyles | undefined)[]
  ): HeaderFooterStyles {
    return styleObjects.reduce(
      (merged, styles) => ({ ...merged, ...styles }),
      {},
    ) as HeaderFooterStyles;
  }

  /**
   * Apply theme styles
   */
  applyTheme(
    baseStyles: HeaderFooterStyles,
    theme: 'minimal' | 'professional' | 'academic' | 'modern',
  ): HeaderFooterStyles {
    switch (theme) {
      case 'minimal':
        return this.mergeStyles(baseStyles, {
          fontSize: '10px',
          color: '#666666',
          fontFamily: 'Arial, sans-serif',
          padding: '4px 0',
          border: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          background: 'none',
          backgroundColor: 'transparent',
        });

      case 'professional':
        return this.mergeStyles(baseStyles, {
          fontSize: '11px',
          color: '#333333',
          fontFamily: '"Times New Roman", serif',
          padding: '4px 0',
          border: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          background: 'none',
          backgroundColor: 'transparent',
        });

      case 'academic':
        return this.mergeStyles(baseStyles, {
          fontSize: '10px',
          color: '#000000',
          fontFamily: '"Times New Roman", serif',
          padding: '4px 0',
          textAlign: 'center',
          border: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          background: 'none',
          backgroundColor: 'transparent',
        });

      case 'modern':
        return this.mergeStyles(baseStyles, {
          fontSize: '11px',
          color: '#2c3e50',
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          padding: '4px 0',
          border: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          background: 'none',
          backgroundColor: 'transparent',
        });

      default:
        return baseStyles;
    }
  }

  /**
   * Generate CSS class styles
   */
  private generateCSS(
    className: string,
    styles: HeaderFooterStyles,
    height?: string,
  ): string {
    const cssRules: string[] = [];

    cssRules.push(`.${className} {`);

    // Add standard styles
    if (styles.fontSize) {
      cssRules.push(`  font-size: ${styles.fontSize};`);
    }
    if (styles.fontFamily) {
      cssRules.push(`  font-family: ${styles.fontFamily};`);
    }
    if (styles.color) {
      cssRules.push(`  color: ${styles.color};`);
    }
    if (styles.backgroundColor) {
      cssRules.push(`  background-color: ${styles.backgroundColor};`);
    }
    if (styles.padding) {
      cssRules.push(`  padding: ${styles.padding};`);
    }
    if (styles.margin) {
      cssRules.push(`  margin: ${styles.margin};`);
    }
    if (styles.textAlign) {
      cssRules.push(`  text-align: ${styles.textAlign};`);
    }
    if (styles.borderTop) {
      cssRules.push(`  border-top: ${styles.borderTop};`);
    }
    if (styles.borderBottom) {
      cssRules.push(`  border-bottom: ${styles.borderBottom};`);
    }

    // Add height if specified
    if (height) {
      cssRules.push(`  height: ${height};`);
      cssRules.push(`  line-height: ${height};`);
    }

    // Add box-sizing for better layout and ensure no borders
    cssRules.push(`  box-sizing: border-box;`);
    cssRules.push(`  border: none !important;`);
    cssRules.push(`  background: none !important;`);

    cssRules.push(`}`);

    // Add custom CSS if provided
    if (styles.customCSS) {
      cssRules.push('');
      cssRules.push(styles.customCSS);
    }

    return cssRules.join('\n');
  }

  /**
   * Wrap content with appropriate HTML structure
   */
  private wrapContent(content: string, className: string): string {
    return `<div class="${className}">${content}</div>`;
  }

  /**
   * Generate unique CSS class name
   */
  private generateClassName(position?: HeaderFooterPosition): string {
    const timestamp = Date.now().toString(36);
    const prefix = position || 'header-footer';
    return `${prefix}-${timestamp}`;
  }

  /**
   * Create responsive styles for different page sizes
   */
  createResponsiveStyles(
    baseStyles: HeaderFooterStyles,
    breakpoints: {
      mobile?: HeaderFooterStyles;
      tablet?: HeaderFooterStyles;
      desktop?: HeaderFooterStyles;
    } = {},
  ): string {
    let css = '';

    // Base styles (mobile first)
    if (breakpoints.mobile) {
      css += `@media (max-width: 767px) {\n`;
      css += this.stylesToCSS(this.mergeStyles(baseStyles, breakpoints.mobile));
      css += `}\n\n`;
    }

    // Tablet styles
    if (breakpoints.tablet) {
      css += `@media (min-width: 768px) and (max-width: 1023px) {\n`;
      css += this.stylesToCSS(this.mergeStyles(baseStyles, breakpoints.tablet));
      css += `}\n\n`;
    }

    // Desktop styles
    if (breakpoints.desktop) {
      css += `@media (min-width: 1024px) {\n`;
      css += this.stylesToCSS(
        this.mergeStyles(baseStyles, breakpoints.desktop),
      );
      css += `}\n\n`;
    }

    return css;
  }

  /**
   * Convert styles object to CSS string
   */
  private stylesToCSS(styles: HeaderFooterStyles): string {
    const cssRules: string[] = [];

    if (styles.fontSize) cssRules.push(`font-size: ${styles.fontSize};`);
    if (styles.fontFamily) cssRules.push(`font-family: ${styles.fontFamily};`);
    if (styles.color) cssRules.push(`color: ${styles.color};`);
    if (styles.backgroundColor)
      cssRules.push(`background-color: ${styles.backgroundColor};`);
    if (styles.padding) cssRules.push(`padding: ${styles.padding};`);
    if (styles.margin) cssRules.push(`margin: ${styles.margin};`);
    if (styles.textAlign) cssRules.push(`text-align: ${styles.textAlign};`);
    if (styles.borderTop) cssRules.push(`border-top: ${styles.borderTop};`);
    if (styles.borderBottom)
      cssRules.push(`border-bottom: ${styles.borderBottom};`);

    return cssRules.map((rule) => `  ${rule}`).join('\n');
  }
}
