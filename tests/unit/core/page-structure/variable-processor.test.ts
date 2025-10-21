import { VariableProcessor } from '../../../../src/core/page-structure/variable-processor';
import {
  PageContext,
  TemplateVariable,
} from '../../../../src/core/page-structure/types';

describe('VariableProcessor', () => {
  let processor: VariableProcessor;
  let mockContext: PageContext;

  beforeEach(() => {
    processor = new VariableProcessor();
    mockContext = {
      pageNumber: 5,
      totalPages: 20,
      title: 'Test Document',
      author: 'John Doe',
      date: '2024-01-15',
      fileName: 'test-file.md',
      chapterTitle: 'Introduction',
      sectionTitle: 'Overview',
    };
  });

  describe('processTemplate', () => {
    it('should replace basic variables', () => {
      const template = 'Title: {{title}}, Author: {{author}}';

      const result = processor.processTemplate(template, mockContext);

      expect(result).toBe('Title: Test Document, Author: John Doe');
    });

    it('should handle page numbers', () => {
      const template = 'Page {{pageNumber}} of {{totalPages}}';

      const result = processor.processTemplate(template, mockContext);

      expect(result).toBe('Page 5 of 20');
    });

    it('should handle missing optional fields', () => {
      const contextWithoutAuthor = { ...mockContext, author: undefined };
      const template = 'Title: {{title}}, Author: {{author}}';

      const result = processor.processTemplate(template, contextWithoutAuthor);

      expect(result).toBe('Title: Test Document, Author: ');
    });

    it('should process custom variables', () => {
      const template = 'Custom: {{custom}}, Title: {{title}}';
      const customVariables: TemplateVariable[] = [
        {
          name: 'custom',
          value: 'Custom Value',
        },
      ];

      const result = processor.processTemplate(
        template,
        mockContext,
        customVariables,
      );

      expect(result).toBe('Custom: Custom Value, Title: Test Document');
    });

    it('should handle formatted custom variables', () => {
      const template = 'Formatted: {{formatted}}';
      const customVariables: TemplateVariable[] = [
        {
          name: 'formatted',
          value: 1234,
          formatter: (value) => `$${value.toLocaleString()}`,
        },
      ];

      const result = processor.processTemplate(
        template,
        mockContext,
        customVariables,
      );

      expect(result).toBe('Formatted: $1,234');
    });

    it('should process conditional statements', () => {
      const template = '{{#if author}}Author: {{author}}{{/if}}';

      const result = processor.processTemplate(template, mockContext);

      expect(result).toBe('Author: John Doe');
    });

    it('should handle false conditionals', () => {
      const contextWithoutAuthor = { ...mockContext, author: undefined };
      const template = '{{#if author}}Author: {{author}}{{/if}}Not conditional';

      const result = processor.processTemplate(template, contextWithoutAuthor);

      expect(result).toBe('Not conditional');
    });

    it('should handle page number conditionals', () => {
      const template = '{{#if pageNumber > 1}}Page {{pageNumber}}{{/if}}';

      const result1 = processor.processTemplate(template, {
        ...mockContext,
        pageNumber: 1,
      });
      const result2 = processor.processTemplate(template, {
        ...mockContext,
        pageNumber: 2,
      });

      expect(result1).toBe('');
      expect(result2).toBe('Page 2');
    });

    it('should clean up unprocessed variables', () => {
      const template = 'Known: {{title}}, Unknown: {{unknown}}';

      const result = processor.processTemplate(template, mockContext);

      expect(result).toBe('Known: Test Document, Unknown: ');
    });
  });

  describe('extractVariables', () => {
    it('should extract all variables from template', () => {
      const template =
        'Title: {{title}}, Author: {{author}}, Page: {{pageNumber}}';

      const variables = processor.extractVariables(template);

      expect(variables).toContain('title');
      expect(variables).toContain('author');
      expect(variables).toContain('pageNumber');
      expect(variables).toHaveLength(3);
    });

    it('should handle duplicate variables', () => {
      const template = '{{title}} - {{title}} by {{author}}';

      const variables = processor.extractVariables(template);

      expect(variables).toContain('title');
      expect(variables).toContain('author');
      expect(variables).toHaveLength(2);
    });

    it('should handle complex templates with conditionals', () => {
      const template = '{{#if author}}{{author}} - {{/if}}{{title}} ({{date}})';

      const variables = processor.extractVariables(template);

      expect(variables).toContain('author');
      expect(variables).toContain('title');
      expect(variables).toContain('date');
    });
  });

  describe('validateVariables', () => {
    it('should identify valid and invalid variables', () => {
      const template =
        'Valid: {{title}}, Invalid: {{invalid}}, Valid: {{author}}';

      const result = processor.validateVariables(template, mockContext);

      expect(result.valid).toContain('title');
      expect(result.valid).toContain('author');
      expect(result.invalid).toContain('invalid');
      expect(result.warnings).toContain('Unknown variable: {{invalid}}');
    });

    it('should handle all valid variables', () => {
      const template = '{{title}} {{author}} {{date}} {{pageNumber}}';

      const result = processor.validateVariables(template, mockContext);

      expect(result.invalid).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.valid).toHaveLength(4);
    });
  });

  describe('static utility methods', () => {
    describe('formatDate', () => {
      it('should format date with default locale', () => {
        const date = new Date('2024-01-15');

        const result = VariableProcessor.formatDate(date);

        expect(result).toMatch(/1\/15\/2024|15\/1\/2024|2024\/1\/15/); // Different locales might format differently
      });

      it('should handle string dates', () => {
        const result = VariableProcessor.formatDate('2024-01-15');

        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('formatPageNumber', () => {
      it('should pad page numbers correctly', () => {
        const result1 = VariableProcessor.formatPageNumber(5, 100);
        const result2 = VariableProcessor.formatPageNumber(5, 10);

        expect(result1).toBe('005');
        expect(result2).toBe('05');
      });

      it('should handle single digit total', () => {
        const result = VariableProcessor.formatPageNumber(3, 5);

        expect(result).toBe('3');
      });
    });

    describe('createVariable', () => {
      it('should create basic variable', () => {
        const variable = VariableProcessor.createVariable('test', 'value');

        expect(variable.name).toBe('test');
        expect(variable.value).toBe('value');
        expect(variable.formatter).toBeUndefined();
      });

      it('should create variable with formatter', () => {
        const formatter = (value: number) => `$${value}`;
        const variable = VariableProcessor.createVariable(
          'price',
          100,
          formatter,
        );

        expect(variable.name).toBe('price');
        expect(variable.value).toBe(100);
        expect(variable.formatter).toBe(formatter);
      });
    });
  });
});
