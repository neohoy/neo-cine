# Scrapbook Song — Style Prompt

*From the hand-drawn music video for 风吹新竹 and the production kit made with it. 中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

> A cel cartoon drawn frame by frame: thick ink outlines, flat saturated fills, hard ink drop shadows, every line boiling, drawn motion on twos. The words being sung or said are typed in glyph by glyph on the syllables and live **on things in the picture** (a paper label, a black ribbon, a shop sign, a couplet, a road sign, a seal, the night sky) or are slammed in big on the beat, so the page reads like a collage of stickers, tape and stamps. The pictures are redrawn from the words every time.
> References (grammar only): hand-drawn lyric videos and zine collage (type that sits on objects, stickers, tape, rubber stamps); limited-animation TV cartoons (on twos, substitution poses, squash on landing, speed lines); comic panels (speech bubbles, burst clouds, 2×2 grids). Copy none of their characters, layouts, lettering or music, and never name them in the film.

Needs: the library's core tools (numpy, scipy, fonttools, pillow; ffmpeg; the headless browser). The user's song and its timed lyrics (LRC). For Traditional Chinese, OpenCC (`opencc-python-reimplemented`), installed into the project (`<project>/.pylib`). Fonts are fetched by the kit (OFL). Everything else is in [`kit/`](kit/): a film in this style is made with it, step by step, as [`PRODUCTION.md`](PRODUCTION.md) says.

## 1. Essence, and what it is not

- **One ink, one weight.** Every shape has the same near-black outline (7 px at 1920 wide), round joins; thick things (limbs, scarves, roads) are an ink stroke with a colour stroke on top. Nothing is drawn without an outline except glows and the paper grain.
- **Flat colour and hard shadows.** Fills are single flat colours, never gradients; depth is a solid ink shadow offset 10–14 px down-right.
- **Everything boils.** Drawn lines re-jitter every 1/12 s through a cycle of three noise seeds; text boils at about half the amplitude so it stays legible.
- **Words live on things.** A line of text is typed in glyph by glyph as it is sung, on a carrier that belongs in the picture; a hook or a key word is slammed in big. No karaoke colour wipe, no subtitle bar.
- **Pictures come from the words.** Each picture holds at least one thing taken directly from the line on screen (an abstract word gets a drawable stand-in); characters, props and places are designed from the text, never reused from another film.
- **One motif with a direction.** A recurring thing (wind, rain, a lamp, a road, a train) carries the film, always moving the same way across the frame.

Not Crayon Picture Book (no wax texture or watercolour wash: the fills are flat), not Rubber Hose (no 1930s black-and-white bounce, no pie-cut eyes), not kinetic typography (the words never float on an empty ground; they sit on drawn objects), not a vector explainer (no gradients, glows, HUDs or icons), not a slideshow (no photographs anywhere).

## 2. Materials & rendering

