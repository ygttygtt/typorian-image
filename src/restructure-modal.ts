import { App, Modal, Notice } from 'obsidian';
import { TyporianSettings } from './settings';
import { RestructureManager, RestructurePlan, RestructureEntry } from './restructure-manager';
import { t } from './locale';

export class RestructureModal extends Modal {
  private settings: TyporianSettings;
  private manager: RestructureManager;
  private plan: RestructurePlan | null = null;
  private selectedNotes = new Set<string>();
  private checkboxes = new Map<string, HTMLInputElement>();
  private selectAllCheckbox: HTMLInputElement | null = null;
  private summaryEl: HTMLElement | null = null;

  constructor(app: App, settings: TyporianSettings) {
    super(app);
    this.settings = settings;
    this.manager = new RestructureManager(app, settings);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    this.titleEl.setText(t('restructure.title'));

    contentEl.createEl('p', { text: t('restructure.scanning'), cls: 'orphan-status' });

    this.plan = await this.manager.preview();
    contentEl.empty();

    // Warning
    contentEl.createEl('p', {
      text: t('restructure.warning'),
      cls: 'restructure-warning',
    });

    // Header with select-all and summary
    const header = contentEl.createDiv({ cls: 'orphan-header' });
    const selectAllLabel = header.createEl('label', { cls: 'orphan-select-all-label' });
    this.selectAllCheckbox = selectAllLabel.createEl('input', { type: 'checkbox' });
    selectAllLabel.createSpan({ text: t('orphan.selectAll') });
    this.summaryEl = header.createSpan({ cls: 'orphan-summary' });

    this.selectAllCheckbox.addEventListener('change', () => {
      const checked = this.selectAllCheckbox!.checked;
      this.checkboxes.forEach((cb, path) => {
        const entry = this.plan?.noteEntries.find((e) => e.sourcePath === path);
        if (entry && entry.imageCount! > 0) {
          cb.checked = checked;
        }
      });
      this.syncSelection();
    });

    // Table
    const tableContainer = contentEl.createDiv({ cls: 'restructure-table-container' });
    const table = tableContainer.createEl('table', { cls: 'restructure-table' });

    const thead = table.createEl('thead');
    const headerRow = thead.createEl('tr');
    headerRow.createEl('th', { cls: 'restructure-th-check' });
    headerRow.createEl('th', { text: t('restructure.table.note'), cls: 'restructure-th-note' });
    headerRow.createEl('th', { text: t('restructure.table.assets'), cls: 'restructure-th-assets' });
    headerRow.createEl('th', { text: t('restructure.table.images'), cls: 'restructure-th-images' });

    const tbody = table.createEl('tbody');

    for (const entry of this.plan.noteEntries) {
      const tr = tbody.createEl('tr');
      const hasImages = entry.imageCount! > 0;

      // Checkbox cell
      const tdCheck = tr.createEl('td', { cls: 'restructure-td-check' });
      if (hasImages) {
        const checkbox = tdCheck.createEl('input', { type: 'checkbox' });
        checkbox.checked = true;
        this.selectedNotes.add(entry.sourcePath);
        this.checkboxes.set(entry.sourcePath, checkbox);
        checkbox.addEventListener('change', () => this.syncSelection());
        tr.addEventListener('click', (evt) => {
          if (evt.target === checkbox) return;
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        });
        tr.style.cursor = 'pointer';
      }

      // Note name cell
      const noteName = entry.sourcePath.split('/').pop() || entry.sourcePath;
      tr.createEl('td', { text: noteName, cls: 'restructure-td-note' });

      // Target path cell
      const baseName = noteName?.replace(/\.md$/, '') || '';
      const assetsPath = entry.targetPath.replace(/[^/]+$/, `${baseName}.assets/`);
      tr.createEl('td', { text: assetsPath, cls: 'restructure-td-assets' });

      // Image count cell
      if (hasImages) {
        tr.createEl('td', { text: String(entry.imageCount), cls: 'restructure-td-images' });
      } else {
        const td = tr.createEl('td', { cls: 'restructure-td-images' });
        td.createEl('span', {
          text: t('restructure.noImages'),
          cls: 'restructure-no-images',
        });
        tr.classList.add('restructure-row-empty');
      }
    }

    this.updateSummary();

    // Footer
    const footer = contentEl.createDiv({ cls: 'orphan-footer' });
    const leftGroup = footer.createDiv({ cls: 'orphan-footer-left' });
    const rightGroup = footer.createDiv({ cls: 'orphan-footer-right' });

    const cancelBtn = leftGroup.createEl('button', { text: t('restructure.cancel') });
    cancelBtn.addEventListener('click', () => this.close());

    const confirmInput = rightGroup.createEl('input', {
      type: 'text',
      placeholder: t('restructure.confirm'),
      cls: 'restructure-confirm-input',
    });

    const applyBtn = rightGroup.createEl('button', {
      text: t('restructure.apply'),
      cls: 'mod-warning',
    });
    applyBtn.disabled = true;

    confirmInput.addEventListener('input', () => {
      applyBtn.disabled = confirmInput.value !== 'confirm' || this.selectedNotes.size === 0;
    });

    applyBtn.addEventListener('click', async () => {
      if (!this.plan || this.selectedNotes.size === 0) return;
      applyBtn.disabled = true;
      applyBtn.textContent = '...';
      try {
        await this.manager.apply(this.plan, this.selectedNotes);
        new Notice(t('restructure.success', { path: '_Restructured_Vault/' }));
        this.close();
      } catch (err) {
        new Notice(String(err));
        applyBtn.disabled = false;
        applyBtn.textContent = t('restructure.apply');
      }
    });
  }

  private syncSelection(): void {
    this.selectedNotes.clear();
    this.checkboxes.forEach((cb, path) => {
      if (cb.checked) this.selectedNotes.add(path);
    });
    if (this.selectAllCheckbox) {
      const checkable = Array.from(this.checkboxes.values());
      this.selectAllCheckbox.checked = checkable.length > 0 && checkable.every((cb) => cb.checked);
    }
    this.updateSummary();
  }

  private updateSummary(): void {
    if (this.summaryEl) {
      this.summaryEl.setText(t('restructure.selected', { count: this.selectedNotes.size }));
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
