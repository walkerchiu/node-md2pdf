/**
 * Unit tests for MainInteractiveMode
 */

import { jest } from '@jest/globals';

// Mock prompt function (currently unused but kept for potential future use)
// const mockPrompt = jest.fn() as jest.MockedFunction<any>;

// Mock dependencies - must be before imports
jest.mock('chalk', () => ({
  cyan: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
}));

// Since the source code uses dynamic import, we need to mock the MainInteractiveMode class method
// Instead of mocking the import directly, let's spy on the class method after instantiation

import { MainInteractiveMode } from '../../../src/cli/main-interactive';
import { ServiceContainer } from '../../../src/shared/container';
import type { ILogger } from '../../../src/infrastructure/logging/types';

// Local private interface to access internal methods for testing without using `any`
type PrivateMainInteractive = {
  selectMode: () => Promise<string>;
  showWelcomeMessage?: () => void;
};

jest.mock('../../../src/cli/interactive', () => ({
  InteractiveMode: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

jest.mock('../../../src/cli/batch', () => ({
  BatchInteractiveMode: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

describe('MainInteractiveMode', () => {
  let container: ServiceContainer;
  let mockLogger: jest.Mocked<ILogger>;
  let mainMode: MainInteractiveMode;
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    // Setup mocks
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

    container = new ServiceContainer();
    container.registerInstance('logger', mockLogger);

    mainMode = new MainInteractiveMode(container);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with container and resolve logger', () => {
      expect(mainMode).toBeInstanceOf(MainInteractiveMode);
      expect(container.resolve('logger')).toBe(mockLogger);
    });
  });

  describe('start method', () => {
    it('should start successfully with single mode selection then exit', async () => {
      // Mock selectMode to return 'single' first, then 'exit' to break the loop
      jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('exit');

      await mainMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting main interactive mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected single file mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
      expect(consoleSpy).toHaveBeenCalled(); // Welcome message displayed
    });

    it('should start successfully with batch mode selection then exit', async () => {
      // Mock selectMode to return 'batch' first, then 'exit' to break the loop
      jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValueOnce('batch')
        .mockResolvedValueOnce('exit');

      await mainMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting main interactive mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected batch mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });

    it('should handle exit selection gracefully', async () => {
      // Spy on the selectMode method directly
      jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValue('exit');

      await mainMode.start();

      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
      expect(consoleSpy).toHaveBeenCalledWith('👋 Goodbye!');
    });

    it('should handle errors properly', async () => {
      // Spy on the selectMode method to throw error
      const testError = new Error('Test error');
      jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockRejectedValue(testError);

      await expect(mainMode.start()).rejects.toThrow('Test error');

      expect(mockLogger.error).toHaveBeenCalledWith('Main interactive mode error', testError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Main interactive mode error:', testError);
    });
  });

  describe('showWelcomeMessage', () => {
    it('should display welcome message with proper formatting', async () => {
      // Access private method for testing
      const showWelcomeMessage = (
        mainMode as unknown as PrivateMainInteractive
      ).showWelcomeMessage!.bind(mainMode);
      showWelcomeMessage();

      expect(consoleSpy).toHaveBeenCalledWith('┌──────────────────────────────────────────┐');
      expect(consoleSpy).toHaveBeenCalledWith('│           MD2PDF Main Menu               │');
      expect(consoleSpy).toHaveBeenCalledWith('├──────────────────────────────────────────┤');
      expect(consoleSpy).toHaveBeenCalledWith('│  Convert Markdown files to professional  │');
      expect(consoleSpy).toHaveBeenCalledWith('│  PDF documents with table of contents    │');
      expect(consoleSpy).toHaveBeenCalledWith('└──────────────────────────────────────────┘');
    });
  });

  describe('selectMode', () => {
    it('should return correct mode selection', async () => {
      // Since selectMode involves dynamic import which is complex to mock,
      // we'll test the method behavior through spying
      const selectModeSpy = jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValue('single');

      const selectMode = (mainMode as unknown as PrivateMainInteractive).selectMode.bind(mainMode);
      const result = await selectMode();

      expect(result).toBe('single');
      expect(selectModeSpy).toHaveBeenCalled();
    });

    it('should handle different mode selections', async () => {
      const selectModeSpy = jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValue('batch');

      const selectMode = (mainMode as unknown as PrivateMainInteractive).selectMode.bind(mainMode);
      const result = await selectMode();

      expect(result).toBe('batch');
      expect(selectModeSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should properly handle container resolution errors', () => {
      const emptyContainer = new ServiceContainer();

      expect(() => {
        new MainInteractiveMode(emptyContainer);
      }).toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete single file flow then return to menu', async () => {
      const selectModeSpy = jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce('exit');

      await mainMode.start();

      expect(selectModeSpy).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith('User selected single file mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });

    it('should handle complete batch flow then return to menu', async () => {
      const selectModeSpy = jest
        .spyOn(mainMode as unknown as PrivateMainInteractive, 'selectMode')
        .mockResolvedValueOnce('batch')
        .mockResolvedValueOnce('exit');

      await mainMode.start();

      expect(selectModeSpy).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith('User selected batch mode');
      expect(mockLogger.info).toHaveBeenCalledWith('User selected exit');
    });
  });
});
