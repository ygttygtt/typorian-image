# Typorian Image

一个 Obsidian 插件，强制使用标准 Markdown 图片语法，并采用 Typora 兼容的资源文件夹路径。

## 问题背景

Obsidian 默认使用 wiki-link 语法插入图片（`![[image.png]]`），而 Typora 使用标准 Markdown 语法（`![image](./note.assets/image.png)`）。这种不兼容性导致在两个编辑器之间切换时图片链接频繁断裂。

## 解决方案

Typorian Image 拦截编辑器中的图片粘贴和拖放事件：

1. 将图片文件保存到当前笔记同级的 `.assets` 文件夹（如 `MyNote.assets/`）
2. 插入标准 Markdown 图片链接：`![image](MyNote.assets/image.png)`

笔记的双链、块引用、标题引用等 wiki-link 功能完全不受影响，仅针对图片插入行为进行重写。

## 功能特性

- 拦截剪贴板粘贴（`Ctrl+V`）和文件拖放
- 图片保存到 `${notename}.assets/` 文件夹（与笔记同目录）
- 输出标准 Markdown 图片语法：`![name](path)`
- 支持 PNG、JPEG、GIF、WebP、SVG、BMP、TIFF 格式
- 文件名冲突时自动重命名（image.png -> image(1).png）
- 常规打字零性能开销
- Live Preview 模式下图片正常内嵌渲染
- 孤儿图片检测与安全清理
- 断链图片智能检测与修复
- 中英双语界面（自动检测系统语言）
- 可自定义资源文件夹路径（高级选项）

## 安装方式

### 从社区插件市场（审核中）

1. 打开 Obsidian 设置 > 社区插件
2. 搜索 "Typorian Image"
3. 安装并启用

### 手动安装

1. 从 GitHub Release 下载 `main.js`、`manifest.json`、`styles.css`
2. 在 Obsidian 仓库的 `.obsidian/plugins/` 目录下创建 `typorian-image` 文件夹
3. 将下载的文件放入该文件夹
4. 在 Obsidian 设置 > 社区插件中启用

### 使用 BRAT

1. 安装 BRAT 插件
2. 打开 BRAT 设置 > Add Beta Plugin
3. 输入 `ygttygtt/typorian-image`
4. 启用插件

## Typora 配置对齐指南

要在 Obsidian（配合本插件）和 Typora 之间实现无缝互编辑，请按以下步骤配置 Typora：

1. 打开 Typora，进入**偏好设置 > 图像**。
2. 在"插入图片时"选项中，选择**"复制图片到自定义文件夹"**。
3. 输入路径模式：`./${filename}.assets/`
4. 确保勾选**"对当前文件应用上述规则"**。

完成上述配置后，两个应用程序将使用完全相同的 `.assets` 文件夹和相对路径存储图片，可以在任一编辑器中自由切换编辑。

## 设置项

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 图片命名策略 | 保留原始文件名 | 选择保留原始文件名或使用时间戳 |
| 冲突时自动重命名 | 启用 | 当同名文件已存在时自动追加序号 |
| 资源文件夹路径（高级） | `./${notename}.assets/` | 可自定义的图片保存路径模板 |

## 孤儿图片清理

随着时间推移，`.assets` 文件夹中可能积累不再被任何笔记引用的图片。本插件内置了健康检查工具，可安全检测并清理这些孤儿图片。

### 使用方法

1. 点击左侧边栏（Ribbon）中的垃圾桶图标，或
2. 打开命令面板，运行"Orphan Image Cleanup"

弹出的模态框会扫描所有 `.assets` 文件夹，展示未引用图片的清单，包含：

- 图片缩略图预览
- 文件路径
- 文件大小

### 安全机制

- 默认不勾选任何图片，必须手动选择
- 提供"全选"功能，但默认处于未勾选状态
- 点击"安全清理"仅将选中图片移入 Obsidian 内部回收站（`.trash` 文件夹），不会永久删除
- 可在 Obsidian 文件资源管理器中从回收站恢复误删的图片

### 检测原理

检测器使用 Obsidian 的 `metadataCache.resolvedLinks` 索引，该索引包含全库所有已解析的 wiki-link 和 markdown-link。这是纯内存查表操作，无磁盘读取，无正则解析。仅扫描 `.assets` 文件夹内的图片文件。

## 断链图片修复

如果笔记中存在失效的图片链接（例如在不同编辑器间移动文件或更换操作系统导致），插件可以自动检测并修复。

### 使用方法

打开命令面板，运行 **"检测并修复当前笔记的失效图片链接"**。

### 修复范围

- **反斜杠路径**：图片路径中的 `\` 会自动标准化为 `/`
- **绝对路径**：Windows 盘符和系统根目录前缀会被剔除，转换为相对路径
- **缺失引用**：如果图片文件存在于仓库中的某个位置但链接已失效，插件会进行全仓库文件名搜索，自动计算正确的相对路径并替换

## 技术实现

插件使用 CodeMirror 6 ViewPlugin，在编辑器 DOM 元素的 capture 阶段注册 paste 和 drop 事件监听器。检测到图片文件时：

1. 在 Obsidian 默认处理器之前拦截事件
2. 读取图片二进制并通过 `app.vault.createBinary()` 保存到仓库
3. 通过单次 CM6 `dispatch()` 调用原子性地插入 Markdown 图片链接（`changes` 和 `selection` 在同一事务中）

这种方式确保：
- 插入后光标位置稳定
- Live Preview 模式无可见闪烁
- 撤销/重做正常工作
- 常规打字和退格键不受影响

## 从源码构建

```bash
git clone https://github.com/ygttygtt/typorian-image.git
cd typorian-image
npm install
npm run build
```

编译后的 `main.js` 将生成在项目根目录。

## 许可证

MIT
