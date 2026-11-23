# wechat-writing-pipeline

公众号内容流水线编排 skill：**先判体裁 → 选题 → 写作 → 配图 → 封面 → 排版 → 去 AI 味 → 发布草稿箱**。

它自己不做重活，只负责串起六个专职 skill、把每阶段的产物契约和门禁固定下来，以及记录实测踩过的坑。默认终点是**草稿箱**，绝不自动群发。

封面（阶段 3.5）不走生图服务，改用 **HTML/CSS 手绘 + headless Chrome 截图**——中文准确、改字即改、零积分、无水印，套模板保证系列一致性。

**v2.0.0 起支持双体裁**：A 类行业/观点（调研 + 数据分级 + 信息图 + 设计版封面）与 B 类个人叙事（跳过调研 + 不虚构细节铁律 + 真照片 + 照片封面）走法不同，判型见 `references/genre-routing.md`。

## 安装

### 1. 装编排 skill

把整个 `wechat-writing-pipeline/` 目录放到你的 skills 目录：

```bash
# WorkBuddy / CodeBuddy
cp -r wechat-writing-pipeline ~/.workbuddy/skills/
```

### 2. 装六个依赖 skill

编排依赖以下 skill，缺一个对应阶段就要走降级路径：

| Skill | 阶段 | 来源 |
|---|---|---|
| wechat-toolkit | 选题（搜索/下载） | `github.com/Mr-Q526/openclaw-skill-wechat-toolkit` |
| wechat-article-writer | 写作 + 配图提示词 | `staruhub/ClaudeSkills` → `skills/Geek-skills-wechat-article-writer` |
| baoyu-cover-image | 封面（**已改 HTML 渲染，仅作降级保留**） | `github.com/JimLiu/baoyu-skills` → `skills/baoyu-cover-image` |
| baoyu-markdown-to-html | 排版 | 同上 → `skills/baoyu-markdown-to-html` |
| humanizer-zh | 去 AI 味 | `github.com/843645440/wechat-skill` → `.agents/skills/humanizer-zh` |
| baoyu-post-to-wechat | 发布 | 同 baoyu → `skills/baoyu-post-to-wechat` |

如果你拿到的是 **bundle 包**（`wechat-pipeline-bundle.zip`），六个都在里面，一起解压到 skills 目录即可，跳过 clone。

```bash
git clone --depth 1 https://github.com/Mr-Q526/openclaw-skill-wechat-toolkit.git ~/.workbuddy/skills/wechat-toolkit
git clone --depth 1 https://github.com/JimLiu/baoyu-skills.git /tmp/baoyu
cp -r /tmp/baoyu/skills/{baoyu-post-to-wechat,baoyu-markdown-to-html,baoyu-cover-image} ~/.workbuddy/skills/
git clone --depth 1 https://github.com/843645440/wechat-skill.git /tmp/wx
cp -r /tmp/wx/.agents/skills/humanizer-zh ~/.workbuddy/skills/
git clone --depth 1 --filter=blob:none --sparse https://github.com/staruhub/ClaudeSkills.git /tmp/star
cd /tmp/star && git sparse-checkout set skills/Geek-skills-wechat-article-writer
cp -r skills/Geek-skills-wechat-article-writer ~/.workbuddy/skills/wechat-article-writer
```

### 3. 装运行时依赖

| 依赖 | 用途 | 装法 |
|---|---|---|
| Node ≥ 18 | 搜索模块 | 自带 |
| bun ≥ 1.4 | 排版 / 发布脚本 | `npm install -g bun` |
| cheerio | 搜索模块解析 | `cd ~/.workbuddy/skills/wechat-toolkit/scripts/search && npm install` |
| Python ≥ 3.9 | 校验脚本、发布准备脚本 | 自带 |
| Chrome / Edge | 浏览器模式发布 | 系统安装 |

然后在各 skill 的 scripts 目录里装依赖：

```bash
cd ~/.workbuddy/skills/wechat-toolkit/scripts/downloader && npm install
cd ~/.workbuddy/skills/baoyu-markdown-to-html/scripts && bun install
cd ~/.workbuddy/skills/baoyu-post-to-wechat/scripts && bun install
```

### 4. 环境预检

```bash
bash ~/.workbuddy/skills/wechat-writing-pipeline/scripts/preflight.sh
```

## 首次配置（发布环节）

两种模式二选一：

**浏览器模式（推荐，无需凭证）**
用专用 Chrome profile 打开 mp.weixin.qq.com 扫码登录一次，登录态会持久化：

```
profile: C:\Users\<你>\AppData\Roaming\baoyu-skills\chrome-profile
```

配置写在 `~/.baoyu-skills/baoyu-post-to-wechat/EXTEND.md`：

