import { App, Modal, Notice, TFile, Setting } from 'obsidian';
import { TyporianSettings } from '../settings';
import { ShareManager } from './share-manager';
import { t } from './locale';

export class ShareModal extends Modal {
  private settings: TyporianSettings;
  private manager: ShareManager;
  private format: 'folder' | 'zip' = 'folder';
  private exportPath: string = '';

  constructor(app: App, settings: TyporianSettings, private saveSettings: () => Promise<void>) {
    super(app);
    this.settings = settings;
    this.manager = new ShareManager(app, settings);
  }

  onOpen(): void {
    const { contentEl } = this;
    this.titleEl.setText(t('share.title'));

    // Get active note
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.extension !== 'md') {
      contentEl.createEl('p', { text: t('share.noActive') });
      return;
    }

    this.exportPath = (file.parent?.path ?? '').replace(/^\/+$/, '');

    // Export format
    new Setting(contentEl)
      .setName(t('share.folderFormat'))
      .addDropdown((dropdown) => {
        dropdown.addOption('folder', t('share.folderFormat'));
        dropdown.addOption('zip', t('share.zipFormat'));
        dropdown.setValue(this.format);
        dropdown.onChange((value) => {
          this.format = value as 'folder' | 'zip';
        });
      });

    // Export destination is always a vault-relative directory.
    new Setting(contentEl)
      .setName(t('share.exportPath'))
      .setDesc(t('share.exportPath.desc'))
      .addText((text) => {
        text.setValue(this.exportPath);
        text.setPlaceholder(t('share.rootFolder'));
        text.onChange((value) => {
          this.exportPath = value;
        });
      });

    // Open folder after export toggle
    new Setting(contentEl)
      .setName(t('share.openFolder'))
      .setDesc(t('share.openFolder.desc'))
      .addToggle((toggle) => {
        toggle.setValue(this.settings.openFolderAfterExport);
        toggle.onChange(async (value) => {
          this.settings.openFolderAfterExport = value;
          await this.saveSettings();
        });
      });

    // Export button
    const btnContainer = contentEl.createDiv({ cls: 'share-btn-container' });
    const exportBtn = btnContainer.createEl('button', {
      text: t('share.title'),
      cls: 'mod-cta',
    });
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      contentEl.inert = true;
      const format = this.format;
      exportBtn.textContent = t('share.creating');
      try {
        const outputPath = format === 'folder'
          ? await this.manager.exportAsFolder(file, this.exportPath)
          : await this.manager.exportAsZip(file, this.exportPath);
        new Notice(t('share.success', { path: outputPath }));

        if (this.settings.openFolderAfterExport) {
          const basePath = (this.app.vault.adapter as any).basePath;
          if (basePath) {
            const parent = format === 'folder' ? outputPath
              : (outputPath.includes('/') ? outputPath.substring(0, outputPath.lastIndexOf('/')) : '');
            const fullPath = require('path').join(basePath, parent);
            const { shell } = require('electron');
            const error = await shell.openPath(fullPath);
            if (error) new Notice(error);
          }
        }

        this.close();
      } catch (err) {
        new Notice(t('share.error', { message: String(err) }));
        contentEl.inert = false;
        exportBtn.disabled = false;
        exportBtn.textContent = t('share.title');
      }
    });
  }

  onClose(): void {
    this.contentEl.inert = false;
    this.contentEl.empty();
  }
}
