/**
 * Template Management Types
 * Defines core data structures for the template management system
 */

/**
 * Template category types
 */
export type TemplateCategory =
  | 'quick'
  | 'professional'
  | 'technical'
  | 'academic'
  | 'custom';

/**
 * Template type: system (built-in) or custom (user-created)
 */
export type TemplateType = 'system' | 'custom';

/**
 * Template metadata
 */
export interface TemplateMetadata {
  version: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  category?: TemplateCategory;
}

/**
 * Margin configuration
 */
export interface MarginConfig {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

/**
 * Header configuration
 */
export interface HeaderConfig {
  enabled: boolean;
  content?: string;
  height?: string;
  style?: string;
}

/**
 * Footer configuration
 */
export interface FooterConfig {
  enabled: boolean;
  content?: string;
  height?: string;
  style?: string;
}

/**
 * Font configuration
 */
export interface FontConfig {
  body?: string;
  heading?: string;
  code?: string;
}

/**
 * Color scheme configuration
 */
export interface ColorScheme {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

/**
 * Code block style configuration
 */
export interface CodeBlockStyle {
  theme?: string;
  /**
   * @deprecated Line numbers are now automatically enabled for all code blocks
   * with a specified language (except 'text'/'plaintext' or no language).
   * This field is kept for backward compatibility but has no effect.
   */
  lineNumbers?: boolean;
  highlightLines?: number[];
}

/**
 * Document metadata configuration
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  language?: string;
  creator?: string;
  producer?: string;
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  pdf: {
    format: string;
    orientation: 'portrait' | 'landscape';
    margin: MarginConfig;
    displayHeaderFooter: boolean;
  };

  headerFooter: {
    header: HeaderConfig;
    footer: FooterConfig;
  };

  styles: {
    theme: string;
    fonts: FontConfig;
    colors: ColorScheme;
    codeBlock: CodeBlockStyle;
  };

  features: {
    toc: boolean;
    tocDepth: number;
    pageNumbers: boolean;
    anchorLinks: boolean;
    anchorDepth: number;
  };

  metadata?: DocumentMetadata;
}

/**
 * Complete template definition
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  metadata: TemplateMetadata;
  config: TemplateConfig;
}

/**
 * Template without ID (for creation)
 */
export type TemplateInput = Omit<Template, 'id'>;

/**
 * Template collection
 */
export interface TemplateCollection {
  system: Template[];
  custom: Template[];
}

/**
 * Template filter options
 */
export interface TemplateFilter {
  type?: TemplateType;
  category?: TemplateCategory;
  tags?: string[];
  searchTerm?: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Config validation result
 */
export interface ConfigValidationResult extends ValidationResult {
  warnings: ValidationError[];
}

/**
 * Template storage options
 */
export interface TemplateStorageOptions {
  basePath?: string;
  systemTemplatesPath?: string;
  customTemplatesPath?: string;
}
