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
import { PathCleaner } from '../utils/path-cleaner';

import { RecentFilesManager } from './config/recent-files';
import { CliRenderer } from './utils/cli-renderer';

import type { IFileProcessorService } from '../application/services/file-processor.service';
import type { ISmartDefaultsService } from '../application/services/smart-defaults.service';
import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

interface ConversionChoice {
  type: 'quick' | 'smart' | 'custom';
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

    // Calculate dynamic width
    const maxWidth =
      Math.max(
        title.length,
        subtitle.length,
        step1.length,
        step2.length,
        step3.length,
      ) + 4;
    const border = '─'.repeat(maxWidth - 2);

    this.renderer.header([
      `┌${border}┐`,
      `│${title.padStart((maxWidth + title.length - 2) / 2).padEnd(maxWidth - 2)}│`,
      `├${border}┤`,
      `│${subtitle.padStart((maxWidth + subtitle.length - 2) / 2).padEnd(maxWidth - 2)}│`,
      `│${' '.repeat(maxWidth - 2)}│`,
      `│  ${step1.padEnd(maxWidth - 4)}│`,
      `│  ${step2.padEnd(maxWidth - 4)}│`,
      `│  ${step3.padEnd(maxWidth - 4)}│`,
      `└${border}┘`,
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
        choices: [
          {
            name: this.translationManager.t('smartConversion.returnToMainMenu'),
            value: 'back',
          },
          {
            name: this.translationManager.t('smartConversion.browseFiles'),
            value: 'browse',
          },
          {
            name: this.translationManager.t('smartConversion.enterManually'),
            value: 'manual',
          },
          {
            name: this.translationManager.t('smartConversion.chooseRecent'),
            value: 'recent',
          },
        ],
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

    const title = this.translationManager.t('smartConversion.analysisResults');
    const titleWidth = title.length + 4;
    const border = '─'.repeat(titleWidth - 2);

    this.renderer.info(chalk.green(`┌${border}┐`));
    this.renderer.info(
      chalk.green(
        `│${title.padStart((titleWidth + title.length - 2) / 2).padEnd(titleWidth - 2)}│`,
      ),
    );
    this.renderer.info(chalk.green(`└${border}┘`));
    this.renderer.info(
      chalk.cyan(
        `   ${this.translationManager.t('smartConversion.words')}: ${analysis.wordCount.toLocaleString()}`,
      ),
    );
    this.renderer.info(
      chalk.cyan(
        `   ${this.translationManager.t('smartConversion.estimatedPages')}: ${analysis.estimatedPages}`,
      ),
    );
    this.renderer.info(
      chalk.cyan(
        `   ${this.translationManager.t('smartConversion.readingTime')}: ${analysis.readingTime} ${this.translationManager.t('smartConversion.minutes')}`,
      ),
    );
    this.renderer.info(
      chalk.cyan(
        `   ${this.translationManager.t('smartConversion.headings')}: ${analysis.headingStructure.totalHeadings} (${this.translationManager.t('smartConversion.maxDepth')}: ${
          analysis.headingStructure.maxDepth
        })`,
      ),
    );
    this.renderer.info(
      chalk.cyan(
        `   ${this.translationManager.t('smartConversion.language')}: ${this.getLanguageDisplay(analysis.languageDetection.primary)}`,
      ),
    );

    if (analysis.codeBlocks.length > 0) {
      this.renderer.info(
        chalk.cyan(
          `   ${this.translationManager.t('smartConversion.codeBlocks')}: ${analysis.codeBlocks.length}`,
        ),
      );
    }

    if (analysis.tables.length > 0) {
      this.renderer.info(
        chalk.cyan(
          `   ${this.translationManager.t('smartConversion.tables')}: ${analysis.tables.length}`,
        ),
      );
    }

    if (analysis.mediaElements.images > 0) {
      this.renderer.info(
        `   ${this.translationManager.t('smartConversion.images')}: ${analysis.mediaElements.images}`,
      );
    }

    this.renderer.info(
      `   ${this.translationManager.t('smartConversion.documentType')}: ${this.getDocumentTypeDisplay(analysis.contentComplexity.documentType)}`,
    );
    this.renderer.info(
      `   ${this.translationManager.t('smartConversion.complexity')}: ${analysis.contentComplexity.score}/10`,
    );

    // Show additional insights
    if (analysis.contentComplexity.factors.length > 0) {
      this.renderer.info(
        chalk.cyan(
          `   ${this.translationManager.t('smartConversion.contentCharacteristics')}:`,
        ),
      );
      analysis.contentComplexity.factors.forEach((factor) => {
        this.renderer.info(`      • ${factor.description}`);
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

    const choices: ConversionChoice[] = [
      {
        type: 'quick',
        name: `${this.translationManager.t('smartConversion.quickConversion')} - "${quickConfig.name}"`,
        description: quickConfig.description,
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
          name: `${preset.name} - ${preset.description}`,
          value: preset.name,
        })),
      });

      const selectedPreset = presetConfigs.find((p) => p.name === presetName)!;
      selectedChoice = {
        type: 'custom',
        name: selectedPreset.name,
        description: selectedPreset.description,
        config: selectedPreset,
      };
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
    this.renderer.info(
      `   ${this.translationManager.t('smartConversion.configuration')}: ${choice.name}`,
    );
    this.renderer.info(
      `   📄 ${analysis.wordCount.toLocaleString()} words → ${analysis.estimatedPages} pages (estimated)`,
    );

    if (choice.config) {
      this.renderer.info(
        `   ⏱️  ${this.translationManager.t('smartConversion.estimatedTime')}: ~${this.getEstimatedTime(choice.config)} ${this.translationManager.t('smartConversion.seconds')}`,
      );
    }

    // Generate output path suggestion
    const outputPath = filePath.replace(/\.(md|markdown)$/i, '.pdf');

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
      );

      // Start progress indication
      const progressInterval = this.showProgress();

      // Perform the actual conversion
      await this.fileProcessorService.processFile(filePath, {
        outputPath: finalOutputPath,
        ...processingConfig,
      });

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

  private convertToProcessingConfig(
    config: QuickConfig | RecommendedConfig | undefined,
    analysis: ContentAnalysis,
  ): any {
    if (!config) {
      // Return basic configuration matching single file and batch processing
      return {
        includeTOC: analysis.headingStructure.totalHeadings > 3,
        tocOptions: {
          maxDepth: 3,
          includePageNumbers: true,
          title: '目錄',
        },
        pdfOptions: {
          margin: {
            top: '1in',
            right: '1in',
            bottom: '1in',
            left: '1in',
          },
          displayHeaderFooter: true,
          footerTemplate:
            '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
          printBackground: true,
        },
      };
    }

    // Convert Smart Defaults configuration to file processor configuration
    // Follow the same pattern as single file and batch processing
    const baseConfig: any = {
      includeTOC: false,
      tocOptions: {},
      pdfOptions: {
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
        },
        printBackground: true,
      },
    };

    if ('config' in config) {
      // QuickConfig
      const quickConfig = config.config;
      if (quickConfig.tocConfig) {
        baseConfig.includeTOC = quickConfig.tocConfig.enabled;
        baseConfig.tocOptions = {
          maxDepth: quickConfig.tocConfig.maxDepth || 3,
          includePageNumbers: quickConfig.tocConfig.includePageNumbers ?? true,
          title: quickConfig.tocConfig.title || '目錄',
        };

        // Set PDF options for page numbers - same as single file and batch processing
        baseConfig.pdfOptions.displayHeaderFooter =
          quickConfig.tocConfig.includePageNumbers ?? true;
        baseConfig.pdfOptions.footerTemplate =
          (quickConfig.tocConfig.includePageNumbers ?? true)
            ? '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
            : '';
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
      baseConfig.includeTOC = config.tocConfig?.enabled || false;
      baseConfig.tocOptions = {
        maxDepth: config.tocConfig?.maxDepth || 3,
        includePageNumbers: config.tocConfig?.includePageNumbers ?? true,
        title: config.tocConfig?.title || '目錄',
      };

      // Set PDF options for page numbers - same as single file and batch processing
      baseConfig.pdfOptions.displayHeaderFooter =
        config.tocConfig?.includePageNumbers ?? true;
      baseConfig.pdfOptions.footerTemplate =
        (config.tocConfig?.includePageNumbers ?? true)
          ? '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
          : '';

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

    return baseConfig;
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
