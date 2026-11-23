# Persona Pop — Style Prompt

*From the making of a fan MV about two AI coding assistants, by the library's author. 中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

> A vertical music video in which two anime characters, drawn as still cut-outs by an image model, act out a piece of work line by line: each lyric line gets an interface gag drawn in code (a chat, a thinking timer, a terminal, a test list, a merge conflict, a render bar), the lyrics are set on screen as karaoke type that fills on the melody, and the whole frame flips colour, cuts and bounces on the beat.
> References (grammar only): Chinese short-video "AI persona" MVs (a product drawn as a girl, her surface reply against her inner monologue); idol-anime opening credits (cut-out poses on flat colour fields, speed lines, impact frames); karaoke lyric videos. Copy none of their characters, songs, layouts or type, and never name them in the film.

Needs: the library's core tools (Node, ffmpeg 7+, the headless browser and `.venv` from `setup.sh deps`); an image tool for the cast (the library's `core/image/gen_image.py`, which drives a signed-in Codex CLI, or the user's own tool with the same prompts); fonts are fetched by the kit (OFL). A song is optional: the user's own (with timed lyrics), or none, in which case the kit writes a chip-pop backing and a melody that "sings" the lyrics. Everything else is in [`kit/`](kit/), used as [`PRODUCTION.md`](PRODUCTION.md) says.

## 1. Essence, and what it is not

- **The characters are stills that act.** Each pose is its own picture (full body or chest-up close-up) on a transparent ground; acting is choosing the next picture and moving it, never deforming a face.
- **Every line has a gag, and the gag is an interface.** The lyric says what happens; a small piece of software on screen proves it happens (the timer counts, the terminal prints, the tests flip, the conflict collapses).
- **The beat is visible.** Bodies squash on the beat, the camera kicks on the beat, cuts land on half-bars; colour fields change with the line.
- **Lyrics are type, not subtitles.** A persistent karaoke line in the top band, and on the hook a slam of big glyphs.

Not a lip-sync animation (no mouths move), not a product promo (no real product UI is shown: the interfaces are generic and drawn), not a talking head with captions.

## 2. Materials & rendering

