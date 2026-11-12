#!/bin/sh
# The fonts this page uses (SIL Open Font License 1.1, named in ../CREDITS) are not kept in git. This fetches each one into
# fonts/: Source Han Sans CN from Adobe's 2.004R tag, Barlow Semi Condensed from google/fonts pinned to one commit.
# Files already there are kept; FORCE=1 fetches them again. build.sh runs it first.
set -e
D=$(cd "$(dirname "$0")/.." && pwd)/fonts; mkdir -p "$D"
GF=https://raw.githubusercontent.com/google/fonts/86aced91de05cd4f96a06838124cca45be337b2b
SHS=https://raw.githubusercontent.com/adobe-fonts/source-han-sans/2.004R/SubsetOTF/CN
get() {
  [ -s "$D/$1" ] && [ -z "$FORCE" ] && return 0
  curl -fsSL -g --retry 2 -o "$D/download.part" "$2" ||
    { rm -f "$D/download.part"; echo "✗ could not fetch fonts/$1 from $2 (offline, or behind a proxy? curl uses https_proxy)" >&2; exit 1; }
  mv "$D/download.part" "$D/$1"; echo "fonts/$1"
}
get SourceHanSansCN-Bold.otf "$SHS/SourceHanSansCN-Bold.otf"
get SourceHanSansCN-Heavy.otf "$SHS/SourceHanSansCN-Heavy.otf"
get BarlowSemiCondensed-SemiBold.ttf "$GF/ofl/barlowsemicondensed/BarlowSemiCondensed-SemiBold.ttf"
get BarlowSemiCondensed-Medium.ttf "$GF/ofl/barlowsemicondensed/BarlowSemiCondensed-Medium.ttf"
