import { App, Menu, Modal, Notice, TFile, setIcon } from 'obsidian';
import { TyporianSettings } from '../settings';
import { ImageChecker } from './image-checker';
import { CheckScope, ImageIssue, IssueScan, UnusedScan } from './image-check-types';
import { ImageFilePicker } from './image-file-picker';
import { isZh } from './locale';
import { WikiConverterModal } from './wiki-converter-modal';
import { RestructureModal } from './restructure-modal';
import { PathUtils } from './path-utils';

type CheckTab = 'issues' | 'unused';
const phrase = (zh: string, en: string): string => isZh() ? zh : en;

export class ImageCheckModal extends Modal {
  private checker: ImageChecker;
  private note: TFile | null;
  private tab: CheckTab;
  private scanScope: CheckScope = 'current';
  private issueScan: IssueScan = { issues: [], externalCount: 0, scannedNotes: 0 };
  private unusedScan: UnusedScan = { images: [], folders: [] };
  private selected = new Set<string>();
  private busy = false;
  private closed = false;
  private result = '';

  constructor(app: App, private settings: TyporianSettings, private saveSettings: () => Promise<void>, initialTab: CheckTab = 'issues', note?: TFile | null, initialScope: CheckScope = 'current') {
    super(app);
    const active = note === undefined ? app.workspace.getActiveFile() : note;
    this.note = active?.extension === 'md' ? active : null;
    this.tab = initialTab;
    this.scanScope = initialScope;
    this.checker = new ImageChecker(app, settings);
  }

  async onOpen(): Promise<void> {
    this.containerEl.addClass('typorian-image-check-modal');
    this.titleEl.setText(phrase('图片检查', 'Image check'));
    await this.refresh();
  }

  onClose(): void { this.closed = true; this.contentEl.empty(); }

  private async run(operation: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.render();
    this.contentEl.inert = true;
    try { await operation(); }
    catch (error) { new Notice(phrase('图片检查失败：', 'Image check failed: ') + String(error)); }
    finally {
      this.busy = false;
      this.contentEl.inert = false;
      if (!this.closed) this.render();
    }
  }

  private async scan(): Promise<void> {
    this.selected.clear();
    if (this.scanScope === 'current' && !this.note) return;
    if (this.tab === 'issues') this.issueScan = await this.checker.scanIssues(this.scanScope, this.note);
    else this.unusedScan = await this.checker.scanUnused(this.scanScope, this.note);
  }

  private async refresh(): Promise<void> {
    this.result = '';
    await this.run(() => this.scan());
  }

  private button(parent: HTMLElement, label: string, action: () => void, disabled = false): HTMLButtonElement {
    const button = parent.createEl('button', { text: label });
    button.disabled = disabled || this.busy;
    button.addEventListener('click', action);
    return button;
  }

