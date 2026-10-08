import { App, Notice, TFile, normalizePath } from 'obsidian';
import { TyporianSettings } from '../settings';
import { PathUtils } from './path-utils';
import { SUPPORTED_IMAGE_TYPES, MIME_TO_EXT } from './constants';
import { IMAGE_EXTENSIONS } from './constants';
import { createMarkdownImage } from './markdown-images';
import { t } from './locale';

export class ImageHandler {
  private saveQueue: Promise<unknown> = Promise.resolve();
  constructor(private app: App, private settings: TyporianSettings) {}

  updateSettings(settings: TyporianSettings): void { this.settings = settings; }
  shouldIntercept(): boolean { return this.settings.interceptImagePath; }
  captureSettings(): TyporianSettings { return { ...this.settings }; }

  isSupportedImage(file: File): boolean {
    return SUPPORTED_IMAGE_TYPES.has(file.type) ||
      (file.type === '' && IMAGE_EXTENSIONS.has(file.name.split('.').pop()!.toLowerCase()));
  }

  /** Save a captured batch in input order; return links for successfully saved images. */
  saveImages(note: TFile, files: File[], settings: TyporianSettings): Promise<string[]> {
    const batch = this.saveQueue.then(() => this.saveBatch(note, files, settings));
    this.saveQueue = batch.catch(() => undefined);
    return batch;
  }

  private async saveBatch(note: TFile, files: File[], settings: TyporianSettings): Promise<string[]> {
    const folderPath = PathUtils.getAssetFolderPath(note, settings.assetFolderPath);
    const noteDir = note.parent?.path ?? '';
    const links: string[] = [];
    const timestamp = this.getTimestamp();
    for (const [index, file] of files.entries()) {
      try {
        const ext = this.getExtension(file);
        const baseName = settings.namingStrategy === 'timestamp'
          ? timestamp + (files.length > 1 ? '-' + (index + 1) : '') : PathUtils.compatibleImageName(this.getBaseName(file));
        const fileName = settings.autoRenameOnConflict
          ? await PathUtils.getUniqueFileName(this.app.vault, folderPath, baseName, ext)
          : baseName + '.' + ext;
        const vaultPath = normalizePath(folderPath ? folderPath + '/' + fileName : fileName);
        if (!settings.autoRenameOnConflict && await this.app.vault.adapter.exists(vaultPath)) {
          new Notice(t('image.conflict', { path: vaultPath }));
          continue;
        }
        const link = createMarkdownImage(fileName.replace(/\.[^.]+$/, ''),
          PathUtils.computeRelativePath(noteDir, vaultPath));
        const data = await file.arrayBuffer();
        if (folderPath && !await this.app.vault.adapter.exists(folderPath)) {
          await this.app.vault.createFolder(folderPath);
        }
        await this.app.vault.createBinary(vaultPath, data);
        links.push(link);
      } catch (error) {
        new Notice(t('image.error', { name: file.name, message: String(error) }));
        console.error('Typorian Image: image import failed', error);
      }
    }
    return links;
  }

  private getTimestamp(): string {
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1, now.getDate(),
      now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('') +
      String(now.getMilliseconds()).padStart(3, '0');
  }

  private getExtension(file: File): string {
    const ext = file.name.split('.').pop()!.toLowerCase();
    return IMAGE_EXTENSIONS.has(ext) ? ext : MIME_TO_EXT[file.type];
  }

  private getBaseName(file: File): string {
    const dot = file.name.lastIndexOf('.');
    return dot > 0 ? file.name.slice(0, dot) : file.name;
  }
}
