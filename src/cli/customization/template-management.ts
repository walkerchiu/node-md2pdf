/**
 * Template Management Module
 * Handles template CRUD operations and configuration
 */

import chalk from 'chalk';

import {
  TemplateStorageService,
  TemplateValidator,
  Template,
} from '../../core/templates';

import { BaseCustomizationFeature, CustomizationDependencies } from './types';

/**
 * Extended dependencies for template management
 */
export interface TemplateManagementDependencies
  extends CustomizationDependencies {
  templateStorage: TemplateStorageService;
  templateValidator: TemplateValidator;
}

/**
 * Template Management Feature
 */
export class TemplateManagementFeature extends BaseCustomizationFeature {
  private readonly templateStorage: TemplateStorageService;
  private readonly templateValidator: TemplateValidator;

  constructor(deps: TemplateManagementDependencies) {
    super(deps);
    this.templateStorage = deps.templateStorage;
    this.templateValidator = deps.templateValidator;
  }

  /**
   * Start template management flow
   */
  async start(): Promise<void> {
    let running = true;

    while (running) {
      this.showHeader();
      const option = await this.selectOption();

      switch (option) {
        case 'view':
          await this.viewAllTemplates();
          break;
        case 'apply':
          await this.applyTemplate();
          break;
        case 'create':
          await this.createNewTemplate();
          break;
        case 'delete':
          await this.deleteTemplate();
          break;
        case 'import':
          await this.importTemplate();
          break;
        case 'export':
          await this.exportTemplate();
          break;
        case 'back':
          running = false;
          break;
      }
    }
  }

  /**
   * Show template management header
   */
  private showHeader(): void {
    console.clear();

    const title = this.translationManager.t('templates.basicInfo.title');
    const subtitle = this.translationManager.t('templates.basicInfo.subtitle');
    const description = this.translationManager.t(
      'templates.basicInfo.description',
    );

    const borderLine = '─'.repeat(79);

    console.log(chalk.blue(borderLine));
    console.log(chalk.blue(title.padStart((79 + title.length) / 2).padEnd(79)));
    console.log(chalk.blue(borderLine));
    console.log(
      chalk.blue(subtitle.padStart((79 + subtitle.length) / 2).padEnd(79)),
    );
    console.log(chalk.blue(borderLine));
    console.log(chalk.gray(`\n${description}\n`));
  }

