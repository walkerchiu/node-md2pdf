/**
 * Content Analyzer Tests
 */

import { ContentAnalyzer } from '../../../../src/core/analysis/content-analyzer';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('ContentAnalyzer', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyzeContent', () => {
    it('should analyze basic markdown content', async () => {
      const content = `# Title\n\nThis is a test document with some content.`;
      const result = await analyzer.analyzeContent(content);

      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.headingStructure.totalHeadings).toBe(1);
      expect(result.readingTime).toBeGreaterThan(0);
    });

    it('should detect Chinese language', async () => {
      const content = '# 標題\n\n這是一個測試文件，包含中文內容。';
      const result = await analyzer.analyzeContent(content);

      expect(result.languageDetection.primary).toBe('zh-TW');
      expect(result.languageDetection.needsChineseSupport).toBe(true);
      expect(result.languageDetection.chineseCharacterRatio).toBeGreaterThan(
        0.5,
      );
    });

    it('should detect mixed language content', async () => {
      const content = '# Title 標題\n\nThis is mixed content 這是混合內容';
      const result = await analyzer.analyzeContent(content);

      expect(result.languageDetection.primary).toBe('mixed');
      expect(result.languageDetection.confidence).toBeGreaterThan(0.5);
    });

    it('should detect English language', async () => {
      const content = '# English Title\n\nThis is an English document.';
      const result = await analyzer.analyzeContent(content);

      expect(result.languageDetection.primary).toBe('en');
      expect(result.languageDetection.needsChineseSupport).toBe(false);
    });

    it('should analyze heading structure', async () => {
      const content = `# H1
## H2
### H3
## Another H2`;
      const result = await analyzer.analyzeContent(content);

      expect(result.headingStructure.totalHeadings).toBe(4);
      expect(result.headingStructure.maxDepth).toBe(3);
      expect(result.headingStructure.structure).toHaveLength(3);
    });

    it('should detect numbered headings', async () => {
      const content = `# 1. First Section
## 1.1 Subsection`;
      const result = await analyzer.analyzeContent(content);

      expect(result.headingStructure.hasNumberedHeadings).toBe(true);
    });

    it('should analyze code blocks', async () => {
      const content = '```javascript\nconst x = 1;\n```';
      const result = await analyzer.analyzeContent(content);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].language).toBe('javascript');
      expect(result.codeBlocks[0].complexity).toBe('simple');
    });

    it('should detect complex code blocks', async () => {
      const longCode = Array(60).fill('const x = 1;').join('\n');
      const content = `\`\`\`javascript\n${longCode}\n\`\`\``;
      const result = await analyzer.analyzeContent(content);

      expect(result.codeBlocks[0].complexity).toBe('complex');
      expect(result.codeBlocks[0].lineCount).toBeGreaterThan(50);
    });

    it('should analyze tables', async () => {
      const content = `| Column 1 | Column 2 |
| --- | --- |
| Data 1 | Data 2 |
| Data 3 | Data 4 |`;
      const result = await analyzer.analyzeContent(content);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].columns).toBe(2);
      expect(result.tables[0].rows).toBe(2);
      expect(result.tables[0].complexity).toBe('simple');
    });

    it('should detect complex tables', async () => {
      const headers = Array(8)
        .fill('Col')
        .map((c, i) => `${c}${i}`)
        .join(' | ');
      const separator = Array(8).fill('---').join(' | ');
      const rows = Array(25)
        .fill('data')
        .map((d, i) => Array(8).fill(`${d}${i}`).join(' | '))
        .join('\n');
      const content = `| ${headers} |\n| ${separator} |\n${rows}`;
      const result = await analyzer.analyzeContent(content);

      expect(result.tables[0].complexity).toBe('complex');
    });

    it('should detect images', async () => {
      const content = '![alt text](image.png)\n![another](photo.jpg)';
      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.images).toBe(2);
    });

    it('should detect PlantUML diagrams', async () => {
      const content = '```plantuml\n@startuml\nAlice -> Bob\n@enduml\n```';
      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.hasPlantUMLDiagrams).toBe(true);
      expect(result.mediaElements.plantUMLCount).toBe(1);
      expect(result.mediaElements.hasDiagrams).toBe(true);
    });

    it('should detect direct PlantUML syntax', async () => {
      const content = '@startuml\nAlice -> Bob\n@enduml';
      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.hasPlantUMLDiagrams).toBe(true);
      expect(result.mediaElements.plantUMLCount).toBe(1);
    });

    it('should detect Mermaid diagrams', async () => {
      const content = '```mermaid\ngraph TD\nA-->B\n```';
      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.hasMermaidDiagrams).toBe(true);
      expect(result.mediaElements.mermaidCount).toBe(1);
      expect(result.mediaElements.hasDiagrams).toBe(true);
    });

    it('should detect diagram keywords', async () => {
      const content = 'This document contains a flowchart diagram.';
      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.hasDiagrams).toBe(true);
    });

    it('should analyze internal and external links', async () => {
      const content = `[Internal](#section)
[Relative](./page.md)
[External](https://example.com)`;
      const result = await analyzer.analyzeContent(content);

      expect(result.links.internal).toBe(2);
      expect(result.links.external).toBe(1);
    });

    it('should detect footnotes', async () => {
      const content = 'Text with footnote[^1]\n\n[^1]: Footnote content';
      const result = await analyzer.analyzeContent(content);

      expect(result.links.hasFootnotes).toBe(true);
    });

    it('should calculate complexity for code-heavy documents', async () => {
      const longCode = Array(120).fill('const x = 1;').join('\n');
      const content = `# Technical Doc\n\`\`\`js\n${longCode}\n\`\`\``;
      const result = await analyzer.analyzeContent(content);

      expect(result.contentComplexity.score).toBeGreaterThan(1);
      expect(
        result.contentComplexity.factors.some((f) => f.type === 'code-heavy'),
      ).toBe(true);
    });

    it('should calculate complexity for table-heavy documents', async () => {
      const headers = Array(8)
        .fill('Col')
        .map((c, i) => `${c}${i}`)
        .join(' | ');
      const separator = Array(8).fill('---').join(' | ');
      const rows = Array(15)
        .fill('data')
        .map((d, i) => Array(8).fill(`${d}${i}`).join(' | '))
        .join('\n');
      const content = `| ${headers} |\n| ${separator} |\n${rows}`;
      const result = await analyzer.analyzeContent(content);

      expect(
        result.contentComplexity.factors.some((f) => f.type === 'table-heavy'),
      ).toBe(true);
    });

    it('should calculate complexity for media-rich documents', async () => {
      const images = Array(7)
        .fill(0)
        .map((_, i) => `![img${i}](img${i}.png)`)
        .join('\n');
      const content = `# Gallery\n\n${images}`;
      const result = await analyzer.analyzeContent(content);

      expect(
        result.contentComplexity.factors.some((f) => f.type === 'media-rich'),
      ).toBe(true);
    });

    it('should detect technical document type', async () => {
      const content =
        '# API Documentation\n\n## Installation\n\n```bash\nnpm install\n```';
      const result = await analyzer.analyzeContent(content);

      expect(result.contentComplexity.documentType).toBe('technical-manual');
    });

    it('should detect academic paper type', async () => {
      const content =
        '# Research Paper\n\n## Abstract\n\n## Methodology\n\n## Conclusion';
      const result = await analyzer.analyzeContent(content);

      expect(result.contentComplexity.documentType).toBe('academic-paper');
    });

    it('should detect business report type', async () => {
      const content =
        '# Q4 Report\n\n## Executive Summary\n\nRevenue analysis for the quarter.';
      const result = await analyzer.analyzeContent(content);

      expect(result.contentComplexity.documentType).toBe('business-report');
    });

    it('should detect documentation type', async () => {
      const content =
        '# User Guide\n\n## Getting Started\n\n## Usage\n\n## Examples';
      const result = await analyzer.analyzeContent(content);

      expect(result.contentComplexity.documentType).toBe('documentation');
    });

    it('should detect tutorial type', async () => {
      const content = '# Step-by-Step Tutorial\n\nHow to build your first app.';
      const result = await analyzer.analyzeContent(content);

      expect(result.contentComplexity.documentType).toBe('tutorial');
    });

    it('should detect article type as default', async () => {
      const content = '# Simple Article\n\nThis is just a regular article.';
      const result = await analyzer.analyzeContent(content);

      expect(result.contentComplexity.documentType).toBe('article');
    });

    it('should recommend TOC depth based on complexity', async () => {
      const headings = `# H1\n${'## H2\n### H3\n#### H4\n'.repeat(10)}`;
      const content = headings;
      const result = await analyzer.analyzeContent(content);

      expect(
        result.contentComplexity.recommendedTocDepth,
      ).toBeGreaterThanOrEqual(2);
    });

    it('should calculate reading time', async () => {
      const words = Array(400).fill('word').join(' ');
      const content = `# Title\n\n${words}`;
      const result = await analyzer.analyzeContent(content);

      // Reading time is calculated as wordCount / 200, rounded up
      // 402 words (400 + "Title") / 200 = 2.01, ceil = 3
      expect(result.readingTime).toBe(3);
    });

    it('should handle empty content', async () => {
      const content = '';
      const result = await analyzer.analyzeContent(content);

      expect(result.wordCount).toBe(0);
      expect(result.headingStructure.totalHeadings).toBe(0);
      expect(result.languageDetection.primary).toBe('en');
      expect(result.contentComplexity.score).toBe(1);
    });
  });

  describe('analyzeFile', () => {
    it('should read and analyze file', async () => {
      const mockContent = '# Test\n\nFile content';
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = await analyzer.analyzeFile('test.md');

      expect(fs.readFileSync).toHaveBeenCalledWith('test.md', 'utf-8');
      expect(result.headingStructure.totalHeadings).toBe(1);
    });

    it('should throw error for non-existent file', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      await expect(analyzer.analyzeFile('nonexistent.md')).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle content with no language characters', async () => {
      const content = '123 456 789';
      const result = await analyzer.analyzeContent(content);

      expect(result.languageDetection.primary).toBe('en');
      expect(result.languageDetection.confidence).toBe(0.5);
    });

    it('should handle malformed tables', async () => {
      const content = '| incomplete table\n| missing separator';
      const result = await analyzer.analyzeContent(content);

      // Should handle gracefully without crashing
      expect(result.tables).toBeDefined();
    });

    it('should not double count PlantUML diagrams', async () => {
      const content = '```plantuml\n@startuml\nA -> B\n@enduml\n```';
      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.plantUMLCount).toBe(1);
    });

    it('should handle code blocks without language specified', async () => {
      const content = '```\ncode without language\n```';
      const result = await analyzer.analyzeContent(content);

      expect(result.codeBlocks[0].language).toBe('text');
    });

    it('should handle table followed by non-table content', async () => {
      const content = `# Heading

| Column 1 | Column 2 |
| --- | --- |
| Data 1 | Data 2 |

This is a paragraph after the table.

Another paragraph.`;

      const result = await analyzer.analyzeContent(content);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].rows).toBe(1);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should handle multiple tables separated by content', async () => {
      const content = `| Table 1 Col 1 | Table 1 Col 2 |
| --- | --- |
| Data 1 | Data 2 |

Some text between tables.

| Table 2 Col 1 | Table 2 Col 2 |
| --- | --- |
| Data 3 | Data 4 |
| Data 5 | Data 6 |`;

      const result = await analyzer.analyzeContent(content);

      expect(result.tables).toHaveLength(2);
      expect(result.tables[0].rows).toBe(1);
      expect(result.tables[1].rows).toBe(2);
    });
  });
});
