# Flat Metro — Style Prompt

> A real transit network as a flat, screen-native diagram: a calm ground, water and green as soft flat fields in their true outline, thick saturated lines with round caps held to 0°, 45° and 90° with one fillet radius, stations punched into the lines, and small block trains gliding on the real timetable and easing into every stop. Lines are not printed: an unseen hand pulls them out of the real track and they snap taut behind it.
> References (grammar only): minimalist transit-puzzle games and flat transit design (calm grounds, negative space, gentle micro-motion, small clean type); octilinear network diagrams. Never copy any game's or operator's station shapes, passenger icons, interface (clock dials, counters, colour token bars), palettes, typefaces, sounds or music, and never name one in the film or its notes.

Needs: the core tools; `neo/geo/routes.py` (real tracks and stops) and `neo/geo/osm.py` (water, woods, parks) with the same `--origin`; `neo/geo/gtfs.py` when trains run on a timetable. Map data © OpenStreetMap contributors, ODbL 1.0: tell the user the terms first, credit it on the last card and in `CREDITS`, follow DIRECTOR.md §13. A timetable is the operator's published GTFS or official headways, named with its licence; never claim more precision than it has.

## 1. Essence, and what it is not

- **Flat and calm.** One ground fills the frame; water and green are that ground pushed a little toward blue or green. No texture, shadow, glow, gradient or perspective.
- **Drawn from the real city.** Every line comes from its real track, simplified to eight directions while each station stays near its true place; water keeps its true outline.
- **Lines are pulled.** A line runs out along the real track; behind the hand it snaps taut into 45° steps, and only then are its stations punched.
- **Trains keep time.** Each block is a real trip: it accelerates, glides, brakes and stands. The number of trains on screen is the service.
- **Negative space carries the words**: a short clock, a count, two lines of caption, apart from the network.
- Not Metro Mosaic (no ceramic, camera or material), not a printed schematic (no paper, no light, no 3D camera), not a game (no player, passengers, score or game interface), not an operator's map (no logos, line bullets or house type).

## 2. Materials & rendering

- **Canvas 2D vector, every frame from `t`.** A 2D camera (centre in metres, zoom interpolated in its logarithm) is the only transform of the map.
- **Line**: round caps and joins, width in pixels (about 7–8 px for a whole network, rising with the square root of zoom); corners are arcs of one radius in metres, shrunk only on very short legs.
- **Octilinear layout** (`tools/prep.py`): snap each station-to-station leg to the nearest of eight directions, with a little stickiness to the neighbouring leg; solve station positions by least squares (each leg wants its direction × its true length, each station its true place); re-snap and repeat; then project so every leg is exact. A leg that would collapse becomes one 45° bend on the side nearer the real track. Lines sharing a corridor are offset by a fixed spacing.
- **Station**: a hole in the line (ground shows through, radius a quarter of the line width). **Interchange**: a ground-coloured disc a little wider than the line with one ink pin in its centre. Every station has the same mark; nothing is coded by shape.
- **Train**: a rounded block about 2.2 × 1.3 line widths, turned to the tangent, set slightly right of its direction so opposing trains pass, with a ground-coloured rim.
- **Fields**: OpenStreetMap polygons, simplified and softened (Chaikin corners); streams too thin for the scale are left out.
- **Screen space**: the text column, and a flat ground panel with a hairline edge behind it when the map is pushed in.

## 3. Colour logic

