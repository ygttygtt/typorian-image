# Repository guidance

## Scope and verification

Typorian Image is an Obsidian plugin for Typora-compatible Markdown images. Current source version: **1.7.0**. Consult `docs/superpowers/plans/2026-10-08-image-workflow-optimization.md` and `docs/optimization-review-2026-10-08.md` for implementation and acceptance status. A package version, successful build, commit, installation, and desktop acceptance are different milestones.

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
src/markdown-images.ts      Markdown/Wiki parsing, link generation, explicit/unique resolution
src/code-block-filter.ts    Code-fence and inline-code ranges
src/image-handler.ts        Ordered batch image saves and naming
src/cm6-paste-plugin.ts     Event capture, receiving editor/note, pending insertion positions
src/setting-tab.ts          Persisted settings UI
src/orphan-types.ts         Image types and scan results
src/orphan-detector.ts      Vault reference collection and .assets candidates
src/orphan-modal.ts         Current/all scope, repair, explicit selection and trash
src/broken-link-repairer.ts Exact-path and unique-name link repair
src/wiki-converter-modal.ts Occurrence-based preview and conversion
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

Resolve exact paths first. A missing path may use a basename match only when exactly one image matches. Explicit Wiki paths remain path-based; the optional manual attachment directory participates in resolution. Ambiguous same-name candidates remain unresolved rather than selecting the first cache or vault match.

Code examples are excluded by default. Repair/conversion honors the explicit scan-code-block setting; export/restructure skips code examples. Wiki conversion tracks each occurrence by source position. A changed note invalidates its old preview; rescan before applying.

## Image audit

Reference collection combines the resolved-link index with current Markdown/Wiki note contents. Scans are user-triggered, without a background loop. Candidate files are supported images under directories whose names end in `.assets`, including nested directories. Current-note scope uses the configured attachment directory boundary; references from other notes still count.

Cleanup uses explicit selected images and rechecks current reference status before calling `vault.trash(file, false)`. Obsidian's internal trash is a filesystem location, not a plugin restoration UI. Audit does not clean source images outside `.assets` directories.

## Share and restructure

Share destinations are vault-relative parent directories; empty means the vault root. Reject absolute system paths and `..` segments. The removed native folder picker must not be restored unless actual external filesystem export is implemented separately. Folder export creates a unique note-named directory; ZIP export creates a unique file. Notify and open the actual returned destination. Persist the open-folder setting.

Each distinct source image gets its own destination name, while repeated references to the same source share one copy. Different same-name sources must not overwrite or collapse. Export supports Markdown and Wiki images and does not mutate originals.

Restructure mapping is per note. Copy mode creates a unique directory based on `restructureOutputFolder`, preserves note paths, and excludes prior output directories from future scans. In-place mode changes only selected notes, copies images with unique collision names, and reuses already correctly placed images. Unresolved references remain unchanged.

**Source images are retained in all restructure modes.** Other notes and ordinary/HTML links may still reference them. Later cleanup is a separate explicit audit action. Do not require unrelated orphan cleanup before in-place restructuring and do not introduce automatic source-image deletion.

## Explorer hiding and desktop APIs

The `.assets` visibility setting uses scoped CSS and plugin state; files and references remain on disk. CSS `:has()` support depends on the Obsidian installer. Verify ordinary explorer windows, pop-out windows, reload persistence, toggling, and new/renamed directories separately.

Electron APIs are runtime imports used for desktop reveal/open actions. Vault-relative writes use the vault API. Do not interpret a successful shell call as proof of export contents or an installation as proof of runtime behavior.

## TypeScript and releases

`strictNullChecks` and `noImplicitAny` are enabled. Use explicit types where needed. The Obsidian SDK and build tool versions are pinned in `package.json`; obsolete `standard-version` tooling has been removed.

Pushing a `v*` tag triggers `.github/workflows/release.yml` to build Release assets. Keep package, manifest, and version compatibility metadata consistent. Do not publish a release or merge a PR merely because the source version was updated; follow the active task's authorization and report the actual publication state.
