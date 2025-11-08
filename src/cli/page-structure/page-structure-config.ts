/**
 * CLI interface for page structure configuration
 */

import inquirer from 'inquirer';

import { IPageStructureService } from '../../application/services/page-structure.service';
import {
  PageStructureConfig,
  PageStructurePreset,
  HeaderConfig,
  FooterConfig,
} from '../../core/page-structure';
import { DEFAULT_MARGINS } from '../../infrastructure/config/constants';

import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface PageStructureConfigOptions {
  documentPath?: string;
  preset?: string;
  customConfig?: boolean;
}

export class PageStructureConfigUI {
  constructor(
    private readonly pageStructureService: IPageStructureService,
    private readonly translator: ITranslationManager,
    private readonly logger: ILogger,
  ) {}

  /**
   * Configure page structure through interactive prompts
   */
  async configurePageStructure(
    options: PageStructureConfigOptions = {},
  ): Promise<PageStructureConfig | null> {
    try {
      this.logger.info('Starting page structure configuration');

      // Show page structure menu
      const choice = await this.showPageStructureMenu();

      switch (choice) {
        case 'preset':
          return await this.configureWithPreset(options.documentPath);
        case 'custom':
          return await this.configureCustom();
        case 'skip':
          return null;
        default:
          return null;
      }
    } catch (error) {
      this.logger.error('Page structure configuration failed', error);
      throw error;
    }
  }

