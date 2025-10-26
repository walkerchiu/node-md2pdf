/**
 * Tests for ApplicationServices container
 */

import { ApplicationServices } from '../../../src/application/container';

// Mock the EnvironmentAwareServices
jest.mock(
  '../../../src/infrastructure/logging/environment-aware.services',
  () => ({
    EnvironmentAwareServices: {
      createContainer: jest.fn().mockReturnValue({
        resolve: jest.fn(),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      }),
    },
  }),
);

// Mock all the application services
jest.mock('../../../src/application/services/pdf-generator.service', () => ({
  PDFGeneratorService: jest.fn(),
  IPDFGeneratorService: {},
}));

jest.mock('../../../src/application/services/markdown-parser.service', () => ({
  MarkdownParserService: jest.fn(),
  IMarkdownParserService: {},
}));

jest.mock('../../../src/application/services/toc-generator.service', () => ({
  TOCGeneratorService: jest.fn(),
  ITOCGeneratorService: {},
}));

jest.mock('../../../src/application/services/file-processor.service', () => ({
  FileProcessorService: jest.fn(),
  IFileProcessorService: {},
}));

jest.mock('../../../src/application/services/smart-defaults.service', () => ({
  SmartDefaultsService: jest.fn(),
  ISmartDefaultsService: {},
}));

jest.mock('../../../src/application/services/batch-processor.service', () => ({
  BatchProcessorService: jest.fn(),
  IBatchProcessorService: {},
}));

jest.mock('../../../src/core/batch/file-collector', () => ({
  FileCollector: jest.fn(),
}));

