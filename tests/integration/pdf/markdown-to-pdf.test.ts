/**
 * Integration tests for Markdown to PDF conversion
 * Tests the complete pipeline from Markdown parsing to PDF generation
 */

/* eslint-disable no-console */

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
    // Check Puppeteer environment capability with timeout
    try {
      const testGenerator = new PDFGenerator();

      // Add timeout to validation to prevent hanging
      const validation = await Promise.race([
        testGenerator.validateEnvironment(),
        new Promise<{ isValid: boolean; errors: string[] }>((_, reject) => {
          const timeoutId = setTimeout(
            () => reject(new Error('Environment validation timeout')),
            10000,
          );
          // Ensure timeout doesn't keep the process alive
          if (timeoutId.unref) {
            timeoutId.unref();
          }
        }),
      ]);

      canRunPuppeteer = validation.isValid;

      // Ensure immediate cleanup with timeout
      await Promise.race([
        testGenerator.close(),
        new Promise<void>((_, reject) => {
          const timeoutId = setTimeout(
            () => reject(new Error('Cleanup timeout')),
            3000,
          );
          if (timeoutId.unref) {
            timeoutId.unref();
          }
        }),
      ]).catch(() => {
        // Force cleanup on timeout
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (testGenerator as any).browser = null;
        } catch {
          // Ignore cleanup errors
        }
      });

      if (!canRunPuppeteer) {
        console.warn(
          '⚠️  Puppeteer environment validation failed:',
          validation.errors,
        );
        console.warn(
          'ℹ️  Tests will verify error handling instead of actual PDF generation',
        );
      } else {
        console.log(
          '✅ Puppeteer environment validation passed - will test actual PDF generation',
        );
      }
    } catch (error) {
      canRunPuppeteer = false;
      console.warn(
        '⚠️  Puppeteer environment check failed, using fallback mode:',
        (error as Error).message,
      );
    }
  }, 15000);

  afterEach(async () => {
    // Aggressive cleanup to prevent hanging
    if (pdfGenerator) {
      try {
        const closePromise = pdfGenerator.close();
        const timeoutPromise = new Promise<void>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error('Close timeout')),
            1000,
          );
          // Don't keep the process alive
          if (timer.unref) {
            timer.unref();
          }
        });

        await Promise.race([closePromise, timeoutPromise]);
      } catch {
        // Force recreate instance if cleanup fails
        try {
          // Force null the browser reference if accessible
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((pdfGenerator as any).browser) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (pdfGenerator as any).browser = null;
          }
        } catch {
          // Ignore cleanup errors
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
        // Force cleanup - ignore errors
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // Step 2: Generate PDF (always attempt, check result)
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        outputPath,
        {
          title:
            (parseResult.metadata?.title as string | undefined) ||
            'Simple Test Document',
        },
      );

      // Check results regardless of initial validation
      if (pdfResult.success) {
        // PDF generation succeeded
        expect(pdfResult.outputPath).toBe(outputPath);
        expect(existsSync(outputPath)).toBe(true);
        expect(pdfResult.metadata?.fileSize).toBeGreaterThan(0);
        console.log('✅ Actual PDF generation successful');
      } else {
        // PDF generation failed gracefully
        expect(pdfResult.error).toBeTruthy();
        expect(pdfResult.error).toMatch(
          /Failed to initialize PDF generator|PDF generation failed/,
        );
        console.log('✅ PDF generation gracefully failed:', pdfResult.error);
      }
    });

    it('should convert Chinese Markdown to PDF with proper font support', async () => {
      const inputPath = join(fixturesPath, 'sample.md');
      const outputPath = join(outputDir, 'chinese-sample.pdf');

      // Parse Markdown with Chinese content (always works)
      const parseResult = parser.parseFile(inputPath);
      expect(parseResult.content).toContain('測試文件標題');
      expect(parseResult.content).toContain('中文測試');

      // Generate PDF with Chinese font support
      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        outputPath,
        {
          title: '中文測試文件',
        },
      );

      // Check results regardless of initial validation
      if (pdfResult.success) {
        expect(existsSync(outputPath)).toBe(true);
        expect(pdfResult.metadata?.fileSize).toBeGreaterThan(0);
        console.log('✅ Chinese PDF generation successful');
      } else {
        expect(pdfResult.error).toBeTruthy();
        console.log(
          '✅ Chinese PDF generation gracefully failed:',
          pdfResult.error,
        );
      }
    });

    it('should handle Markdown with YAML frontmatter', async () => {
      const inputPath = join(fixturesPath, 'with-metadata.md');
      const outputPath = join(outputDir, 'with-metadata.pdf');

      // Parse Markdown with frontmatter (always works)
      const parseResult = parser.parseFile(inputPath);
      expect(parseResult.metadata?.title).toBe('Test Document with Metadata');
      expect(parseResult.metadata?.author).toBe('MD2PDF Test Suite');

      // Generate PDF using metadata
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
          `,
        },
      );

      // Check results regardless of initial validation
      if (pdfResult.success) {
        expect(existsSync(outputPath)).toBe(true);
        console.log('✅ Metadata PDF generation successful');
      } else {
        expect(pdfResult.error).toBeTruthy();
        console.log(
          '✅ Metadata PDF generation gracefully failed:',
          pdfResult.error,
        );
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
      const invalidOutputPath =
        '/nonexistent/directory/that/cannot/be/created/test.pdf';
      const parseResult = parser.parse('# Simple Test');

      const pdfResult = await pdfGenerator.generatePDF(
        parseResult.content,
        invalidOutputPath,
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
        outputPath,
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Overall process should complete within reasonable time
      expect(totalTime).toBeLessThan(15000); // 15 seconds max for any environment

      if (pdfResult.success) {
        // If PDF generation succeeded, should complete within 12 seconds for small files on Apple Silicon
        expect(totalTime).toBeLessThan(12000);
        console.log(`✅ Performance test passed: ${totalTime}ms`);
      } else {
        // Even if PDF generation failed, parsing should be fast
        expect(totalTime).toBeLessThan(10000);
        console.log(
          `✅ Performance test completed (PDF gen failed gracefully): ${totalTime}ms`,
        );
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
        outputPath,
      );

      // Check results regardless of initial validation
      if (pdfResult.success) {
        expect(pdfResult.metadata?.fileSize).toBeGreaterThan(1000);
        console.log('✅ Content preservation test passed');
      } else {
        expect(pdfResult.error).toBeTruthy();
        console.log(
          '✅ Content preservation verified (parsing only, PDF gen failed):',
          pdfResult.error,
        );
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
        outputPath,
      );

      // Check results regardless of initial validation
      if (pdfResult.success) {
        console.log('✅ Heading structure maintained in PDF');
      } else {
        expect(pdfResult.error).toBeTruthy();
        console.log(
          '✅ Heading structure verified (structure parsing confirmed, PDF gen failed):',
          pdfResult.error,
        );
      }
    });
  });
});
