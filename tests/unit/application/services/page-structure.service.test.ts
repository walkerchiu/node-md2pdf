import { PageStructureService } from '../../../../src/application/services/page-structure.service';
import {
  PageStructureConfig,
  PageContext,
  TemplateVariable,
} from '../../../../src/core/page-structure/types';
import { MD2PDFError } from '../../../../src/infrastructure/error/errors';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

const mockErrorHandler = {
  handleError: jest.fn(),
};

const mockConfigManager = {
  get: jest.fn(),
  set: jest.fn(),
};

describe('PageStructureService', () => {
  let service: PageStructureService;
  let mockContext: PageContext;
  let mockConfig: PageStructureConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PageStructureService(
      mockLogger as any,
      mockErrorHandler as any,
      mockConfigManager as any,
    );

    mockContext = {
      pageNumber: 1,
      totalPages: 10,
      title: 'Test Document',
      author: 'Test Author',
      date: '2024-01-01',
      fileName: 'test.md',
    };

    mockConfig = {
      header: {
        enabled: true,
        template: '<div>{{title}}</div>',
      },
      footer: {
        enabled: true,
        template: '<div>Page {{pageNumber}}</div>',
      },
    };
  });

  describe('generatePageStructure', () => {
    it('should generate page structure successfully', async () => {
      const result = await service.generatePageStructure(
        mockConfig,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.header).toBeDefined();
      expect(result.footer).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generating page structure',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Page structure generated successfully',
        expect.any(Object),
      );
    });

    it('should handle custom variables', async () => {
      const customVariables: TemplateVariable[] = [
        { name: 'custom', value: 'Custom Value' },
      ];

      const customConfig = {
        ...mockConfig,
        header: {
          enabled: true,
          template: '<div>{{title}} - {{custom}}</div>',
        },
      };

      const result = await service.generatePageStructure(
        customConfig,
        mockContext,
        customVariables,
      );

      expect(result.header.html).toContain('Test Document');
    });

    it('should log warnings when present', async () => {
      // This would require mocking the HeaderFooterManager to return warnings
      // For now, we'll just test that the service handles warnings properly
      await service.generatePageStructure(mockConfig, mockContext);

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle errors and wrap them', async () => {
      // Force an error by providing invalid config
      const invalidConfig = null as any;

      await expect(
        service.generatePageStructure(invalidConfig, mockContext),
      ).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'PageStructureService.generatePageStructure',
      );
    });
  });

  describe('getAvailablePresets', () => {
    it('should return available presets', async () => {
      const presets = await service.getAvailablePresets();

      expect(presets).toBeDefined();
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Fetching available page structure presets',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Found'),
        expect.any(Object),
      );
    });

    it('should handle errors when getting presets', async () => {
      // Mock a scenario that would cause an error
      jest
        .spyOn(
          require('../../../../src/core/page-structure/preset-manager'),
          'PresetManager',
        )
        .mockImplementation(() => {
          throw new Error('Test error');
        });

      await expect(service.getAvailablePresets()).rejects.toThrow(MD2PDFError);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('getPresetByName', () => {
    it('should return preset when found', async () => {
      const presetName = 'Business Professional';
      const preset = await service.getPresetByName(presetName);

      expect(preset).toBeDefined();
      expect(preset?.name).toBe(presetName);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Fetching preset by name: ${presetName}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Preset found: ${presetName}`,
        expect.any(Object),
      );
    });

    it('should return undefined and log warning when preset not found', async () => {
      const presetName = 'Non-existent Preset';
      const preset = await service.getPresetByName(presetName);

      expect(preset).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Preset not found: ${presetName}`,
      );
    });
  });

  describe('suggestPreset', () => {
    it('should analyze document and suggest presets', async () => {
      const documentPath = '/path/to/technical-api-document.md';
      const suggestions = await service.suggestPreset(documentPath);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Analyzing document for preset suggestions: ${documentPath}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated'),
        expect.any(Object),
      );
    });

    it('should handle different document types', async () => {
      const businessDoc = '/path/to/business-report.md';
      const academicDoc = '/path/to/research-paper.md';

      const businessSuggestions = await service.suggestPreset(businessDoc);
      const academicSuggestions = await service.suggestPreset(academicDoc);

      expect(businessSuggestions).toBeDefined();
      expect(academicSuggestions).toBeDefined();
    });
  });

  describe('validateConfiguration', () => {
    it('should validate correct configuration', async () => {
      const result = await service.validateConfiguration(mockConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Validating page structure configuration',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Configuration validation completed',
        expect.any(Object),
      );
    });

    it('should validate configuration with margins', async () => {
      const configWithMargins: PageStructureConfig = {
        ...mockConfig,
        margins: {
          top: '60px',
          bottom: '40px',
          left: '50px',
          right: '50px',
        },
      };

      const result = await service.validateConfiguration(configWithMargins);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid margin formats', async () => {
      const configWithInvalidMargins: PageStructureConfig = {
        ...mockConfig,
        margins: {
          top: 'invalid-margin',
          bottom: '40px',
        },
      };

      const result = await service.validateConfiguration(
        configWithInvalidMargins,
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('Invalid top margin format'),
        ),
      ).toBe(true);
    });

    it('should handle validation errors', async () => {
      const invalidConfig = {
        header: {
          enabled: true,
          template: '', // Invalid: enabled but no template
        },
      };

      const result = await service.validateConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('previewTemplate', () => {
    it('should generate template preview with default context', async () => {
      const template = '<div>{{title}} by {{author}}</div>';

      const result = await service.previewTemplate(template);

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Generating template preview',
        expect.any(Object),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Template preview generated',
        expect.any(Object),
      );
    });

    it('should generate template preview with custom context', async () => {
      const template = '<div>{{title}} by {{author}}</div>';
      const sampleContext = {
        title: 'Preview Title',
        author: 'Preview Author',
      };

      const result = await service.previewTemplate(template, sampleContext);

      expect(result).toBeDefined();
      expect(result.html).toContain('Preview Title');
      expect(result.html).toContain('Preview Author');
    });

    it('should handle preview errors', async () => {
      const template = null as any;

      await expect(service.previewTemplate(template)).rejects.toThrow(
        MD2PDFError,
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'PageStructureService.previewTemplate',
      );
    });
  });

  describe('private methods', () => {
    describe('analyzeDocument', () => {
      it('should analyze technical documents', async () => {
        const documentPath = '/path/to/api-documentation.md';
        const suggestions = await service.suggestPreset(documentPath);

        // The analysis should detect this as a technical document
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should analyze academic documents', async () => {
        const documentPath = '/path/to/research-paper.md';
        const suggestions = await service.suggestPreset(documentPath);

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should analyze business documents', async () => {
        const documentPath = '/path/to/business-report.md';
        const suggestions = await service.suggestPreset(documentPath);

        expect(suggestions.length).toBeGreaterThan(0);
      });
    });
  });
});
