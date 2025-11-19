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
import type { IMarkdownParserService } from '../../application/services/markdown-parser.service';
import type { TemplateStorageService } from '../../core/templates/storage.service';
import type { Template } from '../../core/templates/types';
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
  private markdownParserService: IMarkdownParserService;
  private fileSystemManager: IFileSystemManager | undefined;
  private logger: ILogger;
  private translationManager: ITranslationManager;
  private templateStorage: TemplateStorageService;
  private uiManager: CliUIManager;

  constructor(container: ServiceContainer) {
    this.logger = container.resolve<ILogger>('logger');
    this.errorHandler = container.resolve<IErrorHandler>('errorHandler');
    this.translationManager =
      container.resolve<ITranslationManager>('translator');
    this.fileProcessorService = container.resolve<IFileProcessorService>(
      APPLICATION_SERVICE_NAMES.FILE_PROCESSOR,
    );
    this.markdownParserService = container.resolve<IMarkdownParserService>(
      APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER,
    );
    // fileSystem is optional in some test setups, tryResolve will return undefined when not registered
    this.fileSystemManager =
      container.tryResolve<IFileSystemManager>('fileSystem');
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
                  name: this.translationManager.t('common.menu.returnToMain'),
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

    // Select template for conversion (mandatory - will throw if no templates available)
    const selectedTemplate = await this.selectTemplate();

    // Use template config with optional adjustments
    return this.getConfigFromTemplate(
      selectedInputPath,
      selectedTemplate,
      inquirer,
    );
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

    // Show template configuration (template is now mandatory)
    this.uiManager.showNewline();

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

      // Step 1: Update headers/footers configuration based on page numbers choice
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
            'Updated headers/footers configuration to enable page numbers in footer',
          );
        } catch (error) {
          this.logger.warn(
            'Failed to update headers/footers configuration:',
            error,
          );
        }
      }

      // Step 2: Prepare processing options
      spinner.text = this.translationManager.t('interactive.preparingOptions');
      const outputPath =
        config.outputPath ||
        config.inputPath.replace(/\.(md|markdown)$/, '.pdf');

      // Get user's headers/footers preferences (fallback if no template)
      const userConfig = this.configManager.getConfig();
      let headersFootersConfig = userConfig.headersFooters;

      // If template is provided, use template's configuration
      let pdfMargin: {
        top: string;
        right: string;
        bottom: string;
        left: string;
      } = DEFAULT_MARGINS.NORMAL;
      let displayHeaderFooter = false;
      let customStyles: string | undefined;

      if (config.template) {
        const template = config.template;
        this.logger.info(
          `Applying template configuration: ${this.translationManager.t(template.name)}`,
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

        // Use template's PDF margin configuration
        pdfMargin = {
          top: template.config.pdf.margin.top,
          right: template.config.pdf.margin.right,
          bottom: template.config.pdf.margin.bottom,
          left: template.config.pdf.margin.left,
        };
        displayHeaderFooter = template.config.pdf.displayHeaderFooter;

        // Build template-specific headers/footers config
        // Convert simple template header/footer config to complex system config
        if (
          template.config.headerFooter.header.enabled ||
          template.config.headerFooter.footer.enabled
        ) {
          const headerContent =
            template.config.headerFooter.header.content || '';
          const footerContent =
            template.config.headerFooter.footer.content || '';

          headersFootersConfig = {
            header: {
              enabled: template.config.headerFooter.header.enabled,
              title: {
                enabled: headerContent.includes('{{title}}'),
                mode: headerContent.includes('{{title}}')
                  ? ('metadata' as const)
                  : ('none' as const),
                alignment: 'center' as const,
              },
              pageNumber: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              dateTime: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              copyright: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              message: {
                enabled: Boolean(
                  headerContent && !headerContent.includes('{{'),
                ),
                mode: 'custom' as const,
                customValue: headerContent,
                alignment: 'center' as const,
              },
              author: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              organization: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              version: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              category: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              layout: {},
            },
            footer: {
              enabled: template.config.headerFooter.footer.enabled,
              title: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              pageNumber: {
                enabled: template.config.features.pageNumbers,
                mode: template.config.features.pageNumbers
                  ? ('show' as const)
                  : ('none' as const),
                alignment: 'center' as const,
              },
              dateTime: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              copyright: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              message: {
                enabled: Boolean(
                  footerContent && !footerContent.includes('{{'),
                ),
                mode: 'custom' as const,
                customValue: footerContent,
                alignment: 'center' as const,
              },
              author: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              organization: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              version: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              category: {
                enabled: false,
                mode: 'none' as const,
                alignment: 'center' as const,
              },
              layout: {},
            },
          };
        }

        // Build custom styles from template
        const stylesParts: string[] = [];

        // Font configuration
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

        // Note: Line numbers are automatically enabled for all code blocks with language
        // (except 'text' or no language). No template configuration needed.

        if (stylesParts.length > 0) {
          customStyles = stylesParts.join('\n');
        }

        this.logger.debug('Template configuration applied:', {
          margin: pdfMargin,
          displayHeaderFooter,
          fonts: template.config.styles.fonts,
          codeBlockTheme: template.config.styles.codeBlock.theme,
        });
      }

      const processingOptions: FileProcessingOptions = {
        outputPath,
        includeTOC: config.includeTOC,
        tocReturnLinksLevel: config.tocReturnLinksLevel ?? 0, // Add TOC return links level with default
        pdfOptions: {
          margin: pdfMargin,
          displayHeaderFooter: false, // Force disable - using CSS @page instead
          footerTemplate: '', // Disable Puppeteer templates - using CSS @page instead
          printBackground: true,
        },
        ...(customStyles && { customStyles }), // Apply template styles if defined
      };

      // Log detailed configuration for transparency
      this.logger.info('=== Conversion Configuration ===');
      this.logger.info(`Input: ${config.inputPath}`);
      this.logger.info(`Output: ${outputPath}`);

      if (config.template) {
        this.logger.info(
          `Template: ${this.translationManager.t(config.template.name)}`,
        );
        this.logger.info(
          `  - Page Format: ${config.template.config.pdf.format} (${config.template.config.pdf.orientation})`,
        );
        this.logger.info(
          `  - Margins: T:${pdfMargin.top} R:${pdfMargin.right} B:${pdfMargin.bottom} L:${pdfMargin.left}`,
        );
        this.logger.info(
          `  - Fonts: Body="${config.template.config.styles.fonts.body}", Heading="${config.template.config.styles.fonts.heading}", Code="${config.template.config.styles.fonts.code}"`,
        );
        this.logger.info(
          `  - Code Block Theme: ${config.template.config.styles.codeBlock.theme}`,
        );
      } else {
        this.logger.info('Template: None (using default configuration)');
        this.logger.info(`  - Page Format: A4 (portrait)`);
        this.logger.info(
          `  - Margins: T:${pdfMargin.top} R:${pdfMargin.right} B:${pdfMargin.bottom} L:${pdfMargin.left}`,
        );
        const userConfig = this.configManager.getConfig();
        this.logger.info(
          `  - Code Block Theme: ${userConfig.syntaxHighlighting?.theme || 'default'}`,
        );
      }

      this.logger.info(
        `TOC: ${config.includeTOC ? 'Enabled' : 'Disabled'}${config.includeTOC ? ` (Depth: ${config.tocDepth}, Return Links: ${config.tocReturnLinksLevel})` : ''}`,
      );
      this.logger.info(
        `Page Numbers: ${config.includePageNumbers ? 'Enabled' : 'Disabled'}`,
      );
      this.logger.info('================================');

      // Use headers/footers config if available, otherwise fallback to legacy page numbers
      if (
        headersFootersConfig &&
        (headersFootersConfig.header.enabled ||
          headersFootersConfig.footer.enabled)
      ) {
        processingOptions.headersFootersConfig = headersFootersConfig;
      } else if (config.includePageNumbers) {
        processingOptions.includePageNumbers = config.includePageNumbers; // Legacy fallback
      }

      // Add tocOptions conditionally to avoid undefined assignment
      if (config.includeTOC) {
        // Determine if page numbers should be shown in TOC based on headers/footers config or legacy setting
        const shouldShowPageNumbers = headersFootersConfig
          ? headersFootersConfig.header.pageNumber.enabled ||
            headersFootersConfig.footer.pageNumber.enabled
          : (config.includePageNumbers ?? true);

        processingOptions.tocOptions = {
          maxDepth: config.tocDepth,
          includePageNumbers: shouldShowPageNumbers,
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
   * Get conversion config from template with optional adjustments
   */
  private async getConfigFromTemplate(
    inputPath: string,
    template: Template,
    inquirer: any,
  ): Promise<ConversionConfig> {
    // Show template info
    console.log(
      chalk.cyan(
        `\n✨ ${this.translationManager.t('templates.messages.usingTemplate')}: ${this.translationManager.t(template.name)}`,
      ),
    );

    // Ask if user wants to adjust settings
    const { adjustSettings } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'adjustSettings',
        message: this.translationManager.t('templates.prompts.adjustSettings'),
        default: false,
      },
    ]);

    // Prompt for output path and optional adjustments
    const answers = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'outputPath',
        message: this.translationManager.t('interactive.enterOutputPath'),
        default: inputPath.replace(/\.(md|markdown)$/, '.pdf'),
      },
      ...(adjustSettings
        ? [
            {
              type: 'confirm' as const,
              name: 'includeTOC',
              message: this.translationManager.t('interactive.includeTOC'),
              default: template.config.features.toc,
            },
            {
              type: 'list' as const,
              name: 'tocDepth',
              message: this.translationManager.t('interactive.selectTocDepth'),
              choices: [
                {
                  name: this.translationManager.t('common.tocLevels.1'),
                  value: 1,
                },
                {
                  name: this.translationManager.t('common.tocLevels.2'),
                  value: 2,
                },
                {
                  name: this.translationManager.t('common.tocLevels.3'),
                  value: 3,
                },
                {
                  name: this.translationManager.t('common.tocLevels.4'),
                  value: 4,
                },
                {
                  name: this.translationManager.t('common.tocLevels.5'),
                  value: 5,
                },
                {
                  name: this.translationManager.t('common.tocLevels.6'),
                  value: 6,
                },
              ],
              default: template.config.features.tocDepth,
              when: (ans: any) => ans.includeTOC,
            },
            {
              type: 'confirm' as const,
              name: 'includePageNumbers',
              message: this.translationManager.t(
                'interactive.includePageNumbers',
              ),
              default: template.config.features.pageNumbers,
            },
            {
              type: 'list' as const,
              name: 'tocReturnLinksLevel',
              message: this.translationManager.t(
                'interactive.tocReturnLinksLevel',
              ),
              choices: [
                {
                  name: this.translationManager.t(
                    'common.tocReturnLinksLevels.0',
                  ),
                  value: 0,
                },
                {
                  name: this.translationManager.t(
                    'common.tocReturnLinksLevels.1',
                  ),
                  value: 1,
                },
                {
                  name: this.translationManager.t(
                    'common.tocReturnLinksLevels.2',
                  ),
                  value: 2,
                },
                {
                  name: this.translationManager.t(
                    'common.tocReturnLinksLevels.3',
                  ),
                  value: 3,
                },
                {
                  name: this.translationManager.t(
                    'common.tocReturnLinksLevels.4',
                  ),
                  value: 4,
                },
                {
                  name: this.translationManager.t(
                    'common.tocReturnLinksLevels.5',
                  ),
                  value: 5,
                },
              ],
              default: Math.min(template.config.features.anchorDepth, 5),
              when: (ans: any) => ans.includeTOC,
            },
          ]
        : []),
    ]);

    // Build config from template
    const config: ConversionConfig = {
      inputPath,
      outputPath: answers.outputPath,
      includeTOC: adjustSettings
        ? (answers.includeTOC ?? template.config.features.toc)
        : template.config.features.toc,
      tocDepth: adjustSettings
        ? (answers.tocDepth ?? template.config.features.tocDepth)
        : template.config.features.tocDepth,
      includePageNumbers: adjustSettings
        ? (answers.includePageNumbers ?? template.config.features.pageNumbers)
        : template.config.features.pageNumbers,
      tocReturnLinksLevel: adjustSettings
        ? (answers.tocReturnLinksLevel ??
          Math.min(template.config.features.anchorDepth, 5))
        : Math.min(template.config.features.anchorDepth, 5),
      template, // Include template reference for complete configuration
    };

    return config;
  }

  /**
   * Select template for conversion (mandatory)
   */
  private async selectTemplate(): Promise<Template> {
    const inquirer = await import('inquirer');

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

    const { templateId } = await (inquirer as InquirerModule).default.prompt<{
      templateId: string;
    }>([
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
