import { App, TFile, editorInfoField } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { IMAGE_EXTENSIONS, UnresolvableLink } from './orphan-types';
import { extractCodeBlockRanges, isInsideCodeBlock } from './code-block-filter';
import { TyporianSettings } from '../settings';
import { PathUtils } from './path-utils';
import { parseMarkdownImages, createMarkdownImage, isRemoteImagePath, parseWikiImages, resolveWikiImage, resolveMarkdownImage } from './markdown-images';

interface BrokenMatch {
  from: number;
  to: number;
  alt: string;
  path: string;
  title: string;
  isWiki: boolean;
  resolved: TFile | null;
}

export interface RepairResult {
  brokenFixed: number;
  wikiConverted: number;
  total: number;
}

export interface RepairAllResult extends RepairResult { scanned: number; }

export class BrokenLinkRepairer {
  constructor(private app: App, private settings?: TyporianSettings) {}

  private isImage(file: unknown): file is TFile {
    return file instanceof TFile && IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
  }

  private buildVaultImageIndex(): Map<string, TFile[]> {
    const index = new Map<string, TFile[]>();
    for (const file of this.app.vault.getFiles()) {
      if (!this.isImage(file)) continue;
      const files = index.get(file.name) ?? [];
      files.push(file);
      index.set(file.name, files);
    }
    return index;
  }

  private uniqueName(path: string, images: Map<string, TFile[]>): TFile | null {
    const name = path.split('/').pop() ?? '';
    const candidates = images.get(name) ?? [];
    return candidates.length === 1 ? candidates[0] : null;
  }

  private findLinks(content: string, noteDir: string, images: Map<string, TFile[]>, sourcePath: string): BrokenMatch[] {
    const links: BrokenMatch[] = [];
    const ranges = (!this.settings || this.settings.scanCodeBlocks) ? [] : extractCodeBlockRanges(content);
    for (const image of parseMarkdownImages(content)) {
      if (isInsideCodeBlock(image.index, ranges) || isRemoteImagePath(image.path)) continue;
      const path = PathUtils.decodePath(image.path);
      if (!IMAGE_EXTENSIONS.has(path.split('.').pop()?.toLowerCase() ?? '')) continue;
      if (PathUtils.resolveVaultPath(noteDir, path) === null) continue;
      const exact = resolveMarkdownImage(this.app, sourcePath, path);
      if (exact && createMarkdownImage(image.alt, PathUtils.computeRelativePath(noteDir, exact.path), image.title) === image.raw) continue;
      links.push({ from: image.index, to: image.index + image.raw.length, alt: image.alt,
        path, title: image.title, isWiki: false, resolved: exact ?? this.uniqueName(path, images) });
    }
    if (this.settings?.enableWikiLinkConversion) {
      for (const image of parseWikiImages(content, this.settings.scanCodeBlocks)) {
        const path = image.path;
        if (!path || isRemoteImagePath(path)) continue;
        const { file: resolved } = resolveWikiImage(this.app, sourcePath, path, this.settings.manualAttachmentFolder);
        if (!resolved && !IMAGE_EXTENSIONS.has(path.split('.').pop()?.toLowerCase() ?? '')) continue;
        links.push({ from: image.index, to: image.index + image.raw.length, alt: image.alt,
          path, title: '', isWiki: true, resolved });
      }
    }
    return links;
  }

  private replacements(content: string, noteDir: string, images: Map<string, TFile[]>, sourcePath: string):
    Array<{ from: number; to: number; insert: string; isWiki: boolean }> {
    return this.findLinks(content, noteDir, images, sourcePath).filter(link => link.resolved).map(link => ({
      from: link.from, to: link.to, isWiki: link.isWiki,
      insert: createMarkdownImage(link.alt, PathUtils.computeRelativePath(noteDir, link.resolved!.path), link.title),
    }));
  }

  async repair(view: EditorView): Promise<RepairResult | null> {
    const file = view.state.field(editorInfoField).file;
    if (!file) return null;
    const content = view.state.doc.toString();
    const replacements = this.replacements(content, file.parent?.path ?? '', this.buildVaultImageIndex(), file.path);
    if (replacements.length > 0) {
      view.dispatch({ changes: replacements.sort((a, b) => a.from - b.from).map(({ from, to, insert }) => ({ from, to, insert })) });
    }
    const wikiConverted = replacements.filter(r => r.isWiki).length;
    return { brokenFixed: replacements.length - wikiConverted, wikiConverted, total: replacements.length };
  }

  async repairAll(): Promise<RepairAllResult> {
    const images = this.buildVaultImageIndex();
    let scanned = 0;
    let brokenFixed = 0;
    let wikiConverted = 0;
    for (const file of this.app.vault.getMarkdownFiles()) {
      scanned++;
      const scannedContent = await this.app.vault.read(file);
      if (this.replacements(scannedContent, file.parent?.path ?? '', images, file.path).length === 0) continue;
      await this.app.vault.process(file, content => {
        const replacements = this.replacements(content, file.parent?.path ?? '', images, file.path);
        for (const replacement of replacements.sort((a, b) => b.from - a.from)) {
          content = content.slice(0, replacement.from) + replacement.insert + content.slice(replacement.to);
          if (replacement.isWiki) wikiConverted++;
          else brokenFixed++;
        }
        return content;
      });
    }
    return { scanned, brokenFixed, wikiConverted, total: brokenFixed + wikiConverted };
  }

  findUnresolvableLinks(content: string, noteDir: string, sourcePath: string): UnresolvableLink[] {
    const images = this.buildVaultImageIndex();
    return this.findLinks(content, noteDir, images, sourcePath).filter(link => !link.resolved && (images.get(link.path.split('/').pop() ?? '')?.length ?? 0) === 0).map(link => ({
      rawLink: content.slice(link.from, link.to), rawPath: link.path, isWiki: link.isWiki,
      line: content.slice(0, link.from).split('\n').length,
    }));
  }
}
