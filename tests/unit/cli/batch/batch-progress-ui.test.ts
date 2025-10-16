/**
 * Unit tests for BatchProgressUI
 */

import { jest } from '@jest/globals';
import { BatchProgressUI } from '../../../../src/cli/batch/batch-progress-ui';

// Mock dependencies
jest.mock('chalk', () => ({
  cyan: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  bold: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text),
}));

const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  text: '',
};

jest.mock('ora', () => jest.fn(() => mockSpinner));

describe('BatchProgressUI', () => {
  let progressUI: BatchProgressUI;
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
    progressUI = new BatchProgressUI();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with ora spinner', async () => {
      expect(progressUI).toBeInstanceOf(BatchProgressUI);
      const { default: ora } = await import('ora');
      expect(ora).toHaveBeenCalled();
    });
  });

  describe('start method', () => {
    it('should start spinner with correct message', () => {
      progressUI.start(5);

      expect(mockSpinner.start).toHaveBeenCalledWith(
        '🚀 Starting batch conversion of 5 files...',
      );
    });
  });

  describe('stop method', () => {
    it('should stop the spinner', () => {
      progressUI.stop();
      expect(mockSpinner.stop).toHaveBeenCalled();
    });
  });

  describe('displayResults method', () => {
    it('should display successful batch results without errors', () => {
      const successResults = {
        success: true,
        totalFiles: 5,
        successfulFiles: 5,
        failedFiles: 0,
        skippedFiles: 0,
        processingTime: 15000,
        results: [],
        errors: [],
      };

      expect(() => progressUI.displayResults(successResults)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should display partial success results without errors', () => {
      const partialResults = {
        success: true,
        totalFiles: 5,
        successfulFiles: 3,
        failedFiles: 2,
        skippedFiles: 0,
        processingTime: 12000,
        results: [],
        errors: [
          {
            inputPath: 'error1.md',
            error: { ...new Error('File not found'), type: 'FILE_ERROR' },
            canRetry: true,
          },
          {
            inputPath: 'error2.md',
            error: {
              ...new Error('Permission denied'),
              type: 'PERMISSION_ERROR',
            },
            canRetry: false,
          },
        ],
      };

      expect(() =>
        progressUI.displayResults(partialResults as any),
      ).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSpinner.warn).toHaveBeenCalled();
    });

    it('should display failure results without errors', () => {
      const failureResults = {
        success: false,
        totalFiles: 5,
        successfulFiles: 0,
        failedFiles: 5,
        skippedFiles: 0,
        processingTime: 5000,
        results: [],
        errors: [
          {
            inputPath: 'error.md',
            error: { ...new Error('Critical error'), type: 'CRITICAL_ERROR' },
            canRetry: false,
          },
        ],
      };

      expect(() =>
        progressUI.displayResults(failureResults as any),
      ).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSpinner.fail).toHaveBeenCalled();
    });
  });

  describe('updateProgress method', () => {
    it('should handle start event', () => {
      const startData = {
        totalFiles: 5,
        processedFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        skippedFiles: 0,
        startTime: new Date(),
        averageProcessingTime: 0,
        estimatedTimeRemaining: 30000,
      };
      const startEvent = { type: 'start' as const, data: startData };

      expect(() => progressUI.updateProgress(startEvent)).not.toThrow();
    });

    it('should handle progress event', () => {
      const progressData = {
        totalFiles: 5,
        processedFiles: 3,
        successfulFiles: 2,
        failedFiles: 1,
        skippedFiles: 0,
        startTime: new Date(),
        averageProcessingTime: 1000,
        currentFile: 'test.md',
      };
      const progressEvent = { type: 'progress' as const, data: progressData };

      expect(() => progressUI.updateProgress(progressEvent)).not.toThrow();
    });

    it('should handle complete event', () => {
      const completeData = {
        totalFiles: 5,
        processedFiles: 5,
        successfulFiles: 5,
        failedFiles: 0,
        skippedFiles: 0,
        startTime: new Date(),
        averageProcessingTime: 1000,
      };
      const completeEvent = { type: 'complete' as const, data: completeData };

      expect(() => progressUI.updateProgress(completeEvent)).not.toThrow();
    });
  });

  // Extended test coverage for comprehensive BatchProgressUI testing
  describe('BatchProgressUI Extended Coverage', () => {
    let mockTranslationManager: any;

    beforeEach(() => {
      mockTranslationManager = {
        t: jest.fn((key: string, params?: any) => {
          const translations: Record<string, string> = {
            'batchProgress.startingConversion': `Starting batch conversion of ${params?.count} files...`,
            'batchProgress.filesToProcess': 'Files to be processed:',
            'batchProgress.totalFiles': `Total: ${params?.count} files`,
            'batchProgress.andMoreFiles': `... and ${params?.count} more files`,
            'batchProgress.batchConfiguration': 'Batch Configuration:',
            'batchProgress.inputPattern': 'Input Pattern:',
            'batchProgress.outputDirectory': 'Output Directory:',
            'batchProgress.preserveStructure': 'Preserve Structure:',
            'batchProgress.concurrentProcesses': 'Concurrent Processes:',
            'batchProgress.continueOnError': 'Continue on Error:',
            'common.yes': 'Yes',
            'common.no': 'No',
            'batchProgress.batchComplete':
              'Batch conversion completed successfully!',
            'batchProgress.batchPartialSuccess':
              'Batch conversion completed with some failures',
            'batchProgress.batchFailed': 'Batch conversion failed',
            'batchProgress.processingResults': 'Batch Processing Results:',
            'batchProgress.successful': `Successful: ${params?.count}`,
            'batchProgress.failed': `Failed: ${params?.count}`,
            'batchProgress.skipped': `Skipped: ${params?.count}`,
            'batchProgress.processingTime': `Processing time: ${params?.time}`,
            'batchProgress.averagePerFile': `Average per file: ${params?.time}`,
            'batchProgress.errorsEncountered': 'Errors encountered:',
            'batchProgress.suggestions': 'Suggestions:',
            'batchProgress.successfullyConverted':
              'Successfully converted files:',
            'batchProgress.pages': 'pages',
            'batchProgress.processingStarted': `Batch processing started (${params?.count} files)`,
            'batchProgress.progressEta': `ETA: ${params?.eta}`,
            'batchProgress.processingComplete': `All ${params?.count} files processed successfully!`,
            'batchProgress.processingPartial': `Processed ${params?.successful}/${params?.total} files (${params?.rate}% success rate)`,
            'batchProgress.processingFailed': 'Failed to process any files',
            'common.error': 'Error',
          };
          return translations[key] || key;
        }),
      };

      progressUI = new BatchProgressUI(mockTranslationManager);
    });

    describe('displayFilePreview method', () => {
      it('should display file preview with default max display', () => {
        const files = ['file1.md', 'file2.md', 'file3.md'];

        progressUI.displayFilePreview(files);

        expect(consoleSpy).toHaveBeenCalledWith('\nFiles to be processed:');
        expect(consoleSpy).toHaveBeenCalledWith('Total: 3 files\n');
      });

      it('should display file preview with custom max display', () => {
        const files = Array.from({ length: 15 }, (_, i) => `file${i + 1}.md`);

        progressUI.displayFilePreview(files, 5);

        expect(consoleSpy).toHaveBeenCalledWith('  ... and 10 more files');
      });

      it('should display file preview with translation manager', () => {
        const files = ['file1.md', 'file2.md'];

        progressUI.displayFilePreview(files);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.filesToProcess',
        );
        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.totalFiles',
          { count: '2' },
        );
      });
    });

    describe('displayConfigSummary method', () => {
      it('should display configuration summary', () => {
        const config = {
          inputPattern: '*.md',
          outputDirectory: './output',
          preserveDirectoryStructure: true,
          maxConcurrentProcesses: 4,
          continueOnError: false,
        };

        progressUI.displayConfigSummary(config);

        expect(consoleSpy).toHaveBeenCalledWith('Batch Configuration:');
        expect(consoleSpy).toHaveBeenCalledWith('Input Pattern: *.md');
        expect(consoleSpy).toHaveBeenCalledWith('Output Directory: ./output');
        expect(consoleSpy).toHaveBeenCalledWith('Preserve Structure: Yes');
        expect(consoleSpy).toHaveBeenCalledWith('Concurrent Processes: 4');
        expect(consoleSpy).toHaveBeenCalledWith('Continue on Error: No');
      });

      it('should display configuration summary with translation manager', () => {
        const config = {
          inputPattern: '*.md',
          outputDirectory: './output',
          preserveDirectoryStructure: false,
          maxConcurrentProcesses: 2,
          continueOnError: true,
        };

        progressUI.displayConfigSummary(config);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.batchConfiguration',
        );
        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.inputPattern',
        );
        expect(mockTranslationManager.t).toHaveBeenCalledWith('common.no');
        expect(mockTranslationManager.t).toHaveBeenCalledWith('common.yes');
      });
    });

    describe('displayResults method with translation manager', () => {
      it('should display successful results with translation', () => {
        const result = {
          success: true,
          totalFiles: 5,
          successfulFiles: 5,
          failedFiles: 0,
          skippedFiles: 0,
          processingTime: 15000,
          results: [
            {
              success: true,
              inputPath: 'test1.md',
              outputPath: 'test1.pdf',
              processingTime: 3000,
              stats: {
                inputSize: 1024,
                outputSize: 2048,
                pageCount: 2,
              },
            },
          ],
          errors: [],
        };

        progressUI.displayResults(result as any);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.batchComplete',
        );
        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.processingResults',
        );
        expect(mockSpinner.succeed).toHaveBeenCalled();
      });

      it('should display results with errors', () => {
        const result = {
          success: false,
          totalFiles: 3,
          successfulFiles: 1,
          failedFiles: 2,
          skippedFiles: 0,
          processingTime: 10000,
          results: [
            {
              success: true,
              inputPath: 'test1.md',
              outputPath: 'test1.pdf',
              processingTime: 2000,
              stats: {
                inputSize: 512,
                outputSize: 1024,
                pageCount: 1,
              },
            },
          ],
          errors: [
            {
              inputPath: 'error1.md',
              error: {
                name: 'FileNotFoundError',
                message: 'File not found',
                type: 'FILE_NOT_FOUND',
                suggestions: ['Check file path', 'Ensure file exists'],
              } as any,
              canRetry: true,
            },
            {
              inputPath: 'error2.md',
              error: {
                name: 'PermissionError',
                message: 'Permission denied',
                type: 'PERMISSION_DENIED',
              } as any,
              canRetry: false,
            },
          ],
        };

        progressUI.displayResults(result as any);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.batchPartialSuccess',
        );
        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.errorsEncountered',
        );
        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.successfullyConverted',
        );
        expect(mockSpinner.warn).toHaveBeenCalled();
      });

      it('should display complete failure results', () => {
        const result = {
          success: false,
          totalFiles: 3,
          successfulFiles: 0,
          failedFiles: 3,
          skippedFiles: 0,
          processingTime: 5000,
          results: [],
          errors: [
            {
              inputPath: 'error1.md',
              error: {
                name: 'CriticalError',
                message: 'Critical error',
                type: 'SYSTEM_ERROR',
              } as any,
              canRetry: false,
            },
          ],
        };

        progressUI.displayResults(result as any);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.batchFailed',
        );
        expect(mockSpinner.fail).toHaveBeenCalled();
      });

      it('should display results with skipped files', () => {
        const result = {
          success: true,
          totalFiles: 5,
          successfulFiles: 3,
          failedFiles: 0,
          skippedFiles: 2,
          processingTime: 12000,
          results: [],
          errors: [],
        };

        progressUI.displayResults(result as any);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.skipped',
          { count: '2' },
        );
      });
    });

    describe('updateProgress method comprehensive coverage', () => {
      it('should handle file_complete event', () => {
        const fileCompleteData = {
          totalFiles: 5,
          processedFiles: 3,
          successfulFiles: 3,
          failedFiles: 0,
          skippedFiles: 0,
          startTime: new Date(),
          averageProcessingTime: 2000,
        };

        const fileCompleteEvent = {
          type: 'file_complete' as const,
          data: fileCompleteData,
          currentFile: 'test.md',
        };

        expect(() =>
          progressUI.updateProgress(fileCompleteEvent),
        ).not.toThrow();
      });

      it('should handle file_error event', () => {
        const fileErrorData = {
          totalFiles: 5,
          processedFiles: 2,
          successfulFiles: 1,
          failedFiles: 1,
          skippedFiles: 0,
          startTime: new Date(),
          averageProcessingTime: 1500,
        };

        const fileErrorEvent = {
          type: 'file_error' as const,
          data: fileErrorData,
          currentFile: 'error.md',
          error: {
            name: 'ProcessingError',
            message: 'Processing failed',
            type: 'SYSTEM_ERROR',
          } as any,
        };

        progressUI.updateProgress(fileErrorEvent);

        expect(consoleSpy).toHaveBeenCalledWith('\n❌ Failed: error.md');
        expect(consoleSpy).toHaveBeenCalledWith('   Error: Processing failed');
      });

      it('should handle progress event with ETA', () => {
        const progressData = {
          totalFiles: 10,
          processedFiles: 4,
          successfulFiles: 4,
          failedFiles: 0,
          skippedFiles: 0,
          startTime: new Date(),
          averageProcessingTime: 2000,
          currentFile: 'current.md',
          estimatedTimeRemaining: 12000,
        };

        const progressEvent = {
          type: 'progress' as const,
          data: progressData,
        };

        progressUI.updateProgress(progressEvent);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.progressEta',
          { eta: '12s' },
        );
      });

      it('should handle complete event with 100% success', () => {
        const completeData = {
          totalFiles: 5,
          processedFiles: 5,
          successfulFiles: 5,
          failedFiles: 0,
          skippedFiles: 0,
          startTime: new Date(),
          averageProcessingTime: 1500,
        };

        const completeEvent = {
          type: 'complete' as const,
          data: completeData,
        };

        progressUI.updateProgress(completeEvent);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.processingComplete',
          { count: '5' },
        );
        expect(mockSpinner.succeed).toHaveBeenCalled();
      });

      it('should handle complete event with partial success', () => {
        const completeData = {
          totalFiles: 5,
          processedFiles: 5,
          successfulFiles: 3,
          failedFiles: 2,
          skippedFiles: 0,
          startTime: new Date(),
          averageProcessingTime: 1200,
        };

        const completeEvent = {
          type: 'complete' as const,
          data: completeData,
        };

        progressUI.updateProgress(completeEvent);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.processingPartial',
          {
            successful: '3',
            total: '5',
            rate: '60',
          },
        );
        expect(mockSpinner.warn).toHaveBeenCalled();
      });

      it('should handle complete event with no successful files', () => {
        const completeData = {
          totalFiles: 3,
          processedFiles: 3,
          successfulFiles: 0,
          failedFiles: 3,
          skippedFiles: 0,
          startTime: new Date(),
          averageProcessingTime: 0,
        };

        const completeEvent = {
          type: 'complete' as const,
          data: completeData,
        };

        progressUI.updateProgress(completeEvent);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.processingFailed',
        );
        expect(mockSpinner.fail).toHaveBeenCalled();
      });

      it('should throttle progress updates', () => {
        const progressData = {
          totalFiles: 10,
          processedFiles: 2,
          successfulFiles: 2,
          failedFiles: 0,
          skippedFiles: 0,
          startTime: new Date(),
          averageProcessingTime: 1000,
        };

        const progressEvent = {
          type: 'progress' as const,
          data: progressData,
        };

        // First update should work
        progressUI.updateProgress(progressEvent);
        const initialText = mockSpinner.text;

        // Immediate second update should be throttled (not change spinner text)
        progressUI.updateProgress(progressEvent);
        expect(mockSpinner.text).toBe(initialText);
      });
    });

    describe('private method coverage through public interface', () => {
      it('should format duration correctly', () => {
        const result = {
          success: true,
          totalFiles: 1,
          successfulFiles: 1,
          failedFiles: 0,
          skippedFiles: 0,
          processingTime: 3665000, // 1h 1m 5s
          results: [],
          errors: [],
        };

        progressUI.displayResults(result as any);

        expect(mockTranslationManager.t).toHaveBeenCalledWith(
          'batchProgress.processingTime',
          { time: '1h 1m' },
        );
      });

      it('should format bytes correctly in successful files display', () => {
        const result = {
          success: true,
          totalFiles: 1,
          successfulFiles: 1,
          failedFiles: 0,
          skippedFiles: 0,
          processingTime: 2000,
          results: [
            {
              success: true,
              inputPath:
                '/very/long/path/to/some/deeply/nested/directory/with/a/very/long/filename.md',
              outputPath:
                '/very/long/path/to/some/deeply/nested/output/directory/with/a/very/long/filename.pdf',
              processingTime: 2000,
              stats: {
                inputSize: 1024 * 1024 * 2.5, // 2.5 MB
                outputSize: 1024 * 1024 * 1024 * 1.2, // 1.2 GB
                pageCount: 150,
              },
            },
          ],
          errors: [],
        };

        progressUI.displayResults(result as any);

        // Should show shortened paths and formatted file sizes
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('2.5 MB → 1.2 GB'),
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('150 pages'),
        );
      });

      it('should generate progress bar correctly', () => {
        const progressData = {
          totalFiles: 10,
          processedFiles: 7,
          successfulFiles: 7,
          failedFiles: 0,
          skippedFiles: 0,
          startTime: new Date(),
          averageProcessingTime: 1000,
          currentFile: 'test.md',
        };

        const progressEvent = {
          type: 'progress' as const,
          data: progressData,
        };

        progressUI.updateProgress(progressEvent);

        // Should show 70% progress
        expect(mockSpinner.text).toContain('70%');
        expect(mockSpinner.text).toContain('(7/10)');
        expect(mockSpinner.text).toContain('test.md');
      });
    });

    describe('constructor variants', () => {
      it('should work without translation manager', () => {
        const progressUIWithoutTranslation = new BatchProgressUI();

        progressUIWithoutTranslation.start(3);

        expect(mockSpinner.start).toHaveBeenCalledWith(
          '🚀 Starting batch conversion of 3 files...',
        );
      });
    });
  });
});
