/**
 * Traditional Chinese translations
 */

import type { TranslationKey } from '../types';

export const zhTWTranslations: TranslationKey = {
  // 應用程式資訊
  app: {
    name: 'MD2PDF',
    description: '將 Markdown 文件轉換為專業 PDF 文件的工具，支援目錄生成功能',
    version: '版本',
  },

  // CLI 介面
  cli: {
    mainMenu: {
      title: 'MD2PDF 主選單',
      startConversion: '🚀 開始轉換',
      versionInfo: 'ℹ️  版本資訊',
      languageSettings: '🌐 語言設定',
      helpDocumentation: '❓ 說明文件',
      exitProgram: '🚪 離開程式',
    },
    prompts: {
      selectFile: '選擇要轉換的 Markdown 檔案',
      outputPath: '指定輸出 PDF 路徑',
      pageFormat: '選擇頁面格式',
      margins: '設定頁面邊距',
      tocEnabled: '產生目錄？',
      tocDepth: '目錄深度',
      bookmarksEnabled: '產生 PDF 書籤？',
      bookmarksDepth: '書籤深度',
      coverPage: '包含封面？',
      theme: '選擇主題',
      finalConfirmation: '確認轉換設定？',
    },
    options: {
      yes: '是',
      no: '否',
      back: '返回',
      continue: '繼續',
      cancel: '取消',
      browse: '瀏覽…',
      manual: '手動輸入',
      recent: '最近使用的檔案',
    },
  },

  // 檔案操作
  file: {
    notFound: '找不到檔案：{{path}}',
    permissionDenied: '權限不足：{{path}}',
    readError: '讀取檔案錯誤：{{path}}',
    writeError: '寫入檔案錯誤：{{path}}',
    invalidFormat: '無效的檔案格式：{{format}}',
  },

  // PDF 生成
  pdf: {
    generating: '正在產生 PDF…',
    generationComplete: 'PDF 產生完成',
    generationFailed: 'PDF 產生失敗',
    savingTo: '儲存至：{{path}}',
    pageCount: '總頁數：{{count}}',
  },

  // 目錄
  toc: {
    generating: '正在產生目錄…',
    noHeadings: '文件中未找到標題',
    depth: '深度：{{depth}} 層',
    entriesFound: '找到 {{count}} 個目錄項目',
  },

  // 錯誤訊息
  error: {
    unknown: '發生未知錯誤',
    validation: '驗證錯誤：{{message}}',
    parsing: 'Markdown 解析錯誤：{{message}}',
    puppeteer: 'PDF 引擎錯誤：{{message}}',
    fileSystem: '檔案系統錯誤：{{message}}',
    configuration: '設定錯誤：{{message}}',
    network: '網路錯誤：{{message}}',
  },

  // 成功訊息
  success: {
    conversion: '轉換成功完成！',
    fileCreated: '檔案已建立：{{path}}',
    configSaved: '設定已儲存',
    settingsUpdated: '設定已更新',
  },

  // 驗證訊息
  validation: {
    required: '此欄位為必填',
    invalidPath: '無效的檔案路徑',
    invalidFormat: '無效的格式：{{format}}',
    fileMustExist: '檔案必須存在',
    directoryMustExist: '目錄必須存在',
    invalidNumber: '無效的數字：{{value}}',
  },

  // 進度訊息
  progress: {
    reading: '正在讀取檔案…',
    parsing: '正在解析 Markdown…',
    generating: '正在產生 PDF…',
    saving: '正在儲存檔案…',
    complete: '完成！',
  },

  // 頁面格式
  pageFormat: {
    a4: 'A4（210 × 297 公釐）',
    a3: 'A3（297 × 420 公釐）',
    letter: 'Letter（8.5 × 11 英吋）',
    legal: 'Legal（8.5 × 14 英吋）',
    tabloid: 'Tabloid（11 × 17 英吋）',
  },

  // 主題
  theme: {
    default: '預設',
    minimal: '簡約',
    academic: '學術',
    business: '商務',
    modern: '現代',
  },
};
