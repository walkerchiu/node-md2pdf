/**
 * Shared utility for generating consistent heading IDs
 *
 * This centralizes the heading ID generation logic to ensure consistency
 * across all parts of the system (TOC, anchors, bookmarks, etc.)
 */

export interface HeadingIdOptions {
  /** Preserve case instead of lowercasing */
  preserveCase?: boolean;
  /** Custom separator instead of hyphen */
  separator?: string;
  /** Maximum ID length */
  maxLength?: number;
}

export class HeadingIdGenerator {
  private usedIds: Set<string> = new Set();

  /**
   * Create a unique heading ID from text
   *
   * @param text - The heading text
   * @param options - ID generation options
   * @returns A unique, URL-safe heading ID
   */
  createHeadingId(text: string, options: HeadingIdOptions = {}): string {
    const { preserveCase = false, separator = '-', maxLength = 100 } = options;

    // Basic sanitization
    let id = text.trim();

    // Convert to lowercase unless preserveCase is true
    if (!preserveCase) {
      id = id.toLowerCase();
    }

    // Remove special characters, keep: Chinese, letters, numbers, spaces, hyphens
    id = id.replace(/[^\u4e00-\u9fff\w\s-]/g, '');

    // Replace spaces and underscores with separator
    id = id.replace(/[\s_]+/g, separator);

    // Remove leading/trailing separators
    id = id.replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');

    // Replace multiple separators with single separator
    id = id.replace(new RegExp(`${separator}+`, 'g'), separator);

    // Truncate if too long (but keep it at a word boundary if possible)
    if (id.length > maxLength) {
      const truncated = id.substring(0, maxLength);
      const lastSeparator = truncated.lastIndexOf(separator);
      id =
        lastSeparator > maxLength * 0.7
          ? truncated.substring(0, lastSeparator)
          : truncated;
    }

    // Ensure uniqueness
    return this.ensureUnique(id);
  }

  /**
   * Ensure the ID is unique by adding a counter suffix if needed
   */
  private ensureUnique(baseId: string): string {
    if (!this.usedIds.has(baseId)) {
      this.usedIds.add(baseId);
      return baseId;
    }

    let counter = 1;
    let uniqueId = `${baseId}-${counter}`;

    while (this.usedIds.has(uniqueId)) {
      counter++;
      uniqueId = `${baseId}-${counter}`;
    }

    this.usedIds.add(uniqueId);
    return uniqueId;
  }

  /**
   * Check if an ID has been used
   */
  hasId(id: string): boolean {
    return this.usedIds.has(id);
  }

  /**
   * Register an existing ID (useful when processing existing IDs)
   */
  registerId(id: string): void {
    this.usedIds.add(id);
  }

  /**
   * Clear all registered IDs
   */
  reset(): void {
    this.usedIds.clear();
  }

  /**
   * Get all registered IDs
   */
  getRegisteredIds(): string[] {
    return Array.from(this.usedIds);
  }

  /**
   * Get count of registered IDs
   */
  getIdCount(): number {
    return this.usedIds.size;
  }
}

/**
 * Create a stateless heading ID (without uniqueness tracking)
 * Use this when you don't need to track uniqueness across multiple calls
 */
export function createSimpleHeadingId(
  text: string,
  options: HeadingIdOptions = {},
): string {
  const { preserveCase = false, separator = '-', maxLength = 100 } = options;

  let id = text.trim();

  if (!preserveCase) {
    id = id.toLowerCase();
  }

  id = id.replace(/[^\u4e00-\u9fff\w\s-]/g, '');
  id = id.replace(/[\s_]+/g, separator);
  id = id.replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
  id = id.replace(new RegExp(`${separator}+`, 'g'), separator);

  if (id.length > maxLength) {
    const truncated = id.substring(0, maxLength);
    const lastSeparator = truncated.lastIndexOf(separator);
    id =
      lastSeparator > maxLength * 0.7
        ? truncated.substring(0, lastSeparator)
        : truncated;
  }

  return id;
}

/**
 * Validate if a string is a valid heading ID
 */
export function isValidHeadingId(id: string): boolean {
  if (!id || id.trim() !== id) {
    return false; // Empty or has leading/trailing whitespace
  }

  // Check if it only contains valid characters
  const validPattern = /^[\u4e00-\u9fff\w-]+$/;
  if (!validPattern.test(id)) {
    return false;
  }

  // Check if it doesn't start or end with separator
  if (id.startsWith('-') || id.endsWith('-')) {
    return false;
  }

  // Check for consecutive separators
  if (id.includes('--')) {
    return false;
  }

  return true;
}
