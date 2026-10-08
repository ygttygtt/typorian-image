# Typorian Image

An Obsidian plugin for editing the same Markdown notes in Obsidian and Typora. It saves inserted images beside the note in `${notename}.assets/` and writes standard Markdown image links.

The current source version is **1.7.0**. Desktop installation and runtime verification are tracked separately in [the implementation review](docs/optimization-review-2026-10-08.md).

## Features

- Paste and drop PNG, JPEG, GIF, WebP, SVG, BMP, and TIFF images into the editor.
- Preserve original filenames or use timestamp names; append sequence numbers when conflict renaming is enabled.
- Insert multiple images in input order. Pasting replaces the selected text once; dropping inserts at the drop position.
- Associate insertion with the editor and note that received the event, including asynchronous saves.
- Hide `.assets` folders from Obsidian's file explorer without moving images or changing links.
- Audit unreferenced images and repair broken links in the current note or all notes.
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
| Scan code blocks | Disabled | Code examples are excluded from repair/conversion unless explicitly enabled |
| Restructure output folder | `_Restructured_Vault` | Vault-relative base directory for copied notes; each run creates a unique directory |

New image names are made compatible with Obsidian and desktop filesystems. Existing images are not renamed in bulk. Spaces, Unicode, literal `%`, and parentheses are encoded consistently in generated links; image captions and titles are preserved where supported by the input syntax.

Multiple images are saved and inserted as one batch. Mixed image/non-image file drops remain with Obsidian so other attachments are not discarded. Pending insertions track edits to the receiving editor. If that editor changes to another note or closes before the save completes, saved images remain associated with the captured note and a notice identifies that note; links are not inserted into another document.

Hiding only affects the file explorer. Images remain on disk and available to Obsidian, search, and Typora. Newly created or renamed `.assets` folders match automatically. This feature requires CSS `:has()` support in the Obsidian installer; pop-out windows use the same setting. See the implementation review for runtime verification status.

## Image Audit and Link Repair

Open **Image Audit** from the ribbon or command palette. Current-note mode limits candidates to that note's configured attachment directory, including nested folders; all-notes mode lists `.assets` image candidates across the vault. Reference detection considers links from the entire vault, so an image shared by another note remains referenced.

The scan combines Obsidian's resolved-link index with current note contents. It runs on request, not in a background loop. No images are selected initially. Cleanup rechecks the selected files' reference status and moves remaining unreferenced selections to Obsidian's internal trash. Recovery is through the vault's `.trash` files; the plugin does not provide a restore interface.

Repair first resolves the exact path. If that fails, a vault-wide filename match is used only when exactly one image matches. Multiple same-name candidates are not automatically chosen. Explicit Wiki paths are resolved as paths; optional manual attachment directories participate in Wiki resolution. Code examples are excluded by default.

Use the Wiki converter to preview and select embeds. Each occurrence is tracked by its position, so repeated identical embeds can be selected independently. If the note changes after scanning, rescan before applying the old preview.

## Sharing a Note

The share dialog accepts a **vault-relative parent directory**. Empty input means the vault root. Absolute system paths and `..` directory segments are rejected; exporting outside the vault is not supported by this dialog.

Folder export creates `<parent>/<note name>/` containing the Markdown file and its `<note name>.assets/` images. ZIP export creates `<parent>/<note name>.zip`. Repeated exports choose unique names and show the actual resulting path. Different source images with the same filename receive distinct output names, while repeated references to one image share one exported file. Markdown and Wiki images are included; remote images, unresolved links, and code examples are left as written. Source notes and images are unchanged.

## Attachment Restructuring

Enable the restructure tool in settings, open its preview, and select notes with resolvable image references.

- **Copy mode:** Create a new unique directory based on the configured output folder, preserving note paths and allocating a complete image set for each selected note. Prior output directories are excluded from subsequent scans.
- **In-place mode:** Update only the selected notes' image links and copy their referenced images into sibling `.assets` folders. Already correctly placed images are reused; filename collisions receive unique names.

In-place mode preserves source images so other notes and other kinds of links can continue to use them. It does not automatically trash originals. Review any later unreferenced `.assets` images using Image Audit. Sources outside `.assets` directories are outside that audit tool's cleanup scope. Unresolved links are not rewritten to nonexistent targets.

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
