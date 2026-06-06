import { App, Modal, Notice, TFile, MarkdownView } from 'obsidian';
import { OrphanDetector } from './orphan-detector';
import { OrphanImageInfo } from './orphan-types';
import { BrokenLinkRepairer } from './broken-link-repairer';
import { t } from './locale';

// SVG icons (Lucide)
const ICON_FOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_NOTE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
const ICON_REFRESH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;

export class OrphanImageModal extends Modal {
  private detector: OrphanDetector;
  private repairer: BrokenLinkRepairer;
  private orphans: OrphanImageInfo[] = [];
  private checkboxes: Map<string, HTMLInputElement> = new Map();
  private selectAllCheckbox: HTMLInputElement | null = null;
  private cleanupButton: HTMLButtonElement | null = null;
  private listContainer: HTMLDivElement | null = null;
  private headerContainer: HTMLDivElement | null = null;

  constructor(app: App) {
    super(app);
    this.detector = new OrphanDetector(app);
    this.repairer = new BrokenLinkRepairer(app);
  }

  async onOpen(): Promise<void> {
    this.titleEl.setText(t('orphan.title'));
    await this.scanAndRender();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async scanAndRender(): Promise<void> {
    this.contentEl.empty();
    this.checkboxes.clear();

    this.contentEl.createEl('p', {
      text: t('orphan.scanning'),
      cls: 'orphan-status',
    });

    this.orphans = await this.detector.scan();
    this.contentEl.empty();

    if (this.orphans.length === 0) {
      this.contentEl.createEl('p', {
        text: t('orphan.empty'),
        cls: 'orphan-status',
      });
      this.renderFooter();
      return;
    }

    this.renderHeader();
    this.renderList();
    this.renderFooter();
  }

  private renderHeader(): void {
    this.headerContainer = this.contentEl.createDiv({ cls: 'orphan-header' });

    const selectAllLabel = this.headerContainer.createEl('label', { cls: 'orphan-select-all-label' });
    this.selectAllCheckbox = selectAllLabel.createEl('input', { type: 'checkbox' });
    selectAllLabel.createSpan({ text: t('orphan.selectAll') });

    this.selectAllCheckbox.addEventListener('change', () => {
      const checked = this.selectAllCheckbox!.checked;
      this.checkboxes.forEach((cb) => { cb.checked = checked; });
      this.updateCleanupButton();
    });

    this.updateSummary();
  }

  private updateSummary(): void {
    const oldSummary = this.headerContainer?.querySelector('.orphan-summary');
    if (oldSummary) oldSummary.remove();

    const totalSize = this.orphans.reduce((sum, o) => sum + o.sizeBytes, 0);
    const sizeStr = this.formatTotalSize(totalSize);
    this.headerContainer?.createSpan({
      text: `${this.orphans.length} ${t('orphan.summary')} ${sizeStr}`,
      cls: 'orphan-summary',
    });
  }

  private renderList(): void {
    this.listContainer = this.contentEl.createDiv({ cls: 'orphan-list' });

    for (const orphan of this.orphans) {
      const item = this.listContainer.createDiv({ cls: 'orphan-item' });

      // Checkbox
      const checkbox = item.createEl('input', { type: 'checkbox', cls: 'orphan-checkbox' });
      checkbox.dataset.path = orphan.file.path;
      this.checkboxes.set(orphan.file.path, checkbox);
      checkbox.addEventListener('change', () => {
        this.syncSelectAll();
        this.updateCleanupButton();
      });

      // Thumbnail
      const img = item.createEl('img', { cls: 'orphan-thumbnail' });
      img.src = this.app.vault.getResourcePath(orphan.file);
      img.alt = orphan.file.name;

      // Info
      const info = item.createDiv({ cls: 'orphan-info' });
      info.createDiv({ text: orphan.relativePath, cls: 'orphan-path' });
      info.createDiv({ text: orphan.sizeDisplay, cls: 'orphan-size' });

      // Action buttons container
      const actions = item.createDiv({ cls: 'orphan-actions' });

      // Locate Note button
      const relatedNote = this.findRelatedNote(orphan.file);
      const locateNoteBtn = actions.createEl('button', {
        cls: 'orphan-locate-btn',
        attr: {
          'aria-label': t('orphan.locateNote'),
          title: t('orphan.locateNote'),
        },
      });
      locateNoteBtn.innerHTML = ICON_NOTE;
      if (!relatedNote) {
        locateNoteBtn.disabled = true;
        locateNoteBtn.title = t('orphan.noteNotFound');
      }
      locateNoteBtn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        if (relatedNote) {
          this.app.workspace.getLeaf().openFile(relatedNote);
        }
      });

      // Locate Folder button
      const locateFolderBtn = actions.createEl('button', {
        cls: 'orphan-locate-btn',
        attr: {
          'aria-label': t('orphan.locateFolder'),
          title: t('orphan.locateFolder'),
        },
      });
      locateFolderBtn.innerHTML = ICON_FOLDER;
      locateFolderBtn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        this.revealInExplorer(orphan.file);
      });

      // Click row to toggle checkbox (exclude action buttons)
      item.addEventListener('click', (evt) => {
        if (actions.contains(evt.target as Node)) return;
        if (evt.target === checkbox) return;
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
    }
  }

  private renderFooter(): void {
    const footer = this.contentEl.createDiv({ cls: 'orphan-footer' });

    // Left group: repair buttons + refresh
    const leftGroup = footer.createDiv({ cls: 'orphan-footer-left' });

    const repairBtn = leftGroup.createEl('button', {
      text: t('orphan.repair'),
      cls: 'orphan-repair-btn',
    });
    repairBtn.addEventListener('click', () => this.handleRepairCurrent());

    const repairAllBtn = leftGroup.createEl('button', {
      text: t('orphan.repairAll'),
      cls: 'orphan-repair-btn',
    });
    repairAllBtn.addEventListener('click', () => this.handleRepairAll());

    const refreshBtn = leftGroup.createEl('button', {
      cls: 'orphan-refresh-btn',
      attr: { 'aria-label': t('orphan.refresh'), title: t('orphan.refresh') },
    });
    refreshBtn.innerHTML = ICON_REFRESH;
    refreshBtn.addEventListener('click', () => this.scanAndRender());

    // Right group: cancel + cleanup
    const rightGroup = footer.createDiv({ cls: 'orphan-footer-right' });

    const cancelBtn = rightGroup.createEl('button', { text: t('orphan.cancel') });
    cancelBtn.addEventListener('click', () => this.close());

    this.cleanupButton = rightGroup.createEl('button', {
      text: t('orphan.cleanup'),
      cls: 'mod-warning',
    });
    this.cleanupButton.disabled = true;
    this.cleanupButton.addEventListener('click', () => this.handleCleanup());
  }

  private async handleRepairCurrent(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice(t('orphan.repairNoActive'));
      return;
    }

    const editorView = (view as any).editor?.cm;
    if (!editorView) return;

    const count = await this.repairer.repair(editorView);
    if (count > 0) {
      new Notice(t('orphan.repairFixed', { count }));
      await this.scanAndRender();
    } else {
      new Notice(t('orphan.repairNone'));
    }
  }

  private async handleRepairAll(): Promise<void> {
    const result = await this.repairer.repairAll();
    if (result.fixed > 0) {
      new Notice(t('orphan.repairAllFixed', { scanned: result.scanned, fixed: result.fixed }));
      await this.scanAndRender();
    } else {
      new Notice(t('orphan.repairNone'));
    }
  }

  /**
   * Fuzzy-match an orphan image file to its parent markdown note.
   * Strategy: extract note name from .assets folder prefix, then exact match, then fuzzy.
   */
  private findRelatedNote(orphanFile: TFile): TFile | null {
    const path = orphanFile.path;
    const assetsMatch = path.match(/(.+?)\.assets\//);
    if (!assetsMatch) return null;

    const folderPrefix = assetsMatch[1];
    const candidateName = folderPrefix.split('/').pop();
    if (!candidateName) return null;

    const allMdFiles = this.app.vault.getMarkdownFiles();

    // Exact match
    const exact = allMdFiles.find((f) => f.basename === candidateName);
    if (exact) return exact;

    // Fuzzy match: bidirectional containment, pick smallest length diff
    let bestMatch: TFile | null = null;
    let bestDiff = Infinity;

    for (const mdFile of allMdFiles) {
      const noteName = mdFile.basename;
      if (noteName.includes(candidateName) || candidateName.includes(noteName)) {
        const diff = Math.abs(noteName.length - candidateName.length);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = mdFile;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Reveal the orphan image's parent folder in the system file explorer.
   */
  private revealInExplorer(file: TFile): void {
    const adapter = this.app.vault.adapter as any;
    const basePath: string = adapter.basePath ?? '';
    const filePath: string = file.path ?? '';
    if (!filePath || !basePath) {
      new Notice('Cannot determine file path.');
      return;
    }

    // Build absolute path to the specific image file
    const sep = basePath.includes('\\') ? '\\' : '/';
    const fullPath = basePath + sep + filePath.replace(/\//g, sep);

    try {
      const { shell } = require('electron');
      shell.showItemInFolder(fullPath);
    } catch {
      try {
        (this.app as any).openWithDefaultApp?.(filePath);
      } catch {
        new Notice(`Cannot open: ${fullPath}`);
      }
    }
  }

  private syncSelectAll(): void {
    const allChecked = Array.from(this.checkboxes.values()).every((cb) => cb.checked);
    if (this.selectAllCheckbox) this.selectAllCheckbox.checked = allChecked;
  }

  private updateCleanupButton(): void {
    if (!this.cleanupButton) return;
    let count = 0;
    this.checkboxes.forEach((cb) => { if (cb.checked) count++; });
    this.cleanupButton.disabled = count === 0;
    this.cleanupButton.textContent =
      count > 0 ? t('orphan.cleanupCount', { count }) : t('orphan.cleanup');
  }

  private async handleCleanup(): Promise<void> {
    const selectedPaths: string[] = [];
    this.checkboxes.forEach((cb, path) => {
      if (cb.checked) selectedPaths.push(path);
    });
    if (selectedPaths.length === 0) return;

    let trashed = 0;
    for (const path of selectedPaths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        await this.app.vault.trash(file, false);
        trashed++;
      }
    }

    new Notice(t('orphan.trashNotice', { count: trashed }));
    this.close();
  }

  private formatTotalSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
