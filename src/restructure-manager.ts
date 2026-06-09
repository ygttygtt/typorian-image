import { App, TFile, normalizePath } from 'obsidian';
import { TyporianSettings } from './settings';
import { IMAGE_EXTENSIONS } from './orphan-types';

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const WIKI_EMBED_REGEX = /!\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]/g;

export interface RestructureEntry {
  sourcePath: string;
  targetPath: string;
  type: 'note' | 'image';
  imageCount?: number;
}

export interface RestructurePlan {
  entries: RestructureEntry[];
  noteEntries: RestructureEntry[];
  totalNotes: number;
  totalImages: number;
}

export class RestructureManager {
  private sandboxDir = '_Restructured_Vault';

  constructor(
    private app: App,
    private settings: TyporianSettings
  ) {}

  /**
   * Preview: scan all notes and compute what would change.
   */
  async preview(): Promise<RestructurePlan> {
    const entries: RestructureEntry[] = [];
    const noteEntries: RestructureEntry[] = [];
    const mdFiles = this.app.vault.getMarkdownFiles();
    const processedImages = new Set<string>();

    for (const mdFile of mdFiles) {
      const noteDir = (mdFile.parent?.path ?? '').replace(/^\/+$/, '');
      const targetNoteDir = noteDir ? `${this.sandboxDir}/${noteDir}` : this.sandboxDir;

      const content = await this.app.vault.read(mdFile);
      let match: RegExpExecArray | null;
      MD_IMAGE_REGEX.lastIndex = 0;

      let imageCount = 0;
      const noteImagePaths: string[] = [];

      while ((match = MD_IMAGE_REGEX.exec(content)) !== null) {
        const rawPath = match[2];
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

        const resolvedPath = this.resolveImagePath(noteDir, rawPath);
        if (!resolvedPath) continue;

        if (!processedImages.has(resolvedPath)) {
          const sourceFile = this.app.vault.getAbstractFileByPath(normalizePath(resolvedPath));
          if (sourceFile instanceof TFile) {
            processedImages.add(resolvedPath);
            noteImagePaths.push(sourceFile.path);
          }
        }
        imageCount++;
      }

      // Also scan wiki embed links
      WIKI_EMBED_REGEX.lastIndex = 0;
      while ((match = WIKI_EMBED_REGEX.exec(content)) !== null) {
        const rawPath = match[1].trim();
        if (!rawPath || rawPath.startsWith('http')) continue;

        const resolved = this.app.metadataCache.getFirstLinkpathDest(rawPath, mdFile.path);
        if (!resolved) continue;

        if (!IMAGE_EXTENSIONS.has(resolved.extension.toLowerCase())) continue;

        if (!processedImages.has(resolved.path)) {
          processedImages.add(resolved.path);
          noteImagePaths.push(resolved.path);
        }
        imageCount++;
      }

      const noteEntry: RestructureEntry = {
        sourcePath: mdFile.path,
        targetPath: `${targetNoteDir}/${mdFile.name}`,
        type: 'note',
        imageCount,
      };
      entries.push(noteEntry);
      noteEntries.push(noteEntry);

      for (const imgPath of noteImagePaths) {
        const sourceFile = this.app.vault.getAbstractFileByPath(imgPath);
        if (!(sourceFile instanceof TFile)) continue;
        const targetAssetsDir = `${targetNoteDir}/${mdFile.basename}.assets`;
        entries.push({
          sourcePath: sourceFile.path,
          targetPath: `${targetAssetsDir}/${sourceFile.name}`,
          type: 'image',
        });
      }
    }

    return { entries, noteEntries, totalNotes: mdFiles.length, totalImages: processedImages.size };
  }

