---
name: wechat-writing-pipeline
version: 2.0.0
description: 公众号内容流水线编排 — 先判体裁（行业观点 / 个人叙事双轨）→ 选题 → 写作 → 配图 → 封面 → 排版 → 去 AI 味 → 发布草稿箱。串联 wechat-toolkit（搜索/下载）、wechat-article-writer（写作/配图提示词）、HTML 渲染封面与信息图（阶段 3 / 3.5）、真照片接入（B 类）、baoyu-markdown-to-html（排版）、humanizer-zh（去 AI 味）、baoyu-post-to-wechat（发布）。当用户要求"写一篇公众号文章""跑公众号流水线""从选题到发布""做个封面"时使用。默认终点是草稿箱，绝不自动群发。
---

# 公众号内容流水线

一条链六阶段（阶段 3 之后插入专属的**阶段 3.5 封面**），每阶段一个专职 skill。本 skill 只做**编排与门禁**，不替代任何阶段 skill 的能力。

**v2.0.0 起，阶段 0 之后先判体裁**：行业/观点（A 类）与个人叙事（B 类）走法不同，见下文「体裁路由」。本文件默认描述 A 类，B 类的差异在各阶段以「⚠️ B 类」标出。

## 铁律

1. **默认只到草稿箱**，绝不群发、绝不正式发布，除非用户逐字明确要求且二次确认。
2. **每阶段结束必须停下来给用户看产物**，得到确认才进下一阶段。用户说"一条龙跑完"时，只在阶段 6（发布）前强制停下。
3. **不确定就问**，不猜选题、不猜账号、不猜主题风格。
4. **不虚构事实**：A 类是数据层面（数字、引语、案例必须有来源，无来源就删掉，不补）；B 类还要加一层事件层面（连一个动作、一个数量、一处环境都不能补）。详见 `references/genre-routing.md`。

## 变量约定

```
{SKILLS} = ~/.workbuddy/skills
{ART}    = 本次文章目录，默认 {cwd}/articles/<slug>/
```

首次跑某篇文章前先建目录：`mkdir -p {ART}/{01-topic,images,diagrams}`（`diagrams/` 放封面 HTML 源，改字可重渲）。

## 阶段 0：环境预检

```bash
bash {SKILLS}/wechat-writing-pipeline/scripts/preflight.sh
```

缺什么装什么：

| 缺 | 装法 |
|---|---|
| bun | `npm install -g bun` |
| cheerio（搜索模块） | `npm install -g cheerio` |
| 下载器依赖 | `cd {SKILLS}/wechat-toolkit/scripts/downloader && npm install` |
| Chrome | 安装 Chrome，或设 `WECHAT_BROWSER_CHROME_PATH` |
| 微信凭证 | 由 `baoyu-post-to-wechat` 首次引导写入 `~/.baoyu-skills/baoyu-post-to-wechat/EXTEND.md` |

## 体裁路由（阶段 0 之后第一件事）

**先判 A / B 类，再往下走。**判错会在每个阶段返工。完整对照表见 **`references/genre-routing.md`**（B 类铁律、门禁差异、快速判型都在里面）。

| 信号 | 判为 |
|---|---|
| 「分析 XX」「怎么看 XX」「招股书 / 趋势 / 方法论 / 财报」 | **A 类**（行业/观点，本文件默认走法） |
| 「我经历了 XX」「昨天 / 我家 / 亲眼」「纪念」「随笔」「真实故事」 | **B 类**（个人叙事） |
| 同时有「我」和数据/报告，或拿不准 | 问一句，别默认 |

B 类与 A 类的关键差异：

| 维度 | A 类 | ⚠️ B 类 |
|---|---|---|
| 阶段 1 调研 | 必须（搜竞品 + 数据分级） | **跳过**，事实全部来自用户叙述 |
| 字数 | 2500–5000 | **无下限**，1200–2000 即可 |
| 阶段 3 配图 | 信息图 / 流程图 | **真照片优先**，禁用信息图 |
| 阶段 3.5 封面 | 设计版（巨字视觉锤） | **照片封面优先** |
| 结尾 | 落在动作 / 未决边界 | 不升华、不总结意义，落在一个画面 |
| 阶段 5 重点 | 拆套话、保数字 | **复查虚构细节** |

