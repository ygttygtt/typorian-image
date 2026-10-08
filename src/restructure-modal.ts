import { App, Modal, Notice, Setting, setIcon } from 'obsidian';
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
    this.containerEl.addClasses(['typorian-ui', 'typorian-restructure-modal']);
    this.titleEl.setText(t('restructure.title'));

    contentEl.createEl('p', { text: t('restructure.scanning'), cls: 'ti-muted' });

    this.plan = await this.manager.preview();
    contentEl.empty();

    contentEl.createEl('p', { cls: 'ti-intro', text: isZh()
      ? '为选中的笔记整理附件目录。先选择笔记，再选择副本或原地整理。'
      : 'Organize attachment folders for selected notes. Choose notes and an output mode below.' });

    // Header with select-all and summary
    const header = contentEl.createDiv({ cls: 'ti-batch' });
    const selectAllLabel = header.createEl('label', { cls: 'ti-select-all' });
    this.selectAllCheckbox = selectAllLabel.createEl('input', { type: 'checkbox' });
    selectAllLabel.createSpan({ text: t('orphan.selectAll') });
    this.summaryEl = header.createSpan({ cls: 'ti-muted' });

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
    const tableContainer = contentEl.createDiv({ cls: 'ti-list restructure-table-container' });
    const table = tableContainer.createEl('table', { cls: 'restructure-table' });

    const thead = table.createEl('thead');
    const headerRow = thead.createEl('tr');
    headerRow.createEl('th', { cls: 'restructure-th-check' });
    headerRow.createEl('th', { text: t('restructure.table.note'), cls: 'restructure-th-note' });
    headerRow.createEl('th', { text: t('restructure.table.assets'), cls: 'restructure-th-assets' });
    headerRow.createEl('th', { text: t('restructure.table.images'), cls: 'restructure-th-images' });

    const tbody = table.createEl('tbody');
    const targetCells = new Map<string, HTMLElement>();

    for (const entry of this.plan.noteEntries.slice().sort((a, b) => (b.imageCount ?? 0) - (a.imageCount ?? 0))) {
      const tr = tbody.createEl('tr');
      const hasImages = entry.imageCount! > 0;

      // Checkbox cell
      const tdCheck = tr.createEl('td', { cls: 'restructure-td-check' });
      if (hasImages) {
        const checkbox = tdCheck.createEl('input', { type: 'checkbox', attr: { 'aria-label': entry.sourcePath } });
        checkbox.checked = true;
        this.selectedNotes.add(entry.sourcePath);
        this.checkboxes.set(entry.sourcePath, checkbox);
        checkbox.addEventListener('change', () => this.syncSelection());
        tr.addEventListener('click', (evt) => {
          if (evt.target === checkbox) return;
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        });
        tr.addClass('restructure-row-selectable');
      }

      // Note name cell
      const noteName = entry.sourcePath;
      const noteCell = tr.createEl('td', { text: noteName, cls: 'restructure-td-note' });
      if (entry.unresolvedCount) noteCell.createEl('p', { text: isZh()
        ? `${entry.unresolvedCount} 处未打包引用保留原文`
        : `${entry.unresolvedCount} unpackaged references retained`, cls: 'ti-muted' });

      // Target path cell
      const baseName = noteName.split('/').pop()!.replace(/\.md$/, '');
      const assetsPath = hasImages ? entry.targetPath.replace(/[^/]+$/, `${baseName}.assets/`) : '—';
      targetCells.set(entry.sourcePath, tr.createEl('td', { text: assetsPath, cls: 'restructure-td-assets' }));

      // Image count cell
      if (hasImages) {
        tr.createEl('td', { text: String(entry.imageCount), cls: 'restructure-td-images' });
      } else {
        const td = tr.createEl('td', { cls: 'restructure-td-images' });
        td.createEl('span', {
          text: '—',
          cls: 'restructure-no-images',
          attr: { title: t('restructure.noImages') },
        });
        tr.classList.add('restructure-row-empty');
      }
    }

    this.syncSelection();

    if (this.plan.noteEntries.length === 0) {
      header.remove();
      tableContainer.remove();
      const empty = contentEl.createDiv({ cls: 'ti-empty' });
      setIcon(empty.createDiv({ cls: 'ti-empty-icon' }), 'files');
      empty.createEl('p', { text: isZh() ? '没有可整理的笔记' : 'No notes to organize' });
    }

    // Output mode belongs to the form, above the action footer.
    let isOverwriteMode = false;
    const form = contentEl.createDiv({ cls: 'ti-form-group' });
    new Setting(form)
      .setName(isZh() ? '整理方式' : 'Output mode')
      .addDropdown((dropdown) => {
        dropdown.addOption('copy', isZh() ? '生成副本' : 'Create a copy');
        dropdown.addOption('overwrite', t('restructure.modeOverwrite'));
        dropdown.setValue('copy');
        dropdown.onChange((value) => {
          isOverwriteMode = value === 'overwrite';
          updateMode();
        });
      });
    const warningEl = form.createEl('p', {
      text: t('restructure.modeSandboxDesc', { path: this.plan!.outputDir }),
      cls: 'ti-muted restructure-mode-description',
    });
    const confirmGroup = form.createDiv({ cls: 'restructure-confirm-group' });
    confirmGroup.hidden = true;
    const confirmLabel = confirmGroup.createEl('label', {
      text: isZh() ? '输入 confirm 确认原地整理' : 'Type confirm to organize in place',
    });
    const confirmInput = confirmLabel.createEl('input', {
      type: 'text',
      placeholder: t('restructure.confirm'),
      cls: 'restructure-confirm-input',
    });

    const footer = contentEl.createDiv({ cls: 'ti-footer' });
    const actions = footer.createDiv({ cls: 'ti-footer-actions' });
    const cancelBtn = actions.createEl('button', { text: t('restructure.cancel'), cls: 'ti-secondary-action' });
    cancelBtn.addEventListener('click', () => this.close());
    const applyBtn = actions.createEl('button', {
      text: t('restructure.apply'),
      cls: 'mod-cta',
    });
    applyBtn.disabled = this.selectedNotes.size === 0;

    // Update UI based on mode
    const updateMode = () => {
      for (const entry of this.plan!.noteEntries) {
        const noteName = entry.sourcePath.split('/').pop()!.replace(/\.md$/, '');
        const path = isOverwriteMode ? entry.sourcePath : entry.targetPath;
        targetCells.get(entry.sourcePath)!.setText(entry.imageCount ? path.replace(/[^/]+$/, `${noteName}.assets/`) : '—');
      }
      if (isOverwriteMode) {
        confirmGroup.hidden = false;
        applyBtn.disabled = confirmInput.value !== 'confirm' || this.selectedNotes.size === 0;
        warningEl.setText(t('restructure.overwriteWarning'));
        warningEl.addClasses(['ti-warning', 'is-overwrite']);
      } else {
        confirmGroup.hidden = true;
        applyBtn.disabled = this.selectedNotes.size === 0;
        warningEl.setText(t('restructure.modeSandboxDesc', { path: this.plan!.outputDir }));
        warningEl.removeClasses(['ti-warning', 'is-overwrite']);
      }
    };

    this.refreshApplyState = updateMode;

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
    this.containerEl.removeClasses(['typorian-ui', 'typorian-restructure-modal']);
    this.contentEl.inert = false;
    this.contentEl.empty();
    this.refreshApplyState = null;
    this.selectedNotes.clear();
    this.checkboxes.clear();
  }
}
