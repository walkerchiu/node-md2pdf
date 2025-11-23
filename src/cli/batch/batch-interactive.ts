/**
 * Batch interactive mode
 * Handles user interaction for batch processing
 */

import chalk from 'chalk';

import { APPLICATION_SERVICE_NAMES } from '../../application/container';
import { FileCollector } from '../../core/batch/file-collector';
import { DEFAULT_MARGINS } from '../../infrastructure/config/constants';
import { TOCReturnLinkLevel } from '../../types';
import { BatchConversionConfig, BatchFilenameFormat } from '../../types/batch';
import { PathCleaner } from '../../utils/path-cleaner';
import { CliUIManager } from '../ui/cli-ui-manager';
import FileSearchUI from '../ui/file-search-ui';

import { BatchProgressUI } from './batch-progress-ui';

import type { IBatchProcessorService } from '../../application/services/batch-processor.service';
import type { IMarkdownParserService } from '../../application/services/markdown-parser.service';
import type { TemplateStorageService } from '../../core/templates/storage.service';
import type { Template } from '../../core/templates/types';
import type { IConfigManager } from '../../infrastructure/config/types';
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
  private markdownParserService: IMarkdownParserService;
  private progressUI: BatchProgressUI;
  private uiManager: CliUIManager;
  private configManager: IConfigManager;
  private templateStorage: TemplateStorageService;

  constructor(container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.errorHandler = container.resolve<IErrorHandler>('errorHandler');
    this.translationManager =
      container.resolve<ITranslationManager>('translator');
    this.batchProcessorService = container.resolve<IBatchProcessorService>(
      APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR,
    );
    this.markdownParserService = container.resolve<IMarkdownParserService>(
      APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER,
    );
    this.progressUI = new BatchProgressUI(this.translationManager);
    this.configManager = container.resolve<IConfigManager>('config');
    this.templateStorage =
      container.resolve<TemplateStorageService>('templateStorage');
    this.uiManager = new CliUIManager(
      this.translationManager,
      this.logger,
      {},
      this.configManager,
    );
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
    const { inputPattern: rawInputPattern } = (await inquirer.default.prompt([
      {
        type: 'input',
        name: 'inputPattern',
        message:
          this.translationManager.t('batch.enterInputPattern') +
          '\n' +
          this.translationManager.t('batch.patternHints'),
        default: this.translationManager.t('batch.patternPlaceholder'),
        validate: (): boolean => {
          // Always allow input (including empty input for default)
          return true;
        },
      },
    ])) as { inputPattern: string };

    // Clean the input pattern to handle drag-and-drop cases
    // If user didn't input anything, use the default pattern
    const inputPattern =
      rawInputPattern.trim() ||
      this.translationManager.t('batch.patternPlaceholder');

    // Don't clean glob patterns or patterns with wildcards
    const cleanedPattern =
      inputPattern.includes('*') || inputPattern.includes('?')
        ? inputPattern
        : PathCleaner.cleanPath(inputPattern);

    this.logger.info(
      chalk.cyan('\n' + this.translationManager.t('batch.searchingFiles')),
    );

    // Step 2: Immediately search for files using FileCollector
    try {
      const path = await import('path');
      const fileCollector = new FileCollector();
      const fileList = await fileCollector.findFilesByPattern(cleanedPattern);

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
          type: 'list',
          name: 'confirmFiles',
          message: this.translationManager.t('batch.proceedWithFiles', {
            count: files.length,
          }),
          choices: [
            {
              name: this.translationManager.t('common.status.yes'),
              value: true,
            },
            {
              name: this.translationManager.t('common.status.no'),
              value: false,
            },
          ],
          default: 0,
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
      return { inputPattern: cleanedPattern, files };
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

    // Select template for batch conversion (mandatory - will throw if no templates available)
    const selectedTemplate = await this.selectTemplate();

    // Use template config with minimal prompts
    return this.getBatchConfigFromTemplate(
      inputPattern,
      selectedTemplate,
      inquirer,
    );
  }

  /**
   * Final confirmation with configuration summary
   */
  private async finalConfirmation(
    config: BatchConversionConfig,
    files: { inputPath: string }[],
  ): Promise<boolean> {
    const inquirer = (await import('inquirer')) as InquirerModule;

    // Display PDF configuration (template or default)
    this.uiManager.showNewline();

    // Show template configuration (template is now mandatory)
    // Console display with colors (matching Template Management style)
    console.log(
      chalk.cyan(
        `📋 ${this.translationManager.t('interactive.usingTemplate')}: ${this.translationManager.t(config.template!.name)}`,
      ),
    );
    console.log();

    // Page format and margins (5-space indent, matching template view)
    const templateConfig = config.template!.config;
    console.log(
      `     ${this.translationManager.t('templates.view.config.pageFormat')}: ${chalk.green(templateConfig.pdf.format)} ${chalk.gray(`(${templateConfig.pdf.orientation})`)}`,
    );
    console.log(
      `     ${this.translationManager.t('templates.view.config.margins')}: ${this.translationManager.t('templates.view.config.top')} ${chalk.yellow(templateConfig.pdf.margin.top)}, ${this.translationManager.t('templates.view.config.right')} ${chalk.yellow(templateConfig.pdf.margin.right)}, ${this.translationManager.t('templates.view.config.bottom')} ${chalk.yellow(templateConfig.pdf.margin.bottom)}, ${this.translationManager.t('templates.view.config.left')} ${chalk.yellow(templateConfig.pdf.margin.left)}`,
    );

    // Fonts configuration
    console.log(
      `     ${this.translationManager.t('templates.view.config.fonts')}:`,
    );
    const bodyFont =
      templateConfig.styles.fonts.body ||
      this.translationManager.t('common.status.notSet');
    const headingFont =
      templateConfig.styles.fonts.heading ||
      this.translationManager.t('common.status.notSet');
    const codeFont =
      templateConfig.styles.fonts.code ||
      this.translationManager.t('common.status.notSet');

    console.log(
      `       • ${this.translationManager.t('templates.view.config.bodyFont')}: ${templateConfig.styles.fonts.body ? chalk.cyan(bodyFont) : chalk.gray(bodyFont)}`,
    );
    console.log(
      `       • ${this.translationManager.t('templates.view.config.headingFont')}: ${templateConfig.styles.fonts.heading ? chalk.cyan(headingFont) : chalk.gray(headingFont)}`,
    );
    console.log(
      `       • ${this.translationManager.t('templates.view.config.codeFont')}: ${templateConfig.styles.fonts.code ? chalk.cyan(codeFont) : chalk.gray(codeFont)}`,
    );

    // Code block theme
    const codeBlockTheme =
      templateConfig.styles.codeBlock.theme ||
      this.translationManager.t('common.status.notSet');
    console.log(
      `     ${this.translationManager.t('templates.view.config.codeBlockTheme')}: ${templateConfig.styles.codeBlock.theme ? chalk.magenta(codeBlockTheme) : chalk.gray(codeBlockTheme)}`,
    );
    console.log();

    // Clean log without colors
    this.logger.info(
      `Template: ${this.translationManager.t(config.template!.name)} | ` +
        `Page: ${templateConfig.pdf.format} (${templateConfig.pdf.orientation}) | ` +
        `Margins: T:${templateConfig.pdf.margin.top} R:${templateConfig.pdf.margin.right} B:${templateConfig.pdf.margin.bottom} L:${templateConfig.pdf.margin.left} | ` +
        `Fonts: Body="${templateConfig.styles.fonts.body}", Heading="${templateConfig.styles.fonts.heading}", Code="${templateConfig.styles.fonts.code}" | ` +
        `Code Theme: ${templateConfig.styles.codeBlock.theme} | ` +
        `Style: ${templateConfig.styles.theme}`,
    );

    // Display batch-specific configuration summary
    console.log(
      chalk.cyan(
        `\n📦 ${this.translationManager.t('batch.configurationSummary')}`,
      ),
    );
    console.log();

    // Files to process (5-space indent)
    console.log(
      `     ${this.translationManager.t('batch.filesToProcess', { count: files.length })}`,
    );

    const shortFileList = files.slice(0, 3).map((f: { inputPath: string }) => {
      const relativePath = f.inputPath.replace(process.cwd() + '/', './');
      return `       • ${chalk.gray(relativePath)}`;
    });

    if (files.length <= 3) {
      shortFileList.forEach((file) => console.log(file));
    } else {
      shortFileList.forEach((file) => console.log(file));
      console.log(
        `       ${chalk.gray(`... ${this.translationManager.t('batch.andMoreFiles', { count: files.length - 3 })}`)}`,
      );
    }
    console.log();

    // Output configuration
    console.log(
      `     ${this.translationManager.t('batch.outputDirectory', { directory: '' })}: ${chalk.cyan(config.outputDirectory)}`,
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
      `     ${this.translationManager.t('batch.filenameFormatSummary', { format: '' })}: ${chalk.yellow(formatDisplay)}`,
    );

    console.log(
      `     ${this.translationManager.t('batch.preserveStructure', { preserve: '' })}: ${config.preserveDirectoryStructure ? chalk.green(this.translationManager.t('batch.yes')) : chalk.gray(this.translationManager.t('batch.no'))}`,
    );

    // TOC configuration
    console.log(
      `     ${this.translationManager.t('batch.includeTOC', { include: '' })}: ${config.includeTOC ? chalk.green(this.translationManager.t('batch.yes')) : chalk.gray(this.translationManager.t('batch.no'))}`,
    );
    if (config.includeTOC) {
      console.log(
        `       • ${this.translationManager.t('batch.tableOfContents', { depth: '' })}: ${chalk.cyan(config.tocDepth)} ${chalk.gray(this.translationManager.t('common.tocLevels.' + config.tocDepth))}`,
      );
      console.log(
        `       • ${this.translationManager.t('batch.pageNumbers', { include: '' })}: ${config.includePageNumbers ? chalk.green(this.translationManager.t('batch.yes')) : chalk.gray(this.translationManager.t('batch.no'))}`,
      );
    }

    // Processing options
    console.log(
      `     ${this.translationManager.t('batch.concurrentProcesses', { count: '' })}: ${chalk.magenta(config.maxConcurrentProcesses)}`,
    );
    console.log(
      `     ${this.translationManager.t('batch.continueOnErrorSummary', { continue: '' })}: ${config.continueOnError ? chalk.green(this.translationManager.t('batch.yes')) : chalk.gray(this.translationManager.t('batch.no'))}`,
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
        default: true,
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

    // Log configuration details
    if (config.template) {
      const templateConfig = config.template.config;
      this.logger.info(
        `Batch processing starting with template configuration | ` +
          `Template: ${this.translationManager.t(config.template.name)} | ` +
          `Files: ${config.inputFiles?.length || 0} | ` +
          `Page: ${templateConfig.pdf.format} (${templateConfig.pdf.orientation}) | ` +
          `Margins: T:${templateConfig.pdf.margin.top} R:${templateConfig.pdf.margin.right} B:${templateConfig.pdf.margin.bottom} L:${templateConfig.pdf.margin.left} | ` +
          `Fonts: Body="${templateConfig.styles.fonts.body}", Heading="${templateConfig.styles.fonts.heading}", Code="${templateConfig.styles.fonts.code}" | ` +
          `Code Theme: ${templateConfig.styles.codeBlock.theme} | ` +
          `Style: ${templateConfig.styles.theme} | ` +
          `TOC: ${config.includeTOC ? `Enabled (Depth: ${config.tocDepth})` : 'Disabled'} | ` +
          `Page Numbers: ${config.includePageNumbers ? 'Yes' : 'No'} | ` +
          `Max Concurrent: ${config.maxConcurrentProcesses}`,
      );
    } else {
      const userConfig = this.configManager.getConfig();
      const codeTheme =
        userConfig.syntaxHighlighting?.theme ||
        this.translationManager.t('common.defaultTheme');

      this.logger.info(
        `Batch processing starting with default configuration | ` +
          `Files: ${config.inputFiles?.length || 0} | ` +
          `Page: A4 (portrait) | ` +
          `Margins: T:${DEFAULT_MARGINS.NORMAL.top} R:${DEFAULT_MARGINS.NORMAL.right} B:${DEFAULT_MARGINS.NORMAL.bottom} L:${DEFAULT_MARGINS.NORMAL.left} | ` +
          `Code Theme: ${codeTheme} | ` +
          `TOC: ${config.includeTOC ? `Enabled (Depth: ${config.tocDepth})` : 'Disabled'} | ` +
          `Page Numbers: ${config.includePageNumbers ? 'Yes' : 'No'} | ` +
          `Max Concurrent: ${config.maxConcurrentProcesses}`,
      );
    }

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
      // Update headers/footers configuration based on page numbers choice
      if (config.includePageNumbers) {
        try {
          const currentConfig = this.configManager.getConfig();

          // Update footer configuration to enable page numbers
          const updatedConfig = {
            ...currentConfig,
            headersFooters: {
              ...currentConfig.headersFooters,
              footer: {
                ...currentConfig.headersFooters.footer,
                enabled: true,
                pageNumber: {
                  ...currentConfig.headersFooters.footer.pageNumber,
                  mode: 'show' as const,
                  enabled: true,
                  alignment: 'right' as const,
                },
              },
            },
          };

          await this.configManager.updateConfig(updatedConfig);
          this.logger.debug(
            'Updated headers/footers configuration to enable page numbers in footer for batch processing',
          );
        } catch (error) {
          this.logger.warn(
            'Failed to update headers/footers configuration for batch processing:',
            error,
          );
        }
      }

      // Apply template configuration to configManager (template is now mandatory)
      let customStyles: string | undefined;
      const template = config.template!;
      this.logger.info(
        `Applying template configuration for batch: ${this.translationManager.t(template.name)}`,
      );

      // Apply template's code block theme to configuration
      if (template.config.styles.codeBlock.theme) {
        this.configManager.set(
          'syntaxHighlighting.theme',
          template.config.styles.codeBlock.theme,
        );
        this.logger.info(
          `Applied code block theme: ${template.config.styles.codeBlock.theme}`,
        );
      }

      // Apply template's style theme to configuration
      if (template.config.styles.theme) {
        this.configManager.set('styles.theme', template.config.styles.theme);
        this.logger.info(
          `Applied style theme: ${template.config.styles.theme}`,
        );
      }

      // Apply template's PDF margin configuration to ConfigManager
      // This is critical because PDF generator reads margins from ConfigManager
      this.configManager.set('pdf.margin', template.config.pdf.margin);
      this.logger.info(
        `Applied PDF margins from template: T:${template.config.pdf.margin.top} R:${template.config.pdf.margin.right} B:${template.config.pdf.margin.bottom} L:${template.config.pdf.margin.left}`,
      );

      // Reset markdown parser to pick up new syntax highlighting theme
      this.markdownParserService.resetParser();
      this.logger.info(
        'Reset markdown parser to apply new template configuration',
      );

      // Build custom styles from template fonts
      const stylesParts: string[] = [];

      if (template.config.styles.fonts.body) {
        stylesParts.push(
          `body { font-family: "${template.config.styles.fonts.body}", sans-serif; }`,
        );
      }
      if (template.config.styles.fonts.heading) {
        stylesParts.push(
          `h1, h2, h3, h4, h5, h6 { font-family: "${template.config.styles.fonts.heading}", sans-serif; }`,
        );
      }
      if (template.config.styles.fonts.code) {
        stylesParts.push(
          `code, pre { font-family: "${template.config.styles.fonts.code}", monospace; }`,
        );
      }

      if (stylesParts.length > 0) {
        customStyles = stylesParts.join('\n');
      }

      this.logger.debug('Template fonts applied as custom styles:', {
        fonts: template.config.styles.fonts,
        customStyles,
      });

      // Build template-specific headers/footers config
      // Always override user settings when using a template (same logic as single file conversion)
      const headersFootersConfig = this.buildTemplateHeadersFootersConfig(
        config.template,
      );

      const fileOptions: Record<string, unknown> = {
        outputPath: config.outputDirectory,
        includeTOC: config.includeTOC,
        tocReturnLinksLevel: config.tocReturnLinksLevel,
        tocOptions: config.includeTOC
          ? {
              maxDepth: config.tocDepth,
              includePageNumbers: config.includePageNumbers,
              title: this.translationManager.t('pdfContent.tocTitle'),
            }
          : {},
        pdfOptions: {
          margin: config.template
            ? config.template.config.pdf.margin
            : DEFAULT_MARGINS.NORMAL,
          displayHeaderFooter: false, // Force disable - using CSS @page instead
          footerTemplate: '', // Disable Puppeteer templates - using CSS @page instead
          printBackground: true,
        },
        ...(customStyles && { customStyles }), // Apply template styles if defined
      };

      // Use headers/footers config if available, otherwise fallback to legacy page numbers
      if (
        headersFootersConfig &&
        (headersFootersConfig.header.enabled ||
          headersFootersConfig.footer.enabled)
      ) {
        fileOptions.headersFootersConfig = headersFootersConfig;

        // Determine if page numbers should be shown in TOC based on headers/footers config
        if (config.includeTOC) {
          const shouldShowPageNumbers =
            headersFootersConfig.header.pageNumber.enabled ||
            headersFootersConfig.footer.pageNumber.enabled;
          (fileOptions.tocOptions as any).includePageNumbers =
            shouldShowPageNumbers;
        }
      } else if (config.includePageNumbers) {
        fileOptions.includePageNumbers = config.includePageNumbers; // Legacy fallback

        // Set TOC page numbers for legacy mode
        if (config.includeTOC) {
          (fileOptions.tocOptions as any).includePageNumbers =
            config.includePageNumbers;
        }
      }

      // Chinese font support can be configured via custom styles if needed

      // Enable two-stage rendering for batch processing when TOC with page numbers is requested
      if (config.includeTOC && config.includePageNumbers) {
        fileOptions.twoStageRendering = {
          enabled: true,
          forceAccuratePageNumbers: true,
          maxPerformanceImpact: 50, // Moderate performance impact for batch processing
        };
        this.logger.info(
          'Two-stage rendering enabled for batch processing with accurate page numbers',
        );
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

  /**
   * Get batch config from template with minimal prompts
   */
  private async getBatchConfigFromTemplate(
    inputPattern: string,
    template: Template,
    inquirer: InquirerModule,
  ): Promise<BatchConversionConfig> {
    // Show template info
    console.log(
      chalk.cyan(
        `\n✨ ${this.translationManager.t('templates.messages.usingTemplate')}: ${this.translationManager.t(template.name)}`,
      ),
    );

    this.uiManager.showInfo(
      this.translationManager.t('batch.configurationOptions'),
    );
    this.uiManager.showNewline();

    // Only ask essential batch-specific questions
    const answers = await inquirer.default.prompt([
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
        when: (ans: any) => ans.filenameFormat === BatchFilenameFormat.CUSTOM,
        validate: (input: string): boolean | string => {
          if (!input.includes('{name}')) {
            return this.translationManager.t('batch.patternMustIncludeName');
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'adjustSettings',
        message: this.translationManager.t('templates.prompts.adjustSettings'),
        default: false,
      },
    ]);

    // Build config from template
    const config: BatchConversionConfig = {
      inputPattern,
      inputFiles: [], // Will be filled later
      outputDirectory: PathCleaner.cleanPath(answers.outputDirectory),
      filenameFormat: answers.filenameFormat || BatchFilenameFormat.ORIGINAL,
      customFilenamePattern: answers.customFilenamePattern,
      preserveDirectoryStructure: false, // Default value
      includeTOC: template.config.features.toc,
      tocDepth: template.config.features.tocDepth,
      tocReturnLinksLevel: Math.min(
        template.config.features.anchorDepth,
        5,
      ) as TOCReturnLinkLevel,
      includePageNumbers: template.config.features.pageNumbers,
      maxConcurrentProcesses: 3, // Default value
      continueOnError: true, // Default value
      template: template,
    };

    // If user wants to adjust settings, ask for TOC and page numbers
    if (answers.adjustSettings) {
      const adjustAnswers = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'includeTOC',
          message: this.translationManager.t('batch.includeTOCPrompt'),
          choices: [
            {
              name: this.translationManager.t('common.status.yes'),
              value: true,
            },
            {
              name: this.translationManager.t('common.status.no'),
              value: false,
            },
          ],
          default: template.config.features.toc ? 0 : 1,
        },
        {
          type: 'list',
          name: 'tocDepth',
          message: this.translationManager.t('batch.selectTocDepth'),
          choices: [
            { name: this.translationManager.t('common.tocLevels.1'), value: 1 },
            { name: this.translationManager.t('common.tocLevels.2'), value: 2 },
            { name: this.translationManager.t('common.tocLevels.3'), value: 3 },
            { name: this.translationManager.t('common.tocLevels.4'), value: 4 },
            { name: this.translationManager.t('common.tocLevels.5'), value: 5 },
            { name: this.translationManager.t('common.tocLevels.6'), value: 6 },
          ],
          default: template.config.features.tocDepth - 1,
          when: (ans: any) => ans.includeTOC,
        },
        {
          type: 'confirm',
          name: 'includePageNumbers',
          message: this.translationManager.t('batch.includePageNumbers'),
          default: template.config.features.pageNumbers,
        },
        {
          type: 'list',
          name: 'tocReturnLinksLevel',
          message: this.translationManager.t('batch.tocReturnLinksLevel'),
          choices: [
            {
              name: this.translationManager.t('common.tocReturnLinksLevels.0'),
              value: 0,
            },
            {
              name: this.translationManager.t('common.tocReturnLinksLevels.1'),
              value: 1,
            },
            {
              name: this.translationManager.t('common.tocReturnLinksLevels.2'),
              value: 2,
            },
            {
              name: this.translationManager.t('common.tocReturnLinksLevels.3'),
              value: 3,
            },
            {
              name: this.translationManager.t('common.tocReturnLinksLevels.4'),
              value: 4,
            },
            {
              name: this.translationManager.t('common.tocReturnLinksLevels.5'),
              value: 5,
            },
          ],
          default: Math.min(template.config.features.anchorDepth, 5),
          when: (ans: any) => ans.includeTOC,
        },
      ]);

      config.includeTOC = adjustAnswers.includeTOC ?? config.includeTOC;
      config.tocDepth = adjustAnswers.tocDepth ?? config.tocDepth;
      config.includePageNumbers =
        adjustAnswers.includePageNumbers ?? config.includePageNumbers;
      config.tocReturnLinksLevel =
        adjustAnswers.tocReturnLinksLevel ?? config.tocReturnLinksLevel;
    }

    return config;
  }

  /**
   * Select template for batch conversion (mandatory)
   */
  private async selectTemplate(): Promise<Template> {
    const inquirer = (await import('inquirer')) as InquirerModule;

    // Get all templates (system + custom)
    const allTemplates = await this.templateStorage.getAllTemplates();
    const templates = [...allTemplates.system, ...allTemplates.custom];

    if (templates.length === 0) {
      this.uiManager.showError(
        this.translationManager.t('templates.messages.noTemplates'),
      );
      throw new Error('No templates available for conversion');
    }

    // Create choices with template information
    const choices = templates.map((t) => ({
      name: `[${this.translationManager.t(`templates.types.${t.type}`)}] ${this.translationManager.t(t.name)} - ${this.translationManager.t(t.description)}`,
      value: t.id,
    }));

    const { templateId } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'templateId',
        message: this.translationManager.t(
          'templates.prompts.selectTemplateForConversion',
        ),
        choices,
        pageSize: 10,
      },
    ]);

    const template = await this.templateStorage.read(templateId);
    if (!template) {
      this.uiManager.showError(
        this.translationManager.t('templates.messages.templateNotFound'),
      );
      throw new Error(`Template ${templateId} not found`);
    }

    return template;
  }

  /**
   * Build template-specific headers/footers configuration
   * Uses the same logic and alignment settings as single file conversion mode
   */
  private buildTemplateHeadersFootersConfig(
    template?: Template,
  ): import('../../core/headers-footers/types').HeadersFootersConfig {
    if (!template) {
      // No template provided, use user's global settings as fallback
      const userConfig = this.configManager.getConfig();
      return userConfig.headersFooters;
    }

    // Extract header and footer content from template
    const headerContent = template.config.headerFooter.header.content || '';
    const footerContent = template.config.headerFooter.footer.content || '';

    // Build template-specific headers/footers config
    // Always use template settings (same alignment as single file conversion mode)
    return {
      header: {
        enabled: template.config.headerFooter.header.enabled,
        title: {
          enabled: headerContent.includes('{{title}}'),
          mode: headerContent.includes('{{title}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'left' as const, // Left-aligned headers (same as single file mode)
        },
        pageNumber: {
          enabled: headerContent.includes('{{pageNumber}}'),
          mode: headerContent.includes('{{pageNumber}}')
            ? ('show' as const)
            : ('none' as const),
          alignment: 'left' as const,
        },
        dateTime: {
          enabled:
            headerContent.includes('{{date}}') ||
            headerContent.includes('{{time}}'),
          mode:
            headerContent.includes('{{date}}') ||
            headerContent.includes('{{time}}')
              ? ('date-short' as const)
              : ('none' as const),
          alignment: 'left' as const,
        },
        copyright: {
          enabled: headerContent.includes('{{copyright}}'),
          mode: headerContent.includes('{{copyright}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'left' as const,
        },
        message: {
          enabled: Boolean(headerContent && !headerContent.includes('{{')),
          mode: 'custom' as const,
          customValue: headerContent,
          alignment: 'left' as const,
        },
        author: {
          enabled: headerContent.includes('{{author}}'),
          mode: headerContent.includes('{{author}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'left' as const,
        },
        organization: {
          enabled: headerContent.includes('{{organization}}'),
          mode: headerContent.includes('{{organization}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'left' as const,
        },
        version: {
          enabled: headerContent.includes('{{version}}'),
          mode: headerContent.includes('{{version}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'left' as const,
        },
        category: {
          enabled: headerContent.includes('{{category}}'),
          mode: headerContent.includes('{{category}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'left' as const,
        },
        layout: {},
      },
      footer: {
        enabled: template.config.headerFooter.footer.enabled,
        title: {
          enabled: footerContent.includes('{{title}}'),
          mode: footerContent.includes('{{title}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'right' as const, // Right-aligned footers (same as single file mode)
        },
        pageNumber: {
          enabled: template.config.features.pageNumbers,
          mode: template.config.features.pageNumbers
            ? ('show' as const)
            : ('none' as const),
          alignment: 'right' as const,
        },
        dateTime: {
          enabled:
            footerContent.includes('{{date}}') ||
            footerContent.includes('{{time}}'),
          mode:
            footerContent.includes('{{date}}') ||
            footerContent.includes('{{time}}')
              ? ('date-short' as const)
              : ('none' as const),
          alignment: 'right' as const,
        },
        copyright: {
          enabled: footerContent.includes('{{copyright}}'),
          mode: footerContent.includes('{{copyright}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'right' as const,
        },
        message: {
          enabled: Boolean(footerContent && !footerContent.includes('{{')),
          mode: 'custom' as const,
          customValue: footerContent,
          alignment: 'right' as const,
        },
        author: {
          enabled: footerContent.includes('{{author}}'),
          mode: footerContent.includes('{{author}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'right' as const,
        },
        organization: {
          enabled: footerContent.includes('{{organization}}'),
          mode: footerContent.includes('{{organization}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'right' as const,
        },
        version: {
          enabled: footerContent.includes('{{version}}'),
          mode: footerContent.includes('{{version}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'right' as const,
        },
        category: {
          enabled: footerContent.includes('{{category}}'),
          mode: footerContent.includes('{{category}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'right' as const,
        },
        layout: {},
      },
    };
  }
}
