#!/bin/sh
# Publish the films: refresh the gallery data, make the 720p web cuts, upload what the releases lack.
# NEO-Cine's own, in place of upstream's tools/publish.sh and tools/release.py: those also repack upstream's
# asset packs and rewrite tools/assets.json, which is a mirrored file here (UPSTREAM.md).
#   sh neo/publish.sh            build, cut, then upload every film (release "films") and web cut (release "web") the release lacks
#   sh neo/publish.sh --check    list what would be uploaded and exit 1 if anything is missing or different; changes nothing
# A file that is already on the release with another size is a new version of a published film: it is replaced only
# with FORCE=1, after the old film has been backed up under a version number (MAINTAINING.md, "Revise a style").
# Needs the GitHub CLI (gh auth login). After it passes: git add -A && git commit -m "…" && git push
set -e
cd "$(dirname "$0")/.."
REPO=${NEO_CINE_GH_REPO:-neohoy/neo-cine}
CHECK=""; [ "$1" = "--check" ] && CHECK=1
if [ -z "$CHECK" ]; then
  python3 styleboard/build.py
  sh tools/web_cuts.sh
fi
gh auth status >/dev/null 2>&1 || { echo "✗ the GitHub CLI is not signed in (gh auth login)"; exit 1; }

todo=0; fail=0
remote_size() { gh release view "$1" --repo "$REPO" --json assets -q ".assets[] | select(.name == \"$2\") | .size" 2>/dev/null || true; }
one() {   # one <tag> <release title> <file>
  [ -f "$3" ] || return 0
  name=$(basename "$3"); size=$(wc -c < "$3" | tr -d ' '); have=$(remote_size "$1" "$name")
  if [ "$have" = "$size" ]; then echo "  = $1/$name"; return 0; fi
  todo=1
  if [ -n "$CHECK" ]; then echo "  ↑ $1/$name ($size bytes here, ${have:-nothing} on the release)"; return 0; fi
  if [ -n "$have" ] && [ -z "$FORCE" ]; then
    echo "✗ $1/$name is already published with another size ($have bytes there, $size here). Back up the old film, then FORCE=1 to replace it."; fail=1; return 0
  fi
  gh release view "$1" --repo "$REPO" >/dev/null 2>&1 || gh release create "$1" --repo "$REPO" --title "$2" --notes "$2" >/dev/null
  gh release upload "$1" "$3" --repo "$REPO" --clobber && echo "  ↑ $1/$name uploaded ($size bytes)"
}
for f in styles/*/STYLE.md; do
  s=$(basename "$(dirname "$f")")
  one films "Demo films" "styles/$s/$s.mp4"
  one web "Web cuts (720p, copied into the gallery)" ".release/web/$s.mp4"
done
[ "$fail" = 0 ] || exit 1
if [ -n "$CHECK" ]; then
  [ "$todo" = 0 ] && echo "✓ the releases hold every film and web cut on this machine" || exit 1
else
  echo "Ready. Next: git add -A && git commit -m \"…\" && git push   (the gallery is rebuilt by the push)"
fi
