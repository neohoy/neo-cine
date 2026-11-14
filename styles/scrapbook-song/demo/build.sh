#!/bin/sh
# 一条命令重做《风吹新竹》示范片（手账歌谣 Scrapbook Song 的示范片：hoy neo《风吹新竹》的桥段 + 最后一遍副歌）：
#   sh styles/scrapbook-song/demo/build.sh v002            （在库的根目录或任何目录都行）
#   RENDER=remote sh styles/scrapbook-song/demo/build.sh v002     画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 示范片本身就是一个手账歌谣工程（mv.json、scripts/、data/、audio/），用的是和用户的片子同一套工具包：
# ../kit/tools/make.sh 生成镜头、切字体、截歌、核对重拍、渲染、合成、检查、出海报（制作手册 ../PRODUCTION.md）。
# 成片写到 styles/scrapbook-song/scrapbook-song-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 画廊用的 scrapbook-song.mp4 和 poster.jpg 是你选定那一版的副本：这里只在它们还不存在的时候才复制。
# 旧名（手绘歌词 handdrawn-lyrics）时期的 handdrawn-lyrics-v001.mp4、poster-handdrawn-lyrics-v001.jpg 留着当留档。
set -e
VER=${1:?usage: sh build.sh v002   (取下一个没用过的号：ls styles/scrapbook-song/*.mp4)}
D="$(cd "$(dirname "$0")" && pwd)"; S="$(cd "$D/.." && pwd)"
OUTDIR="$S" sh "$S/kit/tools/make.sh" "$D" "$VER"
R="$(cd "$S/../.." && pwd)"; cd "$R"
echo "== 风格帧（片中 21.7 秒：副歌的阵风特写，砸字和两张标签都已写完）"
node core/render/still.mjs "$D" 21.7 --prefix sf_ --out "$D/out/stills"
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/sf_21.7.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$S/scrapbook-song.mp4" ] || cp "$S/scrapbook-song-$VER.mp4" "$S/scrapbook-song.mp4"
[ -e "$S/poster.jpg" ] || cp "$S/poster-$VER.jpg" "$S/poster.jpg"
echo "done: $S/scrapbook-song-$VER.mp4"
