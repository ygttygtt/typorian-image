import { App, TFile, normalizePath } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { TyporianSettings } from './settings';
import { PathUtils } from './path-utils';
import { SUPPORTED_IMAGE_TYPES, MIME_TO_EXT } from './constants';

export class ImageHandler {
  constructor(
    private app: App,
    private settings: TyporianSettings
  ) {}

  updateSettings(settings: TyporianSettings): void {
    this.settings = settings;
  }

  /**
   * Check if a File is a supported image type.
   */
  isSupportedImage(file: File): boolean {
    return SUPPORTED_IMAGE_TYPES.has(file.type);
  }

  /**
   * Full pipeline: read image -> save to vault -> insert markdown via CM6 dispatch.
   */
  async handleImage(
    view: EditorView,
    file: File,
    insertPos?: number
  ): Promise<void> {
    // 1. Get active note
    const noteFile = this.getActiveNote();
    if (!noteFile) {
      console.warn('Typorian Image: no active note, skipping image insert');
      return;
    }

    // 2. Read binary
    const arrayBuffer = await file.arrayBuffer();

    // 3. Compute paths
    const folderPath = PathUtils.getAssetFolderPath(noteFile, this.settings.assetFolderPath);
    const ext = this.getExtension(file);
    const baseName = this.getBaseName(file);
    const fileName = await PathUtils.getUniqueFileName(
      this.app.vault,
      folderPath,
      baseName,
      ext
    );
    const vaultPath = normalizePath(`${folderPath}/${fileName}`);

    // 4. Ensure folder exists
    await this.ensureFolderExists(folderPath);

    // 5. Save to vault
    await this.app.vault.createBinary(vaultPath, arrayBuffer);

    // 6. Build markdown link
    const relativePath = PathUtils.buildRelativePath(noteFile, fileName, this.settings.assetFolderPath);
    const displayName = fileName.replace(/\.[^.]+$/, '');
    const mdLink = `![${displayName}](${relativePath})`;

    // 7. Insert via CM6 Transaction (atomic: changes + selection in one dispatch)
    const from = insertPos ?? view.state.selection.main.head;
    view.dispatch({
      changes: { from, insert: mdLink },
      selection: { anchor: from + mdLink.length },
      userEvent: 'input.paste',
    });
  }

  private getActiveNote(): TFile | null {
    const leaf = this.app.workspace.activeLeaf;
    if (!leaf) return null;
    const file = (leaf.view as any).file;
    return file instanceof TFile ? file : null;
  }

  private getExtension(file: File): string {
    // Try MIME first, then fall back to file name extension
    if (file.type && MIME_TO_EXT[file.type]) {
      return MIME_TO_EXT[file.type];
    }
    const dotIdx = file.name.lastIndexOf('.');
    if (dotIdx > 0) {
      return file.name.substring(dotIdx + 1).toLowerCase();
    }
    return 'png';
  }

  private getBaseName(file: File): string {
    const dotIdx = file.name.lastIndexOf('.');
    if (dotIdx > 0) {
      return file.name.substring(0, dotIdx);
    }
    return file.name || 'image';
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    const exists = await this.app.vault.adapter.exists(normalized);
    if (!exists) {
      await this.app.vault.adapter.mkdir(normalized);
    }
  }
}