⚠️ **B 类铁律：不虚构细节**。不许补数字、动作、环境、视觉细节；只写用户真说过的事实 + 克制的心里话。写完逐段对照原始叙述做一次自查。门禁时主动声明哪几句是 AI 加的，让用户定夺。

## 阶段 1：选题（wechat-toolkit）

**⚠️ B 类跳过本阶段的搜索与数据分级**：只写一份轻量 `01-brief.md`，定调子、结构骨架、写作纪律、事实清单（全部标注「来自用户叙述」），门禁给用户看这份即可。

搜竞品/素材：

```bash
node {SKILLS}/wechat-toolkit/scripts/search/search_wechat.js "<关键词>" -n 10 -c -o {ART}/01-topic/raw.json
```

选定后下载原文（可选，用于深度洗稿）：

```bash
node {SKILLS}/wechat-toolkit/scripts/downloader/download.js "<文章URL>" --output {ART}/01-topic/source
```

**产出**：`{ART}/01-brief.md` — 选题、切入角度、目标读者、字数区间、参考文章链接、事实清单（带出处）。
模板：`templates/brief-template.md`。**数据必须分级**，规范见 `references/fact-check.md`（C 级数据一律不用）。
**门禁**：把 brief 给用户确认，标题方向一并给 3-5 个备选。

## 阶段 2：写作（wechat-article-writer）

调用 `wechat-article-writer`，模式 `article`，输入 `01-brief.md`。

**产出**：`{ART}/02-draft.md`（UTF-8）。
**门禁**：给全文 + 5 个备选标题，等确认。

**⚠️ B 类门禁补充**：主动声明哪几句是 AI 加的（心里话、节奏性概括、比喻），让用户决定保留还是删。别混在正文里蒙过去——这是「不虚构细节」铁律的配套动作。

## 阶段 3：配图

**⚠️ B 类走真照片路线，跳过本阶段整套 manifest / 提示词流程**：用户提供照片时按 `references/photo-handling.md` 接入（复制、ASCII 重命名、看清内容后按叙事顺序插 markdown 图片、不留 `image-manifest.json`）；敏感照片先给四条判断再让用户三选一。无照片时才用极简插画，**禁用信息图**。

**A 类**：先出提示词清单（该模式只产提示词，**不生图**）：

- 模式 `image-prompts`，输入 `02-draft.md`
- 产出：`image-manifest.json`（符合 `schemas/image-manifest.schema.json`）+ 文章内 anchor/placeholder 对
- 校验（非 0 退出即硬失败）：

```bash
python3 {SKILLS}/wechat-article-writer/scripts/validate_image_manifest.py {ART}/image-manifest.json --article {ART}/02-draft.md
```

再生成实际图片：

- **正文插图**：用内置生图能力（ImageGen）按 `positive_prompt` 生成，落到 `{ART}/images/`
- 生成后回填 manifest：`status = generated`，`asset_ref` 指向真实文件
- 生成失败：保持 `prompt-only`，正文留占位块，**不许谎称图片已生成**

**门禁**：展示图片与插入位置，等确认。

## 阶段 3.5：封面（HTML 渲染，不走生图）

**⚠️ B 类优先用照片封面**：复制 `templates/cover-photo-feed.html` / `cover-photo-square.html`，改照片路径、构图位置与文案，同样用 `render_cover.sh` 渲染。规范与坑见 `references/photo-handling.md`。**保留原设计版封面文件**，用户随时可换回。A 类按下面默认的设计版走。

⚠️ **封面必须单独做，且不能用生图服务**——中文会乱码、改一个字要整图重生成、带「AI 生成」水印、还费积分。改成 HTML/CSS 手绘 + headless Chrome 截图：中文 100% 准、改字即所见即所得、零成本、套模板保证系列一致。

```bash
# 1. 复制模板到文章目录
mkdir -p {ART}/diagrams
cp {SKILLS}/wechat-writing-pipeline/templates/cover-feed.html  {ART}/diagrams/cover-feed.html
cp {SKILLS}/wechat-writing-pipeline/templates/cover-square.html {ART}/diagrams/cover-square.html

# 2. 改六处文案：kicker / 主标题 / 副标 / 三个标签 / 巨大单字 / 英文小注

# 3. 渲染（尺寸由文件名决定，成品落到 {ART}/images/）
bash {SKILLS}/wechat-writing-pipeline/scripts/render_cover.sh {ART}/diagrams/cover-feed.html
bash {SKILLS}/wechat-writing-pipeline/scripts/render_cover.sh {ART}/diagrams/cover-square.html
```

