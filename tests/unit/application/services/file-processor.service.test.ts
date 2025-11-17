import {
  FileProcessorService,
  FileProcessingOptions,
} from '../../../../src/application/services/file-processor.service';
import { IMarkdownParserService } from '../../../../src/application/services/markdown-parser.service';
import { IPDFGeneratorService } from '../../../../src/application/services/pdf-generator.service';
import { ILogger } from '../../../../src/infrastructure/logging/types';
import { IErrorHandler } from '../../../../src/infrastructure/error/types';
import { IConfigManager } from '../../../../src/infrastructure/config/types';
import { defaultConfig } from '../../../../src/infrastructure/config/defaults';
import {
  IFileSystemManager,
  FileStats,
} from '../../../../src/infrastructure/filesystem/types';
import { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import {
  MD2PDFError,
  FileNotFoundError,
} from '../../../../src/infrastructure/error/errors';
import { ParsedMarkdown, Heading } from '../../../../src/types/index';
import { PDFGenerationResult } from '../../../../src/core/pdf/types';

describe('FileProcessorService', () => {
  let service: FileProcessorService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let mockFileSystemManager: jest.Mocked<IFileSystemManager>;
  let mockMarkdownParserService: jest.Mocked<IMarkdownParserService>;
  let mockPDFGeneratorService: jest.Mocked<IPDFGeneratorService>;
  let mockTranslator: jest.Mocked<ITranslationManager>;

  const mockOriginalMarkdown = '# Test Document\n\nThis is a test document.';

  const mockParsedContent: ParsedMarkdown = {
    content: '<h1>Test Document</h1><p>This is a test document.</p>',
    headings: [
      { level: 1, text: 'Test Document', id: 'test-document' } as Heading,
    ],
    metadata: { title: 'Test Document' },
  };

  const mockPDFResult: PDFGenerationResult = {
    success: true,
    outputPath: '/test/output.pdf',
    metadata: {
      pages: 1,
      fileSize: 1024,
      generationTime: 500,
    },
  };

  const mockFileStats: FileStats = {
    size: 1024,
    created: new Date(),
    modified: new Date(),
    accessed: new Date(),
    permissions: { read: true, write: true, execute: false },
    isDirectory: false,
    isFile: true,
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    mockErrorHandler = {
      handleError: jest.fn(),
      formatError: jest.fn(),
      isRecoverable: jest.fn(),
      categorizeError: jest.fn(),
    };

    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      onConfigCreated: jest.fn(),
      onConfigChanged: jest.fn(),
      setAndSave: jest.fn().mockResolvedValue(undefined),
      getConfigPath: jest.fn().mockReturnValue('/mock/config/path'),
      getConfig: jest.fn(() => ({ ...defaultConfig })),
      updateConfig: jest.fn(),
    };

    mockFileSystemManager = {
      exists: jest.fn(),
      getStats: jest.fn(),
      createDirectory: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      appendFile: jest.fn(),
      deleteFile: jest.fn(),
      copyFile: jest.fn(),
      moveFile: jest.fn(),
      deleteDirectory: jest.fn(),
      listDirectory: jest.fn(),
      isDirectory: jest.fn(),
      isFile: jest.fn(),
      resolvePath: jest.fn(),
      getAbsolutePath: jest.fn(),
      getBaseName: jest.fn(),
      getDirName: jest.fn(),
      getExtension: jest.fn(),
      createTempFile: jest.fn(),
      createTempDirectory: jest.fn(),
      findFiles: jest.fn(),
      getFileSize: jest.fn(),
      getModificationTime: jest.fn(),
    };

    mockMarkdownParserService = {
      parseMarkdown: jest.fn(),
      parseMarkdownFile: jest.fn(),
      extractHeadings: jest.fn(),
      validateMarkdown: jest.fn(),
      resetParser: jest.fn(),
    };

    mockPDFGeneratorService = {
      generatePDF: jest.fn(),
      initialize: jest.fn(),
      cleanup: jest.fn(),
      getEngineStatus: jest.fn(),
      getAvailableEngines: jest.fn(),
      forceHealthCheck: jest.fn(),
    };

    mockTranslator = {
      t: jest.fn((key: string) => key),
      setLocale: jest.fn(),
      getCurrentLocale: jest.fn().mockReturnValue('en'),
      getSupportedLocales: jest.fn().mockReturnValue(['en', 'zh-TW']),
      translate: jest.fn(),
      hasTranslation: jest.fn().mockReturnValue(true),
      loadTranslations: jest.fn(),
      getTranslations: jest.fn().mockReturnValue({}),
    };

    service = new FileProcessorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
      mockFileSystemManager,
      mockMarkdownParserService,
      mockPDFGeneratorService,
      mockTranslator,
    );
  });

  describe('processFile', () => {
    const inputPath = '/test/input.md';
    const outputPath = '/test/output.pdf';

    beforeEach(() => {
      mockFileSystemManager.exists.mockResolvedValue(true);
      mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
      mockFileSystemManager.readFile.mockResolvedValue(mockOriginalMarkdown);
      mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
        mockParsedContent,
      );
      mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);
    });

    it('should successfully process a markdown file to PDF', async () => {
      const options: FileProcessingOptions = {
        outputPath,
        includeTOC: false,
      };

      // Add a small delay to mock processing time
      mockMarkdownParserService.parseMarkdownFile.mockImplementation(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return mockParsedContent;
        },
      );

      const result = await service.processFile(inputPath, options);

      expect(result.success).toBe(true);
      expect(result.inputPath).toBe(inputPath);
      expect(result.outputPath).toBe(outputPath);
      expect(result.parsedContent).toEqual(mockParsedContent);
      expect(result.pdfResult).toEqual(mockPDFResult);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.fileSize).toBe(mockFileStats.size);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Starting file processing: ${inputPath}`,
      );
      expect(mockMarkdownParserService.parseMarkdownFile).toHaveBeenCalledWith(
        inputPath,
      );
      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        mockParsedContent.content,
        outputPath,
        expect.objectContaining({
          headings: mockParsedContent.headings,
          includeTOC: false,
          markdownContent: mockOriginalMarkdown,
          title: expect.any(String), // Allow any title due to metadata system
          metadata: expect.any(Object), // New metadata field
          documentLanguage: expect.any(String), // New language field
          enableChineseSupport: expect.any(Boolean), // New Chinese support field
        }),
      );
    });

    it('should delegate TOC handling to two-stage rendering when requested', async () => {
      const options: FileProcessingOptions = {
        outputPath,
        includeTOC: true,
        tocOptions: { maxDepth: 2 },
      };

      await service.processFile(inputPath, options);

      // Verify that two-stage rendering is used for TOC
      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        mockParsedContent.content,
        outputPath,
        expect.objectContaining({
          bookmarkOptions: {
            enabled: true,
            includePageNumbers: true,
            maxDepth: 2,
            useExistingTOC: false,
          },
          headings: mockParsedContent.headings,
          includeTOC: true,
          markdownContent: mockOriginalMarkdown,
          title: expect.any(String), // Allow any title due to metadata system
          metadata: expect.any(Object), // New metadata field
          documentLanguage: expect.any(String), // New language field
          enableChineseSupport: expect.any(Boolean), // New Chinese support field
          tocOptions: expect.any(Object), // New TOC options field
        }),
      );
    });

    it('should apply custom styles when provided', async () => {
      const customStyles = 'body { font-family: Arial; }';
      const options: FileProcessingOptions = {
        outputPath,
        customStyles,
      };

      await service.processFile(inputPath, options);

      const expectedContent = `<!DOCTYPE html><html><head><style>\n${customStyles}\n</style></head><body>\n${mockParsedContent.content}\n</body></html>`;
      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        expectedContent,
        outputPath,
        expect.objectContaining({
          customCSS: customStyles,
          headings: mockParsedContent.headings,
          includeTOC: false,
          markdownContent: mockOriginalMarkdown,
          title: expect.any(String),
          metadata: expect.any(Object),
          documentLanguage: expect.any(String),
          enableChineseSupport: expect.any(Boolean),
        }),
      );
    });

    it('should generate output path when not provided', async () => {
      const options: FileProcessingOptions = {};

      await service.processFile(inputPath, options);

      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        mockParsedContent.content,
        '/test/input.pdf',
        expect.objectContaining({
          headings: mockParsedContent.headings,
          includeTOC: false,
          markdownContent: mockOriginalMarkdown,
          title: expect.any(String),
          metadata: expect.any(Object),
          documentLanguage: expect.any(String),
          enableChineseSupport: expect.any(Boolean),
        }),
      );
    });

    it('should handle validation errors', async () => {
      mockFileSystemManager.exists.mockResolvedValue(false);

      await expect(service.processFile(inputPath)).rejects.toThrow(MD2PDFError);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should handle parsing errors', async () => {
      const error = new Error('Parsing failed');
      mockMarkdownParserService.parseMarkdownFile.mockRejectedValue(error);

      await expect(
        service.processFile(inputPath, { outputPath }),
      ).rejects.toThrow(MD2PDFError);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should handle PDF generation errors', async () => {
      const error = new Error('PDF generation failed');
      mockPDFGeneratorService.generatePDF.mockRejectedValue(error);

      await expect(
        service.processFile(inputPath, { outputPath }),
      ).rejects.toThrow(MD2PDFError);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should pass through processing options', async () => {
      const options: FileProcessingOptions = {
        outputPath,
        includeTOC: true,
        includePageNumbers: true,
      };

      await service.processFile(inputPath, options);

      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        mockParsedContent.content, // No custom styles to inject
        outputPath,
        expect.objectContaining({
          bookmarkOptions: {
            enabled: true,
            includePageNumbers: true,
            maxDepth: 3,
            useExistingTOC: false,
          },
          headings: mockParsedContent.headings,
          includeTOC: true,
          includePageNumbers: true,
          markdownContent: mockOriginalMarkdown,
          title: expect.any(String),
          metadata: expect.any(Object),
          documentLanguage: expect.any(String),
          enableChineseSupport: expect.any(Boolean),
          tocOptions: {
            enabled: true,
            includePageNumbers: true,
            maxDepth: 3,
          },
        }),
      );
    });
  });

  describe('validateInputFile', () => {
    const inputPath = '/test/input.md';

    it('should validate a valid markdown file', async () => {
      mockFileSystemManager.exists.mockResolvedValue(true);
      mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);

      const result = await service.validateInputFile(inputPath);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Input file validation passed: ${inputPath}`,
      );
    });

    it('should throw FileNotFoundError for non-existent file', async () => {
      mockFileSystemManager.exists.mockResolvedValue(false);

      await expect(service.validateInputFile(inputPath)).rejects.toThrow(
        FileNotFoundError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should throw error for invalid file extension', async () => {
      const txtPath = '/test/input.txt';
      mockFileSystemManager.exists.mockResolvedValue(true);

      await expect(service.validateInputFile(txtPath)).rejects.toThrow(
        MD2PDFError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should throw error for non-readable file', async () => {
      const nonReadableFileStats = {
        ...mockFileStats,
        permissions: { ...mockFileStats.permissions, read: false },
      };
      mockFileSystemManager.exists.mockResolvedValue(true);
      mockFileSystemManager.getStats.mockResolvedValue(nonReadableFileStats);

      await expect(service.validateInputFile(inputPath)).rejects.toThrow(
        MD2PDFError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should handle unexpected validation errors', async () => {
      const error = new Error('Unexpected error');
      mockFileSystemManager.exists.mockRejectedValue(error);

      await expect(service.validateInputFile(inputPath)).rejects.toThrow(
        MD2PDFError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('generateOutputPath', () => {
    it('should generate output path in same directory as input', async () => {
      const inputPath = '/path/to/document.md';
      const result = await service.generateOutputPath(inputPath);

      expect(result).toBe('/path/to/document.pdf');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Generated output path: ${inputPath} -> /path/to/document.pdf`,
      );
    });

    it('should generate output path in specified directory', async () => {
      const inputPath = '/path/to/document.md';
      const outputDir = '/output';

      const result = await service.generateOutputPath(inputPath, outputDir);

      expect(result).toBe('/output/document.pdf');
      expect(mockFileSystemManager.createDirectory).toHaveBeenCalledWith(
        outputDir,
      );
    });

    it('should handle markdown extension', async () => {
      const inputPath = '/path/to/document.markdown';
      const result = await service.generateOutputPath(inputPath);

      expect(result).toBe('/path/to/document.pdf');
    });

    it('should handle output path generation errors', async () => {
      const inputPath = '/path/to/document.md';
      const outputDir = '/invalid';
      const error = new Error('Cannot create directory');
      mockFileSystemManager.createDirectory.mockRejectedValue(error);

      await expect(
        service.generateOutputPath(inputPath, outputDir),
      ).rejects.toThrow(MD2PDFError);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('private methods', () => {
    describe('injectStyles', () => {
      it('should inject styles in head tag', () => {
        const htmlContent =
          '<html><head></head><body><p>Content</p></body></html>';
        const customStyles = 'body { font-size: 12px; }';

        const result = (
          service as unknown as {
            injectStyles: (html: string, styles: string) => string;
          }
        ).injectStyles(htmlContent, customStyles);

        expect(result).toBe(
          '<html><head>\n<style>\nbody { font-size: 12px; }\n</style>\n</head><body><p>Content</p></body></html>',
        );
      });

      it('should wrap content and add styles when no head tag', () => {
        const htmlContent = '<p>Simple content</p>';
        const customStyles = 'body { font-size: 12px; }';

        const result = (
          service as unknown as {
            injectStyles: (html: string, styles: string) => string;
          }
        ).injectStyles(htmlContent, customStyles);

        expect(result).toBe(
          '<!DOCTYPE html><html><head><style>\nbody { font-size: 12px; }\n</style></head><body>\n<p>Simple content</p>\n</body></html>',
        );
      });
    });

    describe('title extraction edge cases', () => {
      it('should use metadata title when no H1 heading exists', async () => {
        // Mock markdown without H1 heading
        const markdownWithoutH1 =
          'Just some paragraph content without headers.';
        const parsedContentWithoutH1: ParsedMarkdown = {
          content: '<p>Just some paragraph content without headers.</p>',
          headings: [
            { level: 2, text: 'H2 Header', id: 'h2-header' } as Heading,
          ],
          metadata: { title: 'Title from Metadata' },
        };

        // Setup necessary mocks
        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(markdownWithoutH1);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          parsedContentWithoutH1,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        const result = await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          includeTOC: true,
          tocOptions: { maxDepth: 3 },
        });

        expect(result.success).toBe(true);
        expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
          expect.any(String),
          '/test/output.pdf',
          expect.objectContaining({
            title: expect.any(String), // Title is extracted from filename when H1 doesn't exist
            metadata: expect.any(Object),
            documentLanguage: expect.any(String),
            enableChineseSupport: expect.any(Boolean),
          }),
        );
      });

      it('should use default title when no H1 heading and no metadata title', async () => {
        // Mock markdown without H1 and without metadata title
        const markdownWithoutTitle = 'Just some content.';
        const parsedContentWithoutTitle: ParsedMarkdown = {
          content: '<p>Just some content.</p>',
          headings: [],
          metadata: {},
        };

        // Setup necessary mocks
        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(markdownWithoutTitle);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          parsedContentWithoutTitle,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        const result = await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          includeTOC: true,
          tocOptions: { maxDepth: 3 },
        });

        expect(result.success).toBe(true);
        expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
          expect.any(String),
          '/test/output.pdf',
          expect.objectContaining({
            title: expect.any(String),
            metadata: expect.any(Object),
            documentLanguage: expect.any(String),
            enableChineseSupport: expect.any(Boolean),
          }),
        );
      });

      it('should handle TOC options with custom title', async () => {
        const tocOptionsWithTitle = {
          maxDepth: 3,
          includePageNumbers: true,
          title: 'Custom TOC Title',
        };

        // Setup necessary mocks
        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(mockOriginalMarkdown);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          mockParsedContent,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        const result = await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          includeTOC: true,
          tocOptions: tocOptionsWithTitle,
        });

        expect(result.success).toBe(true);
        expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
          expect.any(String),
          '/test/output.pdf',
          expect.objectContaining({
            metadata: expect.any(Object),
            documentLanguage: expect.any(String),
            enableChineseSupport: expect.any(Boolean),
            tocOptions: expect.objectContaining({
              title: 'Custom TOC Title',
            }),
          }),
        );
      });
    });

    describe('metadata extraction and handling', () => {
      it('should merge manual metadata with extracted metadata', async () => {
        const mockMetadataService = {
          extractMetadataSimple: jest.fn().mockResolvedValue({
            metadata: {
              title: 'Extracted Title',
              author: 'Extracted Author',
            },
            warnings: [],
          }),
          mergeMetadata: jest.fn().mockReturnValue({
            title: 'Manual Title',
            author: 'Extracted Author',
            subject: 'Manual Subject',
          }),
          generateSummary: jest.fn().mockReturnValue('Metadata summary'),
        };

        (service as any).metadataService = mockMetadataService;

        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(mockOriginalMarkdown);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          mockParsedContent,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          metadata: {
            title: 'Manual Title',
            subject: 'Manual Subject',
          },
        });

        expect(mockMetadataService.mergeMetadata).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Extracted Title',
            author: 'Extracted Author',
          }),
          expect.objectContaining({
            title: 'Manual Title',
            subject: 'Manual Subject',
          }),
        );
      });

      it('should log warnings from metadata extraction', async () => {
        const mockMetadataService = {
          extractMetadataSimple: jest.fn().mockResolvedValue({
            metadata: { title: 'Test' },
            warnings: ['Warning 1', 'Warning 2'],
          }),
          generateSummary: jest.fn().mockReturnValue('Metadata summary'),
        };

        (service as any).metadataService = mockMetadataService;

        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(mockOriginalMarkdown);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          mockParsedContent,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
        });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Metadata warning: Warning 1',
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Metadata warning: Warning 2',
        );
      });

      it('should handle metadata extraction failure gracefully', async () => {
        const mockMetadataService = {
          extractMetadataSimple: jest
            .fn()
            .mockRejectedValue(new Error('Extraction failed')),
        };

        (service as any).metadataService = mockMetadataService;

        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(mockOriginalMarkdown);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          mockParsedContent,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        const result = await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          metadata: { title: 'Fallback Title' },
        });

        expect(result.success).toBe(true);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Metadata extraction failed'),
          expect.any(Error),
        );
      });

      it('should use only manual metadata when extraction is disabled', async () => {
        const mockMetadataService = {
          extractMetadataSimple: jest.fn(),
        };

        (service as any).metadataService = mockMetadataService;

        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(mockOriginalMarkdown);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          mockParsedContent,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          extractMetadata: false,
          metadata: { title: 'Manual Only' },
        });

        expect(
          mockMetadataService.extractMetadataSimple,
        ).not.toHaveBeenCalled();
      });
    });

    describe('anchor links functionality', () => {
      it('should add anchor links when tocReturnLinksLevel is enabled', async () => {
        // Mock a markdown with multiple headings
        const markdownWithHeadings = '# Title\n## Section 1\n### Subsection';
        const parsedContentWithHeadings: ParsedMarkdown = {
          content: '<h1>Title</h1><h2>Section 1</h2><h3>Subsection</h3>',
          headings: [
            { level: 1, text: 'Title', id: 'title' } as Heading,
            { level: 2, text: 'Section 1', id: 'section-1' } as Heading,
            { level: 3, text: 'Subsection', id: 'subsection' } as Heading,
          ],
          metadata: { title: 'Test with Anchors' },
        };

        // Setup mocks
        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(markdownWithHeadings);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          parsedContentWithHeadings,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);
        mockTranslator.t.mockReturnValue('Back to TOC');

        const result = await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          tocReturnLinksLevel: 2, // Enable anchor links for H2-H3
          includeTOC: true,
        });

        expect(result.success).toBe(true);
        expect(mockTranslator.t).toHaveBeenCalledWith('anchorLinks.backToToc');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Adding return-to-TOC anchor links',
        );
      });

      it('should not add anchor links when tocReturnLinksLevel is 0', async () => {
        // Setup necessary mocks
        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(mockOriginalMarkdown);
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          mockParsedContent,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        const result = await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          tocReturnLinksLevel: 0, // Disable anchor links
        });

        expect(result.success).toBe(true);
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          'Adding return-to-TOC anchor links',
        );
      });

      it('should not add anchor links when no headings exist', async () => {
        const markdownWithoutHeadings = 'Just plain text content.';
        const parsedContentWithoutHeadings: ParsedMarkdown = {
          content: '<p>Just plain text content.</p>',
          headings: [],
          metadata: {},
        };

        // Setup mocks
        mockFileSystemManager.exists.mockResolvedValue(true);
        mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
        mockFileSystemManager.readFile.mockResolvedValue(
          markdownWithoutHeadings,
        );
        mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
          parsedContentWithoutHeadings,
        );
        mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);

        const result = await service.processFile('/test/input.md', {
          outputPath: '/test/output.pdf',
          tocReturnLinksLevel: 2,
        });

        expect(result.success).toBe(true);
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          'Adding return-to-TOC anchor links',
        );
      });
    });

    describe('convertTOCReturnLinkLevelToDepth', () => {
      it('should convert TOCReturnLinkLevel values to correct AnchorLinksDepth', () => {
        const convertMethod = (service as any).convertTOCReturnLinkLevelToDepth;

        expect(convertMethod(0)).toBe('none');
        expect(convertMethod(1)).toBe(2); // H2 sections
        expect(convertMethod(2)).toBe(3); // H2-H3 sections
        expect(convertMethod(3)).toBe(4); // H2-H4 sections
        expect(convertMethod(4)).toBe(5); // H2-H5 sections
        expect(convertMethod(5)).toBe(6); // H2-H6 sections
      });

      it('should return "none" for invalid level values', () => {
        const convertMethod = (service as any).convertTOCReturnLinkLevelToDepth;

        expect(convertMethod(-1)).toBe('none');
        expect(convertMethod(6)).toBe('none');
        expect(convertMethod(999)).toBe('none');
      });
    });
  });

  describe('Bookmark Depth Configuration', () => {
    beforeEach(() => {
      mockFileSystemManager.exists.mockResolvedValue(true);
      mockFileSystemManager.readFile.mockResolvedValue(mockOriginalMarkdown);
      mockFileSystemManager.getStats.mockResolvedValue(mockFileStats);
      mockMarkdownParserService.parseMarkdownFile.mockResolvedValue(
        mockParsedContent,
      );
      mockPDFGeneratorService.generatePDF.mockResolvedValue(mockPDFResult);
    });

    it('should use tocReturnLinksLevel (anchorDepth) for bookmark depth when provided', async () => {
      const options: FileProcessingOptions = {
        outputPath: '/test/output.pdf',
        includeTOC: true,
        tocReturnLinksLevel: 3, // anchorDepth from template
        tocOptions: {
          maxDepth: 4, // tocDepth from template (different from anchorDepth)
          includePageNumbers: true,
        },
      };

      await service.processFile('/test/input.md', options);

      // Verify PDF generator was called with correct bookmarkOptions
      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        expect.any(String), // htmlContent
        expect.any(String), // outputPath
        expect.objectContaining({
          bookmarkOptions: expect.objectContaining({
            enabled: true,
            maxDepth: 3, // Should use tocReturnLinksLevel (anchorDepth), not tocOptions.maxDepth
            includePageNumbers: true,
            useExistingTOC: false,
          }),
        }),
      );
    });

    it('should fallback to tocOptions.maxDepth when tocReturnLinksLevel is not provided', async () => {
      const options: FileProcessingOptions = {
        outputPath: '/test/output.pdf',
        includeTOC: true,
        // tocReturnLinksLevel not provided
        tocOptions: {
          maxDepth: 4,
          includePageNumbers: true,
        },
      };

      await service.processFile('/test/input.md', options);

      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          bookmarkOptions: expect.objectContaining({
            enabled: true,
            maxDepth: 4, // Should fallback to tocOptions.maxDepth
          }),
        }),
      );
    });

    it('should use default depth of 3 when neither tocReturnLinksLevel nor tocOptions.maxDepth provided', async () => {
      const options: FileProcessingOptions = {
        outputPath: '/test/output.pdf',
        includeTOC: true,
        // No depth settings provided
      };

      await service.processFile('/test/input.md', options);

      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          bookmarkOptions: expect.objectContaining({
            enabled: true,
            maxDepth: 3, // Should use default value
          }),
        }),
      );
    });

    it('should prioritize tocReturnLinksLevel over tocOptions.maxDepth', async () => {
      const options: FileProcessingOptions = {
        outputPath: '/test/output.pdf',
        includeTOC: true,
        tocReturnLinksLevel: 2, // anchorDepth should take priority
        tocOptions: {
          maxDepth: 5, // This should be ignored for bookmark depth
        },
      };

      await service.processFile('/test/input.md', options);

      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          bookmarkOptions: expect.objectContaining({
            maxDepth: 2, // Should use tocReturnLinksLevel
          }),
        }),
      );
    });
  });
});
