#!/bin/sh
# 从零重建《凌晨一点半》：sh styles/flat-metro/demo/build.sh v002   （在库的根目录或任何目录都能跑）
# 每次构建都是一个新版本：成片写到 styles/flat-metro/flat-metro-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 图库用的 flat-metro.mp4 和 poster.jpg 是你选定的那一版的副本：这个脚本只在它们不存在时才复制。
# 画面默认在本机渲染（core/render/video.mjs）；RENDER=remote 时用 neo/render/remote.sh 在渲染机上渲染（4 个 worker）。
set -e
VER=${1:?usage: sh build.sh v001   (take the next free number: ls styles/flat-metro/*.mp4)}
sh "$(dirname "$0")/tools/fonts.sh"   # 字体不进 git（CREDITS 写明出处）→ fonts/
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../flat-metro-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
[ ! -e "$OUT" ] || { echo "✗ $OUT exists: take the next number"; exit 1; }
cd "$R"
if [ ! -s "$D/data/net.json" ]; then
  echo "== 0. 数据：OpenStreetMap（Overpass API）+ Wiener Linien GTFS（data.gv.at）；原始下载都缓存在 data/*.cache/"
  [ -s "$D/data/metro.json" ] || $PY neo/geo/routes.py --bbox 16.22,48.11,16.56,48.30 --route 'subway|light_rail' --refs U1,U2,U3,U4,U6 --origin 16.37,48.21 --out "$D/data/metro.json"
  [ -s "$D/data/osm.cache/city.json" ] || $PY neo/geo/osm.py --bbox 16.16,48.09,16.60,48.33 --origin 16.37,48.21 --layers water,wood,park --tol 12 --min-area 40000 --out "$D/data/osm.cache/city.json"
  G="$D/data/gtfs.cache"; mkdir -p "$G"
  # 注意：这个 GTFS 每周更新；片子里的数字（FACTS.md）来自 2026-11-09 发布、2026-11-13 下载的那一版。重新下载后班次可能不同。
  [ -s "$G/wl.zip" ] || curl -fsSL -o "$G/wl.zip" https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip
  for DAY in 20261119 20261120 20261121; do
    [ -s "$G/day-$DAY.json" ] || $PY neo/geo/gtfs.py --feed "$G/wl.zip" --date $DAY --agency 04 --types 1 --origin 16.37,48.21 --out "$G/day-$DAY.json"
  done
  $PY -I "$D/tools/prep.py"
fi
echo "== 1. 导出事件（拉线、站孔、末班车、一天过去、列车靠站、字幕）"
node core/render/events.mjs "$D"
echo "== 2. 配乐、拟音、环境（全部合成）→ out/mix.wav（含卡点核对和电平检查）"
$PY "$D/mix.py"
echo "== 3. 渲染画面（24 fps）"
rm -f "$D/out/video.mp4"           # remote.sh 回传失败时不会报错：先删掉旧的，免得把上一版画面合进新版本
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --out "$D/out/video.mp4" --workers 4
else node core/render/video.mjs "$D" --fps 24 --workers 4 --out "$D/out/video.mp4"; fi
[ -s "$D/out/video.mp4" ] || { echo "✗ out/video.mp4 was not written"; exit 1; }
# 浏览器标签页崩溃时截到的是一张白图（"哎呀"页面），渲染工具不报错：整帧纯白就停下
WHITE=$(ffmpeg -hide_banner -nostats -i "$D/out/video.mp4" -vf "negate,blackdetect=d=0:pix_th=0.03:pic_th=0.98" -an -f null - 2>&1 | grep -c black_start || true)
[ "$WHITE" = 0 ] || { echo "✗ $WHITE white (crashed-tab) stretch(es) in out/video.mp4: render again"; exit 1; }
echo "== 4. 合成（两遍 loudnorm −14 LUFS，矢量画面不加颗粒，BT.709 有限范围）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 0
echo "== 5. 阅读时长检查、海报和风格帧"
node core/render/readcheck.mjs "$D" > "$D/out/readcheck.txt" || { grep -v 'passing (pass' "$D/out/readcheck.txt"; exit 1; }
grep -v 'passing (pass' "$D/out/readcheck.txt"
node core/render/still.mjs "$D" 55 --prefix poster_ --out "$D/out/stills"
node core/render/still.mjs "$D" 41 --prefix sf_ --out "$D/out/stills"
cp "$D/out/stills/poster_55.jpg" "$POSTER"
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/sf_41.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$D/../flat-metro.mp4" ] || cp "$OUT" "$D/../flat-metro.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
