import { App, Modal, Notice, TFile, MarkdownView } from 'obsidian';
import { OrphanDetector } from './orphan-detector';
import { OrphanImageInfo } from './orphan-types';
import { BrokenLinkRepairer } from './broken-link-repairer';
import { TyporianSettings } from './settings';
import { getIconSvg } from './icon-utils';
import { t } from './locale';

export class OrphanImageModal extends Modal {
  private detector: OrphanDetector;
  private repairer: BrokenLinkRepairer;
  private orphans: OrphanImageInfo[] = [];
  private checkboxes: Map<string, HTMLInputElement> = new Map();
  private selectAllCheckbox: HTMLInputElement | null = null;
  private cleanupButton: HTMLButtonElement | null = null;
  private repairButton: HTMLButtonElement | null = null;
  private listContainer: HTMLDivElement | null = null;
  private headerContainer: HTMLDivElement | null = null;
  private scanMode: 'current' | 'all' = 'current';

  constructor(app: App, private settings?: TyporianSettings) {
    super(app);
    this.detector = new OrphanDetector(app);
    this.repairer = new BrokenLinkRepairer(app, settings);
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

    const allOrphans = await this.detector.scan();

    // Filter by scan mode
    if (this.scanMode === 'current') {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const currentFile = view?.file;
      if (currentFile) {
        const folderPrefix = currentFile.path.replace(/\.md$/, '');
        this.orphans = allOrphans.filter(o => o.file.path.startsWith(folderPrefix));
      } else {
        this.orphans = [];
      }
    } else {
      this.orphans = allOrphans;
    }

    this.contentEl.empty();

    this.renderHeader();

    if (this.orphans.length === 0) {
      this.contentEl.createEl('p', {
        text: t('orphan.empty'),
        cls: 'orphan-status',
      });
    } else {
      this.renderList();
    }

    this.renderFooter();
  }

  private renderHeader(): void {
    this.headerContainer = this.contentEl.createDiv({ cls: 'orphan-header' });

    // Scan mode toggle buttons
    const modeGroup = this.headerContainer.createDiv({ cls: 'wiki-mode-group' });
    const currentBtn = modeGroup.createEl('button', {
      text: t('wiki.modeCurrent'),
      cls: `wiki-mode-btn${this.scanMode === 'current' ? ' is-active' : ''}`,
    });
    const allBtn = modeGroup.createEl('button', {
      text: t('wiki.modeAll'),
      cls: `wiki-mode-btn${this.scanMode === 'all' ? ' is-active' : ''}`,
    });
    currentBtn.addEventListener('click', async () => {
      this.scanMode = 'current';
      await this.scanAndRender();
    });
    allBtn.addEventListener('click', async () => {
      this.scanMode = 'all';
      await this.scanAndRender();
    });

    // Select all
    const selectAllLabel = this.headerContainer.createEl('label', { cls: 'orphan-select-all-label' });
    this.selectAllCheckbox = selectAllLabel.createEl('input', { type: 'checkbox' });
    selectAllLabel.createSpan({ text: t('orphan.selectAll') });

    this.selectAllCheckbox.addEventListener('change', () => {
      const checked = this.selectAllCheckbox!.checked;
      this.checkboxes.forEach((cb) => { cb.checked = checked; });
      this.updateCleanupButton();
    });

    // Wiki conversion toggle
    if (this.settings) {
      const wikiToggleLabel = this.headerContainer.createEl('label', { cls: 'orphan-select-all-label' });
      const wikiToggle = wikiToggleLabel.createEl('input', { type: 'checkbox' });
      wikiToggle.checked = this.settings.enableWikiLinkConversion;
      wikiToggleLabel.createSpan({ text: t('settings.wikiConversion.name') });
      wikiToggle.addEventListener('change', () => {
        this.settings!.enableWikiLinkConversion = wikiToggle.checked;
      });
    }

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
      locateNoteBtn.innerHTML = getIconSvg('file-text');
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
      locateFolderBtn.innerHTML = getIconSvg('folder-open');
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

    // Left group: cancel + refresh
    const leftGroup = footer.createDiv({ cls: 'orphan-footer-left' });

    const cancelBtn = leftGroup.createEl('button', { text: t('orphan.cancel') });
    cancelBtn.addEventListener('click', () => this.close());

    const refreshBtn = leftGroup.createEl('button', {
      text: t('orphan.refresh'),
      cls: 'orphan-repair-btn',
    });
    refreshBtn.addEventListener('click', () => this.scanAndRender());

    // Right group: repair + cleanup
    const rightGroup = footer.createDiv({ cls: 'orphan-footer-right' });

    this.repairButton = rightGroup.createEl('button', {
      text: this.scanMode === 'current' ? t('orphan.repairCurrent') : t('orphan.repairAllBtn'),
      cls: 'orphan-repair-btn',
    });
    this.repairButton.addEventListener('click', () => this.handleRepair());

    this.cleanupButton = rightGroup.createEl('button', {
      text: t('orphan.cleanup'),
      cls: 'mod-warning',
    });
    this.cleanupButton.disabled = true;
    this.cleanupButton.addEventListener('click', () => this.handleCleanup());
  }

  private async handleRepair(): Promise<void> {
    if (this.scanMode === 'current') {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) {
        new Notice(t('orphan.repairNoActive'));
        return;
      }

      const editorView = (view as any).editor?.cm;
      if (!editorView) return;

      const result = await this.repairer.repair(editorView);
      if (!result) {
        new Notice(t('orphan.repairNoActive'));
        return;
      }

      const { brokenFixed, wikiConverted, total } = result;
      if (total === 0) {
        new Notice(t('orphan.repairNone'));
      } else if (brokenFixed > 0 && wikiConverted > 0) {
        new Notice(t('orphan.repairFixedBoth', { broken: brokenFixed, wiki: wikiConverted }));
      } else if (wikiConverted > 0) {
        new Notice(t('orphan.repairFixedWiki', { count: wikiConverted }));
      } else {
        new Notice(t('orphan.repairFixedBroken', { count: brokenFixed }));
      }

      if (total > 0) {
        await this.scanAndRender();
      }
    } else {
      const result = await this.repairer.repairAll();
      const { scanned, brokenFixed, wikiConverted, total } = result;

      if (total === 0) {
        new Notice(t('orphan.repairAllNone'));
      } else if (brokenFixed > 0 && wikiConverted > 0) {
        new Notice(t('orphan.repairAllFixedBoth', { scanned, broken: brokenFixed, wiki: wikiConverted }));
      } else if (wikiConverted > 0) {
        new Notice(t('orphan.repairAllFixedWiki', { scanned, count: wikiConverted }));
      } else {
        new Notice(t('orphan.repairAllFixedBroken', { scanned, count: brokenFixed }));
      }

      if (total > 0) {
        await this.scanAndRender();
      }
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

    const adapter = this.app.vault.adapter as any;
    const basePath: string = adapter.basePath ?? '';
    const sep = basePath.includes('\\') ? '\\' : '/';

    let trashed = 0;
    for (const path of selectedPaths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) continue;

      const fullPath = basePath + sep + file.path.replace(/\//g, sep);
      try {
        const { shell } = require('electron');
        await shell.trashItem(fullPath);
        trashed++;
      } catch {
        // Fallback: use Obsidian internal trash
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
