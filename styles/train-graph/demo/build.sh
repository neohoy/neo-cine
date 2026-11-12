#!/bin/sh
# 重建《两条线，一天》：sh styles/train-graph/demo/build.sh v001   （在库的根目录或任何目录都可以跑）
# 每次构建都是一个新版本：成片写到 styles/train-graph/train-graph-<ver>.mp4，旁边是 poster-<ver>.jpg，已有的版本绝不覆盖。
# 画廊用的 train-graph.mp4 和 poster.jpg 是你选定的那一版的拷贝：这个脚本只在它们缺失时才生成。
# 画面默认在本机渲染（core/render/video.mjs）；RENDER=remote 时交给台式机（neo/render/remote.sh，3 个 worker）。
set -e
VER=${1:?usage: sh build.sh v001   (take the next free number: ls styles/train-graph/*.mp4)}
sh "$(dirname "$0")/tools/fonts.sh"   # 字体不进 git（CREDITS 写明出处）→ fonts/
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../train-graph-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
[ ! -e "$OUT" ] || { echo "✗ $OUT exists: take the next number"; exit 1; }
cd "$R"
if [ ! -s "$D/data/graph.json" ]; then
  echo "== 0. 数据：gtfs.de 的长途列车时刻表 + OpenStreetMap 的铁路和河流（下载的原始文件缓存在 data/*.cache/）"
  mkdir -p "$D/data/gtfs.cache"
  [ -s "$D/data/gtfs.cache/fv_free.zip" ] || curl -fsSL --retry 2 -o "$D/data/gtfs.cache/fv_free.zip" https://download.gtfs.de/germany/fv_free/latest.zip
  $PY "$D/tools/prep.py"
fi
echo "== 1. 导出事件（发车、到站、赛跑、轨道声、批注、图签）"
node core/render/events.mjs "$D"
echo "== 2. 配乐、拟音和环境声（全部合成；需要音乐依赖：setup.sh deps music）→ out/mix.wav"
$PY "$D/mix.py"
echo "== 3. 渲染画面（24 fps）"
rm -f "$D/out/video.mp4"      # 先删掉上一次的画面：remote.sh 取回失败（scp 断开）时不报错，会把旧的 video.mp4 当成新的
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --out "$D/out/video.mp4" --workers 3
else node core/render/video.mjs "$D" --fps 24 --workers 4 --out "$D/out/video.mp4"; fi
[ -s "$D/out/video.mp4" ] || { echo "✗ out/video.mp4 was not written (remote copy failed?): run the build again with the next number"; exit 1; }
echo "== 4. 合成（两遍 loudnorm 到 -14 LUFS，不加颗粒，BT.709 有限范围）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 0
echo "== 5. 阅读时间检查、海报和风格帧"
node core/render/readcheck.mjs "$D"
node core/render/still.mjs "$D" 55 --prefix poster_ --out "$D/out/stills"
node core/render/still.mjs "$D" 24.6 --prefix sf_ --out "$D/out/stills"
cp "$D/out/stills/poster_55.jpg" "$POSTER"
[ -e "$D/stills/styleframe.jpg" ] || cp "$D/out/stills/sf_24.6.jpg" "$D/stills/styleframe.jpg"
[ -e "$D/../train-graph.mp4" ] || cp "$OUT" "$D/../train-graph.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
