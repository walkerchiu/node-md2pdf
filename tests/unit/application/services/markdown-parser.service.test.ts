/**
 * Unit tests for MarkdownParserService
 */

import {
  MarkdownParserService,
  IMarkdownParserService,
} from '../../../../src/application/services/markdown-parser.service';
import { MarkdownParser } from '../../../../src/core/parser/markdown-parser';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../../src/infrastructure/error/types';
import type { IConfigManager } from '../../../../src/infrastructure/config/types';
import type { IFileSystemManager } from '../../../../src/infrastructure/filesystem/types';
import { defaultConfig } from '../../../../src/infrastructure/config/defaults';
import { ParsedMarkdown, Heading } from '../../../../src/types/index';
import {
  MD2PDFError,
  FileNotFoundError,
  MarkdownParsingError,
} from '../../../../src/infrastructure/error/errors';

// Mock the MarkdownParser
jest.mock('../../../../src/core/parser/markdown-parser');

describe('MarkdownParserService', () => {
  let service: IMarkdownParserService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let mockFileSystemManager: jest.Mocked<IFileSystemManager>;
  let MockMarkdownParser: jest.MockedClass<typeof MarkdownParser>;
  let mockParserInstance: jest.Mocked<{
    parse: jest.MockedFunction<(content: string) => Promise<unknown>>;
    md: object;
    configurePlugins: jest.MockedFunction<() => void>;
    slugify: jest.MockedFunction<(str: string) => string>;
    generateUniqueId: jest.MockedFunction<(str: string) => string>;
    highlightCode: jest.MockedFunction<(code: string, lang: string) => string>;
    extractHeadings: jest.MockedFunction<(content: string) => unknown[]>;
    renderContent: jest.MockedFunction<(content: string) => string>;
    processMarkdown: jest.MockedFunction<(content: string) => unknown>;
    postProcess: jest.MockedFunction<(html: string) => string>;
  }>;

  const sampleContent = `# Title
## Section 1
Content here.
## Section 2
More content.`;

  const mockParsedMarkdown: ParsedMarkdown = {
    content: sampleContent,
    headings: [
      { level: 1, text: 'Title', anchor: 'title', id: 'title' },
      { level: 2, text: 'Section 1', anchor: 'section-1', id: 'section-1' },
      { level: 2, text: 'Section 2', anchor: 'section-2', id: 'section-2' },
    ] as Heading[],
    metadata: {
      title: 'Title',
      wordCount: 6,
      characterCount: sampleContent.length,
      readingTime: 1,
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock ILogger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    // Mock IErrorHandler
    mockErrorHandler = {
      handleError: jest.fn(),
      formatError: jest.fn(),
      isRecoverable: jest.fn(),
      categorizeError: jest.fn(),
    };

    // Mock IConfigManager
    mockConfigManager = {
      get: jest.fn().mockReturnValue({
        html: true,
        breaks: true,
        linkify: true,
        typographer: true,
        quotes: '""\'\'',
      }),
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

    // Mock IFileSystemManager
    mockFileSystemManager = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      appendFile: jest.fn(),
      copyFile: jest.fn(),
      moveFile: jest.fn(),
      deleteFile: jest.fn(),
      createDirectory: jest.fn(),
      deleteDirectory: jest.fn(),
      listDirectory: jest.fn(),
      exists: jest.fn(),
      isFile: jest.fn(),
      isDirectory: jest.fn(),
      getStats: jest.fn(),
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

    // Mock MarkdownParser
    MockMarkdownParser = MarkdownParser as jest.MockedClass<
      typeof MarkdownParser
    >;
    MockMarkdownParser.mockClear();

    mockParserInstance = {
      parse: jest.fn(),
      md: {} as unknown as object,
      configurePlugins: jest.fn(),
      slugify: jest.fn(),
      generateUniqueId: jest.fn(),
      highlightCode: jest.fn(),
      extractHeadings: jest.fn(),
      renderContent: jest.fn(),
      processMarkdown: jest.fn(),
      postProcess: jest.fn(),
    };
    MockMarkdownParser.mockImplementation(
      () => mockParserInstance as unknown as MarkdownParser,
    );

    // Setup default successful parsing behavior
    mockParserInstance.parse.mockResolvedValue(mockParsedMarkdown);

    // Create service instance
    service = new MarkdownParserService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
      mockFileSystemManager,
    );
  });

  describe('parseMarkdown', () => {
    it('should successfully parse markdown content', async () => {
      const result = await service.parseMarkdown(sampleContent);

      expect(result).toEqual(mockParsedMarkdown);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Markdown parsed successfully'),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Parsing Markdown content (${sampleContent.length} characters)`,
      );
    });

    it('should initialize parser on first use', async () => {
      await service.parseMarkdown(sampleContent);

      expect(MockMarkdownParser).toHaveBeenCalledWith({
        html: true,
        breaks: true,
        linkify: true,
        typographer: true,
        quotes: '""\'\'',
      });
      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'markdown',
        expect.any(Object),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing Markdown parser service',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Markdown parser service initialized successfully',
      );
    });

    it('should not reinitialize parser on subsequent calls', async () => {
      await service.parseMarkdown(sampleContent);
      await service.parseMarkdown(sampleContent);

      expect(MockMarkdownParser).toHaveBeenCalledTimes(1);
    });

    it('should handle parsing errors', async () => {
      const parseError = new Error('Parser error');
      mockParserInstance.parse.mockRejectedValue(parseError);

      await expect(service.parseMarkdown(sampleContent)).rejects.toThrow(
        MarkdownParsingError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      MockMarkdownParser.mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      await expect(service.parseMarkdown(sampleContent)).rejects.toThrow(
        MD2PDFError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should track parsing performance', async () => {
      // Add a small delay to ensure processing time > 0
      mockParserInstance.parse.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockParsedMarkdown;
      });

      await service.parseMarkdown(sampleContent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Markdown parsed successfully \(\d+ms\)/),
      );
    });
  });

  describe('parseMarkdownFile', () => {
    const filePath = '/path/to/test.md';

    beforeEach(() => {
      mockFileSystemManager.exists.mockResolvedValue(true);
      mockFileSystemManager.readFile.mockResolvedValue(sampleContent);
    });

    it('should successfully parse markdown file', async () => {
      const result = await service.parseMarkdownFile(filePath);

      expect(result).toEqual({
        ...mockParsedMarkdown,
        metadata: {
          ...mockParsedMarkdown.metadata,
          filePath,
          fileSize: sampleContent.length,
        },
      });

      expect(mockFileSystemManager.exists).toHaveBeenCalledWith(filePath);
      expect(mockFileSystemManager.readFile).toHaveBeenCalledWith(
        filePath,
        'utf8',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Parsing Markdown file: ${filePath}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Markdown file parsed successfully: ${filePath}`,
      );
    });

    it('should handle file not found', async () => {
      mockFileSystemManager.exists.mockResolvedValue(false);

      await expect(service.parseMarkdownFile(filePath)).rejects.toThrow(
        FileNotFoundError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      mockFileSystemManager.readFile.mockRejectedValue(
        new Error('File read error'),
      );

      await expect(service.parseMarkdownFile(filePath)).rejects.toThrow(
        MarkdownParsingError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should handle parsing errors during file processing', async () => {
      mockParserInstance.parse.mockRejectedValue(new Error('Parser error'));

      await expect(service.parseMarkdownFile(filePath)).rejects.toThrow(
        MarkdownParsingError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('extractHeadings', () => {
    it('should successfully extract headings from content', async () => {
      const result = await service.extractHeadings(sampleContent);

      expect(result).toEqual(mockParsedMarkdown.headings);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Extracting headings from Markdown content',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Extracted ${mockParsedMarkdown.headings.length} headings`,
      );
    });

    it('should handle empty content', async () => {
      const emptyParsedMarkdown: ParsedMarkdown = {
        ...mockParsedMarkdown,
        headings: [],
      };

      mockParserInstance.parse.mockResolvedValue(emptyParsedMarkdown);

      const result = await service.extractHeadings('');

      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('Extracted 0 headings');
    });

    it('should handle extraction errors', async () => {
      mockParserInstance.parse.mockRejectedValue(new Error('Extraction error'));

      await expect(service.extractHeadings(sampleContent)).rejects.toThrow(
        MarkdownParsingError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('validateMarkdown', () => {
    it('should return true for valid markdown', async () => {
      const result = await service.validateMarkdown(sampleContent);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Validating Markdown content',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Markdown content is valid');
    });

    it('should return false for invalid markdown', async () => {
      mockParserInstance.parse.mockRejectedValue(new Error('Invalid markdown'));

      const result = await service.validateMarkdown('invalid content');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Markdown validation failed'),
      );
    });

    it('should not throw errors during validation', async () => {
      mockParserInstance.parse.mockRejectedValue(new Error('Validation error'));

      await expect(service.validateMarkdown('content')).resolves.toBe(false);
    });
  });

  describe('error handling', () => {
    it('should properly wrap and handle initialization errors', async () => {
      MockMarkdownParser.mockImplementation(() => {
        throw new Error('Mock initialization error');
      });

      const service = new MarkdownParserService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockFileSystemManager,
      );

      await expect(service.parseMarkdown(sampleContent)).rejects.toThrow(
        MD2PDFError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'MarkdownParserService.initialize',
      );
    });

    it('should properly wrap and handle parsing errors', async () => {
      const originalError = new Error('Mock parsing error');
      mockParserInstance.parse.mockRejectedValue(originalError);

      await expect(service.parseMarkdown(sampleContent)).rejects.toThrow(
        MarkdownParsingError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MarkdownParsingError),
        'MarkdownParserService.parseMarkdown',
      );
    });

    it('should preserve FileNotFoundError from file operations', async () => {
      mockFileSystemManager.exists.mockResolvedValue(false);

      await expect(
        service.parseMarkdownFile('/nonexistent.md'),
      ).rejects.toThrow(FileNotFoundError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(FileNotFoundError),
        'MarkdownParserService.parseMarkdownFile',
      );
    });
  });

  describe('configuration', () => {
    it('should use custom markdown configuration', async () => {
      const customConfig = {
        html: false,
        breaks: false,
        linkify: false,
        typographer: false,
        quotes: '«»""',
      };
      mockConfigManager.get.mockReturnValue(customConfig);

      const service = new MarkdownParserService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockFileSystemManager,
      );

      await service.parseMarkdown(sampleContent);

      expect(MockMarkdownParser).toHaveBeenCalledWith(customConfig);
    });

    it('should use default configuration when none provided', async () => {
      mockConfigManager.get.mockReturnValue({});

      const service = new MarkdownParserService(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
        mockFileSystemManager,
      );

      await service.parseMarkdown(sampleContent);

      expect(MockMarkdownParser).toHaveBeenCalledWith({});
    });
  });
});
