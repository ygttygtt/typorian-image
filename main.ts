import { Plugin } from 'obsidian';
import { ViewPlugin } from '@codemirror/view';
import { ImageHandler } from './src/image-handler';
import { createImagePastePlugin } from './src/cm6-paste-plugin';
import { TyporianSettingTab } from './src/setting-tab';
import { TyporianSettings, DEFAULT_SETTINGS } from './src/settings';
import { OrphanImageModal } from './src/orphan-modal';
import { initLocale, t } from './src/locale';

export default class TyporianImagePlugin extends Plugin {
  settings!: TyporianSettings;
  private imageHandler!: ImageHandler;
  private cm6Extension!: ViewPlugin<any>;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize i18n
    initLocale(window.localStorage.getItem('language') || navigator.language);

    this.imageHandler = new ImageHandler(this.app, this.settings);
    this.cm6Extension = createImagePastePlugin(this.imageHandler);
    this.registerEditorExtension(this.cm6Extension);

    this.addSettingTab(new TyporianSettingTab(this.app, this));

    // Orphan Image Cleanup: Ribbon icon
    this.addRibbonIcon('trash-2', t('orphan.title'), () => {
      new OrphanImageModal(this.app).open();
    });

    // Orphan Image Cleanup: Command palette
    this.addCommand({
      id: 'orphan-image-cleanup',
      name: t('orphan.title'),
      callback: () => {
        new OrphanImageModal(this.app).open();
      },
    });
  }

  async onunload(): Promise<void> {
    // CM6 extension lifecycle is managed by Obsidian via registerEditorExtension.
    // ViewPlugin.destroy() removes DOM event listeners automatically.
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.imageHandler.updateSettings(this.settings);
  }
}