两个尺寸都要出：feed 900×383（2.35:1 封面大图）、square 400×400（方图），2x 出图 → 1800×766 / 800×800。

**文案六要素与配色、排版坑全部见 `references/cover-style.md`**，做封面前必读。三条最容易犯的：

1. **主标题不是文章标题**——文章标题太长会挤成一团，缩成 4–6 字（如《35 岁，你的简历死在算法手里》→「简历没人看」）
2. **封面不复用正文首图**——正文首图是信息图（讲道理），封面是海报（抓眼球），两张图各做各的
3. 标签写具体场景或数字（「会议 → 台账」「邀约 4.2%」），不写抽象词

**产出**：`{ART}/images/cover-feed.png`、`{ART}/images/cover-square.png`，HTML 源留在 `diagrams/`（以后改字重渲）。
**门禁**：两个尺寸的成品图都给用户看，确认后才进阶段 4。

⚠️ 发布脚本**不上传封面**（frontmatter 的 `coverImage` 在浏览器模式下不生效），交付时提醒用户在草稿箱手动「上传本地封面」。

## 阶段 4：排版（baoyu-markdown-to-html）

```bash
bun {SKILLS}/baoyu-markdown-to-html/scripts/main.ts {ART}/02-draft.md --theme default
```

无 bun 时：`npx -y bun` 替代。主题：default / grace / simple / modern；配色 `--color`（blue/red/olive…）；外链转底部引用加 `--cite`。

⚠️ 该脚本**没有 `--output` 参数**，产物固定落在输入文件同目录、同名 `.html`（`02-draft.md` → `02-draft.html`），已存在时自动备份为 `.bak-时间戳`。要统一命名就自己 `mv`：

```bash
mv {ART}/02-draft.html {ART}/layout.html
```

**产出**：`{ART}/layout.html`（全内联样式，微信编辑器不丢格式）。

⚠️ **排版前必做：手机宽度适配**。微信正文宽度只有 375px，`overflow-x` 不能滚动，超宽内容直接被裁掉、读者无法看到。两类内容必须在排版前改造（详见 `references/pitfalls.md`「手机宽度适配」）：

- 代码块 / 长 prompt（一行超 ~24 中文字）→ 逐行 `<div>` 的浅灰底卡片
- ≥4 列的表格 → 卡片列表（标题 + 字段行 + 左边条状态色）；两列表可保留

⚠️ **验收动作（v2.0.0 修正）**：Chrome `--window-size=500,H` 截整页 → PIL 测最右墨迹 x（≤ 468 即无溢出）→ 切段 ViewImage 查折行/残留标记。**别再用 `--window-size=375` 当验收依据**——headless Chrome 桌面端有约 500px 的最小窗宽，375 时实际版面仍是 ~500px、截图只截了左边 375，看到的「文字贴边裁切」是假象（v1.2.0 和 v1.3.x 都曾被它误导）。真机 375px 验证需要 CDP 移动仿真，本流水线不做；流式版面（段落 + `width:100%` 图片）用 500/600px 复核即可放行。

⚠️ **图片重复坑**：`baoyu-markdown-to-html` 会读同目录 `image-manifest.json` 自动插一份图，与 markdown 里的 `![]()` 叠加成每图两份。修法二选一：① 排版前临时移开 manifest（B 类本就不留 manifest，天然绕开）；② 生成后用 `src` 去重（保留每个 src 首份）。另外替换占位符时别忘删初稿原有的 markdown 图，否则同一张图连着出现两行。详细见 `references/pitfalls.md` 二。

**门禁**：给用户预览 HTML，确认版式。**这版是预览版，阶段 5 会重排。**

## 阶段 5：去 AI 味（humanizer-zh）

调 `humanizer-zh` 处理 `02-draft.md`，先读两份：

