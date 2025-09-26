/**
 * Interactive CLI mode
 */

import chalk from 'chalk';
import ora from 'ora';

import { APPLICATION_SERVICE_NAMES } from '../../application/container';
import { ConversionConfig } from '../../types';

import type { IFileProcessorService } from '../../application/services/file-processor.service';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';
import type { ServiceContainer } from '../../shared/container';

type InquirerModule = {
  default: {
    prompt: <T = Record<string, unknown>>(questions: unknown) => Promise<T>;
  };
};

export class InteractiveMode {
  private logger: ILogger;
  private errorHandler: IErrorHandler;
  private fileProcessorService: IFileProcessorService;

  constructor(container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.errorHandler = container.resolve<IErrorHandler>('errorHandler');
    this.fileProcessorService = container.resolve<IFileProcessorService>(
      APPLICATION_SERVICE_NAMES.FILE_PROCESSOR
    );
  }

  /**
   * Start interactive conversion process
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting interactive conversion process');
      this.logger.info(
        chalk.cyan('📋 Interactive Markdown to PDF Configuration'),
      );
      this.logger.info(
        chalk.gray(
          'Please answer the following questions to complete the conversion setup:',
        ),
      );
      this.logger.info('');

      // Step 1: Select input file (file confirmation is now done during input)
      const config = await this.getConversionConfig();

      // Step 2: Confirm configuration
      const confirmed = await this.confirmConfig(config);

      if (confirmed) {
        await this.performConversion(config);
      } else {
        this.logger.info('User cancelled conversion');
        this.logger.warn(chalk.yellow('❌ Conversion cancelled'));
      }
    } catch (error) {
      this.logger.error('Interactive mode error', error as Error);
      await this.errorHandler.handleError(
        error as Error,
        'InteractiveMode.start',
      );
      this.logger.error(
        chalk.red('❌ Interactive mode error:'),
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Get conversion configuration
   */
  private async getConversionConfig(): Promise<ConversionConfig> {
    const inquirer = await import('inquirer');
    const answers = await (
      inquirer as InquirerModule
    ).default.prompt<ConversionConfig>([
      {
        type: 'input',
        name: 'inputPath',
        message: 'Please enter Markdown file path:',
        validate: async (input: string): Promise<boolean | string> => {
          if (!input.trim()) {
            return 'Please enter a file path';
          }
          if (!input.endsWith('.md') && !input.endsWith('.markdown')) {
            return 'Please enter a valid Markdown file (.md or .markdown)';
          }

          // Check if file exists and show confirmation immediately
          const { existsSync, statSync } = await import('fs');
          const path = await import('path');

          if (!existsSync(input.trim())) {
            return `File not found: ${input.trim()}`;
          }

          // Show file confirmation immediately after validation
          const stats = statSync(input.trim());
          const relativePath =
            path.relative(process.cwd(), input.trim()) || input.trim();

          this.logger.info('\n🔍 Searching for file...');
          this.logger.info('─'.repeat(50));
          this.logger.info(`📁 File found: ${relativePath}`);
          this.logger.info(`📄 Size: ${this.formatBytes(stats.size)}`);
          this.logger.info(`⏰ Modified: ${stats.mtime.toLocaleString()}`);
          this.logger.info('─'.repeat(50));

          return true;
        },
      },
      {
        type: 'input',
        name: 'outputPath',
        message: 'Please enter output PDF file path (press Enter for default):',
        default: (answers: any) => {
          const input = answers.inputPath;
          return input.replace(/\.(md|markdown)$/, '.pdf');
        },
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
          { name: '6 levels (H1-H6)', value: 6 },
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
        message:
          'Enable Chinese font support? (Choose "No" for faster processing and smaller file size when document contains only English text)',
        default: true,
      },
    ]);

    return answers;
  }

