# Folding City — our demo

*中文版：[DEMO.zh-CN.md](DEMO.zh-CN.md)*

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Shenzhen, Folded* (折叠深圳, 40 s) · `folding-city.mp4` · source in [`demo/`](demo/)

## Story & structure

Shenzhen grew west along one axis: Luohu, then Futian, then Nanshan. The film walks that axis as three plates hinged end to end. Each district is first a flat poster, then a place with depth, then a mechanism that folds; the next district is a wall that stands up at the far edge and becomes the new ground. At the end all three are in frame at once and fold into a U: the city closed like a box, with the title beside it.

There is no narration and no character. The arc is rhythm: three ten-second districts, each one layer thicker in the music, two two-second plate changes with a held breath before the impact, and a six-second ending.

| Time | Part |
|---|---|
| 0–10 s | Luohu |
| 10–12 s | Futian slides in and stands up |
| 12–22 s | Futian |
| 22–24 s | Nanshan slides in and stands up |
| 24–34 s | Nanshan |
| 34–40 s | The strip, the U, the title |

## Shots

One continuous take. Times are arrivals; between them the camera travels (ease-in-out) or drifts (linear).

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0.0 | Dongmen shophouses with the Guomao tower behind | Poster | opening frame is a complete poster |
| 2 | 1.75 | Standing at the mouth of the pedestrian street, Guomao at its end | Street, 50° | poster opens |
| 3 | 3.75 | Raised three-quarter view of the old town, railway and lake | Oblique | |
| 4 | 5.5 | The skyline in one line: Diwang, KK100 and neighbours, sun disc behind | Poster | pressed flat |
| 5 | 7.0 | The two rows of towers swing in like doors | Axonometric | door fold, 6.5–7.5 s |
| 6 | 8.75 | Looking up between the two rows | Canyon, 62°, 3° roll | |
| 7 | 10.25–11.0 | Pull back; Futian's plate slides in and stands up | wide | plate stands up, lands 11.1 s |
| 8 | 12.0 | Futian seen as a plan on the wall | Plan on wall | camera rotates onto the plate |
| 9 | 13.5 | Civic Centre roof, Ping An, the Stock Exchange in one elevation | Poster | |
| 10 | 15.25 | Across Shennan Boulevard, looking up at the Civic Centre | Street, 60° | poster opens |
| 11 | 17.0 | The central axis to Lianhua Hill | Oblique | |
| 12 | 19.25 | Side elevation of the CBD | Poster, turned 90° | |
| 13 | 20.75 | At the foot of Ping An | Canyon, 64°, roll −8° → 4° | |
| 14 | 22.25–23.0 | Pull back; Nanshan's plate slides in and stands up | wide | plate stands up, lands 23.1 s |
| 15 | 24.0 | Nanshan seen as a plan on the wall | Plan on wall | |
| 16 | 25.5 | Sea, bridge, the Spring Cocoon, the Spring Bamboo tower, Tencent | Poster | |
| 17 | 27.25 | Low over the water toward the tower | Street, 46° | poster opens |
| 18 | 29.0 | The Houhai towers crease into a screen | Axonometric | screen fold, 29.25–30.0 s, open again by 31.3 s |
| 19 | 31.25 | Tencent Binhai towers and their link bridges | Poster | |
| 20 | 32.75 | Up from the palm street | Canyon, 58° | |
| 21 | 34.7 | All three plates in one strip | wide oblique | sky switches to night blue, 34.45–34.7 s |
| 22 | 36.5–40 | The strip folded into a U, title on the left | wide | closing fold lands 36.2 and 36.4 s |

## Score structure

120 BPM, D major, a bar is two seconds, everything synthesized in `demo/mix.py`.

