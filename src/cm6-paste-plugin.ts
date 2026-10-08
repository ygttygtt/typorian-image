import { ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view';
import { editorInfoField, Notice, TFile } from 'obsidian';
import { ImageHandler } from './image-handler';
import { TyporianSettings } from '../settings';
import { t } from './locale';

interface ImageInsert {
  note: TFile;
  files: File[];
  settings: TyporianSettings;
  from: number;
  to: number;
  active: boolean;
  userEvent: 'input.paste' | 'input.drop';
}

export function createImagePastePlugin(imageHandler: ImageHandler) {
  return ViewPlugin.fromClass(class {
    private pending = new Set<ImageInsert>();
    private queue: Promise<void> = Promise.resolve();
    private onPasteBound = (event: ClipboardEvent) => this.onPaste(event);
    private onDropBound = (event: DragEvent) => this.onDrop(event);

    constructor(private view: EditorView) {
      view.dom.addEventListener('paste', this.onPasteBound, true);
      view.dom.addEventListener('drop', this.onDropBound, true);
    }

    update(update: ViewUpdate): void {
      for (const operation of this.pending) {
        if (update.state.field(editorInfoField).file !== operation.note) operation.active = false;
        operation.from = update.changes.mapPos(operation.from, 1);
        operation.to = update.changes.mapPos(operation.to, 1);
      }
    }

    private getImages(files: FileList | undefined): File[] {
      if (!imageHandler.shouldIntercept() || !files?.length) return [];
      const images = Array.from(files);
      // Mixed file drops belong to Obsidian; intercepting would discard non-image files.
      return images.every(file => imageHandler.isSupportedImage(file)) ? images : [];
    }

    private onPaste(event: ClipboardEvent): void {
      const files = this.getImages(event.clipboardData?.files);
      const note = this.view.state.field(editorInfoField).file;
      if (!files.length || !note) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const selection = this.view.state.selection.main;
      this.enqueue({ note, files, settings: imageHandler.captureSettings(), from: selection.from,
        to: selection.to, active: true, userEvent: 'input.paste' });
    }

    private onDrop(event: DragEvent): void {
      const files = this.getImages(event.dataTransfer?.files);
      const note = this.view.state.field(editorInfoField).file;
      const position = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (!files.length || !note || position === null) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.enqueue({ note, files, settings: imageHandler.captureSettings(), from: position,
        to: position, active: true, userEvent: 'input.drop' });
    }

    private enqueue(operation: ImageInsert): void {
      this.pending.add(operation);
      this.queue = this.queue.then(async () => {
        if (!operation.active) { this.pending.delete(operation); return; }
        const links = await imageHandler.saveImages(operation.note, operation.files, operation.settings);
        this.pending.delete(operation);
        if (links.length && operation.active) {
          const insert = links.join('\n');
          this.view.dispatch({ changes: { from: operation.from, to: operation.to, insert },
            selection: { anchor: operation.from + insert.length }, userEvent: operation.userEvent });
        } else if (links.length) {
          new Notice(t('image.editorChanged', { path: operation.note.path }));
        }
      }).catch((error) => {
        this.pending.delete(operation);
        new Notice(t('image.batchError', { message: String(error) }));
        console.error('Typorian Image: image batch failed', error);
      });
    }

    destroy(): void {
      this.view.dom.removeEventListener('paste', this.onPasteBound, true);
      this.view.dom.removeEventListener('drop', this.onDropBound, true);
      for (const operation of this.pending) operation.active = false;
    }
  });
}
