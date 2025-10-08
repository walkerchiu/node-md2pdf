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

  errorBox(title: string, message: string, suggestions?: string[]): void {
    const lines = [
      '┌─────────────────────────────────────────┐',
      `│  ❌ ${title.padEnd(33)}                 │`,
      '├─────────────────────────────────────────┤',
    ];

    // Split long messages into multiple lines
    const messageLines = this.wrapText(message, 35);
    messageLines.forEach((line) => {
      lines.push(`│  ${line.padEnd(37)} │`);
    });

    if (suggestions && suggestions.length > 0) {
      lines.push('├─────────────────────────────────────────┤');
      lines.push(`│  💡 Suggestions:                        │`);
      suggestions.forEach((suggestion) => {
        const suggestionLines = this.wrapText(`• ${suggestion}`, 35);
        suggestionLines.forEach((line) => {
          lines.push(`│  ${line.padEnd(37)} │`);
        });
      });
    }

    lines.push('└─────────────────────────────────────────┘');

    lines.forEach((line) => console.error(chalk.red(line)));
  }

  successBox(title: string, message: string): void {
    const lines = [
      '┌─────────────────────────────────────────┐',
      `│  ✅ ${title.padEnd(33)}                 │`,
      '├─────────────────────────────────────────┤',
    ];

    const messageLines = this.wrapText(message, 35);
    messageLines.forEach((line) => {
      lines.push(`│  ${line.padEnd(37)} │`);
    });

    lines.push('└─────────────────────────────────────────┘');

    lines.forEach((line) => console.log(chalk.green(line)));
  }

  private wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  header(lines: string[]): void {
    lines.forEach((l) => console.log(chalk.cyan(l)));
  }

  newline(): void {
    console.log();
  }
}
