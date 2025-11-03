// Mock for inquirer ES module
const inquirer = {
  prompt: jest.fn(() => Promise.resolve({})),
  confirm: jest.fn(() => Promise.resolve(true)),
  input: jest.fn(() => Promise.resolve('')),
  list: jest.fn(() => Promise.resolve('')),
  checkbox: jest.fn(() => Promise.resolve([])),
  expand: jest.fn(() => Promise.resolve('')),
  editor: jest.fn(() => Promise.resolve('')),
  password: jest.fn(() => Promise.resolve('')),
  rawlist: jest.fn(() => Promise.resolve('')),
};

// Mock default export and named exports
inquirer.default = inquirer;
module.exports = inquirer;
