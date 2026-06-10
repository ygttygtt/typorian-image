import { App, Modal, Notice, TFile, MarkdownView } from 'obsidian';
import { TyporianSettings } from './settings';
import { getIconSvg } from './icon-utils';
import { t } from './locale';
import { IMAGE_EXTENSIONS } from './orphan-types';
import { extractCodeBlockRanges, isInsideCodeBlock } from './code-block-filter';
import { PathUtils } from './path-utils';
const WIKI_REGEX = /!\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]/g;

interface WikiLinkItem {
  rawLink: string;
  rawPath: string;
  alt: string;
  notePath: string;
  line: number;
  resolvedFile: TFile | null;
}

export class WikiConverterModal extends Modal {
  private settings: TyporianSettings;
  private items: WikiLinkItem[] = [];
  private checkboxes: Map<number, HTMLInputElement> = new Map();
  private selectAllCheckbox: HTMLInputElement | null = null;
  private convertButton: HTMLButtonElement | null = null;
  private listContainer: HTMLDivElement | null = null;
  private summaryEl: HTMLElement | null = null;
  private scanMode: 'current' | 'all' = 'current';

  constructor(app: App, settings: TyporianSettings) {
    super(app);
    this.settings = settings;
  }

  async onOpen(): Promise<void> {
    this.titleEl.setText(t('wiki.title'));
    await this.scanAndRender();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async scanAndRender(): Promise<void> {
    this.contentEl.empty();
    this.checkboxes.clear();

    this.contentEl.createEl('p', { text: t('wiki.scanning'), cls: 'orphan-status' });
    this.items = await this.scanWikiLinks(this.scanMode);
    this.contentEl.empty();

    if (this.items.length === 0) {
      this.contentEl.createEl('p', { text: t('wiki.empty'), cls: 'orphan-status' });
    } else {
      this.renderHeader();
      this.renderList();
    }

    this.renderFooter();
  }

  private renderHeader(): void {
    const header = this.contentEl.createDiv({ cls: 'orphan-header' });

    // Scan mode toggle buttons
    const modeGroup = header.createDiv({ cls: 'wiki-mode-group' });
    const currentBtn = modeGroup.createEl('button', {
      text: t('wiki.modeCurrent'),
      cls: `wiki-mode-btn${this.scanMode === 'current' ? ' is-active' : ''}`,
    });
    const allBtn = modeGroup.createEl('button', {
      text: t('wiki.modeAll'),
      cls: `wiki-mode-btn${this.scanMode === 'all' ? ' is-active' : ''}`,
    });
    currentBtn.addEventListener('click', async () => {
      this.scanMode = 'current';
      await this.scanAndRender();
    });
    allBtn.addEventListener('click', async () => {
      this.scanMode = 'all';
      await this.scanAndRender();
    });

    // Select all
    const selectAllLabel = header.createEl('label', { cls: 'orphan-select-all-label' });
    this.selectAllCheckbox = selectAllLabel.createEl('input', { type: 'checkbox' });
    selectAllLabel.createSpan({ text: t('orphan.selectAll') });
    this.selectAllCheckbox.addEventListener('change', () => {
      const allChecked = Array.from(this.checkboxes.values()).every((cb) => cb.checked);
      // If all are checked, deselect all. Otherwise, select all.
      const newState = !allChecked;
      this.checkboxes.forEach((cb) => { cb.checked = newState; });
      this.updateConvertButton();
    });

    this.updateSummary();
  }

  private renderList(): void {
    this.listContainer = this.contentEl.createDiv({ cls: 'orphan-list' });

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const isBroken = !item.resolvedFile;
      const row = this.listContainer.createDiv({
        cls: `orphan-item${isBroken ? ' wiki-item-broken' : ''}`,
      });

      // Checkbox — only for resolvable items
      if (!isBroken) {
        const checkbox = row.createEl('input', { type: 'checkbox', cls: 'orphan-checkbox' });
        checkbox.checked = true;
        this.checkboxes.set(i, checkbox);
        checkbox.addEventListener('change', () => {
          this.syncSelectAll();
          this.updateConvertButton();
        });
      } else {
        // Placeholder for alignment
        row.createDiv({ cls: 'orphan-checkbox-placeholder' });
      }

      // Thumbnail — only for resolvable
      if (item.resolvedFile) {
        const img = row.createEl('img', { cls: 'orphan-thumbnail' });
        img.src = this.app.vault.getResourcePath(item.resolvedFile);
        img.alt = item.rawPath;
      } else {
        // Placeholder icon for broken
        const iconEl = row.createDiv({ cls: 'wiki-broken-icon' });
        iconEl.innerHTML = getIconSvg('link-2-off');
      }

      // Info
      const info = row.createDiv({ cls: 'orphan-info' });
      info.createDiv({
        text: item.rawLink,
        cls: `orphan-path${isBroken ? ' wiki-broken-text' : ''}`,
      });
      info.createDiv({
        text: `${item.notePath.split('/').pop()}:${item.line}`,
        cls: 'orphan-size',
      });

      // Action buttons
      const actions = row.createDiv({ cls: 'orphan-actions' });

      // Navigate to line button
      const gotoBtn = actions.createEl('button', {
        cls: 'orphan-locate-btn',
        attr: { 'aria-label': t('orphan.locateNote'), title: t('orphan.locateNote') },
      });
      gotoBtn.innerHTML = getIconSvg('file-text');
      const notePath = item.notePath;
      const lineNum = item.line;
      gotoBtn.addEventListener('click', async (evt) => {
        evt.stopPropagation();
        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (!(file instanceof TFile)) return;
        const leaf = this.app.workspace.getLeaf();
        await leaf.openFile(file);
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
          const editor = activeView.editor;
          const line = Math.max(0, lineNum - 1);
          editor.setCursor(line, 0);
          editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
        }
      });

      // Delete button — for broken items
      if (isBroken) {
        const deleteBtn = actions.createEl('button', {
          cls: 'orphan-locate-btn',
          attr: { 'aria-label': t('orphan.removeLink'), title: t('orphan.removeLink') },
        });
        deleteBtn.innerHTML = getIconSvg('trash-2');
        const rawLink = item.rawLink;
        deleteBtn.addEventListener('click', async (evt) => {
          evt.stopPropagation();
          const file = this.app.vault.getAbstractFileByPath(notePath);
          if (!(file instanceof TFile)) return;
          const content = await this.app.vault.read(file);
          const idx = content.indexOf(rawLink);
          if (idx === -1) return;
          const newContent = content.substring(0, idx) + content.substring(idx + rawLink.length);
          await this.app.vault.modify(file, newContent);
          await this.scanAndRender();
        });
      }

      // Click row to toggle checkbox (only for resolvable)
      if (!isBroken) {
        row.addEventListener('click', (evt) => {
          if (actions.contains(evt.target as Node)) return;
          const cb = this.checkboxes.get(i);
          if (!cb || evt.target === cb) return;
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        });
      }
    }