  /**
   * Select template management option
   */
  private async selectOption(): Promise<string> {
    const inquirer = await import('inquirer');

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'option',
        message: this.translationManager.t('templates.prompts.selectOption'),
        choices: this.i18nHelpers.createNumberedChoices([
          {
            key: 'common.menu.returnToCustomization',
            value: 'back',
          },
          {
            key: 'templates.menu.viewAll',
            value: 'view',
          },
          {
            key: 'templates.menu.apply',
            value: 'apply',
          },
          {
            key: 'templates.menu.create',
            value: 'create',
          },
          {
            key: 'templates.menu.delete',
            value: 'delete',
          },
          {
            key: 'templates.menu.import',
            value: 'import',
          },
          {
            key: 'templates.menu.export',
            value: 'export',
          },
        ]),
        pageSize: 12,
      },
    ]);

    return result.option;
  }

  /**
   * View all templates
   */
  private async viewAllTemplates(): Promise<void> {
    try {
      const collection = await this.templateStorage.getAllTemplates();

      console.log(
        chalk.bold(
          `\n📦 ${this.translationManager.t('templates.view.systemTemplates')}`,
        ),
      );
      if (collection.system.length === 0) {
        console.log(
          chalk.gray(
            `  ${this.translationManager.t('templates.view.noSystemTemplates')}`,
          ),
        );
      } else {
        console.log();
        collection.system.forEach((template, index) => {
          console.log(
            chalk.green(
              `  ${index + 1}. ${this.translationManager.t(template.name)}`,
            ),
          );
          console.log();
          console.log(
            chalk.gray(
              `     ${this.translationManager.t(template.description)}`,
            ),
          );
          console.log();
          this.displayTemplateConfig(template);
        });
      }

      console.log(
        chalk.bold(
          `\n✨ ${this.translationManager.t('templates.view.customTemplates')}`,
        ),
      );
      if (collection.custom.length === 0) {
        console.log(
          chalk.gray(
            `  ${this.translationManager.t('templates.view.noCustomTemplates')}`,
          ),
        );
      } else {
        console.log();
        collection.custom.forEach((template, index) => {
          console.log(chalk.green(`  ${index + 1}. ${template.name}`));
          console.log();
          console.log(chalk.gray(`     ${template.description}`));
          console.log();
          this.displayTemplateConfig(template);
        });
      }

      console.log();
      await this.pressAnyKey();
    } catch (error) {
      console.error(
        chalk.red(
          `\n❌ ${this.translationManager.t('templates.messages.error', { action: this.translationManager.t('templates.menu.viewAll').toLowerCase() })}`,
        ),
        error,
      );
      await this.pressAnyKey();
    }
  }

  /**
   * Display template configuration details
   */
  private displayTemplateConfig(template: Template): void {
    const config = template.config;

    // Convert margins to cm for consistency (if in inches)
    const convertMargin = (value: string): string => {
      if (value.endsWith('in')) {
        const inches = parseFloat(value);
        const cm = (inches * 2.54).toFixed(1);
        return `${cm}cm`;
      }
      return value;
    };

    const displayMargins = {
      top: convertMargin(config.pdf.margin.top),
      right: convertMargin(config.pdf.margin.right),
      bottom: convertMargin(config.pdf.margin.bottom),
      left: convertMargin(config.pdf.margin.left),
    };

    // Page format and margins
    console.log(
      `     ${this.translationManager.t('templates.view.config.pageFormat')}: ${chalk.green(config.pdf.format)} ${chalk.gray(`(${config.pdf.orientation})`)}`,
    );
    console.log(
      `     ${this.translationManager.t('templates.view.config.margins')}: ${this.translationManager.t('templates.view.config.top')} ${chalk.yellow(displayMargins.top)}, ${this.translationManager.t('templates.view.config.right')} ${chalk.yellow(displayMargins.right)}, ${this.translationManager.t('templates.view.config.bottom')} ${chalk.yellow(displayMargins.bottom)}, ${this.translationManager.t('templates.view.config.left')} ${chalk.yellow(displayMargins.left)}`,
    );

    // Headers and footers
    const headerStatus = config.headerFooter.header.enabled
      ? chalk.green(this.translationManager.t('common.status.enabled'))
      : chalk.red(this.translationManager.t('common.status.disabled'));
    const footerStatus = config.headerFooter.footer.enabled
      ? chalk.green(this.translationManager.t('common.status.enabled'))
      : chalk.red(this.translationManager.t('common.status.disabled'));
    console.log(
      `     ${this.translationManager.t('templates.view.config.header')}: ${headerStatus}, ${this.translationManager.t('templates.view.config.footer')}: ${footerStatus}`,
    );

    // Table of contents
    const tocStatus = config.features.toc
      ? `${chalk.green(this.translationManager.t('common.status.enabled'))} ${chalk.gray(`(${this.translationManager.t('templates.view.config.tocDepth')}: ${config.features.tocDepth})`)}`
      : chalk.red(this.translationManager.t('common.status.disabled'));
    console.log(
      `     ${this.translationManager.t('templates.view.config.toc')}: ${tocStatus}`,
    );

    // Anchor links (bookmarks)
    const anchorLinksStatus = config.features.anchorLinks
      ? `${chalk.green(this.translationManager.t('common.status.enabled'))} ${chalk.gray(`(${this.translationManager.t('templates.view.config.anchorDepth')}: ${config.features.anchorDepth})`)}`
      : chalk.red(this.translationManager.t('common.status.disabled'));
    console.log(
      `     ${this.translationManager.t('templates.view.config.anchorLinks')}: ${anchorLinksStatus}`,
    );

    // Page numbers
    const pageNumbersStatus = config.features.pageNumbers
      ? chalk.green(this.translationManager.t('common.status.enabled'))
      : chalk.red(this.translationManager.t('common.status.disabled'));
    console.log(
      `     ${this.translationManager.t('templates.view.config.pageNumbers')}: ${pageNumbersStatus}`,
    );

    // Fonts configuration
    console.log(
      `     ${this.translationManager.t('templates.view.config.fonts')}:`,
    );
    const bodyFont =
      config.styles.fonts.body ||
      this.translationManager.t('common.status.notSet');
    const headingFont =
      config.styles.fonts.heading ||
      this.translationManager.t('common.status.notSet');
    const codeFont =
      config.styles.fonts.code ||
      this.translationManager.t('common.status.notSet');

    console.log(
      `       • ${this.translationManager.t('templates.view.config.bodyFont')}: ${config.styles.fonts.body ? chalk.cyan(bodyFont) : chalk.gray(bodyFont)}`,
    );
    console.log(
      `       • ${this.translationManager.t('templates.view.config.headingFont')}: ${config.styles.fonts.heading ? chalk.cyan(headingFont) : chalk.gray(headingFont)}`,
    );
    console.log(
      `       • ${this.translationManager.t('templates.view.config.codeFont')}: ${config.styles.fonts.code ? chalk.cyan(codeFont) : chalk.gray(codeFont)}`,
    );

    // Code block theme
    const codeBlockTheme =
      config.styles.codeBlock.theme ||
      this.translationManager.t('common.status.notSet');
    console.log(
      `     ${this.translationManager.t('templates.view.config.codeBlockTheme')}: ${config.styles.codeBlock.theme ? chalk.magenta(codeBlockTheme) : chalk.gray(codeBlockTheme)}`,
    );

    // Color scheme (if defined)
    if (config.styles.colors && Object.keys(config.styles.colors).length > 0) {
      const colorItems: string[] = [];
      if (config.styles.colors.primary)
        colorItems.push(`Primary: ${config.styles.colors.primary}`);
      if (config.styles.colors.secondary)
        colorItems.push(`Secondary: ${config.styles.colors.secondary}`);
      if (config.styles.colors.accent)
        colorItems.push(`Accent: ${config.styles.colors.accent}`);

      if (colorItems.length > 0) {
        console.log(
          chalk.gray(
            `     ${this.translationManager.t('templates.view.config.colors')}: ${colorItems.join(', ')}`,
          ),
        );
      }
    }

    // Document metadata (if available)
    if (config.metadata) {
      const metadataItems: string[] = [];
      if (config.metadata.title)
        metadataItems.push(
          `${this.translationManager.t('common.fields.title')}: ${config.metadata.title}`,
        );
      if (config.metadata.author)
        metadataItems.push(
          `${this.translationManager.t('common.fields.author')}: ${config.metadata.author}`,
        );
      if (config.metadata.subject)
        metadataItems.push(
          `${this.translationManager.t('common.fields.subject')}: ${config.metadata.subject}`,
        );

      if (metadataItems.length > 0) {
        console.log(
          chalk.gray(
            `     ${this.translationManager.t('templates.view.config.documentMetadata')}: ${metadataItems.join(', ')}`,
          ),
        );
      }
    }

    console.log();
  }

  /**
   * Create new template from current configuration
   */
  private async createNewTemplate(): Promise<void> {
    const inquirer = await import('inquirer');

    console.log(
      chalk.cyan(
        `\n${this.translationManager.t('templates.basicInfo.createTitle')}\n`,
      ),
    );

    try {
      const answers = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'name',
          message: this.translationManager.t('templates.prompts.templateName'),
          validate: async (input: string) => {
            if (input.trim().length === 0) {
              return this.translationManager.t(
                'templates.validation.nameRequired',
              );
            }

            // Check if template with same name already exists
            const existingTemplates = await this.templateStorage.list({
              type: 'custom',
            });
            const nameExists = existingTemplates.some(
              (t) => t.name === input.trim(),
            );

            if (nameExists) {
              return this.translationManager.t(
                'templates.validation.nameExists',
              );
            }

            return true;
          },
        },
        {
          type: 'input',
          name: 'description',
          message: this.translationManager.t('templates.prompts.description'),
          validate: (input: string) =>
            input.trim().length > 0 ||
            this.translationManager.t(
              'templates.validation.descriptionRequired',
            ),
        },
      ]);

      // Get current configuration
      const config = this.configManager.getConfig();

      // Trim name and description
      const templateName = answers.name.trim();
      const templateDescription = answers.description.trim();

      // Prepare document metadata from config
      const documentMetadata =
        config.metadata?.defaults &&
        (config.metadata.defaults.title ||
          config.metadata.defaults.author ||
          config.metadata.defaults.subject ||
          config.metadata.defaults.keywords ||
          config.metadata.defaults.language ||
          config.metadata.defaults.creator ||
          config.metadata.defaults.producer)
          ? {
              ...(config.metadata.defaults.title && {
                title: config.metadata.defaults.title,
              }),
              ...(config.metadata.defaults.author && {
                author: config.metadata.defaults.author,
              }),
              ...(config.metadata.defaults.subject && {
                subject: config.metadata.defaults.subject,
              }),
              ...(config.metadata.defaults.keywords && {
                keywords: config.metadata.defaults.keywords,
              }),
              ...(config.metadata.defaults.language && {
                language: config.metadata.defaults.language,
              }),
              ...(config.metadata.defaults.creator && {
                creator: config.metadata.defaults.creator,
              }),
              ...(config.metadata.defaults.producer && {
                producer: config.metadata.defaults.producer,
              }),
            }
          : undefined;

      // Use template name as ID for validation
      const templateToValidate: Template = {
        id: templateName,
        name: templateName,
        description: templateDescription,
        type: 'custom',
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'custom',
        },
        config: {
          pdf: {
            format: config.pdf?.format || 'A4',
            orientation:
              (config.pdf?.orientation as 'portrait' | 'landscape') ||
              'portrait',
            margin: config.pdf?.margin || {
              top: '2cm',
              right: '2cm',
              bottom: '2cm',
              left: '2cm',
            },
            displayHeaderFooter: config.pdf?.displayHeaderFooter || false,
          },
          headerFooter: {
            header: {
              enabled: config.headersFooters?.header?.enabled || false,
            },
            footer: {
              enabled: config.headersFooters?.footer?.enabled || false,
            },
          },
          styles: {
            theme: 'default',
            fonts: {},
            colors: {},
            codeBlock: {},
          },
          features: {
            toc: config.toc?.enabled !== false,
            tocDepth: config.toc?.depth || 3,
            pageNumbers: config.pdf?.displayHeaderFooter !== false,
            anchorLinks: true,
            anchorDepth: 2,
          },
          ...(documentMetadata && { metadata: documentMetadata }),
        },
      };

      // Validate template
      const validationResult =
        this.templateValidator.validate(templateToValidate);

      if (!validationResult.valid) {
        console.error(
          chalk.red(
            `\n❌ ${this.translationManager.t('templates.validation.failed')}`,
          ),
        );
        validationResult.errors.forEach((error) => {
          const translatedMessage = this.translateValidationError(
            error.message,
          );
          console.error(chalk.red(`  - ${error.field}: ${translatedMessage}`));
        });
        await this.pressAnyKey();
        return;
      }

      // Create template (remove id from the template to create TemplateInput)
      const { id: _id, ...templateInput } = templateToValidate;
      const created = await this.templateStorage.create(templateInput);

      console.log(
        chalk.green(
          `\n✅ ${this.translationManager.t('templates.messages.templateCreated')}`,
        ),
      );
      console.log(chalk.gray(`   ID: ${created.id}`));
      console.log(
        chalk.gray(
          `   ${this.translationManager.t('common.fields.name')}: ${created.name}`,
        ),
      );

      await this.pressAnyKey();
    } catch (error) {
      console.error(
        chalk.red(
          `\n❌ ${this.translationManager.t('templates.messages.errorCreating')}`,
        ),
        error,
      );
      await this.pressAnyKey();
    }
  }

  /**
   * Delete template
   */
  private async deleteTemplate(): Promise<void> {
    try {
      const templates = await this.templateStorage.list({ type: 'custom' });

      if (templates.length === 0) {
        console.log(
          chalk.yellow(
            `\n⚠️  ${this.translationManager.t('templates.messages.noCustomTemplates', { action: this.translationManager.t('templates.menu.delete').toLowerCase() })}`,
          ),
        );
        await this.pressAnyKey();
        return;
      }

      const inquirer = await import('inquirer');

      const selectResult = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'templateId',
          message: this.translationManager.t(
            'templates.prompts.selectTemplateToDelete',
          ),
          choices: templates.map((t) => ({
            name: `${t.name} - ${t.description}`,
            value: t.id,
          })),
        },
      ]);

      const confirmResult = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: this.translationManager.t('templates.prompts.confirmDelete'),
          default: false,
        },
      ]);

      if (confirmResult.confirm) {
        await this.templateStorage.delete(selectResult.templateId);
        console.log(
          chalk.green(
            `\n✅ ${this.translationManager.t('templates.messages.templateDeleted')}`,
          ),
        );
      } else {
        console.log(
          chalk.yellow(
            `\n⚠️  ${this.translationManager.t('templates.messages.deleteCancelled')}`,
          ),
        );
      }

      await this.pressAnyKey();
    } catch (error) {
      console.error(
        chalk.red(
          `\n❌ ${this.translationManager.t('templates.messages.error', { action: this.translationManager.t('templates.menu.delete').toLowerCase() })}`,
        ),
        error,
      );
      await this.pressAnyKey();
    }
  }

  /**
   * Import template from JSON file
   */
  private async importTemplate(): Promise<void> {
    const inquirer = await import('inquirer');
    const fs = await import('fs');

    try {
      const answers = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'filePath',
          message: this.translationManager.t('templates.prompts.enterJsonPath'),
          validate: (input: string) => {
            if (!fs.existsSync(input)) {
              return this.translationManager.t(
                'templates.validation.fileNotExist',
              );
            }
            if (!input.endsWith('.json')) {
              return this.translationManager.t(
                'templates.validation.mustBeJsonFile',
              );
            }
            return true;
          },
        },
      ]);

      const jsonContent = fs.readFileSync(answers.filePath, 'utf-8');
      const imported = await this.templateStorage.importTemplate(jsonContent);

      console.log(
        chalk.green(
          `\n✅ ${this.translationManager.t('templates.messages.templateImported')}`,
        ),
      );
      console.log(chalk.gray(`   ID: ${imported.id}`));
      console.log(chalk.gray(`   Name: ${imported.name}`));

      await this.pressAnyKey();
    } catch (error) {
      console.error(
        chalk.red(
          `\n❌ ${this.translationManager.t('templates.messages.error', { action: this.translationManager.t('templates.menu.import').toLowerCase() })}`,
        ),
        error,
      );
      await this.pressAnyKey();
    }
  }

  /**
   * Export template to JSON file
   */
  private async exportTemplate(): Promise<void> {
    const inquirer = await import('inquirer');
    const fs = await import('fs');

    try {
      const templates = await this.templateStorage.list({ type: 'custom' });

      if (templates.length === 0) {
        console.log(
          chalk.yellow(
            `\n⚠️  ${this.translationManager.t('templates.messages.noCustomTemplates', { action: this.translationManager.t('templates.menu.export').toLowerCase() })}`,
          ),
        );
        await this.pressAnyKey();
        return;
      }

      const selectResult = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'templateId',
          message: this.translationManager.t(
            'templates.prompts.selectTemplateToExport',
          ),
          choices: templates.map((t) => ({
            name: `${t.name} - ${t.description}`,
            value: t.id,
          })),
        },
      ]);

      const outputResult = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'outputPath',
          message: this.translationManager.t(
            'templates.prompts.outputFilePath',
          ),
          default: `${selectResult.templateId}.json`,
          validate: (input: string) =>
            input.trim().length > 0 ||
            this.translationManager.t('templates.validation.nameRequired'),
        },
      ]);

      const json = await this.templateStorage.exportTemplate(
        selectResult.templateId,
      );
      fs.writeFileSync(outputResult.outputPath, json, 'utf-8');

      console.log(
        chalk.green(
          `\n✅ ${this.translationManager.t('templates.messages.templateExported')}`,
        ),
      );
      console.log(chalk.gray(`   File: ${outputResult.outputPath}`));

      await this.pressAnyKey();
    } catch (error) {
      console.error(
        chalk.red(
          `\n❌ ${this.translationManager.t('templates.messages.error', { action: this.translationManager.t('templates.menu.export').toLowerCase() })}`,
        ),
        error,
      );
      await this.pressAnyKey();
    }
  }

  /**
   * Apply template to current configuration
   */
  private async applyTemplate(): Promise<void> {
    const inquirer = await import('inquirer');

    try {
      const collection = await this.templateStorage.getAllTemplates();
      const allTemplates = [...collection.system, ...collection.custom];

      if (allTemplates.length === 0) {
        console.log(
          chalk.yellow(
            `\n⚠️  ${this.translationManager.t('templates.messages.noTemplatesFound')}`,
          ),
        );
        await this.pressAnyKey();
        return;
      }

      const selectResult = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'templateId',
          message: this.translationManager.t(
            'templates.prompts.selectTemplateToApply',
          ),
          choices: [
            ...collection.system.map((t) => ({
              name: `[${this.translationManager.t('templates.types.system')}] ${this.translationManager.t(t.name)}`,
              value: t.id,
            })),
            ...collection.custom.map((t) => ({
              name: `[${this.translationManager.t('templates.types.custom')}] ${t.name}`,
              value: t.id,
            })),
          ],
        },
      ]);

      const template = await this.templateStorage.read(selectResult.templateId);
      if (!template) {
        console.error(
          chalk.red(
            `\n❌ ${this.translationManager.t('templates.messages.templateNotFound')}`,
          ),
        );
        await this.pressAnyKey();
        return;
      }

      // Apply template configuration to current config
      const config = this.configManager.getConfig();

      // Update PDF settings
      config.pdf = {
        ...config.pdf,
        format: template.config.pdf.format as 'A4' | 'Letter' | 'A3',
        orientation: template.config.pdf.orientation,
        margin: template.config.pdf.margin,
        displayHeaderFooter: template.config.pdf.displayHeaderFooter,
      };

      // Update headers/footers
      if (config.headersFooters) {
        config.headersFooters.header = {
          ...config.headersFooters.header,
          enabled: template.config.headerFooter.header.enabled,
        };
        config.headersFooters.footer = {
          ...config.headersFooters.footer,
          enabled: template.config.headerFooter.footer.enabled,
        };
      }

      // Update TOC settings
      if (config.toc) {
        config.toc.enabled = template.config.features.toc;
        config.toc.depth = template.config.features.tocDepth;
      }

      // Update document metadata if template has it
      if (template.config.metadata && config.metadata?.defaults) {
        if (template.config.metadata.title) {
          config.metadata.defaults.title = template.config.metadata.title;
        }
        if (template.config.metadata.author) {
          config.metadata.defaults.author = template.config.metadata.author;
        }
        if (template.config.metadata.subject) {
          config.metadata.defaults.subject = template.config.metadata.subject;
        }
        if (template.config.metadata.keywords) {
          config.metadata.defaults.keywords = template.config.metadata.keywords;
        }
        if (template.config.metadata.language) {
          config.metadata.defaults.language = template.config.metadata.language;
        }
        if (template.config.metadata.creator) {
          config.metadata.defaults.creator = template.config.metadata.creator;
        }
        if (template.config.metadata.producer) {
          config.metadata.defaults.producer = template.config.metadata.producer;
        }
      }

      // Save updated config
      this.configManager.updateConfig(config);

      console.log(
        chalk.green(
          `\n✅ ${this.translationManager.t('templates.messages.templateApplied')}`,
        ),
      );
      console.log(
        chalk.gray(
          `   ${this.translationManager.t('templates.messages.usingTemplate')}: ${template.type === 'system' ? this.translationManager.t(template.name) : template.name}`,
        ),
      );

      await this.pressAnyKey();
    } catch (error) {
      console.error(
        chalk.red(
          `\n❌ ${this.translationManager.t('templates.messages.error', { action: this.translationManager.t('templates.menu.apply').toLowerCase() })}`,
        ),
        error,
      );
      await this.pressAnyKey();
    }
  }
}
