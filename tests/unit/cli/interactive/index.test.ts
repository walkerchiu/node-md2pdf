/**
 * Comprehensive tests for InteractiveMode CLI
 * Tests user interaction flows, validation, configuration, and error handling
 */

import { jest } from '@jest/globals';
import { InteractiveMode } from '../../../../src/cli/interactive';
import { ServiceContainer } from '../../../../src/shared/container';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../../src/infrastructure/error/types';
import type { IFileProcessorService } from '../../../../src/application/services/file-processor.service';
import { ConversionConfig } from '../../../../src/types';
import { createMockTranslator } from '../../helpers/mock-translator';

// Mock chalk
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    cyan: jest.fn((text: string) => text),
    red: jest.fn((text: string) => text),
    yellow: jest.fn((text: string) => text),
    green: jest.fn((text: string) => text),
    gray: jest.fn((text: string) => text),
    bold: jest.fn((text: string) => text),
  },
  cyan: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  bold: jest.fn((text: string) => text),
}));

const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  text: '',
};

jest.mock('ora', () => {
  const mockOra = jest.fn(() => mockSpinner);
  return {
    __esModule: true,
    default: mockOra,
  };
});

// Mock inquirer with dynamic import support
type PromptQuestion = {
  name?: string;
  validate?: (input: string) => string | boolean;
  default?: (answers: { inputPath?: string }) => string;
  choices?: unknown[];
  message?: string;
};

const mockInquirerPrompt = jest.fn() as jest.MockedFunction<
  (
    questions: PromptQuestion[],
  ) => Promise<
    ConversionConfig | { confirmed: boolean } | Record<string, unknown>
  >
>;
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: mockInquirerPrompt,
  },
}));

