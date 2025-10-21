/**
 * Page structure types and interfaces
 */

export interface PageContext {
  pageNumber: number;
  totalPages: number;
  title: string;
  author?: string | undefined;
  date: string;
  fileName: string;
  chapterTitle?: string | undefined;
  sectionTitle?: string | undefined;
}

export interface HeaderConfig {
  enabled: boolean;
  template: string;
  height?: string;
  styles?: HeaderFooterStyles;
  showOnFirstPage?: boolean;
  showOnEvenPages?: boolean;
  showOnOddPages?: boolean;
}

export interface FooterConfig {
  enabled: boolean;
  template: string;
  height?: string;
  styles?: HeaderFooterStyles;
  showOnFirstPage?: boolean;
  showOnEvenPages?: boolean;
  showOnOddPages?: boolean;
}

export interface HeaderFooterStyles {
  // Typography
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: string;

  // Colors
  color?: string;
  backgroundColor?: string;
  background?: string; // For gradient/complex backgrounds

  // Spacing
  padding?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  margin?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;

  // Borders
  border?: string;
  borderTop?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRight?: string;
  borderRadius?: string;

  // Layout
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  width?: string;
  height?: string;

  // Effects
  boxShadow?: string;
  opacity?: string;

  // Custom CSS for advanced users
  customCSS?: string;
}

export interface PageStructureConfig {
  header?: HeaderConfig;
  footer?: FooterConfig;
  margins?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  // Future customization options
  theme?: 'minimal' | 'professional' | 'modern' | 'academic' | 'custom';
  author?: string;
  companyLogo?: string;
  watermark?: {
    enabled: boolean;
    text?: string;
    opacity?: number;
    position?: 'center' | 'corner';
  };
}

export interface TemplateVariable {
  name: string;
  value: string | number;
  formatter?: ((value: any) => string) | undefined;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RenderResult {
  html: string;
  css?: string;
  height?: number;
  warnings?: string[];
}

export type HeaderFooterPosition = 'header' | 'footer';

export interface PageStructurePreset {
  name: string;
  description: string;
  config: PageStructureConfig;
  category: 'business' | 'academic' | 'technical' | 'minimal';
}
