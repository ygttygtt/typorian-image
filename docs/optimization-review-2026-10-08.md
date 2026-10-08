# Typorian Image 优化检查（2026-10-08）

本轮交付文件列表隐藏开关，其余功能只读审查。以下问题来自源码分析，尚未通过实际粘贴、拖入或导出复现，不应当作完整运行验收结果。没有发现需要为普通编辑新增后台扫描或做整体重构的理由。

## 建议优先处理

| 问题 | 源码依据 | 影响与建议 |
| --- | --- | --- |
| 图片命名策略没有接入 | `src/image-handler.ts` 的 `handleImage()` 总调用 `getBaseName()`，没有读取 `namingStrategy` | 选择“时间戳”仍保留原名。按现有选项接入命名流程即可。 |
| 冲突重命名开关没有接入 | `handleImage()` 总调用 `PathUtils.getUniqueFileName()`，没有读取 `autoRenameOnConflict` | 关闭开关仍追加序号。需要先明确关闭时应当取消插入还是采用其他行为，不应默认为覆盖旧图片。 |
| 多图拖入可能倒序 | `src/cm6-paste-plugin.ts` 的 `onDrop()` 把相同 `dropPos` 传给每张图片 | 后插入的链接位于前一张之前。可递增插入位置，或保存批次后一次插入。 |
| 粘贴图片没有替换选区 | `handleImage()` 只取 `selection.main.head`，只提供 `from/insert` | 选中旧链接再粘贴时旧内容保留。粘贴应取替换范围，拖入保留插入语义。 |

## 适合单独统一处理

`src/path-utils.ts` 的 `buildRelativePath()` 仅编码空格。图片或笔记名称中的 `#`、`?`、`%` 等可能产生不同的 URL 含义；图片说明中的方括号也可能改变 Markdown 解析。分享、重构和修复模块中有多处只处理 `%20`，因此不宜仅修改图片写入端。建议统一链接生成、路径编码与解析，再验证分享、转换、清理和 Typora 互编辑。

`ImageHandler.getActiveNote()` 读取全局活动叶节点，而写入使用事件传入的 EditorView。异步保存期间切换笔记、多面板或多窗口操作是否会导致归属错误，还需要运行复现；建议把所属笔记绑定到产生事件的编辑器。

## 构建工具维护

现有 lockfile 的 `npm audit` 返回 4 项开发依赖告警（3 moderate、1 high），涉及 `brace-expansion`、`esbuild`、`moment` 与 Obsidian SDK 依赖链。`npm audit --omit=dev` 返回 0 项运行依赖告警。没有自动执行 `audit fix`；其中建议会降级 Obsidian SDK，不能直接采用。

`standard-version` 的依赖链含废弃包，而 GitHub 发布已经通过 tag 工作流构建。建议另行核对版本脚本的实际用途，决定升级或删除闲置工具。Obsidian SDK 当前声明为 `latest`，lockfile 固定实际安装版本；可在工具链维护时改为明确支持的版本。

## 本轮验证边界

- TypeScript 类型检查、生产构建、源码复核通过。
- 本机 Obsidian 1.14.4 直接运行：新开关显示正常；启用后目标 `.assets` 文件夹在文件列表中隐藏；现有笔记图片正常渲染；设置已保存为 true；磁盘目录与图片仍存在。
- 界面自动化工具出现 macOS ScreenCaptureKit 错误 `-3811`，重连仍失败；关闭开关恢复、禁用插件恢复、重新加载持久化、弹出窗口以及新建/重命名目录尚未完成运行验收。对应实现已经源码复核，但不能代替运行验证。
- 本轮没有改动图片保存、分享、转换或清理行为，也没有修改用户笔记或图片。
