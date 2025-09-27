/**
 * Main interactive CLI mode
 * Presents options for single file or batch processing
 */

import chalk from 'chalk';

import { BatchInteractiveMode } from './batch';
import { InteractiveMode } from './interactive';

import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

export class MainInteractiveMode {
  private logger: ILogger;

  constructor(private readonly container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
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
          case 'single': {
            this.logger.info('User selected single file mode');
            const singleMode = new InteractiveMode(this.container);
            await singleMode.start();
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
          case 'exit':
            this.logger.info('User selected exit');
            // eslint-disable-next-line no-console
            console.log(chalk.cyan('👋 Goodbye!'));
            return;
        }
      }
    } catch (error) {
      this.logger.error('Main interactive mode error', error);
      // eslint-disable-next-line no-console
      console.error(chalk.red('❌ Main interactive mode error:'), error);
      throw error;
    }
  }

  /**
   * Show welcome message
   */
  private showWelcomeMessage(): void {
    // eslint-disable-next-line no-console
    console.log(chalk.cyan('┌─────────────────────────────────────────┐'));
    // eslint-disable-next-line no-console
    console.log(chalk.cyan('│           MD2PDF Main Menu              │'));
    // eslint-disable-next-line no-console
    console.log(chalk.cyan('├─────────────────────────────────────────┤'));
    // eslint-disable-next-line no-console
    console.log(chalk.cyan('│  Convert Markdown files to professional │'));
    // eslint-disable-next-line no-console
    console.log(chalk.cyan('│  PDF documents with table of contents   │'));
    // eslint-disable-next-line no-console
    console.log(chalk.cyan('└─────────────────────────────────────────┘'));
    // eslint-disable-next-line no-console
    console.log();
  }

  /**
   * Select processing mode
   */
  private async selectMode(): Promise<'single' | 'batch' | 'exit'> {
    const inquirer = await import('inquirer');
    const { mode } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'How would you like to process your files?',
        choices: [
          {
            name: '📄 Single File - Convert one Markdown file to PDF',
            value: 'single',
            short: 'Single File',
          },
          {
            name: '📦 Batch Processing - Convert multiple files at once',
            value: 'batch',
            short: 'Batch Processing',
          },
          {
            name: '🚪 Exit',
            value: 'exit',
            short: 'Exit',
          },
        ],
        default: 'single',
      },
    ]);
    return mode;
  }
}
