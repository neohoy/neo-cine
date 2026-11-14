# Scrapbook Song — production manual

*中文版：[PRODUCTION.zh-CN.md](PRODUCTION.zh-CN.md)*

How a film in this style is made from the user's **song and its timed lyrics**, with the library alone: the kit in [`kit/`](kit/) (Python that draws the scenes as SVG, the page that plays them, the command-line tools) and the library's `core/` and `neo/` tools. The look and its rules are in [`STYLE.md`](STYLE.md); this file is the order of work. It takes the place of AGENTS.md's treatment and storyboard steps for this style: the imagery table and the scene table are the treatment, and the user confirms them (the three checkpoints below are part of the style, not optional).

Run every command from the library root (`$LIB` in skill mode). `<P>` is the film's project folder (AGENTS.md, "Where things go": `films/<name>/` in a clone, `<name>/` in the user's folder in skill mode; never inside `styles/`). `K=styles/scrapbook-song/kit`. Python is the library's `.venv/bin/python` (`PY`).

## 0. The brief

Ask once (AGENTS.md, Workflow) for what the request doesn't say:

- **The song** (mp3, wav, m4a) and **timed lyrics**: an LRC file is best (music platforms and song generators give one); a table of start times works; without either, transcribe the vocal with faster-whisper (voice tier, TECHNIQUE.md §4) and correct the text by hand with the user's lyrics.
- **Whole song or an excerpt** (which part: a chorus, the last minute).
- **Simplified or Traditional** Chinese (default Simplified; Traditional is Taiwan standard).
- **A one-line theme**: who sings, what happens. If they give none, propose one from the lyrics in the same message.
- **How the song is credited**: title, who wrote and sang it.

The frame is 1920 × 1080 at 24 fps. No voice-over, no added music: the song is the soundtrack and its lyrics are the subtitles.

## 1. Create the project

```sh
$PY $K/tools/new_project.py <P> song.mp3 lyrics.lrc --title 歌名 --artist 演唱 --year 2026 [--script zh-Hant] [--name file-prefix]
```

It copies the song to `audio/`, writes `mv.json`, the templates (`scripts/scenes/_template.py`, `scripts/assets/_example.py`, `design/imagery.md`) and a draft `CREDITS`, downloads the four OFL fonts (`out/fonts-src/`), analyses the song (`data/audiomap.json`) and imports the lyrics (`data/lyrics.json`). A Traditional film needs OpenCC in the project: `$PY -m pip install --target <P>/.pylib opencc-python-reimplemented`.

| `mv.json` field | Meaning |
|---|---|
| `title`, `artist`, `year` | the work; they may appear on a title page drawn in the film |
| `script` | `zh-Hans` or `zh-Hant`: every text is converted when a scene is written |
| `name` | prefix of the output files (`<name>-v001.mp4`) |
| `audio`, `audio_t0` | the song file; the song time at its first sample (0 for a whole song, the start time for an excerpt file) |
| `audiomap`, `lyrics` | `data/audiomap.json` (beats, downbeats, drums, energy), `data/lyrics.json` (one line per entry: start, end, text) |
| `range` | `[from, to]` in song seconds: the part of the song the film covers (null = from the first scene's start to the last scene's end) |
| `fade` | `[in, out]` seconds of fade at the ends of an excerpt (default `[0.25, 2.6]`) |
| `scenes` | the scene table: `{"id", "start", "end", "builder": "scripts/scenes/<id>.py", "args": []}`, song seconds, tiling `range` with no gap |
| `hits` | extra beat hits `{name, t}` (song seconds) for the cue check; scenes register theirs with `sc.hit()` |
| `pass_texts` | `{scene id: [text, …]}`: texts not meant to be read in full (a prop flying past); say why next to it |
| `poster` | film second of the poster frame |

All times in scripts are **song seconds**; the page's time is `song time − range[0]`.

## 2. Read the song

