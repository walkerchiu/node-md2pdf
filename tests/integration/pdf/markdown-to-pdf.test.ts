/**
 * Integration tests for Markdown to PDF conversion
 * Tests the complete pipeline from Markdown parsing to PDF generation
 */

import { MarkdownParser } from '../../../src/core/parser';
import { PDFGenerator } from '../../../src/core/pdf';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync } from 'fs';

// Run all integration tests - handle Puppeteer environment conditionally within tests

describe('Markdown to PDF Integration', () => {
  let parser: MarkdownParser;
  let pdfGenerator: PDFGenerator;
  const fixturesPath = join(__dirname, '../../fixtures/markdown');
  const outputDir = join(__dirname, '../../temp/pdf-integration');
  
  beforeAll(() => {
    // Create output directory for integration tests
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up output directory
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
  
  beforeEach(() => {
    parser = new MarkdownParser();
    pdfGenerator = new PDFGenerator();
  });

  let canRunPuppeteer = false;

  beforeAll(async () => {
    // Check Puppeteer environment capability
    try {
      const testGenerator = new PDFGenerator();
      const validation = await testGenerator.validateEnvironment();
      canRunPuppeteer = validation.isValid;
      
      // Ensure immediate cleanup
      await testGenerator.close();
      
      if (!canRunPuppeteer) {
        console.warn('⚠️  Puppeteer environment validation failed');
        console.warn('ℹ️  Tests will verify error handling instead of actual PDF generation');
      } else {
        console.log('✅ Puppeteer environment validation passed - will test actual PDF generation');
      }
    } catch (error) {
      canRunPuppeteer = false;
      console.warn('⚠️  Puppeteer environment check failed, using fallback mode');
    }
  });
  
  afterEach(async () => {
    // Aggressive cleanup to prevent hanging
    if (pdfGenerator) {
      try {
        const closePromise = pdfGenerator.close();
        const timeoutPromise = new Promise<void>((_, reject) => {
          const timer = setTimeout(() => reject(new Error('Close timeout')), 1000);
          timer.unref(); // Don't keep the process alive
        });
        
        await Promise.race([closePromise, timeoutPromise]);
      } catch {
        // Force recreate instance if cleanup fails
        try {
          // Force null the browser reference if accessible
          if ((pdfGenerator as any).browser) {
            (pdfGenerator as any).browser = null;
          }
        } catch {
          // Ignore
        }
      }
      
      // Always create fresh instance for next test
      pdfGenerator = new PDFGenerator();
    }
  });

  afterAll(async () => {
    // Final aggressive cleanup
    if (pdfGenerator) {
      try {
        await pdfGenerator.close();
      } catch {
        // Force cleanup
      } finally {
        pdfGenerator = null as any;
      }
    }
    
    // Clear any remaining timers
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  });

  describe('Complete Markdown to PDF conversion', () => {
    it('should convert simple Markdown to PDF', async () => {
      const inputPath = join(fixturesPath, 'simple.md');
      const outputPath = join(outputDir, 'simple-test.pdf');
      
      // Step 1: Parse Markdown (always works)
      const parseResult = parser.parseFile(inputPath);
      expect(parseResult.content).toBeTruthy();
      expect(parseResult.headings).toHaveLength(4);
      
      // Step 2: Generate PDF (depends on environment)
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        outputPath,
        {
          title: (parseResult.metadata?.title as string) || 'Simple Test Document'
        }
      );
      
      if (canRunPuppeteer) {
        // In environments where Puppeteer works, expect success
        expect(pdfResult.success).toBe(true);
        expect(pdfResult.outputPath).toBe(outputPath);
        expect(existsSync(outputPath)).toBe(true);
        expect(pdfResult.metadata?.fileSize).toBeGreaterThan(0);
        console.log('✅ Actual PDF generation successful');
      } else {
        // In restricted environments, expect graceful failure
        expect(pdfResult.success).toBe(false);
        expect(pdfResult.error).toBeTruthy();
        expect(pdfResult.error).toContain('Failed to initialize PDF generator');
        console.log('✅ PDF generation gracefully failed as expected in restricted environment');
      }
    });

    it('should convert Chinese Markdown to PDF with proper font support', async () => {
      const inputPath = join(fixturesPath, 'sample.md');
      const outputPath = join(outputDir, 'chinese-sample.pdf');
      
      // Parse Markdown with Chinese content (always works)
      const parseResult = parser.parseFile(inputPath);
      expect(parseResult.content).toContain('測試文件標題');
      expect(parseResult.content).toContain('中文測試');
      
      // Generate PDF with Chinese font support (depends on environment)
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        outputPath,
        {
          title: '中文測試文件'
        }
      );
      
      if (canRunPuppeteer) {
        expect(pdfResult.success).toBe(true);
        expect(existsSync(outputPath)).toBe(true);
        expect(pdfResult.metadata?.fileSize).toBeGreaterThan(0);
        console.log('✅ Chinese PDF generation successful');
      } else {
        expect(pdfResult.success).toBe(false);
        expect(pdfResult.error).toBeTruthy();
        console.log('✅ Chinese PDF generation gracefully failed as expected');
      }
    });

    it('should handle Markdown with YAML frontmatter', async () => {
      const inputPath = join(fixturesPath, 'with-metadata.md');
      const outputPath = join(outputDir, 'with-metadata.pdf');
      
      // Parse Markdown with frontmatter (always works)
      const parseResult = parser.parseFile(inputPath);
      expect(parseResult.metadata?.title).toBe('Test Document with Metadata');
      expect(parseResult.metadata?.author).toBe('MD2PDF Test Suite');
      
      // Generate PDF using metadata (depends on environment)
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        outputPath,
        {
          title: parseResult.metadata?.title as string,
          customCSS: `
            .document-info {
              margin-bottom: 2em;
              padding: 1em;
              background: #f8f9fa;
              border-left: 4px solid #007bff;
            }
          `
        }
      );
      
      if (canRunPuppeteer) {
        expect(pdfResult.success).toBe(true);
        expect(existsSync(outputPath)).toBe(true);
        console.log('✅ Metadata PDF generation successful');
      } else {
        expect(pdfResult.success).toBe(false);
        expect(pdfResult.error).toBeTruthy();
        console.log('✅ Metadata PDF generation gracefully failed as expected');
      }
    });
  });

  describe('Error handling in integration', () => {
    it('should handle parser errors gracefully', () => {
      const nonExistentPath = join(fixturesPath, 'non-existent.md');
      
      expect(() => {
        parser.parseFile(nonExistentPath);
      }).toThrow(/Failed to read file/);
    });

    it('should handle PDF generation errors gracefully', async () => {
      const invalidOutputPath = '/nonexistent/directory/that/cannot/be/created/test.pdf';
      const parseResult = parser.parse('# Simple Test');
      
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        invalidOutputPath
      );
      
      expect(pdfResult.success).toBe(false);
      expect(pdfResult.error).toBeTruthy();
    });
  });

  describe('Performance integration tests', () => {
    it('should complete conversion within reasonable time', async () => {
      const inputPath = join(fixturesPath, 'sample.md');
      const outputPath = join(outputDir, 'performance-test.pdf');
      
      const startTime = Date.now();
      
      // Complete conversion pipeline
      const parseResult = parser.parseFile(inputPath);
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        outputPath
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Parsing should always be fast
      expect(totalTime).toBeLessThan(10000); // 10 seconds max
      
      if (canRunPuppeteer) {
        expect(pdfResult.success).toBe(true);
        // Should complete within 5 seconds for small files
        expect(totalTime).toBeLessThan(5000);
        console.log(`✅ Performance test passed: ${totalTime}ms`);
      } else {
        expect(pdfResult.success).toBe(false);
        console.log('✅ Performance test completed (PDF gen skipped)');
      }
    });
  });

  describe('Content preservation', () => {
    it('should preserve all Markdown elements in PDF', async () => {
      const inputPath = join(fixturesPath, 'sample.md');
      const outputPath = join(outputDir, 'content-preservation.pdf');
      
      const parseResult = parser.parseFile(inputPath);
      
      // Verify various Markdown elements are parsed
      expect(parseResult.content).toContain('<h1');
      expect(parseResult.content).toContain('<h2');
      expect(parseResult.content).toContain('<table>');
      expect(parseResult.content).toContain('<ul>');
      expect(parseResult.content).toContain('<pre class="language-');
      expect(parseResult.content).toContain('<strong>');
      expect(parseResult.content).toContain('<em>');
      expect(parseResult.content).toContain('<a href=');
      
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        outputPath
      );
      
      if (canRunPuppeteer) {
        expect(pdfResult.success).toBe(true);
        expect(pdfResult.metadata?.fileSize).toBeGreaterThan(1000);
        console.log('✅ Content preservation test passed');
      } else {
        expect(pdfResult.success).toBe(false);
        console.log('✅ Content preservation verified (parsing only)');
      }
    });

    it('should maintain heading structure for navigation', async () => {
      const inputPath = join(fixturesPath, 'simple.md');
      const outputPath = join(outputDir, 'heading-structure.pdf');
      
      const parseResult = parser.parseFile(inputPath);
      
      // Verify heading structure
      expect(parseResult.headings).toHaveLength(4);
      expect(parseResult.headings[0].level).toBe(1);
      expect(parseResult.headings[1].level).toBe(2);
      expect(parseResult.headings[2].level).toBe(3);
      expect(parseResult.headings[3].level).toBe(2);
      
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        outputPath
      );
      
      if (canRunPuppeteer) {
        expect(pdfResult.success).toBe(true);
        console.log('✅ Heading structure maintained in PDF');
      } else {
        expect(pdfResult.success).toBe(false);
        console.log('✅ Heading structure verified (structure parsing confirmed)');
      }
    });
  });
});
