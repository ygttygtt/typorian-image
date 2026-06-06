import { App, Modal, Notice, TFile } from 'obsidian';
import { OrphanDetector } from './orphan-detector';
import { OrphanImageInfo } from './orphan-types';

export class OrphanImageModal extends Modal {
  private detector: OrphanDetector;
  private orphans: OrphanImageInfo[] = [];
  private checkboxes: Map<string, HTMLInputElement> = new Map();
  private selectAllCheckbox: HTMLInputElement | null = null;
  private cleanupButton: HTMLButtonElement | null = null;

  constructor(app: App) {
    super(app);
    this.detector = new OrphanDetector(app);
  }

  async onOpen(): Promise<void> {
    this.titleEl.setText('Orphan Image Cleanup');
    this.contentEl.createEl('p', {
      text: 'Scanning vault...',
      cls: 'orphan-status',
    });

    this.orphans = await this.detector.scan();

    // Clear loading text
    this.contentEl.empty();

    if (this.orphans.length === 0) {
      this.contentEl.createEl('p', {
        text: 'No orphan images detected in .assets folders.',
        cls: 'orphan-status',
      });
      return;
    }

    this.renderHeader();
    this.renderList();
    this.renderFooter();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderHeader(): void {
    const header = this.contentEl.createDiv({ cls: 'orphan-header' });

    // Select All checkbox
    const selectAllLabel = header.createEl('label', { cls: 'orphan-select-all-label' });
    this.selectAllCheckbox = selectAllLabel.createEl('input', { type: 'checkbox' });
    selectAllLabel.createSpan({ text: 'Select All' });

    this.selectAllCheckbox.addEventListener('change', () => {
      const checked = this.selectAllCheckbox!.checked;
      this.checkboxes.forEach((cb) => {
        cb.checked = checked;
      });
      this.updateCleanupButton();
    });

    // Summary info
    const totalSize = this.orphans.reduce((sum, o) => sum + o.sizeBytes, 0);
    const sizeStr = this.formatTotalSize(totalSize);
    header.createSpan({
      text: `${this.orphans.length} orphan image(s), total ${sizeStr}`,
      cls: 'orphan-summary',
    });
  }

  private renderList(): void {
    const list = this.contentEl.createDiv({ cls: 'orphan-list' });

    for (const orphan of this.orphans) {
      const item = list.createDiv({ cls: 'orphan-item' });

      // Checkbox
      const checkbox = item.createEl('input', {
        type: 'checkbox',
        cls: 'orphan-checkbox',
      });
      checkbox.dataset.path = orphan.file.path;
      this.checkboxes.set(orphan.file.path, checkbox);

      checkbox.addEventListener('change', () => {
        const allChecked = Array.from(this.checkboxes.values()).every(
          (cb) => cb.checked
        );
        this.selectAllCheckbox!.checked = allChecked;
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
    }
  }

  private renderFooter(): void {
    const footer = this.contentEl.createDiv({ cls: 'orphan-footer' });

    // Cancel button
    const cancelBtn = footer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.close());

    // Safe Cleanup button (disabled by default)
    this.cleanupButton = footer.createEl('button', {
      text: 'Safe Cleanup',
      cls: 'mod-warning',
    });
    this.cleanupButton.disabled = true;
    this.cleanupButton.addEventListener('click', () => this.handleCleanup());
  }

  private updateCleanupButton(): void {
    if (!this.cleanupButton) return;

    let count = 0;
    this.checkboxes.forEach((cb) => {
      if (cb.checked) count++;
    });

    this.cleanupButton.disabled = count === 0;
    this.cleanupButton.textContent =
      count > 0 ? `Safe Cleanup (${count} file(s))` : 'Safe Cleanup';
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

    new Notice(`Moved ${trashed} orphan image(s) to trash.`);
    this.close();
  }

  private formatTotalSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
