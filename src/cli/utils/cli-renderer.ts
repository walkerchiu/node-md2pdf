/* eslint-disable no-console */
/**
 * CliRenderer
 * Small abstraction over console output so CLI code can avoid direct console calls
 */

import chalk from 'chalk';

export class CliRenderer {
  info(message?: string): void {
    // Stringify undefined to empty
    if (message === undefined) {
      console.log();
      return;
    }

    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string, err?: unknown): void {
    if (err !== undefined) {
      console.error(message, err);
    } else {
      console.error(message);
    }
  }

  header(lines: string[]): void {
    lines.forEach((l) => console.log(chalk.cyan(l)));
  }

  newline(): void {
    console.log();
  }
}
