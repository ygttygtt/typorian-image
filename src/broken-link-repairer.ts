import { App, TFile, Notice, normalizePath } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { IMAGE_EXTENSIONS } from './orphan-types';
import { extractCodeBlockRanges, isInsideCodeBlock, Range } from './code-block-filter';
import { TyporianSettings } from './settings';

// Matches standard markdown image: ![alt](path)
const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

// Matches wiki embed: ![[path]] or ![[path|alias]]
const WIKI_EMBED_REGEX = /!\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]/g;

interface BrokenMatch {
  from: number;
  to: number;
  alt: string;
  rawPath: string;
  cleanedPath: string;
  fileName: string;
  isWiki: boolean;
}

export interface RepairAllResult {
  scanned: number;
  fixed: number;
}

export class BrokenLinkRepairer {
  constructor(
    private app: App,
    private settings?: TyporianSettings
  ) {}

  /**
   * Repair broken image links in the active note (via EditorView).
   * Returns the number of links repaired, or -1 if no active note.
   */
  async repair(view: EditorView): Promise<number> {
    const activeFile = this.getActiveFile();
    if (!activeFile) return -1;

    const content = view.state.doc.toString();
    const noteDir = activeFile.parent?.path ?? '';

    const broken = this.findBrokenLinks(content, noteDir, activeFile.path);
    if (broken.length === 0) return 0;

    const vaultImages = this.buildVaultImageIndex();
    const replacements = this.computeReplacements(broken, vaultImages, noteDir);

    if (replacements.length > 0) {
      replacements.sort((a, b) => b.from - a.from);
      for (const r of replacements) {
        view.dispatch({
          changes: { from: r.from, to: r.to, insert: r.insert },
        });
      }
    }

    return replacements.length;
  }

  /**
   * Repair broken image links across ALL markdown notes in the vault.
   * Operates directly on file content (no editor needed).
   */
  async repairAll(): Promise<RepairAllResult> {
    const mdFiles = this.app.vault.getMarkdownFiles();
    const vaultImages = this.buildVaultImageIndex();
    let scanned = 0;
    let fixed = 0;

    for (const mdFile of mdFiles) {
      const content = await this.app.vault.read(mdFile);
      const noteDir = mdFile.parent?.path ?? '';

      const broken = this.findBrokenLinks(content, noteDir, mdFile.path);
      if (broken.length === 0) {
        scanned++;
        continue;
      }

      const replacements = this.computeReplacements(broken, vaultImages, noteDir);
      if (replacements.length === 0) {
        scanned++;
        continue;
      }

      // Apply replacements from end to start (preserve offsets)
      replacements.sort((a, b) => b.from - a.from);
      let newContent = content;
      for (const r of replacements) {
        newContent = newContent.substring(0, r.from) + r.insert + newContent.substring(r.to);
      }

      await this.app.vault.modify(mdFile, newContent);
      fixed += replacements.length;
      scanned++;
    }

    return { scanned, fixed };
  }

  /**
   * Find all broken image links in content relative to noteDir.
   */
  private findBrokenLinks(content: string, noteDir: string, sourcePath: string): BrokenMatch[] {
    const broken: BrokenMatch[] = [];
    let match: RegExpExecArray | null;

    const codeRanges = (!this.settings || this.settings.scanCodeBlocks) ? [] : extractCodeBlockRanges(content);

    MD_IMAGE_REGEX.lastIndex = 0;
    while ((match = MD_IMAGE_REGEX.exec(content)) !== null) {
      if (codeRanges.length > 0 && isInsideCodeBlock(match.index, codeRanges)) continue;

      const rawPath = match[2];

      if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

      const cleanedPath = this.cleanPath(rawPath);
      const fileName = this.extractFileName(cleanedPath);
      if (!fileName) continue;

      const resolvedPath = this.resolveRelativePath(noteDir, cleanedPath);
      const existing = this.app.vault.getAbstractFileByPath(normalizePath(resolvedPath));
      if (existing instanceof TFile && IMAGE_EXTENSIONS.has(existing.extension.toLowerCase())) {
        continue;
      }

      broken.push({
        from: match.index,
        to: match.index + match[0].length,
        alt: match[1],
        rawPath,
        cleanedPath,
        fileName,
        isWiki: false,
      });
    }

    if (this.settings?.enableWikiLinkConversion) {
      const wikiMatches = this.findWikiLinks(content, noteDir, sourcePath, codeRanges);
      broken.push(...wikiMatches);
    }

    return broken;
  }

