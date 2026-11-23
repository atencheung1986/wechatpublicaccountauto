#!/usr/bin/env bash
# 封面渲染：HTML/CSS → 高清 PNG
#
# 用法:
#   bash render_cover.sh <cover-feed.html|cover-square.html>
#
# 尺寸由文件名决定（含 feed → 900x383；含 square → 400x400），
# 认不出来就报错退出 —— 猜尺寸会出比例不对的图，公众号里裁得莫名其妙。
# 成品 {ART}/images/<同名>.png，固定 2x 出图。
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "[cover] 用法: bash render_cover.sh <cover-feed.html|cover-square.html" >&2
  exit 1
fi

HTML="$1"
[ -f "$HTML" ] || { echo "[cover] 找不到文件: $HTML" >&2; exit 1; }

BASE=$(basename "$HTML" .html)
HTML_DIR=$(cd "$(dirname "$HTML")" && pwd)

# 尺寸判定
case "$BASE" in
  *square*) W=400; H=400 ;;
  *feed*)   W=900; H=383 ;;
  *)
    echo "[cover] 无法从文件名判断尺寸: $BASE" >&2
    echo "[cover] 文件名需含 feed(900x383) 或 square(400x400)" >&2
    exit 1
    ;;
esac

# 产物位置：diagrams/ → 上级 images/；否则落在 HTML 同目录
if [ "$(basename "$HTML_DIR")" = "diagrams" ]; then
  OUT_DIR=$(dirname "$HTML_DIR")/images
else
  OUT_DIR="$HTML_DIR"
fi
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/$BASE.png"

# Chrome 探测
CHROME="${WECHAT_BROWSER_CHROME_PATH:-}"
if [ -z "$CHROME" ]; then
  for p in \
    "/c/Program Files/Google/Chrome/Application/chrome.exe" \
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
    "${LOCALAPPDATA:-}/Google/Chrome/Application/chrome.exe" \
    "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
    "/c/Program Files/Microsoft/Edge/Application/msedge.exe"
  do
    [ -n "$p" ] && [ -f "$p" ] && { CHROME="$p"; break; }
  done
fi
if [ -z "$CHROME" ]; then
  for c in google-chrome chrome chromium microsoft-edge; do
    command -v "$c" >/dev/null 2>&1 && { CHROME=$(command -v "$c"); break; }
  done
fi
[ -n "$CHROME" ] || { echo "[cover] 找不到 Chrome/Edge，装 Chrome 或设 WECHAT_BROWSER_CHROME_PATH" >&2; exit 1; }

# 独立临时 profile：别和发布脚本的登录态 profile 抢锁（那是已知坑）
PROFILE=$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/cover-profile-$$")

# 路径 → file:// URL（处理 Windows 盘符与空格）
FILE_URL=$(python3 -c 'import sys,pathlib;print(pathlib.Path(sys.argv[1]).resolve().as_uri())' "$HTML")

echo "[cover] 输入:   $HTML"
echo "[cover] 画布:   ${W}x${H} → 2x 出图"
echo "[cover] 输出:   $OUT"

"$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
  --user-data-dir="$PROFILE" \
  --force-device-scale-factor=2 \
  --window-size="$W,$H" \
  --screenshot="$OUT" \
  "$FILE_URL" 2>&1 | grep -iE "bytes written|error:" || true

if [ -f "$OUT" ]; then
  echo "[cover] 完成:   $(wc -c < "$OUT") bytes"
else
  echo "[cover] 渲染失败，没产出文件" >&2
  exit 1
fi
