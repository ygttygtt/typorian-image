import { setIcon } from 'obsidian';

/**
 * Get SVG string for a Lucide icon name.
 * Uses Obsidian's internal icon registry.
 */
export function getIconSvg(name: string): string {
  try {
    const el = document.createElement('div');
    setIcon(el, name);
    const svg = el.innerHTML;
    return svg || getDefaultIcon();
  } catch {
    return getDefaultIcon();
  }
}

function getDefaultIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
}

/**
 * Refresh icon on an existing DOM element.
 */
export function refreshIcon(element: HTMLElement, iconName: string): void {
  element.empty();
  setIcon(element, iconName);
}

/**
 * Available icon presets grouped by category.
 */
export const ICON_PRESETS: Record<string, string[]> = {
  'Image Audit': [
    'trash-2', 'eraser', 'brush', 'sparkles', 'image', 'file-image',
    'link', 'link-2', 'wrench', 'hammer', 'stethoscope', 'shield-alert', 'refresh-cw',
  ],
  'Share': [
    'share', 'share-2', 'folder-output', 'package-up',
    'send', 'forward', 'external-link', 'arrow-up-right', 'move-up-right', 'upload', 'upload-cloud',
  ],
  'Restructure': [
    'git-fork', 'git-branch', 'network', 'workflow', 'database', 'component',
    'shuffle', 'folder-sync', 'layers', 'boxes', 'layout', 'layout-grid',
  ],
};