- `{SKILLS}/humanizer-zh/references/wechat-pipeline-constraints.md`
- **本 skill 的 `references/humanize-pass.md`**（humanizer 的约束文档点名要读这份，它定义「改到什么程度算够」）

（24 类机器痕迹清单在 humanizer-zh 的 `references/pattern-catalog.md`，文本顽固时才加载）：

- 只改一轮，就地改写，不把说明写进正文
- 保留事实、数据、结构、Markdown 标题层级；清掉套话、排比、破折号滥用、模糊权威、空洞结尾
- 不新增任何数字、案例、引语、细节；无来源的空泛主张直接删，不补
- 声口按账号类型选（正式报道 / 观点专栏 / 教程 / 普通编辑）

**⚠️ B 类变体**：`references/humanize-pass.md` 的 2500–5000 字数下限**不适用**（叙事类 1200–2000 即可，注水会毁掉）。B 类去味的重点不是拆套话，而是**逐段复查虚构细节**——把初稿里 AI 自作主张补的数量、动作、环境删干净，并对账「数字集合 / 小节数 / 图片引用数」与初稿一致。

**产出**：`{ART}/03-humanized.md`，随即重跑阶段 4（输入换成 `03-humanized.md`），`mv 03-humanized.html layout.html` 覆盖预览版。

> ⚠️ **顺序说明（与原始工作流有出入，已按工程可行性调整）**：
> 用户给的顺序是"排版 → 去 AI 味"，但去味改的是文字，直接改 HTML 既危险又易破坏内联样式。
> 因此去味作用在 **Markdown 层**，随后**必须重跑阶段 4 的排版命令**（把输入换成 `03-humanized.md`），用最终版 `layout.html` 覆盖预览版。
> 若坚持只在 HTML 上润色，需人工在公众号编辑器里改，本流水线不做。

**门禁**：并排展示改动前后关键段落 + 重排后的最终 HTML，等确认。

## 阶段 6：发布（baoyu-post-to-wechat）

调 `baoyu-post-to-wechat`，**文章模式**，输入最终 Markdown 或 HTML：

### 第 1 步：生成发布副本（必做，别跳过）

```bash
python3 {SKILLS}/wechat-writing-pipeline/scripts/publish_prepare.py {ART}/03-humanized.md -o {ART}/publish.md
```

它一次性堵掉两个实测踩过的坑：剥掉 `<!-- image:xxx -->` 锚点注释（留着会被当成正文首段、顶掉摘要）、把 frontmatter 的 `digest` 转成脚本认的 `description`。跑完会**直接打印可复制的发布命令**。

⚠️ 手写也行，但必须满足：正文里没有 HTML 注释；摘要用 `description`/`summary` 字段，或命令行 `--summary`（**脚本不认 `digest`**，写了会被静默忽略，摘要退化成正文首段）。

### 第 2 步：发布

```bash
# 有 API 凭证（快）— 走草稿箱
bun {SKILLS}/baoyu-post-to-wechat/scripts/wechat-api.ts --markdown {ART}/publish.md --theme default

# 无凭证，走浏览器（需已在 Chrome 登录公众号后台）— 本机默认方式
bun {SKILLS}/baoyu-post-to-wechat/scripts/wechat-article.ts --markdown {ART}/publish.md --theme default --summary "<摘要>" --submit
```

⚠️ **参数别写成位置参数**：`wechat-article.ts` 只认 `--markdown <path>`，直接跟路径会报 `--title is required`。

浏览器模式下脚本会自己把 Markdown 渲染成微信 HTML 再粘贴，**阶段 4 的 `layout.html` 不是发布必需品**——它用于人工预览、核对版式，以及发布脚本不可用时的手动粘贴兜底。

常用参数：`--title` 覆盖标题、`--author`、`--summary`、`--source-url`（原文链接）、`--account`（多账号选号）、`--no-cite`。

⚠️ **作者栏留空是默认行为**：`publish_prepare.py` 检测到 frontmatter 的 `author:` 为空就跳过 `--author`，草稿箱作者一栏会是空的。固定署名填在 `EXTEND.md` 的 `default_author:`（本机已配置为「野生项目经理A总」，发布脚本在没传 `--author` 时自动取它），单篇覆盖则在 frontmatter 写 `author: <署名>`。别假设脚本会自己补。

