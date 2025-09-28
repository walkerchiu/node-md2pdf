/**
 * Chrome Headless PDF Engine Adapter
 * Alternative PDF engine using chrome-launcher for direct Chrome integration
 * This serves as an example of how to implement backup engines
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, resolve, join } from 'path';

import {
  IPDFEngine,
  PDFEngineOptions,
  PDFGenerationContext,
  PDFEngineResult,
  PDFEngineHealthStatus,
  PDFEngineCapabilities,
  PDFEngineMetrics,
} from './types';

/**
 * Chrome Headless Engine - Fallback PDF engine
 * Note: This is a demonstration implementation
 * In production, you might use chrome-launcher or similar libraries
 */
export class ChromeHeadlessPDFEngine implements IPDFEngine {
  public readonly name = 'chrome-headless';
  public readonly version: string;
  public readonly capabilities: PDFEngineCapabilities = {
    supportedFormats: ['A4', 'A3', 'A5', 'Letter', 'Legal'],
    maxConcurrentJobs: 2, // Lower than Puppeteer for resource management
    supportsCustomCSS: true,
    supportsChineseText: true,
    supportsTOC: false, // Limited TOC support in this implementation
    supportsHeaderFooter: true,
  };

  private isInitialized = false;
  private chromePath: string | null = null;
  private metrics: PDFEngineMetrics;
  private activeTasks = 0;
  private initStartTime: number;
  private lastFailure?: {
    timestamp: Date;
    error: string;
    context: PDFGenerationContext;
  };

  constructor() {
    this.version = this.getChromeVersion();
    this.initStartTime = Date.now();
    this.metrics = {
      engineName: this.name,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageTime: 0,
      peakMemoryUsage: 0,
      uptime: 0,
    };
  }