- **SVG generated in code, one scene at a time.** A scene is one SVG (1920 × 1080 view box) plus a timeline of tweens; Python composes the drawing from small functions, the page evaluates the timeline for any time t.
- **Layer stack of a scene:** ground colour → the drawing inside a displacement filter (turbulence, base frequency 0.022, scale 6) → the text inside a gentler one (0.035, scale 3.2) → paper grain (fractal noise, base frequency 0.8, opacity 0.35 on dark grounds, 0.45–0.9 on light ones, composited *inside* its own rectangle so a hidden scene paints none) → the page number.
- **Boil is procedural and per scene.** Each scene owns its three filters (ids carry the scene's prefix); their seeds step 1→2→3 every 1/12 s. Never boil with random offsets in script.
- **Shapes:** outlined paths, circles, polygons; clouds as a union of circles with one contour; burst clouds as star polygons with a seeded jitter; wind curls as one open stroke. A card, sign or board is a rectangle with its offset ink shadow.
- **People are parametric:** a head radius r sets the figure; front view (hair style, eyes, mouth, arms, leg length), walking side view with two leg drawings, back view, a rider. The same character at another age keeps hair, signature colour and accessory and changes only head size and leg length.
- **No photographs, scans, textures or gradients.** Light is a flat yellow shape; night is a flat dark ground with lit window rectangles.

## 3. Colour logic

- A warm off-white paper and one near-black ink are the constants. On top: a handful of saturated flat colours (pink, teal, yellow, vermilion, orange, bamboo green, night blue, buff).
- **One ground colour per group of shots**, and neighbouring groups far apart in hue or value; the hook or chorus gets the most saturated ground; the opening and the close may return to paper.
- **The protagonist's signature colour** stays for the whole film and is shared with the motif (in our demo the scarf, the wind and the light are one yellow).
- **Text colours rotate** through fixed pairs (paper/ink, ink/paper, yellow/ink, pink/white, teal/white, red/yellow, white/ink, orange/ink) so two neighbouring labels never match. Red is kept for seals and slammed words.
- Ink is never replaced by grey or by a darker hue of the fill.
- Example (our demo): paper `#F3EDE0`, ink `#191919`, pink `#E8457A`, teal `#3FB8A4`, yellow `#F5D03B`, red `#C8352E`, night `#1E2A78`, orange `#F08A3C`, bamboo `#3E8E5A`.

## 4. Type & subtitles

- **Two families do the work** (OFL, subset to the characters used): a rounded display face for slams, ribbons and seals (ZCOOL KuaiLe for Simplified Chinese; Chiron GoRound TC 900 for Traditional, which ZCOOL KuaiLe lacks) and a handwritten kai face for sung lines and labels (LXGW WenKai TC). A mono face for page numbers and ticket numbers, an italic serif for a hand signature.
- **Sizes at 1080p:** lines and labels 70–96 px, vertical boards 70–80 px, slams 160–240 px with a 14–20 px ink outline and a 10–14 px hard shadow, fine print (page number, ticket) 22–38 px.
- **The words are the subtitles.** There is no separate subtitle track and no bottom bar: each line is set on a carrier in the picture, one line one carrier:

| Carrier | Fits |
|---|---|
| plain typing (white glyphs with an ink outline on dark grounds) | any line |
| paper label with tape, slightly tilted | a quiet line |
| black ribbon with forked tails, display glyphs | a declaration, the last line of a section |
| vertical shop sign, hanging tag, chalk menu board | streets, shops, food, classrooms |
| a pair of red couplets (right board first) | doors, temples, festivals |
| green road sign over the scene | roads, travel, distance |
| speech bubble with one big word | a shout, a sung "ah" |
| red seal stamped on a beat, ink specks | titles, place names, a sign-off |
| a shooting star writing in the sky | night, wishes, names, promises |
| glyph stickers flying out of a mouth or a window | laughter, noise, words on the wind |
| slam: big glyphs dropped one by one, squash, settle | the hook, one key word — at most one per shot |

- **Typing follows the voice:** each glyph pops in (0.25 s, from 0.3× with a small rotation, overshoot ease) just ahead of its syllable; without word timings, spread the glyphs over the first 72 % of the sung span, each 0.04 s early. Early is better than late. Never a per-glyph colour wipe.
- **Reading:** a line is complete and fully in frame by the time its last syllable is sung and stays complete until the line has been sung through; only then may the wind blow it off. Aim to keep it complete ≥ 0.6 s and to hold ≥ max(1.8 s, sung span + 0.6 s); a held last note may run over a cut. Other text follows the reading-time rule (`readcheck.mjs`).
- **One script per film:** Simplified or Traditional, never mixed; convert whole strings, not single characters (a converter needs the context).

## 5. Motion quality

- **Drawn motion steps at 12 fps (on twos):** every tween's progress is floored to 1/12 s steps before easing. Only camera effects run smooth: a fade to black, a 2-frame white flash. A push-in moves the drawn page itself, so it steps with the drawings.
- **Poses swap, they don't morph:** walking alternates two leg drawings every 1/6 s; hair and scarves cycle three drawings; flutter and bob are stepped transform states.
- **Landings squash:** a slammed glyph, a stamp, an object hitting the floor squashes for 1/12 s, then settles with an overshoot. Fast moves get speed lines, never motion blur.
- **Hits sit on the music:** colour flips, slams, stamps and landings land on the beat or drum hit (within half a frame). Continuous moves (walking, flying, riding) are timed in seconds, not to the beat.
- **Group swaps and cuts** land about 0.2 s before the next line starts, or on a strong beat.
- **The motif keeps its direction** for the whole film (hair, scarves, leaves, paper and blown-off words all go the same way).
- **What never moves:** the ground line and the frame; glyphs being read only boil.

## 6. Camera grammar

The frame is mostly a locked page; movement comes from the drawings. A vocabulary, not a route; opening and ending come from the topic.

| Move | What it expresses | Can serve |
|---|---|---|
| Locked tableau | the page as a whole | a place being set; a line with its object |
| Close-up on a burst or sunburst ground | the feeling at full volume | a hook; a shout; a laugh |
| Push into one window or object until it fills the frame, then swap | going inside | outside to inside; a memory; home |
| The world slides down past a held object | a tilt upward | a kite rising; night falling; an ending |
| Split screen with a jagged ink seam | two places at once | distance; two people; then and now |
| 2×2 comic grid, one panel per line | a quick list | short verse lines; a routine |
| Top-down into a container | gathering | packing; collecting; a recipe |

Key figures fill at least a third of the frame height in close shots; a carrier never covers a face. Transitions: a **wind band** (a wavy band with wind lines sweeping across in 0.25 s, coloured like the next ground), a hard cut on a beat or just before a line, a 2-frame white flash into a hook, a push-through. Never a dissolve, a whole-frame shake or a handheld drift.

## 7. Sound palette

- **The words' own sound is the score.** For a song, the song itself, unchanged: no added beds or effects on top of it. Fade in over 0.2–0.3 s and out over 2–3 s where the excerpt starts and ends.
- **For spoken words** (a poem, a slogan, a narration): a warm voice and a light plucked or toy-piano bed; small dry foley for the drawn hits (paper slap for labels, wooden thock for stamps, a soft whoosh for the wind band).
- **The picture is cut to the sound:** analyse the track (beat grid, downbeats, drum hits) and place every hit on it.
- Silence is a held drawing with only the boil moving; mix to −14 LUFS with one gain for the whole film.

## 8. Native moves

- **Passing lights up.** Lanterns or windows light one by one as a character passes, each snapped to the next half-beat. *Fits content like:* a night walk home; a shop street opening; a train past a platform.
- **The height mark.** A door frame as a growth chart: on each downbeat the figure swaps to an older drawing and a pencil marks the year. *Fits content like:* "growing up"; a company's years; a tree in a schoolyard.
- **Tear-off calendar.** One page per beat flies off with the wind while the sky outside cycles. *Fits content like:* waiting; an instrumental bridge; a countdown.
- **Things drop into a container.** Top-down suitcase, basket or box; each object drops from 1.7× on a beat and squashes. *Fits content like:* packing to leave; a recipe; what a city is made of.
- **Split screen.** Two places side by side, a jagged ink seam, a paper plane or a dashed arc crossing it. *Fits content like:* long distance; two jobs; day and night shifts.
- **Four-panel comic.** One short line per panel, each panel slammed in 0.28 s before its line. *Fits content like:* a daily routine; four reasons; a list of chores.
- **Laugh close-up.** Big faces on a sunburst, hair on a three-drawing cycle, glyph stickers flying out of the mouths. *Fits content like:* a chorus of friends; cheering; a punchline.
- **Seal on the beat.** A vertical red seal stamps down with a squash and ink specks. *Fits content like:* a place name; a title; a signature.
- **Push into the last lit window.** The camera dives into one window on an exponential ease; inside, the line's key word drops. *Fits content like:* "home"; a lit office at night; a hospital room.
- **The photo comes alive.** A taped polaroid in a scrapbook fills the frame and starts moving. *Fits content like:* a memory; a before-and-after; a family story.
- **Blow-off.** After a line has been sung through, the motif takes its glyphs off the frame one after another. *Fits content like:* the end of a section; a scene change; letting go.

## 9. Pitfalls of the medium

- **Words that float.** A line typed on an empty ground reads as kinetic type: give it a carrier from the picture.
- **Generic pictures.** A heart, a globe or a beam of light for an abstract word: find the concrete stand-in the line suggests (a coffee cup reflecting a 3 a.m. clock for "answers").
- **Karaoke habits.** A colour wipe across the line, a bottom subtitle bar, lines that vanish before they are sung through: forbidden.
- **Slams everywhere.** More than one slam per shot flattens the hook.
- **Seek-unsafe timelines.** Frames are rendered alone and out of order: one transform origin per element; large travels on an outer translate layer (or a tweened transform attribute computed in Python); a tweened element must not carry its own transform attribute; no random numbers or clocks in the timeline (seed them in Python); compute every expression in Python before writing it into the script.
- **Hidden scenes still paint filters.** A turbulence filter draws even when its scene is hidden by visibility: take inactive scenes out of the render (display none) and keep the grain composited inside its own shape.
- **Missing glyphs.** A subset font silently falls back: subset from the text actually printed and stop on any missing character.
- **Neighbours in the same colour** (two grounds, two labels): rotate.
- **Smooth moves under stepped drawings.** A push or a slide that glides every frame while the drawing steps on twos looks pasted on: step it with the drawing (only fades and flashes stay smooth).

## 10. Engine

The kit in [`kit/`](kit/) makes a whole film from a song, and [`PRODUCTION.md`](PRODUCTION.md) is the manual: project, analysis, imagery table, asset sheet, storyboard, scenes, sample, render, with the three points where the user confirms. See the code; don't restate it.

- Drawing (Python, imported by a scene builder): `scene.py` — `Scene(fid, p, bg)`: song↔scene time (`L`), glyph-by-glyph text (`chars`, `pop_chars`, `line`), `blow_chars`, the wind band (`band`, `band_in`, `band_out`, `band_through`), `wob`/`wobT`/`grain`, `group`, `hit`, `write`. `typo.py` — the carriers (`typing`, `slam`, `label_line`, `ribbon_line`, `sign`, `couplet`, `chalk_board`, `road_sign`, `bubble`, `seal`, `sky_write`, `hang_tag`, `spill`, `blow_off`, `tape`). `draw.py` — the pencil (`shape`, `thick`, `shadow_box`, `drawable`, faces, `person_front`/`person_side`/`person_back`/`bike`, sky, weather, plants, buildings). `hd_lib.py` — palette, `T`/`VT`, `label`, `ribbon`, `puff`, `burst`, `curl`, `leaf`, `sparkle`, page `tag`. `frame_kit.py` — the boil and grain filters and the 12 fps script kit (`q`, `pop`, `cycle`, `jitter`, `boil`). `music.py` — the song's grid and lyric times; `project.py` — the project's `mv.json`; `text.py` — Simplified/Traditional.
- Playing: `kit/page/` — `gsap-lite.js` (the scenes' timelines as a pure function of time), `film.js` (mounts the scenes, the page contract), `index.html`; copied into the project by `tools/build.py`.
- Tools (`kit/tools/`): `new_project.py`, `analyze.py` (beats, downbeats, drums, energy; numpy and scipy), `lyrics.py` (LRC), `repeats.py`, `asset_sheet.py`, `build.py`, `fonts.py`, `preview.sh`, `mix.py`, `make.sh`, `lyriccheck.mjs`. Templates in `kit/templates/`.
- The demo ([`demo/`](demo/)) is itself a project made with the kit; its own drawings and scenes are in `demo/scripts/`.

A scene that is not in the demo, a classroom line on a chalk board (`scripts/scenes/s03-class.py` of a project; its span comes from `mv.json`):

```python
from scene import *; import typo
from draw import *          # the pencil: people, weather, buildings, shadow_box…
sc = Scene("s03-class", "cl", BUFF)
kid = person_front(560, 520, 70, hair="bun", top=WHITE, bottom=NAVY, arms="wave", legs=.8)
body = (sc.wob(rect(0, 820, 1920, 260, "#B7804F") + kid)
        + sc.wobT(typo.chalk_board(sc, "cb", li=12, x=1240, y=140) + typo.seal(sc, "se", "下课", 300, 220, 64, 31.2))
        + sc.grain(.4))
sc.write(body)
```

## 11. Variation space

Decided per film: the words and their timing source (a song, a recorded voice, a poem read aloud), the cast and props (from the text), the motif and its direction, the ground-colour order, which carrier each line sits on, the shots and transitions, Simplified or Traditional.

Uses beyond a lyric video (the words then come from a recorded voice: transcribe it for word timings, TECHNIQUE.md §4, and treat it like a song with no music): a poem or a slogan typed onto the places it names; a narrated city or campus promo where each sentence sits on the thing it names; a birthday or wedding message; a brand's founding story; a children's rhyme.

- **Structures:** a day from dawn to night, one group per hour; a list of places, one carrier type per place; a call and response between two characters on a split screen.
- **Openings:** a pencil line of the motif crossing a bare page; a slammed title on a burst ground; a hand-tag dropping into an empty street.
- **Endings:** the camera tilts up into a sky where the title is written by a star; a suitcase closes on everything gathered; the last window goes dark and one word stays lit.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
