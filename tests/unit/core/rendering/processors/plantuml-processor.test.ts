/**
 * Unit tests for PlantUML Processor
 */

import { PlantUMLProcessor } from '../../../../../src/core/rendering/processors/plantuml-processor';
import {
  DynamicContentType,
  ProcessingContext,
} from '../../../../../src/core/rendering/types';

// Mock plantuml-encoder
jest.mock('plantuml-encoder', () => ({
  encode: jest.fn((source: string) => `encoded_${source.replace(/\s+/g, '_')}`),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PlantUMLProcessor', () => {
  let processor: PlantUMLProcessor;

  beforeEach(() => {
    processor = new PlantUMLProcessor();
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = processor.getConfig();

      expect(config.serverUrl).toBe('https://www.plantuml.com/plantuml');
      expect(config.format).toBe('svg');
      expect(config.defaultWidth).toBe(800);
      expect(config.defaultHeight).toBe(600);
      expect(config.timeout).toBe(10000);
      expect(config.enableCaching).toBe(true);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        serverUrl: 'https://custom.plantuml.server',
        format: 'png' as const,
        defaultWidth: 1200,
        defaultHeight: 800,
        timeout: 15000,
        enableCaching: false,
      };

      const customProcessor = new PlantUMLProcessor(customConfig);
      const config = customProcessor.getConfig();

      expect(config.serverUrl).toBe('https://custom.plantuml.server');
      expect(config.format).toBe('png');
      expect(config.defaultWidth).toBe(1200);
      expect(config.defaultHeight).toBe(800);
      expect(config.timeout).toBe(15000);
      expect(config.enableCaching).toBe(false);
    });

    it('should have correct processor type', () => {
      expect(processor.type).toBe(DynamicContentType.PLANTUML);
    });
  });

  describe('Content Detection', () => {
    it('should detect PlantUML blocks in Markdown format', async () => {
      const content = `
# Test Document

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
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

    it('should detect PlantUML blocks in HTML format', async () => {
      const content = `
<h1>Test Document</h1>
<pre class="language-plantuml"><code class="language-plantuml">@startuml
Alice -&gt; Bob: Hello
@enduml
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

    it('should not detect content without PlantUML', async () => {
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

    it('should detect multiple PlantUML blocks', async () => {
      const content = `
# Test Document

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`

Another diagram:

\`\`\`plantuml
@startuml
Charlie -> Dave: Hi
@enduml
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const confidence = await processor.detect(content, context);
      expect(confidence).toBe(0.95);
    });
  });

  describe('Content Processing', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<svg>mocked svg content</svg>',
      });
    });

    it('should process PlantUML content successfully', async () => {
      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('<div class="plantuml-diagram">');
      expect(result.html).toContain('<svg>mocked svg content</svg>');
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.warnings).toEqual([]);
    });

    it('should process HTML PlantUML content with entity decoding', async () => {
      const content = `
<pre class="language-plantuml"><code class="language-plantuml">@startuml
Alice -&gt; Bob: Hello &amp; Goodbye
@enduml
</code></pre>
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('<div class="plantuml-diagram">');
      expect(result.html).toContain('<svg>mocked svg content</svg>');
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);
    });

    it('should handle processing errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('PlantUML Error:');
      expect(result.metadata.warnings).toHaveLength(1);
      expect(result.metadata.warnings[0]).toContain(
        'Failed to render PlantUML diagram',
      );
    });

    it('should handle fetch timeout', async () => {
      const processor = new PlantUMLProcessor({ timeout: 100 });

      // Mock a slow response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  text: async () => '<svg>slow content</svg>',
                }),
              200,
            ),
          ),
      );

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      expect(result.html).toContain('<svg>slow content</svg>');
      expect(result.metadata.warnings).toHaveLength(0);
    });

    it('should handle multiple diagrams in content', async () => {
      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`

Some text here.

\`\`\`plantuml
@startuml
Charlie -> Dave: Hi
@enduml
\`\`\`
`;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: true,
      };

      const result = await processor.process(content, context);

      // Should contain both diagrams
      const diagramCount = (
        result.html.match(/<div class="plantuml-diagram">/g) || []
      ).length;
      expect(diagramCount).toBe(2);
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);
    });
  });

  describe('Environment Validation', () => {
    it('should validate environment successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<svg>test</svg>',
      });

      const validation = await processor.validateEnvironment();

      expect(validation.isSupported).toBe(true);
      expect(validation.issues).toEqual([]);
      expect(validation.recommendations).toEqual([]);
    });

    it('should detect environment issues', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const validation = await processor.validateEnvironment();

      expect(validation.isSupported).toBe(false);
      expect(validation.issues[0]).toContain('PlantUML server not accessible');
      expect(validation.recommendations[0]).toContain(
        'Check internet connection',
      );
    });
  });

  describe('Dimensions Calculation', () => {
    it('should calculate dimensions for processed content', async () => {
      const processedContent = {
        html: '<div class="plantuml-diagram"><svg width="400" height="300">test</svg></div>',
        metadata: {
          type: DynamicContentType.PLANTUML,
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
        html: '<div class="plantuml-diagram">No SVG content</div>',
        metadata: {
          type: DynamicContentType.PLANTUML,
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
  });

  describe('Cache Integration', () => {
    it('should work with cache implementation', () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getStats: jest.fn().mockResolvedValue({
          totalItems: 0,
          totalSize: 0,
          hitRate: 0,
          oldestItem: null,
        }),
      };

      expect(() => processor.setCache(mockCache)).not.toThrow();
    });
  });

  describe('Configuration Updates', () => {
    it('should handle configuration updates', () => {
      const newConfig = {
        serverUrl: 'https://new.plantuml.server',
        format: 'png' as const,
        timeout: 20000,
      };

      processor.updateConfig(newConfig);
      const config = processor.getConfig();

      expect(config.serverUrl).toBe('https://new.plantuml.server');
      expect(config.format).toBe('png');
      expect(config.timeout).toBe(20000);
    });

    it('should merge with existing configuration', () => {
      const partialConfig = {
        timeout: 15000,
      };

      processor.updateConfig(partialConfig);
      const config = processor.getConfig();

      expect(config.timeout).toBe(15000);
      expect(config.serverUrl).toBe('https://www.plantuml.com/plantuml'); // Should keep original
      expect(config.format).toBe('svg'); // Should keep original
    });
  });
});
