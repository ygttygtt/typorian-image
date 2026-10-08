type LocaleKey =
  | 'image.batchError'
  | 'image.conflict'
  | 'image.error'
  | 'image.editorChanged'
  | 'common.contentChanged'
  | 'wiki.ambiguous'
  | 'share.invalidPath'
  | 'share.rootFolder'
  | 'restructure.overwriteSuccess'
  | 'settings.restructureOutput.name'
  | 'settings.restructureOutput.desc'
  | 'settings.restructureOutput.invalid'

  | 'settings.namingStrategy.name'
  | 'settings.namingStrategy.desc'
  | 'settings.namingStrategy.original'
  | 'settings.namingStrategy.timestamp'
  | 'settings.autoRename.name'
  | 'settings.autoRename.desc'
  | 'settings.currentBehavior'
  | 'settings.currentBehavior.desc1'
  | 'settings.currentBehavior.desc2'
  | 'settings.currentBehavior.desc3'
  | 'settings.assetPath.name'
  | 'settings.assetPath.desc'
  | 'settings.hideAssetFolders.name'
  | 'settings.hideAssetFolders.desc'
  | 'settings.typoraGuide'
  | 'settings.typoraGuide.intro'
  | 'settings.typoraGuide.step1'
  | 'settings.typoraGuide.step2'
  | 'settings.typoraGuide.step3'
  | 'settings.typoraGuide.step4'
  | 'settings.typoraGuide.note'
  | 'orphan.title'
  | 'orphan.scanning'
  | 'orphan.empty'
  | 'orphan.selectAll'
  | 'orphan.summary'
  | 'orphan.cancel'
  | 'orphan.cleanup'
  | 'orphan.cleanupCount'
  | 'orphan.trashNotice'
  | 'orphan.locate'
  | 'orphan.locateFolder'
  | 'orphan.locateNote'
  | 'orphan.noteNotFound'
  | 'orphan.refresh'
  | 'orphan.repairFixedBroken'
  | 'orphan.repairFixedWiki'
  | 'orphan.repairFixedBoth'
  | 'orphan.repairAllFixedBroken'
  | 'orphan.repairAllFixedWiki'
  | 'orphan.repairAllFixedBoth'
  | 'orphan.repairNone'
  | 'orphan.repairAllNone'
  | 'orphan.repairNoActive'
  | 'orphan.repairCurrent'
  | 'orphan.repairAllBtn'
  | 'orphan.brokenLinks'
  | 'orphan.brokenLinksDesc'
  | 'orphan.brokenLinkLine'
  | 'orphan.removeLink'
  | 'settings.interceptImage.name'
  | 'settings.interceptImage.desc'
  | 'settings.wikiConversion.name'
  | 'settings.wikiConversion.desc'
  | 'settings.scanCodeBlocks.name'
  | 'settings.scanCodeBlocks.desc'
  | 'settings.showRestructure.name'
  | 'settings.showRestructure.desc'
  | 'settings.manualAttachmentFolder.name'
  | 'settings.manualAttachmentFolder.desc'
  | 'settings.icons'
  | 'settings.icons.imageAudit'
  | 'settings.icons.share'
  | 'settings.icons.restructure'
  | 'share.title'
  | 'share.folderFormat'
  | 'share.zipFormat'
  | 'share.exportPath'
  | 'share.exportPath.desc'
  | 'share.creating'
  | 'share.success'
  | 'share.error'
  | 'share.noActive'
  | 'restructure.title'
  | 'restructure.preview'
  | 'restructure.apply'
  | 'restructure.cancel'
  | 'restructure.confirm'
  | 'restructure.success'
  | 'restructure.scanning'
  | 'share.openFolder'
  | 'share.openFolder.desc'
  | 'restructure.noImages'
  | 'restructure.selected'
  | 'restructure.table.note'
  | 'restructure.table.assets'
  | 'restructure.table.images'
  | 'restructure.modeOverwrite'
  | 'restructure.modeSandboxDesc'
  | 'restructure.overwriteWarning'
  | 'wiki.title'
  | 'wiki.scanning'
  | 'wiki.empty'
  | 'wiki.summary'
  | 'wiki.convertDone'
  | 'wiki.modeCurrent'
  | 'wiki.modeAll'
  | 'settings.section.passive'
  | 'settings.section.orphan'
  | 'settings.section.wiki'
  | 'settings.section.share'
  | 'settings.section.restructure'
  | 'settings.showWikiConverter.name'
  | 'settings.showWikiConverter.desc'
  | 'settings.icons.wikiConverter'
  | 'wiki.broken'
  | 'wiki.convertCurrent'
  | 'wiki.convertAll'
  | 'wiki.convertCurrentCount'
  | 'wiki.convertAllCount'
  | 'wiki.cleanBroken'
  | 'wiki.cleanBrokenDone'
  | 'wiki.toggleLabel';

