import { App, TFile, normalizePath } from 'obsidian';
import JSZip from 'jszip';
import { TyporianSettings } from '../settings';
import { PathUtils } from './path-utils';
import { createMarkdownImage, isRemoteImagePath, parseMarkdownImages, parseWikiImages, resolveWikiImage, resolveMarkdownImage } from './markdown-images';
import { extractCodeBlockRanges, isInsideCodeBlock } from './code-block-filter';
import { IMAGE_EXTENSIONS } from './orphan-types';
import { t } from './locale';

export interface ImageReference {
  index: number;
  raw: string;
  alt: string;
  title: string;
  sourceFile: TFile;
}

/** Resolve actual attachments once, preserving unresolved links and code examples. */
export function collectImageReferences(app: App, note: TFile, content: string, manualFolder = ''): ImageReference[] {
  const refs: ImageReference[] = [];
  const codeRanges = extractCodeBlockRanges(content);
  for (const image of parseMarkdownImages(content)) {
    if (isInsideCodeBlock(image.index, codeRanges) || isRemoteImagePath(image.path)) continue;
    const file = resolveMarkdownImage(app, note.path, PathUtils.decodePath(image.path));
    if (file instanceof TFile && IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) {
      refs.push({ ...image, sourceFile: file });
    }
  }
  for (const image of parseWikiImages(content)) {
    const { file } = resolveWikiImage(app, note.path, image.path, manualFolder);
    if (file instanceof TFile && IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) {
      refs.push({ ...image, title: '', sourceFile: file });
    }
  }
  return refs;
}

/** Assign distinct names even when source attachments have identical basenames. */
export function assignImageNames(refs: ImageReference[]): Map<string, string> {
  const names = new Map<string, string>();
  const used = new Set<string>();
  for (const { sourceFile } of refs) {
    if (names.has(sourceFile.path)) continue;
    const basename = PathUtils.compatibleImageName(sourceFile.basename);
    let name = `${basename}.${sourceFile.extension}`;
    let counter = 1;
    while (used.has(name.toLowerCase())) {
      name = `${basename}(${counter++}).${sourceFile.extension}`;
    }
    names.set(sourceFile.path, name);
    used.add(name.toLowerCase());
  }
  return names;
}

export function rewriteImageReferences(content: string, refs: ImageReference[], paths: Map<string, string>): string {
  for (const ref of refs.slice().sort((a, b) => b.index - a.index)) {
    const insert = createMarkdownImage(ref.alt, paths.get(ref.sourceFile.path)!, ref.title);
    content = content.substring(0, ref.index) + insert + content.substring(ref.index + ref.raw.length);
  }
  return content;
}

export class ShareManager {
  constructor(private app: App, private settings: TyporianSettings) {}

  async exportAsFolder(note: TFile, exportPath: string): Promise<string> {
    const parent = this.resolveExportDirectory(exportPath);
    await this.ensureDir(parent);
    const output = await this.uniqueDirectory(parent, note.basename);
    await this.ensureDir(output);
    const assetsFolder = `${output}/${note.basename}.assets`;
    const { newContent, copiedImages } = await this.processContent(note);
    if (copiedImages.length > 0) await this.ensureDir(assetsFolder);
    for (const img of copiedImages) {
      const data = await this.app.vault.readBinary(img.sourceFile);
      await this.app.vault.createBinary(normalizePath(`${output}/${img.newPath}`), data);
    }
    await this.app.vault.create(normalizePath(`${output}/${note.name}`), newContent);
    return output;
  }

  async exportAsZip(note: TFile, exportPath: string): Promise<string> {
    const parent = this.resolveExportDirectory(exportPath);
    await this.ensureDir(parent);
    const { newContent, copiedImages } = await this.processContent(note);
    const zip = new JSZip();
    zip.file(note.name, newContent);
    for (const img of copiedImages) {
      zip.file(img.newPath, await this.app.vault.readBinary(img.sourceFile));
    }
    const zipName = await PathUtils.getUniqueFileName(this.app.vault, parent, note.basename, 'zip');
    const output = normalizePath(parent ? `${parent}/${zipName}` : zipName);
    await this.app.vault.createBinary(output, await zip.generateAsync({ type: 'arraybuffer' }));
    return output;
  }

  private async processContent(note: TFile): Promise<{
    newContent: string;
    copiedImages: Array<{ sourceFile: TFile; newPath: string }>;
  }> {
    const content = await this.app.vault.read(note);
    const refs = collectImageReferences(this.app, note, content, this.settings.manualAttachmentFolder);
    const names = assignImageNames(refs);
    const paths = new Map<string, string>();
    const copiedImages: Array<{ sourceFile: TFile; newPath: string }> = [];
    for (const { sourceFile } of refs) {
      if (paths.has(sourceFile.path)) continue;
      const newPath = `${note.basename}.assets/${names.get(sourceFile.path)!}`;
      paths.set(sourceFile.path, newPath);
      copiedImages.push({ sourceFile, newPath });
    }
    return { newContent: rewriteImageReferences(content, refs, paths), copiedImages };
  }

  private resolveExportDirectory(path: string): string {
    const cleaned = path.trim().replace(/\\/g, '/');
    if (cleaned.startsWith('/') || /^[A-Za-z]:/.test(cleaned) || cleaned.split('/').includes('..')) {
      throw new Error(t('share.invalidPath'));
    }
    return cleaned ? normalizePath(cleaned) : '';
  }

  private async uniqueDirectory(parent: string, basename: string): Promise<string> {
    let name = basename;
    let counter = 1;
    let path = normalizePath(parent ? `${parent}/${name}` : name);
    while (await this.app.vault.adapter.exists(path)) {
      name = `${basename}(${counter++})`;
      path = normalizePath(parent ? `${parent}/${name}` : name);
    }
    return path;
  }

  private async ensureDir(path: string): Promise<void> {
    const segments = path.split('/').filter(Boolean);
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!(await this.app.vault.adapter.exists(current))) await this.app.vault.createFolder(current);
    }
  }
}
