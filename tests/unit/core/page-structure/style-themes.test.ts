/**
 * Style Themes Test Suite
 * Tests predefined themes and theme management functionality
 */

import {
  STYLE_THEMES,
  getAvailableThemes,
  getTheme,
  getThemeOptions,
  applyThemeStyles,
  mergeStyles,
  StyleTheme,
} from '../../../../src/core/page-structure/style-themes';
import type { HeaderFooterStyles } from '../../../../src/core/page-structure/types';

describe('Style Themes', () => {
  describe('STYLE_THEMES constant', () => {
    it('should contain all expected predefined themes', () => {
      expect(STYLE_THEMES).toBeDefined();
      expect(typeof STYLE_THEMES).toBe('object');

      // Check for expected theme names
      expect(STYLE_THEMES.minimal).toBeDefined();
      expect(STYLE_THEMES.professional).toBeDefined();
      expect(STYLE_THEMES.modern).toBeDefined();
      expect(STYLE_THEMES.academic).toBeDefined();
    });

    it('should have valid minimal theme structure', () => {
      const minimal = STYLE_THEMES.minimal;

      expect(minimal.name).toBe('minimal');
      expect(minimal.displayName).toBe('Simple Minimal');
      expect(minimal.description).toBeTruthy();
      expect(minimal.headerStyles).toBeDefined();
      expect(minimal.footerStyles).toBeDefined();

      // Check specific styling properties
      expect(minimal.headerStyles.fontSize).toBe('11px');
      expect(minimal.headerStyles.color).toBe('#666666');
      expect(minimal.headerStyles.textAlign).toBe('center');
      expect(minimal.footerStyles.fontSize).toBe('10px');
    });

    it('should have valid professional theme structure', () => {
      const professional = STYLE_THEMES.professional;

      expect(professional.name).toBe('professional');
      expect(professional.displayName).toBe('Business Professional');
      expect(professional.description).toBeTruthy();
      expect(professional.headerStyles).toBeDefined();
      expect(professional.footerStyles).toBeDefined();

      // Check professional styling features
      expect(professional.headerStyles.borderBottom).toBe('1px solid #e8e8e8');
      expect(professional.headerStyles.background).toContain(
        'rgba(248, 248, 248, 0.8)',
      );
      expect(professional.footerStyles.borderTop).toBe('1px solid #e8e8e8');
    });

    it('should have valid modern theme structure', () => {
      const modern = STYLE_THEMES.modern;

      expect(modern.name).toBe('modern');
      expect(modern.displayName).toBe('Modern Design');
      expect(modern.description).toBeTruthy();
      expect(modern.headerStyles).toBeDefined();
      expect(modern.footerStyles).toBeDefined();

      // Check modern styling features
      expect(modern.headerStyles.fontWeight).toBe('500');
      expect(modern.headerStyles.background).toContain('linear-gradient');
      expect(modern.headerStyles.boxShadow).toContain('rgba(0, 0, 0, 0.1)');
      expect(modern.headerStyles.fontFamily).toContain('Inter');
    });

    it('should have valid academic theme structure', () => {
      const academic = STYLE_THEMES.academic;

      expect(academic.name).toBe('academic');
      expect(academic.displayName).toBe('Academic Paper');
      expect(academic.description).toBeTruthy();
      expect(academic.headerStyles).toBeDefined();
      expect(academic.footerStyles).toBeDefined();

      // Check academic styling features
      expect(academic.headerStyles.fontFamily).toContain('Times New Roman');
      expect(academic.headerStyles.borderBottom).toBe('2px solid #333333');
      expect(academic.headerStyles.fontWeight).toBe('bold');
      expect(academic.footerStyles.borderTop).toBe('1px solid #333333');
    });

    it('should have consistent theme interface structure', () => {
      Object.values(STYLE_THEMES).forEach((theme: StyleTheme) => {
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('displayName');
        expect(theme).toHaveProperty('description');
        expect(theme).toHaveProperty('headerStyles');
        expect(theme).toHaveProperty('footerStyles');

        expect(typeof theme.name).toBe('string');
        expect(typeof theme.displayName).toBe('string');
        expect(typeof theme.description).toBe('string');
        expect(typeof theme.headerStyles).toBe('object');
        expect(typeof theme.footerStyles).toBe('object');
      });
    });
  });

  describe('getAvailableThemes', () => {
    it('should return all theme names', () => {
      const themes = getAvailableThemes();

      expect(Array.isArray(themes)).toBe(true);
      expect(themes).toContain('minimal');
      expect(themes).toContain('professional');
      expect(themes).toContain('modern');
      expect(themes).toContain('academic');
      expect(themes.length).toBe(4);
    });

    it('should return theme names as strings', () => {
      const themes = getAvailableThemes();

      themes.forEach((themeName) => {
        expect(typeof themeName).toBe('string');
        expect(themeName.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTheme', () => {
    it('should return theme for valid theme name', () => {
      const theme = getTheme('minimal');

      expect(theme).toBeDefined();
      expect(theme?.name).toBe('minimal');
      expect(theme?.displayName).toBe('Simple Minimal');
    });

    it('should return undefined for invalid theme name', () => {
      const theme = getTheme('nonexistent');

      expect(theme).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const theme = getTheme('');

      expect(theme).toBeUndefined();
    });

    it('should handle case sensitivity', () => {
      const theme = getTheme('MINIMAL');

      expect(theme).toBeUndefined();
    });

    it('should return correct theme objects for all valid themes', () => {
      const themeNames = getAvailableThemes();

      themeNames.forEach((themeName) => {
        const theme = getTheme(themeName);
        expect(theme).toBeDefined();
        expect(theme?.name).toBe(themeName);
      });
    });
  });

  describe('getThemeOptions', () => {
    it('should return properly formatted theme options', () => {
      const options = getThemeOptions();

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(4);

      options.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('description');
        expect(typeof option.value).toBe('string');
        expect(typeof option.name).toBe('string');
        expect(typeof option.description).toBe('string');
      });
    });

    it('should map theme properties correctly', () => {
      const options = getThemeOptions();
      const minimalOption = options.find((opt) => opt.value === 'minimal');

      expect(minimalOption).toBeDefined();
      expect(minimalOption?.name).toBe('Simple Minimal');
      expect(minimalOption?.description).toBe(
        'Clean and simple design with minimal decoration',
      );
    });

    it('should include all themes in options', () => {
      const options = getThemeOptions();
      const optionValues = options.map((opt) => opt.value);

      expect(optionValues).toContain('minimal');
      expect(optionValues).toContain('professional');
      expect(optionValues).toContain('modern');
      expect(optionValues).toContain('academic');
    });
  });

  describe('applyThemeStyles', () => {
    it('should return styles for valid theme', () => {
      const styles = applyThemeStyles('minimal');

      expect(styles).toBeDefined();
      expect(styles).toHaveProperty('headerStyles');
      expect(styles).toHaveProperty('footerStyles');
      expect(typeof styles?.headerStyles).toBe('object');
      expect(typeof styles?.footerStyles).toBe('object');
    });

    it('should return null for invalid theme', () => {
      const styles = applyThemeStyles('nonexistent');

      expect(styles).toBeNull();
    });

    it('should return null for empty string', () => {
      const styles = applyThemeStyles('');

      expect(styles).toBeNull();
    });

    it('should return deep copies of theme styles', () => {
      const styles = applyThemeStyles('minimal');
      const originalTheme = STYLE_THEMES.minimal;

      expect(styles?.headerStyles).not.toBe(originalTheme.headerStyles);
      expect(styles?.footerStyles).not.toBe(originalTheme.footerStyles);
      expect(styles?.headerStyles).toEqual(originalTheme.headerStyles);
      expect(styles?.footerStyles).toEqual(originalTheme.footerStyles);
    });

    it('should handle all available themes', () => {
      const themeNames = getAvailableThemes();

      themeNames.forEach((themeName) => {
        const styles = applyThemeStyles(themeName);
        expect(styles).toBeDefined();
        expect(styles?.headerStyles).toBeDefined();
        expect(styles?.footerStyles).toBeDefined();
      });
    });

    it('should preserve original theme styles when returning copies', () => {
      const originalHeaderStyles = {
        ...STYLE_THEMES.professional.headerStyles,
      };
      const styles = applyThemeStyles('professional');

      // Modify the returned styles
      if (styles?.headerStyles) {
        styles.headerStyles.fontSize = '999px';
      }

      // Original should remain unchanged
      expect(STYLE_THEMES.professional.headerStyles).toEqual(
        originalHeaderStyles,
      );
    });
  });

  describe('mergeStyles', () => {
    it('should merge custom styles with base styles', () => {
      const baseStyles: HeaderFooterStyles = {
        fontSize: '12px',
        color: '#333333',
        textAlign: 'center',
      };

      const customStyles: Partial<HeaderFooterStyles> = {
        fontSize: '16px',
        fontWeight: 'bold',
      };

      const merged = mergeStyles(baseStyles, customStyles);

      expect(merged.fontSize).toBe('16px'); // overridden
      expect(merged.color).toBe('#333333'); // preserved
      expect(merged.textAlign).toBe('center'); // preserved
      expect(merged.fontWeight).toBe('bold'); // added
    });

    it('should handle empty custom styles', () => {
      const baseStyles: HeaderFooterStyles = {
        fontSize: '12px',
        color: '#333333',
      };

      const merged = mergeStyles(baseStyles, {});

      expect(merged).toEqual(baseStyles);
      expect(merged).not.toBe(baseStyles); // should be new object
    });

    it('should override all base properties with custom ones', () => {
      const baseStyles: HeaderFooterStyles = {
        fontSize: '12px',
        color: '#333333',
        textAlign: 'center',
      };

      const customStyles: Partial<HeaderFooterStyles> = {
        fontSize: '16px',
        color: '#ff0000',
        textAlign: 'left',
        fontWeight: 'bold',
      };

      const merged = mergeStyles(baseStyles, customStyles);

      expect(merged).toEqual({
        fontSize: '16px',
        color: '#ff0000',
        textAlign: 'left',
        fontWeight: 'bold',
      });
    });

    it('should handle partial custom styles', () => {
      const baseStyles: HeaderFooterStyles = {
        fontSize: '12px',
        color: '#333333',
      };

      const customStyles: Partial<HeaderFooterStyles> = {
        fontWeight: 'bold',
      };

      const merged = mergeStyles(baseStyles, customStyles);

      expect(merged.fontSize).toBe('12px'); // preserved from base
      expect(merged.color).toBe('#333333');
      expect(merged.fontWeight).toBe('bold');
    });

    it('should preserve base styles object', () => {
      const baseStyles: HeaderFooterStyles = {
        fontSize: '12px',
        color: '#333333',
      };

      const originalBase = { ...baseStyles };
      const customStyles: Partial<HeaderFooterStyles> = {
        fontSize: '16px',
      };

      mergeStyles(baseStyles, customStyles);

      expect(baseStyles).toEqual(originalBase);
    });
  });

  describe('Theme Integration', () => {
    it('should work with real theme application workflow', () => {
      // Get available themes
      const themes = getAvailableThemes();
      expect(themes.length).toBeGreaterThan(0);

      // Select a theme
      const selectedTheme = themes[0];
      const themeStyles = applyThemeStyles(selectedTheme);
      expect(themeStyles).toBeDefined();

      // Apply custom modifications
      const customHeaderStyles = mergeStyles(themeStyles!.headerStyles, {
        fontSize: '14px',
        color: '#000000',
      });

      expect(customHeaderStyles.fontSize).toBe('14px');
      expect(customHeaderStyles.color).toBe('#000000');
      // Other properties should be preserved from theme
      expect(customHeaderStyles.textAlign).toBe(
        themeStyles!.headerStyles.textAlign,
      );
    });

    it('should handle theme options for UI rendering', () => {
      const options = getThemeOptions();

      // Should be suitable for inquirer.js choices
      options.forEach((option) => {
        expect(option.value).toBeTruthy();
        expect(option.name).toBeTruthy();
        expect(option.description).toBeTruthy();
      });

      // Should have unique values
      const values = options.map((opt) => opt.value);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });
  });
});
