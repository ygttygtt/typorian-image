import { App, PluginSettingTab, Setting } from 'obsidian';
import type TyporianImagePlugin from '../main';
import { t } from './locale';
import { ICON_PRESETS, getIconSvg } from './icon-utils';
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

    // --- Asset folder path ---
    new Setting(containerEl)
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

    // --- Wiki link conversion toggle ---
    new Setting(containerEl)
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

    // --- Scan code blocks toggle ---
    new Setting(containerEl)
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

    // --- Manual attachment folder ---
    new Setting(containerEl)
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

    // --- Show restructure tool toggle ---
    new Setting(containerEl)
      .setName(t('settings.showRestructure.name'))
      .setDesc(t('settings.showRestructure.desc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRestructureTool)
          .onChange(async (value) => {
            this.plugin.settings.showRestructureTool = value;
            await this.plugin.saveSettings();
            this.plugin.refreshRibbonIcons();
          })
      );

    // --- Icon settings ---
    containerEl.createEl('h3', { text: t('settings.icons') });

    const iconCategories: Array<{ key: keyof TyporianSettings; labelKey: string; category: string }> = [
      { key: 'iconImageAudit', labelKey: 'settings.icons.imageAudit', category: 'Image Audit' },
      { key: 'iconShare', labelKey: 'settings.icons.share', category: 'Share' },
      { key: 'iconRestructure', labelKey: 'settings.icons.restructure', category: 'Restructure' },
    ];

    for (const { key, labelKey, category } of iconCategories) {
      const presets = ICON_PRESETS[category] || [];
      const currentIcon = (this.plugin.settings as any)[key] || presets[0];
      const setting = new Setting(containerEl)
        .setName(t(labelKey as any));

      // Icon preview — insert as first child of .setting-item, absolute positioned left
      const preview = document.createElement('div');
      preview.className = 'typorian-icon-preview';
      preview.innerHTML = getIconSvg(currentIcon);
      setting.settingEl.insertBefore(preview, setting.settingEl.firstChild);
      setting.settingEl.style.position = 'relative';

      setting.addDropdown((dropdown) => {
        for (const icon of presets) {
          dropdown.addOption(icon, icon);
        }
        dropdown.setValue(currentIcon);
        dropdown.onChange(async (value) => {
          (this.plugin.settings as any)[key] = value;
          await this.plugin.saveSettings();
          this.plugin.refreshRibbonIcons();
          preview.innerHTML = getIconSvg(value);
        });
      });
    }

    // --- Current behavior info (bottom) ---
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
