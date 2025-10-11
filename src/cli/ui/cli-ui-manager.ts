/**
 * Unified CLI UI Manager
 * Provides consistent output formatting across all CLI interactions
 */

import chalk from 'chalk';

import { EnvironmentConfig } from '../../infrastructure/config/environment';

import type { ITranslationManager } from '../../infrastructure/i18n/types';
import type { ILogger } from '../../infrastructure/logging/types';

export interface CliUIManagerOptions {
  verbose?: boolean;
  colors?: boolean;
}

export class CliUIManager {
  private logger: ILogger | undefined;
  private options: Required<CliUIManagerOptions>;

  constructor(
    _translator: ITranslationManager,
    logger?: ILogger,
    options: CliUIManagerOptions = {},
  ) {
    this.logger = logger;
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

    if (this.options.verbose && this.logger) {
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

    if (this.logger) {
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

    if (this.options.verbose && this.logger) {
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

    if (this.options.verbose && this.logger) {
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

    if (this.options.verbose && this.logger) {
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

    if (this.options.verbose && this.logger) {
      this.logger.info(`Complete: ${message}`);
    }
  }

  /**
   * Show a simple message without icon
   */
  showMessage(message: string): void {
    console.log(message);

    if (this.options.verbose && this.logger) {
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
}
