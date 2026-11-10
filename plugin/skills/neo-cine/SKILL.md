---
name: neo-cine
description: Direct and produce a short film made entirely in code, in one of the styles of the NEO-Cine library (currently Folding City 折叠城市, a flat poster city that folds between an elevation and deep perspective). Use when the user asks for a video, film, short, promo or animation (视频、短片、动画、宣传片、城市宣传片) in a NEO-Cine style, or names NEO-Cine, Folding City or 折叠城市; when they want a film about their own topic and haven't chosen a style (help them choose); when they want to change a style into their own, make their own style from a blank page, or use a style they saved (改风格、从空白开始、我的风格); when they start the skill without saying what they want; or when they ask which film styles there are. Not for plain editing, trimming or converting the user's existing video files.
---

# NEO-Cine

The styles, guides and tools live in the NEO-Cine library (github.com/neohoy/neo-cine). This skill fetches it and hands you over to it.

1. **Get the library.** Run `sh "<skill base directory>/scripts/setup.sh"`. It clones or updates the library (default `~/neo-cine`; a clone the user is standing in is used as it is) and prints `LIB=<path>` on its last line.
2. **Install the core tools early.** Start `sh "<skill base directory>/scripts/setup.sh" deps` right away, in the background if you can: it takes a few minutes the first time. Add `deps voice` or `deps music` later, only if the film needs them (`$LIB/TECHNIQUE.md` §1). Report missing system tools (Node, ffmpeg, Python) in your one round of questions; don't install system software yourself. Packages a style needs (its `STYLE.md` lists them) you install yourself, into the project folder.
3. **Follow the library.** Read `$LIB/AGENTS.md` and do what it says, starting with **Start** (the user's own styles in `~/neo-my-styles/`; when they started the skill without writing anything, the language question first, then the ways in): finding the style or making their own, the one round of questions, the treatment, production and delivery.

What changes in skill mode:

| | |
|---|---|
| Project folder | `<name>/` in the folder the user started from (lowercase letters, digits, hyphens; avoid `#` and `?` in the path). Wherever the guides say `films/<name>/`, read this folder |
| Running tools | from `$LIB`, with the project's absolute path: `cd "$LIB" && node core/render/still.mjs "<project>" 1.5 3` |
| Library files in pages | absolute URLs: `/core/lib.js`, `/node_modules/three/…` (the project is served at `/@film/`) |
| Library files in scripts and `build.sh` | `$LIB/…`, with `LIB=<path>` at the top of `build.sh`; never `../..` |
| Demo source | not downloaded. `sh "<skill base directory>/scripts/setup.sh" demo <slug>`, only after your `TREATMENT.md` is written, to read its techniques; it is not meant to be rendered |

Deliver what `$LIB/DIRECTOR.md` §11 lists, in the project folder, and tell the user where it is. Every deliverable gets a version number (`-v001`, `-v002`, …) and is never overwritten.

The guides are written in English; each has a Chinese translation next to it (`X.zh-CN.md`) for people to read. Follow the English files.
