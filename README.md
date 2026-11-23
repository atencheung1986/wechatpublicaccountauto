# wechatpublicaccountauto

公众号文章自动化流水线：从选题到发布草稿箱的一整套 WorkBuddy Skill。

**版本 v2.0.0** · 7 个 Skill · 导出日期 2026-11-23

## 这是什么

一条「选题 → 写作 → 配图 → 排版 → 去 AI 味 → 发布到公众号草稿箱」的完整流水线。

- 先判体裁（A 行业观点 / B 个人叙事），再按分支走不同流程：A 类做调研与事实分级、配信息图；B 类跳过调研、不虚构事件细节、真实照片优先。
- 封面用 HTML/CSS + headless Chrome 截图生成，中文准确、无水印、可改字，双尺寸（feed 900×383、square 400×400）。
- 发布走浏览器模式，只提交到**草稿箱**，不群发。

## 目录结构

```
skill/
└── wechatpublicaccountauto/
    ├── README.md                    ← 本包安装说明
    ├── wechat-writing-pipeline/     ← 编排层（流水线主入口，v2.0.0）
    ├── wechat-toolkit/              ← 公众号工具包（搜索 / 下载 / 发布）
    ├── wechat-article-writer/       ← 正文写作
    ├── humanizer-zh/                ← 中文去 AI 味
    ├── baoyu-post-to-wechat/        ← 浏览器模式发布
    ├── baoyu-markdown-to-html/      ← Markdown 排版为全内联 HTML
    └── baoyu-cover-image/           ← 封面图生成
```

## 安装

把 `skill/wechatpublicaccountauto/` 下的 **7 个目录**复制到 WorkBuddy 用户级 Skill 目录。

Windows（PowerShell）：

```powershell
Copy-Item -Recurse .\skill\wechatpublicaccountauto\* "$env:USERPROFILE\.workbuddy\skills\"
```

macOS / Linux：

```bash
cp -R ./skill/wechatpublicaccountauto/* ~/.workbuddy/skills/
```

已有 `wechat-writing-pipeline/` 时直接覆盖即可；其余 6 个依赖 Skill 若已存在可跳过。仓库 `dist/` 目录里另有两个 zip 包可离线分发：

- `wechat-writing-pipeline-v2.0.0.zip`：仅编排层（17 文件 / 约 50 KB）
- `wechat-pipeline-bundle-v2.0.0.zip`：整套 7 个 Skill（119 文件 / 约 315 KB）

## 使用

在 WorkBuddy 中说「用流水线帮我写一篇公众号文章，主题是……」，编排层 `wechat-writing-pipeline` 会自动加载并按阶段执行。

## 发布前必读

- 发布采用**浏览器模式**，需要本机 Chrome 与公众号后台登录态；
- 只提交到草稿箱，不会群发；
- 草稿箱封面需在公众号后台手动「上传本地封面」（发布脚本不上传封面）；
- 固定署名在 `~/.baoyu-skills/baoyu-post-to-wechat/EXTEND.md` 的 `default_author` 配置。

更完整的踩坑记录见 `wechat-writing-pipeline/references/pitfalls.md`。
