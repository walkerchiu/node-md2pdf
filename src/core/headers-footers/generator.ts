/**
 * Headers and footers CSS generator
 * Integrates with existing page numbering system
 */

import { DEFAULT_MARGINS } from '../../infrastructure/config/constants';

import type {
  HeadersFootersConfig,
  HeaderFooterContext,
  TitleDisplayMode,
  DateTimeDisplayMode,
} from './types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { ILogger } from '../../infrastructure/logging/types';

export class HeaderFooterGenerator {
  constructor(
    private readonly translationManager: ITranslationManager,
    private readonly logger: ILogger,
  ) {}

  /**
   * Generate CSS @page rules from headers/footers configuration
   */
  generateCSSPageRules(
    config: HeadersFootersConfig,
    context: HeaderFooterContext,
    margins?: { top: string; right: string; bottom: string; left: string },
  ): string {
    this.logger.debug('Generating CSS @page rules from headers/footers config');

    // Validate configuration
    if (!config || !config.header || !config.footer) {
      this.logger.debug('Invalid configuration provided - returning empty CSS');
      return '';
    }

    // Check if any header or footer is enabled
    const hasHeader =
      config.header.enabled && this.hasVisibleContent(config.header);
    const hasFooter =
      config.footer.enabled && this.hasVisibleContent(config.footer);

    if (!hasHeader && !hasFooter) {
      this.logger.debug('No headers or footers enabled - returning empty CSS');
      return '';
    }

    // Generate header and footer CSS rules
    const headerRules = hasHeader
      ? this.generateHeaderCSS(config.header, context)
      : '';
    const footerRules = hasFooter
      ? this.generateFooterCSS(config.footer, context)
      : '';

    // Get appropriate margins - use provided margins or default
    const marginsWithHeaderFooter =
      margins || DEFAULT_MARGINS.WITH_HEADER_FOOTER;

    this.logger.info(
      `Using margins for @page rules: T:${marginsWithHeaderFooter.top} R:${marginsWithHeaderFooter.right} B:${marginsWithHeaderFooter.bottom} L:${marginsWithHeaderFooter.left}`,
    );

    const cssPageRules = `
      <style>
        @media print {
          @page {
            margin-top: ${marginsWithHeaderFooter.top};
            margin-bottom: ${marginsWithHeaderFooter.bottom};
            margin-left: ${marginsWithHeaderFooter.left};
            margin-right: ${marginsWithHeaderFooter.right};
            ${headerRules}
            ${footerRules}
          }

          /* Ensure body content doesn't interfere with header/footer */
          body {
            margin: 0;
            padding: 0;
          }
        }
      </style>
    `;

    this.logger.debug(
      `Generated CSS @page rules: ${cssPageRules.slice(0, 200)}...`,
    );
    return cssPageRules;
  }

  /**
   * Check if a header/footer config has any visible content
   */
  private hasVisibleContent(config: any): boolean {
    return (
      (config.title.enabled && config.title.mode !== 'none') ||
      (config.pageNumber.enabled && config.pageNumber.mode !== 'none') ||
      (config.dateTime.enabled && config.dateTime.mode !== 'none') ||
      (config.copyright.enabled && config.copyright.mode !== 'none') ||
      (config.message.enabled && config.message.mode !== 'none') ||
      (config.author?.enabled && config.author.mode !== 'none') ||
      (config.organization?.enabled && config.organization.mode !== 'none') ||
      (config.version?.enabled && config.version.mode !== 'none') ||
      (config.category?.enabled && config.category.mode !== 'none')
    );
  }

  /**
   * Generate header CSS rules
   */
  private generateHeaderCSS(
    headerConfig: any,
    context: HeaderFooterContext,
  ): string {
    const rules: string[] = [];
    const style = this.getElementStyle(headerConfig.style);

    // Generate content for left, center, right positions
    const leftContent = this.generateContentForPosition(
      'left',
      headerConfig,
      context,
    );
    const centerContent = this.generateContentForPosition(
      'center',
      headerConfig,
      context,
    );
    const rightContent = this.generateContentForPosition(
      'right',
      headerConfig,
      context,
    );

    if (leftContent) {
      rules.push(`
        @top-left {
          content: ${leftContent};
          ${style}
          text-align: left;
        }
      `);
    }

    if (centerContent) {
      rules.push(`
        @top-center {
          content: ${centerContent};
          ${style}
          text-align: center;
        }
      `);
    }

    if (rightContent) {
      rules.push(`
        @top-right {
          content: ${rightContent};
          ${style}
          text-align: right;
        }
      `);
    }

    return rules.join('');
  }

