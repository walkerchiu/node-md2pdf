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
});
