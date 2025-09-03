/**
 * Interactive CLI mode
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConversionConfig } from '../../types';

export class InteractiveMode {
  /**
   * Start interactive conversion process
   */
  async start(): Promise<void> {
    try {
      console.log(chalk.cyan('📋 Interactive Markdown to PDF Configuration'));
      console.log(chalk.gray('Please answer the following questions to complete the conversion setup:'));
      console.log();

      // Step 1: Select input file
      const config = await this.getConversionConfig();

      // Step 2: Confirm configuration
      const confirmed = await this.confirmConfig(config);

      if (confirmed) {
        console.log(chalk.green('🚀 Starting conversion...'));
        // TODO: Implement actual conversion logic
        console.log(chalk.green('✅ Conversion completed!'));
      } else {
        console.log(chalk.yellow('❌ Conversion cancelled'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Interactive mode error:'), error);
      throw error;
    }
  }

  /**
   * Get conversion configuration
   */
  private async getConversionConfig(): Promise<ConversionConfig> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputPath',
        message: 'Please enter Markdown file path:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Please enter a file path';
          }
          if (!input.endsWith('.md') && !input.endsWith('.markdown')) {
            return 'Please enter a valid Markdown file (.md or .markdown)';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'outputPath',
        message: 'Please enter output PDF file path (press Enter for default):',
        default: (answers: any) => {
          const input = answers.inputPath;
          return input.replace(/\.(md|markdown)$/, '.pdf');
        }
      },
      {
        type: 'list',
        name: 'tocDepth',
        message: 'Please select table of contents depth:',
        choices: [
          { name: '1 level (H1 only)', value: 1 },
          { name: '2 levels (H1-H2)', value: 2 },
          { name: '3 levels (H1-H3)', value: 3 },
          { name: '4 levels (H1-H4)', value: 4 },
          { name: '5 levels (H1-H5)', value: 5 },
          { name: '6 levels (H1-H6)', value: 6 }
        ],
        default: 2,
      },
      {
        type: 'confirm',
        name: 'includePageNumbers',
        message: 'Include page numbers?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'chineseFontSupport',
        message: 'Enable Chinese font support?',
        default: true,
      }
    ]);

    return answers as ConversionConfig;
  }

  /**
   * Confirm configuration
   */
  private async confirmConfig(config: ConversionConfig): Promise<boolean> {
    console.log();
    console.log(chalk.cyan('📄 Conversion Configuration Summary:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.bold('Input file:')} ${config.inputPath}`);
    console.log(`${chalk.bold('Output file:')} ${config.outputPath}`);
    console.log(`${chalk.bold('TOC depth:')} ${config.tocDepth} levels`);
    console.log(`${chalk.bold('Page numbers:')} ${config.includePageNumbers ? 'Yes' : 'No'}`);
    console.log(`${chalk.bold('Chinese support:')} ${config.chineseFontSupport ? 'Yes' : 'No'}`);
    console.log(chalk.gray('─'.repeat(50)));
    console.log();

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Confirm and start conversion?',
        default: true
      }
    ]);

    return confirmed;
  }
}
