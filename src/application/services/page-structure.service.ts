/**
 * Application service for page structure management
 * Integrates header/footer functionality with infrastructure services
 */

import {
  HeaderFooterManager,
  PageContext,
  PageStructureConfig,
  PageStructurePreset,
  PresetManager,
  RenderResult,
  ValidationResult,
  TemplateVariable,
} from '../../core/page-structure';
import { MD2PDFError } from '../../infrastructure/error/errors';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface IPageStructureService {
  generatePageStructure(
    config: PageStructureConfig,
    context: PageContext,
    variables?: TemplateVariable[],
  ): Promise<{
    header: RenderResult;
    footer: RenderResult;
    margins: PageStructureConfig['margins'];
  }>;

  generateHeader(context: PageContext): Promise<RenderResult>;
  generateFooter(context: PageContext): Promise<RenderResult>;

  getAvailablePresets(): Promise<PageStructurePreset[]>;
  getPresetByName(name: string): Promise<PageStructurePreset | undefined>;
  suggestPreset(documentPath: string): Promise<PageStructurePreset[]>;
  validateConfiguration(config: PageStructureConfig): Promise<ValidationResult>;
  previewTemplate(
    template: string,
    sampleContext?: Partial<PageContext>,
  ): Promise<RenderResult>;
}

