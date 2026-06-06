# Typorian Image

An Obsidian plugin that enforces standard Markdown image syntax with Typora-compatible asset folder paths.

## The Problem

Obsidian defaults to wiki-link syntax for images (`![[image.png]]`), while Typora uses standard Markdown syntax (`![image](./note.assets/image.png)`). This incompatibility makes it painful to switch between the two editors, especially when both are part of your workflow.

## The Solution

Typorian Image intercepts image paste and drop events in the editor and:

1. Saves the image file to a sibling `.assets` folder named after the current note (e.g., `MyNote.assets/`)
2. Inserts a standard Markdown image link with a relative path: `![image](MyNote.assets/image.png)`

Wiki-link functionality for notes, blocks, and headings remains completely untouched. Only image insertion is affected.

## Features

- Intercepts clipboard paste (`Ctrl+V`) and file drag-and-drop
- Saves images to `${notename}.assets/` folder (same directory as the note)
- Outputs standard Markdown image syntax: `![name](path)`
- Supports PNG, JPEG, GIF, WebP, SVG, BMP, TIFF
- Auto-renames on filename conflict (image.png -> image(1).png)
- Zero overhead on regular typing (no performance impact)
- Full Live Preview support (images render inline as expected)
- Orphan image detection and safe cleanup
- Broken image link detection and repair
- Chinese/English bilingual interface (auto-detected)
- Customizable asset folder path (advanced option)

## Installation

### From Community Plugins (pending review)

1. Open Obsidian Settings > Community Plugins
2. Search for "Typorian Image"
3. Install and enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder `typorian-image` inside your vault's `.obsidian/plugins/` directory
3. Place the downloaded files into that folder
4. Enable the plugin in Obsidian Settings > Community Plugins

### Using BRAT

1. Install the BRAT plugin
2. Open BRAT settings > Add Beta Plugin
3. Enter `ygttygtt/typorian-image`
4. Enable the plugin

## Typora Alignment Guide

To achieve seamless cross-editing between Obsidian (with this plugin) and Typora, configure Typora as follows:

1. Open Typora, go to **Preferences > Image**.
2. Under "When insert images", select **"Copy image to custom folder"**.
3. Enter the path pattern: `./${filename}.assets/`
4. Ensure **"Apply above rules to current file only"** is checked.

With these settings, both applications store images in the same `.assets` folder using identical relative paths. You can edit the same file in either application without broken image links.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Image naming strategy | Keep original filename | Choose between preserving the original filename or using a timestamp |
| Auto-rename on conflict | Enabled | Appends a sequence number when a file with the same name already exists |
| Asset folder path (advanced) | `./${notename}.assets/` | Customizable path template for image storage |

## Broken Image Repair

If your notes contain broken image links (e.g., from moving files between editors or changing OS), the plugin can automatically detect and repair them.

### How to Use

Open the Command Palette and run **"Repair broken image links in current note"**.

### What It Fixes

- **Backslash paths**: `\` in image paths are normalized to `/`
- **Absolute paths**: Windows drive letters and system roots are stripped, converting to relative paths
- **Missing references**: If an image file exists somewhere in the vault but the link is broken, the plugin performs a vault-wide filename search and automatically computes the correct relative path

## How It Works

The plugin uses a CodeMirror 6 ViewPlugin that registers paste and drop event listeners at the capture phase on the editor DOM element. When an image file is detected:

1. The event is intercepted before Obsidian's default handler runs
2. The image binary is read and saved to the vault via `app.vault.createBinary()`
3. A Markdown image link is inserted via a single CM6 `dispatch()` call with both `changes` and `selection` specified atomically

This approach ensures:
- Cursor position remains stable after insertion
- No visible flicker in Live Preview mode
- Undo/redo works correctly
- Regular typing and backspace are unaffected

## Orphan Image Cleanup

Over time, `.assets` folders may accumulate images that are no longer referenced by any note. This plugin provides a built-in health check tool to find and safely remove them.

### How to Use

1. Click the trash icon in the left sidebar (Ribbon), or
2. Open the Command Palette and run "Orphan Image Cleanup"

The modal will scan all `.assets` folders and display a checklist of unreferenced images with:

- Thumbnail preview
- File path
- File size

### Safety

- No images are selected by default -- you must manually check each one
- Use "Select All" for convenience, but the default is always unchecked
- Clicking "Safe Cleanup" moves selected images to Obsidian's internal trash (`.trash` folder), not permanent deletion
- You can restore trashed images from the Obsidian file explorer if needed

### Detection Method

The detector uses Obsidian's `metadataCache.resolvedLinks` index, which contains all resolved wiki-links and markdown links across the vault. This is an in-memory lookup -- no disk I/O, no regex parsing. Only images inside `.assets` folders are scanned.

## Building from Source

```bash
git clone https://github.com/ygttygtt/typorian-image.git
cd typorian-image
npm install
npm run build
```

The compiled `main.js` will be in the project root.

## License

MIT