- **Luohu (5 bars, Bm7–G–D–A–Bm7)**: thin: arpeggio on the off-beats, bass, kick on one and three, rim clicks.
- **Futian (5 bars, G–A–F♯m7–Bm7–G)**: full sixteenth-note arpeggio, four-on-the-floor kick, claps, a bell line enters.
- **Nanshan (5 bars, D–A–Bm7–G–A)**: brightest: open hat on the last beat of each bar, a higher bell line.
- **Plate changes (10–12 s, 22–24 s)**: the bus is pulled to almost nothing for a quarter of a second at the start; a pad hangs, noise sweeps up, one heavy impact when the plate has stood up (11.1 s, 23.1 s), then a short pick-up into the next district.
- **Ending**: drums out, a G chord hangs from 34 s, a riser into the two impacts of the closing fold (36.2 s, 36.4 s), then a D chord with five rising bell notes that rings out.
- **Sound effects** come from `window.EV` (exported to `events.json`): whoosh per camera move, click or thump per landing, ratchet and rumble for door and screen folds, slide and clack for a docking plate, creak and rumble for a standing plate.
- **Ambience**: street noise under Luohu, wind under Futian, waves under Nanshan, a low bed under the ending.
- Stem levels printed by `mix.py` for this film: music −12.0 dB, reverb −17.5 dB, effects −24.0 dB, ambience −27.1 dB RMS. The master is −14 LUFS.

## Palette & props

| District | Sky | Shadow tint (ambient) | Ground / road | Signature props |
|---|---|---|---|---|
| Luohu | `#f4502a` orange-red | violet (0.60, 0.47, 0.74) | `#f6d9c6` / `#5a4a86` | arcade shophouses with awnings, railway and trains, a lake, a pale sun disc |
| Futian | `#1b49f5` cobalt | blue (0.67, 0.67, 0.96) | `#eef1ff` / `#7f86d9` | the gull-wing roof with its red box and yellow drum, fountains and flags, a green hill with a statue |
| Nanshan | `#ffc21a` yellow | blue-violet (0.56, 0.60, 0.92) | `#fff3d6` / `#5e6fc4` | sea with wave stripes and sailboats, a cable-stayed bridge, palms, lattice domes |
| Ending | `#171a5c` night blue | (0.50, 0.50, 0.86) | | |

Label ink `#141a5e` on white; title white with a `#ffc21a` rule.

The landmarks are simplified redrawings, with heights and positions compressed to fit 600 × 700 m plates: Guomao, Diwang and KK100 in Luohu; the Civic Centre, Lianhua Hill, Ping An Finance Centre and the Stock Exchange in Futian; the Shenzhen Bay Bridge, the Spring Cocoon, the Spring Bamboo tower and the Tencent Binhai towers in Nanshan.

## End card

The folded U on the right, the title 折叠深圳 in the heaviest weight on the left, a short yellow rule, `SHENZHEN, FOLDED` in spaced capitals. No sign-off.

## Build notes

| File | Draws / does |
|---|---|
| `demo/index.html` | fonts, the 3D stage and the 2D overlay canvas |
| `demo/timeline.js` | the only source of time: sections, camera states, scalar tracks, plate visibility |
| `demo/main.js` | renderer, hinge chain, camera interpolation, light and sky, labels and title, sound events, `window.render` |
| `demo/kit.js` | the building kit: toon materials, facade textures, geometry with window-cell UVs, buildings, trees, vehicles, street markings, block filler |
| `demo/luohu.js`, `futian.js`, `nanshan.js` | one district each: its palette and its scene, with an `update(t, v)` for moving things and hinge folds |
| `demo/mix.py` | score, sound effects, ambience and the bus |
| `demo/tools/fonts.sh` | fetches the three font files |
| `demo/build.sh` | everything, in order |

- Build: `sh styles/folding-city/demo/build.sh` (events → mix → picture at 24 fps with 3 workers → mux at −14 LUFS in BT.709 → reading check → poster at 5.9 s and style frame at 14.2 s). It refuses to overwrite an existing film: `OUT=<file.mp4>` for another name, `FORCE=1` to replace.
- Render time: about three and a half minutes for the 960 frames on an Apple-silicon laptop with 3 workers.
- Review: stills at every arrival time in the shot table, plus the middle of each plate change (10.7, 22.7 s) and of the closing fold (35.6 s).
- Pitfalls met in this film:
  - Luohu standing up in front of Futian blocked every frontal view: plates are siblings that copy the hinge frames' matrices, and each is hidden while off-frame (`VIS` in `timeline.js`).
  - Low filler in front of the Dongmen row covered the opening poster: replaced by lawn and trees.
  - The sky blend into the ending went muddy: the ending colour has its own short track (`endMix`, 0.25 s).
  - The Tencent poster was blocked by nearby filler: the strip in front of it is lawn and palms.
  - The film is not a seamless loop.
