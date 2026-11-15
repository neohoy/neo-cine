# Isle Film — production manual

*中文版：[PRODUCTION.zh-CN.md](PRODUCTION.zh-CN.md)*

How a film in this style is made from what the user brings, **one isle made with NEO-Isle: a folder `fangcun/<nn>-<name>/` with its `world.js`**, with the library alone: the kit in [`kit/`](kit/) and the library's `core/` and `neo/` tools. The look and its rules are in [`STYLE.md`](STYLE.md); this file is the order of work. It takes the place of AGENTS.md's treatment and storyboard steps for this style: the shot list in `film.json` is the treatment, and the user confirms it. **The three checkpoints below are part of the style, not optional**: the shot list, the sample stills, and the render time (then a full viewing and listening).

Run every command from the library root (`$LIB` in skill mode). `<P>` is the film's project folder (AGENTS.md, "Where things go": `films/<name>/` in a clone, `<name>/` in the user's folder in skill mode; never inside `styles/` and never inside the user's `fangcun/` series). `K=styles/isle-film/kit`. Python is the library's `.venv/bin/python` (`PY`).

## Hard rules

1. **The isle is the user's, as it is.** `world.js` is copied, never edited for the film. Nothing is added to the world (creatures, lights, weather, sounds of things it doesn't have). If the film needs something the isle lacks, tell the user it belongs in the isle (NEO-Isle) and stop there.
2. **The engine is the kit's pinned copy** (`kit/isle-core/`, NEO-Isle with film mode), or the isle's own engine when its series has one (`_core/`, copied by `new_project.py`; it needs the film mode too). Pages never read the user's NEO-Isle folders at render time.
3. **Every frame is a function of time** (STYLE.md §1): don't add page code that keeps state between frames, reads a clock or uses `Math.random`.
4. **Frame 0 is a complete picture** (the container in its backdrop); black only into the end card.
5. **A user's film carries no NEO-Cine credit**: the kit's end card has no text unless the user writes one.

## 0. The brief

Ask once (AGENTS.md, Workflow) for what the request doesn't say:

