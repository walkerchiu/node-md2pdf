/**
 * Smart Defaults Service
 * Analyzes content and provides intelligent configuration recommendations
 */

import { ContentAnalyzer } from '../../core/analysis/content-analyzer';
import {
  ContentAnalysis,
  RecommendedConfig,
  QuickConfig,
  SmartDefaultsOptions,
  ContentInsights,
  MarginConfig,
  RecommendedTocConfig,
  FontRecommendation,
  PageStructureConfig,
  OptimizationConfig,
  ConfigReasoning,
  PotentialIssue,
} from '../../core/analysis/types';
import { DEFAULT_MARGINS } from '../../infrastructure/config/constants';

import type { ILogger } from '../../infrastructure/logging/types';

export interface ISmartDefaultsService {
  analyzeContent(
    filePath: string,
    options?: SmartDefaultsOptions,
  ): Promise<ContentAnalysis>;
  analyzeContentString(
    content: string,
    options?: SmartDefaultsOptions,
  ): Promise<ContentAnalysis>;
  recommendSettings(
    analysis: ContentAnalysis,
    options?: SmartDefaultsOptions,
  ): Promise<RecommendedConfig>;
  getQuickConversionConfig(analysis: ContentAnalysis): Promise<QuickConfig>;
  getContentInsights(analysis: ContentAnalysis): Promise<ContentInsights>;
  getPresetConfigs(): QuickConfig[];
}

export class SmartDefaultsService implements ISmartDefaultsService {
  private contentAnalyzer: ContentAnalyzer;
  private presetConfigs: QuickConfig[];

  constructor(private readonly logger?: ILogger) {
    this.contentAnalyzer = new ContentAnalyzer();
    this.presetConfigs = this.initializePresetConfigs();
  }

  async analyzeContent(
    filePath: string,
    _options: SmartDefaultsOptions = {
      analysisDepth: 'standard',
      learningMode: false,
    },
  ): Promise<ContentAnalysis> {
    this.logger?.info(`Analyzing content: ${filePath}`);

    try {
      const analysis = await this.contentAnalyzer.analyzeFile(filePath);

      this.logger?.info(`Analysis completed: ${analysis.wordCount} words`);

      return analysis;
    } catch (error) {
      this.logger?.error(`Content analysis failed: ${error}`);
      throw new Error(`Failed to analyze content: ${error}`);
    }
  }

  async analyzeContentString(
    content: string,
    _options: SmartDefaultsOptions = {
      analysisDepth: 'standard',
      learningMode: false,
    },
  ): Promise<ContentAnalysis> {
    this.logger?.info(
      `Analyzing content string (${content.length} characters)`,
    );

    try {
      const analysis = await this.contentAnalyzer.analyzeContent(content);

      this.logger?.info(`Analysis completed: ${analysis.wordCount} words`);

      return analysis;
    } catch (error) {
      this.logger?.error(`Content analysis failed: ${error}`);
      throw new Error(`Failed to analyze content: ${error}`);
    }
  }

  async recommendSettings(
    analysis: ContentAnalysis,
    _options: SmartDefaultsOptions = {
      analysisDepth: 'standard',
      learningMode: false,
    },
  ): Promise<RecommendedConfig> {
    this.logger?.info('Generating configuration recommendations');

    const reasoning: ConfigReasoning[] = [];

    // Format recommendation
    const format = this.recommendFormat(analysis, reasoning);

    // Orientation recommendation
    const orientation = this.recommendOrientation(analysis, reasoning);

    // Margins recommendation
    const margins = this.recommendMargins(analysis, reasoning);

    // TOC configuration
    const tocConfig = this.recommendTocConfig(analysis, reasoning);

    // Theme recommendation
    const theme = this.recommendTheme(analysis, reasoning);

    // Font recommendations
    const fonts = this.recommendFonts(analysis, reasoning);

    // Page structure recommendations
    const pageStructure = this.recommendPageStructure(analysis, reasoning);

    // Optimization settings
    const optimization = this.recommendOptimization(analysis, reasoning);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(analysis, reasoning);

    const config: RecommendedConfig = {
      format,
      orientation,
      margins,
      tocConfig,
      theme,
      fonts,
      pageStructure,
      optimization,
      confidence,
      reasoning,
    };

    this.logger?.info(
      `Configuration recommended with ${(confidence * 100).toFixed(1)}% confidence`,
    );

    return config;
  }

