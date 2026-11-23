# 公众号自动化流水线 Skill 包（v2.0.0）

本目录包含 **7 个 WorkBuddy 用户级 Skill**，需整体安装到 `~/.workbuddy/skills/` 才能运行。

## 安装

```bash
# macOS / Linux
cp -R ./* ~/.workbuddy/skills/

# Windows PowerShell
Copy-Item -Recurse .\* "$env:USERPROFILE\.workbuddy\skills\"
```

如果只升级编排层，仅覆盖 `wechat-writing-pipeline/` 即可。

## 清单

| Skill | 职责 | 文件数 |
| --- | --- | ---: |
| `wechat-writing-pipeline` | 编排层：体裁路由 + 六阶段流水线主入口 | 17 |
| `wechat-toolkit` | 公众号文章搜索、下载、改写、发布工具包 | 14 |
| `wechat-article-writer` | 正文写作（article / image / format 四模式） | 13 |
| `humanizer-zh` | 中文文本去 AI 生成痕迹 | 6 |
| `baoyu-post-to-wechat` | 浏览器模式发布到草稿箱 | 29 |
| `baoyu-markdown-to-html` | Markdown → 全内联样式 HTML 排版 | 5 |
| `baoyu-cover-image` | 封面图生成（HTML/CSS 截图方案） | 35 |

合计 119 个文件。

## 入口

从 `wechat-writing-pipeline/SKILL.md` 读起；`references/` 下有体裁路由、照片处理、封面风格、踩坑记录等补充文档；`scripts/` 下有封面渲染、发布前处理、草稿补署名三个脚本；`templates/` 下是封面 HTML 模板。

## 运行环境

- 本机 Chrome（浏览器模式发布、封面截图都依赖它）
- `bun`（发布脚本）、Python 3（辅助脚本）、Node.js 18+（baoyu 系列 Skill）
- 公众号后台登录态（首次发布需在自动化 Chrome 窗口里登录一次）
