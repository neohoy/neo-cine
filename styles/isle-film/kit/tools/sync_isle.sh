#!/bin/sh
# 把 NEO-Isle（方寸之境）的引擎同步进 kit/isle-core/：方寸影像出片只用这一份固定版本的副本，运行时不去读别的目录。
#   sh styles/isle-film/kit/tools/sync_isle.sh                  依次找 $NEO_ISLE_HOME、~/.claude/skills/neo-isle、~/neo-isle
#   sh styles/isle-film/kit/tools/sync_isle.sh <neo-isle 目录>   指定一个 NEO-Isle 的克隆或已安装的技能
#   sh styles/isle-film/kit/tools/sync_isle.sh --check [目录]    只比较，不复制
# 复制 core/fangcun.js、core/template.html、core/VERSION 和 LICENSE（MIT），在 isle-core/SOURCE 里记下版本和来源提交。
# 引擎要有影片模式（1.2.0 起：window.FANGCUN.frame）；没有就停。这和库对待上游 core/ 的办法一样：副本不在这里改，
# 要改就去 NEO-Isle 里改、升版本，再同步过来；同步后重渲示范片的几张静帧（demo/build.sh 前的 preview.sh）确认没变样。
set -e
K="$(cd "$(dirname "$0")/.." && pwd)"; DST="$K/isle-core"
CHECK=; [ "$1" = --check ] && { CHECK=1; shift; }
SRC=${1:-}
if [ -z "$SRC" ]; then
  for d in "$NEO_ISLE_HOME" "$HOME/.claude/skills/neo-isle" "$HOME/neo-isle"; do
    [ -n "$d" ] && [ -f "$d/core/fangcun.js" ] && { SRC=$d; break; }
  done
fi
[ -n "$SRC" ] && [ -f "$SRC/core/fangcun.js" ] || { echo "✗ 找不到 NEO-Isle：把它的目录作为参数传进来（里面要有 core/fangcun.js）"; exit 1; }
SRC="$(cd "$SRC" && pwd)"
grep -q 'FANGCUN' "$SRC/core/fangcun.js" || { echo "✗ 这份 NEO-Isle 的引擎（$(cat "$SRC/core/VERSION" 2>/dev/null)）没有影片模式：要 1.2.0 或更新的"; exit 1; }
OLD=$(cat "$DST/VERSION" 2>/dev/null || echo 无); NEW=$(cat "$SRC/core/VERSION")
COMMIT=$(git -C "$SRC" rev-parse --short HEAD 2>/dev/null || echo 未知)
[ -n "$(git -C "$SRC" status --porcelain core LICENSE 2>/dev/null)" ] && COMMIT="$COMMIT（加上还没提交的改动）"
echo "NEO-Isle 引擎：副本 $OLD → 来源 $NEW（提交 $COMMIT）"
for f in fangcun.js template.html VERSION; do
  if cmp -s "$SRC/core/$f" "$DST/$f"; then echo "  = $f"; else echo "  ≠ $f"; fi
done
cmp -s "$SRC/LICENSE" "$DST/LICENSE" && echo "  = LICENSE" || echo "  ≠ LICENSE"
[ -n "$CHECK" ] && exit 0
mkdir -p "$DST"
cp "$SRC/core/fangcun.js" "$SRC/core/template.html" "$SRC/core/VERSION" "$DST/"
cp "$SRC/LICENSE" "$DST/LICENSE"
printf 'NEO-Isle（方寸之境）引擎 %s，来自 https://github.com/neohoy/neo-isle 的提交 %s（MIT，© 2026 NEO造物集 (neohoy)）。\n由 kit/tools/sync_isle.sh 同步；不要在这里改。\n' "$NEW" "$COMMIT" > "$DST/SOURCE"
echo "done: $DST"
