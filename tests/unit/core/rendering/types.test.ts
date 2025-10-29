/**
 * Unit tests for rendering types
 * Tests type definitions and enums for two-stage rendering system
 */

import {
  DynamicContentType,
  ProcessingContext,
  ProcessedContent,
  ContentDimensions,
  RealPageNumbers,
  TwoStageRenderingOptions,
  RenderingResult,
} from '../../../../src/core/rendering/types';

describe('Rendering Types', () => {
  describe('DynamicContentType Enum', () => {
    it('should have correct TOC value', () => {
      expect(DynamicContentType.TOC).toBe('toc');
    });

    it('should have correct IMAGE value', () => {
      expect(DynamicContentType.IMAGE).toBe('image');
    });

    it('should have correct DIAGRAM value', () => {
      expect(DynamicContentType.DIAGRAM).toBe('diagram');
    });

    it('should have correct COMPLEX_LAYOUT value', () => {
      expect(DynamicContentType.COMPLEX_LAYOUT).toBe('complex_layout');
    });

    it('should have all expected enum values', () => {
      const enumValues = Object.values(DynamicContentType);
      expect(enumValues).toHaveLength(6);
      expect(enumValues).toContain('toc');
      expect(enumValues).toContain('image');
      expect(enumValues).toContain('diagram');
      expect(enumValues).toContain('plantuml');
      expect(enumValues).toContain('mermaid');
      expect(enumValues).toContain('complex_layout');
    });
  });

  describe('ProcessingContext Interface', () => {
    it('should create valid processing context with minimal properties', () => {
      const context: ProcessingContext = {
        filePath: '/test/document.md',
      };

      expect(context.filePath).toBe('/test/document.md');
      expect(context.pdfOptions).toBeUndefined();
      expect(context.tocOptions).toBeUndefined();
      expect(context.headings).toBeUndefined();
      expect(context.isPreRendering).toBeUndefined();
    });

    it('should create valid processing context with all properties', () => {
      const context: ProcessingContext = {
        filePath: '/test/document.md',
        pdfOptions: {
          includePageNumbers: true,
          margins: {
            top: '2cm',
            right: '2cm',
            bottom: '2cm',
            left: '2cm',
          },
        },
        tocOptions: {
          enabled: true,
          includePageNumbers: true,
          maxDepth: 3,
        },
        headings: [
          {
            id: 'heading-1',
            level: 1,
            text: 'Test Heading',
            anchor: 'test-heading',
          },
        ],
        isPreRendering: false,
      };

      expect(context.filePath).toBe('/test/document.md');
      expect(context.pdfOptions?.includePageNumbers).toBe(true);
      expect(context.pdfOptions?.margins?.top).toBe('2cm');
      expect(context.tocOptions?.enabled).toBe(true);
      expect(context.tocOptions?.maxDepth).toBe(3);
      expect(context.headings).toHaveLength(1);
      expect(context.isPreRendering).toBe(false);
    });

    it('should create valid processing context with logger', () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const context: ProcessingContext = {
        filePath: '/test/document.md',
        logger: mockLogger,
        isPreRendering: true,
      };

      expect(context.filePath).toBe('/test/document.md');
      expect(context.logger).toBe(mockLogger);
      expect(context.isPreRendering).toBe(true);
      expect(typeof context.logger?.info).toBe('function');
      expect(typeof context.logger?.warn).toBe('function');
      expect(typeof context.logger?.error).toBe('function');
      expect(typeof context.logger?.debug).toBe('function');
    });

    it('should create processing context without logger (optional)', () => {
      const context: ProcessingContext = {
        filePath: '/test/document.md',
        isPreRendering: false,
      };

      expect(context.filePath).toBe('/test/document.md');
      expect(context.logger).toBeUndefined();
      expect(context.isPreRendering).toBe(false);
    });

    it('should support logger with partial interface', () => {
      const partialLogger = {
        info: jest.fn(),
        error: jest.fn(),
      };

      const context: ProcessingContext = {
        filePath: '/test/document.md',
        logger: partialLogger,
      };

      expect(context.logger?.info).toBeDefined();
      expect(context.logger?.error).toBeDefined();
    });
  });

  describe('ProcessedContent Interface', () => {
    it('should create valid processed content', () => {
      const processedContent: ProcessedContent = {
        html: '<div>Processed content</div>',
        metadata: {
          type: DynamicContentType.DIAGRAM,
          processingTime: 1500,
          warnings: ['Performance warning'],
          details: {
            diagramType: 'plantuml',
            renderingMethod: 'local',
          },
        },
      };

      expect(processedContent.html).toBe('<div>Processed content</div>');
      expect(processedContent.metadata.type).toBe(DynamicContentType.DIAGRAM);
      expect(processedContent.metadata.processingTime).toBe(1500);
      expect(processedContent.metadata.warnings).toContain(
        'Performance warning',
      );
      expect(processedContent.metadata.details?.diagramType).toBe('plantuml');
    });

    it('should create processed content with minimal metadata', () => {
      const processedContent: ProcessedContent = {
        html: '<h1>Simple heading</h1>',
        metadata: {
          type: DynamicContentType.TOC,
          processingTime: 100,
          warnings: [],
        },
      };

      expect(processedContent.metadata.warnings).toHaveLength(0);
      expect(processedContent.metadata.details).toBeUndefined();
    });
  });

  describe('ContentDimensions Interface', () => {
    it('should create valid content dimensions', () => {
      const dimensions: ContentDimensions = {
        pageCount: 3,
        height: 2480,
        width: 1754,
        headingPositions: [
          {
            id: 'heading-1',
            pageNumber: 1,
            offsetTop: 100,
          },
          {
            id: 'heading-2',
            pageNumber: 2,
            offsetTop: 50,
          },
        ],
        imagePositions: [
          {
            src: 'test-image.png',
            pageNumber: 2,
            offsetTop: 200,
            height: 300,
          },
        ],
      };

      expect(dimensions.pageCount).toBe(3);
      expect(dimensions.height).toBe(2480);
      expect(dimensions.width).toBe(1754);
      expect(dimensions.headingPositions).toHaveLength(2);
      expect(dimensions.imagePositions).toHaveLength(1);
      expect(dimensions.headingPositions?.[0].id).toBe('heading-1');
      expect(dimensions.imagePositions?.[0].src).toBe('test-image.png');
    });

    it('should create dimensions without optional position arrays', () => {
      const dimensions: ContentDimensions = {
        pageCount: 1,
        height: 827,
        width: 1754,
      };

      expect(dimensions.headingPositions).toBeUndefined();
      expect(dimensions.imagePositions).toBeUndefined();
    });
  });

  describe('RealPageNumbers Interface', () => {
    it('should create valid real page numbers', () => {
      const pageNumbers: RealPageNumbers = {
        headingPages: {
          'heading-1': 1,
          'heading-2': 2,
          'heading-3': 3,
        },
        contentPageCount: 3,
        positions: [
          {
            id: 'heading-1',
            pageNumber: 1,
            offsetTop: 100,
            elementType: 'heading',
          },
          {
            id: 'image-1',
            pageNumber: 2,
            offsetTop: 200,
            elementType: 'image',
          },
          {
            id: 'diagram-1',
            pageNumber: 3,
            offsetTop: 150,
            elementType: 'diagram',
          },
        ],
      };

      expect(pageNumbers.headingPages['heading-1']).toBe(1);
      expect(pageNumbers.contentPageCount).toBe(3);
      expect(pageNumbers.positions).toHaveLength(3);
      expect(pageNumbers.positions[0].elementType).toBe('heading');
      expect(pageNumbers.positions[1].elementType).toBe('image');
      expect(pageNumbers.positions[2].elementType).toBe('diagram');
    });
  });

  describe('TwoStageRenderingOptions Interface', () => {
    it('should create valid rendering options', () => {
      const options: TwoStageRenderingOptions = {
        enabled: true,
        forceAccuratePageNumbers: false,
        maxPerformanceImpact: 50,
        enableCaching: true,
        cacheDirectory: '/tmp/md2pdf-cache',
      };

      expect(options.enabled).toBe(true);
      expect(options.forceAccuratePageNumbers).toBe(false);
      expect(options.maxPerformanceImpact).toBe(50);
      expect(options.enableCaching).toBe(true);
      expect(options.cacheDirectory).toBe('/tmp/md2pdf-cache');
    });

    it('should create options without optional cache directory', () => {
      const options: TwoStageRenderingOptions = {
        enabled: false,
        forceAccuratePageNumbers: true,
        maxPerformanceImpact: 25,
        enableCaching: false,
      };

      expect(options.cacheDirectory).toBeUndefined();
    });
  });

  describe('RenderingResult Interface', () => {
    it('should create valid rendering result with full data', () => {
      const result: RenderingResult = {
        html: '<html><body><h1>Test Document</h1></body></html>',
        usedTwoStageRendering: true,
        performance: {
          totalTime: 2500,
          preRenderTime: 1000,
          finalRenderTime: 1500,
        },
        pageNumbers: {
          headingPages: { 'heading-1': 1 },
          contentPageCount: 1,
          positions: [
            {
              id: 'heading-1',
              pageNumber: 1,
              offsetTop: 100,
              elementType: 'heading',
            },
          ],
        },
        metadata: {
          processedContentTypes: [
            DynamicContentType.TOC,
            DynamicContentType.DIAGRAM,
          ],
          warnings: ['Performance impact detected'],
          cacheHits: 5,
          cacheMisses: 2,
        },
      };

      expect(result.html).toContain('<h1>Test Document</h1>');
      expect(result.usedTwoStageRendering).toBe(true);
      expect(result.performance.totalTime).toBe(2500);
      expect(result.performance.preRenderTime).toBe(1000);
      expect(result.performance.finalRenderTime).toBe(1500);
      expect(result.pageNumbers?.contentPageCount).toBe(1);
      expect(result.metadata.processedContentTypes).toContain(
        DynamicContentType.TOC,
      );
      expect(result.metadata.processedContentTypes).toContain(
        DynamicContentType.DIAGRAM,
      );
      expect(result.metadata.warnings).toContain('Performance impact detected');
      expect(result.metadata.cacheHits).toBe(5);
      expect(result.metadata.cacheMisses).toBe(2);
    });

    it('should create rendering result without optional properties', () => {
      const result: RenderingResult = {
        html: '<html><body><p>Simple document</p></body></html>',
        usedTwoStageRendering: false,
        performance: {
          totalTime: 500,
        },
        metadata: {
          processedContentTypes: [],
          warnings: [],
          cacheHits: 0,
          cacheMisses: 0,
        },
      };

      expect(result.performance.preRenderTime).toBeUndefined();
      expect(result.performance.finalRenderTime).toBeUndefined();
      expect(result.pageNumbers).toBeUndefined();
      expect(result.metadata.processedContentTypes).toHaveLength(0);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow creating nested type structures', () => {
      const context: ProcessingContext = {
        filePath: '/test/doc.md',
        tocOptions: {
          enabled: true,
          includePageNumbers: true,
        },
      };

      const processedContent: ProcessedContent = {
        html: '<div>TOC content</div>',
        metadata: {
          type: DynamicContentType.TOC,
          processingTime: 200,
          warnings: [],
          details: {
            headingCount: 5,
            maxDepth: 3,
          },
        },
      };

      const dimensions: ContentDimensions = {
        pageCount: 1,
        height: 200,
        width: 800,
      };

      expect(context.tocOptions?.enabled).toBe(true);
      expect(processedContent.metadata.type).toBe(DynamicContentType.TOC);
      expect(dimensions.pageCount).toBe(1);
    });

    it('should work with union types', () => {
      const elementTypes: Array<'heading' | 'image' | 'diagram'> = [
        'heading',
        'image',
        'diagram',
      ];

      elementTypes.forEach((type) => {
        expect(['heading', 'image', 'diagram']).toContain(type);
      });
    });
  });
});
