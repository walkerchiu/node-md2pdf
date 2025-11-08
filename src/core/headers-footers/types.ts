/**
 * Header and footer configuration types and interfaces
 */

// Content display options
export type TitleDisplayMode = 'none' | 'metadata' | 'custom';
export type PageNumberDisplayMode = 'none' | 'show';
export type DateTimeDisplayMode =
  | 'none'
  | 'date-short' // 2024/12/25
  | 'date-long' // 2024年12月25日 / December 25, 2024
  | 'date-iso' // 2024-12-25
  | 'datetime-short' // 2024/12/25 14:30
  | 'datetime-long' // 2024年12月25日 14:30:45 / December 25, 2024 2:30:45 PM
  | 'metadata-creation' // Use metadata.creationDate
  | 'metadata-modification'; // Use metadata.modDate
export type CopyrightDisplayMode = 'none' | 'custom' | 'metadata';
export type MessageDisplayMode = 'none' | 'custom';

// New metadata-specific display modes
export type AuthorDisplayMode = 'none' | 'metadata' | 'custom';
export type OrganizationDisplayMode = 'none' | 'metadata' | 'custom';
export type VersionDisplayMode = 'none' | 'metadata' | 'custom';
export type CategoryDisplayMode = 'none' | 'metadata' | 'custom';

// Alignment options
export type ContentAlignment = 'left' | 'center' | 'right';

// Individual content configuration
export interface ContentConfig {
  mode:
    | TitleDisplayMode
    | PageNumberDisplayMode
    | DateTimeDisplayMode
    | CopyrightDisplayMode
    | MessageDisplayMode;
  customValue?: string;
  alignment?: ContentAlignment;
  enabled: boolean;
}

// Specific content type configurations
export interface TitleConfig extends Omit<ContentConfig, 'mode'> {
  mode: TitleDisplayMode;
}

export interface PageNumberConfig extends Omit<ContentConfig, 'mode'> {
  mode: PageNumberDisplayMode;
  // 移除 format 選項，直接使用現有的國際化數字格式
}

export interface DateTimeConfig extends Omit<ContentConfig, 'mode'> {
  mode: DateTimeDisplayMode;
}

export interface CopyrightConfig extends Omit<ContentConfig, 'mode'> {
  mode: CopyrightDisplayMode;
}

export interface MessageConfig extends Omit<ContentConfig, 'mode'> {
  mode: MessageDisplayMode;
}

// New metadata-based content configurations
export interface AuthorConfig extends Omit<ContentConfig, 'mode'> {
  mode: AuthorDisplayMode;
}

export interface OrganizationConfig extends Omit<ContentConfig, 'mode'> {
  mode: OrganizationDisplayMode;
}

export interface VersionConfig extends Omit<ContentConfig, 'mode'> {
  mode: VersionDisplayMode;
}

export interface CategoryConfig extends Omit<ContentConfig, 'mode'> {
  mode: CategoryDisplayMode;
}

// Position and layout
export interface PositionConfig {
  left?: ContentConfig;
  center?: ContentConfig;
  right?: ContentConfig;
}

// Header configuration
export interface HeaderConfig {
  enabled: boolean;
  title: TitleConfig;
  pageNumber: PageNumberConfig;
  dateTime: DateTimeConfig;
  copyright: CopyrightConfig;
  message: MessageConfig;
  // New metadata-based fields
  author: AuthorConfig;
  organization: OrganizationConfig;
  version: VersionConfig;
  category: CategoryConfig;
  layout: PositionConfig;
  style?: HeaderFooterStyleConfig;
}

// Footer configuration
export interface FooterConfig {
  enabled: boolean;
  title: TitleConfig;
  pageNumber: PageNumberConfig;
  dateTime: DateTimeConfig;
  copyright: CopyrightConfig;
  message: MessageConfig;
  // New metadata-based fields
  author: AuthorConfig;
  organization: OrganizationConfig;
  version: VersionConfig;
  category: CategoryConfig;
  layout: PositionConfig;
  style?: HeaderFooterStyleConfig;
}

// Style configuration for headers/footers
export interface HeaderFooterStyleConfig {
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderTop?: string;
  borderBottom?: string;
  padding?: string;
  margin?: string;
  height?: string;
}

// Complete headers and footers configuration
export interface HeadersFootersConfig {
  header: HeaderConfig;
  footer: FooterConfig;
  globalStyle?: HeaderFooterStyleConfig;
}

// Default configurations based on user requirements
export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  enabled: true,
  title: {
    mode: 'metadata', // Use metadata title by default (falls back to auto if not available)
    enabled: true,
    alignment: 'left',
  },
  pageNumber: {
    mode: 'none', // No page numbers in header (default)
    enabled: false,
    alignment: 'center',
  },
  dateTime: {
    mode: 'none', // No date/time in header (default)
    enabled: false,
    alignment: 'right',
  },
  copyright: {
    mode: 'none', // No copyright in header (default)
    enabled: false,
    alignment: 'center',
  },
  message: {
    mode: 'none', // No message in header (default)
    enabled: false,
    alignment: 'center',
  },
  // New metadata-based fields (disabled by default)
  author: {
    mode: 'none',
    enabled: false,
    alignment: 'right',
  },
  organization: {
    mode: 'none',
    enabled: false,
    alignment: 'center',
  },
  version: {
    mode: 'none',
    enabled: false,
    alignment: 'right',
  },
  category: {
    mode: 'none',
    enabled: false,
    alignment: 'center',
  },
  layout: {
    left: {
      mode: 'metadata', // Updated to use metadata
      enabled: true,
      alignment: 'left',
    },
  },
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  enabled: true,
  title: {
    mode: 'none', // No title in footer (default)
    enabled: false,
    alignment: 'left',
  },
  pageNumber: {
    mode: 'show', // Show page numbers in footer (default)
    enabled: true,
    alignment: 'right',
  },
  dateTime: {
    mode: 'none', // No date/time in footer (default)
    enabled: false,
    alignment: 'center',
  },
  copyright: {
    mode: 'none', // No copyright in footer (default)
    enabled: false,
    alignment: 'center',
  },
  message: {
    mode: 'none', // No message in footer (default)
    enabled: false,
    alignment: 'center',
  },
  // New metadata-based fields (disabled by default)
  author: {
    mode: 'none',
    enabled: false,
    alignment: 'left',
  },
  organization: {
    mode: 'none',
    enabled: false,
    alignment: 'center',
  },
  version: {
    mode: 'none',
    enabled: false,
    alignment: 'left',
  },
  category: {
    mode: 'none',
    enabled: false,
    alignment: 'center',
  },
  layout: {
    right: {
      mode: 'show',
      enabled: true,
      alignment: 'right',
    },
  },
};

export const DEFAULT_HEADERS_FOOTERS_CONFIG: HeadersFootersConfig = {
  header: DEFAULT_HEADER_CONFIG,
  footer: DEFAULT_FOOTER_CONFIG,
  globalStyle: {
    fontSize: '10px',
    fontFamily: 'inherit',
    color: '#666',
    padding: '0.5em 1em',
    margin: '0',
    height: 'auto',
  },
};

// Runtime context for generating headers/footers
export interface HeaderFooterContext {
  documentTitle?: string;
  firstH1Title?: string;
  pageNumber: number;
  totalPages: number;
  currentDate: Date;
  copyright?: string;
  customMessage?: string;
  // Metadata context - import DocumentMetadata type when needed
  metadata?: import('../metadata/types').DocumentMetadata;
}

// Generated header/footer content
export interface GeneratedHeaderFooter {
  left?: string;
  center?: string;
  right?: string;
  html: string;
}
