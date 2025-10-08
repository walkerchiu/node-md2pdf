/**
 * File search display utilities
 * Provides a unified display for file search results in interactive and batch modes
 */

/* eslint-disable no-console */
import chalk from 'chalk';

export const FileSearchUI = {
  displayFiles(files: string[], maxDisplay = 10): void {
    process.stdout.write(chalk.cyan('\n\ud83d\udcc1 Files found:') + '\n');
    process.stdout.write(chalk.gray('\u2500'.repeat(60)) + '\n');

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

    process.stdout.write(chalk.gray('\u2500'.repeat(60)) + '\n');
    process.stdout.write(chalk.bold(`Total: ${files.length} files\n`) + '\n');
  },

  shortenPath(filePath: string, maxLength = 50): string {
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
  },
};

export default FileSearchUI;
