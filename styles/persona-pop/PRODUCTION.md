# Persona Pop — production manual

*中文版：[PRODUCTION.zh-CN.md](PRODUCTION.zh-CN.md)*

How a film in this style is made with the library alone: the kit in [`kit/`](kit/) (the page that plays the film, the tools that make the cast, the lyrics, the fonts and the sound) and the library's `core/` and `neo/` tools. The look and its rules are in [`STYLE.md`](STYLE.md); this file is the order of work. It takes the place of AGENTS.md's treatment and storyboard steps for this style, with three points where the user confirms (part of the style, not optional): the cast, the gag table, the film.

Run every command from the library root (`$LIB` in skill mode). `<P>` is the film's project folder (AGENTS.md, "Where things go"). `K=styles/persona-pop/kit`, `PY=.venv/bin/python`.

## 0. The brief

Ask once for what the request doesn't say:

- **Who the characters are:** two (at most three), each with a role in the work ("the one who thinks", "the one who runs"), a signature colour, and whether they stand for a real product. A real product makes the film an unofficial fan film: say so to the user, draw no logo or interface of it, and put the note in the credits.
- **What work they act out:** the lines of the story, ideally as lyrics already (6–12 short lines, 4–8 characters each).
- **The song:** the user's own (mp3, wav or m4a, with timed lyrics: an LRC file from the song generator is best), or none (the kit writes a backing and a lead that sings the lyrics).
- **Length and format:** 30–60 s, 9:16 (1080×1920) by default.
- **The image tool:** `$PY core/image/gen_image.py --check` (a signed-in Codex CLI); otherwise the user's own tool, with the prompts from step 2.

## 1. Create the project

Copy the demo's four files as a start: `mv.json`, `cast.json`, `index.html`, `scenes.js` from `styles/persona-pop/demo/` into `<P>/`, then empty `sheet`, `make` and the parts. The imports in `index.html` and `scenes.js` are absolute (`/styles/persona-pop/kit/page/…`), so they work from any folder.

| `mv.json` field | Meaning |
|---|---|
| `name`, `title` | file prefix (`<name>-v001.mp4`), the film's title |
| `fps`, `dur`, `size` | 30, the length in seconds, `[1080, 1920]` |
| `bpm`, `grid` | tempo; the glyph grid in seconds (0.25 = eighth notes at 120 BPM) |
| `sections` | `[{id, t, bars}]`: intro, verse, chorus, outro… (from the song, or chosen) |
| `sheet` | the lyrics, line by line (format in `kit/tools/grid.py`) |
| `score` | without a song: `chords` per section (MIDI triads, or the name of another section) and `drums` (`none`, `half`, `full`, `hit`) |
| `audio`, `audio_t0` | with a song: the file in `<P>/audio/`, and the song time at the film's 0 |
| `poster`, `hud` | film second of the poster frame; the label on the progress HUD (`false` for none) |

## 2. Cast (the user confirms)

1. Write each character's `look` in `cast.json` (age, hair, face, clothes, one prop, one character trait) and the common `style` (art style; the background sentence is added by `cast.py`: transparent by default, `"bg": "magenta"` for a tool that can't do alpha).
2. List the poses in `make`: a reference sheet first (front, neutral), then the poses the lyrics need (thinking, working, panic, cheer, a final pose) and 2–3 chest-up close-ups per character. Every pose after the first has the sheet in `ref`.
3. For every close-up that sings its own line, add a mouth sheet to `make`: `"grid": [2, 2]`, four `cells` (`<who>-cu-<pose>-m`, `-a`, `-o`, `-b`), the close-up in `ref`, and a prompt that keeps everything but the mouth and eyes (closed, "ah", "oh", blink). Add the cells to `images`.
4. `$PY $K/tools/cast.py <P>` (or `--dry` to print the prompts for another tool), then `$PY $K/tools/key.py <P>`. Read its report: a pose whose head wasn't found is placed by its box (look at it, regenerate if it drifts); a pose whose head-to-feet is short is a jump, a crouch or a seat: give a jump `"lift"` in `make` (the report suggests a value) and run `key.py` again.
5. Show all cut-outs side by side on a dark field, each at its real scale from `assets/chars/meta.json`, and every mouth sheet's four cells in a row. **The user confirms the cast** before any scene is built; a pose that drifts is regenerated, not animated.

## 3. Song and glyph times

- **No song:** fill `sheet` with each line's start (`at`, on a beat) and an optional `rhythm`, run `$PY $K/tools/grid.py <P>`. It refuses a line whose last glyph is less than 0.3 s from the line's end.
- **The user's song:** put it in `<P>/audio/`, set `audio`, and read the sections from it (Scrapbook Song's `styles/scrapbook-song/kit/tools/analyze.py` prints beats and downbeats). Get glyph times from the vocal with faster-whisper (voice tier, TECHNIQUE.md §4), on a separated vocal if the mix is dense, and save them as `<P>/data/words.json` (`[{"w": "需", "t": 4.02}, …]`, one glyph per entry, in order). `grid.py <P> --words <P>/data/words.json` matches them to `sheet` glyph by glyph and stops at the first mismatch: fix the text or the times by hand.

## 4. The gag table (the user confirms)

One row per lyric half-line: time, singer, the interface gag that proves the line, the shot (full figure, close-up, split, panels, field colour), the pose, the sound it makes, and whether it slams. Mark the one freeze and the impact frames. **The user confirms the table**; it is the treatment.

## 5. Scenes

Write `scenes.js` from the table: one part per 4 s (or per line), `html` from the parts in `kit/page/persona.js` (`cu(…, {mouth: true})` for a singing close-up), `build(c)` with its moves (`c.sing(id, who, t0, t1, {blinks})` in that shot) and `c.hit()` for every sound that is not already registered by a move. Add each new sound type to `SOUND` in `kit/tools/mix.py` (or rename it to an existing one). Mark readable text `data-read`, texture text `data-pass`. Styles for the film's own cards go in `index.html`.

Review stills as you go: `node core/render/still.mjs <P> 5 9.5 18 --size 1080x1920 --out <P>/out/stills`.

## 6. Build

```sh
sh $K/tools/make.sh <P> v001
```

Glyph times → keying (only new images) → font subsets (stops on missing glyphs) → events → mix (backing and lead, or the song; foley from events; cue check; −14 LUFS) → render → mux (BT.709, no grain) → readcheck at 1080×1920 → poster. Each run is a new version; an existing number is refused.

## 7. Review and deliver (the user confirms)

- A contact sheet every 1.6 s (`still.mjs --range 0.6:<dur>:1.6`, then `core/render/sheet.py`), twice: once for faces and text, once for the beat.
- Gates: `mix.py`'s cue report (every accent 0 ms off), `master.py`'s check, `mux.sh` at −14 LUFS without warnings, readcheck passing. Listen to the freeze: it must be silent.
- Deliver what DIRECTOR.md §11 lists: `<name>-vNNN.mp4`, `poster-vNNN.jpg`, the project folder, and the credits (the characters' tool and prompts in `cast.json`, the fonts, the song's owner, the fan-film note if any).
