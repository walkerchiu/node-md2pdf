/**
 * Base Value Object class
 * Implements the core characteristics of a Value Object:
 * - Immutability
 * - Value-based equality
 * - Self-validation
 */

export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this.validate(value);
    this._value = this.deepFreeze(this.cloneDeep(value));
  }

  /**
   * Get the internal value (readonly)
   */
  get value(): T {
    return this._value;
  }

  /**
   * Validate the value according to business rules
   */
  protected abstract validate(value: T): void;

  /**
   * Check equality with another Value Object
   */
  equals(other: ValueObject<T>): boolean {
    if (!other || this.constructor !== other.constructor) {
      return false;
    }
    return this.deepEquals(this._value, other._value);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    if (typeof this._value === 'string') {
      return this._value;
    }
    return JSON.stringify(this._value);
  }

  /**
   * Convert to JSON
   */
  toJSON(): T {
    return this.cloneDeep(this._value);
  }

  /**
   * Deep clone utility
   */
  private cloneDeep(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.cloneDeep(item as any)) as unknown as T;
    }

    const cloned = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.cloneDeep((obj as any)[key]);
      }
    }
    return cloned;
  }

  /**
   * Deep freeze utility for immutability
   */
  private deepFreeze(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Get property names including non-enumerable ones
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = (obj as any)[prop];
      if (value !== null && typeof value === 'object') {
        this.deepFreeze(value);
      }
    });

    return Object.freeze(obj);
  }

  /**
   * Deep equality comparison
   */
  private deepEquals(a: T, b: T): boolean {
    if (a === b) {
      return true;
    }

    if (a === null || b === null || typeof a !== typeof b) {
      return false;
    }

    if (typeof a !== 'object') {
      return a === b;
    }

    if (Array.isArray(a) !== Array.isArray(b)) {
      return false;
    }

    if (Array.isArray(a)) {
      const arrA = a as unknown as unknown[];
      const arrB = b as unknown as unknown[];
      if (arrA.length !== arrB.length) {
        return false;
      }
      return arrA.every((item, index) =>
        this.deepEquals(item as T, arrB[index] as T),
      );
    }

    const keysA = Object.keys(a as any);
    const keysB = Object.keys(b as any);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every(
      (key) =>
        keysB.includes(key) &&
        this.deepEquals((a as any)[key], (b as any)[key]),
    );
  }
}

/**
 * Domain Exception for Value Object validation failures
 */
export class ValueObjectValidationError extends Error {
  public readonly className: string;
  public readonly invalidValue: unknown;
  public readonly validationRule: string;

  constructor(
    className: string,
    invalidValue: unknown,
    validationRule: string,
    message: string,
  ) {
    super(
      `Value object validation failed for ${className}: ${message} (rule: ${validationRule})`,
    );
    this.name = 'ValueObjectValidationError';
    this.className = className;
    this.invalidValue = invalidValue;
    this.validationRule = validationRule;
  }
}
