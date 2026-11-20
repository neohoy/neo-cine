# Game Launch — production manual

*中文版：[PRODUCTION.zh-CN.md](PRODUCTION.zh-CN.md)*

How a film in this style is made from what the user brings, **a game's material: its gameplay recording, screenshots, key art, logo, character art, store-page text and soundtrack**, with the library alone: the kit in [`kit/`](kit/) and the library's `core/` and `neo/` tools. The look and its rules are in [`STYLE.md`](STYLE.md); this file is the order of work. It takes the place of AGENTS.md's treatment and storyboard steps for this style: the three story options in `STORY.md` and the cut list in `game.json` are the treatment, and the user confirms them. **The three checkpoints below are part of the style, not optional**: the story and the cut list, the sample stills, and a full viewing and listening of the film.

Run every command from the library root (`$LIB` in skill mode). `<P>` is the film's project folder (AGENTS.md, "Where things go": `films/<name>/` in a clone, `<name>/` in the user's folder in skill mode; never inside `styles/`). `K=styles/game-launch/kit`. Python is the library's `.venv/bin/python` (`PY`). No HyperFrames, no GSAP, no `<video>` playback: the kit cuts the footage into frames itself.

## Hard rules

1. **The material is the game's.** Only the user's own game, or one they have the developer's permission for (ask; DIRECTOR.md §12). `CREDITS` says whose the footage, art and music are.
2. **Nothing invented.** Every number, feature and claim on screen is visible in the recording (with its time code) or written on the store page, the changelog or the developer's post (with its wording), in `<P>/FACTS.md`. The build lists numbers that aren't in it.
3. **Gameplay fills the frame**, the captions are plates made of the game's UI, the climax is one real number or payoff, cuts sit on the game's own beat (STYLE.md §1).
4. **Every frame is a function of time; frame 0 is a complete picture.**
5. **No account is needed**: the soundtrack is the game's, the effects are synthesized, there is no narration by default.

## 0. The brief

Ask once (AGENTS.md, Workflow) for what the request doesn't say:

