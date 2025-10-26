/**
 * Unit tests for rendering module exports
 */

import * as RenderingModule from '../../../../src/core/rendering';

describe('Rendering Module', () => {
  describe('Exports', () => {
    it('should export TwoStageRenderingEngine', () => {
      expect(RenderingModule.TwoStageRenderingEngine).toBeDefined();
      expect(typeof RenderingModule.TwoStageRenderingEngine).toBe('function');
    });

    it('should export DynamicContentDetector', () => {
      expect(RenderingModule.DynamicContentDetector).toBeDefined();
      expect(typeof RenderingModule.DynamicContentDetector).toBe('function');
    });

    it('should export utility functions', () => {
      expect(RenderingModule.createTwoStageEngine).toBeDefined();
      expect(typeof RenderingModule.createTwoStageEngine).toBe('function');

      expect(RenderingModule.createDefaultProcessingContext).toBeDefined();
      expect(typeof RenderingModule.createDefaultProcessingContext).toBe(
        'function',
      );

      expect(RenderingModule.estimateRenderingPerformance).toBeDefined();
      expect(typeof RenderingModule.estimateRenderingPerformance).toBe(
        'function',
      );
    });

    it('should export types and interfaces', () => {
      // These are TypeScript types, so we can't test them at runtime
      // but we can ensure they don't cause import errors
      expect(() => {
        // Import types to ensure they exist
        const _importTypes = async () => {
          const types = await import('../../../../src/core/rendering/types');
          const interfaces = await import(
            '../../../../src/core/rendering/interfaces'
          );
          return { types, interfaces };
        };
        _importTypes();
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should create a functional two-stage engine', () => {
      const engine = RenderingModule.createTwoStageEngine({
        enabled: true,
        forceAccuratePageNumbers: false,
      });

      expect(engine).toBeDefined();
      expect(typeof engine.render).toBe('function');
      expect(typeof engine.validateEnvironment).toBe('function');
      expect(typeof engine.getOptions).toBe('function');
      expect(typeof engine.updateOptions).toBe('function');
    });

    it('should create a default processing context', () => {
      const context =
        RenderingModule.createDefaultProcessingContext('/test/input.md');

      expect(context).toBeDefined();
      expect(context.filePath).toBe('/test/input.md');
      expect(context.isPreRendering).toBe(false);
      expect(context.tocOptions).toBeDefined();
    });

    it('should detect dynamic content', () => {
      const content = `
# Test Document

![Image](./image.png)

\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`
`;

      const detection = RenderingModule.DynamicContentDetector.detect(content);

      expect(detection).toBeDefined();
      expect(detection.hasDynamicImages).toBe(true);
      expect(detection.hasDynamicDiagrams).toBe(true);
    });
  });
});
