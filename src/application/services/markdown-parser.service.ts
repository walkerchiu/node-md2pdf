/**
 * Application service for Markdown parsing
 * Integrates core Markdown functionality with infrastructure services
 */

import {
  MarkdownParser,
  MarkdownParserOptions,
} from '../../core/parser/markdown-parser';
import {
  MD2PDFError,
  FileNotFoundError,
  MarkdownParsingError,
} from '../../infrastructure/error/errors';
import { ParsedMarkdown, Heading } from '../../types/index';
import { ImagePathResolver } from '../../utils/image-path-resolver';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { IErrorHandler } from '../../infrastructure/error/types';
import type { IFileSystemManager } from '../../infrastructure/filesystem/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface IMarkdownParserService {
  parseMarkdown(content: string): Promise<ParsedMarkdown>;
  parseMarkdownFile(filePath: string): Promise<ParsedMarkdown>;
  extractHeadings(content: string): Promise<Heading[]>;
  validateMarkdown(content: string): Promise<boolean>;
}

export class MarkdownParserService implements IMarkdownParserService {
  private markdownParser: MarkdownParser | null = null;
  private isInitialized = false;

  constructor(
    private readonly logger: ILogger,
    private readonly errorHandler: IErrorHandler,
    private readonly configManager: IConfigManager,
    private readonly fileSystemManager: IFileSystemManager,
  ) {}

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing Markdown parser service');

      const parserConfig = this.configManager.get('markdown', {
        html: true,
        breaks: true,
        linkify: true,
        typographer: true,
        quotes: '""\'\'',
      }) as Partial<MarkdownParserOptions>;

      this.markdownParser = new MarkdownParser(parserConfig);
      this.isInitialized = true;

      this.logger.info('Markdown parser service initialized successfully');
    } catch (error) {
      const wrappedError = new MD2PDFError(
        `Failed to initialize Markdown parser service: ${(error as Error).message}`,
        'MARKDOWN_INIT_ERROR',
        'markdown_parsing',
        false,
        { originalError: error },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'MarkdownParserService.initialize',
      );
      throw wrappedError;
    }
  }

  async parseMarkdown(content: string): Promise<ParsedMarkdown> {
    if (!this.isInitialized || !this.markdownParser) {
      await this.initialize();
    }

    try {
      this.logger.debug(
        `Parsing Markdown content (${content.length} characters)`,
      );

      const startTime = Date.now();
      const result = await this.markdownParser!.parse(content);
      const duration = Date.now() - startTime;

      this.logger.info(
        `Markdown parsed successfully (${duration}ms), found ${result.headings.length} headings`,
      );

      return result;
    } catch (error) {
      const wrappedError = new MarkdownParsingError(
        `Failed to parse Markdown content: ${(error as Error).message}`,
        undefined,
        undefined,
        {
          contentLength: content.length,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'MarkdownParserService.parseMarkdown',
      );
      throw wrappedError;
    }
  }

  async parseMarkdownFile(filePath: string): Promise<ParsedMarkdown> {
    try {
      this.logger.debug(`Parsing Markdown file: ${filePath}`);

      if (!(await this.fileSystemManager.exists(filePath))) {
        throw new FileNotFoundError(filePath);
      }

      const content = (await this.fileSystemManager.readFile(
        filePath,
        'utf8',
      )) as string;
      const result = await this.parseMarkdown(content);

      this.logger.info(`Markdown file parsed successfully: ${filePath}`);

      // Process image paths in HTML content
      const processedContent = ImagePathResolver.processImagePaths(
        result.content,
        filePath,
      );

      return {
        ...result,
        content: processedContent,
        metadata: {
          ...result.metadata,
          filePath,
          fileSize: content.length,
        },
      };
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        await this.errorHandler.handleError(
          error,
          'MarkdownParserService.parseMarkdownFile',
        );
        throw error;
      }

      const wrappedError = new MarkdownParsingError(
        `Failed to parse Markdown file: ${(error as Error).message}`,
        filePath,
        undefined,
        {
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'MarkdownParserService.parseMarkdownFile',
      );
      throw wrappedError;
    }
  }

  async extractHeadings(content: string): Promise<Heading[]> {
    try {
      this.logger.debug('Extracting headings from Markdown content');

      const parsed = await this.parseMarkdown(content);

      this.logger.info(`Extracted ${parsed.headings.length} headings`);

      return parsed.headings;
    } catch (error) {
      const wrappedError = new MarkdownParsingError(
        `Failed to extract headings: ${(error as Error).message}`,
        undefined,
        undefined,
        {
          contentLength: content.length,
          originalError: error,
        },
      );

      await this.errorHandler.handleError(
        wrappedError,
        'MarkdownParserService.extractHeadings',
      );
      throw wrappedError;
    }
  }

  async validateMarkdown(content: string): Promise<boolean> {
    try {
      this.logger.debug('Validating Markdown content');

      await this.parseMarkdown(content);

      this.logger.info('Markdown content is valid');

      return true;
    } catch (error) {
      this.logger.warn(
        `Markdown validation failed: ${(error as Error).message}`,
      );

      return false;
    }
  }
}
