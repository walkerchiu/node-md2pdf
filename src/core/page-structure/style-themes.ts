/**
 * Style Themes for Header/Footer Customization
 * Provides predefined themes and utilities for future user customization
 */

import type { HeaderFooterStyles } from './types';

export interface StyleTheme {
  name: string;
  displayName: string;
  description: string;
  headerStyles: HeaderFooterStyles;
  footerStyles: HeaderFooterStyles;
}

/**
 * Predefined style themes for different document types
 */
export const STYLE_THEMES: Record<string, StyleTheme> = {
  minimal: {
    name: 'minimal',
    displayName: 'Simple Minimal',
    description: 'Clean and simple design with minimal decoration',
    headerStyles: {
      fontSize: '11px',
      color: '#666666',
      textAlign: 'center',
      padding: '6px 0',
    },
    footerStyles: {
      fontSize: '10px',
      color: '#666666',
      textAlign: 'center',
      padding: '6px 0',
    },
  },

  professional: {
    name: 'professional',
    displayName: 'Business Professional',
    description: 'Professional look with subtle borders and background',
    headerStyles: {
      fontSize: '12px',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      color: '#333333',
      textAlign: 'center',
      padding: '8px 0',
      borderBottom: '1px solid #e8e8e8',
      background: 'rgba(248, 248, 248, 0.8)',
    },
    footerStyles: {
      fontSize: '11px',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      color: '#666666',
      textAlign: 'center',
      padding: '8px 0',
      borderTop: '1px solid #e8e8e8',
      background: 'rgba(248, 248, 248, 0.8)',
    },
  },

  modern: {
    name: 'modern',
    displayName: 'Modern Design',
    description:
      'Contemporary design with subtle shadows and modern typography',
    headerStyles: {
      fontSize: '12px',
      fontFamily:
        '"Inter", "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif',
      fontWeight: '500',
      color: '#2d3748',
      textAlign: 'center',
      padding: '10px 0',
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    footerStyles: {
      fontSize: '10px',
      fontFamily:
        '"Inter", "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif',
      color: '#718096',
      textAlign: 'center',
      padding: '8px 0',
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      borderTop: '1px solid #e2e8f0',
    },
  },

  academic: {
    name: 'academic',
    displayName: 'Academic Paper',
    description:
      'Traditional academic style with serif fonts and formal layout',
    headerStyles: {
      fontSize: '11px',
      fontFamily: '"Times New Roman", "Songti SC", serif',
      color: '#333333',
      textAlign: 'center',
      padding: '12px 0 8px 0',
      borderBottom: '2px solid #333333',
      fontWeight: 'bold',
    },
    footerStyles: {
      fontSize: '10px',
      fontFamily: '"Times New Roman", "Songti SC", serif',
      color: '#333333',
      textAlign: 'center',
      padding: '8px 0 12px 0',
      borderTop: '1px solid #333333',
    },
  },
};

/**
 * Get all available theme names
 */
export function getAvailableThemes(): string[] {
  return Object.keys(STYLE_THEMES);
}

/**
 * Get theme by name
 */
export function getTheme(themeName: string): StyleTheme | undefined {
  return STYLE_THEMES[themeName];
}

/**
 * Get theme display names for UI
 */
export function getThemeOptions(): Array<{
  value: string;
  name: string;
  description: string;
}> {
  return Object.values(STYLE_THEMES).map((theme) => ({
    value: theme.name,
    name: theme.displayName,
    description: theme.description,
  }));
}

/**
 * Apply theme to page structure config
 */
export function applyThemeStyles(themeName: string): {
  headerStyles: HeaderFooterStyles;
  footerStyles: HeaderFooterStyles;
} | null {
  const theme = getTheme(themeName);
  if (!theme) return null;

  return {
    headerStyles: { ...theme.headerStyles },
    footerStyles: { ...theme.footerStyles },
  };
}

/**
 * Merge custom styles with theme styles
 */
export function mergeStyles(
  baseStyles: HeaderFooterStyles,
  customStyles: Partial<HeaderFooterStyles>,
): HeaderFooterStyles {
  return {
    ...baseStyles,
    ...customStyles,
  };
}
