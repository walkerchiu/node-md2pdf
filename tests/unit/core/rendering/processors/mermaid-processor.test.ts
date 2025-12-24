/**
 * Mermaid Processor Tests
 * Tests Mermaid diagram rendering and processing
 */

import {
  MermaidProcessor,
  MermaidConfig,
} from '../../../../../src/core/rendering/processors/mermaid-processor';
import { ProcessingContext } from '../../../../../src/core/rendering/types';
import { MermaidRenderer } from '../../../../../src/utils/mermaid-renderer';

// Mock MermaidRenderer
jest.mock('../../../../../src/utils/mermaid-renderer');

describe('MermaidProcessor', () => {
  let processor: MermaidProcessor;
  let mockRenderer: jest.Mocked<MermaidRenderer>;

  beforeEach(() => {
    // Mock MermaidRenderer instance methods
    mockRenderer = {
      render: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    // Mock the static getInstance method
    (MermaidRenderer.getInstance as jest.Mock) = jest
      .fn()
      .mockReturnValue(mockRenderer);

    processor = new MermaidProcessor();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create processor with default config', () => {
      expect(processor).toBeInstanceOf(MermaidProcessor);
    });

    it('should create processor with custom config', () => {
      const config: MermaidConfig = {
        theme: 'dark',
        defaultWidth: 1000,
        defaultHeight: 800,
        timeout: 10000,
        enableCaching: true,
        backgroundColor: '#ffffff',
      };

      const customProcessor = new MermaidProcessor(config);
      expect(customProcessor).toBeInstanceOf(MermaidProcessor);
    });
  });

  describe('process', () => {
    const mockContext: ProcessingContext = {
      filePath: '/test/file.md',
    };

    it('should process mermaid diagram successfully', async () => {
      const content = `
# Test Document

\`\`\`mermaid
graph TD
  A-->B
\`\`\`

Some content after.
`;

      // Mock successful rendering
      mockRenderer.render.mockResolvedValue({
        svg: '<svg>test diagram</svg>',
        metadata: {
          width: 400,
          height: 300,
          renderTime: 100,
        },
      });

      const result = await processor.process(content, mockContext);

      expect(result).toBeDefined();
      expect(result.html).toContain('svg');
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should handle multiple mermaid diagrams', async () => {
      const content = `
\`\`\`mermaid
graph TD
  A-->B
\`\`\`

Some text

\`\`\`mermaid
sequenceDiagram
  A->>B: Hello
\`\`\`
      `;

      // Mock successful rendering
      mockRenderer.render.mockResolvedValue({
        svg: '<svg>test diagram</svg>',
        metadata: {
          width: 400,
          height: 300,
          renderTime: 100,
        },
      });

      const result = await processor.process(content, mockContext);

      expect(result).toBeDefined();
      expect(result.html).toContain('svg');
      expect(mockRenderer.render).toHaveBeenCalledTimes(2);
    });

    it('should handle HTML mermaid blocks', async () => {
      const content =
        '<pre class="language-mermaid"><code class="language-mermaid">graph TD\nA-->B</code></pre>';

      // Mock successful rendering
      mockRenderer.render.mockResolvedValue({
        svg: '<svg>test diagram</svg>',
        metadata: {
          width: 400,
          height: 300,
          renderTime: 100,
        },
      });

      const result = await processor.process(content, mockContext);

      expect(result).toBeDefined();
      expect(result.html).toContain('svg');
    });

    it('should handle rendering errors gracefully', async () => {
      const content = '\`\`\`mermaid\ninvalid mermaid syntax\n\`\`\`';

      mockRenderer.render.mockRejectedValue(new Error('Invalid syntax'));

      const result = await processor.process(content, mockContext);

      expect(result).toBeDefined();
      expect(result.html).toContain('mermaid-error'); // Should return error HTML on error
    });

    it('should handle empty content', async () => {
      const content = '';

      const result = await processor.process(content, mockContext);

      expect(result).toBeDefined();
      expect(result.html).toBe('');
      expect(mockRenderer.render).not.toHaveBeenCalled();
    });

    it('should handle content without mermaid diagrams', async () => {
      const content = '# Just a regular document\n\nNo diagrams here.';

      const result = await processor.process(content, mockContext);

      expect(result).toBeDefined();
      expect(result.html).toBe(content);
      expect(mockRenderer.render).not.toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    const mockContext: ProcessingContext = {
      filePath: '/test/file.md',
    };

    it('should process large diagram in reasonable time', async () => {
      const largeDiagram =
        '\`\`\`mermaid\ngraph TD\n' +
        Array(100)
          .fill(0)
          .map((_, i) => `  A${i}-->B${i}`)
          .join('\n') +
        '\n\`\`\`';

      // Mock successful rendering
      mockRenderer.render.mockResolvedValue({
        svg: '<svg>large diagram</svg>',
        metadata: {
          width: 800,
          height: 600,
          renderTime: 500,
        },
      });

      const startTime = Date.now();
      const result = await processor.process(largeDiagram, mockContext);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should process multiple diagrams in reasonable time', async () => {
      const multipleDiagrams = Array(5)
        .fill(0)
        .map((_, i) => `\`\`\`mermaid\ngraph TD\n  A${i}-->B${i}\n\`\`\``)
        .join('\n\n');

      // Mock successful rendering
      mockRenderer.render.mockResolvedValue({
        svg: '<svg>test diagram</svg>',
        metadata: {
          width: 400,
          height: 300,
          renderTime: 100,
        },
      });

      const startTime = Date.now();
      const result = await processor.process(multipleDiagrams, mockContext);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(2000);
      expect(mockRenderer.render).toHaveBeenCalledTimes(5);
    });
  });

  describe('detect', () => {
    const mockContext: ProcessingContext = {
      filePath: '/test/file.md',
    };

    it('should detect mermaid content with high confidence', async () => {
      const content = '```mermaid\ngraph TD\n  A-->B\n```';
      const confidence = await processor.detect(content, mockContext);

      expect(confidence).toBe(0.95);
    });

    it('should return 0 confidence for content without mermaid', async () => {
      const content = 'Just regular text content';
      const confidence = await processor.detect(content, mockContext);

      expect(confidence).toBe(0);
    });

    it('should detect HTML mermaid blocks', async () => {
      const content =
        '<pre class="language-mermaid"><code class="language-mermaid">graph TD\nA-->B</code></pre>';
      const confidence = await processor.detect(content, mockContext);

      expect(confidence).toBe(0.95);
    });
  });

  describe('calculateDimensions', () => {
    const mockContext: ProcessingContext = {
      filePath: '/test/file.md',
    };

    it('should return zero dimensions for content without mermaid', async () => {
      const content = 'No mermaid content here';
      const dimensions = await processor.calculateDimensions(
        content,
        mockContext,
      );

      expect(dimensions).toEqual({
        pageCount: 0,
        height: 0,
        width: 0,
      });
    });

    it('should calculate dimensions for simple diagram', async () => {
      const content = '```mermaid\ngraph TD\n  A-->B\n```';
      const dimensions = await processor.calculateDimensions(
        content,
        mockContext,
      );

      expect(dimensions.pageCount).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(dimensions.width).toBeGreaterThan(0);
    });

    it('should calculate dimensions for multiple diagrams', async () => {
      const content =
        '```mermaid\ngraph TD\n  A-->B\n```\n\n```mermaid\ngraph LR\n  C-->D\n```';
      const dimensions = await processor.calculateDimensions(
        content,
        mockContext,
      );

      expect(dimensions.pageCount).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(200); // Should be height of two diagrams
    });

    it('should analyze diagram complexity correctly', async () => {
      // Simple diagram (≤ 5 nodes)
      const simpleContent = '```mermaid\ngraph TD\n  A-->B\n  B-->C\n```';
      const simpleDims = await processor.calculateDimensions(
        simpleContent,
        mockContext,
      );

      // Complex diagram (> 15 nodes)
      const complexNodes = Array(20)
        .fill(0)
        .map((_, i) => `  Node${i}[Node${i}]`)
        .join('\n');
      const complexContent = `\`\`\`mermaid\ngraph TD\n${complexNodes}\n\`\`\``;
      const complexDims = await processor.calculateDimensions(
        complexContent,
        mockContext,
      );

      expect(complexDims.height).toBeGreaterThan(simpleDims.height);
    });
  });

  describe('getDimensions', () => {
    const mockContext: ProcessingContext = {
      filePath: '/test/file.md',
    };

    it('should get dimensions from processed content metadata', async () => {
      const processedContent = {
        html: '<div>processed</div>',
        metadata: {
          type: 'mermaid' as any,
          processingTime: 100,
          warnings: [],
          details: {
            diagramCount: 2,
          },
        },
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        mockContext,
      );

      expect(dimensions.pageCount).toBeGreaterThan(0);
      expect(dimensions.height).toBe(2 * 600); // 2 diagrams * default height
      expect(dimensions.width).toBe(800); // default width
      expect(dimensions.imagePositions).toEqual([]);
    });

    it('should handle metadata without diagram count', async () => {
      const processedContent = {
        html: '<div>processed</div>',
        metadata: {
          type: 'mermaid' as any,
          processingTime: 100,
          warnings: [],
          details: {},
        },
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        mockContext,
      );

      expect(dimensions.pageCount).toBe(1);
      expect(dimensions.height).toBe(0);
    });
  });

  describe('configuration management', () => {
    it('should get current configuration', () => {
      const config = processor.getConfig();

      expect(config).toEqual({
        theme: 'default',
        defaultWidth: 800,
        defaultHeight: 600,
        timeout: 10000,
        enableCaching: true,
        backgroundColor: 'white',
      });
    });

    it('should update configuration', () => {
      processor.updateConfig({
        theme: 'dark',
        defaultWidth: 1000,
        enableCaching: false,
      });

      const config = processor.getConfig();

      expect(config.theme).toBe('dark');
      expect(config.defaultWidth).toBe(1000);
      expect(config.enableCaching).toBe(false);
    });
  });

  describe('environment validation', () => {
    it('should validate environment through renderer', async () => {
      const mockValidation = {
        isSupported: true,
        issues: [],
        recommendations: [],
      };

      (mockRenderer as any).validateEnvironment = jest
        .fn()
        .mockResolvedValue(mockValidation);

      const result = await processor.validateEnvironment();

      expect(result).toEqual(mockValidation);
      expect(mockRenderer.validateEnvironment).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup renderer resources', async () => {
      (mockRenderer as any).cleanup = jest.fn().mockResolvedValue(undefined);

      await processor.cleanup();

      expect(mockRenderer.cleanup).toHaveBeenCalled();
    });
  });

  describe('caching functionality', () => {
    let cachingProcessor: MermaidProcessor;

    beforeEach(() => {
      cachingProcessor = new MermaidProcessor({ enableCaching: true });
      // Mock the renderer for this processor too
      (MermaidRenderer.getInstance as jest.Mock).mockReturnValue(mockRenderer);
    });

    it('should return cached content when available', async () => {
      const mockContext: ProcessingContext = { filePath: '/test/file.md' };
      const content = '```mermaid\ngraph TD\nA-->B\n```';

      // Mock getCachedContent to return a cached result
      (cachingProcessor as any).getCachedContent = jest.fn().mockResolvedValue({
        html: '<cached>result</cached>',
        metadata: { type: 'mermaid', processingTime: 50, warnings: [] },
      });

      const result = await cachingProcessor.process(content, mockContext);

      expect(result.html).toBe('<cached>result</cached>');
      expect(mockRenderer.render).not.toHaveBeenCalled();
    });

    it('should cache results after processing', async () => {
      const mockContext: ProcessingContext = { filePath: '/test/file.md' };
      const content = '```mermaid\ngraph TD\nA-->B\n```';

      // Mock setCachedContent to track caching
      const setCachedContentSpy = jest.fn().mockResolvedValue(undefined);
      (cachingProcessor as any).setCachedContent = setCachedContentSpy;
      (cachingProcessor as any).getCachedContent = jest
        .fn()
        .mockResolvedValue(null);

      mockRenderer.render.mockResolvedValue({
        svg: '<svg>test</svg>',
        metadata: { width: 400, height: 300, renderTime: 100 },
      });

      await cachingProcessor.process(content, mockContext);

      expect(setCachedContentSpy).toHaveBeenCalled();
    });
  });

  describe('error handling edge cases', () => {
    const mockContext: ProcessingContext = {
      filePath: '/test/file.md',
    };

    it('should handle general processing errors gracefully', async () => {
      const content = '```mermaid\ngraph TD\nA-->B\n```';

      // Mock extractMermaidBlocks to throw an error
      (processor as any).extractMermaidBlocks = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Extraction failed');
        });

      const result = await processor.process(content, mockContext);

      expect(result.html).toBe(content); // Should return original content
      expect(result.metadata.warnings).toContain(
        'Mermaid processing failed: Extraction failed',
      );
    });

    it('should handle invalid mermaid syntax', async () => {
      const content = '```mermaid\ninvalid syntax that will fail\n```';

      mockRenderer.render.mockRejectedValue(
        new Error('Invalid mermaid syntax'),
      );

      const result = await processor.process(content, mockContext);

      expect(result.html).toContain('mermaid-error');
      expect(result.html).toContain('Invalid mermaid syntax');
      expect(result.metadata.warnings).toContain(
        'Failed to render Mermaid diagram: Invalid mermaid syntax',
      );
    });
  });

  describe('diagram complexity analysis', () => {
    it('should correctly analyze simple diagrams', () => {
      const simpleCode = 'graph TD\nA[Start] --> B[End]';
      const complexity = (processor as any).analyzeComplexity(simpleCode);

      expect(complexity).toBe('simple');
    });

    it('should correctly analyze medium complexity diagrams', () => {
      const mediumCode =
        'graph TD\n' +
        Array(10)
          .fill(0)
          .map((_, i) => `A${i}[Node${i}]`)
          .join('\n');
      const complexity = (processor as any).analyzeComplexity(mediumCode);

      expect(complexity).toBe('medium');
    });

    it('should correctly analyze complex diagrams', () => {
      const complexCode =
        'graph TD\n' +
        Array(20)
          .fill(0)
          .map((_, i) => `A${i}[Node${i}]`)
          .join('\n');
      const complexity = (processor as any).analyzeComplexity(complexCode);

      expect(complexity).toBe('complex');
    });

    it('should estimate height based on complexity', () => {
      const simpleHeight = (processor as any).estimateHeight('simple');
      const mediumHeight = (processor as any).estimateHeight('medium');
      const complexHeight = (processor as any).estimateHeight('complex');

      expect(simpleHeight).toBe(200);
      expect(mediumHeight).toBe(400);
      expect(complexHeight).toBe(600);
    });

    it('should handle unknown complexity', () => {
      const defaultHeight = (processor as any).estimateHeight('unknown' as any);
      expect(defaultHeight).toBe(600); // Should return default height
    });
  });

  describe('HTML generation', () => {
    it('should create proper diagram HTML', () => {
      const svg = '<svg>test</svg>';
      const originalCode = 'graph TD\nA-->B';
      const metadata = { width: 400, height: 300, renderTime: 150 };

      const html = (processor as any).createDiagramHTML(
        svg,
        originalCode,
        metadata,
      );

      expect(html).toContain('<div class="mermaid-diagram"');
      expect(html).toContain('<svg>test</svg>');
      expect(html).toContain('150ms');
      expect(html).toContain('400x300');
      expect(html).toContain('graph TD');
    });

    it('should create diagram HTML without metadata', () => {
      const svg = '<svg>test</svg>';
      const originalCode = 'graph TD\nA-->B';

      const html = (processor as any).createDiagramHTML(svg, originalCode);

      expect(html).toContain('<div class="mermaid-diagram"');
      expect(html).toContain('<svg>test</svg>');
      expect(html).toContain('unknownms');
      expect(html).toContain('unknownxunknown');
    });

    it('should create fallback HTML on error', () => {
      const originalCode = 'graph TD\nA-->B';
      const errorMessage = 'Rendering failed';

      const html = (processor as any).createFallbackHTML(
        originalCode,
        errorMessage,
      );

      expect(html).toContain('<div class="mermaid-error"');
      expect(html).toContain('⚠️  Mermaid Diagram Error');
      expect(html).toContain('Rendering failed');
      expect(html).toContain('graph TD');
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent cache keys', () => {
      const content = 'test content';
      const key1 = (processor as any).generateCacheKey(content);
      const key2 = (processor as any).generateCacheKey(content);

      expect(key1).toBe(key2);
      expect(key1).toContain('mermaid_');
      expect(key1).toContain('_default'); // theme
    });

    it('should generate different keys for different content', () => {
      const key1 = (processor as any).generateCacheKey('content1');
      const key2 = (processor as any).generateCacheKey('content2');

      expect(key1).not.toBe(key2);
    });

    it('should include theme in cache key', () => {
      const darkProcessor = new MermaidProcessor({ theme: 'dark' });
      const content = 'test content';

      const defaultKey = (processor as any).generateCacheKey(content);
      const darkKey = (darkProcessor as any).generateCacheKey(content);

      expect(defaultKey).toContain('_default');
      expect(darkKey).toContain('_dark');
      expect(defaultKey).not.toBe(darkKey);
    });
  });

  describe('mermaid block extraction', () => {
    it('should extract multiple mermaid blocks correctly', () => {
      const content = `
        First paragraph.

        \`\`\`mermaid
        graph TD
          A-->B
        \`\`\`

        Middle paragraph.

        \`\`\`mermaid
        sequenceDiagram
          A->>B: Hello
        \`\`\`

        Last paragraph.
      `;

      const blocks = (processor as any).extractMermaidBlocks(content);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].content).toContain('graph TD');
      expect(blocks[1].content).toContain('sequenceDiagram');
      expect(blocks[0].startIndex).toBeLessThan(blocks[1].startIndex);
    });

    it('should extract HTML mermaid blocks', () => {
      const content =
        '<pre class="language-mermaid"><code class="language-mermaid">graph TD\nA-->B</code></pre>';

      const blocks = (processor as any).extractMermaidBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toBe('graph TD\nA-->B');
    });

    it('should handle mixed markdown and HTML blocks', () => {
      const content = `
        \`\`\`mermaid
        graph TD
          A-->B
        \`\`\`

        <pre class="language-mermaid"><code class="language-mermaid">sequenceDiagram\nA->>B: Hello</code></pre>
      `;

      const blocks = (processor as any).extractMermaidBlocks(content);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].content).toContain('graph TD');
      expect(blocks[1].content).toContain('sequenceDiagram');
    });

    it('should handle empty blocks', () => {
      const content = '```mermaid\n\n```';

      const blocks = (processor as any).extractMermaidBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toBe('');
    });
  });
});
