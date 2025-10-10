#!/usr/bin/env node

/**
 * MD2PDF CLI main entry point
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { version } from '../package.json';

import { ApplicationServices } from './application/container';
import { MainInteractiveMode } from './cli/main-interactive';
import { validateEnvironment } from './utils/validation';

import type { ILogger } from './infrastructure/logging/types';
import type { ITranslationManager } from './infrastructure/i18n/types';

const program = new Command();

/**
 * Main program
 */
async function main(): Promise<void> {
  let logger: ILogger | null = null;
  let translator: ITranslationManager | null = null;

  try {
    // Initialize application services container
    const container = ApplicationServices.createContainer();
    logger = container.resolve<ILogger>('logger');
    translator = container.resolve<ITranslationManager>('translator');

    // Environment check
    logger!.info(chalk.cyan(translator.t('startup.appTitle', { version })));
    logger!.info(chalk.gray(translator.t('startup.description')));
    logger!.info('');

    logger!.info(chalk.blue(translator.t('startup.checkingEnvironment')));
    await validateEnvironment(translator);
    logger!.info(chalk.green(translator.t('startup.environmentCheckPassed')));
    logger!.info('');

    logger.info(translator.t('startup.applicationStarted'));

    // Configure CLI commands
    program
      .name('md2pdf')
      .description(
        'Convert Markdown documents to PDF files with professional table of contents',
      )
      .version(version);

    // Interactive mode (default)
    program
      .command('convert', { isDefault: true })
      .description('Start interactive conversion mode')
      .action(async () => {
        const mainInteractive = new MainInteractiveMode(container);
        await mainInteractive.start();
        // After main interactive mode ends, exit the process
        process.exit(0);
      });

    // Parse command line arguments
    await program.parseAsync(process.argv);
  } catch (error) {
    if (logger) {
      logger.error('Application startup failed', error);
    }
    process.stderr.write(
      chalk.red('❌ Startup failed:') +
        ' ' +
        (error instanceof Error
          ? error.stack || error.message
          : String(error)) +
        '\n',
    );
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('unhandledRejection', (reason, _promise) => {
  process.stderr.write(
    chalk.red('Unhandled Promise rejection:') + ' ' + String(reason) + '\n',
  );
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  process.stderr.write(
    chalk.red('Uncaught exception:') +
      ' ' +
      (error instanceof Error ? error.stack || error.message : String(error)) +
      '\n',
  );
  process.exit(1);
});

// Execute main program
if (require.main === module) {
  main();
}
