import { PresetManager } from '../../../../src/core/page-structure/preset-manager';
import { PageStructurePreset } from '../../../../src/core/page-structure/types';

describe('PresetManager', () => {
  describe('getAvailablePresets', () => {
    it('should return all available presets', () => {
      const presets = PresetManager.getAvailablePresets();

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.every((preset) => preset.name)).toBe(true);
      expect(presets.every((preset) => preset.description)).toBe(true);
      expect(presets.every((preset) => preset.category)).toBe(true);
      expect(presets.every((preset) => preset.config)).toBe(true);
    });

    it('should include expected preset categories', () => {
      const presets = PresetManager.getAvailablePresets();
      const categories = presets.map((p) => p.category);

      expect(categories).toContain('business');
      expect(categories).toContain('academic');
      expect(categories).toContain('technical');
      expect(categories).toContain('minimal');
    });

    it('should have business professional preset', () => {
      const presets = PresetManager.getAvailablePresets();
      const businessPreset = presets.find(
        (p) => p.name === 'Business Professional',
      );

      expect(businessPreset).toBeDefined();
      expect(businessPreset?.category).toBe('business');
      expect(businessPreset?.config.header?.enabled).toBe(true);
      expect(businessPreset?.config.footer?.enabled).toBe(true);
    });

    it('should have academic paper preset', () => {
      const presets = PresetManager.getAvailablePresets();
      const academicPreset = presets.find((p) => p.name === 'Academic Paper');

      expect(academicPreset).toBeDefined();
      expect(academicPreset?.category).toBe('academic');
      expect(academicPreset?.config.header?.showOnFirstPage).toBe(false);
    });

    it('should have minimal clean preset with disabled header', () => {
      const presets = PresetManager.getAvailablePresets();
      const minimalPreset = presets.find((p) => p.name === 'Minimal Clean');

      expect(minimalPreset).toBeDefined();
      expect(minimalPreset?.category).toBe('minimal');
      expect(minimalPreset?.config.header?.enabled).toBe(false);
      expect(minimalPreset?.config.footer?.enabled).toBe(true);
    });
  });

  describe('getPresetByName', () => {
    it('should return correct preset by name', () => {
      const preset = PresetManager.getPresetByName('Business Professional');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Business Professional');
      expect(preset?.category).toBe('business');
    });

    it('should return undefined for non-existent preset', () => {
      const preset = PresetManager.getPresetByName('Non Existent Preset');

      expect(preset).toBeUndefined();
    });

    it('should be case sensitive', () => {
      const preset = PresetManager.getPresetByName('business professional');

      expect(preset).toBeUndefined();
    });
  });

  describe('getPresetsByCategory', () => {
    it('should return presets for business category', () => {
      const businessPresets = PresetManager.getPresetsByCategory('business');

      expect(businessPresets.length).toBeGreaterThan(0);
      expect(businessPresets.every((p) => p.category === 'business')).toBe(
        true,
      );
    });

    it('should return presets for academic category', () => {
      const academicPresets = PresetManager.getPresetsByCategory('academic');

      expect(academicPresets.length).toBeGreaterThan(0);
      expect(academicPresets.every((p) => p.category === 'academic')).toBe(
        true,
      );
    });

    it('should return empty array for non-existent category', () => {
      const presets = PresetManager.getPresetsByCategory('non-existent');

      expect(presets).toHaveLength(0);
    });
  });

  describe('createCustomPreset', () => {
    it('should create custom preset with provided config', () => {
      const config = {
        header: {
          enabled: true,
          template: '<div>Custom Header</div>',
        },
        footer: {
          enabled: false,
          template: '',
        },
      };

      const preset = PresetManager.createCustomPreset(
        'Custom Preset',
        'A custom preset for testing',
        config,
      );

      expect(preset.name).toBe('Custom Preset');
      expect(preset.description).toBe('A custom preset for testing');
      expect(preset.category).toBe('custom');
      expect(preset.config).toEqual(config);
    });

    it('should allow custom category', () => {
      const config = {
        header: { enabled: false, template: '' },
        footer: { enabled: false, template: '' },
      };

      const preset = PresetManager.createCustomPreset(
        'Test Preset',
        'Test Description',
        config,
        'test-category',
      );

      expect(preset.category).toBe('test-category');
    });
  });

  describe('suggestPreset', () => {
    it('should suggest technical preset for documents with code blocks', () => {
      const analysis = {
        hasCodeBlocks: true,
        hasAcademicElements: false,
        isBusinessDocument: false,
        complexity: 'moderate' as const,
      };

      const suggestions = PresetManager.suggestPreset(analysis);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].category).toBe('technical');
    });

    it('should suggest academic preset for academic documents', () => {
      const analysis = {
        hasCodeBlocks: false,
        hasAcademicElements: true,
        isBusinessDocument: false,
        complexity: 'complex' as const,
      };

      const suggestions = PresetManager.suggestPreset(analysis);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].category).toBe('academic');
    });

    it('should suggest business preset for business documents', () => {
      const analysis = {
        hasCodeBlocks: false,
        hasAcademicElements: false,
        isBusinessDocument: true,
        complexity: 'moderate' as const,
      };

      const suggestions = PresetManager.suggestPreset(analysis);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].category).toBe('business');
    });

    it('should suggest minimal preset for simple documents', () => {
      const analysis = {
        hasCodeBlocks: false,
        hasAcademicElements: false,
        isBusinessDocument: false,
        complexity: 'simple' as const,
      };

      const suggestions = PresetManager.suggestPreset(analysis);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].category).toBe('minimal');
    });

    it('should default to business preset when no specific match', () => {
      const analysis = {
        hasCodeBlocks: false,
        hasAcademicElements: false,
        isBusinessDocument: false,
        complexity: 'moderate' as const,
      };

      const suggestions = PresetManager.suggestPreset(analysis);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].category).toBe('business');
    });

    it('should handle multiple matching criteria', () => {
      const analysis = {
        hasCodeBlocks: true,
        hasAcademicElements: true,
        isBusinessDocument: true,
        complexity: 'complex' as const,
      };

      const suggestions = PresetManager.suggestPreset(analysis);

      expect(suggestions.length).toBeGreaterThan(0);
      // Should include technical first due to code blocks
      expect(suggestions[0].category).toBe('technical');
    });
  });

  describe('validatePreset', () => {
    it('should validate correct preset', () => {
      const preset: PageStructurePreset = {
        name: 'Test Preset',
        description: 'A test preset',
        category: 'business',
        config: {
          header: {
            enabled: true,
            template: '<div>{{title}}</div>',
          },
          footer: {
            enabled: true,
            template: '<div>Page {{pageNumber}}</div>',
          },
        },
      };

      const result = PresetManager.validatePreset(preset);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for preset without name', () => {
      const preset: PageStructurePreset = {
        name: '',
        description: 'A test preset',
        category: 'business',
        config: {
          header: { enabled: false, template: '' },
        },
      };

      const result = PresetManager.validatePreset(preset);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Preset name is required');
    });

    it('should return warning for preset without description', () => {
      const preset: PageStructurePreset = {
        name: 'Test Preset',
        description: '',
        category: 'business',
        config: {
          header: { enabled: false, template: '' },
        },
      };

      const result = PresetManager.validatePreset(preset);

      expect(result.warnings).toContain('Preset description is missing');
    });

    it('should return error for enabled header without template', () => {
      const preset: PageStructurePreset = {
        name: 'Test Preset',
        description: 'A test preset',
        category: 'business',
        config: {
          header: {
            enabled: true,
            template: '',
          },
        },
      };

      const result = PresetManager.validatePreset(preset);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Header template is required when header is enabled',
      );
    });

    it('should return error for enabled footer without template', () => {
      const preset: PageStructurePreset = {
        name: 'Test Preset',
        description: 'A test preset',
        category: 'business',
        config: {
          footer: {
            enabled: true,
            template: '',
          },
        },
      };

      const result = PresetManager.validatePreset(preset);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Footer template is required when footer is enabled',
      );
    });
  });
});
