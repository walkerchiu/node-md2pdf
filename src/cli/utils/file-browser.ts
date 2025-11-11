/**
 * Enhanced File Browser
 * Provides advanced file browsing capabilities for Smart Conversion Mode
 */

import { promises as fs } from 'fs';
import { join, dirname, extname, resolve } from 'path';

import chalk from 'chalk';

import { FileSearchUI } from '../ui/file-search-ui';

import { CliRenderer } from './cli-renderer';

import type { ITranslationManager } from '../../infrastructure/i18n/types';

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  isMarkdown?: boolean;
}

export interface BrowseOptions {
  extensions?: string[];
  maxDepth?: number;
  showHidden?: boolean;
  sortBy?: 'name' | 'modified' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export class FileBrowser {
  private readonly markdownExtensions = ['.md', '.markdown', '.mdown', '.mkd'];
  private renderer = new CliRenderer();
  private translationManager: ITranslationManager;

  constructor(translationManager: ITranslationManager) {
    this.translationManager = translationManager;
  }

  async browseDirectory(
    startPath: string = process.cwd(),
    options: BrowseOptions = {},
  ): Promise<string> {
    const inquirer = await import('inquirer');
    let currentPath = resolve(startPath);

    // prefer-const would normally suggest `const`, but this variable is kept as
    // `let` to allow potential future loop control changes.
    // eslint-disable-next-line prefer-const
    let browsing = true;
    while (browsing) {
      try {
        const items = await this.scanDirectory(currentPath, options);
        const choices = this.buildChoices(items, currentPath);

        const borderLine = '─'.repeat(79);
        const title = `${this.translationManager.t('fileBrowser.title')} Mode`;
        const currentDirText = `${this.translationManager.t('fileBrowser.currentDirectory')}: ${FileSearchUI.shortenPath(currentPath, 50)}`;

        this.renderer.info(chalk.cyan(borderLine));
        this.renderer.info(
          chalk.cyan(title.padStart((79 + title.length) / 2).padEnd(79)),
        );
        this.renderer.info(chalk.cyan(borderLine));
        this.renderer.info(
          chalk.cyan(
            currentDirText
              .padStart((79 + currentDirText.length) / 2)
              .padEnd(79),
          ),
        );
        this.renderer.info(chalk.cyan(borderLine));

        if (items.filter((item) => item.isMarkdown).length > 0) {
          this.renderer.info(
            chalk.green(
              `   ${this.translationManager.t('fileBrowser.foundMarkdownFiles', { count: items.filter((item) => item.isMarkdown).length })}`,
            ),
          );
        }

        const { action } = await inquirer.default.prompt({
          type: 'list',
          name: 'action',
          message: this.translationManager.t('fileBrowser.selectFile'),
          choices,
          pageSize: 15,
          default: '__search__',
        });

        if (action === '__up__') {
          const parentPath = dirname(currentPath);
          if (parentPath !== currentPath) {
            currentPath = parentPath;
            continue;
          }
        } else if (action === '__search__') {
          const searchResult = await this.searchFiles(currentPath, options);
          if (searchResult) {
            return searchResult;
          }
        } else if (action === '__back_to_main__') {
          throw new Error('BACK_TO_MAIN_MENU');
        } else {
          const selectedItem = items.find((item) => item.path === action);
          if (selectedItem) {
            if (selectedItem.type === 'directory') {
              currentPath = selectedItem.path;
              continue;
            } else if (selectedItem.isMarkdown) {
              return selectedItem.path;
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'BACK_TO_MAIN_MENU') {
          throw error; // Re-throw back navigation request
        }

        this.renderer.error(chalk.red(`❌ Error browsing directory: ${error}`));
        const fallback = await this.enterFilePath();
        return fallback;
      }
    }

    // This point should be unreachable because the loop either returns a path
    // or throws to signal navigation back to the main menu. Add an explicit
    // throw to satisfy the TypeScript control-flow checking.
    throw new Error('NO_SELECTION');
  }

  private async scanDirectory(
    dirPath: string,
    options: BrowseOptions = {},
  ): Promise<FileItem[]> {
    const {
      extensions = this.markdownExtensions,
      showHidden = false,
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items: FileItem[] = [];

      for (const entry of entries) {
        if (!showHidden && entry.name.startsWith('.')) continue;

        const fullPath = join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);

        const item: FileItem = {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          isMarkdown: false,
        };

        if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          item.isMarkdown = extensions.includes(ext);
        }

        items.push(item);
      }

      return this.sortItems(items, sortBy, sortOrder);
    } catch {
      this.renderer.warn(
        chalk.yellow(`⚠️  Cannot access directory: ${dirPath}`),
      );
      return [];
    }
  }

  private buildChoices(
    items: FileItem[],
    currentPath: string,
  ): Array<{ name: string; value: string; short?: string }> {
    const choices: Array<{ name: string; value: string; short?: string }> = [];

    // Navigation options
    if (dirname(currentPath) !== currentPath) {
      choices.push({
        name: `${this.translationManager.t('fileBrowser.upOneLevel')}`,
        value: '__up__',
        short: this.translationManager.t('fileBrowser.directory'),
      });
    }

    // Utility options
    choices.push(
      {
        name: `${this.translationManager.t('fileBrowser.returnToMain')}`,
        value: '__back_to_main__',
        short: this.translationManager.t('cli.options.back'),
      },
      {
        name: `🔍 ${this.translationManager.t('fileBrowser.searchingFiles')}`,
        value: '__search__',
        short: this.translationManager.t('fileBrowser.searchingFiles'),
      },
    );

    if (choices.length > 0) {
      choices.push({
        name: chalk.gray('─────────────────'),
        value: '__separator__',
      });
    }

    // Directories first, then Markdown files, then other files
    const directories = items.filter((item) => item.type === 'directory');
    const markdownFiles = items.filter((item) => item.isMarkdown);
    const otherFiles = items.filter(
      (item) => item.type === 'file' && !item.isMarkdown,
    );

    // Add directories
    directories.forEach((dir) => {
      choices.push({
        name: `📁 ${dir.name}/ ${chalk.gray(`- ${this.translationManager.t('fileBrowser.directory')}`)}`,
        value: dir.path,
        short: dir.name,
      });
    });

    // Add Markdown files
    markdownFiles.forEach((file) => {
      const sizeStr = this.formatFileSize(file.size || 0);
      const modifiedStr = this.formatDate(file.modified);
      choices.push({
        name: `📄 ${file.name} ${chalk.gray(`(${sizeStr}, ${modifiedStr})`)}`,
        value: file.path,
        short: file.name,
      });
    });

    // Add other files (dimmed) - only show first few to avoid cluttering
    if (otherFiles.length > 0 && otherFiles.length < 5) {
      otherFiles.forEach((file) => {
        choices.push({
          name: `📄 ${file.name} ${chalk.gray(`(${this.translationManager.t('fileBrowser.notMarkdown')})`)}`,
          value: file.path,
          short: file.name,
        });
      });
    }
    // Note: When there are 5+ other files, we simply don't show them to keep the interface clean
    // Users can use the search function to find specific non-markdown files if needed

    return choices.filter((choice) => choice.value !== '__separator__');
  }

  private sortItems(
    items: FileItem[],
    sortBy: 'name' | 'modified' | 'size',
    order: 'asc' | 'desc',
  ): FileItem[] {
    const sorted = [...items].sort((a, b) => {
      // Directories always come first
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'modified':
          comparison =
            (a.modified?.getTime() || 0) - (b.modified?.getTime() || 0);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  private async searchFiles(
    basePath: string,
    options: BrowseOptions = {},
  ): Promise<string | null> {
    const inquirer = await import('inquirer');

    const { pattern } = await inquirer.default.prompt({
      type: 'input',
      name: 'pattern',
      message: this.translationManager.t('fileBrowser.enterSearchPattern'),
      validate: (input: string) =>
        input.trim().length > 0 ||
        this.translationManager.t('fileBrowser.pleaseEnterSearchPattern'),
    });

    this.renderer.info(chalk.yellow('🔍 Searching for files...'));

    try {
      const files = await this.findFiles(basePath, pattern, options);

      if (files.length === 0) {
        this.renderer.error(
          chalk.red(
            this.translationManager.t('fileBrowser.noMatchingFilesFound'),
          ),
        );

        const { nextAction } = await inquirer.default.prompt({
          type: 'list',
          name: 'nextAction',
          message: this.translationManager.t(
            'fileBrowser.whatWouldYouLikeToDo',
          ),
          choices: [
            {
              name: this.translationManager.t(
                'fileBrowser.searchWithDifferentPattern',
              ),
              value: 'search_again',
            },
            {
              name: this.translationManager.t(
                'fileBrowser.goBackToFileBrowser',
              ),
              value: 'back',
            },
          ],
        });

        if (nextAction === 'search_again') {
          return this.searchFiles(basePath, options);
        }

        return null;
      }

      if (files.length === 1) {
        this.renderer.info(
          chalk.green(
            this.translationManager.t('fileBrowser.foundOneFile', {
              filename: files[0],
            }),
          ),
        );

        const { action } = await inquirer.default.prompt({
          type: 'list',
          name: 'action',
          message: this.translationManager.t('fileBrowser.selectAnAction'),
          choices: [
            {
              name: this.translationManager.t('fileBrowser.selectFile2', {
                filename: FileSearchUI.shortenPath(files[0]),
              }),
              value: 'select',
            },
            {
              name: this.translationManager.t(
                'fileBrowser.searchWithDifferentPattern',
              ),
              value: 'search_again',
            },
            {
              name: this.translationManager.t(
                'fileBrowser.goBackToFileBrowser',
              ),
              value: 'back',
            },
          ],
        });

        if (action === 'select') {
          return files[0];
        } else if (action === 'search_again') {
          return this.searchFiles(basePath, options);
        } else {
          return null;
        }
      }

      // Show search results
      const searchUI = new FileSearchUI(this.translationManager);
      searchUI.displayFiles(files);

      const choices = files.map((file, index) => ({
        name: `${index + 1}. ${FileSearchUI.shortenPath(file)}`,
        value: file,
      }));

      // Add option to go back or search again
      choices.push(
        { name: chalk.gray('─────────────────'), value: '__separator__' },
        {
          name: this.translationManager.t(
            'fileBrowser.searchWithDifferentPattern',
          ),
          value: '__search_again__',
        },
        {
          name: this.translationManager.t('fileBrowser.goBackToFileBrowser'),
          value: '__back__',
        },
      );

      const { selectedFile } = await inquirer.default.prompt({
        type: 'list',
        name: 'selectedFile',
        message: this.translationManager.t('fileBrowser.selectFileOrAction'),
        choices: choices.filter((choice) => choice.value !== '__separator__'),
        pageSize: 12,
      });

      if (selectedFile === '__search_again__') {
        return this.searchFiles(basePath, options);
      }

      if (selectedFile === '__back__') {
        return null;
      }

      return selectedFile;
    } catch (error) {
      this.renderer.error(chalk.red(`❌ Search failed: ${error}`));

      const { nextAction } = await inquirer.default.prompt({
        type: 'list',
        name: 'nextAction',
        message: this.translationManager.t('fileBrowser.whatWouldYouLikeToDo'),
        choices: [
          {
            name: this.translationManager.t('fileBrowser.trySearchingAgain'),
            value: 'search_again',
          },
          {
            name: this.translationManager.t('fileBrowser.goBackToFileBrowser'),
            value: 'back',
          },
        ],
      });

      if (nextAction === 'search_again') {
        return this.searchFiles(basePath, options);
      }

      return null;
    }
  }

  private async findFiles(
    basePath: string,
    pattern: string,
    options: BrowseOptions = {},
    maxDepth: number = 3,
  ): Promise<string[]> {
    const { extensions = this.markdownExtensions } = options;
    const results: string[] = [];

    const searchRecursive = async (
      currentPath: string,
      depth: number = 0,
    ): Promise<void> => {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;

          const fullPath = join(currentPath, entry.name);

          if (entry.isFile()) {
            const ext = extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
              if (
                entry.name.toLowerCase().includes(pattern.toLowerCase()) ||
                this.matchesGlob(entry.name, pattern)
              ) {
                results.push(fullPath);
              }
            }
          } else if (entry.isDirectory() && depth < maxDepth) {
            await searchRecursive(fullPath, depth + 1);
          }
        }
      } catch {
        // Silently skip directories we can't read
      }
    };

    await searchRecursive(basePath);
    return results.sort();
  }

  private matchesGlob(filename: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regex}$`, 'i').test(filename);
  }

  private async enterFilePath(): Promise<string> {
    const inquirer = await import('inquirer');

    const { filePath } = await inquirer.default.prompt({
      type: 'input',
      name: 'filePath',
      message: this.translationManager.t('fileBrowser.enterFullPath'),
      validate: (input: string) => {
        if (!input.trim())
          return this.translationManager.t('fileBrowser.pleaseEnterFilePath');
        return true;
      },
    });

    return resolve(filePath.trim());
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }

  private formatDate(date?: Date): string {
    if (!date) return this.translationManager.t('fileBrowser.unknown');

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return this.translationManager.t('fileBrowser.today');
    if (diffDays === 1)
      return this.translationManager.t('fileBrowser.yesterday');
    if (diffDays < 7)
      return this.translationManager.t('fileBrowser.daysAgo', {
        count: diffDays,
      });
    if (diffDays < 30)
      return this.translationManager.t('fileBrowser.weeksAgo', {
        count: Math.floor(diffDays / 7),
      });

    return date.toLocaleDateString();
  }
}
