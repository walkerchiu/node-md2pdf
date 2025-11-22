/**
 * Smart Conversion Mode
 * Implements the 3-step conversion process using Smart Defaults
 */

import chalk from 'chalk';

import { ApplicationServices } from '../application/container';
import {
  ContentAnalysis,
  RecommendedConfig,
  QuickConfig,
} from '../core/analysis/types';
import { DEFAULT_MARGINS } from '../infrastructure/config/constants';
import { PathCleaner } from '../utils/path-cleaner';

import { RecentFilesManager } from './config/recent-files';
import { CliRenderer } from './utils/cli-renderer';
import { I18nHelpers } from './utils/i18n-helpers';

import type { IFileProcessorService } from '../application/services/file-processor.service';
import type { ISmartDefaultsService } from '../application/services/smart-defaults.service';
import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

interface ConversionChoice {
  type: 'back' | 'quick' | 'smart';
  name: string;
  description: string;
  config?: QuickConfig | RecommendedConfig;
}

export class SmartConversionMode {
  private smartDefaultsService: ISmartDefaultsService;
  private fileProcessorService: IFileProcessorService;
  private logger: ILogger;
  private translationManager: ITranslationManager;
  private recentFilesManager: RecentFilesManager;
  private renderer: CliRenderer;
  private i18nHelpers: I18nHelpers;

  constructor(private readonly container?: ServiceContainer) {
    if (!this.container) {
      this.container = ApplicationServices.createContainer();
    }
    this.smartDefaultsService = this.container.resolve('smartDefaults');
    this.fileProcessorService = this.container.resolve('fileProcessor');
    this.logger = this.container.resolve('logger');
    this.translationManager = this.container.resolve('translator');
    this.recentFilesManager = new RecentFilesManager();
    this.renderer = new CliRenderer();
    this.i18nHelpers = new I18nHelpers(this.translationManager);
  }

  /**
   * Main entry point for Smart Conversion Mode
   * Implements the 3-step conversion process
   */
  async start(filePath?: string): Promise<void> {
    // Show Smart Conversion header with framework
    const title = this.translationManager.t('smartConversion.title');
    const subtitle = this.translationManager.t('smartConversion.subtitle');
    const step1 = this.translationManager.t('smartConversion.step1');
    const step2 = this.translationManager.t('smartConversion.step2');
    const step3 = this.translationManager.t('smartConversion.step3');

    const borderLine = '─'.repeat(79);

    this.renderer.header([
      borderLine,
      title.padStart((79 + title.length) / 2).padEnd(79),
      borderLine,
      subtitle.padStart((79 + subtitle.length) / 2).padEnd(79),
      '',
      `  ${step1}`,
      `  ${step2}`,
      `  ${step3}`,
      borderLine,
    ]);
    this.renderer.newline();

    try {
      // Step 1: File Selection or Analysis
      const selectedFile = filePath || (await this.selectFile());
      this.renderer.info(
        chalk.green(
          `${this.translationManager.t('smartConversion.selected')}: ${selectedFile}\n`,
        ),
      );

      // Step 2: Content Analysis & Smart Recommendations
      this.renderer.info(
        chalk.yellow(
          this.translationManager.t('smartConversion.analyzingContent'),
        ),
      );
      const analysis =
        await this.smartDefaultsService.analyzeContent(selectedFile);

      this.displayAnalysisResults(analysis);

      // Step 3: Configuration Selection & Confirmation
      const conversionChoice = await this.selectConversionMode(analysis);

      // Final confirmation and conversion
      await this.confirmAndConvert(selectedFile, conversionChoice, analysis);
    } catch (error) {
      if (error instanceof Error && error.message === 'BACK_TO_MAIN_MENU') {
        this.renderer.info(
          chalk.cyan(
            this.translationManager.t('smartConversion.returningToMainMenu'),
          ),
        );
        return; // Exit smart conversion mode gracefully
      }
      this.renderer.error(
        chalk.red(
          `${this.translationManager.t('smartConversion.error')}: ${error}`,
        ),
      );
      this.logger.error(`Smart conversion failed: ${error}`);
    }
  }

