import { App, TFile } from 'obsidian';
import { OrphanImageInfo, IMAGE_EXTENSIONS } from './orphan-types';

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
        file.path.includes('.assets/') &&
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
