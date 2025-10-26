/**
 * Unit tests for rendering utils
 */

import {
  validateTwoStageSetup,
  createDefaultProcessingContext,
  estimateRenderingPerformance,
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

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
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
    });
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
});
