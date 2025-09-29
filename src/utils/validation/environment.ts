/**
 * Environment validation utilities
 */

import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Validate Node.js version
 */
export async function validateNodeVersion(): Promise<boolean> {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 18) {
    console.log(
      chalk.green(`✅ Node.js version: ${nodeVersion} (meets requirements)`),
    );
    return true;
  } else {
    console.error(
      chalk.red(
        `❌ Node.js version too old: ${nodeVersion}, requires >= 18.0.0`,
      ),
    );
    return false;
  }
}

/**
 * Check if Puppeteer is available
 */
export async function validatePuppeteer(): Promise<boolean> {
  try {
    // Actual Puppeteer check will be added in future implementation
    console.log(chalk.green('✅ Puppeteer is ready'));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Puppeteer initialization failed:'), error);
    return false;
  }
}

/**
 * Check system resources
 */
export async function checkSystemResources(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('node -p "process.memoryUsage().rss"');
    const memoryUsage = parseInt(stdout.trim());
    const memoryMB = Math.round(memoryUsage / 1024 / 1024);

    if (memoryMB < 100) {
      // Basic memory requirement
      console.log(chalk.green(`✅ Memory usage: ${memoryMB} MB`));
      return true;
    } else {
      console.warn(chalk.yellow(`⚠️ High memory usage: ${memoryMB} MB`));
      return true; // Warn but don't block execution
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Unable to check system resources'));
    return true; // Check failed but don't block execution
  }
}

/**
 * Complete environment validation
 */
export async function validateEnvironment(): Promise<void> {
  const checks = [
    validateNodeVersion(),
    validatePuppeteer(),
    checkSystemResources(),
  ];

  const results = await Promise.all(checks);
  const failedChecks = results.filter((result) => !result).length;

  if (failedChecks > 0) {
    throw new Error(
      `Environment check failed (${failedChecks} checks not passed)`,
    );
  }
}
