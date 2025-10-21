/**
 * Preset Manager
 * Manages predefined header/footer templates and configurations
 */

import {
  PageStructurePreset,
  PageStructureConfig,
  HeaderFooterStyles,
} from './types';

export interface TemplateInfo {
  name: string;
  description: string;
  category: string;
  headerTemplate?: string;
  footerTemplate?: string;
  styles?: HeaderFooterStyles;
}

export class PresetManager {
  /**
   * Get all available presets
   */
  static getAvailablePresets(): PageStructurePreset[] {
    return [
      {
        name: 'Business Professional',
        description: '商業專業文件格式，包含標題、日期和頁碼',
        category: 'business',
        config: {
          header: {
            enabled: true,
            template: this.getBusinessHeaderTemplate(),
            height: '40px',
            styles: this.getBusinessStyles(),
            showOnFirstPage: true,
          },
          footer: {
            enabled: true,
            template: this.getBusinessFooterTemplate(),
            height: '30px',
            styles: this.getBusinessStyles(),
            showOnFirstPage: true,
          },
          margins: {
            top: '80px',
            bottom: '60px',
            left: '60px',
            right: '60px',
          },
        },
      },
      {
        name: 'Academic Paper',
        description: '學術論文格式，符合學術寫作規範',
        category: 'academic',
        config: {
          header: {
            enabled: true,
            template: this.getAcademicHeaderTemplate(),
            height: '50px',
            styles: this.getAcademicStyles(),
            showOnFirstPage: false,
          },
          footer: {
            enabled: true,
            template: this.getAcademicFooterTemplate(),
            height: '25px',
            styles: this.getAcademicStyles(),
            showOnFirstPage: true,
          },
          margins: {
            top: '100px',
            bottom: '80px',
            left: '80px',
            right: '80px',
          },
        },
      },
      {
        name: 'Technical Documentation',
        description: '技術文件格式，適合 API 文件和技術手冊',
        category: 'technical',
        config: {
          header: {
            enabled: true,
            template: this.getTechnicalHeaderTemplate(),
            height: '35px',
            styles: this.getTechnicalStyles(),
            showOnFirstPage: true,
          },
          footer: {
            enabled: true,
            template: this.getTechnicalFooterTemplate(),
            height: '28px',
            styles: this.getTechnicalStyles(),
            showOnFirstPage: true,
          },
          margins: {
            top: '70px',
            bottom: '55px',
            left: '50px',
            right: '50px',
          },
        },
      },
      {
        name: 'Minimal Clean',
        description: '極簡風格，僅包含必要資訊',
        category: 'minimal',
        config: {
          header: {
            enabled: false,
            template: '',
          },
          footer: {
            enabled: true,
            template: this.getMinimalFooterTemplate(),
            height: '20px',
            styles: this.getMinimalStyles(),
            showOnFirstPage: false,
          },
          margins: {
            top: '50px',
            bottom: '40px',
            left: '40px',
            right: '40px',
          },
        },
      },
    ];
  }

  /**
   * Get preset by name
   */
  static getPresetByName(name: string): PageStructurePreset | undefined {
    return this.getAvailablePresets().find((preset) => preset.name === name);
  }

  /**
   * Get presets by category
   */
  static getPresetsByCategory(category: string): PageStructurePreset[] {
    return this.getAvailablePresets().filter(
      (preset) => preset.category === category,
    );
  }

  /**
   * Create custom preset
   */
  static createCustomPreset(
    name: string,
    description: string,
    config: PageStructureConfig,
    category: string = 'custom',
  ): PageStructurePreset {
    return {
      name,
      description,
      category: category as any,
      config,
    };
  }

  /**
   * Business header template
   */
  private static getBusinessHeaderTemplate(): string {
    return `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2c3e50; padding-bottom: 5px;">
  <div style="font-weight: bold; font-size: 14px;">{{title}}</div>
  <div style="font-size: 12px; color: #666;">{{date}}</div>
</div>`;
  }

  /**
   * Business footer template
   */
  private static getBusinessFooterTemplate(): string {
    return `<div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #666;">
  <div>{{fileName}}</div>
  <div>第 {{pageNumber}} 頁，共 {{totalPages}} 頁</div>
  <div>{{date}}</div>
</div>`;
  }

  /**
   * Academic header template
   */
  private static getAcademicHeaderTemplate(): string {
    return `<div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 8px; font-family: 'Times New Roman', serif;">
  <div style="font-size: 14px; font-weight: bold;">{{title}}</div>
  {{#if author}}<div style="font-size: 12px; margin-top: 4px;">{{author}}</div>{{/if}}
</div>`;
  }

