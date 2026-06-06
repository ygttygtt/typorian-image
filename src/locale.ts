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
  | 'orphan.repairFixed'
  | 'orphan.repairAllFixed'
  | 'orphan.repairNone'
  | 'orphan.repairNoActive';

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
  'orphan.repairFixed': '已修复 {count} 处失效链接，正在重新扫描...',
  'orphan.repairAllFixed': '已扫描 {scanned} 篇笔记，修复 {fixed} 处失效链接。',
  'orphan.repairNone': '当前笔记中未发现失效图片链接。',
  'orphan.repairNoActive': '请先打开一个笔记，再执行链接修复。',
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
  'orphan.repairFixed': 'Repaired {count} broken link(s). Rescanning...',
  'orphan.repairAllFixed': 'Scanned {scanned} notes, repaired {fixed} broken link(s).',
  'orphan.repairNone': 'No broken image links found in current note.',
  'orphan.repairNoActive': 'Please open a note first to repair links.',
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
