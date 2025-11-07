/**
 * CLI Unit Tests
 *
 * Tests the core functionality of the CLI module
 */

import { jest } from '@jest/globals';

// Mock all external dependencies
jest.mock('inquirer');
jest.mock('ora');
jest.mock('chalk', () => ({
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  magenta: jest.fn((text) => text),
  white: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  bold: jest.fn((text) => text),
  dim: jest.fn((text) => text),
  italic: jest.fn((text) => text),
  underline: jest.fn((text) => text),
  inverse: jest.fn((text) => text),
  strikethrough: jest.fn((text) => text),
}));

jest.mock('commander', () => {
  let globalActionCallback: Function | null = null;
  let globalInteractiveCallback: Function | null = null;

  const mockCommand: any = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    argument: jest.fn().mockReturnThis(),
    command: jest.fn().mockImplementation((commandName: any) => {
      if (commandName === 'interactive') {
        return {
          description: jest.fn().mockReturnThis(),
          action: jest.fn().mockImplementation((callback: any) => {
            globalInteractiveCallback = callback;
            return mockCommand;
          }),
        };
      }
      return mockCommand;
    }),
    action: jest.fn().mockImplementation((callback: any) => {
      globalActionCallback = callback;
      return mockCommand;
    }),
    parseAsync: jest.fn().mockImplementation(() => {
      // Don't execute callbacks during parseAsync for now
      return Promise.resolve();
    }),
    // Expose callbacks for testing
    _getActionCallback: (): Function | null => globalActionCallback,
    _getInteractiveCallback: (): Function | null => globalInteractiveCallback,
  };
  return {
    Command: jest.fn(() => mockCommand),
  };
});

jest.mock('../../src/application/container', () => ({
  ApplicationServices: {
    createContainer: jest.fn(),
  },
}));