- `data/audiomap.json` comes from `$PY $K/tools/analyze.py <P>` (numpy and scipy: beat grid by dynamic programming, downbeats, drum hits by band, energy phases). It prints the downbeats, the energy phases and the strong hits: cut the song into intro, verses, pre-chorus, chorus, bridge and outro with them and the lyric times.
- `$PY $K/tools/lyrics.py <P> --show` prints every line with its nearest downbeat. LRC has no end times: a line ends 0.2 s before the next starts; fix long held notes and lines before an instrumental by hand in `lyrics.json` (the reading rule is measured against `end`).
- `$PY $K/tools/repeats.py <P> <start> <end>` finds where a passage repeats (score ≥ 0.4 = the same melody). If every line of a chorus has the same shift, the scenes of one chorus can be reused for another with their own lyrics (one builder, two entries with different `args`). Check that the shift holds line by line: a line that differs points to a wrong timestamp.
- Check the analysis against the song where it matters: the downbeat phase, a slam on a drum hit. The analysis is good to a few milliseconds on a clear drum track; labels (kick, snare) are rough, pick hits by `energy`.

## 3. From words to pictures, and the asset sheet

Fill `design/imagery.md` (STYLE.md §1 and §4):

- **The whole film:** the theme, who sings (age, clothes, one signature colour), the motif and its direction, the places, the ground-colour order.
- **Line by line:** the concrete nouns, the place, the action, the time of day; **at least one thing in the picture comes straight from the line**; an abstract word gets a drawable stand-in (never a heart, a globe, a beam of light); and which carrier the line sits on (STYLE.md §4 table).
- A real place or a local food is drawn from what it really looks like: look it up; if you can't find out, don't draw it.

Draw the song's own characters and props as functions in `<P>/scripts/assets/*.py` (copy `_example.py`): each thing around its own origin, with the pencil in `kit/draw.py` (`person_front`, `person_side`, `person_back`, `bike`, weather, plants, buildings) and the kit's palette, each module listing what to show in `SHEET`. Then

```sh
$PY $K/tools/asset_sheet.py <P>          # → <P>/design/asset-sheet.jpg (8 drawings per page)
```

Look at every drawing: proportions, broken outlines, one character still the same person in every pose and age, each prop recognisable as the thing in the lyric.

## 4. The storyboard — checkpoint 1

Cut the song (or the excerpt) into scenes and write them into `mv.json` `scenes`:

- About two lines per scene, 9–10 s, one group per line, the groups swapped by a wind band; a run of short lines can share one scene (a four-panel comic), a long line can have its own.
- A cut lands about 0.2 s before the next line starts, or on a downbeat. Scenes tile `range` with no gap.
- Instrumental bars are not empty: a still life of the song's things, a tear-off calendar, the motif alone (STYLE.md §8).
- Neighbouring grounds far apart; the hook on the most saturated ground.

Write `STORYBOARD.md` in the project: one row per scene with time, section, lyrics, picture and carrier. **Show the user the asset sheet and the storyboard together and wait.** Change the assets they ask for before any scene is written.

## 5. Scenes

One builder per scene, `scripts/scenes/<id>.py`, copied from `_template.py`:

```python
from scene import *; from draw import *; import typo
from cast import *                          # this song's drawings (scripts/assets/cast.py)
sc = Scene("s02-dusk", bg=PAPER)            # span from mv.json; element ids get the prefix "s02"
...  body = ga + gb + sc.band("mid", NIGHT, YEL); sc.band_through("mid", GB); sc.write(body)
```

| Call | Does |
|---|---|
| `Scene(id, p=None, bg)` | reads the scene's span; `sc.L(t)` turns song time into scene time for the script |
| `typo.label_line(sc, key, li, x, y, size, i=…)` and the other carriers | a sung line `li` typed glyph by glyph on its syllables (STYLE.md §4) |
| `typo.slam(sc, key, text, x, y, size, times)` | the hook slammed on the beats (one per scene) |
| `sc.chars` / `sc.pop_chars` / `sc.line` | low-level glyph layout (prefer the carriers) |
| `sc.blow_chars(key, n, origins, t)`, `typo.blow_off` | the wind takes a line away, only after it has been sung through |
| `sc.band(name, colour)` + `band_in` / `band_out` / `band_through` | the wind-band transition |
| `sc.group`, `sc.wob`, `sc.wobT`, `sc.grain`, `tag(*sc.page())` | grouping, boil, paper grain, page number |
| `sc.show` / `sc.hide(selectors, t)`; `sc.js.append("tl.fromTo(…)")` | direct timeline lines; times through `sc.L()` |
| `sc.hit(name, t)` | a hit that must land on the music (checked in step 7) |
| `music.beats(t0, t1)`, `music.downbeats`, `music.half_beats()`, `music.hits(t0, t1)`, `music.syllables(i)` | the song's grid |

