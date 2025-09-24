import {
  InfrastructureServices,
  EnhancedServices,
  SERVICE_NAMES,
} from '../../../src/infrastructure/services';

describe('InfrastructureServices', () => {
  describe('Service Registration', () => {
    it('should register all infrastructure services', () => {
      const container = InfrastructureServices.createContainer();
      // Verify all services are registered
      expect(container.isRegistered(SERVICE_NAMES.CONFIG)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.LOGGER)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.ERROR_HANDLER)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.FILE_SYSTEM)).toBe(true);
      expect(container.isRegistered(SERVICE_NAMES.TRANSLATOR)).toBe(true);
    });

    it('should resolve all services without errors', () => {
      const container = InfrastructureServices.createContainer();
      // Should resolve all services
      expect(() => container.resolve(SERVICE_NAMES.CONFIG)).not.toThrow();
      expect(() => container.resolve(SERVICE_NAMES.LOGGER)).not.toThrow();
      expect(() => container.resolve(SERVICE_NAMES.ERROR_HANDLER)).not.toThrow();
      expect(() => container.resolve(SERVICE_NAMES.FILE_SYSTEM)).not.toThrow();
      expect(() => container.resolve(SERVICE_NAMES.TRANSLATOR)).not.toThrow();
    });

    it('should create singleton services', () => {
      const container = InfrastructureServices.createContainer();
      const config1 = container.resolve(SERVICE_NAMES.CONFIG);
      const config2 = container.resolve(SERVICE_NAMES.CONFIG);
      expect(config1).toBe(config2);
      const logger1 = container.resolve(SERVICE_NAMES.LOGGER);
      const logger2 = container.resolve(SERVICE_NAMES.LOGGER);
      expect(logger1).toBe(logger2);
    });
  });

  describe('Service Names Constants', () => {
    it('should provide consistent service name constants', () => {
      expect(SERVICE_NAMES.CONFIG).toBe('config');
      expect(SERVICE_NAMES.LOGGER).toBe('logger');
      expect(SERVICE_NAMES.ERROR_HANDLER).toBe('errorHandler');
      expect(SERVICE_NAMES.FILE_SYSTEM).toBe('fileSystem');
      expect(SERVICE_NAMES.TRANSLATOR).toBe('translator');
    });
  });
});

describe('EnhancedServices', () => {
  describe('Enhanced Service Creation', () => {
    it('should create enhanced config manager', () => {
      const configManager = EnhancedServices.createConfigManager();
      expect(configManager).toBeDefined();
      expect(typeof configManager.get).toBe('function');
      expect(typeof configManager.set).toBe('function');
    });

    it('should create enhanced logger', () => {
      const logger = EnhancedServices.createLogger('info');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should create enhanced logger with context', () => {
      const logger = EnhancedServices.createLogger('debug', 'TEST');
      expect(logger).toBeDefined();
      // Mock console to test context functionality
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test message');
      // Should include context in log output
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TEST] test message'));
      consoleSpy.mockRestore();
    });

    it('should create enhanced error handler', () => {
      const errorHandler = EnhancedServices.createErrorHandler();
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.handleError).toBe('function');
      expect(typeof errorHandler.formatError).toBe('function');
    });

    it('should create enhanced file system manager', () => {
      const fileSystemManager = EnhancedServices.createFileSystemManager();
      expect(fileSystemManager).toBeDefined();
      expect(typeof fileSystemManager.readFile).toBe('function');
      expect(typeof fileSystemManager.writeFile).toBe('function');
    });

    it('should create enhanced translation manager', () => {
      const translationManager = EnhancedServices.createTranslationManager('en');
      expect(translationManager).toBeDefined();
      expect(typeof translationManager.t).toBe('function');
      expect(translationManager.getCurrentLocale()).toBe('en');
    });

    it('should create translation manager with default locale', () => {
      const translationManager = EnhancedServices.createTranslationManager();
      expect(translationManager).toBeDefined();
      expect(translationManager.getCurrentLocale()).toBe('en');
    });
  });

  describe('Error Handling', () => {
    it('should handle factory creation errors gracefully', () => {
      // These should not throw errors even if there are issues
      expect(() => EnhancedServices.createConfigManager()).not.toThrow();
      expect(() => EnhancedServices.createLogger('invalid' as never)).not.toThrow();
      expect(() => EnhancedServices.createErrorHandler()).not.toThrow();
      expect(() => EnhancedServices.createFileSystemManager()).not.toThrow();
      expect(() => EnhancedServices.createTranslationManager('invalid' as never)).not.toThrow();
    });
  });
});