  /**
   * Generate footer CSS rules
   */
  private generateFooterCSS(
    footerConfig: any,
    context: HeaderFooterContext,
  ): string {
    const rules: string[] = [];
    const style = this.getElementStyle(footerConfig.style);

    // Generate content for left, center, right positions
    const leftContent = this.generateContentForPosition(
      'left',
      footerConfig,
      context,
    );
    const centerContent = this.generateContentForPosition(
      'center',
      footerConfig,
      context,
    );
    const rightContent = this.generateContentForPosition(
      'right',
      footerConfig,
      context,
    );

    if (leftContent) {
      rules.push(`
        @bottom-left {
          content: ${leftContent};
          ${style}
          text-align: left;
        }
      `);
    }

    if (centerContent) {
      rules.push(`
        @bottom-center {
          content: ${centerContent};
          ${style}
          text-align: center;
        }
      `);
    }

    if (rightContent) {
      rules.push(`
        @bottom-right {
          content: ${rightContent};
          ${style}
          text-align: right;
        }
      `);
    }

    return rules.join('');
  }

  /**
   * Generate content for a specific position (left, center, right)
   */
  private generateContentForPosition(
    position: 'left' | 'center' | 'right',
    config: any,
    context: HeaderFooterContext,
  ): string | null {
    // Check what content is configured for this position
    let content: string[] = [];

    // Title
    if (this.shouldShowInPosition('title', config, position)) {
      const titleContent = this.generateTitleContent(config.title, context);
      if (titleContent) content.push(titleContent);
    }

    // Page Number
    if (this.shouldShowInPosition('pageNumber', config, position)) {
      const pageContent = this.generatePageNumberContent(
        config.pageNumber,
        context,
      );
      if (pageContent) content.push(pageContent);
    }

    // Date Time
    if (this.shouldShowInPosition('dateTime', config, position)) {
      const dateContent = this.generateDateTimeContent(
        config.dateTime,
        context,
      );
      if (dateContent) content.push(dateContent);
    }

    // Copyright
    if (this.shouldShowInPosition('copyright', config, position)) {
      const copyrightContent = this.generateCopyrightContent(
        config.copyright,
        context,
      );
      if (copyrightContent) content.push(copyrightContent);
    }

    // Message
    if (this.shouldShowInPosition('message', config, position)) {
      const messageContent = this.generateMessageContent(
        config.message,
        context,
      );
      if (messageContent) content.push(messageContent);
    }

    // New metadata-based content fields
    // Author
    if (this.shouldShowInPosition('author', config, position)) {
      const authorContent = this.generateAuthorContent(config.author, context);
      if (authorContent) content.push(authorContent);
    }

    // Organization
    if (this.shouldShowInPosition('organization', config, position)) {
      const orgContent = this.generateOrganizationContent(
        config.organization,
        context,
      );
      if (orgContent) content.push(orgContent);
    }

    // Version
    if (this.shouldShowInPosition('version', config, position)) {
      const versionContent = this.generateVersionContent(
        config.version,
        context,
      );
      if (versionContent) content.push(versionContent);
    }

    // Category
    if (this.shouldShowInPosition('category', config, position)) {
      const categoryContent = this.generateCategoryContent(
        config.category,
        context,
      );
      if (categoryContent) content.push(categoryContent);
    }

    return content.length > 0 ? `"${content.join(' ')}"` : null;
  }

  /**
   * Check if a content type should be shown in a specific position
   */
  private shouldShowInPosition(
    contentType: string,
    config: any,
    position: 'left' | 'center' | 'right',
  ): boolean {
    const contentConfig = config[contentType];
    if (!contentConfig?.enabled || contentConfig.mode === 'none') {
      return false;
    }

    // Check if this content is configured for this position
    return contentConfig.alignment === position;
  }

  /**
   * Generate title content
   */
  private generateTitleContent(
    titleConfig: any,
    context: HeaderFooterContext,
  ): string | null {
    switch (titleConfig.mode as TitleDisplayMode) {
      case 'none':
        return null;
      case 'custom':
        return this.escapeForCSS(titleConfig.customValue || '');
      case 'metadata':
        // Use metadata title first, fallback to document content
        const metadataTitle = context.metadata?.title;
        if (metadataTitle) {
          return this.escapeForCSS(metadataTitle);
        }
        // Fallback to first H1 or document title if no metadata title
        return this.escapeForCSS(
          context.firstH1Title || context.documentTitle || 'Document',
        );
      default:
        return null;
    }
  }

  /**
   * Generate page number content
   */
  private generatePageNumberContent(
    pageNumberConfig: any,
    _context: HeaderFooterContext,
  ): string | null {
    if (pageNumberConfig.mode === 'none') {
      return null;
    }

    // Use the existing internationalized page number format
    return this.getPageNumberFormat();
  }

