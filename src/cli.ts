#!/usr/bin/env node

/**
 * MD2PDF CLI main entry point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { version } from '../package.json';
import { InteractiveMode } from './cli/interactive';
import { validateEnvironment } from './utils/validation';

const program = new Command();

/**
 * Main program
 */
async function main(): Promise<void> {
  try {
    // Environment check
    console.log(chalk.cyan('🚀 MD2PDF v' + version));
    console.log(chalk.gray('Convert Markdown documents to professional PDF files'));
    console.log();

    console.log(chalk.blue('Checking environment...'));
    await validateEnvironment();
    console.log(chalk.green('✅ Environment check passed'));
    console.log();

    // Configure CLI commands
    program
      .name('md2pdf')
      .description('Convert Markdown documents to PDF files with professional table of contents')
      .version(version);

    // Interactive mode (default)
    program
      .command('convert', { isDefault: true })
      .description('Start interactive conversion mode')
      .action(async () => {
        const interactive = new InteractiveMode();
        await interactive.start();
      });

    // Parse command line arguments
    await program.parseAsync(process.argv);

  } catch (error) {
    console.error(chalk.red('❌ Startup failed:'), error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('unhandledRejection', (reason, _promise) => {
  console.error(chalk.red('Unhandled Promise rejection:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught exception:'), error);
  process.exit(1);
});

// Execute main program
if (require.main === module) {
  main();
}