  private getChromeVersion(): string {
    // In a real implementation, you would detect the Chrome version
    return 'chrome-headless-1.0';
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Try to find Chrome executable
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        this.chromePath = path;
        break;
      }
    }

    if (!this.chromePath) {
      throw new Error(
        'Chrome executable not found. Please install Google Chrome or Chromium.',
      );
    }

    // Test Chrome availability
    try {
      await this.testChromeExecution();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(
        `Chrome initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async testChromeExecution(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.chromePath!, ['--version'], { stdio: 'pipe' });

      let output = '';
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      const timer = setTimeout(() => {
        try {
          child.kill();
        } catch (e) {
          // ignore kill errors
        }
        reject(new Error('Chrome test timed out'));
      }, 5_000);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (
          code === 0 &&
          (output.includes('Google Chrome') || output.includes('Chromium'))
        ) {
          resolve();
        } else {
          reject(new Error(`Chrome test failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async generatePDF(
    context: PDFGenerationContext,
    options: PDFEngineOptions,
  ): Promise<PDFEngineResult> {
    const startTime = Date.now();
    this.activeTasks++;
    this.metrics.totalTasks++;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Ensure output directory exists
      const outputDir = dirname(context.outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const resolvedOutputPath = resolve(context.outputPath);
      if (!resolvedOutputPath.toLowerCase().endsWith('.pdf')) {
        throw new Error('Output path must end with .pdf extension');
      }

      // Create temporary HTML file
      const tempHtmlPath = await this.createTempHTMLFile(context);

      try {
        // Generate PDF using Chrome headless
        await this.executeChromeHeadless(
          tempHtmlPath,
          resolvedOutputPath,
          options,
        );

        // Verify PDF was created
        if (!existsSync(resolvedOutputPath)) {
          throw new Error('PDF file was not created');
        }

        const generationTime = Date.now() - startTime;
        this.updateMetrics(true, generationTime);

        // Get file stats
        const stats = statSync(resolvedOutputPath);

        return {
          success: true,
          outputPath: resolvedOutputPath,
          metadata: {
            pages: 1, // Chrome headless doesn't easily provide page count
            fileSize: stats.size,
            generationTime,
            engineUsed: this.name,
          },
        };
      } finally {
        // Cleanup temp file
        if (existsSync(tempHtmlPath)) {
          unlinkSync(tempHtmlPath);
        }
      }
    } catch (error) {
      const generationTime = Date.now() - startTime;
      this.updateMetrics(false, generationTime);
      this.lastFailure = {
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
        context,
      };

      return {
        success: false,
        error: `Chrome headless PDF generation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      this.activeTasks--;
    }
  }

  private async createTempHTMLFile(
    context: PDFGenerationContext,
  ): Promise<string> {
    const tempDir = tmpdir();
    const tempHtmlPath = join(tempDir, `md2pdf_temp_${Date.now()}.html`);

    // Create full HTML with CSS
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${context.title || 'Document'}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 1in; 
            line-height: 1.6; 
        }
        h1, h2, h3, h4, h5, h6 { 
            color: #333; 
            margin-top: 1em; 
            margin-bottom: 0.5em; 
        }
        pre, code { 
            background: #f5f5f5; 
            border-radius: 3px; 
            padding: 0.2em 0.4em; 
        }
        pre { 
            padding: 1em; 
            overflow-x: auto; 
        }
    `;

    // Add Chinese font support
    if (context.enableChineseSupport) {
      htmlContent += `
        * { font-family: 'Noto Sans CJK SC', 'Microsoft YaHei', Arial, sans-serif !important; }
      `;
    }

    // Add custom CSS
    if (context.customCSS) {
      htmlContent += context.customCSS;
    }

    htmlContent += `
    </style>
</head>
<body>
    ${context.htmlContent}
</body>
</html>`;

    writeFileSync(tempHtmlPath, htmlContent, 'utf8');
    return tempHtmlPath;
  }

  private async executeChromeHeadless(
    htmlPath: string,
    outputPath: string,
    options: PDFEngineOptions,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--print-to-pdf=' + outputPath,
        '--print-to-pdf-no-header',
      ];

      // Add paper size
      if (options.format) {
        args.push(`--print-to-pdf-paper-size=${options.format.toLowerCase()}`);
      }

      // Add the HTML file URL
      args.push(`file://${htmlPath}`);

      const chromeProcess = spawn(this.chromePath!, args, {
        stdio: 'pipe',
        timeout: 30000, // 30 second timeout
      });

      let stderr = '';
      chromeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      chromeProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `Chrome process failed with code ${code}. Error: ${stderr}`,
            ),
          );
        }
      });

      chromeProcess.on('error', (error) => {
        reject(new Error(`Chrome process error: ${error.message}`));
      });
    });
  }

  private updateMetrics(success: boolean, generationTime: number): void {
    if (success) {
      this.metrics.successfulTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    // Update average time
    const totalSuccessful = this.metrics.successfulTasks;
    if (totalSuccessful > 0) {
      this.metrics.averageTime =
        (this.metrics.averageTime * (totalSuccessful - 1) + generationTime) /
        totalSuccessful;
    }

    this.metrics.uptime = Date.now() - this.initStartTime;
  }

  async healthCheck(): Promise<PDFEngineHealthStatus> {
    const errors: string[] = [];
    let isHealthy = true;

    try {
      if (!this.chromePath) {
        await this.initialize();
      }

      if (!this.chromePath) {
        errors.push('Chrome executable not found');
        isHealthy = false;
      } else {
        // Test Chrome execution
        await this.testChromeExecution();
      }
    } catch (error) {
      errors.push(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      isHealthy = false;
    }

    return {
      isHealthy,
      engineName: this.name,
      version: this.version,
      lastCheck: new Date(),
      errors,
      performance: {
        averageGenerationTime: this.metrics.averageTime,
        successRate:
          this.metrics.totalTasks > 0
            ? this.metrics.successfulTasks / this.metrics.totalTasks
            : 0,
        memoryUsage: this.getCurrentMemoryUsage(),
      },
    };
  }

  async getResourceUsage(): Promise<{
    memoryUsage: number;
    activeTasks: number;
    averageTaskTime: number;
  }> {
    return {
      memoryUsage: this.getCurrentMemoryUsage(),
      activeTasks: this.activeTasks,
      averageTaskTime: this.metrics.averageTime,
    };
  }

  private getCurrentMemoryUsage(): number {
    try {
      const usage = process.memoryUsage();
      return usage.heapUsed;
    } catch {
      return 0;
    }
  }

  async canHandle(context: PDFGenerationContext): Promise<boolean> {
    // Chrome headless has some limitations
    if (context.toc?.enabled) {
      // This implementation doesn't support TOC
      return false;
    }

    // Can handle most other contexts
    return true;
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.chromePath = null;
    // Chrome headless doesn't need special cleanup like browser instances
  }

  getMetrics(): PDFEngineMetrics {
    if (this.lastFailure) {
      return { ...this.metrics, lastFailure: this.lastFailure };
    }

    return { ...this.metrics };
  }
}