  /**
   * Show main page structure menu
   */
  private async showPageStructureMenu(): Promise<string> {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: this.translator.t('pageStructure.menu.title'),
        choices: [
          {
            name: '📄 使用預設模板 - 快速配置專業頁首和頁尾',
            value: 'preset',
          },
          {
            name: '🎨 自定義配置 - 完全客製化頁面結構',
            value: 'custom',
          },
          {
            name: '⏭️  跳過 - 使用預設頁面設定',
            value: 'skip',
          },
        ],
        default: 'preset',
      },
    ]);

    return choice;
  }

  /**
   * Configure using preset
   */
  private async configureWithPreset(
    documentPath?: string,
  ): Promise<PageStructureConfig> {
    console.log('\n📄 頁面結構預設模板選擇\n');

    // Get available presets
    const presets = await this.pageStructureService.getAvailablePresets();

    // Get suggestions if document path is provided
    let suggestions: PageStructurePreset[] = [];
    if (documentPath) {
      suggestions = await this.pageStructureService.suggestPreset(documentPath);
      if (suggestions.length > 0) {
        console.log('💡 基於您的文件分析，建議使用以下模板：');
        suggestions.forEach((preset, index) => {
          console.log(
            `   ${index + 1}. ${preset.name} - ${preset.description}`,
          );
        });
        console.log('');
      }
    }

    // Show preset selection
    const presetChoices = presets.map((preset) => ({
      name: `${this.getCategoryIcon(preset.category)} ${preset.name} - ${preset.description}`,
      value: preset.name,
      short: preset.name,
    }));

    const { selectedPreset } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedPreset',
        message: '選擇頁面結構模板：',
        choices: presetChoices,
        default:
          suggestions.length > 0 ? suggestions[0].name : presets[0]?.name,
        pageSize: 10,
      },
    ]);

    // Get the selected preset
    const preset =
      await this.pageStructureService.getPresetByName(selectedPreset);
    if (!preset) {
      throw new Error(`Preset not found: ${selectedPreset}`);
    }

    // Show preset preview and confirm
    await this.showPresetPreview(preset);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '確認使用此模板？',
        default: true,
      },
    ]);

    if (!confirm) {
      return await this.configureWithPreset(documentPath);
    }

    // Ask for minor customizations
    return await this.customizePreset(preset.config);
  }

  /**
   * Show preset preview
   */
  private async showPresetPreview(preset: PageStructurePreset): Promise<void> {
    console.log(`\n✨ 模板預覽：${preset.name}\n`);

    // Header preview
    if (preset.config.header?.enabled && preset.config.header.template) {
      const headerPreview = await this.pageStructureService.previewTemplate(
        preset.config.header.template,
        {
          title: '範例文件標題',
          author: '作者姓名',
          date: new Date().toLocaleDateString('zh-TW'),
        },
      );
      console.log('📋 頁首預覽：');
      console.log(`   ${this.stripHtml(headerPreview.html)}`);
    } else {
      console.log('📋 頁首：停用');
    }

    // Footer preview
    if (preset.config.footer?.enabled && preset.config.footer.template) {
      const footerPreview = await this.pageStructureService.previewTemplate(
        preset.config.footer.template,
        {
          pageNumber: 1,
          totalPages: 10,
          fileName: 'document.pdf',
          date: new Date().toLocaleDateString('zh-TW'),
        },
      );
      console.log('📄 頁尾預覽：');
      console.log(`   ${this.stripHtml(footerPreview.html)}`);
    } else {
      console.log('📄 頁尾：停用');
    }

    // Margins
    if (preset.config.margins) {
      console.log('📏 頁面邊距：');
      console.log(`   上：${preset.config.margins.top || '預設'}`);
      console.log(`   下：${preset.config.margins.bottom || '預設'}`);
      console.log(`   左：${preset.config.margins.left || '預設'}`);
      console.log(`   右：${preset.config.margins.right || '預設'}`);
    }

    console.log('');
  }

  /**
   * Customize preset configuration
   */
  private async customizePreset(
    config: PageStructureConfig,
  ): Promise<PageStructureConfig> {
    const { customize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'customize',
        message: '是否要進行細節調整？',
        default: false,
      },
    ]);

    if (!customize) {
      return config;
    }

    const customizations = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'options',
        message: '選擇要調整的項目：',
        choices: [
          { name: '📋 頁首設定', value: 'header' },
          { name: '📄 頁尾設定', value: 'footer' },
          { name: '📏 頁面邊距', value: 'margins' },
        ],
      },
    ]);

    let customConfig = { ...config };

    for (const option of customizations.options) {
      switch (option) {
        case 'header': {
          const headerResult = await this.customizeHeaderFooter(
            'header',
            customConfig.header || {
              enabled: true,
              template: '{{title}}',
              styles: {},
              showOnFirstPage: true,
              showOnEvenPages: true,
              showOnOddPages: true,
            },
          );
          if (headerResult) {
            customConfig.header = headerResult as HeaderConfig;
          }
          break;
        }
        case 'footer': {
          const footerResult = await this.customizeHeaderFooter(
            'footer',
            customConfig.footer || {
              enabled: true,
              template: '{{pageNumber}} / {{totalPages}}',
              styles: {},
              showOnFirstPage: true,
              showOnEvenPages: true,
              showOnOddPages: true,
            },
          );
          if (footerResult) {
            customConfig.footer = footerResult as FooterConfig;
          }
          break;
        }
        case 'margins': {
          const marginsResult = await this.customizeMargins(
            customConfig.margins || DEFAULT_MARGINS.NORMAL,
          );
          if (marginsResult) {
            customConfig.margins = marginsResult;
          }
          break;
        }
      }
    }

    return customConfig;
  }

  /**
   * Configure custom page structure
   */
  private async configureCustom(): Promise<PageStructureConfig> {
    console.log('\n🎨 自定義頁面結構配置\n');

    const config: PageStructureConfig = {
      margins: DEFAULT_MARGINS.NORMAL,
    };

    // Configure header
    const headerConfig = await this.customizeHeaderFooter('header');
    if (headerConfig) {
      config.header = headerConfig;
    }

    // Configure footer
    const footerConfig = await this.customizeHeaderFooter('footer');
    if (footerConfig) {
      config.footer = footerConfig;
    }

    // Configure margins
    const marginsResult = await this.customizeMargins(
      config.margins || DEFAULT_MARGINS.NORMAL,
    );
    if (marginsResult) {
      config.margins = marginsResult;
    }

    return config;
  }

  /**
   * Customize header or footer
   */
  private async customizeHeaderFooter(
    type: 'header' | 'footer',
    existing?: HeaderConfig | FooterConfig,
  ): Promise<HeaderConfig | FooterConfig | undefined> {
    const typeText = type === 'header' ? '頁首' : '頁尾';
    const icon = type === 'header' ? '📋' : '📄';

    const { enabled } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enabled',
        message: `${icon} 是否啟用${typeText}？`,
        default: existing?.enabled ?? true,
      },
    ]);

    if (!enabled) {
      return { enabled: false, template: '' };
    }

    // Template selection
    const templates = this.getTemplateOptions(type);
    const { template } = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: `選擇${typeText}模板：`,
        choices: templates,
        default: existing?.template || templates[0].value,
      },
    ]);

    // Height configuration
    const { height } = await inquirer.prompt([
      {
        type: 'input',
        name: 'height',
        message: `設定${typeText}高度 (例如: 40px, 12mm)：`,
        default: existing?.height || (type === 'header' ? '40px' : '30px'),
        validate: (input: string) => {
          const heightRegex = /^(\d+(?:\.\d+)?)(px|pt|mm|cm|in)$/;
          return (
            heightRegex.test(input) || '請輸入有效的高度格式 (例如: 40px, 12mm)'
          );
        },
      },
    ]);

    // Visibility options
    const visibility = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'showOnFirstPage',
        message: `是否在首頁顯示${typeText}？`,
        default: existing?.showOnFirstPage ?? true,
      },
      {
        type: 'confirm',
        name: 'showOnEvenPages',
        message: `是否在偶數頁顯示${typeText}？`,
        default: existing?.showOnEvenPages ?? true,
      },
      {
        type: 'confirm',
        name: 'showOnOddPages',
        message: `是否在奇數頁顯示${typeText}？`,
        default: existing?.showOnOddPages ?? true,
      },
    ]);

    return {
      enabled: true,
      template,
      height,
      ...visibility,
    };
  }

  /**
   * Customize margins
   */
  private async customizeMargins(
    existing?: PageStructureConfig['margins'],
  ): Promise<PageStructureConfig['margins']> {
    const margins = await inquirer.prompt([
      {
        type: 'input',
        name: 'top',
        message: '上邊距 (例如: 60px, 20mm)：',
        default: existing?.top || '60px',
        validate: this.validateMargin,
      },
      {
        type: 'input',
        name: 'bottom',
        message: '下邊距 (例如: 60px, 20mm)：',
        default: existing?.bottom || '60px',
        validate: this.validateMargin,
      },
      {
        type: 'input',
        name: 'left',
        message: '左邊距 (例如: 50px, 15mm)：',
        default: existing?.left || '50px',
        validate: this.validateMargin,
      },
      {
        type: 'input',
        name: 'right',
        message: '右邊距 (例如: 50px, 15mm)：',
        default: existing?.right || '50px',
        validate: this.validateMargin,
      },
    ]);

    return margins;
  }

  /**
   * Get template options for header or footer
   */
  private getTemplateOptions(
    type: 'header' | 'footer',
  ): Array<{ name: string; value: string }> {
    if (type === 'header') {
      return [
        {
          name: '💼 商業格式 - 標題與日期',
          value:
            '<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2c3e50; padding-bottom: 5px;"><div style="font-weight: bold; font-size: 14px;">{{title}}</div><div style="font-size: 12px; color: #666;">{{date}}</div></div>',
        },
        {
          name: '🎓 學術格式 - 居中標題',
          value:
            '<div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 8px; font-family: \'Times New Roman\', serif;"><div style="font-size: 14px; font-weight: bold;">{{title}}</div>{{#if author}}<div style="font-size: 12px; margin-top: 4px;">{{author}}</div>{{/if}}</div>',
        },
        {
          name: '🔧 技術格式 - 現代化設計',
          value:
            '<div style="display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; padding: 8px 15px; border-left: 4px solid #007bff;"><div style="font-family: \'Consolas\', \'Monaco\', monospace; font-weight: bold; color: #2c3e50;">{{title}}</div><div style="font-size: 11px; color: #6c757d;">{{date}}</div></div>',
        },
      ];
    } else {
      return [
        {
          name: '💼 商業格式 - 檔名、頁碼、日期',
          value:
            '<div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #666;"><div>{{fileName}}</div><div>第 {{pageNumber}} 頁，共 {{totalPages}} 頁</div><div>{{date}}</div></div>',
        },
        {
          name: '🎓 學術格式 - 居中頁碼',
          value:
            '<div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 10px; font-family: \'Times New Roman\', serif;">第 {{pageNumber}} 頁，共 {{totalPages}} 頁</div>',
        },
        {
          name: '🔧 技術格式 - 技術文件標記',
          value:
            "<div style=\"display: flex; justify-content: space-between; align-items: center; font-family: 'Consolas', 'Monaco', monospace; font-size: 9px; color: #6c757d; border-top: 1px solid #dee2e6; padding-top: 6px;\"><div>📄 {{fileName}}</div><div>頁碼: {{pageNumber}} / {{totalPages}}</div><div>🔧 技術文件</div></div>",
        },
        {
          name: '⭐ 極簡格式 - 僅頁碼',
          value:
            '<div style="text-align: center; font-size: 10px; color: #999;">{{pageNumber}}</div>',
        },
      ];
    }
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(category: string): string {
    switch (category) {
      case 'business':
        return '💼';
      case 'academic':
        return '🎓';
      case 'technical':
        return '🔧';
      case 'minimal':
        return '⭐';
      default:
        return '📄';
    }
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate margin input
   */
  private validateMargin(input: string): boolean | string {
    const marginRegex = /^(\d+(?:\.\d+)?)(px|pt|mm|cm|in)$/;
    return marginRegex.test(input) || '請輸入有效的邊距格式 (例如: 60px, 20mm)';
  }
}
