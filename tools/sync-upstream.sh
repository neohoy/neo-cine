#!/bin/sh
# Compare NEO-Cine with a newer Lemo-Opuscar (the upstream this library is built on), and optionally copy the mirror over.
#   sh tools/sync-upstream.sh [<upstream clone>]            report only
#   sh tools/sync-upstream.sh [<upstream clone>] --apply    also copy the mirrored files and record the new commit
# Without <upstream clone>, upstream is cloned into a temporary folder (needs network).
#
# What it does:
#   1. checks that our mirrored files still equal upstream at the recorded commit (core/ must never be edited here);
#   2. lists what changed upstream since then: mirrored files (safe to copy) and the files our guides are adapted from
#      (to review by hand: their changes are never applied automatically);
#   3. with --apply: copies the mirrored files from the new upstream commit, removes those upstream deleted,
#      and writes the new commit into UPSTREAM.md.
# After --apply: sh plugin/skills/neo-cine/scripts/setup.sh deps, then rebuild the Folding City stills as a regression
# check (MAINTAINING.md, "Following upstream").
set -e
UPSTREAM_URL=https://github.com/lemomo-ai/lemo-opuscar.git
# Unmodified copies of upstream files
MIRROR="core package.json package-lock.json requirements.txt requirements-voice.txt requirements-music.txt tools/fetch.sh tools/assets.json"
# Upstream files that ours are adapted from (ours live under different names where the brand is in the path)
ADAPTED="AGENTS.md DIRECTOR.md TECHNIQUE.md MY-STYLES.md MAINTAINING.md plugin/skills/lemo-opuscar styles/_template LICENSE"

R=$(cd "$(dirname "$0")/.." && pwd -P); cd "$R"
APPLY=""; UP=""
for a in "$@"; do case $a in --apply) APPLY=1 ;; *) UP=$a ;; esac; done
OLD=$(sed -n 's/^Upstream commit: `\([0-9a-f]\{40\}\)`.*/\1/p' UPSTREAM.md | head -1)
[ -n "$OLD" ] || { echo "✗ UPSTREAM.md has no 'Upstream commit: \`<40 hex>\`' line"; exit 1; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
if [ -z "$UP" ]; then
  echo "↓ cloning upstream into a temporary folder"
  git clone --quiet --filter=blob:none --no-checkout "$UPSTREAM_URL" "$TMP/up" || { echo "✗ could not clone $UPSTREAM_URL (offline?)"; exit 1; }
  UP=$TMP/up; NEW=$(git -C "$UP" rev-parse origin/HEAD 2>/dev/null || git -C "$UP" rev-parse HEAD)
else
  [ -d "$UP/.git" ] || [ -f "$UP/.git" ] || { echo "✗ $UP is not a git clone"; exit 1; }
  NEW=$(git -C "$UP" rev-parse HEAD)
fi
git -C "$UP" cat-file -e "$OLD^{commit}" 2>/dev/null || { echo "✗ upstream clone does not have the recorded commit $OLD (shallow clone? run: git -C \"$UP\" fetch --unshallow)"; exit 1; }
echo "recorded upstream commit: $OLD"
echo "newest upstream commit:   $NEW  ($(git -C "$UP" log -1 --format=%cd --date=short "$NEW"))"

# 1. Is our mirror still what upstream had?
mkdir -p "$TMP/old"
# shellcheck disable=SC2086
git -C "$UP" archive "$OLD" $MIRROR | tar -x -C "$TMP/old"
dirty=""
for p in $MIRROR; do
  if [ -d "$TMP/old/$p" ]; then
    (cd "$TMP/old" && find "$p" -type f) | while IFS= read -r f; do cmp -s "$TMP/old/$f" "$R/$f" || echo "$f"; done > "$TMP/d.$$"
    [ -s "$TMP/d.$$" ] && dirty="$dirty$(cat "$TMP/d.$$")
"
  else cmp -s "$TMP/old/$p" "$R/$p" || dirty="$dirty$p
"
  fi
done
if [ -n "$dirty" ]; then
  echo; echo "! these mirrored files differ from upstream at the recorded commit (edited here, or missing):"; printf '%s' "$dirty" | sed 's/^/    /'
  echo "  Move local changes into neo/ before syncing: --apply would overwrite them."
else echo "✓ mirror intact: every mirrored file equals upstream at the recorded commit"; fi

if [ "$OLD" = "$NEW" ]; then echo "✓ already at the newest upstream commit: nothing to sync"; exit 0; fi

# 2. What changed upstream
echo; echo "== commits since the recorded one: $(git -C "$UP" rev-list --count "$OLD..$NEW")"
git -C "$UP" log --format='  %cd  %s' --date=short "$OLD..$NEW" | head -40
echo; echo "== mirrored files that changed (copied by --apply)"
# shellcheck disable=SC2086
git -C "$UP" diff --stat "$OLD" "$NEW" -- $MIRROR | tail -40
echo; echo "== files our guides and skill are adapted from (review by hand, then edit ours and their .zh-CN.md)"
# shellcheck disable=SC2086
git -C "$UP" diff --stat "$OLD" "$NEW" -- $ADAPTED | tail -40
echo "  full text:  git -C \"$UP\" diff $OLD $NEW -- <file>"

# 3. Copy the mirror
if [ -z "$APPLY" ]; then echo; echo "report only. To copy the mirrored files: add --apply"; exit 0; fi
[ -z "$dirty" ] || { echo "✗ not applying: the mirror has local changes (see above)"; exit 1; }
# shellcheck disable=SC2086
git -C "$UP" archive "$NEW" $MIRROR | tar -x -C "$R"
# shellcheck disable=SC2086
git -C "$UP" diff --name-only --diff-filter=D "$OLD" "$NEW" -- $MIRROR | while IFS= read -r f; do rm -f "$R/$f" && echo "  removed (deleted upstream): $f"; done
git -C "$UP" show "$NEW:LICENSE" > "$R/LICENSES/lemo-opuscar-MIT.txt"
D=$(git -C "$UP" log -1 --format=%cd --date=short "$NEW")
sed -i.bak "s/^Upstream commit: \`[0-9a-f]\{40\}\`.*/Upstream commit: \`$NEW\` ($D)/" UPSTREAM.md UPSTREAM.zh-CN.md && rm -f UPSTREAM.md.bak UPSTREAM.zh-CN.md.bak
echo "✓ mirror copied; UPSTREAM.md now records $NEW"
echo "next: review the adapted files listed above, run 'sh plugin/skills/neo-cine/scripts/setup.sh deps', rebuild the demo stills"
