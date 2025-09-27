/**
 * Interactive CLI mode
 */

import chalk from 'chalk';
import ora from 'ora';

import { APPLICATION_SERVICE_NAMES } from '../../application/container';
import { ConversionConfig } from '../../types';

import type { IFileProcessorService } from '../../application/services/file-processor.service';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { IFileSystemManager } from '../../infrastructure/filesystem/types';
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
  private fileSystemManager: IFileSystemManager | undefined;

  constructor(container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.errorHandler = container.resolve<IErrorHandler>('errorHandler');
    this.fileProcessorService = container.resolve<IFileProcessorService>(
      APPLICATION_SERVICE_NAMES.FILE_PROCESSOR,
    );
    // fileSystem is optional in some test setups, tryResolve will return undefined when not registered
    this.fileSystemManager =
      container.tryResolve<IFileSystemManager>('fileSystem');
  }

  /**
   * Start interactive conversion process
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting interactive conversion process');
      console.log('Starting interactive conversion process');
      this.logger.info(
        chalk.cyan('📋 Interactive Markdown to PDF Configuration'),
      );
      console.log(chalk.cyan('📋 Interactive Markdown to PDF Configuration'));
      this.logger.info(
        chalk.cyan('📋 Interactive Markdown to PDF Configuration'),
      );
      this.logger.info(
        chalk.gray(
          'Please answer the following questions to complete the conversion setup:',
        ),
      );
      console.log(
        // eslint-disable-next-line prettier/prettier
        chalk.gray('Please answer the following questions to complete the conversion setup:')
      );
      this.logger.info('');
      console.log('');

      // Step 1: Select input file (file confirmation is now done during input)
      const config = await this.getConversionConfig();

      // Step 2: Confirm configuration
      const confirmed = await this.confirmConfig(config);

      if (confirmed) {
        await this.performConversion(config);
      } else {
        this.logger.info('User cancelled conversion');
        console.log('❌ Conversion cancelled');
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
      console.error(chalk.red('❌ Interactive mode error:'), error as Error);
      throw error;
    }
  }

  /**
   * Get conversion configuration
   */
  private async getConversionConfig(): Promise<ConversionConfig> {
    const inquirer = await import('inquirer');

    // First prompt only for inputPath so we can search and show matching files.
    const { inputPath } = await (inquirer as InquirerModule).default.prompt<{
      inputPath: string;
    }>([
      {
        type: 'input',
        name: 'inputPath',
        message: 'Please enter Markdown file path or glob pattern:',
        validate: (input: string): boolean | string => {
          if (!input.trim()) {
            return 'Please enter a file path';
          }
          if (
            !input.endsWith('.md') &&
            !input.endsWith('.markdown') &&
            !input.includes('*')
          ) {
            return 'Please enter a valid Markdown file (.md or .markdown)';
          }

          return true;
        },
      },
    ]);

    // Search for matching files and display results if a file system manager is available
    let selectedInputPath = inputPath;
    if (!this.fileSystemManager) {
      this.logger.warn(
        'File system manager not available, skipping file search',
      );
      console.log('File system manager not available, skipping file search');
    } else {
      try {
        const matches = await this.fileSystemManager.findFiles(
          inputPath,
          process.cwd(),
        );
        if (matches && matches.length > 0) {
          this.logger.info(`Found ${matches.length} file(s)`);
          // If multiple matches, prompt the user to select one
          // Delegate display to shared UI helper
          const FileSearchUI = (await import('../ui/file-search-ui')).default;
          if (matches.length === 1) {
            FileSearchUI.displayFiles(matches, 1);
            selectedInputPath = matches[0];
          } else {
            FileSearchUI.displayFiles(matches);
            const inquirer = await import('inquirer');
            const { chosen } = await (inquirer as InquirerModule).default.prompt<{
              chosen: string;
            }>([
              {
                type: 'list',
                name: 'chosen',
                message: 'Select a file to convert:',
                choices: matches,
                default: matches[0],
              },
            ]);
            selectedInputPath = chosen;
          }
        } else {
          this.logger.warn('No files matched the provided path/pattern');
          console.log('No files matched the provided path/pattern');
        }
      } catch (err) {
        this.logger.warn('Error while searching for files', err as Error);
        console.log('Error while searching for files');
      }
    }

    // Then prompt remaining options, using the provided inputPath to compute defaults
    const remaining = await (inquirer as InquirerModule).default.prompt<ConversionConfig>([
      {
        type: 'input',
        name: 'outputPath',
        message: 'Please enter output PDF file path (press Enter for default):',
        // Accept answers parameter so tests can call the default function with an answers object
        default: (answers: { inputPath?: string } = {}): string => {
          // Prefer explicit answers.inputPath (used in tests) before falling back to selectedInputPath
          const input = answers.inputPath || selectedInputPath || inputPath || '';
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

    const combined = Object.assign(
      { inputPath: selectedInputPath },
      remaining as Partial<ConversionConfig>
    );
    return combined as ConversionConfig;
  }

  /**
   * Confirm configuration
   */
  private async confirmConfig(config: ConversionConfig): Promise<boolean> {
    this.logger.info('');
    console.log('');
    this.logger.info(chalk.cyan('📄 Conversion Configuration Summary:'));
    console.log(chalk.cyan('📄 Conversion Configuration Summary:'));
    this.logger.info(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('─'.repeat(50)));
    this.logger.info(`${chalk.bold('Input file:')} ${config.inputPath}`);
    console.log(`Input file: ${config.inputPath}`);
    this.logger.info(`${chalk.bold('Output file:')} ${config.outputPath}`);
    console.log(`Output file: ${config.outputPath}`);
    this.logger.info(`${chalk.bold('TOC depth:')} ${config.tocDepth} levels`);
    console.log(`TOC depth: ${config.tocDepth} levels`);
    this.logger.info(
      `${chalk.bold('Page numbers:')} ${config.includePageNumbers ? 'Yes' : 'No'}`,
    );
    console.log(`Page numbers: ${config.includePageNumbers ? 'Yes' : 'No'}`);
    this.logger.info(
      `${chalk.bold('Chinese support:')} ${config.chineseFontSupport ? 'Yes' : 'No'}`,
    );
    console.log(`Chinese support: ${config.chineseFontSupport ? 'Yes' : 'No'}`);
    this.logger.info(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('─'.repeat(50)));
    this.logger.info('');
    console.log('');

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

      const processingOptions: Record<string, unknown> = {
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
      console.log('');
      this.logger.info(chalk.cyan('📄 Conversion Results:'));
      console.log('📄 Conversion Results:');
      this.logger.info(chalk.gray('─'.repeat(50)));
      console.log('─'.repeat(50));
      this.logger.info(`${chalk.bold('Input file:')} ${result.inputPath}`);
      console.log(`Input file: ${result.inputPath}`);
      this.logger.info(`${chalk.bold('Output file:')} ${result.outputPath}`);
      console.log(`Output file: ${result.outputPath}`);
      this.logger.info(
        `${chalk.bold('File size:')} ${this.formatBytes(result.fileSize)}`,
      );
      console.log(`File size: ${this.formatBytes(result.fileSize)}`);
      this.logger.info(
        `${chalk.bold('Processing time:')} ${result.processingTime}ms`,
      );
      console.log(`Processing time: ${result.processingTime}ms`);
      if (result.parsedContent.headings) {
        this.logger.info(
          `${chalk.bold('Headings found:')} ${result.parsedContent.headings.length}`,
        );
        console.log(`Headings found: ${result.parsedContent.headings.length}`);
      }
      this.logger.info(chalk.gray('─'.repeat(50)));
      console.log(chalk.gray('─'.repeat(50)));
      this.logger.info('');
      console.log('');
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