const zh: Record<LocaleKey, string> = {
  'image.batchError': '这批图片未完成导入：{message}。修正原因后可以继续粘贴。',
  "image.conflict": "已跳过同名图片：{path}。启用自动重命名可保留两张图片。",
  "image.error": "图片 {name} 导入失败：{message}",
  "image.editorChanged": "图片已保存到原笔记目录，但编辑器已切换：{path}。请在原笔记中插入链接。",
  "common.contentChanged": "笔记内容已变化，请在刷新后的列表重新选择。",
  "wiki.ambiguous": "存在多个同名图片，需手动确认路径",
  "share.invalidPath": "请输入库内相对目录，留空表示库根；不支持绝对路径或上级目录。",
  "share.rootFolder": "留空使用库根目录",
  "restructure.overwriteSuccess": "已原地整理 {count} 篇笔记，原图片保留。",
  "settings.restructureOutput.name": "重构副本目录",
  "settings.restructureOutput.desc": "相对于库根目录。每次生成新的编号目录，已有副本不会再次重构。",
  "settings.restructureOutput.invalid": "请输入非空的库内相对目录，不支持绝对路径或上级目录。",

  'settings.hideAssetFolders.name': '在文件列表中隐藏 .assets 文件夹',
  'settings.hideAssetFolders.desc': '隐藏所有名称以 .assets 结尾的图片文件夹。仅影响文件列表显示，图片链接和 Typora 读取保持正常；关闭后立即恢复显示。',
  'settings.namingStrategy.name': '图片命名策略',
  'settings.namingStrategy.desc': '保留可用原名或使用时间戳；Obsidian 不兼容的文件名字符会替换为下划线。',
  'settings.namingStrategy.original': '保留原始文件名',
  'settings.namingStrategy.timestamp': "使用毫秒时间戳（批量图片追加序号）",
  'settings.autoRename.name': '冲突时自动重命名',
  'settings.autoRename.desc':
    '启用时为同名图片追加序号；关闭时跳过冲突图片并提示，不覆盖已有图片。',
  'settings.currentBehavior': '当前行为',
  'settings.currentBehavior.desc1':
    '当您在笔记中粘贴或拖放图片时，插件会将其保存到笔记同级的资源文件夹中，并插入标准 Markdown 图片链接。',
  'settings.currentBehavior.desc2': '资源文件夹模式：',
  'settings.currentBehavior.desc3': '输出语法：',
  'settings.assetPath.name': '资源文件夹路径',
  'settings.assetPath.desc':
    '自定义图片保存的相对路径。${notename} 会被替换为当前笔记名。一般无需修改。',
  'settings.typoraGuide': 'Typora 配置对齐指南',
  'settings.typoraGuide.intro':
    '要在 Obsidian（配合本插件）和 Typora 之间实现无缝互编辑，请按以下步骤配置 Typora：',
  'settings.typoraGuide.step1': '打开 Typora，进入偏好设置 > 图像。',
  'settings.typoraGuide.step2':
    '在"插入图片时"选项中，选择"复制图片到自定义文件夹"。',
  'settings.typoraGuide.step3': '输入路径模式：',
  'settings.typoraGuide.step4': '确保勾选"对当前文件应用上述规则"。',
  'settings.typoraGuide.note':
    '完成上述配置后，两个应用程序将使用完全相同的资源文件夹和相对路径存储图片，可以在任一编辑器中自由切换编辑。',
  'orphan.title': '无主图片清理',
  'orphan.scanning': '正在扫描仓库...',
  'orphan.empty': '未在 .assets 文件夹中检测到孤儿图片。',
  'orphan.selectAll': '全选',
  'orphan.summary': '张孤儿图片，总计',
  'orphan.cancel': '取消',
  'orphan.cleanup': '安全清理',
  'orphan.cleanupCount': '安全清理 ({count} 个文件)',
  'orphan.trashNotice': '已将 {count} 张孤儿图片移入回收站。',
  'orphan.locate': '定位文件',
  'orphan.locateFolder': '在文件资源管理器中打开',
  'orphan.locateNote': '打开关联笔记',
  'orphan.noteNotFound': '未找到关联笔记',
  'orphan.refresh': '刷新列表',
  'orphan.repairFixedBroken': '已修复 {count} 处失效链接，正在重新扫描...',
  'orphan.repairFixedWiki': '已转换 {count} 处 Wiki 链接，正在重新扫描...',
  'orphan.repairFixedBoth': '已修复 {broken} 处失效链接、转换 {wiki} 处 Wiki 链接，正在重新扫描...',
  'orphan.repairAllFixedBroken': '已扫描 {scanned} 篇笔记，修复 {count} 处失效链接。',
  'orphan.repairAllFixedWiki': '已扫描 {scanned} 篇笔记，转换 {count} 处 Wiki 链接。',
  'orphan.repairAllFixedBoth': '已扫描 {scanned} 篇笔记，修复 {broken} 处失效链接、转换 {wiki} 处 Wiki 链接。',
  'orphan.repairNone': '当前笔记中未发现失效图片链接。',
  'orphan.repairAllNone': '所有笔记中均未发现失效图片链接。',
  'orphan.repairNoActive': '请先打开一个笔记，再执行链接修复。',
  'orphan.repairCurrent': '修复当前笔记',
  'orphan.repairAllBtn': '修复全部笔记',
  'orphan.brokenLinks': '无法解析的图片链接',
  'orphan.brokenLinksDesc': '以下链接无法解析到任何文件，可能已丢失或损坏：',
  'orphan.brokenLinkLine': '第 {line} 行',
  'orphan.removeLink': '删除链接',
  'settings.interceptImage.name': '拦截图片粘贴路径',
  'settings.interceptImage.desc': '开启后，粘贴或拖入的图片将保存到笔记同级的资源文件夹中。关闭时使用 Obsidian 默认行为。',
  'settings.wikiConversion.name': '修复时转换 Wiki 链接',
  'settings.wikiConversion.desc': '扫描时检测 ![[image.png]] 格式并转换为标准 Markdown 链接。',
  'settings.scanCodeBlocks.name': '扫描代码块内的链接',
  'settings.scanCodeBlocks.desc': '开启后，修复与 Wiki 转换会处理代码块中的链接。默认关闭；分享、整理始终保留代码示例。',
  'settings.showRestructure.name': '显示重构工具',
  'settings.showRestructure.desc': '开启后，左侧栏将出现重构工具入口。',
  'settings.manualAttachmentFolder.name': '手动指定附件目录',
  'settings.manualAttachmentFolder.desc': '为历史 Wiki 图片指定库内附件目录。留空时按显式路径或唯一文件名解析。',
  'settings.icons': '图标设置',
  'settings.icons.imageAudit': '图片审计按钮图标',
  'settings.icons.share': '分享按钮图标',
  'settings.icons.restructure': '重构按钮图标',
  'share.title': '一键分享',
  'share.folderFormat': '文件夹格式',
  'share.zipFormat': 'ZIP 压缩包',
  'share.exportPath': '导出路径',
  'share.exportPath.desc': '库内相对目录；留空使用库根。每次导出生成新目录或 ZIP，不覆盖已有导出。',
  'share.creating': '正在导出...',
  'share.success': '已导出至 {path}',
  'share.error': '导出失败: {message}',
  'share.noActive': '请先打开一个笔记',
  'restructure.title': '附件重构',
  'restructure.preview': '预览变更',
  'restructure.apply': '应用重构',
  'restructure.cancel': '取消',
  'restructure.confirm': '请输入 confirm 以确认覆盖',
  'restructure.success': '重构完成，文件已复制至 {path}',
  'restructure.scanning': '正在扫描 Vault...',
  'share.openFolder': '导出后打开文件夹',
  'share.openFolder.desc': '导出完成后自动打开目标文件夹',
  'restructure.noImages': '无图片引用，不生成 assets 文件夹',
  'restructure.selected': '已选择 {count} 篇文档',
  'restructure.table.note': '文档',
  'restructure.table.assets': '目标路径',
  'restructure.table.images': '图片数',
  'restructure.modeOverwrite': '原地整理',
  'restructure.modeSandboxDesc': '生成重构副本到 {path}/，原笔记和原图片保留。',
  'restructure.overwriteWarning': '原地整理会修改所选笔记的图片链接并复制图片到各自的 .assets 目录，原图片保留。',
  'wiki.title': 'Wiki 链接转换',
  'wiki.scanning': '正在扫描 Wiki 链接...',
  'wiki.empty': '未发现 Wiki 图片链接。',
  'wiki.summary': '条 Wiki 图片链接',
  'wiki.convertDone': '已转换 {count} 条 Wiki 链接。',
  'wiki.modeCurrent': '当前笔记',
  'wiki.modeAll': '全部笔记',
  'settings.section.passive': '图片粘贴',
  'settings.section.orphan': '无主图片清理',
  'settings.section.wiki': 'Wiki 链接转换',
  'settings.section.share': '一键分享',
  'settings.section.restructure': '附件重构',
  'settings.showWikiConverter.name': '显示 Wiki 转换工具',
  'settings.showWikiConverter.desc': '开启后，左侧栏将出现 Wiki 链接转换入口。',
  'settings.icons.wikiConverter': 'Wiki 转换按钮图标',
  'wiki.broken': '条失效链接',
  'wiki.convertCurrent': '转换当前笔记',
  'wiki.convertAll': '转换全部笔记',
  'wiki.convertCurrentCount': '转换当前笔记 ({count} 条)',
  'wiki.convertAllCount': '转换全部笔记 ({count} 条)',
  'wiki.cleanBroken': '清理失效链接',
  'wiki.cleanBrokenDone': '已清理 {count} 条失效链接。',
  'wiki.toggleLabel': '转换 Wiki',
};

