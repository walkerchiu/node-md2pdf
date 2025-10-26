import { FileSearchUI } from '../../../../src/cli/ui/file-search-ui';
import { createMockTranslator } from '../../helpers/mock-translator';

// Mock chalk
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    cyan: (s: unknown): string => String(s),
    gray: (s: unknown): string => String(s),
    white: (s: unknown): string => String(s),
    bold: (s: unknown): string => String(s),
  },
}));

describe('FileSearchUI', () => {
  let mockTranslator: any;
  let fileSearchUI: FileSearchUI;

  beforeEach(() => {
    mockTranslator = createMockTranslator();
    fileSearchUI = new FileSearchUI(mockTranslator);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with translation manager', () => {
      expect(fileSearchUI).toBeInstanceOf(FileSearchUI);
      expect((fileSearchUI as any).translationManager).toBe(mockTranslator);
    });
  });

  describe('instance displayFiles method', () => {
    it('should display files with translation support', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      mockTranslator.t.mockImplementation((key: string, options?: any) => {
        if (key === 'fileSearchUI.filesFound') return '📁 Files found:';
        if (key === 'fileSearchUI.andMoreFiles')
          return `... and ${options.count} more files`;
        if (key === 'fileSearchUI.totalFiles')
          return `Total: ${options.count} files`;
        return key;
      });

      const files = [
        '/path/to/file1.md',
        '/path/to/file2.md',
        '/path/to/file3.md',
      ];

      fileSearchUI.displayFiles(files, 2);

      const joined = writes.join('');
      expect(joined).toContain('📁 Files found:');
      expect(joined).toContain('1.');
      expect(joined).toContain('2.');
      expect(joined).toContain('... and 1 more files');
      expect(joined).toContain('Total: 3 files');
      expect(mockTranslator.t).toHaveBeenCalledWith('fileSearchUI.filesFound');
      expect(mockTranslator.t).toHaveBeenCalledWith(
        'fileSearchUI.andMoreFiles',
        { count: 1 },
      );
      expect(mockTranslator.t).toHaveBeenCalledWith('fileSearchUI.totalFiles', {
        count: 3,
      });
    });

    it('should display all files when count is less than maxDisplay', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      mockTranslator.t.mockImplementation((key: string, options?: any) => {
        if (key === 'fileSearchUI.filesFound') return '📁 Files found:';
        if (key === 'fileSearchUI.totalFiles')
          return `Total: ${options.count} files`;
        return key;
      });

      const files = ['/path/to/file1.md', '/path/to/file2.md'];

      fileSearchUI.displayFiles(files, 5);

      const joined = writes.join('');
      expect(joined).toContain('📁 Files found:');
      expect(joined).toContain('1.');
      expect(joined).toContain('2.');
      expect(joined).not.toContain('more files');
      expect(joined).toContain('Total: 2 files');
      expect(mockTranslator.t).not.toHaveBeenCalledWith(
        'fileSearchUI.andMoreFiles',
        expect.any(Object),
      );
    });

    it('should handle empty file list', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      mockTranslator.t.mockImplementation((key: string, options?: any) => {
        if (key === 'fileSearchUI.filesFound') return '📁 Files found:';
        if (key === 'fileSearchUI.totalFiles')
          return `Total: ${options.count} files`;
        return key;
      });

      fileSearchUI.displayFiles([]);

      const joined = writes.join('');
      expect(joined).toContain('📁 Files found:');
      expect(joined).toContain('Total: 0 files');
      expect(joined).not.toContain('1.');
      expect(mockTranslator.t).toHaveBeenCalledWith('fileSearchUI.totalFiles', {
        count: 0,
      });
    });

    it('should use default maxDisplay of 10', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      mockTranslator.t.mockImplementation((key: string, options?: any) => {
        if (key === 'fileSearchUI.filesFound') return '📁 Files found:';
        if (key === 'fileSearchUI.andMoreFiles')
          return `... and ${options.count} more files`;
        if (key === 'fileSearchUI.totalFiles')
          return `Total: ${options.count} files`;
        return key;
      });

      // Create 12 files to test default maxDisplay
      const files = Array.from(
        { length: 12 },
        (_, i) => `/path/to/file${i + 1}.md`,
      );

      fileSearchUI.displayFiles(files);

      const joined = writes.join('');
      expect(joined).toContain('10.');
      expect(joined).not.toContain('11.');
      expect(joined).toContain('... and 2 more files');
      expect(mockTranslator.t).toHaveBeenCalledWith(
        'fileSearchUI.andMoreFiles',
        { count: 2 },
      );
    });
  });

  describe('static shortenPath method', () => {
    it('should return input for empty or short paths', () => {
      expect(FileSearchUI.shortenPath('')).toBe('');
      const short = './docs/README.md';
      expect(FileSearchUI.shortenPath(short, 50)).toBe(short);
    });

    it('should return .../parent/filename when it fits within maxLength', () => {
      // choose a path that is longer than maxLength but whose shortened form fits
      const path = '/some/very/long/path/c/example.md';
      const result = FileSearchUI.shortenPath(path, 20);
      expect(result.startsWith('.../')).toBe(true);
      expect(result.includes('example.md')).toBe(true);
    });

    it('should fall back to .../filename when parent+filename too long', () => {
      const path =
        '/very/long/path/that/contains/many/folders/and/a/verylongfilename.md';
      const result = FileSearchUI.shortenPath(path, 10);
      expect(result).toBe('.../verylongfilename.md');
    });

    it('should return original path when path has 2 or fewer parts', () => {
      const path1 = 'file.md';
      const path2 = 'folder/file.md';
      expect(FileSearchUI.shortenPath(path1, 5)).toBe(path1);
      expect(FileSearchUI.shortenPath(path2, 5)).toBe(path2);
    });

    it('should handle paths with default maxLength of 50', () => {
      const shortPath = '/short/path.md';
      expect(FileSearchUI.shortenPath(shortPath)).toBe(shortPath);

      const longPath =
        '/this/is/a/very/long/path/that/exceeds/fifty/characters/file.md';
      const result = FileSearchUI.shortenPath(longPath);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toContain('file.md');
    });
  });

  describe('static displayFiles method', () => {
    it('should write expected lines to stdout', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      const files = [
        '/path/to/one.md',
        '/path/to/two.md',
        '/path/to/three.md',
        '/path/to/four.md',
      ];
      FileSearchUI.displayFiles(files, 2);

      const joined = writes.join('');
      expect(joined).toContain('Files found');
      expect(joined).toContain('1.');
      expect(joined).toContain('2.');
      expect(joined).toContain('... and 2 more files');
      expect(joined).toContain('Total: 4 files');
    });

    it('should display all files when count is less than maxDisplay', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      const files = ['/path/to/file1.md', '/path/to/file2.md'];
      FileSearchUI.displayFiles(files, 5);

      const joined = writes.join('');
      expect(joined).toContain('Files found');
      expect(joined).toContain('1.');
      expect(joined).toContain('2.');
      expect(joined).not.toContain('more files');
      expect(joined).toContain('Total: 2 files');
    });

    it('should handle empty file list', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      FileSearchUI.displayFiles([]);

      const joined = writes.join('');
      expect(joined).toContain('Files found');
      expect(joined).toContain('Total: 0 files');
      expect(joined).not.toContain('1.');
    });

    it('should use default maxDisplay of 10', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      // Create 12 files to test default maxDisplay
      const files = Array.from(
        { length: 12 },
        (_, i) => `/path/to/file${i + 1}.md`,
      );
      FileSearchUI.displayFiles(files);

      const joined = writes.join('');
      expect(joined).toContain('10.');
      expect(joined).not.toContain('11.');
      expect(joined).toContain('... and 2 more files');
    });

    it('should properly shorten file paths in display', () => {
      const writes: string[] = [];
      jest
        .spyOn(process.stdout, 'write')
        .mockImplementation((s: string | Uint8Array) => {
          writes.push(String(s));
          return true as unknown as boolean;
        });

      // Create a path that will definitely be shortened (over 50 characters)
      const files = [
        '/this/is/a/very/very/very/long/path/that/definitely/exceeds/fifty/characters/in/length/file.md',
      ];
      FileSearchUI.displayFiles(files);

      const joined = writes.join('');
      expect(joined).toContain('...');
      expect(joined).toContain('file.md');
    });
  });
});
