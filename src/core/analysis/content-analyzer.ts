/**
 * Content Analyzer
 * Analyzes Markdown content to extract insights for smart configuration recommendations
 */

import { readFileSync } from 'fs';

import {
  ContentAnalysis,
  HeadingAnalysis,
  ContentComplexity,
  LanguageInfo,
  MediaElementsInfo,
  CodeBlockInfo,
  TableInfo,
  LinkInfo,
  DocumentType,
  ComplexityFactor,
  HeadingLevel,
  DetectedLanguage,
} from './types';

export class ContentAnalyzer {
  private chineseRegex = /[\u4e00-\u9fff]/g;
  private englishRegex = /[a-zA-Z]/g;
  private headingRegex = /^(#{1,6})\s+(.+)$/gm;
  private codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  private linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  private imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  async analyzeFile(filePath: string): Promise<ContentAnalysis> {
    const content = this.readMarkdownFile(filePath);
    return this.analyzeContent(content, filePath);
  }

  async analyzeContent(
    content: string,
    _filePath?: string,
  ): Promise<ContentAnalysis> {
    const basicStats = this.getBasicStats(content);
    const headingStructure = this.analyzeHeadings(content);
    const languageInfo = this.detectLanguages(content);
    const mediaElements = this.analyzeMediaElements(content);
    const codeBlocks = this.analyzeCodeBlocks(content);
    const tables = this.analyzeTables(content);
    const links = this.analyzeLinks(content);
    const contentComplexity = this.calculateComplexity(
      content,
      headingStructure,
      codeBlocks,
      tables,
      mediaElements,
    );

    return {
      fileSize: basicStats.fileSize,
      wordCount: basicStats.wordCount,
      headingStructure,
      contentComplexity,
      languageDetection: languageInfo,
      mediaElements,
      codeBlocks,
      tables,
      links,
      estimatedPages: this.estimatePages(
        content,
        mediaElements,
        tables.length,
        codeBlocks.length,
      ),
      readingTime: Math.ceil(basicStats.wordCount / 200), // Assuming 200 words per minute
    };
  }

  private readMarkdownFile(filePath: string): string {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Unable to read file: ${filePath}. ${error}`);
    }
  }

  private getBasicStats(content: string): {
    fileSize: number;
    wordCount: number;
  } {
    const fileSize = Buffer.byteLength(content, 'utf8');
    const words = content
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 0);

    return {
      fileSize,
      wordCount: words.length,
    };
  }

  private analyzeHeadings(content: string): HeadingAnalysis {
    const headings: { level: number; title: string }[] = [];
    let match;

    while ((match = this.headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      headings.push({ level, title });
    }

    const structure: HeadingLevel[] = [];
    for (let i = 1; i <= 6; i++) {
      const levelHeadings = headings.filter((h) => h.level === i);
      if (levelHeadings.length > 0) {
        structure.push({
          level: i,
          count: levelHeadings.length,
          titles: levelHeadings.map((h) => h.title),
        });
      }
    }

    const hasNumberedHeadings = headings.some((h) => /^\d+\./.test(h.title));
    const averageHeadingLength =
      headings.length > 0
        ? headings.reduce((sum, h) => sum + h.title.length, 0) / headings.length
        : 0;

    return {
      totalHeadings: headings.length,
      maxDepth: Math.max(...headings.map((h) => h.level), 0),
      structure,
      hasNumberedHeadings,
      averageHeadingLength,
    };
  }

  private detectLanguages(content: string): LanguageInfo {
    const chineseMatches = content.match(this.chineseRegex) || [];
    const englishMatches = content.match(this.englishRegex) || [];
    const totalCharacters = chineseMatches.length + englishMatches.length;

    if (totalCharacters === 0) {
      return {
        primary: 'en',
        confidence: 0.5,
        chineseCharacterRatio: 0,
        needsChineseSupport: false,
        detectedLanguages: [],
      };
    }

    const chineseRatio = chineseMatches.length / totalCharacters;
    const englishRatio = englishMatches.length / totalCharacters;

    let primary: LanguageInfo['primary'] = 'en';
    let confidence = 0.5;

    if (chineseRatio > 0.5) {
      primary = 'zh-TW';
      confidence = chineseRatio;
    } else if (chineseRatio > 0.1) {
      primary = 'mixed';
      confidence = 0.8;
    } else {
      primary = 'en';
      confidence = englishRatio;
    }

    const detectedLanguages: DetectedLanguage[] = [
      { language: 'Chinese', percentage: Math.round(chineseRatio * 100) },
      { language: 'English', percentage: Math.round(englishRatio * 100) },
    ].filter((lang) => lang.percentage > 0);

    return {
      primary,
      confidence,
      chineseCharacterRatio: chineseRatio,
      needsChineseSupport: chineseRatio > 0.05, // 5% threshold
      detectedLanguages,
    };
  }

  private analyzeMediaElements(content: string): MediaElementsInfo {
    const imageMatches = content.match(this.imageRegex) || [];
    const images = imageMatches.length;

    // Check for diagram indicators
    const diagramKeywords = [
      'graph',
      'flowchart',
      'diagram',
      '流程圖',
      '圖表',
      'plantuml',
      'mermaid',
    ];
    const hasDiagrams = diagramKeywords.some((keyword) =>
      content.toLowerCase().includes(keyword),
    );

    // Estimate if images are large based on context
    const hasLargeImages =
      content.includes('width') || content.includes('height') || images > 5;

    return {
      images,
      hasLargeImages,
      hasDiagrams,
      estimatedImageSize: images * 50, // Rough estimate: 50KB per image
    };
  }

  private analyzeCodeBlocks(content: string): CodeBlockInfo[] {
    const codeBlocks: CodeBlockInfo[] = [];
    let match;

    while ((match = this.codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];
      const lineCount = code.split('\n').length;

      let complexity: CodeBlockInfo['complexity'] = 'simple';
      if (lineCount > 50) complexity = 'complex';
      else if (lineCount > 10) complexity = 'moderate';

      codeBlocks.push({
        language,
        lineCount,
        complexity,
      });
    }

    return codeBlocks;
  }

  private analyzeTables(content: string): TableInfo[] {
    const tables: TableInfo[] = [];

    // Simple table detection - group consecutive table lines
    let currentTable: string[] = [];

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match lines that contain pipes and are likely table rows
      if (line.includes('|') && line.trim().length > 0) {
        currentTable.push(line);
      } else if (currentTable.length > 0) {
        // End of table
        this.processCurrentTable(currentTable, tables);
        currentTable = [];
      }
    }

    // Process the last table if exists
    if (currentTable.length > 0) {
      this.processCurrentTable(currentTable, tables);
    }

    return tables;
  }

  private processCurrentTable(currentTable: string[], tables: TableInfo[]) {
    if (currentTable.length >= 2) {
      // Header + at least one data row
      // Filter out separator lines (lines with only -, |, :, and spaces)
      const dataRows = currentTable.filter((row) => {
        const trimmed = row.trim();
        return !(/^[\s\-|:]+$/.test(trimmed) && trimmed.includes('-'));
      });

      if (dataRows.length >= 2) {
        // Header + at least one data row
        const columns = Math.max(
          ...dataRows.map((row) => {
            const parts = row.split('|');
            return parts.filter((part) => part.trim() !== '').length;
          }),
        );
        const rows = dataRows.length - 1; // Exclude header

        let complexity: TableInfo['complexity'] = 'simple';
        if (columns > 6 || rows > 20) complexity = 'complex';
        else if (columns > 3 || rows > 10) complexity = 'moderate';

        tables.push({ columns, rows, complexity });
      }
    }
  }

  private analyzeLinks(content: string): LinkInfo {
    const linkMatches = content.match(this.linkRegex) || [];
    let internal = 0;
    let external = 0;

    linkMatches.forEach((match) => {
      const url = match.match(/\]\(([^)]+)\)/)?.[1] || '';
      if (
        url.startsWith('#') ||
        url.startsWith('./') ||
        url.startsWith('../')
      ) {
        internal++;
      } else if (url.startsWith('http')) {
        external++;
      }
    });

    const hasFootnotes = content.includes('[^') || content.includes('footnote');

    return { internal, external, hasFootnotes };
  }

  private calculateComplexity(
    content: string,
    headings: HeadingAnalysis,
    codeBlocks: CodeBlockInfo[],
    tables: TableInfo[],
    media: MediaElementsInfo,
  ): ContentComplexity {
    const factors: ComplexityFactor[] = [];
    let score = 1;

    // Code complexity
    const totalCodeLines = codeBlocks.reduce(
      (sum, block) => sum + block.lineCount,
      0,
    );
    if (totalCodeLines > 100) {
      factors.push({
        type: 'code-heavy',
        weight: 0.3,
        description: `Contains ${totalCodeLines} lines of code across ${codeBlocks.length} blocks`,
      });
      score += 2;
    }

    // Table complexity
    const complexTables = tables.filter(
      (t) => t.complexity !== 'simple',
    ).length;
    if (complexTables > 0) {
      factors.push({
        type: 'table-heavy',
        weight: 0.2,
        description: `Contains ${complexTables} complex tables`,
      });
      score += 1;
    }

    // Media richness
    if (media.images > 5 || media.hasDiagrams) {
      factors.push({
        type: 'media-rich',
        weight: 0.25,
        description: `Contains ${media.images} images${media.hasDiagrams ? ' and diagrams' : ''}`,
      });
      score += 1.5;
    }

    // Document structure complexity
    if (headings.maxDepth > 4 || headings.totalHeadings > 20) {
      factors.push({
        type: 'technical',
        weight: 0.2,
        description: `Deep heading structure (${headings.maxDepth} levels, ${headings.totalHeadings} headings)`,
      });
      score += 1;
    }

    // Document type detection
    const documentType = this.detectDocumentType(content, factors);

    // Recommended TOC depth based on complexity
    let recommendedTocDepth = 2;
    if (headings.maxDepth > 3 && score > 5) recommendedTocDepth = 3;
    if (headings.maxDepth > 4 && score > 7) recommendedTocDepth = 4;

    return {
      score: Math.min(score, 10),
      factors,
      documentType,
      recommendedTocDepth,
    };
  }

  private detectDocumentType(
    content: string,
    factors: ComplexityFactor[],
  ): DocumentType {
    const lowerContent = content.toLowerCase();

    // Technical manual indicators
    if (
      factors.some((f) => f.type === 'code-heavy') ||
      lowerContent.includes('api') ||
      lowerContent.includes('installation') ||
      lowerContent.includes('configuration')
    ) {
      return 'technical-manual';
    }

    // Academic paper indicators
    if (
      lowerContent.includes('abstract') ||
      lowerContent.includes('references') ||
      lowerContent.includes('methodology') ||
      lowerContent.includes('conclusion')
    ) {
      return 'academic-paper';
    }

    // Business report indicators
    if (
      lowerContent.includes('executive summary') ||
      lowerContent.includes('quarterly') ||
      lowerContent.includes('revenue') ||
      lowerContent.includes('analysis')
    ) {
      return 'business-report';
    }

    // Documentation indicators
    if (
      lowerContent.includes('getting started') ||
      lowerContent.includes('usage') ||
      lowerContent.includes('examples') ||
      factors.some((f) => f.type === 'technical')
    ) {
      return 'documentation';
    }

    // Tutorial indicators
    if (
      lowerContent.includes('step') ||
      lowerContent.includes('tutorial') ||
      lowerContent.includes('guide') ||
      lowerContent.includes('how to')
    ) {
      return 'tutorial';
    }

    return 'article';
  }

  private estimatePages(
    content: string,
    media: MediaElementsInfo,
    tableCount: number,
    codeBlockCount: number,
  ): number {
    const wordsPerPage = 500; // Conservative estimate for PDF
    const wordCount = content.split(/\s+/).length;

    let pages = Math.ceil(wordCount / wordsPerPage);

    // Add pages for media elements
    pages += Math.ceil(media.images * 0.3); // Images take space
    pages += Math.ceil(tableCount * 0.2); // Tables can be space-consuming
    pages += Math.ceil(codeBlockCount * 0.1); // Code blocks need more vertical space

    return Math.max(pages, 1);
  }
}
