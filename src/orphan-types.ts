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
