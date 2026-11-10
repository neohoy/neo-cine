# NEO-Cine

**Code-made film styles by NEO.** Tell your coding agent what the film is about, pick a style, and it directs, draws, scores and mixes a short film entirely in code.

*中文说明：[README.zh-CN.md](README.zh-CN.md)*

![Folding City: Shenzhen, Folded](styles/folding-city/poster.jpg)

NEO-Cine is a library of film styles for coding agents (built for Claude Code). A style is not a template with parameters: it is a written description of a look, a way of moving and a sound, plus one demo film with its full source. The agent reads the style, writes its own treatment for your topic, builds the film as a web page that draws any frame from a time value, renders it frame by frame and masters the sound.

## Styles

NEO's styles are made one by one. So far:

| # | Style | Demo film | What it is |
|---|---|---|---|
| 01 | **Folding City 折叠城市** ([STYLE.md](styles/folding-city/STYLE.md)) | *Shenzhen, Folded*, 40 s ([DEMO.md](styles/folding-city/DEMO.md)) | A flat poster city that is really a 3D model: posters open into streets, rows of towers fold like doors and screens, whole districts stand up as walls |

You can also change a style into your own, or make one from a blank page ([MY-STYLES.md](MY-STYLES.md)); your styles live outside the library in `~/neo-my-styles/`.

## Install

Not published yet. Once the repository is on GitHub, in Claude Code:

```
claude plugin marketplace add neohoy/neo-cine
claude plugin install neo-cine@neo
```

Then start it with `/neo-cine:neo-cine`, or just ask for a film in a NEO-Cine style. The skill downloads the library into `~/neo-cine` on first use and installs what it needs there.

To work in a clone instead: clone this repository, run `sh plugin/skills/neo-cine/scripts/setup.sh deps` once, and point your agent at [AGENTS.md](AGENTS.md).

**You need** Node 20+, ffmpeg 7+, and Python 3.11+ or [uv](https://docs.astral.sh/uv/). The setup script installs the rest (two Node packages, a headless Chromium, a small Python environment). macOS and Windows (Git Bash); Linux needs working GPU drivers for the 3D styles.

## How a film is made

1. **Brief**: one round of questions (what it is for, where it will be shown, length, language).
2. **Treatment**: the agent writes the story, the shots and the sound plan for your topic before it looks at the demo.
3. **Look**: a few stills for you to approve.
4. **Production**: one timeline drives the picture, the score and the sound effects; the film is rendered frame by frame in a headless browser and mastered to −14 LUFS.
5. **Delivery**: the film, a poster and the treatment, each with a version number (`-v001`, `-v002`, …). Nothing is overwritten.

The guides: [AGENTS.md](AGENTS.md) (workflow), [DIRECTOR.md](DIRECTOR.md) (directing), [TECHNIQUE.md](TECHNIQUE.md) (production), [MY-STYLES.md](MY-STYLES.md) (your own styles), [MAINTAINING.md](MAINTAINING.md) (adding a style to the library). Each has a Chinese translation next to it (`X.zh-CN.md`).

## Built on Lemo-Opuscar

NEO-Cine is built on the framework of [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) by LemoLab (MIT): its page contract, its production tools and its way of directing films with guides. `core/` is an unmodified copy of its tools; the guides are adapted from its guides. The styles here are NEO's own. [UPSTREAM.md](UPSTREAM.md) lists exactly what is mirrored, what is adapted and how updates are followed.

Folding City takes its idea from the illusion animations of Yuma Garments ([@garments__](https://x.com/garments__)): technique only, none of those pictures are used.

## Licence

MIT, © 2026 NEO造物集 (neohoy): the guides as adapted, the styles and the demo source. The parts that come from Lemo-Opuscar are © 2026 LemoLab, MIT ([LICENSES/lemo-opuscar-MIT.txt](LICENSES/lemo-opuscar-MIT.txt)). Fonts and other assets a demo uses are named in its `CREDITS`.
