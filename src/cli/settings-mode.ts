/**
 * Settings mode for language preferences and system configuration
 * Provides access to language settings, defaults, and preferences
 */

import chalk from 'chalk';

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

  constructor(private readonly container: ServiceContainer) {
    this.logger = this.container.resolve<ILogger>('logger');
    this.translationManager =
      this.container.resolve<ITranslationManager>('translator');
    this.configManager = this.container.resolve<IConfigManager>('config');
  }

  /**
   * Start settings mode
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting settings mode');

      let running = true;
      while (running) {
        this.showSettingsHeader();
        const option = await this.selectSettingsOption();

        switch (option) {
          case 'language':
            await this.languageSettings();
            break;
          case 'defaults':
            await this.defaultSettings();
            break;
          case 'performance':
            await this.performanceSettings();
            break;
          case 'cache':
            await this.cacheSettings();
            break;
          case 'logging':
            await this.loggingSettings();
            break;
          case 'reset':
            await this.resetSettings();
            break;
          case 'export':
            await this.exportSettings();
            break;
          case 'import':
            await this.importSettings();
            break;
          case 'back':
            this.logger.info('Returning to main menu from settings');
            running = false;
            break;
        }
      }
    } catch (error) {
      this.logger.error('Settings mode error', error);
      console.error(chalk.red('❌ Settings error:'), error);
      throw error;
    }
  }

  /**
   * Show settings header
   */
  private showSettingsHeader(): void {
    console.log(chalk.blue('┌───────────────────────────────────────────┐'));
    const currentLocale = this.translationManager.getCurrentLocale();
    const displayLanguage = this.getLanguageDisplayName(currentLocale);

    console.log(chalk.blue('│           🔧 Settings & Preferences       │'));
    console.log(chalk.blue('├───────────────────────────────────────────┤'));
    console.log(
      chalk.blue(`│  Current Language: ${displayLanguage.padEnd(20)}   │`),
    );
    console.log(chalk.blue('└───────────────────────────────────────────┘'));
  }

  private getLanguageDisplayName(locale: SupportedLocale): string {
    const displayNames: Record<SupportedLocale, string> = {
      en: 'English',
      'zh-TW': '正體中文 (Traditional Chinese)',
    };
    return displayNames[locale] || locale;
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
        message: 'Select settings option:',
        choices: [
          { name: '0. Return to Main Menu', value: 'back', short: 'Back' },
          {
            name: '1. Language & Localization',
            value: 'language',
            short: 'Language Settings',
          },
          {
            name: '2. Default Preferences',
            value: 'defaults',
            short: 'Default Settings',
          },
          {
            name: '3. Performance & Memory',
            value: 'performance',
            short: 'Performance Settings',
          },
          {
            name: '4. Cache Management',
            value: 'cache',
            short: 'Cache Settings',
          },
          {
            name: '5. Logging & Diagnostics',
            value: 'logging',
            short: 'Logging Settings',
          },
          {
            name: '6. Reset to Factory Defaults',
            value: 'reset',
            short: 'Reset Settings',
          },
          {
            name: '7. Export Configuration',
            value: 'export',
            short: 'Export Settings',
          },
          {
            name: '8. Import Configuration',
            value: 'import',
            short: 'Import Settings',
          },
        ],
        default: 'language',
        pageSize: 12,
      },
    ]);

    return result.option;
  }

  // Language settings implementation
  private async languageSettings(): Promise<void> {
    try {
      let running = true;

      while (running) {
        console.clear();
        this.showLanguageHeader();

        const currentLocale = this.translationManager.getCurrentLocale();
        const supportedLocales = this.translationManager.getSupportedLocales();

        const choices = [
          { name: '0. Return to Settings Menu', value: 'back', short: 'Back' },
          ...supportedLocales.map((locale, index) => ({
            name: `${index + 1}. ${this.getLanguageDisplayName(locale)} ${currentLocale === locale ? chalk.green('(Current)') : ''}`,
            value: locale,
            short: this.getLanguageDisplayName(locale),
          })),
        ];

        const inquirer = await import('inquirer');
        const result = await inquirer.default.prompt([
          {
            type: 'list',
            name: 'language',
            message: 'Select language:',
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
      this.logger.error('Language settings error', error);
      console.error(chalk.red('❌ Language settings error:'), error);
    }
  }

  private async defaultSettings(): Promise<void> {
    console.log(chalk.yellow('Default Settings features coming soon...'));
    await this.pressAnyKey();
  }

  private async performanceSettings(): Promise<void> {
    console.log(
      chalk.yellow('⚡ Performance Settings features coming soon...'),
    );
    await this.pressAnyKey();
  }

  private async cacheSettings(): Promise<void> {
    console.log(chalk.yellow('🗄️ Cache Settings features coming soon...'));
    await this.pressAnyKey();
  }

  private async loggingSettings(): Promise<void> {
    console.log(chalk.yellow('📝 Logging Settings features coming soon...'));
    await this.pressAnyKey();
  }

  private async resetSettings(): Promise<void> {
    console.log(chalk.yellow('🔄 Reset Settings features coming soon...'));
    await this.pressAnyKey();
  }

  private async exportSettings(): Promise<void> {
    console.log(chalk.yellow('📤 Export Settings features coming soon...'));
    await this.pressAnyKey();
  }

  private async importSettings(): Promise<void> {
    console.log(chalk.yellow('📥 Import Settings features coming soon...'));
    await this.pressAnyKey();
  }

  private async pressAnyKey(): Promise<void> {
    const inquirer = await import('inquirer');
    await inquirer.default.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      },
    ]);
  }

  private showLanguageHeader(): void {
    console.log(chalk.blue('┌───────────────────────────────────────────┐'));
    console.log(chalk.blue('│          🌐 Language & Localization       │'));
    console.log(chalk.blue('├───────────────────────────────────────────┤'));
    console.log(chalk.blue('│     Choose your preferred language        │'));
    console.log(chalk.blue('└───────────────────────────────────────────┘'));
    console.log();
  }

  private async changeLanguage(newLocale: SupportedLocale): Promise<void> {
    try {
      this.translationManager.setLocale(newLocale);
      this.configManager.set('language.default', newLocale);
      await this.configManager.save();

      console.log();
      console.log(chalk.green('✅ Language changed successfully!'));
      console.log(
        chalk.gray(
          `   New language: ${this.getLanguageDisplayName(newLocale)}`,
        ),
      );
      console.log();

      await this.pressAnyKey();
    } catch (error) {
      this.logger.error('Failed to change language', error);
      console.error(chalk.red('❌ Failed to change language:'), error);
      await this.pressAnyKey();
    }
  }
}
