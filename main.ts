import { Plugin, setIcon } from 'obsidian';
import { ViewPlugin } from '@codemirror/view';
import { ImageHandler } from './src/image-handler';
import { createImagePastePlugin } from './src/cm6-paste-plugin';
import { TyporianSettingTab } from './src/setting-tab';
import { TyporianSettings, DEFAULT_SETTINGS } from './settings';
import { ImageCheckModal } from './src/image-check-modal';
import { ShareModal } from './src/share-modal';
import { RestructureModal } from './src/restructure-modal';
import { WikiConverterModal } from './src/wiki-converter-modal';
import { initLocale, t } from './src/locale';

export default class TyporianImagePlugin extends Plugin {
  settings!: TyporianSettings;
  private imageHandler!: ImageHandler;
  private cm6Extension!: ViewPlugin<any>;
  private ribbonAuditEl!: HTMLElement;
  private ribbonShareEl!: HTMLElement;
  private ribbonRestructureEl!: HTMLElement;
  private ribbonWikiEl!: HTMLElement;

  async onload(): Promise<void> {
    await this.loadSettings();
    initLocale(window.localStorage.getItem('language') || navigator.language);

    this.imageHandler = new ImageHandler(this.app, this.settings);
    this.cm6Extension = createImagePastePlugin(this.imageHandler);
    this.registerEditorExtension(this.cm6Extension);

    this.addSettingTab(new TyporianSettingTab(this.app, this));

    this.refreshAssetFolderVisibility();
    this.registerEvent(this.app.workspace.on('window-open', (_workspaceWindow, window) => {
      window.document.body.classList.toggle('typorian-hide-assets', this.settings.hideAssetFolders);
    }));

    // Ribbon icons — add in order: Audit, Share, Restructure
    this.ribbonAuditEl = this.addRibbonIcon(
      this.settings.iconImageAudit || 'trash-2',
      t('orphan.title'),
      () => { new ImageCheckModal(this.app, this.settings, () => this.saveSettings()).open(); }
    );

    this.ribbonWikiEl = this.addRibbonIcon(
      this.settings.iconWikiConverter || 'repeat-2',
      t('wiki.title'),
      () => { new WikiConverterModal(this.app, this.settings, () => this.saveSettings()).open(); }
    );

    if (!this.settings.showWikiConverter && this.ribbonWikiEl) {
      this.ribbonWikiEl.style.display = 'none';
    }

    this.ribbonShareEl = this.addRibbonIcon(
      this.settings.iconShare || 'share-2',
      t('share.title'),
      () => { new ShareModal(this.app, this.settings, () => this.saveSettings()).open(); }
    );

    this.ribbonRestructureEl = this.addRibbonIcon(
      this.settings.iconRestructure || 'git-fork',
      t('restructure.title'),
      () => { new RestructureModal(this.app, this.settings).open(); }
    );

    // Hide restructure ribbon if disabled (addRibbonIcon always adds, we control visibility)
    if (!this.settings.showRestructureTool && this.ribbonRestructureEl) {
      this.ribbonRestructureEl.style.display = 'none';
    }

    // Commands
    this.addCommand({
      id: 'orphan-image-cleanup',
      name: t('orphan.title'),
      callback: () => { new ImageCheckModal(this.app, this.settings, () => this.saveSettings()).open(); },
    });

    this.addCommand({
      id: 'wiki-link-converter',
      name: t('wiki.title'),
      callback: () => { new WikiConverterModal(this.app, this.settings, () => this.saveSettings()).open(); },
    });

    this.addCommand({
      id: 'share-note',
      name: t('share.title'),
      callback: () => { new ShareModal(this.app, this.settings, () => this.saveSettings()).open(); },
    });

    this.addCommand({
      id: 'restructure-vault',
      name: t('restructure.title'),
      callback: () => { new RestructureModal(this.app, this.settings).open(); },
    });
  }

  async onunload(): Promise<void> {
    for (const doc of this.getWorkspaceDocuments()) {
      doc.body.classList.remove('typorian-hide-assets');
    }
    // CM6 extension lifecycle is managed by Obsidian via registerEditorExtension.
    // ViewPlugin.destroy() removes DOM event listeners automatically.
  }

  async loadSettings(): Promise<void> {
    const saved = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof TyporianSettings>) {
      if (saved && Object.prototype.hasOwnProperty.call(saved, key)) {
        (this.settings as unknown as Record<string, unknown>)[key] = saved[key];
      }
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.imageHandler.updateSettings(this.settings);
  }

  refreshAssetFolderVisibility(): void {
    for (const doc of this.getWorkspaceDocuments()) {
      doc.body.classList.toggle('typorian-hide-assets', this.settings.hideAssetFolders);
    }
  }

  private getWorkspaceDocuments(): Set<Document> {
    const documents = new Set<Document>([document]);
    this.app.workspace.iterateAllLeaves((leaf) => {
      documents.add(leaf.view.containerEl.ownerDocument);
    });
    return documents;
  }

  refreshRibbonIcons(): void {
    if (this.ribbonAuditEl) {
      setIcon(this.ribbonAuditEl, this.settings.iconImageAudit || 'trash-2');
    }
    if (this.ribbonShareEl) {
      setIcon(this.ribbonShareEl, this.settings.iconShare || 'share-2');
    }
    if (this.ribbonWikiEl) {
      setIcon(this.ribbonWikiEl, this.settings.iconWikiConverter || 'repeat-2');
      this.ribbonWikiEl.style.display = this.settings.showWikiConverter ? '' : 'none';
    }
    if (this.ribbonRestructureEl) {
      setIcon(this.ribbonRestructureEl, this.settings.iconRestructure || 'git-fork');
      this.ribbonRestructureEl.style.display = this.settings.showRestructureTool ? '' : 'none';
    }
  }
}
