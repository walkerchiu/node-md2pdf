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
  __esModule: true,
  default: {
    prompt: mockPrompt,
  },
}));

describe('InquirerHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BackNavigationError', () => {
    it('should create error with default message', () => {
      const error = new BackNavigationError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('BackNavigationError');
      expect(error.message).toBe('BACK_TO_PREVIOUS_MENU');
    });

    it('should create error with custom message', () => {
      const customMessage = 'Custom back navigation message';
      const error = new BackNavigationError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.name).toBe('BackNavigationError');
    });
  });

  describe('handleNavigationResult', () => {
    it('should return value for non-back navigation', () => {
      const testValue = 'test-value';
      const result = handleNavigationResult(testValue);

      expect(result).toBe(testValue);
    });

    it('should return null for back navigation', () => {
      const result = handleNavigationResult('__back__');

      expect(result).toBeNull();
    });

    it('should call onBack callback for back navigation', () => {
      const mockOnBack = jest.fn();
      const result = handleNavigationResult('back', mockOnBack);

      expect(result).toBeNull();
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should not call onBack callback for non-back navigation', () => {
      const mockOnBack = jest.fn();
      const result = handleNavigationResult('test-value', mockOnBack);

      expect(result).toBe('test-value');
      expect(mockOnBack).not.toHaveBeenCalled();
    });
  });

  describe('InquirerHelpers.isBackNavigation', () => {
    it('should return true for __back__ value', () => {
      expect(InquirerHelpers.isBackNavigation('__back__')).toBe(true);
    });

    it('should return true for back value', () => {
      expect(InquirerHelpers.isBackNavigation('back')).toBe(true);
    });

    it('should return false for other values', () => {
      expect(InquirerHelpers.isBackNavigation('other')).toBe(false);
      expect(InquirerHelpers.isBackNavigation('forward')).toBe(false);
      expect(InquirerHelpers.isBackNavigation('')).toBe(false);
      expect(InquirerHelpers.isBackNavigation(null)).toBe(false);
    });

    it('should return true for custom back value', () => {
      expect(InquirerHelpers.isBackNavigation('custom-back', 'custom-back')).toBe(true);
    });

    it('should return false for non-matching custom back value', () => {
      expect(InquirerHelpers.isBackNavigation('__back__', 'custom-back')).toBe(false);
    });
  });

  describe('InquirerHelpers.prompt', () => {
    it('should call inquirer prompt and return named result', async () => {
      const expectedValue = 'test-value';
      mockPrompt.mockResolvedValue({ testName: expectedValue });

      const options = {
        type: 'input',
        name: 'testName',
        message: 'Test message',
      };

      const result = await InquirerHelpers.prompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([options]);
      expect(result).toBe(expectedValue);
    });
  });

  describe('InquirerHelpers.listPrompt', () => {
    it('should create list prompt with correct options', async () => {
      const expectedValue = 'selected-choice';
      mockPrompt.mockResolvedValue({ testList: expectedValue });

      const options = {
        message: 'Select an option',
        choices: ['Option 1', 'Option 2'],
        name: 'testList',
        default: 'Option 1',
        pageSize: 5,
      };

      const result = await InquirerHelpers.listPrompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([{ type: 'list', ...options }]);
      expect(result).toBe(expectedValue);
    });
  });

  describe('InquirerHelpers.listWithBackNavigation', () => {
    it('should add default back navigation option', async () => {
      const expectedValue = 'selected-choice';
      mockPrompt.mockResolvedValue({ selection: expectedValue });

      const options = {
        message: 'Select an option',
        choices: ['Option 1', 'Option 2'],
      };

      const result = await InquirerHelpers.listWithBackNavigation(options);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'selection',
          message: options.message,
          choices: [{ name: '0. Return to Main Menu', value: '__back__' }, 'Option 1', 'Option 2'],
          default: undefined,
          pageSize: undefined,
        },
      ]);
      expect(result).toBe(expectedValue);
    });

    it('should use custom back navigation options', async () => {
      const expectedValue = 'selected-choice';
      mockPrompt.mockResolvedValue({ selection: expectedValue });

      const options = {
        message: 'Select an option',
        choices: ['Option 1', 'Option 2'],
        backLabel: '← Go Back',
        backValue: 'custom-back',
        default: 'Option 1',
        pageSize: 10,
      };

      const result = await InquirerHelpers.listWithBackNavigation(options);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'selection',
          message: options.message,
          choices: [{ name: '← Go Back', value: 'custom-back' }, 'Option 1', 'Option 2'],
          default: 'Option 1',
          pageSize: 10,
        },
      ]);
      expect(result).toBe(expectedValue);
    });
  });

  describe('InquirerHelpers.confirmPrompt', () => {
    it('should create confirm prompt with default true', async () => {
      const expectedValue = true;
      mockPrompt.mockResolvedValue({ confirmed: expectedValue });

      const message = 'Are you sure?';
      const result = await InquirerHelpers.confirmPrompt(message);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirmed',
          message,
          default: true,
        },
      ]);
      expect(result).toBe(expectedValue);
    });

    it('should create confirm prompt with custom default', async () => {
      const expectedValue = false;
      mockPrompt.mockResolvedValue({ confirmed: expectedValue });

      const message = 'Are you sure?';
      const result = await InquirerHelpers.confirmPrompt(message, false);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirmed',
          message,
          default: false,
        },
      ]);
      expect(result).toBe(expectedValue);
    });
  });

  describe('InquirerHelpers.inputPrompt', () => {
    it('should create input prompt with basic options', async () => {
      const expectedValue = 'user-input';
      mockPrompt.mockResolvedValue({ input: expectedValue });

      const options = {
        message: 'Enter your input:',
      };

      const result = await InquirerHelpers.inputPrompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'input',
          message: options.message,
          default: undefined,
          validate: undefined,
        },
      ]);
      expect(result).toBe(expectedValue);
    });

    it('should create input prompt with all options', async () => {
      const expectedValue = 'user-input';
      mockPrompt.mockResolvedValue({ input: expectedValue });

      const mockValidate = jest.fn().mockReturnValue(true);
      const options = {
        message: 'Enter your input:',
        default: 'default-value',
        validate: mockValidate,
      };

      const result = await InquirerHelpers.inputPrompt(options);

      expect(mockPrompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'input',
          message: options.message,
          default: 'default-value',
          validate: mockValidate,
        },
      ]);
      expect(result).toBe(expectedValue);
    });
  });
});
