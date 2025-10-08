/**
 * Smart Defaults System Types
 * Content analysis and configuration recommendation types
 */

export interface ContentAnalysis {
  fileSize: number;
  wordCount: number;
  headingStructure: HeadingAnalysis;
  contentComplexity: ContentComplexity;
  languageDetection: LanguageInfo;
  mediaElements: MediaElementsInfo;
  codeBlocks: CodeBlockInfo[];
  tables: TableInfo[];
  links: LinkInfo;
  estimatedPages: number;
  readingTime: number; // in minutes
}

export interface HeadingAnalysis {
  totalHeadings: number;
  maxDepth: number;
  structure: HeadingLevel[];
  hasNumberedHeadings: boolean;
  averageHeadingLength: number;
}

export interface HeadingLevel {
  level: number;
  count: number;
  titles: string[];
}

export interface ContentComplexity {
  score: number; // 1-10 scale
  factors: ComplexityFactor[];
  documentType: DocumentType;
  recommendedTocDepth: number;
}

export interface ComplexityFactor {
  type:
    | 'code-heavy'
    | 'table-heavy'
    | 'media-rich'
    | 'technical'
    | 'academic'
    | 'business';
  weight: number;
  description: string;
}

export interface LanguageInfo {
  primary: 'zh-TW' | 'zh-CN' | 'en' | 'mixed';
  confidence: number;
  chineseCharacterRatio: number;
  needsChineseSupport: boolean;
  detectedLanguages: DetectedLanguage[];
}

export interface DetectedLanguage {
  language: string;
  percentage: number;
}

export interface MediaElementsInfo {
  images: number;
  hasLargeImages: boolean;
  hasDiagrams: boolean;
  estimatedImageSize: number; // in KB
}

export interface CodeBlockInfo {
  language: string;
  lineCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface TableInfo {
  columns: number;
  rows: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface LinkInfo {
  internal: number;
  external: number;
  hasFootnotes: boolean;
}

export type DocumentType =
  | 'technical-manual'
  | 'academic-paper'
  | 'business-report'
  | 'documentation'
  | 'tutorial'
  | 'article'
  | 'book'
  | 'notes'
  | 'presentation'
  | 'mixed';

export interface RecommendedConfig {
  format: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: MarginConfig;
  tocConfig: RecommendedTocConfig;
  theme: string;
  fonts: FontRecommendation;
  pageStructure: PageStructureConfig;
  optimization: OptimizationConfig;
  confidence: number; // 0-1 scale
  reasoning: ConfigReasoning[];
}

export interface MarginConfig {
  top: string;
  right: string;
  bottom: string;
  left: string;
  reasoning: string;
}

export interface RecommendedTocConfig {
  enabled: boolean;
  maxDepth: number;
  includePageNumbers: boolean;
  style: 'simple' | 'detailed' | 'hierarchical';
  title: string;
  reasoning: string;
}

export interface FontRecommendation {
  enableChineseSupport: boolean;
  primaryFont: string;
  fallbackFonts: string[];
  codeFont: string;
  headingFont: string;
  reasoning: string;
}

export interface PageStructureConfig {
  includeCover: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  headerContent?: string;
  footerContent?: string;
  reasoning: string;
}

export interface OptimizationConfig {
  enableCompression: boolean;
  imageOptimization: boolean;
  fontSubsetting: boolean;
  estimatedProcessingTime: number; // in seconds
  memoryUsage: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface ConfigReasoning {
  setting: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

export interface QuickConfig {
  name: string;
  description: string;
  config: Partial<RecommendedConfig>;
  useCase: string;
  estimatedTime: number; // in seconds
}

export interface SmartDefaultsOptions {
  analysisDepth: 'quick' | 'standard' | 'thorough';
  userPreferences?: Partial<RecommendedConfig>;
  previousConfigs?: RecommendedConfig[];
  learningMode: boolean;
}

export interface ContentInsights {
  documentTypeConfidence: number;
  suggestedImprovements: string[];
  potentialIssues: PotentialIssue[];
  processingWarnings: string[];
}

export interface PotentialIssue {
  type: 'performance' | 'quality' | 'compatibility' | 'formatting';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}
