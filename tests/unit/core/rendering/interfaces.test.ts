/**
 * Unit tests for rendering interfaces
 * Tests interface contracts and type definitions for dynamic content processing system
 */

import {
  IDynamicContentProcessor,
  IContentCache,
  ITwoStageRenderingEngine,
} from '../../../../src/core/rendering/interfaces';
import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
  ContentDimensions,
} from '../../../../src/core/rendering/types';

describe('Rendering Interfaces', () => {
  describe('IDynamicContentProcessor', () => {
    let mockProcessor: jest.Mocked<IDynamicContentProcessor>;

    beforeEach(() => {
      mockProcessor = {
        type: DynamicContentType.DIAGRAM,
        name: 'Test Diagram Processor',
        detect: jest.fn(),
        process: jest.fn(),
        getDimensions: jest.fn(),
        validateEnvironment: jest.fn(),
        setCache: jest.fn(),
      };
    });

    it('should have correct type property', () => {
      expect(mockProcessor.type).toBe(DynamicContentType.DIAGRAM);
    });

    it('should have correct name property', () => {
      expect(mockProcessor.name).toBe('Test Diagram Processor');
    });

    it('should implement detect method', async () => {
      mockProcessor.detect.mockResolvedValue(0.9);

      const content = '@startuml\nA -> B\n@enduml';
      const context: Partial<ProcessingContext> = { isPreRendering: true };

      const result = await mockProcessor.detect(
        content,
        context as ProcessingContext,
      );

      expect(result).toBe(0.9);
      expect(mockProcessor.detect).toHaveBeenCalledWith(content, context);
    });

    it('should implement process method', async () => {
      const mockProcessedContent: ProcessedContent = {
        html: '<div>Processed content</div>',
        metadata: {
          type: DynamicContentType.DIAGRAM,
          processingTime: 1000,
          warnings: [],
        },
      };
      mockProcessor.process.mockResolvedValue(mockProcessedContent);

      const content = '@startuml\nA -> B\n@enduml';
      const context: Partial<ProcessingContext> = { isPreRendering: true };

      const result = await mockProcessor.process(
        content,
        context as ProcessingContext,
      );

      expect(result).toEqual(mockProcessedContent);
      expect(mockProcessor.process).toHaveBeenCalledWith(content, context);
    });

    it('should implement getDimensions method', async () => {
      const mockDimensions: ContentDimensions = {
        pageCount: 2,
        width: 800,
        height: 600,
      };
      mockProcessor.getDimensions.mockResolvedValue(mockDimensions);

      const processedContent: ProcessedContent = {
        html: '<div>Content</div>',
        metadata: {
          type: DynamicContentType.DIAGRAM,
          processingTime: 500,
          warnings: [],
        },
      };
      const context: Partial<ProcessingContext> = { isPreRendering: false };

      const result = await mockProcessor.getDimensions(
        processedContent,
        context as ProcessingContext,
      );

      expect(result).toEqual(mockDimensions);
      expect(mockProcessor.getDimensions).toHaveBeenCalledWith(
        processedContent,
        context,
      );
    });

    it('should implement validateEnvironment method', async () => {
      const mockValidation = {
        isSupported: true,
        issues: [],
        recommendations: ['Install PlantUML for better performance'],
      };
      mockProcessor.validateEnvironment.mockResolvedValue(mockValidation);

      const result = await mockProcessor.validateEnvironment();

      expect(result).toEqual(mockValidation);
      expect(mockProcessor.validateEnvironment).toHaveBeenCalled();
    });

    it('should implement setCache method', () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getStats: jest.fn(),
      } as jest.Mocked<IContentCache>;

      mockProcessor.setCache(mockCache);

      expect(mockProcessor.setCache).toHaveBeenCalledWith(mockCache);
    });
  });

  describe('IContentCache', () => {
    let mockCache: jest.Mocked<IContentCache>;

    beforeEach(() => {
      mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getStats: jest.fn(),
      };
    });

    it('should implement get method', async () => {
      const mockContent: ProcessedContent = {
        html: '<div>Cached content</div>',
        metadata: {
          type: DynamicContentType.DIAGRAM,
          processingTime: 800,
          warnings: [],
        },
      };
      mockCache.get.mockResolvedValue(mockContent);

      const result = await mockCache.get('test-key');

      expect(result).toEqual(mockContent);
      expect(mockCache.get).toHaveBeenCalledWith('test-key');
    });

    it('should implement set method', async () => {
      const content: ProcessedContent = {
        html: '<div>Content to cache</div>',
        metadata: {
          type: DynamicContentType.DIAGRAM,
          processingTime: 600,
          warnings: [],
        },
      };

      await mockCache.set('test-key', content, 3600);

      expect(mockCache.set).toHaveBeenCalledWith('test-key', content, 3600);
    });

    it('should implement has method', async () => {
      mockCache.has.mockResolvedValue(true);

      const result = await mockCache.has('test-key');

      expect(result).toBe(true);
      expect(mockCache.has).toHaveBeenCalledWith('test-key');
    });

    it('should implement delete method', async () => {
      await mockCache.delete('test-key');

      expect(mockCache.delete).toHaveBeenCalledWith('test-key');
    });

    it('should implement clear method', async () => {
      await mockCache.clear();

      expect(mockCache.clear).toHaveBeenCalled();
    });

    it('should implement getStats method', async () => {
      const mockStats = {
        totalItems: 10,
        totalSize: 1024,
        hitRate: 0.85,
        oldestItem: new Date('2024-01-01'),
      };
      mockCache.getStats.mockResolvedValue(mockStats);

      const result = await mockCache.getStats();

      expect(result).toEqual(mockStats);
      expect(mockCache.getStats).toHaveBeenCalled();
    });
  });

  describe('ITwoStageRenderingEngine', () => {
    let mockEngine: jest.Mocked<ITwoStageRenderingEngine>;

    beforeEach(() => {
      mockEngine = {
        render: jest.fn(),
        registerProcessor: jest.fn(),
        unregisterProcessor: jest.fn(),
        getRegisteredProcessors: jest.fn(),
        setCache: jest.fn(),
        getCache: jest.fn(),
        validateEnvironment: jest.fn(),
      };
    });

    it('should implement render method', async () => {
      const mockRenderingResult = {
        html: '<div>Rendered content</div>',
        usedTwoStageRendering: false,
        performance: {
          totalTime: 1000,
        },
        metadata: {
          processedContentTypes: [],
          warnings: [],
          cacheHits: 0,
          cacheMisses: 0,
        },
      };
      mockEngine.render.mockResolvedValue(mockRenderingResult);

      const content = '# Test\n@startuml\nA -> B\n@enduml';
      const context: Partial<ProcessingContext> = { isPreRendering: true };

      const result = await mockEngine.render(
        content,
        context as ProcessingContext,
      );

      expect(result).toEqual(mockRenderingResult);
      expect(mockEngine.render).toHaveBeenCalledWith(content, context);
    });

    it('should implement registerProcessor method', () => {
      const mockProcessor = {
        type: DynamicContentType.DIAGRAM,
        name: 'Test Processor',
      } as IDynamicContentProcessor;

      mockEngine.registerProcessor(mockProcessor);

      expect(mockEngine.registerProcessor).toHaveBeenCalledWith(mockProcessor);
    });

    it('should implement unregisterProcessor method', () => {
      mockEngine.unregisterProcessor(DynamicContentType.DIAGRAM);

      expect(mockEngine.unregisterProcessor).toHaveBeenCalledWith(
        DynamicContentType.DIAGRAM,
      );
    });

    it('should implement getRegisteredProcessors method', () => {
      mockEngine.getRegisteredProcessors.mockReturnValue([
        DynamicContentType.DIAGRAM,
      ]);

      const result = mockEngine.getRegisteredProcessors();

      expect(result).toEqual([DynamicContentType.DIAGRAM]);
      expect(mockEngine.getRegisteredProcessors).toHaveBeenCalled();
    });

    it('should implement cache management methods', () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getStats: jest.fn(),
      } as jest.Mocked<IContentCache>;

      mockEngine.getCache.mockReturnValue(mockCache);
      mockEngine.setCache(mockCache);

      expect(mockEngine.setCache).toHaveBeenCalledWith(mockCache);

      const retrievedCache = mockEngine.getCache();
      expect(retrievedCache).toBe(mockCache);
    });

    it('should implement validateEnvironment method', async () => {
      const mockValidation = {
        isReady: true,
        processorIssues: {},
        recommendations: [],
      };
      mockEngine.validateEnvironment.mockResolvedValue(mockValidation);

      const result = await mockEngine.validateEnvironment();

      expect(result).toEqual(mockValidation);
      expect(mockEngine.validateEnvironment).toHaveBeenCalled();
    });
  });

  describe('Type Compatibility', () => {
    it('should allow implementing IDynamicContentProcessor', () => {
      class TestProcessor implements IDynamicContentProcessor {
        readonly type = DynamicContentType.DIAGRAM;
        readonly name = 'Test Processor';

        async detect(
          content: string,
          _context: ProcessingContext,
        ): Promise<number> {
          return content.includes('@startuml') ? 1.0 : 0.0;
        }

        async process(
          content: string,
          _context: ProcessingContext,
        ): Promise<ProcessedContent> {
          return {
            html: `<div>Processed: ${content}</div>`,
            metadata: {
              type: this.type,
              processingTime: 100,
              warnings: [],
            },
          };
        }

        async getDimensions(
          _processedContent: ProcessedContent,
          _context: ProcessingContext,
        ): Promise<ContentDimensions> {
          return { pageCount: 1, width: 800, height: 600 };
        }

        async validateEnvironment() {
          return { isSupported: true, issues: [], recommendations: [] };
        }

        setCache(_cache: IContentCache): void {
          // Implementation
        }
      }

      const processor = new TestProcessor();
      expect(processor.type).toBe(DynamicContentType.DIAGRAM);
      expect(processor.name).toBe('Test Processor');
    });
  });
});