jest.mock('../../src/cli/main-interactive', () => ({
  MainInteractiveMode: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

jest.mock('../../src/cli/ui/startup-ui', () => ({
  StartupUI: jest.fn().mockImplementation(() => ({
    showBanner: jest.fn(),
    showWarning: jest.fn(),
    showEnvironmentCheck: jest.fn(),
    showStarting: jest.fn(),
    showError: jest.fn(),
    isVerbose: jest.fn().mockReturnValue(false),
  })),
}));

jest.mock('../../src/infrastructure/config/environment', () => ({
  EnvironmentConfig: {
    isVerboseEnabled: jest.fn().mockReturnValue(false),
  },
}));

jest.mock('../../src/utils/validation', () => ({
  validateEnvironment: jest.fn(() =>
    Promise.resolve({
      nodeVersion: 'v18.0.0',
      memoryMB: 1024,
      puppeteerReady: true,
      warnings: [],
    }),
  ),
}));

// Mock package.json
jest.mock('../../package.json', () => ({
  version: '1.0.0',
}));

describe('CLI Main Program Tests', () => {
  let moduleExports: any;
  let mockContainer: any;
  let mockLogger: any;
  let mockTranslator: any;
  let mockFileProcessor: any;
  let mockStartupUI: any;
  let mockMainInteractive: any;
  let originalArgv: string[];
  let originalExit: any;
  let originalStderr: any;
  let mockProcessExit: jest.Mock;
  let mockStderrWrite: jest.Mock;

  beforeAll(async () => {
    // Save original process properties
    originalArgv = process.argv;
    originalExit = process.exit;
    originalStderr = process.stderr.write;

    // Mock process methods
    mockProcessExit = jest.fn();
    mockStderrWrite = jest.fn();
    process.exit = mockProcessExit as any;
    process.stderr.write = mockStderrWrite as any;

    try {
      moduleExports = await import('../../src/cli');
    } catch (error) {
      console.warn('Unable to import module:', error);
      moduleExports = {};
    }
  });

  afterAll(() => {
    // Restore original process properties
    process.argv = originalArgv;
    process.exit = originalExit;
    process.stderr.write = originalStderr;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock services
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    mockTranslator = {
      t: jest.fn((key: string) => `translated_${key}`),
    };

    mockFileProcessor = {
      processFile: jest.fn(() =>
        Promise.resolve({
          success: true,
          outputPath: '/test/output.pdf',
        }),
      ),
    };

    mockContainer = {
      resolve: jest.fn((service: string) => {
        switch (service) {
          case 'logger':
            return mockLogger;
          case 'translator':
            return mockTranslator;
          case 'fileProcessor':
            return mockFileProcessor;
          default:
            return {};
        }
      }),
    };

    // Mock implementations
    const { ApplicationServices } = require('../../src/application/container');
    const { MainInteractiveMode } = require('../../src/cli/main-interactive');
    const { StartupUI } = require('../../src/cli/ui/startup-ui');

    ApplicationServices.createContainer.mockReturnValue(mockContainer);

    mockMainInteractive = {
      start: jest.fn(),
    };
    MainInteractiveMode.mockImplementation(() => mockMainInteractive);

    mockStartupUI = {
      showBanner: jest.fn(),
      showWarning: jest.fn(),
      showEnvironmentCheck: jest.fn(),
      showStarting: jest.fn(),
      showError: jest.fn(),
      isVerbose: jest.fn().mockReturnValue(false),
    };
    StartupUI.mockImplementation(() => mockStartupUI);

    // Reset process argv
    process.argv = ['node', 'cli.js'];
  });

  describe('Module Structure Validation', () => {
    it('should successfully load the module', () => {
      expect(moduleExports).toBeDefined();
      expect(typeof moduleExports).toBe('object');
    });

    it('should export main function', () => {
      expect(moduleExports.main).toBeDefined();
      expect(typeof moduleExports.main).toBe('function');
    });
  });

  describe('Application Initialization Flow', () => {
    it('should correctly initialize application services container', async () => {
      const {
        ApplicationServices,
      } = require('../../src/application/container');

      // Mock process.argv to avoid command parsing
      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(ApplicationServices.createContainer).toHaveBeenCalled();
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockContainer.resolve).toHaveBeenCalledWith('translator');
    });

    it('should show welcome banner', async () => {
      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockStartupUI.showBanner).toHaveBeenCalledWith('1.0.0');
    });

    it('should execute environment check', async () => {
      const { validateEnvironment } = require('../../src/utils/validation');
      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(validateEnvironment).toHaveBeenCalledWith(mockTranslator);
      expect(mockStartupUI.showEnvironmentCheck).toHaveBeenCalledWith(
        'v18.0.0',
        1024,
        true,
      );
    });

    it('should show warnings in verbose mode', async () => {
      const { validateEnvironment } = require('../../src/utils/validation');
      mockStartupUI.isVerbose.mockReturnValue(true);
      validateEnvironment.mockResolvedValue({
        nodeVersion: 'v18.0.0',
        memoryMB: 1024,
        puppeteerReady: true,
        warnings: ['test warning'],
      });

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockStartupUI.showWarning).toHaveBeenCalledWith('test warning');
    });

    it('should log startup info in verbose mode', async () => {
      mockStartupUI.isVerbose.mockReturnValue(true);
      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'translated_startup.applicationStarted',
      );
    });

    it('should show startup info in non-verbose mode', async () => {
      mockStartupUI.isVerbose.mockReturnValue(false);
      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockStartupUI.showStarting).toHaveBeenCalled();
    });
  });

  describe('Command Line Argument Parsing', () => {
    it('should configure basic CLI commands', async () => {
      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockProgram.name).toHaveBeenCalledWith('MD2PDF');
      expect(mockProgram.description).toHaveBeenCalledWith(
        'Convert Markdown documents to PDF files with professional table of contents',
      );
      expect(mockProgram.version).toHaveBeenCalledWith('1.0.0');
    });

    it('should setup direct file conversion arguments', async () => {
      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockProgram.argument).toHaveBeenCalledWith(
        '[input]',
        'Input markdown file path',
      );
      expect(mockProgram.argument).toHaveBeenCalledWith(
        '[output]',
        'Output PDF file path (optional)',
      );
    });

    it('should setup interactive mode command', async () => {
      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockProgram.command).toHaveBeenCalledWith('interactive');
    });
  });

  describe('Direct Conversion Mode', () => {
    it('should handle direct conversion with input file', async () => {
      // Mock the action callback being called with input file
      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];
      await moduleExports.main();

      // Get the action callback from our mock
      const actionCallback = mockProgram._getActionCallback();

      // Simulate direct conversion call
      if (actionCallback) {
        await actionCallback('input.md', 'output.pdf');

        expect(mockFileProcessor.processFile).toHaveBeenCalledWith('input.md', {
          outputPath: 'output.pdf',
          includeTOC: true,
          includePageNumbers: true,
          tocReturnLinksLevel: 3,
        });
        expect(mockProcessExit).toHaveBeenCalledWith(0);
      }
    });

    it('should generate default output path for input file', async () => {
      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];
      await moduleExports.main();

      // Get the action callback from our mock
      const actionCallback = mockProgram._getActionCallback();

      // Simulate direct conversion call without output
      if (actionCallback) {
        await actionCallback('input.md');

        expect(mockFileProcessor.processFile).toHaveBeenCalledWith('input.md', {
          outputPath: 'input.pdf',
          includeTOC: true,
          includePageNumbers: true,
          tocReturnLinksLevel: 3,
        });
      }
    });

    it('should handle conversion failure', async () => {
      mockFileProcessor.processFile.mockResolvedValue({
        success: false,
        error: 'Conversion failed',
      });

      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];
      await moduleExports.main();

      const actionCallback = mockProgram._getActionCallback();

      if (actionCallback) {
        await actionCallback('input.md');

        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    });

    it('should handle conversion process exceptions', async () => {
      mockFileProcessor.processFile.mockRejectedValue(
        new Error('Processing error'),
      );

      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];
      await moduleExports.main();

      const actionCallback = mockProgram._getActionCallback();

      if (actionCallback) {
        await actionCallback('input.md');

        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    });

    it('should start interactive mode when no input file provided', async () => {
      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];
      await moduleExports.main();

      const actionCallback = mockProgram._getActionCallback();

      if (actionCallback) {
        await actionCallback(); // No input file provided

        expect(mockMainInteractive.start).toHaveBeenCalled();
        expect(mockProcessExit).toHaveBeenCalledWith(0);
      }
    });
  });

  describe('Interactive Mode', () => {
    it('should correctly start interactive mode command', async () => {
      const { Command } = require('commander');
      const mockProgram = new Command();

      process.argv = ['node', 'cli.js'];
      await moduleExports.main();

      // Get the interactive callback from our mock
      const interactiveCallback = mockProgram._getInteractiveCallback();

      // Execute the interactive command
      if (interactiveCallback) {
        await interactiveCallback();

        expect(mockMainInteractive.start).toHaveBeenCalled();
        expect(mockProcessExit).toHaveBeenCalledWith(0);
      }
    });
  });

  describe('Error Handling and Exception Management', () => {
    it('should handle container creation failure', async () => {
      const {
        ApplicationServices,
      } = require('../../src/application/container');
      ApplicationServices.createContainer.mockImplementation(() => {
        throw new Error('Container creation failed');
      });

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle environment validation failure', async () => {
      const { validateEnvironment } = require('../../src/utils/validation');
      validateEnvironment.mockRejectedValue(
        new Error('Environment validation failed'),
      );

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockStartupUI.showError).toHaveBeenCalledWith(
        'Environment check failed',
        expect.any(Error),
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should use StartupUI to show error when translator is available', async () => {
      const {
        ApplicationServices,
      } = require('../../src/application/container');

      // Mock container creation failure after translator is resolved
      ApplicationServices.createContainer.mockImplementationOnce(() => {
        // Return mock container that throws on second resolve call
        return {
          resolve: jest.fn((service: string) => {
            if (service === 'logger') return mockLogger;
            if (service === 'translator') return mockTranslator;
            throw new Error('Test error');
          }),
        };
      });

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockStartupUI.showError).toHaveBeenCalledWith(
        'Startup failed',
        expect.any(Error),
      );
    });

    it('should output error directly to stderr when no translator available', async () => {
      const {
        ApplicationServices,
      } = require('../../src/application/container');
      mockContainer.resolve.mockImplementation((service: string) => {
        if (service === 'logger') return mockLogger;
        if (service === 'translator')
          throw new Error('Translator not available');
        return {};
      });

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockStderrWrite).toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should log detailed error in verbose mode', async () => {
      const {
        EnvironmentConfig,
      } = require('../../src/infrastructure/config/environment');
      const {
        ApplicationServices,
      } = require('../../src/application/container');

      EnvironmentConfig.isVerboseEnabled.mockReturnValue(true);

      // Mock container creation to return logger and translator, then fail
      ApplicationServices.createContainer.mockImplementationOnce(() => ({
        resolve: jest.fn((service: string) => {
          if (service === 'logger') return mockLogger;
          if (service === 'translator') return mockTranslator;
          throw new Error('Test error');
        }),
      }));

      process.argv = ['node', 'cli.js'];

      await moduleExports.main();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application startup failed',
        expect.any(Error),
      );
    });
  });

  describe('Global Exception Handling', () => {
    it('should handle unhandled Promise rejections', () => {
      const unhandledRejectionHandler = process.listeners(
        'unhandledRejection',
      )[0] as Function;

      if (unhandledRejectionHandler) {
        unhandledRejectionHandler('Test rejection', Promise.resolve());

        expect(mockStderrWrite).toHaveBeenCalledWith(
          expect.stringContaining(
            'Unhandled Promise rejection: Test rejection',
          ),
        );
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    });

    it('should handle uncaught exceptions', () => {
      const uncaughtExceptionHandler = process.listeners(
        'uncaughtException',
      )[0] as Function;

      if (uncaughtExceptionHandler) {
        const testError = new Error('Test uncaught exception');
        uncaughtExceptionHandler(testError);

        expect(mockStderrWrite).toHaveBeenCalledWith(
          expect.stringContaining('Uncaught exception:'),
        );
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    });
  });
});
