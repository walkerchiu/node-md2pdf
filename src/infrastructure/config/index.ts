/**
 * Configuration management module exports
 */

export { ConfigManager } from './manager';

export type { IConfigManager, ConfigOptions, ConfigSchema } from './types';

export {
  defaultConfig,
  environmentMappings,
  CONFIG_KEYS,
  DEFAULT_MARGINS,
  DEFAULT_CSS_TEMPLATE,
  DEFAULT_PDF_OPTIONS,
} from './defaults';

export {
  ConfigAccessor,
  type PDFMarginConfig,
  type CSSTemplateConfig,
  type PDFEngineConfig,
} from './config-accessor';
