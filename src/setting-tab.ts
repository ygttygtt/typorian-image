import { App, PluginSettingTab, Setting } from 'obsidian';
import type TyporianImagePlugin from '../main';
import { t } from './locale';
import { ICON_PRESETS } from './icon-utils';
import type { TyporianSettings } from './settings';

export class TyporianSettingTab extends PluginSettingTab {
  plugin: TyporianImagePlugin;

  constructor(app: App, plugin: TyporianImagePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // --- Naming strategy ---
    new Setting(containerEl)
      .setName(t('settings.namingStrategy.name'))
      .setDesc(t('settings.namingStrategy.desc'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('original', t('settings.namingStrategy.original'))
          .addOption('timestamp', t('settings.namingStrategy.timestamp'))
          .setValue(this.plugin.settings.namingStrategy)
          .onChange(async (value: string) => {
            this.plugin.settings.namingStrategy = value as 'original' | 'timestamp';
            await this.plugin.saveSettings();
          })
      );

    // --- Auto rename on conflict ---
    new Setting(containerEl)
      .setName(t('settings.autoRename.name'))
      .setDesc(t('settings.autoRename.desc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoRenameOnConflict)
          .onChange(async (value) => {
            this.plugin.settings.autoRenameOnConflict = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Intercept image path toggle ---
    new Setting(containerEl)
      .setName(t('settings.interceptImage.name'))
      .setDesc(t('settings.interceptImage.desc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.interceptImagePath)
          .onChange(async (value) => {
            this.plugin.settings.interceptImagePath = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Current behavior info ---
    containerEl.createEl('h3', { text: t('settings.currentBehavior') });
    const infoEl = containerEl.createEl('div', {
      cls: 'setting-item-description',
    });
    infoEl.createEl('p', { text: t('settings.currentBehavior.desc1') });
    infoEl.createEl('p', {
      text: `${t('settings.currentBehavior.desc2')}  ${this.plugin.settings.assetFolderPath}`,
    });
    infoEl.createEl('p', {
      text: `${t('settings.currentBehavior.desc3')}  ![image](${this.plugin.settings.assetFolderPath.replace('${notename}', 'MyNote')}image.png)`,
    });

    // --- Advanced (collapsible) ---
    const advancedHeader = containerEl.createEl('h3', {
      text: t('settings.advanced'),
      cls: 'typorian-advanced-header',
    });
    const advancedContent = containerEl.createDiv({
      cls: 'typorian-advanced-content',
    });
    advancedContent.style.display = 'none';
    advancedContent.style.overflow = 'hidden';

    advancedHeader.addEventListener('click', () => {
      const isOpen = advancedContent.style.display !== 'none';
      advancedContent.style.display = isOpen ? 'none' : 'block';
      advancedHeader.classList.toggle('is-open', !isOpen);
    });

    // --- Asset folder path (inside advanced) ---
    new Setting(advancedContent)
      .setName(t('settings.assetPath.name'))
      .setDesc(t('settings.assetPath.desc'))
      .addText((text) =>
        text
          .setPlaceholder('./${notename}.assets/')
          .setValue(this.plugin.settings.assetFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.assetFolderPath = value || './${notename}.assets/';
            await this.plugin.saveSettings();
          })
      );

    // --- Wiki link conversion toggle (inside advanced) ---
    new Setting(advancedContent)
      .setName(t('settings.wikiConversion.name'))
      .setDesc(t('settings.wikiConversion.desc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableWikiLinkConversion)
          .onChange(async (value) => {
            this.plugin.settings.enableWikiLinkConversion = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Scan code blocks toggle (inside advanced) ---
    new Setting(advancedContent)
      .setName(t('settings.scanCodeBlocks.name'))
      .setDesc(t('settings.scanCodeBlocks.desc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.scanCodeBlocks)
          .onChange(async (value) => {
            this.plugin.settings.scanCodeBlocks = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Manual attachment folder (inside advanced) ---
    new Setting(advancedContent)
      .setName(t('settings.manualAttachmentFolder.name'))
      .setDesc(t('settings.manualAttachmentFolder.desc'))
      .addText((text) =>
        text
          .setPlaceholder('attachments')
          .setValue(this.plugin.settings.manualAttachmentFolder)
          .onChange(async (value) => {
            this.plugin.settings.manualAttachmentFolder = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Show restructure tool toggle (inside advanced) ---
    new Setting(advancedContent)
      .setName(t('settings.showRestructure.name'))
      .setDesc(t('settings.showRestructure.desc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRestructureTool)
          .onChange(async (value) => {
            this.plugin.settings.showRestructureTool = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Icon settings (inside advanced) ---
    advancedContent.createEl('h4', { text: t('settings.icons') });

    const iconCategories: Array<{ key: keyof TyporianSettings; labelKey: string; category: string }> = [
      { key: 'iconImageAudit', labelKey: 'settings.icons.imageAudit', category: 'Image Audit' },
      { key: 'iconShare', labelKey: 'settings.icons.share', category: 'Share' },
      { key: 'iconRestructure', labelKey: 'settings.icons.restructure', category: 'Restructure' },
    ];

    for (const { key, labelKey, category } of iconCategories) {
      const presets = ICON_PRESETS[category] || [];
      new Setting(advancedContent)
        .setName(t(labelKey as any))
        .addDropdown((dropdown) => {
          for (const icon of presets) {
            dropdown.addOption(icon, icon);
          }
          dropdown.setValue((this.plugin.settings as any)[key] || presets[0]);
          dropdown.onChange(async (value) => {
            (this.plugin.settings as any)[key] = value;
            await this.plugin.saveSettings();
            this.plugin.refreshRibbonIcons();
          });
        });
    }

    // --- Typora alignment guide ---
    containerEl.createEl('h3', { text: t('settings.typoraGuide') });
    const guideEl = containerEl.createEl('div', {
      cls: 'setting-item-description',
    });
    guideEl.createEl('p', { text: t('settings.typoraGuide.intro') });

    const steps = guideEl.createEl('ol');
    steps.createEl('li', { text: t('settings.typoraGuide.step1') });
    steps.createEl('li', { text: t('settings.typoraGuide.step2') });
    steps.createEl('li', {
      text: `${t('settings.typoraGuide.step3')}  ./${'${filename}'}.assets/`,
    });
    steps.createEl('li', { text: t('settings.typoraGuide.step4') });

    guideEl.createEl('p', { text: t('settings.typoraGuide.note') });
  }
}
