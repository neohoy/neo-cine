# Upstream

*中文版：[UPSTREAM.zh-CN.md](UPSTREAM.zh-CN.md)*

NEO-Cine is built on the framework of [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) (MIT, © 2026 LemoLab): its page contract, its production tools, its style-folder format and its way of directing a film with guides instead of parameters. The styles are NEO's own, made one by one.

Upstream commit: `9eb7739a0fca4c6990fe966cb8b87b1930f7193a` (2026-11-10)

## What is mirrored (never edit these here)

Unmodified copies of the upstream files at that commit. `sh tools/sync-upstream.sh` checks that they are still identical, and `--apply` replaces them with a newer upstream version.

| Path | What it is |
|---|---|
| `core/` | the production tools: page contract, rendering, mux, reading check, sfx, sampler, TTS |
| `package.json`, `package-lock.json` | Node packages the tools need (the package name stays upstream's) |
| `requirements.txt`, `requirements-voice.txt`, `requirements-music.txt` | Python package tiers |
| `tools/fetch.sh`, `tools/assets.json` | fetches big assets (instrument libraries, voice models) from upstream's releases |
| `LICENSES/lemo-opuscar-MIT.txt` | upstream's `LICENSE` |

Because `core/` is unmodified, the names inside it stay upstream's: `LEMO_ANGLE`, `LEMO_COLOR` and the other `LEMO_*` environment variables, and the marker files `.lemo-ok`, `.lemo-<tier>` and `.lemo-deps.lock`. NEO's own tools go in `neo/`.

## What is adapted (ours, kept close to upstream)

Same structure, headings and numbering as the upstream file, so a later upstream change can be read as a diff and carried over by hand.

| Ours | Adapted from | What changed |
|---|---|---|
| `AGENTS.md`, `DIRECTOR.md`, `TECHNIQUE.md`, `MY-STYLES.md`, `MAINTAINING.md` | the same files upstream | brand and paths; the style catalogue, gallery and release tooling replaced by NEO-Cine's own style list; the versioned-deliverables rule and the BT.709 master added |
| `plugin/skills/neo-cine/SKILL.md`, `scripts/setup.sh` | `plugin/skills/lemo-opuscar/` | brand, repository, default folder (`~/neo-cine`), `NEO_CINE_HOME` / `NEO_CINE_REPO`, sparse-checkout patterns |
| `styles/_template/` | `styles/_template/` | the end-card sentence |

Every adapted document has a Chinese translation next to it (`X.zh-CN.md`). English is the file agents read; change both in the same edit.

## What is not taken

Upstream's styles and their demo films, the gallery and its build scripts (`styleboard/`, `docs/`), the release and directory tooling. To study a technique that NEO-Cine has no demo for yet (brush engines, characters, voice, sampled scores), read it in the upstream library.

## Compatibility

Kept identical to upstream on purpose, so tools and styles can move in both directions:

- the page contract (`window.READY`, `window.render(t)`, `window.DUR`, `window.EV`, `window.TEXTS`);
- the style folder (`style.json` fields, `STYLE.md` sections, `DEMO.md`, `demo/` with a one-command `build.sh` and `CREDITS`);
- the layout of a user's own styles (`~/neo-my-styles/<slug>/` has the same files as upstream's `~/lemo-my-styles/<slug>/`);
- the project-folder rules and the commands (`node core/…`, `sh core/render/mux.sh …`).

## Following upstream

```sh
sh tools/sync-upstream.sh                 # what changed upstream since the recorded commit (clones upstream to a temp folder)
sh tools/sync-upstream.sh <clone>         # the same, against an upstream clone you already have
sh tools/sync-upstream.sh <clone> --apply # copy the mirrored files and record the new commit
```

The report lists the mirrored files that changed (copied by `--apply`) and the upstream guides that changed (read the diff, then edit ours and the `.zh-CN.md` by hand). After `--apply`, reinstall the packages and rebuild the Folding City stills as a regression check (`MAINTAINING.md`, "Following upstream").