export class PageStructureService implements IPageStructureService {
  private headerFooterManager: HeaderFooterManager;

  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly _configManager: IConfigManager, // Reserved for future use
  ) {
    this.headerFooterManager = new HeaderFooterManager();
    // Mark as used to avoid TypeScript warning
    void this._configManager;
  }

  async generatePageStructure(
    config: PageStructureConfig,
    context: PageContext,
    variables?: TemplateVariable[],
  ): Promise<{
    header: RenderResult;
    footer: RenderResult;
    margins: PageStructureConfig['margins'];
  }> {
    try {
      this.logger.info('Generating page structure', {
        hasHeader: !!config.header?.enabled,
        hasFooter: !!config.footer?.enabled,
        pageNumber: context.pageNumber,
        title: context.title,
      });

      const result = this.headerFooterManager.generatePageStructure(
        config,
        context,
        variables,
      );

      // Log any warnings
      if (result.header.warnings?.length) {
        this.logger.warn('Header generation warnings', {
          warnings: result.header.warnings,
        });
      }

      if (result.footer.warnings?.length) {
        this.logger.warn('Footer generation warnings', {
          warnings: result.footer.warnings,
        });
      }

      this.logger.debug('Page structure generated successfully', {
        headerHtml: result.header.html.length > 0,
        footerHtml: result.footer.html.length > 0,
        headerHeight: result.header.height,
        footerHeight: result.footer.height,
      });

      return result;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Page structure generation failed: ${(error as Error).message}`,
        'PAGE_STRUCTURE_ERROR',
        'page_structure',
        false,
        {
          config,
          context,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PageStructureService.generatePageStructure',
      );
      throw wrappedError;
    }
  }

  async generateHeader(context: PageContext): Promise<RenderResult> {
    try {
      this.logger.debug('Generating header using default configuration');

      // Use default configuration if none is set
      const config = this.getDefaultConfig();
      const result = this.headerFooterManager.generateHeader(
        config.header!,
        context,
      );

      this.logger.debug('Header generated successfully');
      return result;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to generate header: ${(error as Error).message}`,
        'PAGE_STRUCTURE_ERROR',
        'page_structure',
        true,
        {
          context,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PageStructureService.generateHeader',
      );
      throw wrappedError;
    }
  }

  async generateFooter(context: PageContext): Promise<RenderResult> {
    try {
      this.logger.debug('Generating footer using default configuration');

      // Use default configuration if none is set
      const config = this.getDefaultConfig();
      const result = this.headerFooterManager.generateFooter(
        config.footer!,
        context,
      );

      this.logger.debug('Footer generated successfully');
      return result;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to generate footer: ${(error as Error).message}`,
        'PAGE_STRUCTURE_ERROR',
        'page_structure',
        true,
        {
          context,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PageStructureService.generateFooter',
      );
      throw wrappedError;
    }
  }

  async getAvailablePresets(): Promise<PageStructurePreset[]> {
    try {
      this.logger.debug('Fetching available page structure presets');
      const presets = PresetManager.getAvailablePresets();

      this.logger.info(`Found ${presets.length} available presets`, {
        presetNames: presets.map((p: PageStructurePreset) => p.name),
        categories: [
          ...new Set(presets.map((p: PageStructurePreset) => p.category)),
        ],
      });

      return presets;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to get available presets: ${(error as Error).message}`,
        'PRESET_FETCH_ERROR',
        'page_structure',
        false,
        { originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PageStructureService.getAvailablePresets',
      );
      throw wrappedError;
    }
  }

  async getPresetByName(
    name: string,
  ): Promise<PageStructurePreset | undefined> {
    try {
      this.logger.debug(`Fetching preset by name: ${name}`);
      const preset = PresetManager.getPresetByName(name);

      if (preset) {
        this.logger.info(`Preset found: ${name}`, {
          category: preset.category,
          hasHeader: !!preset.config.header?.enabled,
          hasFooter: !!preset.config.footer?.enabled,
        });
      } else {
        this.logger.warn(`Preset not found: ${name}`);
      }

      return preset;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to get preset by name: ${(error as Error).message}`,
        'PRESET_FETCH_ERROR',
        'page_structure',
        false,
        { presetName: name, originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PageStructureService.getPresetByName',
      );
      throw wrappedError;
    }
  }

  async suggestPreset(documentPath: string): Promise<PageStructurePreset[]> {
    try {
      this.logger.debug(
        `Analyzing document for preset suggestions: ${documentPath}`,
      );

      // Basic document analysis (can be enhanced with actual file analysis)
      const documentAnalysis = await this.analyzeDocument(documentPath);

      const suggestions = PresetManager.suggestPreset(documentAnalysis);

      this.logger.info(`Generated ${suggestions.length} preset suggestions`, {
        documentPath,
        analysis: documentAnalysis,
        suggestedPresets: suggestions.map((s: PageStructurePreset) => s.name),
      });

      return suggestions;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to suggest presets: ${(error as Error).message}`,
        'PRESET_SUGGESTION_ERROR',
        'page_structure',
        false,
        { documentPath, originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PageStructureService.suggestPreset',
      );
      throw wrappedError;
    }
  }

  async validateConfiguration(
    config: PageStructureConfig,
  ): Promise<ValidationResult> {
    try {
      this.logger.debug('Validating page structure configuration');

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate header configuration
      if (config.header) {
        const headerValidation = this.headerFooterManager.validateHeaderConfig(
          config.header,
        );
        errors.push(...headerValidation.errors);
        warnings.push(...headerValidation.warnings);
      }

      // Validate footer configuration
      if (config.footer) {
        const footerValidation = this.headerFooterManager.validateFooterConfig(
          config.footer,
        );
        errors.push(...footerValidation.errors);
        warnings.push(...footerValidation.warnings);
      }

      // Validate margins
      if (config.margins) {
        const marginValidation = this.validateMargins(config.margins);
        errors.push(...marginValidation.errors);
        warnings.push(...marginValidation.warnings);
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
      };

      this.logger.info('Configuration validation completed', {
        isValid: result.isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
      });

      return result;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Configuration validation failed: ${(error as Error).message}`,
        'CONFIG_VALIDATION_ERROR',
        'page_structure',
        false,
        { config, originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PageStructureService.validateConfiguration',
      );
      throw wrappedError;
    }
  }

  async previewTemplate(
    template: string,
    sampleContext?: Partial<PageContext>,
  ): Promise<RenderResult> {
    try {
      this.logger.debug('Generating template preview', {
        templateLength: template.length,
        hasSampleContext: !!sampleContext,
      });

      const result = this.headerFooterManager.previewContent(
        template,
        sampleContext || {},
      );

      this.logger.info('Template preview generated', {
        success: !!result.html,
        warningCount: result.warnings?.length || 0,
      });

      return result;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Template preview failed: ${(error as Error).message}`,
        'TEMPLATE_PREVIEW_ERROR',
        'page_structure',
        false,
        { template, sampleContext, originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'PageStructureService.previewTemplate',
      );
      throw wrappedError;
    }
  }

  /**
   * Analyze document for preset suggestions
   */
  private async analyzeDocument(documentPath: string): Promise<{
    hasCodeBlocks?: boolean;
    hasAcademicElements?: boolean;
    isBusinessDocument?: boolean;
    complexity?: 'simple' | 'moderate' | 'complex';
  }> {
    // This is a basic implementation
    // In a real implementation, you would analyze the actual document content

    const fileName = documentPath.toLowerCase();
    const analysis = {
      hasCodeBlocks: false,
      hasAcademicElements: false,
      isBusinessDocument: false,
      complexity: 'moderate' as const,
    };

    // Simple heuristics based on file name
    if (
      fileName.includes('api') ||
      fileName.includes('tech') ||
      fileName.includes('code')
    ) {
      analysis.hasCodeBlocks = true;
    }

    if (
      fileName.includes('paper') ||
      fileName.includes('research') ||
      fileName.includes('thesis')
    ) {
      analysis.hasAcademicElements = true;
    }

    if (
      fileName.includes('report') ||
      fileName.includes('business') ||
      fileName.includes('proposal')
    ) {
      analysis.isBusinessDocument = true;
    }

    // TODO: Add actual file content analysis here

    return analysis;
  }

  /**
   * Validate margin configuration
   */
  private validateMargins(
    margins: NonNullable<PageStructureConfig['margins']>,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validateMargin = (value: string | undefined, name: string) => {
      if (value) {
        const marginRegex = /^(\d+(?:\.\d+)?)(px|pt|mm|cm|in)$/;
        if (!marginRegex.test(value)) {
          errors.push(`Invalid ${name} margin format: ${value}`);
        }
      }
    };

    validateMargin(margins.top, 'top');
    validateMargin(margins.bottom, 'bottom');
    validateMargin(margins.left, 'left');
    validateMargin(margins.right, 'right');

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getDefaultConfig(): PageStructureConfig {
    // Return a basic configuration for header/footer generation
    return {
      header: {
        enabled: true,
        template: `
          <div style="
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            text-align: center;
            color: #333;
            border-bottom: 1px solid #e8e8e8;
            padding: 4px 0 8px 0;
            margin: 0;
            line-height: 1.3;
            background: rgba(248, 248, 248, 0.8);
          ">
            {{title}}
          </div>
        `,
        styles: {
          fontSize: '12px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
          color: '#333333',
          textAlign: 'center',
          padding: '4px 0 8px 0',
          borderBottom: '1px solid #e8e8e8',
          background: 'rgba(248, 248, 248, 0.8)',
          lineHeight: '1.3',
        },
        showOnFirstPage: true,
        showOnEvenPages: true,
        showOnOddPages: true,
      },
      footer: {
        enabled: true,
        template: `
          <div style="
            font-size: 11px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            text-align: center;
            color: #666;
            border-top: 1px solid #e8e8e8;
            padding: 8px 0 4px 0;
            margin: 0;
            line-height: 1.2;
            background: rgba(248, 248, 248, 0.8);
          ">
            第 {{pageNumber}} 頁 / 共 {{totalPages}} 頁
          </div>
        `,
        styles: {
          fontSize: '11px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
          color: '#666666',
          textAlign: 'center',
          padding: '8px 0 4px 0',
          borderTop: '1px solid #e8e8e8',
          background: 'rgba(248, 248, 248, 0.8)',
          lineHeight: '1.2',
        },
        showOnFirstPage: true,
        showOnEvenPages: true,
        showOnOddPages: true,
      },
      margins: {
        top: '1in',
        bottom: '1in',
        left: '1in',
        right: '1in',
      },
    };
  }
}
