/**
 * Comprehensive tests for AnchorLinksPrompt
 * Tests user interaction flows, configuration, and prompt validation
 */

import { jest } from '@jest/globals';
import {
  AnchorLinksPrompt,
  AnchorLinksPromptResult,
} from '../../../../src/cli/shared/anchor-links-prompt';
import {
  AnchorLinksOptions,
  AnchorLinksDepth,
} from '../../../../src/core/anchor-links/types';
import type { ITranslationManager } from '../../../../src/infrastructure/i18n/types';
import { createMockTranslator } from '../../helpers/mock-translator';

// Mock inquirer with dynamic import support
type PromptQuestion = {
  name?: string;
  message?: string;
  type?: string;
  choices?: { name: string; value: AnchorLinksDepth; short: string }[];
  default?: AnchorLinksDepth;
  pageSize?: number;
};

const mockInquirerPrompt = jest.fn() as jest.MockedFunction<
  (questions: PromptQuestion[]) => Promise<{ anchorDepth: AnchorLinksDepth }>
>;

jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: mockInquirerPrompt,
  },
}));

describe('AnchorLinksPrompt', () => {
  let mockTranslator: ReturnType<typeof createMockTranslator>;
  let anchorLinksPrompt: AnchorLinksPrompt;

  beforeEach(() => {
    mockInquirerPrompt.mockReset();
    mockTranslator = createMockTranslator();

    // Setup default translation returns
    mockTranslator.t.mockImplementation(
      (key: string, params?: Record<string, string | number>) => {
        const translations: Record<string, string> = {
          'interactive.anchorDepthOptions.none': 'None (disable anchor links)',
          'interactive.anchorDepthOptions.2':
            'H2 - Include up to heading level 2',
          'interactive.anchorDepthOptions.3':
            'H3 - Include up to heading level 3',
          'interactive.anchorDepthOptions.4':
            'H4 - Include up to heading level 4',
          'interactive.anchorDepthOptions.5':
            'H5 - Include up to heading level 5',
          'interactive.anchorDepthOptions.6':
            'H6 - Include up to heading level 6',
          'interactive.enableBackToTocLinks':
            'Enable back-to-TOC anchor links after sections?',
          'anchorLinks.backToToc': '↑ Back to TOC',
          'interactive.no': 'No',
          'interactive.anchorLinksSummary':
            'Enabled (depth: {{depth}}, align: {{alignment}})',
          'interactive.alignment.right': 'right',
          'interactive.alignment.left': 'left',
          'interactive.alignment.center': 'center',
        };

        let result = translations[key] || key;
        if (params) {
          for (const [param, value] of Object.entries(params)) {
            result = result.replace(`{{${param}}}`, value.toString());
          }
        }
        return result;
      },
    );

    anchorLinksPrompt = new AnchorLinksPrompt(mockTranslator);
  });

  describe('constructor', () => {
    it('should initialize with translation manager', () => {
      expect(anchorLinksPrompt).toBeInstanceOf(AnchorLinksPrompt);
      expect(mockTranslator).toBeDefined();
    });

    it('should store translation manager reference', () => {
      const customTranslator = createMockTranslator();
      const prompt = new AnchorLinksPrompt(customTranslator);

      expect(prompt).toBeInstanceOf(AnchorLinksPrompt);
    });
  });

  describe('promptAnchorLinks method', () => {
    it('should prompt user with anchor depth options', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: 3 });

      const result = await anchorLinksPrompt.promptAnchorLinks();

      expect(mockInquirerPrompt).toHaveBeenCalledTimes(1);
      expect(mockInquirerPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'anchorDepth',
          message: 'Enable back-to-TOC anchor links after sections?',
          default: 3,
          pageSize: 8,
        }),
      ]);
      expect(result.enableAnchorLinks).toBe(true);
      expect(result.anchorDepth).toBe(3);
    });

    it('should provide all anchor depth choices', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: 2 });

      await anchorLinksPrompt.promptAnchorLinks();

      const promptCall = mockInquirerPrompt.mock
        .calls[0][0] as PromptQuestion[];
      const choices = promptCall[0].choices!;

      expect(choices).toHaveLength(6);
      expect(choices[0]).toEqual({
        name: 'None (disable anchor links)',
        value: 'none',
        short: 'None (disable anchor links)',
      });
      expect(choices[1]).toEqual({
        name: 'H2 - Include up to heading level 2',
        value: 2,
        short: 'H2',
      });
      expect(choices[5]).toEqual({
        name: 'H6 - Include up to heading level 6',
        value: 6,
        short: 'H6',
      });
    });

    it('should return disabled state when none is selected', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: 'none' });

      const result = await anchorLinksPrompt.promptAnchorLinks();

      expect(result.enableAnchorLinks).toBe(false);
      expect(result.anchorDepth).toBe('none');
    });

    it('should return enabled state for numeric depth', async () => {
      const testDepths: (2 | 3 | 4 | 5 | 6)[] = [2, 3, 4, 5, 6];

      for (const depth of testDepths) {
        mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: depth });

        const result = await anchorLinksPrompt.promptAnchorLinks();

        expect(result.enableAnchorLinks).toBe(true);
        expect(result.anchorDepth).toBe(depth);

        mockInquirerPrompt.mockReset();
      }
    });

    it('should use correct default depth', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: 3 });

      await anchorLinksPrompt.promptAnchorLinks();

      const promptCall = mockInquirerPrompt.mock
        .calls[0][0] as PromptQuestion[];
      expect(promptCall[0].default).toBe(3);
    });

    it('should handle inquirer errors properly', async () => {
      const testError = new Error('Inquirer failed');
      mockInquirerPrompt.mockRejectedValueOnce(testError);

      await expect(anchorLinksPrompt.promptAnchorLinks()).rejects.toThrow(
        'Inquirer failed',
      );
    });

    it('should use correct page size for choices', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: 4 });

      await anchorLinksPrompt.promptAnchorLinks();

      const promptCall = mockInquirerPrompt.mock
        .calls[0][0] as PromptQuestion[];
      expect(promptCall[0].pageSize).toBe(8);
    });
  });

  describe('createAnchorLinksOptions method', () => {
    it('should return undefined for disabled anchor links', () => {
      const promptResult: AnchorLinksPromptResult = {
        enableAnchorLinks: false,
        anchorDepth: 'none',
      };

      const options = anchorLinksPrompt.createAnchorLinksOptions(promptResult);

      expect(options).toBeUndefined();
    });

    it('should return undefined when depth is none', () => {
      const promptResult: AnchorLinksPromptResult = {
        enableAnchorLinks: false,
        anchorDepth: 'none',
      };

      const options = anchorLinksPrompt.createAnchorLinksOptions(promptResult);

      expect(options).toBeUndefined();
    });

    it('should create options for enabled anchor links', () => {
      const promptResult: AnchorLinksPromptResult = {
        enableAnchorLinks: true,
        anchorDepth: 3,
      };

      const options = anchorLinksPrompt.createAnchorLinksOptions(promptResult);

      expect(options).toBeDefined();
      expect(options!.enabled).toBe(true);
      expect(options!.anchorDepth).toBe(3);
      expect(options!.linkText).toBe('↑ Back to TOC');
      expect(options!.alignment).toBe('right');
    });

    it('should set correct CSS classes', () => {
      const promptResult: AnchorLinksPromptResult = {
        enableAnchorLinks: true,
        anchorDepth: 2,
      };

      const options = anchorLinksPrompt.createAnchorLinksOptions(promptResult);

      expect(options!.cssClasses).toEqual({
        container: 'back-to-toc-container',
        link: 'back-to-toc-link',
        text: 'back-to-toc-text',
      });
    });

    it('should handle all valid depth levels', () => {
      const validDepths: (2 | 3 | 4 | 5 | 6)[] = [2, 3, 4, 5, 6];

      validDepths.forEach((depth) => {
        const promptResult: AnchorLinksPromptResult = {
          enableAnchorLinks: true,
          anchorDepth: depth,
        };

        const options =
          anchorLinksPrompt.createAnchorLinksOptions(promptResult);

        expect(options).toBeDefined();
        expect(options!.anchorDepth).toBe(depth);
        expect(options!.enabled).toBe(true);
      });
    });

    it('should use translated link text', () => {
      mockTranslator.t.mockReturnValueOnce('Retour au sommaire');

      const promptResult: AnchorLinksPromptResult = {
        enableAnchorLinks: true,
        anchorDepth: 4,
      };

      const options = anchorLinksPrompt.createAnchorLinksOptions(promptResult);

      expect(mockTranslator.t).toHaveBeenCalledWith('anchorLinks.backToToc');
      expect(options!.linkText).toBe('Retour au sommaire');
    });
  });

  describe('formatAnchorLinksSummary method', () => {
    it('should format summary for disabled options', () => {
      const summary = anchorLinksPrompt.formatAnchorLinksSummary(undefined);

      expect(summary).toBe('No');
      expect(mockTranslator.t).toHaveBeenCalledWith('interactive.no');
    });

    it('should format summary for disabled options object', () => {
      const disabledOptions: AnchorLinksOptions = {
        enabled: false,
        anchorDepth: 'none',
      };

      const summary =
        anchorLinksPrompt.formatAnchorLinksSummary(disabledOptions);

      expect(summary).toBe('No');
    });

    it('should format summary for enabled options', () => {
      const enabledOptions: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 3,
        alignment: 'right',
      };

      const summary =
        anchorLinksPrompt.formatAnchorLinksSummary(enabledOptions);

      expect(summary).toBe('Enabled (depth: 3, align: right)');
      expect(mockTranslator.t).toHaveBeenCalledWith(
        'interactive.anchorLinksSummary',
        {
          depth: 3,
          alignment: 'right',
        },
      );
      expect(mockTranslator.t).toHaveBeenCalledWith(
        'interactive.alignment.right',
      );
    });

    it('should handle different alignment options', () => {
      const alignments: ('left' | 'center' | 'right')[] = [
        'left',
        'center',
        'right',
      ];

      alignments.forEach((alignment) => {
        const options: AnchorLinksOptions = {
          enabled: true,
          anchorDepth: 2,
          alignment,
        };

        anchorLinksPrompt.formatAnchorLinksSummary(options);

        expect(mockTranslator.t).toHaveBeenCalledWith(
          `interactive.alignment.${alignment}`,
        );
      });
    });

    it('should format summary with different depth levels', () => {
      const depths: (2 | 3 | 4 | 5 | 6)[] = [2, 3, 4, 5, 6];

      depths.forEach((depth) => {
        const options: AnchorLinksOptions = {
          enabled: true,
          anchorDepth: depth,
          alignment: 'center',
        };

        const summary = anchorLinksPrompt.formatAnchorLinksSummary(options);

        expect(summary).toContain(`depth: ${depth}`);
      });
    });

    it('should handle missing alignment gracefully', () => {
      const optionsWithoutAlignment: AnchorLinksOptions = {
        enabled: true,
        anchorDepth: 4,
      };

      const summary = anchorLinksPrompt.formatAnchorLinksSummary(
        optionsWithoutAlignment,
      );

      expect(summary).toContain('depth: 4');
      expect(mockTranslator.t).toHaveBeenCalledWith(
        'interactive.alignment.undefined',
      );
    });
  });

  describe('Complete workflow integration', () => {
    it('should handle complete enabled workflow', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: 4 });

      const promptResult = await anchorLinksPrompt.promptAnchorLinks();
      const options = anchorLinksPrompt.createAnchorLinksOptions(promptResult);
      const summary = anchorLinksPrompt.formatAnchorLinksSummary(options);

      expect(promptResult.enableAnchorLinks).toBe(true);
      expect(promptResult.anchorDepth).toBe(4);
      expect(options).toBeDefined();
      expect(options!.enabled).toBe(true);
      expect(options!.anchorDepth).toBe(4);
      expect(summary).toBe('Enabled (depth: 4, align: right)');
    });

    it('should handle complete disabled workflow', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: 'none' });

      const promptResult = await anchorLinksPrompt.promptAnchorLinks();
      const options = anchorLinksPrompt.createAnchorLinksOptions(promptResult);
      const summary = anchorLinksPrompt.formatAnchorLinksSummary(options);

      expect(promptResult.enableAnchorLinks).toBe(false);
      expect(promptResult.anchorDepth).toBe('none');
      expect(options).toBeUndefined();
      expect(summary).toBe('No');
    });

    it('should maintain consistency across all depth levels', async () => {
      const depths: AnchorLinksDepth[] = ['none', 2, 3, 4, 5, 6];

      for (const depth of depths) {
        mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: depth });

        const promptResult = await anchorLinksPrompt.promptAnchorLinks();
        const options =
          anchorLinksPrompt.createAnchorLinksOptions(promptResult);

        if (depth === 'none') {
          expect(promptResult.enableAnchorLinks).toBe(false);
          expect(options).toBeUndefined();
        } else {
          expect(promptResult.enableAnchorLinks).toBe(true);
          expect(options).toBeDefined();
          expect(options!.anchorDepth).toBe(depth);
        }

        mockInquirerPrompt.mockReset();
      }
    });
  });

  describe('Translation integration', () => {
    it('should use all expected translation keys', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ anchorDepth: 3 });

      await anchorLinksPrompt.promptAnchorLinks();

      const expectedKeys = [
        'interactive.anchorDepthOptions.none',
        'interactive.anchorDepthOptions.2',
        'interactive.anchorDepthOptions.3',
        'interactive.anchorDepthOptions.4',
        'interactive.anchorDepthOptions.5',
        'interactive.anchorDepthOptions.6',
        'interactive.enableBackToTocLinks',
      ];

      expectedKeys.forEach((key) => {
        expect(mockTranslator.t).toHaveBeenCalledWith(key);
      });
    });

    it('should handle missing translations gracefully', () => {
      mockTranslator.t.mockImplementation((key: string) => key);

      const promptResult: AnchorLinksPromptResult = {
        enableAnchorLinks: true,
        anchorDepth: 2,
      };

      const options = anchorLinksPrompt.createAnchorLinksOptions(promptResult);
      const summary = anchorLinksPrompt.formatAnchorLinksSummary(options);

      expect(options!.linkText).toBe('anchorLinks.backToToc');
      expect(summary).toContain('interactive.anchorLinksSummary');
    });
  });

  describe('Error handling', () => {
    it('should propagate inquirer import errors', async () => {
      const importError = new Error('Failed to import inquirer');
      mockInquirerPrompt.mockRejectedValueOnce(importError);

      await expect(anchorLinksPrompt.promptAnchorLinks()).rejects.toThrow(
        'Failed to import inquirer',
      );
    });

    it('should handle translation manager errors', () => {
      mockTranslator.t.mockImplementation(() => {
        throw new Error('Translation error');
      });

      expect(() => {
        const promptResult: AnchorLinksPromptResult = {
          enableAnchorLinks: true,
          anchorDepth: 3,
        };
        anchorLinksPrompt.createAnchorLinksOptions(promptResult);
      }).toThrow('Translation error');
    });
  });
});
