/**
 * Mock integration tests for Markdown to PDF conversion
 * Tests the complete pipeline logic without actual PDF generation
 */

import { MarkdownParser } from '../../../src/core/parser';
import { PDFGenerator } from '../../../src/core/pdf';
import { join } from 'path';

// Mock PDFGenerator for integration testing
jest.mock('../../../src/core/pdf/pdf-generator');

const MockedPDFGenerator = PDFGenerator as jest.MockedClass<
  typeof PDFGenerator
>;

describe('Markdown to PDF Integration (Mocked)', () => {
  let parser: MarkdownParser;
  let pdfGenerator: PDFGenerator;
  let mockGeneratePDF: jest.MockedFunction<
    typeof PDFGenerator.prototype.generatePDF
  >;
  let mockValidateEnvironment: jest.MockedFunction<
    typeof PDFGenerator.prototype.validateEnvironment
  >;
  let mockClose: jest.MockedFunction<typeof PDFGenerator.prototype.close>;

  const fixturesPath = join(__dirname, '../../fixtures/markdown');

  beforeEach(() => {
    parser = new MarkdownParser();

    // Setup mocks
    mockGeneratePDF = jest.fn();
    mockValidateEnvironment = jest.fn();
    mockClose = jest.fn();

    MockedPDFGenerator.mockImplementation(
      () =>
        ({
          generatePDF: mockGeneratePDF,
          validateEnvironment: mockValidateEnvironment,
          close: mockClose,
          // Other methods that might be called
          initialize: jest.fn(),
          generatePDFFromFile: jest.fn(),
          updateOptions: jest.fn(),
          getOptions: jest.fn(),
        }) as unknown as PDFGenerator,
    );

    pdfGenerator = new PDFGenerator();
  });

  describe('Complete integration workflow', () => {
    it('should successfully integrate parser and PDF generator', async () => {
      // Mock successful PDF generation
      mockGeneratePDF.mockResolvedValue({
        success: true,
        outputPath: '/mock/output/path.pdf',
        metadata: {
          pages: 2,
          fileSize: 1024,
          generationTime: 500,
        },
      });

      // Step 1: Parse Markdown
      const inputPath = join(fixturesPath, 'simple.md');
      const parseResult = parser.parseFile(inputPath);

      expect(parseResult.content).toBeTruthy();
      expect(parseResult.headings).toHaveLength(4);

      // Step 2: Generate PDF
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        '/mock/output.pdf',
        {
          title: 'Simple Test Document',
        },
      );

      // Verify integration
      expect(mockGeneratePDF).toHaveBeenCalledWith(
        parseResult.content,
        '/mock/output.pdf',
        {
          title: 'Simple Test Document',
        },
      );

      expect(pdfResult.success).toBe(true);
      expect(pdfResult.outputPath).toBe('/mock/output/path.pdf');
      expect(pdfResult.metadata?.fileSize).toBe(1024);
    });

    it('should handle Chinese content integration', async () => {
      // Mock successful PDF generation
      mockGeneratePDF.mockResolvedValue({
        success: true,
        outputPath: '/mock/chinese.pdf',
        metadata: {
          pages: 3,
          fileSize: 2048,
          generationTime: 750,
        },
      });

      // Parse Chinese Markdown
      const inputPath = join(fixturesPath, 'sample.md');
      const parseResult = parser.parseFile(inputPath);

      expect(parseResult.content).toContain('測試文件標題');
      expect(parseResult.content).toContain('中文測試');

      // Generate PDF with Chinese content
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        '/mock/chinese.pdf',
        {
          title: '中文測試文件',
        },
      );

      expect(mockGeneratePDF).toHaveBeenCalledWith(
        expect.stringContaining('測試文件標題'),
        '/mock/chinese.pdf',
        expect.objectContaining({
          title: '中文測試文件',
        }),
      );

      expect(pdfResult.success).toBe(true);
    });

    it('should integrate with metadata from frontmatter', async () => {
      mockGeneratePDF.mockResolvedValue({
        success: true,
        outputPath: '/mock/with-metadata.pdf',
        metadata: {
          pages: 1,
          fileSize: 512,
          generationTime: 300,
        },
      });

      // Parse Markdown with frontmatter
      const inputPath = join(fixturesPath, 'with-metadata.md');
      const parseResult = parser.parseFile(inputPath);

      expect(parseResult.metadata?.title).toBe('Test Document with Metadata');
      expect(parseResult.metadata?.author).toBe('MD2PDF Test Suite');

      // Use metadata in PDF generation
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        '/mock/with-metadata.pdf',
        {
          title: parseResult.metadata?.title as string,
          customCSS: 'body { font-family: serif; }',
        },
      );

      expect(mockGeneratePDF).toHaveBeenCalledWith(
        parseResult.content,
        '/mock/with-metadata.pdf',
        expect.objectContaining({
          title: 'Test Document with Metadata',
          customCSS: expect.stringContaining('serif'),
        }),
      );

      expect(pdfResult.success).toBe(true);
    });
  });

  describe('Error handling integration', () => {
    it('should handle parser errors in integration', () => {
      const nonExistentPath = join(fixturesPath, 'non-existent.md');

      expect(() => {
        parser.parseFile(nonExistentPath);
      }).toThrow(/Failed to read file/);
    });

    it('should handle PDF generation errors in integration', async () => {
      // Mock PDF generation failure
      mockGeneratePDF.mockResolvedValue({
        success: false,
        error: 'Mock PDF generation error',
      });

      const parseResult = parser.parse('# Simple Test');
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        '/invalid/path.pdf',
      );

      expect(pdfResult.success).toBe(false);
      expect(pdfResult.error).toBe('Mock PDF generation error');
    });
  });

  describe('Resource management integration', () => {
    it('should properly clean up resources', async () => {
      mockGeneratePDF.mockResolvedValue({ success: true });

      // Perform some operations
      const parseResult = parser.parse('# Test');
      await pdfGenerator.generatePDF(parseResult.content, '/mock.pdf');

      // Clean up
      await pdfGenerator.close();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Performance characteristics', () => {
    it('should track performance metrics in integration', async () => {
      mockGeneratePDF.mockResolvedValue({
        success: true,
        outputPath: '/mock.pdf',
        metadata: {
          pages: 2,
          fileSize: 1024,
          generationTime: 150,
        },
      });

      const startTime = Date.now();

      // Complete pipeline
      const parseResult = parser.parseFile(join(fixturesPath, 'simple.md'));
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        '/mock.pdf',
      );

      const totalTime = Date.now() - startTime;

      expect(pdfResult.success).toBe(true);
      expect(pdfResult.metadata?.generationTime).toBe(150);

      // Total time should include parsing + PDF generation time
      expect(totalTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Content preservation integration', () => {
    it('should preserve all parsed elements through to PDF', async () => {
      mockGeneratePDF.mockResolvedValue({ success: true });

      const inputPath = join(fixturesPath, 'sample.md');
      const parseResult = parser.parseFile(inputPath);

      // Verify all elements are parsed
      expect(parseResult.content).toContain('<h1');
      expect(parseResult.content).toContain('<h2');
      expect(parseResult.content).toContain('<table>');
      expect(parseResult.content).toContain('<ul>');
      expect(parseResult.content).toContain('<pre class="language-');
      expect(parseResult.content).toContain('<strong>');
      expect(parseResult.content).toContain('<em>');
      expect(parseResult.content).toContain('<a href=');

      // Generate PDF and verify content is passed through
      await pdfGenerator.generatePDF(parseResult.content, '/mock.pdf');

      const [htmlContent] = mockGeneratePDF.mock.calls[0];

      // Verify all elements are preserved in the content passed to PDF generator
      expect(htmlContent).toContain('<h1');
      expect(htmlContent).toContain('<h2');
      expect(htmlContent).toContain('<table>');
      expect(htmlContent).toContain('<ul>');
      expect(htmlContent).toContain('<pre class="language-');
      expect(htmlContent).toContain('<strong>');
      expect(htmlContent).toContain('<em>');
      expect(htmlContent).toContain('<a href=');
    });

    it('should maintain heading structure for PDF navigation', async () => {
      mockGeneratePDF.mockResolvedValue({ success: true });

      const inputPath = join(fixturesPath, 'simple.md');
      const parseResult = parser.parseFile(inputPath);

      // Verify heading structure is extracted
      expect(parseResult.headings).toHaveLength(4);
      expect(parseResult.headings[0]).toMatchObject({
        level: 1,
        text: 'Simple Test',
        id: 'simple-test',
      });

      // Generate PDF - headings should be preserved in HTML content
      await pdfGenerator.generatePDF(parseResult.content, '/mock.pdf');

      const [htmlContent] = mockGeneratePDF.mock.calls[0];
      expect(htmlContent).toContain('id="simple-test"');
    });
  });
});
