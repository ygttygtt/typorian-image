import { App, Modal, Notice, TFile, MarkdownView } from 'obsidian';
import { TyporianSettings } from '../settings';
import { t } from './locale';
import { IMAGE_EXTENSIONS } from './constants';
import { PathUtils } from './path-utils';
import { createMarkdownImage, isRemoteImagePath, isWikiImageSize, parseWikiImages, resolveActualWikiImage } from './markdown-images';
import { ImageCheckModal } from './image-check-modal';

interface ConversionItem {
  raw: string;
  offset: number;
  alt: string;
  note: TFile;
  line: number;
  image: TFile;
  reason: 'size' | 'name' | null;
}

/** Format conversion only. Missing-image actions belong to ImageCheckModal. */
export class WikiConverterModal extends Modal {
  private readonly note: TFile | null;
  private mode: 'current' | 'all' = 'current';
  private contents = new Map<string, string>();
  private items: ConversionItem[] = [];
  private missing = 0;
  private checkboxes = new Map<number, HTMLInputElement>();
  private convertButton!: HTMLButtonElement;

  constructor(app: App, private settings: TyporianSettings,
    private saveSettings: () => Promise<void>, note?: TFile | null, scope: 'current' | 'all' = 'current') {
    super(app);
    this.note = note === undefined ? app.workspace.getActiveFile() : note;
    this.mode = scope;
  }

  async onOpen(): Promise<void> {
    this.titleEl.setText(t('wiki.title'));
    await this.refresh();
  }

  onClose(): void { this.contentEl.empty(); }

  private async scan(): Promise<void> {
    this.contents.clear();
    this.items = [];
    this.missing = 0;
    const notes = this.mode === 'all' ? this.app.vault.getMarkdownFiles()
      : this.note?.extension === 'md' ? [this.note] : [];
    for (const note of notes) {
      const content = await this.app.vault.read(note);
      this.contents.set(note.path, content);
      for (const reference of parseWikiImages(content, this.settings.scanCodeBlocks)) {
        if (isRemoteImagePath(reference.path)) continue;
        const image = resolveActualWikiImage(this.app, note.path, reference.path, this.settings.manualAttachmentFolder);
        if (!image) {
          if (IMAGE_EXTENSIONS.has(reference.path.split('.').pop()?.toLowerCase() ?? '')) this.missing++;
          continue;
        }
        this.items.push({ raw: reference.raw, offset: reference.index, alt: reference.alt,
          note, line: content.slice(0, reference.index).split('\n').length, image,
          reason: isWikiImageSize(reference.alt) ? 'size'
            : image.path.split('/').some(segment => PathUtils.compatibleImageName(segment) !== segment) ? 'name' : null });
      }
    }
  }