describe('ApplicationServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createContainer', () => {
    it('should create container with environment-aware infrastructure services', () => {
      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');

      const container = ApplicationServices.createContainer();

      expect(EnvironmentAwareServices.createContainer).toHaveBeenCalled();
      expect(container).toBeDefined();
    });

    it('should register all application services', () => {
      const mockContainer = {
        resolve: jest.fn(),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      ApplicationServices.createContainer();

      // Verify that application services are registered
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'pdfGenerator',
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'markdownParser',
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'tocGenerator',
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'fileProcessor',
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'batchProcessor',
        expect.any(Function),
      );
      expect(mockContainer.registerSingleton).toHaveBeenCalledWith(
        'smartDefaults',
        expect.any(Function),
      );
    });

    it('should properly wire service dependencies', () => {
      const mockContainer = {
        resolve: jest.fn(),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      // Mock the services that will be resolved
      mockContainer.resolve.mockImplementation((serviceName: string) => {
        switch (serviceName) {
          case 'logger':
            return { info: jest.fn(), error: jest.fn() };
          case 'errorHandler':
            return { handleError: jest.fn() };
          case 'config':
            return { get: jest.fn() };
          case 'fileSystem':
            return { exists: jest.fn() };
          case 'translator':
            return { t: jest.fn() };
          default:
            return {};
        }
      });

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      ApplicationServices.createContainer();

      // Get the factory functions that were registered
      const registeredFactories = mockContainer.registerSingleton.mock.calls;

      // Test that each service factory can be executed (basic smoke test)
      registeredFactories.forEach((call: any[]) => {
        const [serviceName, factory] = call;
        expect(typeof factory).toBe('function');

        // Execute factory to ensure it doesn't throw
        try {
          factory(mockContainer);
        } catch (error) {
          throw new Error(
            `Service factory for ${serviceName} failed: ${error}`,
          );
        }
      });
    });

    it('should handle service resolution errors gracefully', () => {
      const mockContainer = {
        resolve: jest.fn(() => {
          throw new Error('Service resolution failed');
        }),
        tryResolve: jest.fn().mockReturnValue(null),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      // Should not throw when creating container
      expect(() => ApplicationServices.createContainer()).not.toThrow();
    });
  });

  describe('service registration', () => {
    it('should register PDF generator service with correct dependencies', () => {
      const mockContainer = {
        resolve: jest.fn().mockImplementation((name: string) => {
          if (name === 'logger') return { info: jest.fn() };
          if (name === 'errorHandler') return { handleError: jest.fn() };
          if (name === 'config') return { get: jest.fn() };
          return {};
        }),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      const {
        PDFGeneratorService,
      } = require('../../../src/application/services/pdf-generator.service');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      ApplicationServices.createContainer();

      const pdfGeneratorCall = mockContainer.registerSingleton.mock.calls.find(
        (call: any[]) => call[0] === 'pdfGenerator',
      );
      expect(pdfGeneratorCall).toBeDefined();

      // Execute the factory function
      const factory = pdfGeneratorCall![1];
      factory(mockContainer);

      expect(PDFGeneratorService).toHaveBeenCalledWith(
        expect.any(Object), // logger
        expect.any(Object), // errorHandler
        expect.any(Object), // config
        expect.any(Object), // translationManager
        expect.any(Object), // pageStructureService
      );
    });

    it('should register markdown parser service with correct dependencies', () => {
      const mockContainer = {
        resolve: jest.fn().mockImplementation((name: string) => {
          if (name === 'logger') return { info: jest.fn() };
          if (name === 'errorHandler') return { handleError: jest.fn() };
          if (name === 'config') return { get: jest.fn() };
          if (name === 'fileSystem') return { exists: jest.fn() };
          return {};
        }),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      const {
        MarkdownParserService,
      } = require('../../../src/application/services/markdown-parser.service');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      ApplicationServices.createContainer();

      const markdownParserCall =
        mockContainer.registerSingleton.mock.calls.find(
          (call: any[]) => call[0] === 'markdownParser',
        );
      expect(markdownParserCall).toBeDefined();

      // Execute the factory function
      const factory = markdownParserCall![1];
      factory(mockContainer);

      expect(MarkdownParserService).toHaveBeenCalledWith(
        expect.any(Object), // logger
        expect.any(Object), // errorHandler
        expect.any(Object), // config
        expect.any(Object), // fileSystem
      );
    });

    it('should register file processor service with all required dependencies', () => {
      const mockContainer = {
        resolve: jest.fn().mockImplementation((name: string) => {
          if (name === 'logger') return { info: jest.fn() };
          if (name === 'errorHandler') return { handleError: jest.fn() };
          if (name === 'config') return { get: jest.fn() };
          if (name === 'fileSystem') return { exists: jest.fn() };
          if (name === 'markdownParser') return { parseMarkdown: jest.fn() };
          if (name === 'tocGenerator') return { generateTOC: jest.fn() };
          if (name === 'pdfGenerator') return { generatePDF: jest.fn() };
          return {};
        }),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      const {
        FileProcessorService,
      } = require('../../../src/application/services/file-processor.service');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      ApplicationServices.createContainer();

      const fileProcessorCall = mockContainer.registerSingleton.mock.calls.find(
        (call: any[]) => call[0] === 'fileProcessor',
      );
      expect(fileProcessorCall).toBeDefined();

      // Execute the factory function
      const factory = fileProcessorCall![1];
      factory(mockContainer);

      expect(FileProcessorService).toHaveBeenCalledWith(
        expect.any(Object), // logger
        expect.any(Object), // errorHandler
        expect.any(Object), // config
        expect.any(Object), // fileSystem
        expect.any(Object), // markdownParser
        expect.any(Object), // pdfGenerator
      );
    });
  });

  describe('container integration', () => {
    it('should create container that can be used to resolve services', () => {
      const container = ApplicationServices.createContainer();

      expect(container).toBeDefined();
      expect(typeof container.resolve).toBe('function');
      expect(typeof container.tryResolve).toBe('function');
      expect(typeof container.registerSingleton).toBe('function');
      expect(typeof container.register).toBe('function');
    });

    it('should inherit infrastructure services from EnvironmentAwareServices', () => {
      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');

      ApplicationServices.createContainer();

      expect(EnvironmentAwareServices.createContainer).toHaveBeenCalled();
    });
  });

  describe('createSmartDefaultsService', () => {
    it('should create smart defaults service with default log level', () => {
      const mockContainer = {
        resolve: jest.fn(),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const mockLogger = {
        setLevel: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      };

      const mockSmartDefaultsService = {
        analyze: jest.fn(),
        getRecommendations: jest.fn(),
      };

      mockContainer.resolve.mockImplementation((serviceName: string) => {
        if (serviceName === 'logger') {
          return mockLogger;
        }
        if (serviceName === 'smartDefaults') {
          return mockSmartDefaultsService;
        }
        return {};
      });

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      const service = ApplicationServices.createSmartDefaultsService();

      expect(EnvironmentAwareServices.createContainer).toHaveBeenCalled();
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
      expect(mockContainer.resolve).toHaveBeenCalledWith('smartDefaults');
      expect(service).toBe(mockSmartDefaultsService);
    });

    it('should create smart defaults service with custom log level', () => {
      const mockContainer = {
        resolve: jest.fn(),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const mockLogger = {
        setLevel: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      };

      const mockSmartDefaultsService = {
        analyze: jest.fn(),
        getRecommendations: jest.fn(),
      };

      mockContainer.resolve.mockImplementation((serviceName: string) => {
        if (serviceName === 'logger') {
          return mockLogger;
        }
        if (serviceName === 'smartDefaults') {
          return mockSmartDefaultsService;
        }
        return {};
      });

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      const service = ApplicationServices.createSmartDefaultsService('debug');

      expect(EnvironmentAwareServices.createContainer).toHaveBeenCalled();
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockLogger.setLevel).toHaveBeenCalledWith('debug');
      expect(mockContainer.resolve).toHaveBeenCalledWith('smartDefaults');
      expect(service).toBe(mockSmartDefaultsService);
    });

    it('should create smart defaults service with error log level', () => {
      const mockContainer = {
        resolve: jest.fn(),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const mockLogger = {
        setLevel: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      };

      const mockSmartDefaultsService = {
        analyze: jest.fn(),
        getRecommendations: jest.fn(),
      };

      mockContainer.resolve.mockImplementation((serviceName: string) => {
        if (serviceName === 'logger') {
          return mockLogger;
        }
        if (serviceName === 'smartDefaults') {
          return mockSmartDefaultsService;
        }
        return {};
      });

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      const service = ApplicationServices.createSmartDefaultsService('error');

      expect(EnvironmentAwareServices.createContainer).toHaveBeenCalled();
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockLogger.setLevel).toHaveBeenCalledWith('error');
      expect(mockContainer.resolve).toHaveBeenCalledWith('smartDefaults');
      expect(service).toBe(mockSmartDefaultsService);
    });

    it('should create smart defaults service with warn log level', () => {
      const mockContainer = {
        resolve: jest.fn(),
        tryResolve: jest.fn(),
        registerSingleton: jest.fn(),
        register: jest.fn(),
      };

      const mockLogger = {
        setLevel: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      };

      const mockSmartDefaultsService = {
        analyze: jest.fn(),
        getRecommendations: jest.fn(),
      };

      mockContainer.resolve.mockImplementation((serviceName: string) => {
        if (serviceName === 'logger') {
          return mockLogger;
        }
        if (serviceName === 'smartDefaults') {
          return mockSmartDefaultsService;
        }
        return {};
      });

      const {
        EnvironmentAwareServices,
      } = require('../../../src/infrastructure/logging/environment-aware.services');
      (EnvironmentAwareServices.createContainer as jest.Mock).mockReturnValue(
        mockContainer,
      );

      const service = ApplicationServices.createSmartDefaultsService('warn');

      expect(EnvironmentAwareServices.createContainer).toHaveBeenCalled();
      expect(mockContainer.resolve).toHaveBeenCalledWith('logger');
      expect(mockLogger.setLevel).toHaveBeenCalledWith('warn');
      expect(mockContainer.resolve).toHaveBeenCalledWith('smartDefaults');
      expect(service).toBe(mockSmartDefaultsService);
    });
  });
});
