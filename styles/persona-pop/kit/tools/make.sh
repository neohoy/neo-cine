#!/bin/sh
# 从工程到成片，一条命令（拟人 MV 工具包；制作手册 ../../PRODUCTION.md 第 6 步）：
#   sh styles/persona-pop/kit/tools/make.sh <工程> v001                 → <工程>/<name>-v001.mp4 和 poster-v001.jpg
#   RENDER=remote sh styles/persona-pop/kit/tools/make.sh <工程> v002   画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 步骤：逐字歌词（grid.py，mv.json 有 sheet 时）→ 抠图（key.py，只处理新的）→ 字体子集（fonts.py，缺字就停）→ 导出画面事件
#       → 混音（mix.py：伴奏和主旋律或用户的歌、事件音效、卡点核对、−14 LUFS）→ 渲染（1080×1920，片子的帧率）
#       → 合成（mux.sh，BT.709，不加颗粒）→ readcheck（竖屏尺寸）→ 海报（mv.json 的 poster，片中秒数）。
# 每次都是新版本：已有的版本号直接拒绝。OUTDIR 可以把成片和海报写到别处（库的示范片用它写到风格目录）。
set -e
P="$(cd "${1:?usage: sh make.sh <工程> v001}" && pwd)"; VER=${2:?usage: sh make.sh <工程> v001}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
J() { "$PY" -c "import json,sys,os;c=json.load(open(sys.argv[1],encoding='utf-8'));print($1)" "$P/mv.json"; }
NAME=$(J "c.get('name') or os.path.basename(os.path.dirname(sys.argv[1]))")
FPS=$(J "c.get('fps', 30)"); SIZE=$(J "'x'.join(str(v) for v in c.get('size', [1080, 1920]))")
POS=$(J "c.get('poster', '')"); SHEET=$(J "1 if c.get('sheet') else ''")
OUTD=${OUTDIR:-$P}
OUT="$OUTD/$NAME-$VER.mp4"
[ ! -e "$OUT" ] || { echo "✗ $OUT 已经存在：换下一个版本号"; exit 1; }
cd "$LIB"
if [ -n "$SHEET" ] && [ ! -f "$P/data/words.json" ]; then echo "== 1. 逐字歌词（节拍网格）"; "$PY" "$K/tools/grid.py" "$P"
elif [ -f "$P/data/words.json" ]; then echo "== 1. 逐字歌词（按人声对齐）"; "$PY" "$K/tools/grid.py" "$P" --words "$P/data/words.json"; fi
echo "== 2. 立绘抠图（只处理新的）"
[ -d "$P/cast/raw" ] && "$PY" "$K/tools/key.py" "$P" || echo "  （没有 cast/raw/：用工程里已有的 assets/chars/）"
echo "== 3. 字体子集"
"$PY" "$K/tools/fonts.py" "$P"
echo "== 4. 导出画面事件"
node core/render/events.mjs "$P" --size "$SIZE"
echo "== 5. 混音"
"$PY" "$K/tools/mix.py" "$P"
FR=$("$PY" -c "import json,sys;print(round(json.load(open(sys.argv[1]))['dur']*$FPS))" "$P/events.json")
echo "== 6. 渲染画面：$FR 帧（$FPS fps，$SIZE）"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$P" --out "$P/out/video.mp4" --fps "$FPS" --size "$SIZE" --workers 4
else node core/render/video.mjs "$P" --fps "$FPS" --size "$SIZE" --workers 3 --out "$P/out/video.mp4"; fi
echo "== 7. 合成（−14 LUFS，BT.709）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$P/out/video.mp4" "$P/out/mix.wav" "$OUT" "$FPS" | tee "$P/out/mux-$VER.log"
echo "== 8. 读字检查"
node core/render/readcheck.mjs "$P" --size "$SIZE"
if [ -n "$POS" ]; then
  echo "== 9. 海报（片中 $POS 秒）"
  node core/render/still.mjs "$P" "$POS" --size "$SIZE" --prefix poster_ --out "$P/out/stills" >/dev/null
  cp "$P/out/stills/poster_$POS.jpg" "$OUTD/poster-$VER.jpg"
fi
echo "done: $OUT"
