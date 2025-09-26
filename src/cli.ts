#!/usr/bin/env node

/**
 * MD2PDF CLI main entry point
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { ApplicationServices } from './application/container';
import { MainInteractiveMode } from './cli/main-interactive';
import { validateEnvironment } from './utils/validation';
import { version } from '../package.json';

import type { ILogger } from './infrastructure/logging/types';

const program = new Command();

/**
 * Main program
 */
async function main(): Promise<void> {
  let logger: ILogger | null = null;

  try {
    // Initialize application services container
    const container = ApplicationServices.createContainer();
    logger = container.resolve<ILogger>('logger');

    // Environment check
    logger!.info(chalk.cyan('🚀 MD2PDF v' + version));
    logger!.info(
      chalk.gray('Convert Markdown documents to professional PDF files'),
    );
    logger!.info('');

    logger!.info(chalk.blue('Checking environment...'));
    await validateEnvironment();
    logger!.info(chalk.green('✅ Environment check passed'));
    logger!.info('');

    logger.info('Application started successfully');

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
