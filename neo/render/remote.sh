#!/bin/sh
# Render a page on another machine (a Windows desktop with a GPU, reached over ssh) and bring the result back.
#   sh neo/render/remote.sh <demo> [--out <file.mp4>] [--fps 24] [--workers 4] [--size 1920x1080] [--q k=v]
#   sh neo/render/remote.sh <demo> --times 3,12.5,40 [--stills <dir>]      stills only (t_<time>.jpg)
# The same contract as core/render/video.mjs (window.READY, window.render(t), window.DUR) and the same encode (H.264 CRF 14,
# yuv420p), so the file can go straight into core/render/mux.sh. Default --out: <demo>/out/video.mp4 (an intermediate file).
#
# The render machine needs only Node and ffmpeg on its PATH and Edge (Windows' own; --channel chrome for Chrome): nothing is
# installed there. The first run sends a runtime (core/, the three and playwright-core packages, frames.mjs) to
# $NEO_RENDER_DIR/runtime and sends it again only when it changes; each render sends the demo folder (no out/, audio, video
# or map caches) to its own job folder, renders and encodes there, copies the result back and deletes the job folder.
# Several renders can run at once (each has its own job folder and its own local server port).
# Host: NEO_RENDER_HOST (default: render, an ~/.ssh/config entry). Folder there: NEO_RENDER_DIR (default D:/render/neo-cine).
set -e
export COPYFILE_DISABLE=1                                # no ._ AppleDouble files in the tars (Windows cannot delete "._.")
HOST=${NEO_RENDER_HOST:-render}; RD=${NEO_RENDER_DIR:-D:/render/neo-cine}
R="$(cd "$(dirname "$0")/../.." && pwd)"
DEMO="$(cd "${1:?usage: sh neo/render/remote.sh <demo> [--out f.mp4] [--times a,b] ...}" && pwd)"; shift
[ -f "$DEMO/index.html" ] || { echo "✗ no index.html in $DEMO"; exit 2; }
OUT="$DEMO/out/video.mp4"; FPS=24; WK=4; SIZE=1920x1080; Q=; TIMES=; STILLS="$DEMO/out/stills"; CH=msedge
while [ $# -gt 0 ]; do case "$1" in
  --out) OUT=$2; shift 2;; --fps) FPS=$2; shift 2;; --workers) WK=$2; shift 2;; --size) SIZE=$2; shift 2;;
  --q) Q=$2; shift 2;; --times) TIMES=$2; shift 2;; --stills) STILLS=$2; shift 2;; --channel) CH=$2; shift 2;;
  *) echo "✗ unknown option $1"; exit 2;; esac; done
case "$DEMO" in "$R"/*) PAGE="/${DEMO#"$R"/}/index.html"; SUB="${DEMO#"$R"/}";; *) PAGE=/@film/index.html; SUB=@film;; esac
NAME=$(basename "$(dirname "$DEMO")")-$(basename "$DEMO"); JOB="$RD/jobs/$NAME-$(date +%m%d-%H%M%S)-$$"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# runtime: sent again only when its stamp changes
STAMP=$(cd "$R" && { cat package-lock.json; find core neo/render -type f ! -name '.DS_Store' | LC_ALL=C sort | xargs shasum; } | shasum | cut -c1-16)
HAVE=$(ssh "$HOST" "if (Test-Path $RD/runtime/stamp) { Get-Content $RD/runtime/stamp } else { 'none' }" | tr -d '\r')
if [ "$HAVE" != "$STAMP" ]; then
  echo "== runtime → $HOST:$RD/runtime ($STAMP)"
  ssh "$HOST" "if (Test-Path $RD/runtime) { cmd /c rmdir /s /q \"$(echo "$RD/runtime" | tr / '\\\\')\" }; New-Item -ItemType Directory -Force $RD/runtime | Out-Null"
  (cd "$R" && tar czf - --exclude .DS_Store --exclude 'core/tts/*.onnx' --exclude 'core/tts/*.bin' --exclude 'core/audio/instruments' \
     core neo/render node_modules/three/build node_modules/three/examples/jsm node_modules/three/package.json node_modules/playwright-core) \
    | ssh "$HOST" "tar xzf - -C $RD/runtime"
  ssh "$HOST" "Set-Content -NoNewline -Path $RD/runtime/stamp -Value $STAMP"
fi

echo "== $SUB → $HOST:$JOB"
ssh "$HOST" "New-Item -ItemType Directory -Force $JOB/site/$SUB | Out-Null"
(cd "$DEMO" && tar czf - --exclude ./out --exclude .DS_Store --exclude '*.wav' --exclude '*.mp3' --exclude '*.mp4' --exclude '*.cache' --exclude ./stills .) \
  | ssh "$HOST" "tar xzf - -C $JOB/site/$SUB"
RUN="node $RD/runtime/neo/render/frames.mjs --site $JOB/site --page $PAGE --out $JOB/frames --fps $FPS --size $SIZE --channel $CH"
[ -n "$Q" ] && RUN="$RUN --q '$Q'"
T0=$(date +%s)
if [ -n "$TIMES" ]; then
  ssh "$HOST" "$RUN --times $TIMES --workers 1"
  mkdir -p "$STILLS"; for t in $(echo "$TIMES" | tr ',' ' '); do rm -f "$STILLS/t_$t.jpg"; done     # an old still must not pass for a new one
  ssh "$HOST" "tar cf - -C $JOB/frames ." | tar xf - -C "$STILLS"
  for t in $(echo "$TIMES" | tr ',' ' '); do
    [ -s "$STILLS/t_$t.jpg" ] || { echo "✗ $STILLS/t_$t.jpg did not come back; the frames are still on $HOST at $JOB/frames"; exit 1; }
    echo "$STILLS/t_$t.jpg"; done
else
  ssh "$HOST" "$RUN --workers $WK"
  echo "== encode on $HOST"
  ssh "$HOST" "ffmpeg -y -loglevel error -framerate $FPS -i $JOB/frames/f_%05d.jpg -c:v libx264 -preset medium -crf 14 -pix_fmt yuv420p $JOB/video.mp4; if (-not \$?) { exit 1 }"
  # an `a && b` list does not stop `set -e` when a fails: check the copy explicitly, retry it, and keep the job folder on failure
  mkdir -p "$(dirname "$OUT")"; rm -f "$OUT.part"; ok=
  for k in 1 2 3; do if scp -q "$HOST:$JOB/video.mp4" "$OUT.part" && [ -s "$OUT.part" ]; then ok=1; break; fi; echo "  copy failed (try $k), retrying"; sleep 5; done
  [ -n "$ok" ] || { rm -f "$OUT.part"; echo "✗ could not copy the video back; it is still on $HOST at $JOB/video.mp4"; exit 1; }
  mv "$OUT.part" "$OUT"
  echo "done $OUT $(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of default=nk=1:nw=1 "$OUT") frames $(( $(date +%s) - T0 ))s"
fi
ssh "$HOST" "cmd /c rmdir /s /q \"$(echo "$JOB" | tr / '\\\\')\""
