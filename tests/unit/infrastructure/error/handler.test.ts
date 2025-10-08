import { ErrorHandler } from '../../../../src/infrastructure/error/handler';
import {
  MD2PDFError,
  FileNotFoundError,
  FilePermissionError,
  MarkdownParsingError,
  PDFGenerationError,
  PuppeteerError,
} from '../../../../src/infrastructure/error/errors';

describe('ErrorHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('formatError formats MD2PDFError with code and message', () => {
    const err = new MD2PDFError('oh no', 'CODE', 'unknown', false);
    const h = new ErrorHandler();
    expect(h.formatError(err)).toBe('CODE: oh no');
  });

  test('isRecoverable returns correct value', () => {
    const recoverable = new MD2PDFError('r', 'C', 'c', true);
    const nonRecoverable = new MD2PDFError('n', 'C2', 'c2', false);
    const h = new ErrorHandler();
    expect(h.isRecoverable(recoverable)).toBe(true);
    expect(h.isRecoverable(nonRecoverable)).toBe(false);
  });

  test('categorizeError recognizes MD2PDFError and common messages', () => {
    const h = new ErrorHandler();
    expect(
      h.categorizeError(new MD2PDFError('x', 'C', 'file_system', false)),
    ).toBe('file_system');
    expect(h.categorizeError(new Error('ENOENT: something'))).toBe(
      'file_system',
    );
    expect(h.categorizeError(new Error('permission denied'))).toBe(
      'file_system',
    );
    expect(h.categorizeError(new Error('JSON parse failed'))).toBe(
      'configuration',
    );
    expect(h.categorizeError(new Error('network timeout'))).toBe('network');
    expect(h.categorizeError(new Error('unknown thing'))).toBe('unknown');
  });

  test('getSuggestions returns tailored suggestions for known errors', () => {
    const h = new ErrorHandler();
    expect(h.getSuggestions(new FileNotFoundError('/tmp/x'))[0]).toContain(
      'Check if the file path is correct',
    );
    expect(
      h.getSuggestions(new FilePermissionError('/tmp/x', 'read'))[0],
    ).toContain('Check file permissions');
    expect(h.getSuggestions(new MarkdownParsingError('oops'))[0]).toContain(
      'Check the Markdown syntax',
    );
    expect(
      h.getSuggestions(new PDFGenerationError('boom', 'render'))[0],
    ).toContain('Try reducing the document size');
    expect(h.getSuggestions(new PuppeteerError('crash'))[0]).toContain(
      'Reinstall Puppeteer',
    );
  });

  test('handleError logs to console when no logger provided', async () => {
    const h = new ErrorHandler();
    const logs: unknown[][] = [];
    jest
      .spyOn(console, 'error')
      .mockImplementation((...args: unknown[]) => logs.push(args));

    const err = new Error('test error');
    await h.handleError(err, 'context-1');

    // Expect console.error called for formatted error and context
    expect(logs.length).toBeGreaterThanOrEqual(2);
    const flat = logs.map((l) => (l as unknown[]).join(' ')).join('\n');
    expect(flat).toContain('Error context: context-1');
  });
});
