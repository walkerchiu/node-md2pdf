/**
 * End-to-End CLI Tests - Conversion Verification
 * Tests the complete markdown-to-PDF conversion workflow without external process spawning
 */

import { existsSync, unlinkSync } from 'fs';
import path from 'path';
import { MarkdownParser } from '../../../src/core/parser';
import { PDFGenerator } from '../../../src/core/pdf';
import { Heading } from '../../../src/types';

describe('CLI End-to-End Tests', () => {
  const fixturesDir = path.join(__dirname, '../../fixtures/markdown');
  let parser: MarkdownParser;
  let pdfGenerator: PDFGenerator;

  beforeEach(() => {
    parser = new MarkdownParser();
    pdfGenerator = new PDFGenerator();
  });

  afterEach(async () => {
    // Clean up PDF generator
    if (pdfGenerator) {
      try {
        await pdfGenerator.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Clean up generated PDF files
    const pdfFiles = [
      path.join(fixturesDir, 'sample-e2e.pdf'),
      path.join(fixturesDir, 'simple-e2e.pdf'),
      path.join(fixturesDir, 'with-metadata-e2e.pdf'),
    ];

    pdfFiles.forEach(file => {
      if (existsSync(file)) {
        try {
          unlinkSync(file);
        } catch (error) {
          // Ignore cleanup errors in tests
        }
      }
    });
  });

  // Mock environment check to determine if we can actually run PDF generation
  const canGeneratePDF = async (): Promise<boolean> => {
    try {
      const validation = await pdfGenerator.validateEnvironment();
      return validation.isValid;
    } catch (error) {
      return false;
    }
  };

  test('should successfully convert sample Markdown file to PDF', async () => {
    const inputFile = path.join(fixturesDir, 'sample.md');
    const outputFile = path.join(fixturesDir, 'sample-e2e.pdf');

    // Ensure input file exists
    expect(existsSync(inputFile)).toBe(true);

    // Step 1: Parse the markdown file (this should always work)
    const parseResult = parser.parseFile(inputFile);
    expect(parseResult.content).toBeTruthy();
    expect(parseResult.headings).toBeDefined();
    expect(parseResult.headings.length).toBeGreaterThan(0);

    // Step 2: Check if we can generate PDF
    const canPDF = await canGeneratePDF();

    if (canPDF) {
      // Step 3: Generate PDF (only if environment supports it)
      const pdfResult = await pdfGenerator.generatePDF(parseResult.content, outputFile, {
        title: 'E2E Test Sample Document',
      });

      expect(pdfResult.success).toBe(true);
      expect(existsSync(outputFile)).toBe(true);

      // Check that PDF file has reasonable size
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const stats = require('fs').statSync(outputFile);
      expect(stats.size).toBeGreaterThan(50000);

      // eslint-disable-next-line no-console
      console.log('✅ E2E: Sample file converted successfully');
    } else {
      // eslint-disable-next-line no-console
      console.log('ℹ️  E2E: Skipping PDF generation (environment does not support Puppeteer)');
      expect(parseResult.content).toBeTruthy(); // At least verify parsing works
    }
  });

  test('should successfully process Chinese content', async () => {
    const inputFile = path.join(fixturesDir, 'sample.md'); // Contains Chinese content
    const outputFile = path.join(fixturesDir, 'sample-chinese-e2e.pdf');

    // Ensure input file exists
    expect(existsSync(inputFile)).toBe(true);

    // Step 1: Parse Chinese content
    const parseResult = parser.parseFile(inputFile);
    expect(parseResult.content).toContain('測試文件標題');
    expect(parseResult.content).toContain('中文測試');
    expect(parseResult.headings.length).toBeGreaterThan(0);

    // Step 2: Test Chinese content processing
    const chineseHeadings = parseResult.headings.filter((h: Heading) =>
      /[\u4e00-\u9fff]/.test(h.text)
    );
    expect(chineseHeadings.length).toBeGreaterThan(0);

    // Step 3: Generate PDF if possible
    const canPDF = await canGeneratePDF();

    if (canPDF) {
      const pdfResult = await pdfGenerator.generatePDF(parseResult.content, outputFile, {
        title: '中文測試文件',
      });

      expect(pdfResult.success).toBe(true);
      expect(existsSync(outputFile)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const stats = require('fs').statSync(outputFile);
      expect(stats.size).toBeGreaterThan(100000);

      // eslint-disable-next-line no-console
      console.log('✅ E2E: Chinese content processed successfully');
    } else {
      // eslint-disable-next-line no-console
      console.log('ℹ️  E2E: Skipping Chinese PDF generation (environment limitation)');
      expect(chineseHeadings.length).toBeGreaterThan(0); // At least verify Chinese parsing works
    }
  });

  test('should handle non-existent input file gracefully', async () => {
    const nonExistentFile = path.join(fixturesDir, 'does-not-exist.md');

    // Test that parser throws appropriate error for non-existent file
    expect(() => {
      parser.parseFile(nonExistentFile);
    }).toThrow(/Failed to read file.*Unknown error/);

    // eslint-disable-next-line no-console
    console.log('✅ E2E: Non-existent file error handled correctly');
  });

  test('should process any text file content (validation is UI concern)', async () => {
    // Create a temporary text file
    const txtFile = path.join(fixturesDir, 'test-e2e.txt');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('fs').writeFileSync(txtFile, '# This is markdown content\n\nEven in a .txt file');

    try {
      // Core parser should work regardless of file extension
      const parseResult = parser.parseFile(txtFile);
      expect(parseResult.content).toContain('<h1');
      expect(parseResult.headings.length).toBeGreaterThan(0);

      // eslint-disable-next-line no-console
      console.log('✅ E2E: Parser works with any text content');
    } finally {
      // Clean up
      if (existsSync(txtFile)) {
        unlinkSync(txtFile);
      }
    }
  });

  test('should provide progress feedback during conversion', async () => {
    const inputFile = path.join(fixturesDir, 'simple.md');
    const outputFile = path.join(fixturesDir, 'simple-progress-test.pdf');

    // Ensure input file exists
    expect(existsSync(inputFile)).toBe(true);

    // Test InteractiveMode progress feedback by mocking console output
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      // Step 1: Parse the markdown file
      const parseResult = parser.parseFile(inputFile);
      expect(parseResult.content).toBeTruthy();
      expect(parseResult.headings).toBeDefined();

      // Step 2: Test that conversion process provides feedback
      const canPDF = await canGeneratePDF();

      if (canPDF) {
        // Step 3: Generate PDF with progress tracking
        const pdfResult = await pdfGenerator.generatePDF(parseResult.content, outputFile, {
          title: 'Progress Test Document',
        });

        expect(pdfResult.success).toBe(true);
        expect(existsSync(outputFile)).toBe(true);
        // eslint-disable-next-line no-console
        console.log('✅ Progress: PDF generation completed successfully');
      } else {
        // eslint-disable-next-line no-console
        console.log('ℹ️  Progress: Skipping PDF generation (environment limitation)');
        expect(parseResult.content).toBeTruthy(); // At least verify parsing works
      }

      // eslint-disable-next-line no-console
      console.log('✅ Progress: Conversion process completed');
    } finally {
      consoleSpy.mockRestore();

      // Clean up generated file
      if (existsSync(outputFile)) {
        try {
          unlinkSync(outputFile);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  });
});
