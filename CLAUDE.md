# Repository guidance

## Scope and verification

Typorian Image is an Obsidian plugin for Typora-compatible Markdown images. Current source version: **1.8.1**. Consult `docs/superpowers/plans/2026-10-08-image-check-workflow.md` for the current workflow and `docs/optimization-review-2026-10-08.md` for earlier 1.7.0 implementation and acceptance evidence. A package version, successful build, commit, installation, and desktop acceptance are different milestones.

Follow the user's applicable AGENTS.md instructions. Do not add tests, checksums, implicit fallbacks, background services, or unrelated features. Do not run image cleanup, bulk link repair, or restructuring against the user's real vault without authorization for that data operation. Keep user notes, source images, unrelated settings, and changes by other contributors intact.

## Build commands

```bash
npm install
npx tsc --noEmit
npm run build
npm run dev
```

`npm run dev` starts the development watcher; stop task-created watchers when finished. No test framework or linter is configured. Use type checking, production builds, source review, and direct application operation. Report unverified runtime cases explicitly.

## Architecture

```text
main.ts                     Lifecycle, editor extension, commands, ribbon, setting callbacks
settings.ts                 Project-root settings interface, defaults, filename policy
src/constants.ts            MIME types and image extension mappings
src/locale.ts               Chinese/English dictionaries and interpolation
src/path-utils.ts           Filename compatibility, encoding/decoding, relative paths
src/markdown-images.ts      Shared parsing, link generation, actual Wiki target resolution
src/code-block-filter.ts    Code-fence and inline-code ranges
src/image-handler.ts        Ordered batch image saves and naming
src/cm6-paste-plugin.ts     Event capture, receiving editor/note, pending insertion positions
src/setting-tab.ts          Persisted settings UI
src/image-check-types.ts    Reference occurrences, unused files, scopes and action results
src/image-checker.ts        Shared inspection, candidate indexes, repair/delete/trash actions
src/image-check-modal.ts    Captured-note dual-tab check, selection, previews and More tools
src/image-file-picker.ts    Existing vault image selection
src/wiki-converter-modal.ts Format-only conversion with captured note/scope and size retention
src/share-manager.ts        Shared attachment mapping, unique folder/ZIP output
src/share-modal.ts          Vault-relative export UI and actual output notices
src/restructure-manager.ts Per-note image copies, in-place links, unique copy directories
src/restructure-modal.ts   Selection, destination preview, in-place confirmation
src/icon-utils.ts           Lucide icon utilities
styles.css                  Plugin settings, dialogs, and .assets explorer hiding
```

Defaults and important policy parameters belong in root `settings.ts`; user choices persist through Obsidian `loadData()` / `saveData()`. Do not restore `src/settings.ts` or add environment-variable parameter injection.

## Image insertion

The CM6 ViewPlugin captures paste/drop events with public editor APIs and DOM listeners. Capture the receiving note through `editorInfoField`, together with settings, files, and insertion range. Do not read the global active note later during asynchronous saves.

Save a batch in input order, then dispatch one transaction containing changes and selection. Pasting replaces the captured selection; dropping inserts at the resolved position. Pending operations map their positions through document changes and become inactive when their editor switches notes or closes. Saved images remain associated with the original note; report that state instead of inserting into another note.

Preserve filenames subject to the root compatibility policy, or use timestamp names. Enabled conflict renaming selects a unique filename; disabled conflict renaming skips the conflicting image with a notice. Never overwrite an existing image because automatic renaming is disabled. Mixed image/non-image drops remain with Obsidian.

Use `createMarkdownImage()` for generated links and the shared path helpers throughout insertion, repair, conversion, export, and restructuring. Preserve titles and escaped captions. Do not reintroduce a `[^)]+` image regex or `%20`-only encoding.

## Resolution and conversion

Distinguish actual file targets from suggested repair candidates. `resolveActualWikiImage()` uses native Obsidian resolution for normal Wiki paths, handles explicit note-relative paths and literal special filenames, and supports the configured manual attachment directory. A valid native target must not be classified as broken merely because its path contains an otherwise discouraged filename character. Same-basename candidates are indexed once per scan and do not become actual export targets until explicitly repaired.