⚠️ **封面不上传**：frontmatter 的 `coverImage:` 在浏览器模式下不生效。阶段 3.5 出的图必须交付给用户，由用户在草稿箱手动「上传本地封面」。别对人说「封面已配好」——它不在草稿里。

### 本机现状（已配置，别重复引导）

- 发布方式：**browser**（无 API 凭证，Chrome 登录态）
- 配置：`~/.baoyu-skills/baoyu-post-to-wechat/EXTEND.md`
- Chrome profile：`C:\Users\Administrator\AppData\Roaming\baoyu-skills\chrome-profile`（已扫码登录，登录态持久化）
- 主题 default / 配色 blue / 开评论 / 不限粉丝评论
- 固定署名：**野生项目经理A总**（`EXTEND.md` 的 `default_author`，发布时自动带上，不用每篇手写）
- 换 API 模式才需要 AppID + AppSecret（`~/.baoyu-skills/.env`），且出口 IP 要进公众号白名单（当前出口 13.230.172.74，走代理会变，故不用）

浏览器模式发布时**别动鼠标键盘**：脚本用 PowerShell SendKeys 粘贴，会抢焦点。
- **只写入草稿箱**。群发是独立动作，必须由用户在公众号后台点，或明确授权后另说

**产出**：草稿箱链接 / media_id。
**收尾**：报告产物清单：`01-brief.md`、`02-draft.md`、`03-humanized.md`、`publish.md`、`images/`、`diagrams/`、`layout.html`（A 类另有 `image-manifest.json`，B 类无）。
**别忘了提醒用户两件人工收尾事**：上传封面、确认作者栏（若已配置署名则不提）。

## 维护：给已有草稿补字段

发布脚本只管新草稿。历史草稿的作者（或别的字段）要改，用这个工具——它只碰 `#author` 一个输入框，不碰标题和正文：

```bash
# 先干跑，确认能读到、看清现状（不写入）
bun {SKILLS}/wechat-writing-pipeline/scripts/patch_draft_author.ts \
  --appmsgids 100000009,100000013 --dry-run

# 确认后写入（默认只填空值，非空跳过；要覆盖加 --overwrite）
bun {SKILLS}/wechat-writing-pipeline/scripts/patch_draft_author.ts \
  --appmsgids 100000009,100000013
```

- 署名省略时自动读 `EXTEND.md` 的 `default_author`
- 读不到标题就跳过该篇（防页面没加载好时误存空草稿）
- 保存后回读校验，不一致会明确报「回读不一致」
- 依赖 Chrome 已登录公众号后台；未登录时脚本会提示扫码后重跑
- 退出前会 `process.exit()`，否则 CDP 句柄会让进程挂住（踩过）

## 目录产物

```
{ART}/
├── 01-brief.md          选题简报
├── 01-topic/            搜索与下载原始素材
├── 02-draft.md          初稿
├── 03-humanized.md      去 AI 味终稿
├── publish.md           发布副本（剥离注释、摘要字段归位）
├── image-manifest.json  配图清单（A 类；B 类无此文件）
├── images/              插图 + 封面（设计版 cover-feed/square.png；B 类另有 cover-photo-*.png 与真照片 *.jpg）
├── diagrams/            封面 / 信息图 HTML 源（改字可重渲）
└── layout.html          微信兼容 HTML
```

**B 类额外产物**：`images/` 下 ASCII 重命名的真照片、弱化裁剪版（若有敏感照片）、照片封面 feed/square 双尺寸。原图保留不删，只是不引用。

## 故障速查

