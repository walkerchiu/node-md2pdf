/**
 * Utility for calculating PDF margins and page dimensions
 *
 * Handles conversion between different units (cm, mm, in, px, pt)
 * and calculates effective page dimensions considering headers/footers
 */

export type MarginUnit = 'cm' | 'mm' | 'in' | 'px' | 'pt';

export interface MarginConfig {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface PageDimensions {
  width: number; // in pixels
  height: number; // in pixels
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  effectiveWidth: number; // width minus horizontal margins
  effectiveHeight: number; // height minus vertical margins
}

export interface HeaderFooterDimensions {
  headerHeight: number; // in pixels
  footerHeight: number; // in pixels
  totalVerticalSpace: number; // header + footer combined
}

/**
 * Standard page sizes in pixels at 96 DPI
 */
export const PAGE_SIZES = {
  A4: { width: 794, height: 1123 },
  A3: { width: 1123, height: 1587 },
  A5: { width: 559, height: 794 },
  Letter: { width: 816, height: 1056 },
  Legal: { width: 816, height: 1344 },
} as const;

export type PageSize = keyof typeof PAGE_SIZES;

/**
 * DPI constants for conversions
 */
const DPI = 96; // Standard screen DPI
const POINTS_PER_INCH = 72; // PostScript points

/**
 * Parse margin string and convert to pixels
 *
 * @param margin - Margin value (e.g., "2cm", "1in", "20px")
 * @returns Margin value in pixels
 */
export function parseMarginToPixels(margin: string): number {
  const trimmed = margin.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i);

  if (!match) {
    // If no unit, assume pixels
    const value = parseFloat(trimmed);
    return isNaN(value) ? 0 : value;
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase() as MarginUnit;

  switch (unit) {
    case 'cm':
      return Math.round((value * DPI) / 2.54);
    case 'mm':
      return Math.round((value * DPI) / 25.4);
    case 'in':
      return Math.round(value * DPI);
    case 'pt':
      return Math.round((value * DPI) / POINTS_PER_INCH);
    case 'px':
      return Math.round(value);
    default:
      console.warn(`Unknown margin unit: ${unit}, treating as pixels`);
      return Math.round(value);
  }
}

/**
 * Calculate page dimensions including margins
 *
 * @param pageSize - Page size name or custom dimensions
 * @param margins - Margin configuration
 * @returns Calculated page dimensions in pixels
 */
export function calculatePageDimensions(
  pageSize: PageSize | { width: number; height: number } = 'A4',
  margins: MarginConfig = {},
): PageDimensions {
  // Get base page dimensions
  const baseDimensions =
    typeof pageSize === 'string' ? PAGE_SIZES[pageSize] : pageSize;

  // Parse margins with defaults
  const marginTop = parseMarginToPixels(margins.top || '2cm');
  const marginRight = parseMarginToPixels(margins.right || '2cm');
  const marginBottom = parseMarginToPixels(margins.bottom || '2cm');
  const marginLeft = parseMarginToPixels(margins.left || '2cm');

  // Calculate effective dimensions
  const effectiveWidth = baseDimensions.width - marginLeft - marginRight;
  const effectiveHeight = baseDimensions.height - marginTop - marginBottom;

  return {
    width: baseDimensions.width,
    height: baseDimensions.height,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    effectiveWidth: Math.max(0, effectiveWidth),
    effectiveHeight: Math.max(0, effectiveHeight),
  };
}

/**
 * Estimate header and footer dimensions based on configuration
 *
 * @param hasPageNumbers - Whether page numbers are enabled
 * @param customHeaderHeight - Custom header height override (in pixels or string with unit)
 * @param customFooterHeight - Custom footer height override (in pixels or string with unit)
 * @returns Header and footer dimensions
 */
export function calculateHeaderFooterDimensions(
  hasPageNumbers: boolean = false,
  customHeaderHeight?: number | string,
  customFooterHeight?: number | string,
): HeaderFooterDimensions {
  // Default header/footer heights based on typical CSS @page configurations
  // These can be overridden if custom templates are used
  const defaultHeaderHeight = hasPageNumbers ? parseMarginToPixels('1cm') : 0;
  const defaultFooterHeight = hasPageNumbers ? parseMarginToPixels('1cm') : 0;

  // Parse custom heights if provided
  const headerHeight =
    customHeaderHeight !== undefined
      ? typeof customHeaderHeight === 'number'
        ? customHeaderHeight
        : parseMarginToPixels(customHeaderHeight)
      : defaultHeaderHeight;

  const footerHeight =
    customFooterHeight !== undefined
      ? typeof customFooterHeight === 'number'
        ? customFooterHeight
        : parseMarginToPixels(customFooterHeight)
      : defaultFooterHeight;

  return {
    headerHeight,
    footerHeight,
    totalVerticalSpace: headerHeight + footerHeight,
  };
}

/**
 * Calculate effective content height considering all spacing
 *
 * @param pageSize - Page size
 * @param margins - Page margins
 * @param hasPageNumbers - Whether headers/footers are enabled
 * @param customHeaderHeight - Custom header height
 * @param customFooterHeight - Custom footer height
 * @returns Effective height available for content
 */
export function calculateEffectiveContentHeight(
  pageSize: PageSize | { width: number; height: number } = 'A4',
  margins: MarginConfig = {},
  hasPageNumbers: boolean = false,
  customHeaderHeight?: number,
  customFooterHeight?: number,
): number {
  const pageDims = calculatePageDimensions(pageSize, margins);
  const headerFooterDims = calculateHeaderFooterDimensions(
    hasPageNumbers,
    customHeaderHeight,
    customFooterHeight,
  );

  // Effective height = page height - top margin - bottom margin - header - footer
  return Math.max(
    0,
    pageDims.effectiveHeight - headerFooterDims.totalVerticalSpace,
  );
}

/**
 * Calculate page number from absolute position
 *
 * @param absoluteTop - Absolute top position in pixels
 * @param pageSize - Page size
 * @param margins - Page margins
 * @param hasPageNumbers - Whether headers/footers are enabled
 * @returns Page number (1-indexed)
 */
export function calculatePageNumber(
  absoluteTop: number,
  pageSize: PageSize | { width: number; height: number } = 'A4',
  margins: MarginConfig = {},
  hasPageNumbers: boolean = false,
): number {
  const pageDims = calculatePageDimensions(pageSize, margins);
  const headerFooterDims = calculateHeaderFooterDimensions(hasPageNumbers);

  // Calculate effective top margin (including header space)
  const effectiveMarginTop = pageDims.marginTop + headerFooterDims.headerHeight;

  // Calculate page height for content
  const contentPageHeight =
    pageDims.height -
    pageDims.marginTop -
    pageDims.marginBottom -
    headerFooterDims.totalVerticalSpace;

  // Calculate relative position within content area
  const relativeTop = Math.max(0, absoluteTop - effectiveMarginTop);

  // Calculate page number
  const pageNumber = Math.floor(relativeTop / contentPageHeight) + 1;

  return Math.max(1, pageNumber);
}

/**
 * Calculate total page count from content height
 *
 * @param totalContentHeight - Total height of content in pixels
 * @param pageSize - Page size
 * @param margins - Page margins
 * @param hasPageNumbers - Whether headers/footers are enabled
 * @returns Total number of pages
 */
export function calculateTotalPages(
  totalContentHeight: number,
  pageSize: PageSize | { width: number; height: number } = 'A4',
  margins: MarginConfig = {},
  hasPageNumbers: boolean = false,
): number {
  const effectiveHeight = calculateEffectiveContentHeight(
    pageSize,
    margins,
    hasPageNumbers,
  );

  if (effectiveHeight <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalContentHeight / effectiveHeight));
}

