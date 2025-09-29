/**
 * Inquirer.js helper utilities
 * Provides UI-friendly wrappers for consistent navigation patterns
 */

import type { DistinctChoice } from 'inquirer';

/**
 * Custom error for back navigation handling
 */
export class BackNavigationError extends Error {
  constructor(message = 'BACK_TO_PREVIOUS_MENU') {
    super(message);
    this.name = 'BackNavigationError';
  }
}

/**
 * Handle navigation result - returns null for back navigation
 */
export function handleNavigationResult<T>(
  value: T,
  onBack?: () => void,
): T | null {
  if (InquirerHelpers.isBackNavigation(value as any)) {
    if (onBack) {
      onBack();
    }
    return null;
  }
  return value;
}

/**
 * Wrapper around inquirer with navigation support
 */
export class InquirerHelpers {
  /**
   * Create a standard prompt - just passes through to inquirer
   */
  static async prompt(options: any): Promise<any> {
    const inquirer = await import('inquirer');
    const result = await inquirer.default.prompt([options]);
    return result[options.name];
  }

  /**
   * Create a list prompt with optional back navigation
   */
  static async listPrompt(options: {
    message: string;
    choices: DistinctChoice[];
    name: string;
    default?: any;
    pageSize?: number;
  }): Promise<any> {
    const inquirer = await import('inquirer');
    const result = await inquirer.default.prompt([
      { type: 'list', ...options },
    ]);
    return result[options.name];
  }

  /**
   * Create a list prompt with built-in back navigation
   */
  static async listWithBackNavigation(options: {
    message: string;
    choices: DistinctChoice[];
    default?: any;
    pageSize?: number;
    backLabel?: string;
    backValue?: string;
  }): Promise<any> {
    const inquirer = await import('inquirer');

    const backChoice = {
      name: options.backLabel || '0. Return to Main Menu',
      value: options.backValue || '__back__',
    };

    const choices = [backChoice, ...options.choices];

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'selection',
        message: options.message,
        choices,
        default: options.default,
        pageSize: options.pageSize,
      },
    ]);

    return result.selection;
  }

  /**
   * Create a confirm prompt
   */
  static async confirmPrompt(
    message: string,
    defaultValue = true,
  ): Promise<boolean> {
    const inquirer = await import('inquirer');
    const result = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue,
      },
    ]);
    return result.confirmed;
  }

  /**
   * Create an input prompt
   */
  static async inputPrompt(options: {
    message: string;
    default?: string;
    validate?: (input: string) => boolean | string;
  }): Promise<string> {
    const inquirer = await import('inquirer');
    const result = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'input',
        message: options.message,
        default: options.default,
        validate: options.validate,
      },
    ]);
    return result.input;
  }

  /**
   * Check if value represents back navigation
   */
  static isBackNavigation(value: any, customBackValue?: string): boolean {
    if (customBackValue) {
      return value === customBackValue;
    }
    return value === '__back__' || value === 'back';
  }
}
