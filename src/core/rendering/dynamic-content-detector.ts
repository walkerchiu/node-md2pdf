/**
 * Dynamic Content Detector
 * Detects various types of dynamic content that require two-stage rendering
 */

export interface DynamicContentDetection {
  /** TOC enabled (with or without page numbers) */
  hasTOC: boolean;

  /** TOC with page numbers enabled */
  hasTOCWithPageNumbers: boolean;

  /** Images with relative paths or external URLs */
  hasDynamicImages: boolean;

  /** Dynamic diagrams (PlantUML, Mermaid) */
  hasDynamicDiagrams: boolean;

  /** Complex layouts that affect pagination */
  hasComplexLayouts: boolean;

  /** Header/footer enabled (affects margins) */
  hasHeaderFooter: boolean;

  /** Raw detection results for debugging */
  detectionDetails: {
    imageCount: number;
    headingCount: number;
    diagramTypes: string[];
    tableCount: number;
    codeBlockCount: number;
  };
}

export interface DynamicContentOptions {
  /** TOC configuration */
  toc?: {
    enabled?: boolean;
    includePageNumbers?: boolean;
  };

  /** Whether page numbers (header/footer) are enabled */
  includePageNumbers?: boolean;

  /** Two-stage rendering configuration */
  twoStageRendering?: {
    enabled?: boolean;
    forceAccuratePageNumbers?: boolean;
  };
}

export class DynamicContentDetector {
  /**
   * Detect all types of dynamic content in markdown
   */
  static detect(
    markdownContent: string,
    options: DynamicContentOptions = {},
  ): DynamicContentDetection {
    const detectionDetails = this.analyzeContent(markdownContent);

    return {
      hasTOC: this.detectTOC(detectionDetails, options),
      hasTOCWithPageNumbers: this.detectTOCWithPageNumbers(
        detectionDetails,
        options,
      ),
      hasDynamicImages: this.detectDynamicImages(detectionDetails),
      hasDynamicDiagrams: this.detectDynamicDiagrams(detectionDetails),
      hasComplexLayouts: this.detectComplexLayouts(detectionDetails),
      hasHeaderFooter: options.includePageNumbers || false,
      detectionDetails,
    };
  }

  /**
   * Determine if two-stage rendering should be used
   */
  static shouldUseTwoStageRendering(
    detection: DynamicContentDetection,
    options: DynamicContentOptions = {},
  ): boolean {
    // Force enable if explicitly configured
    if (options.twoStageRendering?.enabled === true) {
      return true;
    }

    // Force disable if explicitly configured
    if (options.twoStageRendering?.enabled === false) {
      return false;
    }

    // Auto-detection logic
    return this.autoDetectTwoStageNeed(detection, options);
  }

  /**
   * Auto-detect if two-stage rendering is needed
   */
  private static autoDetectTwoStageNeed(
    detection: DynamicContentDetection,
    options: DynamicContentOptions,
  ): boolean {
    // Always use two-stage rendering for any TOC
    if (detection.hasTOC || detection.hasTOCWithPageNumbers) {
      return true;
    }

    // Critical case: TOC with page numbers + header/footer
    // This combination always causes inaccurate page numbers due to margin changes
    if (detection.hasTOCWithPageNumbers && detection.hasHeaderFooter) {
      return true;
    }

    // High priority: Dynamic diagrams (future-proofing)
    if (detection.hasDynamicDiagrams) {
      return true;
    }

    // Medium priority: TOC with page numbers but no header/footer
    if (detection.hasTOCWithPageNumbers) {
      return options.twoStageRendering?.forceAccuratePageNumbers || false;
    }

    // Low priority: Complex layouts with many elements
    if (detection.hasComplexLayouts) {
      const { imageCount, tableCount, codeBlockCount } =
        detection.detectionDetails;
      const totalComplexElements = imageCount + tableCount + codeBlockCount;
      return totalComplexElements > 10; // Threshold for complex documents
    }

    return false;
  }

  /**
   * Analyze markdown content and extract detection details
   */
  private static analyzeContent(
    content: string,
  ): DynamicContentDetection['detectionDetails'] {
    const lines = content.split('\n');

    // Count various content types
    let imageCount = 0;
    let headingCount = 0;
    let tableCount = 0;
    let codeBlockCount = 0;
    const diagramTypes: string[] = [];

    let inCodeBlock = false;
    let codeBlockType = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Track code blocks
      if (trimmedLine.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockType = trimmedLine.substring(3).toLowerCase();
          codeBlockCount++;

          // Check for diagram types
          if (
            codeBlockType === 'mermaid' &&
            !diagramTypes.includes('mermaid')
          ) {
            diagramTypes.push('mermaid');
          }
          if (
            codeBlockType === 'plantuml' &&
            !diagramTypes.includes('plantuml')
          ) {
            diagramTypes.push('plantuml');
          }
        } else {
          inCodeBlock = false;
          codeBlockType = '';
        }
        continue;
      }

      // Skip content inside code blocks
      if (inCodeBlock) {
        continue;
      }

      // Count headings
      if (trimmedLine.match(/^#{1,6}\s/)) {
        headingCount++;
      }

      // Count images (markdown format)
      const imageMatches = trimmedLine.match(/!\[.*?\]\([^)]+\)/g);
      if (imageMatches) {
        imageCount += imageMatches.length;
      }

