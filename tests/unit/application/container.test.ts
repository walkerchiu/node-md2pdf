/**
 * Application Container Tests
 * Tests service registration, factory methods, and dependency injection
 */

import {
  ApplicationServices,
  APPLICATION_SERVICE_NAMES,
} from '../../../src/application/container';
import { ServiceContainer } from '../../../src/shared/container';
import type { ILogger } from '../../../src/infrastructure/logging/types';
import type { IConfigManager } from '../../../src/infrastructure/config/types';
import { defaultConfig } from '../../../src/infrastructure/config/defaults';

// Mock all external dependencies
jest.mock('../../../src/infrastructure/logging/environment-aware.services');
jest.mock('../../../src/core/batch/file-collector');

describe('ApplicationServices', () => {
  let mockContainer: jest.Mocked<ServiceContainer>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockConfig: jest.Mocked<IConfigManager>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    // Mock config manager
    mockConfig = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      save: jest.fn(),
      onConfigCreated: jest.fn(),
      onConfigChanged: jest.fn(),
      setAndSave: jest.fn(),
      getConfigPath: jest.fn(),
      getConfig: jest.fn(() => ({ ...defaultConfig })),
      updateConfig: jest.fn(),
    };

    // Mock service container
    mockContainer = {
      registerSingleton: jest.fn(),
      registerTransient: jest.fn(),
      register: jest.fn(),
      registerInstance: jest.fn(),
      resolve: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'logger':
            return mockLogger;
          case 'config':
            return mockConfig;
          case 'errorHandler':
            return { handleError: jest.fn() };
          case 'translator':
            return { t: jest.fn() };
          case 'fileSystem':
            return { readFile: jest.fn() };
          default:
            return {};
        }
      }),
      tryResolve: jest.fn(),
      isRegistered: jest.fn(),
      unregister: jest.fn(),
      getRegisteredServices: jest.fn(),
      getServiceInfo: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<ServiceContainer>;
  });

  describe('APPLICATION_SERVICE_NAMES', () => {
    it('should export all required service names', () => {
      expect(APPLICATION_SERVICE_NAMES.PDF_GENERATOR).toBe('pdfGenerator');
      expect(APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER).toBe('markdownParser');
      expect(APPLICATION_SERVICE_NAMES.TOC_GENERATOR).toBe('tocGenerator');
      expect(APPLICATION_SERVICE_NAMES.FILE_PROCESSOR).toBe('fileProcessor');
      expect(APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR).toBe('batchProcessor');
      expect(APPLICATION_SERVICE_NAMES.SMART_DEFAULTS).toBe('smartDefaults');
      expect(APPLICATION_SERVICE_NAMES.PAGE_STRUCTURE).toBe('pageStructure');
    });
  });

  describe('createContainer', () => {
    it('should create container with infrastructure and application services', () => {
      // Mock the EnvironmentAwareServices.createContainer
      const mockEnvContainer = { ...mockContainer };

      // Mock the dynamic import
      const originalImport = require('../../../src/infrastructure/logging/environment-aware.services');
      originalImport.EnvironmentAwareServices = {
        createContainer: jest.fn(() => mockEnvContainer),
      };

      jest
        .spyOn(ApplicationServices, 'registerServices')
        .mockImplementation(() => {});

      const result = ApplicationServices.createContainer();

      expect(result).toBeDefined();
      expect(ApplicationServices.registerServices).toHaveBeenCalledWith(
        mockEnvContainer,
      );
    });
  });

  describe('registerServices', () => {
    it('should register all application services', () => {
      ApplicationServices.registerServices(mockContainer);

      // Verify all services are registered
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        APPLICATION_SERVICE_NAMES.PAGE_STRUCTURE,
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        APPLICATION_SERVICE_NAMES.PDF_GENERATOR,
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER,
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        APPLICATION_SERVICE_NAMES.TOC_GENERATOR,
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        APPLICATION_SERVICE_NAMES.FILE_PROCESSOR,
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR,
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        APPLICATION_SERVICE_NAMES.SMART_DEFAULTS,
        expect.any(Function),
      );

      // Should have been called 7 times (one for each service)
      expect(mockContainer.registerSingleton).toHaveBeenCalledTimes(7);
    });

    it('should register services with correct dependencies', () => {
      ApplicationServices.registerServices(mockContainer);

      // Get the factory functions and test them
      const calls = mockContainer.registerSingleton.mock.calls;

      // Test PDF Generator factory
      const pdfGeneratorCall = calls.find(
        (call) => call[0] === APPLICATION_SERVICE_NAMES.PDF_GENERATOR,
      );
      expect(pdfGeneratorCall).toBeDefined();

      if (pdfGeneratorCall) {
        const factory = pdfGeneratorCall[1];
        expect(() => factory(mockContainer)).not.toThrow();
      }
    });
  });

  describe('factory methods', () => {
    beforeEach(() => {
      // Mock createContainer for factory method tests
      jest
        .spyOn(ApplicationServices, 'createContainer')
        .mockReturnValue(mockContainer);
      // Reset the resolve mock to use the original implementation
      mockContainer.resolve.mockImplementation((key: string) => {
        switch (key) {
          case 'logger':
            return mockLogger;
          case 'config':
            return mockConfig;
          case 'errorHandler':
            return { handleError: jest.fn() };
          case 'translator':
            return { t: jest.fn() };
          case 'fileSystem':
            return { readFile: jest.fn() };
          default:
            return {};
        }
      });
    });

    describe('createPDFGeneratorService', () => {
      it('should create PDF generator with default log level', () => {
        const mockService = {};
        // Override the default mock for this specific service
        mockContainer.resolve.mockImplementation((key: string) => {
          switch (key) {
            case 'logger':
              return mockLogger;
            case APPLICATION_SERVICE_NAMES.PDF_GENERATOR:
              return mockService;
            case 'config':
              return mockConfig;
            case 'errorHandler':
              return { handleError: jest.fn() };
            case 'translator':
              return { t: jest.fn() };
            case 'fileSystem':
              return { readFile: jest.fn() };
            default:
              return {};
          }
        });

        const result = ApplicationServices.createPDFGeneratorService();

        expect(ApplicationServices.createContainer).toHaveBeenCalled();
        expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
        expect(mockContainer.resolve).toHaveBeenCalledWith(
          APPLICATION_SERVICE_NAMES.PDF_GENERATOR,
        );
        expect(result).toBe(mockService);
      });

      it('should create PDF generator with custom log level', () => {
        const mockService = {};
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === APPLICATION_SERVICE_NAMES.PDF_GENERATOR
            ? mockService
            : key === 'logger'
              ? mockLogger
              : {};
        });

        const result = ApplicationServices.createPDFGeneratorService('debug');

        expect(mockLogger.setLevel).toHaveBeenCalledWith('debug');
        expect(result).toBe(mockService);
      });
    });

    describe('createMarkdownParserService', () => {
      it('should create markdown parser with default log level', () => {
        const mockService = {};
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER
            ? mockService
            : key === 'logger'
              ? mockLogger
              : {};
        });

        const result = ApplicationServices.createMarkdownParserService();

        expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
        expect(mockContainer.resolve).toHaveBeenCalledWith(
          APPLICATION_SERVICE_NAMES.MARKDOWN_PARSER,
        );
        expect(result).toBe(mockService);
      });

      it('should create markdown parser with custom log level', () => {
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === 'logger' ? mockLogger : {};
        });
        ApplicationServices.createMarkdownParserService('warn');
        expect(mockLogger.setLevel).toHaveBeenCalledWith('warn');
      });
    });

    describe('createTOCGeneratorService', () => {
      it('should create TOC generator with default log level', () => {
        const mockService = {};
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === APPLICATION_SERVICE_NAMES.TOC_GENERATOR
            ? mockService
            : key === 'logger'
              ? mockLogger
              : {};
        });

        const result = ApplicationServices.createTOCGeneratorService();

        expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
        expect(mockContainer.resolve).toHaveBeenCalledWith(
          APPLICATION_SERVICE_NAMES.TOC_GENERATOR,
        );
        expect(result).toBe(mockService);
      });

      it('should create TOC generator with custom log level', () => {
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === 'logger' ? mockLogger : {};
        });
        ApplicationServices.createTOCGeneratorService('error');
        expect(mockLogger.setLevel).toHaveBeenCalledWith('error');
      });
    });

    describe('createFileProcessorService', () => {
      it('should create file processor with default log level', () => {
        const mockService = {};
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === APPLICATION_SERVICE_NAMES.FILE_PROCESSOR
            ? mockService
            : key === 'logger'
              ? mockLogger
              : {};
        });

        const result = ApplicationServices.createFileProcessorService();

        expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
        expect(mockContainer.resolve).toHaveBeenCalledWith(
          APPLICATION_SERVICE_NAMES.FILE_PROCESSOR,
        );
        expect(result).toBe(mockService);
      });
    });

    describe('createBatchProcessorService', () => {
      it('should create batch processor with default log level', () => {
        const mockService = {};
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR
            ? mockService
            : key === 'logger'
              ? mockLogger
              : {};
        });

        const result = ApplicationServices.createBatchProcessorService();

        expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
        expect(mockContainer.resolve).toHaveBeenCalledWith(
          APPLICATION_SERVICE_NAMES.BATCH_PROCESSOR,
        );
        expect(result).toBe(mockService);
      });
    });

    describe('createSmartDefaultsService', () => {
      it('should create smart defaults with default log level', () => {
        const mockService = {};
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === APPLICATION_SERVICE_NAMES.SMART_DEFAULTS
            ? mockService
            : key === 'logger'
              ? mockLogger
              : {};
        });

        const result = ApplicationServices.createSmartDefaultsService();

        expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
        expect(mockContainer.resolve).toHaveBeenCalledWith(
          APPLICATION_SERVICE_NAMES.SMART_DEFAULTS,
        );
        expect(result).toBe(mockService);
      });
    });

    describe('createPageStructureService', () => {
      it('should create page structure service with default log level', () => {
        const mockService = {};
        mockContainer.resolve.mockImplementation((key: string) => {
          return key === APPLICATION_SERVICE_NAMES.PAGE_STRUCTURE
            ? mockService
            : key === 'logger'
              ? mockLogger
              : {};
        });

        const result = ApplicationServices.createPageStructureService();

        expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
        expect(mockContainer.resolve).toHaveBeenCalledWith(
          APPLICATION_SERVICE_NAMES.PAGE_STRUCTURE,
        );
        expect(result).toBe(mockService);
      });
    });
  });

  describe('createConfiguredContainer', () => {
    beforeEach(() => {
      jest
        .spyOn(ApplicationServices, 'createContainer')
        .mockReturnValue(mockContainer);
    });

    it('should create container without custom config', () => {
      const result = ApplicationServices.createConfiguredContainer();

      expect(ApplicationServices.createContainer).toHaveBeenCalled();
      expect(mockConfig.set).not.toHaveBeenCalled();
      expect(result).toBe(mockContainer);
    });

    it('should create container with custom config', () => {
      const customConfig = {
        'pdf.format': 'A4',
        'pdf.orientation': 'portrait',
        'logging.level': 'debug',
      };

      const result =
        ApplicationServices.createConfiguredContainer(customConfig);

      expect(ApplicationServices.createContainer).toHaveBeenCalled();
      expect(mockContainer.resolve).toHaveBeenCalledWith('config');
      expect(mockConfig.set).toHaveBeenCalledTimes(3);
      expect(mockConfig.set).toHaveBeenCalledWith('pdf.format', 'A4');
      expect(mockConfig.set).toHaveBeenCalledWith(
        'pdf.orientation',
        'portrait',
      );
      expect(mockConfig.set).toHaveBeenCalledWith('logging.level', 'debug');
      expect(result).toBe(mockContainer);
    });

    it('should handle empty config object', () => {
      const result = ApplicationServices.createConfiguredContainer({});

      expect(mockConfig.set).not.toHaveBeenCalled();
      expect(result).toBe(mockContainer);
    });
  });

  describe('error handling', () => {
    it('should handle missing dependencies gracefully', () => {
      mockContainer.resolve.mockImplementation(() => {
        throw new Error('Service not found');
      });

      expect(() => {
        ApplicationServices.registerServices(mockContainer);
      }).not.toThrow();
    });
  });
});
