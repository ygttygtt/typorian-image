import { PathUtils } from './path-utils';
import { App, TFile } from 'obsidian';
import { IMAGE_EXTENSIONS } from './orphan-types';
import { extractCodeBlockRanges, isInsideCodeBlock } from './code-block-filter';

export interface MarkdownImage {
  index: number;
  raw: string;
  alt: string;
  path: string;
  title: string;
}

function isEscaped(content: string, index: number): boolean {
  let count = 0;
  for (let i = index - 1; i >= 0 && content[i] === '\\'; i--) count++;
  return count % 2 === 1;
}

/** Parse inline image destinations, including escaped text, parentheses and titles. */
export function parseMarkdownImages(content: string): MarkdownImage[] {
  const images: MarkdownImage[] = [];
  const startPattern = /!\[/g;
  let start: RegExpExecArray | null;
  while ((start = startPattern.exec(content)) !== null) {
    const index = start.index;
    if (isEscaped(content, index)) continue;
    let cursor = index + 2;
    const altStart = cursor;
    let depth = 1;
    while (cursor < content.length && depth > 0) {
      if (content[cursor] === '\\') { cursor += 2; continue; }
      if (content[cursor] === '[') depth++;
      if (content[cursor] === ']') depth--;
      cursor++;
    }
    if (depth !== 0 || content[cursor] !== '(') continue;
    const alt = content.slice(altStart, cursor - 1).replace(/\\([\\\[\]])/g, '$1');
    cursor++;
    while (/\s/.test(content[cursor] ?? '') && cursor < content.length) cursor++;
    const angled = content[cursor] === '<';
    if (angled) cursor++;
    const pathStart = cursor;
    depth = 0;
    while (cursor < content.length) {
      const char = content[cursor];
      if (char === '\\') { cursor += 2; continue; }
      if (angled && char === '>') break;
      if (!angled) {
        if (char === '(') depth++;
        if (char === ')') {
          if (depth === 0) break;
          depth--;
        }
        if (/\s/.test(char) && depth === 0) break;
      }
      cursor++;
    }
    const path = content.slice(pathStart, cursor);
    if (depth !== 0 || (angled && content[cursor] !== '>')) continue;
    if (angled) cursor++;
    const whitespaceStart = cursor;
    while (cursor < content.length && /\s/.test(content[cursor])) cursor++;
    let title = '';
    if (cursor > whitespaceStart && /["'(]/.test(content[cursor] ?? '')) {
      const titleStart = cursor;
      const close = content[cursor] === '(' ? ')' : content[cursor];
      cursor++;
      while (cursor < content.length) {
        if (content[cursor] === '\\') { cursor += 2; continue; }
        if (content[cursor] === close) break;
        cursor++;
      }
      if (cursor === content.length) continue;
      cursor++;
      title = content.slice(titleStart, cursor);
      while (cursor < content.length && /\s/.test(content[cursor])) cursor++;
    }
    if (content[cursor] !== ')') continue;
    const raw = content.slice(index, cursor + 1);
    images.push({ index, raw, alt, path, title });
    startPattern.lastIndex = cursor + 1;
  }
  return images;
}

export interface WikiImage {
  index: number;
  raw: string;
  path: string;
  alt: string;
}

/** Wiki embeds outside code examples. Callers resolve the file type. */
export function parseWikiImages(content: string, scanCodeBlocks = false): WikiImage[] {
  const codeRanges = scanCodeBlocks ? [] : extractCodeBlockRanges(content);
  const pattern = /!\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]/g;
  const images: WikiImage[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    if (isEscaped(content, match.index) || isInsideCodeBlock(match.index, codeRanges)) continue;
    images.push({ index: match.index, raw: match[0], path: match[1].trim(), alt: match[2] ?? '' });
  }
  return images;
}

export function isRemoteImagePath(path: string): boolean {
  return !/^[a-z]:[\\/]/i.test(path) && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path);
}

export function createMarkdownImage(alt: string, diskRelativePath: string, title = ''): string {
  const escapedAlt = alt.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
  return `![${escapedAlt}](${PathUtils.encodePath(diskRelativePath)}${title ? ` ${title}` : ''})`;
}

function isImageFile(file: unknown): file is TFile {
  return file instanceof TFile && IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}

/** Explicit dot paths are note-relative; other paths follow Obsidian's resolver. */
export function resolveMarkdownImage(app: App, notePath: string, diskPath: string): TFile | null {
  const noteDir = notePath.includes('/') ? notePath.slice(0, notePath.lastIndexOf('/')) : '';
  const relative = PathUtils.resolveVaultPath(noteDir, diskPath);
  if (relative === null) return null;
  if (diskPath.startsWith('./') || diskPath.startsWith('../')) {
    const file = app.vault.getAbstractFileByPath(relative);
    return isImageFile(file) ? file : null;
  }
  // Reserved characters can be parsed as URI fragments despite being literal Typora names.
  if (/[#?]/.test(diskPath)) {
    const literal = app.vault.getAbstractFileByPath(relative);
    if (isImageFile(literal)) return literal;
    const rootPath = PathUtils.resolveVaultPath('', diskPath);
    const root = rootPath === null ? null : app.vault.getAbstractFileByPath(rootPath);
    if (isImageFile(root)) return root;
  }
  const rendered = app.metadataCache.getFirstLinkpathDest(diskPath, notePath);
  if (isImageFile(rendered)) return rendered;
  // Typora disk paths can name files that Obsidian cannot render, such as # or ?.
  const diskFile = app.vault.getAbstractFileByPath(relative);
  return isImageFile(diskFile) ? diskFile : null;
}

/** Preserve explicit directory constraints; only bare names use unique-name matching. */
export function resolveWikiImage(app: App, notePath: string, path: string, manualFolder = ''):
  { file: TFile | null; ambiguous: boolean } {
  const noteDir = notePath.includes('/') ? notePath.slice(0, notePath.lastIndexOf('/')) : '';
  const relativePath = PathUtils.resolveVaultPath(noteDir, path);
  if (relativePath === null) return { file: null, ambiguous: false };
  const relative = app.vault.getAbstractFileByPath(relativePath);
  if (path.startsWith('./') || path.startsWith('../')) {
    return { file: isImageFile(relative) ? relative : null, ambiguous: false };
  }
  if (path.includes('/')) {
    const rootPath = PathUtils.resolveVaultPath('', path);
    const root = rootPath === null ? null : app.vault.getAbstractFileByPath(rootPath);
    if (isImageFile(root)) return { file: root, ambiguous: false };
  }
  if (isImageFile(relative)) return { file: relative, ambiguous: false };
  if (manualFolder) {
    const manualPath = PathUtils.resolveVaultPath(manualFolder, path);
    const manual = manualPath === null ? null : app.vault.getAbstractFileByPath(manualPath);
    if (isImageFile(manual)) return { file: manual, ambiguous: false };
  }
  const matches = app.vault.getFiles().filter(file => isImageFile(file) &&
    (path.includes('/') ? file.path.endsWith(`/${path}`) : file.name === path));
  return { file: matches.length === 1 ? matches[0] : null, ambiguous: matches.length > 1 };
}
