/**
 * Unit tests for InquirerHelpers
 */

import {
  InquirerHelpers,
  BackNavigationError,
  handleNavigationResult,
} from '../../../../src/cli/utils/inquirer-helpers';

// Mock inquirer
const mockPrompt = jest.fn();

jest.mock('inquirer', () => ({
  default: {
    prompt: mockPrompt,
  },
  prompt: mockPrompt,
}));

describe('InquirerHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BackNavigationError', () => {
    it('should create BackNavigationError with default message', () => {
      const error = new BackNavigationError();

      expect(error.name).toBe('BackNavigationError');
      expect(error.message).toBe('BACK_TO_PREVIOUS_MENU');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create BackNavigationError with custom message', () => {
      const customMessage = 'Custom back message';
      const error = new BackNavigationError(customMessage);

      expect(error.name).toBe('BackNavigationError');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('handleNavigationResult', () => {
    it('should return value when not back navigation', () => {
      const value = 'normal_value';
      const result = handleNavigationResult(value);

      expect(result).toBe(value);
    });

    it('should return null and call onBack for __back__ value', () => {
      const onBack = jest.fn();
      const result = handleNavigationResult('__back__', onBack);

      expect(result).toBeNull();
      expect(onBack).toHaveBeenCalled();
    });

    it('should return null for back value without onBack callback', () => {
      const result = handleNavigationResult('back');

      expect(result).toBeNull();
    });
  });

  describe('prompt method', () => {
    it('should call inquirer prompt and return value', async () => {
      const options = { name: 'test', message: 'Test message' };
      const mockResult = { test: 'test_value' };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.prompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([options]);
      expect(result).toBe('test_value');
    });

    it('should handle prompt errors', async () => {
      const options = { name: 'test', message: 'Test message' };
      const error = new Error('Prompt error');
      mockPrompt.mockRejectedValue(error);

      await expect(InquirerHelpers.prompt(options)).rejects.toThrow(error);
    });
  });

  describe('listPrompt method', () => {
    it('should create list prompt with choices', async () => {
      const options = {
        name: 'test',
        message: 'Select option',
        choices: ['Option 1', 'Option 2'],
      };
      const mockResult = { test: 'Option 1' };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.listPrompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([{ type: 'list', ...options }]);
      expect(result).toBe('Option 1');
    });

    it('should handle empty choices', async () => {
      const options = {
        name: 'test',
        message: 'Select option',
        choices: [],
      };
      const mockResult = { test: null };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.listPrompt(options);

      expect(result).toBeNull();
    });

    it('should handle optional parameters', async () => {
      const options = {
        name: 'test',
        message: 'Select option',
        choices: ['Option 1'],
        default: 'Option 1',
        pageSize: 10,
      };
      const mockResult = { test: 'Option 1' };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.listPrompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([{ type: 'list', ...options }]);
      expect(result).toBe('Option 1');
    });
  });

  describe('listWithBackNavigation method', () => {
    it('should add default back option to choices', async () => {
      const options = {
        message: 'Select option',
        choices: ['Option 1', 'Option 2'],
      };
      const mockResult = { selection: 'Option 1' };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.listWithBackNavigation(options);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'selection',
          message: options.message,
          choices: [
            { name: '0. Return to Main Menu', value: '__back__' },
            ...options.choices,
          ],
          default: undefined,
          pageSize: undefined,
        },
      ]);
      expect(result).toBe('Option 1');
    });

    it('should use custom back label and value', async () => {
      const options = {
        message: 'Select option',
        choices: ['Option 1'],
        backLabel: 'Go Back',
        backValue: 'custom_back',
      };
      const mockResult = { selection: 'custom_back' };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.listWithBackNavigation(options);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'selection',
          message: options.message,
          choices: [
            { name: 'Go Back', value: 'custom_back' },
            ...options.choices,
          ],
          default: undefined,
          pageSize: undefined,
        },
      ]);
      expect(result).toBe('custom_back');
    });
  });

  describe('confirmPrompt method', () => {
    it('should create confirm prompt with default true', async () => {
      const message = 'Are you sure?';
      const mockResult = { confirmed: true };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.confirmPrompt(message);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirmed',
          message,
          default: true,
        },
      ]);
      expect(result).toBe(true);
    });

    it('should create confirm prompt with custom default', async () => {
      const message = 'Are you sure?';
      const defaultValue = false;
      const mockResult = { confirmed: false };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.confirmPrompt(message, defaultValue);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirmed',
          message,
          default: false,
        },
      ]);
      expect(result).toBe(false);
    });
  });

  describe('inputPrompt method', () => {
    it('should create input prompt', async () => {
      const options = {
        message: 'Enter value',
        default: 'default_value',
      };
      const mockResult = { input: 'user_input' };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.inputPrompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'input',
          message: options.message,
          default: options.default,
          validate: undefined,
        },
      ]);
      expect(result).toBe('user_input');
    });

    it('should handle validation function', async () => {
      const validate = jest.fn().mockReturnValue(true);
      const options = {
        message: 'Enter value',
        validate,
      };
      const mockResult = { input: 'validated_input' };
      mockPrompt.mockResolvedValue(mockResult);

      const result = await InquirerHelpers.inputPrompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'input',
          message: options.message,
          default: undefined,
          validate: validate,
        },
      ]);
      expect(result).toBe('validated_input');
    });
  });

  describe('isBackNavigation method', () => {
    it('should return true for __back__ value', () => {
      expect(InquirerHelpers.isBackNavigation('__back__')).toBe(true);
    });

    it('should return true for back value', () => {
      expect(InquirerHelpers.isBackNavigation('back')).toBe(true);
    });

    it('should return false for other values', () => {
      expect(InquirerHelpers.isBackNavigation('normal_value')).toBe(false);
      expect(InquirerHelpers.isBackNavigation('')).toBe(false);
      expect(InquirerHelpers.isBackNavigation(null)).toBe(false);
      expect(InquirerHelpers.isBackNavigation(undefined)).toBe(false);
    });

    it('should return true for custom back value', () => {
      const customBackValue = 'custom_back';
      expect(
        InquirerHelpers.isBackNavigation('custom_back', customBackValue),
      ).toBe(true);
      expect(
        InquirerHelpers.isBackNavigation('other_value', customBackValue),
      ).toBe(false);
    });

    it('should prioritize custom back value over default values', () => {
      const customBackValue = 'custom_back';
      expect(
        InquirerHelpers.isBackNavigation('__back__', customBackValue),
      ).toBe(false);
      expect(InquirerHelpers.isBackNavigation('back', customBackValue)).toBe(
        false,
      );
      expect(
        InquirerHelpers.isBackNavigation('custom_back', customBackValue),
      ).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle inquirer prompt errors', async () => {
      mockPrompt.mockRejectedValue(new Error('Prompt error'));

      await expect(
        InquirerHelpers.prompt({ name: 'test', message: 'test' }),
      ).rejects.toThrow('Prompt error');
    });
  });
});
