// Mock for ora ES module
const createMockSpinner = () => ({
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  clear: jest.fn().mockReturnThis(),
  render: jest.fn().mockReturnThis(),
  frame: jest.fn().mockReturnValue('⠋'),
  text: '',
  color: 'cyan',
  prefixText: '',
  suffixText: '',
  spinner: 'dots',
  isSpinning: false,
  interval: 80,
});

const ora = jest.fn((options) => {
  const spinner = createMockSpinner();
  if (typeof options === 'string') {
    spinner.text = options;
  } else if (typeof options === 'object') {
    Object.assign(spinner, options);
  }
  return spinner;
});

// Add static properties
ora.promise = jest.fn((action, options) => {
  const spinner = createMockSpinner();
  return Promise.resolve(action).finally(() => spinner);
});

// Mock default export and named exports
ora.default = ora;
module.exports = ora;
