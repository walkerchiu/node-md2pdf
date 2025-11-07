/**
 * Customization mode for advanced styling and templates
 * Provides access to cover design, headers/footers, themes, etc.
 */

import chalk from 'chalk';

import { defaultConfig } from '../infrastructure/config/defaults';

import type { IConfigManager } from '../infrastructure/config/types';
import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

export class CustomizationMode {
  private logger: ILogger;
  private translationManager: ITranslationManager;

  constructor(private readonly container: ServiceContainer) {
    this.logger = this.container.resolve<ILogger>('logger');
    this.translationManager =
      this.container.resolve<ITranslationManager>('translator');
  }

  /**
   * Start customization mode
   */
  async start(): Promise<void> {
    try {
      this.logger.info(
        this.translationManager.t('startup.startingCustomizationMode'),
      );

      let running = true;

      while (running) {
        this.showCustomizationHeader();
        const option = await this.selectCustomizationOption();

        switch (option) {
          case 'cover':
            await this.coverDesign();
            break;
          case 'headers':
            await this.headersFooters();
            break;
          case 'metadata':
            await this.documentMetadata();
            break;
          case 'security':
            await this.securitySettings();
            break;
          case 'templates':
            await this.templateManagement();
            break;
          case 'back':
            this.logger.info(
              this.translationManager.t(
                'startup.returningToMainMenuFromCustomization',
              ),
            );
            running = false;
            break;
        }
      }
    } catch (error) {
      this.logger.error(
        this.translationManager.t('startup.customizationModeError'),
        error,
      );
      console.error(
        chalk.red(
          '❌ ' +
            this.translationManager.t('customization.customizationError') +
            ':',
        ),
        error,
      );
      throw error;
    }
  }

  /**
   * Show customization header
   */
  private showCustomizationHeader(): void {
    const title = this.translationManager.t('cli.customizationMenu.title');
    const subtitle = this.translationManager.t(
      'cli.customizationMenu.subtitle',
    );

    // Calculate width based on the longest text
    const maxWidth = Math.max(title.length, subtitle.length) + 4;
    const border = '─'.repeat(maxWidth - 2);

    console.log(chalk.magenta(`┌${border}┐`));
    console.log(
      chalk.magenta(
        `│${title.padStart((maxWidth + title.length - 2) / 2).padEnd(maxWidth - 2)}│`,
      ),
    );
    console.log(chalk.magenta(`├${border}┤`));
    console.log(
      chalk.magenta(
        `│${subtitle.padStart((maxWidth + subtitle.length - 2) / 2).padEnd(maxWidth - 2)}│`,
      ),
    );
    console.log(chalk.magenta(`└${border}┘`));
    console.log();
  }