In the timeline script: `q(ease, d)` (every drawn tween, on twos), `pop`, `cycle` (swap drawings), `jitter` (stepped flutter), `bump`, `drawOn`, `blowAway`. Seek-safe rules (STYLE.md §9): one transform origin per element; big travels on an outer layer or as a computed `transform` attribute; no transform attribute on a tweened element; no randomness or clocks in the script (seed in Python); compute every number in Python.

```sh
$PY $K/tools/build.py <P> s02-dusk          # → <P>/scenes/s02-dusk.html (+ manifest, page files)
$PY $K/tools/fonts.py <P>                   # subset the fonts to the printed text; stops on a missing glyph
sh $K/tools/preview.sh <P> 12.4,15.0,18.2    # song times → <P>/out/preview.jpg   (REMOTE=1: on the render desktop)
```

Preview every scene before the next: its opening, the middle of each group, the moment each line is complete, its end. Look for text covered or cropped, an empty composition, things hanging off the edge, the motif going the wrong way.

## 6. Sample — checkpoint 2

Build one or two representative scenes first (a verse scene and the first chorus) and render them with the music:

```sh
SAMPLE=s02-dusk,c1-gust sh $K/tools/make.sh <P> v001      # → <P>/<name>-sample-v001.mp4 (RENDER=remote on the desktop)
```

**Show the sample to the user and wait** for the look and the pace to be approved before the rest of the scenes are drawn.

## 7. The whole film — checkpoint 3

When every scene exists: `$PY $K/tools/build.py <P>` (all of them, so no scene is stale), then preview again where scenes meet. **Before rendering, tell the user how long it will take:** frames = film seconds × 24; the render desktop with 4 workers does about 12 frames per second (a 3½-minute song: about 7 minutes, plus a minute or two to encode and copy back), a recent Mac with 3 workers about 5–8.

```sh
RENDER=remote sh $K/tools/make.sh <P> v001       # → <P>/<name>-v001.mp4 and <P>/poster-v001.jpg
```

`make.sh` builds the scenes, subsets the fonts, exports the events, cuts the song (`tools/mix.py`: fades, the cue check of every hit against the song's beats and drums, −14 LUFS), renders, muxes, and runs `readcheck` (the text that is not lyrics) and `lyriccheck` (the lyrics: a line must be complete by the end of its singing; notes for lines that hold briefly). Then review: a contact sheet of the film (one frame every 2 s), every cut, the loudness line `mux.sh` prints, and the lyriccheck notes. Every rebuild is a new version (`v002`, …).

## 8. Deliver

DIRECTOR.md §11: `<name>-vNNN.mp4`, `poster-vNNN.jpg`, `CREDITS` (the song as the user wants it credited, the fonts, the tools; complete the draft), `STORYBOARD.md` and the imagery table. A user's film carries no NEO-Cine credit and no end card of ours; a title page with the song's title and singer, drawn in the film, is theirs to have.

## When something goes wrong

- **A scene stays on its first state, or a band covers the frame:** a Python expression was written into the JS as text (a `ReferenceError` in the page): compute it in Python first.
- **A drawing jumps between frames rendered on different machines:** a seek-unsafe tween (STYLE.md §9); `gsap-lite.js` warns in the console when a tweened element carries its own transform.
- **`fonts.py` stops on missing glyphs:** reword, or (Traditional) check that every text went through `script` conversion.
- **The cue check fails:** a hit placed by hand on a time that is not a beat or a drum hit; move it to `music.beats()` / `music.hits()`, or check the analysis against the waveform.
- **`lyriccheck` fails a line:** it is not complete before its singing ends: start it earlier, put it on a carrier that writes faster, or move the cut.