| 现象 | 处理 |
|---|---|
| 搜狗搜索空结果 | 换关键词、降 `-n`，别高频请求 |
| manifest 校验失败 | 按报错修 ID/尺寸/锚点，不绕过校验 |
| 排版后微信里样式丢失 | 确认用的是 baoyu 内联 HTML，别自己写 `<style>` |
| 发布报 40001 | token 失效，重走凭证配置 |
| 发布报 IP 不在白名单 | `curl ifconfig.me` 查出口 IP，加到公众号后台 |
| 图片上传失败 | 改走浏览器模式，或先把图片转本地绝对路径 |
| 封面渲染报「无法从文件名判断尺寸」 | 文件名必须含 `feed` 或 `square` |
| 封面文字被裁 / 标签出界 | 按 `references/cover-style.md` 的排版坑逐条查，别只看 HTML |
| 草稿箱作者栏是空的 | frontmatter 补 `author:`，或填 `EXTEND.md` 的 `default_author:` |
| 草稿箱封面是空的 | 正常，脚本不传封面；交付 PNG 让用户在后台手动上传 |
| 排版后每张图出现两份 | 同目录 `image-manifest.json` 被排版脚本自动插图，与 markdown 图叠加；临时移开 manifest，或按 `src` 去重 |
| 375px 截图文字「贴边被裁」 | headless Chrome 最小窗宽约 500px 的伪象；改用 500/600px 复核，别据此改版式 |
| 照片封面底部文字贴左边缘 | 绝对定位的 `.desc` 不继承居中，必须自己写 `text-align:center` |
| PIL 裁剪位置完全不对 | 聊天预览图尺寸 ≠ 原图尺寸（实测 810×1080 vs 3072×4096）；先 `Image.open().size` 再按比例换算坐标 |
| 个人叙事稿读起来「太顺、太会写」 | 多半混进了 AI 补的细节；逐段对照用户原话删干净 |

## 降级路径

任一阶段 skill 不可用时的兜底：

- 搜索/下载挂了 → 用 WebSearch + 手动贴素材，跳过阶段 1 的脚本
- 写作挂了 → 自己写，但必须过一遍 humanizer-zh
- 排版挂了 → 用 `python3 {SKILLS}/wechat-article-writer/scripts/render_wechat_layout.py --article ... --output layout.html`，并声明功能降级
- 发布挂了 → 交付 `layout.html` + 图片，让用户在公众号后台手动粘贴

## 实测踩坑

完整清单见 **`references/pitfalls.md`**（跑之前扫一遍）。最容易撞的八条：

1. `wechat-article.ts` 只认 `--markdown <path>`，位置参数会报 `--title is required`
2. 摘要被写成 `<!-- image:xxx -->` —— 锚点注释 + `digest` 字段叠加所致，用 `publish_prepare.py` 规避
3. Chrome profile 锁冲突 —— 脚本结束后**故意不关窗口**，重跑前先关掉那个 profile 的 Chrome
4. 发布期间碰键鼠会导致粘贴错乱 —— 脚本靠 SendKeys 抢焦点
5. 生图自带「AI 生成」水印 —— **只对正文插图**；封面走 HTML 渲染，没这问题
6. 草稿箱的封面和作者栏默认是空的 —— 脚本不传封面，空 `author` 会跳过 `--author`，两件都得人工收尾
7. **每图渲染两份** —— 排版脚本读同目录 manifest 自动插图；B 类不留 manifest，A 类临时移开或按 `src` 去重
8. **375px 验收是伪象** —— headless Chrome 最小窗宽 ~500px，用 500/600px 复核即可，别据此改版式

## 附：本 skill 的文件

```
wechat-writing-pipeline/
├── SKILL.md                      编排主文档
├── README.md                     安装与依赖说明
├── references/
│   ├── pitfalls.md               实测踩坑清单（七节）
│   ├── fact-check.md             数据分级与改写后对账（A 类）
│   ├── humanize-pass.md          去 AI 味的执行尺度（humanizer 点名要读）
│   ├── cover-style.md            设计版封面规范（六要素 / 配色 / 排版坑）
│   ├── genre-routing.md          ★ 体裁路由：A/B 双轨 + B 类不虚构细节铁律
│   └── photo-handling.md         ★ 真照片接入 / 照片封面 / 敏感照片四条判断
├── templates/
│   ├── brief-template.md         选题简报模板（A 类）
│   ├── cover-feed.html           设计版封面模板 2.35:1
│   ├── cover-square.html         设计版封面模板 1:1
│   ├── cover-photo-feed.html     ★ 照片封面模板 2.35:1（B 类）
│   └── cover-photo-square.html   ★ 照片封面模板 1:1（B 类）
└── scripts/
    ├── preflight.sh              环境预检
    ├── publish_prepare.py        发布前处理 + 打印发布命令
    ├── render_cover.sh           封面渲染（HTML → 2x PNG）
    └── patch_draft_author.ts     给已有草稿补作者（维护工具）
```
