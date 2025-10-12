/**
 * Unit tests for cli/batch/index.ts
 */

// Mock dependencies that cause ES module issues
jest.mock('chalk', () => ({
  default: {
    cyan: jest.fn((text: string) => text),
    green: jest.fn((text: string) => text),
    red: jest.fn((text: string) => text),
    yellow: jest.fn((text: string) => text),
    gray: jest.fn((text: string) => text),
    white: jest.fn((text: string) => text),
    bold: jest.fn((text: string) => text),
  },
}));

jest.mock('ora', () =>
  jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    text: '',
  })),
);

describe('cli/batch/index', () => {
  describe('module exports', () => {
    it('should export BatchInteractiveMode', async () => {
      const batchModule = await import('../../../../src/cli/batch/index');
      expect(batchModule.BatchInteractiveMode).toBeDefined();
      expect(typeof batchModule.BatchInteractiveMode).toBe('function');
    });

    it('should export BatchProgressUI', async () => {
      const batchModule = await import('../../../../src/cli/batch/index');
      expect(batchModule.BatchProgressUI).toBeDefined();
      expect(typeof batchModule.BatchProgressUI).toBe('function');
    });

    it('should re-export both batch classes correctly', async () => {
      const batchModule = await import('../../../../src/cli/batch/index');
      const { BatchInteractiveMode: DirectBatchInteractive } = await import(
        '../../../../src/cli/batch/batch-interactive'
      );
      const { BatchProgressUI: DirectBatchProgressUI } = await import(
        '../../../../src/cli/batch/batch-progress-ui'
      );

      expect(batchModule.BatchInteractiveMode).toBe(DirectBatchInteractive);
      expect(batchModule.BatchProgressUI).toBe(DirectBatchProgressUI);
    });

    it('should not export any unexpected properties', async () => {
      const batchModule = await import('../../../../src/cli/batch/index');
      const expectedExports = ['BatchInteractiveMode', 'BatchProgressUI'];
      const actualExports = Object.keys(batchModule);

      expect(actualExports.sort()).toEqual(expectedExports.sort());
    });
  });

  describe('module structure', () => {
    it('should be able to import the module successfully', async () => {
      await expect(
        import('../../../../src/cli/batch/index'),
      ).resolves.toBeDefined();
    });

    it('should have proper TypeScript module declaration', async () => {
      const batchModule = await import('../../../../src/cli/batch/index');
      expect(typeof batchModule).toBe('object');
      expect(batchModule).not.toBeNull();
      expect(Object.keys(batchModule).length).toBeGreaterThan(0);
    });
  });

  describe('functional verification', () => {
    it('should allow creation of BatchProgressUI instances', async () => {
      const { BatchProgressUI } = await import(
        '../../../../src/cli/batch/index'
      );

      expect(() => new BatchProgressUI()).not.toThrow();
      const instance = new BatchProgressUI();
      expect(instance).toBeInstanceOf(BatchProgressUI);
    });

    it('should have BatchProgressUI with expected methods', async () => {
      const { BatchProgressUI } = await import(
        '../../../../src/cli/batch/index'
      );

      const instance = new BatchProgressUI();

      // Check that instances have expected method structure
      expect(typeof instance.start).toBe('function');
      expect(typeof instance.stop).toBe('function');
      expect(typeof instance.updateProgress).toBe('function');
      expect(typeof instance.displayResults).toBe('function');
    });

    it('should have BatchInteractiveMode class constructor requirements', async () => {
      const { BatchInteractiveMode } = await import(
        '../../../../src/cli/batch/index'
      );

      // Verify constructor expects one parameter (ServiceContainer)
      expect(BatchInteractiveMode.length).toBe(1);
      expect(BatchInteractiveMode.name).toBe('BatchInteractiveMode');
    });

    it('should verify class prototypes have expected methods', async () => {
      const { BatchInteractiveMode, BatchProgressUI } = await import(
        '../../../../src/cli/batch/index'
      );

      // Check BatchInteractiveMode prototype
      expect(typeof BatchInteractiveMode.prototype.start).toBe('function');

      // Check BatchProgressUI prototype
      expect(typeof BatchProgressUI.prototype.start).toBe('function');
      expect(typeof BatchProgressUI.prototype.stop).toBe('function');
      expect(typeof BatchProgressUI.prototype.updateProgress).toBe('function');
    });
  });
});
