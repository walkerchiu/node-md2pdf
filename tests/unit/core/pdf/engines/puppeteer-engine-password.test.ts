/**
 * PuppeteerPDFEngine Password Protection tests
 * Tests for password protection functionality in the Puppeteer engine
 */

import { PuppeteerPDFEngine } from '../../../../../src/core/pdf/engines/puppeteer-engine';
import {
  PDFGenerationContext,
  PDFEngineOptions,
} from '../../../../../src/core/pdf/engines/types';

// Mock puppeteer
jest.mock('puppeteer', () => {
  const mockPage = {
    setContent: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
    close: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue(3), // Page count
  };

  const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };

  return {
    launch: jest.fn().mockResolvedValue(mockBrowser),
    __mockPage: mockPage,
    __mockBrowser: mockBrowser,
  };
});

// Mock filesystem
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock filesystem promises
const mockWriteFile = jest.fn();
const mockReadFile = jest.fn();
const mockUnlink = jest.fn();
jest.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  unlink: mockUnlink,
}));

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn,
}));

describe('PuppeteerPDFEngine - Password Protection', () => {
  let engine: PuppeteerPDFEngine;

  const baseContext: PDFGenerationContext = {
    htmlContent: '<html><body><h1>Test Content</h1></body></html>',
    outputPath: '/tmp/test-output.pdf',
    title: 'Test Document',
  };

  const baseOptions: PDFEngineOptions = {
    format: 'A4',
    orientation: 'portrait',
    margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset puppeteer mocks
    const puppeteer = require('puppeteer');
    puppeteer.launch.mockResolvedValue(puppeteer.__mockBrowser);
    puppeteer.__mockPage.setContent.mockResolvedValue(undefined);
    puppeteer.__mockPage.pdf.mockResolvedValue(Buffer.from('fake-pdf-content'));
    puppeteer.__mockPage.close.mockResolvedValue(undefined);
    puppeteer.__mockPage.evaluate.mockResolvedValue(3);
    puppeteer.__mockBrowser.newPage.mockResolvedValue(puppeteer.__mockPage);
    puppeteer.__mockBrowser.close.mockResolvedValue(undefined);
    puppeteer.__mockBrowser.disconnect.mockResolvedValue(undefined);

    // Reset filesystem mocks
    const fs = require('fs');
    fs.existsSync.mockReturnValue(true);

    engine = new PuppeteerPDFEngine();
    await engine.initialize();
  });

  describe('Password Protection with User Password', () => {
    it('should generate PDF with user password and apply qpdf encryption', async () => {
      // Arrange
      const contextWithPassword: PDFGenerationContext = {
        ...baseContext,
        passwordProtection: {
          userPassword: 'user123',
          permissions: {
            printing: true,
            modifying: false,
            copying: true,
            annotating: true,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: false,
          },
        },
      };

      // Mock qpdf process
      const mockQpdfProcess = {
        on: jest.fn(),
        stderr: { on: jest.fn() },
        stdout: { on: jest.fn() },
      };

      mockSpawn.mockReturnValue(mockQpdfProcess);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(Buffer.from('encrypted-pdf-content'));
      mockUnlink.mockResolvedValue(undefined);

      // Simulate successful qpdf execution
      mockQpdfProcess.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10); // Success exit code
          }
          return mockQpdfProcess;
        },
      );

      // Act
      const result = await engine.generatePDF(contextWithPassword, baseOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/test-output.pdf');

      // Verify qpdf was called with correct arguments
      expect(mockSpawn).toHaveBeenCalledWith(
        'qpdf',
        expect.arrayContaining([
          '--encrypt',
          'user123', // user password
          'user123_owner', // owner password (fallback to user password + _owner)
          '256', // encryption strength
          '--print=full',
          '--extract=y',
          '--annotate=y',
          '--form=y',
          '--accessibility=y',
          '--', // separator
          expect.any(String), // temp output file
        ]),
      );

      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockReadFile).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalledTimes(2); // Cleanup both temp files
    });

    it('should generate PDF with both user and owner passwords', async () => {
      // Arrange
      const contextWithBothPasswords: PDFGenerationContext = {
        ...baseContext,
        passwordProtection: {
          userPassword: 'user123',
          ownerPassword: 'owner456',
          permissions: {
            printing: false,
            modifying: false,
            copying: false,
            annotating: false,
            fillingForms: false,
            contentAccessibility: true, // Always allowed
            documentAssembly: false,
          },
        },
      };

      // Mock qpdf process
      const mockQpdfProcess = {
        on: jest.fn(),
        stderr: { on: jest.fn() },
        stdout: { on: jest.fn() },
      };

      mockSpawn.mockReturnValue(mockQpdfProcess);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(Buffer.from('encrypted-pdf-content'));
      mockUnlink.mockResolvedValue(undefined);

      mockQpdfProcess.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
          return mockQpdfProcess;
        },
      );

      // Act
      const result = await engine.generatePDF(
        contextWithBothPasswords,
        baseOptions,
      );

      // Assert
      expect(result.success).toBe(true);

      // Verify qpdf was called with strict permissions (restrictive flags except accessibility)
      const qpdfArgs = mockSpawn.mock.calls[0][1];
      expect(qpdfArgs).toContain('--encrypt');
      expect(qpdfArgs).toContain('user123');
      expect(qpdfArgs).toContain('owner456');
      expect(qpdfArgs).toContain('256');
      expect(qpdfArgs).toContain('--print=none');
      expect(qpdfArgs).toContain('--modify=none');
      expect(qpdfArgs).toContain('--extract=n');
      expect(qpdfArgs).toContain('--annotate=n');
      expect(qpdfArgs).toContain('--form=n');
      expect(qpdfArgs).toContain('--accessibility=y');
    });

    it('should handle qpdf execution failure', async () => {
      // Arrange
      const contextWithPassword: PDFGenerationContext = {
        ...baseContext,
        passwordProtection: {
          userPassword: 'test123',
          permissions: {
            printing: true,
            modifying: true,
            copying: true,
            annotating: true,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: true,
          },
        },
      };

      const mockQpdfProcess = {
        on: jest.fn(),
        stderr: { on: jest.fn() },
        stdout: { on: jest.fn() },
      };

      mockSpawn.mockReturnValue(mockQpdfProcess);
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);

      // Simulate qpdf failure
      mockQpdfProcess.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Failure exit code
          }
          return mockQpdfProcess;
        },
      );

      mockQpdfProcess.stderr.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from('qpdf error message')), 5);
          }
          return mockQpdfProcess;
        },
      );

      // Act
      const result = await engine.generatePDF(contextWithPassword, baseOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF encryption failed');

      // Verify cleanup still happens on failure
      expect(mockUnlink).toHaveBeenCalledTimes(2); // Both temp files cleaned up
    });

    it('should handle missing qpdf binary', async () => {
      // Arrange
      const contextWithPassword: PDFGenerationContext = {
        ...baseContext,
        passwordProtection: {
          userPassword: 'test123',
          permissions: {
            printing: true,
            modifying: true,
            copying: true,
            annotating: true,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: true,
          },
        },
      };

      mockWriteFile.mockResolvedValue(undefined);

      // Simulate spawn error (binary not found)
      mockSpawn.mockImplementation(() => {
        throw new Error('spawn qpdf ENOENT');
      });

      // Act
      const result = await engine.generatePDF(contextWithPassword, baseOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF encryption failed');
    });

    it('should generate unencrypted PDF when no password protection is provided', async () => {
      // Arrange - context without passwordProtection
      const contextWithoutPassword: PDFGenerationContext = {
        ...baseContext,
        // No passwordProtection property
      };

      mockWriteFile.mockResolvedValue(undefined);

      // Act
      const result = await engine.generatePDF(
        contextWithoutPassword,
        baseOptions,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockSpawn).not.toHaveBeenCalled(); // qpdf should not be called
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/tmp/test-output.pdf',
        Buffer.from('fake-pdf-content'),
      );
    });

    it('should handle special characters in passwords', async () => {
      // Arrange
      const contextWithSpecialPassword: PDFGenerationContext = {
        ...baseContext,
        passwordProtection: {
          userPassword: 'p@ssw0rd!#$%',
          ownerPassword: 'ôwñér-päss™',
          permissions: {
            printing: true,
            modifying: true,
            copying: true,
            annotating: true,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: true,
          },
        },
      };

      const mockQpdfProcess = {
        on: jest.fn(),
        stderr: { on: jest.fn() },
        stdout: { on: jest.fn() },
      };

      mockSpawn.mockReturnValue(mockQpdfProcess);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(Buffer.from('encrypted-pdf-content'));
      mockUnlink.mockResolvedValue(undefined);

      mockQpdfProcess.on.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
          return mockQpdfProcess;
        },
      );

      // Act
      const result = await engine.generatePDF(
        contextWithSpecialPassword,
        baseOptions,
      );

      // Assert
      expect(result.success).toBe(true);

      // Verify passwords are passed correctly to qpdf
      expect(mockSpawn).toHaveBeenCalledWith(
        'qpdf',
        expect.arrayContaining([
          '--encrypt',
          'p@ssw0rd!#$%', // Special characters preserved
          'ôwñér-päss™', // Unicode characters preserved
          '256',
          expect.any(String), // temp file path
        ]),
      );
    });
  });

  describe('Permission Flag Mapping', () => {
    it('should map individual permission flags correctly to qpdf arguments', async () => {
      const permissionMappings = [
        {
          permission: 'printing',
          expectedFlag: '--print=full',
          allOthersFalse: true,
        },
        {
          permission: 'copying',
          expectedFlag: '--extract=y',
          allOthersFalse: true,
        },
        {
          permission: 'annotating',
          expectedFlag: '--annotate=y',
          allOthersFalse: true,
        },
        {
          permission: 'fillingForms',
          expectedFlag: '--form=y',
          allOthersFalse: true,
        },
        {
          permission: 'contentAccessibility',
          expectedFlag: '--accessibility=y',
          allOthersFalse: true,
        },
        {
          permission: 'documentAssembly',
          expectedFlag: '--modify=assembly',
          allOthersFalse: true,
        },
      ];

      for (const mapping of permissionMappings) {
        // Reset mocks for each test
        jest.clearAllMocks();

        // Setup mocks again
        const puppeteer = require('puppeteer');
        puppeteer.launch.mockResolvedValue(puppeteer.__mockBrowser);
        puppeteer.__mockPage.setContent.mockResolvedValue(undefined);
        puppeteer.__mockPage.pdf.mockResolvedValue(
          Buffer.from('fake-pdf-content'),
        );

        // Test each permission flag individually
        const permissions = {
          printing: false,
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: false,
          documentAssembly: false,
        };
        (permissions as any)[mapping.permission] = true;

        const contextWithSinglePermission: PDFGenerationContext = {
          ...baseContext,
          passwordProtection: {
            userPassword: 'test123',
            permissions,
          },
        };

        const mockQpdfProcess = {
          on: jest.fn(),
          stderr: { on: jest.fn() },
          stdout: { on: jest.fn() },
        };

        mockSpawn.mockReturnValue(mockQpdfProcess);
        mockWriteFile.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(Buffer.from('encrypted-pdf-content'));
        mockUnlink.mockResolvedValue(undefined);

        mockQpdfProcess.on.mockImplementation(
          (event: string, callback: Function) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
            return mockQpdfProcess;
          },
        );

        // Act
        await engine.generatePDF(contextWithSinglePermission, baseOptions);

        // Assert
        expect(mockSpawn).toHaveBeenCalled();
        const qpdfArgs = mockSpawn.mock.calls[0][1];
        expect(qpdfArgs).toContain(mapping.expectedFlag);
      }
    });

    it('should handle complex modify permission combinations correctly', async () => {
      const modifyPermissionTests = [
        {
          modifying: false,
          documentAssembly: false,
          expectedFlag: '--modify=none',
          description: 'No modify permissions',
        },
        {
          modifying: true,
          documentAssembly: true,
          expectedFlag: '--modify=all',
          description: 'Full modify permissions',
        },
        {
          modifying: true,
          documentAssembly: false,
          expectedFlag: '--modify=annotate',
          description: 'Content changes but no assembly',
        },
        {
          modifying: false,
          documentAssembly: true,
          expectedFlag: '--modify=assembly',
          description: 'Assembly but no content changes',
        },
      ];

      for (const test of modifyPermissionTests) {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mocks again
        const puppeteer = require('puppeteer');
        puppeteer.launch.mockResolvedValue(puppeteer.__mockBrowser);
        puppeteer.__mockPage.setContent.mockResolvedValue(undefined);
        puppeteer.__mockPage.pdf.mockResolvedValue(
          Buffer.from('fake-pdf-content'),
        );

        const contextWithModifyPermissions: PDFGenerationContext = {
          ...baseContext,
          passwordProtection: {
            userPassword: 'test123',
            permissions: {
              printing: false,
              modifying: test.modifying,
              copying: false,
              annotating: false,
              fillingForms: false,
              contentAccessibility: false,
              documentAssembly: test.documentAssembly,
            },
          },
        };

        const mockQpdfProcess = {
          on: jest.fn(),
          stderr: { on: jest.fn() },
          stdout: { on: jest.fn() },
        };

        mockSpawn.mockReturnValue(mockQpdfProcess);
        mockWriteFile.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue(Buffer.from('encrypted-pdf-content'));
        mockUnlink.mockResolvedValue(undefined);

        mockQpdfProcess.on.mockImplementation(
          (event: string, callback: Function) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
            return mockQpdfProcess;
          },
        );

        // Act
        await engine.generatePDF(contextWithModifyPermissions, baseOptions);

        // Assert
        expect(mockSpawn).toHaveBeenCalled();
        const qpdfArgs = mockSpawn.mock.calls[0][1];
        expect(qpdfArgs).toContain(test.expectedFlag);
      }
    });
  });
});
