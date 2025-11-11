/**
 * Customization mode for advanced styling and templates
 * Provides access to cover design, headers/footers, themes, etc.
 */

import chalk from 'chalk';

import {
  HeadersFootersConfig,
  HeaderConfig,
  FooterConfig,
  TitleConfig,
  PageNumberConfig,
  DateTimeConfig,
  CopyrightConfig,
  MessageConfig,
  DEFAULT_HEADERS_FOOTERS_CONFIG,
} from '../core/headers-footers';
import { defaultConfig } from '../infrastructure/config/defaults';

import { I18nHelpers } from './utils/i18n-helpers';

import type { IConfigManager } from '../infrastructure/config/types';
import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ILogger } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

export class CustomizationMode {
  private logger: ILogger;
  private translationManager: ITranslationManager;
  private configManager: IConfigManager;
  private i18nHelpers: I18nHelpers;

  constructor(private readonly container: ServiceContainer) {
    this.logger = this.container.resolve<ILogger>('logger');
    this.translationManager =
      this.container.resolve<ITranslationManager>('translator');
    this.configManager = this.container.resolve<IConfigManager>('config');
    this.i18nHelpers = new I18nHelpers(this.translationManager);
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

    const borderLine = '─'.repeat(79);

    console.log(chalk.blue(borderLine));
    console.log(chalk.blue(title.padStart((79 + title.length) / 2).padEnd(79)));
    console.log(chalk.blue(borderLine));
    console.log(
      chalk.blue(subtitle.padStart((79 + subtitle.length) / 2).padEnd(79)),
    );
    console.log(chalk.blue(borderLine));
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
        choices: this.i18nHelpers.createNumberedChoices(
          [
            {
              key: 'common.menu.returnToMain',
              value: 'back',
            },
            {
              key: 'cli.customizationMenu.coverDesign',
              value: 'cover',
            },
            {
              key: 'cli.customizationMenu.headersFooters',
              value: 'headers',
            },
            {
              key: 'cli.customizationMenu.documentMetadata',
              value: 'metadata',
            },
            {
              key: 'cli.customizationMenu.securitySettings',
              value: 'security',
            },
            {
              key: 'cli.customizationMenu.templateManagement',
              value: 'templates',
            },
          ],
          0,
        ),
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

  /**
   * Headers & Footers configuration interface
   */
  private async headersFooters(): Promise<void> {
    try {
      let running = true;

      while (running) {
        // Always get fresh config from file to reflect any changes
        const currentConfig = this.configManager.getConfig();

        this.showHeadersFootersHeader();
        const option = await this.selectHeadersFootersOption();

        switch (option) {
          case 'configure-header':
            const newHeaderConfig = await this.configureHeaderFooter(
              currentConfig.headersFooters.header,
              'header',
            );
            // Only save if configuration has changed
            if (
              JSON.stringify(newHeaderConfig) !==
              JSON.stringify(currentConfig.headersFooters.header)
            ) {
              await this.saveHeadersFootersSettings({
                ...currentConfig.headersFooters,
                header: newHeaderConfig,
              });
              console.log(
                chalk.green(
                  '✅ ' +
                    this.translationManager.t(
                      'headersFooters.messages.headerSettingsSaved',
                    ),
                ),
              );
              await this.pressAnyKey();
            }
            break;
          case 'configure-footer':
            const newFooterConfig = await this.configureHeaderFooter(
              currentConfig.headersFooters.footer,
              'footer',
            );
            // Only save if configuration has changed
            if (
              JSON.stringify(newFooterConfig) !==
              JSON.stringify(currentConfig.headersFooters.footer)
            ) {
              await this.saveHeadersFootersSettings({
                ...currentConfig.headersFooters,
                footer: newFooterConfig,
              });
              console.log(
                chalk.green(
                  '✅ ' +
                    this.translationManager.t(
                      'headersFooters.messages.footerSettingsSaved',
                    ),
                ),
              );
              await this.pressAnyKey();
            }
            break;
          case 'preview':
            await this.previewHeadersFootersSettings(
              currentConfig.headersFooters,
            );
            break;
          case 'reset-defaults':
            const shouldReset = await this.confirmResetHeadersFooters();
            if (shouldReset) {
              // Save immediately
              await this.saveHeadersFootersSettings({
                ...DEFAULT_HEADERS_FOOTERS_CONFIG,
              });
              console.log(
                chalk.green(
                  '✅ ' +
                    this.translationManager.t(
                      'headersFooters.messages.resetComplete',
                    ),
                ),
              );
            } else {
              console.log(
                chalk.yellow(
                  '⚠️ ' +
                    this.translationManager.t(
                      'headersFooters.messages.resetCancelled',
                    ),
                ),
              );
            }
            await this.pressAnyKey();
            break;
          case 'back':
            running = false;
            break;
        }
      }
    } catch (error) {
      this.logger.error('Headers & footers configuration error:', error);
      console.error(
        chalk.red(
          '❌ ' +
            this.translationManager.t('headersFooters.messages.settingsError') +
            ':',
        ),
        error,
      );
    }
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

    const borderLine = '─'.repeat(79);

    console.clear();
    console.log(chalk.magenta(borderLine));
    console.log(
      chalk.magenta(title.padStart((79 + title.length) / 2).padEnd(79)),
    );
    console.log(chalk.magenta(borderLine));
    console.log(
      chalk.magenta(subtitle.padStart((79 + subtitle.length) / 2).padEnd(79)),
    );
    console.log(chalk.magenta(borderLine));

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
            name:
              '0. ' + this.translationManager.t('common.menu.returnToPrevious'),
            value: 'back',
            short: this.translationManager.t('common.actions.back'),
          },
          {
            name:
              '1. ' +
              this.translationManager.t('cli.documentMetadata.previewSettings'),
            value: 'preview',
          },
          {
            name:
              '2. ' +
              this.translationManager.t(
                'cli.documentMetadata.configureExtractedInfo',
              ),
            value: 'configure-extraction',
          },
          {
            name:
              '3. ' +
              this.translationManager.t(
                'cli.documentMetadata.configureBasicInfo',
              ),
            value: 'configure-basic',
          },
          {
            name:
              '4. ' +
              this.translationManager.t(
                'cli.documentMetadata.configureFrontmatterMapping',
              ),
            value: 'configure-frontmatter',
          },
          {
            name:
              '5. ' +
              this.translationManager.t(
                'cli.documentMetadata.configureValidation',
              ),
            value: 'configure-validation',
          },
          {
            name:
              '6. ' +
              this.translationManager.t('cli.documentMetadata.resetToDefaults'),
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
      `   ${this.translationManager.t('common.status.enabled')}: ${metadata.enabled ? chalk.green(this.translationManager.t('common.status.yes')) : chalk.red(this.translationManager.t('common.status.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.fromFrontmatter')}: ${metadata.autoExtraction?.fromFrontmatter ? chalk.green(this.translationManager.t('common.status.yes')) : chalk.red(this.translationManager.t('common.status.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.fromContent')}: ${metadata.autoExtraction?.fromContent ? chalk.green(this.translationManager.t('common.status.yes')) : chalk.red(this.translationManager.t('common.status.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.fromFilename')}: ${metadata.autoExtraction?.fromFilename ? chalk.green(this.translationManager.t('common.status.yes')) : chalk.red(this.translationManager.t('common.status.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.computeStats')}: ${metadata.autoExtraction?.computeStats ? chalk.green(this.translationManager.t('common.status.yes')) : chalk.red(this.translationManager.t('common.status.no'))}`,
    );

    console.log(
      chalk.yellow.bold(
        `${this.translationManager.t('cli.documentMetadata.currentSettings.defaultValues')}`,
      ),
    );
    console.log(
      `   ${this.translationManager.t('common.fields.title')}: ${metadata.defaults?.title ? chalk.green(metadata.defaults.title) : chalk.gray(this.translationManager.t('common.status.autoDetect'))}`,
    );
    console.log(
      `   ${this.translationManager.t('common.fields.author')}: ${metadata.defaults?.author ? chalk.green(metadata.defaults.author) : chalk.gray(this.translationManager.t('common.status.notSet'))}`,
    );
    console.log(
      `   ${this.translationManager.t('common.fields.subject')}: ${metadata.defaults?.subject ? chalk.green(metadata.defaults.subject) : chalk.gray(this.translationManager.t('common.status.notSet'))}`,
    );
    console.log(
      `   ${this.translationManager.t('common.fields.keywords')}: ${metadata.defaults?.keywords ? chalk.green(metadata.defaults.keywords) : chalk.gray(this.translationManager.t('common.status.notSet'))}`,
    );
    console.log(
      `   ${this.translationManager.t('common.fields.language')}: ${chalk.green(this.translationManager.t(`cli.languages.${metadata.defaults?.language || 'en'}`))}`,
    );
    console.log(
      `   ${this.translationManager.t('common.fields.organization')}: ${metadata.defaults?.organization ? chalk.green(metadata.defaults.organization) : chalk.gray(this.translationManager.t('common.status.notSet'))}`,
    );
    console.log(
      `   ${this.translationManager.t('common.fields.copyright')}: ${metadata.defaults?.copyright ? chalk.green(metadata.defaults.copyright) : chalk.gray(this.translationManager.t('common.status.notSet'))}`,
    );

    console.log(
      chalk.yellow.bold(
        `${this.translationManager.t('cli.documentMetadata.currentSettings.validationRules')}`,
      ),
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.validation.requireTitle')}: ${metadata.validation?.requireTitle ? chalk.green(this.translationManager.t('common.status.yes')) : chalk.red(this.translationManager.t('common.status.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.validation.requireAuthor')}: ${metadata.validation?.requireAuthor ? chalk.green(this.translationManager.t('common.status.yes')) : chalk.red(this.translationManager.t('common.status.no'))}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.validation.maxKeywordLength')}: ${chalk.blue(metadata.validation?.maxKeywordLength || 255)}`,
    );
    console.log(
      `   ${this.translationManager.t('cli.documentMetadata.validation.maxSubjectLength')}: ${chalk.blue(metadata.validation?.maxSubjectLength || 512)}`,
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
      `   ${this.translationManager.t('cli.documentMetadata.currentSettings.mainExtraction')}: ${currentMetadata.enabled ? chalk.green(`✅ ${this.translationManager.t('common.status.enabled')}`) : chalk.red(`❌ ${this.translationManager.t('common.status.disabled')}`)}`,
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
              name: '0. ' + this.translationManager.t('common.actions.back'),
              value: 'back',
            },
            {
              name:
                '1. ' +
                this.translationManager.t(
                  'cli.documentMetadata.frontmatterMapping.addNewMapping',
                ),
              value: 'add',
            },
            {
              name:
                '2. ' +
                this.translationManager.t(
                  'cli.documentMetadata.frontmatterMapping.editMapping',
                ),
              value: 'edit',
            },
            {
              name:
                '3. ' +
                this.translationManager.t(
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
            name: this.translationManager.t('common.actions.back'),
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
            name: this.translationManager.t('common.actions.back'),
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
          'common.actions.pressEnterToContinue',
        ),
      },
    ]);
  }

  // Headers & Footers configuration methods

  /**
   * Show headers & footers configuration header
   */
  private showHeadersFootersHeader(): void {
    console.clear();

    const title = this.translationManager.t('headersFooters.basicInfo.title');
    const subtitle = this.translationManager.t(
      'headersFooters.basicInfo.subtitle',
    );

    const borderLine = '─'.repeat(79);

    console.log(chalk.blue(borderLine));
    console.log(chalk.blue(title.padStart((79 + title.length) / 2).padEnd(79)));
    console.log(chalk.blue(borderLine));
    console.log(
      chalk.blue(subtitle.padStart((79 + subtitle.length) / 2).padEnd(79)),
    );
    console.log(chalk.blue(borderLine));
    console.log();
  }

  /**
   * Select headers & footers configuration option
   */
  private async selectHeadersFootersOption(): Promise<string> {
    const inquirer = await import('inquirer');
    const answer = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'option',
        message: this.translationManager.t(
          'headersFooters.prompts.selectOption',
        ),
        choices: [
          {
            name: `0. ${this.translationManager.t('common.menu.returnToPrevious')}`,
            value: 'back',
          },
          {
            name: `1. ${this.translationManager.t('headersFooters.menu.previewSettings')}`,
            value: 'preview',
          },
          {
            name: `2. ${this.translationManager.t('headersFooters.menu.configureHeader')}`,
            value: 'configure-header',
          },
          {
            name: `3. ${this.translationManager.t('headersFooters.menu.configureFooter')}`,
            value: 'configure-footer',
          },
          {
            name: `4. ${this.translationManager.t('headersFooters.menu.resetToDefaults')}`,
            value: 'reset-defaults',
          },
        ],
        default: 'preview',
      },
    ]);
    return answer.option;
  }

  /**
   * Configure individual header or footer
   */
  private async configureHeaderFooter(
    config: HeaderConfig | FooterConfig,
    type: 'header' | 'footer',
  ): Promise<HeaderConfig | FooterConfig> {
    let running = true;
    let updatedConfig = { ...config };

    while (running) {
      console.clear();
      console.log(chalk.cyan('═'.repeat(60)));
      console.log(
        chalk.cyan.bold(
          type === 'header'
            ? this.translationManager.t(
                'headersFooters.sections.headerSettings',
              )
            : this.translationManager.t(
                'headersFooters.sections.footerSettings',
              ),
        ),
      );
      console.log(chalk.cyan('═'.repeat(60)));

      // Show current status
      const statusText = updatedConfig.enabled
        ? chalk.green(
            this.translationManager.t(
              'headersFooters.status.' + type + 'Enabled',
            ),
          )
        : chalk.red(
            this.translationManager.t(
              'headersFooters.status.' + type + 'Disabled',
            ),
          );
      console.log(
        `${this.translationManager.t('common.status.enabled')}: ${statusText}`,
      );
      console.log();

      const inquirer = await import('inquirer');
      const answer = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'option',
          message: this.translationManager.t(
            'headersFooters.menu.selectConfigOption',
          ),
          choices: [
            {
              name:
                '0. ' +
                this.translationManager.t('common.menu.returnToPrevious'),
              value: 'back',
            },
            {
              name: `1. ${updatedConfig.enabled ? this.translationManager.t('headersFooters.enable.disable') : this.translationManager.t('headersFooters.enable.toggle')}${type === 'header' ? this.translationManager.t('headersFooters.sections.header') : this.translationManager.t('headersFooters.sections.footer')}`,
              value: 'toggle-enabled',
            },
            {
              name:
                '2. ' +
                this.translationManager.t('headersFooters.configure.title'),
              value: 'configure-title',
              disabled: !updatedConfig.enabled,
            },
            {
              name:
                '3. ' +
                this.translationManager.t(
                  'headersFooters.configure.pageNumber',
                ),
              value: 'configure-page-number',
              disabled: !updatedConfig.enabled,
            },
            {
              name:
                '4. ' +
                this.translationManager.t('headersFooters.configure.dateTime'),
              value: 'configure-datetime',
              disabled: !updatedConfig.enabled,
            },
            {
              name:
                '5. ' +
                this.translationManager.t('headersFooters.configure.copyright'),
              value: 'configure-copyright',
              disabled: !updatedConfig.enabled,
            },
            {
              name:
                '6. ' +
                this.translationManager.t('headersFooters.configure.message'),
              value: 'configure-message',
              disabled: !updatedConfig.enabled,
            },
            {
              name:
                '7. ' +
                this.translationManager.t('headersFooters.configure.author'),
              value: 'configure-author',
              disabled: !updatedConfig.enabled,
            },
            {
              name:
                '8. ' +
                this.translationManager.t(
                  'headersFooters.configure.organization',
                ),
              value: 'configure-organization',
              disabled: !updatedConfig.enabled,
            },
            {
              name:
                '9. ' +
                this.translationManager.t('headersFooters.configure.version'),
              value: 'configure-version',
              disabled: !updatedConfig.enabled,
            },
          ],
        },
      ]);

      switch (answer.option) {
        case 'toggle-enabled':
          updatedConfig.enabled = !updatedConfig.enabled;
          // Immediately save the toggle change
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                (updatedConfig.enabled
                  ? this.translationManager.t(
                      type === 'header'
                        ? 'headersFooters.messages.headerEnabledSaved'
                        : 'headersFooters.messages.footerEnabledSaved',
                    )
                  : this.translationManager.t(
                      type === 'header'
                        ? 'headersFooters.messages.headerDisabledSaved'
                        : 'headersFooters.messages.footerDisabledSaved',
                    )),
            ),
          );
          break;
        case 'configure-title':
          updatedConfig.title = await this.configureTitleSettings(
            updatedConfig.title,
          );
          // Immediately save the title change
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                this.translationManager.t('headersFooters.messages.titleSaved'),
            ),
          );
          break;
        case 'configure-page-number':
          updatedConfig.pageNumber = await this.configurePageNumberSettings(
            updatedConfig.pageNumber,
          );
          // Immediately save the page number change
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                this.translationManager.t(
                  'headersFooters.messages.pageNumberSaved',
                ),
            ),
          );
          break;
        case 'configure-datetime':
          updatedConfig.dateTime = await this.configureDateTimeSettings(
            updatedConfig.dateTime,
          );
          // Immediately save the datetime change
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                this.translationManager.t(
                  'headersFooters.messages.dateTimeSaved',
                ),
            ),
          );
          break;
        case 'configure-copyright':
          updatedConfig.copyright = await this.configureCopyrightSettings(
            updatedConfig.copyright,
          );
          // Immediately save the author change
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                this.translationManager.t(
                  'headersFooters.messages.copyrightSaved',
                ),
            ),
          );
          break;
        case 'configure-message':
          updatedConfig.message = await this.configureMessageSettings(
            updatedConfig.message,
          );
          // Immediately save the message change
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                this.translationManager.t(
                  'headersFooters.messages.messageSaved',
                ),
            ),
          );
          break;
        case 'configure-author':
          updatedConfig.author = await this.configureMetadataFieldSettings(
            updatedConfig.author,
            'author',
          );
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                this.translationManager.t(
                  'headersFooters.messages.authorSaved',
                ),
            ),
          );
          break;
        case 'configure-organization':
          updatedConfig.organization =
            await this.configureMetadataFieldSettings(
              updatedConfig.organization,
              'organization',
            );
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                this.translationManager.t(
                  'headersFooters.messages.organizationSaved',
                ),
            ),
          );
          break;
        case 'configure-version':
          updatedConfig.version = await this.configureMetadataFieldSettings(
            updatedConfig.version,
            'version',
          );
          await this.saveIndividualHeaderFooterSetting(type, updatedConfig);
          console.log(
            chalk.green(
              '✅ ' +
                this.translationManager.t(
                  'headersFooters.messages.versionSaved',
                ),
            ),
          );
          break;
        case 'back':
          running = false;
          break;
      }
    }

    return updatedConfig;
  }

  /**
   * Configure title settings
   */
  private async configureTitleSettings(
    config: TitleConfig,
  ): Promise<TitleConfig> {
    const inquirer = await import('inquirer');

    const displayModeAnswer = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'mode',
        message: this.translationManager.t(
          'headersFooters.prompts.selectTitleMode',
        ),
        choices: [
          {
            name: this.translationManager.t('common.displayModes.none'),
            value: 'none',
          },
          {
            name: this.translationManager.t('common.displayModes.metadata'),
            value: 'metadata',
          },
          {
            name: this.translationManager.t('common.displayModes.custom'),
            value: 'custom',
          },
        ],
        default: config.mode,
      },
    ]);

    let customValue = config.customValue;
    if (displayModeAnswer.mode === 'custom') {
      const customAnswer = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'customValue',
          message: this.translationManager.t(
            'headersFooters.prompts.enterCustomTitle',
          ),
          default: config.customValue || '',
        },
      ]);
      customValue = customAnswer.customValue;
    }

    const alignmentAnswer = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'alignment',
        message: this.translationManager.t(
          'headersFooters.prompts.selectAlignment',
        ),
        choices: [
          {
            name: this.translationManager.t('common.alignment.left'),
            value: 'left',
          },
          {
            name: this.translationManager.t('common.alignment.center'),
            value: 'center',
          },
          {
            name: this.translationManager.t('common.alignment.right'),
            value: 'right',
          },
        ],
        default: config.alignment || 'left',
        when: () => displayModeAnswer.mode !== 'none',
      },
    ]);

    const result: any = {
      mode: displayModeAnswer.mode,
      enabled: displayModeAnswer.mode !== 'none',
      alignment: alignmentAnswer.alignment || config.alignment || 'left',
    };

    if (customValue !== undefined) {
      result.customValue = customValue;
    }

    return result;
  }

  /**
   * Configure page number settings
   */
  private async configurePageNumberSettings(
    config: PageNumberConfig,
  ): Promise<PageNumberConfig> {
    const inquirer = await import('inquirer');

    const answers = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'mode',
        message: this.translationManager.t(
          'headersFooters.prompts.selectPageNumberMode',
        ),
        choices: [
          {
            name: this.translationManager.t('common.displayModes.none'),
            value: 'none',
          },
          {
            name: this.translationManager.t('common.displayModes.show'),
            value: 'show',
          },
        ],
        default: config.mode,
      },
      {
        type: 'list',
        name: 'alignment',
        message: this.translationManager.t(
          'headersFooters.prompts.selectAlignment',
        ),
        choices: [
          {
            name: this.translationManager.t('common.alignment.left'),
            value: 'left',
          },
          {
            name: this.translationManager.t('common.alignment.center'),
            value: 'center',
          },
          {
            name: this.translationManager.t('common.alignment.right'),
            value: 'right',
          },
        ],
        default: config.alignment || 'right',
        when: (answers: any) => answers.mode !== 'none',
      },
    ]);

    return {
      mode: answers.mode,
      enabled: answers.mode !== 'none',
      alignment: answers.alignment || config.alignment || 'right',
    };
  }

  /**
   * Configure date time settings
   */
  private async configureDateTimeSettings(
    config: DateTimeConfig,
  ): Promise<DateTimeConfig> {
    const inquirer = await import('inquirer');

    const answers = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'mode',
        message: this.translationManager.t(
          'headersFooters.prompts.selectDateTimeMode',
        ),
        choices: [
          {
            name: this.translationManager.t('common.displayModes.none'),
            value: 'none',
          },
          {
            name: this.translationManager.t('common.displayModes.date-short'),
            value: 'date-short',
          },
          {
            name: this.translationManager.t('common.displayModes.date-long'),
            value: 'date-long',
          },
          {
            name: this.translationManager.t('common.displayModes.date-iso'),
            value: 'date-iso',
          },
          {
            name: this.translationManager.t(
              'common.displayModes.datetime-short',
            ),
            value: 'datetime-short',
          },
          {
            name: this.translationManager.t(
              'common.displayModes.datetime-long',
            ),
            value: 'datetime-long',
          },
        ],
        default: config.mode,
      },
      {
        type: 'list',
        name: 'alignment',
        message: this.translationManager.t(
          'headersFooters.prompts.selectAlignment',
        ),
        choices: [
          {
            name: this.translationManager.t('common.alignment.left'),
            value: 'left',
          },
          {
            name: this.translationManager.t('common.alignment.center'),
            value: 'center',
          },
          {
            name: this.translationManager.t('common.alignment.right'),
            value: 'right',
          },
        ],
        default: config.alignment || 'center',
        when: (answers: any) => answers.mode !== 'none',
      },
    ]);

    return {
      mode: answers.mode,
      enabled: answers.mode !== 'none',
      alignment: answers.alignment || config.alignment || 'center',
    };
  }

  /**
   * Configure author settings
   */
  private async configureCopyrightSettings(
    config: CopyrightConfig,
  ): Promise<CopyrightConfig> {
    const inquirer = await import('inquirer');

    const modeAnswer = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'mode',
        message: this.translationManager.t(
          'headersFooters.prompts.selectAuthorMode',
        ),
        choices: [
          {
            name: this.translationManager.t('common.displayModes.none'),
            value: 'none',
          },
          {
            name: this.translationManager.t('common.displayModes.custom'),
            value: 'custom',
          },
        ],
        default: config.mode,
      },
    ]);

    let customValue = config.customValue;
    let alignment = config.alignment;

    if (modeAnswer.mode === 'custom') {
      const customAnswer = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'customValue',
          message: this.translationManager.t(
            'headersFooters.prompts.enterCustomAuthor',
          ),
          default: config.customValue || '',
        },
        {
          type: 'list',
          name: 'alignment',
          message: this.translationManager.t(
            'headersFooters.prompts.selectAlignment',
          ),
          choices: [
            {
              name: this.translationManager.t('common.alignment.left'),
              value: 'left',
            },
            {
              name: this.translationManager.t('common.alignment.center'),
              value: 'center',
            },
            {
              name: this.translationManager.t('common.alignment.right'),
              value: 'right',
            },
          ],
          default: config.alignment || 'center',
        },
      ]);
      customValue = customAnswer.customValue;
      alignment = customAnswer.alignment;
    }

    const result: any = {
      mode: modeAnswer.mode,
      enabled: modeAnswer.mode !== 'none',
      alignment: alignment || 'center',
    };

    if (customValue !== undefined) {
      result.customValue = customValue;
    }

    return result;
  }

  /**
   * Configure custom message settings
   */
  private async configureMessageSettings(
    config: MessageConfig,
  ): Promise<MessageConfig> {
    const inquirer = await import('inquirer');

    const modeAnswer = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'mode',
        message: this.translationManager.t(
          'headersFooters.prompts.selectMessageMode',
        ),
        choices: [
          {
            name: this.translationManager.t('common.displayModes.none'),
            value: 'none',
          },
          {
            name: this.translationManager.t('common.displayModes.custom'),
            value: 'custom',
          },
        ],
        default: config.mode,
      },
    ]);

    let customValue = config.customValue;
    let alignment = config.alignment;

    if (modeAnswer.mode === 'custom') {
      const customAnswer = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'customValue',
          message: this.translationManager.t(
            'headersFooters.prompts.enterCustomMessage',
          ),
          default: config.customValue || '',
        },
        {
          type: 'list',
          name: 'alignment',
          message: this.translationManager.t(
            'headersFooters.prompts.selectAlignment',
          ),
          choices: [
            {
              name: this.translationManager.t('common.alignment.left'),
              value: 'left',
            },
            {
              name: this.translationManager.t('common.alignment.center'),
              value: 'center',
            },
            {
              name: this.translationManager.t('common.alignment.right'),
              value: 'right',
            },
          ],
          default: config.alignment || 'center',
        },
      ]);
      customValue = customAnswer.customValue;
      alignment = customAnswer.alignment;
    }

    const result: any = {
      mode: modeAnswer.mode,
      enabled: modeAnswer.mode !== 'none',
      alignment: alignment || 'center',
    };

    if (customValue !== undefined) {
      result.customValue = customValue;
    }

    return result;
  }

  /**
   * Preview headers & footers settings
   */
  private async previewHeadersFootersSettings(
    config: HeadersFootersConfig,
  ): Promise<void> {
    console.clear();

    // Enhanced header with visual design
    console.log(chalk.cyan('╔' + '═'.repeat(78) + '╗'));
    console.log(
      chalk.cyan('║') +
        chalk.cyan.bold(
          (
            ' 📋 ' +
            this.translationManager.t('headersFooters.preview.title') +
            ' '
          ).padEnd(78),
        ) +
        chalk.cyan('║'),
    );
    console.log(chalk.cyan('╚' + '═'.repeat(78) + '╝'));
    console.log();

    // Visual page layout preview
    this.showPageLayoutPreview(config);
    console.log();

    // Detailed configuration summary
    console.log(
      chalk.yellow('📊 ') +
        chalk.bold(
          this.translationManager.t(
            'headersFooters.preview.detailedConfigSummary',
          ),
        ),
    );
    console.log(chalk.gray('─'.repeat(50)));
    console.log();

    // Header configuration
    this.showDetailedSectionConfig(
      this.translationManager.t('headersFooters.sections.header'),
      config.header,
    );
    console.log();

    // Footer configuration
    this.showDetailedSectionConfig(
      this.translationManager.t('headersFooters.sections.footer'),
      config.footer,
    );
    console.log();

    // Overall statistics
    this.showConfigurationStatistics(config);
    console.log();

    await this.pressAnyKey();
  }

  /**
   * Show visual page layout preview with ASCII art
   */
  private showPageLayoutPreview(config: HeadersFootersConfig): void {
    console.log(
      chalk.yellow('🖼️  ') +
        chalk.bold(
          this.translationManager.t('headersFooters.preview.pageLayoutPreview'),
        ),
    );
    console.log(chalk.gray('─'.repeat(50)));
    console.log();

    // Page border
    console.log(chalk.gray('    ┌' + '─'.repeat(60) + '┐'));

    // Header section
    if (config.header.enabled) {
      const headerContent = this.generatePreviewContent(config.header);
      console.log(
        chalk.gray('    │') +
          chalk
            .green(
              ' 📄 ' +
                this.translationManager.t('headersFooters.sections.header'),
            )
            .padEnd(70) +
          chalk.gray('│'),
      );
      headerContent.forEach((line, index) => {
        const content = line.length > 58 ? line.substring(0, 55) + '...' : line;
        const color = index === 0 ? chalk.green : chalk.greenBright;
        console.log(
          chalk.gray('    │') +
            color(` ${content} `.padEnd(60)) +
            chalk.gray('│'),
        );
      });
      console.log(
        chalk.gray('    │') + chalk.gray('─'.repeat(60)) + chalk.gray('│'),
      );
    } else {
      console.log(
        chalk.gray('    │') +
          chalk
            .red(
              ' ❌ ' +
                this.translationManager.t(
                  'headersFooters.preview.headerDisabled',
                ) +
                ' ',
            )
            .padEnd(60) +
          chalk.gray('│'),
      );
      console.log(
        chalk.gray('    │') + chalk.gray('─'.repeat(60)) + chalk.gray('│'),
      );
    }

    // Content section
    console.log(
      chalk.gray('    │') +
        chalk.blue(
          '                                                            ',
        ) +
        chalk.gray('│'),
    );
    console.log(
      chalk.gray('    │') +
        chalk.blue(
          (
            ' 📝 ' +
            this.translationManager.t(
              'headersFooters.preview.documentContent',
            ) +
            '                        '
          ).padEnd(60),
        ) +
        chalk.gray('│'),
    );
    console.log(
      chalk.gray('    │') +
        chalk.blue(
          '                                                            ',
        ) +
        chalk.gray('│'),
    );
    console.log(
      chalk.gray('    │') +
        chalk.blue(
          (
            ' ' +
            this.translationManager.t(
              'headersFooters.preview.contentDescription',
            ) +
            '                '
          ).padEnd(60),
        ) +
        chalk.gray('│'),
    );
    console.log(
      chalk.gray('    │') +
        chalk.blue(
          '                                                            ',
        ) +
        chalk.gray('│'),
    );

    // Footer section
    console.log(
      chalk.gray('    │') + chalk.gray('─'.repeat(60)) + chalk.gray('│'),
    );
    if (config.footer.enabled) {
      const footerContent = this.generatePreviewContent(config.footer);
      console.log(
        chalk.gray('    │') +
          chalk
            .cyan(
              ' 📄 ' +
                this.translationManager.t('headersFooters.sections.footer'),
            )
            .padEnd(70) +
          chalk.gray('│'),
      );
      footerContent.forEach((line, index) => {
        const content = line.length > 58 ? line.substring(0, 55) + '...' : line;
        const color = index === 0 ? chalk.cyan : chalk.cyanBright;
        console.log(
          chalk.gray('    │') +
            color(` ${content} `.padEnd(60)) +
            chalk.gray('│'),
        );
      });
    } else {
      console.log(
        chalk.gray('    │') +
          chalk
            .red(
              ' ❌ ' +
                this.translationManager.t(
                  'headersFooters.preview.footerDisabled',
                ) +
                ' ',
            )
            .padEnd(60) +
          chalk.gray('│'),
      );
    }

    // Page border bottom
    console.log(chalk.gray('    └' + '─'.repeat(60) + '┘'));
  }

  /**
   * Show detailed configuration for a section (header or footer)
   */
  private showDetailedSectionConfig(
    sectionName: string,
    config: HeaderConfig | FooterConfig,
  ): void {
    const isEnabled = config.enabled;
    const statusIcon = isEnabled ? '✅' : '❌';
    const statusText = isEnabled
      ? this.translationManager.t('common.status.enabled')
      : this.translationManager.t('common.status.disabled');
    const statusColor = isEnabled ? chalk.green : chalk.red;

    console.log(
      chalk.bold(`${statusIcon} ${sectionName}: `) + statusColor(statusText),
    );

    if (!isEnabled) {
      console.log(
        chalk.gray(
          '   ' +
            this.translationManager.t('headersFooters.preview.sectionDisabled'),
        ),
      );
      return;
    }

    // Show individual field configurations
    const fields = [
      {
        name: this.translationManager.t('common.fields.title'),
        config: config.title,
        preview: this.getFieldPreviewValue(config.title, 'title'),
      },
      {
        name: this.translationManager.t('common.fields.pageNumber'),
        config: config.pageNumber,
        preview: this.getFieldPreviewValue(config.pageNumber, 'pageNumber'),
      },
      {
        name: this.translationManager.t('common.fields.dateTime'),
        config: config.dateTime,
        preview: this.getFieldPreviewValue(config.dateTime, 'dateTime'),
      },
      {
        name: this.translationManager.t('common.fields.copyright'),
        config: config.copyright,
        preview: this.getFieldPreviewValue(config.copyright, 'copyright'),
      },
      {
        name: this.translationManager.t('common.fields.message'),
        config: config.message,
        preview: this.getFieldPreviewValue(config.message, 'message'),
      },
      {
        name: this.translationManager.t('common.fields.author'),
        config: (config as any).author,
        preview: this.getFieldPreviewValue((config as any).author, 'author'),
      },
      {
        name: this.translationManager.t('common.fields.organization'),
        config: (config as any).organization,
        preview: this.getFieldPreviewValue(
          (config as any).organization,
          'organization',
        ),
      },
      {
        name: this.translationManager.t('common.fields.version'),
        config: (config as any).version,
        preview: this.getFieldPreviewValue((config as any).version, 'version'),
      },
    ];

    fields.forEach((field) => {
      if (
        field.config &&
        field.config.enabled &&
        field.config.mode !== 'none'
      ) {
        const alignmentColor =
          field.config.alignment === 'left'
            ? chalk.yellow(this.translationManager.t('common.alignment.left'))
            : field.config.alignment === 'center'
              ? chalk.blue(this.translationManager.t('common.alignment.center'))
              : chalk.magenta(
                  this.translationManager.t('common.alignment.right'),
                );

        const modeText =
          field.config.mode === 'custom'
            ? chalk.gray(
                `[${this.translationManager.t('common.displayModes.custom')}: ${field.config.customValue || this.translationManager.t('common.status.notSet')}]`,
              )
            : field.config.mode === 'metadata'
              ? chalk.green(
                  `[${this.translationManager.t('common.displayModes.metadata')}]`,
                )
              : chalk.cyan(`[${field.config.mode}]`);

        console.log(`   📌 ${field.name}: ${alignmentColor} ${modeText}`);
        console.log(
          chalk.gray(
            `      ${this.translationManager.t('common.actions.preview')}: ${field.preview}`,
          ),
        );
      }
    });
  }

  /**
   * Get preview value for a specific field based on its configuration
   */
  private getFieldPreviewValue(config: any, fieldType: string): string {
    if (!config || !config.enabled || config.mode === 'none') {
      return this.translationManager.t('common.status.disabled');
    }

    switch (fieldType) {
      case 'title':
        if (config.mode === 'custom') {
          return (
            config.customValue ||
            this.translationManager.t('common.examples.title')
          );
        } else if (config.mode === 'metadata') {
          return this.translationManager.t('common.examples.title');
        }
        return this.translationManager.t('common.examples.title');

      case 'pageNumber':
        return this.translationManager.t('common.examples.pageNumber');

      case 'dateTime':
        return this.translationManager.t('common.examples.dateTime');

      case 'copyright':
        if (config.mode === 'custom') {
          return (
            config.customValue ||
            this.translationManager.t('common.examples.copyright')
          );
        } else if (config.mode === 'metadata') {
          return this.translationManager.t('common.examples.copyright');
        }
        return this.translationManager.t('common.examples.copyright');

      case 'message':
        if (config.mode === 'custom') {
          return (
            config.customValue ||
            this.translationManager.t('headersFooters.preview.messageExample')
          );
        }
        return this.translationManager.t(
          'headersFooters.preview.messageExample',
        );

      case 'author':
        if (config.mode === 'custom') {
          return (
            config.customValue ||
            this.translationManager.t('common.examples.author')
          );
        } else if (config.mode === 'metadata') {
          return this.translationManager.t('common.examples.author');
        }
        return this.translationManager.t('common.examples.author');

      case 'organization':
        if (config.mode === 'custom') {
          return (
            config.customValue ||
            this.translationManager.t('common.examples.organization')
          );
        } else if (config.mode === 'metadata') {
          return this.translationManager.t('common.examples.organization');
        }
        return this.translationManager.t('common.examples.organization');

      case 'version':
        if (config.mode === 'custom') {
          return (
            config.customValue ||
            this.translationManager.t('common.examples.version')
          );
        } else if (config.mode === 'metadata') {
          return this.translationManager.t('common.examples.version');
        }
        return this.translationManager.t('common.examples.version');

      default:
        return this.translationManager.t('common.status.notSet');
    }
  }

  /**
   * Show overall configuration statistics
   */
  private showConfigurationStatistics(config: HeadersFootersConfig): void {
    console.log(
      chalk.yellow('📈 ') +
        chalk.bold(
          this.translationManager.t(
            'headersFooters.preview.configurationStatistics',
          ),
        ),
    );
    console.log(chalk.gray('─'.repeat(50)));

    const headerFieldCount = this.countEnabledFields(config.header);
    const footerFieldCount = this.countEnabledFields(config.footer);
    const totalFields = headerFieldCount + footerFieldCount;

    console.log();

    console.log(
      `   📄 ${this.translationManager.t('headersFooters.preview.headerFields')}: ${chalk.green(headerFieldCount)}`,
    );
    console.log(
      `   📄 ${this.translationManager.t('headersFooters.preview.footerFields')}: ${chalk.cyan(footerFieldCount)}`,
    );

    console.log();

    console.log(
      `   🧮 ${this.translationManager.t('headersFooters.preview.totalEnabledFields')}: ${chalk.cyan(totalFields)}`,
    );

    console.log();

    // Configuration recommendations
    if (totalFields === 0) {
      console.log(
        chalk.yellow(
          '   ⚠️  ' +
            this.translationManager.t(
              'headersFooters.preview.recommendations.noFields',
            ),
        ),
      );
    } else if (totalFields > 6) {
      console.log(
        chalk.yellow(
          '   ⚠️  ' +
            this.translationManager.t(
              'headersFooters.preview.recommendations.tooManyFields',
            ),
        ),
      );
    } else {
      console.log(
        chalk.green(
          '   ✅ ' +
            this.translationManager.t(
              'headersFooters.preview.recommendations.goodConfiguration',
            ),
        ),
      );
    }
  }

  /**
   * Count enabled fields in a section
   */
  private countEnabledFields(config: HeaderConfig | FooterConfig): number {
    if (!config.enabled) return 0;

    let count = 0;
    const fields = [
      config.title,
      config.pageNumber,
      config.dateTime,
      config.copyright,
      config.message,
      (config as any).author,
      (config as any).organization,
      (config as any).version,
    ];

    fields.forEach((field) => {
      if (field && field.enabled && field.mode !== 'none') {
        count++;
      }
    });

    return count;
  }

  /**
   * Generate preview content for a section
   */
  private generatePreviewContent(
    config: HeaderConfig | FooterConfig,
  ): string[] {
    if (!config.enabled)
      return [this.translationManager.t('common.status.disabled')];

    const content: string[] = [];

    // Check each field and add to content
    if (config.title.enabled && config.title.mode !== 'none') {
      let titleText: string;
      if (config.title.mode === 'custom') {
        titleText =
          config.title.customValue ||
          this.translationManager.t('common.examples.title');
      } else if (config.title.mode === 'metadata') {
        titleText = this.translationManager.t('common.examples.title'); // Use example for preview
      } else {
        titleText = this.translationManager.t('common.examples.title');
      }
      content.push(`📝 ${titleText} (${config.title.alignment})`);
    }

    if (config.pageNumber.enabled && config.pageNumber.mode !== 'none') {
      content.push(
        `🔢 ${this.translationManager.t('common.examples.pageNumber')} (${config.pageNumber.alignment})`,
      );
    }

    if (config.dateTime.enabled && config.dateTime.mode !== 'none') {
      content.push(
        `📅 ${this.translationManager.t('common.examples.dateTime')} (${config.dateTime.alignment})`,
      );
    }

    if (config.copyright.enabled && config.copyright.mode !== 'none') {
      let copyrightText: string;
      if (config.copyright.mode === 'custom') {
        copyrightText =
          config.copyright.customValue ||
          this.translationManager.t('common.fields.copyright');
      } else if (config.copyright.mode === 'metadata') {
        copyrightText = this.translationManager.t('common.examples.copyright'); // Use example for preview
      } else {
        copyrightText = this.translationManager.t('common.examples.copyright');
      }
      content.push(`🏛️  ${copyrightText} (${config.copyright.alignment})`);
    }

    if (config.message.enabled && config.message.mode !== 'none') {
      const messageText =
        config.message.customValue ||
        this.translationManager.t('common.fields.message');
      content.push(`💬 ${messageText} (${config.message.alignment})`);
    }

    // Add metadata fields
    const metadataFields = [
      {
        field: (config as any).author,
        icon: '👤',
        text: this.translationManager.t('common.examples.author'),
      },
      {
        field: (config as any).organization,
        icon: '🏢',
        text: this.translationManager.t('common.examples.organization'),
      },
      {
        field: (config as any).version,
        icon: '📇',
        text: this.translationManager.t('common.examples.version'),
      },
    ];

    metadataFields.forEach(({ field, icon, text }) => {
      if (field && field.enabled && field.mode !== 'none') {
        const displayText =
          field.mode === 'custom' ? field.customValue || text : text; // For metadata mode, use example text in preview
        content.push(`${icon} ${displayText} (${field.alignment})`);
      }
    });

    return content.length > 0
      ? content
      : [this.translationManager.t('common.status.notSet')];
  }

  /**
   * Save headers & footers settings
   */
  private async saveHeadersFootersSettings(
    config: HeadersFootersConfig,
  ): Promise<void> {
    try {
      const currentConfig = this.configManager.getConfig();
      const updatedConfig = {
        ...currentConfig,
        headersFooters: config,
      };

      await this.configManager.updateConfig(updatedConfig);
      this.logger.info('Headers & footers settings saved successfully');
    } catch (error) {
      this.logger.error('Failed to save headers & footers settings:', error);
      throw error;
    }
  }

  /**
   * Save individual header or footer setting immediately
   */
  private async saveIndividualHeaderFooterSetting(
    type: 'header' | 'footer',
    config: HeaderConfig | FooterConfig,
  ): Promise<void> {
    try {
      const currentConfig = this.configManager.getConfig();
      const updatedHeadersFootersConfig = {
        ...currentConfig.headersFooters,
        [type]: config,
      };

      await this.saveHeadersFootersSettings(updatedHeadersFootersConfig);
    } catch (error) {
      this.logger.error(`Failed to save ${type} settings:`, error);
      throw error;
    }
  }

  /**
   * Configure metadata-based field settings (author, organization, version, category)
   */
  private async configureMetadataFieldSettings(
    config: any,
    fieldType: 'author' | 'organization' | 'version' | 'category',
  ): Promise<any> {
    const inquirer = await import('inquirer');

    const modeAnswer = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'mode',
        message: this.translationManager.t(
          `headersFooters.prompts.select${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}Mode`,
        ),
        choices: [
          {
            name: this.translationManager.t('common.displayModes.none'),
            value: 'none',
          },
          {
            name: this.translationManager.t('common.displayModes.metadata'),
            value: 'metadata',
          },
          {
            name: this.translationManager.t('common.displayModes.custom'),
            value: 'custom',
          },
        ],
      },
    ]);

    let customValue = config.customValue || '';
    if (modeAnswer.mode === 'custom') {
      const customAnswer = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'value',
          message: this.translationManager.t(
            `headersFooters.prompts.enter${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}Value`,
          ),
          default: customValue,
        },
      ]);
      customValue = customAnswer.value;
    }

    const alignmentAnswer = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'alignment',
        message: this.translationManager.t(
          'headersFooters.prompts.selectAlignment',
        ),
        choices: [
          {
            name: this.translationManager.t('common.alignment.left'),
            value: 'left',
          },
          {
            name: this.translationManager.t('common.alignment.center'),
            value: 'center',
          },
          {
            name: this.translationManager.t('common.alignment.right'),
            value: 'right',
          },
        ],
        default: config.alignment || 'left',
      },
    ]);

    return {
      mode: modeAnswer.mode,
      enabled: modeAnswer.mode !== 'none',
      alignment: alignmentAnswer.alignment,
      customValue,
    };
  }

  /**
   * Confirm reset to defaults
   */
  private async confirmResetHeadersFooters(): Promise<boolean> {
    const inquirer = await import('inquirer');
    const answer = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'reset',
        message: this.translationManager.t(
          'headersFooters.prompts.confirmReset',
        ),
        default: false,
      },
    ]);
    return answer.reset;
  }
}
