/**
 * Template Validator
 * Validates template structure, configuration, and security
 */

import type {
  Template,
  TemplateConfig,
  ValidationResult,
  ValidationError,
  ConfigValidationResult,
} from './types';

/**
 * Template Validator
 * Provides validation and sanitization for templates
 */
export class TemplateValidator {
  /**
   * Validate a complete template
   */
  validate(template: Template): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate required fields (more specific than structure check)
    errors.push(...this.validateRequiredFields(template));

    // Validate metadata if present
    if (template.metadata) {
      errors.push(...this.validateMetadata(template));
    }

    // Validate configuration if present
    if (template.config) {
      const configResult = this.validateConfig(template.config);
      errors.push(...configResult.errors);
    }

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Validate template structure
   */
  validateStructure(template: unknown): template is Template {
    if (typeof template !== 'object' || template === null) {
      return false;
    }

    const t = template as Partial<Template>;

    return !!(
      t.id &&
      t.name &&
      t.description &&
      t.type &&
      t.metadata &&
      t.config
    );
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(template: Template): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!template.id || typeof template.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Template ID is required and must be a string',
        severity: 'error',
      });
    }

    if (!template.name || typeof template.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Template name is required and must be a string',
        severity: 'error',
      });
    }

    if (!template.description || typeof template.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Template description is required and must be a string',
        severity: 'error',
      });
    }

    if (!template.type || !['system', 'custom'].includes(template.type)) {
      errors.push({
        field: 'type',
        message: 'Template type must be either "system" or "custom"',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate metadata
   */
  private validateMetadata(template: Template): ValidationError[] {
    const errors: ValidationError[] = [];
    const { metadata } = template;

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push({
        field: 'metadata.version',
        message: 'Version is required and must be a string',
        severity: 'error',
      });
    }

    if (!metadata.createdAt || !this.isValidISODate(metadata.createdAt)) {
      errors.push({
        field: 'metadata.createdAt',
        message: 'createdAt must be a valid ISO 8601 date string',
        severity: 'error',
      });
    }

    if (!metadata.updatedAt || !this.isValidISODate(metadata.updatedAt)) {
      errors.push({
        field: 'metadata.updatedAt',
        message: 'updatedAt must be a valid ISO 8601 date string',
        severity: 'error',
      });
    }

    if (metadata.category) {
      const validCategories = [
        'quick',
        'professional',
        'technical',
        'academic',
        'custom',
      ];
      if (!validCategories.includes(metadata.category)) {
        errors.push({
          field: 'metadata.category',
          message: `Category must be one of: ${validCategories.join(', ')}`,
          severity: 'error',
        });
      }
    }

    return errors;
  }

  /**
   * Validate template configuration
   */
  validateConfig(config: TemplateConfig): ConfigValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate PDF configuration
    errors.push(...this.validatePDFConfig(config.pdf));

    // Validate header/footer configuration
    errors.push(...this.validateHeaderFooterConfig(config.headerFooter));

    // Validate styles configuration
    errors.push(...this.validateStylesConfig(config.styles));

    // Validate features configuration
    errors.push(...this.validateFeaturesConfig(config.features));

    // Add warnings for suboptimal configurations
    warnings.push(...this.generateConfigWarnings(config));

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate PDF configuration
   */
  private validatePDFConfig(
    pdfConfig: TemplateConfig['pdf'],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!pdfConfig.format || typeof pdfConfig.format !== 'string') {
      errors.push({
        field: 'config.pdf.format',
        message: 'PDF format is required',
        severity: 'error',
      });
    }

    if (
      !pdfConfig.orientation ||
      !['portrait', 'landscape'].includes(pdfConfig.orientation)
    ) {
      errors.push({
        field: 'config.pdf.orientation',
        message: 'PDF orientation must be either "portrait" or "landscape"',
        severity: 'error',
      });
    }

    // Validate margins
    if (!pdfConfig.margin) {
      errors.push({
        field: 'config.pdf.margin',
        message: 'PDF margins are required',
        severity: 'error',
      });
    } else {
      const marginFields = ['top', 'right', 'bottom', 'left'];
      marginFields.forEach((field) => {
        if (!pdfConfig.margin[field as keyof typeof pdfConfig.margin]) {
          errors.push({
            field: `config.pdf.margin.${field}`,
            message: `Margin ${field} is required`,
            severity: 'error',
          });
        }
      });
    }

    if (typeof pdfConfig.displayHeaderFooter !== 'boolean') {
      errors.push({
        field: 'config.pdf.displayHeaderFooter',
        message: 'displayHeaderFooter must be a boolean',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate header/footer configuration
   */
  private validateHeaderFooterConfig(
    headerFooterConfig: TemplateConfig['headerFooter'],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate header
    if (
      !headerFooterConfig.header ||
      typeof headerFooterConfig.header.enabled !== 'boolean'
    ) {
      errors.push({
        field: 'config.headerFooter.header.enabled',
        message: 'Header enabled flag must be a boolean',
        severity: 'error',
      });
    }

    // Validate footer
    if (
      !headerFooterConfig.footer ||
      typeof headerFooterConfig.footer.enabled !== 'boolean'
    ) {
      errors.push({
        field: 'config.headerFooter.footer.enabled',
        message: 'Footer enabled flag must be a boolean',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate styles configuration
   */
  private validateStylesConfig(
    stylesConfig: TemplateConfig['styles'],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!stylesConfig.theme || typeof stylesConfig.theme !== 'string') {
      errors.push({
        field: 'config.styles.theme',
        message: 'Theme is required and must be a string',
        severity: 'error',
      });
    }

    // Validate color values if provided
    if (stylesConfig.colors) {
      Object.entries(stylesConfig.colors).forEach(([key, value]) => {
        if (value && !this.isValidColor(value)) {
          errors.push({
            field: `config.styles.colors.${key}`,
            message: `Invalid color format: ${value}`,
            severity: 'warning',
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate features configuration
   */
  private validateFeaturesConfig(
    featuresConfig: TemplateConfig['features'],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof featuresConfig.toc !== 'boolean') {
      errors.push({
        field: 'config.features.toc',
        message: 'TOC must be a boolean',
        severity: 'error',
      });
    }

    if (
      typeof featuresConfig.tocDepth !== 'number' ||
      featuresConfig.tocDepth < 1 ||
      featuresConfig.tocDepth > 6
    ) {
      errors.push({
        field: 'config.features.tocDepth',
        message: 'TOC depth must be a number between 1 and 6',
        severity: 'error',
      });
    }

    if (typeof featuresConfig.pageNumbers !== 'boolean') {
      errors.push({
        field: 'config.features.pageNumbers',
        message: 'Page numbers must be a boolean',
        severity: 'error',
      });
    }

    if (typeof featuresConfig.anchorLinks !== 'boolean') {
      errors.push({
        field: 'config.features.anchorLinks',
        message: 'Anchor links must be a boolean',
        severity: 'error',
      });
    }

    if (
      typeof featuresConfig.anchorDepth !== 'number' ||
      featuresConfig.anchorDepth < 1 ||
      featuresConfig.anchorDepth > 6
    ) {
      errors.push({
        field: 'config.features.anchorDepth',
        message: 'Anchor depth must be a number between 1 and 6',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Generate configuration warnings
   */
  private generateConfigWarnings(config: TemplateConfig): ValidationError[] {
    const warnings: ValidationError[] = [];

    // Warn if header/footer is enabled but displayHeaderFooter is false
    if (
      (config.headerFooter.header.enabled ||
        config.headerFooter.footer.enabled) &&
      !config.pdf.displayHeaderFooter
    ) {
      warnings.push({
        field: 'config.pdf.displayHeaderFooter',
        message: 'Header or footer is enabled but displayHeaderFooter is false',
        severity: 'warning',
      });
    }

    // Warn if TOC is enabled but depth is very shallow
    if (config.features.toc && config.features.tocDepth === 1) {
      warnings.push({
        field: 'config.features.tocDepth',
        message:
          'TOC depth of 1 may result in a very shallow table of contents',
        severity: 'warning',
      });
    }

    // Warn if anchor links are disabled
    if (!config.features.anchorLinks) {
      warnings.push({
        field: 'config.features.anchorLinks',
        message: 'Anchor links are disabled, navigation may be limited',
        severity: 'warning',
      });
    }

    return warnings;
  }

  /**
   * Sanitize template (remove potentially dangerous content)
   */
  sanitizeTemplate(template: Template): Template {
    // Create a deep copy
    const sanitized = JSON.parse(JSON.stringify(template)) as Template;

    // Sanitize name and description
    sanitized.name = this.sanitizeString(sanitized.name);
    sanitized.description = this.sanitizeString(sanitized.description);

    // Sanitize author if present
    if (sanitized.metadata.author) {
      sanitized.metadata.author = this.sanitizeString(
        sanitized.metadata.author,
      );
    }

    // Sanitize tags
    if (sanitized.metadata.tags) {
      sanitized.metadata.tags = sanitized.metadata.tags.map((tag) =>
        this.sanitizeString(tag),
      );
    }

    // Sanitize header/footer content
    if (sanitized.config.headerFooter.header.content) {
      sanitized.config.headerFooter.header.content = this.sanitizeString(
        sanitized.config.headerFooter.header.content,
      );
    }

    if (sanitized.config.headerFooter.footer.content) {
      sanitized.config.headerFooter.footer.content = this.sanitizeString(
        sanitized.config.headerFooter.footer.content,
      );
    }

    return sanitized;
  }

  /**
   * Sanitize string (remove HTML tags, scripts, etc.)
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  /**
   * Check if a date string is valid ISO 8601 format
   */
  private isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Check if a color value is valid
   */
  private isValidColor(color: string): boolean {
    // Check hex colors
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return true;
    }

    // Check rgb/rgba colors
    if (/^rgba?\([\d\s,%.]+\)$/.test(color)) {
      return true;
    }

    // Check named colors (basic validation)
    const namedColors = [
      'black',
      'white',
      'red',
      'green',
      'blue',
      'yellow',
      'purple',
      'orange',
      'gray',
      'transparent',
    ];
    if (namedColors.includes(color.toLowerCase())) {
      return true;
    }

    return false;
  }
}
