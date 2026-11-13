#!/bin/sh
# Rebuild "From Thirteen to Fifty" from scratch: sh styles/atlas-scroll/demo/build.sh v002   (runs from the repo root or any directory)
# Every build is a new version: the film is written to styles/atlas-scroll/atlas-scroll-<ver>.mp4 with poster-<ver>.jpg beside it,
# and an existing version is never overwritten. The gallery's atlas-scroll.mp4 and poster.jpg are copies of the version you choose:
# this script only makes them when they are missing.
set -e
VER=${1:?usage: sh build.sh v001   (take the next free number: ls styles/atlas-scroll/*.mp4)}
sh "$(dirname "$0")/tools/fonts.sh"   # the Chinese font is not in git (CREDITS names it) → fonts/
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"; PY="$R/.venv/bin/python"
OUT="$D/../atlas-scroll-$VER.mp4"; POSTER="$D/../poster-$VER.jpg"
[ ! -e "$OUT" ] || { echo "✗ $OUT exists: take the next number"; exit 1; }
cd "$R"
P="--origin=-96,37.5 --proj albers:29.5,45.5"
lake() { for n in "$@"; do printf 'relation["natural"="water"]["name"="%s"];' "$n"; done; }
if [ ! -s "$D/data/us.json" ]; then
  echo "== 0a. borders, railways and trails by year from OpenHistoricalMap → data/history.json → data/us.json"
  [ -s "$D/data/history.json" ] || $PY neo/geo/ohm.py --bbox=-128,22,-64,52 $P --layers admin,rail,named --levels 2,4 --before 1960 \
    --names 'Oregon Trail|National Road|^Erie Canal$|Santa Fe Trail|California Trail' --tol 900 --min-len 4000 --out "$D/data/history.json"
  $PY "$D/tools/prep.py"
fi
if [ ! -s "$D/data/land.json" ] || [ ! -s "$D/data/water.json" ] || [ ! -s "$D/data/peaks-east.json" ]; then
  echo "== 0b. coast, rivers, lakes and peaks from OpenStreetMap (several Overpass queries; the lakes and peaks are slow)"
  $PY neo/geo/osm.py --bbox=-128,22,-64,52 $P --coarse-land --layers land --tol 900 --min-area 4e7 --out "$D/data/land.json"
  $PY neo/geo/osm.py --bbox=-128,22,-64,52 $P --layers rivers --tol 700 --out "$D/data/water.json" \
    --filter 'rivers=["name"~"^(Mississippi River|Missouri River|Ohio River|Colorado River|Columbia River|Rio Grande|Arkansas River|Snake River|Platte River|North Platte River|Tennessee River|Hudson River|Yellowstone River|Sacramento River|Potomac River|Illinois River|Saint Lawrence River)$"]'
  $PY neo/geo/osm.py --bbox=-128,22,-64,52 $P --layers water --tol 700 --min-area 1.5e9 --query "water=$(lake 'Lake Superior' 'Lake Michigan')" --out "$D/data/lakes-a.json"
  $PY neo/geo/osm.py --bbox=-128,22,-64,52 $P --layers water --tol 700 --min-area 1.5e9 --query "water=$(lake 'Lake Huron' 'Lake Erie')" --out "$D/data/lakes-b.json"
  $PY neo/geo/osm.py --bbox=-128,22,-64,52 $P --layers water --tol 700 --min-area 1.5e9 --query "water=$(lake 'Lake Ontario' 'Great Salt Lake')" --out "$D/data/lakes-c.json"
  $PY neo/geo/osm.py --bbox=-125,31,-102,49 $P --layers peaks --filter 'peaks=(if: number(t["ele"]) > 3300)' --out "$D/data/peaks-west.json"
  $PY neo/geo/osm.py --bbox=-85,34.5,-77.5,39.5 $P --layers peaks --filter 'peaks=(if: number(t["ele"]) > 1150)' --out "$D/data/peaks-east.json"
fi
echo "== 1. export events (roll, one note per state, wagon, train, whistle, spike, stamps, title)"
node core/render/events.mjs "$D"
echo "== 2. score, foley and ambience (all synthesized; needs the music tier: setup.sh deps music) → out/mix.wav"
$PY "$D/mix.py"
echo "== 3. render the picture (24 fps, 4 workers)"
if [ "$RENDER" = remote ]; then sh neo/render/remote.sh "$D" --out "$D/out/video.mp4" --workers 4   # RENDER=remote: render on the desktop
else node core/render/video.mjs "$D" --fps 24 --workers 4 --out "$D/out/video.mp4"; fi
echo "== 4. mux (two-pass loudnorm -14 LUFS, light grain, BT.709 limited range)"
LEMO_COLOR=bt709 sh core/render/mux.sh "$D/out/video.mp4" "$D/out/mix.wav" "$OUT" 24 1
echo "== 5. reading-time check, poster and style frame"
node core/render/readcheck.mjs "$D"
node core/render/still.mjs "$D" 53 --prefix poster_ --out "$D/out/stills"
node core/render/still.mjs "$D" 31.3 --prefix sf_ --out "$D/out/stills"
cp "$D/out/stills/poster_53.jpg" "$POSTER"
[ -e "$D/stills/styleframe.jpg" ] || cp "$D/out/stills/sf_31.3.jpg" "$D/stills/styleframe.jpg"
[ -e "$D/../atlas-scroll.mp4" ] || cp "$OUT" "$D/../atlas-scroll.mp4"
[ -e "$D/../poster.jpg" ] || cp "$POSTER" "$D/../poster.jpg"
echo "done: $OUT"
