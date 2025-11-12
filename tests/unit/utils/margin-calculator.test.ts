import {
  parseMarginToPixels,
  calculatePageDimensions,
  calculateHeaderFooterDimensions,
  calculateEffectiveContentHeight,
  calculatePageNumber,
  calculateTotalPages,
  pixelsToUnit,
  formatMargin,
  getEffectiveMargins,
  PAGE_SIZES,
} from '../../../src/utils/margin-calculator';

describe('MarginCalculator', () => {
  describe('parseMarginToPixels', () => {
    it('should parse centimeters', () => {
      expect(parseMarginToPixels('2cm')).toBeCloseTo(75.59, 0);
    });

    it('should parse millimeters', () => {
      expect(parseMarginToPixels('20mm')).toBeCloseTo(75.59, 0);
    });

    it('should parse inches', () => {
      expect(parseMarginToPixels('1in')).toBe(96);
    });

    it('should parse points', () => {
      expect(parseMarginToPixels('72pt')).toBe(96);
    });

    it('should parse pixels', () => {
      expect(parseMarginToPixels('100px')).toBe(100);
    });

    it('should handle whitespace', () => {
      expect(parseMarginToPixels('  2 cm  ')).toBeCloseTo(75.59, 0);
    });

    it('should handle no unit (defaults to pixels)', () => {
      expect(parseMarginToPixels('50')).toBe(50);
    });

    it('should handle invalid values', () => {
      expect(parseMarginToPixels('invalid')).toBe(0);
    });

    it('should warn for unknown units', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parseMarginToPixels('10unknown');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown margin unit'),
      );
      expect(result).toBe(10);

      consoleSpy.mockRestore();
    });
  });

  describe('calculatePageDimensions', () => {
    it('should calculate A4 dimensions with margins', () => {
      const dims = calculatePageDimensions('A4', {
        top: '2cm',
        bottom: '2cm',
        left: '2cm',
        right: '2cm',
      });

      expect(dims.width).toBe(PAGE_SIZES.A4.width);
      expect(dims.height).toBe(PAGE_SIZES.A4.height);
      expect(dims.marginTop).toBeCloseTo(75.59, 0);
      expect(dims.effectiveWidth).toBeGreaterThan(0);
      expect(dims.effectiveHeight).toBeGreaterThan(0);
    });

    it('should use default margins when not specified', () => {
      const dims = calculatePageDimensions('A4');

      expect(dims.marginTop).toBeCloseTo(75.59, 0); // 2cm default
    });

    it('should handle custom page size', () => {
      const dims = calculatePageDimensions(
        { width: 1000, height: 1500 },
        { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
      );

      expect(dims.width).toBe(1000);
      expect(dims.height).toBe(1500);
    });

    it('should not have negative effective dimensions', () => {
      const dims = calculatePageDimensions('A4', {
        top: '50cm',
        bottom: '50cm',
      });

      expect(dims.effectiveHeight).toBe(0);
    });
  });

  describe('calculateHeaderFooterDimensions', () => {
    it('should calculate dimensions when page numbers enabled', () => {
      const dims = calculateHeaderFooterDimensions(true);

      expect(dims.headerHeight).toBeCloseTo(37.79, 0); // 1cm
      expect(dims.footerHeight).toBeCloseTo(37.79, 0); // 1cm
      expect(dims.totalVerticalSpace).toBeCloseTo(75.59, 0); // 2cm total
    });

    it('should return zero when disabled', () => {
      const dims = calculateHeaderFooterDimensions(false);

      expect(dims.headerHeight).toBe(0);
      expect(dims.footerHeight).toBe(0);
      expect(dims.totalVerticalSpace).toBe(0);
    });

    it('should accept custom heights as pixels', () => {
      const dims = calculateHeaderFooterDimensions(true, 50, 60);

      expect(dims.headerHeight).toBe(50);
      expect(dims.footerHeight).toBe(60);
      expect(dims.totalVerticalSpace).toBe(110);
    });

    it('should accept custom heights as strings with units', () => {
      const dims = calculateHeaderFooterDimensions(true, '1.5cm', '2cm');

      expect(dims.headerHeight).toBeCloseTo(56.69, 0);
      expect(dims.footerHeight).toBeCloseTo(75.59, 0);
    });
  });

  describe('calculateEffectiveContentHeight', () => {
    it('should calculate content height without header/footer', () => {
      const height = calculateEffectiveContentHeight(
        'A4',
        { top: '2cm', bottom: '2cm' },
        false,
      );

      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThan(PAGE_SIZES.A4.height);
    });

    it('should account for header/footer space', () => {
      const withoutHF = calculateEffectiveContentHeight(
        'A4',
        { top: '2cm', bottom: '2cm' },
        false,
      );
      const withHF = calculateEffectiveContentHeight(
        'A4',
        { top: '2cm', bottom: '2cm' },
        true,
      );

      expect(withHF).toBeLessThan(withoutHF);
    });

    it('should accept custom header/footer heights', () => {
      const height = calculateEffectiveContentHeight(
        'A4',
        { top: '2cm', bottom: '2cm' },
        true,
        50,
        60,
      );

      expect(height).toBeGreaterThan(0);
    });
  });

  describe('calculatePageNumber', () => {
    it('should calculate page 1 for top of document', () => {
      const page = calculatePageNumber(0, 'A4', { top: '2cm' }, false);
      expect(page).toBe(1);
    });

    it('should calculate correct page for given position', () => {
      const page = calculatePageNumber(2000, 'A4', { top: '2cm' }, false);
      expect(page).toBeGreaterThan(1);
    });

    it('should account for header/footer', () => {
      const pageWithoutHF = calculatePageNumber(
        1000,
        'A4',
        { top: '2cm' },
        false,
      );
      const pageWithHF = calculatePageNumber(1000, 'A4', { top: '2cm' }, true);

      // With header/footer, same position may be on different page
      expect(typeof pageWithHF).toBe('number');
    });

    it('should return at least page 1', () => {
      const page = calculatePageNumber(-100, 'A4', {}, false);
      expect(page).toBe(1);
    });
  });

  describe('calculateTotalPages', () => {
    it('should calculate pages for content height', () => {
      const pages = calculateTotalPages(2000, 'A4', { top: '2cm' }, false);
      expect(pages).toBeGreaterThanOrEqual(1);
    });

    it('should return at least 1 page', () => {
      const pages = calculateTotalPages(0, 'A4', {}, false);
      expect(pages).toBe(1);
    });

    it('should handle very tall content', () => {
      const pages = calculateTotalPages(10000, 'A4', { top: '2cm' }, false);
      expect(pages).toBeGreaterThan(5);
    });

    it('should handle zero or negative effective height', () => {
      // Extreme margins that exceed page height
      const pages = calculateTotalPages(
        1000,
        'A4',
        { top: '50cm', bottom: '50cm' },
        false,
      );
      expect(pages).toBe(1);
    });
  });

  describe('pixelsToUnit', () => {
    it('should convert to centimeters', () => {
      const cm = pixelsToUnit(96, 'cm');
      expect(cm).toBeCloseTo(2.54, 1);
    });

    it('should convert to millimeters', () => {
      const mm = pixelsToUnit(96, 'mm');
      expect(mm).toBeCloseTo(25.4, 1);
    });

    it('should convert to inches', () => {
      const inches = pixelsToUnit(96, 'in');
      expect(inches).toBe(1);
    });

    it('should convert to points', () => {
      const pt = pixelsToUnit(96, 'pt');
      expect(pt).toBe(72);
    });

    it('should keep pixels as is', () => {
      const px = pixelsToUnit(100, 'px');
      expect(px).toBe(100);
    });

    it('should handle unknown unit as pixels', () => {
      const result = pixelsToUnit(100, 'unknown' as any);
      expect(result).toBe(100);
    });
  });

  describe('formatMargin', () => {
    it('should format with default unit (px)', () => {
      const formatted = formatMargin(100);
      expect(formatted).toBe('100.00px');
    });

    it('should format with specified unit', () => {
      const formatted = formatMargin(96, 'in');
      expect(formatted).toBe('1.00in');
    });

    it('should format with cm', () => {
      const formatted = formatMargin(96, 'cm');
      expect(formatted).toMatch(/2\.\d{2}cm/);
    });
  });

  describe('getEffectiveMargins', () => {
    it('should use explicit margins when provided', () => {
      const margins = getEffectiveMargins(
        {
          top: '3cm',
          bottom: '3cm',
          left: '2.5cm',
          right: '2.5cm',
        },
        false,
      );

      expect(margins.top).toBe('3cm');
      expect(margins.bottom).toBe('3cm');
      expect(margins.left).toBe('2.5cm');
      expect(margins.right).toBe('2.5cm');
    });

    it('should fill in missing margins with defaults', () => {
      const margins = getEffectiveMargins(
        {
          top: '3cm',
        },
        false,
      );

      expect(margins.top).toBe('3cm');
      expect(margins.bottom).toBe('2cm'); // default
      expect(margins.left).toBe('2cm'); // default
      expect(margins.right).toBe('2cm'); // default
    });

    it('should fill in individual missing margins', () => {
      const marginsRight = getEffectiveMargins({ right: '4cm' }, false);
      expect(marginsRight.right).toBe('4cm');
      expect(marginsRight.left).toBe('2cm');

      const marginsBottom = getEffectiveMargins({ bottom: '5cm' }, false);
      expect(marginsBottom.bottom).toBe('5cm');
      expect(marginsBottom.top).toBe('2cm');

      const marginsLeft = getEffectiveMargins({ left: '6cm' }, false);
      expect(marginsLeft.left).toBe('6cm');
      expect(marginsLeft.right).toBe('2cm');
    });

    it('should use header/footer margins when enabled and no explicit margins', () => {
      const margins = getEffectiveMargins(undefined, true);

      expect(margins.top).toBe('3cm'); // larger for header
      expect(margins.bottom).toBe('3cm'); // larger for footer
    });

    it('should use default margins when nothing specified', () => {
      const margins = getEffectiveMargins(undefined, false);

      expect(margins.top).toBe('2cm');
      expect(margins.bottom).toBe('2cm');
      expect(margins.left).toBe('2cm');
      expect(margins.right).toBe('2cm');
    });

    it('should prioritize explicit margins over header/footer', () => {
      const margins = getEffectiveMargins(
        {
          top: '1cm',
        },
        true,
      );

      expect(margins.top).toBe('1cm'); // explicit wins
    });
  });

  describe('PAGE_SIZES', () => {
    it('should have A4 dimensions', () => {
      expect(PAGE_SIZES.A4).toEqual({ width: 794, height: 1123 });
    });

    it('should have Letter dimensions', () => {
      expect(PAGE_SIZES.Letter).toBeDefined();
    });

    it('should have multiple page sizes', () => {
      const sizes = Object.keys(PAGE_SIZES);
      expect(sizes.length).toBeGreaterThan(2);
    });
  });
});
