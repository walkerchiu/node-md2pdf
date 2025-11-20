/**
 * Unit tests for core analysis types
 */

import type {
  ContentAnalysis,
  ContentComplexity,
  LanguageInfo,
  DocumentType,
  RecommendedConfig,
  SmartDefaultsOptions,
  PotentialIssue,
} from '../../../../src/core/analysis/types';

describe('Core Analysis Types', () => {
  describe('ContentAnalysis', () => {
    it('should have all required properties', () => {
      const analysis: ContentAnalysis = {
        fileSize: 1024,
        wordCount: 500,
        headingStructure: {
          totalHeadings: 5,
          maxDepth: 3,
          structure: [
            { level: 1, count: 1, titles: ['Introduction'] },
            {
              level: 2,
              count: 3,
              titles: ['Section A', 'Section B', 'Section C'],
            },
            { level: 3, count: 1, titles: ['Subsection'] },
          ],
          hasNumberedHeadings: false,
          averageHeadingLength: 12,
        },
        contentComplexity: {
          score: 7,
          factors: [
            {
              type: 'technical',
              weight: 0.8,
              description: 'Technical content detected',
            },
          ],
          documentType: 'technical-manual',
          recommendedTocDepth: 3,
        },
        languageDetection: {
          primary: 'en',
          confidence: 0.95,
          chineseCharacterRatio: 0,
          needsChineseSupport: false,
          detectedLanguages: [
            { language: 'en', percentage: 95 },
            { language: 'zh-TW', percentage: 5 },
          ],
        },
        mediaElements: {
          images: 3,
          hasLargeImages: true,
          hasDiagrams: false,
          hasPlantUMLDiagrams: false,
          plantUMLCount: 0,
          hasMermaidDiagrams: false,
          mermaidCount: 0,
          estimatedImageSize: 2048,
        },
        codeBlocks: [
          { language: 'typescript', lineCount: 50, complexity: 'moderate' },
          { language: 'javascript', lineCount: 25, complexity: 'simple' },
        ],
        tables: [
          { columns: 4, rows: 10, complexity: 'simple' },
          { columns: 6, rows: 20, complexity: 'moderate' },
        ],
        links: {
          internal: 5,
          external: 10,
          hasFootnotes: true,
        },
        readingTime: 3,
      };

      expect(analysis.fileSize).toBe(1024);
      expect(analysis.wordCount).toBe(500);
      expect(analysis.headingStructure.totalHeadings).toBe(5);
      expect(analysis.contentComplexity.score).toBe(7);
      expect(analysis.languageDetection.primary).toBe('en');
      expect(analysis.mediaElements.images).toBe(3);
      expect(analysis.codeBlocks).toHaveLength(2);
      expect(analysis.tables).toHaveLength(2);
      expect(analysis.links.internal).toBe(5);
      expect(analysis.readingTime).toBe(3);
    });
  });

  describe('DocumentType', () => {
    it('should include all expected document types', () => {
      const expectedTypes: DocumentType[] = [
        'technical-manual',
        'academic-paper',
        'business-report',
        'documentation',
        'tutorial',
        'article',
        'book',
        'notes',
        'presentation',
        'mixed',
      ];

      expectedTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('RecommendedConfig', () => {
    it('should have all required properties', () => {
      const config: RecommendedConfig = {
        format: 'A4',
        orientation: 'portrait',
        margins: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
          reasoning: 'Standard margins for readability',
        },
        tocConfig: {
          enabled: true,
          maxDepth: 3,
          includePageNumbers: true,
          style: 'hierarchical',
          title: 'Table of Contents',
          reasoning: 'Document structure suggests TOC would be helpful',
        },
        theme: 'default',
        fonts: {
          enableChineseSupport: false,
          primaryFont: 'system-ui',
          fallbackFonts: ['Arial', 'sans-serif'],
          codeFont: 'Consolas',
          headingFont: 'system-ui',
          reasoning: 'System fonts for best compatibility',
        },
        pageStructure: {
          includeCover: false,
          includeHeader: true,
          includeFooter: true,
          headerContent: 'Document Title',
          footerContent: 'Page {pageNumber}',
          reasoning: 'Headers and footers improve navigation',
        },
        optimization: {
          enableCompression: true,
          imageOptimization: true,
          fontSubsetting: false,
          memoryUsage: 'medium',
          reasoning: 'Balanced optimization for performance',
        },
        confidence: 0.85,
        reasoning: [
          {
            setting: 'format',
            reason: 'A4 is standard for most documents',
            impact: 'medium',
          },
        ],
      };

      expect(config.format).toBe('A4');
      expect(config.orientation).toBe('portrait');
      expect(config.margins.top).toBe('1in');
      expect(config.tocConfig.enabled).toBe(true);
      expect(config.fonts.enableChineseSupport).toBe(false);
      expect(config.pageStructure.includeCover).toBe(false);
      expect(config.optimization.enableCompression).toBe(true);
      expect(config.confidence).toBe(0.85);
      expect(config.reasoning).toHaveLength(1);
    });
  });

  describe('PotentialIssue', () => {
    it('should support all issue types and severities', () => {
      const issue: PotentialIssue = {
        type: 'performance',
        severity: 'medium',
        description: 'Large images may slow down processing',
        suggestion: 'Consider optimizing image sizes',
      };

      expect(issue.type).toBe('performance');
      expect(issue.severity).toBe('medium');
      expect(issue.description).toBeTruthy();
      expect(issue.suggestion).toBeTruthy();

      // Test all types
      const types: PotentialIssue['type'][] = [
        'performance',
        'quality',
        'compatibility',
        'formatting',
      ];
      types.forEach((type) => {
        expect(typeof type).toBe('string');
      });

      // Test all severities
      const severities: PotentialIssue['severity'][] = [
        'low',
        'medium',
        'high',
      ];
      severities.forEach((severity) => {
        expect(typeof severity).toBe('string');
      });
    });
  });

  describe('SmartDefaultsOptions', () => {
    it('should support all analysis depths', () => {
      const options: SmartDefaultsOptions = {
        analysisDepth: 'standard',
        userPreferences: {
          format: 'A4',
        },
        previousConfigs: [],
        learningMode: true,
      };

      expect(options.analysisDepth).toBe('standard');
      expect(options.learningMode).toBe(true);

      // Test all analysis depths
      const depths: SmartDefaultsOptions['analysisDepth'][] = [
        'quick',
        'standard',
        'thorough',
      ];
      depths.forEach((depth) => {
        expect(typeof depth).toBe('string');
      });
    });
  });

  describe('ContentComplexity', () => {
    it('should validate complexity factors', () => {
      const complexity: ContentComplexity = {
        score: 5,
        factors: [
          {
            type: 'code-heavy',
            weight: 0.7,
            description: 'Contains many code blocks',
          },
          {
            type: 'technical',
            weight: 0.8,
            description: 'Technical terminology used',
          },
        ],
        documentType: 'documentation',
        recommendedTocDepth: 2,
      };

      expect(complexity.score).toBeGreaterThan(0);
      expect(complexity.score).toBeLessThanOrEqual(10);
      expect(complexity.factors).toHaveLength(2);
      expect(complexity.factors[0].weight).toBeGreaterThan(0);
      expect(complexity.factors[0].weight).toBeLessThanOrEqual(1);
      expect(complexity.recommendedTocDepth).toBeGreaterThan(0);
      expect(complexity.recommendedTocDepth).toBeLessThanOrEqual(6);
    });
  });

  describe('LanguageInfo', () => {
    it('should support all primary languages', () => {
      const languageInfo: LanguageInfo = {
        primary: 'mixed',
        confidence: 0.75,
        chineseCharacterRatio: 0.3,
        needsChineseSupport: true,
        detectedLanguages: [
          { language: 'zh-TW', percentage: 60 },
          { language: 'en', percentage: 40 },
        ],
      };

      expect(languageInfo.primary).toBe('mixed');
      expect(languageInfo.confidence).toBeGreaterThan(0);
      expect(languageInfo.confidence).toBeLessThanOrEqual(1);
      expect(languageInfo.chineseCharacterRatio).toBeGreaterThanOrEqual(0);
      expect(languageInfo.chineseCharacterRatio).toBeLessThanOrEqual(1);
      expect(languageInfo.needsChineseSupport).toBe(true);
      expect(languageInfo.detectedLanguages).toHaveLength(2);

      // Test all primary language options
      const primaryLanguages: LanguageInfo['primary'][] = [
        'zh-TW',
        'zh-CN',
        'en',
        'mixed',
      ];
      primaryLanguages.forEach((lang) => {
        expect(typeof lang).toBe('string');
      });
    });
  });
});