  async getQuickConversionConfig(
    analysis: ContentAnalysis,
  ): Promise<QuickConfig> {
    // Select the most appropriate preset based on analysis
    const documentType = analysis.contentComplexity.documentType;
    const hasCode = analysis.codeBlocks.length > 0;
    const needsChinese = analysis.languageDetection.needsChineseSupport;

    // Find the best matching preset
    let selectedPreset = this.presetConfigs[0]; // Default to 'Quick & Simple'

    if (documentType === 'technical-manual' || hasCode) {
      selectedPreset =
        this.presetConfigs.find((p) => p.name === 'Technical Document') ||
        selectedPreset;
    } else if (documentType === 'academic-paper') {
      selectedPreset =
        this.presetConfigs.find((p) => p.name === 'Academic Paper') ||
        selectedPreset;
    } else if (documentType === 'business-report') {
      selectedPreset =
        this.presetConfigs.find((p) => p.name === 'Business Report') ||
        selectedPreset;
    }

    // Customize the preset based on analysis
    const customized = { ...selectedPreset };

    if (needsChinese && customized.config.fonts) {
      customized.config.fonts = {
        ...customized.config.fonts,
        enableChineseSupport: true,
        primaryFont: 'Noto Sans CJK TC',
        fallbackFonts: [
          'Microsoft JhengHei',
          'PingFang TC',
          'Helvetica Neue',
          'Arial',
        ],
        codeFont: 'JetBrains Mono',
        headingFont: 'Noto Sans CJK TC',
        reasoning: 'Chinese support enabled for mixed language content',
      };
    }

    // Enable TOC for complex documents with many headings
    if (
      analysis.headingStructure.totalHeadings > 10 &&
      customized.config.tocConfig
    ) {
      customized.config.tocConfig = {
        ...customized.config.tocConfig,
        enabled: true,
        maxDepth: analysis.contentComplexity.recommendedTocDepth,
        includePageNumbers: true,
        style: 'detailed',
        title: 'Contents',
        reasoning: 'TOC enabled for long document',
      };
    }

    customized.estimatedTime = this.estimateProcessingTime(analysis);

    return customized;
  }

  async getContentInsights(
    analysis: ContentAnalysis,
  ): Promise<ContentInsights> {
    const insights: ContentInsights = {
      documentTypeConfidence: this.calculateDocumentTypeConfidence(analysis),
      suggestedImprovements: this.generateImprovementSuggestions(analysis),
      potentialIssues: this.identifyPotentialIssues(analysis),
      processingWarnings: this.generateProcessingWarnings(analysis),
    };

    return insights;
  }

  getPresetConfigs(): QuickConfig[] {
    return this.presetConfigs;
  }

  private recommendFormat(
    analysis: ContentAnalysis,
    reasoning: ConfigReasoning[],
  ): 'A4' | 'A3' | 'Letter' {
    const hasWideTables = analysis.tables.some((t) => t.columns > 8);
    const hasComplexDiagrams = analysis.mediaElements.hasDiagrams;

    if (hasWideTables || hasComplexDiagrams) {
      reasoning.push({
        setting: 'format',
        reason: 'A3 format recommended for wide tables or complex diagrams',
        impact: 'medium',
      });
      return 'A3';
    }

    reasoning.push({
      setting: 'format',
      reason: 'A4 format suitable for standard document content',
      impact: 'low',
    });
    return 'A4';
  }

  private recommendOrientation(
    analysis: ContentAnalysis,
    reasoning: ConfigReasoning[],
  ): 'portrait' | 'landscape' {
    const hasWideTables = analysis.tables.some((t) => t.columns > 6);
    const hasWideCodeBlocks = analysis.codeBlocks.some((c) => c.lineCount > 20);

    if (hasWideTables || hasWideCodeBlocks) {
      reasoning.push({
        setting: 'orientation',
        reason: 'Landscape orientation recommended for wide content',
        impact: 'medium',
      });
      return 'landscape';
    }

    reasoning.push({
      setting: 'orientation',
      reason: 'Portrait orientation suitable for regular text content',
      impact: 'low',
    });
    return 'portrait';
  }

