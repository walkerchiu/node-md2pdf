/**
 * @jest-environment node
 */

import * as MetadataModule from '../../../../src/core/metadata/index';

describe('Metadata Module Index', () => {
  describe('exports', () => {
    it('should export all types from types module', () => {
      // Type exports
      expect(MetadataModule.DEFAULT_METADATA_CONFIG).toBeDefined();

      // Note: TypeScript interfaces and types are not available at runtime,
      // but we can check that the module exports the constants and defaults
      expect(typeof MetadataModule.DEFAULT_METADATA_CONFIG).toBe('object');
      expect(MetadataModule.DEFAULT_METADATA_CONFIG.enabled).toBe(true);
    });

    it('should export MetadataExtractor class', () => {
      expect(MetadataModule.MetadataExtractor).toBeDefined();
      expect(typeof MetadataModule.MetadataExtractor).toBe('function');
      expect(MetadataModule.MetadataExtractor.name).toBe('MetadataExtractor');
    });

    it('should export MetadataService class', () => {
      expect(MetadataModule.MetadataService).toBeDefined();
      expect(typeof MetadataModule.MetadataService).toBe('function');
      expect(MetadataModule.MetadataService.name).toBe('MetadataService');
    });

    it('should export static methods from MetadataExtractor', () => {
      expect(MetadataModule.MetadataExtractor.createContext).toBeDefined();
      expect(typeof MetadataModule.MetadataExtractor.createContext).toBe(
        'function',
      );
    });
  });

  describe('module structure', () => {
    it('should be a complete metadata solution', () => {
      // Check that we can use the exported classes together
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
      };

      const extractor = new MetadataModule.MetadataExtractor(mockLogger);
      const service = new MetadataModule.MetadataService(mockLogger);

      expect(extractor).toBeInstanceOf(MetadataModule.MetadataExtractor);
      expect(service).toBeInstanceOf(MetadataModule.MetadataService);
    });

    it('should provide all necessary components for metadata processing', () => {
      // Verify the module provides a complete API surface
      const expectedExports = [
        // Types module exports
        'DEFAULT_METADATA_CONFIG',

        // Extractor module exports
        'MetadataExtractor',

        // Service module exports
        'MetadataService',
      ];

      expectedExports.forEach((exportName) => {
        expect(MetadataModule).toHaveProperty(exportName);
        expect((MetadataModule as any)[exportName]).toBeDefined();
      });
    });
  });

  describe('DEFAULT_METADATA_CONFIG validation', () => {
    it('should have correct default configuration structure', () => {
      const config = MetadataModule.DEFAULT_METADATA_CONFIG;

      expect(config.enabled).toBe(true);
      expect(config.autoExtraction).toBeDefined();
      expect(config.autoExtraction.fromFrontmatter).toBe(true);
      expect(config.autoExtraction.fromContent).toBe(true);
      expect(config.autoExtraction.fromFilename).toBe(false);
      expect(config.autoExtraction.computeStats).toBe(true);

      expect(config.defaults).toBeDefined();
      expect(config.defaults.creator).toBe('MD2PDF');
      expect(config.defaults.producer).toBe('MD2PDF');
      expect(config.defaults.language).toBe('en');
      expect(config.defaults.format).toBe('markdown');

      expect(config.frontmatterMapping).toBeDefined();
      expect(config.validation).toBeDefined();
      expect(config.validation.requireTitle).toBe(false);
      expect(config.validation.requireAuthor).toBe(false);
    });
  });

  describe('class constructors', () => {
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
    });

    it('should allow MetadataExtractor instantiation', () => {
      expect(() => {
        new MetadataModule.MetadataExtractor(mockLogger);
      }).not.toThrow();
    });

    it('should allow MetadataService instantiation', () => {
      expect(() => {
        new MetadataModule.MetadataService(mockLogger);
      }).not.toThrow();
    });

    it('should create functional instances', async () => {
      const extractor = new MetadataModule.MetadataExtractor(mockLogger);
      const service = new MetadataModule.MetadataService(mockLogger);

      // Test that the instances have the expected methods
      expect(typeof extractor.extractMetadata).toBe('function');
      expect(typeof service.extractMetadata).toBe('function');
      expect(typeof service.extractMetadataSimple).toBe('function');
      expect(typeof service.toPdfInfo).toBe('function');
      expect(typeof service.toHtmlMetaTags).toBe('function');
      expect(typeof service.generateSummary).toBe('function');
      expect(typeof service.mergeMetadata).toBe('function');
      expect(typeof service.filterMetadata).toBe('function');
      expect(typeof service.getDocumentLanguage).toBe('function');
    });
  });

  describe('integration readiness', () => {
    it('should provide complete workflow components', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
      };

      // Simulate a complete metadata workflow
      const service = new MetadataModule.MetadataService(mockLogger);

      // Create context using the static method
      const context = MetadataModule.MetadataExtractor.createContext(
        '# Test Document\n\nThis is a test document.',
        '/test/path.md',
      );

      expect(context).toBeDefined();
      expect(context.markdownContent).toContain('Test Document');
      expect(context.filePath).toBe('/test/path.md');
      expect(context.config).toEqual(MetadataModule.DEFAULT_METADATA_CONFIG);
    });

    it('should support all documented metadata operations', () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
      };

      const service = new MetadataModule.MetadataService(mockLogger);

      // Test metadata transformation methods
      const sampleMetadata = {
        title: 'Test Document',
        author: 'Test Author',
        language: 'zh-TW',
      };

      // Should be able to convert to PDF info
      const pdfInfo = service.toPdfInfo(sampleMetadata);
      expect(pdfInfo.Title).toBe('Test Document');

      // Should be able to generate HTML meta tags
      const htmlTags = service.toHtmlMetaTags(sampleMetadata);
      expect(htmlTags).toContain('<title>Test Document</title>');

      // Should be able to generate summary
      const summary = service.generateSummary(sampleMetadata);
      expect(summary).toContain('Title: "Test Document"');

      // Should be able to get document language
      const language = service.getDocumentLanguage(sampleMetadata);
      expect(language).toBe('zh-TW');
    });
  });

  describe('TypeScript compatibility', () => {
    it('should maintain proper typing through re-exports', () => {
      // This test ensures that TypeScript types are properly re-exported
      // While we can't test types at runtime, we can verify the structure
      const config = MetadataModule.DEFAULT_METADATA_CONFIG;

      // These should be typed correctly in TypeScript
      expect(typeof config.enabled).toBe('boolean');
      expect(typeof config.autoExtraction.fromFrontmatter).toBe('boolean');
      expect(typeof config.defaults.creator).toBe('string');
      expect(typeof config.validation.maxKeywordLength).toBe('number');
    });
  });

  describe('module completeness', () => {
    it('should not have any critical missing exports', () => {
      // Ensure we haven't missed any important exports
      const moduleKeys = Object.keys(MetadataModule);
      const expectedMinimumExports = [
        'MetadataExtractor',
        'MetadataService',
        'DEFAULT_METADATA_CONFIG',
      ];

      expectedMinimumExports.forEach((exportName) => {
        expect(moduleKeys).toContain(exportName);
      });
    });

    it('should provide a clean API surface', () => {
      // Verify we don't have unexpected exports that might indicate issues
      const moduleKeys = Object.keys(MetadataModule);

      // Should not export implementation details or internal functions
      const internalPatterns = ['__', 'private', 'internal'];

      moduleKeys.forEach((key) => {
        internalPatterns.forEach((pattern) => {
          expect(key).not.toMatch(new RegExp(pattern, 'i'));
        });
      });
    });
  });
});

