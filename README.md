# 📄 MD2PDF

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

**A professional Markdown to PDF converter with smart features**

Transform your Markdown documents into beautiful PDFs with automatic table of contents, PlantUML diagram support, Chinese language support, and intelligent settings recommendations!

## ✨ Key Features

🤖 **Smart Conversion** - AI-powered settings recommendations with 3-step workflow.<br/>
📄 **Single File** - Quick conversion of individual Markdown files.<br/>
📚 **Batch Processing** - Process multiple files at once efficiently.<br/>
🎨 **Customization** - Adjust styling, covers, headers, and footers.<br/>
🔧 **Settings** - Save preferences for future use.<br/>
📑 **Auto TOC** - Generate clickable table of contents from headings.<br/>
📊 **PlantUML Diagrams** - Automatic diagram rendering and embedding.<br/>
📈 **Mermaid Diagrams** - Modern flowcharts, sequence diagrams, and Gantt charts.<br/>
📝 **File Logging** - Advanced logging with rotation and monitoring.

## 🚀 Quick Start

> **Note**: This project is currently in development and not yet published to npm.

### Installation & Setup

1. **Clone the repository**

   ```bash
   git clone git@github.com:walkerchiu/md2pdf.git
   cd md2pdf
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**

   ```bash
   npm run build
   ```

### How to Use

1. **Launch the app (development mode)**

   ```bash
   npm run dev
   ```

   Or use the built version:

   ```bash
   npm start
   ```

2. **Choose your option**
   - 🤖 Smart Conversion: Let AI recommend the best settings.
   - 📄 Single File: Convert one file quickly.
   - 📚 Batch Processing: Handle multiple files at once.

3. **Select files** → **Configure options** → **Start conversion** → **Done!**.

## 📱 What You'll See

When you start the app, you'll see this friendly menu:

```text
┌──────────────────────────────────────────┐
│           MD2PDF Main Menu               │
├──────────────────────────────────────────┤
│  Convert Markdown files to professional  │
│  PDF documents with table of contents    │
└──────────────────────────────────────────┘

❯ 🤖 Smart Conversion - AI-powered settings with 3-step workflow
  📄 Single File - Convert one Markdown file to PDF
  📚 Batch Processing - Convert multiple files at once
  🎨 Customization - Advanced styling and templates
  🔧 Settings - Language and preferences
  🚪 Exit
```

## 📋 Supported Markdown Features

✅ **Headings** (H1-H6) - Automatically creates table of contents.<br/>
✅ **Text formatting** - Bold, italic, strikethrough.<br/>
✅ **Lists** - Ordered, unordered, and nested lists.<br/>
✅ **Code blocks** - With syntax highlighting.<br/>
✅ **Tables** - Full table support with proper formatting.<br/>
✅ **Links & Images** - Handles automatically with image path resolution.<br/>
✅ **Quotes & Dividers** - Maintains original formatting.<br/>
✅ **PlantUML Diagrams** - Automatic diagram rendering and embedding.<br/>
✅ **Mermaid Diagrams** - Flowcharts, sequence diagrams, Gantt charts with local rendering.<br/>
✅ **Chinese Support** - Perfect support for Chinese characters.

## 💡 Smart Features

### 🎯 Smart Conversion Mode

AI analyzes your document and recommends optimal settings:

- Auto-detects document type (technical docs, reports, blogs, etc.).
- Suggests appropriate styling and layout.
- Recommends TOC depth and page settings.

### 📚 Batch Processing

Handle multiple files efficiently:

- Process entire project documentation.
- Batch generate reports.
- Consistent formatting across files.

### 🎨 Customization Options

- **Page Structure**: Configure headers, footers, and margins with interactive presets.
- **Style Themes**: Choose from professional templates (business, academic, technical).
- **Table of Contents**: Customizable depth and styling.
- **PlantUML Settings**: Configure diagram server and rendering options.
- **Mermaid Settings**: Local rendering with theme customization and caching.
- **Image Processing**: Automatic path resolution and base64 embedding.

## 🔧 Requirements

- **Node.js**: Version 18.0.0 or higher.
- **Memory**: 2GB+ recommended (Puppeteer requirement).
- **Platforms**: macOS, Linux, Windows.

## 🛠️ For Developers

### Quick Development Setup

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Run tests
npm test

# Build project
npm run build
```

### Available Commands

```bash
# Development
npm run dev           # Development mode with TypeScript
npm start             # Run built version

# Testing
npm test              # Fast unit tests (~4 seconds)
npm run test:all      # Full test suite (~3 minutes)
npm run test:coverage # Coverage reports

# Code Quality
npm run lint          # Code linting
npm run format        # Code formatting
npm run clean         # Clean build files

# Git Hooks (requires setup)
npx lint-staged       # Run linting on staged files
npx husky init        # Initialize Husky
npm run prepare       # Run the prepare script
```

### Environment Variables

Configure the application behavior with environment variables:

#### File Logging System

MD2PDF includes a comprehensive file logging system with rotation and advanced management features:

```bash
# Basic Logging Control
MD2PDF_LOG_FILE_ENABLED=true          # Enable file logging (default: true)
MD2PDF_LOG_DIR=./logs                 # Log directory (default: ./logs)
MD2PDF_LOG_LEVEL=info                 # Log level: error|warn|info|debug
MD2PDF_LOG_FORMAT=text                # Log format: text|json

# File Management
MD2PDF_LOG_MAX_SIZE=10MB              # Maximum file size (supports KB/MB/GB)
MD2PDF_LOG_MAX_FILES=5                # Number of backup files to keep
MD2PDF_LOG_MAX_AGE=7d                 # Maximum file age (supports d/h/m)
MD2PDF_LOG_ENABLE_ROTATION=true       # Enable log rotation

# Performance Optimization
MD2PDF_LOG_BUFFER_ENABLED=false       # Enable write buffering
MD2PDF_LOG_BUFFER_SIZE=100            # Buffer size (number of entries)
MD2PDF_LOG_FLUSH_INTERVAL=5000        # Flush interval in milliseconds
```

