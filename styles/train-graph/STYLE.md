# Train Graph — Style Prompt

> A real timetable drafted as the time–distance diagram railways plan with: time across, stations down at their true track distance, every train a ruled ink line whose slope is its speed. Drawn on drafting film at the edge of a sliding rule while a clock runs through the day; beside the axis the real line, from OpenStreetMap, is straightened into a strip map.
> References (grammar only): working railway graphs (the German Bildfahrplan, the Chinese 列车运行图 with its ten-minute grid, the 19th-century Paris–Lyon graph), railway strip maps, engineering drawings with their title block. Never copy a particular sheet's layout, colours or lettering, and never name one in the film.

Needs: core tools; `neo/geo/gtfs.py` (any GTFS feed) and `neo/geo/osm.py`'s fetch for track and rivers (Overpass needs a network once); the music tier for plucked instruments. Credit the timetable's publisher and licence, and OpenStreetMap (ODbL 1.0: tell the user the terms first), on the last card and in `CREDITS`. Follow DIRECTOR.md §13 for every map frame.

## 1. Essence, and what it is not

- **The graph is the data.** Every line is one real trip, every bend a published time; between two of them a train is a straight line.
- **Slope is speed, density is service.** A fast train is a steep stroke, a stop a short level step, a frequent line a hatch; the story is told with these, not with captions.
- **The axis is a real place.** True track kilometres, and beside them the line itself as a straightened strip map with its rivers and tunnels.
- **It is drafted, not displayed.** Printed grid, then ink ruled at the edge of a moving rule while a clock advances; pencil notes in the blank ahead.
- It is not a metro schematic (no octilinear network, no glow, no perspective), not a dashboard chart, and not a map of moving dots.

## 2. Materials & rendering

- **Canvas 2D, flat and overhead.** The camera maps a time window and a distance range to the frame, zooming each separately (a time push-in is the close-up). No perspective.
- **Drafting film**: a cool matte sheet, faint grain fixed to the screen. The **grid is printed** in non-repro blue: hours solid, half hours dashed, ten-minute lines that fade when they would crowd; one line per station, the ends heavier.
- **Ink lines**: a faint bleed under a solid core, round joins, a tiny pool where the pen starts and lifts, the last minutes still wet (a thin highlight). Widths in pixels with a floor and a ceiling.
- **Pens and rule**: a technical-pen nib seen from above (steel ring, ink centre, cast shadow) at each moving train's head, on the working edge of an acrylic parallel rule that carries the clock. Right of the rule is blank. Nothing glows.
- **Trains entering or leaving the line** end in a short arrowed stub, with destination and time at close range.
- **The strip map**: a railway symbol (casing, white core, black–white sections fixed to the kilometres), dashed tunnels, white station boxes, rivers on their real side at an expanded lateral distance, km figures every 50.
- **Overlays are paper**: tracing film laid over the rest dims it; the chosen trains are drawn on top.

## 3. Colour logic

