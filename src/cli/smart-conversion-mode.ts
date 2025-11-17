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
import { TemplateStorageService, Template } from '../core/templates';
import { DEFAULT_MARGINS } from '../infrastructure/config/constants';
import { PathCleaner } from '../utils/path-cleaner';

import { RecentFilesManager } from './config/recent-files';
import { CliRenderer } from './utils/cli-renderer';
import { I18nHelpers } from './utils/i18n-helpers';

import type { IFileProcessorService } from '../application/services/file-processor.service';
import type { ISmartDefaultsService } from '../application/services/smart-defaults.service';
import type { IConfigManager } from '../infrastructure/config/types';
import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

interface ConversionChoice {
  type: 'quick' | 'smart' | 'custom' | 'template';
  name: string;
  description: string;
  config?: QuickConfig | RecommendedConfig;
  template?: Template;
}

export class SmartConversionMode {
  private smartDefaultsService: ISmartDefaultsService;
  private fileProcessorService: IFileProcessorService;
  private logger: ILogger;
  private translationManager: ITranslationManager;
  private configManager: IConfigManager;
  private recentFilesManager: RecentFilesManager;
  private renderer: CliRenderer;
  private i18nHelpers: I18nHelpers;
  private templateStorage: TemplateStorageService;

  constructor(private readonly container?: ServiceContainer) {
    if (!this.container) {
      this.container = ApplicationServices.createContainer();
    }
    this.smartDefaultsService = this.container.resolve('smartDefaults');
    this.fileProcessorService = this.container.resolve('fileProcessor');
    this.logger = this.container.resolve('logger');
    this.translationManager = this.container.resolve('translator');
    this.configManager = this.container.resolve('config');
    this.recentFilesManager = new RecentFilesManager();
    this.renderer = new CliRenderer();
    this.i18nHelpers = new I18nHelpers(this.translationManager);
    this.templateStorage = new TemplateStorageService();
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

    // Get available conversion options
    const quickConfig =
      await this.smartDefaultsService.getQuickConversionConfig(analysis);
    const smartConfig =
      await this.smartDefaultsService.recommendSettings(analysis);
    const presetConfigs = this.smartDefaultsService.getPresetConfigs();

    // Check if custom templates are available
    const templateCount = await this.templateStorage.count({ type: 'custom' });

    const choices: ConversionChoice[] = [
      {
        type: 'quick',
        name: `${this.translationManager.t('smartConversion.quickConversion')} - "${this.translationManager.t(quickConfig.name)}"`,
        description: this.translationManager.t(quickConfig.description),
        config: quickConfig,
      },
      {
        type: 'smart',
        name: this.translationManager.t('smartConversion.smartRecommendations'),
        description: `${this.translationManager.t('smartConversion.customConfiguration')} ${(smartConfig.confidence * 100).toFixed(1)}% ${this.translationManager.t('smartConversion.confidence')}`,
        config: smartConfig,
      },
      {
        type: 'custom',
        name: this.translationManager.t('smartConversion.chooseFromPresets'),
        description: this.translationManager.t(
          'smartConversion.predefinedConfigurations',
        ),
      },
    ];

    // Add template option if templates are available
    if (templateCount > 0) {
      choices.push({
        type: 'template',
        name: this.translationManager.t('smartConversion.useSavedTemplate'),
        description: this.translationManager.t(
          'smartConversion.chooseFromTemplates',
          { count: templateCount },
        ),
      });
    }

    this.renderer.info(
      chalk.cyan(
        this.translationManager.t('smartConversion.conversionOptions') + '\n',
      ),
    );

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      this.renderer.info(`${i + 1}. ${choice.name}`);
      this.renderer.info(`   ${chalk.gray(choice.description)}`);

      if (choice.config && choice.type !== 'custom') {
        this.renderer.info(
          `   ${chalk.dim(`⏱️  ${this.translationManager.t('smartConversion.estimatedTime')}: ~` + this.getEstimatedTime(choice.config) + ` ${this.translationManager.t('smartConversion.seconds')}`)}`,
        );
      }
      this.renderer.newline();
    }

    const { selectedIndex } = await inquirer.default.prompt({
      type: 'list',
      name: 'selectedIndex',
      message: this.translationManager.t(
        'smartConversion.whichConversionMethod',
      ),
      choices: choices.map((choice, index) => ({
        name: choice.name,
        value: index,
      })),
    });

    let selectedChoice = choices[selectedIndex];

    // If custom was selected, show preset options
    if (selectedChoice.type === 'custom') {
      const { presetName } = await inquirer.default.prompt({
        type: 'list',
        name: 'presetName',
        message: this.translationManager.t(
          'smartConversion.selectPresetConfiguration',
        ),
        choices: presetConfigs.map((preset) => ({
          name: `${this.translationManager.t(preset.name)} - ${this.translationManager.t(preset.description)}`,
          value: preset.name,
        })),
      });

      const selectedPreset = presetConfigs.find((p) => p.name === presetName)!;
      selectedChoice = {
        type: 'custom',
        name: this.translationManager.t(selectedPreset.name),
        description: this.translationManager.t(selectedPreset.description),
        config: selectedPreset,
      };
    }

