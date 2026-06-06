import { App, Modal, Notice, TFile, MarkdownView } from 'obsidian';
import { OrphanDetector } from './orphan-detector';
import { OrphanImageInfo } from './orphan-types';
import { BrokenLinkRepairer } from './broken-link-repairer';
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

  /**
   * Scan the vault and render (or re-render) the full modal UI.
   */
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
      // Still show footer with repair button even when no orphans
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
      this.checkboxes.forEach((cb) => {
        cb.checked = checked;
      });
      this.updateCleanupButton();
    });

    this.updateSummary();
  }

  private updateSummary(): void {
    // Remove old summary if exists
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
      const checkbox = item.createEl('input', {
        type: 'checkbox',
        cls: 'orphan-checkbox',
      });
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

      // Locate button
      const locateBtn = item.createEl('button', {
        cls: 'orphan-locate-btn',
        attr: { 'aria-label': t('orphan.locate'), title: t('orphan.locate') },
      });
      locateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
      locateBtn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        this.app.workspace.getLeaf().openFile(orphan.file);
      });

      // Click anywhere on the row to toggle checkbox
      item.addEventListener('click', (evt) => {
        if (evt.target === checkbox || evt.target === locateBtn || locateBtn.contains(evt.target as Node)) {
          return;
        }
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
    }
  }

  private renderFooter(): void {
    const footer = this.contentEl.createDiv({ cls: 'orphan-footer' });

    // Left side: repair button
    this.repairButton = footer.createEl('button', {
      text: t('orphan.repair'),
      cls: 'orphan-repair-btn',
    });
    this.repairButton.addEventListener('click', () => this.handleRepair());

    // Spacer
    footer.createDiv({ cls: 'orphan-footer-spacer' });

    // Right side: cancel + cleanup
    const cancelBtn = footer.createEl('button', { text: t('orphan.cancel') });
    cancelBtn.addEventListener('click', () => this.close());

    this.cleanupButton = footer.createEl('button', {
      text: t('orphan.cleanup'),
      cls: 'mod-warning',
    });
    this.cleanupButton.disabled = true;
    this.cleanupButton.addEventListener('click', () => this.handleCleanup());
  }

  /**
   * Run broken link repair on the active note, then rescan.
   */
  private async handleRepair(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice(t('orphan.repairNoActive'));
      return;
    }

    const editorView = (view as any).editor?.cm;
    if (!editorView) return;

    // Disable button during repair
    if (this.repairButton) this.repairButton.disabled = true;

    const count = await this.repairer.repair(editorView);

    if (count > 0) {
      new Notice(t('orphan.repairFixed', { count }));
      // Rescan and re-render the modal
      await this.scanAndRender();
    } else if (count === 0) {
      new Notice(t('orphan.repairNone'));
      if (this.repairButton) this.repairButton.disabled = false;
    } else {
      new Notice(t('orphan.repairNoActive'));
      if (this.repairButton) this.repairButton.disabled = false;
    }
  }

  private syncSelectAll(): void {
    const allChecked = Array.from(this.checkboxes.values()).every((cb) => cb.checked);
    if (this.selectAllCheckbox) this.selectAllCheckbox.checked = allChecked;
  }

  private updateCleanupButton(): void {
    if (!this.cleanupButton) return;

    let count = 0;
    this.checkboxes.forEach((cb) => {
      if (cb.checked) count++;
    });

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
