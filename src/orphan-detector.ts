import { App, TFile } from 'obsidian';
import { OrphanImageInfo, IMAGE_EXTENSIONS } from './orphan-types';
import { parseMarkdownImages, isRemoteImagePath, parseWikiImages, resolveMarkdownImage } from './markdown-images';
import { PathUtils } from './path-utils';
import { extractCodeBlockRanges, isInsideCodeBlock } from './code-block-filter';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class OrphanDetector {
  constructor(private app: App) {}

  /**
   * Scan all .assets folders and return images not referenced by any note.
   * Uses metadataCache.resolvedLinks for efficient O(N*L) detection.
   */
  async scan(): Promise<OrphanImageInfo[]> {
    // Step 1: Collect all image files under .assets folders
    const candidateImages = this.app.vault.getFiles().filter((file) => {
      return (
        file.path.split('/').slice(0, -1).some(folder => folder.endsWith('.assets')) &&
        IMAGE_EXTENSIONS.has(file.extension.toLowerCase())
      );
    });

    if (candidateImages.length === 0) return [];

    // Step 2: Build set of all referenced file paths from resolvedLinks
    const referencedPaths = new Set<string>();
    const resolvedLinks = this.app.metadataCache.resolvedLinks;
    if (resolvedLinks) {
      for (const sourceFile in resolvedLinks) {
        const links = resolvedLinks[sourceFile];
        for (const targetPath in links) {
          referencedPaths.add(targetPath);
        }
      }
    }

    // Resolve disk-relative Markdown paths from current source contents as well:
    // metadataCache may still be updating immediately after a link edit.
    for (const note of this.app.vault.getMarkdownFiles()) {
      const content = await this.app.vault.read(note);
      const codeRanges = extractCodeBlockRanges(content);
      for (const image of parseMarkdownImages(content)) {
        if (isInsideCodeBlock(image.index, codeRanges) || isRemoteImagePath(image.path)) continue;
        const target = resolveMarkdownImage(this.app, note.path, PathUtils.decodePath(image.path));
        if (target) referencedPaths.add(target.path);
      }
      for (const image of parseWikiImages(content)) {
        const target = this.app.metadataCache.getFirstLinkpathDest(image.path, note.path);
        if (target) referencedPaths.add(target.path);
      }
    }

    // Step 3: Compute difference -- images not in referenced set
    const orphanFiles = candidateImages.filter(
      (file) => !referencedPaths.has(file.path)
    );

    // Step 4: Map to OrphanImageInfo[]
    return orphanFiles.map((file) => ({
      file,
      relativePath: file.path,
      sizeBytes: file.stat.size,
      sizeDisplay: formatSize(file.stat.size),
    }));
  }
}