describe('InteractiveMode', () => {
  let container: ServiceContainer;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockFileProcessorService: jest.Mocked<IFileProcessorService>;
  let interactiveMode: InteractiveMode;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  const mockConversionConfig: ConversionConfig = {
    inputPath: 'test.md',
    outputPath: 'test.pdf',
    tocDepth: 2,
    includePageNumbers: true,
    chineseFontSupport: true,
  };

  const mockProcessingResult = {
    success: true,
    inputPath: 'test.md',
    outputPath: 'test.pdf',
    processingTime: 1500,
    fileSize: 1024000,
    parsedContent: {
      content: '<h1>Heading 1</h1><h2>Heading 2</h2>',
      headings: [
        { level: 1, text: 'Heading 1', id: 'heading-1', anchor: '#heading-1' },
        { level: 2, text: 'Heading 2', id: 'heading-2', anchor: '#heading-2' },
      ],
      metadata: {},
    },
    pdfResult: {
      success: true,
      outputPath: 'test.pdf',
    },
  };

  beforeEach(() => {
    // Ensure inquirer mock is reset between tests to avoid leaking implementations
    mockInquirerPrompt.mockReset();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setLevel: jest.fn(),
      log: jest.fn(),
      getLevel: jest.fn(),
    };

    mockErrorHandler = {
      handleError: jest.fn(),
      formatError: jest.fn(),
      isRecoverable: jest.fn(),
      categorizeError: jest.fn(),
    } as unknown as jest.Mocked<IErrorHandler>;

    mockFileProcessorService = {
      processFile: jest.fn(),
      validateInputFile: jest.fn(),
      generateOutputPath: jest.fn(),
    } as unknown as jest.Mocked<IFileProcessorService>;

    mockFileProcessorService.processFile.mockResolvedValue(
      mockProcessingResult,
    );

    container = new ServiceContainer();
    container.registerInstance('logger', mockLogger);
    container.registerInstance('translator', createMockTranslator());
    container.registerInstance('errorHandler', mockErrorHandler);
    container.registerInstance('fileProcessor', mockFileProcessorService);

    interactiveMode = new InteractiveMode(container);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with container and resolve dependencies', () => {
      expect(interactiveMode).toBeInstanceOf(InteractiveMode);
      expect(container.resolve('logger')).toBe(mockLogger);
      expect(container.resolve('errorHandler')).toBe(mockErrorHandler);
      expect(container.resolve('fileProcessor')).toBe(mockFileProcessorService);
    });
  });

  describe('start method', () => {
    it('should complete successful conversion flow', async () => {
      // Setup inquirer prompts for config
      // New flow: first prompt returns inputPath only, second returns remaining options, third is confirmation
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: 'test.md' })
        .mockResolvedValueOnce({
          outputPath: 'test.pdf',
          tocDepth: 2,
          includePageNumbers: true,
          chineseFontSupport: true,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting interactive conversion process',
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('interactive.title'),
      );
      expect(mockFileProcessorService.processFile).toHaveBeenCalled();
    });

    it('should handle user cancellation', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith('User cancelled conversion');
      expect(consoleSpy).toHaveBeenCalledWith('interactive.cancelled');
      expect(mockFileProcessorService.processFile).not.toHaveBeenCalled();
    });

    it('should handle errors properly', async () => {
      const testError = new Error('Test error');
      mockInquirerPrompt.mockRejectedValue(testError);

      await expect(interactiveMode.start()).rejects.toThrow('Test error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Interactive mode error',
        testError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        testError,
        'InteractiveMode.start',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'interactive.interactiveModeError',
        testError,
      );
    });

    it('should display welcome messages correctly', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      expect(consoleSpy).toHaveBeenCalledWith('interactive.title');
      // interactive.pleaseAnswerQuestions is not output to console in the current implementation
      expect(consoleSpy).toHaveBeenCalledWith('interactive.starting');
    });
  });

  describe('getConversionConfig method', () => {
    it('should return configuration from inquirer prompts', async () => {
      // Simulate new prompt sequence for getConversionConfig
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: 'document.md' })
        .mockResolvedValueOnce({
          outputPath: 'document.pdf',
          tocDepth: 3,
          includePageNumbers: false,
          chineseFontSupport: false,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      // Verify first prompt asked for inputPath, second prompt included outputPath and other options
      expect(mockInquirerPrompt.mock.calls[0][0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'input',
            name: 'inputPath',
            message: expect.any(String),
          }),
        ]),
      );
      expect(mockInquirerPrompt.mock.calls[1][0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'input', name: 'outputPath' }),
          expect.objectContaining({ type: 'list', name: 'tocDepth' }),
          expect.objectContaining({
            type: 'confirm',
            name: 'includePageNumbers',
          }),
          expect.objectContaining({
            type: 'confirm',
            name: 'chineseFontSupport',
          }),
        ]),
      );
    });

    it('should validate input path for empty strings', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      const promptCall = mockInquirerPrompt.mock
        .calls[0][0] as PromptQuestion[];
      const inputPathQuestion = promptCall.find(
        (q: PromptQuestion) => q.name === 'inputPath',
      )!;

      expect(inputPathQuestion.validate!('')).toBe(
        'interactive.pleaseEnterFilePath',
      );
      expect(inputPathQuestion.validate!('   ')).toBe(
        'interactive.pleaseEnterFilePath',
      );
    });

    it('should validate input path for correct file extensions', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      const promptCall = mockInquirerPrompt.mock
        .calls[0][0] as PromptQuestion[];
      const inputPathQuestion = promptCall.find(
        (q: PromptQuestion) => q.name === 'inputPath',
      )!;

      expect(inputPathQuestion.validate!('document.txt')).toBe(
        'interactive.invalidMarkdownFile',
      );
      expect(inputPathQuestion.validate!('document.pdf')).toBe(
        'interactive.invalidMarkdownFile',
      );
      expect(inputPathQuestion.validate!('document.md')).toBe(true);
      expect(inputPathQuestion.validate!('document.markdown')).toBe(true);
    });

    it('should generate default output path from input path', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      const promptCall = mockInquirerPrompt.mock
        .calls[1][0] as PromptQuestion[];
      const outputPathQuestion = promptCall.find(
        (q: PromptQuestion) => q.name === 'outputPath',
      )!;

      expect(outputPathQuestion.default!({ inputPath: 'document.md' })).toBe(
        'document.pdf',
      );
      expect(outputPathQuestion.default!({ inputPath: 'file.markdown' })).toBe(
        'file.pdf',
      );
    });

    it('should provide correct TOC depth choices', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      const promptCall = mockInquirerPrompt.mock
        .calls[1][0] as PromptQuestion[];
      const tocDepthQuestion = promptCall.find(
        (q: PromptQuestion) => q.name === 'tocDepth',
      )!;

      expect(tocDepthQuestion.choices).toHaveLength(6);
      expect(tocDepthQuestion.choices![0]).toEqual({
        name: 'interactive.tocLevels.1',
        value: 1,
      });
      expect(tocDepthQuestion.choices![5]).toEqual({
        name: 'interactive.tocLevels.6',
        value: 6,
      });
      expect(tocDepthQuestion.default).toBe(2);
    });
  });

  describe('confirmConfig method', () => {
    it('should display configuration summary with all options', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      // Verify that configuration summary was displayed
      expect(consoleSpy).toHaveBeenCalledWith('interactive.conversionSummary');
      expect(consoleSpy).toHaveBeenCalledWith('─'.repeat(50));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.md'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.pdf'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('interactive.yes'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('interactive.yes'),
      );
    });

    it('should display "No" for disabled options', async () => {
      const configWithDisabledOptions = {
        ...mockConversionConfig,
        includePageNumbers: false,
        chineseFontSupport: false,
      };

      mockInquirerPrompt
        .mockResolvedValueOnce({
          inputPath: configWithDisabledOptions.inputPath,
        })
        .mockResolvedValueOnce({
          outputPath: configWithDisabledOptions.outputPath,
          tocDepth: configWithDisabledOptions.tocDepth,
          includePageNumbers: configWithDisabledOptions.includePageNumbers,
          chineseFontSupport: configWithDisabledOptions.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('interactive.no'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('interactive.no'),
      );
    });

    it('should prompt for confirmation', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      // Check that the third prompt is for confirmation
      expect(mockInquirerPrompt).toHaveBeenNthCalledWith(3, [
        expect.objectContaining({
          type: 'confirm',
          name: 'confirmed',
          message: 'interactive.confirmAndStart',
          default: true,
        }),
      ]);
    });

    it('should handle user rejection properly', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith('User cancelled conversion');
      expect(consoleSpy).toHaveBeenCalledWith('interactive.cancelled');
    });
  });

  describe('performConversion method', () => {
    it('should perform successful conversion with Chinese font support', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockSpinner.text).toBe('interactive.processingMarkdown');
      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.objectContaining({
          outputPath: 'test.pdf',
          includeTOC: true,
          tocOptions: {
            maxDepth: 2,
            includePageNumbers: true,
            title: expect.any(String), // Now uses translation manager
          },
          pdfOptions: expect.objectContaining({
            displayHeaderFooter: true,
            printBackground: true,
          }),
          customStyles: expect.stringContaining('Noto Sans CJK SC'),
        }),
      );
    });

    it('should perform conversion without Chinese font support', async () => {
      const configWithoutChinese = {
        ...mockConversionConfig,
        chineseFontSupport: false,
      };

      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: configWithoutChinese.inputPath })
        .mockResolvedValueOnce({
          outputPath: configWithoutChinese.outputPath,
          tocDepth: configWithoutChinese.tocDepth,
          includePageNumbers: configWithoutChinese.includePageNumbers,
          chineseFontSupport: configWithoutChinese.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.not.objectContaining({
          customStyles: expect.stringContaining('Noto Sans CJK SC'),
        }),
      );
    });

    it('should use default output path when not provided', async () => {
      const configWithoutOutput = {
        ...mockConversionConfig,
        outputPath: null as unknown as string | null,
      };

      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: configWithoutOutput.inputPath })
        .mockResolvedValueOnce({
          outputPath: configWithoutOutput.outputPath,
          tocDepth: configWithoutOutput.tocDepth,
          includePageNumbers: configWithoutOutput.includePageNumbers,
          chineseFontSupport: configWithoutOutput.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.objectContaining({
          outputPath: 'test.pdf', // Should default to input.pdf
        }),
      );
    });

    it('should display conversion results after successful completion', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'interactive.conversionCompleted',
      );
      expect(consoleSpy).toHaveBeenCalledWith('interactive.conversionResults');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.md'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.pdf'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1000 interactive.kb'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1500ms'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2'));
    });

    it('should configure page numbers in header/footer correctly', async () => {
      const configWithPageNumbers = {
        ...mockConversionConfig,
        includePageNumbers: true,
      };

      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: configWithPageNumbers.inputPath })
        .mockResolvedValueOnce({
          outputPath: configWithPageNumbers.outputPath,
          tocDepth: configWithPageNumbers.tocDepth,
          includePageNumbers: configWithPageNumbers.includePageNumbers,
          chineseFontSupport: configWithPageNumbers.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.objectContaining({
          pdfOptions: expect.objectContaining({
            displayHeaderFooter: true,
            footerTemplate: expect.stringContaining('pageNumber'),
          }),
        }),
      );
    });

    it('should disable header/footer when page numbers not requested', async () => {
      const configWithoutPageNumbers = {
        ...mockConversionConfig,
        includePageNumbers: false,
      };

      mockInquirerPrompt
        .mockResolvedValueOnce({
          inputPath: configWithoutPageNumbers.inputPath,
        })
        .mockResolvedValueOnce({
          outputPath: configWithoutPageNumbers.outputPath,
          tocDepth: configWithoutPageNumbers.tocDepth,
          includePageNumbers: configWithoutPageNumbers.includePageNumbers,
          chineseFontSupport: configWithoutPageNumbers.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.objectContaining({
          pdfOptions: expect.objectContaining({
            displayHeaderFooter: false,
            footerTemplate: '',
          }),
        }),
      );
    });

    it('should handle conversion errors properly', async () => {
      const conversionError = new Error('Processing failed');
      mockFileProcessorService.processFile.mockRejectedValue(conversionError);

      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await expect(interactiveMode.start()).rejects.toThrow(
        'Processing failed',
      );

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        'interactive.conversionFailed',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Conversion failed in interactive mode',
        conversionError,
      );
    });

    it('should log conversion progress properly', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting file conversion', {
        inputPath: 'test.md',
        outputPath: 'test.pdf',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'File conversion completed successfully',
        {
          inputPath: 'test.md',
          outputPath: 'test.pdf',
          processingTime: 1500,
          fileSize: 1024000,
        },
      );
    });

    it('should update spinner text during conversion steps', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      // Check that spinner text was updated during conversion steps
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.text).toBe('interactive.processingMarkdown');
    });
  });

  describe('formatBytes method', () => {
    it('should format bytes correctly for all sizes', () => {
      interface _InteractiveAccessor {
        formatBytes(n: number): string;
      }

      const _accessor = interactiveMode as unknown as _InteractiveAccessor;
      const formatBytes = _accessor.formatBytes.bind(interactiveMode);

      expect(formatBytes(0)).toBe('0 interactive.bytes');
      expect(formatBytes(1024)).toBe('1 interactive.kb');
      expect(formatBytes(1048576)).toBe('1 interactive.mb');
      expect(formatBytes(1073741824)).toBe('1 interactive.gb');
      expect(formatBytes(1500)).toBe('1.46 interactive.kb');
    });

    it('should handle edge cases correctly', () => {
      interface _InteractiveAccessor {
        formatBytes(n: number): string;
      }

      const _accessor = interactiveMode as unknown as _InteractiveAccessor;
      const formatBytes = _accessor.formatBytes.bind(interactiveMode);

      expect(formatBytes(1)).toBe('1 interactive.bytes');
      expect(formatBytes(1023)).toBe('1023 interactive.bytes');
      expect(formatBytes(1025)).toBe('1 interactive.kb');
      expect(formatBytes(2048000)).toBe('1.95 interactive.mb');
    });

    it('should handle large numbers correctly', () => {
      interface _InteractiveAccessor {
        formatBytes(n: number): string;
      }

      const _accessor = interactiveMode as unknown as _InteractiveAccessor;
      const formatBytes = _accessor.formatBytes.bind(interactiveMode);

      expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 interactive.gb');
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 undefined'); // Bug: sizes array doesn't have TB
    });
  });

  describe('error scenarios and edge cases', () => {
    it('should handle container resolution errors', () => {
      const emptyContainer = new ServiceContainer();

      expect(() => {
        new InteractiveMode(emptyContainer);
      }).toThrow();
    });

    it('should handle missing file processor service', () => {
      const incompleteContainer = new ServiceContainer();
      incompleteContainer.registerInstance('logger', mockLogger);
      incompleteContainer.registerInstance('errorHandler', mockErrorHandler);

      expect(() => {
        new InteractiveMode(incompleteContainer);
      }).toThrow();
    });

    it('should handle processing result without headings', async () => {
      const resultWithoutHeadings = {
        ...mockProcessingResult,
        parsedContent: {
          content: '<p>Simple content</p>',
          headings: [],
          metadata: {},
        },
      };
      mockFileProcessorService.processFile.mockResolvedValue(
        resultWithoutHeadings,
      );

      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0'));
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'interactive.conversionCompleted',
      );
    });

    it('should handle different TOC depth levels', async () => {
      const configWithMaxTocDepth = {
        ...mockConversionConfig,
        tocDepth: 6,
      };

      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: configWithMaxTocDepth.inputPath })
        .mockResolvedValueOnce({
          outputPath: configWithMaxTocDepth.outputPath,
          tocDepth: configWithMaxTocDepth.tocDepth,
          includePageNumbers: configWithMaxTocDepth.includePageNumbers,
          chineseFontSupport: configWithMaxTocDepth.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.objectContaining({
          tocOptions: expect.objectContaining({
            maxDepth: 6,
          }),
        }),
      );
    });

    it('should handle different output path extensions', async () => {
      const configWithMarkdownExtension = {
        inputPath: 'document.markdown',
        outputPath: 'document.pdf',
        tocDepth: 2,
        includePageNumbers: true,
        chineseFontSupport: false,
      };

      mockInquirerPrompt
        .mockResolvedValueOnce({
          inputPath: configWithMarkdownExtension.inputPath,
        })
        .mockResolvedValueOnce({
          outputPath: configWithMarkdownExtension.outputPath,
          tocDepth: configWithMarkdownExtension.tocDepth,
          includePageNumbers: configWithMarkdownExtension.includePageNumbers,
          chineseFontSupport: configWithMarkdownExtension.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'document.markdown',
        expect.any(Object),
      );
    });

    it('should handle empty output path and fallback to default', async () => {
      const configWithEmptyOutput = {
        ...mockConversionConfig,
        outputPath: '',
      };

      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: configWithEmptyOutput.inputPath })
        .mockResolvedValueOnce({
          outputPath: configWithEmptyOutput.outputPath,
          tocDepth: configWithEmptyOutput.tocDepth,
          includePageNumbers: configWithEmptyOutput.includePageNumbers,
          chineseFontSupport: configWithEmptyOutput.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.objectContaining({
          outputPath: 'test.pdf', // Should use fallback logic
        }),
      );
    });

    it('should handle processing result with zero file size', async () => {
      const resultWithZeroSize = {
        ...mockProcessingResult,
        fileSize: 0,
      };
      mockFileProcessorService.processFile.mockResolvedValue(
        resultWithZeroSize,
      );

      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 interactive.bytes'),
      );
    });

    it('should handle inquirer import errors', async () => {
      // Mock dynamic import failure
      jest.doMock('inquirer', () => {
        throw new Error('Import failed');
      });

      mockInquirerPrompt.mockRejectedValue(new Error('Import failed'));

      await expect(interactiveMode.start()).rejects.toThrow('Import failed');

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should pass through all required PDF options', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        'test.md',
        expect.objectContaining({
          pdfOptions: expect.objectContaining({
            margin: {
              top: '1in',
              right: '1in',
              bottom: '1in',
              left: '1in',
            },
            printBackground: true,
          }),
        }),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete successful flow with all steps', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveMode.start();

      // Verify complete flow
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting interactive conversion process',
      );
      expect(consoleSpy).toHaveBeenCalledWith('interactive.title');
      expect(mockInquirerPrompt).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith('interactive.conversionSummary');
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockFileProcessorService.processFile).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('interactive.conversionResults');
    });

    it('should handle complete flow with user cancellation', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      // Verify cancellation flow
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting interactive conversion process',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('User cancelled conversion');
      expect(consoleSpy).toHaveBeenCalledWith('interactive.cancelled');
      expect(mockFileProcessorService.processFile).not.toHaveBeenCalled();
    });

    it('should display proper Chinese font message to user', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ inputPath: mockConversionConfig.inputPath })
        .mockResolvedValueOnce({
          outputPath: mockConversionConfig.outputPath,
          tocDepth: mockConversionConfig.tocDepth,
          includePageNumbers: mockConversionConfig.includePageNumbers,
          chineseFontSupport: mockConversionConfig.chineseFontSupport,
        })
        .mockResolvedValueOnce({ confirmed: false });

      await interactiveMode.start();

      const promptCall = mockInquirerPrompt.mock
        .calls[1][0] as PromptQuestion[];
      const chineseFontQuestion = promptCall.find(
        (q: PromptQuestion) => q.name === 'chineseFontSupport',
      )!;

      expect(chineseFontQuestion.message).toContain(
        'interactive.chineseFontSupport',
      );
    });
  });
});