- **Cast:** generated once per film from a written character sheet, on a transparent background (the Codex image tool returns a PNG with alpha; a tool that can't gets pure magenta `#FF00FF`, which stays away from skin, hair and the green or teal that AI characters often wear, and `kit/tools/key.py` keys it). One reference sheet per character; every later pose is generated with it as reference and with the character's silhouette words repeated in the prompt. `key.py` scales every full figure of one character by its head, not by its bounding box, so a cheer drawn smaller doesn't grow on screen (§5).
- **Mouth sheets:** for a close-up that sings, one 2×2 sheet of the same picture with only the mouth and eyes changed (closed, "ah", "oh", blink), generated with that close-up as reference; `key.py` cuts it and aligns the cells on the first one.
- **Interfaces:** HTML cards with soft neutral elevation (white, 36 px radius, a title bar), a monospace for code, a chip for every name. They are drawn, not captured: no real app's chrome, icons or logo.
- **Layers, back to front:** colour field with a faint dot grid → field effects (rays, rings, rain, streaks) → cards and props → characters → stickers (kaomoji bubbles, sparkles, stamps) → lyric layer → progress HUD → flash/impact layer.
- Everything is a pure function of time (`kit/page/tween.js`); no state between frames. No film grain: it smears flat colour.

## 3. Colour logic

- **One colour per character,** used for her chip, her karaoke fill, her side of a split. The two colours must stay apart in hue and in value, and both must read on the paper ground and on a dark field.
- **A warm paper ground** for "normal" shots; **saturated full-frame fields** for emotional beats: red = failure, green = success, deep navy = focus or conflict, a bright blue = hand-over. A field change is a cut, never a fade.
- Duets use the ink colour for the fill and a two-colour chip.
- Interface colours stay functional: red only for a failure, green only for a pass, yellow only for a warning. Shadows are neutral, never coloured glows.

## 4. Type & subtitles

- **Three families** (OFL, subset to the film's characters by `kit/tools/fonts.py`): a slanted display face for lyrics, titles and stamps (Smiley Sans); a CJK sans for interface text (Noto Sans SC); a monospace for code (JetBrains Mono). No system fonts.
- **Persistent karaoke line:** top-left, 100–110 px, each glyph grey with a 12 px white outline, filling to the singer's colour on its own note (a 0.07 s lift and back), a name chip above each half-line. The whole line is on screen from the start of its bars to their end.
- **Hook slam:** on chosen segments, the same words drop one by one at 150–190 px (≤ 960 px wide in total) in the band just below, each glyph from 2.4× to 1×, landing 25 ms before its note, with a closing "！". While the slam is up, the persistent line shrinks to half size in the corner and stays readable: the slam is a flash card (`data-pass`), the line is what readcheck times.
- **Reading:** every text the film needs read passes `readcheck.mjs` at the film's size; texture text (terminal output, file names, a timer, name plates) is marked `data-pass`. Text never sits on a face, and the top 168 px and the bottom of a 9:16 frame below ≈ 1330 px carry no words.

## 5. Motion quality

- 30 fps, on ones for camera, cards and type. Characters move by **whole-image transforms only:** a squash on the beat (scaleY −3.5 %, scaleX +2 %, back in 0.28 s), a hop (40–80 px, 0.28 s), a drop from above that lands on a beat, a slide-in, a small tilt. Nothing bends.
- **A new pose is a take:** the next image snaps in squashed (1.12 × 0.86) and settles in 0.13 s, then holds until the next beat.
- **One scale per character.** Poses of one character keep the head the same size and the body centre on the same line (`assets/chars/meta.json`, written by `key.py`); a jump pose is lifted off the floor by its `lift`, never pressed down to it. A pose change that pops in size reads as a mistake, not a take.
- **Close-ups sing.** A close-up of the singer opens its mouth on every glyph it sings ("ah" and "oh" in turn, the last glyph of a phrase held 0.3 s) and blinks once or twice while it holds (`sing`). The mouth is a change of picture, never a scale of the face.
- Eases: `back.out` for arrivals, `power4.in` for slams and stamps, `power2.out` for kicks; linear only for spins, scrolls and rain.
- Camera kicks (scale 1.02–1.035 back to 1) on beats or half-bars; all simultaneous push amounts together stay under 0.06, or the frame edge shows.
- Characters breathe or bob in every shot, except inside a **freeze**, where nothing moves but the colour.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| hard cut to a new colour field | a change of state | a failure; a success; a decision |
| cut to a chest-up close-up with a slow push | an inner thought | hesitation; a realisation; a grin |
| two characters on a diagonal split | two sides, two jobs | a duel; "you do yours, I do mine"; a comparison |
| manga panels thrown in at a tilt | a shared reaction | panic; laughter; disbelief |
| a character bursts in, the other is knocked out of frame | a takeover | "stop thinking, just run"; an interruption |
| a grid of tiles flipping in on the beat | many results at once | a batch; a gallery; a checklist |
| freeze: everything holds, the field keeps its colour | the moment before the turn | the silence before a chorus; a punchline |

Cut on half-bars (2 s at 120 BPM), and twice inside a line when the line turns; a line is never one locked shot. Subjects at a key beat fill at least a third of the frame height. Allowed transitions: hard cut, cut with a one-frame white flash, a two-frame impact frame. No dissolves, no wipes that slide the whole frame.

## 7. Sound palette

- **With the user's song:** the song unchanged, effects under it (6 dB lower, kept off the vocal's consonants).
- **Without a song:** a chip-pop backing (square-wave sixteenth arpeggios, a saw bass with upper harmonics, a four-on-the-floor kick in the chorus and a half-time beat in the verses, a soft detuned pad), and a **lead that sings the lyrics:** one note per glyph from the picture's `syl` events, chord tones on strong beats, the root at the end of a phrase, one timbre per character (a soft triangle for the thinker, a narrow pulse for the runner), a third below for duets.
- **Foley is the interface's own sound:** whoosh on a cut, pop on a pose, a key click run on typing, a bell on a pass, a low buzz on a failure, a clack-and-thump on a stamp, a thump on a landing, a crash on a clash. Every sound comes from a picture event (`window.EV`); accents written on the beat grid name their event and are checked to 0 ms (`neo/audio/cues.py`).
- **Silence is a tool:** a freeze takes the whole backing out, leaving true silence, broken by the next downbeat. Mix to −14 LUFS with one gain (`neo/audio/master.py`).

## 8. Native moves

- **Surface and inside.** The character's calm answer in a chat bubble against her racing inner timer and draft lines. *Fits content like:* a support bot keeping its cool; a student before an exam; a PM promising a date.
- **The thinking timer.** A counter that runs too long, then flips to a green "done in 6.0 s". *Fits content like:* a slow build; a long meeting; a model that overthinks.
- **Red, freeze, green.** A list turns red row by row with a shake and glitch bars, a full-red field with panicked panels, a half-second freeze of silence, then every row flips green with rings on the chorus. *Fits content like:* a failed deploy; a bad exam; a match lost and won back.
- **The collision.** Two cards (two opinions) slam together twice and fuse into one line under a stamp. *Fits content like:* a merge; a negotiation; two recipes becoming one.
- **Lanes and tape.** A diagonal split with each character's own list and lock, crossed by caution tape. *Fits content like:* team roles; "don't touch my file"; a shared flat.
- **The flip wall.** A grid of the film's own cast images flipping in one per beat with a counter. *Fits content like:* a batch job; a yearbook; a product range.
- **Drop on the beat.** Characters fall from above and land exactly on beats, squashing on contact. *Fits content like:* an ending pose; a team reveal; a surprise guest.

## 9. Pitfalls of the medium

- **Drifting characters.** Without a reference sheet and repeated silhouette words, the second pose changes the hair or the clothes. Fix: generate the sheet first, attach it to every pose, check all poses side by side before animating.
- **Magenta fringes.** Keying without spill suppression leaves pink outlines on hair. Fix: a transparent background where the tool can; otherwise `key.py`; look at every cut-out on a dark field.
- **Size pops on a pose change.** Every image trimmed to one height makes a pose with raised arms or bent legs a different size, and a jump lands on the floor. Fix: `key.py` scales by the head and reports poses whose head-to-feet is short; give jumps a `lift`; check all poses side by side at their real scale.
- **A dead close-up.** A close-up held through its own lyric with a shut mouth looks like a sticker. Fix: a mouth sheet and `sing`.
- **Moving a face.** Rotating a full image more than a few degrees, or scaling it unevenly while it talks, reads as rubber. Fix: change the picture instead.
- **Lyrics against the slam.** A slam on top of the persistent line is unreadable; a slam alone fails readcheck. Fix: shrink the line into the corner while the slam is up.
- **Real product UI.** Drawing a real app's interface or logo turns a fan film into a counterfeit. Fix: generic cards, names on chips only, an unofficial-fan note in the credits.
- **Even pacing.** Cutting every beat for 40 s numbs. Fix: vary shot length with the line, keep one freeze and one long held close-up.
- **Glyphs missing from the font.** Symbols like ✗ ✎ are often in neither face. Fix: `fonts.py` lists them; replace with × or words.

## 10. Engine

The kit in [`kit/`](kit/) makes a whole film; [`PRODUCTION.md`](PRODUCTION.md) is the order of work.

- `kit/page/tween.js`: GSAP-style `fromTo / to / set` with stagger, repeat + yoyo, keyframes, colours, SVG attributes and `num()` text tracks, computed as a pure function of time.
- `kit/page/persona.js`: the parts (`char`, `cu`, `rays`, `streaks`, `emo`, `sparkle`, `flash`, `impact`) and the moves (`cut`, `swap`, `bob`, `hop`, `drop`, `kick`, `shake`, `impactAt`, `twinkle`, `emoPop`, `typeText`, `count`, `freeze`), each registering its picture event, and `sing` (lip sync from the lyric times; a change of picture, no event of its own).
- `kit/page/film.js`: mounts the parts, the lyric layer (persistent line + slams from `data/lyrics.json`) and the progress HUD; provides `DUR`, `render`, `EV`, `TEXTS`, `READY`. `kit/page/base.css`: the shared look.
- `kit/tools/`: `cast.py` (cast images through `gen_image.py`), `key.py` (background, one scale per character, sheets cut and aligned, `meta.json`), `grid.py` (glyph times on a beat grid, or aligned to the vocal's word times), `fonts.py`, `mix.py` (backing, lead, foley, cue check, master), `make.sh` (the whole build).

A part that is not in the demo, a phone notification that pops on the second beat and shakes:

```js
{ id: "notif", start: 8, dur: 4,
  html: `<div class="card" id="n1" style="left:120px;top:700px;width:840px;height:160px" data-read="CI 失败：3 个用例">CI 失败：3 个用例</div>`,
  build(c) { c.pop("n1", 0.5); c.shake("n1", 0.5, 14); c.hit("buzz", 0.5); } }
```

## 11. Variation space

The film decides: the two (or three) characters and their colours, what work they do, which lines get slams, which shots are close-ups, where the freeze falls, the field colours within §3, and the HUD's label.

- **Structures:** a day from request to delivery; a rivalry that turns into a duet; a list song where each verse is one feature.
- **Openings:** a notification that wakes both characters; a split-screen standoff with name plates; the end result first, then "eight hours earlier".
- **Endings:** both drop onto the final beat and pose; the HUD hits 100 % and the screen goes dark on a last bell; one character hands the other a cup, freeze, title.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
