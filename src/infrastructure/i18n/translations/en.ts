/**
 * English translations
 */

import type { TranslationKey } from '../types';

export const enTranslations: TranslationKey = {
  // Application info
  app: {
    name: 'MD2PDF',
    description:
      'A tool for converting Markdown documents to PDF files with professional table of contents',
    version: 'Version',
  },

  // CLI Interface
  cli: {
    mainMenu: {
      title: 'MD2PDF Main Menu',
      startConversion: '🚀 Start Conversion',
      versionInfo: 'ℹ️  Version Info',
      languageSettings: '🌐 Language Settings',
      helpDocumentation: '❓ Help Documentation',
      exitProgram: '🚪 Exit Program',
    },
    prompts: {
      selectFile: 'Select Markdown file to convert',
      outputPath: 'Specify output PDF path',
      pageFormat: 'Choose page format',
      margins: 'Set page margins',
      tocEnabled: 'Generate table of contents?',
      tocDepth: 'Table of contents depth',
      bookmarksEnabled: 'Generate PDF bookmarks?',
      bookmarksDepth: 'Bookmarks depth',
      coverPage: 'Include cover page?',
      theme: 'Select theme',
      finalConfirmation: 'Confirm conversion settings?',
    },
    options: {
      yes: 'Yes',
      no: 'No',
      back: 'Back',
      continue: 'Continue',
      cancel: 'Cancel',
      browse: 'Browse...',
      manual: 'Manual Input',
      recent: 'Recent Files',
    },
  },

  // File operations
  file: {
    notFound: 'File not found: {{path}}',
    permissionDenied: 'Permission denied: {{path}}',
    readError: 'Error reading file: {{path}}',
    writeError: 'Error writing file: {{path}}',
    invalidFormat: 'Invalid file format: {{format}}',
  },

  // PDF Generation
  pdf: {
    generating: 'Generating PDF...',
    generationComplete: 'PDF generation complete',
    generationFailed: 'PDF generation failed',
    savingTo: 'Saving to: {{path}}',
    pageCount: 'Total pages: {{count}}',
  },

  // Table of Contents
  toc: {
    generating: 'Generating table of contents...',
    noHeadings: 'No headings found in document',
    depth: 'Depth: {{depth}} levels',
    entriesFound: 'Found {{count}} TOC entries',
  },

  // Error messages
  error: {
    unknown: 'An unknown error occurred',
    validation: 'Validation error: {{message}}',
    parsing: 'Markdown parsing error: {{message}}',
    puppeteer: 'PDF engine error: {{message}}',
    fileSystem: 'File system error: {{message}}',
    configuration: 'Configuration error: {{message}}',
    network: 'Network error: {{message}}',
  },

  // Success messages
  success: {
    conversion: 'Conversion completed successfully!',
    fileCreated: 'File created: {{path}}',
    configSaved: 'Configuration saved',
    settingsUpdated: 'Settings updated',
  },

  // Validation messages
  validation: {
    required: 'This field is required',
    invalidPath: 'Invalid file path',
    invalidFormat: 'Invalid format: {{format}}',
    fileMustExist: 'File must exist',
    directoryMustExist: 'Directory must exist',
    invalidNumber: 'Invalid number: {{value}}',
  },

  // Progress messages
  progress: {
    reading: 'Reading file...',
    parsing: 'Parsing Markdown...',
    generating: 'Generating PDF...',
    saving: 'Saving file...',
    complete: 'Complete!',
  },

  // Page formats
  pageFormat: {
    a4: 'A4 (210 × 297 mm)',
    a3: 'A3 (297 × 420 mm)',
    letter: 'Letter (8.5 × 11 inch)',
    legal: 'Legal (8.5 × 14 inch)',
    tabloid: 'Tabloid (11 × 17 inch)',
  },

  // Themes
  theme: {
    default: 'Default',
    minimal: 'Minimal',
    academic: 'Academic',
    business: 'Business',
    modern: 'Modern',
  },
};
