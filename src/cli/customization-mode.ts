/**
 * Customization mode for advanced styling and templates
 * Provides access to cover design, headers/footers, themes, etc.
 */

import chalk from 'chalk';

import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

export class CustomizationMode {
  private logger: ILogger;
  private translationManager: ITranslationManager;

  constructor(private readonly container: ServiceContainer) {
    this.logger = this.container.resolve<ILogger>('logger');
    this.translationManager =
      this.container.resolve<ITranslationManager>('translator');
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
            await this.headersFooters();
            break;
          case 'metadata':
            await this.documentMetadata();
            break;
          case 'security':
            await this.securitySettings();
            break;
          case 'templates':
            await this.templateManagement();
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

    // Calculate width based on the longest text
    const maxWidth = Math.max(title.length, subtitle.length) + 4;
    const border = '─'.repeat(maxWidth - 2);

    console.log(chalk.magenta(`┌${border}┐`));
    console.log(
      chalk.magenta(
        `│${title.padStart((maxWidth + title.length - 2) / 2).padEnd(maxWidth - 2)}│`,
      ),
    );
    console.log(chalk.magenta(`├${border}┤`));
    console.log(
      chalk.magenta(
        `│${subtitle.padStart((maxWidth + subtitle.length - 2) / 2).padEnd(maxWidth - 2)}│`,
      ),
    );
    console.log(chalk.magenta(`└${border}┘`));
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
        choices: [
          {
            name: this.translationManager.t(
              'cli.customizationMenu.returnToMain',
            ),
            value: 'back',
            short: this.translationManager.t('short.back'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.coverDesign',
            ),
            value: 'cover',
            short: this.translationManager.t('short.coverDesign'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.headersFooters',
            ),
            value: 'headers',
            short: this.translationManager.t('short.headersFooters'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.documentMetadata',
            ),
            value: 'metadata',
            short: this.translationManager.t('short.documentMetadata'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.securitySettings',
            ),
            value: 'security',
            short: this.translationManager.t('short.securitySettings'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.templateManagement',
            ),
            value: 'templates',
            short: this.translationManager.t('short.templateManagement'),
          },
        ],
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

  private async headersFooters(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.headersFootersComingSoon'),
      ),
    );
    await this.pressAnyKey();
  }

  private async documentMetadata(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.documentMetadataComingSoon'),
      ),
    );
    await this.pressAnyKey();
  }

  private async securitySettings(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.securitySettingsComingSoon'),
      ),
    );
    await this.pressAnyKey();
  }

  private async templateManagement(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.templateManagementComingSoon'),
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
          'customization.pressEnterToContinue',
        ),
      },
    ]);
  }
}
