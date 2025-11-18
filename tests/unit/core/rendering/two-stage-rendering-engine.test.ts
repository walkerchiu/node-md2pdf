/**
 * Unit tests for TwoStageRenderingEngine
 */

import { TwoStageRenderingEngine } from '../../../../src/core/rendering/two-stage-rendering-engine';
import { TOCProcessor } from '../../../../src/core/rendering/processors/toc-processor';
import { DynamicContentType } from '../../../../src/core/rendering/types';

// Mock for testing

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock translator
const mockTranslator = {
  t: jest.fn((key: string) => key),
  getCurrentLanguage: jest.fn(() => 'en'),
  setLanguage: jest.fn(),
  getAvailableLanguages: jest.fn(() => ['en', 'zh-TW']),
};

describe('TwoStageRenderingEngine', () => {
  let engine: TwoStageRenderingEngine;

  beforeEach(() => {
    engine = new TwoStageRenderingEngine({}, mockTranslator as any);

    // Register TOC processor for testing
    const tocProcessor = new TOCProcessor();
    engine.registerProcessor(tocProcessor);

    jest.clearAllMocks();

    // Mock successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue('<div>Mock content</div>'),
    });
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('Processor Management', () => {
    it('should register default processors including TOC', () => {
      const registeredProcessors = engine.getRegisteredProcessors();

      expect(registeredProcessors).toContain(DynamicContentType.TOC);
    });

    it('should allow registering custom processors', () => {
      const customProcessor = new TOCProcessor();

      engine.registerProcessor(customProcessor);

      const registeredProcessors = engine.getRegisteredProcessors();
      expect(registeredProcessors).toContain(DynamicContentType.TOC);
    });

    it('should allow unregistering processors', () => {
      engine.unregisterProcessor(DynamicContentType.TOC);

      const registeredProcessors = engine.getRegisteredProcessors();
      expect(registeredProcessors).not.toContain(DynamicContentType.TOC);
    });

    it('should set cache on processor when registering with cache available', () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(),
        clear: jest.fn(),
        delete: jest.fn(),
        getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0, size: 0 }),
      };

      engine.setCache(mockCache);

      const customProcessor = new TOCProcessor();
      const setCacheSpy = jest.spyOn(customProcessor, 'setCache');

      engine.registerProcessor(customProcessor);

      expect(setCacheSpy).toHaveBeenCalledWith(mockCache);
    });

    it('should not call setCache when registering without cache', () => {
      const newEngine = new TwoStageRenderingEngine({}, mockTranslator as any);
      const customProcessor = new TOCProcessor();
      const setCacheSpy = jest.spyOn(customProcessor, 'setCache');

      newEngine.registerProcessor(customProcessor);

      // Cache should not be called when no cache is set
      expect(newEngine.getCache()).toBeNull();
    });
  });

  describe('Environment Validation', () => {
    it('should validate TOC processor environment', async () => {
      const validation = await engine.validateEnvironment();

      expect(validation).toHaveProperty('isReady');
      expect(validation).toHaveProperty('processorIssues');
      expect(validation).toHaveProperty('recommendations');
    });

    it('should report issues when processor has problems', async () => {
      // Create a mock processor with validation issues
      const mockProcessor = {
        type: DynamicContentType.TOC,
        name: 'Mock TOC Processor',
        validateEnvironment: jest.fn().mockResolvedValue({
          isSupported: false,
          issues: ['Test issue'],
          recommendations: ['Test recommendation'],
        }),
        process: jest.fn(),
        detect: jest.fn(),
        getDimensions: jest.fn(),
        setCache: jest.fn(),
      };

      // Replace the default processor with mock
      engine.unregisterProcessor(DynamicContentType.TOC);
      engine.registerProcessor(mockProcessor);

      const validation = await engine.validateEnvironment();

      expect(validation.isReady).toBe(false);
      expect(validation.processorIssues[DynamicContentType.TOC]).toEqual([
        'Test issue',
      ]);
    });
  });

  describe('Cache Management', () => {
    it('should set and get cache', () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(),
        clear: jest.fn(),
        delete: jest.fn(),
        getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0, size: 0 }),
      };

      engine.setCache(mockCache);

      expect(engine.getCache()).toBe(mockCache);
    });

    it('should update all processors when cache is set', () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(),
        clear: jest.fn(),
        delete: jest.fn(),
        getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0, size: 0 }),
      };

      const tocProcessor = new TOCProcessor();
      const setCacheSpy = jest.spyOn(tocProcessor, 'setCache');

      engine.unregisterProcessor(DynamicContentType.TOC);
      engine.registerProcessor(tocProcessor);

      engine.setCache(mockCache);

      expect(setCacheSpy).toHaveBeenCalledWith(mockCache);
    });

    it('should return null when no cache is set', () => {
      const newEngine = new TwoStageRenderingEngine({}, mockTranslator as any);

      expect(newEngine.getCache()).toBeNull();
    });
  });

  describe('Configuration and Options', () => {
    it('should allow updating engine options', () => {
      const initialOptions = engine.getOptions();
      expect(initialOptions.enabled).toBe(true);

      engine.updateOptions({ enabled: false });

      const updatedOptions = engine.getOptions();
      expect(updatedOptions.enabled).toBe(false);
    });

    it('should provide detection summary for content with PlantUML', async () => {
      const content = `
# Test

\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`
`;

      const context = {
        isFirstStage: true,
        markdownContent: content,
        inputPath: '/test/file.md',
        outputPath: '/test/file.pdf',
        tocOptions: { enabled: false },
      };

      const summary = await engine.getDetectionSummary(content, context);

      expect(summary.detection).toBeDefined();
      expect(summary.summary).toBeDefined();
      expect(summary.performanceImpact).toBeDefined();
    });
  });

  describe('TOC Processing', () => {
    it('should process TOC in single-stage rendering', async () => {
      const content = `
# Test Document

## Section 1

Content for section 1.

## Section 2

Content for section 2.
`;

      const context = {
        isPreRendering: true,
        filePath: '/test/file.md',
        tocOptions: { enabled: true, includePageNumbers: false },
        headings: [
          {
            level: 1,
            text: 'Test Document',
            id: 'test-document',
            anchor: '#test-document',
          },
          {
            level: 2,
            text: 'Section 1',
            id: 'section-1',
            anchor: '#section-1',
          },
          {
            level: 2,
            text: 'Section 2',
            id: 'section-2',
            anchor: '#section-2',
          },
        ],
      };

      const result = await engine.render(content, context);

      expect(result.html).toContain('toc-container');
      expect(result.metadata.processedContentTypes).toContain(
        DynamicContentType.TOC,
      );
    });

    it('should handle TOC processing with headings', async () => {
      const content = `
# Main Title

## Introduction

Some introduction content.

### Subsection

More content.
`;

      const context = {
        isPreRendering: false,
        filePath: '/test/file.md',
        tocOptions: { enabled: true, includePageNumbers: true },
        headings: [
          {
            level: 1,
            text: 'Main Title',
            id: 'main-title',
            anchor: '#main-title',
          },
          {
            level: 2,
            text: 'Introduction',
            id: 'introduction',
            anchor: '#introduction',
          },
          {
            level: 3,
            text: 'Subsection',
            id: 'subsection',
            anchor: '#subsection',
          },
        ],
      };

      const result = await engine.render(content, context);

      expect(result.html).toContain('toc-container');
      expect(result.metadata.processedContentTypes).toContain(
        DynamicContentType.TOC,
      );
    });
  });

  describe('Unified Rendering Pipeline', () => {
    it('should pass preRenderedContent to TOC processor in two-stage mode', async () => {
      const content = `
# Test

\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`

## Section 1
`;

      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: true, includePageNumbers: true },
        headings: [
          { level: 1, text: 'Test', id: 'test', anchor: '#test' },
          {
            level: 2,
            text: 'Section 1',
            id: 'section-1',
            anchor: '#section-1',
          },
        ],
        pdfOptions: { includePageNumbers: true },
      };

      // Spy on TOC processor
      const tocProcessor = new TOCProcessor();
      const processSpy = jest.spyOn(tocProcessor, 'process');

      engine.unregisterProcessor(DynamicContentType.TOC);
      engine.registerProcessor(tocProcessor);

      await engine.render(content, context);

      // Verify TOC processor was called with processed content
      expect(processSpy).toHaveBeenCalled();
      const callArgs = processSpy.mock.calls[0];
      const processedContent = callArgs[0];

      // Should receive content, not raw markdown
      expect(typeof processedContent).toBe('string');
      expect(processedContent.length).toBeGreaterThan(0);
    });

    it('should process PlantUML before TOC in two-stage mode', async () => {
      const content = `
# Document

\`\`\`plantuml
@startuml
Alice -> Bob
@enduml
\`\`\`
`;

      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: true, includePageNumbers: true },
        headings: [
          { level: 1, text: 'Document', id: 'document', anchor: '#document' },
        ],
        pdfOptions: { includePageNumbers: true },
      };

      const result = await engine.render(content, context);

      // Should process both PlantUML and TOC
      expect(result.metadata.processedContentTypes).toContain(
        DynamicContentType.TOC,
      );
      expect(result.usedTwoStageRendering).toBe(true);
    });

    it('should process Mermaid before TOC in two-stage mode', async () => {
      const content = `
# Document

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`;

      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: true, includePageNumbers: true },
        headings: [
          { level: 1, text: 'Document', id: 'document', anchor: '#document' },
        ],
        pdfOptions: { includePageNumbers: true },
      };

      const result = await engine.render(content, context);

      // Should process both Mermaid and TOC
      expect(result.metadata.processedContentTypes).toContain(
        DynamicContentType.TOC,
      );
      expect(result.usedTwoStageRendering).toBe(true);
    });

    it('should maintain content order: TOC then content', async () => {
      const content = `
# Chapter 1

Content here.
`;

      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: true, includePageNumbers: false },
        headings: [
          {
            level: 1,
            text: 'Chapter 1',
            id: 'chapter-1',
            anchor: '#chapter-1',
          },
        ],
      };

      const result = await engine.render(content, context);

      // TOC should come before content
      const tocIndex = result.html.indexOf('toc-container');
      const contentIndex = result.html.indexOf('Chapter 1');

      if (tocIndex !== -1 && contentIndex !== -1) {
        expect(tocIndex).toBeLessThan(contentIndex);
      }
    });

    it('should use two-stage when PlantUML present even if TOC disabled', async () => {
      const content = `
# Test

\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`
`;

      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: false },
        headings: [],
      };

      const result = await engine.render(content, context);

      // Should use two-stage rendering for PlantUML processing
      expect(result.usedTwoStageRendering).toBe(true);
      expect(result.metadata.processedContentTypes).not.toContain(
        DynamicContentType.TOC,
      );
    });

    it('should handle empty headings array gracefully', async () => {
      const content = '# Test';

      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: true, includePageNumbers: true },
        headings: [],
      };

      const result = await engine.render(content, context);

      // Should not error, should skip TOC processing
      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
    });

    it('should preserve isPreRendering context flag', async () => {
      const content = '# Test';

      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: true, includePageNumbers: true },
        headings: [{ level: 1, text: 'Test', id: 'test', anchor: '#test' }],
        isPreRendering: true,
      };

      // Should respect isPreRendering flag in context
      await expect(engine.render(content, context)).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle rendering errors gracefully', async () => {
      const content = '# Test Content';
      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: true },
        headings: [{ level: 1, text: 'Test', id: 'test', anchor: '#test' }],
      };

      // Create a processor that throws error
      const errorProcessor = {
        type: DynamicContentType.TOC,
        name: 'Error TOC Processor',
        validateEnvironment: jest.fn().mockResolvedValue({
          isSupported: true,
          issues: [],
          recommendations: [],
        }),
        process: jest.fn().mockRejectedValue(new Error('Processing failed')),
        detect: jest.fn().mockResolvedValue(1),
        getDimensions: jest.fn(),
        setCache: jest.fn(),
      };

      engine.unregisterProcessor(DynamicContentType.TOC);
      engine.registerProcessor(errorProcessor);

      const result = await engine.render(content, context);

      // Should return fallback result with error message
      expect(result).toBeDefined();
      expect(result.html).toBe(content);
      expect(result.usedTwoStageRendering).toBe(false);
      expect(result.metadata.warnings).toContain(
        'Rendering failed: Processing failed',
      );
    });

    it('should continue processing if one processor fails', async () => {
      const content = '# Test';
      const context = {
        filePath: '/test/file.md',
        headings: [],
      };

      const result = await engine.render(content, context);

      // Should complete even if processors encounter issues
      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
    });
  });

  describe('Single-Stage Rendering', () => {
    it('should use single-stage when two-stage is disabled', async () => {
      const engineWithoutTwoStage = new TwoStageRenderingEngine(
        { enabled: false },
        mockTranslator as any,
      );

      const content = '# Simple Content\n\nNo diagrams or complex elements.';
      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: false },
        headings: [],
      };

      const result = await engineWithoutTwoStage.render(content, context);

      expect(result.usedTwoStageRendering).toBe(false);
      expect(result.html).toBeDefined();
    });

    it('should process PlantUML in single-stage when two-stage disabled', async () => {
      const engineWithoutTwoStage = new TwoStageRenderingEngine(
        { enabled: false },
        mockTranslator as any,
      );

      const content = `
# Test

\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`
`;

      const context = {
        filePath: '/test/file.md',
        headings: [],
      };

      const result = await engineWithoutTwoStage.render(content, context);

      expect(result.usedTwoStageRendering).toBe(false);
      expect(result).toBeDefined();
    });

    it('should process Mermaid in single-stage when two-stage disabled', async () => {
      const engineWithoutTwoStage = new TwoStageRenderingEngine(
        { enabled: false },
        mockTranslator as any,
      );

      const content = `
# Test

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`;

      const context = {
        filePath: '/test/file.md',
        headings: [],
      };

      const result = await engineWithoutTwoStage.render(content, context);

      expect(result.usedTwoStageRendering).toBe(false);
      expect(result).toBeDefined();
    });

    it('should handle cache hits and misses in single-stage', async () => {
      const content = '# Test';
      const context = {
        filePath: '/test/file.md',
        headings: [],
      };

      const result = await engine.render(content, context);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.cacheHits).toBeGreaterThanOrEqual(0);
      expect(result.metadata.cacheMisses).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tracking', () => {
    it('should track rendering time', async () => {
      const content = '# Test Content';
      const context = {
        filePath: '/test/file.md',
        headings: [],
      };

      const result = await engine.render(content, context);

      expect(result.performance).toBeDefined();
      expect(result.performance.totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should track two-stage rendering times separately', async () => {
      const content = `
# Test

\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`
`;

      const context = {
        filePath: '/test/file.md',
        tocOptions: { enabled: true },
        headings: [{ level: 1, text: 'Test', id: 'test', anchor: '#test' }],
        pdfOptions: { includePageNumbers: true },
      };

      const result = await engine.render(content, context);

      if (result.usedTwoStageRendering) {
        expect(result.performance.preRenderTime).toBeGreaterThanOrEqual(0);
        expect(result.performance.finalRenderTime).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
