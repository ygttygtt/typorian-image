import { App, Modal, Notice, TFile, MarkdownView, setIcon } from 'obsidian';
import { TyporianSettings } from '../settings';
import { isZh, t } from './locale';
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
  private convertButton: HTMLButtonElement | null = null;
  private allCheckbox: HTMLInputElement | null = null;

  constructor(app: App, private settings: TyporianSettings,
    private saveSettings: () => Promise<void>, note?: TFile | null, scope: 'current' | 'all' = 'current') {
    super(app);
    this.note = note === undefined ? app.workspace.getActiveFile() : note;
    this.mode = scope;
  }

  async onOpen(): Promise<void> {
    this.containerEl.addClass('typorian-ui', 'typorian-converter');
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

  private renderEmpty(icon: string, title: string, description: string): void {
    const empty = this.contentEl.createDiv({ cls: 'ti-empty' });
    setIcon(empty.createDiv({ cls: 'ti-empty-icon' }), icon);
    empty.createEl('p', { text: title });
    empty.createEl('p', { text: description });
  }

  private async refresh(): Promise<void> {
    this.contentEl.empty();
    this.renderEmpty('loader-circle', t('wiki.scanning'), '');
    await this.scan();
    this.contentEl.empty();
    this.checkboxes.clear();
    this.convertButton = null;
    this.allCheckbox = null;
    const toolbar = this.contentEl.createDiv({ cls: 'ti-toolbar' });
    const context = toolbar.createDiv({ cls: 'ti-context' });
    const modeSelect = context.createEl('select', { attr: { 'aria-label': t('wiki.modeCurrent') + ' / ' + t('wiki.modeAll') } });
    modeSelect.createEl('option', { value: 'current', text: t('wiki.modeCurrent') }).disabled = !this.note;
    modeSelect.createEl('option', { value: 'all', text: t('wiki.modeAll') });
    modeSelect.value = this.mode;
    modeSelect.addEventListener('change', () => { this.mode = modeSelect.value as 'current' | 'all'; void this.refresh(); });
    const noteLabel = context.createSpan({ text: this.mode === 'current' ? this.note?.basename ?? t('share.noActive') : t('wiki.modeAll'), cls: 'ti-context-name' });
    if (this.mode === 'current' && this.note) noteLabel.title = this.note.path;
    const refresh = toolbar.createEl('button', { cls: 'ti-icon-button', attr: { 'aria-label': t('orphan.refresh'), title: t('orphan.refresh') } });
    setIcon(refresh, 'refresh-cw');
    refresh.addEventListener('click', () => void this.refresh());
    const convertible = this.items.filter(item => !item.reason).length;
    if (!this.items.length) {
      this.renderEmpty(this.missing ? 'image-off' : 'circle-check', this.missing
        ? isZh() ? '图片引用需要先修复' : 'Image references need repair'
        : t('wiki.empty'), this.missing
        ? isZh() ? `${this.missing} 处引用未找到图片，请到图片检查处理。` : `${this.missing} references have missing images. Open Image Check to resolve them.`
        : isZh() ? '当前范围没有需要转换的 Wiki 图片引用。' : 'No Wiki image references to convert in this scope.');
    } else {
      this.contentEl.createEl('p', { text: t('wiki.resultSummary', { convertible, missing: this.missing, retained: this.items.length - convertible }), cls: 'ti-summary' });
      if (convertible) {
        const batch = this.contentEl.createDiv({ cls: 'ti-batch' });
        const label = batch.createEl('label', { cls: 'ti-select-all' });
        this.allCheckbox = label.createEl('input', { type: 'checkbox' });
        this.allCheckbox.checked = true;
        label.createSpan({ text: t('orphan.selectAll') });
        this.allCheckbox.addEventListener('change', () => {
          for (const checkbox of this.checkboxes.values()) checkbox.checked = this.allCheckbox!.checked;
          this.updateButton();
        });
      }
      const list = this.contentEl.createDiv({ cls: 'ti-list' });
      this.items.forEach((item, index) => {
        const row = list.createDiv({ cls: 'ti-card' });
        const header = row.createDiv({ cls: 'ti-toolbar' });
        const identity = header.createDiv({ cls: 'ti-context' });
        if (!item.reason) {
          const checkbox = identity.createEl('input', { type: 'checkbox', attr: { 'aria-label': item.image.name } });
          checkbox.checked = true;
          this.checkboxes.set(index, checkbox);
          checkbox.addEventListener('change', () => this.updateButton());
        }
        identity.createSpan({ text: item.image.name });
        const locate = header.createEl('button', { text: `${item.note.basename} · ${item.line}`, cls: 'ti-location', attr: { title: `${item.note.path}:${item.line}` } });
        locate.addEventListener('click', async () => {
          const leaf = this.app.workspace.getLeaf('tab');
          await leaf.openFile(item.note);
          if (leaf.view instanceof MarkdownView && leaf.view.getMode() === 'source') {
            const line = item.line - 1;
            leaf.view.editor.setCursor(line, 0);
            leaf.view.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
          }
        });
        row.createEl('code', { text: item.raw, cls: 'ti-reference' });
        const file = row.createDiv({ cls: 'ti-file' });
        const preview = file.createEl('img', { cls: 'ti-thumbnail', attr: { alt: item.image.name } });
        preview.src = this.app.vault.getResourcePath(item.image);
        file.createDiv({ text: item.image.path, cls: 'ti-file-info ti-path' });
        if (item.reason) row.createEl('p', { text: t(item.reason === 'size' ? 'wiki.sizeRetained' : 'wiki.nameRetained'), cls: 'ti-muted' });
      });
    }
    const footer = this.contentEl.createDiv({ cls: 'ti-footer' });
    if (this.missing || this.items.some(item => item.reason === 'name')) {
      const check = footer.createEl('button', { text: t('wiki.openCheck') });
      check.addEventListener('click', () => {
        this.close();
        new ImageCheckModal(this.app, this.settings, this.saveSettings, 'issues', this.note, this.mode).open();
      });
    } else if (this.items.length) footer.createSpan({ text: t('wiki.formatOnly'), cls: 'ti-muted' });
    const actions = footer.createDiv({ cls: 'ti-footer-actions' });
    actions.createEl('button', { text: t('orphan.cancel'), cls: 'ti-secondary-action' }).addEventListener('click', () => this.close());
    if (convertible) {
      this.convertButton = actions.createEl('button', { cls: 'mod-cta' });
      this.convertButton.addEventListener('click', () => void this.convert());
      this.updateButton();
    }
  }

  private updateButton(): void {
    const count = [...this.checkboxes.values()].filter(checkbox => checkbox.checked).length;
    if (this.convertButton) {
      this.convertButton.textContent = t(this.mode === 'current' ? 'wiki.convertCurrentCount' : 'wiki.convertAllCount', { count });
      this.convertButton.disabled = count === 0;
    }
    if (this.allCheckbox) {
      this.allCheckbox.checked = count === this.checkboxes.size;
      this.allCheckbox.indeterminate = count > 0 && count < this.checkboxes.size;
    }
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
