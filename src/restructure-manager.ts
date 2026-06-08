import { App, TFile, normalizePath } from 'obsidian';
import { TyporianSettings } from './settings';

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

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
      const noteDir = mdFile.parent?.path ?? '';
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
      const noteDir = sourceFile.parent?.path ?? '';
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

  private resolveImagePath(noteDir: string, rawPath: string): string | null {
    let path = rawPath.replace(/\\/g, '/');
    path = path.replace(/^[A-Za-z]:\//, '');
    path = path.replace(/^\/+/, '');
    path = path.replace(/%20/g, ' ');
    if (path.startsWith('./')) path = path.substring(2);
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
