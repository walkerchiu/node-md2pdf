/**
 * Settings mode for language preferences and system configuration
 * Provides access to language settings, defaults, and preferences
 */

import chalk from 'chalk';

import { LoggingSettings } from './logging-settings';
import { CliUIManager } from './ui/cli-ui-manager';
import { I18nHelpers } from './utils/i18n-helpers';

import type { IConfigManager } from '../infrastructure/config/types';
import type {
  ITranslationManager,
  SupportedLocale,
} from '../infrastructure/i18n/types';
import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

export class SettingsMode {
  private logger: ILogger;
  private translationManager: ITranslationManager;
  private configManager: IConfigManager;
  private uiManager: CliUIManager;
  private i18nHelpers: I18nHelpers;

  constructor(private readonly container: ServiceContainer) {
    this.logger = this.container.resolve<ILogger>('logger');
    this.translationManager =
      this.container.resolve<ITranslationManager>('translator');
    this.configManager = this.container.resolve<IConfigManager>('config');
    this.uiManager = new CliUIManager(
      this.translationManager,
      this.logger,
      {},
      this.configManager,
    );
    this.i18nHelpers = new I18nHelpers(this.translationManager);
  }

  /**
   * Start settings mode
   */
  async start(): Promise<void> {
    try {
      this.logger.info(
        this.translationManager.t('startup.startingSettingsMode'),
      );

      let running = true;
      while (running) {
        this.showSettingsHeader();
        const option = await this.selectSettingsOption();

        switch (option) {
          case 'language':
            await this.languageSettings();
            break;
          case 'logging':
            await this.loggingSettings();
            break;
          case 'back':
            this.logger.info(
              this.translationManager.t(
                'startup.returningToMainMenuFromSettings',
              ),
            );
            running = false;
            break;
        }
      }
    } catch (error) {
      this.logger.error(
        this.translationManager.t('startup.settingsModeError'),
        error,
      );
      console.error(
        chalk.red(
          this.translationManager.t('customization.customizationError'),
        ),
        error,
      );
      throw error;
    }
  }

  /**
   * Show settings header
   */
  private showSettingsHeader(): void {
    const borderLine = '─'.repeat(79);
    console.log(chalk.blue(borderLine));
    const currentLocale = this.translationManager.getCurrentLocale();
    const displayLanguage = this.getLanguageDisplayName(currentLocale);

    const title = this.translationManager.t('cli.settingsMenu.title');
    const currentLangText = `${this.translationManager.t('cli.languageMenu.currentLanguage')}: ${displayLanguage}`;

    console.log(chalk.blue(title.padStart((79 + title.length) / 2).padEnd(79)));
    console.log(chalk.blue(borderLine));
    console.log(
      chalk.blue(
        currentLangText.padStart((79 + currentLangText.length) / 2).padEnd(79),
      ),
    );
    console.log(chalk.blue(borderLine));
  }

  private getLanguageDisplayName(locale: SupportedLocale): string {
    const translationKey = `cli.languages.${locale}`;
    return this.translationManager.t(translationKey);
  }

  /**
   * Select settings option
   */
  private async selectSettingsOption(): Promise<string> {
    const inquirer = await import('inquirer');

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'option',
        message: this.translationManager.t('cli.prompts.selectLanguage'),
        choices: this.i18nHelpers.createNumberedChoices(
          [
            {
              key: 'common.menu.returnToMain',
              value: 'back',
            },
            {
              key: 'cli.settingsMenu.languageSettings',
              value: 'language',
            },
            {
              key: 'cli.settingsMenu.loggingSettings',
              value: 'logging',
            },
          ],
          0,
        ),
        default: 'language',
        pageSize: 12,
      },
    ]);

    return result.option;
  }

  // Language settings implementation
  private async languageSettings(): Promise<void> {
    try {
      // Log user access to language settings
      this.uiManager.logUserAccess('LanguageSettings', 'Enter', {
        timestamp: new Date().toISOString(),
      });

      let running = true;

      while (running) {
        console.clear();
        this.showLanguageHeader();

        const currentLocale = this.translationManager.getCurrentLocale();
        const supportedLocales = this.translationManager.getSupportedLocales();

        const choices = [
          {
            name:
              '0. ' + this.translationManager.t('common.menu.returnToPrevious'),
            value: 'back',
            short: this.translationManager.t('cli.options.back'),
          },
          ...supportedLocales.map((locale, index) => ({
            name: `${index + 1}. ${this.getLanguageDisplayName(locale)} ${currentLocale === locale ? chalk.green(`(${this.translationManager.t('cli.languageMenu.current')})`) : ''}`,
            value: locale,
            short: this.getLanguageDisplayName(locale),
          })),
        ];

        const inquirer = await import('inquirer');
        const result = await inquirer.default.prompt([
          {
            type: 'list',
            name: 'language',
            message: this.translationManager.t('cli.prompts.selectLanguage'),
            choices,
            default: currentLocale,
            pageSize: 10,
          },
        ]);

        if (result.language === 'back') {
          running = false;
        } else if (result.language !== currentLocale) {
          await this.changeLanguage(result.language);
        }
      }
    } catch (error) {
      this.logger.error(
        this.translationManager.t('startup.languageSettingsError'),
        error,
      );
      console.error(chalk.red('❌ Language settings error:'), error);
    }
  }

  private async loggingSettings(): Promise<void> {
    try {
      const loggingSettings = new LoggingSettings(this.container);
      await loggingSettings.start();
    } catch (error) {
      this.logger.error(
        this.translationManager.t('startup.loggingSettingsError'),
        error,
      );
      console.error(chalk.red('❌ Logging settings error:'), error);
      await this.pressAnyKey();
    }
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

  private showLanguageHeader(): void {
    const title = this.translationManager.t('cli.languageMenu.title');
    const subtitle = this.translationManager.t('cli.languageMenu.subtitle');
    const currentLocale = this.translationManager.getCurrentLocale();
    const displayLanguage = this.getLanguageDisplayName(currentLocale);

    const borderLine = '─'.repeat(79);

    console.log(chalk.blue(borderLine));
    console.log(chalk.blue(title.padStart((79 + title.length) / 2).padEnd(79)));
    console.log(chalk.blue(borderLine));
    console.log(
      chalk.blue(subtitle.padStart((79 + subtitle.length) / 2).padEnd(79)),
    );
    console.log(chalk.blue(borderLine));
    console.log(
      chalk.blue(
        `${this.translationManager.t('cli.languageMenu.currentLanguage')}: ${displayLanguage}`,
      ),
    );
    console.log();
  }

  private async changeLanguage(newLocale: SupportedLocale): Promise<void> {
    try {
      const currentLocale = this.translationManager.getCurrentLocale();

      // Log the configuration change
      this.uiManager.logConfigChange('language.ui', currentLocale, newLocale);

      this.translationManager.setLocale(newLocale);
      this.configManager.set('language.ui', newLocale);
      await this.configManager.save();

      console.log();
      console.log(
        chalk.green(
          '✅ ' + this.translationManager.t('success.settingsUpdated'),
        ),
      );
      console.log(
        chalk.gray(
          `   ${this.translationManager.t('cli.prompts.selectLanguage')}: ${this.getLanguageDisplayName(newLocale)}`,
        ),
      );
      console.log();

      await this.pressAnyKey();
    } catch (error) {
      this.logger.error(
        this.translationManager.t('startup.failedToChangeLanguage'),
        error,
      );
      console.error(chalk.red('❌ Failed to change language:'), error);
      await this.pressAnyKey();
    }
  }
}
