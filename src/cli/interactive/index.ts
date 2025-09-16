/**
 * Interactive CLI mode
 */

import chalk from 'chalk';
import ora from 'ora';
import { ConversionConfig } from '../../types';
import { MarkdownParser } from '../../core/parser';
import { PDFGenerator } from '../../core/pdf';
import { StyleOptions } from '../../core/pdf/types';

export class InteractiveMode {
  /**
   * Start interactive conversion process
   */
  async start(): Promise<void> {
    try {
      console.log(chalk.cyan('📋 Interactive Markdown to PDF Configuration'));
      console.log(chalk.gray('Please answer the following questions to complete the conversion setup:'));
      console.log();

      // Step 1: Select input file
      const config = await this.getConversionConfig();

      // Step 2: Confirm configuration
      const confirmed = await this.confirmConfig(config);

      if (confirmed) {
        await this.performConversion(config);
      } else {
        console.log(chalk.yellow('❌ Conversion cancelled'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Interactive mode error:'), error);
      throw error;
    }
  }

  /**
   * Get conversion configuration
   */
  private async getConversionConfig(): Promise<ConversionConfig> {
    const inquirer = await import('inquirer');
    const answers = await (inquirer as any).default.prompt([
      {
        type: 'input',
        name: 'inputPath',
        message: 'Please enter Markdown file path:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Please enter a file path';
          }
          if (!input.endsWith('.md') && !input.endsWith('.markdown')) {
            return 'Please enter a valid Markdown file (.md or .markdown)';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'outputPath',
        message: 'Please enter output PDF file path (press Enter for default):',
        default: (answers: any) => {
          const input = answers.inputPath;
          return input.replace(/\.(md|markdown)$/, '.pdf');
        }
      },
      {
        type: 'list',
        name: 'tocDepth',
        message: 'Please select table of contents depth:',
        choices: [
          { name: '1 level (H1 only)', value: 1 },
          { name: '2 levels (H1-H2)', value: 2 },
          { name: '3 levels (H1-H3)', value: 3 },
          { name: '4 levels (H1-H4)', value: 4 },
          { name: '5 levels (H1-H5)', value: 5 },
          { name: '6 levels (H1-H6)', value: 6 }
        ],
        default: 2,
      },
      {
        type: 'confirm',
        name: 'includePageNumbers',
        message: 'Include page numbers?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'chineseFontSupport',
        message: 'Enable Chinese font support?',
        default: true,
      }
    ]);

    return answers as ConversionConfig;
  }

  /**
   * Confirm configuration
   */
  private async confirmConfig(config: ConversionConfig): Promise<boolean> {
    console.log();
    console.log(chalk.cyan('📄 Conversion Configuration Summary:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.bold('Input file:')} ${config.inputPath}`);
    console.log(`${chalk.bold('Output file:')} ${config.outputPath}`);
    console.log(`${chalk.bold('TOC depth:')} ${config.tocDepth} levels`);
    console.log(`${chalk.bold('Page numbers:')} ${config.includePageNumbers ? 'Yes' : 'No'}`);
    console.log(`${chalk.bold('Chinese support:')} ${config.chineseFontSupport ? 'Yes' : 'No'}`);
    console.log(chalk.gray('─'.repeat(50)));
    console.log();

    const inquirer = await import('inquirer');
    const { confirmed } = await (inquirer as any).default.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Confirm and start conversion?',
        default: true
      }
    ]);

    return confirmed;
  }

  /**
   * Perform the actual conversion process
   */
  private async performConversion(config: ConversionConfig): Promise<void> {
    const spinner = ora('🚀 Starting conversion process...').start();
    
    try {
      // Step 1: Validate input file
      spinner.text = '📄 Validating input file...';
      const { existsSync } = await import('fs');
      
      if (!existsSync(config.inputPath)) {
        throw new Error(`Input file not found: ${config.inputPath}`);
      }
      
      // Step 2: Initialize parser and generator
      spinner.text = '🔧 Initializing parser and PDF generator...';
      const parser = new MarkdownParser();
      const pdfGenerator = new PDFGenerator({
        margin: {
          top: '1in',
          right: '1in', 
          bottom: '1in',
          left: '1in'
        },
        displayHeaderFooter: config.includePageNumbers,
        footerTemplate: config.includePageNumbers ? 
          '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' :
          '',
        printBackground: true,
        toc: {
          enabled: true,
          maxDepth: config.tocDepth,
          includePageNumbers: config.includePageNumbers,
          title: '目錄'
        }
      });
      
      // Step 3: Parse Markdown
      spinner.text = '📖 Parsing Markdown content...';
      const { readFileSync } = await import('fs');
      const originalMarkdownContent = readFileSync(config.inputPath, 'utf-8');
      const parsed = parser.parseFile(config.inputPath);
      
      // Step 4: Generate PDF
      spinner.text = '📑 Generating PDF document...';
      const outputPath = config.outputPath || config.inputPath.replace(/\.(md|markdown)$/, '.pdf');
      
      const options: {
        title?: string;
        customCSS?: string;
        styleOptions?: StyleOptions;
        headings?: any[];
        markdownContent?: string;
      } = {
        title: config.inputPath.replace(/.*[/\\]/, '').replace(/\.(md|markdown)$/, ''),
        headings: parsed.headings,
        markdownContent: originalMarkdownContent
      };
      
      if (config.chineseFontSupport) {
        options.styleOptions = {
          fontFamily: 'Noto Sans CJK SC, Arial, sans-serif'
        };
      }
      
      const result = await pdfGenerator.generatePDF(
        parsed.content,
        outputPath,
        options
      );
      
      // Step 5: Clean up
      await pdfGenerator.close();
      
      if (result.success) {
        spinner.succeed(chalk.green('✅ Conversion completed successfully!'));
        console.log();
        console.log(chalk.cyan('📄 Conversion Results:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`${chalk.bold('Output file:')} ${result.outputPath}`);
        if (result.metadata) {
          console.log(`${chalk.bold('Pages:')} ${result.metadata.pages}`);
          console.log(`${chalk.bold('File size:')} ${this.formatBytes(result.metadata.fileSize)}`);
          console.log(`${chalk.bold('Generation time:')} ${result.metadata.generationTime}ms`);
        }
        console.log(chalk.gray('─'.repeat(50)));
        console.log();
      } else {
        spinner.fail(chalk.red('❌ Conversion failed!'));
        console.error(chalk.red('Error:'), result.error);
        throw new Error(result.error || 'Unknown conversion error');
      }
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Conversion failed!'));
      throw error;
    }
  }
  
  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
