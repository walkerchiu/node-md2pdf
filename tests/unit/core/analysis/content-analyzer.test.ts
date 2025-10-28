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
      expect(analysis.mediaElements.hasMermaidDiagrams).toBe(false);
      expect(analysis.mediaElements.mermaidCount).toBe(0);
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
      expect(analysis.mediaElements.hasMermaidDiagrams).toBe(false);
      expect(analysis.mediaElements.mermaidCount).toBe(0);
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
      expect(analysis.mediaElements.hasMermaidDiagrams).toBe(false);
      expect(analysis.mediaElements.mermaidCount).toBe(0);
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
      expect(analysis.mediaElements.hasMermaidDiagrams).toBe(true); // Has mermaid diagram
      expect(analysis.mediaElements.mermaidCount).toBe(1);
      expect(analysis.mediaElements.hasDiagrams).toBe(true); // Still has diagrams due to mermaid
    });

    it('should analyze content with Mermaid diagrams', async () => {
      const content = `# Document with Mermaid

Here is some content.

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action 1]
    C -->|No| E[Action 2]
    D --> F[End]
    E --> F
\`\`\`

Some more text.

\`\`\`mermaid
sequenceDiagram
    participant Alice
    participant Bob
    participant Charlie
    Alice->>Bob: Hello Bob
    Bob->>Charlie: Hello Charlie
    Charlie->>Alice: Hello Alice
\`\`\`

And more content with normal code:

\`\`\`javascript
console.log('This is not Mermaid');
\`\`\`
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.mediaElements.hasMermaidDiagrams).toBe(true);
      expect(analysis.mediaElements.mermaidCount).toBe(2);
      expect(analysis.mediaElements.hasDiagrams).toBe(true);
      expect(analysis.codeBlocks).toHaveLength(3); // 2 Mermaid + 1 JavaScript
    });

    it('should detect different Mermaid diagram types', async () => {
      const content = `# Document with Various Mermaid Diagrams

## Flowchart
\`\`\`mermaid
flowchart TD
    A --> B
    B --> C
\`\`\`

## Class Diagram
\`\`\`mermaid
classDiagram
    class Animal {
        +name: string
        +age: int
        +makeSound()
    }
    class Dog {
        +breed: string
        +bark()
    }
    Animal <|-- Dog
\`\`\`

## State Diagram
\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
\`\`\`
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.mediaElements.hasMermaidDiagrams).toBe(true);
      expect(analysis.mediaElements.mermaidCount).toBe(3);
      expect(analysis.mediaElements.hasDiagrams).toBe(true);
    });

    it('should not detect Mermaid in other code blocks', async () => {
      const content = `# Document without Mermaid

\`\`\`yaml
# This is not Mermaid even though it mentions mermaid
mermaid_config:
  theme: default
\`\`\`

\`\`\`javascript
// This code mentions mermaid but isn't a diagram
const mermaidConfig = { theme: 'dark' };
\`\`\`

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.mediaElements.hasMermaidDiagrams).toBe(false);
      expect(analysis.mediaElements.mermaidCount).toBe(0);
      expect(analysis.mediaElements.hasPlantUMLDiagrams).toBe(true); // Still has PlantUML
      expect(analysis.mediaElements.hasDiagrams).toBe(true); // Still has diagrams due to PlantUML
    });

    it('should detect both PlantUML and Mermaid diagrams', async () => {
      const content = `# Document with Mixed Diagrams

## PlantUML Sequence
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi
@enduml
\`\`\`

## Mermaid Flowchart
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

## Another PlantUML
@startuml
class User {
  +name: string
  +email: string
}
@enduml

## Another Mermaid
\`\`\`mermaid
sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System->>User: Response
\`\`\`
`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.mediaElements.hasPlantUMLDiagrams).toBe(true);
      expect(analysis.mediaElements.plantUMLCount).toBe(2);
      expect(analysis.mediaElements.hasMermaidDiagrams).toBe(true);
      expect(analysis.mediaElements.mermaidCount).toBe(2);
      expect(analysis.mediaElements.hasDiagrams).toBe(true);
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

  describe('File Analysis', () => {
    it('should analyze file correctly', async () => {
      // Mock fs.readFileSync for testing
      const fs = require('fs');
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn().mockReturnValue(`# Test File

This is a test file with some content.

## Section
More content here.`);

      const analysis = await analyzer.analyzeFile('/fake/path.md');

      expect(analysis).toBeDefined();
      expect(analysis.headingStructure.totalHeadings).toBe(2);
      expect(analysis.wordCount).toBeGreaterThan(0);

      // Restore original function
      fs.readFileSync = originalReadFileSync;
    });

    it('should handle file reading errors', async () => {
      const fs = require('fs');
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(
        analyzer.analyzeFile('/nonexistent/path.md'),
      ).rejects.toThrow(
        'Unable to read file: /nonexistent/path.md. Error: File not found',
      );

      // Restore original function
      fs.readFileSync = originalReadFileSync;
    });
  });

  describe('Language Detection Edge Cases', () => {
    it('should handle content with no alphabetic characters', async () => {
      const content = `# 123

456 789

| 1 | 2 |
|---|---|
| 3 | 4 |`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.languageDetection.primary).toBe('en');
      expect(analysis.languageDetection.confidence).toBe(0.5);
      expect(analysis.languageDetection.chineseCharacterRatio).toBe(0);
      expect(analysis.languageDetection.needsChineseSupport).toBe(false);
      expect(analysis.languageDetection.detectedLanguages).toEqual([]);
    });

    it('should detect mostly Chinese content', async () => {
      const content = `# 中文文檔

這是一個完全使用中文撰寫的文檔。

## 第一節

包含很多中文內容的段落，用來測試語言檢測功能。

### 子節

更多中文內容。`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.languageDetection.primary).toBe('zh-TW');
      expect(analysis.languageDetection.confidence).toBeGreaterThan(0.5);
      expect(analysis.languageDetection.chineseCharacterRatio).toBeGreaterThan(
        0.5,
      );
      expect(analysis.languageDetection.needsChineseSupport).toBe(true);
    });

    it('should detect low Chinese content', async () => {
      const content = `# English Document

This is mostly an English document with just a few Chinese characters: 中文.

## Section

Lots of English content here to test the language detection system.

The Chinese ratio should be low.`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.languageDetection.primary).toBe('en');
      expect(analysis.languageDetection.confidence).toBeGreaterThan(0.5);
      expect(analysis.languageDetection.chineseCharacterRatio).toBeLessThan(
        0.1,
      );
      expect(analysis.languageDetection.needsChineseSupport).toBe(false);
    });
  });

  describe('Document Type Detection', () => {
    it('should detect business report correctly', async () => {
      const content = `# Quarterly Business Report

## Executive Summary

This quarter's revenue has increased significantly. Our analysis shows strong growth.

## Financial Analysis

The company has shown strong quarterly revenue growth in all sectors.

### Revenue Growth
- Q1: $1M
- Q2: $1.2M
- Q3: $1.5M

## Summary

The quarterly results demonstrate solid performance.`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.contentComplexity.documentType).toBe('business-report');
    });

    it('should detect tutorial correctly', async () => {
      const content = `# Step by Step Tutorial

## How to Complete This Tutorial

Follow these steps to get started with this tutorial.

### Step 1: Preparation

First, prepare your workspace for this step-by-step tutorial.

### Step 2: Practice

Complete this guide step by step.

### Step 3: Review

Review what you learned in this tutorial.

This tutorial guide will walk you through each step.`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.contentComplexity.documentType).toBe('tutorial');
    });

    it('should detect documentation correctly', async () => {
      const content = `# Project Documentation

## Getting Started

This documentation explains how to use the project. This section covers usage patterns.

## Usage Examples

Here are some examples showing usage of the features.

### Basic Usage Examples

Simple examples of basic functionality in this documentation.

### Advanced Usage Examples

More complex usage patterns documented here.

## User Documentation

Available documentation for users.`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.contentComplexity.documentType).toBe('documentation');
    });

    it('should default to article for generic content', async () => {
      const content = `# Random Article

This is just some random content that doesn't match any specific document type patterns.

## Some Section

Just regular content here without specific keywords.

Nothing special about this document.`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.contentComplexity.documentType).toBe('article');
    });
  });

  describe('Link Analysis Edge Cases', () => {
    it('should categorize different link types correctly', async () => {
      const content = `# Document with Various Links

[Internal anchor](#section)
[Relative path](./file.md)
[Parent directory](../other.md)
[External link](https://example.com)
[HTTP link](http://example.com)
[FTP link](ftp://files.example.com)
[Footnote reference][^1] and another footnote marker.

[^1]: This is a footnote.`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.links.internal).toBe(3); // #, ./, ../
      expect(analysis.links.external).toBe(2); // http, https (ftp not counted)
      expect(analysis.links.hasFootnotes).toBe(true);
    });

    it('should handle malformed links', async () => {
      const content = `# Document with Malformed Links

[Link without URL]()
[](Empty link text)
[Incomplete link
[Another incomplete](
]Backwards bracket](`;

      const analysis = await analyzer.analyzeContent(content);

      // Should handle gracefully without crashing
      expect(analysis.links).toBeDefined();
    });
  });

  describe('Reading Time Calculation', () => {
    it('should calculate reading time correctly', async () => {
      const words200 = Array(199).fill('word').join(' ');
      const content = `# Document\n\n${words200}`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.readingTime).toBe(1); // 200 words / 200 wpm = 1 minute
      expect(analysis.wordCount).toBe(200); // 199 + "Document" = 200
    });

    it('should round up reading time', async () => {
      const words150 = Array(150).fill('word').join(' ');
      const content = `# Document\n\n${words150}`;

      const analysis = await analyzer.analyzeContent(content);

      expect(analysis.readingTime).toBe(1); // 150 words / 200 wpm = 0.75, rounded up to 1
    });
  });
});
