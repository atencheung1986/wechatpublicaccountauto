#!/usr/bin/env bash
# 公众号流水线环境预检：只报告，不修改任何东西
SK="${SKILLS_DIR:-$HOME/.workbuddy/skills}"
ok()   { printf "  [OK]      %-22s %s\n" "$1" "$2"; }
miss() { printf "  [MISSING] %-22s %s\n" "$1" "$2"; }

echo "== 运行时 =="
command -v node >/dev/null 2>&1    && ok node "$(node -v)"            || miss node "npm install -g node"
command -v bun  >/dev/null 2>&1    && ok bun  "$(bun --version)"      || miss bun  "npm install -g bun"
command -v npx  >/dev/null 2>&1    && ok npx  "bun 的兜底运行时"       || miss npx  "随 node 一起装"
command -v python3 >/dev/null 2>&1 && ok python3 "$(python3 -V 2>&1)" || miss python3 "校验脚本需要"

echo "== 浏览器 =="
CHROME="${WECHAT_BROWSER_CHROME_PATH:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
[ -f "$CHROME" ] && ok chrome "$CHROME" || miss chrome "浏览器发布模式需要"

echo "== 阶段技能 =="
for s in wechat-toolkit wechat-article-writer humanizer-zh baoyu-markdown-to-html baoyu-post-to-wechat baoyu-cover-image; do
  if [ -f "$SK/$s/SKILL.md" ]; then ok "$s" "$SK/$s"; else miss "$s" "未安装"; fi
done

echo "== 依赖与配置 =="
[ -d "$(npm root -g)/cheerio" ] && ok cheerio "搜索模块已装" || miss cheerio "npm install -g cheerio"
[ -d "$SK/wechat-toolkit/scripts/downloader/node_modules" ] \
  && ok "downloader deps" "已安装" \
  || miss "downloader deps" "cd $SK/wechat-toolkit/scripts/downloader && npm install"
[ -f "$HOME/.baoyu-skills/baoyu-post-to-wechat/EXTEND.md" ] \
  && ok "wechat EXTEND.md" "已配置" \
  || miss "wechat EXTEND.md" "首次发布时由 baoyu-post-to-wechat 引导生成"
[ -f "$HOME/.baoyu-skills/baoyu-markdown-to-html/EXTEND.md" ] \
  && ok "theme EXTEND.md" "已配置" \
  || miss "theme EXTEND.md" "可选，缺省主题 default"