// Additional helper to verify the module can be used as documented
describe('Metadata Module Usage Examples', () => {
  let mockLogger: any;
  let service: any;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };
    service = new MetadataModule.MetadataService(mockLogger);
  });

  it('should support basic metadata extraction workflow', () => {
    // Example usage as would be documented
    const markdownContent = `---
title: Example Document
author: Example Author
language: zh-TW
---

# Main Title

Content here.`;

    const context = MetadataModule.MetadataExtractor.createContext(
      markdownContent,
      '/example/doc.md',
      { enabled: true },
    );

    expect(context.frontmatter?.title).toBe('Example Document');
    expect(context.frontmatter?.language).toBe('zh-TW');
  });

  it('should support metadata conversion workflows', () => {
    const metadata = {
      title: 'Conversion Test',
      author: 'Test Author',
      language: 'en',
      wordCount: 150,
    };

    // PDF conversion
    const pdfInfo = service.toPdfInfo(metadata);
    expect(pdfInfo.Title).toBe('Conversion Test');

    // HTML meta tags
    const htmlTags = service.toHtmlMetaTags(metadata);
    expect(htmlTags).toContain('Conversion Test');

    // Summary generation
    const summary = service.generateSummary(metadata);
    expect(summary).toContain('Words: 150');

    // Language extraction
    const docLanguage = service.getDocumentLanguage(metadata);
    expect(docLanguage).toBe('en');
  });

  it('should support metadata filtering and merging', () => {
    const baseMetadata = {
      title: 'Base Title',
      wordCount: 100,
      hasImages: true,
    };

    const additionalMetadata = {
      author: 'New Author',
      version: '2.0.0',
    };

    // Merging
    const merged = service.mergeMetadata(baseMetadata, additionalMetadata);
    expect(merged.title).toBe('Base Title');
    expect(merged.author).toBe('New Author');
    expect(merged.version).toBe('2.0.0');

    // Filtering
    const filtered = service.filterMetadata(merged, {
      includeComputed: false,
    });
    expect(filtered.title).toBe('Base Title');
    expect(filtered.wordCount).toBeUndefined();
  });
});