  private async refresh(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.createEl('p', { text: t('wiki.scanning') });
    await this.scan();
    this.contentEl.empty();
    this.checkboxes.clear();
    this.contentEl.createEl('p', { text: t('wiki.formatOnly'), cls: 'setting-item-description' });
    const modes = this.contentEl.createDiv({ cls: 'wiki-mode-group' });
    for (const mode of ['current', 'all'] as const) {
      const button = modes.createEl('button', { text: t(mode === 'current' ? 'wiki.modeCurrent' : 'wiki.modeAll'),
        cls: `wiki-mode-btn${this.mode === mode ? ' is-active' : ''}` });
      button.addEventListener('click', () => { this.mode = mode; void this.refresh(); });
    }
    this.contentEl.createEl('p', { text: this.mode === 'current' ? this.note?.path ?? t('share.noActive') : t('wiki.modeAll'), cls: 'orphan-path' });
    const convertible = this.items.filter(item => !item.reason).length;
    this.contentEl.createEl('p', { text: t('wiki.resultSummary', { convertible, missing: this.missing, retained: this.items.length - convertible }) });
    if (this.missing || this.items.some(item => item.reason === 'name')) {
      const check = this.contentEl.createEl('button', { text: t('wiki.openCheck') });
      check.addEventListener('click', () => {
        this.close();
        new ImageCheckModal(this.app, this.settings, this.saveSettings, 'issues', this.note, this.mode).open();
      });
    }
    if (!this.items.length) this.contentEl.createEl('p', { text: t('wiki.empty') });
    if (convertible) {
      const label = this.contentEl.createEl('label', { cls: 'orphan-select-all-label' });
      const all = label.createEl('input', { type: 'checkbox' });
      all.checked = true;
      label.createSpan({ text: t('orphan.selectAll') });
      all.addEventListener('change', () => {
        for (const checkbox of this.checkboxes.values()) checkbox.checked = all.checked;
        this.updateButton();
      });
    }
    const list = this.contentEl.createDiv({ cls: 'orphan-list' });
    this.items.forEach((item, index) => {
      const row = list.createDiv({ cls: 'orphan-item' });
      if (!item.reason) {
        const checkbox = row.createEl('input', { type: 'checkbox', cls: 'orphan-checkbox' });
        checkbox.checked = true;
        this.checkboxes.set(index, checkbox);
        checkbox.addEventListener('change', () => this.updateButton());
      }
      const preview = row.createEl('img', { cls: 'orphan-thumbnail' });
      preview.src = this.app.vault.getResourcePath(item.image);
      preview.alt = item.alt;
      const info = row.createDiv({ cls: 'orphan-info' });
      info.createDiv({ text: item.raw, cls: 'orphan-path' });
      info.createDiv({ text: `${item.note.path}:${item.line}`, cls: 'orphan-size' });
      info.createDiv({ text: item.image.path, cls: 'orphan-size' });
      if (item.reason) info.createDiv({ text: t(item.reason === 'size' ? 'wiki.sizeRetained' : 'wiki.nameRetained'), cls: 'orphan-size' });
      const locate = row.createEl('button', { text: t('orphan.locateNote') });
      locate.addEventListener('click', async () => {
        const leaf = this.app.workspace.getLeaf();
        await leaf.openFile(item.note);
        if (leaf.view instanceof MarkdownView && leaf.view.getMode() === 'source') {
          const line = item.line - 1;
          leaf.view.editor.setCursor(line, 0);
          leaf.view.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
        }
      });
    });
    const footer = this.contentEl.createDiv({ cls: 'orphan-footer' });
    footer.createEl('button', { text: t('orphan.cancel') }).addEventListener('click', () => this.close());
    footer.createEl('button', { text: t('orphan.refresh') }).addEventListener('click', () => void this.refresh());
    this.convertButton = footer.createEl('button', { cls: 'mod-cta' });
    this.convertButton.addEventListener('click', () => void this.convert());
    this.updateButton();
  }

  private updateButton(): void {
    const count = [...this.checkboxes.values()].filter(checkbox => checkbox.checked).length;
    this.convertButton.textContent = t(this.mode === 'current' ? 'wiki.convertCurrentCount' : 'wiki.convertAllCount', { count });
    this.convertButton.disabled = count === 0;
  }

  private async convert(): Promise<void> {
    const selected = this.items.filter((_, index) => this.checkboxes.get(index)?.checked);
    const notes = new Map<TFile, ConversionItem[]>();
    for (const item of selected) {
      if (!notes.has(item.note)) notes.set(item.note, []);
      notes.get(item.note)!.push(item);
    }
    this.contentEl.inert = true;
    let converted = 0;
    let changed = false;
    try {
      for (const [note, items] of notes) {
        await this.app.vault.process(note, content => {
          if (content !== this.contents.get(note.path)) { changed = true; return content; }
          for (const item of items.sort((a, b) => b.offset - a.offset)) {
            const destination = PathUtils.computeRelativePath(note.parent?.path ?? '', item.image.path);
            content = content.slice(0, item.offset) + createMarkdownImage(item.alt, destination) + content.slice(item.offset + item.raw.length);
            converted++;
          }
          return content;
        });
      }
      if (changed) new Notice(t('common.contentChanged'));
      new Notice(t('wiki.convertDone', { count: converted }));
      await this.refresh();
    } finally { this.contentEl.inert = false; }
  }
}
