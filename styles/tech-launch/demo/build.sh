#!/bin/sh
# 一条命令重做科技发布 Tech Launch 的示范片《记录在案》On the Record（拍建造观察局 news.bitbuild.cc，库作者本人的网站）：
#   sh styles/tech-launch/demo/build.sh v002            （在库的根目录或任何目录都行）
#   RENDER=remote sh styles/tech-launch/demo/build.sh v002     画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 示范片本身就是一个科技发布工程（promo.json），用的是和用户的片子同一套工具包：../kit/tools/make.sh 生成页面、切字体、
# 合成音效和配乐、混音（卡点核对、−14 LUFS）、渲染、合成、读字检查、出海报（制作手册 ../PRODUCTION.md）。
# 站点第一次（site/ 不存在时）从线上冻结：线上的内容会变，冻结后先核对 FACTS.md 再出片；要重新冻结就删掉 site/。
# 成片写到 styles/tech-launch/tech-launch-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 画廊用的 tech-launch.mp4 和 poster.jpg 是你选定那一版的副本：这里只在它们还不存在的时候才复制；风格帧同理。
set -e
VER=${1:?usage: sh build.sh v002   (取下一个没用过的号：ls styles/tech-launch/*.mp4)}
D="$(cd "$(dirname "$0")" && pwd)"; S="$(cd "$D/.." && pwd)"; R="$(cd "$S/../.." && pwd)"
[ ! -e "$S/tech-launch-$VER.mp4" ] || { echo "✗ tech-launch-$VER.mp4 已经存在：换下一个版本号"; exit 1; }
if [ ! -f "$D/site/site.json" ]; then
  echo "== 0. 冻结站点（线上 news.bitbuild.cc，只看不改）"
  node "$S/kit/tools/freeze.mjs" "$D"
fi
OUTDIR="$S" sh "$S/kit/tools/make.sh" "$D" "$VER"
cd "$R"
FS=$(.venv/bin/python -c "import json;print(json.load(open('$S/style.json'))['frame_sec'])")
echo "== 风格帧（片中 $FS 秒：分栏版式，双语标题和划过重点的文章卡都落定）"
node core/render/still.mjs "$D" "$FS" --prefix sf_ --out "$D/out/stills" >/dev/null
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/sf_$FS.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$S/tech-launch.mp4" ] || cp "$S/tech-launch-$VER.mp4" "$S/tech-launch.mp4"
[ -e "$S/poster.jpg" ] || cp "$S/poster-$VER.jpg" "$S/poster.jpg"
echo "done: $S/tech-launch-$VER.mp4"