  /**
   * Find wiki embed links that resolve to image files.
   */
  private findWikiLinks(
    content: string,
    noteDir: string,
    sourcePath: string,
    codeRanges: Range[]
  ): BrokenMatch[] {
    const matches: BrokenMatch[] = [];
    let match: RegExpExecArray | null;

    WIKI_EMBED_REGEX.lastIndex = 0;
    while ((match = WIKI_EMBED_REGEX.exec(content)) !== null) {
      if (codeRanges.length > 0 && isInsideCodeBlock(match.index, codeRanges)) continue;

      const rawPath = match[1].trim();
      if (!rawPath) continue;
      if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

      // Primary resolution: Obsidian API
      let resolved: TFile | null = this.app.metadataCache.getFirstLinkpathDest(rawPath, sourcePath);

      // Fallback 1: manual attachment folder from settings
      if (!resolved && this.settings?.manualAttachmentFolder) {
        const manualPath = normalizePath(`${this.settings.manualAttachmentFolder}/${rawPath}`);
        const manualFile = this.app.vault.getAbstractFileByPath(manualPath);
        if (manualFile instanceof TFile && IMAGE_EXTENSIONS.has(manualFile.extension.toLowerCase())) {
          resolved = manualFile;
        }
      }

      // Fallback 2: Obsidian's configured attachment folder
      if (!resolved) {
        try {
          const attachmentFolder = (this.app.vault as any).getConfig?.('attachmentFolderPath');
          if (attachmentFolder && typeof attachmentFolder === 'string') {
            const attachPath = normalizePath(`${attachmentFolder}/${rawPath}`);
            const attachFile = this.app.vault.getAbstractFileByPath(attachPath);
            if (attachFile instanceof TFile && IMAGE_EXTENSIONS.has(attachFile.extension.toLowerCase())) {
              resolved = attachFile;
            }
          }
        } catch {
          // getConfig not available, skip
        }
      }

      if (!resolved || !IMAGE_EXTENSIONS.has(resolved.extension.toLowerCase())) continue;

      const resolvedPath = resolved.path;

      // Compute relative path from note directory
      const cleanedPath = this.computeRelativePath(noteDir, resolvedPath);
      const fileName = this.extractFileName(cleanedPath);
      if (!fileName) continue;

      matches.push({
        from: match.index,
        to: match.index + match[0].length,
        alt: match[2] || '',
        rawPath,
        cleanedPath,
        fileName,
        isWiki: true,
      });
    }

    return matches;
  }

  /**
   * Compute replacement specs for broken links.
   */
  private computeReplacements(
    broken: BrokenMatch[],
    vaultImages: Map<string, TFile[]>,
    noteDir: string
  ): Array<{ from: number; to: number; insert: string }> {
    const replacements: Array<{ from: number; to: number; insert: string }> = [];

    for (const b of broken) {
      let newPath: string | null = null;

      if (b.isWiki) {
        // Wiki matches: use cleanedPath directly (already resolved)
        newPath = b.cleanedPath;
      } else {
        // Standard markdown: search vault for the file
        newPath = this.searchVault(vaultImages, b.fileName, noteDir);
      }

      if (newPath) {
        const newLink = `![${b.alt}](${newPath})`;
        replacements.push({ from: b.from, to: b.to, insert: newLink });
      }
    }

    return replacements;
  }

  private cleanPath(rawPath: string): string {
    let path = rawPath.replace(/\\/g, '/');
    path = path.replace(/^[A-Za-z]:\//, '');
    path = path.replace(/^\/\/[^/]+\//, '');
    path = path.replace(/^\/+/, '');
    path = path.replace(/%20/g, ' ');
    return path;
  }

  private extractFileName(cleanedPath: string): string | null {
    const parts = cleanedPath.split('/');
    const fileName = parts[parts.length - 1];
    if (!fileName) return null;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext || !IMAGE_EXTENSIONS.has(ext)) return null;
    return fileName;
  }

  private resolveRelativePath(noteDir: string, relativePath: string): string {
    if (relativePath.startsWith('./')) {
      relativePath = relativePath.substring(2);
    }
    return noteDir ? `${noteDir}/${relativePath}` : relativePath;
  }

  private buildVaultImageIndex(): Map<string, TFile[]> {
    const index = new Map<string, TFile[]>();
    const allFiles = this.app.vault.getFiles();

    for (const file of allFiles) {
      if (!IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) continue;
      const name = file.name.toLowerCase();
      if (!index.has(name)) {
        index.set(name, []);
      }
      index.get(name)!.push(file);
    }

    return index;
  }

  private searchVault(
    index: Map<string, TFile[]>,
    fileName: string,
    noteDir: string
  ): string | null {
    const candidates = index.get(fileName.toLowerCase());
    if (!candidates || candidates.length === 0) return null;

    const assetsCandidates = candidates.filter((f) => f.path.includes('.assets/'));
    const pool = assetsCandidates.length > 0 ? assetsCandidates : candidates;

    const sameDir = pool.filter((f) => f.parent?.path === noteDir);
    const target = sameDir.length > 0 ? sameDir[0] : pool[0];

    return this.computeRelativePath(noteDir, target.path);
  }

  private computeRelativePath(noteDir: string, targetPath: string): string {
    const noteParts = noteDir ? noteDir.split('/') : [];
    const targetParts = targetPath.split('/');

    let commonLen = 0;
    for (let i = 0; i < Math.min(noteParts.length, targetParts.length - 1); i++) {
      if (noteParts[i] === targetParts[i]) {
        commonLen++;
      } else {
        break;
      }
    }

    const upCount = noteParts.length - commonLen;
    const remaining = targetParts.slice(commonLen);
    const prefix = '../'.repeat(upCount);
    return prefix + remaining.join('/');
  }

  private getActiveFile(): TFile | null {
    const leaf = this.app.workspace.activeLeaf;
    if (!leaf) return null;
    const file = (leaf.view as any).file;
    return file instanceof TFile ? file : null;
  }
}
