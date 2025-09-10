/**
 * Unit tests for PDFGenerator
 */

import { PDFGenerator } from '../../../../src/core/pdf/pdf-generator';
import { PDFGeneratorOptions } from '../../../../src/core/pdf/types';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

// Mock puppeteer for testing
jest.mock('puppeteer');
import puppeteer from 'puppeteer';

const mockBrowser = {
  newPage: jest.fn(),
  close: jest.fn()
};

const mockPage = {
  setContent: jest.fn(),
  pdf: jest.fn(),
  close: jest.fn(),
  evaluate: jest.fn()
};

(puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
mockBrowser.newPage.mockResolvedValue(mockPage);
mockPage.pdf.mockResolvedValue(Buffer.from('fake pdf content'));
mockPage.evaluate.mockResolvedValue(1);

describe('PDFGenerator', () => {
  let generator: PDFGenerator;
  const testOutputDir = join(__dirname, '../../../temp');
  const testOutputPath = join(testOutputDir, 'test-output.pdf');

  beforeAll(() => {
    // Create temp directory for tests
    if (!existsSync(testOutputDir)) {
      mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temp directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    generator = new PDFGenerator();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await generator.close();
  });

  describe('Constructor and options', () => {
    it('should create generator with default options', () => {
      const defaultGenerator = new PDFGenerator();
      const options = defaultGenerator.getOptions();

      expect(options.format).toBe('A4');
      expect(options.orientation).toBe('portrait');
      expect(options.printBackground).toBe(true);
    });

    it('should create generator with custom options', () => {
      const customOptions: PDFGeneratorOptions = {
        format: 'A3',
        orientation: 'landscape',
        printBackground: false
      };

      const customGenerator = new PDFGenerator(customOptions);
      const options = customGenerator.getOptions();

      expect(options.format).toBe('A3');
      expect(options.orientation).toBe('landscape');
      expect(options.printBackground).toBe(false);
    });

    it('should update options', () => {
      generator.updateOptions({ format: 'Letter' });
      const options = generator.getOptions();

      expect(options.format).toBe('Letter');
    });
  });

  describe('Initialization', () => {
    it('should initialize browser successfully', async () => {
      await generator.initialize();

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: 'new',
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ])
      });
    });

    it('should handle initialization errors', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValueOnce(new Error('Launch failed'));

      await expect(generator.initialize()).rejects.toThrow('Failed to initialize PDF generator: Launch failed');
    });

    it('should not reinitialize if already initialized', async () => {
      await generator.initialize();
      await generator.initialize();

      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF from HTML content', async () => {
      const htmlContent = '<h1>Test Document</h1><p>This is a test.</p>';
      
      const result = await generator.generatePDF(htmlContent, testOutputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(testOutputPath);
      expect(result.metadata?.fileSize).toBeGreaterThan(0);
      expect(result.metadata?.generationTime).toBeGreaterThanOrEqual(0);
    });

    it('should generate PDF with custom options', async () => {
      const htmlContent = '<h1>Test Document</h1>';
      const options = {
        title: 'Custom Title',
        customCSS: 'body { color: red; }'
      };

      const result = await generator.generatePDF(htmlContent, testOutputPath, options);

      expect(result.success).toBe(true);
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<title>Custom Title</title>'),
        expect.any(Object)
      );
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('body { color: red; }'),
        expect.any(Object)
      );
    });

    it('should handle invalid output path', async () => {
      const htmlContent = '<h1>Test</h1>';
      const invalidPath = 'invalid-path-without-pdf-extension.txt';

      const result = await generator.generatePDF(htmlContent, invalidPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Output path must end with .pdf extension');
    });

    it('should create output directory if it does not exist', async () => {
      const htmlContent = '<h1>Test</h1>';
      const nestedPath = join(testOutputDir, 'nested', 'deep', 'test.pdf');

      const result = await generator.generatePDF(htmlContent, nestedPath);

      expect(result.success).toBe(true);
      expect(existsSync(join(testOutputDir, 'nested', 'deep'))).toBe(true);
    });

    it('should handle PDF generation errors', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('PDF generation failed'));
      
      const htmlContent = '<h1>Test</h1>';
      const result = await generator.generatePDF(htmlContent, testOutputPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF generation failed');
    });
  });

  describe('File-based PDF Generation', () => {
    const testInputPath = join(testOutputDir, 'test-input.html');

    beforeEach(() => {
      writeFileSync(testInputPath, '<h1>File Content</h1><p>From file.</p>');
    });

    it('should generate PDF from HTML file', async () => {
      const result = await generator.generatePDFFromFile(testInputPath, testOutputPath);

      expect(result.success).toBe(true);
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('File Content'),
        expect.any(Object)
      );
    });

    it('should handle non-existent input file', async () => {
      const nonExistentPath = join(testOutputDir, 'non-existent.html');
      
      const result = await generator.generatePDFFromFile(nonExistentPath, testOutputPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Input file not found');
    });
  });

  describe('Environment Validation', () => {
    it('should validate environment successfully', async () => {
      const validation = await generator.validateEnvironment();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect environment issues', async () => {
      mockBrowser.newPage.mockRejectedValueOnce(new Error('Page creation failed'));

      const validation = await generator.validateEnvironment();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Management', () => {
    it('should close browser properly', async () => {
      await generator.initialize();
      await generator.close();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      await generator.initialize();
      mockBrowser.close.mockRejectedValueOnce(new Error('Close failed'));

      // Should not throw
      await expect(generator.close()).resolves.not.toThrow();
    });

    it('should handle closing non-initialized browser', async () => {
      // Should not throw
      await expect(generator.close()).resolves.not.toThrow();
    });
  });

  describe('Page Count Calculation', () => {
    it('should calculate page count', async () => {
      mockPage.evaluate.mockResolvedValueOnce(2);
      
      const htmlContent = '<h1>Multi-page content</h1>';
      const result = await generator.generatePDF(htmlContent, testOutputPath);

      expect(result.success).toBe(true);
      expect(result.metadata?.pages).toBe(2);
    });

    it('should handle page count calculation errors', async () => {
      mockPage.evaluate.mockRejectedValueOnce(new Error('Evaluation failed'));
      
      const htmlContent = '<h1>Test</h1>';
      const result = await generator.generatePDF(htmlContent, testOutputPath);

      expect(result.success).toBe(true);
      expect(result.metadata?.pages).toBe(1); // Should default to 1
    });
  });

  describe('Chinese Content Support', () => {
    it('should handle Chinese content', async () => {
      const chineseContent = '<h1>中文標題</h1><p>這是中文內容測試。</p>';
      
      const result = await generator.generatePDF(chineseContent, testOutputPath);

      expect(result.success).toBe(true);
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('中文標題'),
        expect.any(Object)
      );
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Noto Sans CJK SC'),
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases and Error Branches', () => {
    it('should handle browser not initialized after initialization attempt', async () => {
      // Mock the case where browser initialization appears successful but browser is null
      const mockInitialize = jest.spyOn(generator as any, 'initialize').mockResolvedValueOnce(undefined);
      (generator as any).browser = null;

      const result = await generator.generatePDF('<h1>Test</h1>', testOutputPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Browser not initialized');
      
      mockInitialize.mockRestore();
    });

    it('should handle file read errors in generatePDFFromFile', async () => {
      // Create a file path that would cause a read error (not permissions issue, but encoding issue)
      const testInputPath = join(testOutputDir, 'test-input.html');
      writeFileSync(testInputPath, '<h1>Test</h1>', 'utf-8');
      
      // Mock fs to throw an error
      const mockReadFileSync = jest.fn().mockImplementation(() => {
        throw new Error('File read error - encoding issue');
      });
      
      // Mock fs to throw an error on readFileSync
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        readFileSync: mockReadFileSync
      }));

      // Force re-import of the method that uses fs
      const result = await generator.generatePDFFromFile(testInputPath, testOutputPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read input file');
      
      // Restore original
      jest.doMock('fs', () => jest.requireActual('fs'));
    });

    it('should handle validation environment error when browser fails after initialization', async () => {
      // Create a new generator instance and mock initialization to fail
      const testGenerator = new PDFGenerator();
      const mockInitialize = jest.spyOn(testGenerator as any, 'initialize').mockResolvedValueOnce(undefined);
      (testGenerator as any).browser = null;

      const validation = await testGenerator.validateEnvironment();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Failed to launch Puppeteer browser');
      
      mockInitialize.mockRestore();
    });

    it('should handle page evaluation errors in getPageCount', async () => {
      // Mock page.evaluate to throw an error
      mockPage.evaluate.mockRejectedValueOnce(new Error('Page evaluation failed'));
      
      const htmlContent = '<h1>Test content</h1>';
      const result = await generator.generatePDF(htmlContent, testOutputPath);

      expect(result.success).toBe(true);
      expect(result.metadata?.pages).toBe(1); // Should default to 1 when evaluation fails
    });
  });
});
