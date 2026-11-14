#!/bin/sh
# 从镜头到成片，一条命令（手账歌谣工具包；制作手册 ../../PRODUCTION.md 第 7、8 步）：
#   sh styles/scrapbook-song/kit/tools/make.sh <工程> v001                 整片 → <工程>/<name>-v001.mp4 和 poster-v001.jpg
#   RENDER=remote sh styles/scrapbook-song/kit/tools/make.sh <工程> v002   画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
#   SAMPLE=s02,c1 sh styles/scrapbook-song/kit/tools/make.sh <工程> v001   样片：只做这几个相邻镜头 → <name>-sample-v001.mp4
# 步骤：生成镜头（build.py）→ 字体子集（fonts.py，缺字就停）→ 导出事件 → 声音（mix.py：截歌、淡入淡出、重拍对歌、−14 LUFS）
#       → 渲染（24 fps）→ 合成（mux.sh，BT.709）→ readcheck → lyriccheck → 海报（mv.json 的 poster，片中秒数）。
# 每次都是新版本：已有的版本号直接拒绝。OUTDIR 可以把成片和海报写到别处（示范片用它写到风格目录）。
# 在库的根目录或任何目录都能跑；LIB 默认是这个工具包所在的库。
set -e
P="$(cd "${1:?usage: sh make.sh <工程> v001}" && pwd)"; VER=${2:?usage: sh make.sh <工程> v001}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
NAME=$("$PY" -c "import json,sys;print(json.load(open(sys.argv[1]))['name'])" "$P/mv.json")
POS=$("$PY" -c "import json,sys;print(json.load(open(sys.argv[1])).get('poster') or '')" "$P/mv.json")
OUTD=${OUTDIR:-$P}
if [ -n "$SAMPLE" ]; then OUT="$OUTD/$NAME-sample-$VER.mp4"; else OUT="$OUTD/$NAME-$VER.mp4"; fi
[ ! -e "$OUT" ] || { echo "✗ $OUT 已经存在：换下一个版本号"; exit 1; }
cd "$LIB"
echo "== 1. 生成镜头"
if [ -n "$SAMPLE" ]; then "$PY" "$K/tools/build.py" "$P" --sample "$SAMPLE"; else "$PY" "$K/tools/build.py" "$P"; fi
echo "== 2. 字体子集"
"$PY" "$K/tools/fonts.py" "$P"
echo "== 3. 导出画面事件"
node core/render/events.mjs "$P"
echo "== 4. 声音"
"$PY" "$K/tools/mix.py" "$P"
FR=$("$PY" -c "import json,sys;print(round(json.load(open(sys.argv[1]))['dur']*24))" "$P/events.json")
echo "== 5. 渲染画面：$FR 帧（24 fps）。参考：台式机 4 个 worker 约 12 帧/秒，本机 3 个 worker 约 5–8 帧/秒"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$P" --out "$P/out/video.mp4" --workers 4
else node core/render/video.mjs "$P" --fps 24 --workers 3 --out "$P/out/video.mp4"; fi
echo "== 6. 合成（两遍 loudnorm 到 −14 LUFS，BT.709 有限范围；纸纹已经画在页面里，不加颗粒）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$P/out/video.mp4" "$P/out/mix.wav" "$OUT" 24
echo "== 7. 阅读检查"
node core/render/readcheck.mjs "$P"
node "$K/tools/lyriccheck.mjs" "$P"
if [ -z "$SAMPLE" ] && [ -n "$POS" ]; then
  echo "== 8. 海报（片中 $POS 秒）"
  node core/render/still.mjs "$P" "$POS" --prefix poster_ --out "$P/out/stills"
  cp "$P/out/stills/poster_$POS.jpg" "$OUTD/poster-$VER.jpg"
fi
echo "done: $OUT"