```yaml
default_theme: default
default_color: blue
default_publish_method: browser
default_author:
need_open_comment: 1
only_fans_can_comment: 0
```

**API 模式（需凭证 + IP 白名单）**
`~/.baoyu-skills/.env`：

```
WECHAT_APP_ID=wx...
WECHAT_APP_SECRET=...
```

⚠️ API 模式要求：公众号**已认证**（个人未认证订阅号没有草稿接口权限），且出口 IP 在后台白名单内。走代理时出口 IP 会变，容易随机报 40164，浏览器模式不受此限制。

## 用法

对 agent 说一句「用流水线写一篇公众号文章，主题 XX」即可。它会：

1. 阶段 0 跑预检
2. **判体裁**（A 行业/观点 / B 个人叙事）——B 类跳过调研、字数无下限、真照片优先
3. 建目录 `articles/<slug>/`
4. 每阶段产出文件并**停下来等你确认**

产物：

```
articles/<slug>/
├── 01-brief.md          选题简报（含数据分级）
├── 01-topic/            搜索与下载原始素材
├── 02-draft.md          初稿
├── 03-humanized.md      去 AI 味终稿
├── publish.md           发布副本（剥离注释、摘要字段归位）
├── image-manifest.json  配图清单（A 类；B 类无）
├── images/              插图 + 封面（设计版 cover-feed/square.png；B 类另有真照片与 cover-photo-*.png）
├── diagrams/            封面 / 信息图 HTML 源（改字可重渲）
└── layout.html          微信兼容 HTML（终版）
```

## 单独调用某个脚本

```bash
# 环境预检
bash scripts/preflight.sh

# 发布前处理（剥离锚点注释 + 摘要字段归位 + 打印发布命令）
python3 scripts/publish_prepare.py 03-humanized.md -o publish.md

# 封面渲染（文件名含 feed → 900x383；含 square → 400x400，固定 2x）
bash scripts/render_cover.sh <ART>/diagrams/cover-feed.html
bash scripts/render_cover.sh <ART>/diagrams/cover-square.html
# 照片封面同样走这个脚本，改 templates/cover-photo-*.html 的照片路径与文案即可
bash scripts/render_cover.sh <ART>/diagrams/cover-photo-feed.html

# 给已有草稿补作者（先 --dry-run 看一眼，再去掉）
bun scripts/patch_draft_author.ts --appmsgids 100000009,100000013 --dry-run
```

## 设计约束

- **只到草稿箱**。群发必须由人在公众号后台点。
- 每阶段有门禁，不自动往下跑。
- 数据必须可溯源；搜不到原始出处的（C 级）一律不用。
- 不虚构人物、故事、引语、案例。

## 已知限制

- 搜索走搜狗微信，结果质量一般，且不宜高频请求
- 浏览器模式发布依赖 SendKeys，运行期间不能操作键鼠
- 生图服务会在图角加水印，需自行裁切；发布时记得开公众号的「AI 生成声明」（**只影响正文插图，封面无此问题**）
- 配图提示词由 `wechat-article-writer` 产出，实际出图依赖宿主环境的生图能力
- 草稿箱的**封面和作者栏需要人工收尾**：脚本不上传封面，frontmatter `author` 为空时也不传 `--author`
- 排版验收用 500/600px 复核（`--window-size=375` 是 headless Chrome 最小窗宽造成的伪象），真机 375px 需 CDP 移动仿真，当前未做
- 敏感照片（死亡/伤病/隐私）**不自动入文**：先给四条判断，由用户三选一

## 版本

v2.0.0 — **双体裁路由**（A 行业/观点 · B 个人叙事）。新增 `references/genre-routing.md`（B 类不虚构细节铁律、门禁差异、字数例外）、`references/photo-handling.md`（真照片接入 / 敏感照片四条判断与弱化裁剪 / 照片封面）、照片封面双模板。修正 375px 验收伪象、补齐「排版脚本读 manifest 导致每图两份」与占位符重复引用两坑；`pitfalls.md` 扩到七节。
v1.3.1 — 新增 `scripts/patch_draft_author.ts`：给已存在的草稿补作者（发布脚本只管新草稿），支持 --dry-run / --overwrite，保存后回读校验。
v1.3.0 — 新增阶段 3.5 封面（HTML 渲染，替代生图）：`references/cover-style.md` 设计规范 + `templates/cover-feed|square.html` 模板 + `scripts/render_cover.sh` 双尺寸 2x 渲染；固化「封面不复用正文首图」「作者栏留空需人工补」两条收尾提醒。
v1.2.0 — 固化手机 375px 适配（代码块/宽表 → 卡片）与排版验收动作。
v1.1.0 — 补全 references（踩坑 / 事实核查 / 去味尺度）、选题模板、发布准备脚本。
v1.0.0 — 六阶段编排骨架 + 环境预检。
