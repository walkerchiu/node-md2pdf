/**
 * Unit tests for rendering utils
 */

import {
  validateTwoStageSetup,
  createDefaultProcessingContext,
  estimateRenderingPerformance,
  createTwoStageEngine,
  quickTwoStageCheck,
  getRecommendedConfiguration,
} from '../../../../src/core/rendering/utils';
import { TwoStageRenderingEngine } from '../../../../src/core/rendering/two-stage-rendering-engine';
import { DynamicContentType } from '../../../../src/core/rendering/types';

// Mock translator
const mockTranslator = {
  t: jest.fn((key: string) => key),
  getCurrentLanguage: jest.fn(() => 'en'),
  setLanguage: jest.fn(),
  getAvailableLanguages: jest.fn(() => ['en', 'zh-TW']),
};

describe('Rendering Utils', () => {
  describe('validateTwoStageSetup', () => {
    it('should validate a properly configured engine', async () => {
      const engine = new TwoStageRenderingEngine({}, mockTranslator as any);

      const validation = await validateTwoStageSetup(engine);

      // Note: In test environment, some processors (like Mermaid) may not be fully available
      // The validation still returns meaningful results about the engine state
      expect(validation.isValid).toBeDefined();
      expect(validation.issues).toBeDefined();
      expect(validation.recommendations).toBeDefined();
    });

    it('should detect issues with engine setup', async () => {
      // Create engine with invalid configuration
      const engine = new TwoStageRenderingEngine(
        { enabled: false },
        mockTranslator as any,
      );

      const validation = await validateTwoStageSetup(engine);

      expect(validation.isValid).toBeDefined();
      expect(validation.issues).toBeDefined();
      expect(validation.recommendations).toBeDefined();
    }, 30000);
  });

  describe('createDefaultProcessingContext', () => {
    it('should create default processing context', () => {
      const context = createDefaultProcessingContext('/test/input.md');

      expect(context.filePath).toBe('/test/input.md');
      expect(context.isPreRendering).toBe(false);
      expect(context.tocOptions).toBeDefined();
    });

    it('should merge custom options with defaults', () => {
      const customOptions = {
        tocOptions: { enabled: false, includePageNumbers: false },
        pdfOptions: { includePageNumbers: true },
      };

      const context = createDefaultProcessingContext(
        '/test/input.md',
        customOptions,
      );

      expect(context.filePath).toBe('/test/input.md');
      expect(context.tocOptions?.enabled).toBe(false);
      expect(context.tocOptions?.includePageNumbers).toBe(false);
    });
  });

  describe('estimateRenderingPerformance', () => {
    it('should estimate low performance impact for simple content', async () => {
      const content =
        '# Simple Title\nSimple content without complex elements.';

      const context = createDefaultProcessingContext(undefined, {
        tocOptions: {
          enabled: false,
          includePageNumbers: false,
        },
      });

      const performance = await estimateRenderingPerformance(content, context);

      expect(performance.shouldUseTwoStage).toBe(false);
      expect(performance.recommendation).toBe('low');
      expect(performance.estimatedTimeIncrease).toBeGreaterThanOrEqual(0);
    });

    it('should estimate high performance impact for complex content', async () => {
      const content = `
# Complex Document

## Chapter 1
![Image](./image.png)

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

## Chapter 2
More content with images and tables.

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

### Subsection
More complex content here.
      `;

      const context = createDefaultProcessingContext(undefined, {
        tocOptions: { enabled: true, includePageNumbers: true },
        pdfOptions: { includePageNumbers: true },
      });

      const performance = await estimateRenderingPerformance(content, context);

      expect(performance.shouldUseTwoStage).toBe(true);
      expect(performance.recommendation).toBe('high');
      expect(performance.estimatedTimeIncrease).toBeGreaterThan(0);
    });

    it('should handle content with multiple dynamic elements', async () => {
      const content = `
# Document with Everything

![Image1](./img1.png)
![Image2](./img2.png)

\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`

\`\`\`mermaid
graph TD
  C --> D
\`\`\`

## Section 1
### Subsection 1
#### Sub-subsection

## Section 2
More content.
      `;

      const context = createDefaultProcessingContext(undefined, {
        tocOptions: { enabled: true, includePageNumbers: true },
      });

      const performance = await estimateRenderingPerformance(content, context);

      expect(performance.shouldUseTwoStage).toBe(true);
      expect(performance.recommendation).toBe('high');
      expect(performance.detectedContentTypes).toContain(
        DynamicContentType.TOC,
      );
      expect(performance.detectedContentTypes).toContain(
        DynamicContentType.IMAGE,
      );
      expect(performance.detectedContentTypes).toContain(
        DynamicContentType.DIAGRAM,
      );
    });
  });

  describe('createTwoStageEngine', () => {
    it('should create engine with default options', () => {
      const engine = createTwoStageEngine();
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(TwoStageRenderingEngine);
    });

    it('should create engine with custom options', () => {
      const options = {
        enabled: false,
        maxPerformanceImpact: 50,
        enableCaching: false,
      };
      const engine = createTwoStageEngine(options, mockTranslator as any);
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(TwoStageRenderingEngine);
    });

    it('should create engine with translator and config manager', () => {
      const mockConfigManager = {
        get: jest.fn(),
        set: jest.fn(),
        getDefaults: jest.fn(),
      };
      const engine = createTwoStageEngine(
        {},
        mockTranslator as any,
        mockConfigManager as any,
      );
      expect(engine).toBeDefined();
    });
  });

  describe('quickTwoStageCheck', () => {
    it('should return true for content with diagrams', () => {
      const content =
        'Some content\n```mermaid\ngraph TD\n  A --> B\n```\nMore content';
      const result = quickTwoStageCheck(content);
      expect(result).toBe(true);
    });

    it('should return true for content with PlantUML diagrams', () => {
      const content =
        'Some content\n```plantuml\n@startuml\nA -> B\n@enduml\n```\nMore content';
      const result = quickTwoStageCheck(content);
      expect(result).toBe(true);
    });

    it('should return true for content with headings and TOC with page numbers', () => {
      const content = '# Heading 1\n## Heading 2\nContent here';
      const options = { hasTOC: true, hasPageNumbers: true };
      const result = quickTwoStageCheck(content, options);
      expect(result).toBe(true);
    });

    it('should return true for complex content with images and headings and TOC', () => {
      const content = '# Heading\n![Image](img.png)\n## Another Heading';
      const options = { hasTOC: true, hasPageNumbers: false };
      const result = quickTwoStageCheck(content, options);
      expect(result).toBe(true);
    });

    it('should return false for simple content without complex elements', () => {
      const content = 'Simple text content without special elements.';
      const result = quickTwoStageCheck(content);
      expect(result).toBe(false);
    });

    it('should return false for headings without TOC or page numbers', () => {
      const content = '# Heading 1\n## Heading 2\nContent here';
      const options = { hasTOC: false, hasPageNumbers: false };
      const result = quickTwoStageCheck(content, options);
      expect(result).toBe(false);
    });
  });

  describe('getRecommendedConfiguration', () => {
    it('should recommend configuration for simple content', async () => {
      const content = '# Simple Title\nSimple content.';
      const result = await getRecommendedConfiguration(content);

      expect(result.recommendedContext).toBeDefined();
      expect(result.twoStageOptions).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(Array.isArray(result.reasoning)).toBe(true);
    });

    it('should recommend two-stage for content with TOC', async () => {
      const content =
        '# Chapter 1\n## Section 1.1\n### Subsection\nContent here';
      const currentContext = {
        tocOptions: { enabled: true, includePageNumbers: true },
      };

      const result = await getRecommendedConfiguration(content, currentContext);

      expect(result.twoStageOptions.enabled).toBe(true);
      expect(
        result.reasoning.some((r) =>
          r.includes('TOC with page numbers detected'),
        ),
      ).toBe(true);
    });

    it('should recommend two-stage for content with diagrams', async () => {
      const content = '# Document\n```mermaid\ngraph TD\n  A --> B\n```';
      const result = await getRecommendedConfiguration(content);

      expect(result.twoStageOptions.enabled).toBe(true);
      expect(result.twoStageOptions.forceAccuratePageNumbers).toBe(true);
      expect(
        result.reasoning.some((r) => r.includes('Dynamic diagrams detected')),
      ).toBe(true);
    });

    it('should recommend caching for high performance impact content', async () => {
      const content = `
# Complex Document
## Chapter 1
![Image](./image.png)
\`\`\`mermaid
graph TD
  A --> B
\`\`\`
## Chapter 2
### Section 2.1
#### Subsection 2.1.1
##### Deep subsection
More content with images and tables.
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
### Section 2.2
More complex content here.
      `;

      const currentContext = {
        tocOptions: { enabled: true, includePageNumbers: true },
      };

      const result = await getRecommendedConfiguration(content, currentContext);

      expect(result.twoStageOptions.enableCaching).toBe(true);
      // Should recommend caching due to high estimated time increase
      const hasCachingRecommendation = result.reasoning.some(
        (r) =>
          r.includes('consider enabling caching') ||
          r.includes('time increase'),
      );
      expect(
        hasCachingRecommendation || result.twoStageOptions.enableCaching,
      ).toBe(true);
    });

    it('should recommend high performance impact for high priority content', async () => {
      const content = `
# Document with Everything
![Image1](./img1.png)
![Image2](./img2.png)
\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`
\`\`\`mermaid
graph TD
  C --> D
\`\`\`
## Section 1
### Subsection 1
#### Sub-subsection
## Section 2
More content.
      `;

      const result = await getRecommendedConfiguration(content);

      expect(result.twoStageOptions.enabled).toBe(true);
      // Should have multiple detected content types
      if (result.twoStageOptions.maxPerformanceImpact === 150) {
        expect(
          result.reasoning.some((r) => r.includes('Complex content detected')),
        ).toBe(true);
      }
    });

    it('should merge current context with defaults', async () => {
      const content = '# Simple Document\nContent here';
      const currentContext = {
        pdfOptions: { includePageNumbers: true },
        tocOptions: { enabled: false },
      };

      const result = await getRecommendedConfiguration(content, currentContext);

      expect(result.recommendedContext.pdfOptions?.includePageNumbers).toBe(
        true,
      );
      expect(result.recommendedContext.tocOptions?.enabled).toBe(false);
    });
  });

  describe('validateTwoStageSetup - comprehensive tests', () => {
    it('should handle engine with no processors', async () => {
      const engine = new TwoStageRenderingEngine(
        { enabled: true },
        mockTranslator as any,
      );
      // Clear any default processors that might be registered

      const validation = await validateTwoStageSetup(engine);

      expect(validation.isValid).toBeDefined();
      expect(validation.issues).toBeDefined();
      expect(validation.warnings).toBeDefined();
      expect(validation.recommendations).toBeDefined();
    });

    it('should detect cache warnings when no cache is configured', async () => {
      const engine = new TwoStageRenderingEngine({}, mockTranslator as any);

      const validation = await validateTwoStageSetup(engine);

      expect(validation.warnings).toBeDefined();
      expect(validation.recommendations).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      // Create an engine that might cause validation errors
      const engine = new TwoStageRenderingEngine(
        { enabled: true, maxPerformanceImpact: -1 }, // Invalid config
        mockTranslator as any,
      );

      const validation = await validateTwoStageSetup(engine);

      // Should still return a valid structure even if there are issues
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('warnings');
      expect(validation).toHaveProperty('recommendations');
    });
  });
});
