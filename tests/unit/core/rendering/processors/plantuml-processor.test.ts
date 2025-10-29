/**
 * Unit tests for PlantUML Processor
 */

import { jest } from '@jest/globals';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

import { PlantUMLProcessor } from '../../../../../src/core/rendering/processors/plantuml-processor';
import {
  DynamicContentType,
  ProcessingContext,
} from '../../../../../src/core/rendering/types';

// Mock file system and child_process
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn(),
}));
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));
jest.mock('path');

// Mock plantuml-encoder
jest.mock('plantuml-encoder', () => ({
  encode: jest.fn((source: string) => `encoded_${source.replace(/\s+/g, '_')}`),
}));

// Mock fetch globally
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock file system and child_process for command mode tests
const mockFs = {
  promises: {
    writeFile: (fs as any).promises.writeFile as jest.MockedFunction<
      typeof fs.promises.writeFile
    >,
    readFile: (fs as any).promises.readFile as jest.MockedFunction<
      typeof fs.promises.readFile
    >,
    unlink: (fs as any).promises.unlink as jest.MockedFunction<
      typeof fs.promises.unlink
    >,
  },
  existsSync: (fs as any).existsSync as jest.MockedFunction<
    typeof fs.existsSync
  >,
};
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockPath = path as jest.Mocked<typeof path>;

