/**
 * Header Footer Manager
 * Core system for managing page headers and footers
 */

import { StyleApplicator } from './style-applicator';
import { TemplateValidator } from './template-validator';
import {
  HeaderConfig,
  FooterConfig,
  PageContext,
  RenderResult,
  ValidationResult,
  TemplateVariable,
  PageStructureConfig,
} from './types';
import { VariableProcessor } from './variable-processor';

export class HeaderFooterManager {
  private variableProcessor: VariableProcessor;
  private templateValidator: TemplateValidator;
  private styleApplicator: StyleApplicator;

  constructor() {
    this.variableProcessor = new VariableProcessor();
    this.templateValidator = new TemplateValidator();
    this.styleApplicator = new StyleApplicator();
  }

  /**
   * Generate header HTML content
   */
  generateHeader(
    config: HeaderConfig,
    context: PageContext,
    variables?: TemplateVariable[],
  ): RenderResult {
    if (!config.enabled || !config.template) {
      return { html: '' };
    }

    // Check visibility conditions
    if (!this.shouldRenderOnPage('header', config, context)) {
      return { html: '' };
    }

    try {
      // Process template variables
      const processedTemplate = this.variableProcessor.processTemplate(
        config.template,
        context,
        variables,
      );

      // Apply styles
      const styledContent = this.styleApplicator.applyStyles(
        processedTemplate,
        config.styles,
        'header',
        config.height,
      );

      return {
        html: styledContent.html,
        css: styledContent.css,
        height: this.calculateHeight(config.height),
      };
    } catch (error) {
      return {
        html: '',
        warnings: [`Header generation failed: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Generate footer HTML content
   */
  generateFooter(
    config: FooterConfig,
    context: PageContext,
    variables?: TemplateVariable[],
  ): RenderResult {
    if (!config.enabled || !config.template) {
      return { html: '' };
    }

    // Check visibility conditions
    if (!this.shouldRenderOnPage('footer', config, context)) {
      return { html: '' };
    }

    try {
      // Process template variables
      const processedTemplate = this.variableProcessor.processTemplate(
        config.template,
        context,
        variables,
      );

      // Apply styles
      const styledContent = this.styleApplicator.applyStyles(
        processedTemplate,
        config.styles,
        'footer',
        config.height,
      );

      return {
        html: styledContent.html,
        css: styledContent.css,
        height: this.calculateHeight(config.height),
      };
    } catch (error) {
      return {
        html: '',
        warnings: [`Footer generation failed: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Validate header configuration
   */
  validateHeaderConfig(config: HeaderConfig): ValidationResult {
    return this.templateValidator.validateConfig(config, 'header');
  }

  /**
   * Validate footer configuration
   */
  validateFooterConfig(config: FooterConfig): ValidationResult {
    return this.templateValidator.validateConfig(config, 'footer');
  }

  /**
   * Generate complete page structure configuration
   */
  generatePageStructure(
    config: PageStructureConfig,
    context: PageContext,
    variables?: TemplateVariable[],
  ): {
    header: RenderResult;
    footer: RenderResult;
    margins: PageStructureConfig['margins'];
  } {
    const headerResult = config.header
      ? this.generateHeader(config.header, context, variables)
      : { html: '' };

    const footerResult = config.footer
      ? this.generateFooter(config.footer, context, variables)
      : { html: '' };

    return {
      header: headerResult,
      footer: footerResult,
      margins: config.margins,
    };
  }

  /**
   * Get available template variables
   */
  getAvailableVariables(): Array<{
    name: string;
    description: string;
    example: string;
  }> {
    return [
      {
        name: '{{title}}',
        description: 'Document title',
        example: 'My Document',
      },
      {
        name: '{{author}}',
        description: 'Document author',
        example: 'John Doe',
      },
      {
        name: '{{date}}',
        description: 'Current date',
        example: new Date().toLocaleDateString(),
      },
      {
        name: '{{pageNumber}}',
        description: 'Current page number',
        example: '1',
      },
      {
        name: '{{totalPages}}',
        description: 'Total number of pages',
        example: '10',
      },
      {
        name: '{{fileName}}',
        description: 'Source file name',
        example: 'document.md',
      },
      {
        name: '{{chapterTitle}}',
        description: 'Current chapter title',
        example: 'Introduction',
      },
      {
        name: '{{sectionTitle}}',
        description: 'Current section title',
        example: 'Overview',
      },
    ];
  }

  /**
   * Preview header/footer content
   */
  previewContent(
    template: string,
    sampleContext: Partial<PageContext>,
  ): RenderResult {
    const context: PageContext = {
      pageNumber: 1,
      totalPages: 10,
      title: 'Sample Document',
      author: 'Sample Author',
      date: new Date().toLocaleDateString(),
      fileName: 'sample.md',
      ...sampleContext,
    };

    try {
      const processedTemplate = this.variableProcessor.processTemplate(
        template,
        context,
      );

      return {
        html: processedTemplate,
      };
    } catch (error) {
      return {
        html: template,
        warnings: [`Preview generation failed: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Check if header/footer should render on current page
   */
  private shouldRenderOnPage(
    _type: 'header' | 'footer',
    config: HeaderConfig | FooterConfig,
    context: PageContext,
  ): boolean {
    // Check first page visibility
    if (context.pageNumber === 1 && config.showOnFirstPage === false) {
      return false;
    }

    // Check even/odd page visibility
    const isEvenPage = context.pageNumber % 2 === 0;
    if (isEvenPage && config.showOnEvenPages === false) {
      return false;
    }
    if (!isEvenPage && config.showOnOddPages === false) {
      return false;
    }

    return true;
  }

  /**
   * Calculate height in pixels from string value
   */
  private calculateHeight(height?: string): number {
    if (!height) return 0;

    // Parse common units
    const match = height.match(/^(\d+(?:\.\d+)?)(px|pt|mm|cm|in)?$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'px';

    switch (unit) {
      case 'px':
        return value;
      case 'pt':
        return value * 1.333; // 1pt = 1.333px
      case 'mm':
        return value * 3.779; // 1mm = 3.779px
      case 'cm':
        return value * 37.795; // 1cm = 37.795px
      case 'in':
        return value * 96; // 1in = 96px
      default:
        return value;
    }
  }
}
