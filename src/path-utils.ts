import { TFile, Vault, normalizePath } from 'obsidian';
import { MIME_TO_EXT } from './constants';

export class PathUtils {
  /**
   * Resolve the asset folder path from the template setting.
   * Replaces ${notename} with the note's basename.
   */
  static getAssetFolderPath(noteFile: TFile, assetFolderTemplate: string): string {
    const dir = noteFile.parent?.path ?? '';
    const resolved = assetFolderTemplate.replace(/\$\{notename\}/g, noteFile.basename);
    // Remove leading ./ if present
    const cleaned = resolved.replace(/^\.\//, '');
    // Remove trailing slash
    const folder = cleaned.replace(/\/$/, '');
    return dir ? `${dir}/${folder}` : folder;
  }

  /**
   * Infer file extension from MIME type.
   */
  static getExtensionFromMime(mimeType: string): string {
    return MIME_TO_EXT[mimeType] ?? 'png';
  }

  /**
   * Generate a unique filename inside the asset folder.
   */
  static async getUniqueFileName(
    vault: Vault,
    folderPath: string,
    baseName: string,
    ext: string
  ): Promise<string> {
    let candidate = `${baseName}.${ext}`;
    let fullPath = normalizePath(`${folderPath}/${candidate}`);
    let counter = 1;

    while (await vault.adapter.exists(fullPath)) {
      candidate = `${baseName}(${counter}).${ext}`;
      fullPath = normalizePath(`${folderPath}/${candidate}`);
      counter++;
    }

    return candidate;
  }

  /**
   * Build the relative path for use inside a Markdown image link.
   * Computes the relative path from the note's directory to the image file.
   */
  static buildRelativePath(noteFile: TFile, imageFileName: string, assetFolderTemplate: string): string {
    const resolved = assetFolderTemplate.replace(/\$\{notename\}/g, noteFile.basename);
    const cleaned = resolved.replace(/^\.\//, '').replace(/\/$/, '');
    const rawPath = `${cleaned}/${imageFileName}`;
    return rawPath
      .split('/')
      .map((seg) => seg.replace(/ /g, '%20'))
      .join('/');
  }
}
