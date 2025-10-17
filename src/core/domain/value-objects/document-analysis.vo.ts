/**
 * Document Analysis Value Object
 * Encapsulates document analysis results with validation
 */

import { ValueObject, ValueObjectValidationError } from './value-object.base';

export class DocumentAnalysis extends ValueObject<DocumentAnalysisData> {
  constructor(data: DocumentAnalysisData) {
    super(data);
  }

  protected validate(value: DocumentAnalysisData): void {
    if (!value || typeof value !== 'object') {
      throw new ValueObjectValidationError(
        'DocumentAnalysis',
        value,
        'valid-object',
        'Document analysis data must be a valid object',
      );
    }

    if (typeof value.fileSize !== 'number' || value.fileSize < 0) {
      throw new ValueObjectValidationError(
        'DocumentAnalysis',
        value.fileSize,
        'positive-file-size',
        'File size must be a positive number',
      );
    }

    if (typeof value.wordCount !== 'number' || value.wordCount < 0) {
      throw new ValueObjectValidationError(
        'DocumentAnalysis',
        value.wordCount,
        'positive-word-count',
        'Word count must be a positive number',
      );
    }

    if (typeof value.estimatedPages !== 'number' || value.estimatedPages < 0) {
      throw new ValueObjectValidationError(
        'DocumentAnalysis',
        value.estimatedPages,
        'positive-pages',
        'Estimated pages must be a positive number',
      );
    }

    if (typeof value.readingTime !== 'number' || value.readingTime < 0) {
      throw new ValueObjectValidationError(
        'DocumentAnalysis',
        value.readingTime,
        'positive-reading-time',
        'Reading time must be a positive number',
      );
    }

    this.validateComplexityScore(value.contentComplexity?.score);
    this.validateLanguageInfo(value.languageDetection);
  }

  private validateComplexityScore(score: number | undefined): void {
    if (
      score !== undefined &&
      (typeof score !== 'number' || score < 1 || score > 10)
    ) {
      throw new ValueObjectValidationError(
        'DocumentAnalysis',
        score,
        'complexity-score-range',
        'Complexity score must be between 1 and 10',
      );
    }
  }

  private validateLanguageInfo(langInfo: any): void {
    if (langInfo && typeof langInfo === 'object') {
      if (
        langInfo.confidence !== undefined &&
        (typeof langInfo.confidence !== 'number' ||
          langInfo.confidence < 0 ||
          langInfo.confidence > 1)
      ) {
        throw new ValueObjectValidationError(
          'DocumentAnalysis',
          langInfo.confidence,
          'confidence-range',
          'Language confidence must be between 0 and 1',
        );
      }
    }
  }

  /**
   * Get document complexity level
   */
  get complexityLevel(): 'simple' | 'moderate' | 'complex' {
    const score = this._value.contentComplexity?.score || 1;
    if (score <= 3) return 'simple';
    if (score <= 7) return 'moderate';
    return 'complex';
  }

  /**
   * Check if document needs Chinese font support
   */
  get needsChineseSupport(): boolean {
    return this._value.languageDetection?.needsChineseSupport || false;
  }

  /**
   * Get primary detected language
   */
  get primaryLanguage(): string {
    return this._value.languageDetection?.primary || 'en';
  }

  /**
   * Get estimated processing time based on complexity
   */
  get estimatedProcessingTime(): number {
    const baseTime = Math.max(this._value.fileSize / 1000, 1); // 1 second per KB
    const complexityMultiplier =
      this.complexityLevel === 'complex'
        ? 2
        : this.complexityLevel === 'moderate'
          ? 1.5
          : 1;
    return Math.ceil(baseTime * complexityMultiplier);
  }

  /**
   * Check if document is media-heavy
   */
  get isMediaHeavy(): boolean {
    const mediaInfo = this._value.mediaElements;
    return mediaInfo ? mediaInfo.images > 5 || mediaInfo.hasLargeImages : false;
  }

  /**
   * Check if document is code-heavy
   */
  get isCodeHeavy(): boolean {
    const codeBlocks = this._value.codeBlocks || [];
    return (
      codeBlocks.length > 3 || codeBlocks.some((block) => block.lineCount > 50)
    );
  }

  /**
   * Get recommended TOC depth
   */
  get recommendedTocDepth(): number {
    return (
      this._value.contentComplexity?.recommendedTocDepth ||
      Math.min(this._value.headingStructure?.maxDepth || 3, 4)
    );
  }

  /**
   * Check if document has good heading structure
   */
  get hasGoodHeadingStructure(): boolean {
    const headings = this._value.headingStructure;
    return headings
      ? headings.totalHeadings >= 3 &&
          headings.maxDepth <= 4 &&
          headings.maxDepth >= 2
      : false;
  }
}

/**
 * Supporting interfaces for DocumentAnalysis
 */
export interface DocumentAnalysisData {
  fileSize: number;
  wordCount: number;
  headingStructure?: {
    totalHeadings: number;
    maxDepth: number;
    averageHeadingLength: number;
  };
  contentComplexity?: {
    score: number;
    recommendedTocDepth: number;
  };
  languageDetection?: {
    primary: string;
    confidence: number;
    needsChineseSupport: boolean;
  };
  mediaElements?: {
    images: number;
    hasLargeImages: boolean;
    estimatedImageSize: number;
  };
  codeBlocks?: Array<{
    language: string;
    lineCount: number;
    complexity: 'simple' | 'moderate' | 'complex';
  }>;
  estimatedPages: number;
  readingTime: number;
}