  private async selectFile(): Promise<string> {
    this.renderer.info(
      chalk.gray(this.translationManager.t('smartConversion.navigationHint')),
    );
    this.renderer.newline();

    const inquirer = await import('inquirer');

    const method = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'method',
        message: this.translationManager.t(
          'smartConversion.fileSelectionPrompt',
        ),
        choices: this.i18nHelpers.createNumberedChoices(
          [
            {
              key: 'common.menu.returnToMain',
              value: 'back',
            },
            {
              key: 'smartConversion.browseFiles',
              value: 'browse',
            },
            {
              key: 'smartConversion.enterManually',
              value: 'manual',
            },
            {
              key: 'smartConversion.chooseRecent',
              value: 'recent',
            },
          ],
          0,
        ),
        default: 'browse',
      },
    ]);

    // Handle back navigation
    if (method.method === 'back') {
      throw new Error('BACK_TO_MAIN_MENU');
    }

    switch (method.method) {
      case 'back':
        throw new Error('BACK_TO_MAIN_MENU');
      case 'browse':
        return this.browseFiles();
      case 'manual':
        return this.enterFilePathWithValidation();
      case 'recent':
        return this.selectRecentFile();
      default:
        throw new Error('Invalid file selection method');
    }
  }

  private async browseFiles(): Promise<string> {
    const { FileBrowser } = await import('./utils/file-browser');
    const browser = new FileBrowser(this.translationManager);

    try {
      this.renderer.info(
        chalk.cyan(
          this.translationManager.t('smartConversion.openingFileBrowser'),
        ),
      );
      return await browser.browseDirectory();
    } catch (error) {
      if (error instanceof Error && error.message === 'BACK_TO_MAIN_MENU') {
        throw error; // Propagate back navigation request
      }
      this.logger.error(`File browsing failed: ${error}`);
      this.renderer.warn(
        chalk.yellow(
          this.translationManager.t('smartConversion.fileBrowserUnavailable'),
        ),
      );
      return this.enterFilePath();
    }
  }

  private async enterFilePath(): Promise<string> {
    const inquirer = await import('inquirer');
    const { filePath: rawFilePath } = await inquirer.default.prompt({
      type: 'input',
      name: 'filePath',
      message: this.translationManager.t('smartConversion.enterFilePath'),
      validate: (input: string) => {
        if (!input.trim())
          return this.translationManager.t(
            'smartConversion.pleaseEnterFilePath',
          );
        return true;
      },
    });

    // Clean the path to handle drag-and-drop cases
    return PathCleaner.cleanPath(rawFilePath);
  }

  private async selectRecentFile(): Promise<string> {
    try {
      const recentFiles = await this.recentFilesManager.getRecentFiles();

      if (recentFiles.length === 0) {
        this.renderer.warn(
          chalk.yellow(
            this.translationManager.t('smartConversion.recentFilesNotFound'),
          ),
        );
        return this.browseFiles();
      }

      const inquirer = await import('inquirer');

      this.renderer.info(
        chalk.cyan(
          '\n' + this.translationManager.t('smartConversion.recentFiles'),
        ),
      );
      recentFiles.slice(0, 5).forEach((file, index) => {
        const displayPath = this.recentFilesManager.formatFilePath(file.path);
        const size = this.recentFilesManager.formatFileSize(file.size);
        const lastUsed = this.recentFilesManager.formatLastUsed(file.lastUsed);

        this.renderer.info(`   ${index + 1}. ${chalk.green(displayPath)}`);
        this.renderer.info(`      ${chalk.gray(`${size} • ${lastUsed}`)}`);
      });
      this.renderer.newline();

      const choices = recentFiles.map((file, index) => ({
        name: `${index + 1}. ${this.recentFilesManager.formatFilePath(file.path)} ${chalk.gray(
          `(${this.recentFilesManager.formatLastUsed(file.lastUsed)})`,
        )}`,
        value: file.path,
      }));

      // Add option to browse for other files
      choices.push({
        name: chalk.blue(
          this.translationManager.t('smartConversion.browseOtherFiles'),
        ),
        value: '__browse__',
      });

      const { filePath } = await inquirer.default.prompt({
        type: 'list',
        name: 'filePath',
        message: this.translationManager.t('smartConversion.selectRecentFile'),
        choices,
        pageSize: 8,
      });

      if (filePath === '__browse__') return this.browseFiles();

      return filePath;
    } catch (error) {
      this.renderer.warn(
        chalk.yellow(
          this.translationManager.t('smartConversion.recentFilesError'),
        ),
      );
      this.logger.warn(`Recent files error: ${error}`);
      return this.browseFiles();
    }
  }

  private displayAnalysisResults(analysis: ContentAnalysis): void {
    this.renderer.newline();

    // Title (emoji already in translation)
    console.log(
      chalk.cyan(this.translationManager.t('smartConversion.analysisResults')),
    );
    console.log();

    // Basic statistics (5-space indent, unified cyan color for all values)
    console.log(
      `     ${this.translationManager.t('smartConversion.words')}: ${chalk.cyan(analysis.wordCount.toLocaleString())}`,
    );
    console.log(
      `     ${this.translationManager.t('smartConversion.readingTime')}: ${chalk.cyan(analysis.readingTime)} ${chalk.gray(this.translationManager.t('smartConversion.minutes'))}`,
    );
    console.log(
      `     ${this.translationManager.t('smartConversion.headings')}: ${chalk.cyan(analysis.headingStructure.totalHeadings)} ${chalk.gray(`(${this.translationManager.t('smartConversion.maxDepth')}: ${analysis.headingStructure.maxDepth})`)}`,
    );
    console.log(
      `     ${this.translationManager.t('smartConversion.language')}: ${chalk.cyan(this.getLanguageDisplay(analysis.languageDetection.primary))}`,
    );

    // Code blocks
    if (analysis.codeBlocks.length > 0) {
      console.log(
        `     ${this.translationManager.t('smartConversion.codeBlocks')}: ${chalk.cyan(analysis.codeBlocks.length)}`,
      );
    }

    // Tables
    if (analysis.tables.length > 0) {
      console.log(
        `     ${this.translationManager.t('smartConversion.tables')}: ${chalk.cyan(analysis.tables.length)}`,
      );
    }

    // Images
    if (analysis.mediaElements.images > 0) {
      console.log(
        `     ${this.translationManager.t('smartConversion.images')}: ${chalk.cyan(analysis.mediaElements.images)}`,
      );
    }

    // Document type and complexity
    console.log(
      `     ${this.translationManager.t('smartConversion.documentType')}: ${chalk.cyan(this.getDocumentTypeDisplay(analysis.contentComplexity.documentType))}`,
    );
    console.log(
      `     ${this.translationManager.t('smartConversion.complexity')}: ${chalk.cyan(analysis.contentComplexity.score)} / 10`,
    );

    // Content characteristics (if any)
    if (analysis.contentComplexity.factors.length > 0) {
      console.log(
        `     ${this.translationManager.t('smartConversion.contentCharacteristics')}:`,
      );
      analysis.contentComplexity.factors.forEach((factor) => {
        const translatedDescription = this.translationManager.t(
          factor.description,
          factor.params,
        );
        console.log(`       • ${chalk.gray(translatedDescription)}`);
      });
    }

    this.renderer.newline();
  }

  private async selectConversionMode(
    analysis: ContentAnalysis,
  ): Promise<ConversionChoice> {
    const inquirer = await import('inquirer');

    // Get quick conversion config (auto-select best template)
    const quickConfig =
      await this.smartDefaultsService.getQuickConversionConfig(analysis);

    // Get smart recommendation (full custom analysis)
    const smartConfig =
      await this.smartDefaultsService.recommendSettings(analysis);

    const choices: ConversionChoice[] = [
      {
        type: 'back',
        name: this.translationManager.t('common.menu.returnToPrevious'),
        description: '',
      },
      {
        type: 'smart',
        name: this.translationManager.t('smartConversion.smartRecommendations'),
        description: `${this.translationManager.t('smartConversion.customConfiguration')} ${(smartConfig.confidence * 100).toFixed(1)}% ${this.translationManager.t('smartConversion.confidence')}`,
        config: smartConfig,
      },
      {
        type: 'quick',
        name: this.translationManager.t('smartConversion.quickConversion'),
        description: this.translationManager.t(
          'smartConversion.quickConversionDescription',
        ),
        config: quickConfig,
      },
    ];

    // Build inquirer choices with descriptions and numbering
    const inquirerChoices = choices.map((choice, index) => {
      // Add numbering: 0. for back, 1, 2, 3... for others
      let displayName = `${index}. ${choice.name}`;

      if (choice.description) {
        displayName += `\n     ${chalk.gray(choice.description)}`;
      }

      return {
        name: displayName,
        value: index,
      };
    });

    const { selectedIndex } = await inquirer.default.prompt({
      type: 'list',
      name: 'selectedIndex',
      message: this.translationManager.t(
        'smartConversion.enterConversionOptions',
      ),
      choices: inquirerChoices,
      default: 1, // Default to Smart Custom Configuration (index 1)
      pageSize: 10,
    });

    let selectedChoice = choices[selectedIndex];

    // Handle back navigation
    if (selectedChoice.type === 'back') {
      throw new Error('BACK_TO_MAIN_MENU');
    }

    return selectedChoice;
  }

  private async confirmAndConvert(
    filePath: string,
    choice: ConversionChoice,
    analysis: ContentAnalysis,
  ): Promise<void> {
    const inquirer = await import('inquirer');

    this.renderer.info(
      chalk.cyan(
        '\n' + this.translationManager.t('smartConversion.conversionSummary'),
      ),
    );
    this.renderer.info(
      `   ${this.translationManager.t('smartConversion.input')}: ${filePath}`,
    );

    // Show specific template name for quick conversion
    let configDisplay = choice.name;
    let selectedTemplateId: string | undefined;
    if (choice.type === 'quick' && choice.config && 'name' in choice.config) {
      selectedTemplateId = choice.config.name;
      const templateName = this.translationManager.t(choice.config.name);
      const autoSelected = this.translationManager.t(
        'smartConversion.autoSelected',
      );
      configDisplay = `${templateName}（${autoSelected}）`;
    }

    this.renderer.info(
      `   ${this.translationManager.t('smartConversion.configuration')}: ${configDisplay}`,
    );
    this.renderer.info(
      `   📄 ${analysis.wordCount.toLocaleString()} ${this.translationManager.t('smartConversion.wordsLabel')}, ${analysis.headingStructure.totalHeadings} ${this.translationManager.t('smartConversion.headingsLabel')}`,
    );

    // Generate output path suggestion
    const outputPath = filePath.replace(/\.(md|markdown)$/i, '.pdf');

    // Smart conversion should automatically determine TOC settings
    const includeTOC = choice.config
      ? this.getRecommendedTOCValue(choice.config, analysis)
      : analysis.headingStructure.totalHeadings > 3;

    const tocDepth = choice.config
      ? this.getRecommendedTOCDepth(choice.config, analysis)
      : Math.min(analysis.headingStructure.maxDepth, 3);

    // Build configuration-specific headers/footers config
    // When a template is selected, use template's headerFooter configuration
    const headersFootersConfig = await this.buildHeadersFootersConfig(
      choice.config,
      selectedTemplateId,
      analysis,
    );

    // Display smart decisions
    this.renderer.info(
      chalk.cyan(
        `\n📋 ${this.translationManager.t('smartConversion.smartConfigApplied')}`,
      ),
    );
    this.renderer.info(
      `   📚 ${this.translationManager.t('smartConversion.tableOfContents')}: ${includeTOC ? this.translationManager.t('common.status.yes') : this.translationManager.t('common.status.no')}${includeTOC ? ` (${tocDepth} ${this.translationManager.t('smartConversion.levels')})` : ''}`,
    );

    // Display headers/footers information based on user preferences
    if (
      headersFootersConfig &&
      (headersFootersConfig.header.enabled ||
        headersFootersConfig.footer.enabled)
    ) {
      if (headersFootersConfig.header.enabled) {
        const headerItems: string[] = [];
        if (headersFootersConfig.header.title.enabled)
          headerItems.push(this.translationManager.t('common.fields.title'));
        if (headersFootersConfig.header.pageNumber.enabled)
          headerItems.push(
            this.translationManager.t('common.fields.pageNumber'),
          );
        if (headersFootersConfig.header.dateTime.enabled)
          headerItems.push(this.translationManager.t('common.fields.dateTime'));
        if (headersFootersConfig.header.copyright.enabled)
          headerItems.push(
            this.translationManager.t('common.fields.copyright'),
          );
        if (headersFootersConfig.header.message.enabled)
          headerItems.push(this.translationManager.t('common.fields.message'));
        if (headersFootersConfig.header.author.enabled)
          headerItems.push(this.translationManager.t('common.fields.author'));
        if (headersFootersConfig.header.organization.enabled)
          headerItems.push(
            this.translationManager.t('common.fields.organization'),
          );
        if (headersFootersConfig.header.version.enabled)
          headerItems.push(this.translationManager.t('common.fields.version'));
        if (headersFootersConfig.header.category.enabled)
          headerItems.push(this.translationManager.t('common.fields.category'));

        this.renderer.info(
          `   📄 ${this.translationManager.t('headersFooters.sections.header')}: ${headerItems.length > 0 ? headerItems.join('、') : this.translationManager.t('common.status.enabled')}`,
        );
      }

      if (headersFootersConfig.footer.enabled) {
        const footerItems: string[] = [];
        if (headersFootersConfig.footer.title.enabled)
          footerItems.push(this.translationManager.t('common.fields.title'));
        if (headersFootersConfig.footer.pageNumber.enabled)
          footerItems.push(
            this.translationManager.t('common.fields.pageNumber'),
          );
        if (headersFootersConfig.footer.dateTime.enabled)
          footerItems.push(this.translationManager.t('common.fields.dateTime'));
        if (headersFootersConfig.footer.copyright.enabled)
          footerItems.push(
            this.translationManager.t('common.fields.copyright'),
          );
        if (headersFootersConfig.footer.message.enabled)
          footerItems.push(this.translationManager.t('common.fields.message'));
        if (headersFootersConfig.footer.author.enabled)
          footerItems.push(this.translationManager.t('common.fields.author'));
        if (headersFootersConfig.footer.organization.enabled)
          footerItems.push(
            this.translationManager.t('common.fields.organization'),
          );
        if (headersFootersConfig.footer.version.enabled)
          footerItems.push(this.translationManager.t('common.fields.version'));
        if (headersFootersConfig.footer.category.enabled)
          footerItems.push(this.translationManager.t('common.fields.category'));

        this.renderer.info(
          `   📄 ${this.translationManager.t('headersFooters.sections.footer')}: ${footerItems.length > 0 ? footerItems.join('、') : this.translationManager.t('common.status.enabled')}`,
        );
      }
    } else if (includeTOC) {
      // Fallback to legacy page numbers display when no headers/footers configured
      this.renderer.info(
        `   📄 ${this.translationManager.t('smartConversion.pageNumbersLabel')}: ${this.translationManager.t('common.status.yes')}`,
      );
    }
    this.renderer.info('');

    const { confirmed, finalOutputPath } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'finalOutputPath',
        message: this.translationManager.t('smartConversion.outputFilePath'),
        default: outputPath,
      },
      {
        type: 'confirm',
        name: 'confirmed',
        message: this.translationManager.t('smartConversion.startConversion'),
        default: true,
      },
    ]);

    if (!confirmed) {
      this.renderer.warn(
        chalk.yellow(
          this.translationManager.t('smartConversion.conversionCancelled'),
        ),
      );
      return;
    }

    // Actual conversion logic
    this.renderer.info(
      chalk.green(
        '\n' + this.translationManager.t('smartConversion.startingConversion'),
      ),
    );

    try {
      const startTime = Date.now();

      // Convert configuration to the format expected by file processor
      const processingConfig = this.convertToProcessingConfig(
        choice.config,
        analysis,
        includeTOC,
        tocDepth,
        undefined, // tocReturnLinksLevel - use default
        undefined, // anchorLinksEnabled - use default
        headersFootersConfig,
      );

      // Start progress indication
      const progressInterval = this.showProgress();

      // Debug logging for options being passed to file processor
      const finalOptions = {
        outputPath: finalOutputPath,
        ...processingConfig,
      };
      this.logger.debug(
        'Smart conversion mode passing options to file processor:',
        {
          finalOptions,
          includeTOC,
          tocDepth,
          processingConfig,
        },
      );

      // Perform the actual conversion
      await this.fileProcessorService.processFile(filePath, finalOptions);

      clearInterval(progressInterval);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      // Get output file stats
      const { promises: fs } = await import('fs');
      let outputStats;
      try {
        outputStats = await fs.stat(finalOutputPath);
      } catch {
        // Ignore if we can't get stats
      }

      this.renderer.info(
        chalk.green(
          `\n${this.translationManager.t('smartConversion.conversionCompleted')} in ${duration}s!`,
        ),
      );
      this.renderer.info(
        chalk.gray(
          `${this.translationManager.t('smartConversion.output')}: ${finalOutputPath}`,
        ),
      );

      if (outputStats) {
        const fileSizeKB = (outputStats.size / 1024).toFixed(1);
        this.renderer.info(
          chalk.gray(
            `${this.translationManager.t('smartConversion.fileSize')}: ${fileSizeKB} KB`,
          ),
        );
      }

      // Add to recent files
      await this.addToRecentFiles(filePath);

      // Show next steps
      this.renderer.info(
        chalk.cyan(
          '\n' + this.translationManager.t('smartConversion.nextSteps'),
        ),
      );
      this.renderer.info(
        `   ${this.translationManager.t('smartConversion.openPdf')} ${chalk.white(finalOutputPath)}`,
      );
      this.renderer.info(
        `   ${this.translationManager.t('smartConversion.convertAnother')}`,
      );
      this.renderer.newline();
    } catch (error) {
      this.renderer.error(
        chalk.red(
          `\n${this.translationManager.t('smartConversion.conversionFailed')}: ${error}`,
        ),
      );
      this.logger.error('Smart conversion failed', error);
      throw error;
    }
  }

  private getLanguageDisplay(lang: string): string {
    const translationKey = `smartConversion.languageDisplay.${lang}`;
    const display = this.translationManager.t(translationKey);
    return display !== translationKey ? display : lang;
  }

  private getDocumentTypeDisplay(type: string): string {
    const translationKey = `smartConversion.documentTypeDisplay.${type}`;
    const display = this.translationManager.t(translationKey);
    return display !== translationKey ? display : type;
  }

  private getRecommendedTOCValue(
    config: QuickConfig | RecommendedConfig,
    analysis: ContentAnalysis,
  ): boolean {
    if ('config' in config) {
      // QuickConfig
      return (
        config.config.tocConfig?.enabled ??
        analysis.headingStructure.totalHeadings > 3
      );
    } else {
      // RecommendedConfig
      return (
        config.tocConfig?.enabled ?? analysis.headingStructure.totalHeadings > 3
      );
    }
  }

  private getRecommendedTOCDepth(
    config: QuickConfig | RecommendedConfig,
    analysis: ContentAnalysis,
  ): number {
    if ('config' in config) {
      // QuickConfig
      return (
        config.config.tocConfig?.maxDepth ??
        Math.min(analysis.headingStructure.maxDepth, 3)
      );
    } else {
      // RecommendedConfig
      return (
        config.tocConfig?.maxDepth ??
        Math.min(analysis.headingStructure.maxDepth, 3)
      );
    }
  }

  private convertToProcessingConfig(
    config: QuickConfig | RecommendedConfig | undefined,
    analysis: ContentAnalysis,
    includeTOC: boolean,
    tocDepth: number,
    tocReturnLinksLevel?: number,
    anchorLinksEnabled?: boolean,
    headersFootersConfig?: import('../core/headers-footers/types').HeadersFootersConfig,
  ): any {
    // Determine if two-stage rendering should be enabled
    const shouldEnableTwoStage = this.shouldEnableTwoStageRendering(
      analysis,
      includeTOC,
    );

    // Calculate effective tocReturnLinksLevel
    const effectiveTocReturnLinksLevel =
      !includeTOC || anchorLinksEnabled === false
        ? 0
        : (tocReturnLinksLevel ?? 3); // Smart default: H2-H4 when TOC enabled

    if (!config) {
      // Return basic configuration matching single file and batch processing
      const baseConfig: any = {
        includeTOC: includeTOC,
        tocReturnLinksLevel: effectiveTocReturnLinksLevel,
        tocOptions: includeTOC
          ? {
              maxDepth: tocDepth,
              includePageNumbers: true,
            }
          : undefined,
        pdfOptions: {
          margin: DEFAULT_MARGINS.NORMAL,
          printBackground: true,
        },
        // Enable two-stage rendering for better accuracy when appropriate
        ...(shouldEnableTwoStage && {
          twoStageRendering: {
            enabled: true,
            forceAccuratePageNumbers: includeTOC,
          },
        }),
      };

      // Use headers/footers config if available, otherwise fallback to legacy page numbers
      if (
        headersFootersConfig &&
        (headersFootersConfig.header.enabled ||
          headersFootersConfig.footer.enabled)
      ) {
        baseConfig.headersFootersConfig = headersFootersConfig;
      } else {
        baseConfig.includePageNumbers = includeTOC; // Legacy fallback
      }

      return baseConfig;
    }

    // Convert Smart Defaults configuration to file processor configuration
    // Follow the same pattern as single file and batch processing
    const baseConfig: any = {
      includeTOC: includeTOC,
      tocReturnLinksLevel: effectiveTocReturnLinksLevel,
      tocOptions: includeTOC
        ? {
            maxDepth: tocDepth,
            includePageNumbers: true,
          }
        : undefined,
      pdfOptions: {
        margin: DEFAULT_MARGINS.NORMAL,
        printBackground: true,
      },
    };

    if ('config' in config) {
      // QuickConfig
      const quickConfig = config.config;
      const includePageNumbers =
        quickConfig.tocConfig?.includePageNumbers ?? true;

      if (includeTOC) {
        baseConfig.tocOptions = {
          maxDepth: tocDepth,
          includePageNumbers,
        };
        baseConfig.includePageNumbers = includePageNumbers;
      }

      // Handle margins if specified
      if (quickConfig.margins) {
        baseConfig.pdfOptions.margin = quickConfig.margins;
      }

      // Handle font support
      if (quickConfig.fonts?.enableChineseSupport) {
        baseConfig.customStyles = `
          * {
            font-family: '${quickConfig.fonts.primaryFont || 'Noto Sans CJK SC'}', Arial, sans-serif !important;
          }
        `;
      }
    } else {
      // RecommendedConfig
      const includePageNumbers = config.tocConfig?.includePageNumbers ?? true;

      if (includeTOC) {
        baseConfig.tocOptions = {
          maxDepth: tocDepth,
          includePageNumbers,
        };
        baseConfig.includePageNumbers = includePageNumbers;
      }

      // Handle margins if specified
      if (config.margins) {
        baseConfig.pdfOptions.margin = {
          top: config.margins.top,
          right: config.margins.right,
          bottom: config.margins.bottom,
          left: config.margins.left,
        };
      }

      // Handle font support
      if (config.fonts?.enableChineseSupport) {
        baseConfig.customStyles = `
          * {
            font-family: '${config.fonts.primaryFont || 'Noto Sans CJK SC'}', Arial, sans-serif !important;
          }
        `;
      }
    }

    // Use headers/footers config if available, otherwise keep legacy page numbers
    if (
      headersFootersConfig &&
      (headersFootersConfig.header.enabled ||
        headersFootersConfig.footer.enabled)
    ) {
      baseConfig.headersFootersConfig = headersFootersConfig;
      // Remove legacy includePageNumbers when using new headers/footers system
      delete baseConfig.includePageNumbers;
    }

    // Add two-stage rendering support for all configurations
    if (shouldEnableTwoStage) {
      baseConfig.twoStageRendering = {
        enabled: true,
        forceAccuratePageNumbers:
          includeTOC &&
          (baseConfig.includePageNumbers || baseConfig.headersFootersConfig),
        maxPerformanceImpact: 100, // Allow up to 100% performance impact for accuracy
      };
    }

    return baseConfig;
  }

  /**
   * Determine if two-stage rendering should be enabled based on content analysis
   */
  private shouldEnableTwoStageRendering(
    analysis: ContentAnalysis,
    includeTOC: boolean,
  ): boolean {
    // Enable two-stage rendering if:
    // 1. TOC is enabled (for accurate page numbers)
    // 2. Content has dynamic diagrams (mermaid, plantuml)
    // 3. Content is complex (many headings, images, etc.)

    if (includeTOC) {
      return true; // Always use two-stage for TOC accuracy
    }

    // Check for dynamic diagrams
    if (analysis.mediaElements.hasDiagrams) {
      return true;
    }

    // Check for complex content
    if (
      analysis.headingStructure.totalHeadings > 10 ||
      analysis.mediaElements.images > 5
    ) {
      return true;
    }

    return false; // Use single-stage for simple content
  }

  private showProgress(): NodeJS.Timeout {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;

    const interval = setInterval(() => {
      process.stdout.write(
        `\r${chalk.cyan(frames[frameIndex])} ${this.translationManager.t('smartConversion.converting')}`,
      );
      frameIndex = (frameIndex + 1) % frames.length;
    }, 100);

    // Unref the timer so it doesn't prevent Node.js from exiting
    interval.unref();

    return interval;
  }

  private async addToRecentFiles(filePath: string): Promise<void> {
    try {
      await this.recentFilesManager.addFile(filePath);
      this.logger.debug(`Added file to recent files: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to add file to recent files: ${error}`);
      // Don't throw - this is a non-critical feature
    }
  }

  private async enterFilePathWithValidation(): Promise<string> {
    const inquirer = await import('inquirer');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const { filePath: rawFilePath } = await inquirer.default.prompt({
          type: 'input',
          name: 'filePath',
          message: this.translationManager.t('smartConversion.enterFilePath'),
          validate: (input: string) => {
            if (!input.trim())
              return this.translationManager.t(
                'smartConversion.pleaseEnterFilePath',
              );
            return true;
          },
        });

        // Clean the path to handle drag-and-drop cases
        const resolvedPath = PathCleaner.cleanPath(rawFilePath);

        if (await this.isValidMarkdownFile(resolvedPath)) {
          return resolvedPath;
        }

        this.renderer.error(
          chalk.red(
            this.translationManager.t('smartConversion.invalidMarkdownFile'),
          ),
        );
        this.renderer.error(
          chalk.red(
            `   ${this.translationManager.t('smartConversion.fileExists')}`,
          ),
        );
        this.renderer.error(
          chalk.red(
            `   ${this.translationManager.t('smartConversion.validExtension')}`,
          ),
        );

        const { action } = await inquirer.default.prompt({
          type: 'list',
          name: 'action',
          message: this.translationManager.t('smartConversion.whatToDo'),
          choices: [
            {
              name: this.translationManager.t(
                'smartConversion.tryDifferentPath',
              ),
              value: 'retry',
            },
            {
              name: this.translationManager.t(
                'smartConversion.returnToPrevious',
              ),
              value: 'back',
            },
          ],
        });

        if (action === 'back') {
          throw new Error('USER_CANCELLED');
        }
        // Continue the loop for 'retry'
      } catch (error) {
        if (error instanceof Error && error.message === 'USER_CANCELLED') {
          throw error;
        }
        this.renderer.error(
          chalk.red(
            `${this.translationManager.t('smartConversion.error')}: ${error}`,
          ),
        );
        throw new Error('USER_CANCELLED');
      }
    }
  }

  private async isValidMarkdownFile(filePath: string): Promise<boolean> {
    const { promises: fs } = await import('fs');
    const { extname } = await import('path');

    const markdownExtensions = ['.md', '.markdown', '.mdown', '.mkd'];

    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) return false;

      const ext = extname(filePath).toLowerCase();
      return markdownExtensions.includes(ext);
    } catch {
      return false;
    }
  }

  /**
   * Build headers/footers configuration based on smart conversion config
   * Uses the same alignment settings as single file conversion mode
   * When a template is selected, prioritize template's configuration
   * Implements intelligent field matching for RecommendedConfig
   */
  private async buildHeadersFootersConfig(
    config?: QuickConfig | RecommendedConfig,
    templateId?: string,
    analysis?: ContentAnalysis,
  ): Promise<
    import('../core/headers-footers/types').HeadersFootersConfig | undefined
  > {
    // If a template is selected, use template's headerFooter configuration directly
    if (templateId) {
      const templateStorage = this.container!.resolve('templateStorage') as any;
      const template = await templateStorage.read(templateId);

      if (template && template.config.headerFooter) {
        return this.convertTemplateHeaderFooterToConfig(
          template.config.headerFooter,
        );
      }
    }

    if (!config) {
      // No configuration provided and no template selected
      // Check if user has custom headers/footers configuration (same as single file conversion)
      const configManager = this.container!.resolve('config') as any;
      const userConfig = configManager.getConfig();
      const userHeadersFootersConfig = userConfig.headersFooters;

      // If user has enabled headers/footers in customization settings, use them
      if (
        userHeadersFootersConfig &&
        (userHeadersFootersConfig.header.enabled ||
          userHeadersFootersConfig.footer.enabled)
      ) {
        this.logger?.debug(
          'Smart conversion: Using user global headers/footers configuration (same as single file mode)',
        );
        return userHeadersFootersConfig;
      }

      // If no user configuration, use disabled headers/footers as fallback
      return {
        header: {
          enabled: false,
          title: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          pageNumber: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          dateTime: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          copyright: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          message: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          author: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          organization: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          version: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          category: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'left' as const,
          },
          layout: {},
        },
        footer: {
          enabled: false,
          title: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          pageNumber: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          dateTime: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          copyright: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          message: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          author: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          organization: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          version: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          category: {
            enabled: false,
            mode: 'none' as const,
            alignment: 'right' as const,
          },
          layout: {},
        },
      };
    }

    let pageStructure: any;

    if ('config' in config) {
      // QuickConfig
      pageStructure = config.config.pageStructure;
    } else {
      // RecommendedConfig
      pageStructure = config.pageStructure;
    }

    if (!pageStructure) {
      // No page structure defined in smart config
      // For RecommendedConfig with analysis, implement intelligent field matching first
      if (!('config' in config) && analysis) {
        // Only for RecommendedConfig (smart custom configuration)
        const configManager = this.container!.resolve('config') as any;
        const userConfig = configManager.getConfig();
        const userHeadersFootersConfig = userConfig.headersFooters;

        // Check if user has any headers/footers customization
        if (
          userHeadersFootersConfig &&
          (userHeadersFootersConfig.header.enabled ||
            userHeadersFootersConfig.footer.enabled)
        ) {
          // Implement intelligent matching: extract document metadata to see what's available
          const intelligentConfig =
            await this.createIntelligentHeadersFootersConfig(
              userHeadersFootersConfig,
              analysis,
            );

          if (intelligentConfig) {
            this.logger?.debug(
              'Smart conversion RecommendedConfig: Using intelligent field matching based on user preferences and document content',
            );
            return intelligentConfig;
          } else {
            // If intelligent matching returns null but user has config, fall back to user config
            this.logger?.debug(
              'Smart conversion RecommendedConfig: Intelligent matching returned null, falling back to user configuration',
            );
            return userHeadersFootersConfig;
          }
        }
      }

      // For QuickConfig or when no user configuration, check if user has custom headers/footers configuration (same as single file conversion)
      const configManager = this.container!.resolve('config') as any;
      const userConfig = configManager.getConfig();
      const userHeadersFootersConfig = userConfig.headersFooters;

      // If user has enabled headers/footers in customization settings and this is QuickConfig, use them
      if (
        'config' in config && // Only for QuickConfig
        userHeadersFootersConfig &&
        (userHeadersFootersConfig.header.enabled ||
          userHeadersFootersConfig.footer.enabled)
      ) {
        this.logger?.debug(
          'Smart conversion QuickConfig: Using user global headers/footers configuration (same as single file mode)',
        );
        return userHeadersFootersConfig;
      }

      // For QuickConfig or when no user configuration, provide default based on config type
      let defaultHeaders: boolean = false;
      let defaultFooters: boolean = false;
      let headerContent = '';
      let footerContent = '';

      // Check if this is a known template by its name
      if ('config' in config && config.name) {
        const templateName = config.name;

        // Technical template should have headers/footers like system templates
        if (templateName === 'presets.technical.name') {
          defaultHeaders = true;
          defaultFooters = true;
          headerContent = '{{title}}';
          footerContent = 'Page {{pageNumber}} of {{totalPages}}';
        }
        // Business template fallback
        else if (templateName === 'presets.business.name') {
          defaultHeaders = true;
          defaultFooters = true;
          headerContent = '{{title}}';
          footerContent = 'Page {{pageNumber}} of {{totalPages}}';
        }
        // Academic template fallback
        else if (templateName === 'presets.academic.name') {
          defaultHeaders = false;
          defaultFooters = true;
          footerContent = '{{pageNumber}}';
        }
      }

      // Create default configuration based on template type
      return {
        header: {
          enabled: defaultHeaders,
          title: {
            enabled: headerContent.includes('{{title}}'),
            mode: headerContent.includes('{{title}}')
              ? ('metadata' as const)
              : ('none' as const),
            alignment: 'left' as const,
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
          enabled: defaultFooters,
          title: {
            enabled: footerContent.includes('{{title}}'),
            mode: footerContent.includes('{{title}}')
              ? ('metadata' as const)
              : ('none' as const),
            alignment: 'right' as const,
          },
          pageNumber: {
            enabled:
              footerContent.includes('{{pageNumber}}') ||
              footerContent.includes('{{totalPages}}'),
            mode:
              footerContent.includes('{{pageNumber}}') ||
              footerContent.includes('{{totalPages}}')
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

    // Extract header and footer content from page structure
    const headerContent = pageStructure.headerContent || '';
    const footerContent = pageStructure.footerContent || '';

    // Check if smart defaults disabled headers/footers for simple documents
    // but user has custom headers/footers configuration (same as single file conversion)
    if (
      !('config' in config) && // Only for RecommendedConfig (smart custom configuration)
      !pageStructure.includeHeader &&
      !pageStructure.includeFooter
    ) {
      const configManager = this.container!.resolve('config') as any;
      const userConfig = configManager.getConfig();
      const userHeadersFootersConfig = userConfig.headersFooters;

      // If user has enabled headers/footers in customization settings, use them instead of disabled smart defaults
      if (
        userHeadersFootersConfig &&
        (userHeadersFootersConfig.header.enabled ||
          userHeadersFootersConfig.footer.enabled)
      ) {
        this.logger?.debug(
          'Smart conversion RecommendedConfig: Overriding disabled smart defaults with user global headers/footers configuration (same as single file mode)',
        );
        return userHeadersFootersConfig;
      }
    }

    // For RecommendedConfig, implement intelligent field matching
    // Combine user preferences with document content analysis
    if (!('config' in config) && analysis) {
      // Only for RecommendedConfig (smart custom configuration)
      const configManager = this.container!.resolve('config') as any;
      const userConfig = configManager.getConfig();
      const userHeadersFootersConfig = userConfig.headersFooters;

      // Check if user has any headers/footers customization
      if (
        userHeadersFootersConfig &&
        (userHeadersFootersConfig.header.enabled ||
          userHeadersFootersConfig.footer.enabled)
      ) {
        // Implement intelligent matching: extract document metadata to see what's available
        const intelligentConfig =
          await this.createIntelligentHeadersFootersConfig(
            userHeadersFootersConfig,
            analysis,
          );

        if (intelligentConfig) {
          this.logger?.debug(
            'Smart conversion RecommendedConfig: Using intelligent field matching based on user preferences and document content',
          );
          return intelligentConfig;
        }
      }
    }

    // Build configuration-specific headers/footers config
    // Always use template settings (same alignment as single file conversion mode)
    return {
      header: {
        enabled: pageStructure.includeHeader === true,
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
        enabled: pageStructure.includeFooter === true,
        title: {
          enabled: footerContent.includes('{{title}}'),
          mode: footerContent.includes('{{title}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'right' as const, // Right-aligned footers (same as single file mode)
        },
        pageNumber: {
          enabled: footerContent.includes('{{pageNumber}}'),
          mode: footerContent.includes('{{pageNumber}}')
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

  /**
   * Convert template's headerFooter configuration to HeadersFootersConfig format
   * Ensures consistent alignment with other conversion modes (headers left, footers right)
   */
  private convertTemplateHeaderFooterToConfig(
    templateHeaderFooter: any,
  ): import('../core/headers-footers/types').HeadersFootersConfig {
    const headerContent = templateHeaderFooter.header?.content || '';
    const footerContent = templateHeaderFooter.footer?.content || '';

    return {
      header: {
        enabled: templateHeaderFooter.header?.enabled === true,
        title: {
          enabled: headerContent.includes('{{title}}'),
          mode: headerContent.includes('{{title}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'left' as const, // Left-aligned headers (consistent with single file mode)
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
        enabled: templateHeaderFooter.footer?.enabled === true,
        title: {
          enabled: footerContent.includes('{{title}}'),
          mode: footerContent.includes('{{title}}')
            ? ('metadata' as const)
            : ('none' as const),
          alignment: 'right' as const, // Right-aligned footers (consistent with single file mode)
        },
        pageNumber: {
          enabled:
            footerContent.includes('{{pageNumber}}') ||
            footerContent.includes('{{totalPages}}'),
          mode:
            footerContent.includes('{{pageNumber}}') ||
            footerContent.includes('{{totalPages}}')
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

  /**
   * Create intelligent headers/footers configuration by matching user preferences with document content
   * Only enable fields that are both user-preferred AND available in the document
   */
  private async createIntelligentHeadersFootersConfig(
    userConfig: import('../core/headers-footers/types').HeadersFootersConfig,
    analysis: ContentAnalysis,
  ): Promise<
    import('../core/headers-footers/types').HeadersFootersConfig | null
  > {
    try {
      // Collect intelligent matching decisions for logging
      const matchingDecisions: string[] = [];

      // Check document content availability
      const hasTitle = this.hasTitle(analysis);
      const hasAuthor = this.hasAuthor();
      const hasOrganization = this.hasOrganization();
      const hasVersion = this.hasVersion();
      const hasCategory = this.hasCategory();
      const hasCopyright = this.hasCopyright();

      matchingDecisions.push(
        this.translationManager.t(
          'smartConversion.intelligentMatching.analysisTitle',
        ),
      );

      const availableIcon = this.translationManager.t(
        'smartConversion.intelligentMatching.statusIcons.available',
      );
      const notAvailableIcon = this.translationManager.t(
        'smartConversion.intelligentMatching.statusIcons.notAvailable',
      );
      const titleStructureReason = this.translationManager.t(
        'smartConversion.intelligentMatching.reasons.titleStructureDetected',
      );
      const configValueReason = this.translationManager.t(
        'smartConversion.intelligentMatching.reasons.configValueExists',
      );

      matchingDecisions.push(
        `   ${this.translationManager.t(
          'smartConversion.intelligentMatching.availability.documentTitle',
          {
            status: hasTitle ? availableIcon : notAvailableIcon,
            reason: hasTitle ? titleStructureReason : '',
          },
        )}`,
      );
      matchingDecisions.push(
        `   ${this.translationManager.t(
          'smartConversion.intelligentMatching.availability.authorInfo',
          {
            status: hasAuthor ? availableIcon : notAvailableIcon,
            reason: hasAuthor ? configValueReason : '',
          },
        )}`,
      );
      matchingDecisions.push(
        `   ${this.translationManager.t(
          'smartConversion.intelligentMatching.availability.organizationInfo',
          {
            status: hasOrganization ? availableIcon : notAvailableIcon,
            reason: hasOrganization ? configValueReason : '',
          },
        )}`,
      );
      matchingDecisions.push(
        `   ${this.translationManager.t(
          'smartConversion.intelligentMatching.availability.versionInfo',
          {
            status: hasVersion ? availableIcon : notAvailableIcon,
            reason: hasVersion ? configValueReason : '',
          },
        )}`,
      );
      matchingDecisions.push(
        `   ${this.translationManager.t(
          'smartConversion.intelligentMatching.availability.categoryInfo',
          {
            status: hasCategory ? availableIcon : notAvailableIcon,
            reason: hasCategory ? configValueReason : '',
          },
        )}`,
      );
      matchingDecisions.push(
        `   ${this.translationManager.t(
          'smartConversion.intelligentMatching.availability.copyrightInfo',
          {
            status: hasCopyright ? availableIcon : notAvailableIcon,
            reason: hasCopyright ? configValueReason : '',
          },
        )}`,
      );

      // Create intelligent config based on user preferences and document content
      const intelligentConfig: import('../core/headers-footers/types').HeadersFootersConfig =
        {
          header: {
            enabled: userConfig.header.enabled,
            title: {
              enabled:
                userConfig.header.title.enabled && this.hasTitle(analysis),
              mode: userConfig.header.title.mode,
              alignment: userConfig.header.title.alignment || 'left',
            },
            pageNumber: {
              enabled: userConfig.header.pageNumber.enabled, // Page numbers are always available
              mode: userConfig.header.pageNumber.mode,
              alignment: userConfig.header.pageNumber.alignment || 'left',
            },
            dateTime: {
              enabled: userConfig.header.dateTime.enabled, // Date/time is always available
              mode: userConfig.header.dateTime.mode,
              alignment: userConfig.header.dateTime.alignment || 'left',
            },
            copyright: {
              enabled:
                userConfig.header.copyright.enabled && this.hasCopyright(),
              mode: userConfig.header.copyright.mode,
              alignment: userConfig.header.copyright.alignment || 'left',
            },
            message: {
              enabled: userConfig.header.message.enabled, // Custom messages are always available
              mode: userConfig.header.message.mode,
              customValue: userConfig.header.message.customValue || '',
              alignment: userConfig.header.message.alignment || 'left',
            },
            author: {
              enabled: userConfig.header.author.enabled && this.hasAuthor(),
              mode: userConfig.header.author.mode,
              alignment: userConfig.header.author.alignment || 'left',
            },
            organization: {
              enabled:
                userConfig.header.organization.enabled &&
                this.hasOrganization(),
              mode: userConfig.header.organization.mode,
              alignment: userConfig.header.organization.alignment || 'left',
            },
            version: {
              enabled: userConfig.header.version.enabled && this.hasVersion(),
              mode: userConfig.header.version.mode,
              alignment: userConfig.header.version.alignment || 'left',
            },
            category: {
              enabled: userConfig.header.category.enabled && this.hasCategory(),
              mode: userConfig.header.category.mode,
              alignment: userConfig.header.category.alignment || 'left',
            },
            layout: userConfig.header.layout,
          },
          footer: {
            enabled: userConfig.footer.enabled,
            title: {
              enabled:
                userConfig.footer.title.enabled && this.hasTitle(analysis),
              mode: userConfig.footer.title.mode,
              alignment: userConfig.footer.title.alignment || 'right',
            },
            pageNumber: {
              enabled: userConfig.footer.pageNumber.enabled, // Page numbers are always available
              mode: userConfig.footer.pageNumber.mode,
              alignment: userConfig.footer.pageNumber.alignment || 'right',
            },
            dateTime: {
              enabled: userConfig.footer.dateTime.enabled, // Date/time is always available
              mode: userConfig.footer.dateTime.mode,
              alignment: userConfig.footer.dateTime.alignment || 'right',
            },
            copyright: {
              enabled:
                userConfig.footer.copyright.enabled && this.hasCopyright(),
              mode: userConfig.footer.copyright.mode,
              alignment: userConfig.footer.copyright.alignment || 'right',
            },
            message: {
              enabled: userConfig.footer.message.enabled, // Custom messages are always available
              mode: userConfig.footer.message.mode,
              customValue: userConfig.footer.message.customValue || '',
              alignment: userConfig.footer.message.alignment || 'right',
            },
            author: {
              enabled: userConfig.footer.author.enabled && this.hasAuthor(),
              mode: userConfig.footer.author.mode,
              alignment: userConfig.footer.author.alignment || 'right',
            },
            organization: {
              enabled:
                userConfig.footer.organization.enabled &&
                this.hasOrganization(),
              mode: userConfig.footer.organization.mode,
              alignment: userConfig.footer.organization.alignment || 'right',
            },
            version: {
              enabled: userConfig.footer.version.enabled && this.hasVersion(),
              mode: userConfig.footer.version.mode,
              alignment: userConfig.footer.version.alignment || 'right',
            },
            category: {
              enabled: userConfig.footer.category.enabled && this.hasCategory(),
              mode: userConfig.footer.category.mode,
              alignment: userConfig.footer.category.alignment || 'right',
            },
            layout: userConfig.footer.layout,
          },
        };

      // Check if we have any enabled fields in the intelligent config
      const hasEnabledHeaderFields = Object.values(
        intelligentConfig.header,
      ).some((field: any) => field?.enabled === true);
      const hasEnabledFooterFields = Object.values(
        intelligentConfig.footer,
      ).some((field: any) => field?.enabled === true);

      // Disable header/footer sections if no fields are enabled
      if (!hasEnabledHeaderFields) {
        intelligentConfig.header.enabled = false;
      }
      if (!hasEnabledFooterFields) {
        intelligentConfig.footer.enabled = false;
      }

      // Add detailed matching decisions to log
      matchingDecisions.push(
        `\n${this.translationManager.t('smartConversion.intelligentMatching.matchingDecisions')}`,
      );

      // Header configuration decisions
      matchingDecisions.push(
        `   ${this.translationManager.t('smartConversion.intelligentMatching.headerConfig')}:`,
      );
      if (intelligentConfig.header.enabled) {
        const headerFields = [];
        if (intelligentConfig.header.title.enabled) {
          headerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.title',
              {
                userPreference: this.translationManager.t(
                  'smartConversion.intelligentMatching.statusIcons.enabled',
                ),
                contentAvailable: this.translationManager.t(
                  'smartConversion.intelligentMatching.statusIcons.enabled',
                ),
              },
            ),
          );
        }
        if (intelligentConfig.header.pageNumber.enabled) {
          headerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.pageNumber',
              {
                userPreference: userConfig.header.pageNumber.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                alwaysAvailable: this.translationManager.t(
                  'smartConversion.intelligentMatching.statusIcons.enabled',
                ),
              },
            ),
          );
        }
        if (intelligentConfig.header.author.enabled) {
          headerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.author',
              {
                userPreference: userConfig.header.author.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                configValue: hasAuthor
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
              },
            ),
          );
        }
        if (intelligentConfig.header.organization.enabled) {
          headerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.organization',
              {
                userPreference: userConfig.header.organization.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                configValue: hasOrganization
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
              },
            ),
          );
        }
        if (intelligentConfig.header.version.enabled) {
          headerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.version',
              {
                userPreference: userConfig.header.version.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                configValue: hasVersion
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
              },
            ),
          );
        }
        if (intelligentConfig.header.category.enabled) {
          headerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.category',
              {
                userPreference: userConfig.header.category.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                configValue: hasCategory
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
              },
            ),
          );
        }

        if (headerFields.length > 0) {
          headerFields.forEach((field) =>
            matchingDecisions.push(`     - ${field}`),
          );
        } else {
          matchingDecisions.push(
            `     - ${this.translationManager.t('smartConversion.intelligentMatching.noFieldsEnabled')}`,
          );
        }
      } else {
        matchingDecisions.push(
          `     - ${this.translationManager.t('smartConversion.intelligentMatching.headerDisabled')}`,
        );
      }

      // Footer configuration decisions
      matchingDecisions.push(
        `   ${this.translationManager.t('smartConversion.intelligentMatching.footerConfig')}:`,
      );
      if (intelligentConfig.footer.enabled) {
        const footerFields = [];
        if (intelligentConfig.footer.title.enabled) {
          footerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.title',
              {
                userPreference: userConfig.footer.title.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                contentAvailable: this.translationManager.t(
                  'smartConversion.intelligentMatching.statusIcons.enabled',
                ),
              },
            ),
          );
        }
        if (intelligentConfig.footer.pageNumber.enabled) {
          footerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.pageNumber',
              {
                userPreference: this.translationManager.t(
                  'smartConversion.intelligentMatching.statusIcons.enabled',
                ),
                alwaysAvailable: this.translationManager.t(
                  'smartConversion.intelligentMatching.statusIcons.enabled',
                ),
              },
            ),
          );
        }
        if (intelligentConfig.footer.author.enabled) {
          footerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.author',
              {
                userPreference: userConfig.footer.author.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                configValue: hasAuthor
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
              },
            ),
          );
        }
        if (intelligentConfig.footer.organization.enabled) {
          footerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.organization',
              {
                userPreference: this.translationManager.t(
                  'smartConversion.intelligentMatching.statusIcons.enabled',
                ),
                configValue: hasOrganization
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
              },
            ),
          );
        }
        if (intelligentConfig.footer.version.enabled) {
          footerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.version',
              {
                userPreference: userConfig.footer.version.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                configValue: hasVersion
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
              },
            ),
          );
        }
        if (intelligentConfig.footer.category.enabled) {
          footerFields.push(
            this.translationManager.t(
              'smartConversion.intelligentMatching.fieldDecisions.category',
              {
                userPreference: userConfig.footer.category.enabled
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
                configValue: hasCategory
                  ? this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.enabled',
                    )
                  : this.translationManager.t(
                      'smartConversion.intelligentMatching.statusIcons.disabled',
                    ),
              },
            ),
          );
        }

        if (footerFields.length > 0) {
          footerFields.forEach((field) =>
            matchingDecisions.push(`     - ${field}`),
          );
        } else {
          matchingDecisions.push(
            `     - ${this.translationManager.t('smartConversion.intelligentMatching.noFieldsEnabled')}`,
          );
        }
      } else {
        matchingDecisions.push(
          `     - ${this.translationManager.t('smartConversion.intelligentMatching.footerDisabled')}`,
        );
      }

      // Log the detailed decisions
      this.logger?.info(
        `${this.translationManager.t('smartConversion.intelligentMatching.detailedAnalysis')}:\n` +
          matchingDecisions.join('\n'),
      );

      // Only return the intelligent config if it has at least some enabled fields
      if (
        intelligentConfig.header.enabled ||
        intelligentConfig.footer.enabled
      ) {
        return intelligentConfig;
      }

      // If no fields would be enabled, fall back to smart defaults
      return null;
    } catch (error) {
      this.logger?.warn(
        'Error in intelligent field matching, falling back to smart defaults:',
        error,
      );
      return null;
    }
  }

  /**
   * Check if document has a title (from analysis or first H1)
   */
  private hasTitle(analysis: ContentAnalysis): boolean {
    // Check if we have headings - assume first H1 would be the title
    return analysis.headingStructure.totalHeadings > 0;
  }

  /**
   * Check if document/config has author information
   */
  private hasAuthor(): boolean {
    const configManager = this.container!.resolve('config') as any;
    const userConfig = configManager.getConfig();

    // Check multiple possible locations for author information
    const authorValue =
      userConfig.author ||
      userConfig.metadata?.author ||
      userConfig.metadata?.defaults?.author ||
      userConfig.defaults?.author;

    const hasValue = !!(
      authorValue &&
      authorValue.trim() &&
      authorValue !== 'Author Name'
    );
    this.logger?.debug(
      `hasAuthor() check: ${hasValue}, value: "${authorValue}"`,
    );
    return hasValue;
  }

  /**
   * Check if document/config has organization information
   */
  private hasOrganization(): boolean {
    const configManager = this.container!.resolve('config') as any;
    const userConfig = configManager.getConfig();

    // Check multiple possible locations for organization information
    const organizationValue =
      userConfig.organization ||
      userConfig.metadata?.organization ||
      userConfig.metadata?.defaults?.organization ||
      userConfig.defaults?.organization;

    const hasValue = !!(organizationValue && organizationValue.trim());
    this.logger?.debug(
      `hasOrganization() check: ${hasValue}, value: "${organizationValue}"`,
    );
    return hasValue;
  }

  /**
   * Check if document/config has version information
   */
  private hasVersion(): boolean {
    const configManager = this.container!.resolve('config') as any;
    const userConfig = configManager.getConfig();

    // Check multiple possible locations for version information
    const versionValue =
      userConfig.version ||
      userConfig.metadata?.version ||
      userConfig.metadata?.defaults?.version ||
      userConfig.defaults?.version;

    const hasValue = !!(versionValue && versionValue.trim());
    this.logger?.debug(
      `hasVersion() check: ${hasValue}, value: "${versionValue}"`,
    );
    return hasValue;
  }

  /**
   * Check if document/config has category information
   */
  private hasCategory(): boolean {
    const configManager = this.container!.resolve('config') as any;
    const userConfig = configManager.getConfig();

    // Check multiple possible locations for category information
    const categoryValue =
      userConfig.category ||
      userConfig.metadata?.category ||
      userConfig.metadata?.defaults?.category ||
      userConfig.defaults?.category;

    const hasValue = !!(categoryValue && categoryValue.trim());
    this.logger?.debug(
      `hasCategory() check: ${hasValue}, value: "${categoryValue}"`,
    );
    return hasValue;
  }

  /**
   * Check if document/config has copyright information
   */
  private hasCopyright(): boolean {
    const configManager = this.container!.resolve('config') as any;
    const userConfig = configManager.getConfig();

    // Check multiple possible locations for copyright information
    const copyrightValue =
      userConfig.copyright ||
      userConfig.metadata?.copyright ||
      userConfig.metadata?.defaults?.copyright ||
      userConfig.defaults?.copyright;

    const hasValue = !!(copyrightValue && copyrightValue.trim());
    this.logger?.debug(
      `hasCopyright() check: ${hasValue}, value: "${copyrightValue}"`,
    );
    return hasValue;
  }
}
