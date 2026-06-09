import { TFile } from 'obsidian';

export interface OrphanImageInfo {
  file: TFile;
  relativePath: string;
  sizeBytes: number;
  sizeDisplay: string;
}

export const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif',
]);

export interface UnresolvableLink {
  rawLink: string;     // the full markdown/wiki link text
  rawPath: string;     // just the path part
  isWiki: boolean;     // wiki or markdown format
  line: number;        // 1-based line number
}
