#!/usr/bin/env node

/**
 * MD2PDF CLI main entry point
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { version } from '../package.json';

import { ApplicationServices } from './application/container';
import { MainInteractiveMode } from './cli/main-interactive';
import { StartupUI } from './cli/ui/startup-ui';
import { EnvironmentConfig } from './infrastructure/config/environment';
import { validateEnvironment } from './utils/validation';

import type { ITranslationManager } from './infrastructure/i18n/types';
import type { ILogger } from './infrastructure/logging/types';

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

    // Initialize startup UI
    const startupUI = new StartupUI(translator);

    // Show welcome banner
    startupUI.showBanner(version);

    // Environment check with clean output
    try {
      const envResults = await validateEnvironment(translator);

      // Show warnings if any
      envResults.warnings.forEach((warning) => {
        if (startupUI.isVerbose()) {
          startupUI.showWarning(warning);
        }
      });

      // Show environment status in clean format
      await startupUI.showEnvironmentCheck(
        envResults.nodeVersion,
        envResults.memoryMB,
        envResults.puppeteerReady,
      );

      // Log to logger only in verbose mode
      if (startupUI.isVerbose()) {
        logger.info(translator.t('startup.applicationStarted'));
      } else {
        startupUI.showStarting();
      }
    } catch (envError) {
      startupUI.showError(
        'Environment check failed',
        envError instanceof Error ? envError : new Error(String(envError)),
      );
      throw envError;
    }

    // Configure CLI commands
    program
      .name('md2pdf')
      .description(
        'Convert Markdown documents to PDF files with professional table of contents',
      )
      .version(version);

    // Direct file conversion
    program
      .argument('[input]', 'Input markdown file path')
      .argument('[output]', 'Output PDF file path (optional)')
      .action(async (input?: string, output?: string) => {
        if (input) {
          // Direct conversion mode
          try {
            const processor = container.resolve('fileProcessor') as any;

            const outputPath = output || input.replace(/\.md$/i, '.pdf');
            console.log(chalk.blue(`Converting ${input} to ${outputPath}...`));

            const result = await processor.processFile(input, {
              outputPath,
              includeTOC: true,
              includePageNumbers: true,
              tocReturnLinksLevel: 3, // Smart default: H2-H4 when TOC enabled
            });

            if (result.success) {
              console.log(
                chalk.green(`✅ PDF generated successfully: ${outputPath}`),
              );
            } else {
              console.log(chalk.red(`❌ Conversion failed: ${result.error}`));
              process.exit(1);
            }
          } catch (error) {
            console.log(
              chalk.red(
                `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
            process.exit(1);
          }
        } else {
          // Interactive mode (default)
          const mainInteractive = new MainInteractiveMode(container);
          await mainInteractive.start();
        }
        // After processing ends, exit the process
        process.exit(0);
      });

    // Interactive mode command
    program
      .command('interactive')
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
    // Use consistent error formatting
    if (translator) {
      const startupUI = new StartupUI(translator);
      startupUI.showError(
        'Startup failed',
        error instanceof Error ? error : new Error(String(error)),
      );
    } else {
      process.stderr.write(
        chalk.red('❌ Startup failed:') +
          ' ' +
          (error instanceof Error
            ? error.stack || error.message
            : String(error)) +
          '\n',
      );
    }

    // Log detailed error only in verbose mode
    if (logger && EnvironmentConfig.isVerboseEnabled()) {
      logger.error('Application startup failed', error);
    }

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

// Export main function for testing
export { main };

// Execute main program
if (require.main === module) {
  main();
}
