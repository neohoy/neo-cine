#!/bin/sh
# 从镜头表到成片，一条命令（方寸影像工具包；制作手册 ../../PRODUCTION.md 第 6 步）：
#   sh styles/isle-film/kit/tools/make.sh <工程> v001                 整片 → <工程>/<name>-v001.mp4 和 poster-v001.jpg
#   RENDER=remote sh styles/isle-film/kit/tools/make.sh <工程> v002   画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 步骤：页面（build.mjs）→ 字体子集（fonts.py，缺字就停）→ readcheck → 导出画面事件 → 声音（mix.py：卡点核对、−14 LUFS）
#       → 渲染（24 fps）→ 合成（mux.sh，BT.709）→ 海报（film.json 的 poster，片中秒数）→ 接触表。
# 每次都是新版本：已有的版本号直接拒绝；这一版的镜头表存成 <工程>/film-<版本>.json。OUTDIR 可以把成片和海报写到别处（库的示范片用它写到风格目录）。
# 在库的根目录或任何目录都能跑；LIB 默认是这个工具包所在的库。
set -e
P="$(cd "${1:?usage: sh make.sh <工程> v001}" && pwd)"; VER=${2:?usage: sh make.sh <工程> v001}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
J() { "$PY" -c "import json,sys,os;c=json.load(open(sys.argv[1],encoding='utf-8'));print($1)" "$P/film.json"; }
NAME=$(J "c.get('name') or os.path.basename(os.path.dirname(sys.argv[1]))")
POS=$(J "c.get('poster') or ''")
OUTD=${OUTDIR:-$P}
OUT="$OUTD/$NAME-$VER.mp4"
[ ! -e "$OUT" ] || { echo "✗ $OUT 已经存在：换下一个版本号"; exit 1; }
cd "$LIB"
cp "$P/film.json" "$P/film-$VER.json"                                # 这一版的镜头表留档（交付清单的一部分）
echo "== 1. 页面"
node "$K/tools/build.mjs" "$P"
echo "== 2. 字体子集"
"$PY" "$K/tools/fonts.py" "$P"
echo "== 3. 阅读检查（只要页面和字体，先查，免得渲完才发现字不够读、版本号白占）"
node core/render/readcheck.mjs "$P"
echo "== 4. 导出画面事件"
node core/render/events.mjs "$P"
echo "== 5. 声音（代码合成：环境、钟点、玻璃、奇事、配乐）"
"$PY" "$K/tools/mix.py" "$P"
FR=$("$PY" -c "import json,sys;print(round(json.load(open(sys.argv[1]))['dur']*24))" "$P/events.json")
echo "== 6. 渲染画面：$FR 帧（24 fps）。WebGL 很重：近几年的 Mac 3 个 worker 约 5 帧/秒（36 秒的片子三分钟），渲染台式机 4 个 worker 会快一些"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$P" --out "$P/out/video.mp4" --workers 4
else node core/render/video.mjs "$P" --fps 24 --workers 3 --out "$P/out/video.mp4"; fi
echo "== 7. 合成（两遍 loudnorm 到 −14 LUFS，BT.709 有限范围，一层很轻的颗粒）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$P/out/video.mp4" "$P/out/mix.wav" "$OUT" 24 1
if [ -n "$POS" ]; then
  echo "== 8. 海报（片中 $POS 秒）"
  if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$P" --times "$POS" --stills "$P/out/stills" >/dev/null; cp "$P/out/stills/t_$POS.jpg" "$OUTD/poster-$VER.jpg"
  else node core/render/still.mjs "$P" "$POS" --prefix poster_ --out "$P/out/stills" >/dev/null; cp "$P/out/stills/poster_$POS.jpg" "$OUTD/poster-$VER.jpg"; fi
fi
echo "== 9. 接触表（每秒一帧）→ out/contact.jpg"
mkdir -p "$P/out/contact"; rm -f "$P/out/contact/"*.jpg
ffmpeg -v error -i "$OUT" -vf "fps=1,scale=480:-1" "$P/out/contact/c_%03d.jpg"
"$PY" core/render/sheet.py "$P/out/contact.jpg" "$P/out/contact/"c_*.jpg --cols 6 --w 320 >/dev/null
echo "done: $OUT"
