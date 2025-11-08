/**
 * Page Structure Service Tests
 * Tests page structure service functionality including:
 * - Service initialization
 * - Page structure generation
 * - Header and footer generation
 * - Preset management
 * - Configuration validation
 * - Error handling
 */

/// <reference types="jest" />

import { PageStructureService } from '../../../../src/application/services/page-structure.service';
import {
  PageContext,
  PageStructureConfig,
} from '../../../../src/core/page-structure';
import { MD2PDFError } from '../../../../src/infrastructure/error/errors';
import type { ILogger } from '../../../../src/infrastructure/logging/types';
import type { IErrorHandler } from '../../../../src/infrastructure/error/types';
import type { IConfigManager } from '../../../../src/infrastructure/config/types';
import { defaultConfig } from '../../../../src/infrastructure/config/defaults';

// Mock the core page structure modules
jest.mock('../../../../src/core/page-structure/header-footer-manager', () => ({
  HeaderFooterManager: jest.fn().mockImplementation(() => ({
    generatePageStructure: jest.fn().mockImplementation((config) => ({
      header: {
        html: '<div>Test Header</div>',
        height: '50px',
        warnings: [],
      },
      footer: {
        html: '<div>Test Footer</div>',
        height: '30px',
        warnings: [],
      },
      margins: config.margins || {
        top: '1in',
        bottom: '1in',
        left: '0.75in',
        right: '0.75in',
      },
    })),
    generateHeader: jest.fn().mockReturnValue({
      html: '<div>Test Header</div>',
      height: '50px',
      warnings: [],
    }),
    generateFooter: jest.fn().mockReturnValue({
      html: '<div>Test Footer</div>',
      height: '30px',
      warnings: [],
    }),
    validateHeaderConfig: jest.fn().mockReturnValue({
      errors: [],
      warnings: [],
    }),
    validateFooterConfig: jest.fn().mockReturnValue({
      errors: [],
      warnings: [],
    }),
    previewContent: jest.fn().mockReturnValue({
      html: '<div>Preview Content</div>',
      warnings: [],
    }),
  })),
}));

jest.mock('../../../../src/core/page-structure/preset-manager', () => ({
  PresetManager: {
    getAvailablePresets: jest.fn().mockReturnValue([
      {
        name: 'professional',
        displayName: 'Professional',
        description: 'Clean professional layout',
        category: 'business',
        config: {
          header: { enabled: true, template: 'Professional Header' },
          footer: {
            enabled: true,
            template: 'Page {{page}} of {{totalPages}}',
          },
          margins: {
            top: '1in',
            bottom: '1in',
            left: '0.75in',
            right: '0.75in',
          },
        },
        tags: ['business', 'clean'],
        preview: { thumbnailUrl: '/preview/professional.png' },
      },
      {
        name: 'academic',
        displayName: 'Academic',
        description: 'Academic document layout',
        category: 'academic',
        config: {
          header: { enabled: false, template: '' },
          footer: { enabled: true, template: 'Page {{page}}' },
          margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
        },
        tags: ['academic', 'minimal'],
        preview: { thumbnailUrl: '/preview/academic.png' },
      },
    ]),
    getPresetByName: jest.fn().mockImplementation((name: string) => {
      if (name === 'professional') {
        return {
          name: 'professional',
          displayName: 'Professional',
          description: 'Clean professional layout',
          category: 'business',
          config: {
            header: { enabled: true, template: 'Professional Header' },
            footer: {
              enabled: true,
              template: 'Page {{page}} of {{totalPages}}',
            },
            margins: {
              top: '1in',
              bottom: '1in',
              left: '0.75in',
              right: '0.75in',
            },
          },
          tags: ['business', 'clean'],
          preview: { thumbnailUrl: '/preview/professional.png' },
        };
      }
      return undefined;
    }),
    suggestPreset: jest.fn().mockReturnValue([
      {
        name: 'professional',
        displayName: 'Professional',
        description: 'Clean professional layout',
        category: 'business',
        config: {
          header: { enabled: true, template: 'Professional Header' },
          footer: {
            enabled: true,
            template: 'Page {{page}} of {{totalPages}}',
          },
          margins: {
            top: '1in',
            bottom: '1in',
            left: '0.75in',
            right: '0.75in',
          },
        },
        tags: ['business', 'clean'],
        preview: { thumbnailUrl: '/preview/professional.png' },
      },
    ]),
  },
}));

