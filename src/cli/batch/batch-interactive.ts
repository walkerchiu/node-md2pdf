/**
 * Batch interactive mode
 * Handles user interaction for batch processing
 */

import chalk from 'chalk';

import { APPLICATION_SERVICE_NAMES } from '../../application/container';
import { FileCollector } from '../../core/batch/file-collector';
import { BatchConversionConfig, BatchFilenameFormat } from '../../types/batch';
import { CliUIManager } from '../ui/cli-ui-manager';
import FileSearchUI from '../ui/file-search-ui';

import { BatchProgressUI } from './batch-progress-ui';

import type { IBatchProcessorService } from '../../application/services/batch-processor.service';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { ILogger } from '../../infrastructure/logging/types';
import type { ServiceContainer } from '../../shared/container';

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/explicit-function-return-type */

type InquirerModule = typeof import('inquirer');

export class BatchInteractiveMode {
  private logger: ILogger;
  private errorHandler: IErrorHandler;
  private translationManager: ITranslationManager;
  private batchProcessorService: IBatchProcessorService;
  private progressUI: BatchProgressUI;
  private uiManager: CliUIManager;

  constructor(container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.errorHandler = container.resolve<IErrorHandler>('errorHandler');
    this.translationManager =
      container.resolve<ITranslationManager>('translator');
    this.batchProcessorService = container.resolve<IBatchProcessorService>(
      APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR,
    );
    this.progressUI = new BatchProgressUI(this.translationManager);
    this.uiManager = new CliUIManager(this.translationManager, this.logger);
  }

  /**
   * Start batch interactive mode
   */
  async start(): Promise<void> {
    try {
      this.uiManager.showDebug('Starting batch interactive mode');

      // Show clean batch processing header
      this.uiManager.showHeader(
        this.translationManager.t('batch.title'),
        this.translationManager.t('batch.subtitle'),
      );

      // Show workflow steps
      const steps = [
        this.translationManager.t('batch.step1'),
        this.translationManager.t('batch.step2'),
        this.translationManager.t('batch.step3'),
      ];
      this.uiManager.showSteps(steps);

      // Step 1: Get input pattern and preview files
      const { inputPattern, files } = await this.getInputPatternAndFiles();
      // Step 2: Get remaining batch configuration
      const config = await this.getBatchConfig(inputPattern);
      // Step 3: Add collected files to config
      config.inputFiles = files.map((f) => f.inputPath);
      // Step 4: Final preview with configuration
      const confirmed = await this.finalConfirmation(config, files);
      if (!confirmed) {
        this.uiManager.showWarning(
          this.translationManager.t('batch.batchProcessingCancelled'),
        );
        return;
      }
      // Step 5: Process batch
      await this.processBatch(config);
    } catch (error) {
      await this.errorHandler.handleError(
        error as Error,
        'BatchInteractiveMode.start',
      );
      this.uiManager.showError(
        this.translationManager.t('batch.batchModeError'),
        error as Error,
      );
      throw error;
    } finally {
      this.progressUI.stop();
    }
  }

