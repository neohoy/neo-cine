# NEO-Cine: instructions for agents

*Adapted from [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) (MIT, © 2026 LemoLab), upstream commit 9eb7739. See UPSTREAM.md. 中文版：[AGENTS.zh-CN.md](AGENTS.zh-CN.md)*

This repository is a library of film styles. Each style has a `styles/<slug>/STYLE.md` (what the style is) and one demo film made entirely in code (`DEMO.md` and `demo/`). People pick a style and ask for a film about **their own** topic. Your job is to direct and produce that film.

| The request | Go to |
|---|---|
| Any request: first see the user's own styles; no request yet: offer the ways in | **Start** below |
| A film about the user's topic (the normal case) | **Style and story**, **Workflow** below |
| "Which styles are there?" / no style chosen | **Finding the style** below |
| Directing: story, sound, rhythm, camera, maps, checks, delivery | [`DIRECTOR.md`](DIRECTOR.md) |
| Building: install, pages, voice, music, mix | [`TECHNIQUE.md`](TECHNIQUE.md) |
| Tool commands and flags | [`core/README.md`](core/README.md) |
| The user wants to change a style and keep it as their own, or make their own style from a blank page, or names a style in `~/neo-my-styles/` | [`MY-STYLES.md`](MY-STYLES.md) |
| Adding a style to the library (owner only) | [`MAINTAINING.md`](MAINTAINING.md) |

**Films outside `styles/` are the user's: no NEO or LemoLab credit, no watermark.**

## Start

- **Their own styles first.** If `~/neo-my-styles/README.md` exists, read it: it lists every style the user has saved, wherever it's kept, and their own styles ([`MY-STYLES.md`](MY-STYLES.md)) count like library styles. When they name a style, look there first, then in the library.
- **Their language.** Talk to them in the language they write in. When they started the skill without writing anything, your first question is always the language, even when their settings, memory or earlier messages suggest one: the `AskUserQuestion` tool, a question of its own headed "Language 语言" with two options, 中文 and English (the tool adds Other, where they type any other language). Use it from then on, and as the film's default language.
- **No request yet** (they only started the skill, or said hello): offer the ways in with one question, using the `AskUserQuestion` tool, in their language, with the first as the recommended one:
  1. a film in a library style (**Finding the style**);
  2. change a library style and keep it as their own ([`MY-STYLES.md`](MY-STYLES.md));
  3. make their own style from a blank page ([`MY-STYLES.md`](MY-STYLES.md));
  4. a film in one of their own styles, only when they have some (name them).

  When their request already says which, skip the question.

## Style and story

- **`STYLE.md` is fixed**: the style's invariants (look, colour, type, motion, camera grammar, sound palette, native moves, pitfalls). Keep all of it.
- **Everything else is yours to direct** from the user's topic: story, structure, characters, settings, shots, timings, references, how data is charted. Never bend the topic toward the demo.
- **Treatment first, demo later.** Write your own `TREATMENT.md`, with three candidate structures and your choice (DIRECTOR.md §4), before you open `DEMO.md` or the demo code. Then use the demo only to learn techniques (a brush engine, a rig, a shader, a mix), never its story, arc, shots, props or timeline. One exception: a style cut from real material needs its material before the treatment, so the tools its `STYLE.md` names in `demo/tools/` for finding and logging material (`footage.py` and the like) may be used first, copied into the project folder and run there; still read `DEMO.md` and the rest of the demo only after the treatment is written.
- **Scene styles** (a set-up guide, a spec walkthrough, a museum plate, a trail guide) list use cases in their `STYLE.md`. Read them as grammar for the order in which information arrives and how long each part needs on screen, then build the user's content in your own structure. Swapping text into a demo's `content.json` is only a technical check, never the way to deliver.
- Never build inside `styles/`: copy what you need into the film's project folder.

## Finding the style

Users name a style by its name in English or Chinese ("Folding City", "折叠城市") or by its folder (`folding-city`). Look it up in [`styles/README.md`](styles/README.md). If nothing matches clearly, show the closest two or three and ask.