  /**
   * Apply: copy selected notes and their images to sandbox.
   */
  async apply(plan: RestructurePlan, selectedPaths: Set<string>): Promise<void> {
    await this.ensureDir(this.sandboxDir);

    const noteEntries = plan.entries.filter(
      (e) => e.type === 'note' && selectedPaths.has(e.sourcePath)
    );

    for (const entry of noteEntries) {
      const sourceFile = this.app.vault.getAbstractFileByPath(entry.sourcePath);
      if (!(sourceFile instanceof TFile)) continue;

      const content = await this.app.vault.read(sourceFile);
      const noteDir = (sourceFile.parent?.path ?? '').replace(/^\/+$/, '');
      const targetNoteDir = noteDir ? `${this.sandboxDir}/${noteDir}` : this.sandboxDir;

      let newContent = content;
      const replacements: Array<{ from: number; to: number; insert: string }> = [];
      let match: RegExpExecArray | null;
      MD_IMAGE_REGEX.lastIndex = 0;

      while ((match = MD_IMAGE_REGEX.exec(content)) !== null) {
        const rawPath = match[2];
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

        const fileName = this.extractFileName(rawPath);
        const newRelPath = `${sourceFile.basename}.assets/${fileName}`;
        replacements.push({
          from: match.index,
          to: match.index + match[0].length,
          insert: `![${match[1]}](${newRelPath})`,
        });
      }

      // Also handle wiki embed links
      WIKI_EMBED_REGEX.lastIndex = 0;
      while ((match = WIKI_EMBED_REGEX.exec(content)) !== null) {
        const rawPath = match[1].trim();
        if (!rawPath || rawPath.startsWith('http')) continue;

        const resolved = this.app.metadataCache.getFirstLinkpathDest(rawPath, sourceFile.path);
        if (!resolved) continue;

        if (!IMAGE_EXTENSIONS.has(resolved.extension.toLowerCase())) continue;

        const fileName = resolved.name;
        const newRelPath = `${sourceFile.basename}.assets/${fileName}`;
        replacements.push({
          from: match.index,
          to: match.index + match[0].length,
          insert: `![${match[2] || ''}](${newRelPath})`,
        });
      }

      replacements.sort((a, b) => b.from - a.from);
      for (const r of replacements) {
        newContent = newContent.substring(0, r.from) + r.insert + newContent.substring(r.to);
      }

      await this.ensureDir(targetNoteDir);
      await this.app.vault.create(normalizePath(entry.targetPath), newContent);

      // Copy images for this note
      for (const imgEntry of plan.entries.filter(
        (e) => e.type === 'image' && e.targetPath.startsWith(targetNoteDir + '/')
      )) {
        const imgFile = this.app.vault.getAbstractFileByPath(imgEntry.sourcePath);
        if (!(imgFile instanceof TFile)) continue;
        const data = await this.app.vault.readBinary(imgFile);
        const imgTargetDir = imgEntry.targetPath.substring(0, imgEntry.targetPath.lastIndexOf('/'));
        await this.ensureDir(imgTargetDir);
        await this.app.vault.createBinary(normalizePath(imgEntry.targetPath), data);
      }
    }
  }

