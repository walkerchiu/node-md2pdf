/**
 * Mock for chalk module to avoid ES module issues in Jest
 */

const chalk = {
  // Color functions that return the input as-is
  red: (text) => text,
  green: (text) => text,
  yellow: (text) => text,
  blue: (text) => text,
  magenta: (text) => text,
  cyan: (text) => text,
  white: (text) => text,
  gray: (text) => text,
  grey: (text) => text,
  black: (text) => text,

  // Style functions
  bold: (text) => text,
  dim: (text) => text,
  italic: (text) => text,
  underline: (text) => text,
  strikethrough: (text) => text,

  // Background colors
  bgRed: (text) => text,
  bgGreen: (text) => text,
  bgYellow: (text) => text,
  bgBlue: (text) => text,
  bgMagenta: (text) => text,
  bgCyan: (text) => text,
  bgWhite: (text) => text,
  bgBlack: (text) => text,
};

// Make all functions chainable
Object.keys(chalk).forEach((key) => {
  const fn = chalk[key];
  chalk[key] = (text) => {
    const result = fn(text);
    // Return an object with all chalk methods for chaining
    return Object.assign(result, chalk);
  };
});

module.exports = chalk;
