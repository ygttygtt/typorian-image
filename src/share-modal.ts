import { App, Modal, Notice, TFile, Setting, setIcon } from 'obsidian';
import { TyporianSettings } from '../settings';
import { ShareManager } from './share-manager';
import { t, isZh } from './locale';

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
    this.containerEl.addClasses(['typorian-ui', 'typorian-share-modal']);
    this.titleEl.setText(t('share.title'));

    // Get active note
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.extension !== 'md') {
      const empty = contentEl.createDiv({ cls: 'ti-empty' });
      setIcon(empty.createDiv({ cls: 'ti-empty-icon' }), 'file-text');
      empty.createEl('p', { text: t('share.noActive') });
      return;
    }

    this.exportPath = (file.parent?.path ?? '').replace(/^\/+$/, '');

    contentEl.createEl('p', { cls: 'ti-intro', text: isZh()
      ? '将当前笔记和引用的图片打包，方便分享。原笔记和图片保留。'
      : 'Package the current note and its images for sharing. Original files are retained.' });
    const context = contentEl.createDiv({ cls: 'ti-context' });
    context.createSpan({ cls: 'ti-muted', text: isZh() ? '分享笔记' : 'Note to share' });
    context.createSpan({ text: file.basename, attr: { title: file.path } });
    const form = contentEl.createDiv({ cls: 'ti-form-group' });

    // Export format
    new Setting(form)
      .setName(isZh() ? '打包格式' : 'Package format')
      .addDropdown((dropdown) => {
        dropdown.addOption('folder', t('share.folderFormat'));
        dropdown.addOption('zip', t('share.zipFormat'));
        dropdown.setValue(this.format);
        dropdown.onChange((value) => {
          this.format = value as 'folder' | 'zip';
        });
      });

    // Export destination is always a vault-relative directory.
    new Setting(form)
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
    new Setting(form)
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
    const footer = contentEl.createDiv({ cls: 'ti-footer' });
    const actions = footer.createDiv({ cls: 'ti-footer-actions' });
    const cancel = actions.createEl('button', { text: isZh() ? '取消' : 'Cancel', cls: 'ti-secondary-action' });
    cancel.addEventListener('click', () => this.close());
    const exportBtn = actions.createEl('button', {
      text: isZh() ? '导出笔记' : 'Export note',
      cls: 'mod-cta',
    });
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      contentEl.inert = true;
      const format = this.format;
      exportBtn.textContent = t('share.creating');
      try {
        const result = format === 'folder'
          ? await this.manager.exportAsFolder(file, this.exportPath)
          : await this.manager.exportAsZip(file, this.exportPath);
        const outputPath = result.path;
        new Notice(t('share.success', { path: outputPath }) + (isZh()
          ? `；包含 ${result.images} 张图片，${result.unpackaged} 处未打包引用保留原文。`
          : `; ${result.images} images, ${result.unpackaged} unpackaged references retained.`));

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
        exportBtn.textContent = isZh() ? '导出笔记' : 'Export note';
      }
    });
  }

  onClose(): void {
    this.containerEl.removeClasses(['typorian-ui', 'typorian-share-modal']);
    this.contentEl.inert = false;
    this.contentEl.empty();
  }
}
