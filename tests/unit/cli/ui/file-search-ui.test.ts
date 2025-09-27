describe('FileSearchUI', () => {
  let FileSearchUI: typeof import('../../../../src/cli/ui/file-search-ui').default;

  beforeAll(() => {
    // Reset modules and mock chalk to avoid importing ESM chalk from node_modules during require
    jest.resetModules();
    jest.doMock('chalk', () => ({
      __esModule: true,
      default: {
        cyan: (s: unknown): string => String(s),
        gray: (s: unknown): string => String(s),
        white: (s: unknown): string => String(s),
        bold: (s: unknown): string => String(s),
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    FileSearchUI = require('../../../../src/cli/ui/file-search-ui').default;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('shortenPath returns input for empty or short paths', () => {
    expect(FileSearchUI.shortenPath('')).toBe('');
    const short = './docs/README.md';
    expect(FileSearchUI.shortenPath(short, 50)).toBe(short);
  });

  test('shortenPath returns .../parent/filename when it fits within maxLength', () => {
    // choose a path that is longer than maxLength but whose shortened form fits
    const path = '/some/very/long/path/c/example.md';
    const result = FileSearchUI.shortenPath(path, 20);
    expect(result.startsWith('.../')).toBe(true);
    expect(result.includes('example.md')).toBe(true);
  });

  test('shortenPath falls back to .../filename when parent+filename too long', () => {
    const path = '/very/long/path/that/contains/many/folders/and/a/verylongfilename.md';
    const result = FileSearchUI.shortenPath(path, 10);
    expect(result).toBe('.../verylongfilename.md');
  });

  test('displayFiles writes expected lines to stdout', () => {
    const writes: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => {
      writes.push(String(s));
      return true as unknown as boolean;
    });

    const files = ['/path/to/one.md', '/path/to/two.md', '/path/to/three.md', '/path/to/four.md'];
    FileSearchUI.displayFiles(files, 2);

    const joined = writes.join('');
    expect(joined).toContain('Files found');
    expect(joined).toContain('1.');
    expect(joined).toContain('2.');
    expect(joined).toContain('... and 2 more files');
    expect(joined).toContain('Total: 4 files');
  });
});
