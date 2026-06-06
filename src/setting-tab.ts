import { App, PluginSettingTab, Setting } from 'obsidian';
import type TyporianImagePlugin from '../main';

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
      .setName('Image naming strategy')
      .setDesc('How image filenames are generated when pasted or dropped.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('original', 'Keep original filename')
          .addOption('timestamp', 'Use timestamp (YYYYMMDDHHmmss)')
          .setValue(this.plugin.settings.namingStrategy)
          .onChange(async (value: string) => {
            this.plugin.settings.namingStrategy = value as 'original' | 'timestamp';
            await this.plugin.saveSettings();
          })
      );

    // --- Auto rename on conflict ---
    new Setting(containerEl)
      .setName('Auto-rename on conflict')
      .setDesc(
        'Append a sequence number when a file with the same name already exists in the assets folder. (e.g. image.png -> image(1).png)'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoRenameOnConflict)
          .onChange(async (value) => {
            this.plugin.settings.autoRenameOnConflict = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Current behavior info ---
    containerEl.createEl('h3', { text: 'Current behavior' });
    const infoEl = containerEl.createEl('div', {
      cls: 'setting-item-description',
    });
    infoEl.createEl('p', {
      text: 'When you paste or drop an image into a note, the plugin saves it to the note\'s sibling .assets folder and inserts a standard Markdown image link.',
    });
    infoEl.createEl('p', {
      text: 'Asset folder pattern:  ./${notename}.assets/',
    });
    infoEl.createEl('p', {
      text: 'Output syntax:  ![image](./${notename}.assets/image.png)',
    });

    // --- Typora alignment guide ---
    containerEl.createEl('h3', { text: 'Typora alignment guide' });
    const guideEl = containerEl.createEl('div', {
      cls: 'setting-item-description',
    });
    guideEl.createEl('p', {
      text: 'To achieve bidirectional compatibility between Obsidian (with this plugin) and Typora, configure Typora as follows:',
    });

    const steps = guideEl.createEl('ol');
    steps.createEl('li', {
      text: 'Open Typora, go to Preferences > Image.',
    });
    steps.createEl('li', {
      text: 'Under "When insert images", select "Copy image to custom folder".',
    });
    steps.createEl('li', {
      text: 'Enter the path pattern:  ./${filename}.assets/',
    });
    steps.createEl('li', {
      text: 'Ensure "Apply above rules to current file only" is checked.',
    });

    guideEl.createEl('p', {
      text: 'With these settings, both applications will store images in the same .assets folder using identical relative paths, enabling seamless cross-editing.',
    });
  }
}
