#!/bin/sh
# 这部片子用到的字体（SIL Open Font License 1.1，见 ../CREDITS）不进 git。这里把它们下到 fonts/：Inter（可变字重）和
# Noto Sans SC（可变字重，只作为子集的来源，放在 tools/），都取自 google/fonts 固定的一个提交；再由 subset.py 切出页面实际加载的
# fonts/NotoSansSC-sub.ttf（只含片子里出现的汉字）。已有的文件保留；FORCE=1 重新下载。build.sh 第一步就跑它。
# 写法照 styles/transit-map/demo/tools/fonts.sh。
set -e
HERE=$(cd "$(dirname "$0")" && pwd); D=$(cd "$HERE/.." && pwd)/fonts; mkdir -p "$D"
GF=https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b/ofl
get() {
  [ -s "$1" ] && [ -z "$FORCE" ] && return 0
  curl -fsSL -g --retry 2 -o "$1.part" "$2" ||
    { rm -f "$1.part"; echo "✗ 下载失败：$2（没联网，或者要走代理？curl 认 https_proxy）" >&2; exit 1; }
  mv "$1.part" "$1"; echo "$1"
}
get "$D/Inter.ttf" "$GF/inter/Inter%5Bopsz,wght%5D.ttf"
get "$D/OFL-Inter.txt" "$GF/inter/OFL.txt"
get "$HERE/NotoSansSC-VF.ttf" "$GF/notosanssc/NotoSansSC%5Bwght%5D.ttf"
get "$D/OFL-NotoSansSC.txt" "$GF/notosanssc/OFL.txt"
R=$(cd "$HERE/../../../.." && pwd)
"$R/.venv/bin/python" -I "$HERE/subset.py"