If the user hasn't picked a style:
- Suggest two or three that fit their topic (fewer while the library is this small; if none fits, say so and offer a style of their own from a blank page, [`MY-STYLES.md`](MY-STYLES.md)).
- If they have their own styles, list those first, under "My styles" (in their language).
- Show them the full list below in the chat, in the user's language only: English names (and English category names) for someone writing in English, Chinese names for someone writing in Chinese. Don't drop, merge or rename anything.
- Link the gallery, where every style has its demo film: https://neohoy.github.io/neo-cine/
- Then ask them to type the name. The list goes in your own message (a command's output isn't shown to them), and the question is plain text, not `AskUserQuestion`: its few options would hide the rest of the list.

<!-- style-list:start -->
All styles (6) · 全部风格:

- **真实地图 Real Maps** (2): 铜版图卷 Atlas Scroll, 舆图长卷 Scroll Map
- **交通 Transport** (3): 瓷砖地铁图 Metro Mosaic, 列车运行图 Train Graph, 公交点阵屏 Bus Dot Matrix
- **图形与排版 Graphic & Type** (1): 折叠城市 Folding City
<!-- style-list:end -->

## Workflow

1. **Brief.** Make sure the style and the topic are clear, then ask the user once, in a single message (DIRECTOR.md §1):
   - anything about the topic you can't decide yourself (facts; names, logos or products that must appear);
   - whether they have material of their own: a voice recording or a preferred voice, music, photos, logos, fonts, and for a style built from real material, their own data or scans;
   - the film's language, if it isn't obvious (default: the language they write in or chose, for voice and subtitles);
   - whether they want to review a storyboard first (default: no);
   - anything missing on their machine: first run `sh plugin/skills/neo-cine/scripts/setup.sh deps` from the library root (core only) and include what it reports. Add the voice and music tiers later, only if the film needs them (TECHNIQUE.md §1).

   Skip what their request already answers. Wait for the reply, fill every other gap with a sensible default, sum up the brief in a few lines and start. Don't come back with more questions.
2. **Treatment.** Write `TREATMENT.md` in the project folder (DIRECTOR.md §4), before you open the demo (a style cut from real material gathers its material first: **Treatment first** above).
3. **Look.** Render style frames or a model sheet with the real drawing code and check them against `STYLE.md` (DIRECTOR.md §5).
4. **Storyboard, only if the user asked for it** (DIRECTOR.md §5). **Stop and wait for approval.** Otherwise don't stop.
5. **Produce.** Voice → check → score (can run in parallel) → animation → mix → render (TECHNIQUE.md).
6. **Self-check and deliver** (DIRECTOR.md §11). Every deliverable is saved as a new version, never over an earlier one (**Where things go** below).

Report progress in the user's language. If a step fails, read the error, fix the cause and retry; go back to the user only for a decision or something only they can provide.

## Where things go

- The film's project folder is `films/<name>/` in a clone (ignored by git), or `<name>/` in the user's folder in skill mode (see the skill's `SKILL.md`). Wherever a guide says `films/<name>/`, read "the project folder". Work only there, unless the user asks you to work in their own project.
- **Every deliverable is a new version, never an overwrite.** The film, its poster, its subtitles, and a treatment that defines a version, are saved as `-v001`, `-v002`, … (`<name>-v003.mp4`, `<name>-v003.srt`, `poster-v003.jpg`). Look at the files already there first and take the next number; the film, poster and subtitles of one version share the number. Wherever a guide names one of these without a number (`<name>.mp4`, `poster.jpg`), read the numbered name. Intermediate files in `out/` may be overwritten.
- Run `node core/…` and `sh tools/…` from the library root (`$LIB` in skill mode).
- `core/` has ready-made tools (rendering, TTS, speech check, sampler, sfx, mux). Use them or your own stack, but don't edit `core/`, `neo/` or `styles/` for a user's film. `core/` is an unmodified mirror of Lemo-Opuscar's `core/`, so its tool names, flags and `LEMO_*` environment variables are upstream's; only the library's home is NEO-Cine's own (`NEO_CINE_HOME`, default `~/neo-cine`). NEO's own tools go in `neo/` ([`neo/README.md`](neo/README.md)).
- Never kill processes you didn't start. Don't leave background processes running.
