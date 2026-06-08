import { App, TFile, normalizePath } from 'obsidian';
import JSZip from 'jszip';
import { TyporianSettings } from './settings';

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

export class ShareManager {
  constructor(
    private app: App,
    private settings: TyporianSettings
  ) {}

  /**
   * Export note and all referenced images as a folder.
   */
  async exportAsFolder(note: TFile, exportPath: string): Promise<void> {
    const content = await this.app.vault.read(note);
    const noteDir = note.parent?.path ?? '';
    const assetsFolder = `${exportPath}/${note.basename}.assets`;

    await this.ensureDir(exportPath);
    await this.ensureDir(assetsFolder);

    const { newContent, copiedImages } = await this.processContent(content, noteDir, note.basename);

    // Copy images to export assets folder
    for (const img of copiedImages) {
      const data = await this.app.vault.readBinary(img.sourceFile);
      const targetPath = `${assetsFolder}/${img.sourceFile.name}`;
      await this.app.vault.createBinary(normalizePath(targetPath), data);
    }

    // Write modified markdown
    const mdPath = `${exportPath}/${note.basename}.md`;
    await this.app.vault.create(normalizePath(mdPath), newContent);
  }

  /**
   * Export note and all referenced images as a ZIP archive.
   */
  async exportAsZip(note: TFile, exportPath: string): Promise<void> {
    const content = await this.app.vault.read(note);
    const noteDir = note.parent?.path ?? '';
    const assetsFolder = `${note.basename}.assets`;

    const zip = new JSZip();
    const { newContent, copiedImages } = await this.processContent(content, noteDir, note.basename);

    // Add markdown file
    zip.file(`${note.basename}.md`, newContent);

    // Add image files
    for (const img of copiedImages) {
      const data = await this.app.vault.readBinary(img.sourceFile);
      zip.file(`${assetsFolder}/${img.sourceFile.name}`, data);
    }

    // Generate and save zip
    const zipData = await zip.generateAsync({ type: 'arraybuffer' });
    const zipPath = `${exportPath}/${note.basename}.zip`;
    await this.app.vault.createBinary(normalizePath(zipPath), zipData);
  }

  private async processContent(
    content: string,
    noteDir: string,
    noteBasename: string
  ): Promise<{ newContent: string; copiedImages: Array<{ sourceFile: TFile; newPath: string }> }> {
    const replacements: Array<{ from: number; to: number; insert: string }> = [];
    const copiedImages: Array<{ sourceFile: TFile; newPath: string }> = [];
    const processedPaths = new Set<string>();
    let match: RegExpExecArray | null;

    MD_IMAGE_REGEX.lastIndex = 0;
    while ((match = MD_IMAGE_REGEX.exec(content)) !== null) {
      const rawPath = match[2];
      if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

      const resolvedPath = this.resolveImagePath(noteDir, rawPath);
      if (!resolvedPath) continue;

      const sourceFile = this.app.vault.getAbstractFileByPath(normalizePath(resolvedPath));
      if (!(sourceFile instanceof TFile)) continue;

      const newRelPath = `${noteBasename}.assets/${sourceFile.name}`;

      if (!processedPaths.has(sourceFile.path)) {
        processedPaths.add(sourceFile.path);
        copiedImages.push({ sourceFile, newPath: newRelPath });
      }

      const alt = match[1];
      replacements.push({
        from: match.index,
        to: match.index + match[0].length,
        insert: `![${alt}](${newRelPath})`,
      });
    }

    // Apply replacements in reverse order
    let newContent = content;
    replacements.sort((a, b) => b.from - a.from);
    for (const r of replacements) {
      newContent = newContent.substring(0, r.from) + r.insert + newContent.substring(r.to);
    }

    return { newContent, copiedImages };
  }

  private resolveImagePath(noteDir: string, rawPath: string): string | null {
    let path = rawPath.replace(/\\/g, '/');
    path = path.replace(/^[A-Za-z]:\//, '');
    path = path.replace(/^\/+/, '');
    path = path.replace(/%20/g, ' ');
    if (path.startsWith('./')) path = path.substring(2);
    return noteDir ? `${noteDir}/${path}` : path;
  }

  private async ensureDir(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const exists = await this.app.vault.adapter.exists(normalized);
    if (!exists) {
      await this.app.vault.adapter.mkdir(normalized);
    }
  }
}
