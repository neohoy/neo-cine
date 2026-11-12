#!/bin/sh
# 这块屏用的点阵字体（SIL Open Font License 1.1，见 ../CREDITS）不进 git。这里从缝合像素字体（Fusion Pixel Font）
# 固定在 2026.10.25 版的发布包里取出两种字形：zh_hk（香港地名、目的地，按香港牌上的写法）和 zh_hans（简体说明文字）。
# 已经在的文件保留；FORCE=1 重新取。build.sh 第一步就跑它。
set -e
D=$(cd "$(dirname "$0")/.." && pwd)/fonts; mkdir -p "$D"
V=2026.10.25
URL=https://github.com/TakWolf/fusion-pixel-font/releases/download/$V/fusion-pixel-font-12px-proportional-ttf.woff2-v$V.zip
NEED="fusion-pixel-12px-proportional-zh_hk.ttf.woff2 fusion-pixel-12px-proportional-zh_hans.ttf.woff2"
miss=; for f in $NEED; do [ -s "$D/$f" ] || miss=1; done
[ -z "$miss" ] && [ -z "$FORCE" ] && exit 0
curl -fsSL -g --retry 2 -o "$D/download.part" "$URL" ||
  { rm -f "$D/download.part"; echo "✗ could not fetch $URL (offline, or behind a proxy? curl uses https_proxy)" >&2; exit 1; }
for f in $NEED; do unzip -o -q -j "$D/download.part" "$f" -d "$D"; done
rm -f "$D/download.part"; echo "fonts/: Fusion Pixel Font $V (zh_hk, zh_hans)"
