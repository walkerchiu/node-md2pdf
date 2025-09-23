/**
 * Main interactive CLI mode
 * Presents options for single file or batch processing
 */

import chalk from 'chalk';
import { InteractiveMode } from './interactive';
import { BatchInteractiveMode } from './batch';

export class MainInteractiveMode {
  /**
   * Start main interactive mode
   */
  async start(): Promise<void> {
    try {
      this.showWelcomeMessage();
      const mode = await this.selectMode();
      switch (mode) {
        case 'single': {
          const singleMode = new InteractiveMode();
          await singleMode.start();
          break;
        }
        case 'batch': {
          const batchMode = new BatchInteractiveMode();
          await batchMode.start();
          break;
        }
        case 'exit':
          // eslint-disable-next-line no-console
          console.log(chalk.cyan('👋 Goodbye!'));
          return;
      }
    } catch (error) {
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
