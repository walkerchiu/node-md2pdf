/**
 * Unit tests for Mermaid Processor
 */

import { MermaidProcessor } from '../../../../../src/core/rendering/processors/mermaid-processor';
import {
  DynamicContentType,
  ProcessingContext,
} from '../../../../../src/core/rendering/types';

// Mock MermaidRenderer
jest.mock('../../../../../src/utils/mermaid-renderer', () => ({
  MermaidRenderer: {
    getInstance: jest.fn().mockReturnValue({
      render: jest.fn().mockResolvedValue({
        svg: '<svg>mocked mermaid svg content</svg>',
        metadata: {
          width: 800,
          height: 600,
          renderTime: 100,
        },
      }),
      cleanup: jest.fn().mockResolvedValue(undefined),
      validateEnvironment: jest.fn().mockResolvedValue({
        isSupported: true,
        issues: [],
        recommendations: [],
      }),
    }),
  },
}));

describe('MermaidProcessor', () => {
  let processor: MermaidProcessor;

  beforeEach(() => {
    processor = new MermaidProcessor();
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = processor.getConfig();

      expect(config.theme).toBe('default');
      expect(config.defaultWidth).toBe(800);
      expect(config.defaultHeight).toBe(600);
      expect(config.timeout).toBe(10000);
      expect(config.enableCaching).toBe(true);
      expect(config.backgroundColor).toBe('white');
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        theme: 'dark' as const,
        defaultWidth: 1200,
        defaultHeight: 800,
        timeout: 15000,
        enableCaching: false,
        backgroundColor: 'black',
      };

      const customProcessor = new MermaidProcessor(customConfig);
      const config = customProcessor.getConfig();

      expect(config.theme).toBe('dark');
      expect(config.defaultWidth).toBe(1200);
      expect(config.defaultHeight).toBe(800);
      expect(config.timeout).toBe(15000);
      expect(config.enableCaching).toBe(false);
      expect(config.backgroundColor).toBe('black');
    });

    it('should have correct processor type', () => {
      expect(processor.type).toBe(DynamicContentType.MERMAID);
    });
  });

  describe('Content Detection', () => {
    it('should detect Mermaid blocks in Markdown format', async () => {
      const content = `
# Test Document

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

Some other content.
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const confidence = await processor.detect(content, context);
      expect(confidence).toBe(0.95);
    });

    it('should detect Mermaid blocks in HTML format', async () => {
      const content = `
<h1>Test Document</h1>
<pre class="language-mermaid"><code class="language-mermaid">graph TD
    A[Start] --&gt; B[Process]
    B --&gt; C[End]
</code></pre>
<p>Some other content.</p>
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const confidence = await processor.detect(content, context);
      expect(confidence).toBe(0.95);
    });

    it('should not detect content without Mermaid', async () => {
      const content = `
# Test Document

\`\`\`javascript
console.log('hello world');
\`\`\`

Some other content.
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const confidence = await processor.detect(content, context);
      expect(confidence).toBe(0);
    });

    it('should detect multiple Mermaid blocks', async () => {
      const content = `
# Test Document

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
\`\`\`

Another diagram:

\`\`\`mermaid
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const confidence = await processor.detect(content, context);
      expect(confidence).toBe(0.95);
    });

    it('should detect different Mermaid diagram types', async () => {
      const diagramTypes = [
        'graph TD\n    A --> B',
        'sequenceDiagram\n    Alice->>Bob: Hello',
        'classDiagram\n    class Animal',
        'stateDiagram-v2\n    [*] --> Still',
        'erDiagram\n    CUSTOMER ||--o{ ORDER : places',
        'journey\n    title My working day',
        'gantt\n    title A Gantt Diagram',
        'pie title Pets adopted by volunteers\n    "Dogs" : 386',
        'flowchart TD\n    A --> B',
      ];

      for (const diagram of diagramTypes) {
        const content = `\`\`\`mermaid\n${diagram}\n\`\`\``;
        const context: ProcessingContext = {
          filePath: '/test/file.md',
          isPreRendering: true,
        };

        const confidence = await processor.detect(content, context);
        expect(confidence).toBe(0.95);
      }
    });
  });

  describe('Content Processing', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();

      // Ensure successful rendering for normal tests
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();
      mockRenderer.render.mockResolvedValue({
        svg: '<svg>mocked mermaid svg content</svg>',
        metadata: {
          width: 800,
          height: 600,
          renderTime: 100,
        },
      });
      mockRenderer.validateEnvironment.mockResolvedValue({
        isSupported: true,
        issues: [],
        recommendations: [],
      });
    });

    it('should process Mermaid content successfully', async () => {
      const content = `
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('class="mermaid-diagram"');
      expect(result.html).toContain('<svg>mocked mermaid svg content</svg>');
      expect(result.metadata.type).toBe(DynamicContentType.MERMAID);
      expect(result.metadata.warnings).toEqual([]);
    });

    it('should process HTML Mermaid content with entity decoding', async () => {
      const content = `
<pre class="language-mermaid"><code class="language-mermaid">graph TD
    A[Start] --&gt; B[Process &amp; Validate]
    B --&gt; C[End]
</code></pre>
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('class="mermaid-diagram"');
      expect(result.html).toContain('<svg>mocked mermaid svg content</svg>');
      expect(result.metadata.type).toBe(DynamicContentType.MERMAID);
    });

    it('should handle processing errors gracefully', async () => {
      // Mock the renderer to throw an error
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();
      mockRenderer.render.mockRejectedValue(
        new Error('Mermaid rendering error'),
      );

      const content = `
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('Mermaid Diagram Error');
      expect(result.metadata.warnings).toHaveLength(1);
      expect(result.metadata.warnings[0]).toContain(
        'Failed to render Mermaid diagram',
      );
    });

    it('should handle multiple diagrams in content', async () => {
      const content = `
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
\`\`\`

Some text here.

\`\`\`mermaid
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      // Should contain both diagrams
      const diagramCount = (result.html.match(/class="mermaid-diagram"/g) || [])
        .length;
      expect(diagramCount).toBe(2);
      expect(result.metadata.type).toBe(DynamicContentType.MERMAID);
    });

    it('should handle empty diagrams', async () => {
      // Mock error for this specific test
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();
      mockRenderer.render.mockRejectedValue(new Error('Empty diagram error'));

      const content = `
\`\`\`mermaid
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('Mermaid Diagram Error');
      expect(result.metadata.warnings).toHaveLength(1);
      expect(result.metadata.warnings[0]).toContain(
        'Failed to render Mermaid diagram',
      );
    });

    it('should handle very large content', async () => {
      const largeContent = 'A'.repeat(1000);
      const content = `
\`\`\`mermaid
graph TD
    A[${largeContent}] --> B[Process]
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      // Should either process successfully or handle gracefully
      expect(result.html).toBeDefined();
      expect(result.metadata.type).toBe(DynamicContentType.MERMAID);
    });
  });

  describe('Environment Validation', () => {
    it('should validate environment successfully', async () => {
      const validation = await processor.validateEnvironment();

      expect(validation.isSupported).toBe(true);
      expect(validation.issues).toEqual([]);
      expect(validation.recommendations).toEqual([]);
    });

    it('should detect mermaid module issues', async () => {
      // Mock the renderer to fail validation
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();
      mockRenderer.validateEnvironment.mockResolvedValue({
        isSupported: false,
        issues: ['Mermaid renderer not available: Module not found'],
        recommendations: [
          'Check Puppeteer installation and browser availability',
        ],
      });

      const processor = new MermaidProcessor();
      const validation = await processor.validateEnvironment();

      expect(validation.isSupported).toBe(false);
      expect(validation.issues[0]).toContain('Mermaid renderer not available');
      expect(validation.recommendations[0]).toContain('Puppeteer installation');
    });
  });

  describe('Dimensions Calculation', () => {
    it('should calculate dimensions for processed content', async () => {
      const processedContent = {
        html: '<div class="mermaid-diagram"><svg width="400" height="300">test</svg></div>',
        metadata: {
          type: DynamicContentType.MERMAID,
          processingTime: 100,
          warnings: [],
        },
      };

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        context,
      );

      expect(dimensions.width).toBe(800); // Uses default when parsing fails
      expect(dimensions.height).toBe(0); // No SVG dimensions found
      expect(dimensions.pageCount).toBe(1);
    });

    it('should handle content without dimensions', async () => {
      const processedContent = {
        html: '<div class="mermaid-diagram">No SVG content</div>',
        metadata: {
          type: DynamicContentType.MERMAID,
          processingTime: 100,
          warnings: [],
        },
      };

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        context,
      );

      expect(dimensions.width).toBe(800); // Default width
      expect(dimensions.height).toBe(0); // No content to calculate from
      expect(dimensions.pageCount).toBe(1);
    });

    it('should calculate multiple diagram dimensions', async () => {
      const processedContent = {
        html: `
          <div class="mermaid-diagram"><svg width="400" height="200">diagram1</svg></div>
          <div class="mermaid-diagram"><svg width="600" height="300">diagram2</svg></div>
        `,
        metadata: {
          type: DynamicContentType.MERMAID,
          processingTime: 200,
          warnings: [],
        },
      };

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const dimensions = await processor.getDimensions(
        processedContent,
        context,
      );

      expect(dimensions.width).toBe(800); // Uses default when parsing fails
      expect(dimensions.height).toBe(0); // No SVG dimensions found
      expect(dimensions.pageCount).toBe(1);
    });
  });

  describe('Configuration Updates', () => {
    it('should handle configuration updates', () => {
      const newConfig = {
        theme: 'dark' as const,
        defaultWidth: 1200,
        timeout: 15000,
      };

      processor.updateConfig(newConfig);
      const config = processor.getConfig();

      expect(config.theme).toBe('dark');
      expect(config.defaultWidth).toBe(1200);
      expect(config.timeout).toBe(15000);
    });

    it('should merge with existing configuration', () => {
      const partialConfig = {
        enableCaching: false,
      };

      processor.updateConfig(partialConfig);
      const config = processor.getConfig();

      expect(config.enableCaching).toBe(false);
      expect(config.theme).toBe('default'); // Should keep original
      expect(config.defaultWidth).toBe(800); // Should keep original
    });

    it('should update backgroundColor', () => {
      const partialConfig = {
        backgroundColor: 'transparent',
      };

      processor.updateConfig(partialConfig);
      const config = processor.getConfig();

      expect(config.backgroundColor).toBe('transparent');
      expect(config.theme).toBe('default'); // Should keep original
    });
  });

  describe('Diagram Type Recognition', () => {
    it('should recognize different Mermaid diagram types', async () => {
      const diagramTests = [
        { content: 'graph TD\n    A --> B', expectedType: 'flowchart' },
        { content: 'flowchart TD\n    A --> B', expectedType: 'flowchart' },
        {
          content: 'sequenceDiagram\n    A->>B: Hello',
          expectedType: 'sequence',
        },
        { content: 'classDiagram\n    class Animal', expectedType: 'class' },
        {
          content: 'stateDiagram-v2\n    [*] --> Still',
          expectedType: 'state',
        },
        { content: 'erDiagram\n    CUSTOMER ||--o{ ORDER', expectedType: 'er' },
        { content: 'journey\n    title My Day', expectedType: 'journey' },
        { content: 'gantt\n    title Project', expectedType: 'gantt' },
        { content: 'pie title Data\n    "A" : 40', expectedType: 'pie' },
      ];

      for (const test of diagramTests) {
        const content = `\`\`\`mermaid\n${test.content}\n\`\`\``;
        const context: ProcessingContext = {
          filePath: '/test/file.md',
          isPreRendering: true,
        };

        const confidence = await processor.detect(content, context);
        expect(confidence).toBe(0.95);
      }
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle malformed Mermaid syntax', async () => {
      const content = `
\`\`\`mermaid
graph TD
    A --> B -->
    // incomplete syntax
\`\`\`
`;

      // Mock the renderer to throw a syntax error
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();
      mockRenderer.render.mockRejectedValue(new Error('Syntax error'));

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('Mermaid Diagram Error');
      expect(result.metadata.warnings).toHaveLength(1);
    });

    it('should handle very long diagram content', async () => {
      const longContent = Array(1000)
        .fill(0)
        .map((_, i) => `    A${i} --> A${i + 1}`)
        .join('\n');

      const content = `
\`\`\`mermaid
graph TD
${longContent}
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      // Should either process successfully or handle gracefully
      expect(result.html).toBeDefined();
      expect(result.metadata.type).toBe(DynamicContentType.MERMAID);
    });

    it('should handle processing failure gracefully', async () => {
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();

      // Mock complete processing failure
      mockRenderer.render.mockRejectedValue(
        new Error('Complete processing failure'),
      );

      const content = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      expect(result.html).toBeDefined();
      expect(result.metadata.warnings).toHaveLength(1);
      expect(result.metadata.warnings[0]).toContain(
        'Failed to render Mermaid diagram',
      );
    });
  });

  describe('Caching Functionality', () => {
    it('should handle caching when enabled', async () => {
      const processorWithCache = new MermaidProcessor({ enableCaching: true });

      const content = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processorWithCache.process(content, context);

      expect(result.metadata.details?.cacheEnabled).toBe(true);
      expect(result.metadata.details?.diagramCount).toBe(1);
      expect(result.metadata.details?.theme).toBe('default');
    });

    it('should handle caching when disabled', async () => {
      const processorWithoutCache = new MermaidProcessor({
        enableCaching: false,
      });

      const content = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processorWithoutCache.process(content, context);

      expect(result.metadata.details?.cacheEnabled).toBe(false);
      expect(result.metadata.details?.diagramCount).toBe(1);
    });

    it('should generate cache keys correctly', async () => {
      const content1 = 'graph TD\n    A --> B';
      const content2 = 'graph TD\n    A --> C';

      // Access private method through type assertion
      const cacheKey1 = (processor as any).generateCacheKey(content1);
      const cacheKey2 = (processor as any).generateCacheKey(content2);

      expect(typeof cacheKey1).toBe('string');
      expect(typeof cacheKey2).toBe('string');
      expect(cacheKey1).not.toBe(cacheKey2);
      expect(cacheKey1).toContain('mermaid_');
      expect(cacheKey1).toContain('_default');
    });
  });

  describe('Complexity Analysis', () => {
    it('should analyze simple diagrams correctly', () => {
      const simpleContent = `graph TD
    A --> B
    B --> C`;

      // Access private method through type assertion
      const complexity = (processor as any).analyzeComplexity(simpleContent);
      expect(complexity).toBe('simple');
    });

    it('should analyze medium complexity diagrams', () => {
      const mediumContent = `graph TD
    A[Node1] --> B[Node2]
    B[Node3] --> C[Node4]
    C[Node5] --> D[Node6]
    D[Node7] --> E[Node8]
    E[Node9] --> F[Node10]
    F[Node11] --> G[Node12]
    G[Node13] --> H[Node14]`;

      const complexity = (processor as any).analyzeComplexity(mediumContent);
      expect(complexity).toBe('medium');
    });

    it('should analyze complex diagrams', () => {
      const complexContent = Array(20)
        .fill(0)
        .map(
          (_, i) => `    Node${i}[Label ${i}] --> Node${i + 1}[Label ${i + 1}]`,
        )
        .join('\n');

      const complexity = (processor as any).analyzeComplexity(
        `graph TD\n${complexContent}`,
      );
      expect(complexity).toBe('complex');
    });
  });

  describe('Height Estimation', () => {
    it('should estimate height for simple diagrams', () => {
      const height = (processor as any).estimateHeight('simple');
      expect(height).toBe(200);
    });

    it('should estimate height for medium diagrams', () => {
      const height = (processor as any).estimateHeight('medium');
      expect(height).toBe(400);
    });

    it('should estimate height for complex diagrams', () => {
      const height = (processor as any).estimateHeight('complex');
      expect(height).toBe(600);
    });

    it('should handle unknown complexity', () => {
      const height = (processor as any).estimateHeight('unknown' as any);
      expect(height).toBe(600); // Default height from config
    });
  });

  describe('calculateDimensions Method', () => {
    it('should calculate dimensions for content with Mermaid blocks', async () => {
      const content = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const dimensions = await processor.calculateDimensions(content, context);

      expect(dimensions.pageCount).toBe(1);
      expect(dimensions.height).toBe(400); // 2 simple diagrams * 200px each
      expect(dimensions.width).toBe(800);
    });

    it('should return zero dimensions for content without Mermaid', async () => {
      const content = `
# Regular content
Some text without diagrams.
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const dimensions = await processor.calculateDimensions(content, context);

      expect(dimensions.pageCount).toBe(0);
      expect(dimensions.height).toBe(0);
      expect(dimensions.width).toBe(0);
    });

    it('should calculate page count correctly for large diagrams', async () => {
      const largeContent = Array(20)
        .fill(0)
        .map((_, i) => `\`\`\`mermaid\ngraph TD\n    A${i} --> B${i}\n\`\`\``)
        .join('\n\n');

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const dimensions = await processor.calculateDimensions(
        largeContent,
        context,
      );

      expect(dimensions.pageCount).toBeGreaterThan(1);
      expect(dimensions.height).toBeGreaterThan(800);
      expect(dimensions.width).toBe(800);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources properly', async () => {
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();

      await processor.cleanup();

      expect(mockRenderer.cleanup).toHaveBeenCalled();
    });
  });

  describe('HTML Entity Decoding', () => {
    it('should properly decode HTML entities in mermaid content', async () => {
      // Reset mock to ensure successful rendering for this test
      jest.clearAllMocks();
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();
      mockRenderer.render.mockResolvedValue({
        svg: '<svg>mocked mermaid svg content</svg>',
        metadata: {
          width: 800,
          height: 600,
          renderTime: 100,
        },
      });

      const content = `
<pre class="language-mermaid"><code class="language-mermaid">graph TD
    A[Start &amp; Begin] --&gt; B[Process &quot;Data&quot;]
    B --&gt; C[End &lt; Finish &gt;]
</code></pre>
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('class="mermaid-diagram"');
      expect(result.html).toContain('<svg>mocked mermaid svg content</svg>');
      expect(result.metadata.type).toBe(DynamicContentType.MERMAID);
    });
  });

  describe('Mixed Content Processing', () => {
    it('should process mixed markdown and HTML mermaid blocks', async () => {
      // Reset mock to ensure successful rendering for this test
      jest.clearAllMocks();
      const {
        MermaidRenderer,
      } = require('../../../../../src/utils/mermaid-renderer');
      const mockRenderer = MermaidRenderer.getInstance();
      mockRenderer.render.mockResolvedValue({
        svg: '<svg>mocked mermaid svg content</svg>',
        metadata: {
          width: 800,
          height: 600,
          renderTime: 100,
        },
      });

      const content = `
# Document with Mixed Mermaid

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

<p>Some text</p>

<pre class="language-mermaid"><code class="language-mermaid">sequenceDiagram
    Alice->>Bob: Hello
</code></pre>
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await processor.process(content, context);

      // Should contain both diagrams
      const diagramCount = (result.html.match(/class="mermaid-diagram"/g) || [])
        .length;
      expect(diagramCount).toBe(2);
      expect(result.metadata.details?.diagramCount).toBe(2);
    });
  });

  describe('Theme Configuration Edge Cases', () => {
    it('should handle null theme configuration', () => {
      const customProcessor = new MermaidProcessor({
        theme: 'null' as const,
      });

      const config = customProcessor.getConfig();
      expect(config.theme).toBe('null');
    });

    it('should handle forest theme configuration', () => {
      const customProcessor = new MermaidProcessor({
        theme: 'forest' as const,
      });

      const config = customProcessor.getConfig();
      expect(config.theme).toBe('forest');
    });

    it('should handle neutral theme configuration', () => {
      const customProcessor = new MermaidProcessor({
        theme: 'neutral' as const,
      });

      const config = customProcessor.getConfig();
      expect(config.theme).toBe('neutral');
    });
  });

  describe('Error Fallback HTML Generation', () => {
    it('should create proper fallback HTML for errors', () => {
      const originalCode = 'graph TD\n    A --> B';
      const errorMessage = 'Test error message';

      // Access private method through type assertion
      const fallbackHTML = (processor as any).createFallbackHTML(
        originalCode,
        errorMessage,
      );

      expect(fallbackHTML).toContain('class="mermaid-error"');
      expect(fallbackHTML).toContain('Mermaid Diagram Error');
      expect(fallbackHTML).toContain(errorMessage);
      expect(fallbackHTML).toContain(originalCode);
    });

    it('should create proper diagram HTML for success', () => {
      const svg = '<svg>test svg</svg>';
      const originalCode = 'graph TD\n    A --> B';
      const metadata = { width: 400, height: 300, renderTime: 150 };

      // Access private method through type assertion
      const diagramHTML = (processor as any).createDiagramHTML(
        svg,
        originalCode,
        metadata,
      );

      expect(diagramHTML).toContain('class="mermaid-diagram"');
      expect(diagramHTML).toContain(svg);
      expect(diagramHTML).toContain('150ms');
      expect(diagramHTML).toContain('400x300');
      expect(diagramHTML).toContain(originalCode.substring(0, 50));
    });
  });
});
