# Isle Film — Style Prompt

*Films of the miniature worlds that NEO-Isle (方寸之境, the library author's own skill, MIT) builds in glass. 中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

> A miniature world in a glass container, filmed by a very slow, very steady long lens: it drifts in from deep space, passes through the glass, lingers on one small life, lets a whole afternoon run into night in a few seconds, stops at the hour when the world's one quiet wonder appears, and pulls back until the whole container hangs in the dark again.
> References (grammar only): nature documentaries shot with long lenses and time-lapse (patience, a locked or creeping frame, the light doing the work); tilt-shift miniature photography; museum dioramas lit at night. Copy none of their footage, shots or music, and never name them in the film.

Needs: the library's core tools (Node, ffmpeg, the headless browser and `.venv` from `setup.sh deps`) and a GPU (WebGL; the render desktop for whole films). The world: one isle made with NEO-Isle, a folder with its `world.js`. Fonts are fetched by the kit (OFL). Everything else is in [`kit/`](kit/): a film in this style is made with it, step by step, as [`PRODUCTION.md`](PRODUCTION.md) says.

## 1. Essence, and what it is not

- **The world is the user's isle, as it is.** The film runs NEO-Isle's own engine (a pinned copy in `kit/isle-core/`) in its film mode on the user's `world.js`. Nothing is added to the world, nothing in it is changed: the camera, the hour and the clock are the only things the film controls.
- **One slow, steady long lens.** A narrow field of view (the engine's 20°), tilt-shift always on, moves eased over seconds, never a cut on movement alone. The camera behaves like a heavy rig on a slider: it creeps, it arrives, it waits.
- **Tilt-shift, day and night, one wonder.** Every film has the miniature's sharp band, at least two times of day, and builds toward the world's one wonder (its 一奇). An isle without a wonder builds toward its most alive hour instead (the first window lit, the first star of light on the water).
- **Every frame is a function of time.** The world's clock, the hour and the camera are pure functions of film time (the engine's film mode guarantees the world; `kit/page/plan.js` the rest). The same second renders the same picture, pixel for pixel, in any order, on any worker.

Not a screen recording of the interactive page (no orbiting by mouse, no UI), not a fly-through game camera (no swooping, no speed lines), not a trailer (no quick cuts, no impacts, no text slams), not a product render (the glass is never the subject for long: it is the threshold).

## 2. Materials & rendering

The world's look is NEO-Isle's and is guaranteed by its engine: the glass, the cross-section, clay and translucency, mist, light shafts, bloom, grain, the ten key hours of light. Read it there, don't restate or override it: [NEO-Isle style rules](https://github.com/neohoy/neo-isle/blob/main/references/%E9%A3%8E%E6%A0%BC%E8%A7%84%E8%8C%83.md).

What the film adds:

- **One page per look.** `index.html` opens the isle once per look (`looks` in `film.json`: container, backdrop, glow) in same-size frames and asks the visible one for the picture at each second (`FANGCUN.frame`). A dissolve or a look change draws the outgoing shot first and copies it onto a canvas that fades or wipes away.
- **The camera's distance is in containers.** `dist` 1 frames the whole container with margins (the engine's own framing); 0.1 is a close-up inside the glass; 2.5 is the container small in deep space. Distance is interpolated in log space, so a push reads as constant speed.
- **The camera rides with the floating container** in close-ups (the engine's `ride`, automatic from the distance), so the world never bobs in a close shot, while the container still floats against deep space in the wide ones.
- **The focus band follows the subject.** By default the sharp band sits on what the camera looks at (`focusAt` the target); it can be held on a point while the camera moves, or set as a screen height.
- **Black only at the end.** A film opens on a complete picture (frame 0 is the container in its backdrop, usable as a thumbnail) and fades to black only into the end card.

## 3. Colour logic

- The world's palette is the isle's own. The film never grades it, tints it or adds a colour.
- **The hour is the colour script.** Warm afternoon, rose and violet dusk, blue night: choose the hours of each shot so the film travels through them in one direction (usually toward night, where most wonders live). Don't cut back to an earlier hour unless the film is about returning.
- Text is a warm off-white (`#f3f1ec`) with a soft dark halo, never coloured. The black of fades and the end card is pure black.

## 4. Type & subtitles

- **Chinese: Noto Serif SC** (OFL), 300 for the title and end card, 400 for subtitles. **English: Cormorant Garamond** (OFL) 500, italic for every English line, upright for a sign-off name. Subset to the characters printed by `kit/tools/fonts.py`; never a system font.
- **Title card**: bottom left, like a museum label: a small kicker with the work's facts (series and number, e.g. "方寸之境 · 第二境", 25 px, tracked .42 em), the isle's name (84 px, tracked .32 em), its English name in italic (40 px). It fades in over the opening drift and leaves before the camera reaches the glass.
- **Subtitles**: two lines, Chinese then English, bottom centre, over a faint dark halo (no bar). One observation per shot, few words: what is happening, not what it means ("牦牛走过雪原 / Yaks cross the snow"). Never a subtitle on the wonder's own first seconds: the picture says it first.
- **End card**: centred on black, three short lines. A library demo signs off with NEO-Cine and the style's name only; a user's film carries no NEO-Cine credit (the kit leaves the end card without text unless the user writes one).
- **Reading time** follows the library's rule (CJK ÷ 4.5 + other ÷ 15 + 1.5 s); `build.mjs` warns, `readcheck.mjs` checks the finished page.

## 5. Motion quality

- 24 fps, everything on ones. The world's own motion (snow, water, creatures, clouds) runs at its own speed: the clock (`rate`) stays 1 unless a shot needs it otherwise; time-lapse speeds up the **hour**, not the creatures.
- **Eases are long.** Each shot's move eases in and out over its whole length (a quintic); a long take with keyframes passes through them without stopping (monotone cubic). A shot that continues the previous one (no `from`) carries the camera on without a cut.
- **No idle wobble, no shake, no snap.** The camera is never still for more than a beat except in the wait for the wonder, and even then it creeps (a 10–15 % push).
- **Hours move on purpose.** A shot either holds its hour (a slow drift of minutes) or runs a time-lapse (one to three hours in five to seven seconds), never in between.

## 6. Camera grammar

A vocabulary, not a route. Each move is one shot in `film.json` (`move` names it; the numbers are what makes it).

| Move | Picture | Can serve |
|---|---|---|
| `through` — push through the glass | from the container small in its backdrop (dist 2–3) to a close-up inside (0.08–0.15); the glass edges sweep out of frame as the lens crosses the wall | arriving; entering a world; the opening |
| `orbit` — circle | azimuth turns 0.2–0.5 rad at a fixed distance | looking around a landmark; letting light move across a form |
| `dive` — swoop to a close-up | target moves to a point, distance drops, pitch rises then settles | finding the one small life in a big view |
| `timelapse` — run the hours | the hour runs 1–3 h in 5–7 s while the camera barely moves; integer hours chime | a day passing; dusk falling; a lamp coming on |
| `wait` — stop at the hour and wait | camera nearly still, low over the place where the wonder will happen; the hour creeps through the minutes when it appears | the wonder; any reveal the world does by itself |
| `pullback` — the whole container | from inside back out through the glass to dist ≥ 1, held for a moment | the ending; putting a moment back into its world |
| focus follow | the sharp band moves along a list of points (`focus`) | handing the eye from one subject to another |
| `swap` — change of look (signature, optional) | the same moment in another container or backdrop (cube → snow globe on a desk), crossed with a soft wipe | "the same world, another way to hold it" |

Framing: the close-ups look across the ground (pitch 1.1–1.3) rather than straight down, with something in the foreground when the world offers it. Wide shots keep the container whole with margins (dist ≥ 1). Transitions: a continuing move (no cut), a dissolve (0.8–1.4 s, `in: "dissolve"`), a wipe for a look change; never a hard cut between two moving shots, never a whip.

## 7. Sound palette

- **The world's air, filtered by the glass.** Outside the container the world's sounds are almost shut (low-passed, quiet); the moment the lens crosses the glass they open, and they grow as the camera comes closer. Beds in code: wind (brown noise, slow gusts), snow (a faint hiss and tiny ticks), water (filtered noise and bubbles), birds by day (crows' rough calls or short songs). Choose them from what the isle really has.
- **The hours chime.** Each integer hour the film passes rings one soft FM bell: high and bright by day, lower and darker by night, quieter when many go by in a time-lapse.
- **Glass.** Crossing the glass: a breath of air and a high glassy ring. A look change: one light tap of glass.
- **The score drops on the wonder.** Before it, only a faint pad and an occasional bell; 0.6 s of near-silence; on the wonder, low bass and the full chord arrive with a rising shimmer of high bells, and a slow bell line walks a pentatonic scale on the beat. The end card returns to the home chord and rings out. All synthesized (`kit/tools/mix.py`); no recordings or samples.
- The wonder sits on the score's beat (the cue check fails otherwise); master to −14 LUFS with one gain.

## 8. Native moves

- **Through the glass.** The lens crosses the container's wall and the sound opens. *Fits content like:* the opening of any isle; entering a city under a dome; going "inside" a story.
- **The day in seconds.** A landmark held still while the hours run and chime: shadows sweep, the sky turns, a window lights. *Fits content like:* a harbour from noon to lamplight; a field from dawn to dew; a market closing.
- **Waiting for the wonder.** The film stops at the hour and lets the world do its one impossible thing in its own time. *Fits content like:* fish glowing under ice; a lantern tree blooming at midnight; a ghost train crossing at 3 a.m.
- **Back to the whole.** Pulling out until the world is small again, still alive inside the glass. *Fits content like:* any ending; a series' last shot; a loop back to the first frame.
- **Another glass.** The same moment, swapped into another container or backdrop. *Fits content like:* the cube that becomes a snow globe on a desk; a dome lifted off a table; a series shown as one world in three looks.

## 9. Pitfalls of the medium

- **Adding to the world.** No creatures, lights, sounds of things (bells on yaks, a car) or weather the isle doesn't have. If the film needs it, it belongs in the isle (NEO-Isle), not in the film.
- **A camera that sees through things.** Close-ups inside the glass can put the near plane in a tree or a hill: check every keyframe in a still; move the target or raise the pitch.
- **The lens leaving the container** when the target is near the glass: a close-up near an edge sees the glass wall edge-on and the backdrop behind it; keep close-ups inside the middle 8 × 8 of the ground.
- **A wonder that is already there.** If the wonder appears by the hour, start the waiting shot before that hour; if it moves, time the clock (`clock`) so it enters the frame. Find the exact hour and path in `world.js` (its `F.onLight` and `F.life`).
- **Bright snow, sand or water under white text.** The halo helps; still, put subtitles over the darker part of the frame or shorten them.
- **Hours that jump at a dissolve** read as a mistake unless they jump forward with the story.
- **WebGL is heavy.** A frame is a whole world render (shadows, bloom, tilt-shift); preview with a few stills (`preview.sh`) and render whole films on the render desktop.
- **An isle with its own engine** (a NEO-Isle "own style", `_core/`) needs the film mode too (NEO-Isle 1.2.0); `new_project.py` stops when it's missing.

## 10. Engine

The kit in [`kit/`](kit/) makes a whole film from an isle's `world.js` and a shot list, and [`PRODUCTION.md`](PRODUCTION.md) is the manual, with the three points where the user confirms. See the code; don't restate it.

- NEO-Isle's engine: `kit/isle-core/` (a pinned copy with its `VERSION`, `LICENSE` and `SOURCE`), synced by `kit/tools/sync_isle.sh`; its film mode is `window.FANGCUN` (`frame`, `ready`, `camPos`, `inGlass`, `defaults`), documented in NEO-Isle's `references/制作与避坑.md` §9.
- Time plan: `kit/page/plan.js` (shot list → state at any second, texts, events, reading estimate), shared by the page and the build.
- Page: `kit/page/index.html` (frames, carry canvas, type), `kit/page/film.js` (the library's page contract, dissolves and look changes, `TEXTS`, the survey mode).
- Tools (`kit/tools/`): `new_project.py`, `build.mjs`, `survey.mjs`, `fonts.py`, `preview.sh`, `mix.py`, `make.sh`, `sync_isle.sh`.
- three.js: the library's own (r170), checked against the 0.160 that NEO-Isle's web pages load (max pixel difference 4/255 on the demo isle); `"three": "kit"` in `film.json` switches to a copy in `kit/three/` if a future three breaks the engine.

## 11. Variation space

Decided per film: the isle and its look (or looks), the length (10 s: one through and a pullback; 30–40 s: four to six shots; 60 s: a whole day), the hours of each shot and which way the film travels through the day, which creatures and landmarks get a close-up, how the wonder is staged (it appears by the hour, it swims or walks into the frame, it is found by a slow dive), the clock offset that puts the creatures where the shots need them, the beds, key and tempo of the sound, the subtitles or none, the end card (or none).

- **Structures:** arrive → one life → the day in seconds → the wonder → the whole; a single long take from space to a close-up and back; three isles of a series, one shot each, joined by a look change.
- **Openings:** the container small in deep space; a close-up already inside, pulling back to reveal the glass; the same isle in another container, swapped into the real one.
- **Endings:** the whole container at night; the swap into a snow globe on a desk; fading on the wonder itself.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your shot list exists.
