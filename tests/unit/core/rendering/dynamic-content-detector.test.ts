/**
 * Unit tests for DynamicContentDetector
 */

import { DynamicContentDetector } from '../../../../src/core/rendering/dynamic-content-detector';

describe('DynamicContentDetector', () => {
  describe('Detection Methods', () => {
    it('should detect TOC with page numbers', () => {
      const content = `
# Introduction
This is the introduction.

## Chapter 1
Content of chapter 1.

### Section 1.1
Subsection content.

## Chapter 2
Content of chapter 2.
      `;

      const detection = DynamicContentDetector.detect(content, {
        toc: { enabled: true, includePageNumbers: true },
        includePageNumbers: false,
      });

      expect(detection.hasTOCWithPageNumbers).toBe(true);
      expect(detection.detectionDetails.headingCount).toBe(4);
    });

    it('should detect dynamic images', () => {
      const content = `
# Document with Images
![Local image](./assets/image1.png)
![Remote image](https://example.com/image2.jpg)
      `;

      const detection = DynamicContentDetector.detect(content);
      expect(detection.hasDynamicImages).toBe(true);
      expect(detection.detectionDetails.imageCount).toBe(2);
    });

    it('should detect dynamic diagrams', () => {
      const content = `
# Document with Diagrams

\`\`\`mermaid
graph TD
  A --> B
  B --> C
\`\`\`

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
      `;

      const detection = DynamicContentDetector.detect(content);
      expect(detection.hasDynamicDiagrams).toBe(true);
      expect(detection.detectionDetails.diagramTypes).toEqual([
        'mermaid',
        'plantuml',
      ]);
    });

    it('should detect TOC content with header/footer', () => {
      const content = '# Title\n## Subtitle\nContent here.';

      const detection = DynamicContentDetector.detect(content, {
        toc: { enabled: true, includePageNumbers: true },
        includePageNumbers: true, // Header/footer enabled
      });

      expect(detection.hasTOC).toBe(true);
      expect(detection.hasHeaderFooter).toBe(true);
    });

    it('should detect no dynamic content for simple text', () => {
      const content = 'Simple text without any dynamic elements.';

      const detection = DynamicContentDetector.detect(content);

      expect(detection.hasTOC).toBe(false);
      expect(detection.hasDynamicImages).toBe(false);
      expect(detection.hasDynamicDiagrams).toBe(false);
      expect(detection.hasHeaderFooter).toBe(false);
    });
  });

  describe('Detection Details', () => {
    it('should provide accurate heading count', () => {
      const content = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
`;

      const detection = DynamicContentDetector.detect(content);
      expect(detection.detectionDetails.headingCount).toBe(6);
    });

    it('should count different image types', () => {
      const content = `
![Local](./local.png)
![Remote](https://example.com/remote.jpg)
![Data URI](data:image/png;base64,iVBORw0KGgo...)
`;

      const detection = DynamicContentDetector.detect(content);
      expect(detection.detectionDetails.imageCount).toBe(3);
    });

    it('should identify diagram types correctly', () => {
      const content = `
\`\`\`mermaid
graph TD
\`\`\`

\`\`\`plantuml
@startuml
@enduml
\`\`\`

\`\`\`javascript
console.log('not a diagram');
\`\`\`
`;

      const detection = DynamicContentDetector.detect(content);
      expect(detection.detectionDetails.diagramTypes).toEqual([
        'mermaid',
        'plantuml',
      ]);
      expect(detection.detectionDetails.diagramTypes).not.toContain(
        'javascript',
      );
    });
  });
});
