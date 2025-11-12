import {
  HeadingIdGenerator,
  createSimpleHeadingId,
  isValidHeadingId,
} from '../../../src/utils/heading-id-generator';

describe('HeadingIdGenerator', () => {
  let generator: HeadingIdGenerator;

  beforeEach(() => {
    generator = new HeadingIdGenerator();
  });

  describe('createHeadingId', () => {
    it('should create basic heading ID', () => {
      const id = generator.createHeadingId('Hello World');
      expect(id).toBe('hello-world');
    });

    it('should handle Chinese characters', () => {
      const id = generator.createHeadingId('中文標題');
      expect(id).toBe('中文標題');
    });

    it('should handle mixed Chinese and English', () => {
      const id = generator.createHeadingId('Chapter 1 - 簡介');
      expect(id).toBe('chapter-1-簡介');
    });

    it('should remove special characters', () => {
      const id = generator.createHeadingId('Hello @#$% World!');
      expect(id).toBe('hello-world');
    });

    it('should replace spaces with separator', () => {
      const id = generator.createHeadingId('Multiple   Spaces');
      expect(id).toBe('multiple-spaces');
    });

    it('should replace underscores with separator', () => {
      const id = generator.createHeadingId('snake_case_text');
      expect(id).toBe('snake-case-text');
    });

    it('should remove leading/trailing separators', () => {
      const id = generator.createHeadingId('  -heading-  ');
      expect(id).toBe('heading');
    });

    it('should collapse multiple separators', () => {
      const id = generator.createHeadingId('text---with---dashes');
      expect(id).toBe('text-with-dashes');
    });

    it('should ensure uniqueness with counter suffix', () => {
      const id1 = generator.createHeadingId('heading');
      const id2 = generator.createHeadingId('heading');
      const id3 = generator.createHeadingId('heading');

      expect(id1).toBe('heading');
      expect(id2).toBe('heading-1');
      expect(id3).toBe('heading-2');
    });

    it('should handle custom separator', () => {
      const id = generator.createHeadingId('Hello World', { separator: '_' });
      expect(id).toBe('hello_world');
    });

    it('should preserve case when specified', () => {
      const id = generator.createHeadingId('CamelCase', { preserveCase: true });
      expect(id).toBe('CamelCase');
    });

    it('should truncate long IDs', () => {
      const longText = 'a'.repeat(150);
      const id = generator.createHeadingId(longText, { maxLength: 50 });
      expect(id.length).toBeLessThanOrEqual(50);
    });

    it('should truncate at word boundary', () => {
      const text = 'hello world this is a very long heading text';
      const id = generator.createHeadingId(text, { maxLength: 20 });
      expect(id).toBe('hello-world-this-is');
      expect(id.length).toBeLessThanOrEqual(20);
    });
  });

  describe('ID tracking', () => {
    it('should check if ID exists', () => {
      generator.createHeadingId('test');
      expect(generator.hasId('test')).toBe(true);
      expect(generator.hasId('nonexistent')).toBe(false);
    });

    it('should register existing ID', () => {
      generator.registerId('existing-id');
      expect(generator.hasId('existing-id')).toBe(true);

      const newId = generator.createHeadingId('existing id');
      expect(newId).toBe('existing-id-1');
    });

    it('should reset ID registry', () => {
      generator.createHeadingId('test');
      expect(generator.hasId('test')).toBe(true);

      generator.reset();
      expect(generator.hasId('test')).toBe(false);

      const newId = generator.createHeadingId('test');
      expect(newId).toBe('test');
    });

    it('should get all registered IDs', () => {
      generator.createHeadingId('one');
      generator.createHeadingId('two');
      generator.createHeadingId('three');

      const ids = generator.getRegisteredIds();
      expect(ids).toEqual(['one', 'two', 'three']);
    });

    it('should get ID count', () => {
      generator.createHeadingId('one');
      generator.createHeadingId('two');

      expect(generator.getIdCount()).toBe(2);
    });
  });
});

describe('createSimpleHeadingId', () => {
  it('should create ID without tracking', () => {
    const id1 = createSimpleHeadingId('heading');
    const id2 = createSimpleHeadingId('heading');

    // Both should be the same since no tracking
    expect(id1).toBe('heading');
    expect(id2).toBe('heading');
  });

  it('should support options', () => {
    const id = createSimpleHeadingId('Hello World', {
      separator: '_',
      preserveCase: true,
    });
    expect(id).toBe('Hello_World');
  });

  it('should truncate long text with separator at boundary', () => {
    const longText =
      'this-is-a-very-long-text-that-needs-truncation-at-word-boundary';
    const id = createSimpleHeadingId(longText, { maxLength: 30 });

    // Should truncate at separator before maxLength
    expect(id.length).toBeLessThanOrEqual(30);
    expect(id.endsWith('-')).toBe(false);
  });

  it('should truncate long text when no separator near boundary', () => {
    const longText = 'a'.repeat(150);
    const id = createSimpleHeadingId(longText, { maxLength: 50 });

    // Should truncate at exactly maxLength
    expect(id.length).toBe(50);
  });
});

describe('isValidHeadingId', () => {
  it('should validate correct IDs', () => {
    expect(isValidHeadingId('hello-world')).toBe(true);
    expect(isValidHeadingId('中文標題')).toBe(true);
    expect(isValidHeadingId('mixed-中文-english')).toBe(true);
    expect(isValidHeadingId('number123')).toBe(true);
  });

  it('should reject invalid IDs', () => {
    expect(isValidHeadingId('')).toBe(false);
    expect(isValidHeadingId('  ')).toBe(false);
    expect(isValidHeadingId(' leading-space')).toBe(false);
    expect(isValidHeadingId('trailing-space ')).toBe(false);
    expect(isValidHeadingId('-starts-with-dash')).toBe(false);
    expect(isValidHeadingId('ends-with-dash-')).toBe(false);
    expect(isValidHeadingId('double--dash')).toBe(false);
    expect(isValidHeadingId('special@chars')).toBe(false);
  });
});
