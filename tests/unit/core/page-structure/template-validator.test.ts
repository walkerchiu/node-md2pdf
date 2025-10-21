/**
 * Template Validator Test Suite
 * Tests template validation functionality including HTML, CSS, and variable validation
 */

import { TemplateValidator } from '../../../../src/core/page-structure/template-validator';
import { HeaderConfig } from '../../../../src/core/page-structure/types';
import { VariableProcessor } from '../../../../src/core/page-structure/variable-processor';

// Mock VariableProcessor
jest.mock('../../../../src/core/page-structure/variable-processor');
const MockVariableProcessor = VariableProcessor as jest.MockedClass<
  typeof VariableProcessor
>;

describe('TemplateValidator', () => {
  let templateValidator: TemplateValidator;
  let mockVariableProcessor: jest.Mocked<VariableProcessor>;

  beforeEach(() => {
    MockVariableProcessor.mockClear();
    mockVariableProcessor = {
      extractVariables: jest.fn(),
      processVariables: jest.fn(),
      getAvailableVariables: jest.fn(),
    } as any;
    MockVariableProcessor.mockImplementation(() => mockVariableProcessor);

    templateValidator = new TemplateValidator();
  });

  describe('Constructor', () => {
    it('should create TemplateValidator with VariableProcessor instance', () => {
      expect(MockVariableProcessor).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateConfig', () => {
    const validHeaderConfig: HeaderConfig = {
      enabled: true,
      template: '<div>{{title}}</div>',
      height: '50px',
      styles: {
        fontSize: '12px',
        color: '#000000',
        textAlign: 'center',
      },
      showOnFirstPage: true,
      showOnEvenPages: true,
      showOnOddPages: true,
    };

    it('should validate valid header configuration', () => {
      mockVariableProcessor.extractVariables.mockReturnValue(['title']);

      const result = templateValidator.validateConfig(
        validHeaderConfig,
        'header',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when enabled but no template provided', () => {
      const config = { ...validHeaderConfig };
      delete (config as any).template;

      const result = templateValidator.validateConfig(config, 'header');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'header is enabled but no template provided',
      );
    });

    it('should validate disabled configuration without template', () => {
      const config = { ...validHeaderConfig, enabled: false };
      delete (config as any).template;

      const result = templateValidator.validateConfig(config, 'footer');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate template when provided', () => {
      mockVariableProcessor.extractVariables.mockReturnValue(['title']);

      const result = templateValidator.validateConfig(
        validHeaderConfig,
        'header',
      );

      expect(mockVariableProcessor.extractVariables).toHaveBeenCalledWith(
        '<div>{{title}}</div>',
      );
      expect(result.isValid).toBe(true);
    });

    it('should return error for invalid height format', () => {
      const config = { ...validHeaderConfig, height: 'invalid-height' };
      mockVariableProcessor.extractVariables.mockReturnValue(['title']);

      const result = templateValidator.validateConfig(config, 'header');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid height format: invalid-height');
    });

    it('should validate styles when provided', () => {
      const config = {
        ...validHeaderConfig,
        styles: {
          fontSize: 'invalid-size',
          color: 'invalid-color',
        },
      };
      mockVariableProcessor.extractVariables.mockReturnValue(['title']);

      const result = templateValidator.validateConfig(config, 'header');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid fontSize: invalid-size');
      expect(result.errors).toContain('Invalid color: invalid-color');
    });

    it('should validate visibility settings and return warnings', () => {
      const config = {
        ...validHeaderConfig,
        showOnEvenPages: false,
        showOnOddPages: false,
      };
      mockVariableProcessor.extractVariables.mockReturnValue(['title']);

      const result = templateValidator.validateConfig(config, 'header');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Header/footer will not be visible on any page due to visibility settings',
      );
    });
  });

  describe('validateTemplate', () => {
    it('should validate valid template', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([
        'title',
        'pageNumber',
      ]);

      const result = templateValidator.validateTemplate(
        '<div>{{title}} - Page {{pageNumber}}</div>',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for empty template', () => {
      const result = templateValidator.validateTemplate('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template cannot be empty');
    });

    it('should return error for whitespace-only template', () => {
      const result = templateValidator.validateTemplate('   \n\t  ');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template cannot be empty');
    });

    it('should return warning for very long template', () => {
      const longTemplate = 'a'.repeat(5001);
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate(longTemplate);

      expect(result.warnings).toContain(
        'Template is very long and may impact performance',
      );
    });

    it('should warn about unknown variables', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([
        'unknownVar1',
        'unknownVar2',
      ]);

      const result = templateValidator.validateTemplate(
        '<div>{{unknownVar1}} {{unknownVar2}}</div>',
      );

      expect(result.warnings).toContain(
        'Unknown variables found: {{unknownVar1}}, {{unknownVar2}}',
      );
    });

    it('should return error for unmatched braces', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate(
        '<div>{{unclosed</div>',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unmatched braces found in template');
    });

    it('should detect dangerous HTML content', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate(
        '<div><script>alert("xss")</script></div>',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Template contains potentially dangerous HTML',
      );
    });

    it('should detect iframe elements', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate(
        '<div><iframe src="evil.com"></iframe></div>',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Template contains potentially dangerous HTML',
      );
    });

    it('should detect javascript: URLs', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate(
        '<a href="javascript:alert(1)">Click</a>',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Template contains potentially dangerous HTML',
      );
    });

    it('should detect event handlers', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate(
        '<div onclick="alert(1)">Click</div>',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Template contains potentially dangerous HTML',
      );
    });

    it('should warn about possibly unclosed HTML tags', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate(
        '<div><span>content</div>',
      );

      expect(result.warnings).toContain('Possible unclosed HTML tags detected');
    });

    it('should ignore self-closing tags in validation', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate(
        '<div><br><img src="test.jpg"><hr></div>',
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).not.toContain(
        'Possible unclosed HTML tags detected',
      );
    });
  });

  describe('validateStyles', () => {
    it('should validate valid styles', () => {
      const styles = {
        fontSize: '12px',
        color: '#000000',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
      };

      const result = templateValidator.validateStyles(styles);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid fontSize', () => {
      const styles = { fontSize: 'invalid' };

      const result = templateValidator.validateStyles(styles);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid fontSize: invalid');
    });

    it('should return error for invalid color', () => {
      const styles = { color: 'invalid-color' };

      const result = templateValidator.validateStyles(styles);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid color: invalid-color');
    });

    it('should return error for invalid backgroundColor', () => {
      const styles = { backgroundColor: 'not-a-color' };

      const result = templateValidator.validateStyles(styles);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid backgroundColor: not-a-color');
    });

    it('should return error for invalid textAlign', () => {
      const styles = { textAlign: 'invalid-align' };

      const result = templateValidator.validateStyles(styles);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid textAlign: invalid-align');
    });

    it('should validate custom CSS', () => {
      const styles = {
        customCSS: '.header { font-weight: bold; }',
      };

      const result = templateValidator.validateStyles(styles);

      expect(result.isValid).toBe(true);
    });

    it('should return error for dangerous custom CSS', () => {
      const styles = {
        customCSS: '@import url("evil.css"); .test { color: red; }',
      };

      const result = templateValidator.validateStyles(styles);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Custom CSS contains potentially dangerous content',
      );
    });

    it('should warn about very long custom CSS', () => {
      const styles = {
        customCSS: '.test { color: red; }'.repeat(1000),
      };

      const result = templateValidator.validateStyles(styles);

      expect(result.warnings).toContain(
        'Custom CSS is very long and may impact performance',
      );
    });
  });

  describe('validateHeight', () => {
    it('should validate valid height formats', () => {
      const validHeights = [
        '50px',
        '10mm',
        '2cm',
        '1in',
        '100%',
        '12pt',
        '50.5px',
      ];

      validHeights.forEach((height) => {
        const config = { enabled: true, template: 'test', height };
        mockVariableProcessor.extractVariables.mockReturnValue([]);

        const result = templateValidator.validateConfig(
          config as HeaderConfig,
          'header',
        );

        expect(result.isValid).toBe(true);
      });
    });

    it('should return error for invalid height formats', () => {
      const invalidHeights = ['50', 'px50', '50pixels', 'auto', 'inherit'];

      invalidHeights.forEach((height) => {
        const config = { enabled: true, template: 'test', height };
        mockVariableProcessor.extractVariables.mockReturnValue([]);

        const result = templateValidator.validateConfig(
          config as HeaderConfig,
          'header',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Invalid height format: ${height}`);
      });
    });
  });

  describe('validateBraces', () => {
    it('should validate properly matched braces', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([
        'title',
        'author',
      ]);

      const result = templateValidator.validateTemplate(
        '{{title}} by {{author}}',
      );

      expect(result.isValid).toBe(true);
    });

    it('should detect unmatched opening braces', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate('{{title by author');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unmatched braces found in template');
    });

    it('should detect unmatched closing braces', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate('title}} by author');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unmatched braces found in template');
    });

    it('should detect nested variables', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateTemplate('{{title {{author}}}}');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unmatched braces found in template');
    });
  });

  describe('validateVisibilitySettings', () => {
    it('should warn when header/footer will not be visible on any page', () => {
      const config = {
        enabled: true,
        template: 'test',
        showOnEvenPages: false,
        showOnOddPages: false,
      };
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateConfig(
        config as HeaderConfig,
        'header',
      );

      expect(result.warnings).toContain(
        'Header/footer will not be visible on any page due to visibility settings',
      );
    });

    it('should warn when header/footer is completely disabled', () => {
      const config = {
        enabled: true,
        template: 'test',
        showOnFirstPage: false,
        showOnEvenPages: false,
        showOnOddPages: false,
      };
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateConfig(
        config as HeaderConfig,
        'header',
      );

      expect(result.warnings).toContain(
        'Header/footer is completely disabled by visibility settings',
      );
    });

    it('should not warn for valid visibility settings', () => {
      const config = {
        enabled: true,
        template: 'test',
        showOnFirstPage: true,
        showOnEvenPages: true,
        showOnOddPages: false,
      };
      mockVariableProcessor.extractVariables.mockReturnValue([]);

      const result = templateValidator.validateConfig(
        config as HeaderConfig,
        'header',
      );

      expect(result.warnings).not.toContain(
        'Header/footer will not be visible on any page due to visibility settings',
      );
      expect(result.warnings).not.toContain(
        'Header/footer is completely disabled by visibility settings',
      );
    });
  });

  describe('Color and Size Validation', () => {
    it('should validate various color formats', () => {
      const validColors = [
        '#000',
        '#000000',
        'red',
        'rgb(255, 0, 0)',
        'rgba(255, 0, 0, 0.5)',
      ];

      validColors.forEach((color) => {
        const styles = { color };
        const result = templateValidator.validateStyles(styles);
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate various size formats', () => {
      const validSizes = [
        '12px',
        '1em',
        '1rem',
        '100%',
        '10pt',
        '5mm',
        '1cm',
        '0.5in',
        '12.5px',
      ];

      validSizes.forEach((fontSize) => {
        const styles = { fontSize };
        const result = templateValidator.validateStyles(styles);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Custom CSS Validation', () => {
    it('should detect various dangerous CSS patterns', () => {
      const dangerousPatterns = [
        '@import url("evil.css");',
        'background: url("javascript:alert(1)");',
        'behavior: url("evil.htc");',
        '-moz-binding: url("evil.xml");',
        'filter: expression(alert(1));',
      ];

      dangerousPatterns.forEach((css) => {
        const styles = { customCSS: css };
        const result = templateValidator.validateStyles(styles);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Custom CSS contains potentially dangerous content',
        );
      });
    });
  });

  describe('Known Variables', () => {
    it('should recognize all known variables as valid', () => {
      const knownVariables = [
        'title',
        'author',
        'date',
        'pageNumber',
        'totalPages',
        'fileName',
        'chapterTitle',
        'sectionTitle',
      ];

      mockVariableProcessor.extractVariables.mockReturnValue(knownVariables);

      const template = knownVariables.map((v) => `{{${v}}}`).join(' ');
      const result = templateValidator.validateTemplate(template);

      expect(result.warnings).not.toContain(
        expect.stringContaining('Unknown variables found'),
      );
    });

    it('should identify unknown variables', () => {
      mockVariableProcessor.extractVariables.mockReturnValue([
        'customVar',
        'anotherVar',
      ]);

      const result = templateValidator.validateTemplate(
        '{{customVar}} {{anotherVar}}',
      );

      expect(result.warnings).toContain(
        'Unknown variables found: {{customVar}}, {{anotherVar}}',
      );
    });
  });
});
