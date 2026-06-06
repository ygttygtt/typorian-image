import { App, TFile, Notice, normalizePath } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { IMAGE_EXTENSIONS } from './orphan-types';

// Matches standard markdown image: ![alt](path)
const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

interface BrokenMatch {
  from: number;
  to: number;
  alt: string;
  rawPath: string;
  cleanedPath: string;
  fileName: string;
}

export class BrokenLinkRepairer {
  constructor(private app: App) {}

  /**
   * Repair broken image links in the active note.
   * Returns the number of links repaired.
   */
  async repair(view: EditorView): Promise<number> {
    const activeFile = this.getActiveFile();
    if (!activeFile) return -1;

    const content = view.state.doc.toString();
    const noteDir = activeFile.parent?.path ?? '';

    // Collect all broken image matches
    const broken: BrokenMatch[] = [];
    let match: RegExpExecArray | null;

    MD_IMAGE_REGEX.lastIndex = 0;
    while ((match = MD_IMAGE_REGEX.exec(content)) !== null) {
      const rawPath = match[2];

      // Skip external URLs
      if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

      const cleanedPath = this.cleanPath(rawPath);
      const fileName = this.extractFileName(cleanedPath);
      if (!fileName) continue;

      // Check if the cleaned path resolves to an existing file
      const resolvedPath = this.resolveRelativePath(noteDir, cleanedPath);
      const existing = this.app.vault.getAbstractFileByPath(normalizePath(resolvedPath));
      if (existing instanceof TFile && IMAGE_EXTENSIONS.has(existing.extension.toLowerCase())) {
        continue; // Link is valid, skip
      }

      broken.push({
        from: match.index,
        to: match.index + match[0].length,
        alt: match[1],
        rawPath,
        cleanedPath,
        fileName,
      });
    }

    if (broken.length === 0) return 0;

    // Build a map of all image files in the vault for fast lookup
    const vaultImages = this.buildVaultImageIndex();

    // Process repairs in reverse order (so offsets remain valid)
    let repaired = 0;
    const replacements: Array<{ from: number; to: number; insert: string }> = [];

    for (const b of broken) {
      const found = this.searchVault(vaultImages, b.fileName, noteDir);
      if (found) {
        const newLink = `![${b.alt}](${found})`;
        replacements.push({ from: b.from, to: b.to, insert: newLink });
        repaired++;
      }
    }

    // Apply all replacements in a single dispatch (atomic, cursor-safe)
    if (replacements.length > 0) {
      // Sort by position descending to apply from end to start
      replacements.sort((a, b) => b.from - a.from);

      // Build a single changes array for CM6
      // CM6 can handle overlapping changes if we use the spec correctly
      // But since we sorted descending and non-overlapping, direct apply works
      for (const r of replacements) {
        view.dispatch({
          changes: { from: r.from, to: r.to, insert: r.insert },
        });
      }
    }

    return repaired;
  }

  /**
   * Clean a raw image path:
   * - Replace backslashes with forward slashes
   * - Strip absolute path prefixes (drive letters, system roots)
   */
  private cleanPath(rawPath: string): string {
    let path = rawPath.replace(/\\/g, '/');

    // Strip Windows absolute paths: C:\, D:\, etc.
    path = path.replace(/^[A-Za-z]:\//, '');

    // Strip UNC paths: //server/share/
    path = path.replace(/^\/\/[^/]+\//, '');

    // Strip leading slashes (Unix absolute)
    path = path.replace(/^\/+/, '');

    // Remove URL encoding for spaces
    path = path.replace(/%20/g, ' ');

    return path;
  }

  /**
   * Extract the pure filename from a cleaned path.
   */
  private extractFileName(cleanedPath: string): string | null {
    const parts = cleanedPath.split('/');
    const fileName = parts[parts.length - 1];
    if (!fileName) return null;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext || !IMAGE_EXTENSIONS.has(ext)) return null;
    return fileName;
  }

  /**
   * Resolve a relative path against the note's directory.
   */
  private resolveRelativePath(noteDir: string, relativePath: string): string {
    if (relativePath.startsWith('./')) {
      relativePath = relativePath.substring(2);
    }
    return noteDir ? `${noteDir}/${relativePath}` : relativePath;
  }

  /**
   * Build an index of all image files in the vault, grouped by filename.
   */
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

  /**
   * Search the vault for an image file matching the given filename.
   * Prefers files in .assets directories, then any location.
   * Returns the relative path from the note directory, or null if not found.
   */
  private searchVault(
    index: Map<string, TFile[]>,
    fileName: string,
    noteDir: string
  ): string | null {
    const candidates = index.get(fileName.toLowerCase());
    if (!candidates || candidates.length === 0) return null;

    // Prefer candidates in .assets folders
    const assetsCandidates = candidates.filter((f) => f.path.includes('.assets/'));
    const pool = assetsCandidates.length > 0 ? assetsCandidates : candidates;

    // Prefer candidates closest to the note (same directory first)
    const sameDir = pool.filter((f) => f.parent?.path === noteDir);
    const target = sameDir.length > 0 ? sameDir[0] : pool[0];

    // Compute relative path from note directory
    return this.computeRelativePath(noteDir, target.path);
  }

  /**
   * Compute relative path from noteDir to targetPath.
   */
  private computeRelativePath(noteDir: string, targetPath: string): string {
    const noteParts = noteDir ? noteDir.split('/') : [];
    const targetParts = targetPath.split('/');

    // Find common prefix length
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
