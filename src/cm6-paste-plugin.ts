import { ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view';
import { ImageHandler } from './image-handler';

/**
 * CM6 ViewPlugin that intercepts paste and drop events at the capture phase.
 * Non-image events are let through untouched.
 */
export function createImagePastePlugin(
  imageHandler: ImageHandler
): ViewPlugin<any> {
  return ViewPlugin.fromClass(
    class ImagePastePluginView {
      private view: EditorView;
      private onPasteBound: (evt: ClipboardEvent) => void;
      private onDropBound: (evt: DragEvent) => void;

      constructor(view: EditorView) {
        this.view = view;
        this.onPasteBound = this.onPaste.bind(this);
        this.onDropBound = this.onDrop.bind(this);

        // capture=true: intercept before Obsidian/CM6 default handlers
        view.dom.addEventListener('paste', this.onPasteBound, true);
        view.dom.addEventListener('drop', this.onDropBound, true);
      }

      update(_update: ViewUpdate): void {
        // Intentionally empty — zero overhead on regular typing
      }

      private async onPaste(evt: ClipboardEvent): Promise<void> {
        const files = evt.clipboardData?.files;
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter((f) =>
          imageHandler.isSupportedImage(f)
        );
        if (imageFiles.length === 0) return; // not images, pass through

        evt.preventDefault();
        evt.stopImmediatePropagation();

        for (const imgFile of imageFiles) {
          await imageHandler.handleImage(this.view, imgFile);
        }
      }

      private async onDrop(evt: DragEvent): Promise<void> {
        const files = evt.dataTransfer?.files;
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter((f) =>
          imageHandler.isSupportedImage(f)
        );
        if (imageFiles.length === 0) return;

        evt.preventDefault();
        evt.stopImmediatePropagation();

        const dropPos = this.view.posAtCoords({
          x: evt.clientX,
          y: evt.clientY,
        });

        for (const imgFile of imageFiles) {
          await imageHandler.handleImage(
            this.view,
            imgFile,
            dropPos ?? undefined
          );
        }
      }

      destroy(): void {
        this.view.dom.removeEventListener('paste', this.onPasteBound, true);
        this.view.dom.removeEventListener('drop', this.onDropBound, true);
      }
    }
  );
}
