import { TFile, Vault, normalizePath } from 'obsidian';
import { IMAGE_FILE_NAME_POLICY } from '../settings';

// Complete UTF-8 URI tokens. Other percent text remains part of the literal filename.
const URI_TOKEN = /%(?:[0-7][\da-f]|(?:c[2-9a-f]|d[\da-f])%[89ab][\da-f]|e0%[ab][\da-f]%[89ab][\da-f]|(?:e[1-9abc]|e[ef])%[89ab][\da-f]%[89ab][\da-f]|ed%[89][\da-f]%[89ab][\da-f]|f0%[9ab][\da-f](?:%[89ab][\da-f]){2}|f[1-3](?:%[89ab][\da-f]){3}|f4%8[\da-f](?:%[89ab][\da-f]){2})/gi;

export class PathUtils {
  static compatibleImageName(name: string): string {
    return name.replace(IMAGE_FILE_NAME_POLICY.unsupportedCharacters, IMAGE_FILE_NAME_POLICY.replacement);
  }

  /**
   * Resolve the asset folder path from the template setting.
   * Replaces ${notename} with the note's basename.
   */
  static getAssetFolderPath(noteFile: TFile, assetFolderTemplate: string): string {
    const resolved = assetFolderTemplate.replace(/\$\{notename\}/g, noteFile.basename);
    return this.resolveRelativePath(noteFile.parent?.path ?? '', resolved);
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
    let fullPath = normalizePath(folderPath ? `${folderPath}/${candidate}` : candidate);
    let counter = 1;

    while (await vault.adapter.exists(fullPath)) {
      candidate = `${baseName}(${counter}).${ext}`;
      fullPath = normalizePath(folderPath ? `${folderPath}/${candidate}` : candidate);
      counter++;
    }

    return candidate;
  }

  static encodePath(path: string): string {
    return path.split('/').map(segment =>
      encodeURIComponent(segment).replace(/[!'()*]/g, char =>
        `%${char.charCodeAt(0).toString(16).toUpperCase()}`
      )
    ).join('/');
  }

  static decodePath(path: string): string {
    if (/^[a-z]:[\\/]/i.test(path)) path = path.replace(/\\/g, '/');
    return path.replace(/\\([\\()\[\]<> #?])/g, '$1')
      .replace(URI_TOKEN, token => decodeURIComponent(token));
  }

  /** A reference outside the vault has no vault file identity. */
  static resolveVaultPath(noteDir: string, relativePath: string): string | null {
    if (/^[a-z]:[\\/]/i.test(relativePath)) return null;
    const parts = relativePath.startsWith('/') ? [] : noteDir.split('/').filter(Boolean);
    for (const part of relativePath.split('/')) {
      if (part === '' || part === '.') continue;
      if (part === '..') {
        if (parts.length === 0) return null;
        parts.pop();
      } else parts.push(part);
    }
    return parts.join('/');
  }

  static resolveRelativePath(noteDir: string, relativePath: string): string {
    const path = this.resolveVaultPath(noteDir, relativePath);
    if (path === null) throw new Error(`Path leaves the vault: ${relativePath}`);
    return path;
  }

  /**
   * Compute relative path from noteDir to targetPath.
   * Handles root directory (empty noteDir) correctly.
   */
  static computeRelativePath(noteDir: string, targetPath: string): string {
    const noteParts = noteDir.split('/').filter(s => s !== '');
    const targetParts = targetPath.split('/');
    let commonLen = 0;
    for (let i = 0; i < Math.min(noteParts.length, targetParts.length - 1); i++) {
      if (noteParts[i] === targetParts[i]) commonLen++;
      else break;
    }
    const upCount = noteParts.length - commonLen;
    const remaining = targetParts.slice(commonLen);
    return '../'.repeat(upCount) + remaining.join('/');
  }
}
