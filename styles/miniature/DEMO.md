# Miniature — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Futian, in Section* 《福田站，切开看》 (54 s) · `miniature.mp4` · source in [`demo/`](demo/) · 中文版：[DEMO.zh-CN.md](DEMO.zh-CN.md)

Futian Station in Shenzhen (high-speed rail, metro Lines 2, 3 and 11, buses) as a cut-away model. **The section is a diagram: the three tiers, their order, the platforms, the one track per tier and the escalators are artistic, not the station's real floors, tracks or transfer routes.** Trains, the bus and the people are illustrative, on invented timings. **An unofficial fan film, not affiliated with China State Railway Group, Shenzhen Metro or any operator**: no operator logo or emblem; station names, line numbers and line colours are public facts. The towers behind the model are real footprints and heights from OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0) and Overture Maps (ODbL 1.0, with Shi et al. 2023, CC BY 4.0), moved back by the depth of the section. Every date on screen is sourced in [`demo/FACTS.md`](demo/FACTS.md). The look and the model are adapted from the repository owner's own refined miniature of Futian Station (v003), with consent.

## Story & structure

Logline: a bus pulls in at a model station; the camera pulls back to find the whole station cut open on a plinth, opens it tier by tier down to the high-speed trains, and stays while the city behind it lights up for the night.

- **Street (0–4.6 s).** Close on the bus stop, tilt-shift strong: a green bus comes out of the left cut face, brakes and stops; the doors chime.
- **The model (4.6–12.2 s).** One pull-back to the whole plinth: the three tiers under the street, the sunken plaza and the station's red name, the real towers of the Futian CBD behind with Ping An Finance Center the tallest. Title card 福田站.
- **Opened (12.2–20.8 s).** Near-silence, then the street tier and the metro tier lift apart; the camera lowers to look into the gaps; three tier names arrive on leader lines.
- **Metro (20.8–30.4 s).** Crane down to the metro platform: a Line 2 train comes in from the right and stops; card 2011 · Lines 2 and 3, and Line 11 · 2016.
- **High-speed (30.4–40 s).** Down again to the lowest tier: the bullet train glides in from the left; card 2015.12.30, high-speed rail under the city centre.
- **Night (40–54 s).** The tiers close, the camera rises and swings to the front; blue hour, near-silence, then the station's lights snap on and the towers light up in six batches; the trains and the bus leave; end card.

Native moves spent: through the cut (bus, metro, bullet train), the lift (12–15 s, closing at 40–42 s), tier by tier (20.8–40 s), lights on (44.2 s), the real context (throughout).

## Shots

One continuous orthographic take. Film time in seconds; h = half-height of the frame in model units.

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–4.6 | bus stop close-up | yaw 30° → 36°, pitch 21–23°, h 3.5–3.8, tilt-shift 1, slow drift | bus out of the cut face 0–3.4 |
| 2 | 4.6–9.6 | pull-back to the whole plinth | h 3.8 → 16.2, pitch → 29° | title card 7.2–12.0 |
| 3 | 9.6–12.2 | hold on the whole model | slow drift | near-silence 11.3–12.2 |
| 4 | 12.2–15.4 | the tiers lift | yaw → 40°, pitch → 17°, h 16.6 | the lift; tier names 15.3–20.9 |
| 5 | 15.4–20.8 | hold on the opened model | drift | |
| 6 | 20.8–22.8 | crane down to the metro tier | h → 3.9, pitch 12° | |
| 7 | 22.8–30.4 | metro platform | lateral drift | train in 22.0–26.0; cards 24.4–30.6 |
| 8 | 30.4–32.8 | crane down to the high-speed tier | h → 4.7, pitch 10° | |
| 9 | 32.8–40.0 | high-speed platform | lateral drift | train in 31.4–36.0; card 35.0–40.6 |
| 10 | 40.0–44.2 | rise and swing to the front | yaw 30° → 8°, h → 15.6 | tiers close 40.0–42.4; dusk from 41.6 |
| 11 | 44.2–54 | night, front view | yaw 8° → −5° | lights 44.2; windows 44.6–47.1; departures 46.4–51.6; end card 48.8 |

## Score structure

84 BPM, F major pentatonic, all synthesized (`demo/mix.py`).

- 0–4.6: kalimba alone, one note every two beats; street air, birds; diesel bus, brake hiss at the stop, a two-note chime.
- 4.6–11.3: marimba eighth-note ostinato, music-box melody, an Fmaj7 pad.
- 11.3–12.2: near-silence. 12.2–15.1: two small motors; a wooden clack as each tier settles; a glass-bell chord and a low harp F on the last one.
- 15.1–20.8: B♭maj7 → F, marimba and music box; paper for the cards.
- 20.8–30.4: Dm7, darker and lower; underground hum; the metro's rails slow down, a soft brake squeal, a chime.
- 30.4–40: Gm7 → C; the bullet train's smoother roll and air push, a chime.
- 40–43.4: only the pad (B♭maj7); motors and clacks as the tiers close; crickets begin.
- 43.4–44.2: near-silence. 44.2: relay click, low thump, lamp hum; music box returns; a glass note for each batch of windows; trains and bus leave; F major 9 harp arpeggio at the end card, a 1.2 s fade.

## Palette & props

Background #ecebe5 by day, #8f9ab2 at blue hour, #121c24 at night. Model whites #d9d9cc, #deddd1, silver #c6cdcb; plinth slate #53686b; earth #c9bea6. Accents: station name red #a52d28, bus green #6b9a64, Line 2 #db6d1c, Line 3 #00a2e1, Line 11 #6a1d44, the bullet train's blue line #669dba. Model: 25.2 × 13.3 units for the section; tiers at −3.4, 0.8 and 4.8; the city strip 12 units deep behind it; 1 unit = 45 m for the city.

## End card

Lower left over the night model: 福田站，切开看 / FUTIAN, IN SECTION / NEO-Cine. Data credits, the diagram note and the fan-film note are in `demo/CREDITS` and at the top of this file, not on screen.

## Build notes

- `demo/data/city.json`: `neo/geo/buildings.py --bbox 114.0395,22.5340,114.0530,22.5485 --origin 114.0512,22.5413` (both sources); `build.sh` fetches it only when it is missing.
- `sh styles/miniature/demo/build.sh v002` (local, 3 workers) or `RENDER=remote sh styles/miniature/demo/build.sh v002` (the render desktop, 4 workers). Each version is new: `miniature-vNNN.mp4` and `poster-vNNN.jpg`; `miniature.mp4`, `poster.jpg` and `demo/stills/styleframe.jpg` are copied only when missing.
- Review: `node core/render/still.mjs styles/miniature/demo --range 0:54:2`, then a contact sheet; `node core/render/readcheck.mjs styles/miniature/demo --q 'textonly=1'` (the `textonly` flag skips the 3D render).
- Poster at 47.6 s (night, lights on, the bullet train leaving); style frame at 18.0 s (opened, tier names in place).
- Render times: about 9.5 minutes on the render desktop (RTX 4060 Ti, 4 workers); on Windows (ANGLE / Direct3D 11) the first page can take more than three minutes to compile the physical-material shaders and `frames.mjs` opens it again, which then succeeds.
- Pitfalls of this model: the HSR train is longer than the section and must be clipped at x = ±12.55; the escalators belong to the lower tier and are stretched with the gap; the city mapping turns OSM x (east) into model depth, so a sign error puts the towers on top of the station.