  /**
   * Get input pattern and preview files early
   */
  private async getInputPatternAndFiles(): Promise<{
    inputPattern: string;
    files: { inputPath: string }[];
  }> {
    const inquirer = (await import('inquirer')) as InquirerModule;

    // Step 1: Ask for input pattern
    const { inputPattern } = (await inquirer.default.prompt([
      {
        type: 'input',
        name: 'inputPattern',
        message:
          this.translationManager.t('batch.enterInputPattern') +
          '\n' +
          this.translationManager.t('batch.patternHints'),
        default: this.translationManager.t('batch.patternPlaceholder'),
        validate: (input: string): boolean | string => {
          if (!input.trim()) {
            return this.translationManager.t('batch.pleaseEnterPattern');
          }
          return true;
        },
      },
    ])) as { inputPattern: string };

    this.logger.info(
      chalk.cyan('\n' + this.translationManager.t('batch.searchingFiles')),
    );

    // Step 2: Immediately search for files using FileCollector
    try {
      const path = await import('path');
      const fileCollector = new FileCollector();
      const fileList = await fileCollector.findFilesByPattern(inputPattern);

      const files = fileList.map((filePath) => ({
        inputPath: path.resolve(filePath),
      }));
      // Print file list directly to stdout to avoid logger timestamps
      const searchUI = new FileSearchUI(this.translationManager);
      searchUI.displayFiles(files.map((f) => f.inputPath));

      if (files.length === 0) {
        this.logger.warn(
          chalk.yellow('\n' + this.translationManager.t('batch.noFilesFound')),
        );
        throw new Error('No files found');
      }

      // Step 3: Confirm file list
      const { confirmFiles } = (await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'confirmFiles',
          message: this.translationManager.t('batch.proceedWithFiles', {
            count: files.length,
          }),
          default: true,
        },
      ])) as { confirmFiles: boolean };
      if (!confirmFiles) {
        this.logger.warn(
          chalk.yellow(
            this.translationManager.t('batch.fileSelectionCancelled'),
          ),
        );
        process.exit(0);
      }
      return { inputPattern, files };
    } catch (error) {
      this.logger.error(
        chalk.red(this.translationManager.t('batch.errorSearchingFiles')),
      );
      this.logger.error(
        chalk.red(
          `   ${error instanceof Error ? error.message : String(error)}`,
        ),
      );

      // Ask if user wants to try again
      const { tryAgain } = (await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'tryAgain',
          message: this.translationManager.t('batch.tryDifferentPattern'),
          default: true,
        },
      ])) as { tryAgain: boolean };

      if (tryAgain) {
        return this.getInputPatternAndFiles(); // Recursive retry
      } else {
        process.exit(0);
      }
    }
  }

  /**
   * Get batch configuration from user (excluding input pattern)
   */
  private async getBatchConfig(
    inputPattern: string,
  ): Promise<BatchConversionConfig> {
    const inquirer = (await import('inquirer')) as InquirerModule;

    this.uiManager.showNewline();
    this.uiManager.showInfo(
      this.translationManager.t('batch.configurationOptions'),
    );
    this.uiManager.showMessage(
      this.translationManager.t('batch.configurationSubtitle'),
    );
    this.uiManager.showNewline();

    const answers = (await inquirer.default.prompt([
      {
        type: 'input',
        name: 'outputDirectory',
        message: this.translationManager.t('batch.enterOutputDirectory'),
        default: './output',
        validate: (input: string): boolean | string => {
          if (!input.trim()) {
            return this.translationManager.t(
              'batch.pleaseEnterOutputDirectory',
            );
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'preserveDirectoryStructure',
        message: this.translationManager.t('batch.preserveDirectoryStructure'),
        default: true,
      },
      {
        type: 'list',
        name: 'filenameFormat',
        message: this.translationManager.t('batch.selectFilenameFormat'),
        choices: [
          {
            name: this.translationManager.t('batch.filenameFormats.original'),
            value: BatchFilenameFormat.ORIGINAL,
          },
          {
            name: this.translationManager.t(
              'batch.filenameFormats.withTimestamp',
            ),
            value: BatchFilenameFormat.WITH_TIMESTAMP,
          },
          {
            name: this.translationManager.t('batch.filenameFormats.withDate'),
            value: BatchFilenameFormat.WITH_DATE,
          },
          {
            name: this.translationManager.t('batch.filenameFormats.custom'),
            value: BatchFilenameFormat.CUSTOM,
          },
        ],
        default: BatchFilenameFormat.ORIGINAL,
      },
      {
        type: 'input',
        name: 'customFilenamePattern',
        message: this.translationManager.t('batch.enterCustomPattern'),
        default: this.translationManager.t('batch.customPatternPlaceholder'),
        when: (answers: { filenameFormat: BatchFilenameFormat }) =>
          answers.filenameFormat === BatchFilenameFormat.CUSTOM,
        validate: (input: string): boolean | string => {
          if (!input.includes('{name}')) {
            return this.translationManager.t('batch.patternMustIncludeName');
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'tocDepth',
        message: this.translationManager.t('batch.selectTocDepth'),
        choices: [
          { name: this.translationManager.t('batch.tocLevels.1'), value: 1 },
          { name: this.translationManager.t('batch.tocLevels.2'), value: 2 },
          { name: this.translationManager.t('batch.tocLevels.3'), value: 3 },
          { name: this.translationManager.t('batch.tocLevels.4'), value: 4 },
          { name: this.translationManager.t('batch.tocLevels.5'), value: 5 },
          { name: this.translationManager.t('batch.tocLevels.6'), value: 6 },
        ],
        default: 2,
      },
      {
        type: 'confirm',
        name: 'includePageNumbers',
        message: this.translationManager.t('batch.includePageNumbers'),
        default: true,
      },
      {
        type: 'confirm',
        name: 'chineseFontSupport',
        message: this.translationManager.t('batch.chineseFontSupport'),
        default: true,
      },
      {
        type: 'list',
        name: 'maxConcurrentProcesses',
        message: this.translationManager.t(
          'batch.selectMaxConcurrentProcesses',
        ),
        choices: [
          {
            name: this.translationManager.t('batch.concurrentOptions.1'),
            value: 1,
          },
          {
            name: this.translationManager.t('batch.concurrentOptions.2'),
            value: 2,
          },
          {
            name: this.translationManager.t('batch.concurrentOptions.3'),
            value: 3,
          },
          {
            name: this.translationManager.t('batch.concurrentOptions.4'),
            value: 4,
          },
          {
            name: this.translationManager.t('batch.concurrentOptions.5'),
            value: 5,
          },
        ],
        default: 2,
      },
      {
        type: 'confirm',
        name: 'continueOnError',
        message: this.translationManager.t('batch.continueOnError'),
        default: true,
      },
    ])) as {
      outputDirectory: string;
      preserveDirectoryStructure: boolean;
      filenameFormat: BatchFilenameFormat;
      customFilenamePattern?: string;
      tocDepth: number;
      includePageNumbers: boolean;
      chineseFontSupport: boolean;
      maxConcurrentProcesses: number;
      continueOnError: boolean;
    };

    return {
      inputPattern: inputPattern,
      outputDirectory: answers.outputDirectory,
      preserveDirectoryStructure: answers.preserveDirectoryStructure,
      filenameFormat: answers.filenameFormat,
      customFilenamePattern: answers.customFilenamePattern ?? '',
      tocDepth: answers.tocDepth,
      includePageNumbers: answers.includePageNumbers,
      chineseFontSupport: answers.chineseFontSupport,
      maxConcurrentProcesses: answers.maxConcurrentProcesses,
      continueOnError: answers.continueOnError,
    };
  }

  /**
   * Final confirmation with configuration summary
   */
  private async finalConfirmation(
    config: BatchConversionConfig,
    files: { inputPath: string }[],
  ): Promise<boolean> {
    const inquirer = (await import('inquirer')) as InquirerModule;

    // Display configuration summary
    this.uiManager.showNewline();
    this.uiManager.showInfo(
      this.translationManager.t('batch.configurationSummary'),
    );
    this.uiManager.showSeparator();

    this.uiManager.showMessage(
      this.translationManager.t('batch.filesToProcess', {
        count: files.length,
      }),
    );

    const shortFileList = files.slice(0, 3).map((f: { inputPath: string }) => {
      const relativePath = f.inputPath.replace(process.cwd() + '/', './');
      return `• ${relativePath}`;
    });

    if (files.length <= 3) {
      shortFileList.forEach((file) => this.uiManager.showMessage(`   ${file}`));
    } else {
      shortFileList.forEach((file) => this.uiManager.showMessage(`   ${file}`));
      this.uiManager.showMessage(
        `   ${this.translationManager.t('batch.andMoreFiles', { count: files.length - 3 })}`,
      );
    }

    this.uiManager.showMessage(
      this.translationManager.t('batch.outputDirectory', {
        directory: config.outputDirectory,
      }),
    );

    const formatDisplay =
      config.filenameFormat === 'original'
        ? this.translationManager.t('batch.filenameFormatOptions.original')
        : config.filenameFormat === 'with_date'
          ? this.translationManager.t('batch.filenameFormatOptions.with_date')
          : config.filenameFormat === 'with_timestamp'
            ? this.translationManager.t(
                'batch.filenameFormatOptions.with_timestamp',
              )
            : this.translationManager.t('batch.filenameFormatOptions.custom');

    console.log(
      chalk.white(
        this.translationManager.t('batch.filenameFormatSummary', {
          format: formatDisplay,
        }),
      ),
    );
    console.log(
      chalk.white(
        this.translationManager.t('batch.preserveStructure', {
          preserve: config.preserveDirectoryStructure
            ? this.translationManager.t('batch.yes')
            : this.translationManager.t('batch.no'),
        }),
      ),
    );
    console.log(
      chalk.white(
        this.translationManager.t('batch.tableOfContents', {
          depth: config.tocDepth,
        }),
      ),
    );
    console.log(
      chalk.white(
        this.translationManager.t('batch.pageNumbers', {
          include: config.includePageNumbers
            ? this.translationManager.t('batch.yes')
            : this.translationManager.t('batch.no'),
        }),
      ),
    );
    console.log(
      chalk.white(
        this.translationManager.t('batch.chineseSupport', {
          enabled: config.chineseFontSupport
            ? this.translationManager.t('batch.enabled')
            : this.translationManager.t('batch.disabled'),
        }),
      ),
    );
    console.log(
      chalk.white(
        this.translationManager.t('batch.concurrentProcesses', {
          count: config.maxConcurrentProcesses,
        }),
      ),
    );
    console.log(
      chalk.white(
        this.translationManager.t('batch.continueOnErrorSummary', {
          continue: config.continueOnError
            ? this.translationManager.t('batch.yes')
            : this.translationManager.t('batch.no'),
        }),
      ),
    );
    console.log('────────────────────────────────────────────────────────────');
    console.log(
      chalk.yellow(
        '\n' + this.translationManager.t('batch.finalConfirmationWarning'),
      ),
    );
    console.log(
      chalk.gray(this.translationManager.t('batch.finalConfirmationNote')),
    );
    console.log(
      chalk.gray(this.translationManager.t('batch.processingTimeNote')),
    );
    console.log();

    const { finalConfirm } = (await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'finalConfirm',
        message: this.translationManager.t('batch.startBatchProcessing'),
        default: false,
      },
    ])) as { finalConfirm: boolean };

    return finalConfirm;
  }

  /**
   * Process the batch with progress tracking
   */
  private async processBatch(config: BatchConversionConfig): Promise<void> {
    console.log(
      chalk.cyan(
        '\n' + this.translationManager.t('batch.startingBatchProcessing'),
      ),
    );

    // Set up progress tracking
    const progressUI = this.progressUI;
    const abortController = new AbortController();

    // Handle Ctrl+C for graceful cancellation
    const handleCancel = () => {
      this.uiManager.showWarning(
        this.translationManager.t('batch.cancellingBatchProcessing'),
      );
      abortController.abort();
    };

    process.on('SIGINT', handleCancel);
    process.on('SIGTERM', handleCancel);

    try {
      const fileOptions: Record<string, unknown> = {
        outputPath: config.outputDirectory,
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

      if (config.chineseFontSupport) {
        fileOptions.customStyles = `
          * {
            font-family: 'Noto Sans CJK SC', Arial, sans-serif !important;
          }
        `;
      }

      const batchOptions = {
        maxConcurrency: config.maxConcurrentProcesses,
        continueOnError: config.continueOnError,
        generateReport: true,
      };

      const result = await this.batchProcessorService.processBatch(
        config,
        fileOptions,
        batchOptions,
      );

      // Display final results
      progressUI.displayResults(result);
      if (result.success && result.failedFiles === 0) {
        this.uiManager.showNewline();
        this.uiManager.showSuccess(
          this.translationManager.t('batch.allFilesProcessedSuccessfully'),
        );
      } else if (result.successfulFiles > 0) {
        this.uiManager.showNewline();
        this.uiManager.showWarning(
          this.translationManager.t('batch.partiallyProcessed', {
            successful: result.successfulFiles,
            total: result.totalFiles,
          }),
        );
        if (result.errors.length > 0) {
          const retryableErrors = result.errors.filter((e) => e.canRetry);
          if (retryableErrors.length > 0) {
            const inquirer = (await import('inquirer')) as InquirerModule;
            const { retry } = (await inquirer.default.prompt([
              {
                type: 'confirm',
                name: 'retry',
                message: this.translationManager.t('batch.retryFailedFiles', {
                  count: retryableErrors.length,
                }),
                default: false,
              },
            ])) as { retry: boolean };
            if (retry) {
              await this.retryFailedFiles(
                config,
                retryableErrors.map((e) => e.inputPath),
              );
            }
          }
        }
      } else {
        this.uiManager.showNewline();
        this.uiManager.showError(
          this.translationManager.t('batch.noFilesProcessed'),
        );
        if (result.errors.length > 0) {
          this.uiManager.showWarning(
            this.translationManager.t('batch.checkErrorsAndRetry'),
          );
        }
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        this.uiManager.showNewline();
        this.uiManager.showWarning(
          this.translationManager.t('batch.batchProcessingCancelledByUser'),
        );
      } else {
        this.uiManager.showNewline();
        this.uiManager.showError(
          this.translationManager.t('batch.batchProcessingFailed'),
          error as Error,
        );
      }
    } finally {
      process.off('SIGINT', handleCancel);
      process.off('SIGTERM', handleCancel);
    }
  }

  /**
   * Retry failed files
   */
  private async retryFailedFiles(
    originalConfig: BatchConversionConfig,
    failedFiles: string[],
  ): Promise<void> {
    this.uiManager.showNewline();
    this.uiManager.showProgress(
      this.translationManager.t('batch.retryingFailedFiles', {
        count: failedFiles.length,
      }),
    );

    // Create a new config for retry with only failed files
    const retryConfig: BatchConversionConfig = {
      ...originalConfig,
      inputPattern: failedFiles[0], // We'll handle this differently for retry
      maxConcurrentProcesses: Math.min(
        2,
        originalConfig.maxConcurrentProcesses,
      ), // Use fewer processes for retry
    };

    // For retry, we need to create a special processor that handles specific files
    // This is a simplified retry - in a full implementation, you might want more sophisticated retry logic
    try {
      const fileOptions = {};
      const batchOptions = {
        maxConcurrency: Math.min(2, originalConfig.maxConcurrentProcesses),
        continueOnError: false,
        generateReport: true,
      };

      const result = await this.batchProcessorService.processBatch(
        retryConfig,
        fileOptions,
        batchOptions,
      );
      this.progressUI.displayResults(result);
      if (result.successfulFiles > 0) {
        this.uiManager.showNewline();
        this.uiManager.showSuccess(
          this.translationManager.t('batch.retryCompleted', {
            count: result.successfulFiles,
          }),
        );
      } else {
        this.uiManager.showNewline();
        this.uiManager.showError(
          this.translationManager.t('batch.retryFailed'),
        );
      }
    } catch (error) {
      console.error(
        chalk.red('\n' + this.translationManager.t('batch.retryError')),
        error,
      );
    }
  }
}