  private recommendMargins(
    analysis: ContentAnalysis,
    reasoning: ConfigReasoning[],
  ): MarginConfig {
    const isAcademic =
      analysis.contentComplexity.documentType === 'academic-paper';
    const isBusiness =
      analysis.contentComplexity.documentType === 'business-report';

    if (isAcademic) {
      reasoning.push({
        setting: 'margins',
        reason: 'Academic papers require wider margins for annotations',
        impact: 'medium',
      });
      return {
        ...DEFAULT_MARGINS.WITH_HEADER_FOOTER,
        reasoning: 'Academic format with wider margins',
      };
    }

    if (isBusiness) {
      reasoning.push({
        setting: 'margins',
        reason: 'Business documents benefit from professional margins',
        impact: 'low',
      });
      return {
        top: '1in',
        right: '0.8in',
        bottom: '1in',
        left: '0.8in',
        reasoning: 'Professional business format',
      };
    }

    reasoning.push({
      setting: 'margins',
      reason: 'Standard margins for general document content',
      impact: 'low',
    });
    return {
      top: '0.8in',
      right: '0.6in',
      bottom: '0.8in',
      left: '0.6in',
      reasoning: 'Balanced margins for readability',
    };
  }

  private recommendTocConfig(
    analysis: ContentAnalysis,
    reasoning: ConfigReasoning[],
  ): RecommendedTocConfig {
    // With two-stage rendering, we don't need page estimation
    // TOC decision is purely based on content structure
    const shouldIncludeToc = analysis.headingStructure.totalHeadings > 3;

    if (!shouldIncludeToc) {
      reasoning.push({
        setting: 'toc',
        reason: 'Document has few headings, TOC not needed',
        impact: 'low',
      });
      return {
        enabled: false,
        maxDepth: 2,
        includePageNumbers: true,
        style: 'simple',
        title: 'Table of Contents',
        reasoning: 'Document structure too simple for TOC',
      };
    }

    const maxDepth = Math.min(
      analysis.contentComplexity.recommendedTocDepth,
      4,
    );

    const style =
      analysis.contentComplexity.documentType === 'technical-manual'
        ? 'detailed'
        : 'simple';
    const title = 'Table of Contents'; // Use English as default for core services

    reasoning.push({
      setting: 'toc',
      reason: `Document has ${analysis.headingStructure.totalHeadings} headings with good structure`,
      impact: 'high',
    });

    return {
      enabled: true,
      maxDepth,
      includePageNumbers: true,
      style,
      title,
      reasoning: `Generated TOC with depth ${maxDepth} for document navigation`,
    };
  }

  private recommendTheme(
    analysis: ContentAnalysis,
    reasoning: ConfigReasoning[],
  ): string {
    const documentType = analysis.contentComplexity.documentType;

    switch (documentType) {
      case 'academic-paper':
        reasoning.push({
          setting: 'theme',
          reason: 'Academic theme provides formal styling',
          impact: 'medium',
        });
        return 'academic';

      case 'business-report':
        reasoning.push({
          setting: 'theme',
          reason: 'Professional theme for business documents',
          impact: 'medium',
        });
        return 'professional';

      case 'technical-manual':
        reasoning.push({
          setting: 'theme',
          reason: 'Technical theme optimized for code and diagrams',
          impact: 'medium',
        });
        return 'technical';

      default:
        reasoning.push({
          setting: 'theme',
          reason: 'Clean theme suitable for general content',
          impact: 'low',
        });
        return 'clean';
    }
  }

  private recommendFonts(
    analysis: ContentAnalysis,
    reasoning: ConfigReasoning[],
  ): FontRecommendation {
    const needsChinese = analysis.languageDetection.needsChineseSupport;
    const hasCode = analysis.codeBlocks.length > 0;

    if (needsChinese) {
      reasoning.push({
        setting: 'fonts',
        reason: `Chinese characters detected (${(analysis.languageDetection.chineseCharacterRatio * 100).toFixed(1)}% of content)`,
        impact: 'high',
      });
    }

    if (hasCode) {
      reasoning.push({
        setting: 'fonts',
        reason: `Document contains ${analysis.codeBlocks.length} code blocks`,
        impact: 'medium',
      });
    }

    return {
      enableChineseSupport: needsChinese,
      primaryFont: needsChinese ? 'Noto Sans CJK TC' : 'Inter',
      fallbackFonts: needsChinese
        ? ['Microsoft JhengHei', 'PingFang TC', 'Helvetica Neue', 'Arial']
        : ['system-ui', '-apple-system', 'Segoe UI', 'Arial'],
      codeFont: hasCode ? 'JetBrains Mono' : 'Monaco',
      headingFont: needsChinese ? 'Noto Sans CJK TC' : 'Inter',
      reasoning: `Font selection optimized for ${needsChinese ? 'Chinese' : 'English'} content${hasCode ? ' with code blocks' : ''}`,
    };
  }

