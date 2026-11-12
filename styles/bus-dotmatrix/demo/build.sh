#!/bin/sh
# 从零重建《海底下的一天》：sh styles/bus-dotmatrix/demo/build.sh v002   （在库的根目录或任何目录都能跑）
# 每次构建都是一个新版本：成片写到 styles/bus-dotmatrix/bus-dotmatrix-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 图库用的 bus-dotmatrix.mp4 和 poster.jpg 是你选定的那一版的副本：这个脚本只在它们不存在时才复制。
# 画面默认在本机渲染（core/render/video.mjs）；RENDER=remote 时用 neo/render/remote.sh 在渲染机上渲染（3 个 worker）。
set -e
VER=${1:?usage: sh build.sh v001   (take the next free number: ls styles/bus-dotmatrix/*.mp4)}
sh "$(dirname "$0")/tools/fonts.sh"   # 字体不进 git（CREDITS 写明出处）→ fonts/
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../bus-dotmatrix-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
[ ! -e "$OUT" ] || { echo "✗ $OUT exists: take the next number"; exit 1; }
cd "$R"
if [ ! -s "$D/data/bus.json" ] || [ ! -s "$D/data/map.json" ]; then
  echo "== 0. 数据：运输署 GTFS（DATA.GOV.HK）+ OpenStreetMap（Overpass API）；原始下载都缓存在 data/*.cache/"
  G="$D/data/gtfs.cache"; mkdir -p "$G"
  [ -s "$G/gtfs-tc.zip" ] || curl -fsSL -o "$G/gtfs-tc.zip" https://static.data.gov.hk/td/pt-headway-tc/gtfs.zip
  [ -s "$G/gtfs-en.zip" ] || curl -fsSL -o "$G/gtfs-en.zip" https://static.data.gov.hk/td/pt-headway-en/gtfs.zip
  # 注意：GTFS 每两周更新一次，重新下载后班次数会和片子里的数字不同（FACTS.md 记的是 2026-11-12 下载的那一版）
  for DAY in 20261118 20261119; do
    $PY neo/geo/gtfs.py --feed "$G/gtfs-tc.zip" --date $DAY --agency KMB,CTB,KMB+CTB,LWB+CTB,LWB,NLB,LRTFeeder --types 3 \
      --origin 114.17,22.30 --out "$G/day-$(echo $DAY | cut -c7-8).json"
  done
  $PY neo/geo/osm.py --bbox 113.82,22.14,114.44,22.58 --origin 114.17,22.30 --layers land --tol 15 --out "$D/data/land.cache/land.json"
  REFS=$($PY -I "$D/tools/prep.py" --refs)
  $PY neo/geo/routes.py --bbox 114.10,22.27,114.25,22.32 --route bus --refs "$REFS" --origin 114.17,22.30 --tol 6 --out "$D/data/osm.cache/routes.json"
  $PY -I "$D/tools/roads.py"
  $PY -I "$D/tools/prep.py"
fi
echo "== 1. 导出事件（开机、扫描、翻牌、说明、隧道年份、车流密度、主角车、片尾）"
node core/render/events.mjs "$D"
echo "== 2. 配乐、拟音、环境（全部合成）→ out/mix.wav"
$PY "$D/mix.py"
echo "== 3. 渲染画面（24 fps）"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --out "$D/out/video.mp4" --workers 3
else node core/render/video.mjs "$D" --fps 24 --workers 4 --out "$D/out/video.mp4"; fi
echo "== 4. 合成（两遍 loudnorm −14 LUFS，点阵画面不加颗粒，BT.709 有限范围）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 0
echo "== 5. 阅读时长检查、海报和风格帧"
node core/render/readcheck.mjs "$D"
node core/render/still.mjs "$D" 50.5 --prefix poster_ --out "$D/out/stills"
node core/render/still.mjs "$D" 17 --prefix sf_ --out "$D/out/stills"
cp "$D/out/stills/poster_50.5.jpg" "$POSTER"
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/sf_17.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$D/../bus-dotmatrix.mp4" ] || cp "$OUT" "$D/../bus-dotmatrix.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
