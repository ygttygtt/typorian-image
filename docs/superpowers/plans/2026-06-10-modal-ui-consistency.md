# Modal UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the interaction pattern of Orphan Modal and Wiki Converter Modal — both use header scope toggle + dynamic footer buttons.

**Architecture:** Both modals get "当前笔记/全部笔记" toggle in header. Footer buttons dynamically change text based on selected scope. Orphan modal's `scanAndRender` filters by scope. Wiki converter already has this; just ensure footer button is dynamic.

**Tech Stack:** TypeScript, Obsidian Modal API, existing i18n system

---

## Current State

| | Wiki Converter | Orphan Modal |
|---|---|---|
| Scope selection | Header toggle "当前/全部" | Footer buttons "修复当前/修复全部" |
| Footer actions | "转换选中" (dynamic count) | "安全清理" (dynamic count) |
| Scan scope | Respects toggle | Always vault-wide |

## Target State

Both modals:
- **Header:** `[当前笔记] [全部笔记]` toggle + `☑ 全选` + summary
- **Footer (left):** `[取消]` `[刷新]` `[修复/转换]` (text follows scope)
- **Footer (right):** `[安全清理/转换选中]` (dynamic count)

---

### Task 1: Add locale keys for orphan modal dynamic button

**Files:**
- Modify: `src/locale.ts:1-109` (LocaleKey type)
- Modify: `src/locale.ts:111-226` (zh dict)
- Modify: `src/locale.ts:228-344` (en dict)

- [ ] **Step 1: Add new LocaleKey entries**

Add to the `LocaleKey` type union (after `'orphan.repairNoActive'`):

```typescript
  | 'orphan.repairCurrent'
  | 'orphan.repairAllBtn'
```

- [ ] **Step 2: Add zh translations**

Add to `zh` dict:

```typescript
  'orphan.repairCurrent': '修复当前笔记',
  'orphan.repairAllBtn': '修复全部笔记',
```

- [ ] **Step 3: Add en translations**

Add to `en` dict:

```typescript
  'orphan.repairCurrent': 'Repair Current',
  'orphan.repairAllBtn': 'Repair All Notes',
```

- [ ] **Step 4: Commit**

```bash
git add src/locale.ts
git commit -m "feat: add locale keys for orphan modal dynamic repair button"
```

---

### Task 2: Add scope toggle to orphan modal header

**Files:**
- Modify: `src/orphan-modal.ts:9-18` (class properties)
- Modify: `src/orphan-modal.ts:34-57` (scanAndRender)
- Modify: `src/orphan-modal.ts:59-73` (renderHeader)

- [ ] **Step 1: Add `scanMode` property**

Add after line 17 (`private headerContainer`):

```typescript
  private scanMode: 'current' | 'all' = 'current';
```

- [ ] **Step 2: Update `scanAndRender` to always render header**

Replace the `scanAndRender` method:

```typescript
  private async scanAndRender(): Promise<void> {
    this.contentEl.empty();
    this.checkboxes.clear();

    this.contentEl.createEl('p', {
      text: t('orphan.scanning'),
      cls: 'orphan-status',
    });

    this.orphans = await this.detector.scan();
    this.contentEl.empty();

    this.renderHeader();

    if (this.orphans.length === 0) {
      this.contentEl.createEl('p', {
        text: t('orphan.empty'),
        cls: 'orphan-status',
      });
    } else {
      this.renderList();
    }

    this.renderFooter();
  }
```

- [ ] **Step 3: Add scope toggle to `renderHeader`**

Replace the `renderHeader` method:

```typescript
  private renderHeader(): void {
    this.headerContainer = this.contentEl.createDiv({ cls: 'orphan-header' });

    // Scan mode toggle buttons
    const modeGroup = this.headerContainer.createDiv({ cls: 'wiki-mode-group' });
    const currentBtn = modeGroup.createEl('button', {
      text: t('wiki.modeCurrent'),
      cls: `wiki-mode-btn${this.scanMode === 'current' ? ' is-active' : ''}`,
    });
    const allBtn = modeGroup.createEl('button', {
      text: t('wiki.modeAll'),
      cls: `wiki-mode-btn${this.scanMode === 'all' ? ' is-active' : ''}`,
    });
    currentBtn.addEventListener('click', async () => {
      this.scanMode = 'current';
      await this.scanAndRender();
    });
    allBtn.addEventListener('click', async () => {
      this.scanMode = 'all';
      await this.scanAndRender();
    });

    // Select all
    const selectAllLabel = this.headerContainer.createEl('label', { cls: 'orphan-select-all-label' });
    this.selectAllCheckbox = selectAllLabel.createEl('input', { type: 'checkbox' });
    selectAllLabel.createSpan({ text: t('orphan.selectAll') });

    this.selectAllCheckbox.addEventListener('change', () => {
      const checked = this.selectAllCheckbox!.checked;
      this.checkboxes.forEach((cb) => { cb.checked = checked; });
      this.updateCleanupButton();
    });

    this.updateSummary();
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/orphan-modal.ts
git commit -m "feat: add scope toggle to orphan modal header"
```

