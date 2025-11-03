/**
 * Content Analyzer Tests
 * Tests markdown content analysis functionality
 */

import { ContentAnalyzer } from '../../../../src/core/analysis/content-analyzer';
import { readFileSync } from 'fs';

// Mock fs module
jest.mock('fs');

describe('ContentAnalyzer', () => {
  let analyzer: ContentAnalyzer;
  const mockedReadFileSync = jest.mocked(readFileSync);

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyzeContent', () => {
    it('should analyze basic text content', async () => {
      const content = `# Title\n\nThis is a simple document with some content.\n\n## Subtitle\n\nMore content here.`;

      const result = await analyzer.analyzeContent(content);

      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.readingTime).toBeGreaterThan(0);
      expect(result.headingStructure.totalHeadings).toBe(2);
      expect(result.headingStructure.maxDepth).toBe(2);
    });

    it('should detect Chinese content', async () => {
      const content = `# 標題\n\n這是一個包含中文內容的文件。\n\n## 副標題\n\n更多中文內容。`;

      const result = await analyzer.analyzeContent(content);

      expect(result.languageDetection.needsChineseSupport).toBe(true);
      expect(result.languageDetection.chineseCharacterRatio).toBeGreaterThan(
        0.5,
      );
    });

    it('should detect English content', async () => {
      const content = `# Title\n\nThis is an English document.\n\n## Subtitle\n\nMore English content.`;

      const result = await analyzer.analyzeContent(content);

      expect(result.languageDetection.needsChineseSupport).toBe(false);
      expect(result.languageDetection.chineseCharacterRatio).toBeLessThan(0.1);
      expect(result.languageDetection.primary).toBe('en');
    });

    it('should detect mixed language content', async () => {
      const content = `# Title 標題\n\nThis is a mixed document with both English and 中文內容。`;

      const result = await analyzer.analyzeContent(content);

      expect(result.languageDetection.primary).toBe('mixed');
      expect(result.languageDetection.chineseCharacterRatio).toBeGreaterThan(
        0.1,
      );
      expect(result.languageDetection.chineseCharacterRatio).toBeLessThan(0.9);
    });

    it('should analyze code blocks', async () => {
      const content = `# Code Example\n\n\`\`\`javascript\nconst hello = 'world';\nconsole.log(hello);\n\`\`\`\n\n\`\`\`python\nprint("Hello, World!")\n\`\`\``;

      const result = await analyzer.analyzeContent(content);

      expect(result.codeBlocks).toHaveLength(2);
      expect(result.codeBlocks[0].language).toBe('javascript');
      expect(result.codeBlocks[1].language).toBe('python');
      expect(result.codeBlocks[0].lineCount).toBeGreaterThan(0);
    });

    it('should analyze images and media', async () => {
      const content = `# Images\n\n![Alt text](image1.png)\n\n![Another image](image2.jpg)`;

      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.images).toBe(2);
      expect(result.mediaElements.estimatedImageSize).toBeGreaterThan(0);
    });

    it('should detect PlantUML diagrams', async () => {
      const content = `# Diagrams\n\n\`\`\`plantuml\n@startuml\nAlice -> Bob: Hello\n@enduml\n\`\`\`\n\n@startuml\nClass1 -> Class2\n@enduml`;

      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.hasPlantUMLDiagrams).toBe(true);
      expect(result.mediaElements.plantUMLCount).toBeGreaterThan(0);
    });

    it('should detect Mermaid diagrams', async () => {
      const content = `# Mermaid Diagrams\n\n\`\`\`mermaid\ngraph TD\n    A-->B\n    A-->C\n\`\`\``;

      const result = await analyzer.analyzeContent(content);

      expect(result.mediaElements.hasMermaidDiagrams).toBe(true);
      expect(result.mediaElements.mermaidCount).toBe(1);
    });

    it('should analyze tables', async () => {
      const content = `# Tables\n\n| Col1 | Col2 | Col3 |\n|------|------|------|\n| A    | B    | C    |\n| D    | E    | F    |`;

      const result = await analyzer.analyzeContent(content);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].columns).toBe(3);
      expect(result.tables[0].rows).toBe(2);
    });

    it('should analyze links', async () => {
      const content = `# Links\n\n[Internal link](#section)\n[External link](https://example.com)\n[Another link](https://github.com)`;

      const result = await analyzer.analyzeContent(content);

      expect(result.links.internal).toBe(1);
      expect(result.links.external).toBe(2);
    });

    it('should calculate content complexity', async () => {
      const complexContent = `# Complex Document\n\n## Section 1\n\n### Subsection\n\n\`\`\`javascript\n// Complex code\nfunction complexFunction() {\n  return 'complex';\n}\n\`\`\`\n\n| A | B | C | D | E |\n|---|---|---|---|---|\n| 1 | 2 | 3 | 4 | 5 |`;

      const result = await analyzer.analyzeContent(complexContent);

      expect(result.contentComplexity.score).toBeGreaterThan(1);
      expect(result.contentComplexity.factors.length).toBeGreaterThan(0);
    });

    it('should handle empty content', async () => {
      const result = await analyzer.analyzeContent('');

      expect(result.fileSize).toBe(0);
      expect(result.wordCount).toBe(0);
      expect(result.headingStructure.totalHeadings).toBe(0);
      expect(result.codeBlocks).toHaveLength(0);
      expect(result.mediaElements.images).toBe(0);
    });

    it('should determine document type based on content', async () => {
      const technicalContent = `# API Documentation\n\n## Endpoints\n\n\`\`\`javascript\nconst api = 'technical';\n\`\`\`\n\n### GET /users\n\nReturns user list.`;

      const result = await analyzer.analyzeContent(technicalContent);

      expect(['technical-manual', 'api-documentation', 'guide']).toContain(
        result.contentComplexity.documentType,
      );
    });

    it('should analyze heading structure depth', async () => {
      const deepContent = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6`;

      const result = await analyzer.analyzeContent(deepContent);

      expect(result.headingStructure.maxDepth).toBe(6);
      expect(result.headingStructure.totalHeadings).toBe(6);
      expect(result.headingStructure.structure).toHaveLength(6);
    });

    it('should calculate reading time accurately', async () => {
      const longContent = 'word '.repeat(250); // ~250 words = ~1 minute reading

      const result = await analyzer.analyzeContent(longContent);

      expect(result.readingTime).toBeGreaterThan(0);
      expect(result.wordCount).toBe(250);
    });
  });

  describe('analyzeFile', () => {
    it('should read and analyze file', async () => {
      const fileContent = '# Test File\n\nContent from file.';
      mockedReadFileSync.mockReturnValue(fileContent);

      const result = await analyzer.analyzeFile('/test/file.md');

      expect(mockedReadFileSync).toHaveBeenCalledWith('/test/file.md', 'utf-8');
      expect(result.headingStructure.totalHeadings).toBe(1);
    });

    it('should handle file reading errors', async () => {
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(
        analyzer.analyzeFile('/nonexistent/file.md'),
      ).rejects.toThrow('File not found');
    });
  });

  describe('edge cases', () => {
    it('should handle content with special characters', async () => {
      const content = `# Special 特殊 Characters\n\nEmoji: 😀 Special chars: @#$%^&*()`;

      const result = await analyzer.analyzeContent(content);

      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.headingStructure.totalHeadings).toBe(1);
    });

    it('should handle very large content', async () => {
      const largeContent = `# Large Document\n\n${'Content line.\n'.repeat(1000)}`;

      const result = await analyzer.analyzeContent(largeContent);

      expect(result.fileSize).toBeGreaterThan(10000);
      expect(result.wordCount).toBeGreaterThan(1000);
    });

    it('should handle malformed markdown', async () => {
      const malformedContent = `# Incomplete heading\n\n\`\`\`\nUnclosed code block\n\n| Incomplete table\n| Missing cells`;

      const result = await analyzer.analyzeContent(malformedContent);

      expect(result.headingStructure.totalHeadings).toBe(1);
      // Should handle gracefully without throwing
    });

    it('should detect footnotes in links', async () => {
      const content = `# Content\n\nText with footnote[^1].\n\n[^1]: This is a footnote.`;

      const result = await analyzer.analyzeContent(content);

      expect(result.links.hasFootnotes).toBe(true);
    });

    it('should analyze numbered headings', async () => {
      const content = `# 1. First Chapter\n## 1.1. First Section\n## 1.2. Second Section\n# 2. Second Chapter`;

      const result = await analyzer.analyzeContent(content);

      expect(result.headingStructure.hasNumberedHeadings).toBe(true);
      expect(result.headingStructure.totalHeadings).toBe(4);
    });
  });
});