  /**
   * Generate date time content
   */
  private generateDateTimeContent(
    dateTimeConfig: any,
    context: HeaderFooterContext,
  ): string | null {
    const mode = dateTimeConfig.mode as DateTimeDisplayMode;
    const now = context.currentDate;
    const locale = this.getJavaScriptLocale();

    switch (mode) {
      case 'none':
        return null;
      case 'metadata-creation':
        // Use metadata creation date
        const creationDate = this.toDate(context.metadata?.creationDate);
        if (creationDate) {
          return this.escapeForCSS(
            creationDate.toLocaleDateString(locale, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }),
          );
        }
        // Fallback to current date if no metadata
        return this.escapeForCSS(
          now.toLocaleDateString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }),
        );
      case 'metadata-modification':
        // Use metadata modification date
        const modDate = this.toDate(context.metadata?.modDate);
        if (modDate) {
          return this.escapeForCSS(
            modDate.toLocaleDateString(locale, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }),
          );
        }
        // Fallback to current date if no metadata
        return this.escapeForCSS(
          now.toLocaleDateString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }),
        );
      case 'date-short':
        // Format: 2024/12/25
        return this.escapeForCSS(
          now
            .toLocaleDateString(locale, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
            .replace(/\//g, '/'),
        );
      case 'date-long':
        // Format: 2024年12月25日 (Chinese) / December 25, 2024 (English)
        return this.escapeForCSS(
          now.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        );
      case 'date-iso':
        // Format: 2024-12-25
        return this.escapeForCSS(now.toISOString().split('T')[0]);
      case 'datetime-short':
        // Format: 2024/12/25 14:30
        return this.escapeForCSS(
          now.toLocaleDateString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }) +
            ' ' +
            now.toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
        );
      case 'datetime-long':
        // Format: 2024年12月25日 14:30:45 (Chinese) / December 25, 2024 2:30:45 PM (English)
        return this.escapeForCSS(
          now.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) +
            ' ' +
            now.toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }),
        );
      default:
        return null;
    }
  }

  /**
   * Generate copyright content
   */
  private generateCopyrightContent(
    copyrightConfig: any,
    context: HeaderFooterContext,
  ): string | null {
    switch (copyrightConfig.mode) {
      case 'none':
        return null;
      case 'metadata':
        // Use metadata copyright
        const metadataCopyright = context.metadata?.copyright;
        if (metadataCopyright) {
          return this.escapeForCSS(metadataCopyright);
        }
        // Fallback to context copyright
        return this.escapeForCSS(context.copyright || '');
      case 'custom':
        return this.escapeForCSS(copyrightConfig.customValue || '');
      default:
        return null;
    }
  }

  /**
   * Generate message content
   */
  private generateMessageContent(
    messageConfig: any,
    context: HeaderFooterContext,
  ): string | null {
    if (messageConfig.mode === 'none') {
      return null;
    }
    return this.escapeForCSS(
      messageConfig.customValue || context.customMessage || '',
    );
  }

  /**
   * Generate author content from metadata
   */
  private generateAuthorContent(
    authorConfig: any,
    context: HeaderFooterContext,
  ): string | null {
    switch (authorConfig.mode) {
      case 'none':
        return null;
      case 'metadata':
        const metadataAuthor = context.metadata?.author;
        return metadataAuthor ? this.escapeForCSS(metadataAuthor) : null;
      case 'custom':
        return this.escapeForCSS(authorConfig.customValue || '');
      default:
        return null;
    }
  }

  /**
   * Generate organization content from metadata
   */
  private generateOrganizationContent(
    orgConfig: any,
    context: HeaderFooterContext,
  ): string | null {
    switch (orgConfig.mode) {
      case 'none':
        return null;
      case 'metadata':
        const metadataOrg = context.metadata?.organization;
        return metadataOrg ? this.escapeForCSS(metadataOrg) : null;
      case 'custom':
        return this.escapeForCSS(orgConfig.customValue || '');
      default:
        return null;
    }
  }

  /**
   * Generate version content from metadata
   */
  private generateVersionContent(
    versionConfig: any,
    context: HeaderFooterContext,
  ): string | null {
    switch (versionConfig.mode) {
      case 'none':
        return null;
      case 'metadata':
        const metadataVersion = context.metadata?.version;
        return metadataVersion ? this.escapeForCSS(metadataVersion) : null;
      case 'custom':
        return this.escapeForCSS(versionConfig.customValue || '');
      default:
        return null;
    }
  }

  /**
   * Generate category content from metadata
   */
  private generateCategoryContent(
    categoryConfig: any,
    context: HeaderFooterContext,
  ): string | null {
    switch (categoryConfig.mode) {
      case 'none':
        return null;
      case 'metadata':
        const metadataCategory = context.metadata?.category;
        return metadataCategory ? this.escapeForCSS(metadataCategory) : null;
      case 'custom':
        return this.escapeForCSS(categoryConfig.customValue || '');
      default:
        return null;
    }
  }

  /**
   * Get CSS styles for header/footer elements
   */
  private getElementStyle(styleConfig?: any): string {
    const defaults = {
      fontSize: '12px',
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: '#333',
      padding: '0',
      border: 'none',
      background: 'none',
    };

    if (!styleConfig) {
      return Object.entries(defaults)
        .map(([key, value]) => `${this.camelToKebab(key)}: ${value};`)
        .join(' ');
    }

    return Object.entries({ ...defaults, ...styleConfig })
      .map(([key, value]) => `${this.camelToKebab(key)}: ${value};`)
      .join(' ');
  }

  /**
   * Convert camelCase to kebab-case for CSS properties
   */
  private camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  /**
   * Get internationalized page number format for CSS @page rules
   * Reuses existing implementation
   */
  private getPageNumberFormat(_format?: string): string {
    try {
      // Get localized page number format
      const pageTemplate = this.translationManager.t('pdfContent.pageNumber');

      // Replace placeholders with CSS counter values
      // Use existing internationalized format
      const result = pageTemplate
        .replace(/\{\{page\}\}/g, '" counter(page) "')
        .replace(/\{\{totalPages\}\}/g, '" counter(pages) "');

      return result;
    } catch (error) {
      // Fallback to default format if translation fails
      this.logger.warn(
        `Failed to get internationalized page number format: ${(error as Error).message}`,
      );
      return '"Page " counter(page) " of " counter(pages)';
    }
  }

  /**
   * Escape strings for CSS content property
   */
  private escapeForCSS(text: string): string {
    return text.replace(/"/g, '\\"');
  }

  /**
   * Safely convert date to Date object, handling both string and Date inputs
   */
  private toDate(date: Date | string | undefined): Date | null {
    if (!date) return null;

    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }

    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return null;
  }

  /**
   * Convert SupportedLocale to JavaScript locale string
   */
  private getJavaScriptLocale(): string {
    const currentLocale = this.translationManager.getCurrentLocale();
    return currentLocale; // 'en' and 'zh-TW' are valid JavaScript locale strings
  }

  /**
   * Generate backward-compatible CSS for existing includePageNumbers parameter
   * Maintains compatibility with existing code
   */
  generateBackwardCompatibleCSS(
    includePageNumbers: boolean,
    _documentTitle: string,
    context: HeaderFooterContext,
    margins?: { top: string; right: string; bottom: string; left: string },
  ): string {
    if (!includePageNumbers) {
      return '';
    }

    // Use default configuration that matches current behavior
    const config: HeadersFootersConfig = {
      header: {
        enabled: true,
        title: {
          mode: 'metadata',
          enabled: true,
          alignment: 'left',
        },
        pageNumber: { mode: 'none', enabled: false, alignment: 'center' },
        dateTime: { mode: 'none', enabled: false, alignment: 'center' },
        copyright: { mode: 'none', enabled: false, alignment: 'center' },
        message: { mode: 'none', enabled: false, alignment: 'center' },
        // New metadata fields (disabled for backward compatibility)
        author: { mode: 'none', enabled: false, alignment: 'center' },
        organization: { mode: 'none', enabled: false, alignment: 'center' },
        version: { mode: 'none', enabled: false, alignment: 'center' },
        category: { mode: 'none', enabled: false, alignment: 'center' },
        layout: {
          left: {
            mode: 'metadata',
            enabled: true,
            alignment: 'left',
          },
        },
      },
      footer: {
        enabled: true,
        title: { mode: 'none', enabled: false, alignment: 'left' },
        pageNumber: {
          mode: 'show',
          enabled: true,
          alignment: 'right',
        },
        dateTime: { mode: 'none', enabled: false, alignment: 'center' },
        copyright: { mode: 'none', enabled: false, alignment: 'center' },
        message: { mode: 'none', enabled: false, alignment: 'center' },
        // New metadata fields (disabled for backward compatibility)
        author: { mode: 'none', enabled: false, alignment: 'center' },
        organization: { mode: 'none', enabled: false, alignment: 'center' },
        version: { mode: 'none', enabled: false, alignment: 'center' },
        category: { mode: 'none', enabled: false, alignment: 'center' },
        layout: {
          right: {
            mode: 'show',
            enabled: true,
            alignment: 'right',
          },
        },
      },
    };

    return this.generateCSSPageRules(config, context, margins);
  }
}
