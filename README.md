# Typorian Image

An Obsidian plugin for editing the same Markdown notes in Obsidian and Typora. It saves inserted images beside the note in `${notename}.assets/` and writes standard Markdown image links.

The current source version is **1.8.2**. Desktop installation and runtime verification are tracked separately in [the image-check implementation plan](docs/superpowers/plans/2026-10-08-image-check-workflow.md).

## Features

- Paste and drop PNG, JPEG, GIF, WebP, SVG, BMP, and TIFF images into the editor.
- Preserve original filenames or use timestamp names; append sequence numbers when conflict renaming is enabled.
- Insert multiple images in input order. Pasting replaces the selected text once; dropping inserts at the drop position.
- Associate insertion with the editor and note that received the event, including asynchronous saves.
- Hide `.assets` folders from Obsidian's file explorer without moving images or changing links.
- Check broken image references and unreferenced image files in one window, with current-note and vault-wide scopes.
- Preview and selectively convert Wiki image embeds to standard Markdown.
- Export a note and its referenced images as a folder or ZIP.
- Organize selected notes' images into individual `.assets` folders, either in a new copy directory or in place.
- Chinese and English interfaces, customizable attachment paths, and optional ribbon tools.

## Installation

Install `main.js`, `manifest.json`, and `styles.css` from a published GitHub Release into `<vault>/.obsidian/plugins/typorian-image/`, then enable the plugin under **Settings → Community Plugins**. The existence of a source version or draft PR does not establish that its Release has been published.

Alternatively, install BRAT, choose **Add Beta Plugin**, and enter `ygttygtt/typorian-image`.

## Typora Configuration

In **Typora → Preferences → Image**, select **Copy image to custom folder** and use:

```text
./${filename}.assets/
```

In Obsidian, keep the plugin's default attachment template:

```text
./${notename}.assets/
```

Both editors then use the same sibling image folder. Existing image files and ordinary note Wiki links remain in their original locations.

## Image Insertion and Settings

| Setting | Default | Behavior |
| --- | --- | --- |
| Image naming strategy | Original filename | Preserve the basename or use a timestamp; unsupported desktop filename/link characters become `_` |
| Auto-rename on conflict | Enabled | Append `(1)`, `(2)`, etc.; when disabled, skip the conflicting image and show a notice |
| Asset folder path | `./${notename}.assets/` | Resolve the template relative to the receiving note |
| Hide `.assets` folders | Disabled | Hide folder names ending in `.assets` from the file explorer |
| Include code examples in format conversion | Disabled | Applies only to explicit Wiki conversion; image checks always skip code examples |
| Wiki converter / restructure ribbon shortcuts | Disabled | Optional shortcuts; both tools remain available from More tools and the command palette |
| Restructure output folder | `_Restructured_Vault` | Vault-relative base directory for copied notes; each run creates a unique directory |

New image names are made compatible with Obsidian and desktop filesystems. Existing images are not renamed in bulk. Spaces, Unicode, literal `%`, and parentheses are encoded consistently in generated links; image captions and titles are preserved where supported by the input syntax.

Multiple images are saved and inserted as one batch. Mixed image/non-image file drops remain with Obsidian so other attachments are not discarded. Pending insertions track edits to the receiving editor. If that editor changes to another note or closes before the save completes, saved images remain associated with the captured note and a notice identifies that note; links are not inserted into another document.

Hiding only affects the file explorer. Images remain on disk and available to Obsidian, search, and Typora. Newly created or renamed `.assets` folders match automatically. This feature requires CSS `:has()` support in the Obsidian installer; pop-out windows use the same setting. See the implementation review for runtime verification status.

## Image Check and Format Conversion

Open **Image Check** from the ribbon or command palette. It starts on **Broken image references** for the note captured when the window opens. The note path stays fixed when you open another note to inspect it. Choose **All notes** explicitly to expand the scan; a missing current Markdown note does not automatically expand it.

