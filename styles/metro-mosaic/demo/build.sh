#!/bin/sh
# Rebuild "Tile by Tile" (一片一片) from scratch: sh styles/metro-mosaic/demo/build.sh v002   (runs from the repo root or any directory)
# Every build is a new version: the film is written to styles/metro-mosaic/metro-mosaic-<ver>.mp4 with poster-<ver>.jpg beside it,
# and an existing version is never overwritten. The gallery's metro-mosaic.mp4 and poster.jpg are copies of the version you choose:
# this script only makes them when they are missing.
# The picture renders here with core/render/video.mjs; RENDER=remote renders it on the render desktop (neo/render/remote.sh, 3 workers).
set -e
VER=${1:?usage: sh build.sh v001   (take the next free number: ls styles/metro-mosaic/*.mp4)}
sh "$(dirname "$0")/tools/fonts.sh"   # fonts: not in git (CREDITS names them) → fonts/
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../metro-mosaic-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
[ ! -e "$OUT" ] || { echo "✗ $OUT exists: take the next number"; exit 1; }
cd "$R"
if [ ! -s "$D/data/metro.json" ] || [ ! -s "$D/data/coast.json" ]; then
  echo "== 0. map data from OpenStreetMap (Overpass API; raw answers cached in data/*.cache/)"
  $PY neo/geo/routes.py --bbox 113.75,22.45,114.40,22.85 --route subway --network '深圳地铁' --out "$D/data/metro.json"
  $PY neo/geo/osm.py --bbox 113.75,22.45,114.40,22.85 --origin 114.075,22.65 --layers land,water --tol 20 --min-area 300000 --out "$D/data/coast.json"
fi
if [ ! -s "$D/data/mosaic.json" ]; then
  echo "== 0b. cut the map into tiles (phases and their opening dates: tools/prep.py, sources in FACTS.md)"
  $PY "$D/tools/prep.py"
fi
echo "== 1. export events (every tile, station tile, plaque, the train)"
node core/render/events.mjs "$D"
echo "== 2. score, foley and station ambience (all synthesized in numpy) → out/mix.wav"
$PY "$D/mix.py"
echo "== 3. render the picture (24 fps)"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --out "$D/out/video.mp4" --workers 3
else node core/render/video.mjs "$D" --fps 24 --workers 3 --out "$D/out/video.mp4"; fi
echo "== 4. mux (two-pass loudnorm -14 LUFS, no grain: the tiles carry their own texture, BT.709 limited range)"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 0
echo "== 5. reading-time check, poster and style frame"
node core/render/readcheck.mjs "$D"
node core/render/still.mjs "$D" 48.5 --prefix poster_ --out "$D/out/stills"
node core/render/still.mjs "$D" 9 --prefix sf_ --out "$D/out/stills"
cp "$D/out/stills/poster_48.5.jpg" "$POSTER"
[ -e "$D/stills/styleframe.jpg" ] || { mkdir -p "$D/stills"; cp "$D/out/stills/sf_9.jpg" "$D/stills/styleframe.jpg"; }
[ -e "$D/../metro-mosaic.mp4" ] || cp "$OUT" "$D/../metro-mosaic.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