      // Count tables (detect table rows)
      if (trimmedLine.includes('|') && trimmedLine.split('|').length > 2) {
        tableCount++;
      }
    }

    // Also check for PlantUML in @startuml format
    if (content.includes('@startuml') && !diagramTypes.includes('plantuml')) {
      diagramTypes.push('plantuml');
    }

    return {
      imageCount,
      headingCount,
      diagramTypes,
      tableCount,
      codeBlockCount,
    };
  }

  /**
   * Detect if TOC is enabled (with or without page numbers)
   */
  private static detectTOC(
    details: DynamicContentDetection['detectionDetails'],
    options: DynamicContentOptions,
  ): boolean {
    // Must have headings to generate TOC
    if (details.headingCount === 0) {
      return false;
    }

    // Check if TOC is enabled
    return options.toc?.enabled === true; // Only true if explicitly enabled
  }

  /**
   * Detect if TOC with page numbers is enabled
   */
  private static detectTOCWithPageNumbers(
    details: DynamicContentDetection['detectionDetails'],
    options: DynamicContentOptions,
  ): boolean {
    // Must have headings to generate TOC
    if (details.headingCount === 0) {
      return false;
    }

    // Check if TOC is enabled
    const tocEnabled = options.toc?.enabled === true; // Only true if explicitly enabled

    // Check if page numbers are enabled in TOC
    const pageNumbersEnabled = options.toc?.includePageNumbers === true; // Only true if explicitly enabled

    return tocEnabled && pageNumbersEnabled;
  }

  /**
   * Detect dynamic images that may affect layout
   */
  private static detectDynamicImages(
    details: DynamicContentDetection['detectionDetails'],
  ): boolean {
    // Currently, we consider any images as potentially dynamic
    // Future enhancement: analyze image paths to detect relative/external URLs
    return details.imageCount > 0;
  }

  /**
   * Detect dynamic diagrams (PlantUML, Mermaid)
   */
  private static detectDynamicDiagrams(
    details: DynamicContentDetection['detectionDetails'],
  ): boolean {
    return details.diagramTypes.length > 0;
  }

  /**
   * Detect complex layouts that may affect pagination
   */
  private static detectComplexLayouts(
    details: DynamicContentDetection['detectionDetails'],
  ): boolean {
    const { imageCount, tableCount, codeBlockCount } = details;

    // Consider layout complex if it has multiple elements that can affect pagination
    const hasMultipleImages = imageCount > 3;
    const hasLargeTables = tableCount > 5;
    const hasMultipleCodeBlocks = codeBlockCount > 3;

    return hasMultipleImages || hasLargeTables || hasMultipleCodeBlocks;
  }

  /**
   * Get human-readable description of detected content
   */
  static getDetectionSummary(detection: DynamicContentDetection): string {
    const reasons: string[] = [];

    if (detection.hasTOCWithPageNumbers) {
      reasons.push('TOC with page numbers');
    }

    if (detection.hasHeaderFooter) {
      reasons.push('header/footer enabled');
    }

    if (detection.hasDynamicImages) {
      reasons.push(`${detection.detectionDetails.imageCount} images`);
    }

    if (detection.hasDynamicDiagrams) {
      const diagramTypes = detection.detectionDetails.diagramTypes.join(', ');
      reasons.push(`dynamic diagrams (${diagramTypes})`);
    }

    if (detection.hasComplexLayouts) {
      reasons.push('complex layouts');
    }

    if (reasons.length === 0) {
      return 'No dynamic content detected';
    }

    return `Dynamic content detected: ${reasons.join(', ')}`;
  }

  /**
   * Estimate performance impact of two-stage rendering
   */
  static estimatePerformanceImpact(detection: DynamicContentDetection): {
    timeIncrease: number; // Percentage increase in rendering time
    memoryIncrease: number; // Percentage increase in memory usage
    recommendation: 'low' | 'medium' | 'high'; // Priority for using two-stage
  } {
    let timeIncrease = 0;
    let memoryIncrease = 0;
    let priorityScore = 0;

    // Base overhead for two-stage rendering
    timeIncrease += 40; // 40% base increase

    // Additional overhead based on content
    if (detection.hasTOCWithPageNumbers) {
      timeIncrease += 20;
      priorityScore += 3;
    }

    if (detection.hasHeaderFooter) {
      priorityScore += 4; // High priority due to margin changes
    }

    if (detection.hasDynamicImages) {
      timeIncrease += detection.detectionDetails.imageCount * 5;
      memoryIncrease += detection.detectionDetails.imageCount * 10;
      priorityScore += 2;
    }

    if (detection.hasDynamicDiagrams) {
      timeIncrease += detection.detectionDetails.diagramTypes.length * 30;
      memoryIncrease += detection.detectionDetails.diagramTypes.length * 20;
      priorityScore += 5;
    }

    if (detection.hasComplexLayouts) {
      timeIncrease += 15;
      memoryIncrease += 10;
      priorityScore += 1;
    }

    // Determine recommendation based on priority score
    let recommendation: 'low' | 'medium' | 'high';
    if (priorityScore >= 7) {
      recommendation = 'high';
    } else if (priorityScore >= 4) {
      recommendation = 'medium';
    } else {
      recommendation = 'low';
    }

    return {
      timeIncrease: Math.min(timeIncrease, 200), // Cap at 200%
      memoryIncrease: Math.min(memoryIncrease, 150), // Cap at 150%
      recommendation,
    };
  }
}
