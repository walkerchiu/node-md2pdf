/**
 * Variable Processor
 * Handles template variable replacement and formatting
 */

import { PageContext, TemplateVariable } from './types';

export class VariableProcessor {
  private static readonly VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;
  private static readonly CONDITIONAL_REGEX =
    /\{\{\s*#if\s+([^}]+)\s*\}\}(.*?)\{\{\s*\/if\s*\}\}/gs;

  /**
   * Process template with variable substitution
   */
  processTemplate(
    template: string,
    context: PageContext,
    customVariables?: TemplateVariable[],
  ): string {
    let processed = template;

    // First pass: handle conditional statements
    processed = this.processConditionals(processed, context);

    // Second pass: replace variables
    processed = this.replaceVariables(processed, context, customVariables);

    // Third pass: clean up any remaining unprocessed variables
    processed = this.cleanupUnprocessedVariables(processed);

    return processed;
  }

  /**
   * Extract all variables from a template
   */
  extractVariables(template: string): string[] {
    const variables: string[] = [];
    const matches = template.matchAll(VariableProcessor.VARIABLE_REGEX);

    for (const match of matches) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Validate template variables
   */
  validateVariables(
    template: string,
    context: PageContext,
  ): {
    valid: string[];
    invalid: string[];
    warnings: string[];
  } {
    const extractedVars = this.extractVariables(template);
    const valid: string[] = [];
    const invalid: string[] = [];
    const warnings: string[] = [];

    const availableVars = this.getContextVariables(context);

    for (const variable of extractedVars) {
      if (availableVars.hasOwnProperty(variable)) {
        valid.push(variable);
      } else {
        invalid.push(variable);
        warnings.push(`Unknown variable: {{${variable}}}`);
      }
    }

    return { valid, invalid, warnings };
  }

  /**
   * Replace variables in template
   */
  private replaceVariables(
    template: string,
    context: PageContext,
    customVariables?: TemplateVariable[],
  ): string {
    // Build variable map
    const variableMap = new Map<string, string>();

    // Add context variables
    const contextVars = this.getContextVariables(context);
    for (const [key, value] of Object.entries(contextVars)) {
      variableMap.set(key, String(value));
    }

    // Add custom variables
    if (customVariables) {
      for (const variable of customVariables) {
        const value = variable.formatter
          ? variable.formatter(variable.value)
          : String(variable.value);
        variableMap.set(variable.name, value);
      }
    }

    // Replace variables
    return template.replace(
      VariableProcessor.VARIABLE_REGEX,
      (match, variableName) => {
        const trimmedName = variableName.trim();
        return variableMap.get(trimmedName) ?? match;
      },
    );
  }

  /**
   * Process conditional statements
   */
  private processConditionals(template: string, context: PageContext): string {
    return template.replace(
      VariableProcessor.CONDITIONAL_REGEX,
      (_match, condition, content) => {
        try {
          if (this.evaluateCondition(condition.trim(), context)) {
            return content;
          }
          return '';
        } catch (error) {
          // If condition evaluation fails, return empty string
          return '';
        }
      },
    );
  }

  /**
   * Evaluate a conditional expression
   */
  private evaluateCondition(condition: string, context: PageContext): boolean {
    // Simple condition evaluation
    // Support patterns like: pageNumber > 1, pageNumber == 1, author, !author

    if (condition === 'pageNumber > 1') {
      return context.pageNumber > 1;
    }

    if (condition === 'pageNumber == 1') {
      return context.pageNumber === 1;
    }

    if (condition === 'author') {
      return Boolean(context.author && context.author.trim());
    }

    if (condition === '!author') {
      return !(context.author && context.author.trim());
    }

    if (condition === 'chapterTitle') {
      return Boolean(context.chapterTitle && context.chapterTitle.trim());
    }

    if (condition === 'sectionTitle') {
      return Boolean(context.sectionTitle && context.sectionTitle.trim());
    }

    // Check if it's a simple variable reference
    const contextVars = this.getContextVariables(context);
    if (contextVars.hasOwnProperty(condition)) {
      const value = contextVars[condition];
      return Boolean(
        value && (typeof value === 'string' ? value.trim() : value),
      );
    }

    return false;
  }

  /**
   * Get all context variables as a flat object
   */
  private getContextVariables(context: PageContext): Record<string, any> {
    return {
      title: context.title,
      author: context.author || '',
      date: context.date,
      pageNumber: context.pageNumber,
      totalPages: context.totalPages,
      fileName: context.fileName,
      chapterTitle: context.chapterTitle || '',
      sectionTitle: context.sectionTitle || '',
    };
  }

  /**
   * Clean up any unprocessed variables (replace with empty string or placeholder)
   */
  private cleanupUnprocessedVariables(template: string): string {
    return template.replace(
      VariableProcessor.VARIABLE_REGEX,
      (_match, _variableName) => {
        // For debugging purposes, you might want to keep unknown variables
        // In production, return empty string
        return '';
      },
    );
  }

  /**
   * Format date according to locale
   */
  static formatDate(date: Date | string, locale = 'en-US'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(locale);
  }

  /**
   * Format page numbers with padding
   */
  static formatPageNumber(pageNumber: number, totalPages: number): string {
    const totalDigits = totalPages.toString().length;
    return pageNumber.toString().padStart(totalDigits, '0');
  }

  /**
   * Create custom variable
   */
  static createVariable(
    name: string,
    value: string | number,
    formatter?: (value: any) => string,
  ): TemplateVariable {
    return {
      name,
      value,
      formatter,
    };
  }
}
