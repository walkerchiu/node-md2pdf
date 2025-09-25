/**
 * Application service for processing individual Markdown files
 * Coordinates the complete workflow from Markdown to PDF
 */

import * as path from 'path';

import { IMarkdownParserService } from './markdown-parser.service';
import { ITOCGeneratorService } from './toc-generator.service';
import { IPDFGeneratorService } from './pdf-generator.service';
import { PDFGeneratorOptions, PDFGenerationResult } from '../../core/pdf/types';
import { TOCGeneratorOptions } from '../../core/toc/types';
import { ParsedMarkdown } from '../../types/index';
import {
  MD2PDFError,
  FileNotFoundError,
} from '../../infrastructure/error/errors';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { IFileSystemManager } from '../../infrastructure/filesystem/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface FileProcessingOptions {
  outputPath?: string;
  includeTOC?: boolean;
  tocOptions?: Partial<TOCGeneratorOptions>;
  pdfOptions?: Partial<PDFGeneratorOptions>;
  customStyles?: string;
}

export interface FileProcessingResult {
  inputPath: string;
  outputPath: string;
  success: boolean;
  parsedContent: ParsedMarkdown;
  pdfResult: PDFGenerationResult;
  processingTime: number;
  fileSize: number;
}

export interface IFileProcessorService {
  processFile(
    inputPath: string,
    options?: FileProcessingOptions,
  ): Promise<FileProcessingResult>;
  validateInputFile(inputPath: string): Promise<boolean>;
  generateOutputPath(inputPath: string, outputDir?: string): Promise<string>;
}