**Advanced Features:**

- 🗂️ **Automatic Log Rotation**: Size and time-based rotation.
- 📊 **Performance Monitoring**: Write performance tracking and metrics.
- 🧹 **Maintenance**: Automatic cleanup of old logs and health checks.
- 🔍 **Search & Analysis**: Log search API and basic analytics.
- 📈 **Statistics**: Real-time logging statistics and health status.

#### Legacy Logging Options

```bash
# Enable verbose terminal output (shows debug messages and detailed info)
MD2PDF_VERBOSE=true npm run dev

# Development mode (sets default log level to debug, but no verbose output)
NODE_ENV=development npm run dev

# Set specific logging level (overrides environment defaults)
MD2PDF_LOG_LEVEL=debug npm run dev

# Combined: Development mode with verbose output and file logging
NODE_ENV=development MD2PDF_VERBOSE=true MD2PDF_LOG_FILE_ENABLED=true npm run dev
```

#### Installation & Build

```bash
# Skip Puppeteer download during installation
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
```

**Understanding Environment Variables:**

- **`MD2PDF_VERBOSE=true`**: Enables detailed terminal output with timestamps and debug info.
- **`NODE_ENV=development`**: Sets default log level to `debug` (more detailed than `info`).
- **`MD2PDF_LOG_LEVEL=level`**: Override log level regardless of `NODE_ENV` setting.
- **`MD2PDF_LOG_FILE_ENABLED=true`**: Enable advanced file logging with rotation.

**When to use verbose mode:**

- 🐞 **Debugging issues**: Get detailed error information and internal flow.
- 🔍 **Troubleshooting**: See environment checks, file operations, and timing.
- 👨‍💻 **Development**: Monitor application behavior and performance.

**Example with multiple options:**

```bash
# Full diagnostic mode with maximum detail and file logging
NODE_ENV=development MD2PDF_VERBOSE=true MD2PDF_LOG_LEVEL=debug MD2PDF_LOG_FILE_ENABLED=true npm run dev
```

**Advanced Configuration Examples:**

```bash
# Development with detailed file logging
NODE_ENV=development \
MD2PDF_LOG_LEVEL=debug \
MD2PDF_LOG_FORMAT=text \
MD2PDF_LOG_FILE_ENABLED=true \
npm run dev

# Production with optimized logging
NODE_ENV=production \
MD2PDF_LOG_LEVEL=info \
MD2PDF_LOG_FORMAT=json \
MD2PDF_LOG_MAX_SIZE=50MB \
MD2PDF_LOG_MAX_FILES=10 \
MD2PDF_LOG_MAX_AGE=30d \
MD2PDF_LOG_BUFFER_ENABLED=true \
npm start
```

## 🚨 Troubleshooting

### Installation Issues with Puppeteer?

Set up proxy or skip Chromium download:

```bash
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install
```

### Memory Issues?

Increase Node.js memory limit:

```bash
# For development mode
node --max-old-space-size=4096 node_modules/.bin/ts-node -r tsconfig-paths/register src/cli.ts

# For built version
node --max-old-space-size=4096 dist/cli.js
```

### Chinese Font Problems?

Ensure Chinese fonts are installed:

- **macOS**: Usually pre-installed.
- **Linux**: `sudo apt-get install fonts-noto-cjk`.
- **Windows**: Usually pre-installed.

### File Permission Errors?

Check file permissions:

```bash
chmod 644 your-markdown-file.md
```

### Logging Issues?

Common logging troubleshooting:

```bash
# Check if logs directory exists and is writable
ls -la logs/

# Enable debug mode to see logging details
MD2PDF_LOG_LEVEL=debug MD2PDF_VERBOSE=true npm run dev

# Check log file content
tail -f logs/md2pdf.log
```

## 🎯 Best Practices

1. **File Size**: Keep files under 10MB for best performance.
2. **Images**: Use relative paths for image references.
3. **TOC Settings**: 2-3 levels work best for most documents.
4. **Batch Mode**: Use batch processing for multiple files - it's more efficient.
5. **Logging**: Use file logging in production for better troubleshooting.

## 📊 What Makes This Special

- **Clean Architecture**: Built with modern TypeScript and dependency injection.
- **Advanced Logging**: File logging system with rotation and monitoring.
- **Robust Testing**: 60%+ test coverage with comprehensive test suite.
- **Error Recovery**: Smart error handling and recovery mechanisms.
- **Performance**: Optimized for both single files and batch processing.
- **User Experience**: Interactive CLI with guided workflows.

## 🤝 Contributing

We welcome contributions!

- **Report Issues**: Use GitHub Issues.
- **Submit PRs**: Pull requests are welcome.
- **Suggest Features**: Tell us what you need.

Please ensure:

- Follow TypeScript and ESLint standards.
- Include tests for new features.
- Update documentation as needed.

## 🙏 Built With

Thanks to these amazing open source projects:

- [Puppeteer](https://pptr.dev/) - High-quality PDF generation.
- [markdown-it](https://github.com/markdown-it/markdown-it) - Markdown parsing.
- [PlantUML](https://plantuml.com/) - Diagram generation and rendering.
- [Mermaid](https://mermaid.js.org/) - Modern diagramming and charting tool.
- [Commander.js](https://github.com/tj/commander.js/) - CLI framework.
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/) - Interactive prompts.
- [Jest](https://jestjs.io/) - Testing framework with comprehensive coverage.
