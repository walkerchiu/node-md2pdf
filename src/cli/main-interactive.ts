/**
 * Main interactive CLI mode
 * Presents options for single file or batch processing
 */

/* eslint-disable prettier/prettier */

import chalk from 'chalk';

import { BatchInteractiveMode } from './batch';
import { CustomizationMode } from './customization-mode';
import { InteractiveMode } from './interactive';
import { SettingsMode } from './settings-mode';
import { SmartConversionMode } from './smart-conversion-mode';
import { CliRenderer } from './utils/cli-renderer';

import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

export class MainInteractiveMode {
  private logger: ILogger;
  private renderer: CliRenderer;

  constructor(private readonly container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.renderer = new CliRenderer();
  }

  /**
   * Start main interactive mode
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting main interactive mode');

      // Main menu loop - keep showing menu until user exits
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.showWelcomeMessage();
        const mode = await this.selectMode();

        switch (mode) {
          case 'smart': {
            this.logger.info('User selected smart conversion mode');
            const smartMode = new SmartConversionMode(this.container);
            await smartMode.start();
            // After smart conversion, continue to main menu
            break;
          }
          case 'single': {
            this.logger.info('User selected single file mode');
            const singleMode = new InteractiveMode(this.container);
            let retryCount = 0;
            const maxRetries = 5;

            while (retryCount < maxRetries) {
              try {
                await singleMode.start();
                break; // Success, exit retry loop
              } catch (error) {
                if (error instanceof Error && error.message === 'USER_CANCELLED') {
                  this.logger.info('Single file mode cancelled by user');
                  break; // User cancelled, exit retry loop and continue to main menu
                } else if (error instanceof Error && error.message === 'USER_RETRY') {
                  retryCount++;
                  this.logger.info(`User requested retry (attempt ${retryCount}/${maxRetries})`);
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
            this.logger.info('User selected batch mode');
            const batchMode = new BatchInteractiveMode(this.container);
            await batchMode.start();
            // After batch conversion, continue to main menu
            break;
          }
          case 'customization': {
            this.logger.info('User selected customization mode');
            const customizationMode = new CustomizationMode(this.container);
            await customizationMode.start();
            // After customization, continue to main menu
            break;
          }
          case 'settings': {
            this.logger.info('User selected settings mode');
            const settingsMode = new SettingsMode(this.container);
            await settingsMode.start();
            // After settings, continue to main menu
            break;
          }
          case 'exit':
            this.logger.info('User selected exit');
            this.renderer.info(chalk.cyan('👋 Goodbye!'));
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
    this.renderer.header([
      '┌──────────────────────────────────────────┐',
      '│           MD2PDF Main Menu               │',
      '├──────────────────────────────────────────┤',
      '│  Convert Markdown files to professional  │',
      '│  PDF documents with table of contents    │',
      '└──────────────────────────────────────────┘',
    ]);
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
        message: 'How would you like to process your files?',
        choices: [
          {
            name: `🤖 Smart Conversion ${chalk.gray('- AI-powered settings with 3-step workflow')}`,
            value: 'smart',
            short: 'Smart Conversion',
          },
          {
            name: `📄 Single File ${chalk.gray('- Convert one Markdown file to PDF')}`,
            value: 'single',
            short: 'Single File',
          },
          {
            name: `📚 Batch Processing ${chalk.gray('- Convert multiple files at once')}`,
            value: 'batch',
            short: 'Batch Processing',
          },
          {
            name: `🎨 Customization ${chalk.gray('- Advanced styling and templates')}`,
            value: 'customization',
            short: 'Customization',
          },
          {
            name: `🔧 Settings ${chalk.gray('- Language and preferences')}`,
            value: 'settings',
            short: 'Settings',
          },
          {
            name: '🚪 Exit',
            value: 'exit',
            short: 'Exit',
          },
        ],
        default: 'smart',
        pageSize: 8,
      },
    ]);

    return result.mode;
  }
}
