/**
 * Environment validation utilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';

import type { ITranslationManager } from '../../infrastructure/i18n/types';

const execAsync = promisify(exec);

/**
 * Validate Node.js version
 */
export async function validateNodeVersion(
  translator?: ITranslationManager,
): Promise<{ success: boolean; version: string; message?: string }> {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 18) {
    return { success: true, version: nodeVersion };
  } else {
    const message = translator
      ? translator.t('environment.nodeVersionTooOld', { version: nodeVersion })
      : `Node.js version too old: ${nodeVersion}, requires >= 18.0.0`;
    return { success: false, version: nodeVersion, message };
  }
}

/**
 * Check if Puppeteer is available
 */
export async function validatePuppeteer(
  translator?: ITranslationManager,
): Promise<{ success: boolean; message?: string }> {
  try {
    // Actual Puppeteer check will be added in future implementation
    return { success: true };
  } catch (error) {
    const message = translator
      ? translator.t('environment.puppeteerFailed')
      : 'Puppeteer initialization failed';
    return { success: false, message };
  }
}

/**
 * Check system resources
 */
export async function checkSystemResources(
  translator?: ITranslationManager,
): Promise<{ success: boolean; memoryMB: number; warning?: string }> {
  try {
    const { stdout } = await execAsync('node -p "process.memoryUsage().rss"');
    const memoryUsage = parseInt(stdout.trim());
    const memoryMB = Math.round(memoryUsage / 1024 / 1024);

    if (memoryMB < 100) {
      return { success: true, memoryMB };
    } else {
      const warning = translator
        ? translator.t('environment.highMemoryUsage', { memory: memoryMB })
        : `High memory usage: ${memoryMB} MB`;
      return { success: true, memoryMB, warning }; // Warn but don't block execution
    }
  } catch (error) {
    const warning = translator
      ? translator.t('environment.cannotCheckResources')
      : 'Unable to check system resources';
    return { success: true, memoryMB: 0, warning }; // Check failed but don't block execution
  }
}

/**
 * Complete environment validation
 */
export async function validateEnvironment(
  translator?: ITranslationManager,
): Promise<{
  nodeVersion: string;
  memoryMB: number;
  puppeteerReady: boolean;
  errors: string[];
  warnings: string[];
}> {
  const [nodeResult, puppeteerResult, resourceResult] = await Promise.all([
    validateNodeVersion(translator),
    validatePuppeteer(translator),
    checkSystemResources(translator),
  ]);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!nodeResult.success && nodeResult.message) {
    errors.push(nodeResult.message);
  }
  if (!puppeteerResult.success && puppeteerResult.message) {
    errors.push(puppeteerResult.message);
  }
  if (resourceResult.warning) {
    warnings.push(resourceResult.warning);
  }

  if (errors.length > 0) {
    const message = translator
      ? translator.t('environment.environmentCheckFailed', {
          count: errors.length,
        })
      : `Environment check failed (${errors.length} checks not passed)`;
    throw new Error(message + '\n' + errors.join('\n'));
  }

  return {
    nodeVersion: nodeResult.version,
    memoryMB: resourceResult.memoryMB,
    puppeteerReady: puppeteerResult.success,
    errors,
    warnings,
  };
}
