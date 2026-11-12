#!/bin/sh
# Rebuild "Shenzhen, Unrolled" from scratch: sh styles/scroll-map/demo/build.sh v002   (runs from the repo root or any directory)
# Every build is a new version: the film is written to styles/scroll-map/scroll-map-<ver>.mp4 with poster-<ver>.jpg beside it,
# and an existing version is never overwritten. The gallery's scroll-map.mp4 and poster.jpg are copies of the version you choose:
# this script only makes them when they are missing.
set -e
VER=${1:?usage: sh build.sh v001   (take the next free number: ls styles/scroll-map/*.mp4)}
sh "$(dirname "$0")/tools/fonts.sh"   # fonts: not in git (CREDITS names them) → fonts/
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../scroll-map-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
[ ! -e "$OUT" ] || { echo "✗ $OUT exists: take the next number"; exit 1; }
cd "$R"
if [ ! -s "$D/data/coast.json" ] || [ ! -s "$D/data/futian.json" ]; then
  echo "== 0. map data from OpenStreetMap (Overpass API; raw answers cached in data/*.cache/)"
  $PY neo/geo/osm.py --bbox 113.74,22.40,114.66,22.74 --layers land,peaks,water,rivers,wood,rail,park,places,roads --tol 8 --min-area 4000 --out "$D/data/coast.json"
  $PY neo/geo/osm.py --bbox 114.025,22.515,114.09,22.562 --origin 114.2,22.57 --layers buildings,streets --tol 1.5 --out "$D/data/futian.json"
fi
echo "== 1. export events (roll, brush, peaks, slips, cinnabar, tower tiers, title, seal)"
node core/render/events.mjs "$D"
echo "== 2. score, foley and ambience (all synthesized; needs the music tier: setup.sh deps music) → out/mix.wav"
$PY "$D/mix.py"
echo "== 3. render the picture (24 fps, 4 workers)"
node core/render/video.mjs "$D" --fps 24 --workers 4 --out "$D/out/video.mp4"
echo "== 4. mux (two-pass loudnorm -14 LUFS, light grain, BT.709 limited range)"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 1
echo "== 5. reading-time check, poster and style frame"
node core/render/readcheck.mjs "$D"
node core/render/still.mjs "$D" 47 --prefix poster_ --out "$D/out/stills"
node core/render/still.mjs "$D" 36 --prefix sf_ --out "$D/out/stills"
cp "$D/out/stills/poster_47.jpg" "$POSTER"
[ -e "$D/stills/styleframe.jpg" ] || cp "$D/out/stills/sf_36.jpg" "$D/stills/styleframe.jpg"
[ -e "$D/../scroll-map.mp4" ] || cp "$OUT" "$D/../scroll-map.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