- **The material**: a folder with the gameplay recording (several minutes of real play is best; 1080p or more; a screen recording with black bars is fine), the key art, the logo (transparent PNG if they have it), character art or screenshots, and the store page's text (description, changelog, developer's note) or its URL.
- **Their right to use it**: the game is theirs, or the developer has given permission (for what: this trailer, social posts).
- **What the film announces**: a Demo, early access, a launch date, an update; the store and the exact search words; the platforms.
- **Length** (default 30–45 s), the music (a passage of the recording's own soundtrack by default, or a music file of the game), and anything that must be shown.

The frame is 1920 × 1080 at the recording's frame rate (30 fps by default).

## 1. Create the project and take stock — `inventory.py`

```sh
$PY $K/tools/new_project.py <P> --from <material folder> --title 游戏名 [--name file-prefix]
```

It brings the material into `<P>/assets/` (videos as clones or hard links, so a large recording costs no space), writes `game.json` (a three-shot starting point, every recording in `sources` with the black-bar `crop` it detected, every image in `stills`), `FACTS.md`, `STORY.md`, a draft `CREDITS` and `.gitignore`, and runs the inventory: `out/inventory.md` (each recording's length, size, frame rate, sound, crop; each image's size, transparency and a guess at what it is; the first lines of each text file) and `out/inventory.jpg` (every image on one sheet). Look at the sheet: which image is the key art, which is the logo, which are character art, which are screenshots of which system.

Check each `crop` on a frame (`look.py … --grid`, section 2): the game's picture only, no bars, no window frame. Screenshots often carry a transparent margin (the inventory says so and gives the crop): use them through a `grab` with that crop, or a full-frame still shows the background through it (the build warns).

Store-page text the user pastes into the chat, or that you read on the page, goes into `<P>/assets/text/store.md` with the URL and the date you read it: it is the source `FACTS.md` quotes.

## 2. Find the selling shots and the real number — `scan.py`, `look.py`

```sh
$PY $K/tools/scan.py <P> play                           # contact sheets with time codes + a scene table → out/scan/play/
$PY $K/tools/look.py <P> play 6:08 --grid               # one frame with a 100 px grid: read coordinates
$PY $K/tools/look.py <P> play 6:08 --rect 1300,1900,450,100              # that region enlarged: what does it say
$PY $K/tools/look.py <P> play 6:15-6:20 --rect 1300,1900,450,100 --step 0.2   # how it changes: find the exact frame
```

`scan.py` decodes the recording once and writes `sheet-*.jpg` (a frame every few seconds, labelled m:ss), `scenes-*.jpg` (the first frame of every scene, with its start and end) and `LOG.md`, a time-code table with three empty columns: what is on screen, which selling point it proves, which real number it shows. Fill it while you look. Long scenes (over 20 s) are usually a continuous action (a trade, a run, a fight): look closer. Games often change scenes with fades, which score low: when a long scene holds several things, run again with `--scene 0.1`. The sheet's and the table's time codes locate; before you write an `in` point, check it with `look.py`.

Selling points come from the store page's own words (the description lists them: trade across cities, turn-based strategy, explore, recruit). For each, find the clip that shows it best: readable UI, something happening, no menu half open.

**The real number.** Look for a figure the recording shows changing: money after a trade, damage, a level, a drop, a score. With `look.py --rect … --step` read it frame by frame: its value before, the frame it lands on its final value, and **how long it stays there** (a later purchase can change it again). Write each into `FACTS.md` with its time codes. `--ocr` prints the text too when tesseract (with `chi_sim`) is installed; your eyes are the check. A strip may frame the whole picture (`--rect 0,0,<w>,<h>`) over a long stretch: the frames are picked and scaled down in ffmpeg.

## 3. Three stories — `STORY.md`

Fill `STORY.md` (the template is in it): the selling points with their time codes, the real number, then **three story options** (a few lines each: the device that carries the film, the first two seconds, the beats, the sound) with their weaknesses, and your choice with the reason. Typical options: one journey carried by the number; a cast parade (one character per system: only if the recording shows which character does what; otherwise you would be inventing); a single system in depth; a page of the game's own book or log as the thread. The first idea is usually the cliché: choose from the material.

## 4. Music, beat and plate material — `beats.py`, `plate.py`, `fonts.py`

```sh
$PY $K/tools/beats.py <P> --scan          # tempo and beat clarity every 20 s across the recording's sound
$PY $K/tools/beats.py <P>                 # the chosen passage (audio.start) against the grid (audio.bpm) → data/beats.json
$PY $K/tools/plate.py <P> play 6:08 --rect 2441,1404,585,101 --logo logo [--write]
$PY $K/tools/fonts.py <P> --list
```

- **Music.** Pick a passage with a clear beat (clarity 0.5 and up), a tempo that suits the film (110–160 for most trailers), and as little dialogue and interface noise as you can. Write `audio.start` and `audio.bpm`; run `beats.py` without `--scan`: it lays the grid over the passage's onsets (the bass weighted, so the beat and the off-beat are told apart; the tempo fitted over the whole passage) and prints where the beat really is relative to second 0 and which tempo fits best, then, when the start or the tempo is off by more than half a frame, the start or tempo to use instead. Apply it and run again until it says the grid matches; the advice converges. When it warns that the beat and the off-beat score alike, listen to the cuts or choose another passage. Film second 0 is `audio.start` and is a beat; `"4b"` anywhere in `game.json` is four beats.
- **When the system's own music has no clear beat** (battle themes with rubato, ambient exploration music: clarity under about 0.4), take another passage of the game's own music with a clear beat, from the recording or from a music file the user gives (`audio.file`), and say so at checkpoint 1: the user decides whether that music suits the picture. Don't hand-type a grid the music doesn't have.
- **Plate material.** Frame a representative UI panel with its border (a dialogue box, the shop panel, a title bar; read the rect from `look.py --grid`). `plate.py` reads the border and inner stroke from the edge inward, the panel's top and bottom colours and its text colour, and the logo's accent; it prints a `look` block (`--write` puts it in `game.json`) and saves `out/plate/swatch.jpg`: the panel enlarged, the colour chips and a sample plate side by side. Correct by eye: the reading can mix the copper border into the panel, or miss a bevelled or gradient inner stroke (it says when the border reading is unreliable); compare the swatch with the enlarged UI (`look.py --rect` on the edge) and set the colours by hand. Switch rivets (`rivetSize` 0) and brushing (`brushed` 0) on or off by what the UI has. In plate titles `{x}` takes the inner-stroke colour (`plate.inner`); in the small call-to-action lines it takes `look.warm`: when the UI's inner stroke is silver or grey, choose `warm` from the UI's own warm highlight.
- **Fonts.** `look.title.font` matches the game's lettering (STYLE.md §4); `look.small.font` is usually `notosanssc`.

## 5. The cut list — checkpoint 1

Fill `shots` in `game.json`. Every time can be seconds or beats (`"4b"`); time codes (`"6:07.6"`) are positions in the recording.

| Shot field | Meaning |
|---|---|
| `id`, `beats` (or `dur`) | name; length in beats (whole beats keep every cut on the beat) |
| `sound` | an effect on the cut: `whoosh`, `whoosh-long` |
| `layers[]` | the pictures, one after another or overlapping in time: `{"src": "play", "in": "7:30.0", "rate": 1}` (a clip) or `{"still": "keyart"}`; `from`, `to` (time in the shot; `from` defaults to 0, `to` to the end of the shot; a later layer covers an earlier one) |
| `layers[].view` | `[x, y, w]`: the part of the source that fills the frame at the start (default: centred cover) |
| `layers[].moves[]` | `{"at", "dur", "ease", "zoom": z or [z0, z1], "focus": [x, y]}` (push about a fixed point) or `{"at", "dur", "ease", "view": [x, y, w]}` (push onto a region); `sound: "swish"` on a punch-in |
| `plates[]` | `{"text": "跨城[跑商]", "at": 0.12, "to": …, "pos": "bottom"/"top", "size": 96, "sound": "pop"}`; `at: 0` puts the plate on screen from frame 0 (the hook); `[word]` accent, `{x}` warm |
| `finale` | `crew` (`stills`, `every`: "0.5b"), `band` (`land`, `slide`: default 1.25 beats, and `land` must be at least `slide` into the shot, or the band would start before the shot exists; `sound`), `logo` (`still`, `at`, `sound`), `cta[]` (`text`, `at`, `style`: `title`, `small`, `muted`; three lines at most) |
| `card` | the library's own sign-off card (`lines`, `land`): **library demos only**, never in a user's film |
| top level | `title`, `name` (output prefix), `fps`, `poster` (film second), `sources`, `stills` (with `grab` for crops), `audio`, `look` |

Write it shot by shot from the chosen story:

- **Frame 0 is a cover**: the key art (or the game's title screen) with the first plate already on it (`"at": 0`). Key art often has the logo printed on it: keep it out of frame with `view` (the logo lands at the end, large, once).
- **One claim per shot**, the clip that proves it, the camera that makes it readable: a slow push for a place, a punch-in on the beat (`"at": "1b"`, 0.52 s) for something in the UI. Coordinates are the game's pixels after the crop (`look.py --grid`).
- **The number shot** is the longest: the clip sped up to fit the action (`rate` 1.5–2), the punch-in onto the counter, the number plate just after the figure lands (`look.py` gives the frame), then a second layer at real speed from that frame (`"in"` = the landing, `"view"` = the punched-in region) so the figure stays while the plate is read.
- **Plate timing.** A plate needs CJK ÷ 4.5 + other ÷ 15 + 1.5 s from the end of its wipe (0.36 s after `at`) to the end of the shot or its `to`: 4 characters 2.4 s, 7 characters 3.1 s, "货钞 4351 → 14775" 2.6 s. Put a plate at 0.12 s into its shot unless something must happen first; give the shot another beat or two before writing fewer words is impossible.
- **When the number doesn't stay.** If the recording moves on within a second of the landing (a result screen, a fade), follow the landing with the game's own next screen (the victory banner, the result, the "boss defeated" prompt) as further layers under the same plate, until the plate has had its reading time; never freeze a frame and never cut away while the plate is still being read.
- **The finale**: crew slices on half beats from the cut; the band lands on a downbeat with the logo; the call to action one line per beat; the last line held at least as long as it needs (TapTap 搜索「游戏名」 is about 3.7 s).

**Beat budget** at 140 BPM (a beat is 0.43 s; at other tempos keep the seconds):

| Film | Shots and beats | Seconds |
|---|---|---|
| 15 s | hook 7 (plate at frame 0, up to 6 characters) · number shot 12–14 (punch-in on beat 1, the number plate after the landing, about 2.6 s of reading) · end 12 (band, logo and the first call-to-action line on one beat, the other two lines a beat apart, the search line held about 3.7 s) | about 14.5 |
| 30–45 s | hook 8 · three or four system shots of 8 · the number shot 20–23 · a pair 12 · finale with crew 22–23 | 38–41 |

A plate's reading time and its 0.36 s wipe come out of its shot; three call-to-action lines need about 9 beats from the first line to the end of the film.
- **The stills you need cropped** (character art from a screenshot or from a frame of the recording): a `grab` with `from`, `t`, `crop`, `size`; `clips.py` makes them.

**Show the user** `STORY.md` (three options and the choice) and the cut list: each shot's clip and its time code, its plate, the number moment with its before and after, the call to action. **Wait for approval.** Change words and clips before going on.

## 6. Look at it — checkpoint 2

```sh
sh $K/tools/preview.sh <P> auto                 # three moments per shot → <P>/out/preview.jpg (REMOTE=1: on the render desktop)
sh $K/tools/preview.sh <P> 0,5,8.5,12,17.5      # or film seconds of your choice
```

It cuts the frames and the stills (`clips.py`: up to date ones are skipped), subsets the fonts (`fonts.py`: the first time it downloads the faces, about 25 MB with Noto Sans SC: a few minutes, and it needs a connection) and builds the page (`build.py`: warns about plates too short to read, numbers not in `FACTS.md`, shots not on whole beats; stops on a camera that shows past the source's edge or on a plate with two accents). Check every still enlarged: footage edge to edge; the UI readable; plates not covering what the shot is about; one accent word per plate; the number plate after the figure lands and the figure still on screen while it shows; the crew complete within a second; the logo whole and large.

**Show the user the sample stills and wait** for the look to be approved.

## 7. The film — checkpoint 3

Before rendering, tell the user how long it takes: frames = film seconds × fps; a recent Mac with 3 workers does about 25–40 frames a second on this style (a 40 s film at 30 fps renders in about a minute, plus encoding); the render desktop for long films.

```sh
sh $K/tools/make.sh <P> v001                    # → <P>/<name>-v001.mp4 and <P>/poster-v001.jpg
RENDER=remote sh $K/tools/make.sh <P> v002      # the picture on the render desktop (neo/render/remote.sh)
```

`make.sh` cuts the frames and stills, subsets the fonts, builds the page, exports the events, checks the beat grid (`beats.py`), mixes (`mix.py`: the soundtrack passage, the synthesized effects, the cue check of every cut and landing against the detected beats, −14 LUFS), renders at the film's frame rate, muxes (`LEMO_COLOR=bt709`, no grain), runs `readcheck` and writes the poster and a contact sheet (`out/contact.jpg`, a frame a second). Every rebuild is a new version (`v002`, …). Then review: the contact sheet, 0.2 s strips of the number moment and of the finale (`node core/render/still.mjs <P> --range 16.8:18.2:0.2 --out <P>/out/strip`, then `core/render/sheet.py`), the loudness line `mux.sh` prints, the cue table and the master's soft-clip line (a hit cut by more than 6 dB is too hot: lower its gain in `mix.py`'s `SOUNDS`). To compare a new version with an older one at the same moments: `$PY $K/tools/compare.py new.mp4 old.mp4 0,5,10 --out <P>/out/compare.jpg`.

The render desktop receives the project folder without its `.mp4` files and `out/`: the frames (`frames/`, a few hundred MB) travel with it, the recording does not.

**Ask the user to watch and listen to the whole film.** Sound has only been measured, not heard: the film isn't finished until they have.

## 8. Deliver

DIRECTOR.md §11: `<name>-vNNN.mp4`, `poster-vNNN.jpg`, `STORY.md`, `FACTS.md`, `CREDITS` (the game's material and whose it is, with the permission; the two OFL fonts from `fonts/fonts.json`; the synthesized effects), and the project with `game.json`. A user's film carries no NEO-Cine credit and no sign-off card. The frames in `frames/` can be deleted after delivery (`clips.py` makes them again).

## When something goes wrong

- **"镜头露出了画面外面"**: the push shows past the source's edge: push further in, or move the focus away from the edge.
- **"录像层 … 还没抽帧" / "帧和镜头表对不上"**: run `clips.py` (`make.sh` and `preview.sh` do it).
- **"缺帧 frames/…"** while rendering: the frames were deleted or the cut list changed after `clips.py`; run it again.
- **The cue check fails**: `beats.py` says whether the grid is off as a whole (move `audio.start` by the median it prints) or drifts (the tempo is off); a single bad cut means a shot that isn't a whole number of beats.
- **A plate reads too short**: fewer words, the plate earlier in its shot, or one more beat for the shot.
- **The number on the plate is not the one on screen**: check the counter after the payoff with `look.py --step`; split the layer at the landing and run it at real speed, or end the shot earlier.
- **Fonts**: "两种字体都没有这些字": a character neither face has; rephrase or choose another face (`fonts.py --list`).
- **The recording is 60 fps, the film 30**: `clips.py` takes the nearest frame; set `"fps": 60` for a 60 fps film (twice the frames).
