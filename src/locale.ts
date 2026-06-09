type LocaleKey =
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
  | 'settings.advanced'
  | 'settings.assetPath.name'
  | 'settings.assetPath.desc'
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
  | 'orphan.repair'
  | 'orphan.repairAll'
  | 'orphan.repairing'
  | 'orphan.repairFixedBroken'
  | 'orphan.repairFixedWiki'
  | 'orphan.repairFixedBoth'
  | 'orphan.repairAllFixedBroken'
  | 'orphan.repairAllFixedWiki'
  | 'orphan.repairAllFixedBoth'
  | 'orphan.repairNone'
  | 'orphan.repairAllNone'
  | 'orphan.repairNoActive'
  | 'orphan.wikiToggle'
  | 'orphan.brokenLinks'
  | 'orphan.brokenLinksDesc'
  | 'orphan.brokenLinkLine'
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
  | 'share.selectFolder'
  | 'restructure.noImages'
  | 'restructure.selected'
  | 'restructure.table.note'
  | 'restructure.table.assets'
  | 'restructure.table.images'
  | 'restructure.modeOverwrite'
  | 'restructure.modeSandboxDesc'
  | 'restructure.overwriteWarning'
  | 'restructure.orphanBlock';

const zh: Record<LocaleKey, string> = {
  'settings.namingStrategy.name': '图片命名策略',
  'settings.namingStrategy.desc': '粘贴或拖放图片时的文件名生成方式。',
  'settings.namingStrategy.original': '保留原始文件名',
  'settings.namingStrategy.timestamp': '使用时间戳 (YYYYMMDDHHmmss)',
  'settings.autoRename.name': '冲突时自动重命名',
  'settings.autoRename.desc':
    '当资源文件夹中已存在同名文件时，自动追加序号。（如 image.png -> image(1).png）',
  'settings.currentBehavior': '当前行为',
  'settings.currentBehavior.desc1':
    '当您在笔记中粘贴或拖放图片时，插件会将其保存到笔记同级的资源文件夹中，并插入标准 Markdown 图片链接。',
  'settings.currentBehavior.desc2': '资源文件夹模式：',
  'settings.currentBehavior.desc3': '输出语法：',
  'settings.advanced': '高级选项',
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
  'orphan.repair': '修复当前',
  'orphan.repairAll': '全局修复',
  'orphan.repairing': '正在修复失效链接...',
  'orphan.repairFixedBroken': '已修复 {count} 处失效链接，正在重新扫描...',
  'orphan.repairFixedWiki': '已转换 {count} 处 Wiki 链接，正在重新扫描...',
  'orphan.repairFixedBoth': '已修复 {broken} 处失效链接、转换 {wiki} 处 Wiki 链接，正在重新扫描...',
  'orphan.repairAllFixedBroken': '已扫描 {scanned} 篇笔记，修复 {count} 处失效链接。',
  'orphan.repairAllFixedWiki': '已扫描 {scanned} 篇笔记，转换 {count} 处 Wiki 链接。',
  'orphan.repairAllFixedBoth': '已扫描 {scanned} 篇笔记，修复 {broken} 处失效链接、转换 {wiki} 处 Wiki 链接。',
  'orphan.repairNone': '当前笔记中未发现失效图片链接。',
  'orphan.repairAllNone': '所有笔记中均未发现失效图片链接。',
  'orphan.repairNoActive': '请先打开一个笔记，再执行链接修复。',
  'orphan.wikiToggle': '修复Wiki',
  'orphan.brokenLinks': '无法解析的图片链接',
  'orphan.brokenLinksDesc': '以下链接无法解析到任何文件，可能已丢失或损坏：',
  'orphan.brokenLinkLine': '第 {line} 行',
  'settings.interceptImage.name': '拦截图片粘贴路径',
  'settings.interceptImage.desc': '开启后，粘贴或拖入的图片将保存到笔记同级的资源文件夹中。关闭时使用 Obsidian 默认行为。',
  'settings.wikiConversion.name': '修复时转换 Wiki 链接',
  'settings.wikiConversion.desc': '扫描时检测 ![[image.png]] 格式并转换为标准 Markdown 链接。',
  'settings.scanCodeBlocks.name': '扫描代码块内的链接',
  'settings.scanCodeBlocks.desc': '开启后，修复功能会扫描代码块中的链接。默认关闭以保护代码示例。',
  'settings.showRestructure.name': '显示重构工具',
  'settings.showRestructure.desc': '开启后，左侧栏将出现重构工具入口。',
  'settings.manualAttachmentFolder.name': '手动指定附件目录',
  'settings.manualAttachmentFolder.desc': '当 Obsidian 无法自动识别附件目录时，手动输入历史统一附件目录名称。留空则使用 Obsidian 设置。',
  'settings.icons': '图标设置',
  'settings.icons.imageAudit': '图片审计按钮图标',
  'settings.icons.share': '分享按钮图标',
  'settings.icons.restructure': '重构按钮图标',
  'share.title': '一键分享',
  'share.folderFormat': '文件夹格式',
  'share.zipFormat': 'ZIP 压缩包',
  'share.exportPath': '导出路径',
  'share.exportPath.desc': '相对于 Vault 根目录的导出路径',
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
  'share.selectFolder': '选择导出路径',
  'restructure.noImages': '无图片引用，不生成 assets 文件夹',
  'restructure.selected': '已选择 {count} 篇文档',
  'restructure.table.note': '文档',
  'restructure.table.assets': '目标路径',
  'restructure.table.images': '图片数',
  'restructure.modeOverwrite': '覆盖模式',
  'restructure.modeSandboxDesc': '生成重构副本到 _Restructured_Vault/ 目录，不影响原文件',
  'restructure.overwriteWarning': '警告：覆盖模式将直接修改原文件，此操作不可撤销！',
  'restructure.orphanBlock': '检测到无主图片，请先清理后再执行覆盖重构。',
};

