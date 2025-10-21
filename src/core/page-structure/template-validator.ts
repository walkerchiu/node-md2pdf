/**
 * Template Validator
 * Validates header/footer templates and configurations
 */

import {
  HeaderConfig,
  FooterConfig,
  ValidationResult,
  HeaderFooterPosition,
} from './types';
import { VariableProcessor } from './variable-processor';

export class TemplateValidator {
  private variableProcessor: VariableProcessor;

  constructor() {
    this.variableProcessor = new VariableProcessor();
  }

  /**
   * Validate header or footer configuration
   */
  validateConfig(
    config: HeaderConfig | FooterConfig,
    position: HeaderFooterPosition,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if template is provided when enabled
    if (config.enabled && !config.template) {
      errors.push(`${position} is enabled but no template provided`);
    }

    // Validate template if provided
    if (config.template) {
      const templateValidation = this.validateTemplate(config.template);
      errors.push(...templateValidation.errors);
      warnings.push(...templateValidation.warnings);
    }

    // Validate styles
    if (config.styles) {
      const styleValidation = this.validateStyles(config.styles);
      errors.push(...styleValidation.errors);
      warnings.push(...styleValidation.warnings);
    }

    // Validate height
    if (config.height) {
      const heightValidation = this.validateHeight(config.height);
      if (!heightValidation.isValid) {
        errors.push(`Invalid height format: ${config.height}`);
      }
    }

    // Validate page visibility settings
    const visibilityValidation = this.validateVisibilitySettings(config);
    warnings.push(...visibilityValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate template content
   */
  validateTemplate(template: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty template
    if (!template || template.trim().length === 0) {
      errors.push('Template cannot be empty');
      return { isValid: false, errors, warnings };
    }

    // Check template length
    if (template.length > 5000) {
      warnings.push('Template is very long and may impact performance');
    }

    // Validate HTML structure
    const htmlValidation = this.validateHTML(template);
    errors.push(...htmlValidation.errors);
    warnings.push(...htmlValidation.warnings);

    // Validate variables
    const variables = this.variableProcessor.extractVariables(template);
    const unknownVariables = this.getUnknownVariables(variables);
    if (unknownVariables.length > 0) {
      warnings.push(
        `Unknown variables found: ${unknownVariables.map((v) => `{{${v}}}`).join(', ')}`,
      );
    }

    // Check for unmatched braces
    const braceValidation = this.validateBraces(template);
    if (!braceValidation.isValid) {
      errors.push('Unmatched braces found in template');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate CSS styles
   */
  validateStyles(styles: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate common style properties
    if (styles.fontSize && !this.isValidSize(styles.fontSize)) {
      errors.push(`Invalid fontSize: ${styles.fontSize}`);
    }

    if (styles.color && !this.isValidColor(styles.color)) {
      errors.push(`Invalid color: ${styles.color}`);
    }

    if (styles.backgroundColor && !this.isValidColor(styles.backgroundColor)) {
      errors.push(`Invalid backgroundColor: ${styles.backgroundColor}`);
    }

    if (
      styles.textAlign &&
      !['left', 'center', 'right', 'justify'].includes(styles.textAlign)
    ) {
      errors.push(`Invalid textAlign: ${styles.textAlign}`);
    }

    // Validate custom CSS
    if (styles.customCSS) {
      const cssValidation = this.validateCustomCSS(styles.customCSS);
      errors.push(...cssValidation.errors);
      warnings.push(...cssValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate height format
   */
  private validateHeight(height: string): ValidationResult {
    const heightRegex = /^(\d+(?:\.\d+)?)(px|pt|mm|cm|in|%)$/;
    const isValid = heightRegex.test(height);

    return {
      isValid,
      errors: isValid ? [] : [`Invalid height format: ${height}`],
      warnings: [],
    };
  }

  /**
   * Validate HTML structure
   */
  private validateHTML(template: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for potentially dangerous HTML
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // event handlers
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(template)) {
        errors.push('Template contains potentially dangerous HTML');
        break;
      }
    }

    // Check for unclosed tags (basic validation)
    const tagRegex = /<(\w+)[^>]*>/g;
    const closingTagRegex = /<\/(\w+)>/g;

    const openTags: string[] = [];
    let match;

    // Find opening tags
    while ((match = tagRegex.exec(template)) !== null) {
      const tagName = match[1].toLowerCase();
      // Skip self-closing tags
      if (!['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName)) {
        openTags.push(tagName);
      }
    }

    // Find closing tags
    const closingTags: string[] = [];
    while ((match = closingTagRegex.exec(template)) !== null) {
      closingTags.push(match[1].toLowerCase());
    }

    // Basic check for mismatched tags
    if (openTags.length !== closingTags.length) {
      warnings.push('Possible unclosed HTML tags detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate brace matching
   */
  private validateBraces(template: string): ValidationResult {
    let openBraces = 0;
    let inVariable = false;

    for (let i = 0; i < template.length - 1; i++) {
      if (template[i] === '{' && template[i + 1] === '{') {
        if (inVariable) {
          return {
            isValid: false,
            errors: ['Nested variables not allowed'],
            warnings: [],
          };
        }
        inVariable = true;
        openBraces++;
        i++; // skip next brace
      } else if (template[i] === '}' && template[i + 1] === '}') {
        if (!inVariable) {
          return {
            isValid: false,
            errors: ['Closing braces without opening'],
            warnings: [],
          };
        }
        inVariable = false;
        openBraces--;
        i++; // skip next brace
      }
    }

    return {
      isValid: openBraces === 0,
      errors: openBraces !== 0 ? ['Unmatched braces'] : [],
      warnings: [],
    };
  }

  /**
   * Validate page visibility settings
   */
  private validateVisibilitySettings(
    config: HeaderConfig | FooterConfig,
  ): ValidationResult {
    const warnings: string[] = [];

    // Check for contradictory settings
    if (config.showOnEvenPages === false && config.showOnOddPages === false) {
      warnings.push(
        'Header/footer will not be visible on any page due to visibility settings',
      );
    }

    if (
      config.showOnFirstPage === false &&
      config.showOnEvenPages === false &&
      config.showOnOddPages === false
    ) {
      warnings.push(
        'Header/footer is completely disabled by visibility settings',
      );
    }

    return {
      isValid: true,
      errors: [],
      warnings,
    };
  }

  /**
   * Validate custom CSS
   */
  private validateCustomCSS(css: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous CSS
    const dangerousPatterns = [
      /@import/gi,
      /javascript:/gi,
      /expression\s*\(/gi,
      /behavior\s*:/gi,
      /-moz-binding/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(css)) {
        errors.push('Custom CSS contains potentially dangerous content');
        break;
      }
    }

    // Check CSS length
    if (css.length > 10000) {
      warnings.push('Custom CSS is very long and may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if size value is valid
   */
  private isValidSize(size: string): boolean {
    const sizeRegex = /^(\d+(?:\.\d+)?)(px|pt|em|rem|%|mm|cm|in)$/;
    return sizeRegex.test(size);
  }

  /**
   * Check if color value is valid
   */
  private isValidColor(color: string): boolean {
    const colorRegex = /^(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-z]+)$/;
    return colorRegex.test(color);
  }

  /**
   * Get unknown variables from a list of variables
   */
  private getUnknownVariables(variables: string[]): string[] {
    const knownVariables = [
      'title',
      'author',
      'date',
      'pageNumber',
      'totalPages',
      'fileName',
      'chapterTitle',
      'sectionTitle',
    ];

    return variables.filter((v) => !knownVariables.includes(v));
  }
}
