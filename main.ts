import { Plugin, setIcon } from 'obsidian';
import { ViewPlugin } from '@codemirror/view';
import { ImageHandler } from './src/image-handler';
import { createImagePastePlugin } from './src/cm6-paste-plugin';
import { TyporianSettingTab } from './src/setting-tab';
import { TyporianSettings, DEFAULT_SETTINGS } from './src/settings';
import { OrphanImageModal } from './src/orphan-modal';
import { ShareModal } from './src/share-modal';
import { RestructureModal } from './src/restructure-modal';
import { initLocale, t } from './src/locale';

export default class TyporianImagePlugin extends Plugin {
  settings!: TyporianSettings;
  private imageHandler!: ImageHandler;
  private cm6Extension!: ViewPlugin<any>;
  private ribbonIconEl!: HTMLElement;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize i18n
    initLocale(window.localStorage.getItem('language') || navigator.language);

    this.imageHandler = new ImageHandler(this.app, this.settings);
    this.cm6Extension = createImagePastePlugin(this.imageHandler);
    this.registerEditorExtension(this.cm6Extension);

    this.addSettingTab(new TyporianSettingTab(this.app, this));

    // Image Audit: Ribbon icon
    this.ribbonIconEl = this.addRibbonIcon(
      this.settings.iconImageAudit || 'trash-2',
      t('orphan.title'),
      () => { new OrphanImageModal(this.app, this.settings).open(); }
    );

    // Image Audit: Command palette
    this.addCommand({
      id: 'orphan-image-cleanup',
      name: t('orphan.title'),
      callback: () => { new OrphanImageModal(this.app, this.settings).open(); },
    });

    // Quick Share: Ribbon icon
    this.addRibbonIcon(
      this.settings.iconShare || 'share-2',
      t('share.title'),
      () => { new ShareModal(this.app, this.settings).open(); }
    );

    // Quick Share: Command palette
    this.addCommand({
      id: 'share-note',
      name: t('share.title'),
      callback: () => { new ShareModal(this.app, this.settings).open(); },
    });

    // Restructure: Ribbon icon (only if enabled)
    if (this.settings.showRestructureTool) {
      this.addRibbonIcon(
        this.settings.iconRestructure || 'git-fork',
        t('restructure.title'),
        () => { new RestructureModal(this.app, this.settings).open(); }
      );
    }

    // Restructure: Command palette (always registered, checkCallback gates visibility)
    this.addCommand({
      id: 'restructure-vault',
      name: t('restructure.title'),
      checkCallback: (checking) => {
        if (this.settings.showRestructureTool) {
          if (!checking) {
            new RestructureModal(this.app, this.settings).open();
          }
          return true;
        }
        return false;
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

  refreshRibbonIcons(): void {
    if (this.ribbonIconEl) {
      setIcon(this.ribbonIconEl, this.settings.iconImageAudit || 'trash-2');
    }
  }
}
