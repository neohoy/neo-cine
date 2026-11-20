#!/bin/sh
# 从镜头表到成片，一条命令（游戏发布工具包；制作手册 ../../PRODUCTION.md 第 7、8 步）：
#   sh styles/game-launch/kit/tools/make.sh <工程> v001                 整片 → <工程>/<name>-v001.mp4 和 poster-v001.jpg
#   RENDER=remote sh styles/game-launch/kit/tools/make.sh <工程> v002   画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 步骤：抽帧和静图（clips.py）→ 字体子集（fonts.py，缺字就停）→ 页面（build.py）→ 导出画面事件 → 节拍（beats.py，已有就跳过）
#       → 混音（mix.py：原声截段、合成音效、卡点核对、−14 LUFS）→ 渲染（片子的帧率，默认 30 fps）→ 合成（mux.sh，BT.709，不加颗粒）
#       → readcheck → 海报（game.json 的 poster，片中秒数）→ 接触表。
# 每次都是新版本：已有的版本号直接拒绝。OUTDIR 可以把成片和海报写到别处（库的示范片用它写到风格目录）。
# 在库的根目录或任何目录都能跑；LIB 默认是这个工具包所在的库。
set -e
P="$(cd "${1:?usage: sh make.sh <工程> v001}" && pwd)"; VER=${2:?usage: sh make.sh <工程> v001}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
J() { "$PY" -c "import json,sys,os;c=json.load(open(sys.argv[1],encoding='utf-8'));print($1)" "$P/game.json"; }
NAME=$(J "c.get('name') or os.path.basename(os.path.dirname(sys.argv[1]))")
POS=$(J "c.get('poster') if c.get('poster') is not None else ''")
FPS=$(J "c.get('fps', 30)")
BPM=$(J "(c.get('audio') or {}).get('bpm') or ''")
OUTD=${OUTDIR:-$P}
OUT="$OUTD/$NAME-$VER.mp4"
[ ! -e "$OUT" ] || { echo "✗ $OUT 已经存在：换下一个版本号"; exit 1; }
cd "$LIB"
echo "== 1. 抽帧和静图（录像层按片子的帧格取帧，已是最新的跳过）"
"$PY" "$K/tools/clips.py" "$P"
echo "== 2. 字体子集"
"$PY" "$K/tools/fonts.py" "$P"
echo "== 3. 页面"
"$PY" "$K/tools/build.py" "$P"
echo "== 4. 导出画面事件"
node core/render/events.mjs "$P"
if [ -n "$BPM" ]; then
  echo "== 5. 原声节拍（核对网格）"
  "$PY" "$K/tools/beats.py" "$P"
fi
echo "== 6. 混音"
"$PY" "$K/tools/mix.py" "$P"
FR=$("$PY" -c "import json,sys;print(round(json.load(open(sys.argv[1]))['dur']*$FPS))" "$P/events.json")
echo "== 7. 渲染画面：$FR 帧（$FPS fps）"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$P" --out "$P/out/video.mp4" --fps "$FPS" --workers 4
else node core/render/video.mjs "$P" --fps "$FPS" --workers 3 --out "$P/out/video.mp4"; fi
echo "== 8. 合成（两遍 loudnorm 到 −14 LUFS，BT.709 有限范围；实机画面不加颗粒）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$P/out/video.mp4" "$P/out/mix.wav" "$OUT" "$FPS" 0
echo "== 9. 阅读检查"
node core/render/readcheck.mjs "$P"
if [ -n "$POS" ]; then
  echo "== 10. 海报（片中 $POS 秒）"
  node core/render/still.mjs "$P" "$POS" --prefix poster_ --out "$P/out/stills" >/dev/null
  cp "$P/out/stills/poster_$POS.jpg" "$OUTD/poster-$VER.jpg"
fi
echo "== 11. 接触表（每秒一帧）→ out/contact.jpg"
mkdir -p "$P/out/contact"; rm -f "$P/out/contact/"*.jpg
ffmpeg -v error -i "$OUT" -vf "fps=1,scale=480:-1" "$P/out/contact/c_%03d.jpg"
"$PY" core/render/sheet.py "$P/out/contact.jpg" "$P/out/contact/"c_*.jpg --cols 6 --w 320 >/dev/null
echo "done: $OUT"
