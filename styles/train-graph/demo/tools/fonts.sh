#!/bin/sh
# 这一页用到的字体（SIL Open Font License 1.1，见 ../CREDITS）不进 git，由这里下载到 fonts/：
# Barlow Condensed、IBM Plex Mono 取自 google/fonts 固定的一个提交；朱雀仿宋取自 TrionesType/zhuque 的 v0.212 发布包。
# 已有的文件不重复下载；FORCE=1 重新下载。build.sh 第一步就跑它。
set -e
D=$(cd "$(dirname "$0")/.." && pwd)/fonts; mkdir -p "$D"
GF=https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b
ZQ=https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip
get() {
  [ -s "$D/$1" ] && [ -z "$FORCE" ] && return 0
  curl -fsSL -g --retry 2 -o "$D/download.part" "$2" ||
    { rm -f "$D/download.part"; echo "✗ could not fetch fonts/$1 from $2 (offline, or behind a proxy? curl uses https_proxy)" >&2; exit 1; }
  mv "$D/download.part" "$D/$1"; echo "fonts/$1"
}
get BarlowCondensed-Medium.ttf "$GF/ofl/barlowcondensed/BarlowCondensed-Medium.ttf"
get BarlowCondensed-SemiBold.ttf "$GF/ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf"
get BarlowCondensed-Italic.ttf "$GF/ofl/barlowcondensed/BarlowCondensed-Italic.ttf"
get IBMPlexMono-Medium.ttf "$GF/ofl/ibmplexmono/IBMPlexMono-Medium.ttf"
if [ ! -s "$D/ZhuqueFangsong-Regular.ttf" ] || [ -n "$FORCE" ]; then              # 朱雀仿宋只有 zip 发布包：下载后取出 ttf
  get zhuque.zip "$ZQ"
  unzip -o -q -j "$D/zhuque.zip" ZhuqueFangsong-Regular.ttf -d "$D" && rm -f "$D/zhuque.zip" && echo "fonts/ZhuqueFangsong-Regular.ttf"
fi