  /**
   * Select customization option
   */
  private async selectCustomizationOption(): Promise<string> {
    const inquirer = await import('inquirer');

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'option',
        message: this.translationManager.t(
          'customization.selectCustomizationOption',
        ),
        choices: [
          {
            name: this.translationManager.t(
              'cli.customizationMenu.returnToMain',
            ),
            value: 'back',
            short: this.translationManager.t('short.back'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.coverDesign',
            ),
            value: 'cover',
            short: this.translationManager.t('short.coverDesign'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.headersFooters',
            ),
            value: 'headers',
            short: this.translationManager.t('short.headersFooters'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.documentMetadata',
            ),
            value: 'metadata',
            short: this.translationManager.t('short.documentMetadata'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.securitySettings',
            ),
            value: 'security',
            short: this.translationManager.t('short.securitySettings'),
          },
          {
            name: this.translationManager.t(
              'cli.customizationMenu.templateManagement',
            ),
            value: 'templates',
            short: this.translationManager.t('short.templateManagement'),
          },
        ],
        default: 'cover',
        pageSize: 12,
      },
    ]);

    return result.option;
  }

  // Placeholder methods for future implementation
  private async coverDesign(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.coverDesignComingSoon'),
      ),
    );
    await this.pressAnyKey();
  }

  private async headersFooters(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.headersFootersComingSoon'),
      ),
    );
    await this.pressAnyKey();
  }

  private async documentMetadata(): Promise<void> {
    try {
      this.showMetadataHeader();

      let running = true;
      while (running) {
        const option = await this.selectMetadataOption();

        switch (option) {
          case 'preview':
            await this.previewMetadataSettings();
            break;
          case 'configure-extraction':
            await this.configureExtractionSettings();
            break;
          case 'configure-basic':
            await this.configureBasicMetadata();
            break;
          case 'configure-frontmatter':
            await this.configureFrontmatterMapping();
            break;
          case 'configure-validation':
            await this.configureValidationSettings();
            break;
          case 'reset-defaults':
            await this.resetMetadataDefaults();
            break;
          case 'back':
            running = false;
            break;
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error in metadata configuration:'), error);
      this.logger.error('Metadata configuration error', { error });
      await this.pressAnyKey();
    }
  }

  private async securitySettings(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.securitySettingsComingSoon'),
      ),
    );
    await this.pressAnyKey();
  }

  private async templateManagement(): Promise<void> {
    console.log(
      chalk.yellow(
        this.translationManager.t('customization.templateManagementComingSoon'),
      ),
    );
    await this.pressAnyKey();
  }

  // ===== Metadata Configuration Methods =====

  private showMetadataHeader(): void {
    const title = this.translationManager.t('cli.documentMetadata.title');
    const subtitle = this.translationManager.t('cli.documentMetadata.subtitle');

    // Calculate width based on the longest text
    const maxWidth = Math.max(title.length, subtitle.length) + 4;
    const border = '─'.repeat(maxWidth - 2);

    console.clear();
    console.log(chalk.magenta(`┌${border}┐`));
    console.log(
      chalk.magenta(
        `│${title.padStart((maxWidth + title.length - 2) / 2).padEnd(maxWidth - 2)}│`,
      ),
    );
    console.log(chalk.magenta(`├${border}┤`));
    console.log(
      chalk.magenta(
        `│${subtitle.padStart((maxWidth + subtitle.length - 2) / 2).padEnd(maxWidth - 2)}│`,
      ),
    );
    console.log(chalk.magenta(`└${border}┘`));

    // Display priority order explanation for the entire module
    console.log();
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(
      chalk.yellow.bold(
        ' 📋 ' +
          this.translationManager.t(
            'cli.documentMetadata.prompts.priorityExplanation',
          ),
      ),
    );
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(
      chalk.green(
        this.translationManager.t('cli.documentMetadata.prompts.priority1'),
      ),
    );
    console.log(
      chalk.blue(
        this.translationManager.t('cli.documentMetadata.prompts.priority2'),
      ),
    );
    console.log(
      chalk.gray(
        this.translationManager.t('cli.documentMetadata.prompts.priority3'),
      ),
    );
    console.log();
    console.log(
      chalk.yellow(
        ' 💡 ' +
          this.translationManager.t(
            'cli.documentMetadata.prompts.priorityNote',
          ),
      ),
    );
    console.log(chalk.cyan('═'.repeat(60)));
    console.log();
  }

  private async selectMetadataOption(): Promise<string> {
    const inquirer = await import('inquirer');
    const { option } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'option',
        message: this.translationManager.t('cli.documentMetadata.selectOption'),
        choices: [
          {
            name: this.translationManager.t(
              'cli.documentMetadata.returnToCustomization',
            ),
            value: 'back',
            short: this.translationManager.t('short.back'),
          },
          {
            name: this.translationManager.t(
              'cli.documentMetadata.previewSettings',
            ),
            value: 'preview',
          },
          {
            name: this.translationManager.t(
              'cli.documentMetadata.configureExtractedInfo',
            ),
            value: 'configure-extraction',
          },
          {
            name: this.translationManager.t(
              'cli.documentMetadata.configureBasicInfo',
            ),
            value: 'configure-basic',
          },
          {
            name: this.translationManager.t(
              'cli.documentMetadata.configureFrontmatterMapping',
            ),
            value: 'configure-frontmatter',
          },
          {
            name: this.translationManager.t(
              'cli.documentMetadata.configureValidation',
            ),
            value: 'configure-validation',
          },
          {
            name: this.translationManager.t(
              'cli.documentMetadata.resetToDefaults',
            ),
            value: 'reset-defaults',
          },
        ],
        default: 'preview',
      },
    ]);
    return option;
  }

  private async previewMetadataSettings(): Promise<void> {
    console.log();
    console.log(
      chalk.cyan.bold(
        '👁️  ' +
          this.translationManager.t(
            'cli.documentMetadata.previewSettingsTitle',
          ),
      ),
    );
    console.log(chalk.gray('─'.repeat(60)));

    const configManager = this.container.resolve<IConfigManager>('config');
    const config = configManager.getAll();
    const metadata = (config as any).metadata || defaultConfig.metadata;

    // Display current settings
    console.log(
      chalk.yellow.bold(
        this.translationManager.t(
          'cli.documentMetadata.currentSettings.extractionSettings',
        ),
      ),
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.enabled')}: ${metadata.enabled ? chalk.green(this.translationManager.t('cli.documentMetadata.currentSettings.yes')) : chalk.red(this.translationManager.t('cli.documentMetadata.currentSettings.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.fromFrontmatter')}: ${metadata.autoExtraction?.fromFrontmatter ? chalk.green(this.translationManager.t('cli.documentMetadata.currentSettings.yes')) : chalk.red(this.translationManager.t('cli.documentMetadata.currentSettings.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.fromContent')}: ${metadata.autoExtraction?.fromContent ? chalk.green(this.translationManager.t('cli.documentMetadata.currentSettings.yes')) : chalk.red(this.translationManager.t('cli.documentMetadata.currentSettings.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.fromFilename')}: ${metadata.autoExtraction?.fromFilename ? chalk.green(this.translationManager.t('cli.documentMetadata.currentSettings.yes')) : chalk.red(this.translationManager.t('cli.documentMetadata.currentSettings.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.computeStats')}: ${metadata.autoExtraction?.computeStats ? chalk.green(this.translationManager.t('cli.documentMetadata.currentSettings.yes')) : chalk.red(this.translationManager.t('cli.documentMetadata.currentSettings.no'))}`,
    );

    console.log(
      chalk.yellow.bold(
        `${this.translationManager.t('cli.documentMetadata.currentSettings.defaultValues')}`,
      ),
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.title')}: ${metadata.defaults?.title ? chalk.green(metadata.defaults.title) : chalk.gray(this.translationManager.t('cli.documentMetadata.currentSettings.autoDetect'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.author')}: ${metadata.defaults?.author ? chalk.green(metadata.defaults.author) : chalk.gray(this.translationManager.t('cli.documentMetadata.currentSettings.notSet'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.subject')}: ${metadata.defaults?.subject ? chalk.green(metadata.defaults.subject) : chalk.gray(this.translationManager.t('cli.documentMetadata.currentSettings.notSet'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.keywords')}: ${metadata.defaults?.keywords ? chalk.green(metadata.defaults.keywords) : chalk.gray(this.translationManager.t('cli.documentMetadata.currentSettings.notSet'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.language')}: ${chalk.green(metadata.defaults?.language || 'en')}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.organization')}: ${metadata.defaults?.organization ? chalk.green(metadata.defaults.organization) : chalk.gray(this.translationManager.t('cli.documentMetadata.currentSettings.notSet'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.copyright')}: ${metadata.defaults?.copyright ? chalk.green(metadata.defaults.copyright) : chalk.gray(this.translationManager.t('cli.documentMetadata.currentSettings.notSet'))}`,
    );

    console.log(
      chalk.yellow.bold(
        `${this.translationManager.t('cli.documentMetadata.currentSettings.validationRules')}`,
      ),
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.requireTitle')}: ${metadata.validation?.requireTitle ? chalk.green(this.translationManager.t('cli.documentMetadata.currentSettings.yes')) : chalk.red(this.translationManager.t('cli.documentMetadata.currentSettings.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.requireAuthor')}: ${metadata.validation?.requireAuthor ? chalk.green(this.translationManager.t('cli.documentMetadata.currentSettings.yes')) : chalk.red(this.translationManager.t('cli.documentMetadata.currentSettings.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.maxKeywordsLength')}: ${chalk.blue(metadata.validation?.maxKeywordLength || 255)}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.maxSubjectLength')}: ${chalk.blue(metadata.validation?.maxSubjectLength || 512)}`,
    );

    await this.pressAnyKey();
  }

  private async configureExtractionSettings(): Promise<void> {
    console.log();
    console.log(
      chalk.cyan.bold(
        '🔧 ' +
          this.translationManager.t('cli.documentMetadata.extractionTitle'),
      ),
    );
    console.log(
      chalk.gray(
        this.translationManager.t('cli.documentMetadata.extractionDescription'),
      ),
    );

    const configManager = this.container.resolve<IConfigManager>('config');
    const config = configManager.getAll();
    const currentMetadata = (config as any).metadata || defaultConfig.metadata;

    // Show current status
    console.log(
      chalk.cyan(
        `📊 ${this.translationManager.t('cli.documentMetadata.currentSettings.currentStatus')}:`,
      ),
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.mainExtraction')}: ${currentMetadata.enabled ? chalk.green(`✅ ${this.translationManager.t('cli.documentMetadata.currentSettings.enabled')}`) : chalk.red(`❌ ${this.translationManager.t('cli.documentMetadata.currentSettings.disabled')}`)}`,
    );
    if (currentMetadata.enabled) {
      console.log(
        `   ${this.translationManager.t('cli.documentMetadata.currentSettings.frontmatter')}: ${currentMetadata.autoExtraction?.fromFrontmatter ? chalk.green('✅') : chalk.gray('❌')}`,
      );
      console.log(
        `   ${this.translationManager.t('cli.documentMetadata.currentSettings.contentDetection')}: ${currentMetadata.autoExtraction?.fromContent ? chalk.green('✅') : chalk.gray('❌')}`,
      );
      console.log(
        `   ${this.translationManager.t('cli.documentMetadata.currentSettings.filename')}: ${currentMetadata.autoExtraction?.fromFilename ? chalk.green('✅') : chalk.gray('❌')}`,
      );
      console.log(
        `   ${this.translationManager.t('cli.documentMetadata.currentSettings.statistics')}: ${currentMetadata.autoExtraction?.computeStats ? chalk.green('✅') : chalk.gray('❌')}`,
      );
    }
    console.log();

    const inquirer = await import('inquirer');
    const answers = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'enabled',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.enableExtraction',
        ),
        default: currentMetadata.enabled,
      },
      {
        type: 'confirm',
        name: 'fromFrontmatter',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.fromFrontmatter',
        ),
        default: currentMetadata.autoExtraction?.fromFrontmatter,
        when: (answers) => answers.enabled,
      },
      {
        type: 'confirm',
        name: 'fromContent',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.fromContent',
        ),
        default: currentMetadata.autoExtraction?.fromContent,
        when: (answers) => answers.enabled,
      },
      {
        type: 'confirm',
        name: 'fromFilename',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.fromFilename',
        ),
        default: currentMetadata.autoExtraction?.fromFilename,
        when: (answers) => answers.enabled,
      },
      {
        type: 'confirm',
        name: 'computeStats',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.computeStats',
        ),
        default: currentMetadata.autoExtraction?.computeStats,
        when: (answers) => answers.enabled,
      },
    ]);

    // Update configuration
    const updatedConfig = {
      ...config,
      metadata: {
        ...currentMetadata,
        enabled: answers.enabled,
        autoExtraction: {
          ...currentMetadata.autoExtraction,
          fromFrontmatter:
            answers.fromFrontmatter ??
            currentMetadata.autoExtraction?.fromFrontmatter,
          fromContent:
            answers.fromContent ?? currentMetadata.autoExtraction?.fromContent,
          fromFilename:
            answers.fromFilename ??
            currentMetadata.autoExtraction?.fromFilename,
          computeStats:
            answers.computeStats ??
            currentMetadata.autoExtraction?.computeStats,
        },
      },
    };

    configManager.set('metadata', updatedConfig.metadata);
    await configManager.save();

    console.log(
      chalk.green(
        '✅ ' +
          this.translationManager.t(
            'cli.documentMetadata.messages.extractionUpdateSuccess',
          ),
      ),
    );
    await this.pressAnyKey();
  }

  private async configureBasicMetadata(): Promise<void> {
    console.log();
    console.log(
      chalk.cyan.bold(
        '📝 ' + this.translationManager.t('cli.documentMetadata.basicTitle'),
      ),
    );
    console.log(
      chalk.gray(
        this.translationManager.t('cli.documentMetadata.basicDescription'),
      ),
    );

    const configManager = this.container.resolve<IConfigManager>('config');
    const config = configManager.getAll();
    const currentMetadata = (config as any).metadata || defaultConfig.metadata;

    const inquirer = await import('inquirer');
    const answers = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'defaultTitle',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.defaultTitle',
        ),
        default: currentMetadata.defaults?.title || '',
      },
      {
        type: 'input',
        name: 'defaultAuthor',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.defaultAuthor',
        ),
        default: currentMetadata.defaults?.author || '',
      },
      {
        type: 'input',
        name: 'defaultSubject',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.defaultSubject',
        ),
        default: currentMetadata.defaults?.subject || '',
      },
      {
        type: 'input',
        name: 'defaultKeywords',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.defaultKeywords',
        ),
        default: currentMetadata.defaults?.keywords || '',
      },
      {
        type: 'list',
        name: 'defaultLanguage',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.defaultLanguage',
        ),
        choices: [
          { name: 'English', value: 'en' },
          { name: '正體中文', value: 'zh-TW' },
        ],
        default: currentMetadata.defaults?.language || 'en',
      },
      {
        type: 'input',
        name: 'defaultOrganization',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.defaultOrganization',
        ),
        default: currentMetadata.defaults?.organization || '',
      },
      {
        type: 'input',
        name: 'defaultCopyright',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.defaultCopyright',
        ),
        default: currentMetadata.defaults?.copyright || '',
      },
    ]);

    // Update configuration
    const updatedConfig = {
      ...config,
      metadata: {
        ...currentMetadata,
        defaults: {
          ...currentMetadata.defaults,
          title: answers.defaultTitle || undefined,
          author: answers.defaultAuthor || undefined,
          subject: answers.defaultSubject || undefined,
          keywords: answers.defaultKeywords || undefined,
          language: answers.defaultLanguage,
          organization: answers.defaultOrganization || undefined,
          copyright: answers.defaultCopyright || undefined,
        },
      },
    };

    configManager.set('metadata', updatedConfig.metadata);
    await configManager.save();

    console.log(
      chalk.green(
        '✅ ' +
          this.translationManager.t(
            'cli.documentMetadata.messages.basicUpdateSuccess',
          ),
      ),
    );
    await this.pressAnyKey();
  }

  private async configureFrontmatterMapping(): Promise<void> {
    let running = true;

    while (running) {
      console.clear();
      console.log();
      console.log(
        chalk.cyan.bold(
          '🗂️ ' +
            this.translationManager.t(
              'cli.documentMetadata.frontmatterMapping.title',
            ),
        ),
      );
      console.log(
        chalk.gray(
          this.translationManager.t(
            'cli.documentMetadata.frontmatterMapping.description',
          ),
        ),
      );
      console.log();

      const configManager = this.container.resolve<IConfigManager>('config');
      const config = configManager.getAll();
      const currentMetadata =
        (config as any).metadata || defaultConfig.metadata;
      const currentMappings = currentMetadata.frontmatterMapping || {};

      // Display current mappings
      console.log(
        chalk.yellow(
          this.translationManager.t(
            'cli.documentMetadata.frontmatterMapping.currentMappings',
          ) + ':',
        ),
      );
      if (Object.keys(currentMappings).length === 0) {
        console.log(
          chalk.gray(
            '  ' +
              this.translationManager.t(
                'cli.documentMetadata.frontmatterMapping.noMappings',
              ),
          ),
        );
      } else {
        for (const [frontmatterField, metadataField] of Object.entries(
          currentMappings,
        )) {
          console.log(chalk.gray(`  ${frontmatterField} → ${metadataField}`));
        }
      }
      console.log();

      const inquirer = await import('inquirer');
      const action = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: this.translationManager.t(
            'cli.documentMetadata.prompts.whatToDo',
          ),
          choices: [
            {
              name: this.translationManager.t('common.back'),
              value: 'back',
            },
            {
              name: this.translationManager.t(
                'cli.documentMetadata.frontmatterMapping.addNewMapping',
              ),
              value: 'add',
            },
            {
              name: this.translationManager.t(
                'cli.documentMetadata.frontmatterMapping.editMapping',
              ),
              value: 'edit',
            },
            {
              name: this.translationManager.t(
                'cli.documentMetadata.frontmatterMapping.removeMapping',
              ),
              value: 'remove',
            },
          ],
        },
      ]);

      switch (action.action) {
        case 'back':
          running = false;
          break;
        case 'add':
          await this.addFrontmatterMapping(
            currentMappings,
            configManager,
            config,
          );
          await this.pressAnyKey();
          break;
        case 'edit':
          await this.editFrontmatterMapping(
            currentMappings,
            configManager,
            config,
          );
          await this.pressAnyKey();
          break;
        case 'remove':
          await this.removeFrontmatterMapping(
            currentMappings,
            configManager,
            config,
          );
          await this.pressAnyKey();
          break;
      }
    }
  }

  private async addFrontmatterMapping(
    currentMappings: any,
    configManager: any,
    config: any,
  ): Promise<void> {
    const inquirer = await import('inquirer');
    const answers = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'frontmatterField',
        message: this.translationManager.t(
          'cli.documentMetadata.frontmatterMapping.enterFrontmatterField',
        ),
        validate: (input: string) => {
          if (!input.trim()) return 'Field name is required';
          if (currentMappings[input])
            return this.translationManager.t(
              'cli.documentMetadata.frontmatterMapping.mappingExists',
            );
          return true;
        },
      },
      {
        type: 'list',
        name: 'metadataField',
        message: this.translationManager.t(
          'cli.documentMetadata.frontmatterMapping.metadataField',
        ),
        choices: [
          { name: 'title (Document title)', value: 'title' },
          { name: 'author (Document author)', value: 'author' },
          { name: 'subject (Document subject/description)', value: 'subject' },
          { name: 'keywords (Document keywords)', value: 'keywords' },
        ],
      },
    ]);

    const updatedMappings = {
      ...currentMappings,
      [answers.frontmatterField]: answers.metadataField,
    };

    const updatedConfig = {
      ...config,
      metadata: {
        ...(config.metadata || defaultConfig.metadata),
        frontmatterMapping: updatedMappings,
      },
    };

    configManager.set('metadata', updatedConfig.metadata);
    await configManager.save();

    console.log(
      chalk.green(
        '✅ ' +
          this.translationManager.t(
            'cli.documentMetadata.frontmatterMapping.updated',
          ),
      ),
    );
  }

  private async editFrontmatterMapping(
    currentMappings: any,
    configManager: any,
    config: any,
  ): Promise<void> {
    if (Object.keys(currentMappings).length === 0) {
      console.log(
        chalk.yellow(
          this.translationManager.t(
            'cli.documentMetadata.frontmatterMapping.noMappings',
          ),
        ),
      );
      return;
    }

    const inquirer = await import('inquirer');
    const fieldToEdit = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'field',
        message: this.translationManager.t(
          'cli.documentMetadata.frontmatterMapping.selectMappingToEdit',
        ),
        choices: [
          {
            name: this.translationManager.t('common.back'),
            value: '_back',
          },
          ...Object.keys(currentMappings).map((key) => ({
            name: `${key} → ${currentMappings[key]}`,
            value: key,
          })),
        ],
      },
    ]);

    // If user chose to go back, return early
    if (fieldToEdit.field === '_back') {
      return;
    }

    const newMetadataField = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'metadataField',
        message: `New mapping for "${fieldToEdit.field}":`,
        choices: [
          { name: 'title (Document title)', value: 'title' },
          { name: 'author (Document author)', value: 'author' },
          { name: 'subject (Document subject/description)', value: 'subject' },
          { name: 'keywords (Document keywords)', value: 'keywords' },
        ],
        default: currentMappings[fieldToEdit.field],
      },
    ]);

    const updatedMappings = {
      ...currentMappings,
      [fieldToEdit.field]: newMetadataField.metadataField,
    };

    const updatedConfig = {
      ...config,
      metadata: {
        ...(config.metadata || defaultConfig.metadata),
        frontmatterMapping: updatedMappings,
      },
    };

    configManager.set('metadata', updatedConfig.metadata);
    await configManager.save();

    console.log(
      chalk.green(
        '✅ ' +
          this.translationManager.t(
            'cli.documentMetadata.frontmatterMapping.updated',
          ),
      ),
    );
  }

  private async removeFrontmatterMapping(
    currentMappings: any,
    configManager: any,
    config: any,
  ): Promise<void> {
    if (Object.keys(currentMappings).length === 0) {
      console.log(
        chalk.yellow(
          this.translationManager.t(
            'cli.documentMetadata.frontmatterMapping.noMappings',
          ),
        ),
      );
      return;
    }

    const inquirer = await import('inquirer');
    const fieldToRemove = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'field',
        message: this.translationManager.t(
          'cli.documentMetadata.frontmatterMapping.selectMappingToRemove',
        ),
        choices: [
          {
            name: this.translationManager.t('common.back'),
            value: '_back',
          },
          ...Object.keys(currentMappings).map((key) => ({
            name: `${key} → ${currentMappings[key]}`,
            value: key,
          })),
        ],
      },
    ]);

    // If user chose to go back, return early
    if (fieldToRemove.field === '_back') {
      return;
    }

    const updatedMappings = { ...currentMappings };
    delete updatedMappings[fieldToRemove.field];

    const updatedConfig = {
      ...config,
      metadata: {
        ...(config.metadata || defaultConfig.metadata),
        frontmatterMapping: updatedMappings,
      },
    };

    configManager.set('metadata', updatedConfig.metadata);
    await configManager.save();

    console.log(
      chalk.green(
        '✅ ' +
          this.translationManager.t(
            'cli.documentMetadata.frontmatterMapping.updated',
          ),
      ),
    );
  }

  private async resetMetadataDefaults(): Promise<void> {
    console.log();
    console.log(
      chalk.cyan.bold(
        '🔄 ' + this.translationManager.t('cli.documentMetadata.resetTitle'),
      ),
    );
    console.log(
      chalk.yellow(
        this.translationManager.t('cli.documentMetadata.messages.resetWarning'),
      ),
    );

    const inquirer = await import('inquirer');
    const { confirm } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.confirmReset',
        ),
        default: false,
      },
    ]);

    if (confirm) {
      const configManager = this.container.resolve<IConfigManager>('config');
      const config = configManager.getAll();

      const updatedConfig = {
        ...config,
        metadata: { ...defaultConfig.metadata },
      };

      configManager.set('metadata', updatedConfig.metadata);
      await configManager.save();

      console.log(
        chalk.green(
          '✅ ' +
            this.translationManager.t(
              'cli.documentMetadata.messages.resetSuccess',
            ),
        ),
      );
    } else {
      console.log(
        chalk.gray(
          this.translationManager.t(
            'cli.documentMetadata.messages.resetCancelled',
          ),
        ),
      );
    }

    await this.pressAnyKey();
  }

  private async configureValidationSettings(): Promise<void> {
    console.log();
    console.log(
      chalk.cyan.bold(
        '✅ ' +
          this.translationManager.t('cli.documentMetadata.validationTitle'),
      ),
    );
    console.log(
      chalk.gray(
        this.translationManager.t('cli.documentMetadata.validationDescription'),
      ),
    );
    console.log();

    // Display important warning about validation behavior
    console.log(
      chalk.yellow(
        this.translationManager.t('cli.documentMetadata.validationNote'),
      ),
    );
    console.log();

    const configManager = this.container.resolve<IConfigManager>('config');
    const config = configManager.getAll();
    const currentMetadata = (config as any).metadata || defaultConfig.metadata;

    const inquirer = await import('inquirer');
    const answers = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'requireTitle',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.requireTitle',
        ),
        default: currentMetadata.validation?.requireTitle,
      },
      {
        type: 'confirm',
        name: 'requireAuthor',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.requireAuthor',
        ),
        default: currentMetadata.validation?.requireAuthor,
      },
      {
        type: 'number',
        name: 'maxKeywordLength',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.maxKeywordLength',
        ),
        default: currentMetadata.validation?.maxKeywordLength || 255,
      },
      {
        type: 'number',
        name: 'maxSubjectLength',
        message: this.translationManager.t(
          'cli.documentMetadata.prompts.maxSubjectLength',
        ),
        default: currentMetadata.validation?.maxSubjectLength || 512,
      },
    ]);

    // Update configuration
    const updatedConfig = {
      ...config,
      metadata: {
        ...currentMetadata,
        validation: {
          requireTitle: answers.requireTitle,
          requireAuthor: answers.requireAuthor,
          maxKeywordLength: answers.maxKeywordLength,
          maxSubjectLength: answers.maxSubjectLength,
        },
      },
    };

    configManager.set('metadata', updatedConfig.metadata);
    await configManager.save();

    console.log(
      chalk.green(
        '✅ ' +
          this.translationManager.t(
            'cli.documentMetadata.messages.validationUpdateSuccess',
          ),
      ),
    );
    await this.pressAnyKey();
  }

  private async pressAnyKey(): Promise<void> {
    const inquirer = await import('inquirer');
    await inquirer.default.prompt([
      {
        type: 'input',
        name: 'continue',
        message: this.translationManager.t(
          'customization.pressEnterToContinue',
        ),
      },
    ]);
  }
}
