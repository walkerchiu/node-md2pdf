/**
 * Default configuration values
 */

import type { ConfigSchema } from './types';

export const defaultConfig: ConfigSchema = {
  language: {
    default: 'en',
    available: ['en', 'zh-tw'],
  },
  pdf: {
    format: 'A4',
    margin: {
      top: '1in',
      right: '1in',
      bottom: '1in',
      left: '1in',
    },
    displayHeaderFooter: false,
    printBackground: true,
  },
  toc: {
    enabled: true,
    depth: 3,
    title: {
      en: 'Table of Contents',
      'zh-tw': '目錄',
    },
  },
  performance: {
    maxWorkers: 3,
    timeout: 120000, // 2 minutes
    memoryLimit: '2GB',
  },
  features: {
    enhancedServices: process.env.MD2PDF_USE_ENHANCED_SERVICES !== 'false',
    enhancedCli: process.env.MD2PDF_USE_ENHANCED_CLI !== 'false',
    newOrchestrator: process.env.MD2PDF_USE_NEW_ORCHESTRATOR !== 'false',
    forceLegacyMode: process.env.MD2PDF_FORCE_LEGACY === 'true',
  },
};

/**
 * Environment variable mappings
 */
export const environmentMappings: Record<string, string> = {
  MD2PDF_LANG: 'language.default',
  MD2PDF_PDF_FORMAT: 'pdf.format',
  MD2PDF_TOC_ENABLED: 'toc.enabled',
  MD2PDF_TOC_DEPTH: 'toc.depth',
  MD2PDF_MAX_WORKERS: 'performance.maxWorkers',
  MD2PDF_TIMEOUT: 'performance.timeout',
  MD2PDF_USE_ENHANCED_SERVICES: 'features.enhancedServices',
  MD2PDF_USE_ENHANCED_CLI: 'features.enhancedCli',
  MD2PDF_USE_NEW_ORCHESTRATOR: 'features.newOrchestrator',
  MD2PDF_FORCE_LEGACY: 'features.forceLegacyMode',
};
