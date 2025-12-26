/**
 * Customization Module
 * Exports all customization-related features
 */

// Feature modules
export { DocumentMetadataFeature } from './document-metadata';
export { HeadersFootersFeature } from './headers-footers';
export { PasswordProtectionFeature } from './password-protection';
export {
  TemplateManagementFeature,
  type TemplateManagementDependencies,
} from './template-management';

// Shared types
export {
  BaseCustomizationFeature,
  type CustomizationDependencies,
  type ICustomizationFeature,
} from './types';
