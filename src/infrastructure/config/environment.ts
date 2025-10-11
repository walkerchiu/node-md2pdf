/**
 * Environment configuration management
 * Provides centralized access to environment variables with clear separation of concerns
 */

import type { LogLevel } from '../logging/types';

export class EnvironmentConfig {
  /**
   * Get default log level based on environment
   * NODE_ENV only affects default values, not direct behavior
   */
  static getDefaultLogLevel(): LogLevel {
    return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
  }

  /**
   * Check if verbose output is enabled
   * Only controlled by MD2PDF_VERBOSE, independent of NODE_ENV
   */
  static isVerboseEnabled(): boolean {
    return process.env.MD2PDF_VERBOSE === 'true';
  }

  /**
   * Get configured log level with fallback to environment-based default
   * Explicit MD2PDF_LOG_LEVEL takes precedence over NODE_ENV defaults
   */
  static getLogLevel(): LogLevel {
    const envLevel = process.env.MD2PDF_LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && ['error', 'warn', 'info', 'debug'].includes(envLevel)) {
      return envLevel;
    }
    return this.getDefaultLogLevel();
  }

  /**
   * Check if development mode is enabled
   * Only affects development-specific features, not logging verbosity
   */
  static isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Get Puppeteer configuration
   */
  static shouldSkipChromiumDownload(): boolean {
    return process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true';
  }

  /**
   * Get all environment configuration as an object
   * Useful for debugging and testing
   */
  static getConfig() {
    return {
      nodeEnv: process.env.NODE_ENV || 'production',
      verbose: this.isVerboseEnabled(),
      logLevel: this.getLogLevel(),
      defaultLogLevel: this.getDefaultLogLevel(),
      developmentMode: this.isDevelopmentMode(),
      skipChromiumDownload: this.shouldSkipChromiumDownload(),
    };
  }

  /**
   * Validate environment configuration and warn about potential issues
   */
  static validateConfig(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for deprecated patterns (optional warnings)
    if (process.env.NODE_ENV === 'development' && !process.env.MD2PDF_VERBOSE) {
      warnings.push(
        'Development mode detected. Consider setting MD2PDF_VERBOSE=true for detailed output.',
      );
    }

    // Check for conflicting settings
    if (
      process.env.MD2PDF_LOG_LEVEL === 'error' &&
      process.env.MD2PDF_VERBOSE === 'true'
    ) {
      warnings.push(
        'Verbose mode enabled but log level is "error". Consider using MD2PDF_LOG_LEVEL=debug for full verbose output.',
      );
    }

    return {
      valid: true,
      warnings,
    };
  }
}