const en: Record<LocaleKey, string> = {
  'settings.namingStrategy.name': 'Image naming strategy',
  'settings.namingStrategy.desc': 'How image filenames are generated when pasted or dropped.',
  'settings.namingStrategy.original': 'Keep original filename',
  'settings.namingStrategy.timestamp': 'Use timestamp (YYYYMMDDHHmmss)',
  'settings.autoRename.name': 'Auto-rename on conflict',
  'settings.autoRename.desc':
    'Append a sequence number when a file with the same name already exists in the assets folder. (e.g. image.png -> image(1).png)',
  'settings.currentBehavior': 'Current behavior',
  'settings.currentBehavior.desc1':
    'When you paste or drop an image into a note, the plugin saves it to the note\'s sibling assets folder and inserts a standard Markdown image link.',
  'settings.currentBehavior.desc2': 'Asset folder pattern:',
  'settings.currentBehavior.desc3': 'Output syntax:',
  'settings.advanced': 'Advanced',
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
  'orphan.repair': 'Current',
  'orphan.repairAll': 'All notes',
  'orphan.repairing': 'Repairing broken links...',
  'orphan.repairFixedBroken': 'Repaired {count} broken link(s). Rescanning...',
  'orphan.repairFixedWiki': 'Converted {count} wiki link(s). Rescanning...',
  'orphan.repairFixedBoth': 'Repaired {broken} broken link(s), converted {wiki} wiki link(s). Rescanning...',
  'orphan.repairAllFixedBroken': 'Scanned {scanned} notes, repaired {count} broken link(s).',
  'orphan.repairAllFixedWiki': 'Scanned {scanned} notes, converted {count} wiki link(s).',
  'orphan.repairAllFixedBoth': 'Scanned {scanned} notes, repaired {broken} broken link(s), converted {wiki} wiki link(s).',
  'orphan.repairNone': 'No broken image links found in current note.',
  'orphan.repairAllNone': 'No broken image links found across all notes.',
  'orphan.repairNoActive': 'Please open a note first to repair links.',
  'orphan.wikiToggle': 'Repair Wiki',
  'orphan.brokenLinks': 'Unresolvable image links',
  'orphan.brokenLinksDesc': 'The following links cannot be resolved to any file — the images may be lost or corrupted:',
  'orphan.brokenLinkLine': 'Line {line}',
  'settings.interceptImage.name': 'Intercept image paste path',
  'settings.interceptImage.desc': 'When enabled, pasted/dropped images are saved to the note\'s sibling assets folder. When disabled, Obsidian\'s default behavior is used.',
  'settings.wikiConversion.name': 'Convert Wiki links when repairing',
  'settings.wikiConversion.desc': 'Detect ![[image.png]] format during scan and convert to standard Markdown links.',
  'settings.scanCodeBlocks.name': 'Scan links inside code blocks',
  'settings.scanCodeBlocks.desc': 'When enabled, repair scans links inside code blocks. Disabled by default to protect code examples.',
  'settings.showRestructure.name': 'Show restructure tool',
  'settings.showRestructure.desc': 'When enabled, the restructure tool appears in the ribbon.',
  'settings.manualAttachmentFolder.name': 'Manual attachment folder',
  'settings.manualAttachmentFolder.desc': 'Manually specify the attachment folder name when Obsidian cannot auto-detect it. Leave empty to use Obsidian\'s setting.',
  'settings.icons': 'Icon Settings',
  'settings.icons.imageAudit': 'Image Audit button icon',
  'settings.icons.share': 'Share button icon',
  'settings.icons.restructure': 'Restructure button icon',
  'share.title': 'Quick Share',
  'share.folderFormat': 'Folder format',
  'share.zipFormat': 'ZIP archive',
  'share.exportPath': 'Export path',
  'share.exportPath.desc': 'Export path relative to vault root',
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
  'share.selectFolder': 'Select export path',
  'restructure.noImages': 'No image references, assets folder will not be created',
  'restructure.selected': 'Selected {count} note(s)',
  'restructure.table.note': 'Note',
  'restructure.table.assets': 'Target Path',
  'restructure.table.images': 'Images',
  'restructure.modeOverwrite': 'Overwrite',
  'restructure.modeSandboxDesc': 'Generate restructured copy in _Restructured_Vault/ without touching originals',
  'restructure.overwriteWarning': 'Warning: Overwrite mode will modify original files. This cannot be undone!',
  'restructure.orphanBlock': 'Orphan images detected. Please clean up orphan images before overwrite restructure.',
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