    // If template was selected, show template options
    if (selectedChoice.type === 'template') {
      const collection = await this.templateStorage.getAllTemplates();

      const templateChoices = [
        ...(collection.system.length > 0
          ? [new inquirer.default.Separator('── System Templates ──')]
          : []),
        ...collection.system.map((t) => ({
          name: `${this.translationManager.t(t.name)} - ${this.translationManager.t(t.description)}`,
          value: t.id,
        })),
        ...(collection.custom.length > 0
          ? [new inquirer.default.Separator('── Custom Templates ──')]
          : []),
        ...collection.custom.map((t) => ({
          name: `${this.translationManager.t(t.name)} - ${this.translationManager.t(t.description)}`,
          value: t.id,
        })),
      ];

      const { templateId } = await inquirer.default.prompt({
        type: 'list',
        name: 'templateId',
        message: this.translationManager.t(
          'templates.prompts.selectTemplateForConversion',
        ),
        choices: templateChoices,
        pageSize: 15,
      });

      const selectedTemplate = await this.templateStorage.read(templateId);
      if (selectedTemplate) {
        selectedChoice = {
          type: 'template',
          name: selectedTemplate.name,
          description: selectedTemplate.description,
          template: selectedTemplate,
        };
      }
    }

    return selectedChoice;
  }

  private async confirmAndConvert(
    filePath: string,
    choice: ConversionChoice,
    analysis: ContentAnalysis,
  ): Promise<void> {
    const inquirer = await import('inquirer');

    // Apply template configuration if template was selected
    if (choice.type === 'template' && choice.template) {
      const template = choice.template;
      this.configManager.set('pdf.format', template.config.pdf.format);
      this.configManager.set(
        'pdf.orientation',
        template.config.pdf.orientation,
      );
      this.configManager.set('pdf.margin', template.config.pdf.margin);
      this.configManager.set(
        'pdf.displayHeaderFooter',
        template.config.pdf.displayHeaderFooter,
      );
      this.configManager.set('toc.enabled', template.config.features.toc);
      this.configManager.set('toc.depth', template.config.features.tocDepth);

      // Apply template's code block theme
      if (template.config.styles.codeBlock.theme) {
        this.configManager.set(
          'syntaxHighlighting.theme',
          template.config.styles.codeBlock.theme,
        );
        this.logger.info(
          `Applied code block theme from template: ${template.config.styles.codeBlock.theme}`,
        );
      }

      // Apply template's style theme
      if (template.config.styles.theme) {
        this.configManager.set('styles.theme', template.config.styles.theme);
        this.logger.info(
          `Applied style theme from template: ${template.config.styles.theme}`,
        );
      }
    }

    this.renderer.info(
      chalk.cyan(
        '\n' + this.translationManager.t('smartConversion.conversionSummary'),
      ),
    );
    this.renderer.info(
      `   ${this.translationManager.t('smartConversion.input')}: ${filePath}`,
    );
    this.renderer.info(
      `   ${this.translationManager.t('smartConversion.configuration')}: ${choice.name}`,
    );
    this.renderer.info(
      `   📄 ${analysis.wordCount.toLocaleString()} ${this.translationManager.t('smartConversion.wordsLabel')}, ${analysis.headingStructure.totalHeadings} ${this.translationManager.t('smartConversion.headingsLabel')}`,
    );

    if (choice.config) {
      this.renderer.info(
        `   ⏱️  ${this.translationManager.t('smartConversion.estimatedTime')}: ~${this.getEstimatedTime(choice.config)} ${this.translationManager.t('smartConversion.seconds')}`,
      );
    }

    if (choice.type === 'template') {
      this.renderer.info(chalk.gray(`   📋 Using template: ${choice.name}`));
    }

    // Generate output path suggestion
    const outputPath = filePath.replace(/\.(md|markdown)$/i, '.pdf');

    // Smart conversion should automatically determine TOC settings
    const includeTOC = choice.config
      ? this.getRecommendedTOCValue(choice.config, analysis)
      : analysis.headingStructure.totalHeadings > 3;

    const tocDepth = choice.config
      ? this.getRecommendedTOCDepth(choice.config, analysis)
      : Math.min(analysis.headingStructure.maxDepth, 3);

    // Get user's headers/footers preferences
    const userConfig = this.configManager.getConfig();
    const headersFootersConfig = userConfig.headersFooters;

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

      // Build custom styles from template if available
      let customStyles: string | undefined;
      if (choice.type === 'template' && choice.template) {
        const template = choice.template;
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
      }

      // Override margins when using template
      if (choice.type === 'template' && choice.template) {
        processingConfig.pdfOptions = {
          ...processingConfig.pdfOptions,
          margin: choice.template.config.pdf.margin,
        };
      }

      // Debug logging for options being passed to file processor
      const finalOptions = {
        outputPath: finalOutputPath,
        ...processingConfig,
        ...(customStyles && { customStyles }), // Apply template styles if defined
      };
      this.logger.debug(
        'Smart conversion mode passing options to file processor:',
        {
          finalOptions,
          includeTOC,
          tocDepth,
          processingConfig,
          customStyles,
          templateMargin: choice.template?.config.pdf.margin,
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

  private getEstimatedTime(config: QuickConfig | RecommendedConfig): number {
    if ('estimatedTime' in config) {
      return config.estimatedTime;
    }
    if ('optimization' in config && config.optimization) {
      return config.optimization.estimatedProcessingTime;
    }
    return 5; // Default fallback
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
}
