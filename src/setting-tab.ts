import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { PathUtils } from './path-utils';
import type TyporianImagePlugin from '../main';
import { t } from './locale';
import { ICON_PRESETS, getIconSvg } from './icon-utils';
import type { TyporianSettings } from '../settings';

export class TyporianSettingTab extends PluginSettingTab {
  plugin: TyporianImagePlugin;

  constructor(app: App, plugin: TyporianImagePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('typorian-ui', 'typorian-settings');
    let section!: HTMLElement;
    const heading = (title: string): void => {
      section = containerEl.createDiv({ cls: 'ti-settings-section' });
      section.createEl('h3', { text: title });
    };

    // ========== Section: 图片粘贴 ==========
    heading(t('settings.section.passive'));

    // --- Intercept image path toggle ---
    new Setting(section)
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

    // --- Naming strategy ---
    new Setting(section)
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
    new Setting(section)
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

    // --- Asset folder path ---
    new Setting(section)
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

    new Setting(section)
      .setName(t('settings.hideAssetFolders.name'))
      .setDesc(t('settings.hideAssetFolders.desc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.hideAssetFolders)
          .onChange(async (value) => {
            this.plugin.settings.hideAssetFolders = value;
            this.plugin.refreshAssetFolderVisibility();
            await this.plugin.saveSettings();
          })
      );

    // ========== Section: 无主图片清理 ==========
    heading(t('settings.section.parsing'));

    // --- Scan code blocks toggle ---
    new Setting(section)
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
    new Setting(section)
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

    heading(t('settings.section.output'));
    new Setting(section)
      .setName(t('settings.restructureOutput.name'))
      .setDesc(t('settings.restructureOutput.desc'))
      .addText((text) => {
        text.setValue(this.plugin.settings.restructureOutputFolder);
        text.inputEl.addEventListener('blur', async () => {
          const value = text.getValue().trim().replace(/\\/g, '/');
          if (!value || value.startsWith('/') || /^[a-z]:/i.test(value) ||
              value.split('/').includes('..') || value.split('/').every(part => part === '.' || part === '')) {
            new Notice(t('settings.restructureOutput.invalid'));
            return;
          }
          this.plugin.settings.restructureOutputFolder = PathUtils.resolveRelativePath('', value);
          await this.plugin.saveSettings();
        });
      });

    heading(t('settings.section.shortcuts'));
    // --- Show Wiki converter toggle ---
    new Setting(section)
      .setName(t('settings.showWikiConverter.name'))
      .setDesc(t('settings.showWikiConverter.desc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showWikiConverter)
          .onChange(async (value) => {
            this.plugin.settings.showWikiConverter = value;
            await this.plugin.saveSettings();
            this.plugin.refreshRibbonIcons();
          })
      );

    // --- Show restructure tool toggle ---
    new Setting(section)
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

    // ========== Section: 图标设置 ==========
    heading(t('settings.icons'));

    const iconCategories: Array<{ key: keyof TyporianSettings; labelKey: string; category: string }> = [
      { key: 'iconImageAudit', labelKey: 'settings.icons.imageAudit', category: 'Image Audit' },
      { key: 'iconWikiConverter', labelKey: 'settings.icons.wikiConverter', category: 'Wiki Converter' },
      { key: 'iconShare', labelKey: 'settings.icons.share', category: 'Share' },
      { key: 'iconRestructure', labelKey: 'settings.icons.restructure', category: 'Restructure' },
    ];

    for (const { key, labelKey, category } of iconCategories) {
      const presets = ICON_PRESETS[category] || [];
      const settingsMap = this.plugin.settings as unknown as Record<string, string>;
      const currentIcon = settingsMap[key as string] || presets[0];
      const setting = new Setting(section)
        .setName(t(labelKey as any));

      // Icon preview — inline inside setting-item-name
      const nameEl = setting.settingEl.querySelector('.setting-item-name');
      const preview = document.createElement('span');
      preview.className = 'typorian-icon-preview';
      preview.innerHTML = getIconSvg(currentIcon);
      if (nameEl) {
        nameEl.insertBefore(preview, nameEl.firstChild);
      }

      setting.addDropdown((dropdown) => {
        for (const icon of presets) {
          dropdown.addOption(icon, icon);
        }
        dropdown.setValue(currentIcon);
        dropdown.onChange(async (value) => {
          (this.plugin.settings as unknown as Record<string, string>)[key as string] = value;
          await this.plugin.saveSettings();
          this.plugin.refreshRibbonIcons();
          preview.innerHTML = getIconSvg(value);
        });
      });
    }

    // ========== Section: 当前行为 ==========
    const behavior = containerEl.createEl('details', { cls: 'ti-settings-guide' });
    behavior.createEl('summary', { text: t('settings.currentBehavior') });
    const infoEl = behavior.createDiv({ cls: 'ti-muted' });
    infoEl.createEl('p', { text: t('settings.currentBehavior.desc1') });
    infoEl.createEl('p', {
      text: `${t('settings.currentBehavior.desc2')}  ${this.plugin.settings.assetFolderPath}`,
    });
    infoEl.createEl('p', {
      text: `${t('settings.currentBehavior.desc3')}  ![image](${this.plugin.settings.assetFolderPath.replace('${notename}', 'MyNote')}image.png)`,
    });

    // ========== Section: Typora 配置对齐指南 ==========
    const guide = containerEl.createEl('details', { cls: 'ti-settings-guide' });
    guide.createEl('summary', { text: t('settings.typoraGuide') });
    const guideEl = guide.createDiv({ cls: 'ti-muted' });
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
