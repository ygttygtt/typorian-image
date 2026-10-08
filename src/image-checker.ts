import { App, TFile } from 'obsidian';
import { TyporianSettings } from '../settings';
import { IMAGE_EXTENSIONS } from './constants';
import { PathUtils } from './path-utils';
import { createMarkdownImage, isRemoteImagePath, parseMarkdownImages, parseWikiImages,
  resolveMarkdownImage, resolveActualWikiImage } from './markdown-images';
import { extractCodeBlockRanges, isInsideCodeBlock } from './code-block-filter';
import { CheckScope, ImageIssue, IssueScan, UnusedImage, UnusedScan, CheckActionResult, TrashResult } from './image-check-types';

export class ImageChecker {
  constructor(private app: App, private settings: TyporianSettings) {}

  getImageFiles(): TFile[] {
    return this.app.vault.getFiles().filter(file => IMAGE_EXTENSIONS.has(file.extension.toLowerCase()));
  }

  private imageIndex(): Map<string, TFile[]> {
    const index = new Map<string, TFile[]>();
    for (const file of this.getImageFiles()) {
      const files = index.get(file.name) ?? [];
      files.push(file);
      index.set(file.name, files);
    }
    return index;
  }

  private notes(scope: CheckScope, note: TFile | null): TFile[] {
    return scope === 'all' ? this.app.vault.getMarkdownFiles() : note ? [note] : [];
  }

  private compatible(file: TFile): boolean {
    return file.path.split('/').every(part => PathUtils.compatibleImageName(part) === part);
  }

  /** Resolve existing targets separately from suggested repair candidates. */
  private inspect(note: TFile, content: string, index: Map<string, TFile[]>):
    IssueScan & { referenced: Set<string> } {
    const issues: ImageIssue[] = [];
    const referenced = new Set<string>();
    const noteDir = note.parent?.path ?? '';
    const ranges = extractCodeBlockRanges(content);
    let externalCount = 0;
    const images = [
      ...parseMarkdownImages(content).filter(image => !isInsideCodeBlock(image.index, ranges))
        .map(image => ({ ...image, syntax: 'markdown' as const })),
      ...parseWikiImages(content).map(image => ({ ...image, title: '', syntax: 'wiki' as const })),
    ].sort((a, b) => a.index - b.index);
    const nativeEmbeds = new Map(this.app.metadataCache.getFileCache(note)?.embeds?.map(embed =>
      [embed.position.start.offset, embed]) ?? []);
    for (const image of images) {
      const path = image.syntax === 'markdown' ? PathUtils.decodePath(image.path) : image.path;
      if (isRemoteImagePath(path) || PathUtils.resolveVaultPath(noteDir, path) === null) {
        externalCount++;
        continue;
      }
      const actual = image.syntax === 'markdown'
        ? resolveMarkdownImage(this.app, note.path, path)
        : resolveActualWikiImage(this.app, note.path, path, this.settings.manualAttachmentFolder);
      if (actual) referenced.add(actual.path);
      const embed = nativeEmbeds.get(image.index);
      const nativePath = image.syntax === 'markdown' && actual && this.compatible(actual) ? path : image.path;
      const native = embed?.original === image.raw
        ? this.app.metadataCache.getFirstLinkpathDest(embed.link, note.path)
        : this.app.metadataCache.getFirstLinkpathDest(nativePath, note.path);
      if (actual && native === actual) continue;
      const name = path.split('/').pop() ?? '';
      if (!actual && !IMAGE_EXTENSIONS.has(name.split('.').pop()?.toLowerCase() ?? '')) continue;
      const candidates = actual ? [actual] : index.get(name) ?? [];
      const target = candidates.length === 1 ? candidates[0] : null;
      const status = actual && !this.compatible(actual) ? 'incompatible'
        : candidates.length === 1 ? 'candidate' : candidates.length > 1 ? 'ambiguous' : 'missing';
      const lineStart = content.lastIndexOf('\n', image.index - 1) + 1;
      const nextLine = content.indexOf('\n', image.index + image.raw.length);
      issues.push({ id: `${note.path}:${image.index}`, note, from: image.index,
        to: image.index + image.raw.length, line: content.slice(0, image.index).split('\n').length,
        excerpt: content.slice(lineStart, nextLine === -1 ? content.length : nextLine),
        raw: image.raw, path, syntax: image.syntax, alt: image.alt, title: image.title,
        status, candidates, target, content });
    }
    return { issues, referenced, externalCount, scannedNotes: 1 };
  }

  async scanIssues(scope: CheckScope, note: TFile | null): Promise<IssueScan> {
    const index = this.imageIndex();
    const result: IssueScan = { issues: [], externalCount: 0, scannedNotes: 0 };
    for (const file of this.notes(scope, note)) {
      const scan = this.inspect(file, await this.app.vault.read(file), index);
      result.issues.push(...scan.issues);
      result.externalCount += scan.externalCount;
      result.scannedNotes++;
    }
    return result;
  }

