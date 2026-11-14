#!/bin/sh
# 预览静帧（制作手册第 6 步：每改一次镜头列表都看）：
#   sh styles/tech-launch/kit/tools/preview.sh <工程> 0,2.5,6.2,8.6            片中秒数，逗号分开
#   sh styles/tech-launch/kit/tools/preview.sh <工程> auto                      每个镜头取四个时刻：入场、标题落定、抬起后、换页前
#   REMOTE=1 sh styles/tech-launch/kit/tools/preview.sh <工程> auto             在渲染台式机上截（neo/render/remote.sh --times）
# 会先跑 build.mjs 和 fonts.py。截图在 <工程>/out/preview/，拼成一张 <工程>/out/preview.jpg（三列），打开逐张看。
set -e
P="$(cd "${1:?usage: sh preview.sh <工程> t1,t2,…|auto}" && pwd)"; TS=${2:-auto}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
cd "$LIB"
echo "生成页面、切字体（第一次会下载约 20 MB 的字体，要一两分钟）……"
node "$K/tools/build.mjs" "$P"
"$PY" "$K/tools/fonts.py" "$P"
if [ "$TS" = auto ]; then
  # 每个镜头：开始后 0.4 秒（切点刚过）、1.6 秒（标题落定）、抬起后 1.8 秒（标注卡在场）、结束前 0.15 秒（离开中）
  TS=$(node -e "
    const fs=require('fs');const h=fs.readFileSync(process.argv[1],'utf8');
    const d=JSON.parse(h.match(/<script id=\"pp-data\" type=\"application\/json\">([\s\S]*?)<\/script>/)[1]);
    const ts=[];for(const s of d.plan.shots){const a=s.start,b=s.end;ts.push(a+0.4,a+1.6);if(s.ev.lift)ts.push(s.ev.lift[0]+1.8);ts.push(b-0.15);}
    console.log([...new Set(ts.map(t=>Math.min(d.plan.dur-0.05,t).toFixed(2)))].join(','));" "$P/index.html")
fi
D="$P/out/preview"; rm -rf "$D"; mkdir -p "$D"
if [ -n "$REMOTE" ]; then sh neo/render/remote.sh "$P" --times "$TS" --stills "$D" >/dev/null
else node core/render/still.mjs "$P" $(echo "$TS" | tr ',' ' ') --out "$D" >/dev/null; fi
FILES=$(for t in $(echo "$TS" | tr ',' ' '); do printf '%s ' "$D/t_$t.jpg"; done)
"$PY" core/render/sheet.py "$P/out/preview.jpg" $FILES --cols 3 --w 640