- **Which isle**: the folder of the isle (`fangcun/02-snowfall-peak/` or wherever their series lives) or the `world.js` itself. If they have several, which one; if they have none, they make one with NEO-Isle first.
- **Length** (default 30–40 s; a 10 s teaser is fine), and the **moment they love most** in that isle (a creature, a landmark, the wonder, an hour).
- **Look**: the isle's own (`meta.look`), or another preset, or a change of look as the signature move (cube → sphere on a desk). Only NEO-Isle's presets.
- **Words**: the title card (by default the series and number, the isle's name, an English name if they want one), one short line per shot or none, an end card or none.
- **Sound**: default synthesized; their own music is fine (it replaces the score; the beds stay).

The frame is 1920 × 1080 at 24 fps.

## 1. Create the project

```sh
$PY $K/tools/new_project.py <P> --world path/to/fangcun/02-snowfall-peak [--name file-prefix]
node $K/tools/build.mjs <P>
```

`new_project.py` copies `world.js` (and the series' `_core/` as `isle-core/` when the isle has its own engine), writes `film.json` (a three-shot starting point that already renders: arrive through the glass, a time-lapse into night, the pullback), a draft `CREDITS` and `.gitignore`. `build.mjs` writes `isle.html` (the engine in film mode, three from the library), `index.html` (the film page) and `page/`, and prints the shot table.

## 2. Survey the isle

```sh
node $K/tools/survey.mjs <P>          # → <P>/out/survey.jpg and survey.json
```

The first run also downloads the fonts (about 30 MB). It prints the isle's meta (name, start hour, look, default camera), its landmarks (highest point, lakes, river falls, flat pads for buildings) and a grid of ground heights, and saves a top view at noon with a 1-unit grid. Then read `world.js` for what the survey can't see:

- **creatures and their paths**: each `F.life(t => …)` says where a creature is at time `t` (circles, figure-eights, runs and stops). The film's engine time is `clock + film seconds` (per shot × `rate`), so pick `clock` to put them where your shots need them;
- **the landmark and its light**: constants such as `HUT`, and the `F.onLight` that lights a window (from which hour);
- **the wonder**: when it appears (`L.night`, `L.hour` in `F.onLight`) and where it moves (`F.life`);
- **sounds the isle really has**: wind and snow, water (a living river, or only frozen ice), birds (`kit.birds`; it doesn't name a kind: dark colours → `crow`, light ones → `song`), nothing else.

Write it down in a few lines (the creature, the landmark, the wonder, the hours, the beds): it is the basis of the shot list.

## 3. The shot list — checkpoint 1

`film.json`:

| Field | Meaning |
|---|---|
| `name`, `world` | output prefix (`<name>-v001.mp4`); the world file (`world.js`) |
| `clock` | the isle's own time at film second 0 (creatures' positions; default 0) |
| `looks` | optional: `{ "id": { "container", "backdrop", "glow" } }`, one page each; default one look, the isle's own |
| `title` | `kicker` (series and number), `zh`, `en`, `at` (s), `dur` (s) |
| `shots[]` | the shot list; the film is the sum of `dur` plus the end card |
| `end` | `dur`, `fade` (s of fade to black before it), and optional `kicker`, `zh`, `en` (none for a user's film unless they ask) |
| `poster` | the poster's film second |
| `sound` | `beds` (`wind`, `snow`, `water`: 0–1; `birds`: `"crow"`, `"song"` or null), `music` (`key`, `bpm`, `level`, `drop`: the event the score drops on, default `wonder`), `chimes` (0–1) |
| `fadeIn`, `fps`, `three` | optional: seconds of fade from black (default 0: frame 0 is a picture), 24, `"kit"` for the bundled three |

| Shot field | Meaning |
|---|---|
| `id`, `move` | a name; the move it is (`through`, `orbit`, `dive`, `timelapse`, `wait`, `pullback`, `swap`: STYLE.md §6) |
| `dur` | seconds |
| `from`, `to` | the camera at the start and the end: `az`, `pol` (radians), `dist` (containers), `target` `[x, y, z]`; anything left out carries on from the previous key or shot. No `from` = the camera continues from the previous shot without a cut |
| `keys` | instead of from/to: `[{ "at": s, az, pol, dist, target }, …]` for a long take through several positions |
| `ease` | the whole move's ease: `inout` (default), `in`, `out`, `soft`, `linear` |
| `hour`, `hourEase` | a number (held), `[from, to]` (run in this shot, eased by `hourEase`), or `[[s, hour], …]`; nothing = the previous shot's last hour |
| `rate` | the isle's clock speed in this shot (default 1; time-lapse runs the hour, not the clock) |
| `in`, `inDur` | `cut` (default), `dissolve` or `wipe` (a soft diagonal sweep, for a look change), and its seconds |
| `look` | which page (`looks` id) this shot uses |
| `focus`, `band`, `blur`, `tilt` | `"target"` (default: the sharp band on what the camera looks at), a point `[x, y, z]`, a list `[[s, [x, y, z]], …]`, or a screen height 0–1; band half-width (0.2), blur strength (1), `false` for no tilt-shift |
| `ride` | 0–1, overrides the automatic "ride with the floating container" |
| `wonder` | seconds into the shot when the wonder appears: the `wonder` event, the score drops on it |
| `sub` | `at` (s into the shot), `dur`, `zh`, `en` |

**Write it from the survey, in this order**: where the film starts (usually the container in its backdrop, `dist` 2–3) and how it gets in (`through`); the one life worth a close-up; how the day runs (a `timelapse` of 1–3 hours over a landmark whose light changes); the `wait` at the hour the wonder appears, framed where it will be; the `pullback`. Keep the hours moving one way.

**Durations.** Opening drift with the title: 4–6 s before the glass. A close-up: 4–6 s. A time-lapse: 5–7 s for 1–3 hours (integer hours chime: two to four chimes is right). The wait: 6–8 s, the wonder 3–4 s into it. The pullback: 5–7 s, landing at `dist` ≥ 1 at least 1.2 s before the end fade starts. End card 3.5–4 s. That makes 30–40 s for five shots. A 10–12 s teaser compresses all of it: a `through` of 4–5 s, at most one more shot of 2–3 s, a `pullback` of about 3 s, a 1 s fade and no end card text.

**Close-ups near the edge.** `dist` counts containers (about 55 units for the cube at dist 1), so the 0.08–0.15 of STYLE.md §6 puts the lens inside the glass only for targets near the middle seen across the ground. For a landmark near the edge, lower `dist` (0.05–0.07) or look from the inner side; `build.mjs` warns when a close keyframe's lens is outside the glass, and when a `through` or `pullback` never crosses it.

**A change of look** (`swap`) reads only from outside the glass (`dist` ≥ 1): inside, the container isn't in frame. Round containers frame about 15 % closer than the cube at the same `dist`.

**Reading time.** A text needs CJK ÷ 4.5 + other ÷ 15 + 1.5 s on screen, and it counts only once it is 60 % faded in and has stopped rising: a title or end card loses about 1.2 s of its `dur` to its fades, a subtitle about 0.6 s. A title card of four characters plus a seven-character kicker needs `dur` ≥ 4.4 s; a subtitle of six characters with a short English line about 3.5 s. `build.mjs` measures it the way `readcheck.mjs` does and lists texts that are too short; `make.sh` runs `readcheck` before rendering.

**The wonder on the beat.** The score's beat is 60 ÷ `bpm` (0.75 s at 80): put the wonder's film second (shot start + `wonder`) on a whole beat, or the cue check in `mix.py` fails and says by how much.

```sh
node $K/tools/build.mjs <P>           # the shot table: start–end, move, hours, distance, dissolves, the wonder, chimes
```

**Show the user the shot list**: each shot's seconds, what it shows, its hours, the words on screen, where the wonder lands. **Wait for approval.**

## 4. Look at it — checkpoint 2

```sh
sh $K/tools/preview.sh <P> auto                     # three moments per shot, and around the wonder → <P>/out/preview.jpg
sh $K/tools/preview.sh <P> 3,9.5,10.5,22.5,30       # or film seconds of your choice
REMOTE=1 sh $K/tools/preview.sh <P> auto            # on the render desktop
```

A still needs the whole isle built once per look (a few seconds), then a fraction of a second each on a recent Mac. Check, frame by frame: frame 0 is a complete picture; the title is readable and gone before the glass; the camera really passes the glass (the build prints the `glass` events: one `in` for the push, one `out` for the pullback); no close-up cuts into a tree or a hill, or looks out through the glass wall; the creature is in frame and in the sharp band; the hours look as intended (the landmark's light, the sky); the wonder is not yet there at the start of the wait and is clearly there on its second; subtitles readable over bright ground; the pullback lands on the whole container before the fade. Strips of 0.25–0.5 s around the glass, the dissolves and the wonder (`node core/render/still.mjs <P> --range a:b:0.25 --out <P>/out/strip`, then `core/render/sheet.py`).

**Show the user the sample stills and wait** for the look to be approved.

## 5. Sound

`mix.py` (run by `make.sh`) makes everything from the picture's events: the beds under the glass (outside muffled, opening as the lens passes the glass, louder as it comes close, birds only by day), a chime per integer hour, the glass crossing, a tap for a look change, the near-silence and the rising shimmer into the wonder, and the score (a faint pad and rare bells before, the full chord with a bass and a bell line on the beat after, the home chord under the end card). Choose the beds from the isle (§2) and the key from the mood (D is bright, A and E warmer, F softer). Their own music: put the file in `<P>` and mix it instead of the score (replace the score section of a copy of `mix.py` in the project: `$PY <P>/mix.py <P>`), keeping the beds and chimes.

Read what it prints: every bus's level, the cue table (the wonder within half a frame of its beat), the master's soft clip and limiter (more than a few windows cut by 3 dB means a sound is too hot), and the final check (−14 LUFS, one gain for `mux.sh`).

## 6. The film — checkpoint 3

Before rendering, **tell the user how long it takes**: frames = film seconds × 24; on a recent Mac (Metal, 3 workers) this style renders about 5 frames a second (the demo: 876 frames in 165 s), so a 36 s film takes about three minutes, plus a minute of encoding and the checks; on the render desktop (`RENDER=remote`, 4 workers) uploading the project and, the first time, the runtime add a minute or two.

```sh
sh $K/tools/make.sh <P> v001                    # → <P>/<name>-v001.mp4 and <P>/poster-v001.jpg
RENDER=remote sh $K/tools/make.sh <P> v002      # the picture on the render desktop (neo/render/remote.sh)
```

`make.sh` builds the pages, subsets the fonts, runs `readcheck` (before rendering, so a failed check doesn't use up a version number), exports the events, makes the sound, renders, muxes (`LEMO_COLOR=bt709`, grain 1), writes the poster and a contact sheet (`out/contact.jpg`, a frame a second). Every rebuild is a new version (`v002`, …). Then review: the contact sheet, strips around the glass, the dissolves and the wonder, the loudness line `mux.sh` prints (about −14 LUFS).

**Ask the user to watch and listen to the whole film.** Sound has only been measured, not heard: the film isn't finished until they have.

## 7. Deliver

DIRECTOR.md §11: `<name>-vNNN.mp4`, `poster-vNNN.jpg`, the shot list kept with it (`film-vNNN.json`, which `make.sh` copies from `film.json` for each version), `CREDITS` (the isle as the user's own work, NEO-Isle's engine and three.js under MIT, the two OFL fonts, the synthesized sound; complete the draft), and the project (`world.js`, `film.json`; the pages and fonts are rebuilt by `make.sh`). A user's film carries no NEO-Cine credit.

## When something goes wrong

- **The page never becomes ready** (`window.READY` times out): open `isle.html` alone (the tools serve the library root) and read the console; an error inside the isle is reported as `isle.html：…`. "Error creating WebGL context" on the render desktop means its GPU can't make a WebGL context at the moment (a stuck browser holding the GPU, or a driver that needs a restart): render locally and tell the user.
- **The isle looks different from its web page**: the pinned engine is older or newer than the one the isle was made with: `sh $K/tools/sync_isle.sh --check` compares it with the user's NEO-Isle; never edit `kit/isle-core/`.
- **No `glass` event for a `through`**: the last key is still outside the container (a close-up from far away looks "inside" through the transparent wall): lower `dist` or raise `pol` until the build lists it.
- **The cue check fails on the wonder**: move `wonder` so that shot start + `wonder` is a whole beat (60 ÷ `bpm`).
- **readcheck fails a line**: fewer words, a longer `dur`, or move the `at` earlier.
- **A creature isn't where the shot looks**: change `clock` (it moves every creature together) or the shot's `target`; the creature's path is in its `F.life`.
- **Fonts missing a glyph**: `fonts.py` names it; Noto Serif SC covers common Chinese, Cormorant Garamond only Latin (Chinese in an English line falls back to the serif).
