/**
 * Unit tests for Value Object Base Class
 */

import {
  ValueObject,
  ValueObjectValidationError,
} from '../../../../../src/core/domain/value-objects/value-object.base';

// Test implementation of ValueObject
class TestValueObject extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new ValueObjectValidationError(
        'TestValueObject',
        value,
        'non-empty-string',
        'Value must be a non-empty string',
      );
    }
    if (value.length < 3) {
      throw new ValueObjectValidationError(
        'TestValueObject',
        value,
        'minimum-length',
        'Value must be at least 3 characters long',
      );
    }
  }

  get value(): string {
    return this._value;
  }
}

// Complex object test implementation
interface TestComplexData {
  name: string;
  age: number;
  tags: string[];
}

class TestComplexValueObject extends ValueObject<TestComplexData> {
  constructor(value: TestComplexData) {
    super(value);
  }

  protected validate(value: TestComplexData): void {
    if (!value || typeof value !== 'object') {
      throw new ValueObjectValidationError(
        'TestComplexValueObject',
        value,
        'valid-object',
        'Value must be a valid object',
      );
    }
    if (!value.name || typeof value.name !== 'string') {
      throw new ValueObjectValidationError(
        'TestComplexValueObject',
        value.name,
        'valid-name',
        'Name must be a valid string',
      );
    }
  }

  get data(): TestComplexData {
    return this._value;
  }
}

describe('ValueObject Base Class', () => {
  describe('constructor and validation', () => {
    it('should create value object with valid input', () => {
      const vo = new TestValueObject('test123');
      expect(vo.value).toBe('test123');
    });

    it('should throw validation error for invalid input', () => {
      expect(() => new TestValueObject('')).toThrow(ValueObjectValidationError);
      expect(() => new TestValueObject('12')).toThrow(
        ValueObjectValidationError,
      );
    });

    it('should throw validation error with proper details', () => {
      try {
        new TestValueObject('');
      } catch (error) {
        expect(error).toBeInstanceOf(ValueObjectValidationError);
        const validationError = error as ValueObjectValidationError;
        expect(validationError.className).toBe('TestValueObject');
        expect(validationError.invalidValue).toBe('');
        expect(validationError.validationRule).toBe('non-empty-string');
      }
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      const vo = new TestValueObject('test123');
      const originalValue = vo.value;

      // Value should be frozen and unchangeable
      expect(Object.isFrozen(vo.value)).toBe(true);
      expect(vo.value).toBe(originalValue);
    });

    it('should handle complex objects immutability', () => {
      const data: TestComplexData = {
        name: 'John',
        age: 30,
        tags: ['developer', 'typescript'],
      };
      const vo = new TestComplexValueObject(data);

      // Original data modification should not affect value object
      data.name = 'Modified';
      data.tags.push('modified');

      expect(vo.data.name).toBe('John');
      expect(vo.data.tags).toEqual(['developer', 'typescript']);
    });

    it('should prevent modification of returned values', () => {
      const vo = new TestComplexValueObject({
        name: 'John',
        age: 30,
        tags: ['developer'],
      });

      // Deep freeze should make nested objects immutable
      expect(Object.isFrozen(vo.data)).toBe(true);
      expect(Object.isFrozen(vo.data.tags)).toBe(true);

      // Original values should remain unchanged
      expect(vo.data.name).toBe('John');
      expect(vo.data.tags).toEqual(['developer']);
    });
  });

  describe('equality comparison', () => {
    it('should be equal for same primitive values', () => {
      const vo1 = new TestValueObject('test123');
      const vo2 = new TestValueObject('test123');
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should not be equal for different primitive values', () => {
      const vo1 = new TestValueObject('test123');
      const vo2 = new TestValueObject('test456');
      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should be equal for same complex objects', () => {
      const data = { name: 'John', age: 30, tags: ['developer'] };
      const vo1 = new TestComplexValueObject(data);
      const vo2 = new TestComplexValueObject({ ...data });
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should not be equal for different complex objects', () => {
      const vo1 = new TestComplexValueObject({
        name: 'John',
        age: 30,
        tags: ['developer'],
      });
      const vo2 = new TestComplexValueObject({
        name: 'Jane',
        age: 30,
        tags: ['developer'],
      });
      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should handle nested object equality', () => {
      const vo1 = new TestComplexValueObject({
        name: 'John',
        age: 30,
        tags: ['developer', 'typescript'],
      });
      const vo2 = new TestComplexValueObject({
        name: 'John',
        age: 30,
        tags: ['developer', 'typescript'],
      });
      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should not be equal for arrays with different order', () => {
      const vo1 = new TestComplexValueObject({
        name: 'John',
        age: 30,
        tags: ['developer', 'typescript'],
      });
      const vo2 = new TestComplexValueObject({
        name: 'John',
        age: 30,
        tags: ['typescript', 'developer'],
      });
      expect(vo1.equals(vo2)).toBe(false);
    });
  });

  describe('toString method', () => {
    it('should return string representation for primitive values', () => {
      const vo = new TestValueObject('test123');
      expect(vo.toString()).toBe('test123');
    });

    it('should return JSON string representation for complex objects', () => {
      const vo = new TestComplexValueObject({
        name: 'John',
        age: 30,
        tags: ['developer'],
      });
      const expected = JSON.stringify({
        name: 'John',
        age: 30,
        tags: ['developer'],
      });
      expect(vo.toString()).toBe(expected);
    });
  });

  describe('cloneDeep functionality', () => {
    it('should create deep copies of complex objects', () => {
      const original = {
        name: 'John',
        age: 30,
        tags: ['developer'],
      };
      const vo = new TestComplexValueObject(original);

      // Modify original after creation
      original.tags.push('modified');

      // Value object should be unaffected
      expect(vo.data.tags).toEqual(['developer']);
    });

    it('should handle null and undefined values', () => {
      expect(() => new TestValueObject(null as any)).toThrow(
        ValueObjectValidationError,
      );
      expect(() => new TestValueObject(undefined as any)).toThrow(
        ValueObjectValidationError,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays in complex objects', () => {
      const vo = new TestComplexValueObject({
        name: 'John',
        age: 30,
        tags: [],
      });
      expect(vo.data.tags).toEqual([]);
    });

    it('should handle special characters in strings', () => {
      const specialString = 'test with 特殊字符 and émojis 🚀';
      const vo = new TestValueObject(specialString);
      expect(vo.value).toBe(specialString);
    });
  });
});

describe('ValueObjectValidationError', () => {
  it('should create error with all required properties', () => {
    const error = new ValueObjectValidationError(
      'TestClass',
      'invalidValue',
      'test-rule',
      'Test error message',
    );

    expect(error.name).toBe('ValueObjectValidationError');
    expect(error.className).toBe('TestClass');
    expect(error.invalidValue).toBe('invalidValue');
    expect(error.validationRule).toBe('test-rule');
    expect(error.message).toContain('TestClass');
    expect(error.message).toContain('test-rule');
  });

  it('should be instance of Error', () => {
    const error = new ValueObjectValidationError(
      'TestClass',
      'invalidValue',
      'test-rule',
      'Test error message',
    );
    expect(error).toBeInstanceOf(Error);
  });
});
