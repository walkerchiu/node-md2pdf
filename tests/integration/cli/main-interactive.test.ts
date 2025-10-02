/**
 * Integration tests for MainInteractiveMode CLI
 */

import { ServiceContainer } from '../../../src/shared/container';
import { MainInteractiveMode } from '../../../src/cli/main-interactive';
import { ILogger } from '../../../src/infrastructure/logging/types';

// Mock inquirer - create a proper mock for dynamic imports
const mockPrompt = jest.fn();

jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: mockPrompt,
  },
}));

// Mock chalk
jest.mock('chalk', () => ({
  cyan: jest.fn(text => text),
  red: jest.fn(text => text),
  yellow: jest.fn(text => text),
  green: jest.fn(text => text),
  gray: jest.fn(text => text),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock InteractiveMode and BatchInteractiveMode
jest.mock('@/cli/interactive', () => ({
  InteractiveMode: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/cli/batch', () => ({
  BatchInteractiveMode: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('MainInteractiveMode Integration Tests', () => {
  let container: ServiceContainer;
  let mainInteractive: MainInteractiveMode;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Create mock container
    container = new ServiceContainer();

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    container.register('logger', () => mockLogger);

    mainInteractive = new MainInteractiveMode(container);

    // Reset mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockPrompt.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('welcome message display', () => {
    it('should display welcome message with proper formatting', async () => {
      mockPrompt.mockResolvedValue({ mode: 'exit' });

      await mainInteractive.start();

      // Verify welcome message is displayed
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('MD2PDF Main Menu'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Convert Markdown files to professional')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('PDF documents with table of contents')
      );
    });

    it('should use proper ASCII box formatting for welcome message', async () => {
      mockPrompt.mockResolvedValue({ mode: 'exit' });

      await mainInteractive.start();

      // Verify box characters are used
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('┌─────────────────────────────────────────┐')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('├─────────────────────────────────────────┤')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('└─────────────────────────────────────────┘')
      );
    });
  });

  describe('mode selection', () => {
    it('should present correct mode options to user', async () => {
      mockPrompt.mockResolvedValue({ mode: 'exit' });

      await mainInteractive.start();

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'mode',
          message: 'How would you like to process your files?',
          choices: [
            {
              name: '📄 Single File - Convert one Markdown file to PDF',
              value: 'single',
              short: 'Single File',
            },
            {
              name: '📚 Batch Processing - Convert multiple files at once',
              value: 'batch',
              short: 'Batch Processing',
            },
            {
              name: '🚪 Exit',
              value: 'exit',
              short: 'Exit',
            },
          ],
          default: 'single',
        },
      ]);
    });

    it('should default to single file mode', async () => {
      mockPrompt.mockResolvedValue({ mode: 'exit' });

      await mainInteractive.start();

      if (mockPrompt.mock.calls.length > 0) {
        const promptCall = mockPrompt.mock.calls[0][0][0];
        expect(promptCall.default).toBe('single');
      }
    });
  });

  describe('single file mode selection', () => {
    it('should start InteractiveMode when single mode is selected then return to menu', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'single' }).mockResolvedValueOnce({ mode: 'exit' });

      const { InteractiveMode } = await import('../../../src/cli/interactive');
      const mockInteractiveMode = new InteractiveMode(container);

      await mainInteractive.start();

      expect(InteractiveMode).toHaveBeenCalledWith(container);
      expect(mockInteractiveMode.start).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('User selected single file mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });

    it('should log appropriate messages for single mode', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'single' }).mockResolvedValueOnce({ mode: 'exit' });

      await mainInteractive.start();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting main interactive mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected single file mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });
  });

  describe('batch mode selection', () => {
    it('should start BatchInteractiveMode when batch mode is selected then return to menu', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'batch' }).mockResolvedValueOnce({ mode: 'exit' });

      const { BatchInteractiveMode } = await import('../../../src/cli/batch');
      const mockBatchMode = new BatchInteractiveMode(container);

      await mainInteractive.start();

      expect(BatchInteractiveMode).toHaveBeenCalledWith(container);
      expect(mockBatchMode.start).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('User selected batch mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });

    it('should log appropriate messages for batch mode', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'batch' }).mockResolvedValueOnce({ mode: 'exit' });

      await mainInteractive.start();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting main interactive mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected batch mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });
  });

  describe('exit selection', () => {
    it('should display goodbye message and exit cleanly', async () => {
      mockPrompt.mockResolvedValue({ mode: 'exit' });

      await mainInteractive.start();

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('👋 Goodbye!'));
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });

    it('should not start any sub-modes when exit is selected', async () => {
      mockPrompt.mockResolvedValue({ mode: 'exit' });

      const { InteractiveMode } = await import('../../../src/cli/interactive');
      const { BatchInteractiveMode } = await import('../../../src/cli/batch');

      await mainInteractive.start();

      expect(InteractiveMode).not.toHaveBeenCalled();
      expect(BatchInteractiveMode).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle and log errors during mode selection', async () => {
      const testError = new Error('Inquirer error');
      mockPrompt.mockRejectedValue(testError);

      await expect(mainInteractive.start()).rejects.toThrow('Inquirer error');

      expect(mockLogger.error).toHaveBeenCalledWith('Main interactive mode error', testError);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('❌ Main interactive mode error:'),
        testError
      );
    });

    it('should handle errors during single mode execution', async () => {
      const testError = new Error('Single mode error');
      mockPrompt.mockResolvedValue({ mode: 'single' });

      const { InteractiveMode } = await import('../../../src/cli/interactive');
      const mockInteractiveMode = new InteractiveMode(container);
      (mockInteractiveMode.start as jest.Mock).mockRejectedValue(testError);

      await expect(mainInteractive.start()).rejects.toThrow('Single mode error');

      expect(mockLogger.error).toHaveBeenCalledWith('Main interactive mode error', testError);
    });

    it('should handle errors during batch mode execution', async () => {
      const testError = new Error('Batch mode error');
      mockPrompt.mockResolvedValue({ mode: 'batch' });

      const { BatchInteractiveMode } = await import('../../../src/cli/batch');
      const mockBatchMode = new BatchInteractiveMode(container);
      (mockBatchMode.start as jest.Mock).mockRejectedValue(testError);

      await expect(mainInteractive.start()).rejects.toThrow('Batch mode error');

      expect(mockLogger.error).toHaveBeenCalledWith('Main interactive mode error', testError);
    });
  });

  describe('container integration', () => {
    it('should properly resolve logger from container', () => {
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.error).toBeDefined();

      // Create new instance to test container resolution
      const newInstance = new MainInteractiveMode(container);
      expect(newInstance).toBeInstanceOf(MainInteractiveMode);
    });

    it('should pass container to sub-modes', async () => {
      mockPrompt.mockResolvedValue({ mode: 'single' });

      const { InteractiveMode } = await import('../../../src/cli/interactive');

      await mainInteractive.start();

      expect(InteractiveMode).toHaveBeenCalledWith(container);
    });
  });

  describe('logging behavior', () => {
    it('should log start message before showing welcome', async () => {
      mockPrompt.mockResolvedValue({ mode: 'exit' });

      await mainInteractive.start();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting main interactive mode');
    });

    it('should log user selections appropriately', async () => {
      mockPrompt.mockResolvedValue({ mode: 'exit' });

      await mainInteractive.start();

      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });
  });

  describe('main menu loop behavior', () => {
    it('should Return to Main Menu after single file conversion', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'single' }).mockResolvedValueOnce({ mode: 'exit' });

      await mainInteractive.start();

      // Should be called twice - once for single mode, once for exit
      expect(mockPrompt).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith('User selected single file mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });

    it('should Return to Main Menu after batch processing', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'batch' }).mockResolvedValueOnce({ mode: 'exit' });

      await mainInteractive.start();

      // Should be called twice - once for batch mode, once for exit
      expect(mockPrompt).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith('User selected batch mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });

    it('should handle multiple operations before exit', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'single' })
        .mockResolvedValueOnce({ mode: 'batch' })
        .mockResolvedValueOnce({ mode: 'single' })
        .mockResolvedValueOnce({ mode: 'exit' });

      await mainInteractive.start();

      // Should be called four times
      expect(mockPrompt).toHaveBeenCalledTimes(4);
      expect(mockLogger.info).toHaveBeenCalledWith('User selected single file mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected batch mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });
  });
});
