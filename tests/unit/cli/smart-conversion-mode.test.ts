/**
 * Unit tests for SmartConversionMode
 */

import { SmartConversionMode } from '../../../src/cli/smart-conversion-mode';
import { ContentAnalysis } from '../../../src/core/analysis/types';

// Mock dependencies
const mockPrompt = jest.fn();
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: mockPrompt,
  },
}));

jest.mock('chalk', () => ({
  green: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  red: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  white: jest.fn((text) => text),
  dim: jest.fn((text) => text),
}));

jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
  },
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
  extname: jest.fn(),
}));

// Mock timers for progress indicators
jest.useFakeTimers();

// Mock ApplicationServices
jest.mock('../../../src/application/container', () => ({
  ApplicationServices: {
    createContainer: jest.fn(() => ({
      resolve: jest.fn(),
    })),
  },
}));

// Mock RecentFilesManager
jest.mock('../../../src/cli/config/recent-files', () => ({
  RecentFilesManager: jest.fn().mockImplementation(() => ({
    getRecentFiles: jest.fn(),
    addFile: jest.fn(),
    formatFilePath: jest.fn(),
    formatFileSize: jest.fn(),
    formatLastUsed: jest.fn(),
  })),
}));

// Mock CliRenderer
jest.mock('../../../src/cli/utils/cli-renderer', () => ({
  CliRenderer: jest.fn().mockImplementation(() => ({
    header: jest.fn(),
    newline: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock FileBrowser
jest.mock('../../../src/cli/utils/file-browser', () => ({
  FileBrowser: jest.fn().mockImplementation(() => ({
    browseDirectory: jest.fn(),
  })),
}));

describe('SmartConversionMode', () => {
  let smartConversionMode: SmartConversionMode;
  let mockContainer: jest.Mocked<any>;
  let mockSmartDefaultsService: jest.Mocked<any>;
  let mockFileProcessorService: jest.Mocked<any>;
  let mockLogger: jest.Mocked<any>;
  let mockTranslationManager: jest.Mocked<any>;
  let mockRecentFilesManager: jest.Mocked<any>;
  let mockRenderer: jest.Mocked<any>;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Mock services
    mockSmartDefaultsService = {
      analyzeContent: jest.fn(),
      getQuickConversionConfig: jest.fn(),
      recommendSettings: jest.fn(),
      getPresetConfigs: jest.fn(),
    };

    mockFileProcessorService = {
      processFile: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockTranslationManager = {
      t: jest.fn((key: string) => {
        // Return simple key-based translations for testing
        const translations: Record<string, string> = {
          'smartConversion.title': 'Smart Conversion',
          'smartConversion.subtitle': 'AI-powered 3-step workflow',
          'smartConversion.step1': 'Step 1: File Selection',
          'smartConversion.step2': 'Step 2: Content Analysis',
          'smartConversion.step3': 'Step 3: Configuration',
          'smartConversion.selected': 'Selected file',
          'smartConversion.analyzingContent': 'Analyzing content...',
          'smartConversion.returningToMainMenu': 'Returning to main menu',
          'smartConversion.error': 'Error',
          'smartConversion.navigationHint': 'Use ESC to return',
          'smartConversion.fileSelectionPrompt':
            'How would you like to select a file?',
          'smartConversion.returnToMainMenu': 'Return to Main Menu',
          'smartConversion.browseFiles': 'Browse Files',
          'smartConversion.enterManually': 'Enter File Path Manually',
          'smartConversion.chooseRecent': 'Choose from Recent Files',
          'smartConversion.openingFileBrowser': 'Opening file browser...',
          'smartConversion.fileBrowserUnavailable': 'File browser unavailable',
          'smartConversion.enterFilePath': 'Enter file path:',
          'smartConversion.pleaseEnterFilePath': 'Please enter a file path',
          'smartConversion.recentFilesNotFound': 'No recent files found',
          'smartConversion.recentFiles': 'Recent Files',
          'smartConversion.browseOtherFiles': 'Browse for other files',
          'smartConversion.selectRecentFile': 'Select a recent file:',
          'smartConversion.recentFilesError': 'Error loading recent files',
          'smartConversion.analysisResults': 'Analysis Results',
          'smartConversion.words': 'Words',
          'smartConversion.estimatedPages': 'Estimated pages',
          'smartConversion.readingTime': 'Reading time',
          'smartConversion.minutes': 'minutes',
          'smartConversion.headings': 'Headings',
          'smartConversion.maxDepth': 'max depth',
          'smartConversion.language': 'Language',
          'smartConversion.codeBlocks': 'Code blocks',
          'smartConversion.tables': 'Tables',
          'smartConversion.images': 'Images',
          'smartConversion.documentType': 'Document type',
          'smartConversion.complexity': 'Complexity',
          'smartConversion.contentCharacteristics': 'Content characteristics',
          'smartConversion.conversionOptions': 'Conversion Options',
          'smartConversion.quickConversion': 'Quick Conversion',
          'smartConversion.smartRecommendations': 'Smart Recommendations',
          'smartConversion.customConfiguration': 'Custom configuration',
          'smartConversion.confidence': 'confidence',
          'smartConversion.chooseFromPresets': 'Choose from Presets',
          'smartConversion.predefinedConfigurations':
            'Predefined configurations',
          'smartConversion.estimatedTime': 'Estimated time',
          'smartConversion.seconds': 'seconds',
          'smartConversion.whichConversionMethod': 'Which conversion method?',
          'smartConversion.selectPresetConfiguration':
            'Select preset configuration:',
          'smartConversion.conversionSummary': 'Conversion Summary',
          'smartConversion.input': 'Input',
          'smartConversion.configuration': 'Configuration',
          'smartConversion.outputFilePath': 'Output file path:',
          'smartConversion.startConversion': 'Start conversion?',
          'smartConversion.conversionCancelled': 'Conversion cancelled',
          'smartConversion.startingConversion': 'Starting conversion...',
          'smartConversion.converting': 'Converting...',
          'smartConversion.conversionCompleted': 'Conversion completed',
          'smartConversion.output': 'Output',
          'smartConversion.fileSize': 'File size',
          'smartConversion.nextSteps': 'Next Steps',
          'smartConversion.openPdf': 'Open PDF:',
          'smartConversion.convertAnother': 'Convert another file',
          'smartConversion.conversionFailed': 'Conversion failed',
          'smartConversion.invalidMarkdownFile': 'Invalid Markdown file',
          'smartConversion.fileExists': 'File must exist',
          'smartConversion.validExtension': 'Must be a .md file',
          'smartConversion.whatToDo': 'What would you like to do?',
          'smartConversion.tryDifferentPath': 'Try a different path',
          'smartConversion.returnToPreviousMenu': 'Return to previous menu',
        };
        return translations[key] || key;
      }),
    };

    mockContainer = {
      resolve: jest.fn((serviceName: string) => {
        switch (serviceName) {
          case 'smartDefaults':
            return mockSmartDefaultsService;
          case 'fileProcessor':
            return mockFileProcessorService;
          case 'logger':
            return mockLogger;
          case 'translator':
            return mockTranslationManager;
          default:
            return {};
        }
      }),
    };

    mockRecentFilesManager = {
      getRecentFiles: jest.fn(),
      addFile: jest.fn(),
      formatFilePath: jest.fn(),
      formatFileSize: jest.fn(),
      formatLastUsed: jest.fn(),
    };

    mockRenderer = {
      header: jest.fn(),
      newline: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    smartConversionMode = new SmartConversionMode(mockContainer);

    // Replace instances created by constructor
    (smartConversionMode as any).recentFilesManager = mockRecentFilesManager;
    (smartConversionMode as any).renderer = mockRenderer;
  });

  describe('constructor', () => {
    it('should initialize with provided container', () => {
      const mode = new SmartConversionMode(mockContainer);
      expect(mode).toBeInstanceOf(SmartConversionMode);
    });

    it('should create container if none provided', () => {
      const {
        ApplicationServices,
      } = require('../../../src/application/container');
      ApplicationServices.createContainer.mockReturnValue(mockContainer);

      new SmartConversionMode();
      expect(ApplicationServices.createContainer).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    const mockAnalysis: ContentAnalysis = {
      fileSize: 5000,
      wordCount: 1000,
      estimatedPages: 3,
      readingTime: 5,
      headingStructure: {
        totalHeadings: 10,
        maxDepth: 3,
        structure: [],
        hasNumberedHeadings: false,
        averageHeadingLength: 15,
      },
      languageDetection: {
        primary: 'en',
        confidence: 0.9,
        chineseCharacterRatio: 0,
        needsChineseSupport: false,
        detectedLanguages: [],
      },
      codeBlocks: [],
      tables: [],
      links: {
        internal: 0,
        external: 0,
        hasFootnotes: false,
      },
      mediaElements: {
        images: 0,
        hasLargeImages: false,
        hasDiagrams: false,
        estimatedImageSize: 0,
      },
      contentComplexity: {
        score: 5,
        documentType: 'technical-manual',
        recommendedTocDepth: 3,
        factors: [
          {
            type: 'technical',
            weight: 0.8,
            description: 'Technical content detected',
          },
        ],
      },
    };

    beforeEach(() => {
      mockSmartDefaultsService.analyzeContent.mockResolvedValue(mockAnalysis);
    });

    it('should start conversion process with provided file path', async () => {
      const filePath = '/test/file.md';
      const quickConfig = {
        name: 'Quick Config',
        description: 'Fast conversion',
        config: { tocConfig: { enabled: true, maxDepth: 3 } },
        estimatedTime: 5,
      };
      const smartConfig = {
        confidence: 0.85,
        tocConfig: { enabled: true, maxDepth: 3 },
        optimization: { estimatedProcessingTime: 10 },
      };

      mockSmartDefaultsService.getQuickConversionConfig.mockResolvedValue(
        quickConfig,
      );
      mockSmartDefaultsService.recommendSettings.mockResolvedValue(smartConfig);
      mockSmartDefaultsService.getPresetConfigs.mockReturnValue([]);

      mockPrompt
        .mockResolvedValueOnce({ selectedIndex: 0 }) // Select quick conversion
        .mockResolvedValueOnce({
          finalOutputPath: '/test/file.pdf',
          confirmed: true,
        });

      mockFileProcessorService.processFile.mockResolvedValue(undefined);

      const fs = require('fs').promises;
      fs.stat.mockResolvedValue({ size: 1024 });

      await smartConversionMode.start(filePath);

      expect(mockRenderer.header).toHaveBeenCalled();
      expect(mockSmartDefaultsService.analyzeContent).toHaveBeenCalledWith(
        filePath,
      );
      expect(mockFileProcessorService.processFile).toHaveBeenCalled();
    });

    it('should handle BACK_TO_MAIN_MENU error gracefully', async () => {
      mockPrompt.mockRejectedValue(new Error('BACK_TO_MAIN_MENU'));

      await smartConversionMode.start();

      expect(mockRenderer.info).toHaveBeenCalledWith(
        expect.stringContaining('Returning to main menu'),
      );
    });

    it('should handle general errors', async () => {
      const error = new Error('Test error');
      mockPrompt.mockRejectedValue(error);

      await smartConversionMode.start();

      expect(mockRenderer.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Error: Test error'),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Smart conversion failed'),
      );
    });
  });

  describe('selectFile', () => {
    it('should handle browse files selection', async () => {
      mockPrompt.mockResolvedValue({ method: 'browse' });

      const { FileBrowser } = require('../../../src/cli/utils/file-browser');
      const mockBrowser = {
        browseDirectory: jest.fn().mockResolvedValue('/test/file.md'),
      };
      FileBrowser.mockImplementation(() => mockBrowser);

      const result = await (smartConversionMode as any).selectFile();

      expect(result).toBe('/test/file.md');
      expect(mockBrowser.browseDirectory).toHaveBeenCalled();
    });

    it('should handle manual file entry', async () => {
      mockPrompt
        .mockResolvedValueOnce({ method: 'manual' })
        .mockResolvedValueOnce({ filePath: '/test/manual.md' });

      const path = require('path');
      path.resolve.mockReturnValue('/test/manual.md');
      path.extname.mockReturnValue('.md');

      const fs = require('fs').promises;
      fs.stat.mockResolvedValue({ isFile: () => true });

      const result = await (smartConversionMode as any).selectFile();

      expect(result).toBe('/test/manual.md');
    });

    it('should handle recent files selection', async () => {
      const recentFiles = [
        { path: '/test/recent.md', size: 1024, lastUsed: new Date() },
      ];

      mockPrompt
        .mockResolvedValueOnce({ method: 'recent' })
        .mockResolvedValueOnce({ filePath: '/test/recent.md' });

      mockRecentFilesManager.getRecentFiles.mockResolvedValue(recentFiles);
      mockRecentFilesManager.formatFilePath.mockReturnValue('recent.md');
      mockRecentFilesManager.formatFileSize.mockReturnValue('1KB');
      mockRecentFilesManager.formatLastUsed.mockReturnValue('today');

      const result = await (smartConversionMode as any).selectFile();

      expect(result).toBe('/test/recent.md');
    });

    it('should throw error for back selection', async () => {
      mockPrompt.mockResolvedValue({ method: 'back' });

      await expect((smartConversionMode as any).selectFile()).rejects.toThrow(
        'BACK_TO_MAIN_MENU',
      );
    });
  });

  describe('displayAnalysisResults', () => {
    it('should display complete analysis results', () => {
      const analysis: ContentAnalysis = {
        fileSize: 7500,
        wordCount: 1500,
        estimatedPages: 4,
        readingTime: 8,
        headingStructure: {
          totalHeadings: 15,
          maxDepth: 4,
          structure: [],
          hasNumberedHeadings: false,
          averageHeadingLength: 18,
        },
        languageDetection: {
          primary: 'en',
          confidence: 0.95,
          chineseCharacterRatio: 0,
          needsChineseSupport: false,
          detectedLanguages: [],
        },
        codeBlocks: [
          { language: 'javascript', lineCount: 10, complexity: 'moderate' },
        ],
        tables: [{ rows: 3, columns: 2, complexity: 'simple' }],
        links: {
          internal: 5,
          external: 3,
          hasFootnotes: true,
        },
        mediaElements: {
          images: 2,
          hasLargeImages: true,
          hasDiagrams: false,
          estimatedImageSize: 500,
        },
        contentComplexity: {
          score: 7,
          documentType: 'technical-manual',
          recommendedTocDepth: 4,
          factors: [
            {
              type: 'technical',
              weight: 0.8,
              description: 'Technical content detected',
            },
            {
              type: 'code-heavy',
              weight: 0.6,
              description: 'Complex structure',
            },
          ],
        },
      };

      (smartConversionMode as any).displayAnalysisResults(analysis);

      expect(mockRenderer.info).toHaveBeenCalledWith(
        expect.stringContaining('Words: 1,500'),
      );
      expect(mockRenderer.info).toHaveBeenCalledWith(
        expect.stringContaining('Code blocks: 1'),
      );
      expect(mockRenderer.info).toHaveBeenCalledWith(
        expect.stringContaining('Tables: 1'),
      );
      expect(mockRenderer.info).toHaveBeenCalledWith(
        expect.stringContaining('Images: 2'),
      );
      expect(mockRenderer.info).toHaveBeenCalledWith(
        expect.stringContaining('Technical content detected'),
      );
    });
  });

  describe('selectConversionMode', () => {
    const mockAnalysis: ContentAnalysis = {
      fileSize: 5000,
      wordCount: 1000,
      estimatedPages: 3,
      readingTime: 5,
      headingStructure: {
        totalHeadings: 10,
        maxDepth: 3,
        structure: [],
        hasNumberedHeadings: false,
        averageHeadingLength: 15,
      },
      languageDetection: {
        primary: 'en',
        confidence: 0.9,
        chineseCharacterRatio: 0,
        needsChineseSupport: false,
        detectedLanguages: [],
      },
      codeBlocks: [],
      tables: [],
      links: {
        internal: 0,
        external: 0,
        hasFootnotes: false,
      },
      mediaElements: {
        images: 0,
        hasLargeImages: false,
        hasDiagrams: false,
        estimatedImageSize: 0,
      },
      contentComplexity: {
        score: 5,
        documentType: 'documentation',
        recommendedTocDepth: 3,
        factors: [],
      },
    };

    it('should return quick conversion choice', async () => {
      const quickConfig = {
        name: 'Quick Config',
        description: 'Fast conversion',
        config: { tocConfig: { enabled: true, maxDepth: 3 } },
        estimatedTime: 5,
      };
      const smartConfig = {
        confidence: 0.85,
        tocConfig: { enabled: true, maxDepth: 3 },
      };

      mockSmartDefaultsService.getQuickConversionConfig.mockResolvedValue(
        quickConfig,
      );
      mockSmartDefaultsService.recommendSettings.mockResolvedValue(smartConfig);
      mockSmartDefaultsService.getPresetConfigs.mockReturnValue([]);

      mockPrompt.mockResolvedValue({ selectedIndex: 0 });

      const result = await (smartConversionMode as any).selectConversionMode(
        mockAnalysis,
      );

      expect(result.type).toBe('quick');
      expect(result.config).toBe(quickConfig);
    });

    it('should handle custom preset selection', async () => {
      const quickConfig = {
        name: 'Quick',
        description: 'Fast',
        estimatedTime: 5,
      };
      const smartConfig = { confidence: 0.85 };
      const presetConfigs = [
        { name: 'Preset1', description: 'First preset' },
        { name: 'Preset2', description: 'Second preset' },
      ];

      mockSmartDefaultsService.getQuickConversionConfig.mockResolvedValue(
        quickConfig,
      );
      mockSmartDefaultsService.recommendSettings.mockResolvedValue(smartConfig);
      mockSmartDefaultsService.getPresetConfigs.mockReturnValue(presetConfigs);

      mockPrompt
        .mockResolvedValueOnce({ selectedIndex: 2 }) // Select custom
        .mockResolvedValueOnce({ presetName: 'Preset1' });

      const result = await (smartConversionMode as any).selectConversionMode(
        mockAnalysis,
      );

      expect(result.type).toBe('custom');
      expect(result.name).toBe('Preset1');
      expect(result.config).toBe(presetConfigs[0]);
    });
  });

  describe('confirmAndConvert', () => {
    const mockChoice = {
      type: 'quick' as const,
      name: 'Quick Conversion',
      description: 'Fast conversion',
      config: { estimatedTime: 5 },
    };

    const mockAnalysis: ContentAnalysis = {
      fileSize: 5000,
      wordCount: 1000,
      estimatedPages: 3,
      readingTime: 5,
      headingStructure: {
        totalHeadings: 10,
        maxDepth: 3,
        structure: [],
        hasNumberedHeadings: false,
        averageHeadingLength: 15,
      },
      languageDetection: {
        primary: 'en',
        confidence: 0.9,
        chineseCharacterRatio: 0,
        needsChineseSupport: false,
        detectedLanguages: [],
      },
      codeBlocks: [],
      tables: [],
      links: {
        internal: 0,
        external: 0,
        hasFootnotes: false,
      },
      mediaElements: {
        images: 0,
        hasLargeImages: false,
        hasDiagrams: false,
        estimatedImageSize: 0,
      },
      contentComplexity: {
        score: 5,
        documentType: 'documentation',
        recommendedTocDepth: 3,
        factors: [],
      },
    };

    it('should complete conversion successfully', async () => {
      mockPrompt.mockResolvedValue({
        finalOutputPath: '/test/output.pdf',
        confirmed: true,
      });

      mockFileProcessorService.processFile.mockResolvedValue(undefined);

      const fs = require('fs').promises;
      fs.stat.mockResolvedValue({ size: 2048 });

      await (smartConversionMode as any).confirmAndConvert(
        '/test/input.md',
        mockChoice,
        mockAnalysis,
      );

      expect(mockFileProcessorService.processFile).toHaveBeenCalledWith(
        '/test/input.md',
        expect.objectContaining({ outputPath: '/test/output.pdf' }),
      );
      expect(mockRenderer.info).toHaveBeenCalledWith(
        expect.stringContaining('Conversion completed'),
      );
    });

    it('should handle conversion cancellation', async () => {
      mockPrompt.mockResolvedValue({
        finalOutputPath: '/test/output.pdf',
        confirmed: false,
      });

      await (smartConversionMode as any).confirmAndConvert(
        '/test/input.md',
        mockChoice,
        mockAnalysis,
      );

      expect(mockFileProcessorService.processFile).not.toHaveBeenCalled();
      expect(mockRenderer.warn).toHaveBeenCalledWith(
        expect.stringContaining('Conversion cancelled'),
      );
    });

    it('should handle conversion errors', async () => {
      mockPrompt.mockResolvedValue({
        finalOutputPath: '/test/output.pdf',
        confirmed: true,
      });

      const error = new Error('Conversion failed');
      mockFileProcessorService.processFile.mockRejectedValue(error);

      await expect(
        (smartConversionMode as any).confirmAndConvert(
          '/test/input.md',
          mockChoice,
          mockAnalysis,
        ),
      ).rejects.toThrow(error);

      expect(mockRenderer.error).toHaveBeenCalledWith(
        expect.stringContaining('Conversion failed: Error: Conversion failed'),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Smart conversion failed',
        error,
      );
    });
  });

  describe('utility methods', () => {
    describe('getLanguageDisplay', () => {
      it('should return translated language display', () => {
        mockTranslationManager.t.mockReturnValue('English');
        const result = (smartConversionMode as any).getLanguageDisplay('en');
        expect(result).toBe('English');
      });

      it('should return original language code if no translation', () => {
        mockTranslationManager.t.mockReturnValue(
          'smartConversion.languageDisplay.unknown',
        );
        const result = (smartConversionMode as any).getLanguageDisplay(
          'unknown',
        );
        expect(result).toBe('unknown');
      });
    });

    describe('getDocumentTypeDisplay', () => {
      it('should return translated document type display', () => {
        mockTranslationManager.t.mockReturnValue('Technical Document');
        const result = (smartConversionMode as any).getDocumentTypeDisplay(
          'technical',
        );
        expect(result).toBe('Technical Document');
      });
    });

    describe('getEstimatedTime', () => {
      it('should return estimatedTime from config', () => {
        const config = { estimatedTime: 10 };
        const result = (smartConversionMode as any).getEstimatedTime(config);
        expect(result).toBe(10);
      });

      it('should return optimization time from config', () => {
        const config = { optimization: { estimatedProcessingTime: 15 } };
        const result = (smartConversionMode as any).getEstimatedTime(config);
        expect(result).toBe(15);
      });

      it('should return default fallback', () => {
        const config = {};
        const result = (smartConversionMode as any).getEstimatedTime(config);
        expect(result).toBe(5);
      });
    });

    describe('convertToProcessingConfig', () => {
      it('should convert quick config', () => {
        const config = {
          config: {
            tocConfig: { enabled: true, maxDepth: 4 },
          },
        };
        const analysis = {
          headingStructure: { totalHeadings: 5 },
        };

        const result = (smartConversionMode as any).convertToProcessingConfig(
          config,
          analysis,
        );

        expect(result.includeTOC).toBe(true);
        expect(result.tocOptions.maxDepth).toBe(4);
      });

      it('should convert recommended config', () => {
        const config = {
          tocConfig: { enabled: false, maxDepth: 2 },
        };
        const analysis = {
          headingStructure: { totalHeadings: 5 },
        };

        const result = (smartConversionMode as any).convertToProcessingConfig(
          config,
          analysis,
        );

        expect(result.includeTOC).toBe(false);
        expect(result.tocOptions.maxDepth).toBe(2);
      });

      it('should handle undefined config', () => {
        const analysis = {
          headingStructure: { totalHeadings: 5 },
        };

        const result = (smartConversionMode as any).convertToProcessingConfig(
          undefined,
          analysis,
        );

        expect(result.includeTOC).toBe(true);
        expect(result.tocOptions.maxDepth).toBe(3);
      });
    });

    describe('isValidMarkdownFile', () => {
      it('should validate markdown file correctly', async () => {
        const fs = require('fs').promises;
        const path = require('path');

        fs.stat.mockResolvedValue({ isFile: () => true });
        path.extname.mockReturnValue('.md');

        const result = await (smartConversionMode as any).isValidMarkdownFile(
          '/test/file.md',
        );

        expect(result).toBe(true);
      });

      it('should reject non-file paths', async () => {
        const fs = require('fs').promises;
        fs.stat.mockResolvedValue({ isFile: () => false });

        const result = await (smartConversionMode as any).isValidMarkdownFile(
          '/test/directory',
        );

        expect(result).toBe(false);
      });

      it('should reject non-markdown extensions', async () => {
        const fs = require('fs').promises;
        const path = require('path');

        fs.stat.mockResolvedValue({ isFile: () => true });
        path.extname.mockReturnValue('.txt');

        const result = await (smartConversionMode as any).isValidMarkdownFile(
          '/test/file.txt',
        );

        expect(result).toBe(false);
      });

      it('should handle file access errors', async () => {
        const fs = require('fs').promises;
        fs.stat.mockRejectedValue(new Error('File not found'));

        const result = await (smartConversionMode as any).isValidMarkdownFile(
          '/test/nonexistent.md',
        );

        expect(result).toBe(false);
      });
    });

    describe('addToRecentFiles', () => {
      it('should add file to recent files successfully', async () => {
        mockRecentFilesManager.addFile.mockResolvedValue(undefined);

        await (smartConversionMode as any).addToRecentFiles('/test/file.md');

        expect(mockRecentFilesManager.addFile).toHaveBeenCalledWith(
          '/test/file.md',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Added file to recent files: /test/file.md',
        );
      });

      it('should handle errors gracefully', async () => {
        const error = new Error('Failed to add file');
        mockRecentFilesManager.addFile.mockRejectedValue(error);

        await (smartConversionMode as any).addToRecentFiles('/test/file.md');

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to add file to recent files: Error: Failed to add file',
        );
      });
    });
  });

  describe('file selection methods', () => {
    describe('browseFiles', () => {
      it('should handle file browser success', async () => {
        const { FileBrowser } = require('../../../src/cli/utils/file-browser');
        const mockBrowser = {
          browseDirectory: jest.fn().mockResolvedValue('/test/file.md'),
        };
        FileBrowser.mockImplementation(() => mockBrowser);

        const result = await (smartConversionMode as any).browseFiles();

        expect(result).toBe('/test/file.md');
        expect(mockRenderer.info).toHaveBeenCalledWith(
          expect.stringContaining('Opening file browser...'),
        );
      });

      it('should handle BACK_TO_MAIN_MENU error', async () => {
        const { FileBrowser } = require('../../../src/cli/utils/file-browser');
        const mockBrowser = {
          browseDirectory: jest
            .fn()
            .mockRejectedValue(new Error('BACK_TO_MAIN_MENU')),
        };
        FileBrowser.mockImplementation(() => mockBrowser);

        await expect(
          (smartConversionMode as any).browseFiles(),
        ).rejects.toThrow('BACK_TO_MAIN_MENU');
      });

      it('should fallback to manual entry on browser error', async () => {
        const { FileBrowser } = require('../../../src/cli/utils/file-browser');
        const mockBrowser = {
          browseDirectory: jest
            .fn()
            .mockRejectedValue(new Error('Browser failed')),
        };
        FileBrowser.mockImplementation(() => mockBrowser);

        mockPrompt.mockResolvedValue({ filePath: '/fallback/file.md' });

        const path = require('path');
        path.resolve.mockReturnValue('/fallback/file.md');

        const result = await (smartConversionMode as any).browseFiles();

        expect(result).toBe('/fallback/file.md');
        expect(mockRenderer.warn).toHaveBeenCalledWith(
          expect.stringContaining('File browser unavailable'),
        );
      });
    });

    describe('selectRecentFile', () => {
      it('should handle empty recent files', async () => {
        mockRecentFilesManager.getRecentFiles.mockResolvedValue([]);

        const { FileBrowser } = require('../../../src/cli/utils/file-browser');
        const mockBrowser = {
          browseDirectory: jest.fn().mockResolvedValue('/test/file.md'),
        };
        FileBrowser.mockImplementation(() => mockBrowser);

        const result = await (smartConversionMode as any).selectRecentFile();

        expect(result).toBe('/test/file.md');
        expect(mockRenderer.warn).toHaveBeenCalledWith(
          expect.stringContaining('No recent files found'),
        );
      });

      it('should handle browse other files selection', async () => {
        const recentFiles = [
          { path: '/test/recent.md', size: 1024, lastUsed: new Date() },
        ];

        mockRecentFilesManager.getRecentFiles.mockResolvedValue(recentFiles);
        mockRecentFilesManager.formatFilePath.mockReturnValue('recent.md');
        mockRecentFilesManager.formatLastUsed.mockReturnValue('today');

        mockPrompt.mockResolvedValue({ filePath: '__browse__' });

        const { FileBrowser } = require('../../../src/cli/utils/file-browser');
        const mockBrowser = {
          browseDirectory: jest.fn().mockResolvedValue('/test/browse.md'),
        };
        FileBrowser.mockImplementation(() => mockBrowser);

        const result = await (smartConversionMode as any).selectRecentFile();

        expect(result).toBe('/test/browse.md');
      });

      it('should handle recent files error', async () => {
        mockRecentFilesManager.getRecentFiles.mockRejectedValue(
          new Error('Recent files error'),
        );

        const { FileBrowser } = require('../../../src/cli/utils/file-browser');
        const mockBrowser = {
          browseDirectory: jest.fn().mockResolvedValue('/test/file.md'),
        };
        FileBrowser.mockImplementation(() => mockBrowser);

        const result = await (smartConversionMode as any).selectRecentFile();

        expect(result).toBe('/test/file.md');
        expect(mockRenderer.warn).toHaveBeenCalledWith(
          expect.stringContaining('Error loading recent files'),
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Recent files error'),
        );
      });
    });

    describe('enterFilePath', () => {
      it('should return trimmed file path', async () => {
        mockPrompt.mockResolvedValue({ filePath: '  /test/file.md  ' });

        const path = require('path');
        path.resolve.mockReturnValue('/test/file.md');

        const result = await (smartConversionMode as any).enterFilePath();

        expect(result).toBe('/test/file.md');
      });

      it('should validate empty input', async () => {
        const validateFn = jest.fn();
        mockPrompt.mockImplementation(async (options: any) => {
          validateFn.mockReturnValue(false);
          options.validate('');
          return { filePath: '/test/file.md' };
        });

        await (smartConversionMode as any).enterFilePath();

        expect(mockPrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            validate: expect.any(Function),
          }),
        );
      });
    });
  });
});
