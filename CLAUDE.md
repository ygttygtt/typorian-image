# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Typorian Image — an Obsidian plugin that enforces standard Markdown image syntax with Typora-compatible `.assets` folder paths. Intercepts paste/drop events, saves images to `${notename}.assets/`, and inserts `![name](path)` instead of `![[name]]`.

**Current version**: v1.2.0 (released). v1.3.0 plan at `docs/superpowers/plans/2026-06-06-v1.3.0-core-refactor.md`.

**Superpowers**: Before every task, check and invoke applicable skills (writing-plans, brainstorming, executing-plans, systematic-debugging). Process skills first, implementation skills second. See memory `superpowers-usage.md`.

## Build Commands

```bash
npm install          # Install dependencies
npm run build        # Production build (outputs main.js)
npm run dev          # Watch mode for development
```

Type checking (no build output):
```bash
npx tsc --noEmit
```

**No test framework or linter is configured.** Verify changes by building and manually testing in Obsidian.

## Architecture

```
main.ts                      Entry point: lifecycle + CM6 extension + orphan + broken link repair
src/
  constants.ts               MIME types, extension mappings
  settings.ts                TyporianSettings interface + defaults (incl. assetFolderPath)
  locale.ts                  i18n: zh/en locale dictionary, t() function
  path-utils.ts              Asset folder path calculation (respects custom template)
  image-handler.ts           Core pipeline: read -> save -> dispatch CM6 transaction
  cm6-paste-plugin.ts        CM6 ViewPlugin: capture-phase paste/drop interception
  setting-tab.ts             Settings UI (i18n) + collapsible advanced section + Typora guide
  orphan-types.ts            OrphanImageInfo interface, IMAGE_EXTENSIONS set
  orphan-detector.ts         OrphanDetector: resolvedLinks-based orphan scan
  orphan-modal.ts            OrphanImageModal: checklist, thumbnails, locate button, safe trash
  broken-link-repairer.ts    BrokenLinkRepairer: regex + vault search + auto-fix
styles.css                   All plugin CSS: settings tab advanced toggle + orphan modal layout
```

### TypeScript

`strictNullChecks` is enabled. Full `strict` mode is not — `noImplicitAny` is on but `strictFunctionTypes` / `strictPropertyInitialization` are off. When adding new code, use explicit types where TS cannot infer (avoid relying on `any`).

### Data Flow

```
paste/drop event (capture phase)
  -> cm6-paste-plugin.ts filters for images
  -> image-handler.handleImage()
     -> file.arrayBuffer()
     -> PathUtils.getAssetFolderPath(noteFile)
     -> vault.createBinary(path, data)
     -> view.dispatch({ changes, selection })  // atomic CM6 transaction
```

### Key Design Decisions

- **Capture phase**: DOM listeners use `capture: true` on `view.dom` to intercept before Obsidian's default handlers. Non-image events pass through untouched.
- **Atomic dispatch**: `changes` and `selection` are set in a single `view.dispatch()` call. Never split into two dispatches — this causes cursor flicker.
- **Empty update()**: The ViewPlugin's `update()` method is intentionally empty. This means zero overhead on regular typing and backspace.
- **No monkey-patching**: All interception is done via standard DOM events and Obsidian's public API (`registerEditorExtension`).

### Obsidian API

- `app.vault.createBinary(path, data)` — save binary files
- `app.vault.adapter.exists(path)` / `app.vault.adapter.mkdir(path)` — filesystem checks
- `this.registerEditorExtension(ext)` — register CM6 extensions (auto-cleaned on unload)
- `this.loadData()` / `this.saveData()` — persist settings

### CM6 API

- `ViewPlugin.fromClass(ViewClass)` — create ViewPlugin
- `view.dispatch({ changes, selection, userEvent })` — atomic document mutation
- `view.state.selection.main.head` — cursor position
- `view.posAtCoords({ x, y })` — screen coords to document offset

### Image Audit Flow

```
User triggers "Image Audit" (ribbon icon or command palette)
  -> new OrphanImageModal(app).open()
  -> OrphanDetector.scan()
     -> vault.getFiles() -> filter .assets images
     -> metadataCache.resolvedLinks -> build referenced set
     -> difference -> OrphanImageInfo[]
  -> Modal renders checklist with thumbnails
  -> User selects images, clicks "Safe Cleanup"
  -> vault.trash(file, false)  // Obsidian internal trash, not permanent delete
```

Key API: `app.metadataCache.resolvedLinks` is `Record<string, Record<string, number>>` — outer key is source note path, inner key is target file path, value is link count. Scan only runs on user trigger (zero background overhead).

### Broken Image Repair Flow (integrated into Orphan Modal)

```
User opens Orphan Modal -> clicks "Repair broken links" button
  -> BrokenLinkRepairer.repair(view)
     -> regex scan all ![](path) in current note
     -> for each: cleanPath (backslash, absolute prefix)
     -> check if cleaned path resolves to existing file
     -> if not: extract filename, search vault-wide via vault.getFiles()
     -> compute relative path, apply via view.dispatch()
  -> modal automatically rescans -> orphan list refreshes
```

Key details:
- Repair is integrated into OrphanImageModal, not a standalone command
- Only standard markdown image syntax `![alt](path)` is targeted
- After repair, the orphan list refreshes automatically
- Vault-wide filename search prefers `.assets/` directories, then same-directory matches

### Electron Usage

`orphan-modal.ts` uses `require('electron').shell.showItemInFolder()` to reveal files in the OS file explorer. This is a runtime require (not an import) since `electron` is external to the esbuild bundle. Falls back to `app.openWithDefaultApp()` if electron is unavailable.

### i18n

Locale is detected from `window.localStorage.getItem('language')` or `navigator.language`. Chinese (`zh*`) maps to zh locale; everything else falls back to English. The `t(key, vars?)` function returns localized text with optional `{placeholder}` interpolation.

## Release Workflow

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds and publishes `main.js`, `manifest.json`, and `styles.css` as GitHub Release assets.

```bash
npm run version      # bumps version in package.json + manifest.json, generates CHANGELOG
git tag v1.0.0
git push origin v1.0.0 --follow-tags
```

The Obsidian community plugins repo points to the release URL, not the git repo. `main.js` is in `.gitignore` and should not be committed.
