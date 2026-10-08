import { App, TFile, normalizePath } from 'obsidian';
import { TyporianSettings } from '../settings';
import { PathUtils } from './path-utils';
import { assignImageNames, collectImageReferences, countUnpackagedReferences, ImageReference, rewriteImageReferences } from './share-manager';

export interface RestructureEntry {
  sourcePath: string;
  targetPath: string;
  type: 'note' | 'image';
  notePath: string;
  imageCount?: number;
  unresolvedCount?: number;
}

export interface RestructurePlan {
  entries: RestructureEntry[];
  noteEntries: RestructureEntry[];
  totalNotes: number;
  totalImages: number;
  outputDir: string;
}

export class RestructureManager {
  constructor(private app: App, private settings: TyporianSettings) {}

  async preview(): Promise<RestructurePlan> {
    const outputDir = await this.uniqueOutputDir();
    const entries: RestructureEntry[] = [];
    const noteEntries: RestructureEntry[] = [];
    const mdFiles = this.app.vault.getMarkdownFiles().filter(file => !this.isOutputNote(file.path));
    let totalImages = 0;
    for (const note of mdFiles) {
      const content = await this.app.vault.read(note);
      const refs = collectImageReferences(this.app, note, content, this.settings.manualAttachmentFolder);
      const names = assignImageNames(refs);
      const targetPath = `${outputDir}/${note.path}`;
      const noteEntry: RestructureEntry = {
        sourcePath: note.path, targetPath, type: 'note', notePath: note.path, imageCount: names.size, unresolvedCount: countUnpackagedReferences(content, refs),
      };
      entries.push(noteEntry);
      noteEntries.push(noteEntry);
      const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
      for (const [sourcePath, name] of names) {
        entries.push({
          sourcePath, targetPath: `${targetDir}/${note.basename}.assets/${name}`,
          type: 'image', notePath: note.path,
        });
      }
      totalImages += names.size;
    }
    return { entries, noteEntries, totalNotes: mdFiles.length, totalImages, outputDir };
  }

  /** Each selected note receives its own complete attachment set in a new output directory. */
  async apply(plan: RestructurePlan, selectedPaths: Set<string>): Promise<string> {
    const outputDir = await this.uniqueOutputDir();
    await this.ensureDir(outputDir);
    for (const entry of plan.noteEntries.filter(e => selectedPaths.has(e.sourcePath))) {
      const note = this.app.vault.getAbstractFileByPath(entry.sourcePath);
      if (!(note instanceof TFile)) throw new Error(entry.sourcePath);
      const content = await this.app.vault.read(note);
      const refs = collectImageReferences(this.app, note, content, this.settings.manualAttachmentFolder);
      const noteTarget = `${outputDir}/${note.path}`;
      const targetDir = noteTarget.substring(0, noteTarget.lastIndexOf('/'));
      await this.ensureDir(targetDir);
      const paths = await this.copyImages(note, refs, `${targetDir}/${note.basename}.assets`);
      await this.app.vault.create(normalizePath(noteTarget), rewriteImageReferences(content, refs, paths, true));
    }
    return outputDir;
  }

  /** Original images remain available for unselected notes and other kinds of links. */
  async applyOverwrite(
    plan: RestructurePlan,
    selectedPaths: Set<string>,
    onProgress?: (current: number, total: number) => void
  ): Promise<number> {
    const entries = plan.noteEntries.filter(e => selectedPaths.has(e.sourcePath));
    let processed = 0;
    for (const entry of entries) {
      const note = this.app.vault.getAbstractFileByPath(entry.sourcePath);
      if (!(note instanceof TFile)) throw new Error(entry.sourcePath);
      const content = await this.app.vault.read(note);
      const refs = collectImageReferences(this.app, note, content, this.settings.manualAttachmentFolder);
      const noteDir = (note.parent?.path ?? '').replace(/^\/+$/, '');
      const assetsDir = normalizePath(noteDir ? `${noteDir}/${note.basename}.assets` : `${note.basename}.assets`);
      const paths = await this.copyImages(note, refs, assetsDir);
      const newContent = rewriteImageReferences(content, refs, paths, true);
      if (newContent !== content) await this.app.vault.modify(note, newContent);
      processed++;
      onProgress?.(processed, entries.length);
    }
    return processed;
  }

  private async copyImages(note: TFile, refs: ImageReference[], assetsDir: string): Promise<Map<string, string>> {
    const paths = new Map<string, string>();
    const names = assignImageNames(refs);
    if (refs.length > 0) await this.ensureDir(assetsDir);
    for (const { sourceFile } of refs) {
      if (paths.has(sourceFile.path)) continue;
      let targetPath = sourceFile.path;
      const preferred = names.get(sourceFile.path)!;
      if (sourceFile.parent?.path !== assetsDir || preferred !== sourceFile.name) {
        const basename = preferred.substring(0, preferred.lastIndexOf('.'));
        const name = await PathUtils.getUniqueFileName(this.app.vault, assetsDir, basename, sourceFile.extension);
        targetPath = normalizePath(`${assetsDir}/${name}`);
        await this.app.vault.createBinary(targetPath, await this.app.vault.readBinary(sourceFile));
      }
      // Relative links are based on the original directory, shared by its sandbox copy.
      paths.set(sourceFile.path, `${note.basename}.assets/${targetPath.substring(targetPath.lastIndexOf('/') + 1)}`);
    }
    return paths;
  }

  private isOutputNote(path: string): boolean {
    const root = normalizePath(this.settings.restructureOutputFolder).replace(/\/$/, '');
    const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}(?:\\(\\d+\\))?/`).test(path);
  }

  private async uniqueOutputDir(): Promise<string> {
    const base = normalizePath(this.settings.restructureOutputFolder).replace(/\/$/, '');
    let path = base;
    let counter = 1;
    while (await this.app.vault.adapter.exists(path)) path = `${base}(${counter++})`;
    return path;
  }

  private async ensureDir(path: string): Promise<void> {
    let current = '';
    for (const part of path.split('/').filter(Boolean)) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) await this.app.vault.createFolder(current);
    }
  }
}
