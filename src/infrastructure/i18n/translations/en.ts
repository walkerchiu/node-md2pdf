/**
 * English translations
 */

import type { TranslationKey } from '../types';

export const enTranslations: TranslationKey = {
  // Application info
  app: {
    name: 'MD2PDF',
    description: 'A tool for converting Markdown documents to PDF files',
    version: 'Version',
  },

  // CLI Interface
  cli: {
    mainMenu: {
      title: 'MD2PDF Main Menu',
      subtitle:
        'Convert Markdown files to professional PDF documents with table of contents',
      processPrompt: 'How would you like to process your files?',
      smartConversion: '🤖 Smart Conversion',
      smartConversionDesc: 'AI-powered settings with 3-step workflow',
      singleFile: '📄 Single File',
      singleFileDesc: 'Convert one Markdown file to PDF',
      batchProcessing: '📚 Batch Processing',
      batchProcessingDesc: 'Convert multiple files at once',
      customization: '🎨 Customization',
      customizationDesc: 'Advanced styling, template and security',
      settings: '🔧 Settings',
      settingsDesc: 'Language and preferences',
      exit: '🚪 Exit',
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
      selectLanguage: 'Select your preferred language',
    },
    documentMetadata: {
      title: '📄 Document Metadata',
      subtitle: 'Configure PDF document properties and metadata',
      selectOption: 'Select document metadata option',
      previewSettings: 'Preview Settings',
      configureExtractedInfo: 'Configure Auto-Extraction Settings',
      configureBasicInfo: 'Configure Basic Information',
      configureFrontmatterMapping: 'Configure Frontmatter Field Mapping',
      configureValidation: 'Configure Validation Rules',
      resetToDefaults: 'Reset to Defaults',
      basicTitle: 'Basic Document Information Setup',
      basicDescription:
        'Set standard PDF metadata that appears in document properties',
      extractionTitle: 'Metadata Extraction Settings',
      extractionDescription:
        'Configure how metadata is automatically extracted from content. When multiple sources are enabled, priority order is: Frontmatter (highest) → Config defaults → Content auto-detection (lowest)',
      validationTitle: 'Metadata Validation Rules',
      validationDescription:
        "Set validation requirements for document metadata. These rules provide quality control by generating warnings when metadata doesn't meet standards.\nValidation failures will NOT prevent PDF generation - they only produce warning messages in logs.",
      validationNote:
        '⚠️  Important: Validation failures only generate warnings and do not stop PDF creation.',
      previewSettingsTitle: 'Preview Settings',
      resetTitle: 'Reset to Defaults',
      prompts: {
        defaultTitle: 'Default document title (Leave empty to auto-detect):',
        defaultAuthor: 'Default document author:',
        defaultSubject: 'Default document subject/description:',
        defaultKeywords: 'Default keywords (Comma-Separated):',
        defaultLanguage: 'Default document language:',
        defaultOrganization: 'Default organization:',
        defaultCopyright: 'Default copyright notice:',
        enableExtraction: 'Enable metadata extraction:',
        fromFrontmatter:
          '🥇 Extract from YAML frontmatter (Priority: Highest):',
        fromContent:
          '🥉 Auto-detect from content (Priority: Lowest - only when config title is empty):',
        fromFilename: 'Extract metadata from filename (version, date):',
        computeStats:
          'Compute document statistics (estimated word count, page estimates, features):',
        priorityExplanation: 'Priority Order:',
        priority1: '1️⃣  YAML Frontmatter (Highest Priority)',
        priority2: '2️⃣  Config Default Values (Medium Priority)',
        priority3: '3️⃣  Content Auto-detection (Lowest Priority)',
        priorityNote:
          'Note: Content auto-detection only works when config title is empty',
        requireTitle: 'Require document title:',
        requireAuthor: 'Require document author:',
        maxKeywordLength: 'Maximum keywords field length:',
        maxSubjectLength: 'Maximum subject field length:',
        whatToDo: 'What would you like to do?',
        confirmReset: 'Are you sure you want to reset to defaults?',
      },
      messages: {
        basicUpdateSuccess: 'Basic metadata settings have been updated',
        extractionUpdateSuccess: 'Extraction settings have been updated',
        validationUpdateSuccess: 'Validation settings have been updated',
        resetSuccess: 'Metadata settings have been reset to defaults',
        resetCancelled: 'Reset cancelled.',
        resetWarning:
          'This will reset all metadata settings to default values.',
      },
      currentSettings: {
        extractionSettings: '🔧 Extraction Settings',
        defaultValues: '📝 Default Values',
        validationRules: '✅ Validation Rules',
        fromFrontmatter: 'From Frontmatter',
        fromContent: 'From Content',
        fromFilename: 'From Filename',
        computeStats: 'Compute Stats',
        autoDetect: 'Auto-detect',
        currentStatus: 'Current Status',
        mainExtraction: 'Main extraction',
        frontmatter: 'Frontmatter',
        contentDetection: 'Content detection',
        filename: 'Filename',
        statistics: 'Statistics (estimates)',
      },
      basicInfo: {
        title: 'Basic Document Information',
        description:
          'Set standard PDF metadata that appears in document properties',
        currentTitle: 'Title',
        currentAuthor: 'Author',
        currentSubject: 'Subject',
        currentKeywords: 'Keywords',
        currentCreator: 'Creator',
        currentProducer: 'Producer',
        notSet: 'Not set',
        enterTitle:
          'Enter document title (leave blank to auto-extract from content)',
        enterAuthor: 'Enter document author',
        enterSubject: 'Enter document subject/description',
        enterKeywords: 'Enter keywords (comma-separated)',
        clearField: 'Clear field',
        keepCurrent: 'Keep current value',
        autoExtract: 'Auto-extract from content',
        noChanges: 'No changes were made',
      },
      extraction: {
        title: 'Metadata Extraction Settings',
        description:
          'Configure how metadata is automatically extracted from content',
        fromFrontmatter: 'Extract from YAML frontmatter',
        fromContent: 'Extract from content analysis',
        fromFilename: 'Extract from filename patterns',
        computeStats: 'Compute document statistics',
        currentSettings: 'Current Settings',
        noChanges: 'No changes were made',
        updated: 'Extraction settings saved successfully',
      },
      validation: {
        title: 'Metadata Validation Rules',
        description: 'Set validation requirements for document metadata',
        requireTitle: 'Require document title',
        requireAuthor: 'Require document author',
        maxKeywordLength: 'Maximum keywords length',
        maxSubjectLength: 'Maximum subject length',
        currentRules: 'Current Validation Rules',
        enterMaxKeywords: 'Enter maximum keywords length (characters)',
        enterMaxSubject: 'Enter maximum subject length (characters)',
        noChanges: 'No changes were made',
        updated: 'Validation rules saved successfully',
      },
      frontmatterMapping: {
        title: 'Frontmatter Field Mapping',
        description: 'Map YAML frontmatter fields to PDF metadata properties',
        currentMappings: 'Current Field Mappings',
        addNewMapping: 'Add New Field Mapping',
        editMapping: 'Edit Field Mapping',
        removeMapping: 'Remove Field Mapping',
        frontmatterField: 'Frontmatter field name',
        metadataField: 'PDF metadata field',
        enterFrontmatterField:
          'Enter frontmatter field name (e.g., "title", "author")',
        enterMetadataField:
          'Enter target metadata field (e.g., "title", "author", "subject")',
        selectMappingToEdit: 'Select mapping to edit',
        selectMappingToRemove: 'Select mapping to remove',
        noChanges: 'No changes were made',
        noMappings: 'No field mappings configured',
        updated: 'Frontmatter mappings saved successfully',
        mappingExists: 'Mapping for this frontmatter field already exists',
      },
      reset: {
        title: 'Reset Metadata Settings',
        description: 'Reset all metadata settings to default values',
        warning: 'This will reset ALL metadata settings to defaults',
        confirmReset: 'Are you sure you want to reset to defaults?',
        noChanges: 'No changes were made',
      },
    },
    customizationMenu: {
      title: '🎨 Customization',
      subtitle: 'Advanced styling, template and security management options',
      coverDesign: 'Cover Design',
      headersFooters: 'Headers & Footers',
      documentMetadata: 'Document Metadata',
      securitySettings: 'Security & Watermarks',
      templateManagement: 'Template Management',
    },
    settingsMenu: {
      title: '🔧 Settings',
      languageSettings: 'Language & Localization',
      loggingSettings: 'Logging Settings',
      loggingComingSoon: '📝 Logging Settings features coming soon...',
      pressEnterToContinue: 'Press Enter to continue...',
    },
    languageMenu: {
      title: '🌐 Language & Localization',
      subtitle: 'Choose your preferred language',
      currentLanguage: 'Current Language',
      current: 'Current',
    },
    languages: {
      en: 'English',
      'zh-TW': 'Traditional Chinese (正體中文)',
    },
    options: {
      goodbye: 'Goodbye!',
    },
  },

  // Smart Conversion Mode
  smartConversion: {
    title: '🤖 Smart Conversion',
    subtitle: 'Intelligent configuration in 3 steps!',
    step1: 'Step 1: File Selection',
    step2: 'Step 2: Content Analysis & Recommendations',
    step3: 'Step 3: Configuration & Conversion',
    navigationHint:
      '💡 Navigation: ↑/↓ arrows, Enter to select, Ctrl+C to Return to Main Menu',
    fileSelectionPrompt: '📁 How would you like to select a file?',
    browseFiles: 'Browse files interactively',
    enterManually: 'Enter file path manually',
    chooseRecent: 'Choose from recent files',
    selected: '📄 Selected',
    analyzingContent: '🔍 Analyzing content...',
    openingFileBrowser: '🔍 Opening file browser...',
    fileBrowserUnavailable:
      '⚠️  File browser unavailable, falling back to manual entry',
    enterFilePath: '✏️  Enter the full path to your Markdown file:',
    pleaseEnterFilePath: 'Please enter a file path',
    recentFilesNotFound: '📁 No recent files found',
    recentFiles: '📁 Recent Files:',
    selectRecentFile: '📁 Select a recent file:',
    browseOtherFiles: '🔍 Browse for other files...',
    recentFilesError: '⚠️  Error loading recent files, using file browser',
    analysisResults: '📊 Content Analysis Results',
    words: 'Words',
    readingTime: 'Reading time',
    minutes: 'minutes',
    headings: 'Headings',
    maxDepth: 'max depth',
    language: 'Language',
    codeBlocks: 'Code blocks',
    tables: 'Tables',
    images: 'Images',
    documentType: 'Document type',
    complexity: 'Complexity',
    contentCharacteristics: 'Content characteristics',
    enterConversionOptions:
      'Please select from the available conversion options:',
    quickConversion: 'Auto-Apply Template',
    quickConversionDescription: 'Auto-select best template based on content',
    autoSelected: 'Auto-selected',
    smartRecommendations: 'Smart Custom Configuration (Recommended)',
    customConfiguration: 'Custom configuration',
    confidence: 'confidence',
    whichConversionMethod: '🎛️  Which conversion method would you like to use?',
    selectPresetConfiguration: '🔧 Select a preset configuration:',
    conversionSummary: '📊 Conversion Summary:',
    input: '📁 Input',
    configuration: '🔧 Configuration',
    outputFilePath: '📤 Output file path:',
    includeTOC: '📚 Include table of contents?',
    selectTocDepth: '📖 Select table of contents depth:',
    startConversion: '🚀 Start conversion?',
    conversionCancelled: '❌ Conversion cancelled',
    startingConversion: '🚀 Starting conversion...',
    converting: 'Converting...',
    conversionCompleted: '✅ Conversion completed successfully',
    output: '📤 Output',
    fileSize: '📊 File size',
    nextSteps: '💡 Next steps:',
    openPdf: '• Open the PDF:',
    convertAnother: '• Convert another file: Return to Main Menu',
    conversionFailed: '❌ Conversion failed',
    returningToMainMenu: '🔙 Returning to main menu...',
    error: '❌ Error',
    invalidMarkdownFile: '❌ Invalid Markdown file path. Please check:',
    fileExists: '• File exists',
    validExtension: '• File has .md, .markdown, .mdown, or .mkd extension',
    whatToDo: 'What would you like to do?',
    tryDifferentPath: '✏️  Try entering a different file path',
    returnToPrevious: '↩️  Return to previous menu',
    wordsLabel: 'words',
    headingsLabel: 'headings',
    pageNumbersLabel: 'Page Numbers',
    smartConfigApplied: 'Smart Configuration Applied:',
    tableOfContents: 'Table of Contents',
    levels: 'levels',
    // Language display
    languageDisplay: {
      en: '🇺🇸  English',
      'zh-TW': '🇹🇼  Traditional Chinese',
    },
    // Document type display
    documentTypeDisplay: {
      'technical-manual': '🔧 Technical Manual',
      'academic-paper': '🎓 Academic Paper',
      'business-report': '💼 Business Report',
      documentation: '📚 Documentation',
      tutorial: '📖 Tutorial',
      article: '📰 Article',
      book: '📕 Book',
      notes: '📝 Notes',
      presentation: '📊 Presentation',
      mixed: '🎭 Mixed Content',
    },
    // Intelligent matching translations
    intelligentMatching: {
      analysisTitle: '🔍 Intelligent Matching Analysis:',
      matchingDecisions: '🎯 Intelligent Matching Decisions:',
      headerConfig: 'Header Configuration',
      footerConfig: 'Footer Configuration',
      headerConfiguration: 'Header Configuration:',
      footerConfiguration: 'Footer Configuration:',
      noFieldsEnabled: 'No enabled fields',
      headerDisabled: 'Header not enabled',
      footerDisabled: 'Footer not enabled',
      headerNotEnabled: 'Header not enabled',
      footerNotEnabled: 'Footer not enabled',
      detailedAnalysis: 'Intelligent matching detailed analysis',
      logPrefix: 'Intelligent matching detailed analysis:\n',
      availability: {
        documentTitle: 'Document Title: {{status}} {{reason}}',
        authorInfo: 'Author Information: {{status}} {{reason}}',
        organizationInfo: 'Organization Information: {{status}} {{reason}}',
        versionInfo: 'Version Information: {{status}} {{reason}}',
        categoryInfo: 'Category Information: {{status}} {{reason}}',
        copyrightInfo: 'Copyright Information: {{status}} {{reason}}',
      },
      reasons: {
        available: '✅ Available',
        notAvailable: '❌ Not available',
        titleStructureDetected: '(Title structure detected)',
        configValueExists: '(Value exists in configuration)',
      },
      fieldDecisions: {
        title:
          'Title (User preference: {{userPreference}}, Document content: {{contentAvailable}})',
        pageNumber:
          'Page Number (User preference: {{userPreference}}, Always available: {{alwaysAvailable}})',
        author:
          'Author (User preference: {{userPreference}}, Config has value: {{configValue}})',
        organization:
          'Organization (User preference: {{userPreference}}, Config has value: {{configValue}})',
        version:
          'Version (User preference: {{userPreference}}, Config has value: {{configValue}})',
        category:
          'Category (User preference: {{userPreference}}, Config has value: {{configValue}})',
      },
      statusIcons: {
        enabled: '✅',
        disabled: '❌',
        available: '✅',
        notAvailable: '❌',
      },
    },
  },

  // Single File Conversion Mode (Interactive Mode)
  interactive: {
    title: '🔧 Interactive Markdown to PDF Configuration',
    subtitle:
      'Please answer the following questions to complete the conversion setup:',
    starting: 'Starting interactive conversion process',
    enterFilePath: 'Please enter Markdown file path or glob pattern:',
    pleaseEnterFilePath: 'Please enter a file path',
    invalidMarkdownFile:
      'Please enter a valid Markdown file (.md or .markdown)',
    enterOutputPath:
      'Please enter output PDF file path (press Enter for default):',
    includeTOC: 'Include table of contents?',
    selectTocDepth: 'Please select table of contents depth:',
    tocReturnLinksLevel: 'Select section range for return-to-TOC anchor links:',
    includePageNumbers: 'Include page numbers?',
    yes: 'Yes',
    no: 'No',
    conversionSummary: '📄 Conversion Configuration Summary:',
    inputFile: 'Input file:',
    outputFile: 'Output file:',
    tocDepth: 'TOC depth:',
    levels: 'levels',
    pageNumbers: 'Page numbers:',
    confirmAndStart: 'Confirm and start conversion?',
    cancelled: '❌ Conversion cancelled',
    fileSystemNotAvailable:
      'File system manager not available, skipping file search',
    foundFiles: 'Found {{count}} file(s)',
    selectFileToConvert: 'Select a file to convert:',
    invalidFileError: '❌ Invalid Markdown file path. Please check:',
    fileExists: '• File exists',
    validExtension: '• File has .md, .markdown, .mdown, or .mkd extension',
    whatToDo: 'What would you like to do?',
    tryDifferentPath: '✏️  Try entering a different file path',
    userCancelled: 'User chose to Return to Main Menu',
    errorSearchingFiles: 'Error while searching for files',
    startingConversion: '🚀 Starting conversion process...',
    preparingOptions: '🔧 Preparing conversion options...',
    processingMarkdown: '📖 Processing Markdown to PDF...',
    conversionCompleted: '✅ Conversion completed successfully!',
    conversionResults: '📄 Conversion Results:',
    fileSize: 'File size:',
    processingTime: 'Processing time:',
    headingsFound: 'Headings found:',
    conversionFailed: '❌ Conversion failed!',
    interactiveModeError: '❌ Interactive mode error:',
    usingTemplate: 'Using Template',
    templateConfig: 'Template Configuration',
    margins: 'Margins',
    fonts: 'Fonts',
    pageFormat: 'Page Format',
    codeBlockTheme: 'Code Block Theme',
    // No template mode
    noTemplate: 'No Template',
    noTemplateDescription:
      'Use custom headers/footers settings instead of template-defined ones',
    noTemplateMode: 'No Template Mode',
    noTemplateModeDesc: 'Will use your custom headers/footers configuration',
    noTemplateUsed: 'No Template Selected',
    usingCustomSettings: 'Using your custom headers/footers configuration',
    headerStatus: 'Header Status',
    footerStatus: 'Footer Status',
    enabled: 'Enabled',
    disabled: 'Disabled',
  },

  // Customization mode messages
  customization: {
    coverDesignComingSoon: 'Cover Design features coming soon...',
    headersFootersComingSoon: 'Headers & Footers features coming soon...',
    documentMetadataComingSoon: 'Document Metadata features coming soon...',
    securitySettingsComingSoon: 'Security & Watermarks features coming soon...',
    templateManagementComingSoon: 'Template Management features coming soon...',
    customizationError: 'Customization error',
    selectCustomizationOption: 'Select customization option',
    pressEnterToContinue: 'Press Enter to continue...',
  },

  // Headers and footers configuration
  headersFooters: {
    // Basic information
    basicInfo: {
      title: 'Headers & Footers Settings',
      subtitle: 'Configure document header and footer content',
    },

    // Section titles
    sections: {
      header: 'Header',
      footer: 'Footer',
      headerSettings: 'Header Settings',
      footerSettings: 'Footer Settings',
      globalSettings: 'Global Settings',
    },

    // Enable/disable controls
    enable: {
      header: 'Enable Header',
      footer: 'Enable Footer',
      toggle: 'Enable',
      disable: 'Disable',
    },

    // Menu and configuration options
    menu: {
      previewSettings: 'Preview Settings',
      configureHeader: 'Configure Header',
      configureFooter: 'Configure Footer',
      resetToDefaults: 'Reset to Defaults',
      selectConfigOption: 'Select configuration option:',
    },

    // Field configuration options
    configure: {
      title: 'Configure Title',
      pageNumber: 'Configure Page Number',
      dateTime: 'Configure Date/Time',
      copyright: 'Configure Copyright',
      message: 'Configure Custom message',
      author: 'Configure Author',
      organization: 'Configure Organization',
      version: 'Configure Version',
      category: 'Configure Category',
    },

    // User prompts
    prompts: {
      selectOption: 'Select headers & footers option',
      selectTitleMode: 'Select title display mode:',
      selectPageNumberMode: 'Select page number display mode:',
      selectDateTimeMode: 'Select date time display mode:',
      selectCopyrightMode: 'Select copyright display mode:',
      selectMessageMode: 'Select custom message display mode:',
      selectAuthorMode: 'Select author display mode:',
      selectOrganizationMode: 'Select organization display mode:',
      selectVersionMode: 'Select version display mode:',
      selectCategoryMode: 'Select category display mode:',
      selectAlignment: 'Select alignment:',
      enterCustomTitle: 'Enter custom title:',
      enterCustomAuthor: 'Enter copyright information:',
      enterCustomMessage: 'Enter custom message:',
      enterAuthorValue: 'Enter custom author value:',
      enterOrganizationValue: 'Enter custom organization value:',
      enterVersionValue: 'Enter custom version value:',
      enterCategoryValue: 'Enter custom category value:',
      confirmReset:
        'Are you sure you want to reset all headers & footers settings to defaults?',
    },

    // Status and state messages
    status: {
      headerEnabled: 'Header enabled',
      headerDisabled: 'Header disabled',
      footerEnabled: 'Footer enabled',
      footerDisabled: 'Footer disabled',
    },

    // Save confirmations and messages
    messages: {
      settingsSaved: 'Headers & footers settings saved',
      headerSettingsSaved: 'Header settings saved',
      footerSettingsSaved: 'Footer settings saved',
      settingsError: 'Error saving headers & footers settings',
      titleSaved: 'Title settings saved',
      pageNumberSaved: 'Page number settings saved',
      dateTimeSaved: 'Date time settings saved',
      copyrightSaved: 'Copyright settings saved',
      messageSaved: 'Message settings saved',
      authorSaved: 'Author settings saved',
      organizationSaved: 'Organization settings saved',
      versionSaved: 'Version settings saved',
      headerEnabledSaved: 'Header enabled',
      headerDisabledSaved: 'Header disabled',
      footerEnabledSaved: 'Footer enabled',
      footerDisabledSaved: 'Footer disabled',
      confirmReset:
        'Are you sure you want to reset to default settings? This will clear all custom configurations.',
      resetComplete: 'Reset to default settings complete',
      resetCancelled: 'Reset cancelled',
    },

    // Examples
    examples: {
      dateShort: '2024/01/01',
      dateLong: 'January 1, 2024',
      dateIso: '2024-01-01',
      datetimeShort: '2024/01/01 12:00',
      datetimeLong: 'January 1, 2024 12:00:00 PM',
    },

    // Preview-specific translations (that cannot be shared)
    preview: {
      title: 'Headers & Footers Configuration Preview',
      pageLayoutPreview: 'Page Layout Preview',
      detailedConfigSummary: 'Detailed Configuration Summary',
      documentContent: 'Document Content',
      contentDescription: 'Your Markdown content goes here',
      sectionDisabled: 'This section is disabled',
      headerDisabled: 'Header disabled',
      footerDisabled: 'Footer disabled',
      configurationStatistics: 'Configuration Statistics',
      totalEnabledFields: 'Total enabled fields',
      headerFields: 'Header fields',
      footerFields: 'Footer fields',

      // Example values for different field types
      messageExample: 'Confidential Document',

      // Recommendations subsection
      recommendations: {
        noFields:
          'Suggestion: Enable at least one field to display headers or footers',
        tooManyFields:
          'Suggestion: Many fields enabled, ensure page layout is not too crowded',
        goodConfiguration: 'Configuration looks good!',
      },
    },
  },

  // Template Management
  templates: {
    // Basic information
    basicInfo: {
      title: 'Template Management',
      subtitle: 'Manage conversion templates and presets',
      description:
        'Templates are snapshots of your current configuration including page format (A4, Letter, etc.), margins, headers/footers, table of contents settings, and document properties.\nTo modify a template, adjust your system settings and create a new template to preserve your preferred configuration for future use.',
      createTitle: '📝 Create New Template',
    },

    // Menu options
    menu: {
      viewAll: 'View All Templates',
      create: 'Create New Template',
      edit: 'Edit Template',
      delete: 'Delete Custom Template',
      import: 'Import Custom Template',
      export: 'Export Custom Template',
      apply: 'Apply Template',
    },

    // Prompts
    prompts: {
      selectOption: 'Select template option',
      selectTemplate: 'Select a template:',
      selectTemplateForConversion:
        'Select a template for conversion (settings can be adjusted after selection):',
      adjustSettings: 'Adjust template settings?',
      selectTocDepth: 'Select TOC depth:',
      includePageNumbers: 'Include page numbers?',
      templateName: 'Template name:',
      description: 'Description:',
      category: 'Category:',
      tags: 'Tags (comma-separated):',
      selectTemplateToEdit: 'Select template to edit:',
      selectTemplateToDelete: 'Select template to delete:',
      selectTemplateToExport: 'Select template to export:',
      selectTemplateToApply: 'Select template to apply:',
      confirmDelete: 'Are you sure you want to delete this template?',
      updateConfigFromCurrent: 'Update template config from current settings?',
      enterJsonPath: 'Enter path to JSON file:',
      outputFilePath: 'Output file path:',
    },

    // Messages
    messages: {
      noTemplatesFound: 'No templates found',
      noTemplates: 'No templates available',
      noCustomTemplates: 'No custom templates to {{action}}',
      templateCreated: 'Template created successfully',
      templateUpdated: 'Template updated successfully',
      templateDeleted: 'Template deleted successfully',
      templateImported: 'Template imported successfully',
      templateExported: 'Template exported successfully',
      templateApplied: 'Template applied successfully',
      usingTemplate: 'Using template',
      cannotDeleteSystem: 'System templates cannot be deleted',
      cannotEditSystem: 'System templates cannot be edited',
      templateNotFound: 'Template not found',
      invalidTemplateData: 'Invalid template data',
      exportCancelled: 'Export cancelled',
      deleteCancelled: 'Deletion cancelled',
      validationFailed: 'Template validation failed:',
      error: 'Error {{action}} template:',
      errorCreating: 'Error creating template:',
      errorLoadingTemplates: 'Error loading templates',
    },

    // Validation messages
    validation: {
      nameRequired: 'Name is required',
      nameExists: 'A template with this name already exists',
      descriptionRequired: 'Description is required',
      fileNotExist: 'File does not exist',
      mustBeJsonFile: 'File must be a JSON file',
      failed: 'Template validation failed:',
      errors: {
        idRequired: 'Template ID is required and must be a string',
        nameRequiredString: 'Template name is required and must be a string',
        descriptionRequiredString:
          'Template description is required and must be a string',
        typeInvalid: 'Template type must be either "system" or "custom"',
      },
    },

    // Template types
    types: {
      system: 'System',
      custom: 'Custom',
    },

    // View templates
    view: {
      systemTemplates: 'System Templates:',
      customTemplates: 'Custom Templates:',
      noSystemTemplates: 'No system templates found',
      noCustomTemplates: 'No custom templates found',
      config: {
        pageFormat: 'Page Format',
        margins: 'Margins',
        top: 'Top',
        right: 'Right',
        bottom: 'Bottom',
        left: 'Left',
        header: 'Header',
        footer: 'Footer',
        toc: 'Table of Contents',
        tocDepth: 'TOC Depth',
        anchorLinks: 'Anchor Links',
        anchorDepth: 'Anchor Depth',
        depth: 'Depth',
        pageNumbers: 'Page Numbers',
        fonts: 'Fonts',
        bodyFont: 'Body Font',
        headingFont: 'Heading Font',
        codeFont: 'Code Font',
        codeBlockTheme: 'Code Block Theme',
        colors: 'Colors',
        documentMetadata: 'Document Metadata',
      },
    },
  },

  // Batch Processing Mode
  batch: {
    title: '📚 Batch Processing',
    subtitle: 'Convert multiple files efficiently!',
    step1: 'Step 1: Select Files',
    step2: 'Step 2: Configure Settings',
    step3: 'Step 3: Process & Monitor',
    enterInputPattern: 'Enter input pattern:',
    patternHints:
      '  • Glob patterns: *.md, docs/**/*.md\n  • Multiple files: file1.md, file2.md (or "file1.md", "file2.md")\n  • Directory: docs\nPattern:',
    patternPlaceholder: '*.md',
    pleaseEnterPattern: 'Please enter an input pattern',
    searchingFiles: '🔍 Searching for files...',
    noFilesFound: '⚠️  No Markdown files found matching the pattern.',
    proceedWithFiles: 'Proceed with these {{count}} files?',
    fileSelectionCancelled: '❌ File selection cancelled',
    errorSearchingFiles: '❌ Error searching for files:',
    tryDifferentPattern: 'Would you like to try a different pattern?',
    configurationOptions: '🔧 Configuration Options',
    configurationSubtitle: 'Configure how your files will be processed',
    enterOutputDirectory: 'Enter output directory:',
    pleaseEnterOutputDirectory: 'Please enter an output directory',
    selectFilenameFormat: 'Select output filename format:',
    filenameFormats: {
      original: 'Original filename (example.pdf)',
      withTimestamp: 'With timestamp (example_1234567890.pdf)',
      withDate: 'With date (example_2024-01-15.pdf)',
      custom: 'Custom pattern',
    },
    enterCustomPattern:
      'Enter custom filename pattern (use {name}, {timestamp}, {date}):',
    customPatternPlaceholder: '{name}_{date}.pdf',
    patternMustIncludeName: 'Pattern must include {name} placeholder',
    includeTOCPrompt: 'Include table of contents?',
    selectTocDepth: 'Select table of contents depth:',
    tocReturnLinksLevel: 'Select section range for return-to-TOC anchor links:',
    includePageNumbers: 'Include page numbers?',
    selectMaxConcurrentProcesses: 'Select maximum concurrent processes:',
    concurrentOptions: {
      1: '1 (Sequential)',
      2: '2 (Recommended for most systems)',
      3: '3',
      4: '4',
      5: '5 (High-end systems only)',
    },
    continueOnError: 'Continue processing other files if one fails?',
    configurationSummary: '📊 Configuration Summary',
    filesToProcess: '📁 Files to process: {{count}}',
    outputDirectory: '📂 Output directory: {{directory}}',
    filenameFormatSummary: '📝 Filename format: {{format}}',
    filenameFormatOptions: {
      original: 'Keep original names',
      with_date: 'Add date suffix',
      with_timestamp: 'Add timestamp suffix',
      custom: 'Custom format',
    },
    includeTOC: '📚 Table of contents: {{include}}',
    tableOfContents: '📖 Table of contents: {{depth}} levels',
    pageNumbers: '📄 Page numbers: {{include}}',
    concurrentProcesses: '⚡ Concurrent processes: {{count}}',
    continueOnErrorSummary: '🔄 Continue on error: {{continue}}',
    finalConfirmationWarning: '⚠️  Final Confirmation:',
    finalConfirmationNote: 'Batch processing will create multiple PDF files.',
    processingTimeNote:
      'This operation may take several minutes depending on file size and count.',
    startBatchProcessing:
      'Start batch processing with the above configuration?',
    batchProcessingCancelled: '❌ Batch processing cancelled',
    startingBatchProcessing: '🚀 Starting batch processing...',
    cancellingBatchProcessing: '⚠️  Cancelling batch processing...',
    allFilesProcessedSuccessfully: '🎉 All files processed successfully!',
    partiallyProcessed:
      '⚠️  Processed {{successful}} out of {{total}} files successfully.',
    noFilesProcessed: '❌ No files were processed successfully.',
    checkErrorsAndRetry: 'Please check the errors above and try again.',
    batchProcessingCancelledByUser: '⚠️  Batch processing was cancelled.',
    batchProcessingFailed: '❌ Batch processing failed:',
    retryFailedFiles:
      '{{count}} files failed but can be retried. Retry failed files?',
    retryingFailedFiles: '🔄 Retrying {{count}} failed files...',
    retryCompleted: '✅ Retry completed: {{count}} additional files processed.',
    retryFailed: '❌ Retry failed: No additional files were processed.',
    retryError: '❌ Retry failed:',
    batchModeError: '❌ Batch mode error:',
    andMoreFiles: '... and {{count}} more files',
    yes: 'Yes',
    no: 'No',
    preserveStructure: 'Preserve directory structure: {{preserve}}',
  },

  // File Browser
  fileBrowser: {
    title: '📁 File Browser',
    currentDirectory: 'Current Directory',
    selectFile: 'Select File',
    upOneLevel: '⬆️  .. (Parent Directory)',
    returnToMain: '↩️  Return to Main Menu',
    enterDirectoryManually: '⌨️  Enter directory path manually',
    refreshDirectory: '🔄 Refresh',
    cancelBrowsing: '❌ Cancel browsing',
    directory: 'Directory',
    file: 'File',
    markdown: 'Markdown',
    modified: 'Modified',
    errorLoadingDirectory: 'Error loading directory',
    enterDirectoryPath: 'Enter directory path:',
    invalidDirectoryPath: 'Invalid directory path',
    directoryDoesNotExist: 'Directory does not exist',
    permissionDenied: 'Permission denied',
    noMarkdownFiles: 'No Markdown files in this directory',
    foundMarkdownFiles: 'Found {{count}} Markdown files',
    searchingFiles: 'Searching files...',
    noFilesFound: 'No files found',
    notMarkdown: 'not markdown',
    andOtherFiles: '... and {{count}} other files',
    enterSearchPattern: '🔍 Enter search pattern (filename or glob pattern):',
    pleaseEnterSearchPattern: 'Please enter a search pattern',
    noMatchingFilesFound: '❌ No matching files found',
    whatWouldYouLikeToDo: 'What would you like to do?',
    searchWithDifferentPattern: '🔍 Search with different pattern',
    goBackToFileBrowser: '↩️  Go back to file browser',
    foundOneFile: '✅ Found 1 file: {{filename}}',
    selectAnAction: 'Select an action:',
    selectFile2: '📄 Select: {{filename}}',
    trySearchingAgain: '🔍 Try searching again',
    noRecentFilesFound: '📁 No recent files found',
    selectFileOrAction: 'Select a file or choose an action:',
    pleaseEnterFilePath: 'Please enter a file path',
    enterFullPath: '✏️  Enter the full path to your Markdown file:',
    unknown: 'Unknown',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: '{{count}} days ago',
    weeksAgo: '{{count}} weeks ago',
    monthsAgo: '{{count}} months ago',
  },

  // File Search UI
  fileSearchUI: {
    filesFound: '📁 Files found:',
    andMoreFiles: '... and {{count}} more files',
    totalFiles: 'Total: {{count}} files',
  },

  // CLI Startup Messages
  startup: {
    appTitle: '🚀 MD2PDF v{{version}}',
    description: 'Convert Markdown documents to professional PDF files',
    checkingEnvironment: 'Checking environment...',
    environmentCheckPassed: '✅ Environment check passed',
    applicationStarted: 'Application started successfully',
    startupFailed: '❌ Startup failed:',
    unhandledRejection: 'Unhandled Promise rejection:',
    uncaughtException: 'Uncaught exception:',
    startingMainInteractiveMode: 'Starting main interactive mode',
    userSelectedSmartMode: 'User selected smart conversion mode',
    userSelectedSingleMode: 'User selected single file mode',
    userSelectedBatchMode: 'User selected batch mode',
    userSelectedCustomizationMode: 'User selected customization mode',
    userSelectedSettingsMode: 'User selected settings mode',
    userSelectedExit: 'User selected exit',
    startingCustomizationMode: 'Starting customization mode',
    startingSettingsMode: 'Starting settings mode',
    returningToMainMenuFromCustomization:
      'Returning to main menu from customization',
    returningToMainMenuFromSettings: 'Returning to main menu from settings',
    customizationModeError: 'Customization mode error',
    settingsModeError: 'Settings mode error',
    languageSettingsError: 'Language settings error',
    loggingSettingsError: 'Logging settings error',
    failedToChangeLanguage: 'Failed to change language',
  },

  // Environment Checks
  environment: {
    nodeVersionOk: '✅ Node.js version: {{version}} (meets requirements)',
    nodeVersionTooOld:
      '❌ Node.js version too old: {{version}}, requires >= 18.0.0',
    puppeteerReady: '✅ Puppeteer is ready',
    puppeteerFailed: '❌ Puppeteer initialization failed:',
    memoryUsageOk: '✅ Memory usage: {{memory}} MB',
    highMemoryUsage: '⚠️ High memory usage: {{memory}} MB',
    cannotCheckResources: '⚠️ Unable to check system resources',
    environmentCheckFailed:
      'Environment check failed ({{count}} checks not passed)',
  },

  // Batch Progress UI
  batchProgress: {
    startingConversion: '🚀 Starting batch conversion of {{count}} files...',
    processing: '🔄 Processing... ({{current}}/{{total}})',
    batchComplete: '✅ Batch conversion complete!',
    batchFailed: '❌ Batch conversion failed',
    batchPartialSuccess: '⚠️ Batch conversion completed with some failures',
    processingStarted: '🚀 Batch processing started ({{count}} files)',
    processingComplete:
      '✅ Processing complete! All {{count}} files processed successfully!',
    processingPartial:
      '⚠️ Processed {{successful}}/{{total}} files ({{rate}}% success rate)',
    processingFailed: '❌ Failed to process any files',
    progressEta: 'ETA: {{eta}}',
    successfullyConverted: '✅ Successfully converted files:',
    errorsEncountered: '❌ Errors encountered:',
    processingResults: '📊 Batch Processing Results:',
    filesToProcess: '📁 Files to be processed:',
    totalFiles: 'Total: {{count}} files',
    andMoreFiles: '... and {{count}} more files',
    batchConfiguration: '🔧 Batch Configuration:',
    inputPattern: 'Input Pattern:',
    outputDirectory: 'Output Directory:',
    concurrentProcesses: 'Concurrent Processes:',
    continueOnError: 'Continue on Error:',
    successful: 'Successful: {{count}}',
    failed: 'Failed: {{count}}',
    skipped: 'Skipped: {{count}}',
    processingTime: 'Processing time: {{time}}',
    averagePerFile: 'Average per file: {{time}}',
    pages: 'pages',
    suggestions: 'Suggestions:',
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

  // Table of Contents (CLI interactions)
  toc: {
    generating: 'Generating table of contents...',
    noHeadings: 'No headings found in document',
    depth: 'Depth: {{depth}} levels',
    entriesFound: 'Found {{count}} TOC entries',
  },

  // PDF Content (content that appears in the generated PDF)
  pdfContent: {
    tocTitle: 'Table of Contents',
    pageNumber: 'Page {{page}} of {{totalPages}}',
  },

  // Content analysis
  analysis: {
    complexity: {
      codeHeavy: 'Contains {{lines}} lines of code across {{blocks}} blocks',
      tableHeavy: 'Contains {{count}} complex tables',
      mediaRich: 'Contains {{count}} images',
      mediaRichWithDiagrams: 'Contains {{count}} images and diagrams',
      deepHeadingStructure:
        'Deep heading structure ({{depth}} levels, {{count}} headings)',
    },
  },

  // Error messages
  error: {
    validation: 'Validation error: {{message}}',
  },

  // Success messages
  success: {
    settingsUpdated: 'Settings updated successfully',
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

  // Logging Settings
  logging: {
    header: {
      title: 'Logging Settings',
      currentLevel: 'Current level',
      fileLogging: 'File logging',
      logFormat: 'Log format',
    },
    menu: {
      selectOption: 'Select logging option',
      changeLogLevel: 'Change Log Level',
      toggleFileLogging: 'Toggle File Logging',
      changeLogFormat: 'Change Log Format',
      viewLogDirectory: 'View Log Directory',
      testLoggingFunctions: 'Test Logging Functions',
    },
    level: {
      title: 'Configure Log Level',
      description: 'Log levels determine which messages are displayed',
      selectPrompt: 'Select the minimum log level to display',
      errorDesc:
        'Only critical errors that prevent the application from functioning',
      errorShort: 'Critical errors only',
      warnDesc: 'Errors and warnings about potential issues',
      warnShort: 'Errors and warnings',
      infoDesc:
        'General information messages along with errors and warnings (Recommended)',
      infoShort: 'Information and above (Recommended)',
      debugDesc: 'Detailed debugging information for troubleshooting',
      debugShort: 'All messages including debug output',
      updateSuccess: 'Log level updated successfully to',
      unchanged: 'Log level unchanged (already set to',
    },
    file: {
      title: 'Configure File Logging',
      description: 'File logging allows you to save log messages to disk',
      benefit1: 'Persistent storage of log messages for later review',
      benefit2: 'Automatic log rotation to prevent disk space issues',
      location: 'Log files are stored in the logs directory',
      rotation: 'Old log files are automatically archived',
      currentStatus: 'File logging is currently',
      enablePrompt: 'Would you like to enable file logging',
      disablePrompt: 'Would you like to disable file logging',
      enabledSuccess: 'File logging has been enabled',
      enabledNote:
        'Log messages will now be written to files in addition to the console',
      disabledSuccess: 'File logging has been disabled',
      disabledNote: 'Log messages will only be displayed in the console',
      unchanged: 'File logging setting unchanged',
      outputLocation: 'Log output will be written to',
      sessionEnableNote: 'File logging is enabled for this session',
    },
    format: {
      title: 'Configure Log Format',
      description: 'Choose how log messages are formatted',
      selectPrompt: 'Select the log message format',
      textDesc: 'Human-readable format with timestamps',
      textChoice: 'Human-readable format (Recommended)',
      jsonDesc: 'Machine-readable JSON format for analysis tools',
      jsonChoice: 'JSON format for automated processing',
      updateSuccess: 'Log format updated successfully to',
      unchanged: 'Log format unchanged (already set to',
    },
    directory: {
      title: 'View Log Directory',
      path: 'Log directory location',
      exists: 'Log directory exists',
      notExists:
        'Log directory does not exist yet (will be created when file logging is enabled)',
      filesShowing: 'Log files found (showing first',
      noFiles: 'No log files found in the directory',
      readError: 'Unable to read directory contents',
    },
    test: {
      title: 'Test Logging Functions',
      infoMessage:
        'This is a test INFO message from the logging settings panel',
      warnMessage:
        'This is a test WARN message to demonstrate warning level logging',
      errorMessage: 'This is a test ERROR message to show error level output',
      debugMessage:
        'This is a test DEBUG message with detailed information for troubleshooting',
      sending: 'Sending test messages at different log levels',
      sendingLevel: 'Sending',
      sent: 'Test messages sent successfully!',
      checkOutput:
        'Check your console and log files (if file logging is enabled) to see the output',
    },
  },

  // Common messages
  common: {
    // Basic actions (shared across all modules)
    actions: {
      back: 'Back',
      cancel: 'Cancel',
      confirm: 'Confirm',
      continue: 'Continue',
      exit: 'Exit',
      save: 'Save',
      skip: 'Skip',
      retry: 'Retry',
      ok: 'OK',
      done: 'Done',
      browse: 'Browse...',
      manual: 'Manual Input',
      recent: 'Recent Files',
      refresh: 'Refresh',
      preview: 'Preview',
      edit: 'Edit',
      remove: 'Remove',
      pressEnterToContinue: 'Press Enter to continue...',
      add: 'Add',
      reset: 'Reset',
      update: 'Update',
    },

    // Status indicators (shared across all modules)
    status: {
      enabled: 'Enabled',
      disabled: 'Disabled',
      yes: 'Yes',
      no: 'No',
      current: 'Current',
      notSet: 'Not set',
      loading: 'Loading...',
      processing: 'Processing...',
      completed: 'Completed',
      failed: 'Failed',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      pending: 'Pending',
      active: 'Active',
      inactive: 'Inactive',
    },

    // Document field names (shared across metadata, headers/footers, etc.)
    fields: {
      name: 'Name',
      title: 'Title',
      author: 'Author',
      subject: 'Subject',
      keywords: 'Keywords',
      language: 'Language',
      organization: 'Organization',
      copyright: 'Copyright',
      pageNumber: 'Page Number',
      dateTime: 'Date Time',
      message: 'Message',
      version: 'Version',
      category: 'Category',
      creator: 'Creator',
      producer: 'Producer',
    },

    // Alignment options (shared across headers/footers, tables, etc.)
    alignment: {
      left: 'Left',
      center: 'Center',
      right: 'Right',
      justify: 'Justify',
    },

    // File size units (shared across file operations)
    fileSize: {
      bytes: 'Bytes',
      kb: 'KB',
      mb: 'MB',
      gb: 'GB',
      tb: 'TB',
    },

    // Time units (shared across progress, estimates, etc.)
    time: {
      seconds: 'seconds',
      minutes: 'minutes',
      hours: 'hours',
      days: 'days',
      weeks: 'weeks',
      months: 'months',
    },

    // TOC levels (shared across all conversion modes)
    tocLevels: {
      1: '1 level (# only)',
      2: '2 levels (# and ##)',
      3: '3 levels (# through ###)',
      4: '4 levels (# through ####)',
      5: '5 levels (# through #####)',
      6: '6 levels (# through ######)',
    },

    // TOC depths for template adjustment
    tocDepths: {
      2: '2 levels (# through ##)',
      3: '3 levels (# through ###)',
      4: '4 levels (# through ####)',
      5: '5 levels (# through #####)',
      6: '6 levels (# through ######)',
    },

    // TOC return links levels (shared across all modes)
    tocReturnLinksLevels: {
      0: 'None',
      1: 'H2 sections',
      2: 'H2-H3 sections',
      3: 'H2-H4 sections',
      4: 'H2-H5 sections',
      5: 'H2-H6 sections',
    },

    // Display modes (shared across headers/footers, metadata, etc.)
    displayModes: {
      none: "Don't show",
      custom: 'Custom',
      show: 'Show',
      auto: 'Auto',
      metadata: 'From metadata',
      'metadata-creation': 'Creation date from metadata',
      'metadata-modification': 'Modification date from metadata',
      'date-short': 'Date short (2024/01/01)',
      'date-long': 'Date long (January 1, 2024)',
      'date-iso': 'Date ISO (2024-01-01)',
      'datetime-short': 'DateTime short (2024/01/01 12:00)',
      'datetime-long': 'DateTime long (January 1, 2024 12:00:00 PM)',
    },

    // Menu navigation patterns (shared across all menus)
    menu: {
      returnToMain: 'Return to Main Menu',
      returnToCustomization: 'Return to Customization Menu',
      returnToPrevious: 'Return to previous menu',
      selectOption: 'Select option',
      selectConfigOption: 'Select configuration option',
      confirmReset: 'Are you sure you want to reset to defaults?',
      pressEnterToContinue: 'Press Enter to continue...',
      whatToDo: 'What would you like to do?',
    },

    // Common validation messages (shared across all forms)
    validation: {
      required: 'This field is required',
      noChanges: 'No changes were made',
      settingsUpdated: 'Settings updated successfully',
      settingsSaved: 'Settings saved successfully',
      updateSuccess: 'Update completed successfully',
      updateFailed: 'Update failed',
      resetSuccess: 'Reset to defaults completed',
      resetCancelled: 'Reset cancelled',
      resetWarning: 'This will reset all settings to default values',
      invalidInput: 'Invalid input',
      operationCancelled: 'Operation cancelled',
    },

    // Examples for preview/demo purposes (shared across all modules)
    examples: {
      title: 'My Document Title',
      author: 'John Doe',
      subject: 'Document Description',
      keywords: 'keyword1, keyword2, keyword3',
      organization: 'My Company',
      pageNumber: 'Page 1 of 10',
      dateTime: '2024/01/15 14:30',
      copyright: '© 2024 My Company',
      message: 'Confidential Document',
      version: '1.0.0',
      category: 'Documentation',
    },
  },

  // Short text (for menu shortcuts)
  short: {
    back: 'Back',
    english: 'English',
    traditionalChinese: 'Traditional Chinese',
    languageSettings: 'Language Settings',
    loggingSettings: 'Logging Settings',
    coverDesign: 'Cover Design',
    headersFooters: 'Headers & Footers',
    documentMetadata: 'Document Metadata',
    securitySettings: 'Security Settings',
    templateManagement: 'Template Management',
  },

  // Anchor links
  anchorLinks: {
    backToToc: '↑ Back to TOC',
  },

  // Preset configurations
  presets: {
    quickSimple: {
      name: 'Quick & Simple',
      description:
        'Ideal for drafts requiring quick output without complex formatting',
      useCase: 'Simple documents, quick conversion',
    },
    business: {
      name: 'Business Report',
      description:
        'Suitable for formal business contexts requiring professional appearance',
      useCase: 'Business reports, proposals, meeting documents',
    },
    technical: {
      name: 'Technical Documentation',
      description:
        'Designed for documents with extensive code and detailed table of contents',
      useCase: 'API documentation, technical manuals, developer docs',
    },
    academic: {
      name: 'Academic Paper',
      description:
        'Formatted for formal papers meeting academic standards with wider margins',
      useCase: 'Academic papers, research reports, thesis',
    },
    custom: {
      name: 'Custom',
      description: 'Custom template category',
      useCase: 'Custom use case',
    },
  },
};