---

### Task 3: Replace orphan modal footer with dynamic buttons

**Files:**
- Modify: `src/orphan-modal.ts:160-197` (renderFooter)
- Modify: `src/orphan-modal.ts:199-248` (handleRepairCurrent, handleRepairAll)

- [ ] **Step 1: Add `repairButton` property**

Add after `private cleanupButton`:

```typescript
  private repairButton: HTMLButtonElement | null = null;
```

- [ ] **Step 2: Replace `renderFooter`**

Replace the entire `renderFooter` method:

```typescript
  private renderFooter(): void {
    const footer = this.contentEl.createDiv({ cls: 'orphan-footer' });

    // Left group: cancel + refresh
    const leftGroup = footer.createDiv({ cls: 'orphan-footer-left' });

    const cancelBtn = leftGroup.createEl('button', { text: t('orphan.cancel') });
    cancelBtn.addEventListener('click', () => this.close());

    const refreshBtn = leftGroup.createEl('button', {
      text: t('orphan.refresh'),
      cls: 'orphan-repair-btn',
    });
    refreshBtn.addEventListener('click', () => this.scanAndRender());

    // Right group: repair + cleanup
    const rightGroup = footer.createDiv({ cls: 'orphan-footer-right' });

    this.repairButton = rightGroup.createEl('button', {
      text: this.scanMode === 'current' ? t('orphan.repairCurrent') : t('orphan.repairAllBtn'),
      cls: 'orphan-repair-btn',
    });
    this.repairButton.addEventListener('click', () => this.handleRepair());

    this.cleanupButton = rightGroup.createEl('button', {
      text: t('orphan.cleanup'),
      cls: 'mod-warning',
    });
    this.cleanupButton.disabled = true;
    this.cleanupButton.addEventListener('click', () => this.handleCleanup());
  }
```

- [ ] **Step 3: Add unified `handleRepair` method**

Replace `handleRepairCurrent` and `handleRepairAll` with a single method:

```typescript
  private async handleRepair(): Promise<void> {
    if (this.scanMode === 'current') {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) {
        new Notice(t('orphan.repairNoActive'));
        return;
      }

      const editorView = (view as any).editor?.cm;
      if (!editorView) return;

      const result = await this.repairer.repair(editorView);
      if (!result) {
        new Notice(t('orphan.repairNoActive'));
        return;
      }

      const { brokenFixed, wikiConverted, total } = result;
      if (total === 0) {
        new Notice(t('orphan.repairNone'));
      } else if (brokenFixed > 0 && wikiConverted > 0) {
        new Notice(t('orphan.repairFixedBoth', { broken: brokenFixed, wiki: wikiConverted }));
      } else if (wikiConverted > 0) {
        new Notice(t('orphan.repairFixedWiki', { count: wikiConverted }));
      } else {
        new Notice(t('orphan.repairFixedBroken', { count: brokenFixed }));
      }

      if (total > 0) {
        await this.scanAndRender();
      }
    } else {
      const result = await this.repairer.repairAll();
      const { scanned, brokenFixed, wikiConverted, total } = result;

      if (total === 0) {
        new Notice(t('orphan.repairAllNone'));
      } else if (brokenFixed > 0 && wikiConverted > 0) {
        new Notice(t('orphan.repairAllFixedBoth', { scanned, broken: brokenFixed, wiki: wikiConverted }));
      } else if (wikiConverted > 0) {
        new Notice(t('orphan.repairAllFixedWiki', { scanned, count: wikiConverted }));
      } else {
        new Notice(t('orphan.repairAllFixedBroken', { scanned, count: brokenFixed }));
      }

      if (total > 0) {
        await this.scanAndRender();
      }
    }
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/orphan-modal.ts
git commit -m "feat: dynamic footer buttons for orphan modal, unified repair handler"
```

---

### Task 4: Make wiki converter footer button dynamic

**Files:**
- Modify: `src/wiki-converter-modal.ts:210-230` (renderFooter)
- Modify: `src/wiki-converter-modal.ts:255-263` (updateConvertButton)

