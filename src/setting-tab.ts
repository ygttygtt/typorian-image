import { App, PluginSettingTab, Setting } from 'obsidian';
import type TyporianImagePlugin from '../main';
import { t } from './locale';

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
