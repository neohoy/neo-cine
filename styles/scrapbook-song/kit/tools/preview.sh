#!/bin/sh
# 预览静帧（制作手册第 6 步，每个镜头写完都要看）：
#   sh styles/scrapbook-song/kit/tools/preview.sh <工程> 12.4,15.0,18.2            时间是全曲时间（秒），和镜头脚本里一致
#   REMOTE=1 sh styles/scrapbook-song/kit/tools/preview.sh <工程> 12.4,15.0        在渲染台式机上截（neo/render/remote.sh --times）
# 先跑过 tools/build.py（要预览的镜头）和 tools/fonts.py。截图在 <工程>/out/preview/，拼成一张 <工程>/out/preview.jpg，打开逐张看。
set -e
P="$(cd "${1:?usage: sh preview.sh <工程> t1,t2,…}" && pwd)"; TS=${2:?usage: sh preview.sh <工程> t1,t2,…}
K="$(cd "$(dirname "$0")/.." && pwd)"; LIB=${LIB:-$(cd "$K/../../.." && pwd)}
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
# 全曲时间 → 片中时间（manifest 的 t0）
FT=$("$PY" -c "import json,sys;m=json.load(open(sys.argv[1]));print(','.join(f'{float(t)-m[\"t0\"]:.3f}' for t in sys.argv[2].split(',')))" "$P/scenes/manifest.json" "$TS")
D="$P/out/preview"; rm -rf "$D"; mkdir -p "$D"; cd "$LIB"
if [ -n "$REMOTE" ]; then sh neo/render/remote.sh "$P" --times "$FT" --stills "$D" >/dev/null
else node core/render/still.mjs "$P" $(echo "$FT" | tr ',' ' ') --out "$D" >/dev/null; fi
FILES=$(for t in $(echo "$FT" | tr ',' ' '); do printf '%s ' "$D/t_$t.jpg"; done)
"$PY" core/render/sheet.py "$P/out/preview.jpg" $FILES --cols 3 --w 640
