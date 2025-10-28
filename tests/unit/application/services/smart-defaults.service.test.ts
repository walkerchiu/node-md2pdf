/**
 * Smart Defaults Service Tests
 */

/// <reference types="jest" />

import { SmartDefaultsService } from '../../../../src/application/services/smart-defaults.service';
import { ContentAnalysis } from '../../../../src/core/analysis/types';
import type { ILogger } from '../../../../src/infrastructure/logging/types';

// Mock logger and config manager
const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  setLevel: jest.fn(),
  getLevel: jest.fn().mockReturnValue('info'),
};

describe('SmartDefaultsService', () => {
  let service: SmartDefaultsService;

  beforeEach(() => {
    service = new SmartDefaultsService(mockLogger);
    jest.clearAllMocks();
  });

  describe('recommendSettings', () => {
    it('should recommend appropriate settings for technical content', async () => {
      const analysis: ContentAnalysis = {
        fileSize: 5000,
        wordCount: 800,
        readingTime: 4,
        headingStructure: {
          totalHeadings: 8,
          maxDepth: 3,
          structure: [
            {
              level: 1,
              count: 2,
              titles: ['API Reference', 'Examples'],
            },
            {
              level: 2,
              count: 4,
              titles: [
                'GET /users',
                'POST /users',
                'Code Sample',
                'Error Handling',
              ],
            },
            {
              level: 3,
              count: 2,
              titles: ['Request Format', 'Response Format'],
            },
          ],
          hasNumberedHeadings: false,
          averageHeadingLength: 12,
        },
        contentComplexity: {
          score: 6,
          documentType: 'technical-manual',
          recommendedTocDepth: 3,
          factors: [
            {
              type: 'code-heavy',
              weight: 0.3,
              description: 'Contains multiple code blocks',
            },
            {
              type: 'technical',
              weight: 0.2,
              description: 'Technical terminology detected',
            },
          ],
        },
        languageDetection: {
          primary: 'en',
          confidence: 0.9,
          chineseCharacterRatio: 0.02,
          needsChineseSupport: false,
          detectedLanguages: [
            {
              language: 'English',
              percentage: 98,
            },
            {
              language: 'Chinese',
              percentage: 2,
            },
          ],
        },
        mediaElements: {
          images: 2,
          hasLargeImages: false,
          hasDiagrams: true,
          estimatedImageSize: 100,
          hasPlantUMLDiagrams: false,
          plantUMLCount: 0,
          hasMermaidDiagrams: false,
          mermaidCount: 0,
        },
        codeBlocks: [
          {
            language: 'javascript',
            lineCount: 15,
            complexity: 'moderate',
          },
          {
            language: 'json',
            lineCount: 8,
            complexity: 'simple',
          },
          {
            language: 'bash',
            lineCount: 3,
            complexity: 'simple',
          },
        ],
        tables: [
          {
            columns: 4,
            rows: 5,
            complexity: 'simple',
          },
        ],
        links: {
          internal: 3,
          external: 5,
          hasFootnotes: false,
        },
      };

      const config = await service.recommendSettings(analysis);

      expect(config.format).toBe('A3');
      expect(config.orientation).toBe('portrait');
      expect(config.theme).toBe('technical');
      expect(config.fonts.enableChineseSupport).toBe(false);
      expect(config.fonts.codeFont).toBe('JetBrains Mono');
      expect(config.tocConfig.enabled).toBe(true);
      expect(config.tocConfig.maxDepth).toBe(3);
      expect(config.confidence).toBeGreaterThan(0.8);
      expect(config.reasoning).toBeDefined();
      expect(config.reasoning.length).toBeGreaterThan(0);
    });

    it('should recommend Chinese support when needed', async () => {
      const analysis: ContentAnalysis = {
        fileSize: 3000,
        wordCount: 500,
        readingTime: 3,
        headingStructure: {
          totalHeadings: 4,
          maxDepth: 2,
          structure: [
            { level: 1, count: 2, titles: ['介紹', 'Features'] },
            { level: 2, count: 2, titles: ['功能說明', 'Technical Details'] },
          ],
          hasNumberedHeadings: false,
          averageHeadingLength: 8,
        },
        contentComplexity: {
          score: 3,
          documentType: 'article',
          recommendedTocDepth: 2,
          factors: [],
        },
        languageDetection: {
          primary: 'mixed',
          confidence: 0.85,
          chineseCharacterRatio: 0.6,
          needsChineseSupport: true,
          detectedLanguages: [
            { language: 'Chinese', percentage: 60 },
            { language: 'English', percentage: 40 },
          ],
        },
        mediaElements: {
          images: 0,
          hasLargeImages: false,
          hasDiagrams: false,
          estimatedImageSize: 0,
          hasPlantUMLDiagrams: false,
          plantUMLCount: 0,
          hasMermaidDiagrams: false,
          mermaidCount: 0,
        },
        codeBlocks: [],
        tables: [],
        links: {
          internal: 1,
          external: 2,
          hasFootnotes: false,
        },
      };

      const config = await service.recommendSettings(analysis);

      expect(config.fonts.enableChineseSupport).toBe(true);
      expect(config.fonts.primaryFont).toBe('Noto Sans CJK TC');
      expect(config.optimization.fontSubsetting).toBe(true);
      expect(config.optimization.estimatedProcessingTime).toBeGreaterThan(2);
    });

    it('should recommend A3 format for wide tables', async () => {
      const analysis: ContentAnalysis = {
        fileSize: 4000,
        wordCount: 600,
        readingTime: 3,
        headingStructure: {
          totalHeadings: 3,
          maxDepth: 2,
          structure: [
            { level: 1, count: 1, titles: ['Data Analysis'] },
            { level: 2, count: 2, titles: ['Results', 'Summary'] },
          ],
          hasNumberedHeadings: false,
          averageHeadingLength: 10,
        },
        contentComplexity: {
          score: 4,
          documentType: 'business-report',
          recommendedTocDepth: 2,
          factors: [
            {
              type: 'table-heavy',
              weight: 0.2,
              description: 'Contains complex tables',
            },
          ],
        },
        languageDetection: {
          primary: 'en',
          confidence: 0.95,
          chineseCharacterRatio: 0,
          needsChineseSupport: false,
          detectedLanguages: [
            {
              language: 'English',
              percentage: 100,
            },
          ],
        },
        mediaElements: {
          images: 1,
          hasLargeImages: false,
          hasDiagrams: false,
          hasPlantUMLDiagrams: false,
          plantUMLCount: 0,
          hasMermaidDiagrams: false,
          mermaidCount: 0,
          estimatedImageSize: 50,
        },
        codeBlocks: [],
        tables: [
          {
            columns: 12,
            rows: 15,
            complexity: 'complex',
          },
        ],
        links: {
          internal: 0,
          external: 3,
          hasFootnotes: true,
        },
      };

      const config = await service.recommendSettings(analysis);

      expect(config.format).toBe('A3');
      expect(config.theme).toBe('professional');
    });

    it('should disable TOC for short documents', async () => {
      const analysis: ContentAnalysis = {
        fileSize: 1000,
        wordCount: 150,
        readingTime: 1,
        headingStructure: {
          totalHeadings: 2,
          maxDepth: 1,
          structure: [
            {
              level: 1,
              count: 2,
              titles: ['Introduction', 'Conclusion'],
            },
          ],
          hasNumberedHeadings: false,
          averageHeadingLength: 8,
        },
        contentComplexity: {
          score: 1,
          documentType: 'notes',
          recommendedTocDepth: 1,
          factors: [],
        },
        languageDetection: {
          primary: 'en',
          confidence: 0.9,
          chineseCharacterRatio: 0,
          needsChineseSupport: false,
          detectedLanguages: [
            {
              language: 'English',
              percentage: 100,
            },
          ],
        },
        mediaElements: {
          images: 0,
          hasLargeImages: false,
          hasDiagrams: false,
          estimatedImageSize: 0,
          hasPlantUMLDiagrams: false,
          plantUMLCount: 0,
          hasMermaidDiagrams: false,
          mermaidCount: 0,
        },
        codeBlocks: [],
        tables: [],
        links: {
          internal: 0,
          external: 1,
          hasFootnotes: false,
        },
      };

      const config = await service.recommendSettings(analysis);

      expect(config.tocConfig.enabled).toBe(false);
      expect(config.pageStructure.includeCover).toBe(false);
      expect(config.pageStructure.includeHeader).toBe(false);
      expect(config.optimization.memoryUsage).toBe('low');
    });
  });

  describe('getQuickConversionConfig', () => {
    it('should select technical preset for code-heavy content', async () => {
      const analysis: ContentAnalysis = {
        fileSize: 5000,
        wordCount: 800,
        readingTime: 4,
        headingStructure: {
          totalHeadings: 8,
          maxDepth: 3,
          structure: [],
          hasNumberedHeadings: false,
          averageHeadingLength: 12,
        },
        contentComplexity: {
          score: 6,
          documentType: 'technical-manual',
          recommendedTocDepth: 3,
          factors: [
            {
              type: 'code-heavy',
              weight: 0.3,
              description: 'Contains multiple code blocks',
            },
          ],
        },
        languageDetection: {
          primary: 'en',
          confidence: 0.9,
          chineseCharacterRatio: 0,
          needsChineseSupport: false,
          detectedLanguages: [
            {
              language: 'English',
              percentage: 100,
            },
          ],
        },
        mediaElements: {
          images: 2,
          hasLargeImages: false,
          hasDiagrams: true,
          estimatedImageSize: 100,
          hasPlantUMLDiagrams: false,
          plantUMLCount: 0,
          hasMermaidDiagrams: false,
          mermaidCount: 0,
        },
        codeBlocks: [
          {
            language: 'javascript',
            lineCount: 15,
            complexity: 'moderate',
          },
        ],
        tables: [],
        links: {
          internal: 3,
          external: 5,
          hasFootnotes: false,
        },
      };

      const config = await service.getQuickConversionConfig(analysis);

      expect(config.name).toBe('Technical Document');
      expect(config.config.theme).toBe('technical');
      expect(config.estimatedTime).toBeGreaterThan(0);
    });

    it('should enable Chinese support when needed', async () => {
      const analysis: ContentAnalysis = {
        fileSize: 3000,
        wordCount: 500,
        readingTime: 3,
        headingStructure: {
          totalHeadings: 4,
          maxDepth: 2,
          structure: [],
          hasNumberedHeadings: false,
          averageHeadingLength: 8,
        },
        contentComplexity: {
          score: 3,
          documentType: 'article',
          recommendedTocDepth: 2,
          factors: [],
        },
        languageDetection: {
          primary: 'zh-TW',
          confidence: 0.85,
          chineseCharacterRatio: 0.8,
          needsChineseSupport: true,
          detectedLanguages: [
            {
              language: 'Chinese',
              percentage: 80,
            },
            {
              language: 'English',
              percentage: 20,
            },
          ],
        },
        mediaElements: {
          images: 0,
          hasLargeImages: false,
          hasDiagrams: false,
          estimatedImageSize: 0,
          hasPlantUMLDiagrams: false,
          plantUMLCount: 0,
          hasMermaidDiagrams: false,
          mermaidCount: 0,
        },
        codeBlocks: [],
        tables: [],
        links: {
          internal: 1,
          external: 2,
          hasFootnotes: false,
        },
      };

      const config = await service.getQuickConversionConfig(analysis);

      expect(config.config.fonts?.enableChineseSupport).toBe(true);
    });
  });

  describe('getPresetConfigs', () => {
    it('should return all available preset configurations', () => {
      const presets = service.getPresetConfigs();

      expect(presets).toHaveLength(4);
      expect(presets.map((p) => p.name)).toContain('Quick & Simple');
      expect(presets.map((p) => p.name)).toContain('Professional Document');
      expect(presets.map((p) => p.name)).toContain('Technical Document');
      expect(presets.map((p) => p.name)).toContain('Academic Paper');

      presets.forEach((preset) => {
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.config).toBeDefined();
        expect(preset.useCase).toBeDefined();
        expect(preset.estimatedTime).toBeGreaterThan(0);
      });
    });
  });

  describe('getContentInsights', () => {
    it('should generate appropriate insights for complex content', async () => {
      const analysis: ContentAnalysis = {
        fileSize: 10 * 1024 * 1024, // 10MB
        wordCount: 60000,
        readingTime: 25,
        headingStructure: {
          totalHeadings: 50,
          maxDepth: 6,
          structure: [],
          hasNumberedHeadings: false,
          averageHeadingLength: 15,
        },
        contentComplexity: {
          score: 9,
          documentType: 'technical-manual',
          recommendedTocDepth: 4,
          factors: [
            {
              type: 'code-heavy',
              weight: 0.3,
              description: 'Contains many code blocks',
            },
            {
              type: 'media-rich',
              weight: 0.2,
              description: 'Contains many images',
            },
          ],
        },
        languageDetection: {
          primary: 'en',
          confidence: 0.9,
          chineseCharacterRatio: 0,
          needsChineseSupport: false,
          detectedLanguages: [
            {
              language: 'English',
              percentage: 100,
            },
          ],
        },
        mediaElements: {
          images: 60,
          hasLargeImages: true,
          hasDiagrams: true,
          estimatedImageSize: 3000,
          hasPlantUMLDiagrams: false,
          plantUMLCount: 0,
          hasMermaidDiagrams: false,
          mermaidCount: 0,
        },
        codeBlocks: [
          {
            language: 'javascript',
            lineCount: 100,
            complexity: 'complex',
          },
        ],
        tables: [
          {
            columns: 20,
            rows: 50,
            complexity: 'complex',
          },
        ],
        links: {
          internal: 10,
          external: 20,
          hasFootnotes: true,
        },
      };

      const insights = await service.getContentInsights(analysis);

      expect(insights.documentTypeConfidence).toBeDefined();
      expect(insights.suggestedImprovements).toContain(
        'Consider reducing heading depth for better readability',
      );
      expect(insights.suggestedImprovements).toContain(
        'Consider optimizing images to reduce file size',
      );
      expect(
        insights.potentialIssues.some((issue) => issue.type === 'performance'),
      ).toBe(true);
      expect(
        insights.potentialIssues.some((issue) => issue.severity === 'high'),
      ).toBe(true);
      expect(insights.processingWarnings).toContain(
        'Large document detected - processing may take several minutes',
      );
      expect(insights.processingWarnings).toContain(
        'Complex document structure - additional memory may be required',
      );
    });
  });
});
