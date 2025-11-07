/**
 * @jest-environment node
 */

import {
  StandardPdfMetadata,
  ExtendedMetadata,
  DocumentMetadata,
  MetadataSource,
  MetadataEntry,
  MetadataCollection,
  MetadataConfig,
  DEFAULT_METADATA_CONFIG,
  MetadataExtractionResult,
  MetadataExtractionContext,
} from '../../../../src/core/metadata/types';

describe('Metadata Types', () => {
  describe('StandardPdfMetadata', () => {
    it('should define standard PDF metadata fields', () => {
      const metadata: StandardPdfMetadata = {
        title: 'Test Document',
        author: 'Test Author',
        subject: 'Test Subject',
        keywords: 'test, document',
        creator: 'MD2PDF',
        producer: 'MD2PDF',
        creationDate: new Date(),
        modDate: new Date(),
      };

      expect(metadata.title).toBe('Test Document');
      expect(metadata.author).toBe('Test Author');
      expect(metadata.subject).toBe('Test Subject');
      expect(metadata.keywords).toBe('test, document');
      expect(metadata.creator).toBe('MD2PDF');
      expect(metadata.producer).toBe('MD2PDF');
      expect(metadata.creationDate).toBeInstanceOf(Date);
      expect(metadata.modDate).toBeInstanceOf(Date);
    });

    it('should allow optional fields', () => {
      const metadata: StandardPdfMetadata = {};
      expect(metadata.title).toBeUndefined();
      expect(metadata.author).toBeUndefined();
    });
  });

  describe('ExtendedMetadata', () => {
    it('should define extended metadata fields', () => {
      const metadata: ExtendedMetadata = {
        organization: 'Test Org',
        department: 'Engineering',
        team: 'Platform',
        category: 'Documentation',
        version: '1.0.0',
        language: 'en',
        copyright: '© 2025 Test Org',
        license: 'MIT',
        confidentiality: 'internal',
        email: 'test@example.com',
        website: 'https://example.com',
        format: 'markdown',
        generator: 'MD2PDF v1.0.0',
        custom: {
          customField: 'customValue',
          customNumber: 42,
          customBoolean: true,
        },
      };

      expect(metadata.organization).toBe('Test Org');
      expect(metadata.confidentiality).toBe('internal');
      expect(metadata.custom?.customField).toBe('customValue');
      expect(metadata.custom?.customNumber).toBe(42);
      expect(metadata.custom?.customBoolean).toBe(true);
    });

    it('should support confidentiality levels', () => {
      const levels: ExtendedMetadata['confidentiality'][] = [
        'public',
        'internal',
        'confidential',
        'restricted',
      ];

      levels.forEach((level) => {
        const metadata: ExtendedMetadata = level
          ? { confidentiality: level }
          : {};
        expect(metadata.confidentiality).toBe(level);
      });
    });
  });

  describe('DocumentMetadata', () => {
    it('should combine standard and extended metadata', () => {
      const metadata: DocumentMetadata = {
        title: 'Test Document',
        author: 'Test Author',
        organization: 'Test Org',
        wordCount: 1000,
        pageCount: 5,
        hasImages: true,
        hasTables: false,
      };

      expect(metadata.title).toBe('Test Document');
      expect(metadata.organization).toBe('Test Org');
      expect(metadata.wordCount).toBe(1000);
      expect(metadata.hasImages).toBe(true);
    });
  });

  describe('MetadataSource', () => {
    it('should define metadata source types', () => {
      const sources: MetadataSource[] = [
        'frontmatter',
        'config',
        'cli',
        'auto',
        'default',
      ];

      sources.forEach((source) => {
        expect(typeof source).toBe('string');
      });
    });
  });

  describe('MetadataEntry', () => {
    it('should track value with source and priority', () => {
      const entry: MetadataEntry<string> = {
        value: 'Test Value',
        source: 'frontmatter',
        priority: 100,
      };

      expect(entry.value).toBe('Test Value');
      expect(entry.source).toBe('frontmatter');
      expect(entry.priority).toBe(100);
    });

    it('should support different value types', () => {
      const stringEntry: MetadataEntry<string> = {
        value: 'string',
        source: 'config',
        priority: 50,
      };

      const numberEntry: MetadataEntry<number> = {
        value: 42,
        source: 'auto',
        priority: 25,
      };

      const booleanEntry: MetadataEntry<boolean> = {
        value: true,
        source: 'cli',
        priority: 75,
      };

      expect(stringEntry.value).toBe('string');
      expect(numberEntry.value).toBe(42);
      expect(booleanEntry.value).toBe(true);
    });
  });

  describe('MetadataCollection', () => {
    it('should organize metadata entries by type', () => {
      const collection: MetadataCollection = {
        standard: {
          title: {
            value: 'Test Title',
            source: 'frontmatter',
            priority: 100,
          },
        },
        extended: {
          organization: {
            value: 'Test Org',
            source: 'config',
            priority: 50,
          },
        },
        computed: {
          wordCount: {
            value: 1000,
            source: 'auto',
            priority: 25,
          },
        },
      };

      expect(collection.standard.title?.value).toBe('Test Title');
      expect(collection.extended.organization?.value).toBe('Test Org');
      expect(collection.computed.wordCount?.value).toBe(1000);
    });
  });

  describe('DEFAULT_METADATA_CONFIG', () => {
    it('should provide default configuration', () => {
      expect(DEFAULT_METADATA_CONFIG.enabled).toBe(true);
      expect(DEFAULT_METADATA_CONFIG.autoExtraction.fromFrontmatter).toBe(true);
      expect(DEFAULT_METADATA_CONFIG.autoExtraction.fromContent).toBe(true);
      expect(DEFAULT_METADATA_CONFIG.autoExtraction.fromFilename).toBe(false);
      expect(DEFAULT_METADATA_CONFIG.autoExtraction.computeStats).toBe(true);
    });

    it('should have default values', () => {
      expect(DEFAULT_METADATA_CONFIG.defaults.creator).toBe('MD2PDF');
      expect(DEFAULT_METADATA_CONFIG.defaults.producer).toBe('MD2PDF');
      expect(DEFAULT_METADATA_CONFIG.defaults.language).toBe('en');
      expect(DEFAULT_METADATA_CONFIG.defaults.format).toBe('markdown');
    });

    it('should have frontmatter mapping', () => {
      const mapping = DEFAULT_METADATA_CONFIG.frontmatterMapping;
      expect(mapping.title).toBe('title');
      expect(mapping.author).toBe('author');
      expect(mapping.authors).toBe('author');
      expect(mapping.description).toBe('subject');
      expect(mapping.lang).toBe('language');
    });

    it('should have validation rules', () => {
      const validation = DEFAULT_METADATA_CONFIG.validation;
      expect(validation.requireTitle).toBe(false);
      expect(validation.requireAuthor).toBe(false);
      expect(validation.maxKeywordLength).toBe(255);
      expect(validation.maxSubjectLength).toBe(512);
    });
  });

  describe('MetadataExtractionResult', () => {
    it('should contain extraction results', () => {
      const result: MetadataExtractionResult = {
        metadata: {
          title: 'Test Document',
          wordCount: 1000,
        },
        sources: {
          standard: {},
          extended: {},
          computed: {},
        },
        warnings: ['Missing author'],
        errors: [],
      };

      expect(result.metadata.title).toBe('Test Document');
      expect(result.warnings).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('MetadataExtractionContext', () => {
    it('should provide extraction context', () => {
      const context: MetadataExtractionContext = {
        markdownContent: '# Test Document\n\nThis is a test.',
        filePath: '/path/to/test.md',
        frontmatter: {
          title: 'Test Document',
          author: 'Test Author',
        },
        config: DEFAULT_METADATA_CONFIG,
        generateDate: new Date('2025-01-01'),
      };

      expect(context.markdownContent).toContain('# Test Document');
      expect(context.filePath).toBe('/path/to/test.md');
      expect(context.frontmatter?.title).toBe('Test Document');
      expect(context.config).toBe(DEFAULT_METADATA_CONFIG);
      expect(context.generateDate).toEqual(new Date('2025-01-01'));
    });

    it('should work with minimal required fields', () => {
      const context: MetadataExtractionContext = {
        markdownContent: '# Simple Test',
        config: DEFAULT_METADATA_CONFIG,
      };

      expect(context.markdownContent).toBe('# Simple Test');
      expect(context.filePath).toBeUndefined();
      expect(context.frontmatter).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce type constraints', () => {
      // This test ensures TypeScript compilation succeeds with proper types
      const metadata: DocumentMetadata = {
        title: 'Test',
        wordCount: 100,
        hasImages: false,
      };

      // These should compile without errors
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.wordCount).toBe('number');
      expect(typeof metadata.hasImages).toBe('boolean');
    });

    it('should support partial metadata objects', () => {
      const partial: Partial<DocumentMetadata> = {
        title: 'Partial Test',
      };

      expect(partial.title).toBe('Partial Test');
      expect(partial.author).toBeUndefined();
    });
  });
});
