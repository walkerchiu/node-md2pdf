/**
 * Unit tests for SmartConversionMode
 */

import { SmartConversionMode } from '../../../src/cli/smart-conversion-mode';
import type { ServiceContainer } from '../../../src/shared/container';

// Mock inquirer
const mockPrompt = jest.fn();
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: mockPrompt,
  },
}));

// Mock chalk
jest.mock('chalk', () => ({
  cyan: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text),
  dim: jest.fn((text: string) => text),
}));

// Mock file browser
const mockBrowseDirectory = jest.fn();
jest.mock('../../../src/cli/utils/file-browser', () => ({
  FileBrowser: jest.fn().mockImplementation(() => ({
    browseDirectory: mockBrowseDirectory,
  })),
}));

// Mock recent files manager
jest.mock('../../../src/cli/config/recent-files', () => ({
  RecentFilesManager: jest.fn().mockImplementation(() => ({
    getRecentFiles: jest.fn().mockResolvedValue([]),
    formatFilePath: jest.fn((path: string) => path),
    formatFileSize: jest.fn(() => '1KB'),
    formatLastUsed: jest.fn(() => '1 day ago'),
    addFile: jest.fn().mockResolvedValue(void 0),
  })),
}));

describe('SmartConversionMode', () => {
  let smartConversionMode: SmartConversionMode;
  let mockContainer: ServiceContainer;
  let mockLogger: any;
  let mockSmartDefaultsService: any;
  let mockFileProcessorService: any;
  let mockAnalysis: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // Mock timers to prevent spinner from running in tests
    jest.spyOn(global, 'setInterval').mockImplementation((() => 'fake-interval-id') as any);
    jest.spyOn(global, 'clearInterval').mockImplementation(() => {});

    // Create mock analysis object
    mockAnalysis = {
      wordCount: 1000,
      estimatedPages: 5,
      readingTime: 10,
      headingStructure: { totalHeadings: 5, maxDepth: 3 },
      languageDetection: { primary: 'en' },
      codeBlocks: [],
      tables: [],
      mediaElements: { images: 0 },
      contentComplexity: {
        documentType: 'article',
        score: 5,
        factors: [
          { description: 'Contains code blocks' },
          { description: 'Multiple heading levels' },
        ],
      },
    };

    // Create mock services
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockSmartDefaultsService = {
      analyzeContent: jest.fn().mockResolvedValue(mockAnalysis),
      getQuickConversionConfig: jest.fn().mockResolvedValue({
        name: 'Quick PDF',
        description: 'Basic conversion with standard settings',
        estimatedTime: 5,
      }),
      recommendSettings: jest.fn().mockResolvedValue({
        confidence: 0.85,
        tocConfig: { enabled: true, maxDepth: 3 },
        optimization: { estimatedProcessingTime: 8 },
      }),
      getPresetConfigs: jest.fn().mockReturnValue([
        { name: 'Academic', description: 'For academic papers' },
        { name: 'Business', description: 'For business reports' },
      ]),
    };

    mockFileProcessorService = {
      processFile: jest.fn().mockResolvedValue({
        inputPath: 'test.md',
        outputPath: 'test.pdf',
        processingTime: 1000,
        fileSize: 5000,
        parsedContent: { headings: [{ level: 1, text: 'Test' }] },
      }),
    };

    // Create mock container
    mockContainer = {
      resolve: jest.fn((key: string) => {
        switch (key) {
          case 'logger':
            return mockLogger;
          case 'smartDefaults':
            return mockSmartDefaultsService;
          case 'fileProcessor':
            return mockFileProcessorService;
          default:
            return {};
        }
      }),
      tryResolve: jest.fn(),
      register: jest.fn(),
      registerSingleton: jest.fn(),
      registerFactory: jest.fn(),
    } as any;

    smartConversionMode = new SmartConversionMode(mockContainer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with container dependencies', () => {
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockContainer.resolve).toHaveBeenCalledWith('smartDefaults');
      expect(mockContainer.resolve).toHaveBeenCalledWith('fileProcessor');
    });
  });

  describe('start method', () => {
    it('should start with provided file path and complete basic flow', async () => {
      const testFilePath = '/test/file.md';

      // Mock user selecting quick conversion and confirming
      mockPrompt
        .mockResolvedValueOnce({ selectedIndex: 0 }) // Select quick conversion
        .mockResolvedValueOnce({ confirmed: true, finalOutputPath: '/test/output.pdf' }); // Confirm conversion

      await smartConversionMode.start(testFilePath);

      expect(mockSmartDefaultsService.analyzeContent).toHaveBeenCalledWith(testFilePath);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Smart Conversion Mode'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Content Analysis Results'));
    });

    it('should handle user cancellation', async () => {
      const testFilePath = '/test/file.md';

      mockPrompt
        .mockResolvedValueOnce({ selectedIndex: 0 }) // Select quick conversion
        .mockResolvedValueOnce({ confirmed: false, finalOutputPath: '/test/output.pdf' }); // Cancel conversion

      await smartConversionMode.start(testFilePath);

      expect(mockFileProcessorService.processFile).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Conversion cancelled'));
    });

    it('should handle file selection when no path provided', async () => {
      // Mock file selection flow via browser (which includes manual entry option)
      mockBrowseDirectory.mockResolvedValue('/manual/test.md');
      mockPrompt
        .mockResolvedValueOnce({ method: 'browse' }) // Select browse
        .mockResolvedValueOnce({ selectedIndex: 0 }) // Select conversion mode
        .mockResolvedValueOnce({ confirmed: false, finalOutputPath: '/manual/test.pdf' }); // Cancel

      await smartConversionMode.start();

      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: expect.stringContaining('How would you like to select a file?'),
        }),
      ]);
    });

    it('should handle browse file selection', async () => {
      mockBrowseDirectory.mockResolvedValue('/browse/test.md');

      mockPrompt
        .mockResolvedValueOnce({ method: 'browse' }) // Select browse
        .mockResolvedValueOnce({ selectedIndex: 0 }) // Select conversion mode
        .mockResolvedValueOnce({ confirmed: false, finalOutputPath: '/browse/test.pdf' }); // Cancel

      await smartConversionMode.start();

      expect(mockBrowseDirectory).toHaveBeenCalled();
    });

    it('should handle back navigation from file browser', async () => {
      mockPrompt.mockResolvedValueOnce({ method: 'browse' }); // Select browse
      mockBrowseDirectory.mockRejectedValue(new Error('BACK_TO_MAIN_MENU'));

      await smartConversionMode.start();

      expect(mockBrowseDirectory).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Returning to main menu'));
    });

    it('should complete successful conversion', async () => {
      const testFilePath = '/test/file.md';

      // Mock fs.stat for file size check
      const mockFs = { stat: jest.fn().mockResolvedValue({ size: 5000 }) };
      jest.doMock('fs', () => ({ promises: mockFs }));

      mockPrompt
        .mockResolvedValueOnce({ selectedIndex: 0 }) // Select quick conversion
        .mockResolvedValueOnce({ confirmed: true, finalOutputPath: '/test/output.pdf' }); // Confirm conversion

      await smartConversionMode.start(testFilePath);

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        testFilePath,
        expect.objectContaining({ outputPath: '/test/output.pdf' })
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Conversion completed successfully')
      );
    });

    it('should display analysis results with correct formatting', async () => {
      const testFilePath = '/test/analysis.md';

      mockPrompt
        .mockResolvedValueOnce({ selectedIndex: 0 })
        .mockResolvedValueOnce({ confirmed: false, finalOutputPath: '/test/output.pdf' });

      await smartConversionMode.start(testFilePath);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Content Analysis Results'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1,000')); // Word count with formatting
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('5')); // Estimated pages
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('English')); // Language
    });

    it('should handle manual file path entry', async () => {
      const testFilePath = '/test/manual-file.md';

      // Mock fs.stat for file validation
      const mockFs = {
        stat: jest.fn().mockResolvedValue({ isFile: () => true }),
      };
      jest.doMock('fs', () => ({ promises: mockFs }));

      mockPrompt
        .mockResolvedValueOnce({ method: 'manual' }) // Select manual entry
        .mockResolvedValueOnce({ filePath: testFilePath }) // Enter file path
        .mockResolvedValueOnce({ selectedIndex: 0 }) // Select conversion mode
        .mockResolvedValueOnce({ confirmed: false, finalOutputPath: '/test/manual-output.pdf' }); // Cancel

      await smartConversionMode.start();

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Enter the full path') })
      );
    });

    it('should handle custom preset selection', async () => {
      const testFilePath = '/test/file.md';

      mockPrompt
        .mockResolvedValueOnce({ selectedIndex: 2 }) // Select "Choose from Presets"
        .mockResolvedValueOnce({ presetName: 'Academic' }) // Select Academic preset
        .mockResolvedValueOnce({ confirmed: false, finalOutputPath: '/test/output.pdf' }); // Cancel

      await smartConversionMode.start(testFilePath);

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Select a preset configuration'),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle analysis errors', async () => {
      const testError = new Error('Analysis failed');
      mockSmartDefaultsService.analyzeContent.mockRejectedValue(testError);

      await smartConversionMode.start('/test/file.md');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Smart conversion failed: Error: Analysis failed')
      );
    });

    it('should handle file processing errors', async () => {
      const testError = new Error('Processing failed');
      mockFileProcessorService.processFile.mockRejectedValue(testError);

      mockPrompt
        .mockResolvedValueOnce({ selectedIndex: 0 })
        .mockResolvedValueOnce({ confirmed: true, finalOutputPath: '/test/output.pdf' });

      await smartConversionMode.start('/test/file.md');

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Conversion failed'));
    });

    it('should handle file browser errors gracefully', async () => {
      const browserError = new Error('Browser error');
      mockBrowseDirectory.mockRejectedValue(browserError);

      mockPrompt
        .mockResolvedValueOnce({ method: 'browse' }) // Select browse
        .mockResolvedValueOnce({ filePath: '/fallback/test.md' }) // Manual fallback
        .mockResolvedValueOnce({ selectedIndex: 0 })
        .mockResolvedValueOnce({ confirmed: false, finalOutputPath: '/fallback/test.pdf' });

      await smartConversionMode.start();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('File browsing failed: Error: Browser error')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('File browser unavailable')
      );
    });
  });
});
