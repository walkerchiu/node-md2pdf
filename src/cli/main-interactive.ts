/**
 * Main interactive CLI mode
 * Presents options for single file or batch processing
 */

import chalk from 'chalk';

import { BatchInteractiveMode } from './batch';
import { CustomizationMode } from './customization-mode';
import { InteractiveMode } from './interactive';
import { SettingsMode } from './settings-mode';
import { SmartConversionMode } from './smart-conversion-mode';
import { CliRenderer } from './utils/cli-renderer';
import { I18nHelpers } from './utils/i18n-helpers';

import type { ILogger } from '../infrastructure/logging/types';
import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ServiceContainer } from '../shared/container';

export class MainInteractiveMode {
  private logger: ILogger;
  private renderer: CliRenderer;
  private translator: ITranslationManager;
  private i18nHelpers: I18nHelpers;

  constructor(private readonly container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.renderer = new CliRenderer();
    this.translator = container.resolve<ITranslationManager>('translator');
    this.i18nHelpers = new I18nHelpers(this.translator);
  }

  /**
   * Start main interactive mode
   */
  async start(): Promise<void> {
    try {
      this.logger.info(
        this.translator.t('startup.startingMainInteractiveMode'),
      );

      // Main menu loop - keep showing menu until user exits
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.showWelcomeMessage();
        const mode = await this.selectMode();

        switch (mode) {
          case 'smart': {
            this.logger.info(
              this.translator.t('startup.userSelectedSmartMode'),
            );
            const smartMode = new SmartConversionMode(this.container);
            await smartMode.start();
            // After smart conversion, continue to main menu
            break;
          }
          case 'single': {
            this.logger.info(
              this.translator.t('startup.userSelectedSingleMode'),
            );
            const singleMode = new InteractiveMode(this.container);
            let retryCount = 0;
            const maxRetries = 5;

            while (retryCount < maxRetries) {
              try {
                await singleMode.start();
                break; // Success, exit retry loop
              } catch (error) {
                if (
                  error instanceof Error &&
                  error.message === 'USER_CANCELLED'
                ) {
                  this.logger.info('Single file mode cancelled by user');
                  break; // User cancelled, exit retry loop and continue to main menu
                } else if (
                  error instanceof Error &&
                  error.message === 'USER_RETRY'
                ) {
                  retryCount++;
                  this.logger.info(
                    `User requested retry (attempt ${retryCount}/${maxRetries})`,
                  );
                  if (retryCount >= maxRetries) {
                    this.logger.warn('Max retry attempts reached');
                    break; // Exit retry loop after max attempts
                  }
                  // Continue retry loop
                } else {
                  throw error; // Re-throw other errors
                }
              }
            }
            // After single file conversion, continue to main menu
            break;
          }
          case 'batch': {
            this.logger.info(
              this.translator.t('startup.userSelectedBatchMode'),
            );
            const batchMode = new BatchInteractiveMode(this.container);
            await batchMode.start();
            // After batch conversion, continue to main menu
            break;
          }
          case 'customization': {
            this.logger.info(
              this.translator.t('startup.userSelectedCustomizationMode'),
            );
            const customizationMode = new CustomizationMode(this.container);
            await customizationMode.start();
            // After customization, continue to main menu
            break;
          }
          case 'settings': {
            this.logger.info(
              this.translator.t('startup.userSelectedSettingsMode'),
            );
            const settingsMode = new SettingsMode(this.container);
            await settingsMode.start();
            // After settings, continue to main menu
            break;
          }
          case 'exit':
            this.logger.info(this.translator.t('startup.userSelectedExit'));
            this.renderer.info(
              chalk.cyan('👋 ' + this.translator.t('cli.options.goodbye')),
            );
            return;
        }
      }
    } catch (error) {
      this.logger.error('Main interactive mode error', error);
      this.renderer.error(chalk.red('❌ Main interactive mode error:'), error);
      throw error;
    }
  }

  /**
   * Show welcome message
   */
  private showWelcomeMessage(): void {
    const header = this.i18nHelpers.createHeader(
      'cli.mainMenu.title',
      'cli.mainMenu.subtitle',
    );
    this.renderer.header(header);
    this.renderer.newline();
  }

  /**
   * Select processing mode
   */
  private async selectMode(): Promise<
    'smart' | 'single' | 'batch' | 'customization' | 'settings' | 'exit'
  > {
    this.renderer.newline();

    const inquirer = await import('inquirer');

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'mode',
        message: this.translator.t('cli.mainMenu.processPrompt'),
        choices: [
          this.i18nHelpers.createMenuChoice(
            'cli.mainMenu.smartConversion',
            'cli.mainMenu.smartConversionDesc',
            'smart',
          ),
          this.i18nHelpers.createMenuChoice(
            'cli.mainMenu.singleFile',
            'cli.mainMenu.singleFileDesc',
            'single',
          ),
          this.i18nHelpers.createMenuChoice(
            'cli.mainMenu.batchProcessing',
            'cli.mainMenu.batchProcessingDesc',
            'batch',
          ),
          this.i18nHelpers.createMenuChoice(
            'cli.mainMenu.customization',
            'cli.mainMenu.customizationDesc',
            'customization',
          ),
          this.i18nHelpers.createMenuChoice(
            'cli.mainMenu.settings',
            'cli.mainMenu.settingsDesc',
            'settings',
          ),
          {
            name: this.translator.t('cli.mainMenu.exit'),
            value: 'exit',
            short: this.translator.t('cli.mainMenu.exit').replace('🚪 ', ''),
          },
        ],
        default: 'smart',
        pageSize: 8,
      },
    ]);

    return result.mode;
  }
}
