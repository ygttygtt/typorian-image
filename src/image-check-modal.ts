import { App, Menu, Modal, Notice, TFile } from 'obsidian';
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
    this.contentEl.createEl('p', { text: phrase('正在处理…', 'Working…'), cls: 'image-check-progress', attr: { role: 'status' } });
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
    this.render();
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
    const scrollTop = el.querySelector('.image-check-list')?.scrollTop ?? 0;
    el.empty();
    const tabs = el.createDiv({ cls: 'image-check-tabs' });
    for (const [tab, label] of [['issues', phrase('失效图片引用', 'Broken image references')], ['unused', phrase('未引用图片', 'Unreferenced images')]] as [CheckTab, string][]) {
      const button = this.button(tabs, label, () => { this.tab = tab; void this.refresh(); });
      button.toggleClass('is-active', this.tab === tab);
    }
    const header = el.createDiv({ cls: 'image-check-toolbar' });
    for (const [scope, label] of [['current', phrase('当前笔记', 'Current note')], ['all', phrase('整个库', 'Whole vault')]] as [CheckScope, string][]) {
      const button = this.button(header, label, () => { this.scanScope = scope; void this.refresh(); }, scope === 'current' && !this.note);
      button.toggleClass('is-active', this.scanScope === scope);
    }
    this.button(header, phrase('刷新', 'Refresh'), () => { void this.refresh(); });
    const tools = this.button(header, phrase('更多工具', 'More tools'), () => {
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
    el.createEl('p', { text: this.scanScope === 'current'
      ? phrase('检查笔记：', 'Checking note: ') + (this.note?.path ?? phrase('未选中 Markdown 笔记', 'No Markdown note selected'))
      : phrase('检查范围：整个库', 'Checking scope: whole vault'), cls: 'image-check-scope' });
    if (this.result) el.createEl('p', { text: this.result, cls: 'image-check-result' });
    if (this.scanScope === 'current' && !this.note) {
      el.createEl('p', { text: phrase('打开 Markdown 笔记后重新进入，或选择“整个库”。', 'Reopen from a Markdown note, or choose Whole vault.') });
      return;
    }
    if (this.tab === 'issues') this.renderIssues(el);
    else this.renderUnused(el);
    const list = el.querySelector('.image-check-list');
    if (list) list.scrollTop = scrollTop;
  }

  private renderSelection(parent: HTMLElement, id: string): void {
    const checkbox = parent.createEl('input', { type: 'checkbox' });
    checkbox.checked = this.selected.has(id);
    checkbox.setAttribute('aria-label', phrase('选择此项', 'Select item'));
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) this.selected.add(id); else this.selected.delete(id);
      this.render();
    });
  }

  private selectAll(parent: HTMLElement, ids: string[]): void {
    const label = parent.createEl('label', { cls: 'image-check-select-all' });
    const checkbox = label.createEl('input', { type: 'checkbox' });
    checkbox.checked = ids.length > 0 && ids.every(id => this.selected.has(id));
    checkbox.indeterminate = this.selected.size > 0 && !checkbox.checked;
    label.createSpan({ text: phrase('选择全部', 'Select all') });
    checkbox.addEventListener('change', () => {
      this.selected = checkbox.checked ? new Set(ids) : new Set();
      this.render();
    });
  }

  private preview(parent: HTMLElement, file: TFile): void {
    const image = parent.createEl('img', { cls: 'image-check-preview', attr: { alt: file.name } });
    image.src = this.app.vault.getResourcePath(file);
    this.button(parent, file.path, () => { void this.app.workspace.getLeaf('tab').openFile(file); }).addClass('image-check-path-button');
  }

  private renderIssues(el: HTMLElement): void {
    const { issues, externalCount, scannedNotes } = this.issueScan;
    el.createEl('p', { text: phrase(`检查 ${scannedNotes} 篇笔记，${issues.length} 处待处理引用。库外或网络引用 ${externalCount} 处未计入。`, `Checked ${scannedNotes} notes; ${issues.length} references need attention. ${externalCount} external or network references excluded.`) });
    const actions = el.createDiv({ cls: 'image-check-toolbar' });
    this.selectAll(actions, issues.map(issue => issue.id));
    const selected = issues.filter(issue => this.selected.has(issue.id));
    const repairable = selected.filter(issue => issue.target);
    this.button(actions, phrase(`修复选中 (${repairable.length})`, `Repair selected (${repairable.length})`), () => { void this.apply(repairable, 'repair'); }, repairable.length === 0);
    this.button(actions, phrase(`删除选中引用 (${selected.length})`, `Delete selected references (${selected.length})`), () => { void this.apply(selected, 'delete'); }, selected.length === 0);
    el.createEl('p', { cls: 'image-check-help', text: phrase('修复保留原链接格式；删除只移除选中的图片引用，不删除图片文件。', 'Repair keeps the link format. Delete removes only selected image references, leaving image files intact.') });
    if (!issues.length) el.createEl('p', { text: phrase('没有待处理的图片引用。', 'No image references need attention.') });
    const list = el.createDiv({ cls: 'image-check-list' });
    const labels = { candidate: phrase('有唯一候选', 'Unique candidate'), ambiguous: phrase('有多个候选', 'Multiple candidates'), missing: phrase('没找到文件', 'File not found'), incompatible: phrase('名称不兼容', 'Incompatible name') };
    for (const issue of issues) {
      const row = list.createDiv({ cls: 'image-check-item' });
      const head = row.createDiv({ cls: 'image-check-toolbar' });
      this.renderSelection(head, issue.id);
      head.createSpan({ text: issue.target && (issue.status === 'missing' || issue.status === 'ambiguous')
        ? phrase('已选择目标图片', 'Target image selected') : labels[issue.status], cls: 'image-check-status' });
      this.button(head, `${issue.note.path}:${issue.line}`, () => {
        void this.app.workspace.getLeaf('tab').openFile(issue.note, { eState: { line: issue.line - 1 } });
      }).addClass('image-check-path-button');
      row.createEl('code', { text: issue.raw, cls: 'image-check-reference' });
      row.createEl('p', { text: issue.excerpt, cls: 'image-check-excerpt' });
      const targetArea = row.createDiv({ cls: 'image-check-target' });
      if (issue.candidates.length > 1) {
        const choices = issue.target && !issue.candidates.some(file => file.path === issue.target!.path)
          ? [...issue.candidates, issue.target] : issue.candidates;
        const selector = targetArea.createEl('select', { attr: { 'aria-label': phrase('选择目标图片', 'Choose target image') } });
        selector.createEl('option', { value: '', text: phrase('请选择对应图片', 'Choose the matching image') });
        for (const file of choices) selector.createEl('option', { value: file.path, text: file.path });
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
      const rowActions = row.createDiv({ cls: 'image-check-toolbar' });
      this.button(rowActions, phrase('选择库内图片', 'Choose vault image'), () => {
        new ImageFilePicker(this.app, this.checker.getImageFiles(), file => {
          issue.target = file;
          this.render();
        }).open();
      });
      this.button(rowActions, phrase('修复此引用', 'Repair reference'), () => { void this.apply([issue], 'repair'); }, !issue.target);
      this.button(rowActions, phrase('删除此图片引用', 'Delete image reference'), () => { void this.apply([issue], 'delete'); });
    }
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
    el.createEl('p', { text: phrase('候选图片来自所选范围的附件目录；引用关系始终检查整个库。', 'Candidate images come from attachment folders in the selected scope; references are checked across the whole vault.') });
    const details = el.createEl('details', { cls: 'image-check-folder-scope' });
    details.createEl('summary', { text: phrase(`附件目录 (${folders.length})`, `Attachment folders (${folders.length})`) });
    for (const folder of folders) details.createEl('div', { text: folder || phrase('库根目录', 'Vault root') });
    const actions = el.createDiv({ cls: 'image-check-toolbar' });
    this.selectAll(actions, images.map(image => image.file.path));
    const selected = images.filter(image => this.selected.has(image.file.path));
    const bytes = selected.reduce((sum, image) => sum + image.file.stat.size, 0);
    this.button(actions, phrase(`移入回收站 (${selected.length} 张，${bytes.toLocaleString()} 字节)`, `Move to trash (${selected.length} files, ${bytes.toLocaleString()} bytes)`), () => {
      void this.run(async () => {
        const result = await this.checker.trash(selected, this.scanScope, this.note);
        this.result = phrase(`已移入回收站 ${result.files} 张，共 ${result.bytes.toLocaleString()} 字节；${result.changed} 张因引用或文件变化未处理。`, `Moved ${result.files} images (${result.bytes.toLocaleString()} bytes) to trash; ${result.changed} left untouched because references or files changed.`);
        await this.scan();
      });
    }, selected.length === 0);
    el.createEl('p', { text: phrase(`未发现有效引用 ${images.filter(image => !image.relatedIssues.length).length} 张；另有候选关联 ${images.filter(image => image.relatedIssues.length).length} 张。`, `${images.filter(image => !image.relatedIssues.length).length} images without references; ${images.filter(image => image.relatedIssues.length).length} also have candidate associations.`) });
    const list = el.createDiv({ cls: 'image-check-list' });
    for (const related of [false, true]) {
      const group = images.filter(image => (image.relatedIssues.length > 0) === related);
      if (!group.length) continue;
      list.createEl('h3', { text: related ? phrase('有关联的失效引用', 'Related to broken references') : phrase('未发现引用', 'No references found') });
      for (const image of group) {
        const row = list.createDiv({ cls: 'image-check-item' });
        const head = row.createDiv({ cls: 'image-check-toolbar' });
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
