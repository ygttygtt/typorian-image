import { App, Modal, Notice } from 'obsidian';
import { TyporianSettings } from '../settings';
import { RestructureManager, RestructurePlan } from './restructure-manager';
import { t, isZh } from './locale';

export class RestructureModal extends Modal {
  private settings: TyporianSettings;
  private manager: RestructureManager;
  private plan: RestructurePlan | null = null;
  private selectedNotes = new Set<string>();
  private checkboxes = new Map<string, HTMLInputElement>();
  private selectAllCheckbox: HTMLInputElement | null = null;
  private summaryEl: HTMLElement | null = null;
  private refreshApplyState: (() => void) | null = null;

  constructor(app: App, settings: TyporianSettings) {
    super(app);
    this.settings = settings;
    this.manager = new RestructureManager(app, settings);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    this.containerEl.addClass('typorian-restructure-modal');
    this.titleEl.setText(t('restructure.title'));

    contentEl.createEl('p', { text: t('restructure.scanning'), cls: 'orphan-status' });

    this.plan = await this.manager.preview();
    contentEl.empty();

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
    const targetCells = new Map<string, HTMLElement>();

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
      const noteName = entry.sourcePath;
      const noteCell = tr.createEl('td', { text: noteName, cls: 'restructure-td-note' });
      if (entry.unresolvedCount) noteCell.createEl('p', { text: isZh()
        ? `${entry.unresolvedCount} 处未打包引用保留原文`
        : `${entry.unresolvedCount} unpackaged references retained`, cls: 'orphan-size' });

      // Target path cell
      const baseName = noteName.split('/').pop()!.replace(/\.md$/, '');
      const assetsPath = entry.targetPath.replace(/[^/]+$/, `${baseName}.assets/`);
      targetCells.set(entry.sourcePath, tr.createEl('td', { text: assetsPath, cls: 'restructure-td-assets' }));

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

    // Mode toggle (sandbox / overwrite)
    let isOverwriteMode = false;
    const modeToggleEl = leftGroup.createDiv({ cls: 'orphan-wiki-toggle' });
    modeToggleEl.createSpan({ text: t('restructure.modeOverwrite'), cls: 'orphan-wiki-toggle-label' });
    const modeTrack = modeToggleEl.createDiv({ cls: 'orphan-wiki-toggle-track' });
    modeTrack.createDiv({ cls: 'orphan-wiki-toggle-thumb' });

    // Warning text (changes based on mode)
    const warningEl = contentEl.createEl('p', {
      text: t('restructure.modeSandboxDesc', { path: this.plan!.outputDir }),
      cls: 'restructure-warning',
    });
    // Move warning before footer
    contentEl.insertBefore(warningEl, footer);

    // Confirm input (only visible in overwrite mode)
    const confirmInput = rightGroup.createEl('input', {
      type: 'text',
      placeholder: t('restructure.confirm'),
      cls: 'restructure-confirm-input',
    });
    confirmInput.style.display = 'none';

    const applyBtn = rightGroup.createEl('button', {
      text: t('restructure.apply'),
      cls: 'mod-warning',
    });
    applyBtn.disabled = this.selectedNotes.size === 0;

    // Update UI based on mode
    const updateMode = () => {
      for (const entry of this.plan!.noteEntries) {
        const noteName = entry.sourcePath.split('/').pop()!.replace(/\.md$/, '');
        const path = isOverwriteMode ? entry.sourcePath : entry.targetPath;
        targetCells.get(entry.sourcePath)!.setText(path.replace(/[^/]+$/, `${noteName}.assets/`));
      }
      if (isOverwriteMode) {
        confirmInput.style.display = '';
        applyBtn.disabled = confirmInput.value !== 'confirm' || this.selectedNotes.size === 0;
        warningEl.setText(t('restructure.overwriteWarning'));
        warningEl.addClass('restructure-warning-overwrite');
      } else {
        confirmInput.style.display = 'none';
        applyBtn.disabled = this.selectedNotes.size === 0;
        warningEl.setText(t('restructure.modeSandboxDesc', { path: this.plan!.outputDir }));
        warningEl.removeClass('restructure-warning-overwrite');
      }
    };

    this.refreshApplyState = updateMode;

    modeToggleEl.addEventListener('click', () => {
      isOverwriteMode = !isOverwriteMode;
      modeTrack.classList.toggle('is-on', isOverwriteMode);
      updateMode();
    });

    confirmInput.addEventListener('input', () => {
      if (isOverwriteMode) {
        applyBtn.disabled = confirmInput.value !== 'confirm' || this.selectedNotes.size === 0;
      }
    });

    applyBtn.addEventListener('click', async () => {
      if (!this.plan || this.selectedNotes.size === 0) return;

      applyBtn.disabled = true;
      contentEl.inert = true;
      const selected = new Set(this.selectedNotes);
      try {
        if (isOverwriteMode) {
          const total = this.selectedNotes.size;
          applyBtn.textContent = `0/${total}`;
          const processed = await this.manager.applyOverwrite(this.plan, selected, (current) => {
            applyBtn.textContent = `${current}/${total}`;
          });
          new Notice(t('restructure.overwriteSuccess', { count: processed }));
        } else {
          const outputPath = await this.manager.apply(this.plan, selected);
          new Notice(t('restructure.success', { path: outputPath }));
        }
        this.close();
      } catch (err) {
        new Notice(String(err));
        contentEl.inert = false;
        updateMode();
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
    this.refreshApplyState?.();
  }

  private updateSummary(): void {
    if (this.summaryEl) {
      this.summaryEl.setText(t('restructure.selected', { count: this.selectedNotes.size }));
    }
  }

  onClose(): void {
    this.containerEl.removeClass('typorian-restructure-modal');
    this.contentEl.inert = false;
    this.contentEl.empty();
    this.refreshApplyState = null;
    this.selectedNotes.clear();
    this.checkboxes.clear();
  }
}