    // Set initial checkbox state
    this.checkboxes.forEach((cb) => { cb.checked = true; });
    if (this.selectAllCheckbox) this.selectAllCheckbox.checked = true;
    this.updateConvertButton();
  }

  private renderFooter(): void {
    const footer = this.contentEl.createDiv({ cls: 'orphan-footer' });
    const leftGroup = footer.createDiv({ cls: 'orphan-footer-left' });
    const rightGroup = footer.createDiv({ cls: 'orphan-footer-right' });

    const cancelBtn = leftGroup.createEl('button', { text: t('orphan.cancel') });
    cancelBtn.addEventListener('click', () => this.close());

    const refreshBtn = leftGroup.createEl('button', { cls: 'orphan-refresh-btn' });
    refreshBtn.innerHTML = getIconSvg('refresh-cw');
    refreshBtn.addEventListener('click', () => this.scanAndRender());

    this.convertButton = rightGroup.createEl('button', {
      text: t('wiki.convert'),
      cls: 'mod-cta',
    });
    this.convertButton.disabled = true;
    this.convertButton.addEventListener('click', () => this.handleConvert());
  }

  private updateSummary(): void {
    const old = this.contentEl.querySelector('.orphan-header .orphan-summary');
    if (old) old.remove();
    const header = this.contentEl.querySelector('.orphan-header');
    if (header) {
      const brokenCount = this.items.filter(i => !i.resolvedFile).length;
      const resolvableCount = this.items.length - brokenCount;
      let text = `${resolvableCount} ${t('wiki.summary')}`;
      if (brokenCount > 0) {
        text += ` · ${brokenCount} ${t('wiki.broken')}`;
      }
      this.summaryEl = header.createSpan({
        text,
        cls: 'orphan-summary',
      });
    }
  }

  private syncSelectAll(): void {
    const allChecked = Array.from(this.checkboxes.values()).every((cb) => cb.checked);
    if (this.selectAllCheckbox) this.selectAllCheckbox.checked = allChecked;
  }

  private updateConvertButton(): void {
    if (!this.convertButton) return;
    let count = 0;
    this.checkboxes.forEach((cb) => { if (cb.checked) count++; });
    this.convertButton.disabled = count === 0;
    this.convertButton.textContent = count > 0
      ? t('wiki.convertCount', { count })
      : t('wiki.convert');
  }

  private async handleConvert(): Promise<void> {
    const selected = new Set<number>();
    this.checkboxes.forEach((cb, i) => { if (cb.checked) selected.add(i); });
    if (selected.size === 0) return;

    // Group by note
    const byNote = new Map<string, WikiLinkItem[]>();
    for (const i of selected) {
      const item = this.items[i];
      if (!byNote.has(item.notePath)) byNote.set(item.notePath, []);
      byNote.get(item.notePath)!.push(item);
    }

    let totalConverted = 0;

    for (const [notePath, noteItems] of byNote) {
      const file = this.app.vault.getAbstractFileByPath(notePath);
      if (!(file instanceof TFile)) continue;

      const content = await this.app.vault.read(file);
      const noteDir = (file.parent?.path ?? '').replace(/^\/+$/, '');
      let newContent = content;

      // Sort by position descending to preserve offsets
      const positions = noteItems.map((item) => ({
        item,
        pos: newContent.indexOf(item.rawLink),
      })).filter((p) => p.pos !== -1);
      positions.sort((a, b) => b.pos - a.pos);

      for (const { item, pos } of positions) {
        if (!item.resolvedFile) continue;
        const relPath = PathUtils.computeRelativePath(noteDir, item.resolvedFile.path);
        const encodedPath = relPath.replace(/ /g, '%20');
        const altText = item.alt || item.resolvedFile?.basename || item.rawPath.replace(/\.\w+$/, '');
        const newLink = `![${altText}](${encodedPath})`;
        newContent = newContent.substring(0, pos) + newLink + newContent.substring(pos + item.rawLink.length);
        totalConverted++;
      }

      if (newContent !== content) {
        await this.app.vault.modify(file, newContent);
      }
    }

    new Notice(t('wiki.convertDone', { count: totalConverted }));
    await this.scanAndRender();
  }

  private async scanWikiLinks(mode: 'current' | 'all'): Promise<WikiLinkItem[]> {
    const items: WikiLinkItem[] = [];

    let files: TFile[];
    if (mode === 'current') {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      files = view?.file ? [view.file] : [];
    } else {
      files = this.app.vault.getMarkdownFiles();
    }

    for (const mdFile of files) {
      const content = await this.app.vault.read(mdFile);
      const codeRanges = this.settings.scanCodeBlocks ? [] : extractCodeBlockRanges(content);
      let match: RegExpExecArray | null;
      WIKI_REGEX.lastIndex = 0;

      while ((match = WIKI_REGEX.exec(content)) !== null) {
        if (codeRanges.length > 0 && isInsideCodeBlock(match.index, codeRanges)) continue;
        const rawPath = match[1].trim();
        if (!rawPath || rawPath.startsWith('http')) continue;

        // Try to resolve
        let resolved: TFile | null = this.app.metadataCache.getFirstLinkpathDest(rawPath, mdFile.path);

        // Fallback 1: manual attachment folder
        if (!resolved && this.settings.manualAttachmentFolder) {
          const p = `${this.settings.manualAttachmentFolder}/${rawPath}`.replace(/\/\//g, '/');
          const f = this.app.vault.getAbstractFileByPath(p);
          if (f instanceof TFile && IMAGE_EXTENSIONS.has(f.extension.toLowerCase())) resolved = f;
        }

        // Fallback 2: Obsidian attachment config
        if (!resolved) {
          try {
            const af = (this.app.vault as any).getConfig?.('attachmentFolderPath');
            if (af && typeof af === 'string') {
              const p = `${af}/${rawPath}`.replace(/\/\//g, '/');
              const f = this.app.vault.getAbstractFileByPath(p);
              if (f instanceof TFile && IMAGE_EXTENSIONS.has(f.extension.toLowerCase())) resolved = f;
            }
          } catch {}
        }

        // Filter: only include if it looks like an image (has image extension, or resolved to image)
        const ext = rawPath.split('.').pop()?.toLowerCase() || '';
        const isImageExt = IMAGE_EXTENSIONS.has(ext);
        const isResolvedImage = resolved && IMAGE_EXTENSIONS.has(resolved.extension.toLowerCase());

        // Include if: resolved to image, OR has image extension (even if broken)
        if (!isResolvedImage && !isImageExt) continue;

        const line = content.substring(0, match.index).split('\n').length;
        items.push({
          rawLink: match[0],
          rawPath,
          alt: match[2] || '',
          notePath: mdFile.path,
          line,
          resolvedFile: isResolvedImage ? resolved : null,
        });
      }
    }

    return items;
  }
}