The reference tab lists each Markdown or Wiki occurrence with its note, line, original text, status, candidate target, and image preview. Valid embeds are omitted. A unique same-name match is offered as a repair candidate; multiple matches require a choice. If no match exists, choose an existing vault image or delete that occurrence. Repeated identical links can be processed separately. No items are selected initially; batch repair and deletion apply only to checked occurrences. Deleting a reference removes its complete image syntax, not the image file.

Repair preserves Markdown captions/titles and Wiki aliases/dimensions. An incompatible source filename can be repaired by creating a compatible image copy in the note's attachment folder; the source remains. Actions use captured note files and public vault APIs, including reading mode. A note edited after scanning is skipped until refreshed. Network and vault-external references are excluded, and code examples are always skipped.

The **Unreferenced images** tab limits current-note candidates to its configured attachment directory and descendants. Vault-wide candidates include historical `.assets` directories and directories generated by the current attachment rule. Reference judgment uses the entire vault, so a file used by another note stays referenced. Candidate associations to broken links are shown separately and reuse the same scan. They are hints, not valid references or an additional required workflow.

Scans run on demand. Cleanup rechecks selected files and moves those still unreferenced to Obsidian's internal `.trash`, reporting file count and bytes. Restore files through that directory; the plugin has no restore interface. The scan covers supported vault links, not every use by external software or arbitrary HTML/Canvas content.

Use **More tools → Convert image link format** for selective Wiki-to-Markdown conversion. Only resolved, compatible links are convertible. `|300` and `|300x200` describe dimensions and remain unchanged because standard Markdown has no equivalent size expression. Missing and incompatible references lead back to Image Check; conversion has no separate deletion workflow. The captured note and current/all scope carry between these tools. The code-example setting applies only to this explicit conversion.

New installations show Image Check and Share on the ribbon. Format conversion and attachment restructuring remain available in More tools and the command palette; optional ribbon shortcuts and existing explicit visibility preferences are retained. Command IDs remain stable for existing hotkeys. Settings separate daily insertion, parsing, output, shortcuts, and icons; the former repair-time Wiki conversion option has been removed.

## Sharing a Note

The share dialog accepts a **vault-relative parent directory**. Empty input means the vault root. Absolute system paths and `..` directory segments are rejected; exporting outside the vault is not supported by this dialog.

Folder export creates `<parent>/<note name>/` containing the Markdown file and its `<note name>.assets/` images. ZIP export creates `<parent>/<note name>.zip`. Repeated exports choose unique names and show the actual resulting path. Different source images with the same filename receive distinct output names, while repeated references to one image share one exported file. Markdown and Wiki images are included; remote images, unresolved links, and code examples are left as written. The result shows the actual output path, packaged image count, and unpackaged reference count. Ordinary Wiki embeds become Markdown; dimension-bearing Wiki embeds retain their syntax and rewritten target. Source notes and images are unchanged.

## Attachment Restructuring

Open attachment restructuring from More tools or the command palette (or enable its ribbon shortcut), then select notes with resolvable image references in the preview.

- **Copy mode:** Create a new unique directory based on the configured output folder, preserving note paths and allocating a complete image set for each selected note. Prior output directories are excluded from subsequent scans.
- **In-place mode:** Update only the selected notes' image links and copy their referenced images into sibling `.assets` folders. Already correctly placed images are reused; filename collisions receive unique names.

In-place mode preserves source images so other notes and other kinds of links can continue to use them. It does not automatically trash originals. Review later unreferenced images separately using Image Check within its configured candidate directories. Markdown/Wiki syntax, including Wiki dimensions, is preserved during restructuring. The preview reports unpackaged references; unresolved links retain their original text.

## Building from Source

```bash
git clone https://github.com/ygttygtt/typorian-image.git
cd typorian-image
npm install
npx tsc --noEmit
npm run build
```

Defaults and filename policy are defined in project-root `settings.ts`. Obsidian persists user choices through its plugin data API; no environment-variable configuration is required. Shared Markdown/Wiki parsing is in `src/markdown-images.ts`, and path encoding and resolution are in `src/path-utils.ts`.

No test framework is configured. Verify behavior through type checking, production builds, source review, and direct Obsidian operation. Build success alone does not establish desktop acceptance.

## License

MIT
