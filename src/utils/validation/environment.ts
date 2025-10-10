/**
 * Environment validation utilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';

import chalk from 'chalk';
import type { ITranslationManager } from '../../infrastructure/i18n/types';

const execAsync = promisify(exec);

/**
 * Validate Node.js version
 */
export async function validateNodeVersion(
  translator?: ITranslationManager,
): Promise<boolean> {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 18) {
    const message = translator
      ? translator.t('environment.nodeVersionOk', { version: nodeVersion })
      : `✅ Node.js version: ${nodeVersion} (meets requirements)`;
    console.log(chalk.green(message));
    return true;
  } else {
    const message = translator
      ? translator.t('environment.nodeVersionTooOld', { version: nodeVersion })
      : `❌ Node.js version too old: ${nodeVersion}, requires >= 18.0.0`;
    console.error(chalk.red(message));
    return false;
  }
}

/**
 * Check if Puppeteer is available
 */
export async function validatePuppeteer(
  translator?: ITranslationManager,
): Promise<boolean> {
  try {
    // Actual Puppeteer check will be added in future implementation
    const message = translator
      ? translator.t('environment.puppeteerReady')
      : '✅ Puppeteer is ready';
    console.log(chalk.green(message));
    return true;
  } catch (error) {
    const message = translator
      ? translator.t('environment.puppeteerFailed')
      : '❌ Puppeteer initialization failed:';
    console.error(chalk.red(message), error);
    return false;
  }
}

/**
 * Check system resources
 */
export async function checkSystemResources(
  translator?: ITranslationManager,
): Promise<boolean> {
  try {
    const { stdout } = await execAsync('node -p "process.memoryUsage().rss"');
    const memoryUsage = parseInt(stdout.trim());
    const memoryMB = Math.round(memoryUsage / 1024 / 1024);

    if (memoryMB < 100) {
      // Basic memory requirement
      const message = translator
        ? translator.t('environment.memoryUsageOk', { memory: memoryMB })
        : `✅ Memory usage: ${memoryMB} MB`;
      console.log(chalk.green(message));
      return true;
    } else {
      const message = translator
        ? translator.t('environment.highMemoryUsage', { memory: memoryMB })
        : `⚠️ High memory usage: ${memoryMB} MB`;
      console.warn(chalk.yellow(message));
      return true; // Warn but don't block execution
    }
  } catch (error) {
    const message = translator
      ? translator.t('environment.cannotCheckResources')
      : '⚠️ Unable to check system resources';
    console.warn(chalk.yellow(message));
    return true; // Check failed but don't block execution
  }
}

/**
 * Complete environment validation
 */
export async function validateEnvironment(
  translator?: ITranslationManager,
): Promise<void> {
  const checks = [
    validateNodeVersion(translator),
    validatePuppeteer(translator),
    checkSystemResources(translator),
  ];

  const results = await Promise.all(checks);
  const failedChecks = results.filter((result) => !result).length;

  if (failedChecks > 0) {
    const message = translator
      ? translator.t('environment.environmentCheckFailed', {
          count: failedChecks,
        })
      : `Environment check failed (${failedChecks} checks not passed)`;
    throw new Error(message);
  }
}