/**
 * Convert pixels to specified unit
 */
export function pixelsToUnit(pixels: number, unit: MarginUnit): number {
  switch (unit) {
    case 'cm':
      return (pixels * 2.54) / DPI;
    case 'mm':
      return (pixels * 25.4) / DPI;
    case 'in':
      return pixels / DPI;
    case 'pt':
      return (pixels * POINTS_PER_INCH) / DPI;
    case 'px':
      return pixels;
    default:
      return pixels;
  }
}

/**
 * Format pixels as margin string
 */
export function formatMargin(pixels: number, unit: MarginUnit = 'px'): string {
  const value = pixelsToUnit(pixels, unit);
  return `${value.toFixed(2)}${unit}`;
}

/**
 * Extract margins from various config sources with fallback priority:
 * 1. Explicit margins in config
 * 2. Header/footer margins if enabled
 * 3. Default margins
 */
export function getEffectiveMargins(
  explicitMargins?: MarginConfig,
  hasHeaderFooter: boolean = false,
): MarginConfig {
  // If explicit margins provided, use them
  if (explicitMargins) {
    return {
      top: explicitMargins.top || '2cm',
      right: explicitMargins.right || '2cm',
      bottom: explicitMargins.bottom || '2cm',
      left: explicitMargins.left || '2cm',
    };
  }

  // If header/footer enabled, use larger margins
  if (hasHeaderFooter) {
    return {
      top: '3cm', // Base margin + header space
      right: '2cm',
      bottom: '3cm', // Base margin + footer space
      left: '2cm',
    };
  }

  // Default margins
  return {
    top: '2cm',
    right: '2cm',
    bottom: '2cm',
    left: '2cm',
  };
}
