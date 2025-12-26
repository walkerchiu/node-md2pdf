/**
 * Shared types for customization modules
 */

import { I18nHelpers } from '../utils/i18n-helpers';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { ILogger } from '../../infrastructure/logging/types';
import type { ServiceContainer } from '../../shared/container';

/**
 * Base dependencies for all customization feature modules
 */
export interface CustomizationDependencies {
  logger: ILogger;
  translationManager: ITranslationManager;
  configManager: IConfigManager;
  i18nHelpers: I18nHelpers;
  container: ServiceContainer;
}

/**
 * Interface for customization feature modules
 */
export interface ICustomizationFeature {
  /**
   * Start the feature configuration flow
   */
  start(): Promise<void>;
}

/**
 * Base class for customization feature modules
 * Provides common dependencies and utility methods
 */
export abstract class BaseCustomizationFeature
  implements ICustomizationFeature
{
  protected readonly logger: ILogger;
  protected readonly translationManager: ITranslationManager;
  protected readonly configManager: IConfigManager;
  protected readonly i18nHelpers: I18nHelpers;
  protected readonly container: ServiceContainer;

  constructor(deps: CustomizationDependencies) {
    this.logger = deps.logger;
    this.translationManager = deps.translationManager;
    this.configManager = deps.configManager;
    this.i18nHelpers = deps.i18nHelpers;
    this.container = deps.container;
  }

  /**
   * Start the feature configuration flow
   */
  abstract start(): Promise<void>;

  /**
   * Helper to prompt user to press any key to continue
   */
  protected async pressAnyKey(): Promise<void> {
    const inquirer = await import('inquirer');

    await inquirer.default.prompt([
      {
        type: 'input',
        name: 'key',
        message: this.translationManager.t('cli.options.pressAnyKey'),
      },
    ]);
  }

  /**
   * Translate validation error messages
   */
  protected translateValidationError(message: string): string {
    const errorMappings: Record<string, string> = {
      'Name is required': this.translationManager.t(
        'customization.templates.validation.nameRequired',
      ),
      'Description is required': this.translationManager.t(
        'customization.templates.validation.descriptionRequired',
      ),
      'Invalid template format': this.translationManager.t(
        'customization.templates.validation.invalidFormat',
      ),
    };

    return errorMappings[message] || message;
  }
}