jest.mock('../../../../src/core/page-structure/template-validator', () => ({
  TemplateValidator: {
    validate: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
  },
}));

describe('PageStructureService', () => {
  let service: PageStructureService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockConfigManager: jest.Mocked<IConfigManager>;
  let sampleContext: PageContext;
  let sampleConfig: PageStructureConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock dependencies
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
    };

    mockErrorHandler = {
      handleError: jest.fn(),
      formatError: jest.fn(),
      isRecoverable: jest.fn(),
      categorizeError: jest.fn(),
    };

    mockConfigManager = {
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

    // Sample test data
    sampleContext = {
      pageNumber: 1,
      totalPages: 10,
      title: 'Test Document',
      author: 'Test Author',
      date: '2024-01-01',
      fileName: 'test.pdf',
      chapterTitle: 'Chapter 1',
      sectionTitle: 'Section 1.1',
    };

    sampleConfig = {
      header: {
        enabled: true,
        template: '<div>{{title}}</div>',
        height: '50px',
      },
      footer: {
        enabled: true,
        template: '<div>Page {{pageNumber}} of {{totalPages}}</div>',
        height: '30px',
      },
      margins: {
        top: '1in',
        bottom: '1in',
        left: '0.75in',
        right: '0.75in',
      },
    };

    service = new PageStructureService(
      mockLogger,
      mockErrorHandler,
      mockConfigManager,
    );
  });

  describe('Constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(PageStructureService);
    });

    it('should initialize with provided dependencies', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generatePageStructure', () => {
    it('should generate complete page structure', async () => {
      const result = await service.generatePageStructure(
        sampleConfig,
        sampleContext,
      );

      expect(result).toBeDefined();
      expect(result.header).toBeDefined();
      expect(result.footer).toBeDefined();
      expect(result.margins).toBeDefined();
      expect(result.header.html).toBe('<div>Test Header</div>');
      expect(result.footer.html).toBe('<div>Test Footer</div>');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generating page structure',
        {
          hasHeader: true,
          hasFooter: true,
          pageNumber: 1,
          title: 'Test Document',
        },
      );
    });

    it('should generate structure with custom variables', async () => {
      const variables = [{ name: 'customVar', value: 'customValue' }];

      const result = await service.generatePageStructure(
        sampleConfig,
        sampleContext,
        variables,
      );

      expect(result).toBeDefined();
      expect(result.header.html).toBe('<div>Test Header</div>');
      expect(result.footer.html).toBe('<div>Test Footer</div>');
    });

    it('should handle disabled header and footer', async () => {
      const configWithoutHeaderFooter = {
        ...sampleConfig,
        header: {
          ...sampleConfig.header,
          enabled: false,
          template: 'disabled',
        },
        footer: {
          ...sampleConfig.footer,
          enabled: false,
          template: 'disabled',
        },
      };

      const result = await service.generatePageStructure(
        configWithoutHeaderFooter,
        sampleContext,
      );

      expect(result).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generating page structure',
        {
          hasHeader: false,
          hasFooter: false,
          pageNumber: 1,
          title: 'Test Document',
        },
      );
    });

    it('should log warnings when present', async () => {
      // Access the service's internal headerFooterManager mock
      const internalMock = (service as any).headerFooterManager;
      internalMock.generatePageStructure.mockReturnValueOnce({
        header: {
          html: '<div>Test Header</div>',
          height: '50px',
          warnings: ['Header warning'],
        },
        footer: {
          html: '<div>Test Footer</div>',
          height: '30px',
          warnings: ['Footer warning'],
        },
        margins: sampleConfig.margins,
      });

      const result = await service.generatePageStructure(
        sampleConfig,
        sampleContext,
      );

      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Header generation warnings',
        {
          warnings: ['Header warning'],
        },
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Footer generation warnings',
        {
          warnings: ['Footer warning'],
        },
      );
    });

    it('should handle errors and wrap them properly', async () => {
      // Access the service's internal headerFooterManager mock
      const internalMock = (service as any).headerFooterManager;
      internalMock.generatePageStructure.mockImplementationOnce(() => {
        throw new Error('Generation failed');
      });

      await expect(
        service.generatePageStructure(sampleConfig, sampleContext),
      ).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('generateHeader', () => {
    it('should generate header with default configuration', async () => {
      const result = await service.generateHeader(sampleContext);

      expect(result).toBeDefined();
      expect(result.html).toBe('<div>Test Header</div>');
      expect(result.height).toBe('50px');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Generating header using default configuration',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Header generated successfully',
      );
    });

    it('should handle header generation errors', async () => {
      // Access the service's internal headerFooterManager mock
      const internalMock = (service as any).headerFooterManager;
      internalMock.generateHeader.mockImplementationOnce(() => {
        throw new Error('Header generation failed');
      });

      await expect(service.generateHeader(sampleContext)).rejects.toThrow(
        MD2PDFError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('generateFooter', () => {
    it('should generate footer with default configuration', async () => {
      const result = await service.generateFooter(sampleContext);

      expect(result).toBeDefined();
      expect(result.html).toBe('<div>Test Footer</div>');
      expect(result.height).toBe('30px');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Generating footer using default configuration',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Footer generated successfully',
      );
    });

    it('should handle footer generation errors', async () => {
      // Access the service's internal headerFooterManager mock
      const internalMock = (service as any).headerFooterManager;
      internalMock.generateFooter.mockImplementationOnce(() => {
        throw new Error('Footer generation failed');
      });

      await expect(service.generateFooter(sampleContext)).rejects.toThrow(
        MD2PDFError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('getAvailablePresets', () => {
    it('should return available presets', async () => {
      const presets = await service.getAvailablePresets();

      expect(presets).toBeDefined();
      expect(presets.length).toBe(2);
      expect(presets[0].name).toBe('professional');
      expect(presets[1].name).toBe('academic');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Fetching available page structure presets',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Found 2 available presets',
        {
          presetNames: ['professional', 'academic'],
          categories: ['business', 'academic'],
        },
      );
    });

    it('should handle errors when fetching presets', async () => {
      const {
        PresetManager,
      } = require('../../../../src/core/page-structure/preset-manager');
      PresetManager.getAvailablePresets.mockImplementationOnce(() => {
        throw new Error('Failed to fetch presets');
      });

      await expect(service.getAvailablePresets()).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('getPresetByName', () => {
    it('should return specific preset by name', async () => {
      const preset = await service.getPresetByName('professional');

      expect(preset).toBeDefined();
      expect(preset!.name).toBe('professional');
      expect((preset as any).displayName).toBe('Professional');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Fetching preset by name: professional',
      );
    });

    it('should return undefined for non-existent preset', async () => {
      const preset = await service.getPresetByName('nonexistent');

      expect(preset).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Preset not found: nonexistent',
      );
    });

    it('should handle errors when fetching preset', async () => {
      const {
        PresetManager,
      } = require('../../../../src/core/page-structure/preset-manager');
      PresetManager.getPresetByName.mockImplementationOnce(() => {
        throw new Error('Failed to fetch preset');
      });

      await expect(service.getPresetByName('professional')).rejects.toThrow(
        MD2PDFError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('suggestPreset', () => {
    it('should suggest appropriate presets for document', async () => {
      const suggestions = await service.suggestPreset('/path/to/document.md');

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].name).toBe('professional');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Analyzing document for preset suggestions: /path/to/document.md',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generated 1 preset suggestions',
        {
          documentPath: '/path/to/document.md',
          analysis: expect.objectContaining({
            hasCodeBlocks: false,
            hasAcademicElements: false,
            isBusinessDocument: false,
            complexity: 'moderate',
          }),
          suggestedPresets: ['professional'],
        },
      );
    });

    it('should handle errors when suggesting presets', async () => {
      const {
        PresetManager,
      } = require('../../../../src/core/page-structure/preset-manager');
      PresetManager.suggestPreset.mockImplementationOnce(() => {
        throw new Error('Failed to suggest presets');
      });

      await expect(
        service.suggestPreset('/path/to/document.md'),
      ).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration successfully', async () => {
      const result = await service.validateConfiguration(sampleConfig);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Validating page structure configuration',
      );
    });

    it('should handle validation errors', async () => {
      // Access the service's internal headerFooterManager mock
      const internalMock = (service as any).headerFooterManager;
      internalMock.validateHeaderConfig.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      await expect(service.validateConfiguration(sampleConfig)).rejects.toThrow(
        MD2PDFError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('previewTemplate', () => {
    it('should preview template with sample context', async () => {
      const mockHeaderFooterManager =
        require('../../../../src/core/page-structure/header-footer-manager').HeaderFooterManager;
      const mockInstance = new mockHeaderFooterManager();
      mockInstance.renderTemplate = jest.fn().mockReturnValue({
        html: '<div>Previewed Template</div>',
        height: '40px',
        warnings: [],
      });

      const result = await service.previewTemplate('{{title}}', sampleContext);

      expect(result).toBeDefined();
      expect(result.html).toBe('<div>Preview Content</div>');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Generating template preview',
        {
          templateLength: 9,
          hasSampleContext: true,
        },
      );
    });

    it('should use default context when none provided', async () => {
      const mockHeaderFooterManager =
        require('../../../../src/core/page-structure/header-footer-manager').HeaderFooterManager;
      const mockInstance = new mockHeaderFooterManager();
      mockInstance.renderTemplate = jest.fn().mockReturnValue({
        html: '<div>Previewed Template</div>',
        height: '40px',
        warnings: [],
      });

      const result = await service.previewTemplate('{{title}}');

      expect(result).toBeDefined();
      expect(result.html).toBe('<div>Preview Content</div>');
    });

    it('should handle preview errors', async () => {
      // Access the service's internal headerFooterManager mock
      const internalMock = (service as any).headerFooterManager;
      internalMock.previewContent.mockImplementationOnce(() => {
        throw new Error('Preview failed');
      });

      await expect(service.previewTemplate('{{invalid}}')).rejects.toThrow(
        MD2PDFError,
      );

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should properly wrap and categorize errors', async () => {
      // Access the service's internal headerFooterManager mock
      const internalMock = (service as any).headerFooterManager;
      internalMock.generatePageStructure.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      await expect(
        service.generatePageStructure(sampleConfig, sampleContext),
      ).rejects.toThrow(MD2PDFError);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(MD2PDFError),
        'PageStructureService.generatePageStructure',
      );
    });

    it('should include context in error details', async () => {
      const mockHeaderFooterManager =
        require('../../../../src/core/page-structure/header-footer-manager').HeaderFooterManager;
      const mockInstance = new mockHeaderFooterManager();
      mockInstance.generatePageStructure.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      try {
        await service.generatePageStructure(sampleConfig, sampleContext);
      } catch (error) {
        expect(error).toBeInstanceOf(MD2PDFError);
        expect((error as any).details.config).toBeDefined();
        expect((error as any).details.context).toBeDefined();
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex page structure generation', async () => {
      const complexConfig = {
        header: {
          enabled: true,
          template: '<div class="header">{{title}} - {{chapterTitle}}</div>',
          height: '60px',
          styles: {
            fontSize: '14px',
            color: '#333',
            backgroundColor: '#f5f5f5',
          },
        },
        footer: {
          enabled: true,
          template:
            '<div class="footer">{{author}} | Page {{pageNumber}} of {{totalPages}} | {{date}}</div>',
          height: '40px',
          styles: {
            fontSize: '12px',
            color: '#666',
            textAlign: 'center' as 'center',
          },
        },
        margins: {
          top: '1.5in',
          bottom: '1.2in',
          left: '1in',
          right: '1in',
        },
      };

      const result = await service.generatePageStructure(
        complexConfig,
        sampleContext,
      );

      expect(result).toBeDefined();
      expect(result.header.html).toBe('<div>Test Header</div>');
      expect(result.footer.html).toBe('<div>Test Footer</div>');
      expect(result.margins).toEqual(complexConfig.margins);
    });

    it('should handle preset-based workflow', async () => {
      const presets = await service.getAvailablePresets();
      const selectedPreset = presets.find((p) => p.name === 'professional');

      expect(selectedPreset).toBeDefined();

      const validationResult = await service.validateConfiguration(
        selectedPreset!.config,
      );
      expect(validationResult.isValid).toBe(true);

      const result = await service.generatePageStructure(
        selectedPreset!.config,
        sampleContext,
      );
      expect(result).toBeDefined();
    });
  });
});
