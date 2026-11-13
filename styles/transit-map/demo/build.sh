#!/bin/sh
# 一条命令重做《江与环》The River and the Ring（地铁线路图 Transit Map 的示范片）：
#   sh styles/transit-map/demo/build.sh v001          （在库的根目录或任何目录都行）
#   RENDER=remote sh styles/transit-map/demo/build.sh v002    画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 每次都是新版本：成片写到 styles/transit-map/transit-map-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 画廊用的 transit-map.mp4 和 poster.jpg 是你选定那一版的副本：这里只在它们还不存在的时候才复制。
# 没有旁白，所以没有配音也没有字幕：要读的字都印在纸上或者在计数器上。
set -e
VER=${1:?usage: sh build.sh v001   (取下一个没用过的号：ls styles/transit-map/*.mp4)}
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../transit-map-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
[ ! -e "$OUT" ] || { echo "✗ $OUT 已经存在：换下一个版本号"; exit 1; }
cd "$R"
echo "== 0. 地图数据（OpenStreetMap，Overpass API；原始回答缓存在 data/*.cache/，不进 git）"
if [ ! -s "$D/data/metro.json" ] || [ ! -s "$D/data/water.json" ]; then
  $PY neo/geo/routes.py --bbox 113.15,22.55,113.85,23.65 --route 'subway|light_rail|monorail' --network '广州地铁|广佛' --origin 113.32,23.12 --out "$D/data/metro.json"
  $PY neo/geo/osm.py --bbox 113.15,22.55,113.85,23.65 --origin 113.32,23.12 --layers rivers --tol 40 --out "$D/data/water.json"
fi
echo "== 0b. 八方向示意图 → net.js（tools/prep.py：拓扑、站序、颜色和真实一致，几何是示意；过河位置逐段核对）"
[ -s "$D/net.js" ] || $PY -I "$D/tools/prep.py"
echo "== 1. 字体（OFL，不进 git；CREDITS 里有名字和出处）和中文子集"
sh "$D/tools/fonts.sh"
echo "== 2. 导出画面事件（每个车站、拐角、换乘站、终点、计数器、印字）"
node core/render/events.mjs "$D"
echo "== 3. 声音（全部现场合成）→ out/mix.wav；cues 检查和响度检查都要过"
$PY "$D/mix.py"
echo "== 4. 渲染画面（24 fps）"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --out "$D/out/video.mp4" --workers 4
else node core/render/video.mjs "$D" --fps 24 --workers 3 --out "$D/out/video.mp4"; fi
echo "== 5. 合成（两遍 loudnorm 到 −14 LUFS，一层很轻的颗粒，BT.709 有限范围）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 1
echo "== 6. 阅读时长检查、海报和风格帧"
node core/render/readcheck.mjs "$D"
node core/render/still.mjs "$D" 43.6 --prefix poster_ --out "$D/out/stills"
node core/render/still.mjs "$D" 33.5 --prefix sf_ --out "$D/out/stills"
cp "$D/out/stills/poster_43.6.jpg" "$POSTER"
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/sf_33.5.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$D/../transit-map.mp4" ] || cp "$OUT" "$D/../transit-map.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
