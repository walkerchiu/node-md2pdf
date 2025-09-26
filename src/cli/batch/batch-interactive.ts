/**
 * Batch interactive mode
 * Handles user interaction for batch processing
 */

import chalk from 'chalk';

import { BatchProgressUI } from './batch-progress-ui';
import { APPLICATION_SERVICE_NAMES } from '../../application/container';
import { FileCollector } from '../../core/batch/file-collector';
import { BatchConversionConfig, BatchFilenameFormat } from '../../types/batch';

import type { IBatchProcessorService } from '../../application/services/batch-processor.service';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { ILogger } from '../../infrastructure/logging/types';
import type { ServiceContainer } from '../../shared/container';

export class BatchInteractiveMode {
  private logger: ILogger;
  private errorHandler: IErrorHandler;
  private batchProcessorService: IBatchProcessorService;
  private progressUI = new BatchProgressUI();

  constructor(container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.errorHandler = container.resolve<IErrorHandler>('errorHandler');
    this.batchProcessorService = container.resolve<IBatchProcessorService>(
      APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR,
    );
  }

  /**
   * Start batch interactive mode
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting batch interactive mode');
      this.logger.info(chalk.cyan('📦 Batch Conversion Mode'));
      this.logger.info(chalk.gray('Process multiple Markdown files at once'));
      this.logger.info('');

      // Step 1: Get input pattern and preview files
      const { inputPattern, files } = await this.getInputPatternAndFiles();
      // Step 2: Get remaining batch configuration
      const config = await this.getBatchConfig(inputPattern);
      // Step 3: Final preview with configuration
      const confirmed = await this.finalConfirmation(config, files);
      if (!confirmed) {
        this.logger.info('User cancelled batch processing');
        this.logger.warn(chalk.yellow('❌ Batch processing cancelled'));
        return;
      }
      // Step 4: Process batch
      await this.processBatch(config);
    } catch (error) {
      this.logger.error('Batch interactive mode error', error as Error);
      await this.errorHandler.handleError(
        error as Error,
        'BatchInteractiveMode.start',
      );
      this.logger.error(chalk.red('❌ Batch mode error:'), error as Error);
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
    files: any[];
  }> {
    type InquirerModule = {
      default: {
        prompt: (questions: unknown) => Promise<Record<string, unknown>>;
      };
    };
    const inquirer = await import('inquirer');

    // Step 1: Ask for input pattern
    const { inputPattern } = (await (inquirer as InquirerModule).default.prompt([
      {
        type: 'input',
        name: 'inputPattern',
        message:
          'Enter input pattern:\n' +
          '  • Glob patterns: *.md, docs/**/*.md\n' +
          '  • Multiple files: file1.md, file2.md (or "file1.md", "file2.md")\n' +
          '  • Directory: docs\n' +
          'Pattern:',
        default: '*.md',
        validate: (input: string): boolean | string => {
          if (!input.trim()) {
            return 'Please enter an input pattern';
          }
          return true;
        },
      },
    ])) as { inputPattern: string };

    this.logger.info(chalk.cyan('\n🔍 Searching for files...'));

    // Step 2: Immediately search for files using FileCollector
    try {
      const path = await import('path');
      const fileCollector = new FileCollector();
      const fileList = await fileCollector.findFilesByPattern(inputPattern);

      const files = fileList.map((filePath) => ({
        inputPath: path.resolve(filePath),
      }));

      this.logger.info(chalk.green('\n📁 Files found:'));
      this.logger.info('────────────────────────────────────────────────────────────');
      files.forEach((file: { inputPath: string }, index: number) => {
        const relativePath = file.inputPath.replace(process.cwd() + '/', './');
        this.logger.info(chalk.white(`  ${index + 1}. ${relativePath}`));
      });
      this.logger.info('────────────────────────────────────────────────────────────');
      this.logger.info(chalk.gray(`Total: ${files.length} files`));

      if (files.length === 0) {
        this.logger.warn(
          chalk.yellow('\n⚠️  No Markdown files found matching the pattern.'),
        );
        throw new Error('No files found');
      }

      // Step 3: Confirm file list
      const { confirmFiles } = await (
        inquirer as InquirerModule
      ).default.prompt([
        {
          type: 'confirm',
          name: 'confirmFiles',
          message: `Proceed with these ${files.length} files?`,
          default: true,
        },
      ]);
      if (!confirmFiles) {
        this.logger.warn(chalk.yellow('❌ File selection cancelled'));
        process.exit(0);
      }
      return { inputPattern, files };
    } catch (error) {
      this.logger.error(chalk.red('❌ Error searching for files:'));
      this.logger.error(
        chalk.red(
          `   ${error instanceof Error ? error.message : String(error)}`,
        ),
      );

      // Ask if user wants to try again
      const { tryAgain } = await (inquirer as InquirerModule).default.prompt([
        {
          type: 'confirm',
          name: 'tryAgain',
          message: 'Would you like to try a different pattern?',
          default: true,
        },
      ]);

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
    const inquirer = await import('inquirer');

    console.log(chalk.cyan('\n⚙️  Configuration Options'));
    console.log(chalk.gray('Configure how your files will be processed'));
    console.log();

    const answers = await (inquirer as any).default.prompt([
      {
        type: 'input',
        name: 'outputDirectory',
        message: 'Enter output directory:',
        default: './output',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Please enter an output directory';
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'preserveDirectoryStructure',
        message: 'Preserve original directory structure in output?',
        default: true,
      },
      {
        type: 'list',
        name: 'filenameFormat',
        message: 'Select output filename format:',
        choices: [
          {
            name: 'Original filename (example.pdf)',
            value: BatchFilenameFormat.ORIGINAL,
          },
          {
            name: 'With timestamp (example_1234567890.pdf)',
            value: BatchFilenameFormat.WITH_TIMESTAMP,
          },
          {
            name: 'With date (example_2024-01-15.pdf)',
            value: BatchFilenameFormat.WITH_DATE,
          },
          { name: 'Custom pattern', value: BatchFilenameFormat.CUSTOM },
        ],
        default: BatchFilenameFormat.ORIGINAL,
      },
      {
        type: 'input',
        name: 'customFilenamePattern',
        message:
          'Enter custom filename pattern (use {name}, {timestamp}, {date}):',
        default: '{name}_{date}.pdf',
        when: (answers: any) =>
          answers.filenameFormat === BatchFilenameFormat.CUSTOM,
        validate: (input: string) => {
          if (!input.includes('{name}')) {
            return 'Pattern must include {name} placeholder';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'tocDepth',
        message: 'Select table of contents depth:',
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
      {
        type: 'list',
        name: 'maxConcurrentProcesses',
        message: 'Select maximum concurrent processes:',
        choices: [
          { name: '1 (Sequential)', value: 1 },
          { name: '2 (Recommended for most systems)', value: 2 },
          { name: '3', value: 3 },
          { name: '4', value: 4 },
          { name: '5 (High-end systems only)', value: 5 },
        ],
        default: 2,
      },
      {
        type: 'confirm',
        name: 'continueOnError',
        message: 'Continue processing other files if one fails?',
        default: true,
      },
    ]);

    return {
      inputPattern: inputPattern,
      outputDirectory: answers.outputDirectory,
      preserveDirectoryStructure: answers.preserveDirectoryStructure,
      filenameFormat: answers.filenameFormat,
      customFilenamePattern: answers.customFilenamePattern,
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
    files: any[],
  ): Promise<boolean> {
    const inquirer = await import('inquirer');

    // Display configuration summary
    console.log(chalk.cyan('\n📋 Configuration Summary'));
    console.log('────────────────────────────────────────────────────────────');
    console.log(chalk.white(`📁 Files to process: ${files.length}`));

    const shortFileList = files.slice(0, 3).map((f: { inputPath: string }) => {
      const relativePath = f.inputPath.replace(process.cwd() + '/', './');
      return relativePath;
    });
    if (files.length <= 3) {
      shortFileList.forEach((file) => console.log(chalk.gray(`   • ${file}`)));
    } else {
      shortFileList.forEach((file) => console.log(chalk.gray(`   • ${file}`)));
      console.log(chalk.gray(`   ... and ${files.length - 3} more files`));
    }

    console.log(chalk.white(`📂 Output directory: ${config.outputDirectory}`));
    console.log(
      chalk.white(
        `📝 Filename format: ${
          config.filenameFormat === 'original'
            ? 'Keep original names'
            : config.filenameFormat === 'with_date'
              ? 'Add date suffix'
              : config.filenameFormat === 'with_timestamp'
                ? 'Add timestamp suffix'
                : 'Custom format'
        }`,
      ),
    );
    console.log(
      chalk.white(
        `🗂️  Preserve structure: ${config.preserveDirectoryStructure ? 'Yes' : 'No'}`,
      ),
    );
    console.log(chalk.white(`📖 Table of contents: ${config.tocDepth} levels`));
    console.log(
      chalk.white(
        `📄 Page numbers: ${config.includePageNumbers ? 'Yes' : 'No'}`,
      ),
    );
    console.log(
      chalk.white(
        `🈳 Chinese support: ${config.chineseFontSupport ? 'Enabled' : 'Disabled'}`,
      ),
    );
    console.log(
      chalk.white(`⚡ Concurrent processes: ${config.maxConcurrentProcesses}`),
    );
    console.log(
      chalk.white(
        `🔄 Continue on error: ${config.continueOnError ? 'Yes' : 'No'}`,
      ),
    );
    console.log('────────────────────────────────────────────────────────────');
    console.log(chalk.yellow('\n⚠️  Final Confirmation:'));
    console.log(chalk.gray('Batch processing will create multiple PDF files.'));
    console.log(
      chalk.gray(
        'This operation may take several minutes depending on file size and count.',
      ),
    );
    console.log();

    const { finalConfirm } = await (inquirer as any).default.prompt([
      {
        type: 'confirm',
        name: 'finalConfirm',
        message: 'Start batch processing with the above configuration?',
        default: false,
      },
    ]);

    return finalConfirm;
  }

  /**
   * Process the batch with progress tracking
   */
  private async processBatch(config: BatchConversionConfig): Promise<void> {
    console.log(chalk.cyan('\n🚀 Starting batch processing...'));

    // Set up progress tracking
    const progressUI = this.progressUI;
    const abortController = new AbortController();

    // Handle Ctrl+C for graceful cancellation
    const handleCancel = () => {
      console.log(chalk.yellow('\n⚠️  Cancelling batch processing...'));
      abortController.abort();
    };

    process.on('SIGINT', handleCancel);
    process.on('SIGTERM', handleCancel);

    try {
      const fileOptions = {
        outputPath: config.outputDirectory,
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
      } as any;

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
        console.log(chalk.green('\n🎉 All files processed successfully!'));
      } else if (result.successfulFiles > 0) {
        console.log(
          chalk.yellow(
            `\n⚠️  Processed ${result.successfulFiles} out of ${result.totalFiles} files successfully.`,
          ),
        );
        if (result.errors.length > 0) {
          const retryableErrors = result.errors.filter((e) => e.canRetry);
          if (retryableErrors.length > 0) {
            const inquirer = await import('inquirer');
            const { retry } = await (inquirer as any).default.prompt([
              {
                type: 'confirm',
                name: 'retry',
                message: `${retryableErrors.length} files failed but can be retried. Retry failed files?`,
                default: false,
              },
            ]);
            if (retry) {
              await this.retryFailedFiles(
                config,
                retryableErrors.map((e) => e.inputPath),
              );
            }
          }
        }
      } else {
        console.log(chalk.red('\n❌ No files were processed successfully.'));
        if (result.errors.length > 0) {
          console.log(
            chalk.yellow('Please check the errors above and try again.'),
          );
        }
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        console.log(chalk.yellow('\n⚠️  Batch processing was cancelled.'));
      } else {
        console.error(chalk.red('\n❌ Batch processing failed:'), error);
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
    console.log(
      chalk.cyan(`\n🔄 Retrying ${failedFiles.length} failed files...`),
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
        console.log(
          chalk.green(
            `\n✅ Retry completed: ${result.successfulFiles} additional files processed.`,
          ),
        );
      } else {
        console.log(
          chalk.red('\n❌ Retry failed: No additional files were processed.'),
        );
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Retry failed:'), error);
    }
  }
}
