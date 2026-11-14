#!/bin/sh
# 从镜头列表到成片，一条命令（科技发布工具包；制作手册 ../../PRODUCTION.md 第 7、8 步）：
#   sh styles/tech-launch/kit/tools/make.sh <工程> v001                 整片 → <工程>/<name>-v001.mp4 和 poster-v001.jpg
#   RENDER=remote sh styles/tech-launch/kit/tools/make.sh <工程> v002   画面在渲染台式机上渲（neo/render/remote.sh，4 个 worker）
# 步骤：页面（build.mjs）→ 字体子集（fonts.py，缺字就停）→ 导出画面事件 → 音效和配乐（sfx_synth.mjs、score.mjs，代码合成）
#       → 混音（mix.py：卡点核对、−14 LUFS）→ 渲染（24 fps）→ 合成（mux.sh，BT.709）→ readcheck → 海报（promo.json 的 poster，片中秒数）。
# 每次都是新版本：已有的版本号直接拒绝。OUTDIR 可以把成片和海报写到别处（库的示范片用它写到风格目录）。
# 在库的根目录或任何目录都能跑；LIB 默认是这个工具包所在的库。冻结站点（freeze.mjs）和旁白（voice.py）不在这里：它们要先做、要人看。
set -e
P="$(cd "${1:?usage: sh make.sh <工程> v001}" && pwd)"; VER=${2:?usage: sh make.sh <工程> v001}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
J() { "$PY" -c "import json,sys,os;c=json.load(open(sys.argv[1],encoding='utf-8'));print($1)" "$P/promo.json"; }
NAME=$(J "c.get('name') or os.path.basename(os.path.dirname(sys.argv[1]))")
POS=$(J "c.get('poster') or ''")
MUSIC=$(J "(c.get('audio') or {}).get('music',{}).get('src','out/score.wav')")
OUTD=${OUTDIR:-$P}
OUT="$OUTD/$NAME-$VER.mp4"
[ ! -e "$OUT" ] || { echo "✗ $OUT 已经存在：换下一个版本号"; exit 1; }
[ -f "$P/site/site.json" ] || { echo "✗ 还没冻结站点：先跑 node $K/tools/freeze.mjs $P"; exit 1; }
cd "$LIB"
echo "== 1. 页面"
node "$K/tools/build.mjs" "$P"
echo "== 2. 字体子集"
"$PY" "$K/tools/fonts.py" "$P"
echo "== 3. 导出画面事件"
node core/render/events.mjs "$P"
echo "== 4. 音效和配乐（代码合成）"
node "$K/tools/sfx_synth.mjs" "$P" >/dev/null
if [ "$MUSIC" = "out/score.wav" ]; then node "$K/tools/score.mjs" "$P"; else echo "配乐用 $MUSIC（不重新作曲）"; fi
echo "== 5. 混音"
"$PY" "$K/tools/mix.py" "$P"
FR=$("$PY" -c "import json,sys;print(round(json.load(open(sys.argv[1]))['dur']*24))" "$P/events.json")
echo "== 6. 渲染画面：$FR 帧（24 fps）。参考：近几年的 Mac 3 个 worker 约 50 帧/秒"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$P" --out "$P/out/video.mp4" --workers 4
else node core/render/video.mjs "$P" --fps 24 --workers 3 --out "$P/out/video.mp4"; fi
echo "== 7. 合成（两遍 loudnorm 到 −14 LUFS，BT.709 有限范围，一层很轻的颗粒压住纸面渐变的色带）"
LEMO_COLOR=bt709 sh core/render/mux.sh "$P/out/video.mp4" "$P/out/mix.wav" "$OUT" 24 1
echo "== 8. 阅读检查"
node core/render/readcheck.mjs "$P"
if [ -f "$P/voice/lines.json" ]; then
  echo "== 旁白字幕 → $NAME-$VER.srt（不烧进画面：标题和标注卡就是片子的字）"
  "$PY" -c "
import json,sys,soundfile as sf,os
d=sys.argv[1]; L=json.load(open(os.path.join(d,'lines.json'),encoding='utf-8'))
json.dump([{'t0':l['at'],'t1':round(l['at']+sf.info(os.path.join(d,l['id']+'.wav')).duration,3),'text':l['text']} for l in L],open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False)" "$P/voice" "$P/out/srt.json"
  "$PY" core/render/srt.py "$P/out/srt.json" "$OUTD/$NAME-$VER.srt"
fi
if [ -n "$POS" ]; then
  echo "== 9. 海报（片中 $POS 秒）"
  node core/render/still.mjs "$P" "$POS" --prefix poster_ --out "$P/out/stills" >/dev/null
  cp "$P/out/stills/poster_$POS.jpg" "$OUTD/poster-$VER.jpg"
fi
echo "== 10. 接触表（每秒一帧）→ out/contact.jpg"
mkdir -p "$P/out/contact"; rm -f "$P/out/contact/"*.jpg
ffmpeg -v error -i "$OUT" -vf "fps=1,scale=480:-1" "$P/out/contact/c_%03d.jpg"
"$PY" core/render/sheet.py "$P/out/contact.jpg" "$P/out/contact/"c_*.jpg --cols 6 --w 320 >/dev/null
echo "done: $OUT"
