/**
 * Tests for PDFServiceFactory
 */

import { PDFServiceFactory } from '../../../../src/application/services/pdf-service-factory';
import { PDFGeneratorService } from '../../../../src/application/services/pdf-generator.service';
import { EnhancedPDFGeneratorService } from '../../../../src/application/services/enhanced-pdf-generator.service';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../../src/infrastructure/error/types';
import type { IConfigManager } from '../../../../src/infrastructure/config/types';

// Mock the service classes
jest.mock('../../../../src/application/services/pdf-generator.service');
jest.mock(
  '../../../../src/application/services/enhanced-pdf-generator.service',
);

describe('PDFServiceFactory', () => {
  let factory: PDFServiceFactory;
  let mockLogger: ILogger;
  let mockErrorHandler: IErrorHandler;
  let mockConfigManager: IConfigManager;
  let mockPDFGeneratorService: jest.Mocked<PDFGeneratorService>;
  let mockEnhancedPDFGeneratorService: jest.Mocked<EnhancedPDFGeneratorService>;

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
    mockPDFGeneratorService = new PDFGeneratorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
    ) as jest.Mocked<PDFGeneratorService>;

    mockEnhancedPDFGeneratorService = new EnhancedPDFGeneratorService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
    ) as jest.Mocked<EnhancedPDFGeneratorService>;

    mockEnhancedPDFGeneratorService.initialize = jest.fn();

    // Mock constructors
    (
      PDFGeneratorService as jest.MockedClass<typeof PDFGeneratorService>
    ).mockImplementation(() => mockPDFGeneratorService);

    (
      EnhancedPDFGeneratorService as jest.MockedClass<
        typeof EnhancedPDFGeneratorService
      >
    ).mockImplementation(() => mockEnhancedPDFGeneratorService);

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
        'Creating Legacy PDF Generator Service',
      );
      expect(result).toBe(mockPDFGeneratorService);
      expect(PDFGeneratorService).toHaveBeenCalledWith(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );
    });

    it('should create enhanced service when enhanced engine is enabled', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(true);
      mockEnhancedPDFGeneratorService.initialize.mockResolvedValue();

      const result = await factory.createPDFGenerator();

      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'pdf.useEnhancedEngine',
        false,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Enhanced PDF Generator Service with engine abstraction layer',
      );
      expect(EnhancedPDFGeneratorService).toHaveBeenCalledWith(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );
      expect(mockEnhancedPDFGeneratorService.initialize).toHaveBeenCalled();
      expect(result).toBe(mockEnhancedPDFGeneratorService);
    });

    it('should fallback to legacy service when enhanced service initialization fails', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(true);
      const initError = new Error('Initialization failed');
      mockEnhancedPDFGeneratorService.initialize.mockRejectedValue(initError);

      const result = await factory.createPDFGenerator();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Enhanced PDF Generator Service with engine abstraction layer',
      );
      expect(mockEnhancedPDFGeneratorService.initialize).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to initialize Enhanced PDF Generator Service, falling back to legacy',
        { error: initError },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Legacy PDF Generator Service',
      );
      expect(result).toBe(mockPDFGeneratorService);
    });

    it('should create legacy service as default fallback', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      const result = await factory.createPDFGenerator();

      expect(result).toBe(mockPDFGeneratorService);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Legacy PDF Generator Service',
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
      expect(result).toBe('enhanced');
    });

    it('should return "legacy" when enhanced engine is disabled', () => {
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      const result = factory.getEngineType();

      expect(mockConfigManager.get).toHaveBeenCalledWith(
        'pdf.useEnhancedEngine',
        false,
      );
      expect(result).toBe('legacy');
    });

    it('should return "legacy" as default when config value is undefined', () => {
      mockConfigManager.get = jest.fn().mockReturnValue(undefined);

      const result = factory.getEngineType();

      expect(result).toBe('legacy');
    });
  });

  describe('createLegacyService private method', () => {
    it('should create legacy service instance', async () => {
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      await factory.createPDFGenerator();

      expect(PDFGeneratorService).toHaveBeenCalledWith(
        mockLogger,
        mockErrorHandler,
        mockConfigManager,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating Legacy PDF Generator Service',
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple service creation calls independently', async () => {
      // Reset the constructor call count for this specific test
      (
        PDFGeneratorService as jest.MockedClass<typeof PDFGeneratorService>
      ).mockClear();
      mockConfigManager.get = jest.fn().mockReturnValue(false);

      const result1 = await factory.createPDFGenerator();
      const result2 = await factory.createPDFGenerator();

      expect(result1).toBe(mockPDFGeneratorService);
      expect(result2).toBe(mockPDFGeneratorService);
      expect(PDFGeneratorService).toHaveBeenCalledTimes(2);
    });

    it('should handle switching between engine types', async () => {
      // First call with legacy
      mockConfigManager.get = jest.fn().mockReturnValue(false);
      const legacyResult = await factory.createPDFGenerator();
      expect(legacyResult).toBe(mockPDFGeneratorService);

      // Second call with enhanced
      mockConfigManager.get = jest.fn().mockReturnValue(true);
      mockEnhancedPDFGeneratorService.initialize.mockResolvedValue();
      const enhancedResult = await factory.createPDFGenerator();
      expect(enhancedResult).toBe(mockEnhancedPDFGeneratorService);
    });
  });
});