  private recommendPageStructure(
    analysis: ContentAnalysis,
    reasoning: ConfigReasoning[],
  ): PageStructureConfig {
    // Use content structure indicators instead of estimated pages
    const isComplexDocument =
      analysis.headingStructure.totalHeadings > 15 || analysis.wordCount > 5000;
    const isFormal = ['academic-paper', 'business-report'].includes(
      analysis.contentComplexity.documentType,
    );
    const includeCover = isFormal || isComplexDocument;
    const includeHeader = isComplexDocument;
    const includeFooter = isComplexDocument || isFormal;

    if (includeCover) {
      reasoning.push({
        setting: 'pageStructure',
        reason: 'Cover page recommended for formal or long documents',
        impact: 'medium',
      });
    }

    if (includeHeader || includeFooter) {
      reasoning.push({
        setting: 'pageStructure',
        reason: 'Headers/footers improve navigation in multi-page documents',
        impact: 'medium',
      });
    }

    const structure: PageStructureConfig = {
      includeCover,
      includeHeader,
      includeFooter,
      reasoning: `Page structure optimized for ${isComplexDocument ? 'complex' : 'simple'} ${isFormal ? 'formal' : 'informal'} document`,
    };

    if (includeHeader) {
      structure.headerContent = '{{title}}';
    }

    if (includeFooter) {
      structure.footerContent = 'Page {{pageNumber}} of {{totalPages}}';
    }

    return structure;
  }

  private recommendOptimization(
    analysis: ContentAnalysis,
    _reasoning: ConfigReasoning[],
  ): OptimizationConfig {
    const hasImages = analysis.mediaElements.images > 0;
    const isLarge = analysis.fileSize > 1024 * 1024; // 1MB
    const isComplex = analysis.contentComplexity.score > 7;

    let memoryUsage: OptimizationConfig['memoryUsage'] = 'low';
    if (isComplex || hasImages) memoryUsage = 'medium';
    if (isLarge || analysis.mediaElements.images > 10) memoryUsage = 'high';

    _reasoning.push({
      setting: 'optimization',
      reason: `Document complexity score: ${analysis.contentComplexity.score}/10`,
      impact: 'medium',
    });

    return {
      enableCompression: isLarge,
      imageOptimization: hasImages,
      fontSubsetting: analysis.languageDetection.needsChineseSupport,
      estimatedProcessingTime: this.estimateProcessingTime(analysis),
      memoryUsage,
      reasoning: `Optimization settings based on document size and complexity`,
    };
  }

