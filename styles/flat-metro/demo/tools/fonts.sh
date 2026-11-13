#!/bin/sh
# 这一页用的字体（SIL Open Font License 1.1，出处写在 ../CREDITS）不进 git，由这里下载到 fonts/：
# 思源黑体 CN 取 Adobe 的 2.004R 标签，Manrope 取 google/fonts 固定在一个提交上的文件。
# 已经有的文件不重下；FORCE=1 强制重下。build.sh 第一步就跑它。
set -e
D=$(cd "$(dirname "$0")/.." && pwd)/fonts; mkdir -p "$D"
GF=https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b
SHS=https://raw.githubusercontent.com/adobe-fonts/source-han-sans/2.004R/SubsetOTF/CN
get() {
  [ -s "$D/$1" ] && [ -z "$FORCE" ] && return 0
  curl -fsSL -g --retry 2 -o "$D/download.part" "$2" ||
    { rm -f "$D/download.part"; echo "✗ could not fetch fonts/$1 from $2 (offline, or behind a proxy? curl uses https_proxy)" >&2; exit 1; }
  mv "$D/download.part" "$D/$1"; echo "fonts/$1"
}
get SourceHanSansCN-Regular.otf "$SHS/SourceHanSansCN-Regular.otf"
get SourceHanSansCN-Medium.otf "$SHS/SourceHanSansCN-Medium.otf"
get Manrope-wght.ttf "$GF/ofl/manrope/Manrope%5Bwght%5D.ttf"
