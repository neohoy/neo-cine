# Maintaining the library

*Adapted from [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) (MIT, © 2026 LemoLab), upstream commit 9eb7739. See UPSTREAM.md. 中文版：[MAINTAINING.zh-CN.md](MAINTAINING.zh-CN.md)*

**For the repository owner only.** If you are making a film for a user, go back to [`AGENTS.md`](AGENTS.md): nothing here applies.

## Add a style

Work in `styles/<slug>/` (lowercase letters, digits, hyphens; unique). Start from the templates in `styles/_template/`.

| File | What it holds |
|---|---|
| `style.json` | the only metadata source: `slug`, `num`, `en`, `cn`, `category_en`, `category_cn`, `film`, `line`, `line_cn`, `uses`, `frame_sec`, `dur` |
| `STYLE.md` | the style's invariants only: look, materials and rendering, colour logic, type, motion, camera grammar, sound palette, the medium's pitfalls, native moves, range of variation. No story, arc, beat table, durations or end card. Ends with a link to `DEMO.md` |
| `DEMO.md` | opens with "One example among many. Don't reuse its story, arc, shots, props or timings." Then the demo's story and structure, shot list, score structure, palette and props, end card, build notes and code entry points, and for a scene style the `content.json` fields |
| `demo/` | the source, a one-command `build.sh` and `CREDITS` are committed, for agents to read. `TREATMENT.md`, `PRODUCTION_LOG.md`, fonts, audio, textures and models stay local (gitignored); `CREDITS` names every asset so it can be found again, and `build.sh` fetches the fonts first (for example `demo/tools/fonts.sh`: the same files, from URLs pinned to a commit or a version), so a fresh clone builds |
| `demo/stills/` | stills the docs link (`styleframe.jpg` is the style frame) |
| `<slug>.mp4`, `<slug>.srt`, `poster.jpg` | the 1080p film, its subtitles when it is spoken, its poster |

Assets are CC0, CC BY or OFL only, each in `demo/CREDITS`. No watermark on any film. Real people, brands and events appear only in an unofficial fan film; its `DEMO.md` says so.

Rules for library demos only (a user's film follows `DIRECTOR.md`, not these):

- **Bilingual subtitles, one line per language.** Each cue has one Chinese line and one English line, never wrapped. When a line is too long, split it into two cues.
- **Comparisons hold still before the verdict.** When the film compares options (four bridges, three plans), each one is fully in frame and held at least 2.5 s before it is judged, so the viewer can read it.

## Register

1. **Number.** `num` in `style.json` is the next free number after the highest in `styles/*/style.json` (two digits as a string, e.g. `"02"`); it orders the style list within a category.
2. **List it.** There is no build script yet, so add the style by hand: to the style list in `AGENTS.md` and `AGENTS.zh-CN.md` (between the `style-list` markers: the style under its category, the category's count and the total), and to `README.md` and `README.zh-CN.md`. Change the English and the Chinese file together.

## Gates

- **Human:** approve the style frame before production, and the finished film.
- **Machine:** `asr_check.py` passes on every line; `mux.sh` reports about −14 LUFS and no warning; `readcheck.mjs` passes.
- **Maps:** library demos follow DIRECTOR.md §13 like any film: every map shot checked enlarged, the map data and its view named in `CREDITS`.
- **Real events and products:** every fact on screen and in the voice-over comes from an official source, kept in `demo/FACTS.md` (claim, URL, quoted wording); check the final script against it before the last render.

## Revise a style

Back up first: the old film, its subtitles and its poster move out of the repository under a version number (`<slug>-v001.mp4`, `<slug>-v001.srt`, `poster-v001.jpg`, …; look at the backups already there and take the next number), not into git, and are never deleted. Then re-render and replace `<slug>.mp4`, `<slug>.srt` and `poster.jpg`.

## Following upstream

NEO-Cine is built on the framework of [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) and stays easy to compare with it, so later upstream changes can be adopted.

- **`core/` is an unmodified mirror** of upstream's `core/`. Never edit it here: its tool names, flags and `LEMO_*` environment variables stay exactly as upstream's. NEO's own tools go in `neo/`.
- **`UPSTREAM.md`** records the upstream commit that was mirrored, and what was mirrored unchanged and what was adapted.
- **`sh tools/sync-upstream.sh`** compares with a newer upstream and reports what changed there since that commit: the `core/` files to copy over, and the guide changes to review by hand (its options are in `UPSTREAM.md`). The guides are adaptations with upstream's sections, order and numbering: bring a change in by hand, in the same place.
- **After syncing**, rebuild the Folding City demo stills as a regression check.
- **Two languages.** Every doc exists as `X.md` (English, canonical: the file agents read) and `X.zh-CN.md` (its Chinese translation). Update both in the same change.