- [ ] **Step 1: Update `renderFooter` to show scope-aware button text**

Replace `renderFooter`:

```typescript
  private renderFooter(): void {
    const footer = this.contentEl.createDiv({ cls: 'orphan-footer' });
    const leftGroup = footer.createDiv({ cls: 'orphan-footer-left' });
    const rightGroup = footer.createDiv({ cls: 'orphan-footer-right' });

    const cancelBtn = leftGroup.createEl('button', { text: t('orphan.cancel') });
    cancelBtn.addEventListener('click', () => this.close());

    const refreshBtn = leftGroup.createEl('button', {
      text: t('orphan.refresh'),
      cls: 'orphan-repair-btn',
    });
    refreshBtn.addEventListener('click', () => this.scanAndRender());

    this.convertButton = rightGroup.createEl('button', {
      text: this.scanMode === 'current' ? t('wiki.modeCurrent') : t('wiki.modeAll'),
      cls: 'mod-cta',
    });
    this.convertButton.disabled = true;
    this.convertButton.addEventListener('click', () => this.handleConvert());
  }
```

Wait, that's wrong. The convert button should say "转换选中 (N)" not "当前笔记". Let me reconsider.

Actually, the wiki converter's footer button is already dynamic via `updateConvertButton()` — it shows "转换选中" or "转换选中 (N条)". The user's request is about the **scope selection** being in the header vs footer. The wiki converter already has scope in the header, which is correct.

The real inconsistency was that the orphan modal had scope in the footer. After Task 2-3, both modals will have scope in the header. The footer buttons just need to be consistent in layout.

Let me reconsider Task 4. The wiki converter footer is already fine. The only thing to ensure is that both footers have the same button grouping pattern. Let me check:

**Wiki converter footer:** left=[取消, 刷新], right=[转换选中]
**Orphan modal footer (after Task 3):** left=[取消, 刷新], right=[修复X, 安全清理]

These are already consistent in grouping. The wiki converter doesn't need changes.

Actually wait — I should remove Task 4 since the wiki converter footer is already correct. Let me also check: does the user want the footer button to say "转换当前笔记"/"转换全部笔记" instead of "转换选中"? That would make the footer buttons truly dynamic based on scope.

Looking at it again, I think the answer is no — the wiki converter's "转换选中" makes sense because you select individual items to convert. The scope toggle just changes what's scanned. The orphan modal's "修复" is different because it repairs ALL broken links in scope, not selected ones.

So Task 4 is unnecessary. Let me remove it and finalize.

- [ ] **Step 1: No changes needed to wiki converter**

The wiki converter's footer is already consistent:
- Left: [取消] [刷新]
- Right: [转换选中(N)]

The scope toggle is in the header. This matches the target pattern.

- [ ] **Step 2: Skip to next task**

---

### Task 4 (renumbered): Build, sync, and verify

**Files:**
- None (build output only)

- [ ] **Step 1: Build**

```bash
cd E:/ObsidianPlugin && npm run build
```

- [ ] **Step 2: Sync to both directories**

```bash
cp E:/ObsidianPlugin/main.js "E:/QianFengStudy/Python笔记/.obsidian/plugins/typorian-image/main.js"
cp E:/ObsidianPlugin/manifest.json "E:/QianFengStudy/Python笔记/.obsidian/plugins/typorian-image/manifest.json"
cp E:/ObsidianPlugin/styles.css "E:/QianFengStudy/Python笔记/.obsidian/plugins/typorian-image/styles.css"
cp E:/ObsidianPlugin/main.js "E:/ObsidianTest/ob插件测试仓库/.obsidian/plugins/typorian-image/main.js"
cp E:/ObsidianPlugin/manifest.json "E:/ObsidianTest/ob插件测试仓库/.obsidian/plugins/typorian-image/manifest.json"
cp E:/ObsidianPlugin/styles.css "E:/ObsidianTest/ob插件测试仓库/.obsidian/plugins/typorian-image/styles.css"
```

- [ ] **Step 3: Verify timestamps match**

```bash
ls -la E:/ObsidianPlugin/main.js "E:/QianFengStudy/Python笔记/.obsidian/plugins/typorian-image/main.js" "E:/ObsidianTest/ob插件测试仓库/.obsidian/plugins/typorian-image/main.js"
```

- [ ] **Step 4: Manual verification in Obsidian**

Open test vault, verify:
1. Orphan modal: header has "当前笔记/全部笔记" toggle, footer has dynamic repair button
2. Wiki converter: header has toggle, footer has "转换选中" (unchanged)
3. Both modals have consistent header+footer layout
