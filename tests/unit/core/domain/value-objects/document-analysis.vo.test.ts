/**
 * Unit tests for DocumentAnalysis Value Object
 */

import {
  DocumentAnalysis,
  DocumentAnalysisData,
} from '../../../../../src/core/domain/value-objects/document-analysis.vo';
import { ValueObjectValidationError } from '../../../../../src/core/domain/value-objects/value-object.base';

describe('DocumentAnalysis Value Object', () => {
  const validData: DocumentAnalysisData = {
    fileSize: 1024,
    wordCount: 500,
    estimatedPages: 2,
    readingTime: 120,
    headingStructure: {
      totalHeadings: 5,
      maxDepth: 3,
      averageHeadingLength: 25,
    },
    contentComplexity: {
      score: 5,
      recommendedTocDepth: 3,
    },
    languageDetection: {
      primary: 'en',
      confidence: 0.9,
      needsChineseSupport: false,
    },
    mediaElements: {
      images: 3,
      hasLargeImages: false,
      estimatedImageSize: 500,
    },
    codeBlocks: [
      {
        language: 'javascript',
        lineCount: 20,
        complexity: 'moderate' as const,
      },
    ],
  };

  describe('constructor and validation', () => {
    it('should create DocumentAnalysis with valid data', () => {
      const analysis = new DocumentAnalysis(validData);
      expect(analysis.value).toEqual(validData);
    });

    it('should throw error for null/undefined data', () => {
      expect(() => new DocumentAnalysis(null as any)).toThrow(
        ValueObjectValidationError,
      );
      expect(() => new DocumentAnalysis(undefined as any)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for non-object data', () => {
      expect(() => new DocumentAnalysis('invalid' as any)).toThrow(
        ValueObjectValidationError,
      );
      expect(() => new DocumentAnalysis(123 as any)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for negative file size', () => {
      const invalidData = { ...validData, fileSize: -1 };
      expect(() => new DocumentAnalysis(invalidData)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for negative word count', () => {
      const invalidData = { ...validData, wordCount: -1 };
      expect(() => new DocumentAnalysis(invalidData)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for negative estimated pages', () => {
      const invalidData = { ...validData, estimatedPages: -1 };
      expect(() => new DocumentAnalysis(invalidData)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for negative reading time', () => {
      const invalidData = { ...validData, readingTime: -1 };
      expect(() => new DocumentAnalysis(invalidData)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for invalid complexity score', () => {
      const invalidData = {
        ...validData,
        contentComplexity: { score: 11, recommendedTocDepth: 3 },
      };
      expect(() => new DocumentAnalysis(invalidData)).toThrow(
        ValueObjectValidationError,
      );

      const invalidData2 = {
        ...validData,
        contentComplexity: { score: 0, recommendedTocDepth: 3 },
      };
      expect(() => new DocumentAnalysis(invalidData2)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw error for invalid language confidence', () => {
      const invalidData = {
        ...validData,
        languageDetection: {
          primary: 'en',
          confidence: 1.5,
          needsChineseSupport: false,
        },
      };
      expect(() => new DocumentAnalysis(invalidData)).toThrow(
        ValueObjectValidationError,
      );

      const invalidData2 = {
        ...validData,
        languageDetection: {
          primary: 'en',
          confidence: -0.1,
          needsChineseSupport: false,
        },
      };
      expect(() => new DocumentAnalysis(invalidData2)).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should allow optional fields to be undefined', () => {
      const minimalData: DocumentAnalysisData = {
        fileSize: 1024,
        wordCount: 500,
        estimatedPages: 2,
        readingTime: 120,
      };
      expect(() => new DocumentAnalysis(minimalData)).not.toThrow();
    });
  });

  describe('complexityLevel getter', () => {
    it('should return "simple" for low complexity scores', () => {
      const data = {
        ...validData,
        contentComplexity: { score: 2, recommendedTocDepth: 2 },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.complexityLevel).toBe('simple');
    });

    it('should return "moderate" for medium complexity scores', () => {
      const data = {
        ...validData,
        contentComplexity: { score: 5, recommendedTocDepth: 3 },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.complexityLevel).toBe('moderate');
    });

    it('should return "complex" for high complexity scores', () => {
      const data = {
        ...validData,
        contentComplexity: { score: 9, recommendedTocDepth: 4 },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.complexityLevel).toBe('complex');
    });

    it('should default to "simple" when complexity score is undefined', () => {
      const data = { ...validData };
      delete data.contentComplexity;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.complexityLevel).toBe('simple');
    });
  });

  describe('needsChineseSupport getter', () => {
    it('should return true when Chinese support is needed', () => {
      const data = {
        ...validData,
        languageDetection: {
          primary: 'zh',
          confidence: 0.9,
          needsChineseSupport: true,
        },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.needsChineseSupport).toBe(true);
    });

    it('should return false when Chinese support is not needed', () => {
      const analysis = new DocumentAnalysis(validData);
      expect(analysis.needsChineseSupport).toBe(false);
    });

    it('should default to false when language detection is undefined', () => {
      const data = { ...validData };
      delete data.languageDetection;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.needsChineseSupport).toBe(false);
    });
  });

  describe('primaryLanguage getter', () => {
    it('should return detected primary language', () => {
      const data = {
        ...validData,
        languageDetection: {
          primary: 'zh-TW',
          confidence: 0.9,
          needsChineseSupport: true,
        },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.primaryLanguage).toBe('zh-TW');
    });

    it('should default to "en" when language detection is undefined', () => {
      const data = { ...validData };
      delete data.languageDetection;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.primaryLanguage).toBe('en');
    });
  });

  describe('estimatedProcessingTime getter', () => {
    it('should calculate processing time based on file size and complexity', () => {
      const analysis = new DocumentAnalysis(validData);
      const expectedBaseTime = Math.max(1024 / 1000, 1);
      const expectedTime = Math.ceil(expectedBaseTime * 1.5); // moderate complexity
      expect(analysis.estimatedProcessingTime).toBe(expectedTime);
    });

    it('should use higher multiplier for complex documents', () => {
      const data = {
        ...validData,
        contentComplexity: { score: 9, recommendedTocDepth: 4 },
      };
      const analysis = new DocumentAnalysis(data);
      const expectedBaseTime = Math.max(1024 / 1000, 1);
      const expectedTime = Math.ceil(expectedBaseTime * 2); // complex
      expect(analysis.estimatedProcessingTime).toBe(expectedTime);
    });

    it('should use minimum time of 1 second for small files', () => {
      const data = { ...validData, fileSize: 100 };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.estimatedProcessingTime).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isMediaHeavy getter', () => {
    it('should return true for documents with many images', () => {
      const data = {
        ...validData,
        mediaElements: {
          images: 6,
          hasLargeImages: false,
          estimatedImageSize: 1000,
        },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.isMediaHeavy).toBe(true);
    });

    it('should return true for documents with large images', () => {
      const data = {
        ...validData,
        mediaElements: {
          images: 2,
          hasLargeImages: true,
          estimatedImageSize: 5000,
        },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.isMediaHeavy).toBe(true);
    });

    it('should return false for documents with few small images', () => {
      const analysis = new DocumentAnalysis(validData);
      expect(analysis.isMediaHeavy).toBe(false);
    });

    it('should return false when media elements are undefined', () => {
      const data = { ...validData };
      delete data.mediaElements;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.isMediaHeavy).toBe(false);
    });
  });

  describe('isCodeHeavy getter', () => {
    it('should return true for documents with many code blocks', () => {
      const data = {
        ...validData,
        codeBlocks: [
          { language: 'js', lineCount: 10, complexity: 'simple' as const },
          { language: 'ts', lineCount: 15, complexity: 'moderate' as const },
          { language: 'py', lineCount: 20, complexity: 'simple' as const },
          { language: 'go', lineCount: 25, complexity: 'complex' as const },
        ],
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.isCodeHeavy).toBe(true);
    });

    it('should return true for documents with large code blocks', () => {
      const data = {
        ...validData,
        codeBlocks: [
          { language: 'js', lineCount: 60, complexity: 'complex' as const },
        ],
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.isCodeHeavy).toBe(true);
    });

    it('should return false for documents with few small code blocks', () => {
      const analysis = new DocumentAnalysis(validData);
      expect(analysis.isCodeHeavy).toBe(false);
    });

    it('should return false when code blocks are undefined', () => {
      const data = { ...validData };
      delete data.codeBlocks;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.isCodeHeavy).toBe(false);
    });
  });

  describe('recommendedTocDepth getter', () => {
    it('should return configured recommended TOC depth', () => {
      const analysis = new DocumentAnalysis(validData);
      expect(analysis.recommendedTocDepth).toBe(3);
    });

    it('should fall back to heading structure max depth', () => {
      const data = { ...validData };
      delete data.contentComplexity;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.recommendedTocDepth).toBe(3); // from headingStructure.maxDepth
    });

    it('should limit TOC depth to maximum of 4', () => {
      const data = {
        ...validData,
        headingStructure: {
          totalHeadings: 10,
          maxDepth: 6,
          averageHeadingLength: 20,
        },
      };
      delete data.contentComplexity;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.recommendedTocDepth).toBe(4);
    });

    it('should default to 3 when both complexity and heading structure are undefined', () => {
      const data = { ...validData };
      delete data.contentComplexity;
      delete data.headingStructure;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.recommendedTocDepth).toBe(3);
    });
  });

  describe('hasGoodHeadingStructure getter', () => {
    it('should return true for well-structured documents', () => {
      const analysis = new DocumentAnalysis(validData);
      expect(analysis.hasGoodHeadingStructure).toBe(true);
    });

    it('should return false for documents with too few headings', () => {
      const data = {
        ...validData,
        headingStructure: {
          totalHeadings: 2,
          maxDepth: 3,
          averageHeadingLength: 25,
        },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.hasGoodHeadingStructure).toBe(false);
    });

    it('should return false for documents with too deep heading structure', () => {
      const data = {
        ...validData,
        headingStructure: {
          totalHeadings: 5,
          maxDepth: 6,
          averageHeadingLength: 25,
        },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.hasGoodHeadingStructure).toBe(false);
    });

    it('should return false for documents with too shallow heading structure', () => {
      const data = {
        ...validData,
        headingStructure: {
          totalHeadings: 5,
          maxDepth: 1,
          averageHeadingLength: 25,
        },
      };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.hasGoodHeadingStructure).toBe(false);
    });

    it('should return false when heading structure is undefined', () => {
      const data = { ...validData };
      delete data.headingStructure;
      const analysis = new DocumentAnalysis(data);
      expect(analysis.hasGoodHeadingStructure).toBe(false);
    });
  });

  describe('equality and immutability', () => {
    it('should be equal for same data', () => {
      const analysis1 = new DocumentAnalysis(validData);
      const analysis2 = new DocumentAnalysis(validData);
      expect(analysis1.equals(analysis2)).toBe(true);
    });

    it('should not be equal for different data', () => {
      const analysis1 = new DocumentAnalysis(validData);
      const differentData = { ...validData, wordCount: 600 };
      const analysis2 = new DocumentAnalysis(differentData);
      expect(analysis1.equals(analysis2)).toBe(false);
    });

    it('should be immutable after creation', () => {
      const analysis = new DocumentAnalysis(validData);
      expect(Object.isFrozen(analysis.value)).toBe(true);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle zero values correctly', () => {
      const zeroData: DocumentAnalysisData = {
        fileSize: 0,
        wordCount: 0,
        estimatedPages: 0,
        readingTime: 0,
      };
      expect(() => new DocumentAnalysis(zeroData)).not.toThrow();
    });

    it('should handle boundary values for complexity score', () => {
      const data1 = {
        ...validData,
        contentComplexity: { score: 1, recommendedTocDepth: 1 },
      };
      const data2 = {
        ...validData,
        contentComplexity: { score: 10, recommendedTocDepth: 4 },
      };
      expect(() => new DocumentAnalysis(data1)).not.toThrow();
      expect(() => new DocumentAnalysis(data2)).not.toThrow();
    });

    it('should handle boundary values for language confidence', () => {
      const data1 = {
        ...validData,
        languageDetection: {
          primary: 'en',
          confidence: 0,
          needsChineseSupport: false,
        },
      };
      const data2 = {
        ...validData,
        languageDetection: {
          primary: 'en',
          confidence: 1,
          needsChineseSupport: false,
        },
      };
      expect(() => new DocumentAnalysis(data1)).not.toThrow();
      expect(() => new DocumentAnalysis(data2)).not.toThrow();
    });

    it('should handle very large file sizes', () => {
      const data = { ...validData, fileSize: Number.MAX_SAFE_INTEGER };
      const analysis = new DocumentAnalysis(data);
      expect(analysis.estimatedProcessingTime).toBeGreaterThan(0);
    });

    it('should handle complex nested structures', () => {
      const complexData: DocumentAnalysisData = {
        ...validData,
        codeBlocks: Array(10)
          .fill(null)
          .map((_, i) => ({
            language: `lang${i}`,
            lineCount: i * 10,
            complexity:
              i % 3 === 0
                ? ('simple' as const)
                : i % 3 === 1
                  ? ('moderate' as const)
                  : ('complex' as const),
          })),
      };
      expect(() => new DocumentAnalysis(complexData)).not.toThrow();
      const analysis = new DocumentAnalysis(complexData);
      expect(analysis.isCodeHeavy).toBe(true);
    });
  });
});
