/**
 * Startup UI utilities for clean and consistent CLI output
 */

import chalk from 'chalk';

import { EnvironmentConfig } from '../../infrastructure/config/environment';

import type { ITranslationManager } from '../../infrastructure/i18n/types';

export class StartupUI {
  private translator: ITranslationManager;

  constructor(translator: ITranslationManager) {
    this.translator = translator;
  }

  /**
   * Display welcome banner
   */
  showBanner(version: string): void {
    console.log(chalk.cyan.bold(`MD2PDF v${version} 🚀`));
    console.log(chalk.gray(this.translator.t('startup.description')));
    console.log();
  }

  /**
   * Display environment check results in a clean format
   */
  async showEnvironmentCheck(
    nodeVersion: string,
    memoryMB: number,
    puppeteerReady: boolean = true,
  ): Promise<void> {
    const checks = [
      { name: 'Node.js', value: nodeVersion, status: 'ok' as const },
      { name: 'Memory', value: `${memoryMB}MB`, status: 'ok' as const },
      {
        name: 'Puppeteer',
        value: puppeteerReady ? 'Ready' : 'Not Ready',
        status: puppeteerReady ? ('ok' as const) : ('error' as const),
      },
    ];

    const statusLine = checks
      .map((check) => {
        const value =
          check.status === 'ok'
            ? chalk.gray(check.value)
            : chalk.red(check.value);
        return `${check.name}: ${value}`;
      })
      .join(', ');

    console.log(`✅ Environment ready (${statusLine})`);
    console.log();
  }

  /**
   * Show starting message
   */
  showStarting(): void {
    console.log(chalk.blue('Starting interactive mode...'));
    console.log();
  }

  /**
   * Show error message with clean formatting
   */
  showError(message: string, error?: Error): void {
    console.error(chalk.red(`❌ ${message}`));
    if (error && EnvironmentConfig.isVerboseEnabled()) {
      console.error(chalk.gray(error.stack || error.message));
    }
    console.log();
  }

  /**
   * Show warning message
   */
  showWarning(message: string): void {
    console.warn(chalk.yellow(`⚠️ ${message}`));
  }

  /**
   * Check if we're in verbose mode
   */
  isVerbose(): boolean {
    return EnvironmentConfig.isVerboseEnabled();
  }
}
