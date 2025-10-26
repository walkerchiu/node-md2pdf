import {
  FileProcessorService,
  FileProcessingOptions,
} from '../../../src/application/services/file-processor.service';
import { IMarkdownParserService } from '../../../src/application/services/markdown-parser.service';
import { IPDFGeneratorService } from '../../../src/application/services/pdf-generator.service';
import { ILogger } from '../../../src/infrastructure/logging/types';
import { IErrorHandler } from '../../../src/infrastructure/error/types';
import { IConfigManager } from '../../../src/infrastructure/config/types';
import {
  IFileSystemManager,
  FileStats,
} from '../../../src/infrastructure/filesystem/types';
import {
  MD2PDFError,
  FileNotFoundError,
} from '../../../src/infrastructure/error/errors';
import { ParsedMarkdown, Heading } from '../../../src/types/index';
import { PDFGenerationResult } from '../../../src/core/pdf/types';

describe('FileProcessorService', () => {
  let service: FileProcessorService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let mockFileSystemManager: jest.Mocked<IFileSystemManager>;
  let mockMarkdownParserService: jest.Mocked<IMarkdownParserService>;
  let mockPDFGeneratorService: jest.Mocked<IPDFGeneratorService>;

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
    };

    mockPDFGeneratorService = {
      generatePDF: jest.fn(),
      initialize: jest.fn(),
      cleanup: jest.fn(),
      getEngineStatus: jest.fn(),
      getAvailableEngines: jest.fn(),
      forceHealthCheck: jest.fn(),
    };

    service = new FileProcessorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
      mockFileSystemManager,
      mockMarkdownParserService,
      mockPDFGeneratorService,
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
        {
          enableChineseSupport: true,
          headings: mockParsedContent.headings,
          includeTOC: false,
          markdownContent: mockOriginalMarkdown,
          title: 'Test Document',
        },
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
        {
          enableChineseSupport: true,
          headings: mockParsedContent.headings,
          includeTOC: true,
          markdownContent: mockOriginalMarkdown,
          title: 'Test Document',
          tocOptions: {
            enabled: true,
            includePageNumbers: true,
            maxDepth: 2,
          },
        },
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
        {
          customCSS: customStyles,
          enableChineseSupport: true,
          headings: mockParsedContent.headings,
          includeTOC: false,
          markdownContent: mockOriginalMarkdown,
          title: 'Test Document',
        },
      );
    });

    it('should generate output path when not provided', async () => {
      const options: FileProcessingOptions = {};

      await service.processFile(inputPath, options);

      expect(mockPDFGeneratorService.generatePDF).toHaveBeenCalledWith(
        mockParsedContent.content,
        '/test/input.pdf',
        {
          enableChineseSupport: true,
          headings: mockParsedContent.headings,
          includeTOC: false,
          markdownContent: mockOriginalMarkdown,
          title: 'Test Document',
        },
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
        mockParsedContent.content,
        outputPath,
        {
          enableChineseSupport: true,
          headings: mockParsedContent.headings,
          includeTOC: true,
          includePageNumbers: true,
          markdownContent: mockOriginalMarkdown,
          title: 'Test Document',
          tocOptions: {
            enabled: true,
            includePageNumbers: true,
            maxDepth: 3,
          },
        },
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
  });
});