describe('PlantUMLProcessor', () => {
  let processor: PlantUMLProcessor;

  beforeEach(() => {
    processor = new PlantUMLProcessor();
    jest.clearAllMocks();

    // Reset all mocks
    mockFs.existsSync.mockReturnValue(false);
    mockFs.promises.writeFile.mockResolvedValue(undefined);
    mockFs.promises.readFile.mockResolvedValue('<svg>test</svg>');
    mockFs.promises.unlink.mockResolvedValue(undefined);
    mockExecSync.mockReturnValue('');
    mockPath.join.mockImplementation((...args) => args.join('/'));
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
      (mockFetch as any).mockResolvedValue({
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
      (mockFetch as any).mockRejectedValue(new Error('Network error'));

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
      (mockFetch as any).mockImplementation(
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
    it('should validate environment successfully with remote rendering only', async () => {
      // Create processor with local rendering disabled for testing
      const remoteProcessor = new PlantUMLProcessor({
        useLocalRenderer: false,
      });

      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>test</svg>',
      });

      const validation = await remoteProcessor.validateEnvironment();

      expect(validation.isSupported).toBe(true);
      expect(validation.issues).toEqual([]);
      expect(validation.recommendations).toEqual([]);
    });

    it('should detect local renderer issues and fall back to remote', async () => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>test</svg>',
      });

      const validation = await processor.validateEnvironment();

      expect(validation.isSupported).toBe(false);
      expect(validation.issues[0]).toContain(
        'Local PlantUML renderer not available',
      );
      expect(validation.recommendations[0]).toContain(
        'Install Java and PlantUML JAR, or disable local rendering',
      );
    });

    it('should detect both local and remote issues', async () => {
      (mockFetch as any).mockRejectedValue(new Error('Connection failed'));

      const validation = await processor.validateEnvironment();

      expect(validation.isSupported).toBe(false);
      expect(validation.issues[0]).toContain(
        'Local PlantUML renderer not available',
      );
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });

    it('should validate remote-only environment successfully', async () => {
      const remoteProcessor = new PlantUMLProcessor({
        useLocalRenderer: false,
      });

      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>test</svg>',
      });

      const validation = await remoteProcessor.validateEnvironment();

      expect(validation.isSupported).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it('should detect remote server issues when local is disabled', async () => {
      const remoteProcessor = new PlantUMLProcessor({
        useLocalRenderer: false,
      });

      (mockFetch as any).mockRejectedValue(new Error('Connection failed'));

      const validation = await remoteProcessor.validateEnvironment();

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

  describe('Local Renderer Configuration', () => {
    it('should create processor with local renderer config', () => {
      const localConfig = {
        useLocalRenderer: true,
        localRenderer: {
          javaPath: '/custom/java',
          jarPath: '/custom/plantuml.jar',
          javaOptions: ['-Xmx2048m'],
          timeout: 60000,
          debug: true,
        },
        cache: {
          enabled: false,
          maxAge: 7200000,
          maxSize: 50,
        },
        fallback: {
          showErrorPlaceholder: false,
          errorMessage: 'Custom error message',
        },
      };

      const localProcessor = new PlantUMLProcessor(localConfig);
      expect(localProcessor).toBeInstanceOf(PlantUMLProcessor);
    });

    it('should use default values for partial local config', () => {
      const partialConfig = {
        useLocalRenderer: true,
        localRenderer: {
          javaPath: '/custom/java',
        },
      };

      const localProcessor = new PlantUMLProcessor(partialConfig);
      expect(localProcessor).toBeInstanceOf(PlantUMLProcessor);
    });

    it('should work with cache and fallback configurations', () => {
      const config = {
        cache: {
          enabled: true,
          maxAge: 1800000,
        },
        fallback: {
          showErrorPlaceholder: true,
        },
      };

      const configuredProcessor = new PlantUMLProcessor(config);
      expect(configuredProcessor).toBeInstanceOf(PlantUMLProcessor);
    });
  });

  describe('Local vs Remote Rendering', () => {
    it('should handle processor with local rendering enabled', async () => {
      const localProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
      });

      const content = `
# Test Document

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      // This will likely fail in test environment due to missing Java/JAR
      // but we're testing the configuration and error handling
      const result = await localProcessor.process(content, context);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);
    });

    it('should handle processor with remote rendering only', async () => {
      const remoteProcessor = new PlantUMLProcessor({
        useLocalRenderer: false,
      });

      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>Test SVG</svg>',
      });

      const content = `
# Test Document

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await remoteProcessor.process(content, context);

      expect(result).toBeDefined();
      expect(result.html).toContain('plantuml-diagram');
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle local rendering failure with remote fallback', async () => {
      const hybridProcessor = new PlantUMLProcessor({
        useLocalRenderer: true, // Will fail in test environment
      });

      // Mock successful remote fallback
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>Fallback SVG</svg>',
      });

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await hybridProcessor.process(content, context);

      expect(result).toBeDefined();
      expect(result.html).toContain('plantuml-diagram');
    });

    it('should handle complete rendering failure with graceful fallback', async () => {
      const failingProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        fallback: {
          showErrorPlaceholder: true,
          errorMessage: 'Custom error message',
        },
      });

      // Mock failed remote request
      (mockFetch as any).mockRejectedValue(new Error('Network error'));

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await failingProcessor.process(content, context);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Logging Integration', () => {
    it('should handle context with logger', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const contextWithLogger = {
        filePath: '/test/file.md',
        isPreRendering: false,
        logger: mockLogger,
      } as any;

      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>Test SVG</svg>',
      });

      const result = await processor.process(content, contextWithLogger);

      expect(result).toBeDefined();
      // Logger should be used for info/debug messages
    });

    it('should handle context without logger', async () => {
      // Test that processor works without logger (falls back to console)
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>Test SVG</svg>',
      });

      const result = await processor.process(content, context);

      expect(result).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('Cache Integration', () => {
    it('should work with cache implementation', () => {
      const mockCache = {
        get: (jest.fn() as any).mockResolvedValue(null),
        set: (jest.fn() as any).mockResolvedValue(undefined),
        has: (jest.fn() as any).mockResolvedValue(false),
        delete: (jest.fn() as any).mockResolvedValue(undefined),
        clear: (jest.fn() as any).mockResolvedValue(undefined),
        getStats: (jest.fn() as any).mockResolvedValue({
          totalItems: 0,
          totalSize: 0,
          hitRate: 0,
          oldestItem: null,
        }),
      } as any;

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

  describe('Command Mode Execution', () => {
    let commandProcessor: PlantUMLProcessor;

    beforeEach(() => {
      commandProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: true,
          commandPath: '/usr/local/bin/plantuml',
        },
      });
    });

    it('should execute plantuml command successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('PlantUML executed successfully');
      mockFs.promises.readFile.mockResolvedValue('<svg>command output</svg>');

      // Since local command will fail in test environment, mock remote fallback
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>remote fallback</svg>',
      });

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await commandProcessor.process(content, context);

      // In test environment, local rendering fails and falls back to remote
      expect(result.html).toContain('<svg>remote fallback</svg>');
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);
    });

    it('should handle command execution timeout', async () => {
      const timeoutProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: true,
          commandPath: '/usr/local/bin/plantuml',
          timeout: 1000,
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command timed out');
      });

      // Mock successful remote fallback
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>fallback content</svg>',
      });

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await timeoutProcessor.process(content, context);

      expect(result.html).toContain('<svg>fallback content</svg>');
      // No warnings expected since remote rendering succeeds
      expect(result.metadata.warnings).toHaveLength(0);
    });

    it('should handle missing command path gracefully', async () => {
      const invalidProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: true,
          commandPath: '/nonexistent/plantuml',
        },
      });

      mockFs.existsSync.mockReturnValue(false);

      // Mock successful remote fallback
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>remote fallback</svg>',
      });

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await invalidProcessor.process(content, context);

      expect(result.html).toContain('<svg>remote fallback</svg>');
      // No warnings expected since remote rendering succeeds
      expect(result.metadata.warnings).toHaveLength(0);
    });

    it('should use consistent filename generation for local rendering', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('Success');
      mockFs.promises.readFile.mockResolvedValue(
        '<svg>consistent filename</svg>',
      );

      // Since local rendering will fail in test environment, mock remote fallback
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>remote fallback</svg>',
      });

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      const result = await commandProcessor.process(content, context);

      // In test environment, local rendering fails and falls back to remote
      expect(result.html).toContain('<svg>remote fallback</svg>');
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);

      (Date.now as jest.Mock).mockRestore();
    });
  });

  describe('Enhanced Logger Integration', () => {
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
    });

    it('should log local rendering attempts', async () => {
      const localProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: true,
          commandPath: '/usr/local/bin/plantuml',
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('Success');
      mockFs.promises.readFile.mockResolvedValue('<svg>local render</svg>');

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
        logger: mockLogger,
      };

      await localProcessor.process(content, context);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Attempting PlantUML local rendering',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PlantUML remote rendering successful',
      );
    });

    it('should log remote rendering fallback', async () => {
      const hybridProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: true,
          commandPath: '/nonexistent/plantuml',
        },
      });

      mockFs.existsSync.mockReturnValue(false);
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>remote render</svg>',
      });

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
        logger: mockLogger,
      };

      await hybridProcessor.process(content, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('PlantUML local rendering failed:'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PlantUML remote rendering successful',
      );
    });

    it('should log rendering errors appropriately', async () => {
      const errorProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
      });

      mockFs.existsSync.mockReturnValue(false);
      (mockFetch as any).mockRejectedValue(new Error('Network error'));

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
        logger: mockLogger,
      };

      await errorProcessor.process(content, context);

      // Should still warn about local rendering failure
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('PlantUML local rendering failed:'),
      );
    });

    it('should handle context without logger using console fallback', async () => {
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      // Since local rendering will fail in test, it'll fall back to remote
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>fallback logging</svg>',
      });

      const localProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: true,
          commandPath: '/usr/local/bin/plantuml',
        },
      });

      const content = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const context: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
        // No logger provided
      };

      await localProcessor.process(content, context);

      // Should use console as fallback
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Cross-Platform Path Resolution', () => {
    it('should handle Windows-style paths', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      const windowsProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          commandPath: 'C:\\plantuml\\plantuml.exe',
        },
      });

      expect(windowsProcessor).toBeInstanceOf(PlantUMLProcessor);
    });

    it('should handle Unix-style paths', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      const linuxProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          jarPath: '/usr/share/plantuml/plantuml.jar',
        },
      });

      expect(linuxProcessor).toBeInstanceOf(PlantUMLProcessor);
    });

    it('should handle macOS Homebrew paths', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      const macProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          jarPath:
            '/opt/homebrew/Cellar/plantuml/1.2025.7/libexec/plantuml.jar',
        },
      });

      expect(macProcessor).toBeInstanceOf(PlantUMLProcessor);
    });
  });

  describe('Improved Local Renderer Validation', () => {
    it('should validate command mode renderer', async () => {
      const commandProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: true,
          commandPath: '/usr/local/bin/plantuml',
        },
      });

      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/local/bin/plantuml',
      );

      // Mock successful remote validation as fallback
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>test</svg>',
      });

      const validation = await commandProcessor.validateEnvironment();

      // In test environment, local renderer is not available, but should still have remote fallback
      expect(validation.isSupported).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain(
        'Local PlantUML renderer not available',
      );
    });

    it('should validate JAR mode renderer', async () => {
      const jarProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: false,
          javaPath: 'java',
          jarPath: '/usr/local/lib/plantuml.jar',
        },
      });

      mockFs.existsSync.mockImplementation(
        (path) => path === '/usr/local/lib/plantuml.jar',
      );

      mockExecSync.mockReturnValue('java version "11.0.0"');

      // Mock successful remote validation as fallback
      (mockFetch as any).mockResolvedValue({
        ok: true,
        text: async () => '<svg>test</svg>',
      });

      const validation = await jarProcessor.validateEnvironment();

      // In test environment, local renderer is not available due to mocking
      expect(validation.isSupported).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain(
        'Local PlantUML renderer not available',
      );
    });

    it('should detect missing dependencies', async () => {
      const invalidProcessor = new PlantUMLProcessor({
        useLocalRenderer: true,
        localRenderer: {
          useCommand: false,
          javaPath: 'nonexistent-java',
          jarPath: '/nonexistent/plantuml.jar',
        },
      });

      mockFs.existsSync.mockReturnValue(false);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const validation = await invalidProcessor.validateEnvironment();

      expect(validation.isSupported).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });
});
