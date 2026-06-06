# Obsidian Community Plugin Submission Checklist

This document tracks the requirements for submitting Typorian Image to the official Obsidian community plugins repository (`obsidianmd/obsidian-releases`).

## Manifest

- [x] `id` is unique and matches the plugin folder name: `typorian-image`
- [x] `name` is human-readable: `Typorian Image`
- [x] `version` follows semver: `0.1.0`
- [x] `minAppVersion` is set: `1.0.0`
- [x] `description` is concise and informative
- [ ] `author` field is filled
- [ ] `authorUrl` field is filled (if applicable)
- [ ] `fundingUrl` field is filled (if applicable)
- [x] `isDesktopOnly` is `false` (plugin uses standard DOM APIs)

## Code Quality

- [x] No `eval()` or `new Function()` calls
- [x] No `innerHTML` or `outerHTML` assignments (use `createEl` / `createDiv`)
- [x] No dynamic script loading
- [x] No network requests (no external API calls)
- [x] No persistent background processes or polling
- [x] No monkey-patching of Obsidian internal APIs
- [x] TypeScript compiles with zero errors

## Security

- [x] No use of `dangerouslySetInnerHTML` or equivalent
- [x] No access to `process.env` or Node.js-specific APIs at runtime
- [x] No file system access outside Obsidian vault APIs
- [x] Event listeners are properly cleaned up in `destroy()` methods

## Performance

- [x] No `update()` listener that runs on every keystroke
- [x] No `setInterval` or `setTimeout` loops
- [x] Event handlers only activate on paste/drop (not on regular input)
- [x] CM6 ViewPlugin has zero overhead during normal editing

## Compatibility

- [x] Works with both dark and light themes (no hardcoded colors)
- [x] Does not interfere with other plugins' functionality
- [x] Only targets image files; non-image paste/drop events pass through
- [x] Does not modify wiki-link behavior for notes, blocks, or headings

## Styles

- [x] `styles.css` exists (may be empty)
- [x] No `!important` declarations
- [x] No fixed dimensions that break responsive layouts

## Release

- [x] `main.js` is built and available in GitHub Releases
- [x] `manifest.json` is available in GitHub Releases
- [x] `styles.css` is available in GitHub Releases
- [x] GitHub Release tag matches `manifest.json` version

## README

- [x] Plugin purpose is clearly described
- [x] Installation instructions are provided
- [x] Settings are documented
- [x] How it works section explains the mechanism

## Before Submitting PR to obsidianmd/obsidian-releases

1. Ensure the latest release tag matches `manifest.json` version
2. Verify `main.js`, `manifest.json`, and `styles.css` are attached to the GitHub Release
3. Fork `obsidianmd/obsidian-releases`
4. Add an entry to `community-plugins.json`:
   ```json
   {
     "id": "typorian-image",
     "name": "Typorian Image",
     "author": "",
     "description": "Enforce standard Markdown image syntax with Typora-style .assets folder",
     "repo": "ygttygtt/typorian-image"
   }
   ```
5. Submit the PR with a clear title: "Add Typorian Image plugin"
6. Wait for review and address any feedback
