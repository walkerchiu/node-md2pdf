# 📄 MD2PDF

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

**A professional Markdown to PDF converter with smart features**

Transform your Markdown documents into beautiful PDFs with automatic table of contents, Chinese language support, and intelligent settings recommendations!

## ✨ Key Features

🤖 **Smart Conversion** - AI-powered settings recommendations with 3-step workflow.<br/>
📄 **Single File** - Quick conversion of individual Markdown files.<br/>
📚 **Batch Processing** - Process multiple files at once efficiently.<br/>
🎨 **Customization** - Adjust styling, covers, headers, and footers.<br/>
🔧 **Settings** - Save preferences for future use.<br/>
📑 **Auto TOC** - Generate clickable table of contents from headings.

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

- Adjust page size and margins.
- Choose different style themes.
- Custom covers and headers/footers.
- Watermarks and security settings.

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
# Testing
npm test              # Fast unit tests (~4 seconds)
npm run test:all      # Full test suite (~3 minutes)
npm run test:coverage # Coverage reports

# Code Quality
npm run lint          # Code linting
npm run format        # Code formatting
npm run clean         # Clean build files
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

## 🎯 Best Practices

1. **File Size**: Keep files under 10MB for best performance.
2. **Images**: Use relative paths for image references.
3. **TOC Settings**: 2-3 levels work best for most documents.
4. **Batch Mode**: Use batch processing for multiple files - it's more efficient.

## 📊 What Makes This Special

- **Clean Architecture**: Built with modern TypeScript and dependency injection.
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
- [Commander.js](https://github.com/tj/commander.js/) - CLI framework.
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/) - Interactive prompts.