  /**
   * Confirm configuration
   */
  private async confirmConfig(config: ConversionConfig): Promise<boolean> {
    this.logger.info('');
    this.logger.info(chalk.cyan('📄 Conversion Configuration Summary:'));
    this.logger.info(chalk.gray('─'.repeat(50)));
    this.logger.info(`${chalk.bold('Input file:')} ${config.inputPath}`);
    this.logger.info(`${chalk.bold('Output file:')} ${config.outputPath}`);
    this.logger.info(`${chalk.bold('TOC depth:')} ${config.tocDepth} levels`);
    this.logger.info(
      `${chalk.bold('Page numbers:')} ${config.includePageNumbers ? 'Yes' : 'No'}`,
    );
    this.logger.info(
      `${chalk.bold('Chinese support:')} ${config.chineseFontSupport ? 'Yes' : 'No'}`,
    );
    this.logger.info(chalk.gray('─'.repeat(50)));
    this.logger.info('');

    const inquirer = await import('inquirer');
    const { confirmed } = await (inquirer as InquirerModule).default.prompt<{ confirmed: boolean }>(
      [
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Confirm and start conversion?',
          default: true,
        },
      ]
    );

    return confirmed;
  }

  /**
   * Perform the actual conversion process
   */
  private async performConversion(config: ConversionConfig): Promise<void> {
    const spinner = ora('🚀 Starting conversion process...').start();

    try {
      this.logger.info('Starting file conversion', {
        inputPath: config.inputPath,
        outputPath: config.outputPath,
      });

      // Step 1: Prepare processing options
      spinner.text = '🔧 Preparing conversion options...';
      const outputPath =
        config.outputPath ||
        config.inputPath.replace(/\.(md|markdown)$/, '.pdf');

      const processingOptions: any = {
        outputPath,
        includeTOC: true,
        tocOptions: {
          maxDepth: config.tocDepth,
          includePageNumbers: config.includePageNumbers,
          title: '目錄',
        },
        pdfOptions: {
          margin: {
            top: '1in',
            right: '1in',
            bottom: '1in',
            left: '1in',
          },
          displayHeaderFooter: config.includePageNumbers,
          footerTemplate: config.includePageNumbers
            ? '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
            : '',
          printBackground: true,
        },
      };

      // Step 2: Add Chinese font support CSS if needed
      if (config.chineseFontSupport) {
        processingOptions.customStyles = `
          * {
            font-family: 'Noto Sans CJK SC', Arial, sans-serif !important;
          }
        `;
      }

      // Step 3: Process the file using application service
      spinner.text = '📖 Processing Markdown to PDF...';
      const result = await this.fileProcessorService.processFile(
        config.inputPath,
        processingOptions,
      );

      this.logger.info('File conversion completed successfully', {
        inputPath: result.inputPath,
        outputPath: result.outputPath,
        processingTime: result.processingTime,
        fileSize: result.fileSize,
      });

      spinner.succeed(chalk.green('✅ Conversion completed successfully!'));
      this.logger.info('');
      this.logger.info(chalk.cyan('📄 Conversion Results:'));
      this.logger.info(chalk.gray('─'.repeat(50)));
      this.logger.info(`${chalk.bold('Input file:')} ${result.inputPath}`);
      this.logger.info(`${chalk.bold('Output file:')} ${result.outputPath}`);
      this.logger.info(
        `${chalk.bold('File size:')} ${this.formatBytes(result.fileSize)}`,
      );
      this.logger.info(
        `${chalk.bold('Processing time:')} ${result.processingTime}ms`,
      );
      if (result.parsedContent.headings) {
        this.logger.info(
          `${chalk.bold('Headings found:')} ${result.parsedContent.headings.length}`,
        );
      }
      this.logger.info(chalk.gray('─'.repeat(50)));
      this.logger.info('');
    } catch (error) {
      spinner.fail(chalk.red('❌ Conversion failed!'));
      this.logger.error('Conversion failed in interactive mode', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