  async scanUnused(scope: CheckScope, note: TFile | null): Promise<UnusedScan> {
    const notes = this.app.vault.getMarkdownFiles();
    const folders = new Set<string>();
    if (scope === 'current') {
      if (note) folders.add(PathUtils.getAssetFolderPath(note, this.settings.assetFolderPath));
    } else {
      for (const file of notes) folders.add(PathUtils.getAssetFolderPath(file, this.settings.assetFolderPath));
      for (const file of this.getImageFiles()) {
        const segments = file.path.split('/');
        for (let i = 0; i < segments.length - 1; i++) {
          if (segments[i].endsWith('.assets')) folders.add(segments.slice(0, i + 1).join('/'));
        }
      }
    }
    const candidates = this.getImageFiles().filter(file =>
      Array.from(folders).some(folder => folder === '' || file.path.startsWith(`${folder}/`)));
    if (!candidates.length) return { images: [], folders: Array.from(folders) };
    const referenced = new Set<string>();
    for (const links of Object.values(this.app.metadataCache.resolvedLinks)) {
      for (const path of Object.keys(links)) referenced.add(path);
    }
    const related = new Map<string, ImageIssue[]>();
    const index = this.imageIndex();
    // Global reference judgment is necessary for shared images. Candidate hints reuse this pass.
    for (const file of notes) {
      const scan = this.inspect(file, await this.app.vault.read(file), index);
      for (const path of scan.referenced) referenced.add(path);
      for (const issue of scan.issues) {
        for (const candidate of issue.candidates) {
          const links = related.get(candidate.path) ?? [];
          links.push(issue);
          related.set(candidate.path, links);
        }
      }
    }
    return { folders: Array.from(folders), images: candidates.filter(file => !referenced.has(file.path))
      .map(file => ({ file, relatedIssues: related.get(file.path) ?? [] })) };
  }

  private async ensureFolder(path: string): Promise<void> {
    let current = '';
    for (const segment of path.split('/').filter(Boolean)) {
      current = current ? `${current}/${segment}` : segment;
      if (!await this.app.vault.adapter.exists(current)) await this.app.vault.createFolder(current);
    }
  }

  async apply(issues: ImageIssue[], action: 'repair' | 'delete'): Promise<CheckActionResult> {
    const result: CheckActionResult = { repaired: 0, deleted: 0, notes: 0, copies: 0, changed: 0 };
    const byNote = new Map<string, ImageIssue[]>();
    for (const issue of issues) {
      if (action === 'repair' && !issue.target) continue;
      const items = byNote.get(issue.note.path) ?? [];
      items.push(issue);
      byNote.set(issue.note.path, items);
    }
    const copied = new Map<string, TFile>();
    for (const items of byNote.values()) {
      const note = items[0].note;
      const snapshot = items[0].content;
      if (await this.app.vault.read(note) !== snapshot) { result.changed += items.length; continue; }
      const replacements: Array<{ issue: ImageIssue; insert: string }> = [];
      const newFiles: TFile[] = [];
      for (const issue of items) {
        let insert = '';
        if (action === 'repair') {
          let target = issue.target!;
          if (!this.compatible(target)) {
            const folder = PathUtils.getAssetFolderPath(note, this.settings.assetFolderPath);
            if (folder.split('/').some(part => PathUtils.compatibleImageName(part) !== part)) {
              throw new Error(`Attachment directory contains unsupported characters: ${folder}`);
            }
            const key = `${target.path}:${folder}`;
            const existing = copied.get(key);
            if (existing) target = existing;
            else {
              await this.ensureFolder(folder);
              const name = await PathUtils.getUniqueFileName(this.app.vault, folder,
                PathUtils.compatibleImageName(target.basename), target.extension);
              const path = folder ? `${folder}/${name}` : name;
              target = await this.app.vault.createBinary(path, await this.app.vault.readBinary(target));
              copied.set(key, target);
              newFiles.push(target);
            }
          }
          insert = issue.syntax === 'wiki'
            ? `![[${target.path}${issue.alt ? `|${issue.alt}` : ''}]]`
            : createMarkdownImage(issue.alt, PathUtils.computeRelativePath(note.parent?.path ?? '', target.path), issue.title);
        }
        replacements.push({ issue, insert });
      }
      let applied = false;
      await this.app.vault.process(note, content => {
        if (content !== snapshot) { result.changed += items.length; return content; }
        for (const { issue, insert } of replacements.sort((a, b) => b.issue.from - a.issue.from)) {
          content = content.slice(0, issue.from) + insert + content.slice(issue.to);
        }
        applied = true;
        return content;
      });
      if (applied) {
        result.notes++;
        result.copies += newFiles.length;
        if (action === 'repair') result.repaired += replacements.length;
        else result.deleted += replacements.length;
      } else {
        for (const file of newFiles) {
          await this.app.vault.delete(file);
          for (const [key, value] of copied) if (value === file) copied.delete(key);
        }
      }
    }
    return result;
  }

  async trash(images: UnusedImage[], scope: CheckScope, note: TFile | null): Promise<TrashResult> {
    const current = new Map((await this.scanUnused(scope, note)).images.map(image => [image.file.path, image]));
    const result: TrashResult = { files: 0, bytes: 0, changed: 0 };
    for (const image of images) {
      const available = current.get(image.file.path);
      if (!available) { result.changed++; continue; }
      result.bytes += available.file.stat.size;
      await this.app.vault.trash(available.file, false);
      result.files++;
    }
    return result;
  }
}
