/**
 * Unified CLI UI Manager
 * Provides consistent output formatting across all CLI interactions
 */

import chalk from 'chalk';

import { EnvironmentConfig } from '../../infrastructure/config/environment';

import type { IConfigManager } from '../../infrastructure/config/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface CliUIManagerOptions {
  verbose?: boolean;
  colors?: boolean;
}

export class CliUIManager {
  private logger: ILogger | undefined;
  private configManager: IConfigManager | undefined;
  private options: Required<CliUIManagerOptions>;

  constructor(
    _translator: ITranslationManager,
    logger?: ILogger,
    options: CliUIManagerOptions = {},
    configManager?: IConfigManager,
  ) {
    this.logger = logger;
    this.configManager = configManager;
    this.options = {
      verbose: options.verbose ?? EnvironmentConfig.isVerboseEnabled(),
      colors: options.colors ?? process.stdout.isTTY,
    };
  }

  /**
   * Display a header with title and optional subtitle
   */
  showHeader(title: string, subtitle?: string): void {
    const titleLine = this.centerText(title, 75);
    const subtitleLine = subtitle ? this.centerText(subtitle, 75) : '';

    console.log(
      '┌─────────────────────────────────────────────────────────────────────────────┐',
    );
    console.log(`│${titleLine}│`);
    if (subtitle) {
      console.log(
        '├─────────────────────────────────────────────────────────────────────────────┤',
      );
      console.log(`│${subtitleLine}│`);
    }
    console.log(
      '└─────────────────────────────────────────────────────────────────────────────┘',
    );
    console.log();
  }

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    const icon = '✅';
    const formattedMessage = this.options.colors
      ? chalk.green(message)
      : message;
    console.log(`${icon} ${formattedMessage}`);

    // Log to file only if file logging is enabled
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.info(`Success: ${message}`);
    }
  }

  /**
   * Show error message
   */
  showError(message: string, error?: Error): void {
    const icon = '❌';
    const formattedMessage = this.options.colors ? chalk.red(message) : message;
    console.error(`${icon} ${formattedMessage}`);

    if (this.options.verbose && error) {
      const errorDetail = error.stack || error.message;
      const formattedDetail = this.options.colors
        ? chalk.gray(errorDetail)
        : errorDetail;
      console.error(formattedDetail);
    }

    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.error(message, error);
    }
  }

  /**
   * Show warning message
   */
  showWarning(message: string): void {
    const icon = '⚠️';
    const formattedMessage = this.options.colors
      ? chalk.yellow(message)
      : message;
    console.warn(`${icon} ${formattedMessage}`);

    // Log to file only if file logging is enabled
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.warn(message);
    }
  }

  /**
   * Show info message
   */
  showInfo(message: string): void {
    const icon = 'ℹ️';
    const formattedMessage = this.options.colors
      ? chalk.blue(message)
      : message;
    console.log(`${icon} ${formattedMessage}`);

    // Log to file only if file logging is enabled
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.info(message);
    }
  }

  /**
   * Show progress message
   */
  showProgress(message: string): void {
    const icon = '⏳';
    const formattedMessage = this.options.colors
      ? chalk.cyan(message)
      : message;
    console.log(`${icon} ${formattedMessage}`);

    // Log to file only if file logging is enabled
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.info(`Progress: ${message}`);
    }
  }

  /**
   * Show completion message
   */
  showComplete(message: string): void {
    const icon = '🎉';
    const formattedMessage = this.options.colors
      ? chalk.green.bold(message)
      : message;
    console.log(`${icon} ${formattedMessage}`);

    // Log to file only if file logging is enabled
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.info(`Complete: ${message}`);
    }
  }

  /**
   * Show a simple message without icon
   */
  showMessage(message: string): void {
    console.log(message);

    // Log to file only if file logging is enabled
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.info(message);
    }
  }

  /**
   * Show empty line
   */
  showNewline(): void {
    console.log();
  }

  /**
   * Show section separator
   */
  showSeparator(): void {
    const line = '─'.repeat(75);
    console.log(this.options.colors ? chalk.gray(line) : line);
  }

  /**
   * Show a list of steps or items
   */
  showSteps(steps: string[]): void {
    steps.forEach((step, index) => {
      const number = (index + 1).toString().padStart(2, ' ');
      const formattedStep = this.options.colors
        ? chalk.cyan(`${number}. ${step}`)
        : `${number}. ${step}`;
      console.log(`  ${formattedStep}`);
    });
    console.log();
  }

  /**
   * Debug-only output (only shown in verbose mode)
   */
  showDebug(message: string, data?: unknown): void {
    if (!this.options.verbose) return;

    const formattedMessage = this.options.colors
      ? chalk.gray(`[DEBUG] ${message}`)
      : `[DEBUG] ${message}`;
    console.log(formattedMessage);

    if (data && this.logger) {
      this.logger.debug(message, data);
    }
  }

  /**
   * Internal method to center text within a given width
   */
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    const rightPadding = Math.max(0, width - text.length - padding);
    return ' '.repeat(padding) + text + ' '.repeat(rightPadding);
  }

  /**
   * Check if file logging is enabled
   */
  private isFileLoggingEnabled(): boolean {
    if (!this.configManager) {
      return false;
    }
    return (
      this.configManager.get<boolean>('logging.fileEnabled', true) || false
    );
  }

  /**
   * Update verbose mode setting
   */
  setVerbose(verbose: boolean): void {
    this.options.verbose = verbose;
  }

  /**
   * Get current verbose mode setting
   */
  isVerboseMode(): boolean {
    return this.options.verbose;
  }

  /**
   * Log user navigation/access activity
   */
  logUserAccess(
    module: string,
    action: string,
    details?: Record<string, unknown>,
  ): void {
    if (this.logger && this.isFileLoggingEnabled()) {
      const logMessage = `User Access - Module: ${module}, Action: ${action}`;
      if (details) {
        this.logger.info(logMessage, details);
      } else {
        this.logger.info(logMessage);
      }
    }
  }

  /**
   * Log user configuration changes
   */
  logConfigChange(setting: string, oldValue: unknown, newValue: unknown): void {
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.info(`Config Change - Setting: ${setting}`, {
        old: oldValue,
        new: newValue,
      });
    }
  }

  /**
   * Log file processing activity
   */
  logFileOperation(
    operation: string,
    files: string[],
    parameters?: Record<string, unknown>,
  ): void {
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.info(`File Operation - ${operation}`, {
        files: files,
        parameters: parameters || {},
        fileCount: files.length,
      });
    }
  }

  /**
   * Log conversion activity with detailed parameters
   */
  logConversion(
    inputFile: string,
    outputFile: string,
    parameters: Record<string, unknown>,
  ): void {
    if (this.logger && this.isFileLoggingEnabled()) {
      this.logger.info('PDF Conversion', {
        input: inputFile,
        output: outputFile,
        parameters: parameters,
      });
    }
  }
}