  private calculateConfidence(
    analysis: ContentAnalysis,
    _reasoning: ConfigReasoning[],
  ): number {
    let confidence = 0.8; // Base confidence

    // Increase confidence based on content analysis quality
    if (analysis.headingStructure.totalHeadings > 0) confidence += 0.1;
    if (analysis.languageDetection.confidence > 0.8) confidence += 0.05;
    if (analysis.contentComplexity.factors.length > 0) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private estimateProcessingTime(analysis: ContentAnalysis): number {
    let baseTime = 3; // Base time for two-stage rendering

    // Time estimation based on content complexity, not estimated pages
    baseTime += Math.ceil(analysis.wordCount / 1000) * 0.5; // 0.5s per 1000 words
    baseTime += analysis.mediaElements.images * 0.3; // 0.3s per image
    baseTime += analysis.codeBlocks.length * 0.1; // 0.1s per code block
    baseTime += analysis.tables.length * 0.2; // 0.2s per table
    baseTime += analysis.headingStructure.totalHeadings * 0.05; // TOC processing time

    if (analysis.languageDetection.needsChineseSupport) {
      baseTime += 1; // Extra time for font loading
    }

    return Math.ceil(baseTime);
  }

  private calculateDocumentTypeConfidence(analysis: ContentAnalysis): number {
    return Math.min(analysis.contentComplexity.factors.length * 0.2 + 0.6, 1.0);
  }

  private generateImprovementSuggestions(analysis: ContentAnalysis): string[] {
    const suggestions: string[] = [];

    if (analysis.headingStructure.totalHeadings === 0) {
      suggestions.push(
        'Consider adding headings to improve document structure',
      );
    }

    if (analysis.headingStructure.maxDepth > 5) {
      suggestions.push(
        'Consider reducing heading depth for better readability',
      );
    }

    if (analysis.tables.some((t) => t.complexity === 'complex')) {
      suggestions.push(
        'Consider simplifying complex tables or breaking them into smaller sections',
      );
    }

    if (analysis.mediaElements.images > 20) {
      suggestions.push('Consider optimizing images to reduce file size');
    }

    return suggestions;
  }

  private identifyPotentialIssues(analysis: ContentAnalysis): PotentialIssue[] {
    const issues: PotentialIssue[] = [];

    if (analysis.fileSize > 5 * 1024 * 1024) {
      issues.push({
        type: 'performance',
        severity: 'high',
        description: 'Large file size may cause memory issues',
        suggestion: 'Consider splitting the document or optimizing content',
      });
    }

    if (analysis.mediaElements.images > 50) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        description: 'Many images may slow down processing',
        suggestion: 'Consider reducing image count or optimizing images',
      });
    }

    if (analysis.tables.some((t) => t.columns > 15)) {
      issues.push({
        type: 'formatting',
        severity: 'medium',
        description: 'Very wide tables may not display well in PDF',
        suggestion: 'Consider breaking wide tables into multiple sections',
      });
    }

    return issues;
  }

  private generateProcessingWarnings(analysis: ContentAnalysis): string[] {
    const warnings: string[] = [];

    // Base warnings on content complexity instead of estimated pages
    if (analysis.wordCount > 50000) {
      warnings.push(
        'Large document detected - processing may take several minutes',
      );
    }

    if (analysis.languageDetection.needsChineseSupport) {
      warnings.push('Chinese font loading may add extra processing time');
    }

    if (analysis.contentComplexity.score > 8) {
      warnings.push(
        'Complex document structure - additional memory may be required',
      );
    }

    return warnings;
  }

  private initializePresetConfigs(): QuickConfig[] {
    return [
      {
        name: 'Quick & Simple',
        description: '快速轉換，適合簡單文件',
        config: {
          format: 'A4',
          orientation: 'portrait',
          tocConfig: {
            enabled: false,
            maxDepth: 2,
            includePageNumbers: false,
            style: 'simple',
            title: 'Contents',
            reasoning: 'Quick conversion without TOC',
          },
          theme: 'clean',
          fonts: {
            enableChineseSupport: false,
            primaryFont: 'Inter',
            fallbackFonts: ['system-ui', 'Arial'],
            codeFont: 'Monaco',
            headingFont: 'Inter',
            reasoning: 'Minimal font configuration',
          },
          optimization: {
            enableCompression: false,
            imageOptimization: false,
            fontSubsetting: false,
            estimatedProcessingTime: 3,
            memoryUsage: 'low',
            reasoning: 'Optimized for speed',
          },
        },
        useCase: '簡單文件，快速轉換',
        estimatedTime: 3,
      },
      {
        name: 'Professional Document',
        description:
          'Professional document with table of contents and full formatting',
        config: {
          format: 'A4',
          orientation: 'portrait',
          tocConfig: {
            enabled: true,
            maxDepth: 3,
            includePageNumbers: true,
            style: 'detailed',
            title: 'Table of Contents',
            reasoning: 'Professional document with detailed TOC',
          },
          theme: 'professional',
          pageStructure: {
            includeCover: true,
            includeHeader: true,
            includeFooter: true,
            headerContent: '{{title}}',
            footerContent: 'Page {{pageNumber}} of {{totalPages}}',
            reasoning: 'Full page structure for professional appearance',
          },
        },
        useCase: '商業報告，正式文件',
        estimatedTime: 8,
      },
      {
        name: 'Technical Document',
        description: '技術文件，優化程式碼顯示',
        config: {
          format: 'A4',
          orientation: 'portrait',
          theme: 'technical',
          fonts: {
            enableChineseSupport: false,
            primaryFont: 'Inter',
            fallbackFonts: ['system-ui', 'Arial'],
            codeFont: 'JetBrains Mono',
            headingFont: 'Inter',
            reasoning: 'Optimized for technical content with code',
          },
          tocConfig: {
            enabled: true,
            maxDepth: 4,
            includePageNumbers: true,
            style: 'detailed',
            title: 'Contents',
            reasoning: 'Deep TOC for technical documentation',
          },
        },
        useCase: 'API 文件，技術手冊',
        estimatedTime: 10,
      },
      {
        name: 'Academic Paper',
        description: '學術論文格式，寬邊距',
        config: {
          format: 'A4',
          orientation: 'portrait',
          margins: {
            ...DEFAULT_MARGINS.WITH_HEADER_FOOTER,
            reasoning: 'Academic standard margins',
          },
          theme: 'academic',
          pageStructure: {
            includeCover: true,
            includeHeader: false,
            includeFooter: true,
            footerContent: '{{pageNumber}}',
            reasoning: 'Academic paper format',
          },
        },
        useCase: '學術論文，研究報告',
        estimatedTime: 12,
      },
    ];
  }
}
