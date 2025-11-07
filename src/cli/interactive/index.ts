/**
 * Interactive CLI mode
 */

import chalk from 'chalk';
import ora from 'ora';

import { APPLICATION_SERVICE_NAMES } from '../../application/container';
import { DEFAULT_MARGINS } from '../../infrastructure/config/constants';
import { ConversionConfig } from '../../types';
import { PathCleaner } from '../../utils/path-cleaner';
import { CliUIManager } from '../ui/cli-ui-manager';

import type {
  IFileProcessorService,
  FileProcessingOptions,
} from '../../application/services/file-processor.service';
import type { IConfigManager } from '../../infrastructure/config/types';
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
  private configManager: IConfigManager;
  private errorHandler: IErrorHandler;
  private fileProcessorService: IFileProcessorService;
  private fileSystemManager: IFileSystemManager | undefined;
  private logger: ILogger;
  private translationManager: ITranslationManager;
  private uiManager: CliUIManager;

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
    this.configManager = container.resolve<IConfigManager>('config');
    this.uiManager = new CliUIManager(
      this.translationManager,
      this.logger,
      {},
      this.configManager,
    );
  }

  /**
   * Start interactive conversion process
   */
  async start(): Promise<void> {
    try {
      this.uiManager.showDebug('Starting interactive conversion process');

      // Show clean header for single file conversion
      this.uiManager.showHeader(
        this.translationManager.t('interactive.title'),
        this.translationManager.t('interactive.subtitle'),
      );

      // Step 1: Select input file (file confirmation is now done during input)
      const config = await this.getConversionConfig();

      // Step 2: Confirm configuration
      const confirmed = await this.confirmConfig(config);

      if (confirmed) {
        await this.performConversion(config);
      } else {
        this.uiManager.showWarning(
          this.translationManager.t('interactive.cancelled'),
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

      await this.errorHandler.handleError(
        error as Error,
        'InteractiveMode.start',
      );
      this.uiManager.showError(
        this.translationManager.t('interactive.interactiveModeError'),
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
    const { inputPath: rawInputPath } = await (
      inquirer as InquirerModule
    ).default.prompt<{
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

          // Clean the path first before validation
          const cleanedPath = PathCleaner.cleanPath(input);
          if (
            !cleanedPath.endsWith('.md') &&
            !cleanedPath.endsWith('.markdown') &&
            !cleanedPath.includes('*')
          ) {
            return this.translationManager.t('interactive.invalidMarkdownFile');
          }

          return true;
        },
      },
    ]);

    // Clean the input path to handle drag-and-drop cases
    const inputPath = PathCleaner.cleanPath(rawInputPath);

    // Search for matching files and display results if a file system manager is available
    let selectedInputPath = inputPath;
    if (!this.fileSystemManager) {
      this.uiManager.showDebug(
        'File system manager not available, skipping file search',
      );
      this.uiManager.showMessage(
        this.translationManager.t('interactive.fileSystemNotAvailable'),
      );
    } else {
      try {
        const matches = await this.fileSystemManager.findFiles(
          inputPath,
          process.cwd(),
        );
        if (matches && matches.length > 0) {
          this.uiManager.showDebug(`Found ${matches.length} file(s)`);
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
          this.uiManager.showError(
            this.translationManager.t('interactive.invalidFileError'),
          );
          this.uiManager.showMessage(
            `   ${this.translationManager.t('interactive.fileExists')}`,
          );
          this.uiManager.showMessage(
            `   ${this.translationManager.t('interactive.validExtension')}`,
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
            this.uiManager.showDebug('User chose to Return to Main Menu');
            this.uiManager.showMessage(
              this.translationManager.t('interactive.cancelled'),
            );
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
        this.uiManager.showWarning(
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
        type: 'confirm',
        name: 'includeTOC',
        message: this.translationManager.t('interactive.includeTOC'),
        default: true,
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
        when: (answers: any) => answers.includeTOC,
      },
      {
        type: 'list',
        name: 'tocReturnLinksLevel',
        message: this.translationManager.t('interactive.tocReturnLinksLevel'),
        choices: [
          {
            name: this.translationManager.t(
              'interactive.tocReturnLinksLevels.0',
            ),
            value: 0,
          },
          {
            name: this.translationManager.t(
              'interactive.tocReturnLinksLevels.1',
            ),
            value: 1,
          },
          {
            name: this.translationManager.t(
              'interactive.tocReturnLinksLevels.2',
            ),
            value: 2,
          },
          {
            name: this.translationManager.t(
              'interactive.tocReturnLinksLevels.3',
            ),
            value: 3,
          },
          {
            name: this.translationManager.t(
              'interactive.tocReturnLinksLevels.4',
            ),
            value: 4,
          },
          {
            name: this.translationManager.t(
              'interactive.tocReturnLinksLevels.5',
            ),
            value: 5,
          },
        ],
        default: 3,
        when: (answers: any) => answers.includeTOC,
      },
      {
        type: 'confirm',
        name: 'includePageNumbers',
        message: this.translationManager.t('interactive.includePageNumbers'),
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
    this.uiManager.showNewline();
    this.uiManager.showInfo(
      this.translationManager.t('interactive.conversionSummary'),
    );
    this.uiManager.showSeparator();

    this.uiManager.showMessage(
      `${this.translationManager.t('interactive.inputFile')} ${config.inputPath}`,
    );
    this.uiManager.showMessage(
      `${this.translationManager.t('interactive.outputFile')} ${config.outputPath}`,
    );
    this.uiManager.showMessage(
      `${this.translationManager.t('interactive.includeTOC')} ${config.includeTOC ? this.translationManager.t('interactive.yes') : this.translationManager.t('interactive.no')}`,
    );
    if (config.includeTOC) {
      this.uiManager.showMessage(
        `${this.translationManager.t('interactive.tocDepth')} ${config.tocDepth} ${this.translationManager.t('interactive.levels')}`,
      );
      this.uiManager.showMessage(
        `${this.translationManager.t('interactive.pageNumbers')} ${config.includePageNumbers ? this.translationManager.t('interactive.yes') : this.translationManager.t('interactive.no')}`,
      );
    }

    this.uiManager.showSeparator();
    this.uiManager.showNewline();

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
      this.uiManager.showDebug('Starting file conversion', {
        inputPath: config.inputPath,
        outputPath: config.outputPath,
      });

      // Step 1: Prepare processing options
      spinner.text = this.translationManager.t('interactive.preparingOptions');
      const outputPath =
        config.outputPath ||
        config.inputPath.replace(/\.(md|markdown)$/, '.pdf');

      const processingOptions: FileProcessingOptions = {
        outputPath,
        includeTOC: config.includeTOC,
        includePageNumbers: config.includePageNumbers, // Add this setting for CSS @page rules
        tocReturnLinksLevel: config.tocReturnLinksLevel ?? 0, // Add TOC return links level with default
        pdfOptions: {
          margin: DEFAULT_MARGINS.NORMAL,
          displayHeaderFooter: false, // Force disable - using CSS @page instead
          footerTemplate: '', // Disable Puppeteer templates - using CSS @page instead
          printBackground: true,
        },
      };

      // Add tocOptions conditionally to avoid undefined assignment
      if (config.includeTOC) {
        processingOptions.tocOptions = {
          maxDepth: config.tocDepth,
          includePageNumbers: config.includePageNumbers,
        };
      }

      // Since we use CSS @page rules for header/footer, we no longer need page structure config
      // Header and footer are handled automatically via CSS injection in pdf-generator.service.ts
      this.logger.info(
        `Header/footer ${config.includePageNumbers ? 'enabled' : 'disabled'} via CSS @page rules`,
      );

      // Chinese font support is now automatically handled based on document language

      // Step 2.5: Analyze content and determine if two-stage rendering should be enabled
      if (config.includeTOC && config.includePageNumbers) {
        try {
          spinner.text = this.translationManager.t(
            'interactive.analyzingContent',
          );

          // Analyze content using smart defaults service
          // Two-stage rendering is now always enabled
          this.logger.info(
            'Two-stage rendering automatically enabled for accurate page numbers',
          );
        } catch (error) {
          this.logger.warn(
            'Failed to analyze content, proceeding with standard processing:',
            error,
          );
        }
      }

      // Debug logging for options being passed to file processor
      this.logger.debug('Interactive mode passing options to file processor:', {
        processingOptions,
        configIncludeTOC: config.includeTOC,
        configTocDepth: config.tocDepth,
        configIncludePageNumbers: config.includePageNumbers,
      });

      // Step 3: Process the file using application service
      spinner.text = this.translationManager.t(
        'interactive.processingMarkdown',
      );
      const result = await this.fileProcessorService.processFile(
        config.inputPath,
        processingOptions,
      );

      this.uiManager.showDebug('File conversion completed successfully', {
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
      // Show conversion results with clean formatting
      this.uiManager.showNewline();
      this.uiManager.showInfo(
        this.translationManager.t('interactive.conversionResults'),
      );
      this.uiManager.showSeparator();

      this.uiManager.showMessage(
        `${this.translationManager.t('interactive.inputFile')} ${result.inputPath}`,
      );
      this.uiManager.showMessage(
        `${this.translationManager.t('interactive.outputFile')} ${result.outputPath}`,
      );
      this.uiManager.showMessage(
        `${this.translationManager.t('interactive.fileSize')} ${this.formatBytes(result.fileSize)}`,
      );
      this.uiManager.showMessage(
        `${this.translationManager.t('interactive.processingTime')} ${result.processingTime}ms`,
      );

      if (result.parsedContent.headings) {
        this.uiManager.showMessage(
          `${this.translationManager.t('interactive.headingsFound')} ${result.parsedContent.headings.length}`,
        );
      }

      this.uiManager.showSeparator();
      this.uiManager.showNewline();
    } catch (error) {
      spinner.fail(
        chalk.red(this.translationManager.t('interactive.conversionFailed')),
      );
      this.uiManager.showError(
        'Conversion failed in interactive mode',
        error as Error,
      );
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
