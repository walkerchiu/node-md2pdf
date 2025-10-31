import { execSync, spawn } from 'child_process';
import { join } from 'path';

import {
  DynamicContentType,
  ProcessingContext,
} from '../../../../../src/core/rendering/types';
import { PlantUMLProcessor } from '../../../../../src/core/rendering/processors/plantuml-processor';

// Mock modules
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test-png-content')),
    unlink: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('child_process');
jest.mock('path');

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PlantUMLProcessor', () => {
  let processor: PlantUMLProcessor;
  const mockFs = require('fs');
  const mockExecSync = execSync as jest.Mock;
  const mockSpawn = spawn as jest.Mock;
  const mockPath = {
    join: join as jest.Mock,
  };

  beforeEach(() => {
    processor = new PlantUMLProcessor();
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockFs.promises.writeFile.mockReset();
    mockFs.promises.readFile.mockReset();
    mockFs.promises.unlink.mockReset();
    mockExecSync.mockReset();
    mockSpawn.mockReset();
    mockPath.join.mockReset();

    // Default mocks
    mockFs.promises.readFile.mockResolvedValue(Buffer.from('test-png-content'));
    mockFs.promises.writeFile.mockResolvedValue(undefined);
    mockFs.promises.unlink.mockResolvedValue(undefined);
    mockExecSync.mockReturnValue('');
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Default fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
    });
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = processor.getConfig();

      expect(config.serverUrl).toBe('https://www.plantuml.com/plantuml');
      expect(config.format).toBe('png');
      expect(config.defaultWidth).toBe(800);
      expect(config.defaultHeight).toBe(600);
      expect(config.timeout).toBe(10000);
      expect(config.enableCaching).toBe(true);
    });

    it('should accept partial configuration updates', () => {
      const partialConfig = {
        timeout: 15000,
      };

      processor.updateConfig(partialConfig);
      const config = processor.getConfig();

      expect(config.timeout).toBe(15000);
      expect(config.serverUrl).toBe('https://www.plantuml.com/plantuml');
      expect(config.format).toBe('png');
    });
  });

  describe('Content Processing', () => {
    const testContent = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
    `;

    const testContext: ProcessingContext = {
      filePath: '/test/file.md',
      isPreRendering: false,
    };

    it('should process PlantUML content successfully', async () => {
      const result = await processor.process(testContent, testContext);

      expect(result.html).toContain('<div class="plantuml-diagram">');
      expect(result.html).toContain(
        '<img src="https://www.plantuml.com/plantuml/png/',
      );
      expect(result.html).toContain('style="max-width: 100%; height: auto;"');
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.warnings).toEqual([]);
    });

    it('should handle HTTP errors from PlantUML server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await processor.process(testContent, testContext);

      expect(result.metadata.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('HTTP 500: Internal Server Error'),
        ]),
      );
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await processor.process(testContent, testContext);

      expect(result.metadata.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Network timeout')]),
      );
    });
  });

  describe('Local Rendering', () => {
    const localProcessor = new PlantUMLProcessor({
      useLocalRenderer: true,
      localRenderer: {
        useCommand: true,
        commandPath: '/usr/local/bin/plantuml',
      },
    });

    const testContent = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
    `;

    const testContext: ProcessingContext = {
      filePath: '/test/file.md',
      isPreRendering: false,
    };

    it('should handle successful local rendering', async () => {
      const mockPngContent = Buffer.from('mock-png-data');
      mockFs.promises.readFile.mockResolvedValue(mockPngContent);
      mockFs.promises.writeFile.mockResolvedValue(undefined);
      mockFs.promises.unlink.mockResolvedValue(undefined);

      // Mock spawn to simulate successful command execution
      const mockChildProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10); // Simulate successful exit
          }
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChildProcess);

      const result = await localProcessor.process(testContent, testContext);

      expect(result.html).toContain('<div class="plantuml-diagram">');
      expect(result.html).toContain('style="max-width: 100%; height: auto;"');
      expect(result.metadata.type).toBe(DynamicContentType.PLANTUML);
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });

    it('should fallback to remote rendering on local failure', async () => {
      // Mock spawn to simulate command failure
      const mockChildProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Simulate failed exit
          }
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChildProcess);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const result = await localProcessor.process(testContent, testContext);

      // When local rendering fails, it falls back to remote rendering successfully
      // So there should be no warnings in the metadata, but the result should use remote rendering
      expect(result.metadata.warnings).toEqual([]);
      expect(result.html).toContain('https://www.plantuml.com/plantuml/png/');
    });
  });

  describe('Caching', () => {
    it('should use cache when enabled', async () => {
      // Create a simple mock cache
      const mockCache = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        has: jest.fn().mockResolvedValue(false),
        delete: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
        size: jest.fn().mockResolvedValue(0),
      };

      const cachedProcessor = new PlantUMLProcessor({
        enableCaching: true,
        cache: {
          enabled: true,
          maxAge: 3600000,
          maxSize: 100,
        },
      });

      // Manually set the cache
      (cachedProcessor as any).cache = mockCache;

      const testContent = `
\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const testContext: ProcessingContext = {
        filePath: '/test/file.md',
        isPreRendering: false,
      };

      // First call - should trigger cache miss
      const firstResult = await cachedProcessor.process(
        testContent,
        testContext,
      );

      // Mock cache hit for second call
      mockCache.get.mockResolvedValueOnce(firstResult);

      // Second call should use cache
      const result = await cachedProcessor.process(testContent, testContext);

      expect(firstResult.metadata.cacheHits).toBe(0);
      expect(firstResult.metadata.cacheMisses).toBe(1);
      expect(result.metadata.cacheHits).toBe(1);
      expect(result.metadata.cacheMisses).toBe(0);
    });
  });
});
