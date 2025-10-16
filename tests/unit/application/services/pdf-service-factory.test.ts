/**
 * Tests for PDFServiceFactory
 */

import { PDFServiceFactory } from '../../../../src/application/services/pdf-service-factory';
import { BasicPDFGeneratorService } from '../../../../src/application/services/basic-pdf-generator.service';
import { AdvancedPDFGeneratorService } from '../../../../src/application/services/advanced-pdf-generator.service';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../../src/infrastructure/error/types';
import type { IConfigManager } from '../../../../src/infrastructure/config/types';

// Mock the service classes
jest.mock('../../../../src/application/services/basic-pdf-generator.service');
jest.mock(
  '../../../../src/application/services/advanced-pdf-generator.service',
);

describe('PDFServiceFactory', () => {
  let factory: PDFServiceFactory;
  let mockLogger: ILogger;
  let mockErrorHandler: IErrorHandler;
  let mockConfigManager: IConfigManager;
  let mockBasicPDFGeneratorService: jest.Mocked<BasicPDFGeneratorService>;
  let mockAdvancedPDFGeneratorService: jest.Mocked<AdvancedPDFGeneratorService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockLogger = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(),
    };

    mockErrorHandler = {
      handleError: jest.fn(),
      handleWarning: jest.fn(),
    } as any;

    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
    } as any;

    // Mock service instances
    mockBasicPDFGeneratorService = new BasicPDFGeneratorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
    ) as jest.Mocked<BasicPDFGeneratorService>;

    mockAdvancedPDFGeneratorService = new AdvancedPDFGeneratorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
    ) as jest.Mocked<AdvancedPDFGeneratorService>;

    mockAdvancedPDFGeneratorService.initialize = jest.fn();

    // Mock constructors
    (
      BasicPDFGeneratorService as jest.MockedClass<
        typeof BasicPDFGeneratorService
      >
    ).mockImplementation(() => mockBasicPDFGeneratorService);

    (
      AdvancedPDFGeneratorService as jest.MockedClass<
        typeof AdvancedPDFGeneratorService
      >
    ).mockImplementation(() => mockAdvancedPDFGeneratorService);

    factory = new PDFServiceFactory(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
    );
  });

  describe('constructor', () => {
    it('should create factory instance with dependencies', () => {
      expect(factory).toBeInstanceOf(PDFServiceFactory);
    });
  });

  describe('createPDFGenerator', () => {
    it('should create legacy service when enhanced engine is disabled', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      const result = await factory.createPDFGenerator();

      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'pdf.useEnhancedEngine',
        false,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Basic PDF Generator Service',
      );
      expect(result).toBe(mockBasicPDFGeneratorService);
      expect(BasicPDFGeneratorService).toHaveBeenCalledWith(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );
    });

    it('should create enhanced service when enhanced engine is enabled', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(true);
      mockAdvancedPDFGeneratorService.initialize.mockResolvedValue();

      const result = await factory.createPDFGenerator();

      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'pdf.useEnhancedEngine',
        false,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Advanced PDF Generator Service with engine abstraction layer',
      );
      expect(AdvancedPDFGeneratorService).toHaveBeenCalledWith(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );
      expect(mockAdvancedPDFGeneratorService.initialize).toHaveBeenCalled();
      expect(result).toBe(mockAdvancedPDFGeneratorService);
    });

    it('should fallback to legacy service when enhanced service initialization fails', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(true);
      const initError = new Error('Initialization failed');
      mockAdvancedPDFGeneratorService.initialize.mockRejectedValue(initError);

      const result = await factory.createPDFGenerator();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Advanced PDF Generator Service with engine abstraction layer',
      );
      expect(mockAdvancedPDFGeneratorService.initialize).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to initialize Advanced PDF Generator Service, falling back to basic',
        { error: initError },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Basic PDF Generator Service',
      );
      expect(result).toBe(mockBasicPDFGeneratorService);
    });

    it('should create legacy service as default fallback', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      const result = await factory.createPDFGenerator();

      expect(result).toBe(mockBasicPDFGeneratorService);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Basic PDF Generator Service',
      );
    });
  });

  describe('getEngineType', () => {
    it('should return "enhanced" when enhanced engine is enabled', () => {
      mockConfigManager.get = jest.fn().mockReturnValue(true);

      const result = factory.getEngineType();

      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'pdf.useEnhancedEngine',
        false,
      );
      expect(result).toBe('advanced');
    });

    it('should return "legacy" when enhanced engine is disabled', () => {
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      const result = factory.getEngineType();

      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'pdf.useEnhancedEngine',
        false,
      );
      expect(result).toBe('basic');
    });

    it('should return "legacy" as default when config value is undefined', () => {
      mockConfigManager.get = jest.fn().mockReturnValue(undefined);

      const result = factory.getEngineType();

      expect(result).toBe('basic');
    });
  });

  describe('createLegacyService private method', () => {
    it('should create legacy service instance', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      await factory.createPDFGenerator();

      expect(BasicPDFGeneratorService).toHaveBeenCalledWith(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Basic PDF Generator Service',
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple service creation calls independently', async () => {
      // Reset the constructor call count for this specific test
      (
        BasicPDFGeneratorService as jest.MockedClass<
          typeof BasicPDFGeneratorService
        >
      ).mockClear();
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      const result1 = await factory.createPDFGenerator();
      const result2 = await factory.createPDFGenerator();

      expect(result1).toBe(mockBasicPDFGeneratorService);
      expect(result2).toBe(mockBasicPDFGeneratorService);
      expect(BasicPDFGeneratorService).toHaveBeenCalledTimes(2);
    });

    it('should handle switching between engine types', async () => {
      // First call with legacy
      mockConfigManager.get = jest.fn().mockReturnValue(false);
      const legacyResult = await factory.createPDFGenerator();
      expect(legacyResult).toBe(mockBasicPDFGeneratorService);

      // Second call with enhanced
      mockConfigManager.get = jest.fn().mockReturnValue(true);
      mockAdvancedPDFGeneratorService.initialize.mockResolvedValue();
      const enhancedResult = await factory.createPDFGenerator();
      expect(enhancedResult).toBe(mockAdvancedPDFGeneratorService);
    });
  });
});
