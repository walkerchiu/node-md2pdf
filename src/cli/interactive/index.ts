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
import type { ITranslationManager } from '../../infrastructure/i18n/types';
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
  private translationManager: ITranslationManager;
  private fileProcessorService: IFileProcessorService;
  private fileSystemManager: IFileSystemManager | undefined;

  constructor(container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.errorHandler = container.resolve<IErrorHandler>('errorHandler');
    this.translationManager =
      container.resolve<ITranslationManager>('translator');
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
      console.log(this.translationManager.t('interactive.starting'));
      this.logger.info(
        chalk.cyan(this.translationManager.t('interactive.title')),
      );
      console.log(chalk.cyan(this.translationManager.t('interactive.title')));
      this.logger.info(
        chalk.gray(this.translationManager.t('interactive.subtitle')),
      );
      console.log(
        chalk.gray(this.translationManager.t('interactive.subtitle')),
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
        console.log(this.translationManager.t('interactive.cancelled'));
        this.logger.warn(
          chalk.yellow(this.translationManager.t('interactive.cancelled')),
        );
      }
    } catch (error) {
      // Don't log our internal control flow errors
      if (
        error instanceof Error &&
        (error.message === 'USER_CANCELLED' || error.message === 'USER_RETRY')
      ) {
        throw error; // Re-throw without logging
      }

      this.logger.error('Interactive mode error', error as Error);
      await this.errorHandler.handleError(
        error as Error,
        'InteractiveMode.start',
      );
      this.logger.error(
        chalk.red(
          this.translationManager.t('interactive.interactiveModeError'),
        ),
        error as Error,
      );
      console.error(
        chalk.red(
          this.translationManager.t('interactive.interactiveModeError'),
        ),
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

    // First prompt only for inputPath so we can search and show matching files.
    const { inputPath } = await (inquirer as InquirerModule).default.prompt<{
      inputPath: string;
    }>([
      {
        type: 'input',
        name: 'inputPath',
        message: this.translationManager.t('interactive.enterFilePath'),
        validate: (input: string): boolean | string => {
          if (!input.trim()) {
            return this.translationManager.t('interactive.pleaseEnterFilePath');
          }
          if (
            !input.endsWith('.md') &&
            !input.endsWith('.markdown') &&
            !input.includes('*')
          ) {
            return this.translationManager.t('interactive.invalidMarkdownFile');
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
      console.log(
        this.translationManager.t('interactive.fileSystemNotAvailable'),
      );
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
          const { FileSearchUI } = await import('../ui/file-search-ui');
          const searchUI = new FileSearchUI(this.translationManager);
          if (matches.length === 1) {
            searchUI.displayFiles(matches, 1);
            selectedInputPath = matches[0];
          } else {
            searchUI.displayFiles(matches);
            const inquirer = await import('inquirer');
            const { chosen } = await (
              inquirer as InquirerModule
            ).default.prompt<{
              chosen: string;
            }>([
              {
                type: 'list',
                name: 'chosen',
                message: this.translationManager.t(
                  'interactive.selectFileToConvert',
                ),
                choices: matches,
                default: matches[0],
              },
            ]);
            selectedInputPath = chosen;
          }
        } else {
          console.log(
            chalk.red(
              this.translationManager.t('interactive.invalidFileError'),
            ),
          );
          console.log(
            chalk.red(
              `   ${this.translationManager.t('interactive.fileExists')}`,
            ),
          );
          console.log(
            chalk.red(
              `   ${this.translationManager.t('interactive.validExtension')}`,
            ),
          );

          // Ask user to retry or exit
          const inquirer2 = await import('inquirer');
          const { action } = await inquirer2.default.prompt<{ action: string }>(
            {
              type: 'list',
              name: 'action',
              message: this.translationManager.t('interactive.whatToDo'),
              choices: [
                {
                  name: this.translationManager.t(
                    'interactive.tryDifferentPath',
                  ),
                  value: 'retry',
                },
                {
                  name: this.translationManager.t(
                    'interactive.returnToMainMenu',
                  ),
                  value: 'exit',
                },
              ],
            },
          );

          if (action === 'exit') {
            this.logger.info('User chose to Return to Main Menu');
            console.log(this.translationManager.t('interactive.cancelled'));
            throw new Error('USER_CANCELLED');
          } else if (action === 'retry') {
            // Throw retry error to be handled by parent
            throw new Error('USER_RETRY');
          }
        }
      } catch (err) {
        // Re-throw our custom errors to be handled by the parent
        if (
          err instanceof Error &&
          (err.message === 'USER_CANCELLED' || err.message === 'USER_RETRY')
        ) {
          throw err;
        }
        this.logger.warn('Error while searching for files', err as Error);
        console.log(
          this.translationManager.t('interactive.errorSearchingFiles'),
        );
      }
    }

    // Then prompt remaining options, using the provided inputPath to compute defaults
    const remaining = await (
      inquirer as InquirerModule
    ).default.prompt<ConversionConfig>([
      {
        type: 'input',
        name: 'outputPath',
        message: this.translationManager.t('interactive.enterOutputPath'),
        // Accept answers parameter so tests can call the default function with an answers object
        default: (answers: { inputPath?: string } = {}): string => {
          // Prefer explicit answers.inputPath (used in tests) before falling back to selectedInputPath
          const input =
            answers.inputPath || selectedInputPath || inputPath || '';
          return input.replace(/\.(md|markdown)$/, '.pdf');
        },
      },
      {
        type: 'list',
        name: 'tocDepth',
        message: this.translationManager.t('interactive.selectTocDepth'),
        choices: [
          {
            name: this.translationManager.t('interactive.tocLevels.1'),
            value: 1,
          },
          {
            name: this.translationManager.t('interactive.tocLevels.2'),
            value: 2,
          },
          {
            name: this.translationManager.t('interactive.tocLevels.3'),
            value: 3,
          },
          {
            name: this.translationManager.t('interactive.tocLevels.4'),
            value: 4,
          },
          {
            name: this.translationManager.t('interactive.tocLevels.5'),
            value: 5,
          },
          {
            name: this.translationManager.t('interactive.tocLevels.6'),
            value: 6,
          },
        ],
        default: 2,
      },
      {
        type: 'confirm',
        name: 'includePageNumbers',
        message: this.translationManager.t('interactive.includePageNumbers'),
        default: true,
      },
      {
        type: 'confirm',
        name: 'chineseFontSupport',
        message: this.translationManager.t('interactive.chineseFontSupport'),
        default: true,
      },
    ]);

    const combined = Object.assign(
      { inputPath: selectedInputPath },
      remaining as Partial<ConversionConfig>,
    );
    return combined as ConversionConfig;
  }

  /**
   * Confirm configuration
   */
  private async confirmConfig(config: ConversionConfig): Promise<boolean> {
    this.logger.info('');
    console.log('');
    this.logger.info(
      chalk.cyan(this.translationManager.t('interactive.conversionSummary')),
    );
    console.log(
      chalk.cyan(this.translationManager.t('interactive.conversionSummary')),
    );
    this.logger.info(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('─'.repeat(50)));
    this.logger.info(
      `${chalk.bold(this.translationManager.t('interactive.inputFile'))} ${config.inputPath}`,
    );
    console.log(
      `${this.translationManager.t('interactive.inputFile')} ${config.inputPath}`,
    );
    this.logger.info(
      `${chalk.bold(this.translationManager.t('interactive.outputFile'))} ${config.outputPath}`,
    );
    console.log(
      `${this.translationManager.t('interactive.outputFile')} ${config.outputPath}`,
    );
    this.logger.info(
      `${chalk.bold(this.translationManager.t('interactive.tocDepth'))} ${config.tocDepth} ${this.translationManager.t('interactive.levels')}`,
    );
    console.log(
      `${this.translationManager.t('interactive.tocDepth')} ${config.tocDepth} ${this.translationManager.t('interactive.levels')}`,
    );
    this.logger.info(
      `${chalk.bold(this.translationManager.t('interactive.pageNumbers'))} ${config.includePageNumbers ? this.translationManager.t('interactive.yes') : this.translationManager.t('interactive.no')}`,
    );
    console.log(
      `${this.translationManager.t('interactive.pageNumbers')} ${config.includePageNumbers ? this.translationManager.t('interactive.yes') : this.translationManager.t('interactive.no')}`,
    );
    this.logger.info(
      `${chalk.bold(this.translationManager.t('interactive.chineseSupport'))} ${config.chineseFontSupport ? this.translationManager.t('interactive.yes') : this.translationManager.t('interactive.no')}`,
    );
    console.log(
      `${this.translationManager.t('interactive.chineseSupport')} ${config.chineseFontSupport ? this.translationManager.t('interactive.yes') : this.translationManager.t('interactive.no')}`,
    );
    this.logger.info(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('─'.repeat(50)));
    this.logger.info('');
    console.log('');

    const inquirer = await import('inquirer');
    const { confirmed } = await (inquirer as InquirerModule).default.prompt<{
      confirmed: boolean;
    }>([
      {
        type: 'confirm',
        name: 'confirmed',
        message: this.translationManager.t('interactive.confirmAndStart'),
        default: true,
      },
    ]);

    return confirmed;
  }

  /**
   * Perform the actual conversion process
   */
  private async performConversion(config: ConversionConfig): Promise<void> {
    const spinner = ora(
      this.translationManager.t('interactive.startingConversion'),
    ).start();

    try {
      this.logger.info('Starting file conversion', {
        inputPath: config.inputPath,
        outputPath: config.outputPath,
      });

      // Step 1: Prepare processing options
      spinner.text = this.translationManager.t('interactive.preparingOptions');
      const outputPath =
        config.outputPath ||
        config.inputPath.replace(/\.(md|markdown)$/, '.pdf');

      const processingOptions: Record<string, unknown> = {
        outputPath,
        includeTOC: true,
        tocOptions: {
          maxDepth: config.tocDepth,
          includePageNumbers: config.includePageNumbers,
          title: this.translationManager.t('pdfContent.tocTitle'),
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
      spinner.text = this.translationManager.t(
        'interactive.processingMarkdown',
      );
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

      spinner.succeed(
        chalk.green(
          this.translationManager.t('interactive.conversionCompleted'),
        ),
      );
      this.logger.info('');
      console.log('');
      this.logger.info(
        chalk.cyan(this.translationManager.t('interactive.conversionResults')),
      );
      console.log(this.translationManager.t('interactive.conversionResults'));
      this.logger.info(chalk.gray('─'.repeat(50)));
      console.log('─'.repeat(50));
      this.logger.info(
        `${chalk.bold(this.translationManager.t('interactive.inputFile'))} ${result.inputPath}`,
      );
      console.log(
        `${this.translationManager.t('interactive.inputFile')} ${result.inputPath}`,
      );
      this.logger.info(
        `${chalk.bold(this.translationManager.t('interactive.outputFile'))} ${result.outputPath}`,
      );
      console.log(
        `${this.translationManager.t('interactive.outputFile')} ${result.outputPath}`,
      );
      this.logger.info(
        `${chalk.bold(this.translationManager.t('interactive.fileSize'))} ${this.formatBytes(result.fileSize)}`,
      );
      console.log(
        `${this.translationManager.t('interactive.fileSize')} ${this.formatBytes(result.fileSize)}`,
      );
      this.logger.info(
        `${chalk.bold(this.translationManager.t('interactive.processingTime'))} ${result.processingTime}ms`,
      );
      console.log(
        `${this.translationManager.t('interactive.processingTime')} ${result.processingTime}ms`,
      );
      if (result.parsedContent.headings) {
        this.logger.info(
          `${chalk.bold(this.translationManager.t('interactive.headingsFound'))} ${result.parsedContent.headings.length}`,
        );
        console.log(
          `${this.translationManager.t('interactive.headingsFound')} ${result.parsedContent.headings.length}`,
        );
      }
      this.logger.info(chalk.gray('─'.repeat(50)));
      console.log(chalk.gray('─'.repeat(50)));
      this.logger.info('');
      console.log('');
    } catch (error) {
      spinner.fail(
        chalk.red(this.translationManager.t('interactive.conversionFailed')),
      );
      this.logger.error('Conversion failed in interactive mode', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = [
      this.translationManager.t('interactive.bytes'),
      this.translationManager.t('interactive.kb'),
      this.translationManager.t('interactive.mb'),
      this.translationManager.t('interactive.gb'),
    ];
    if (bytes === 0) return `0 ${sizes[0]}`;
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
