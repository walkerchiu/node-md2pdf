/**
 * Shared anchor links prompt module
 * Used by single file, batch, and smart conversion modes
 */

import type {
  AnchorLinksOptions,
  AnchorLinksDepth,
} from '../../core/anchor-links/types';
import type { ITranslationManager } from '../../infrastructure/i18n/types';

type InquirerModule = typeof import('inquirer');

export interface AnchorLinksPromptResult {
  enableAnchorLinks: boolean;
  anchorDepth: AnchorLinksDepth;
}

export class AnchorLinksPrompt {
  constructor(private translationManager: ITranslationManager) {}

  /**
   * Ask user about anchor links depth range (independent of TOC depth)
   * Called after TOC depth setting, before page numbers setting
   */
  async promptAnchorLinks(): Promise<AnchorLinksPromptResult> {
    const inquirer = (await import('inquirer')) as InquirerModule;

    const choices = [
      {
        name: this.translationManager.t('interactive.anchorDepthOptions.none'),
        value: 'none' as const,
        short: this.translationManager.t('interactive.anchorDepthOptions.none'),
      },
      {
        name: this.translationManager.t('interactive.anchorDepthOptions.2'),
        value: 2 as const,
        short: 'H2',
      },
      {
        name: this.translationManager.t('interactive.anchorDepthOptions.3'),
        value: 3 as const,
        short: 'H3',
      },
      {
        name: this.translationManager.t('interactive.anchorDepthOptions.4'),
        value: 4 as const,
        short: 'H4',
      },
      {
        name: this.translationManager.t('interactive.anchorDepthOptions.5'),
        value: 5 as const,
        short: 'H5',
      },
      {
        name: this.translationManager.t('interactive.anchorDepthOptions.6'),
        value: 6 as const,
        short: 'H6',
      },
    ];

    const { anchorDepth } = await inquirer.default.prompt<{
      anchorDepth: AnchorLinksDepth;
    }>([
      {
        type: 'list',
        name: 'anchorDepth',
        message: this.translationManager.t('interactive.enableBackToTocLinks'),
        choices,
        default: 3, // Default to H3 depth
        pageSize: 8,
      },
    ]);

    return {
      enableAnchorLinks: anchorDepth !== 'none',
      anchorDepth,
    };
  }

  /**
   * 建立錨點連結選項配置
   */
  createAnchorLinksOptions(
    promptResult: AnchorLinksPromptResult,
  ): AnchorLinksOptions | undefined {
    if (
      !promptResult.enableAnchorLinks ||
      promptResult.anchorDepth === 'none'
    ) {
      return undefined;
    }

    return {
      enabled: true,
      anchorDepth: promptResult.anchorDepth,
      linkText: this.translationManager.t('anchorLinks.backToToc'),
      alignment: 'right',
      cssClasses: {
        container: 'back-to-toc-container',
        link: 'back-to-toc-link',
        text: 'back-to-toc-text',
      },
    };
  }

  /**
   * 格式化錨點連結設定摘要文字（用於確認畫面）
   */
  formatAnchorLinksSummary(
    anchorLinksOptions: AnchorLinksOptions | undefined,
  ): string {
    if (!anchorLinksOptions || !anchorLinksOptions.enabled) {
      return this.translationManager.t('interactive.no');
    }

    return this.translationManager.t('interactive.anchorLinksSummary', {
      depth: anchorLinksOptions.anchorDepth,
      alignment: this.translationManager.t(
        `interactive.alignment.${anchorLinksOptions.alignment}`,
      ),
    });
  }
}