  /**
   * Apply overwrite: restructure in-place, then delete originals.
   * WARNING: This modifies the original vault structure.
   */
  async applyOverwrite(
    plan: RestructurePlan,
    selectedPaths: Set<string>,
    onProgress?: (current: number, total: number) => void
  ): Promise<number> {
    let processed = 0;

    const noteEntries = plan.entries.filter(
      (e) => e.type === 'note' && selectedPaths.has(e.sourcePath)
    );

    const trashOriginals: TFile[] = [];

    for (const entry of noteEntries) {
      const sourceFile = this.app.vault.getAbstractFileByPath(entry.sourcePath);
      if (!(sourceFile instanceof TFile)) continue;

      const content = await this.app.vault.read(sourceFile);
      const noteDir = (sourceFile.parent?.path ?? '').replace(/^\/+$/, '');

      // Rewrite image links to new .assets/ paths
      let newContent = content;
      const replacements: Array<{ from: number; to: number; insert: string }> = [];
      let match: RegExpExecArray | null;
      MD_IMAGE_REGEX.lastIndex = 0;

      while ((match = MD_IMAGE_REGEX.exec(content)) !== null) {
        const rawPath = match[2];
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

        const fileName = this.extractFileName(rawPath);
        const newRelPath = `${sourceFile.basename}.assets/${fileName}`;
        replacements.push({
          from: match.index,
          to: match.index + match[0].length,
          insert: `![${match[1]}](${newRelPath})`,
        });
      }

      // Also handle wiki embed links
      WIKI_EMBED_REGEX.lastIndex = 0;
      while ((match = WIKI_EMBED_REGEX.exec(content)) !== null) {
        const rawPath = match[1].trim();
        if (!rawPath || rawPath.startsWith('http')) continue;

        const resolved = this.app.metadataCache.getFirstLinkpathDest(rawPath, sourceFile.path);
        if (!resolved) continue;

        if (!IMAGE_EXTENSIONS.has(resolved.extension.toLowerCase())) continue;

        const fileName = resolved.name;
        const newRelPath = `${sourceFile.basename}.assets/${fileName}`;
        replacements.push({
          from: match.index,
          to: match.index + match[0].length,
          insert: `![${match[2] || ''}](${newRelPath})`,
        });
      }

      replacements.sort((a, b) => b.from - a.from);
      for (const r of replacements) {
        newContent = newContent.substring(0, r.from) + r.insert + newContent.substring(r.to);
      }

      // Create .assets directory next to the note
      const assetsDir = noteDir
        ? `${noteDir}/${sourceFile.basename}.assets`
        : `${sourceFile.basename}.assets`;
      await this.ensureDir(assetsDir);

      // Re-scan note content for image references, resolve and copy only those
      MD_IMAGE_REGEX.lastIndex = 0;
      const copiedImages = new Set<string>();
      while ((match = MD_IMAGE_REGEX.exec(content)) !== null) {
        const rawPath = match[2];
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

        const resolvedPath = this.resolveImagePath(noteDir, rawPath);
        if (!resolvedPath || copiedImages.has(resolvedPath)) continue;

        const imgFile = this.app.vault.getAbstractFileByPath(normalizePath(resolvedPath));
        if (!(imgFile instanceof TFile)) continue;
        // Skip if already in the correct .assets directory
        if (imgFile.parent?.path === assetsDir) continue;

        copiedImages.add(resolvedPath);
        const data = await this.app.vault.readBinary(imgFile);
        const targetImgPath = normalizePath(`${assetsDir}/${imgFile.name}`);
        const existing = this.app.vault.getAbstractFileByPath(targetImgPath);
        if (!existing) {
          await this.app.vault.createBinary(targetImgPath, data);
        }
        trashOriginals.push(imgFile);
      }

      // Also re-scan wiki embed links for image copying
      WIKI_EMBED_REGEX.lastIndex = 0;
      while ((match = WIKI_EMBED_REGEX.exec(content)) !== null) {
        const rawPath = match[1].trim();
        if (!rawPath || rawPath.startsWith('http')) continue;

        const resolved = this.app.metadataCache.getFirstLinkpathDest(rawPath, sourceFile.path);
        if (!resolved) continue;

        if (!IMAGE_EXTENSIONS.has(resolved.extension.toLowerCase())) continue;
        if (copiedImages.has(resolved.path)) continue;

        const imgFile = this.app.vault.getAbstractFileByPath(resolved.path);
        if (!(imgFile instanceof TFile)) continue;
        // Skip if already in the correct .assets directory
        if (imgFile.parent?.path === assetsDir) continue;

        copiedImages.add(resolved.path);
        const data = await this.app.vault.readBinary(imgFile);
        const targetImgPath = normalizePath(`${assetsDir}/${imgFile.name}`);
        const existingFile = this.app.vault.getAbstractFileByPath(targetImgPath);
        if (!existingFile) {
          await this.app.vault.createBinary(targetImgPath, data);
        }
        trashOriginals.push(imgFile);
      }

      // Update the note content with new image paths
      await this.app.vault.modify(sourceFile, newContent);
      processed++;
      if (onProgress) onProgress(processed, noteEntries.length);
    }

    // Phase 2: Trash original image files that were copied to new .assets directories
    for (const file of trashOriginals) {
      // Don't trash if the file is already in an .assets directory
      if (file.parent?.path?.endsWith('.assets')) continue;
      await this.app.vault.trash(file, false);
    }

    return processed;
  }

  private resolveImagePath(noteDir: string, rawPath: string): string | null {
    let path = rawPath.replace(/\\/g, '/');
    path = path.replace(/^[A-Za-z]:\//, '');
    path = path.replace(/^\/+/, '');
    path = path.replace(/%20/g, ' ');
    if (path.startsWith('./')) path = path.substring(2);
    // Normalize noteDir: treat '/' same as '' (root)
    noteDir = noteDir.replace(/^\/+$/, '');
    return noteDir ? `${noteDir}/${path}` : path;
  }

  private extractFileName(rawPath: string): string {
    const cleaned = rawPath.replace(/\\/g, '/').replace(/%20/g, ' ');
    const parts = cleaned.split('/');
    return parts[parts.length - 1] || 'image.png';
  }

  private async ensureDir(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const exists = await this.app.vault.adapter.exists(normalized);
    if (!exists) {
      await this.app.vault.adapter.mkdir(normalized);
    }
  }
}
