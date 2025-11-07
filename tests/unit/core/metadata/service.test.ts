/**
 * @jest-environment node
 */

import { MetadataService } from '../../../../src/core/metadata/service';
import { MetadataExtractor } from '../../../../src/core/metadata/extractor';
import {
  DEFAULT_METADATA_CONFIG,
  type DocumentMetadata,
  type MetadataExtractionContext,
  type MetadataExtractionResult,
} from '../../../../src/core/metadata/types';
import type { ILogger } from '../../../../src/infrastructure/logging/types';

// Mock the MetadataExtractor
jest.mock('../../../../src/core/metadata/extractor');

describe('MetadataService', () => {
  let service: MetadataService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockExtractor: jest.Mocked<MetadataExtractor>;

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

    mockExtractor = {
      extractMetadata: jest.fn(),
    } as any;

    // Mock the MetadataExtractor constructor
    (
      MetadataExtractor as jest.MockedClass<typeof MetadataExtractor>
    ).mockImplementation(() => mockExtractor);

    // Mock static methods
    MetadataExtractor.createContext = jest.fn();

    service = new MetadataService(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create MetadataExtractor instance', () => {
      expect(MetadataExtractor).toHaveBeenCalledWith(mockLogger);
    });
  });

  describe('extractMetadata', () => {
    it('should log debug information and delegate to extractor', async () => {
      const mockResult: MetadataExtractionResult = {
        metadata: { title: 'Test Title' },
        sources: { standard: {}, extended: {}, computed: {} },
        warnings: [],
        errors: [],
      };

      mockExtractor.extractMetadata.mockResolvedValue(mockResult);

      const context: MetadataExtractionContext = {
        markdownContent: '# Test',
        filePath: '/path/to/test.md',
        frontmatter: { title: 'Frontmatter Title' },
        config: DEFAULT_METADATA_CONFIG,
      };

      const result = await service.extractMetadata(context);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting metadata extraction',
        {
          filePath: '/path/to/test.md',
          hasFrontmatter: true,
        },
      );

      expect(mockExtractor.extractMetadata).toHaveBeenCalledWith(context);
      expect(result).toBe(mockResult);
    });

    it('should handle context without frontmatter', async () => {
      const mockResult: MetadataExtractionResult = {
        metadata: { title: 'Test Title' },
        sources: { standard: {}, extended: {}, computed: {} },
        warnings: [],
        errors: [],
      };

      mockExtractor.extractMetadata.mockResolvedValue(mockResult);

      const context: MetadataExtractionContext = {
        markdownContent: '# Test',
        config: DEFAULT_METADATA_CONFIG,
      };

      await service.extractMetadata(context);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting metadata extraction',
        {
          filePath: undefined,
          hasFrontmatter: false,
        },
      );
    });
  });

  describe('extractMetadataSimple', () => {
    it('should create context and extract metadata', async () => {
      const mockContext: MetadataExtractionContext = {
        markdownContent: '# Test Content',
        filePath: '/path/to/file.md',
        config: DEFAULT_METADATA_CONFIG,
      };

      const mockResult: MetadataExtractionResult = {
        metadata: { title: 'Test Title' },
        sources: { standard: {}, extended: {}, computed: {} },
        warnings: [],
        errors: [],
      };

      MetadataExtractor.createContext = jest.fn().mockReturnValue(mockContext);
      mockExtractor.extractMetadata.mockResolvedValue(mockResult);

      const result = await service.extractMetadataSimple(
        '# Test Content',
        '/path/to/file.md',
        { enabled: false },
      );

      expect(MetadataExtractor.createContext).toHaveBeenCalledWith(
        '# Test Content',
        '/path/to/file.md',
        { enabled: false },
      );

      expect(mockExtractor.extractMetadata).toHaveBeenCalledWith(mockContext);
      expect(result).toBe(mockResult);
    });

    it('should handle optional parameters', async () => {
      const mockContext: MetadataExtractionContext = {
        markdownContent: '# Simple Test',
        config: DEFAULT_METADATA_CONFIG,
      };

      MetadataExtractor.createContext = jest.fn().mockReturnValue(mockContext);
      mockExtractor.extractMetadata.mockResolvedValue({
        metadata: {},
        sources: { standard: {}, extended: {}, computed: {} },
        warnings: [],
        errors: [],
      });

      await service.extractMetadataSimple('# Simple Test');

      expect(MetadataExtractor.createContext).toHaveBeenCalledWith(
        '# Simple Test',
        undefined,
        undefined,
      );
    });
  });

  describe('toPdfInfo', () => {
    it('should convert metadata to PDF info format', () => {
      const metadata: DocumentMetadata = {
        title: 'Test Document',
        author: 'Test Author',
        subject: 'Test Subject',
        keywords: 'test, document',
        creator: 'MD2PDF',
        producer: 'MD2PDF',
        creationDate: new Date('2025-01-01T00:00:00Z'),
        modDate: new Date('2025-01-15T00:00:00Z'),
      };

      const pdfInfo = service.toPdfInfo(metadata);

      expect(pdfInfo).toEqual({
        Title: 'Test Document',
        Author: 'Test Author',
        Subject: 'Test Subject',
        Keywords: 'test, document',
        Creator: 'MD2PDF',
        Producer: 'MD2PDF',
        CreationDate: '2025-01-01T00:00:00.000Z',
        ModDate: '2025-01-15T00:00:00.000Z',
      });
    });

    it('should handle partial metadata', () => {
      const metadata: DocumentMetadata = {
        title: 'Partial Title',
        author: 'Partial Author',
      };

      const pdfInfo = service.toPdfInfo(metadata);

      expect(pdfInfo).toEqual({
        Title: 'Partial Title',
        Author: 'Partial Author',
      });
    });

    it('should handle empty metadata', () => {
      const metadata: DocumentMetadata = {};

      const pdfInfo = service.toPdfInfo(metadata);

      expect(pdfInfo).toEqual({});
    });
  });

  describe('toHtmlMetaTags', () => {
    it('should generate HTML meta tags with escaping', () => {
      const metadata: DocumentMetadata = {
        title: 'Test & Title <script>',
        author: 'Test "Author"',
        subject: 'Test Subject',
        keywords: 'test, html, meta',
        language: 'zh-TW',
        organization: 'Test Organization',
        copyright: '© 2025 Test Corp',
        version: '1.0.0',
      };

      const html = service.toHtmlMetaTags(metadata);

      expect(html).toContain('<title>Test &amp; Title &lt;script&gt;</title>');
      expect(html).toContain(
        '<meta name="author" content="Test &quot;Author&quot;">',
      );
      expect(html).toContain(
        '<meta name="description" content="Test Subject">',
      );
      expect(html).toContain(
        '<meta name="keywords" content="test, html, meta">',
      );
      expect(html).toContain('<meta name="language" content="zh-TW">');
      expect(html).toContain(
        '<meta name="organization" content="Test Organization">',
      );
      expect(html).toContain(
        '<meta name="copyright" content="© 2025 Test Corp">',
      );
      expect(html).toContain('<meta name="version" content="1.0.0">');

      // Dublin Core tags
      expect(html).toContain(
        '<meta name="DC.title" content="Test &amp; Title &lt;script&gt;">',
      );
      expect(html).toContain(
        '<meta name="DC.creator" content="Test &quot;Author&quot;">',
      );
      expect(html).toContain(
        '<meta name="DC.description" content="Test Subject">',
      );
      expect(html).toContain('<meta name="DC.language" content="zh-TW">');
    });

    it('should handle empty metadata gracefully', () => {
      const metadata: DocumentMetadata = {};

      const html = service.toHtmlMetaTags(metadata);

      expect(html).toBe('');
    });

    it('should handle special characters in values', () => {
      const metadata: DocumentMetadata = {
        title: 'Title with "quotes" & <tags>',
        subject: "Subject with 'single quotes'",
      };

      const html = service.toHtmlMetaTags(metadata);

      expect(html).toContain(
        'Title with &quot;quotes&quot; &amp; &lt;tags&gt;',
      );
      expect(html).toContain('Subject with &#39;single quotes&#39;');
    });
  });

  describe('generateSummary', () => {
    it('should generate comprehensive metadata summary', () => {
      const metadata: DocumentMetadata = {
        title: 'Test Document',
        author: 'Test Author',
        organization: 'Test Org',
        version: '1.0.0',
        wordCount: 500,
        pageCount: 2,
        hasImages: true,
        hasTables: false,
        hasCodeBlocks: true,
        hasDiagrams: true,
      };

      const summary = service.generateSummary(metadata);

      expect(summary).toContain('Title: "Test Document"');
      expect(summary).toContain('Author: "Test Author"');
      expect(summary).toContain('Organization: "Test Org"');
      expect(summary).toContain('Version: "1.0.0"');
      expect(summary).toContain('Words: 500');
      expect(summary).toContain('Pages: ~2');
      expect(summary).toContain('Features: images, code, diagrams');
    });

    it('should handle metadata with no features', () => {
      const metadata: DocumentMetadata = {
        title: 'Simple Document',
        wordCount: 100,
      };

      const summary = service.generateSummary(metadata);

      expect(summary).toContain('Title: "Simple Document"');
      expect(summary).toContain('Words: 100');
      expect(summary).not.toContain('Features:');
    });

    it('should handle empty metadata', () => {
      const metadata: DocumentMetadata = {};

      const summary = service.generateSummary(metadata);

      expect(summary).toBe('');
    });

    it('should handle all feature types', () => {
      const metadata: DocumentMetadata = {
        hasImages: true,
        hasTables: true,
        hasCodeBlocks: true,
        hasDiagrams: true,
      };

      const summary = service.generateSummary(metadata);

      expect(summary).toBe('Features: images, tables, code, diagrams');
    });
  });

  describe('mergeMetadata', () => {
    it('should merge metadata with override precedence', () => {
      const base: DocumentMetadata = {
        title: 'Base Title',
        author: 'Base Author',
        wordCount: 100,
        custom: {
          baseField: 'base value',
          sharedField: 'base shared',
        },
      };

      const override: Partial<DocumentMetadata> = {
        title: 'Override Title',
        version: '1.0.0',
        custom: {
          overrideField: 'override value',
          sharedField: 'override shared',
        },
      };

      const merged = service.mergeMetadata(base, override);

      expect(merged).toEqual({
        title: 'Override Title', // Overridden
        author: 'Base Author', // Kept from base
        wordCount: 100, // Kept from base
        version: '1.0.0', // Added from override
        custom: {
          baseField: 'base value', // Kept from base
          overrideField: 'override value', // Added from override
          sharedField: 'override shared', // Overridden
        },
      });
    });

    it('should handle empty custom objects', () => {
      const base: DocumentMetadata = {
        title: 'Base Title',
      };

      const override: Partial<DocumentMetadata> = {
        author: 'Override Author',
        custom: {
          newField: 'new value',
        },
      };

      const merged = service.mergeMetadata(base, override);

      expect(merged.custom).toEqual({
        newField: 'new value',
      });
    });
  });

  describe('filterMetadata', () => {
    const fullMetadata: DocumentMetadata = {
      // Standard fields
      title: 'Test Title',
      author: 'Test Author',
      subject: 'Test Subject',
      keywords: 'test, metadata',
      creator: 'MD2PDF',
      producer: 'MD2PDF',
      creationDate: new Date('2025-01-01'),
      modDate: new Date('2025-01-01'),

      // Extended fields
      organization: 'Test Org',
      department: 'Engineering',
      team: 'Platform',
      category: 'Documentation',
      version: '1.0.0',
      language: 'zh-TW',
      copyright: '© 2025',
      license: 'MIT',
      confidentiality: 'internal',
      email: 'test@example.com',
      website: 'https://example.com',
      format: 'markdown',
      generator: 'MD2PDF',
      custom: { customField: 'value' },

      // Computed fields
      wordCount: 500,
      pageCount: 2,
      tocDepth: 3,
      hasImages: true,
      hasTables: false,
      hasCodeBlocks: true,
      hasDiagrams: true,
    };

    it('should include all metadata by default', () => {
      const filtered = service.filterMetadata(fullMetadata);

      expect(filtered).toEqual(fullMetadata);
    });

    it('should require title when specified', () => {
      const metadataWithoutTitle = { ...fullMetadata };
      delete metadataWithoutTitle.title;

      const filtered = service.filterMetadata(metadataWithoutTitle, {
        requireTitle: true,
      });

      expect(filtered.title).toBeUndefined();
    });

    it('should require author when specified', () => {
      const metadataWithoutAuthor = { ...fullMetadata };
      delete metadataWithoutAuthor.author;

      const filtered = service.filterMetadata(metadataWithoutAuthor, {
        requireAuthor: true,
      });

      expect(filtered.author).toBeUndefined();
    });

    it('should exclude extended fields when specified', () => {
      const filtered = service.filterMetadata(fullMetadata, {
        includeExtended: false,
      });

      // Should include standard and computed, but not extended
      expect(filtered.title).toBe('Test Title');
      expect(filtered.wordCount).toBe(500);
      expect(filtered.organization).toBeUndefined();
      expect(filtered.version).toBeUndefined();
    });

    it('should exclude computed fields when specified', () => {
      const filtered = service.filterMetadata(fullMetadata, {
        includeComputed: false,
      });

      // Should include standard and extended, but not computed
      expect(filtered.title).toBe('Test Title');
      expect(filtered.organization).toBe('Test Org');
      expect(filtered.wordCount).toBeUndefined();
      expect(filtered.hasImages).toBeUndefined();
    });

    it('should handle multiple filter options', () => {
      const filtered = service.filterMetadata(fullMetadata, {
        requireTitle: true,
        requireAuthor: true,
        includeExtended: false,
        includeComputed: false,
      });

      // Should only include standard fields
      expect(filtered.title).toBe('Test Title');
      expect(filtered.author).toBe('Test Author');
      expect(filtered.subject).toBe('Test Subject');
      expect(filtered.organization).toBeUndefined();
      expect(filtered.wordCount).toBeUndefined();
    });

    it('should handle boolean fields with false values', () => {
      const metadataWithFalse = {
        ...fullMetadata,
        hasImages: false,
        hasTables: false,
        hasCodeBlocks: false,
        hasDiagrams: false,
      };

      const filtered = service.filterMetadata(metadataWithFalse);

      expect(filtered.hasImages).toBe(false);
      expect(filtered.hasTables).toBe(false);
      expect(filtered.hasCodeBlocks).toBe(false);
      expect(filtered.hasDiagrams).toBe(false);
    });
  });

  describe('getDocumentLanguage', () => {
    it('should return document language when available', () => {
      const metadata: DocumentMetadata = {
        language: 'zh-TW',
      };

      const language = service.getDocumentLanguage(metadata, 'en');

      expect(language).toBe('zh-TW');
    });

    it('should return UI language as fallback', () => {
      const metadata: DocumentMetadata = {
        title: 'No language',
      };

      const language = service.getDocumentLanguage(metadata, 'en');

      expect(language).toBe('en');
    });

    it('should return default when no metadata provided', () => {
      const language = service.getDocumentLanguage(undefined, 'zh-TW');

      expect(language).toBe('zh-TW');
    });

    it('should use default fallback when no parameters provided', () => {
      const language = service.getDocumentLanguage();

      expect(language).toBe('en');
    });
  });

  describe('HTML escaping', () => {
    it('should escape HTML entities correctly', () => {
      const metadata: DocumentMetadata = {
        title: 'Test & Title <script>alert("xss")</script>',
        author: 'Author "Name" & Co.',
        subject: "Subject with 'quotes'",
      };

      const html = service.toHtmlMetaTags(metadata);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert("xss")');
      expect(html).toContain('&amp;');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
      expect(html).toContain('&quot;');
      expect(html).toContain('&#39;');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow from extraction to conversion', async () => {
      const mockResult: MetadataExtractionResult = {
        metadata: {
          title: 'Integration Test',
          author: 'Test Author',
          language: 'zh-TW',
          wordCount: 250,
        },
        sources: { standard: {}, extended: {}, computed: {} },
        warnings: [],
        errors: [],
      };

      mockExtractor.extractMetadata.mockResolvedValue(mockResult);

      // Extract metadata
      MetadataExtractor.createContext = jest.fn().mockReturnValue({
        markdownContent: '# Integration Test',
        config: DEFAULT_METADATA_CONFIG,
      });

      const result = await service.extractMetadataSimple('# Integration Test');

      // Convert to PDF info
      const pdfInfo = service.toPdfInfo(result.metadata);

      // Generate HTML meta tags
      const htmlTags = service.toHtmlMetaTags(result.metadata);

      // Generate summary
      const summary = service.generateSummary(result.metadata);

      // Get document language
      const language = service.getDocumentLanguage(result.metadata);

      expect(pdfInfo.Title).toBe('Integration Test');
      expect(htmlTags).toContain('<title>Integration Test</title>');
      expect(summary).toContain('Title: "Integration Test"');
      expect(language).toBe('zh-TW');
    });

    it('should handle error scenarios gracefully', async () => {
      MetadataExtractor.createContext = jest.fn().mockReturnValue({
        markdownContent: '# Test',
        config: DEFAULT_METADATA_CONFIG,
      });
      mockExtractor.extractMetadata.mockRejectedValue(
        new Error('Extraction failed'),
      );

      await expect(service.extractMetadataSimple('# Test')).rejects.toThrow(
        'Extraction failed',
      );
    });
  });
});