export class FileProcessorService implements IFileProcessorService {
  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly _configManager: IConfigManager, // Reserved for future use, eslint-disable-line @typescript-eslint/no-unused-vars
    private readonly fileSystemManager: IFileSystemManager,
    private readonly markdownParserService: IMarkdownParserService,
    private readonly tocGeneratorService: ITOCGeneratorService,
    private readonly pdfGeneratorService: IPDFGeneratorService,
  ) {
    // _configManager is reserved for future configuration options
    void this._configManager;
  }

  async processFile(
    inputPath: string,
    options: FileProcessingOptions = {},
  ): Promise<FileProcessingResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`Starting file processing: ${inputPath}`);

      // Validate input file
      await this.validateInputFile(inputPath);

      // Generate output path if not provided
      const outputPath =
        options.outputPath || (await this.generateOutputPath(inputPath));

      // Parse Markdown content
      this.logger.debug('Parsing Markdown content');
      const parsedContent =
        await this.markdownParserService.parseMarkdownFile(inputPath);

      // Generate TOC if requested
      let finalHtmlContent = parsedContent.content;
      if (options.includeTOC && parsedContent.headings.length > 0) {
        this.logger.debug('Generating table of contents');
        const tocResult = await this.tocGeneratorService.generateTOC(
          parsedContent.headings,
          options.tocOptions,
        );

        finalHtmlContent = this.injectTOC(
          parsedContent.content,
          tocResult.html,
        );
      }

      // Apply custom styles if provided
      if (options.customStyles) {
        finalHtmlContent = this.injectStyles(
          finalHtmlContent,
          options.customStyles,
        );
      }

      // Generate PDF
      this.logger.debug(`Generating PDF: ${outputPath}`);
      const pdfResult = await this.pdfGeneratorService.generatePDF(
        finalHtmlContent,
        outputPath,
        options.pdfOptions,
      );

      // Get file size
      const fileStats = await this.fileSystemManager.getStats(outputPath);
      const fileSize = fileStats.size;

      const processingTime = Date.now() - startTime;

      const result: FileProcessingResult = {
        inputPath,
        outputPath,
        success: true,
        parsedContent,
        pdfResult,
        processingTime,
        fileSize,
      };

      this.logger.info(
        `File processing completed successfully: ${inputPath} -> ${outputPath} (${processingTime}ms, ${fileSize} bytes)`,
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      const wrappedError = new MD2PDFError(
        `File processing failed: ${(error as Error).message}`,
        'FILE_PROCESSING_ERROR',
        'file_system',
        true,
        {
          inputPath,
          outputPath: options.outputPath,
          processingTime,
          options,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'FileProcessorService.processFile',
      );
      throw wrappedError;
    }
  }

  async validateInputFile(inputPath: string): Promise<boolean> {
    try {
      this.logger.debug(`Validating input file: ${inputPath}`);

      // Check if file exists
      if (!(await this.fileSystemManager.exists(inputPath))) {
        throw new FileNotFoundError(inputPath);
      }

      // Check if it's a markdown file
      const ext = path.extname(inputPath).toLowerCase();
      if (!['.md', '.markdown'].includes(ext)) {
        throw new MD2PDFError(
          `Invalid file extension: ${ext}. Only .md and .markdown files are supported.`,
          'INVALID_FILE_EXTENSION',
          'validation',
          false,
          { inputPath, extension: ext },
        );
      }

      // Check if file is readable
      const stats = await this.fileSystemManager.getStats(inputPath);
      if (!stats.permissions.read) {
        throw new MD2PDFError(
          `File is not readable: ${inputPath}`,
          'FILE_NOT_READABLE',
          'file_system',
          false,
          { inputPath },
        );
      }

      this.logger.info(`Input file validation passed: ${inputPath}`);

      return true;
    } catch (error) {
      if (error instanceof MD2PDFError || error instanceof FileNotFoundError) {
        await this.errorHandler.handleError(
          error,
          'FileProcessorService.validateInputFile',
        );
        throw error;
      }

      const wrappedError = new MD2PDFError(
        `File validation failed: ${(error as Error).message}`,
        'FILE_VALIDATION_ERROR',
        'validation',
        false,
        { inputPath, originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'FileProcessorService.validateInputFile',
      );
      throw wrappedError;
    }
  }

  async generateOutputPath(
    inputPath: string,
    outputDir?: string,
  ): Promise<string> {
    try {
      const parsedPath = path.parse(inputPath);
      const outputFileName = `${parsedPath.name}.pdf`;

      let outputPath: string;
      if (outputDir) {
        // Ensure output directory exists
        await this.fileSystemManager.createDirectory(outputDir);
        outputPath = path.join(outputDir, outputFileName);
      } else {
        // Use same directory as input file
        outputPath = path.join(parsedPath.dir, outputFileName);
      }

      this.logger.debug(`Generated output path: ${inputPath} -> ${outputPath}`);

      return outputPath;
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to generate output path: ${(error as Error).message}`,
        'OUTPUT_PATH_ERROR',
        'file_system',
        false,
        { inputPath, outputDir, originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'FileProcessorService.generateOutputPath',
      );
      throw wrappedError;
    }
  }

  private injectTOC(htmlContent: string, tocHtml: string): string {
    // Look for a TOC placeholder or inject after the first heading
    const tocPlaceholder = /<!--\s*TOC\s*-->/i;
    if (tocPlaceholder.test(htmlContent)) {
      return htmlContent.replace(tocPlaceholder, tocHtml);
    }

    // Insert TOC after the first H1 heading
    const firstHeadingMatch = htmlContent.match(/<h1[^>]*>.*?<\/h1>/i);
    if (firstHeadingMatch) {
      const insertPoint =
        htmlContent.indexOf(firstHeadingMatch[0]) + firstHeadingMatch[0].length;
      return (
        htmlContent.slice(0, insertPoint) +
        '\n\n' +
        tocHtml +
        '\n\n' +
        htmlContent.slice(insertPoint)
      );
    }

    // Fallback: insert at the beginning of the body
    const bodyMatch = htmlContent.match(/<body[^>]*>/i);
    if (bodyMatch) {
      const insertPoint =
        htmlContent.indexOf(bodyMatch[0]) + bodyMatch[0].length;
      return (
        htmlContent.slice(0, insertPoint) +
        '\n\n' +
        tocHtml +
        '\n\n' +
        htmlContent.slice(insertPoint)
      );
    }

    // Last resort: prepend to content
    return tocHtml + '\n\n' + htmlContent;
  }

  private injectStyles(htmlContent: string, customStyles: string): string {
    const headMatch = htmlContent.match(/<head[^>]*>/i);
    if (headMatch) {
      const insertPoint =
        htmlContent.indexOf(headMatch[0]) + headMatch[0].length;
      const styleTag = `\n<style>\n${customStyles}\n</style>\n`;
      return (
        htmlContent.slice(0, insertPoint) +
        styleTag +
        htmlContent.slice(insertPoint)
      );
    }

    // If no head tag, wrap content and add styles
    return `<!DOCTYPE html><html><head><style>\n${customStyles}\n</style></head><body>\n${htmlContent}\n</body></html>`;
  }
}
