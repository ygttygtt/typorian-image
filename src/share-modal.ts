import { App, Modal, Notice, TFile, Setting } from 'obsidian';
import { TyporianSettings } from './settings';
import { ShareManager } from './share-manager';
import { t } from './locale';

export class ShareModal extends Modal {
  private settings: TyporianSettings;
  private manager: ShareManager;
  private format: 'folder' | 'zip' = 'folder';
  private exportPath: string = '';

  constructor(app: App, settings: TyporianSettings) {
    super(app);
    this.settings = settings;
    this.manager = new ShareManager(app, settings);
  }

  onOpen(): void {
    const { contentEl } = this;
    this.titleEl.setText(t('share.title'));

    // Get active note
    const activeLeaf = this.app.workspace.activeLeaf;
    const file = activeLeaf?.view ? (activeLeaf.view as any).file : null;
    if (!(file instanceof TFile)) {
      contentEl.createEl('p', { text: t('share.noActive') });
      return;
    }

    this.exportPath = file.basename;

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

    // Export path with native folder picker
    const pathSetting = new Setting(contentEl)
      .setName(t('share.exportPath'))
      .setDesc(t('share.exportPath.desc'))
      .addText((text) => {
        text.setValue(this.exportPath);
        text.setPlaceholder(file.basename);
        text.onChange((value) => {
          this.exportPath = value || file.basename;
        });
      })
      .addButton((btn) => {
        btn.setIcon('folder-open');
        btn.setTooltip(t('share.selectFolder'));
        btn.onClick(async () => {
          try {
            const { remote } = require('electron');
            const result = await remote.dialog.showOpenDialog({
              properties: ['openDirectory', 'createDirectory'],
              defaultPath: (this.app.vault.adapter as any).basePath || '',
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const basePath = (this.app.vault.adapter as any).basePath || '';
              let selected = result.filePaths[0];
              if (selected.startsWith(basePath)) {
                selected = selected.substring(basePath.length).replace(/^[/\\]+/, '');
              }
              this.exportPath = selected;
              const textInput = pathSetting.settingEl.querySelector('input') as HTMLInputElement;
              if (textInput) textInput.value = selected;
            }
          } catch {
            new Notice('Folder picker not available');
          }
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
      exportBtn.textContent = t('share.creating');
      try {
        if (this.format === 'folder') {
          await this.manager.exportAsFolder(file, this.exportPath);
        } else {
          await this.manager.exportAsZip(file, this.exportPath);
        }
        new Notice(t('share.success', { path: this.exportPath }));

        // Open folder after export
        if (this.settings.openFolderAfterExport) {
          try {
            const basePath = (this.app.vault.adapter as any).basePath || '';
            const sep = basePath.includes('\\') ? '\\' : '/';
            const fullPath = basePath + sep + this.exportPath.replace(/\//g, sep);
            const { shell } = require('electron');
            shell.openPath(fullPath);
          } catch {
            // fallback: ignore
          }
        }

        this.close();
      } catch (err) {
        new Notice(t('share.error', { message: String(err) }));
        exportBtn.disabled = false;
        exportBtn.textContent = t('share.title');
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
