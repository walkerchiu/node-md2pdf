/**
 * Content Analyzer Tests
 */

import { ContentAnalyzer } from '../../../../src/core/analysis/content-analyzer';

describe('ContentAnalyzer', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  describe('analyzeContent', () => {
    it('should analyze simple markdown content correctly', async () => {
      const content = `# Main Title

This is a simple paragraph with some text.

## Section 1

More content here with a [link](https://example.com).

### Subsection

Some code:
\`\`\`javascript
console.log("Hello World");
\`\`\`

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.wordCount).toBeGreaterThan(0);
      expect(analysis.headingStructure.totalHeadings).toBe(3);
      expect(analysis.headingStructure.maxDepth).toBe(3);
      expect(analysis.codeBlocks).toHaveLength(1);
      expect(analysis.codeBlocks[0].language).toBe('javascript');
      expect(analysis.tables).toHaveLength(1);
      expect(analysis.links.external).toBe(1);
      expect(analysis.wordCount).toBeGreaterThan(0);
    });

    it('should detect Chinese content correctly', async () => {
      const content = `# 中文標題

這是一個中文段落，包含一些中文內容。

## 英文 Section

Mixed content with English and Chinese 中英混合內容.

\`\`\`python
print("你好世界")
\`\`\`
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.languageDetection.primary).toBe('mixed');
      expect(analysis.languageDetection.needsChineseSupport).toBe(true);
      expect(analysis.languageDetection.chineseCharacterRatio).toBeGreaterThan(
        0.1,
      );
      expect(analysis.languageDetection.detectedLanguages).toHaveLength(2);
    });

    it('should analyze technical content correctly', async () => {
      const content = `# API Documentation

## Installation

\`\`\`bash
npm install example-package
\`\`\`

## Configuration

\`\`\`json
{
  "apiKey": "your-key-here",
  "endpoint": "https://api.example.com"
}
\`\`\`

### Code Example

\`\`\`typescript
import { ExampleAPI } from 'example-package';

const api = new ExampleAPI({
  apiKey: process.env.API_KEY
});

async function fetchData() {
  const response = await api.getData();
  console.log(response);
}
\`\`\`

## Response Format

| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique identifier |
| name | string | Display name |
| status | boolean | Active status |
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.codeBlocks).toHaveLength(3);
      expect(
        analysis.codeBlocks.some((block) => block.language === 'typescript'),
      ).toBe(true);
      expect(
        analysis.codeBlocks.some((block) => block.language === 'json'),
      ).toBe(true);
      expect(analysis.contentComplexity.documentType).toBe('technical-manual');
      expect(analysis.contentComplexity.score).toBeGreaterThanOrEqual(1);
    });

    it('should handle academic paper structure', async () => {
      const content = `# Research Paper Title

## Abstract

This paper presents a comprehensive analysis of...

## Introduction

The field of research has shown...

## Methodology

Our approach consists of three phases:

### Data Collection
### Data Analysis
### Results Interpretation

## Results

The analysis revealed the following findings:

| Metric | Value | Significance |
|--------|-------|--------------|
| Accuracy | 95.2% | p < 0.001 |
| Precision | 92.8% | p < 0.01 |

## Discussion

The results indicate...

## Conclusion

In conclusion, this study demonstrates...

## References

1. Smith, J. et al. (2023). Previous research.
2. Jones, A. (2022). Related work.
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.contentComplexity.documentType).toBe('academic-paper');
      expect(analysis.headingStructure.maxDepth).toBe(3);
      expect(analysis.tables).toHaveLength(1);
      expect(
        analysis.contentComplexity.recommendedTocDepth,
      ).toBeGreaterThanOrEqual(2);
    });

    it('should estimate pages correctly', async () => {
      // Short content
      const shortContent = `# Short Document

Just a few words here.`;

      const shortAnalysis = await analyzer.analyzeContent(shortContent);
      expect(shortAnalysis.wordCount).toBeGreaterThan(0);

      // Longer content
      const longContent = `# Long Document

${'This is a longer paragraph with more content. '.repeat(200)}

${'## Section\n\nMore content here. '.repeat(50)}`;

      const longAnalysis = await analyzer.analyzeContent(longContent);
      expect(longAnalysis.wordCount).toBeGreaterThan(100);
    });

    it('should handle empty content gracefully', async () => {
      const content = '';

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.wordCount).toBe(0);
      expect(analysis.headingStructure.totalHeadings).toBe(0);
      expect(analysis.codeBlocks).toHaveLength(0);
      expect(analysis.tables).toHaveLength(0);
    });

    it('should analyze content with images and media', async () => {
      const content = `# Document with Media

Here is some content.

![Image 1](image1.png)

Some more text.

![Diagram](flowchart.svg)

And more content with ![inline image](small.jpg).

The document also references diagrams and flowcharts in the text.
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.mediaElements.images).toBe(3);
      expect(analysis.mediaElements.hasDiagrams).toBe(true);
      expect(analysis.mediaElements.hasPlantUMLDiagrams).toBe(false);
      expect(analysis.mediaElements.plantUMLCount).toBe(0);
      expect(analysis.mediaElements.estimatedImageSize).toBeGreaterThan(0);
    });

    it('should analyze content with PlantUML diagrams', async () => {
      const content = `# Document with PlantUML

Here is some content.

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi there
@enduml
\`\`\`

Some more text.

\`\`\`plantuml
@startuml
class User {
  +name: string
  +email: string
}
class Order {
  +id: number
  +amount: number
}
User ||--o{ Order
@enduml
\`\`\`

And more content with normal code:

\`\`\`javascript
console.log('This is not PlantUML');
\`\`\`
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.mediaElements.hasPlantUMLDiagrams).toBe(true);
      expect(analysis.mediaElements.plantUMLCount).toBe(2);
      expect(analysis.mediaElements.hasDiagrams).toBe(true);
      expect(analysis.codeBlocks).toHaveLength(3); // 2 PlantUML + 1 JavaScript
    });

    it('should detect PlantUML in @startuml format', async () => {
      const content = `# Document with Direct PlantUML

Some content here.

The system architecture is shown below:

@startuml
participant User
participant System
participant Database

User -> System: Request
System -> Database: Query
Database -> System: Result
System -> User: Response
@enduml

More content continues here.
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.mediaElements.hasPlantUMLDiagrams).toBe(true);
      expect(analysis.mediaElements.plantUMLCount).toBe(1);
      expect(analysis.mediaElements.hasDiagrams).toBe(true);
    });

    it('should not detect PlantUML in other code blocks', async () => {
      const content = `# Document without PlantUML

\`\`\`java
@Component
public class UserService {
  // This is not PlantUML even though it has @
}
\`\`\`

\`\`\`mermaid
graph TD
  A --> B
  B --> C
\`\`\`

\`\`\`python
print("@startuml is just a string here")
\`\`\`
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.mediaElements.hasPlantUMLDiagrams).toBe(false);
      expect(analysis.mediaElements.plantUMLCount).toBe(0);
      expect(analysis.mediaElements.hasDiagrams).toBe(true); // Still has diagrams due to mermaid
    });

    it('should handle complex tables correctly', async () => {
      const content = `# Document with Complex Tables

## Simple Table
| A | B |
|---|---|
| 1 | 2 |

## Complex Table
| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 | Col7 | Col8 | Col9 | Col10 |
|------|------|------|------|------|------|------|------|------|-------|
| Data | Data | Data | Data | Data | Data | Data | Data | Data | Data  |
| More | More | More | More | More | More | More | More | More | More  |
| Info | Info | Info | Info | Info | Info | Info | Info | Info | Info  |
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.tables).toHaveLength(2);
      expect(analysis.tables[0].complexity).toBe('simple');
      expect(analysis.tables[1].complexity).toBe('complex');
      expect(analysis.tables[1].columns).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed markdown gracefully', async () => {
      const content = `# Incomplete heading

## Another heading
Missing closing for code block:
\`\`\`javascript
console.log("unclosed");

| Malformed | table
|-----------|
| Missing cell

[Link with no URL]()
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis).toBeDefined();
      expect(analysis.headingStructure.totalHeadings).toBe(2);
    });

    it('should handle very large content efficiently', async () => {
      const largeContent = `# Large Document\n\n${'This is repeated content. '.repeat(10000)}`;

      const startTime = Date.now();
      const analysis = await analyzer.analyzeContent(largeContent);
      const endTime = Date.now();

      expect(analysis).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(analysis.wordCount).toBeGreaterThan(20000);
    });
  });
});
