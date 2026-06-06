import { App, TFile, Vault, normalizePath } from 'obsidian';
import { MIME_TO_EXT } from './constants';

export class PathUtils {
  /**
   * Get the active markdown note's TFile, or null if none.
   */
  static getActiveNoteFile(app: App): TFile | null {
    const view = app.workspace.getActiveViewOfType(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (app as any).viewRegistry?.getTypeByName?.('markdown')?.view ??
        undefined
    );
    // Fallback: use workspace.activeLeaf
    const file = (app.workspace as any).activeLeaf?.view?.file as
      | TFile
      | undefined;
    return file instanceof TFile ? file : null;
  }

  /**
   * Build the vault-relative path for the .assets folder.
   * e.g. note "folder/mynote.md" -> "folder/mynote.assets"
   */
  static getAssetFolderPath(noteFile: TFile): string {
    const dir = noteFile.parent?.path ?? '';
    const baseName = noteFile.basename;
    const folderName = `${baseName}.assets`;
    return dir ? `${dir}/${folderName}` : folderName;
  }

  /**
   * Infer file extension from MIME type.
   */
  static getExtensionFromMime(mimeType: string): string {
    return MIME_TO_EXT[mimeType] ?? 'png';
  }

  /**
   * Generate a unique filename inside the asset folder.
   * If "image.png" exists -> "image(1).png" -> "image(2).png" ...
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
   * Result is URL-encoded (spaces -> %20), slashes preserved.
   */
  static buildRelativePath(noteFile: TFile, imageFileName: string): string {
    const folderName = `${noteFile.basename}.assets`;
    const rawPath = `${folderName}/${imageFileName}`;
    // Encode spaces and special chars, keep slashes
    return rawPath
      .split('/')
      .map((seg) => seg.replace(/ /g, '%20'))
      .join('/');
  }
}
