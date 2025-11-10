/**
 * Logging settings implementation integrated with existing settings UI
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

import chalk from 'chalk';

import { Logger } from '../infrastructure/logging';

import { CliUIManager } from './ui/cli-ui-manager';

import type { IConfigManager } from '../infrastructure/config/types';
import type { ITranslationManager } from '../infrastructure/i18n/types';
import type { ILogger, LogLevel } from '../infrastructure/logging/types';
import type { ServiceContainer } from '../shared/container';

export class LoggingSettings {
  private logger: ILogger;
  private configManager: IConfigManager;
  private translationManager: ITranslationManager;
  private uiManager: CliUIManager;

  constructor(private readonly container: ServiceContainer) {
    this.logger = this.container.resolve<ILogger>('logger');
    this.configManager = this.container.resolve<IConfigManager>('config');
    this.translationManager =
      this.container.resolve<ITranslationManager>('translator');
    this.uiManager = new CliUIManager(
      this.translationManager,
      this.logger,
      {},
      this.configManager,
    );
  }

  async start(): Promise<void> {
    try {
      // Log user access to logging settings
      this.uiManager.logUserAccess('LoggingSettings', 'Enter', {
        timestamp: new Date().toISOString(),
      });

      let running = true;

      while (running) {
        this.showLoggingHeader();
        const option = await this.selectLoggingOption();

        switch (option) {
          case 'level':
            await this.changeLogLevel();
            break;
          case 'file':
            await this.toggleFileLogging();
            break;
          case 'format':
            await this.changeLogFormat();
            break;
          case 'directory':
            await this.viewLogDirectory();
            break;
          case 'back':
            running = false;
            break;
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Logging settings error:'), error);
    }
  }

  private showLoggingHeader(): void {
    console.clear();

    const currentLevel =
      this.configManager.get<string>('logging.level', 'info') || 'info';
    const fileEnabled =
      this.configManager.get<boolean>('logging.fileEnabled', true) ?? true;
    const logFormat =
      this.configManager.get<string>('logging.format', 'text') || 'text';

    console.log(chalk.blue('┌─────────────────────────────────────────────┐'));
    console.log(
      chalk.blue(
        `│              📝 ${this.translationManager.t('logging.header.title')}              │`,
      ),
    );
    console.log(chalk.blue('├─────────────────────────────────────────────┤'));
    console.log(
      chalk.blue(
        `│  ${this.translationManager.t('logging.header.currentLevel')}: ${chalk.white(currentLevel.toUpperCase().padEnd(15))}   │`,
      ),
    );
    console.log(
      chalk.blue(
        `│  ${this.translationManager.t('logging.header.fileLogging')}: ${(fileEnabled ? chalk.green(this.translationManager.t('common.status.enabled')) : chalk.red(this.translationManager.t('common.status.disabled'))).padEnd(20)}   │`,
      ),
    );
    console.log(
      chalk.blue(
        `│  ${this.translationManager.t('logging.header.logFormat')}: ${chalk.white(logFormat.padEnd(15))}   │`,
      ),
    );
    console.log(
      chalk.blue('└─────────────────────────────────────────────┘\n'),
    );
  }

  private async selectLoggingOption(): Promise<string> {
    const inquirer = await import('inquirer');
    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'option',
        message: this.translationManager.t('logging.menu.selectOption'),
        choices: [
          {
            name: `0. ${this.translationManager.t('common.menu.returnToPrevious')}`,
            value: 'back',
          },
          {
            name: `1. ${this.translationManager.t('logging.menu.changeLogLevel')}`,
            value: 'level',
          },
          {
            name: `2. ${this.translationManager.t('logging.menu.toggleFileLogging')}`,
            value: 'file',
          },
          {
            name: `3. ${this.translationManager.t('logging.menu.changeLogFormat')}`,
            value: 'format',
          },
          {
            name: `4. ${this.translationManager.t('logging.menu.viewLogDirectory')}`,
            value: 'directory',
          },
        ],
        default: 'level',
        pageSize: 10,
      },
    ]);

    return result.option;
  }

  private async changeLogLevel(): Promise<void> {
    const inquirer = await import('inquirer');
    const currentLevel = this.configManager.get<string>(
      'logging.level',
      'info',
    );

    console.log(
      chalk.cyan(`\n🔧 ${this.translationManager.t('logging.level.title')}\n`),
    );

    // Display log level description
    console.log(
      chalk.blue(
        `📖 ${this.translationManager.t('logging.level.description')}：`,
      ),
    );
    console.log(
      chalk.gray(
        `   • ERROR  - ${this.translationManager.t('logging.level.errorDesc')}`,
      ),
    );
    console.log(
      chalk.gray(
        `   • WARN   - ${this.translationManager.t('logging.level.warnDesc')}`,
      ),
    );
    console.log(
      chalk.gray(
        `   • INFO   - ${this.translationManager.t('logging.level.infoDesc')}`,
      ),
    );
    console.log(
      chalk.gray(
        `   • DEBUG  - ${this.translationManager.t('logging.level.debugDesc')}`,
      ),
    );
    console.log();

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'level',
        message: this.translationManager.t('logging.level.selectPrompt'),
        choices: [
          {
            name: `ERROR  - ${this.translationManager.t('logging.level.errorShort')} ${currentLevel === 'error' ? chalk.green(`(${this.translationManager.t('common.status.current')})`) : ''}`,
            value: 'error',
          },
          {
            name: `WARN   - ${this.translationManager.t('logging.level.warnShort')} ${currentLevel === 'warn' ? chalk.green(`(${this.translationManager.t('common.status.current')})`) : ''}`,
            value: 'warn',
          },
          {
            name: `INFO   - ${this.translationManager.t('logging.level.infoShort')} ${currentLevel === 'info' ? chalk.green(`(${this.translationManager.t('common.status.current')})`) : ''}`,
            value: 'info',
          },
          {
            name: `DEBUG  - ${this.translationManager.t('logging.level.debugShort')} ${currentLevel === 'debug' ? chalk.green(`(${this.translationManager.t('common.status.current')})`) : ''}`,
            value: 'debug',
          },
        ],
        default: currentLevel,
      },
    ]);

    if (result.level !== currentLevel) {
      // Log the configuration change
      this.uiManager.logConfigChange(
        'logging.level',
        currentLevel,
        result.level,
      );

      this.configManager.set('logging.level', result.level);
      await this.configManager.save();

      // Update current logger level if possible
      if (this.logger.setLevel) {
        this.logger.setLevel(result.level as LogLevel);
      }

      console.log(
        chalk.green(`\n✅ Log level updated to: ${result.level.toUpperCase()}`),
      );
    } else {
      console.log(chalk.yellow('\nℹ️  Log level unchanged'));
    }

    await this.pressAnyKey();
  }

  private async toggleFileLogging(): Promise<void> {
    const inquirer = await import('inquirer');
    const fileEnabled =
      this.configManager.get<boolean>('logging.fileEnabled', true) ?? true;

    console.log(
      chalk.cyan(`\n💾 ${this.translationManager.t('logging.file.title')}\n`),
    );

    // Display file logging description
    console.log(
      chalk.blue(
        `📖 ${this.translationManager.t('logging.file.description')}：`,
      ),
    );
    console.log(
      chalk.gray(`   • ${this.translationManager.t('logging.file.benefit1')}`),
    );
    console.log(
      chalk.gray(`   • ${this.translationManager.t('logging.file.benefit2')}`),
    );
    console.log(
      chalk.gray(`   • ${this.translationManager.t('logging.file.location')}`),
    );
    console.log(
      chalk.gray(`   • ${this.translationManager.t('logging.file.rotation')}`),
    );
    console.log();

    console.log(
      chalk.gray(
        `${this.translationManager.t('logging.file.currentStatus')}: ${fileEnabled ? this.translationManager.t('common.status.enabled') : this.translationManager.t('common.status.disabled')}`,
      ),
    );
    console.log();

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'toggle',
        message: `${fileEnabled ? this.translationManager.t('logging.file.disablePrompt') : this.translationManager.t('logging.file.enablePrompt')}?`,
        choices: [
          {
            name: this.translationManager.t('common.status.yes'),
            value: true,
          },
          {
            name: this.translationManager.t('common.status.no'),
            value: false,
          },
        ],
        default: fileEnabled ? 1 : 0, // When enabled, default to "No" (index 1). When disabled, default to "Yes" (index 0)
      },
    ]);

    if (result.toggle) {
      // Toggle the current state
      const newValue = !fileEnabled;

      if (newValue) {
        // ENABLING: Save configuration first, then enable file logging and record change
        this.configManager.set('logging.fileEnabled', newValue);
        await this.configManager.save();

        // Enable file logging and record the configuration change
        await this.enableSessionFileLogging(fileEnabled, newValue);

        console.log(
          chalk.green(
            `\n✅ ${this.translationManager.t('logging.file.enabledSuccess')}`,
          ),
        );
        console.log(
          chalk.gray(
            `   ${this.translationManager.t('logging.file.enabledNote')}`,
          ),
        );
      } else {
        // DISABLING: Record change first (while file logging still works), then save config
        this.uiManager.logConfigChange(
          'logging.fileEnabled',
          fileEnabled,
          newValue,
        );

        this.configManager.set('logging.fileEnabled', newValue);
        await this.configManager.save();

        console.log(
          chalk.green(
            `\n✅ ${this.translationManager.t('logging.file.disabledSuccess')}`,
          ),
        );
        console.log(
          chalk.gray(
            `   ${this.translationManager.t('logging.file.disabledNote')}`,
          ),
        );
      }
    } else {
      console.log(
        chalk.yellow(
          `\nℹ️  ${this.translationManager.t('logging.file.unchanged')}`,
        ),
      );
    }

    await this.pressAnyKey();
  }

  private async enableSessionFileLogging(
    oldValue?: boolean,
    newValue?: boolean,
  ): Promise<void> {
    try {
      if (this.logger instanceof Logger) {
        const logsDir = this.getProjectLogsDir();
        const logFilePath = join(logsDir, 'md2pdf.log');

        await this.logger.enableFileLogging({
          filePath: logFilePath,
          format: this.configManager.get<'text' | 'json'>(
            'logging.format',
            'text',
          ),
          maxFileSize: this.configManager.get<number>(
            'logging.maxFileSize',
            10485760,
          ),
          maxBackupFiles: this.configManager.get<number>(
            'logging.maxBackupFiles',
            5,
          ),
          enableRotation: this.configManager.get<boolean>(
            'logging.enableRotation',
            true,
          ),
          async: true,
        });

        // Log the configuration change after file logging is enabled
        if (oldValue !== undefined && newValue !== undefined) {
          this.uiManager.logConfigChange(
            'logging.fileEnabled',
            oldValue,
            newValue,
          );
        }

        console.log(
          chalk.green(
            `   ${this.translationManager.t('logging.file.outputLocation')}: ${logFilePath}`,
          ),
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ${this.translationManager.t('logging.file.sessionEnableNote')}`,
        ),
      );
    }
  }

  private async changeLogFormat(): Promise<void> {
    const inquirer = await import('inquirer');
    const currentFormat = this.configManager.get<string>(
      'logging.format',
      'text',
    );

    console.log(
      chalk.cyan(`\n📄 ${this.translationManager.t('logging.format.title')}\n`),
    );

    // Display log format description
    console.log(
      chalk.blue(
        `📖 ${this.translationManager.t('logging.format.description')}：`,
      ),
    );
    console.log(
      chalk.gray(
        `   • TEXT - ${this.translationManager.t('logging.format.textDesc')}`,
      ),
    );
    console.log(
      chalk.gray(
        `   • JSON - ${this.translationManager.t('logging.format.jsonDesc')}`,
      ),
    );
    console.log();

    const result = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'format',
        message: this.translationManager.t('logging.format.selectPrompt'),
        choices: [
          {
            name: `text - ${this.translationManager.t('logging.format.textChoice')} ${currentFormat === 'text' ? chalk.green(`(${this.translationManager.t('common.status.current')})`) : ''}`,
            value: 'text',
          },
          {
            name: `json - ${this.translationManager.t('logging.format.jsonChoice')} ${currentFormat === 'json' ? chalk.green(`(${this.translationManager.t('common.status.current')})`) : ''}`,
            value: 'json',
          },
        ],
        default: currentFormat,
      },
    ]);

    if (result.format !== currentFormat) {
      // Log the configuration change
      this.uiManager.logConfigChange(
        'logging.format',
        currentFormat,
        result.format,
      );

      this.configManager.set('logging.format', result.format);
      await this.configManager.save();

      // Apply the new format to the current logger session
      await this.applyNewLogFormat(result.format);

      console.log(
        chalk.green(
          `\n✅ ${this.translationManager.t('logging.format.updateSuccess')}: ${result.format}`,
        ),
      );
    } else {
      console.log(
        chalk.yellow(
          `\nℹ️  ${this.translationManager.t('logging.format.unchanged')}`,
        ),
      );
    }

    await this.pressAnyKey();
  }

  private async viewLogDirectory(): Promise<void> {
    console.log(
      chalk.cyan(
        `\n📂 ${this.translationManager.t('logging.directory.title')}\n`,
      ),
    );

    const logsDir = this.getProjectLogsDir();
    console.log(
      chalk.blue(
        `${this.translationManager.t('logging.directory.path')}: ${logsDir}`,
      ),
    );

    if (existsSync(logsDir)) {
      console.log(
        chalk.green(
          `✅ ${this.translationManager.t('logging.directory.exists')}`,
        ),
      );

      try {
        const files = readdirSync(logsDir)
          .filter((file) => file.endsWith('.log') || file.endsWith('.json'))
          .slice(0, 10); // Show only first 10 files

        if (files.length > 0) {
          console.log(
            chalk.blue(
              `\n📄 ${this.translationManager.t('logging.directory.filesShowing')} ${Math.min(files.length, 10)}):`,
            ),
          );
          files.forEach((file) => {
            const stats = statSync(join(logsDir, file));
            const size = (stats.size / 1024).toFixed(1);
            const modified = stats.mtime.toLocaleDateString();
            console.log(chalk.gray(`   ${file} (${size} KB, ${modified})`));
          });
        } else {
          console.log(
            chalk.yellow(
              `\n⚠️  ${this.translationManager.t('logging.directory.noFiles')}`,
            ),
          );
        }
      } catch (error) {
        console.log(
          chalk.red(
            `\n❌ ${this.translationManager.t('logging.directory.readError')}:`,
          ),
          error,
        );
      }
    } else {
      console.log(
        chalk.yellow(
          `⚠️  ${this.translationManager.t('logging.directory.notExists')}`,
        ),
      );
    }

    await this.pressAnyKey();
  }

  private async applyNewLogFormat(format: string): Promise<void> {
    try {
      if (this.logger instanceof Logger) {
        const logsDir = this.getProjectLogsDir();
        const logFilePath = join(logsDir, 'md2pdf.log');

        // Re-enable file logging with all settings from configManager
        await this.logger.enableFileLogging({
          filePath: logFilePath,
          format: format as 'text' | 'json',
          maxFileSize: this.configManager.get<number>(
            'logging.maxFileSize',
            10485760,
          ),
          maxBackupFiles: this.configManager.get<number>(
            'logging.maxBackupFiles',
            5,
          ),
          enableRotation: this.configManager.get<boolean>(
            'logging.enableRotation',
            true,
          ),
          async: true,
        });

        console.log(
          chalk.gray(
            `   ${this.translationManager.t('logging.format.appliedToSession')}`,
          ),
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ${this.translationManager.t('logging.format.sessionUpdateNote')}`,
        ),
      );
    }
  }

  private getProjectLogsDir(): string {
    // Find project root by looking for package.json
    let currentDir = process.cwd();

    while (currentDir !== resolve(currentDir, '..')) {
      if (existsSync(join(currentDir, 'package.json'))) {
        break;
      }
      currentDir = resolve(currentDir, '..');
    }

    return resolve(currentDir, 'logs');
  }

  private async pressAnyKey(): Promise<void> {
    const inquirer = await import('inquirer');
    await inquirer.default.prompt([
      {
        type: 'input',
        name: 'continue',
        message: this.translationManager.t(
          'common.actions.pressEnterToContinue',
        ),
      },
    ]);
  }
}