  private render(): void {
    const el = this.contentEl;
    const focused = el.contains(el.doc.activeElement) ? (el.doc.activeElement as HTMLElement)?.dataset.focusKey : undefined;
    const scrollTop = el.querySelector('.image-check-list')?.scrollTop ?? 0;
    el.empty();
    const tabs = el.createDiv({ cls: 'image-check-tabs', attr: { role: 'tablist', 'aria-label': phrase('检查方向', 'Check direction') } });
    for (const [tab, label] of [['issues', phrase('失效图片引用', 'Broken image references')], ['unused', phrase('未引用图片', 'Unreferenced images')]] as [CheckTab, string][]) {
      const button = this.button(tabs, label, () => { this.tab = tab; void this.refresh(); });
      button.toggleClass('is-active', this.tab === tab);
      button.dataset.focusKey = `tab-${tab}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(this.tab === tab));
    }
    const header = el.createDiv({ cls: 'image-check-controls' });
    const context = header.createDiv({ cls: 'image-check-context' });
    const scope = context.createEl('select', { attr: { 'aria-label': phrase('检查范围', 'Check scope') } });
    scope.createEl('option', { value: 'current', text: phrase('当前笔记', 'Current note') }).disabled = !this.note;
    scope.createEl('option', { value: 'all', text: phrase('整个库', 'Whole vault') });
    scope.value = this.scanScope;
    scope.dataset.focusKey = 'scope';
    scope.addEventListener('change', () => { this.scanScope = scope.value as CheckScope; void this.refresh(); });
    const noteLabel = context.createSpan({ cls: 'image-check-note', text: this.scanScope === 'current'
      ? phrase('检查对象：', 'Checking: ') + (this.note?.basename ?? phrase('未选中笔记', 'No note selected'))
      : phrase('所有 Markdown 笔记', 'All Markdown notes') });
    if (this.note && this.scanScope === 'current') noteLabel.title = this.note.path;
    const utilities = header.createDiv({ cls: 'image-check-utilities' });
    const refresh = this.button(utilities, '', () => { void this.refresh(); });
    refresh.addClass('image-check-icon-button');
    refresh.setAttribute('aria-label', phrase('重新检查', 'Refresh check'));
    refresh.title = phrase('重新检查', 'Refresh check');
    setIcon(refresh, 'refresh-cw');
    const tools = this.button(utilities, '', () => {
      const menu = new Menu();
      menu.addItem(item => item.setTitle(phrase('转换图片链接格式', 'Convert image link format')).setIcon('repeat-2').onClick(() => {
        this.close();
        new WikiConverterModal(this.app, this.settings, this.saveSettings, this.note, this.scanScope).open();
      }));
      menu.addItem(item => item.setTitle(phrase('整理附件', 'Organize attachments')).setIcon('layers').onClick(() => {
        this.close();
        new RestructureModal(this.app, this.settings).open();
      }));
      const rect = tools.getBoundingClientRect();
      menu.showAtPosition({ x: rect.left, y: rect.bottom });
    });
    tools.addClass('image-check-icon-button');
    tools.setAttribute('aria-label', phrase('更多工具', 'More tools'));
    tools.title = phrase('更多工具', 'More tools');
    setIcon(tools, 'ellipsis');
    if (this.busy) {
      this.emptyState(el, 'loader-circle', phrase('正在检查…', 'Checking…'), phrase('正在核对图片和引用关系', 'Reviewing images and references'));
      return;
    }
    if (this.result) el.createEl('p', { text: this.result, cls: 'image-check-result' });
    if (this.scanScope === 'current' && !this.note) {
      this.emptyState(el, 'file-text', phrase('还没有检查笔记', 'No note to check'), phrase('打开笔记后重新进入，或切换到整个库。', 'Reopen from a note, or switch to Whole vault.'));
      return;
    }
    if (this.tab === 'issues') this.renderIssues(el);
    else this.renderUnused(el);
    const list = el.querySelector('.image-check-list');
    if (list) list.scrollTop = scrollTop;
    if (focused) Array.from(el.querySelectorAll<HTMLElement>('[data-focus-key]')).find(item => item.dataset.focusKey === focused)?.focus();
  }

  private renderSelection(parent: HTMLElement, id: string): void {
    const checkbox = parent.createEl('input', { type: 'checkbox' });
    checkbox.checked = this.selected.has(id);
    checkbox.dataset.focusKey = `select-${id}`;
    checkbox.setAttribute('aria-label', phrase('选择此项', 'Select item'));
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) this.selected.add(id); else this.selected.delete(id);
      this.render();
    });
  }

  private selectAll(parent: HTMLElement, ids: string[], text = phrase('选择全部', 'Select all')): void {
    const label = parent.createEl('label', { cls: 'image-check-select-all' });
    const checkbox = label.createEl('input', { type: 'checkbox' });
    checkbox.checked = ids.length > 0 && ids.every(id => this.selected.has(id));
    checkbox.dataset.focusKey = 'select-all';
    checkbox.indeterminate = this.selected.size > 0 && !checkbox.checked;
    label.createSpan({ text });
    checkbox.addEventListener('change', () => {
      this.selected = checkbox.checked ? new Set(ids) : new Set();
      this.render();
    });
  }

  private emptyState(parent: HTMLElement, icon: string, title: string, description: string): void {
    const empty = parent.createDiv({ cls: 'image-check-empty' });
    setIcon(empty.createDiv({ cls: 'image-check-empty-icon' }), icon);
    empty.createEl('h3', { text: title });
    empty.createEl('p', { text: description });
  }

  private preview(parent: HTMLElement, file: TFile): void {
    const target = parent.createDiv({ cls: 'image-check-file' });
    const image = target.createEl('img', { cls: 'image-check-preview', attr: { alt: file.name } });
    image.src = this.app.vault.getResourcePath(file);
    const info = target.createDiv({ cls: 'image-check-file-info' });
    const name = this.button(info, file.name, () => { void this.app.workspace.getLeaf('tab').openFile(file); });
    name.addClass('image-check-path-button');
    name.title = file.path;
    info.createSpan({ text: file.path, cls: 'image-check-file-path' });
  }

  private renderIssues(el: HTMLElement): void {
    const { issues, externalCount, scannedNotes } = this.issueScan;
    if (!issues.length) {
      this.emptyState(el, 'circle-check', phrase('图片引用正常', 'Image references look good'),
        phrase(`已检查 ${scannedNotes} 篇笔记，没有需要处理的图片引用。`, `Checked ${scannedNotes} notes. No references need attention.`));
      if (externalCount) el.createEl('p', { cls: 'image-check-footnote', text: phrase(`另有 ${externalCount} 处网络或库外引用未检查。`, `${externalCount} network or external references were not checked.`) });
      return;
    }
    el.createEl('p', { cls: 'image-check-summary', text: phrase(`${issues.length} 处引用需要处理 · 已检查 ${scannedNotes} 篇笔记`, `${issues.length} references need attention · ${scannedNotes} notes checked`) });
    const actions = el.createDiv({ cls: 'image-check-batch' });
    this.selectAll(actions, issues.map(issue => issue.id));
    const selected = issues.filter(issue => this.selected.has(issue.id));
    const repairable = selected.filter(issue => issue.target);
    if (selected.length) {
      actions.createSpan({ text: phrase(`已选 ${selected.length} 处 · ${repairable.length} 处可修复`, `${selected.length} selected · ${repairable.length} repairable`), cls: 'image-check-selected-count' });
      const batchButtons = actions.createDiv({ cls: 'image-check-batch-buttons' });
      this.button(batchButtons, phrase(`修复 (${repairable.length})`, `Repair (${repairable.length})`), () => { void this.apply(repairable, 'repair'); }, !repairable.length).addClass('mod-cta');
      this.button(batchButtons, phrase('删除引用', 'Delete references'), () => { void this.apply(selected, 'delete'); }).addClass('image-check-delete');
    } else actions.createSpan({ text: phrase('勾选条目可批量处理', 'Select items for batch actions'), cls: 'image-check-selected-count' });
    const list = el.createDiv({ cls: 'image-check-list' });
    const labels = { candidate: phrase('有唯一候选', 'Unique candidate'), ambiguous: phrase('有多个候选', 'Multiple candidates'), missing: phrase('没找到文件', 'File not found'), incompatible: phrase('名称不兼容', 'Incompatible name') };
    for (const issue of issues) {
      const row = list.createDiv({ cls: 'image-check-item' });
      const head = row.createDiv({ cls: 'image-check-row-header' });
      this.renderSelection(head, issue.id);
      head.createSpan({ text: issue.target && (issue.status === 'missing' || issue.status === 'ambiguous')
        ? phrase('已选择目标图片', 'Target image selected') : labels[issue.status], cls: 'image-check-status' });
      this.button(head, `${issue.note.basename} · ${phrase('第', 'Line ')}${issue.line}${phrase('行', '')}`, () => {
        void this.app.workspace.getLeaf('tab').openFile(issue.note, { eState: { line: issue.line - 1 } });
      }).addClass('image-check-location');
      head.lastElementChild?.setAttribute('title', `${issue.note.path}:${issue.line}`);
      row.createEl('code', { text: issue.raw, cls: 'image-check-reference' });
      if (issue.excerpt.trim() !== issue.raw) {
        const context = row.createEl('details', { cls: 'image-check-excerpt' });
        context.createEl('summary', { text: phrase('查看上下文', 'Show context') });
        context.createEl('p', { text: issue.excerpt });
      }
      const targetArea = row.createDiv({ cls: 'image-check-target' });
      if (issue.candidates.length > 1) {
        const choices = issue.target && !issue.candidates.some(file => file.path === issue.target!.path)
          ? [...issue.candidates, issue.target] : issue.candidates;
        const selector = targetArea.createEl('select', { attr: { 'aria-label': phrase('选择目标图片', 'Choose target image') } });
        selector.createEl('option', { value: '', text: phrase('请选择对应图片', 'Choose the matching image') });
        for (const file of choices) selector.createEl('option', { value: file.path, text: file.path });
        selector.dataset.focusKey = `target-${issue.id}`;
        selector.value = issue.target?.path ?? '';
        selector.addEventListener('change', () => {
          issue.target = choices.find(file => file.path === selector.value) ?? null;
          this.render();
        });
      }
      if (issue.target) this.preview(targetArea, issue.target);
      if (issue.target && issue.target.path.split('/').some(part => PathUtils.compatibleImageName(part) !== part)) targetArea.createEl('p', {
        text: phrase('修复会生成名称兼容的图片副本，并保留来源图片。', 'Repair creates a copy with a compatible name and keeps the source image.'),
        cls: 'image-check-help',
      });
      const rowActions = row.createDiv({ cls: 'image-check-row-actions' });
      const choose = this.button(rowActions, issue.target ? phrase('更换图片', 'Change image') : phrase('选择图片', 'Choose image'), () => {
        new ImageFilePicker(this.app, this.checker.getImageFiles(), file => {
          issue.target = file;
          this.render();
        }).open();
      });
      if (issue.target) this.button(rowActions, phrase('修复引用', 'Repair reference'), () => { void this.apply([issue], 'repair'); }).addClass('mod-cta');
      else choose.addClass('mod-cta');
      const remove = this.button(rowActions, phrase('删除引用', 'Delete reference'), () => { void this.apply([issue], 'delete'); });
      remove.addClass('image-check-delete');
      remove.title = phrase('仅删除此处图片语法，保留图片文件', 'Remove this occurrence only; keep the image file');
    }
    el.createEl('p', { cls: 'image-check-footnote', text: phrase('修复保留链接格式；删除引用保留图片文件。', 'Repair keeps the link format; deleting references keeps image files.') + (externalCount ? phrase(` ${externalCount} 处网络或库外引用未检查。`, ` ${externalCount} external references not checked.`) : '') });
  }

  private async apply(issues: ImageIssue[], action: 'repair' | 'delete'): Promise<void> {
    await this.run(async () => {
      const result = await this.checker.apply(issues, action);
      this.result = phrase(`修复 ${result.repaired} 处，删除 ${result.deleted} 处，影响 ${result.notes} 篇笔记，生成兼容副本 ${result.copies} 张；${result.changed} 处因内容变化未处理。`, `Repaired ${result.repaired}, deleted ${result.deleted}, updated ${result.notes} notes, created ${result.copies} compatible copies; ${result.changed} references left untouched because content changed.`);
      await this.scan();
    });
  }

  private renderUnused(el: HTMLElement): void {
    const { images, folders } = this.unusedScan;
    if (!images.length) {
      this.emptyState(el, 'circle-check', phrase('没有未引用图片', 'No unreferenced images'), phrase('已核对整个库的引用关系，所选附件目录没有待清理图片。', 'Vault-wide references checked. No images to clean in the selected attachment folders.'));
      return;
    }
    el.createEl('p', { cls: 'image-check-summary', text: phrase(`${images.length} 张图片未发现有效引用`, `${images.length} images without valid references`) });
    const details = el.createEl('details', { cls: 'image-check-folder-scope' });
    details.createEl('summary', { text: phrase(`检查 ${folders.length} 个附件目录 · 引用关系已核对整个库`, `${folders.length} attachment folders · References checked vault-wide`) });
    for (const folder of folders) details.createEl('div', { text: folder || phrase('库根目录', 'Vault root') });
    const actions = el.createDiv({ cls: 'image-check-batch' });
    this.selectAll(actions, images.map(image => image.file.path), images.some(image => image.relatedIssues.length) ? phrase('全选（含关联候选）', 'Select all (including related candidates)') : phrase('选择全部', 'Select all'));
    const selected = images.filter(image => this.selected.has(image.file.path));
    const bytes = selected.reduce((sum, image) => sum + image.file.stat.size, 0);
    if (selected.length) {
      actions.createSpan({ text: phrase(`已选 ${selected.length} 张 · ${bytes.toLocaleString()} 字节`, `${selected.length} selected · ${bytes.toLocaleString()} bytes`), cls: 'image-check-selected-count' });
      const buttons = actions.createDiv({ cls: 'image-check-batch-buttons' });
      this.button(buttons, phrase('移入回收站', 'Move to trash'), () => {
        void this.run(async () => {
          const result = await this.checker.trash(selected, this.scanScope, this.note);
          this.result = phrase(`已移入回收站 ${result.files} 张，共 ${result.bytes.toLocaleString()} 字节；${result.changed} 张因引用或文件变化未处理。`, `Moved ${result.files} images (${result.bytes.toLocaleString()} bytes) to trash; ${result.changed} left untouched because references or files changed.`);
          await this.scan();
        });
      }).addClass('image-check-delete');
    } else actions.createSpan({ text: phrase('勾选要移入回收站的图片', 'Select images to move to trash'), cls: 'image-check-selected-count' });
    const list = el.createDiv({ cls: 'image-check-list' });
    for (const related of [false, true]) {
      const group = images.filter(image => (image.relatedIssues.length > 0) === related);
      if (!group.length) continue;
      list.createEl('h3', { text: related ? phrase('有关联的失效引用', 'Related to broken references') : phrase('未发现引用', 'No references found') });
      for (const image of group) {
        const row = list.createDiv({ cls: 'image-check-item' });
        const head = row.createDiv({ cls: 'image-check-row-header' });
        this.renderSelection(head, image.file.path);
        head.createSpan({ text: `${image.file.stat.size.toLocaleString()} ${phrase('字节', 'bytes')}` });
        this.preview(row, image.file);
        if (image.relatedIssues.length) {
          const references = row.createEl('details');
          references.createEl('summary', { text: phrase(`关联 ${image.relatedIssues.length} 处失效引用，可先查看再决定。`, `Related to ${image.relatedIssues.length} broken references; review before deciding.`) });
          for (const issue of image.relatedIssues) this.button(references, `${issue.note.path}:${issue.line} — ${issue.raw}`, () => {
            void this.app.workspace.getLeaf('tab').openFile(issue.note, { eState: { line: issue.line - 1 } });
          }).addClass('image-check-path-button');
        }
      }
    }
  }
}
