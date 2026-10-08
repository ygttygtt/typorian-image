import { App, FuzzySuggestModal, TFile, FuzzyMatch } from 'obsidian';
import { isZh } from './locale';

export class ImageFilePicker extends FuzzySuggestModal<TFile> {
  constructor(app: App, private files: TFile[], private choose: (file: TFile) => void) {
    super(app);
    this.containerEl.addClass('typorian-ui', 'typorian-image-picker');
    this.setPlaceholder(isZh() ? '搜索库内图片名称或完整路径' : 'Search vault image names or full paths');
  }

  getItems(): TFile[] { return this.files; }
  getItemText(file: TFile): string { return file.path; }
  renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
    const row = el.createDiv({ cls: 'ti-file' });
    const preview = row.createEl('img', { cls: 'ti-thumbnail', attr: { alt: match.item.name } });
    preview.src = this.app.vault.getResourcePath(match.item);
    const info = row.createDiv({ cls: 'ti-file-info' });
    info.createEl('strong', { text: match.item.name });
    info.createDiv({ text: match.item.path, cls: 'ti-path ti-muted' });
  }
  onChooseItem(file: TFile): void { this.choose(file); }
}
