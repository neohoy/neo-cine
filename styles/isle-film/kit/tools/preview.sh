#!/bin/sh
# 预览静帧（制作手册第 5 步：每改一次镜头表都看）：
#   sh styles/isle-film/kit/tools/preview.sh <工程> 0,4.5,9.8,16          片中秒数，逗号分开
#   sh styles/isle-film/kit/tools/preview.sh <工程> auto                  每个镜头取三个时刻：开头、中间、结尾前；奇事前后各一张
#   REMOTE=1 sh styles/isle-film/kit/tools/preview.sh <工程> auto         在渲染台式机上截（neo/render/remote.sh --times）
# 会先跑 build.mjs 和 fonts.py。截图在 <工程>/out/preview/，拼成一张 <工程>/out/preview.jpg（三列），打开逐张看。
# WebGL 很重：一张静帧要先把这一境整个建出来（每个外观一次），十几秒到半分钟；之后每张一两秒。
set -e
P="$(cd "${1:?usage: sh preview.sh <工程> t1,t2,…|auto}" && pwd)"; TS=${2:-auto}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
cd "$LIB"
node "$K/tools/build.mjs" "$P" >/dev/null
"$PY" "$K/tools/fonts.py" "$P" >/dev/null
if [ "$TS" = auto ]; then
  TS=$(node --input-type=module -e "
    import fs from 'fs'; import { makePlan } from '$K/page/plan.js';
    const p = makePlan(JSON.parse(fs.readFileSync('$P/film.json', 'utf8'))), ts = [];
    for (const s of p.shots) { ts.push(s.start + Math.min(0.4, s.dur / 4), s.start + s.dur / 2, s.end - 0.2); if (s.wonder != null) ts.push(s.start + s.wonder - 0.6, s.start + s.wonder + 1.2); }
    if (p.end) ts.push(p.body + p.end.dur / 2);
    console.log([...new Set(ts.sort((a, b) => a - b).map(t => Math.min(p.dur - 0.05, t).toFixed(2)))].join(','));")
fi
D="$P/out/preview"; rm -rf "$D"; mkdir -p "$D"
if [ -n "$REMOTE" ]; then sh neo/render/remote.sh "$P" --times "$TS" --stills "$D" >/dev/null
else node core/render/still.mjs "$P" $(echo "$TS" | tr ',' ' ') --out "$D" >/dev/null; fi
FILES=$(for t in $(echo "$TS" | tr ',' ' '); do printf '%s ' "$D/t_$t.jpg"; done)
"$PY" core/render/sheet.py "$P/out/preview.jpg" $FILES --cols 3 --w 640
