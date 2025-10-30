/**
 * Markdown-it plugin for admonition blocks
 * Supports syntax like :::info, :::tip, :::warning, :::danger, :::success
 */

import type MarkdownIt from 'markdown-it';

export interface AdmonitionType {
  name: string;
  title: string;
  icon: string;
  className: string;
}

const ADMONITION_ICONS = {
  note: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 2h10c.553 0 1 .447 1 1v10c0 .553-.447 1-1 1H3c-.553 0-1-.447-1-1V3c0-.553.447-1 1-1z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5 6h6M5 8h6M5 10h4" stroke="currentColor" stroke-width="1.2"/><path d="M11.5 1.5L13 3v2.5l-1.5-1.5z" fill="currentColor"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="8" cy="5" r="1" fill="currentColor"/><path d="M8 7.5v4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  tip: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5c3.038 0 5.5 2.462 5.5 5.5 0 1.92-.98 3.61-2.468 4.598-.346.23-.532.602-.532 1.002v.9c0 .276-.224.5-.5.5h-4c-.276 0-.5-.224-.5-.5v-.9c0-.4-.186-.772-.532-1.002C4.48 10.61 3.5 8.92 3.5 7c0-3.038 2.462-5.5 5.5-5.5z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M6.5 14.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  warning:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 6v3M8 11v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  danger:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  success:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5.5 8.5l1.5 1.5 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  important:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1l2.4 4.8 5.6 0.8-4 3.9 0.9 5.5-5-2.6-5 2.6 0.9-5.5-4-3.9 5.6-0.8z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>',
  example:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4h12c.553 0 1 .447 1 1v8c0 .553-.447 1-1 1H2c-.553 0-1-.447-1-1V5c0-.553.447-1 1-1z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M4 7l2 2-2 2M7 11h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export const DEFAULT_ADMONITION_TYPES: AdmonitionType[] = [
  {
    name: 'note',
    title: 'Note',
    icon: ADMONITION_ICONS.note,
    className: 'admonition-note',
  },
  {
    name: 'info',
    title: 'Info',
    icon: ADMONITION_ICONS.info,
    className: 'admonition-info',
  },
  {
    name: 'tip',
    title: 'Tip',
    icon: ADMONITION_ICONS.tip,
    className: 'admonition-tip',
  },
  {
    name: 'warning',
    title: 'Warning',
    icon: ADMONITION_ICONS.warning,
    className: 'admonition-warning',
  },
  {
    name: 'danger',
    title: 'Danger',
    icon: ADMONITION_ICONS.danger,
    className: 'admonition-danger',
  },
  {
    name: 'success',
    title: 'Success',
    icon: ADMONITION_ICONS.success,
    className: 'admonition-success',
  },
  {
    name: 'important',
    title: 'Important',
    icon: ADMONITION_ICONS.important,
    className: 'admonition-important',
  },
  {
    name: 'example',
    title: 'Example',
    icon: ADMONITION_ICONS.example,
    className: 'admonition-example',
  },
];

export interface AdmonitionOptions {
  types?: AdmonitionType[];
  render?: (
    tokens: any[],
    idx: number,
    options: any,
    env: any,
    renderer: any,
  ) => string;
}

function parseAdmonition(
  state: any,
  start: number,
  end: number,
  silent: boolean,
): boolean {
  const marker = ':::';
  const markerLength = marker.length;

  // Get the entire line content
  const startLine = state.src.slice(state.bMarks[start], state.eMarks[start]);
  const trimmedStartLine = startLine.trim();

  // Check if line starts with marker
  if (!trimmedStartLine.startsWith(marker)) {
    return false;
  }

  // Extract type and optional custom title
  let typeMatch = trimmedStartLine.slice(markerLength).trim();
  if (!typeMatch) {
    return false;
  }

  const spaceIndex = typeMatch.indexOf(' ');
  let type: string;
  let customTitle: string | undefined;

  if (spaceIndex !== -1) {
    type = typeMatch.slice(0, spaceIndex).trim();
    customTitle = typeMatch.slice(spaceIndex + 1).trim();
  } else {
    type = typeMatch.trim();
  }

  const validTypes = DEFAULT_ADMONITION_TYPES.map((t) => t.name);
  if (!validTypes.includes(type)) {
    return false;
  }

  if (silent) {
    return true;
  }

  // Calculate starting indentation
  const startIndent = startLine.length - startLine.trimStart().length;

  // Find the closing marker
  let nextLine = start + 1;
  let terminatorFound = false;

  while (nextLine < end) {
    const line = state.src.slice(
      state.bMarks[nextLine],
      state.eMarks[nextLine],
    );
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === '') {
      nextLine++;
      continue;
    }

    // Calculate line indentation
    const lineIndent = line.length - line.trimStart().length;

    // Check for closing marker with same indentation
    if (trimmedLine === marker && lineIndent === startIndent) {
      terminatorFound = true;
      break;
    }

    // Only break if this looks like a new block structure
    // Allow content to have less indentation than the admonition markers
    if (lineIndent < startIndent) {
      // Check if this line could be starting a new block
      const couldBeNewBlock = trimmedLine.match(
        /^(#{1,6}\s|```|~~~|>\s|\*\s|\d+\.\s|:::|---|===)/,
      );
      if (couldBeNewBlock) {
        break;
      }
    }

    nextLine++;
  }

  if (!terminatorFound) {
    return false;
  }

  // Save state
  const oldParent = state.parentType;
  const oldIndent = state.blkIndent;
  const oldTShift = state.tShift[start];
  const oldSCount = state.sCount[start];
  const oldListLines = state.listLines;

  state.parentType = 'admonition';
  state.listLines = false;

  // Create opening token
  const tokenOpen = state.push('admonition_open', 'div', 1);
  tokenOpen.info = type;
  tokenOpen.meta = {
    type,
    customTitle,
    config: DEFAULT_ADMONITION_TYPES.find((t) => t.name === type),
  };
  tokenOpen.block = true;
  tokenOpen.map = [start, nextLine];

  // Parse content between markers
  state.md.block.tokenize(state, start + 1, nextLine);

  // Create closing token
  const tokenClose = state.push('admonition_close', 'div', -1);
  tokenClose.block = true;

  // Restore state
  state.parentType = oldParent;
  state.blkIndent = oldIndent;
  state.tShift[start] = oldTShift;
  state.sCount[start] = oldSCount;
  state.listLines = oldListLines;

  state.line = nextLine + 1;
  return true;
}

function renderAdmonition(
  tokens: any[],
  idx: number,
  _options: any,
  _env: any,
  _renderer: any,
): string {
  const token = tokens[idx];

  if (token.type === 'admonition_open') {
    const { customTitle, config } = token.meta;
    const title = customTitle || config.title;

    return `<div class="admonition ${config.className}">
  <div class="admonition-title">
    <span class="admonition-icon">${config.icon}</span>
    ${title}
  </div>`;
  } else {
    return '</div>';
  }
}

export default function admonitionsPlugin(
  md: MarkdownIt,
  options: AdmonitionOptions = {},
): void {
  const opts = {
    types: DEFAULT_ADMONITION_TYPES,
    render: renderAdmonition,
    ...options,
  };

  // Register with highest priority by placing it before table (one of the earliest)
  md.block.ruler.before('table', 'admonition', parseAdmonition, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  md.renderer.rules.admonition_open = opts.render;
  md.renderer.rules.admonition_close = opts.render;
}

export { DEFAULT_ADMONITION_TYPES as ADMONITION_TYPES };
