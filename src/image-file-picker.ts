import { App, FuzzySuggestModal, TFile } from 'obsidian';
import { isZh } from './locale';

export class ImageFilePicker extends FuzzySuggestModal<TFile> {
  constructor(app: App, private files: TFile[], private choose: (file: TFile) => void) {
    super(app);
    this.setPlaceholder(isZh() ? '搜索库内图片名称或完整路径' : 'Search vault image names or full paths');
  }

  getItems(): TFile[] { return this.files; }
  getItemText(file: TFile): string { return file.path; }
  onChooseItem(file: TFile): void { this.choose(file); }
}