  /**
   * Academic footer template
   */
  private static getAcademicFooterTemplate(): string {
    return `<div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 10px; font-family: 'Times New Roman', serif;">
  第 {{pageNumber}} 頁，共 {{totalPages}} 頁
</div>`;
  }

  /**
   * Technical header template
   */
  private static getTechnicalHeaderTemplate(): string {
    return `<div style="display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; padding: 8px 15px; border-left: 4px solid #007bff;">
  <div style="font-family: 'Consolas', 'Monaco', monospace; font-weight: bold; color: #2c3e50;">{{title}}</div>
  <div style="font-size: 11px; color: #6c757d;">{{date}}</div>
</div>`;
  }

  /**
   * Technical footer template
   */
  private static getTechnicalFooterTemplate(): string {
    return `<div style="display: flex; justify-content: space-between; align-items: center; font-family: 'Consolas', 'Monaco', monospace; font-size: 9px; color: #6c757d; border-top: 1px solid #dee2e6; padding-top: 6px;">
  <div>📄 {{fileName}}</div>
  <div>頁碼: {{pageNumber}} / {{totalPages}}</div>
  <div>🔧 技術文件</div>
</div>`;
  }

  /**
   * Minimal footer template
   */
  private static getMinimalFooterTemplate(): string {
    return `<div style="text-align: center; font-size: 10px; color: #999;">
  {{pageNumber}}
</div>`;
  }

  /**
   * Business styles
   */
  private static getBusinessStyles(): HeaderFooterStyles {
    return {
      fontSize: '12px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#333333',
      padding: '10px 20px',
      textAlign: 'left',
    };
  }

  /**
   * Academic styles
   */
  private static getAcademicStyles(): HeaderFooterStyles {
    return {
      fontSize: '10px',
      fontFamily: '"Times New Roman", serif',
      color: '#000000',
      padding: '12px 30px',
      textAlign: 'center',
    };
  }

  /**
   * Technical styles
   */
  private static getTechnicalStyles(): HeaderFooterStyles {
    return {
      fontSize: '11px',
      fontFamily: '"Consolas", "Monaco", monospace',
      color: '#2c3e50',
      padding: '8px 15px',
      textAlign: 'left',
    };
  }

  /**
   * Minimal styles
   */
  private static getMinimalStyles(): HeaderFooterStyles {
    return {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#999999',
      padding: '5px',
      textAlign: 'center',
    };
  }

  /**
   * Get template suggestions based on document analysis
   */
  static suggestPreset(documentAnalysis: {
    hasCodeBlocks?: boolean;
    hasAcademicElements?: boolean;
    isBusinessDocument?: boolean;
    complexity?: 'simple' | 'moderate' | 'complex';
  }): PageStructurePreset[] {
    const suggestions: PageStructurePreset[] = [];
    const allPresets = this.getAvailablePresets();

    // Technical documents
    if (documentAnalysis.hasCodeBlocks) {
      const technical = allPresets.find((p) => p.category === 'technical');
      if (technical) suggestions.push(technical);
    }

    // Academic documents
    if (documentAnalysis.hasAcademicElements) {
      const academic = allPresets.find((p) => p.category === 'academic');
      if (academic) suggestions.push(academic);
    }

    // Business documents
    if (documentAnalysis.isBusinessDocument) {
      const business = allPresets.find((p) => p.category === 'business');
      if (business) suggestions.push(business);
    }

    // Simple documents
    if (documentAnalysis.complexity === 'simple') {
      const minimal = allPresets.find((p) => p.category === 'minimal');
      if (minimal) suggestions.push(minimal);
    }

    // Default to business if no specific match
    if (suggestions.length === 0) {
      const business = allPresets.find((p) => p.category === 'business');
      if (business) suggestions.push(business);
    }

    return suggestions;
  }

  /**
   * Validate preset configuration
   */
  static validatePreset(preset: PageStructurePreset): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!preset.name || preset.name.trim().length === 0) {
      errors.push('Preset name is required');
    }

    if (!preset.description || preset.description.trim().length === 0) {
      warnings.push('Preset description is missing');
    }

    if (!preset.config) {
      errors.push('Preset configuration is required');
    } else {
      // Validate header config
      if (preset.config.header?.enabled && !preset.config.header.template) {
        errors.push('Header template is required when header is enabled');
      }

      // Validate footer config
      if (preset.config.footer?.enabled && !preset.config.footer.template) {
        errors.push('Footer template is required when footer is enabled');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
