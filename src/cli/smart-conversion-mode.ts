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

import { RecentFilesManager } from './config/recent-files';
import { CliRenderer } from './utils/cli-renderer';

import type { IFileProcessorService } from '../application/services/file-processor.service';
import type { ISmartDefaultsService } from '../application/services/smart-defaults.service';
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
  private recentFilesManager: RecentFilesManager;
  private renderer: CliRenderer;

  constructor(private readonly container?: ServiceContainer) {
    if (!this.container) {
      this.container = ApplicationServices.createContainer();
    }
    this.smartDefaultsService = this.container.resolve('smartDefaults');
    this.fileProcessorService = this.container.resolve('fileProcessor');
    this.logger = this.container.resolve('logger');
    this.recentFilesManager = new RecentFilesManager();
    this.renderer = new CliRenderer();
  }

  /**
   * Main entry point for Smart Conversion Mode
   * Implements the 3-step conversion process
   */
  async start(filePath?: string): Promise<void> {
    // Show Smart Conversion header with framework
    this.renderer.header([
      '┌──────────────────────────────────────────────┐',
      '│        🎯 Smart Conversion Mode              │',
      '├──────────────────────────────────────────────┤',
      '│  Intelligent configuration in 3 steps!       │',
      '│                                              │',
      '│  Step 1: File Selection                      │',
      '│  Step 2: Content Analysis & Recommendations  │',
      '│  Step 3: Configuration & Conversion          │',
      '└──────────────────────────────────────────────┘',
    ]);
    this.renderer.newline();

    try {
      // Step 1: File Selection or Analysis
      const selectedFile = filePath || (await this.selectFile());
      this.renderer.info(chalk.green(`📄 Selected: ${selectedFile}\n`));

      // Step 2: Content Analysis & Smart Recommendations
      this.renderer.info(chalk.yellow('🔍 Analyzing content...'));
      const analysis =
        await this.smartDefaultsService.analyzeContent(selectedFile);

      this.displayAnalysisResults(analysis);

      // Step 3: Configuration Selection & Confirmation
      const conversionChoice = await this.selectConversionMode(analysis);

      // Final confirmation and conversion
      await this.confirmAndConvert(selectedFile, conversionChoice, analysis);
    } catch (error) {
      if (error instanceof Error && error.message === 'BACK_TO_MAIN_MENU') {
        this.renderer.info(chalk.cyan('🔙 Returning to main menu...'));
        return; // Exit smart conversion mode gracefully
      }
      this.renderer.error(chalk.red(`❌ Error: ${error}`));
      this.logger.error(`Smart conversion failed: ${error}`);
    }
  }

  private async selectFile(): Promise<string> {
    this.renderer.info(
      chalk.gray(
        '💡 Navigation: ↑/↓ arrows, Enter to select, Ctrl+C to Return to Main Menu',
      ),
    );
    this.renderer.newline();

    const inquirer = await import('inquirer');

    const method = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'method',
        message: '📁 How would you like to select a file?',
        choices: [
          { name: '0. Return to Main Menu', value: 'back' },
          { name: '1. Browse files interactively', value: 'browse' },
          { name: '2. Enter file path manually', value: 'manual' },
          { name: '3. Choose from recent files', value: 'recent' },
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
    const browser = new FileBrowser();

    try {
      this.renderer.info(chalk.cyan('🔍 Opening file browser...'));
      return await browser.browseDirectory();
    } catch (error) {
      if (error instanceof Error && error.message === 'BACK_TO_MAIN_MENU') {
        throw error; // Propagate back navigation request
      }
      this.logger.error(`File browsing failed: ${error}`);
      this.renderer.warn(
        chalk.yellow(
          '⚠️  File browser unavailable, falling back to manual entry',
        ),
      );
      return this.enterFilePath();
    }
  }

  private async enterFilePath(): Promise<string> {
    const inquirer = await import('inquirer');
    const { filePath } = await inquirer.default.prompt({
      type: 'input',
      name: 'filePath',
      message: '✏️  Enter the full path to your Markdown file:',
      validate: (input: string) => {
        if (!input.trim()) return 'Please enter a file path';
        return true;
      },
    });

    return filePath.trim();
  }

  private async selectRecentFile(): Promise<string> {
    try {
      const recentFiles = await this.recentFilesManager.getRecentFiles();

      if (recentFiles.length === 0) {
        this.renderer.warn(chalk.yellow('📋 No recent files found'));
        return this.browseFiles();
      }

      const inquirer = await import('inquirer');

      this.renderer.info(chalk.cyan('\n📋 Recent Files:'));
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
        name: chalk.blue('🔍 Browse for other files...'),
        value: '__browse__',
      });

      const { filePath } = await inquirer.default.prompt({
        type: 'list',
        name: 'filePath',
        message: '📋 Select a recent file:',
        choices,
        pageSize: 8,
      });

      if (filePath === '__browse__') return this.browseFiles();

      return filePath;
    } catch (error) {
      this.renderer.warn(
        chalk.yellow('⚠️  Error loading recent files, using file browser'),
      );
      this.logger.warn(`Recent files error: ${error}`);
      return this.browseFiles();
    }
  }

  private displayAnalysisResults(analysis: ContentAnalysis): void {
    this.renderer.newline();
    this.renderer.info(chalk.green('┌─────────────────────────────────────────┐'));
    this.renderer.info(chalk.green('│        📊 Content Analysis Results      │'));
    this.renderer.info(chalk.green('└─────────────────────────────────────────┘'));
    this.renderer.info(chalk.cyan(`   📄 Words: ${analysis.wordCount.toLocaleString()}`));
    this.renderer.info(chalk.cyan(`   📖 Estimated pages: ${analysis.estimatedPages}`));
    this.renderer.info(chalk.cyan(`   ⏱️  Reading time: ${analysis.readingTime} minutes`));
    this.renderer.info(
      chalk.cyan(
        `   📝 Headings: ${analysis.headingStructure.totalHeadings} (max depth: ${
          analysis.headingStructure.maxDepth
        })`,
      ),
    );
    this.renderer.info(
      chalk.cyan(
        `   🌐 Language: ${this.getLanguageDisplay(analysis.languageDetection.primary)}`,
      ),
    );

    if (analysis.codeBlocks.length > 0) {
      this.renderer.info(
        chalk.cyan(`   💻 Code blocks: ${analysis.codeBlocks.length}`),
      );
    }

    if (analysis.tables.length > 0) {
      this.renderer.info(chalk.cyan(`   📊 Tables: ${analysis.tables.length}`));
    }

    if (analysis.mediaElements.images > 0) {
      this.renderer.info(`   🖼️  Images: ${analysis.mediaElements.images}`);
    }

    this.renderer.info(
      `   🎯 Document type: ${this.getDocumentTypeDisplay(analysis.contentComplexity.documentType)}`,
    );
    this.renderer.info(
      `   📈 Complexity: ${analysis.contentComplexity.score}/10`,
    );

    // Show additional insights
    if (analysis.contentComplexity.factors.length > 0) {
      this.renderer.info(chalk.cyan('   📊 Content characteristics:'));
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
        name: `Quick Conversion - "${quickConfig.name}"`,
        description: quickConfig.description,
        config: quickConfig,
      },
      {
        type: 'smart',
        name: 'Smart Recommendations (Recommended)',
        description: `Custom configuration with ${(smartConfig.confidence * 100).toFixed(1)}% confidence`,
        config: smartConfig,
      },
      {
        type: 'custom',
        name: 'Choose from Presets',
        description: 'Select from predefined configurations',
      },
    ];

    this.renderer.info(chalk.cyan('🎛️  Available Conversion Options:\n'));

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      this.renderer.info(`${i + 1}. ${choice.name}`);
      this.renderer.info(`   ${chalk.gray(choice.description)}`);

      if (choice.config && choice.type !== 'custom') {
        this.renderer.info(
          `   ${chalk.dim('⏱️  Estimated time: ~' + this.getEstimatedTime(choice.config) + ' seconds')}`,
        );
      }
      this.renderer.newline();
    }

    const { selectedIndex } = await inquirer.default.prompt({
      type: 'list',
      name: 'selectedIndex',
      message: '🎛️  Which conversion method would you like to use?',
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
        message: '⚙️ Select a preset configuration:',
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
    analysis: ContentAnalysis
  ): Promise<void> {
    const inquirer = await import('inquirer');

    this.renderer.info(chalk.cyan('\n📋 Conversion Summary:'));
    this.renderer.info(`   📁 Input: ${filePath}`);
    this.renderer.info(`   ⚙️  Configuration: ${choice.name}`);
    this.renderer.info(
      `   📄 ${analysis.wordCount.toLocaleString()} words → ${analysis.estimatedPages} pages (estimated)`,
    );

    if (choice.config) {
      this.renderer.info(
        `   ⏱️  Estimated time: ~${this.getEstimatedTime(choice.config)} seconds`,
      );
    }

    // Generate output path suggestion
    const outputPath = filePath.replace(/\.(md|markdown)$/i, '.pdf');

    const { confirmed, finalOutputPath } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'finalOutputPath',
        message: '📤 Output file path:',
        default: outputPath,
      },
      {
        type: 'confirm',
        name: 'confirmed',
        message: '🚀 Start conversion?',
        default: true,
      },
    ]);

    if (!confirmed) {
      this.renderer.warn(chalk.yellow('❌ Conversion cancelled'));
      return;
    }

    // Actual conversion logic
    this.renderer.info(chalk.green('\n🚀 Starting conversion...'));

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
        chalk.green(`\n✅ Conversion completed successfully in ${duration}s!`),
      );
      this.renderer.info(chalk.gray(`📤 Output: ${finalOutputPath}`));

      if (outputStats) {
        const fileSizeKB = (outputStats.size / 1024).toFixed(1);
        this.renderer.info(chalk.gray(`📊 File size: ${fileSizeKB} KB`));
      }

      // Add to recent files
      await this.addToRecentFiles(filePath);

      // Show next steps
      this.renderer.info(chalk.cyan('\n💡 Next steps:'));
      this.renderer.info(`   • Open the PDF: ${chalk.white(finalOutputPath)}`);
      this.renderer.info(`   • Convert another file: Return to Main Menu`);
      this.renderer.newline();
    } catch (error) {
      this.renderer.error(chalk.red(`\n❌ Conversion failed: ${error}`));
      this.logger.error('Smart conversion failed', error);
      throw error;
    }
  }

  private getLanguageDisplay(lang: string): string {
    const langMap: Record<string, string> = {
      'zh-TW': '🇹🇼 Traditional Chinese',
      'zh-CN': '🇨🇳 Simplified Chinese',
      en: '🇺🇸 English',
      mixed: '🌐 Mixed Languages',
    };
    return langMap[lang] || lang;
  }

  private getDocumentTypeDisplay(type: string): string {
    const typeMap: Record<string, string> = {
      'technical-manual': '🔧 Technical Manual',
      'academic-paper': '🎓 Academic Paper',
      'business-report': '💼 Business Report',
      documentation: '📚 Documentation',
      tutorial: '📖 Tutorial',
      article: '📰 Article',
      book: '📕 Book',
      notes: '📝 Notes',
      presentation: '📊 Presentation',
      mixed: '🎭 Mixed Content',
    };
    return typeMap[type] || type;
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
    analysis: ContentAnalysis
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

    return setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(frames[frameIndex])} Converting...`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 100);
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
    const { resolve } = await import('path');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const { filePath } = await inquirer.default.prompt({
          type: 'input',
          name: 'filePath',
          message: '✏️  Enter the full path to your Markdown file:',
          validate: (input: string) => {
            if (!input.trim()) return 'Please enter a file path';
            return true;
          },
        });

        const resolvedPath = resolve(filePath.trim());

        if (await this.isValidMarkdownFile(resolvedPath)) {
          return resolvedPath;
        }

        this.renderer.error(chalk.red('❌ Invalid Markdown file path. Please check:'));
        this.renderer.error(chalk.red('   • File exists'));
        this.renderer.error(chalk.red('   • File has .md, .markdown, .mdown, or .mkd extension'));

        const { action } = await inquirer.default.prompt({
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '✏️  Try entering a different file path', value: 'retry' },
            { name: '↩️  Return to previous menu', value: 'back' },
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
        this.renderer.error(chalk.red(`❌ Error: ${error}`));
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
