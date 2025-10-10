/**
 * File search display utilities
 * Provides a unified display for file search results in interactive and batch modes
 */

/* eslint-disable no-console */
import chalk from 'chalk';

import type { ITranslationManager } from '../../infrastructure/i18n/types';

export class FileSearchUI {
  private translationManager: ITranslationManager;

  constructor(translationManager: ITranslationManager) {
    this.translationManager = translationManager;
  }

  displayFiles(files: string[], maxDisplay = 10): void {
    process.stdout.write(
      chalk.cyan('\n' + this.translationManager.t('fileSearchUI.filesFound')) +
        '\n',
    );
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    const displayFiles = files.slice(0, maxDisplay);
    displayFiles.forEach((file, index) => {
      const shortPath = FileSearchUI.shortenPath(file);
      process.stdout.write(
        chalk.gray(`  ${index + 1}. `) + chalk.white(shortPath) + '\n',
      );
    });

    if (files.length > maxDisplay) {
      const remaining = files.length - maxDisplay;
      process.stdout.write(
        chalk.gray(
          this.translationManager.t('fileSearchUI.andMoreFiles', {
            count: remaining,
          }),
        ) + '\n',
      );
    }

    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');
    process.stdout.write(
      chalk.bold(
        this.translationManager.t('fileSearchUI.totalFiles', {
          count: files.length,
        }) + '\n',
      ) + '\n',
    );
  }

  static shortenPath(filePath: string, maxLength = 50): string {
    if (!filePath) return filePath;
    if (filePath.length <= maxLength) {
      return filePath;
    }
    const parts = filePath.split('/');
    if (parts.length <= 2) {
      return filePath;
    }
    const filename = parts[parts.length - 1];
    const parent = parts[parts.length - 2];
    const shortened = `.../${parent}/${filename}`;
    if (shortened.length <= maxLength) {
      return shortened;
    }
    return `.../${filename}`;
  }

  // Static method with basic fallback strings for backward compatibility
  static displayFiles(files: string[], maxDisplay = 10): void {
    // Use hardcoded English as fallback when no translation manager is available
    process.stdout.write(chalk.cyan('\n📁 Files found:') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    const displayFiles = files.slice(0, maxDisplay);
    displayFiles.forEach((file, index) => {
      const shortPath = FileSearchUI.shortenPath(file);
      process.stdout.write(
        chalk.gray(`  ${index + 1}. `) + chalk.white(shortPath) + '\n',
      );
    });

    if (files.length > maxDisplay) {
      const remaining = files.length - maxDisplay;
      process.stdout.write(
        chalk.gray(`  ... and ${remaining} more files`) + '\n',
      );
    }

    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');
    process.stdout.write(chalk.bold(`Total: ${files.length} files\n`) + '\n');
  }
}

export default FileSearchUI;
