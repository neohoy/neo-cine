#!/bin/sh
# Rebuild "Shenzhen, Folded" from scratch: sh styles/folding-city/demo/build.sh (runs from the repo root or any directory)
# The film is written to styles/folding-city/folding-city.mp4. An existing film is never overwritten:
# pass OUT=<file.mp4> for another name (e.g. a version number), or FORCE=1 to replace it.
set -e
sh "$(dirname "$0")/tools/fonts.sh"   # fonts: not in git (CREDITS names them) → fonts/
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT=${OUT:-$D/../folding-city.mp4}
[ ! -e "$OUT" ] || [ -n "$FORCE" ] || { echo "✗ $OUT exists. OUT=<file.mp4> for another name, or FORCE=1 to replace it."; exit 1; }
cd "$R"
echo "== 1. export events (camera moves and landings, door and screen folds, plates sliding in and standing up)"
node core/render/events.mjs "$D"
echo "== 2. score, sound effects and ambience (all synthesized) → out/mix.wav"
$PY "$D/mix.py"
echo "== 3. render the picture (24 fps, 3 workers)"
node core/render/video.mjs "$D" --fps 24 --workers 3 --out "$D/out/video.mp4"
echo "== 4. mux (two-pass loudnorm -14 LUFS, no grain, BT.709 limited range)"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 0
echo "== 5. reading-time check, poster and style frame"
node core/render/readcheck.mjs "$D"
node core/render/still.mjs "$D" 5.9 --prefix poster_ --out "$D/out/stills"
node core/render/still.mjs "$D" 14.2 --prefix sf_ --out "$D/out/stills"
cp "$D/out/stills/sf_14.2.jpg" "$D/stills/styleframe.jpg"
[ -e "$D/../poster.jpg" ] && [ -z "$FORCE" ] || cp "$D/out/stills/poster_5.9.jpg" "$D/../poster.jpg"
echo "done: $OUT"
