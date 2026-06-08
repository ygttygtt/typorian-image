import { App, Modal, Notice } from 'obsidian';
import { TyporianSettings } from './settings';
import { RestructureManager, RestructurePlan } from './restructure-manager';
import { t } from './locale';

export class RestructureModal extends Modal {
  private settings: TyporianSettings;
  private manager: RestructureManager;
  private plan: RestructurePlan | null = null;

  constructor(app: App, settings: TyporianSettings) {
    super(app);
    this.settings = settings;
    this.manager = new RestructureManager(app, settings);
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    this.titleEl.setText(t('restructure.title'));

    contentEl.createEl('p', { text: t('restructure.scanning') });

    this.plan = await this.manager.preview();
    contentEl.empty();

    // Warning
    contentEl.createEl('p', {
      text: t('restructure.warning'),
      cls: 'restructure-warning',
    });

    // Summary
    contentEl.createEl('p', {
      text: `${this.plan.totalNotes} notes, ${this.plan.totalImages} images`,
      cls: 'restructure-summary',
    });

    // File tree preview (collapsible)
    const previewHeader = contentEl.createEl('h3', {
      text: t('restructure.preview'),
      cls: 'typorian-advanced-header',
    });
    const previewContent = contentEl.createDiv({ cls: 'typorian-advanced-content' });
    previewContent.style.display = 'none';

    previewHeader.addEventListener('click', () => {
      const isOpen = previewContent.style.display !== 'none';
      previewContent.style.display = isOpen ? 'none' : 'block';
      previewHeader.classList.toggle('is-open', !isOpen);
    });

    // Render file tree
    const maxPreview = 100;
    for (const entry of this.plan.entries.slice(0, maxPreview)) {
      const row = previewContent.createDiv({ cls: 'restructure-entry' });
      row.createSpan({ text: entry.sourcePath, cls: 'restructure-source' });
      row.createSpan({ text: ' → ', cls: 'restructure-arrow' });
      row.createSpan({ text: entry.targetPath, cls: 'restructure-target' });
    }
    if (this.plan.entries.length > maxPreview) {
      previewContent.createEl('p', {
        text: `... and ${this.plan.entries.length - maxPreview} more entries`,
      });
    }

    // Footer
    const footer = contentEl.createDiv({ cls: 'orphan-footer' });
    const leftGroup = footer.createDiv({ cls: 'orphan-footer-left' });
    const rightGroup = footer.createDiv({ cls: 'orphan-footer-right' });

    const cancelBtn = leftGroup.createEl('button', { text: t('restructure.cancel') });
    cancelBtn.addEventListener('click', () => this.close());

    // Confirmation input
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
      applyBtn.disabled = confirmInput.value !== 'confirm';
    });

    applyBtn.addEventListener('click', async () => {
      if (!this.plan) return;
      applyBtn.disabled = true;
      applyBtn.textContent = '...';
      try {
        await this.manager.apply(this.plan);
        new Notice(t('restructure.success', { path: '_Restructured_Vault/' }));
        this.close();
      } catch (err) {
        new Notice(String(err));
        applyBtn.disabled = false;
        applyBtn.textContent = t('restructure.apply');
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
