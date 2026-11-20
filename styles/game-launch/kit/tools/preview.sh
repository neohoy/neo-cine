#!/bin/sh
# 样张（制作手册第 6 步，确认点 2；每改一次镜头表都看）：
#   sh styles/game-launch/kit/tools/preview.sh <工程> auto                每个镜头取三个时刻：切点刚过、字幕牌落定、换镜头前
#   sh styles/game-launch/kit/tools/preview.sh <工程> 0,5,8.5,12,17.5     片中秒数，逗号分开（比如原 SPEC 的 QA 时刻）
#   REMOTE=1 sh styles/game-launch/kit/tools/preview.sh <工程> auto       在渲染台式机上截（neo/render/remote.sh --times）
# 会先跑 clips.py（抽帧，已是最新的跳过）、fonts.py、build.py。截图在 <工程>/out/preview/，拼成一张 <工程>/out/preview.jpg（三列）。
set -e
P="$(cd "${1:?usage: sh preview.sh <工程> t1,t2,…|auto}" && pwd)"; TS=${2:-auto}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
cd "$LIB"
"$PY" "$K/tools/clips.py" "$P"
"$PY" "$K/tools/fonts.py" "$P"
"$PY" "$K/tools/build.py" "$P"
if [ "$TS" = auto ]; then
  TS=$("$PY" -c "
import sys,json; sys.path.insert(0,sys.argv[1]); from lib import load,plan
P,cfg=load(sys.argv[2]); pl=plan(cfg,P); ts=[]
for s in pl['shots']:
    ts+= [s['start']+0.4, min(s['end']-0.2, s['start']+1.4), s['end']-0.1]
print(','.join(sorted({f'{min(pl[\"dur\"]-0.05,t):.2f}' for t in ts}, key=float)))" "$K" "$P")
fi
D="$P/out/preview"; rm -rf "$D"; mkdir -p "$D"
if [ -n "$REMOTE" ]; then sh neo/render/remote.sh "$P" --times "$TS" --stills "$D" >/dev/null
else node core/render/still.mjs "$P" $(echo "$TS" | tr ',' ' ') --out "$D" >/dev/null; fi
FILES=$(for t in $(echo "$TS" | tr ',' ' '); do printf '%s ' "$D/t_$t.jpg"; done)
"$PY" core/render/sheet.py "$P/out/preview.jpg" $FILES --cols 3 --w 640
echo "样张：$P/out/preview.jpg（逐张放大看：铺满不留黑底、UI 读得清、字幕牌不挡主体、强调色只给一个词）"