- **One ground, one grid colour, two or three inks**, and pencil grey for notes. Nothing else.
- **Ink means class.** The fastest class takes the strongest ink (red) and the heaviest line; the next takes black, a third (blue) only if drawn. A class keeps its ink all film; the legend at the top of the margin says which.
- **Blue is the sheet, not the data**: grid, scales, title-block rules, km figures. Water is a paler blue.
- **Emphasis by subtraction**: never recolour a train to highlight it; dim the others.
- Example palette (the demo's): film `#eceee8`, margin `#e2e6df`, grid `#5d8eac`, ink `#1c2024`, red `#bf2b22`, pencil `#4a4e55`, river `#5b8fbd` / `#b9d2e3`.

## 4. Type & subtitles

- **Engineering lettering.** Chinese in a long Fangsong (Zhuque Fangsong, OFL), Latin in a narrow grotesque (Barlow Condensed, OFL), numerals monospaced (IBM Plex Mono, OFL).
- **Roles (1080p)**: station names in the margin, Chinese over the local name, 21 / 16 px; hour figures 22 px; the clock 30 px on a dark tab; minute figures (15 px, the train's ink) in the acute angle between train and station line; train names along their longest stretch.
- **Notes are pencil**: a Chinese line and an English italic line, ≥ 27 / 21 px, film-coloured halo, written left to right in the blank right of the rule, with a pencil leader and ring.
- **The end card is the title block**, filled in cell by cell: title, service date, counts, data credits.
- Default: no narration. Hold ≥ max(1.8 s, speech + 0.6 s); the clock and scales are passing text.

## 5. Motion quality

- **Time is the master clock**: a monotone curve maps film seconds to the time of day; it speeds and brakes, never jumps. Pens move only because the clock moves; a held clock is the freeze frame.
- **Change speed in musical units**: an hour per bar, per two beats, per four bars.
- **Lines grow, never fade in**; notes are written, the title block filled in, the strip inked.
- 24 fps, no stepping; long eased moves; time zoom in the logarithm of the window width.
- What never moves: anything inked, the grid against the times, the strip's sections against the kilometres, the grain.

## 6. Camera grammar

A camera state is a time window (its width and where the rule sits in it) and a distance range. The distance column and the time scales stay pinned to the frame's edges, like the scales of a drafting machine.

| Move | What it expresses | Can serve |
|---|---|---|
| Lateral travel with the rule | the day passing | a timetable read in order; a service's rhythm |
| Time push-in (narrow window) | "these minutes matter" | a race; a connection; a missed train |
| Locked frame, clock held | verdict; reading time | a comparison; an arrival; a gap |
| Time pull-out to the whole day | scale; the pattern | clock-face rhythm; rush hours; a line's shape |
| Map to axis (straightening) | this axis is a place | introducing the line; a second line beside it |

- Keep the rule in the middle third while drawing (the blank ahead holds notes). No cuts, dissolves or rotation.

## 7. Sound palette

- **The timetable is the score.** Each train's first stroke plays a note whose pitch comes from its departure minute, so a clock-face timetable repeats a melody every hour. One timbre per line or class (struck steel for the fast line, plucked strings for the slow).
- **Pulse**: a wooden clock tick; to accelerate, divide the beat. Pizzicato bass for harmony, a reed drone for holds. No piano, no string pad.
- **Foley is drafting and rail**: pen hiss that follows how many pens draw, the rule landing, pencil on notes, pen lifts, rail joints for a followed train (the faster, the denser), a synthesized two-tone horn.
- **Silence**: half a second before a verdict, then the heaviest hit; the ticks stop while it holds. Mix dry and close, −14 LUFS (`neo/audio/master.py`).

## 8. Native moves

- **The straightening.** The line drawn on the ground, then unbent like a wire into the axis, rivers riding along. *Fits content like:* two routes between two cities; a loop line cut open; a coastal line laid flat.
- **The fork.** Two trains leave one station within minutes on different lines or classes; their slopes split. *Fits content like:* express against stopping service; old line against new; bus against tram on one corridor.
- **The held clock.** The clock stops at an arrival; notes say where the other train is. *Fits content like:* a connection made or missed; the last train; a delay against plan.
- **The hatch.** A clock-face service turns the day into a lattice; rings mark the same minute every hour. *Fits content like:* a frequency upgrade; a timetable change; night against day.
- **The overtake and the meet.** A slow train's level step at a station while a steep line crosses it; two directions crossing at a loop. *Fits content like:* single-track lines; freight paths; priority rules.
- **Tracing film.** A sheet over the past isolates a few trains. *Fits content like:* one journey; two days compared; a disruption.

## 9. Pitfalls of the medium

- **Unpublished times look published.** Draw straight between published stops, write minutes only where the feed gives them; a crossing between stations is approximate (say so in `FACTS.md`).
- **A partial feed looks complete.** Say on screen what is missing (regional, freight, other operators) and name the service day.
- **The full day turns solid.** Cap widths, fade ten-minute lines, keep the inks apart at the widest view.
- **Labels collide** at close stations: push apart with leaders, keep minor ones small.
- **Shared track drawn twice**: decide a trip's axis on a shared section from its neighbouring sections.
- **OSM track graphs are per track**: a shortest path can jump to a parallel or freight line; give via points, link parallel tracks, check the kilometres against an official length.
- **Text over hatch**: notes go in the blank ahead of the rule.

## 10. Engine

- [`neo/geo/gtfs.py`](../../neo/geo/gtfs.py): one service day of a GTFS feed. [`demo/tools/prep.py`](demo/tools/prep.py): the OSM track graph, shortest paths through the stations (`AXES`), kilometres, tunnels, rivers in strip and ground coordinates, and every trip cut into runs along the axes (`axis_of`) with arrivals and departures.
- [`demo/draft.js`](demo/draft.js): `makeFilm`, `inkLine(g, pts, w, col)`, `wet`, `nib(g, x, y, col)`, `ruler(g, x, y0, y1)`, `pencil(g, zh, en, x, y)`, `leader`, `ring`, `titleBlock`.
- [`demo/main.js`](demo/main.js): `upto(P, T)` (a trip up to the clock), `stub`, `digits`, `label`, `bendAxes` / `axisPt` (the straightening), `drawStrip`, `stationLabels`, `drawGrid`, `overlayX` (tracing film); [`demo/timeline.js`](demo/timeline.js): `CLOCK`, `CAM`, `NOTES`.

```js
// a tram line's last evening hour: each trip ruled up to the clock, its pen on the rule, one pencil note ahead
for (const trip of trips) { const p = upto(trip.P, T); inkLine(g, p, 2.4, C.ink); nib(g, ...p.at(-1), C.ink); }
ruler(g, sx(T), TB, GY1); pencil(g, '末班车', 'Last tram', sx(T) + 70, sy(4));
```

## 11. Variation space

The agent decides: feed, line(s) and service day; inks per class; one line, a branch or a loop cut open; the clock curve; which trains are followed; the notes; the title block; the palette within §3.

- **Three structures**: one day, first to last train, at a steady hour per bar; the same hour before and after a timetable change, on two sheets; one passenger's journey with two changes, followed under tracing film.
- **Three openings**: the empty grid and the night's first train drawn alone; the line on the ground straightened into the axis; one station's departures fanning out in a time close-up.
- **Three endings**: the title block filled in; the last train leaving the sheet edge at midnight; a hold on the one gap in service the film was about.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