- **One ground**, warm light grey by day or deep blue-grey by night; it may follow the real sun of the place and date. Water and green are tints of the ground.
- **Saturated colour belongs to lines**, in their published colours. A line without service recedes about three quarters toward the ground: colour means "running now".
- **Trains are their line's colour pushed toward the ink** (darker by day, lighter by night).
- **Ink** (text, interchange pins) follows the ground's lightness, eased between dark and light.
- Example palette (the demo's): ground `#1b222c` / `#efebe3`, ink `#ebe8e1` / `#262a31`, water `#5d95bb` at a third, green `#7fa66a` at a tenth.

## 4. Type & subtitles

- **Latin in a clean geometric sans** (Manrope, OFL), **Chinese in Source Han Sans** (OFL). Station names in the local language, 15–17 px, with a ground-coloured halo where they cross a line.
- **The text column**: a light digital clock with monospaced digits, the day, a running count, and captions of one Chinese line over one English line (≥ 30 / 21 px at 1080p), never wrapped; a short rule above, longer for a verdict.
- Labels are placed once per scale: eight positions around the station, the one that crosses no line or label wins. A whole-network view names termini only.
- Default: no narration. Hold every caption ≥ max(1.8 s, speech + 0.6 s) and what `readcheck.mjs` asks; clock, count and labels are passing text.

## 5. Motion quality

- 24 fps, no stepping; everything eases.
- **The pull**: the tip runs along the real track with a quadratic ease; for about three station spacings behind it the line relaxes into its octilinear path with a small overshoot; station holes pop open (a short back-ease) once their stretch has settled.
- **Trains** move on a smooth acceleration curve between published times and stand at each stop; they fade in and out over about a third of a second of film time.
- **Time is the master clock**: a monotone curve maps film seconds to the time of day; it brakes, never jumps. Faster than about a quarter of an hour per second, single trains fade out and only the lines' colour speaks.
- A settled line, a station, a field never moves. Nothing wobbles or breathes.

## 6. Camera grammar

A camera state is a centre in metres and a zoom relative to the whole-network view.

| Move | What it expresses | Can serve |
|---|---|---|
| Follow the pulling hand, close | making; one line's real route | an opening; one line built end to end |
| Whole network, locked | the system; reading time | a time of day; a count; a comparison |
| Push into a district | "here, these trains" | an interchange; a busy minute; one train |
| Pull back to the network | scale; one system all along | a reveal; the end of a sequence |

- The network fills about half the frame width at its widest view; the text column keeps the other side; ≥ 40 px from the edge for every word.
- Transitions are the camera, the pull and the ground. No cuts, dissolves or picture wipes.

## 7. Sound palette

- **Soft mallets**: vibraphone with a slow motor tremolo, felt marimba, sine bass with 2nd and 3rd harmonics, a breath pad. No piano, strings or chiptune.
- One mode per film; accelerate by dividing the beat, not by changing tempo.
- **Foley is the diagram**: a filtered-noise zip as a line is pulled, a felt tick per station hole (each line its own pitch), a deeper one per interchange, a soft snap when a line settles, a quiet felt tap per arriving train panned to its place and quieter in crowds.
- **Music can follow the service**: voices drop out as lines stop and return as they run.
- Ambience is the city's air, very low; silence before a verdict holds only air. Dry foley, a dark medium reverb on the mallets, −14 LUFS.

## 8. Native moves

- **The pull.** A line runs out along its real track and snaps taut behind the hand. *Fits content like:* a line opening; a route followed end to end; a diversion during works.
- **Re-routing.** A settled stretch is released and pulled again along another path. *Fits content like:* a line cut back; two lines joined; a temporary shuttle.
- **Lines that rest.** A line recedes into the ground after its last train and returns with its first. *Fits content like:* night service; a strike; a weekend closure.
- **The ground is the clock.** The ground follows the real sun; a day passes as one 45° sweep of colour. *Fits content like:* a day of service; a season; two days compared.
- **The count.** Every block is a real trip, so their number is a fact a caption can quote. *Fits content like:* rush hour; the busiest minute; a quiet night.
- **The push to a stop.** Close enough to watch single trains brake and stand. *Fits content like:* a connection; a transfer; one minute at a hub.

## 9. Pitfalls of the medium

- **Zigzags** from snapping legs one by one: stickiness to the neighbouring leg, positions solved together.
- **The city disappears** when the diagram goes too far: keep stations near their place and water true.
- **Mush in corridors**: offset parallel lines by a constant spacing.
- **Popping or boiling trains**: fade by film time, not timetable time; at high clock speed let line colour carry the service.
- **Labels on lines**: search positions, halo, and name fewer stations rather than smaller ones.
- **False precision**: a published time is not a position; say positions between stops are estimated.
- **A thin stream reads as a border** at city scale: leave it out (DIRECTOR.md §13).

## 10. Engine

- [`demo/tools/prep.py`](demo/tools/prep.py): `octilinear(G, E, line_edges)`, `fillet(P, R)`, `soft_ring()`, trips and service spans from GTFS days → `data/net.json`.
- [`demo/flat.js`](demo/flat.js): `sky(m)`, `theme(ground)`, `restColour`, `trainColour`, `stroke`, `hole`, `knot`, `train`, `digits`.
- [`demo/main.js`](demo/main.js): the pull (`peff`, `blendU`, `linePts`), camera (`camAt`), trains (`trainAt`), `placeLabels`, the 45° ground sweep (`ground`), `window.TEXTS`, `window.EV`.

```js
// nothing from the demo: one orange line pulled from a wavy track into an L
const geo = [...Array(40)].map((_, i) => [300 + i * 20, 600 + 40 * Math.sin(i / 4)]);
const oct = geo.map(([x], i) => i < 20 ? [x, 600] : [700, 600 - (x - 700)]);
const p = 30, b = u => Math.min(1, Math.max(0, (p - u) / 8));   // p = points pulled so far
stroke(g, geo.slice(0, p).map((q, i) => [q[0] + (oct[i][0] - q[0]) * b(i), q[1] + (oct[i][1] - q[1]) * b(i)]), 8, '#e8822a');
```

## 11. Variation space

The agent decides: the network, lines, time window and days, camera route, named stations, the ground, the palette within §3.

- **Three structures**: one line pulled end to end with one train following it; a day at rush-hour density with the count as the story; a network before and after a re-routing.
- **Three openings**: one station hole on empty ground, its line pulled out of it; the finished network at rest, one line lighting as its first train leaves; the clock alone, then the water, then the lines.
- **Three endings**: the last train brakes into its terminus and the line rests; the camera pulls back as every line runs; the ground sweeps from night to day over a still network.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