const en: Record<LocaleKey, string> = {
  'image.batchError': 'Image batch import failed: {message}. Correct the cause and paste again.',
  "image.conflict": "Skipped an existing image: {path}. Enable auto-renaming to keep both images.",
  "image.error": "Failed to import image {name}: {message}",
  "image.editorChanged": "Images were saved for {path}, but its editor changed. Insert their links in the original note.",
  "common.contentChanged": "Note contents have changed. Select items again from the refreshed list.",
  "wiki.ambiguous": "Multiple images share this name. Confirm the path manually.",
  "share.invalidPath": "Enter a vault-relative directory, or leave empty for the vault root. Absolute and parent paths are not supported.",
  "share.rootFolder": "Leave empty for the vault root",
  "restructure.overwriteSuccess": "Organized {count} notes in place. Original images were retained.",
  "settings.restructureOutput.name": "Restructured copy folder",
  "settings.restructureOutput.desc": "Relative to the vault root. Each run creates a new numbered folder; previous copies are excluded.",
  "settings.restructureOutput.invalid": "Enter a nonempty vault-relative folder. Absolute and parent paths are not supported.",

  'settings.hideAssetFolders.name': 'Hide .assets folders in the file explorer',
  'settings.hideAssetFolders.desc': 'Hide all folders whose names end in .assets. Only affects the file explorer; image links and Typora access continue to work. Disable to show the folders again.',
  'settings.namingStrategy.name': 'Image naming strategy',
  'settings.namingStrategy.desc': 'Keep a compatible original name or use a timestamp; unsupported filename characters become underscores.',
  'settings.namingStrategy.original': 'Keep original filename',
  'settings.namingStrategy.timestamp': "Millisecond timestamp (numbered within a batch)",
  'settings.autoRename.name': 'Auto-rename on conflict',
  'settings.autoRename.desc':
    'Append a number for duplicate names. When disabled, conflicting images are skipped with a notice; existing images are retained.',
  'settings.currentBehavior': 'Current behavior',
  'settings.currentBehavior.desc1':
    'When you paste or drop an image into a note, the plugin saves it to the note\'s sibling assets folder and inserts a standard Markdown image link.',
  'settings.currentBehavior.desc2': 'Asset folder pattern:',
  'settings.currentBehavior.desc3': 'Output syntax:',
  'settings.assetPath.name': 'Asset folder path',
  'settings.assetPath.desc':
    'Custom relative path for saving images. ${notename} is replaced with the current note name. Normally no change is needed.',
  'settings.typoraGuide': 'Typora alignment guide',
  'settings.typoraGuide.intro':
    'To achieve bidirectional compatibility between Obsidian (with this plugin) and Typora, configure Typora as follows:',
  'settings.typoraGuide.step1': 'Open Typora, go to Preferences > Image.',
  'settings.typoraGuide.step2':
    'Under "When insert images", select "Copy image to custom folder".',
  'settings.typoraGuide.step3': 'Enter the path pattern:',
  'settings.typoraGuide.step4':
    'Ensure "Apply above rules to current file only" is checked.',
  'settings.typoraGuide.note':
    'With these settings, both applications store images in the same assets folder using identical relative paths, enabling seamless cross-editing.',
  'orphan.title': 'Image Audit',
  'orphan.scanning': 'Scanning vault...',
  'orphan.empty': 'No orphan images detected in .assets folders.',
  'orphan.selectAll': 'Select All',
  'orphan.summary': 'orphan image(s), total',
  'orphan.cancel': 'Cancel',
  'orphan.cleanup': 'Safe Cleanup',
  'orphan.cleanupCount': 'Safe Cleanup ({count} file(s))',
  'orphan.trashNotice': 'Moved {count} orphan image(s) to trash.',
  'orphan.locate': 'Locate file',
  'orphan.locateFolder': 'Reveal in file explorer',
  'orphan.locateNote': 'Open linked note',
  'orphan.noteNotFound': 'No linked note found',
  'orphan.refresh': 'Refresh list',
  'orphan.repairFixedBroken': 'Repaired {count} broken link(s). Rescanning...',
  'orphan.repairFixedWiki': 'Converted {count} wiki link(s). Rescanning...',
  'orphan.repairFixedBoth': 'Repaired {broken} broken link(s), converted {wiki} wiki link(s). Rescanning...',
  'orphan.repairAllFixedBroken': 'Scanned {scanned} notes, repaired {count} broken link(s).',
  'orphan.repairAllFixedWiki': 'Scanned {scanned} notes, converted {count} wiki link(s).',
  'orphan.repairAllFixedBoth': 'Scanned {scanned} notes, repaired {broken} broken link(s), converted {wiki} wiki link(s).',
  'orphan.repairNone': 'No broken image links found in current note.',
  'orphan.repairAllNone': 'No broken image links found across all notes.',
  'orphan.repairNoActive': 'Please open a note first to repair links.',
  'orphan.repairCurrent': 'Repair Current',
  'orphan.repairAllBtn': 'Repair All Notes',
  'orphan.brokenLinks': 'Unresolvable image links',
  'orphan.brokenLinksDesc': 'The following links cannot be resolved to any file — the images may be lost or corrupted:',
  'orphan.brokenLinkLine': 'Line {line}',
  'orphan.removeLink': 'Remove link',
  'settings.interceptImage.name': 'Intercept image paste path',
  'settings.interceptImage.desc': 'When enabled, pasted/dropped images are saved to the note\'s sibling assets folder. When disabled, Obsidian\'s default behavior is used.',
  'settings.wikiConversion.name': 'Convert Wiki links when repairing',
  'settings.wikiConversion.desc': 'Detect ![[image.png]] format during scan and convert to standard Markdown links.',
  'settings.scanCodeBlocks.name': 'Scan links inside code blocks',
  'settings.scanCodeBlocks.desc': 'When enabled, repair and Wiki conversion include code blocks. Sharing and organizing always preserve code examples.',
  'settings.showRestructure.name': 'Show restructure tool',
  'settings.showRestructure.desc': 'When enabled, the restructure tool appears in the ribbon.',
  'settings.manualAttachmentFolder.name': 'Manual attachment folder',
  'settings.manualAttachmentFolder.desc': 'Specify a vault-relative attachment directory for historical Wiki images. Leave empty to resolve explicit paths or unique filenames.',
  'settings.icons': 'Icon Settings',
  'settings.icons.imageAudit': 'Image Audit button icon',
  'settings.icons.share': 'Share button icon',
  'settings.icons.restructure': 'Restructure button icon',
  'share.title': 'Quick Share',
  'share.folderFormat': 'Folder format',
  'share.zipFormat': 'ZIP archive',
  'share.exportPath': 'Export path',
  'share.exportPath.desc': 'Vault-relative directory; leave empty for the vault root. Each export creates a new folder or ZIP.',
  'share.creating': 'Exporting...',
  'share.success': 'Exported to {path}',
  'share.error': 'Export failed: {message}',
  'share.noActive': 'Please open a note first',
  'restructure.title': 'Restructure',
  'restructure.preview': 'Preview changes',
  'restructure.apply': 'Apply restructure',
  'restructure.cancel': 'Cancel',
  'restructure.confirm': 'Type confirm to proceed',
  'restructure.success': 'Restructure complete, files copied to {path}',
  'restructure.scanning': 'Scanning vault...',
  'share.openFolder': 'Open folder after export',
  'share.openFolder.desc': 'Automatically open the target folder after export',
  'restructure.noImages': 'No image references, assets folder will not be created',
  'restructure.selected': 'Selected {count} note(s)',
  'restructure.table.note': 'Note',
  'restructure.table.assets': 'Target Path',
  'restructure.table.images': 'Images',
  'restructure.modeOverwrite': 'Organize in place',
  'restructure.modeSandboxDesc': 'Create a restructured copy in {path}/. Original notes and images are retained.',
  'restructure.overwriteWarning': 'Organize selected notes in place: update image links and copy images into each note’s .assets folder. Original images are retained.',
  'wiki.title': 'Wiki Link Converter',
  'wiki.scanning': 'Scanning wiki links...',
  'wiki.empty': 'No wiki image links found.',
  'wiki.summary': 'wiki image link(s)',
  'wiki.convertDone': 'Converted {count} wiki link(s).',
  'wiki.modeCurrent': 'Current Note',
  'wiki.modeAll': 'All Notes',
  'settings.section.passive': 'Image Paste',
  'settings.section.orphan': 'Orphan Cleanup',
  'settings.section.wiki': 'Wiki Link Conversion',
  'settings.section.share': 'Quick Share',
  'settings.section.restructure': 'Attachment Restructure',
  'settings.showWikiConverter.name': 'Show Wiki converter tool',
  'settings.showWikiConverter.desc': 'When enabled, the Wiki link converter appears in the ribbon.',
  'settings.icons.wikiConverter': 'Wiki converter button icon',
  'wiki.broken': 'broken link(s)',
  'wiki.convertCurrent': 'Convert Current Note',
  'wiki.convertAll': 'Convert All Notes',
  'wiki.convertCurrentCount': 'Convert Current Note ({count})',
  'wiki.convertAllCount': 'Convert All Notes ({count})',
  'wiki.cleanBroken': 'Clean Broken Links',
  'wiki.cleanBrokenDone': 'Cleaned {count} broken link(s).',
  'wiki.toggleLabel': 'Convert Wiki',
};

let currentLocale: 'zh' | 'en' = 'en';

export function initLocale(lang: string): void {
  if (lang.startsWith('zh')) {
    currentLocale = 'zh';
  } else {
    currentLocale = 'en';
  }
}

export function t(key: LocaleKey, vars?: Record<string, string | number>): string {
  const dict = currentLocale === 'zh' ? zh : en;
  let text = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function isZh(): boolean {
  return currentLocale === 'zh';
}
