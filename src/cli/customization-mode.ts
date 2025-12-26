/**
 * Customization mode for advanced styling and templates
 * Provides access to cover design, headers/footers, themes, etc.
 */

import chalk from 'chalk';

import { TemplateStorageService, TemplateValidator } from '../core/templates';

import { DocumentMetadataFeature } from './customization/document-metadata';
import { HeadersFootersFeature } from './customization/headers-footers';
import { PasswordProtectionFeature } from './customization/password-protection';
import { TemplateManagementFeature } from './customization/template-management';
import { I18nHelpers } from './utils/i18n-helpers';

import type { IConfigManager } from '../infrastructure/config/types';
import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

export class CustomizationMode {
  private logger: ILogger;
  private translationManager: ITranslationManager;
  private configManager: IConfigManager;
  private i18nHelpers: I18nHelpers;
  private templateStorage: TemplateStorageService;
  private templateValidator: TemplateValidator;

  // Feature modules
  private documentMetadataFeature: DocumentMetadataFeature;
  private headersFootersFeature: HeadersFootersFeature;
  private passwordProtectionFeature: PasswordProtectionFeature;
  private templateManagementFeature: TemplateManagementFeature;

  constructor(private readonly container: ServiceContainer) {
    this.logger = this.container.resolve<ILogger>('logger');
    this.translationManager =
      this.container.resolve<ITranslationManager>('translator');
    this.configManager = this.container.resolve<IConfigManager>('config');
    this.i18nHelpers = new I18nHelpers(this.translationManager);
    this.templateStorage = new TemplateStorageService();
    this.templateValidator = new TemplateValidator();

    // Initialize feature modules with shared dependencies
    const deps = {
      logger: this.logger,
      translationManager: this.translationManager,
      configManager: this.configManager,
      i18nHelpers: this.i18nHelpers,
      container: this.container,
    };

    this.documentMetadataFeature = new DocumentMetadataFeature(deps);
    this.headersFootersFeature = new HeadersFootersFeature(deps);
    this.passwordProtectionFeature = new PasswordProtectionFeature(deps);
    this.templateManagementFeature = new TemplateManagementFeature({
      ...deps,
      templateStorage: this.templateStorage,
      templateValidator: this.templateValidator,
    });
  }

  /**
   * Start customization mode
   */
  async start(): Promise<void> {
    try {
      this.logger.info(
        this.translationManager.t('startup.startingCustomizationMode'),
      );

      let running = true;

      while (running) {
        this.showCustomizationHeader();
        const option = await this.selectCustomizationOption();

        switch (option) {
          case 'cover':
            await this.coverDesign();
            break;
          case 'headers':
            await this.headersFootersFeature.start();
            break;
          case 'metadata':
            await this.documentMetadataFeature.start();
            break;
          case 'password':
            await this.passwordProtectionFeature.start();
            break;
          case 'watermarks':
            await this.watermarkSettings();
            break;
          case 'templates':
            await this.templateManagementFeature.start();
            break;
          case 'back':
            this.logger.info(
              this.translationManager.t(
                'startup.returningToMainMenuFromCustomization',
              ),
            );
            running = false;
            break;
        }
      }
    } catch (error) {
      this.logger.error(
        this.translationManager.t('startup.customizationModeError'),
        error,
      );
      console.error(
        chalk.red(
          '❌ ' +
            this.translationManager.t('customization.customizationError') +
            ':',
        ),
        error,
      );
      throw error;
    }
  }

  /**
   * Show customization header
   */
  private showCustomizationHeader(): void {
    const title = this.translationManager.t('cli.customizationMenu.title');
    const subtitle = this.translationManager.t(
      'cli.customizationMenu.subtitle',
    );

    const borderLine = '─'.repeat(79);

    console.log(chalk.blue(borderLine));
    console.log(chalk.blue(title.padStart((79 + title.length) / 2).padEnd(79)));
    console.log(chalk.blue(borderLine));
    console.log(
      chalk.blue(subtitle.padStart((79 + subtitle.length) / 2).padEnd(79)),
    );
    console.log(chalk.blue(borderLine));
    console.log();
  }

  /**
   * Select customization option
   */
  private async selectCustomizationOption(): Promise<string> {
    const inquirer = await import('inquirer');

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'option',
        message: this.translationManager.t(
          'customization.selectCustomizationOption',
        ),
        choices: this.i18nHelpers.createNumberedChoices(
          [
            {
              key: 'common.menu.returnToMain',
              value: 'back',
            },
            {
              key: 'cli.customizationMenu.coverDesign',
              value: 'cover',
            },
            {
              key: 'cli.customizationMenu.headersFooters',
              value: 'headers',
            },
            {
              key: 'cli.customizationMenu.documentMetadata',
              value: 'metadata',
            },
            {
              key: 'cli.customizationMenu.passwordProtection',
              value: 'password',
            },
            {
              key: 'cli.customizationMenu.watermarks',
              value: 'watermarks',
            },
            {
              key: 'cli.customizationMenu.templateManagement',
              value: 'templates',
            },
          ],
          0,
        ),
        default: 'cover',
        pageSize: 12,
      },
    ]);

    return result.option;
  }

  // Placeholder methods for future implementation
  private async coverDesign(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.coverDesignComingSoon'),
      ),
    );
    await this.pressAnyKey();
  }

  /**
   * Watermark Settings
   */
  private async watermarkSettings(): Promise<void> {
    console.clear();
    console.log(
      chalk.cyan.bold(
        `\n${this.translationManager.t('cli.customizationMenu.watermarks')}\n`,
      ),
    );

    console.log(
      chalk.yellow(
        `\n${this.translationManager.t('watermarks.messages.comingSoon')}\n`,
      ),
    );

    console.log(
      chalk.gray(
        this.translationManager.t('watermarks.messages.featureDescription'),
      ),
    );

    await this.pressAnyKey();
  }

  private async pressAnyKey(): Promise<void> {
    const inquirer = await import('inquirer');
    await inquirer.default.prompt([
      {
        type: 'input',
        name: 'continue',
        message: this.translationManager.t(
          'common.actions.pressEnterToContinue',
        ),
      },
    ]);
  }
}