Image Check always skips fenced and inline code. The scan-code setting applies only to explicit Wiki conversion. Conversion accepts resolved compatible targets, tracks occurrences by position, and keeps `|300`/`|300x200` syntax because those are dimensions rather than alt text. Missing or incompatible references go to Image Check, with note/scope preserved; conversion does not delete links.

## Image Check

The modal captures its TFile when opened. Current scope reads that note's references; all scope reads vault Markdown notes. Another note opened for inspection does not change the captured target. Preserve command IDs; ribbon visibility flags affect shortcuts only. New installs show Check and Share, with conversion/restructure reachable through More tools and commands. Preserve existing explicit shortcut preferences. Removed repair-time Wiki settings and orphan/broken-link modules must not be restored.

Reference issues store exact offsets, source snapshots, syntax/alt/title, actual candidates and selected targets. Repair/delete apply only to selected occurrences through `vault.process`; changed note snapshots are skipped and reported. Deletion removes complete image syntax only. Repair preserves Markdown titles and Wiki aliases/dimensions. Incompatible filenames create a compatible copy in the configured attachment directory, reuse copies by source/directory within the action, and retain originals.

Unused-file candidates use the current note's attachment folder and descendants, or the union of historical `.assets` folders and folders generated by the current attachment template in all scope. Whole-vault resolved-link facts and Markdown/Wiki contents determine references, including shared images. Broken-link candidate associations reuse that pass and are displayed separately from unassociated files. They remain suggestions, not valid references. Scans are user-triggered and cover supported vault references, not arbitrary external uses.

Trash applies only to explicit selections, rechecks reference status, calls `vault.trash(file, false)`, and reports file count and bytes. Obsidian's `.trash` is a filesystem location, not a plugin restoration UI. Never clean arbitrary source directories beyond the configured candidate scope.

## Share and restructure

Share destinations are vault-relative parent directories; empty means the vault root. Reject absolute system paths and `..` segments. The removed native folder picker must not be restored unless actual external filesystem export is implemented separately. Folder export creates a unique note-named directory; ZIP export creates a unique file. Notify and open the actual returned destination. Persist the open-folder setting.

Each distinct source image gets its own destination name, while repeated references to the same source share one copy. Different same-name sources must not overwrite or collapse. Export supports Markdown and Wiki images and does not mutate originals. Ordinary Wiki becomes Markdown; dimension-bearing Wiki retains its syntax with a rewritten target. Return actual path, packaged image count, and unpackaged-reference count.

Restructure mapping is per note. Copy mode creates a unique directory based on `restructureOutputFolder`, preserves note paths, and excludes prior output directories from future scans. In-place mode changes only selected notes, copies images with unique collision names, and reuses already correctly placed images. Unresolved references remain unchanged and their count appears in the preview. Restructure preserves source Markdown/Wiki syntax, including dimensions.

**Source images are retained in all restructure modes.** Other notes and ordinary/HTML links may still reference them. Later cleanup is a separate explicit audit action. Do not require unrelated orphan cleanup before in-place restructuring and do not introduce automatic source-image deletion.

## Explorer hiding and desktop APIs

The `.assets` visibility setting uses scoped CSS and plugin state; files and references remain on disk. CSS `:has()` support depends on the Obsidian installer. Verify ordinary explorer windows, pop-out windows, reload persistence, toggling, and new/renamed directories separately.

Electron APIs are runtime imports used for desktop reveal/open actions. Vault-relative writes use the vault API. Do not interpret a successful shell call as proof of export contents or an installation as proof of runtime behavior.

## TypeScript and releases

`strictNullChecks` and `noImplicitAny` are enabled. Use explicit types where needed. The Obsidian SDK and build tool versions are pinned in `package.json`; obsolete `standard-version` tooling has been removed.

Pushing a `v*` tag triggers `.github/workflows/release.yml` to build Release assets. Keep package, manifest, and version compatibility metadata consistent. Do not publish a release or merge a PR merely because the source version was updated; follow the active task's authorization and report the actual publication state.
