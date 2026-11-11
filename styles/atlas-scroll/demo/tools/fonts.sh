#!/bin/sh
# The Chinese font this page uses (SIL Open Font License 1.1, named in ../CREDITS) is not kept in git. This fetches it into
# fonts/ from google/fonts pinned to one commit. The Latin face, IM Fell English, ships with the library (core/fonts/).
# A file already there is kept; FORCE=1 fetches it again. build.sh runs it first.
set -e
D=$(cd "$(dirname "$0")/.." && pwd)/fonts; mkdir -p "$D"
GF=https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b
get() {
  [ -s "$D/$1" ] && [ -z "$FORCE" ] && return 0
  curl -fsSL -g --retry 2 -o "$D/download.part" "$2" ||
    { rm -f "$D/download.part"; echo "✗ could not fetch fonts/$1 from $2 (offline, or behind a proxy? curl uses https_proxy)" >&2; exit 1; }
  mv "$D/download.part" "$D/$1"; echo "fonts/$1"
}
get NotoSerifSC.ttf "$GF/ofl/notoserifsc/NotoSerifSC[wght].ttf"
