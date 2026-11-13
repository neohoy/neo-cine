# Transit Map — Style Prompt

*Adapted from Lemo-Opuscar's Transit Map (MIT, © 2026 LemoLab; licence text in `LICENSES/lemo-opuscar-MIT.txt`), then refined with the grammar of minimalist transit-puzzle games. 中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

> A metro schematic printed on a physical sheet: bold lines held to eight directions, white stops, black-outlined interchanges, water as a flat blue band. Each line is dragged out by a glowing pen tip that snaps into its next segment with a small spring; interchanges pop when the second line arrives, and once a line is open small ink trains run on it, easing into every station. A real perspective camera moves over the paper: it rides a tip, drops low where a line dives under water, pulls back through levels of detail and sweeps across the densest knot at a low angle with a shallow focus.
> References (grammar only): the octilinear schematic tradition of metro diagrams (Beck's Underground diagram, Vignelli's New York map); minimalist transit-puzzle games (bold flat lines, hand-dragged growth, springy feedback, a living network, tuned notes); flatbed and macro photography of maps lying on a table. Copy none of their layouts, typefaces, icons, line bullets, palettes, sounds or music; never name them in the film.

## 1. Essence, and what it is not

- **Eight directions only.** Every line segment, river edge and coastline is horizontal, vertical or at 45°; every corner is one fillet radius. A line never wiggles.
- **Bold, graphic lines.** Lines are thick flat ribbons with round caps and joins, shared corridors run as tight even parallels, a line's end is a clean terminus bar. In wide shots a line never thins below a few pixels.
- **Growth is dragging.** A line exists as far as its pen tip has been dragged: the tip pulls a faint lead ahead of it, eases into each station, snaps into the next 45°/90° segment with a small overshoot and settles. Stops light as it passes; an interchange pops only when the second line actually arrives.
- **A living network.** Once a stretch is open, trains run on it all the time: they ease into each station, dwell, leave; the station gives a small pulse when it is served.
- **Ink on a sheet.** The map is printed on calm paper lit by one raking light, and the sheet lies on a dark table. The camera sees it as an object: in perspective, with depth of field, and with its edge in wide or low shots.
- **Words are printed.** Station names, callouts, the title and the credits are ink on the sheet; running numbers live on one small, light counter card. Every text line holds one language.
- **One map, many scales.** The same sheet serves a single station and the whole network; detail appears and disappears with scale, and few names are on screen at once.

Not Data Storytelling (even a time chart is drawn as lines with stops), not Blueprint (no white-on-blue linework), not Isometric Infographic (the map is flat; depth comes from the camera), not a 3D city map (no extruded buildings, no terrain), not a keynote (no slides, header bars, centred titles or page turns), and not a game: no score, no clock dial or week counter, no line-token bar or other game interface, no passengers, no shape-coded stations.

## 2. Materials & rendering

**The unit is the grid step, G.** Every coordinate and size on the sheet is given in G. Stations sit on a 0.1 G lattice, about 0.9–1.0 G apart along a line in the dense core (never under 0.6 G); a city network spans about 45 × 55 G, and the sheet adds margins for the title, callouts and the end block. The camera's zoom is read in screen pixels per G at the focus point (1080p).

| Mark | Geometry (G) |
|---|---|
| Line | 0.22 wide, round caps and joins; one corner fillet radius 0.46 for every line. In wide shots the width grows so it never falls under 5 px on screen |
| Thin line (a second rail mode: people mover, tram) | 0.09 wide; fillet 0.40 |
| Parallel lines sharing a corridor | each offset ±0.14 from the shared axis (0.28 centre to centre, 0.06 of paper between); three or more: 0.28 steps; the same offsets on the whole corridor |
| Stop | white disc r 0.115, ring 0.054 in the line colour |
| Terminus | the stop plus a bar across the line's end: line-coloured, the line's width, 0.6 G long, round caps; it springs in when the tip arrives |
| Interchange | the bounding box of every line point at the station, padded 0.16 on all sides; corner radius = half the shorter side (a circle or a stadium); white fill; ink outline 0.06 |
| River | a band 0.6–0.8 wide with a darker edge 0.03 each side, round joins; creeks 0.15–0.2. Draw every band's edge first and every fill after, so a confluence is one piece of water |
| Sea, bay, harbour, lake | a closed outline on the eight directions, filled with the water colour, the same darker edge outside the fill |
| Tunnel under water | the line dashed (dash ≈ 1.05 × width, gap ≈ 0.72 × width), plus two ink casing lines 0.022 at 50 % opacity, 0.05 outside each edge of the line |
| Pen tip | white core r 0.11, ring 0.05 in the line colour, soft halo r 0.8 in the line colour (45 % at the centre); a lead 0.46 G long, half the line's width, 32 % opacity, runs ahead of it along the route |
| Line bullet | rail: disc r 0.25 in the line colour; bus and ferry: rounded square 0.48 with corner radius 0.12. Numeral 800 weight, 0.27 (one figure), 0.22 (two), 0.15 (a short word); opening year 0.17 bold ink, centred 0.30 below |
| Train | ink capsule 0.48 × 0.16 with a thin paper outline and three paper windows 0.07 × 0.06; it rides on the line, inside its width. Thin-line vehicles at 0.7 size |

- **Trains are ink, stations are white.** A dark capsule on a coloured line never reads as a stop or an interchange; a white vehicle does. Keep the two families apart at every zoom.
- **Interchange shape follows the station.** Points side by side make a horizontal stadium, stacked points a vertical one; lines that cross at one point make a circle with the ink outline, which reads as an interchange next to a stop because of its black edge. A capsule never rotates to 45°.
- **Two passes.** A 2D canvas inks only the region the camera sees into a texture (about 1.35× the screen density at the focus, capped at 4096², mipmapped, anisotropic filtering), limited in depth to a few camera distances so low views don't starve; a WebGL pass intersects each pixel's ray with the sheet plane, prints the ink onto procedural paper and computes depth of field from the plane's known depth.
- **Calm paper**: warm off-white, procedural and tileable, sampled in world coordinates so it never slides. A cloud of value at about 9 G period, a tooth at about 2.4 G and sparse short fibres; paper value varies by no more than ±1.5 % and fibres darken at most 1 %; ink is multiplied by the tooth so flat colour varies 3–4 %. The sheet must read as printed paper, never as a flat screen and never as plaster.
- **Light**: one raking light from one corner of the sheet, about 33° above the paper, neutral in colour and fixed for the whole film; it lifts that corner about 7 % above the opposite one. A specular sheen (up to +10 %, narrow lobe) appears only when the camera tilts more than about 30° from straight down. Warmth comes from the paper and the table, never from a tinted light.
- **The sheet edge** sits on a near-black warm table (about #1B1918) with a contact shadow; far away the table goes into a warm dark haze so the horizon never aliases.
- **Grade**: a light vignette (up to −16 % in the corners), a 1.02 gamma, a light film grain at the master; no colour cast, no bloom except the pen-tip halo.
- **Screen space only for the instrument** (the counter) and objects near the lens. Everything else is anchored to the sheet.

## 3. Colour logic

- Neutral ground: warm off-white paper; ink near-black for text, interchange outlines and trains; secondary text in warm grey; water one pale blue with a darker edge, its labels in a mid blue.
- **Line colours carry identity and nothing else.** A real network uses its published colours; an invented one picks hues spaced around the wheel at similar weight, never two neighbours alike.
- **Mode is carried by line form, never by hue.** Each line keeps its colour whatever kind of vehicle runs on it:

| Mode | Line | Stops | Bullet |
|---|---|---|---|
| Metro, suburban rail | solid 0.22 G | stop disc | disc with a figure |
| Another rail mode (tram, light rail, people mover) | solid thin 0.09 G | stop disc | disc with a short word |
| Bus, BRT | hollow: 0.22 G wide, the colour as two edges of max(0.05 G, 2.5 px), a paper core of at least 2.5 px; light colours (relative luminance > 0.4) get an ink rim | named stops only | rounded square |
| Ferry, boat | a 0.09 G thread in the line colour on a paper lane 0.3 G wide (at least 10 px on screen), solid, over open water, from a pier on the water's edge | pier: white rounded square 0.17 G, ring 0.04 G in the line colour | rounded square |
| Under water or underground | the line's own form, dashed, with the ink casing (§2) | none inside the tunnel | — |
| Walking transfer, in a station complex | a white bar 0.06 G wide with an ink outline, centre to centre, under the capsules | — | — |
| Walking transfer, through the street | ink dots of radius 0.015 G every 0.08 G between the two stations | — | — |

  Dashes mean "below": a ferry is never dashed, a tunnel always is.
- **Paper inside a line is never painted.** The paper of a bus core or a ferry lane is erased out of the ink layer (canvas `destination-out`), so the procedural paper shows through. Order the ink: water → surface lines → rail lines → terminus bars → stations and capsules → trains → tips → bullets → labels.
- **Two lines of nearly the same colour** (real networks have them: two yellows, two greens) stay apart by their geometry, their bullets and the moments they are drawn; when one of them is the subject, the rest of the network goes under a paper veil (60 % paper at most) and the subject is redrawn on top at full strength. Stations on the subject keep full strength; the rest fall to about 45 %. Never a dark overlay.
- **An accent is the story's, not a decoration**: the line being drawn has its tip and halo; a verdict or a first section can take the oldest line's colour. Callout bars take the colour of the line they talk about.
- Light colours (yellow, lilac, aqua, light green, sand) carry ink inside bullets; deep colours carry white.

Example (our demo): paper #F4F1EA under light, ink #1B1C1E, secondary text #4A4740, water #BCD6EA / #8FB5D6, water labels #5F88AD; line colours are Guangzhou Metro's published ones (OpenStreetMap colour tags).

## 4. Type & subtitles

- **Faces**: a neutral grotesk for Latin and figures (Inter in the demo) and a CJK sans of matching weight (Noto Sans SC, subset to the characters used). OFL, self-hosted. Native language above, second language below, one line each, never wrapped.
- **Sizes on the sheet**, in G (native / second language): hub label 0.30 / 0.17 bold; interchange 0.23 / 0.14 semibold; named stop 0.20 / 0.14 semibold; the second line in warm grey. Callout: date figures 0.56 heavy, native line 0.36, second line 0.26. The printed title 1.1 / 0.5; the end block's title 2.3 / 1.1 and its lines 1.3 / 0.96 at the end's wide zoom. Water names 0.24 / 0.17, set in the band.
- **Labels**: a paper-coloured halo under every label. Placement is automatic: eight candidates around the station's edge (east, west, north-east and south-east, north and south, north-west and south-west), each scored against every line of the **finished** network and against labels already placed, hubs first; it runs once, before the first frame, so a label never jumps. A hand preference may override the score for a few stations.
- **Few names at once.** Names are chosen per shot, never flashed by time: none during fast growth and wide shots, about eight hubs in a held mid shot, five or six in a low sweep. Hubs grow when pulled out (× (85 / zoom)^0.6, at most 1.75), anchored to the station edge. While the camera rides a tip, names leave the frame before they can be read: show them in the held shots that follow.
- **Legibility is measured where the text lands**: font size on the sheet × the zoom at that point, foreshortened by the tilt. Text the viewer must read keeps the native line ≥ 20 px at 1080p and the second line ≥ 12 px; a two-line label counts only when its block is ≥ 26 px tall on screen.
- **Callouts** are printed on the paper: a paper block with a soft shadow, a bar 0.10 G wide in the colour of the line they speak of, then the date in heavy figures, one native line, one second-language line; they wipe on from the bar in about 0.5 s, hold their reading time and fade, so a later shot never carries an old callout cut by the frame.
- **The film's title is printed on the map.** At the start the title appears in the map's world (a printed block by the first scene, the map's cartouche), never a card floating over the picture, bilingual, held for its reading time.
- **The film closes on the whole network.** The last shot shows the finished network entire, in top view or a gentle tilt, every line drawn, the bullets at the line ends like a legend; the end title and credits are printed on the sheet in a margin, never laid over it.
- **The counter is a light card.** Screen space, top-left: a paper-coloured card (about 90 % opaque) with a soft shadow and a hairline edge, about 560 px wide, 82 px per row. Each row: the native label (24 px, bold ink) above the second label (17 px, warm grey), the figure at the right in the sheet's own face (46 px, 700 weight, ink), a small two-line unit. Figures roll by sliding (the old value up and out, the new one in, about 0.25 s); between two landings they spin blurred so no invented figure can be read. Each landing names its date in the second-language label ("Route length · 2024.12") so a figure is never read as belonging to a later year. Rows appear only when they first land. No enamel plate, screws or drums.
- **Counters land only on sourced values** and each landing holds at least its reading time (about 1.8 s for five characters): plan at least 3 s between landings of one row.
- Reading time: hold every line ≥ (CJK characters ÷ 4.5 + other characters ÷ 15) + 1.5 s.

## 5. Motion quality

- 24 fps (or the film's rate); every frame is a function of time alone.
- **Dragging**: a pen tip moves one hop at a time. The time of a hop grows with its length (length^0.7); inside a hop the tip is fastest mid-way and slows to about 45 % of that on the station, never stopping dead. A faint lead runs ahead of the tip along the route.
- **The snap**: when the tip turns a corner, the new segment swings about 9° further into the turn and springs back (damped, settled in about 0.5 s); this moment is an event for the sound (a soft click).
- Stops pop from 0.6× with a small overshoot in about 0.28 s and a ring in the line colour that spreads and fades in 0.6 s.
- **Interchanges pop**: when the second line arrives the capsule springs from 0.25× past 1.3× and settles in about 0.45 s, with an ink ring spreading to 0.7 G; each later line that passes makes it bounce once more, smaller.
- Terminus bars spring across the line end when the tip arrives.
- Line bullets spring in with a back ease at the line's first stop, carry its opening year when that is sourced, and fade a few seconds after the line is drawn; at the end they return at the line ends.
- **Trains**: on every stretch that has been open for 0.4 s, trains shuttle stop to stop (about 2.4 G/s at speed, eased in and out of every hop, 0.45 s dwell), about one train per 7 G of line, a ring line in both directions. When a stretch grows, the new set fades in over 0.5 s while the old one fades out. The served station pulses (about 1.28× for 0.6 s). Their timing is illustrative unless they come from a real timetable; then the film says which.
- A line that leaves a station already on the map makes it an interchange the moment its tip leaves; start that tip at least 0.3 s after the first line has reached the station, so the pop reads as an arrival.
- What never moves: the geometry of anything already built, label positions, the paper and its light.
- A still of the style shows the medium in motion: a pen tip with its halo or trains on finished track, the counter landed, and a tilted view with depth of field.

## 6. Camera grammar

A pinhole camera with a 32° vertical field of view (about a 42 mm lens on full frame), aimed at a point on the sheet. **Tilt** is the angle from straight down (0° = top view); **heading** turns the view about the vertical; there is never any roll. Zoom is in px per G at the aim point; focus is always on the aim point. Depth of field is analytic: blur radius = aperture × |depth − focus depth| ÷ depth, in pixels at 1080p, capped at 26 px.

| Move | Tilt / zoom / aperture | What it expresses | Can serve |
|---|---|---|---|
| follow the pen tip, aim ahead of it | tilt 25–35°, heading within ±15°, 100–150 px/G for a tip at 1–3 G/s, aperture 12–16 | building, one step at a time | a first section; a single new line |
| drop low where a line meets water | tilt 50–60°, about 130 px/G, aperture 24, eased in and out over about 0.5 s | crossing, risk, a threshold | a river or strait; going underground |
| continuous pull-back with level-of-detail changes | tilt 26° → 16°, 80 → 40 px/G, aperture 8 → 4 | growth, scale arriving | years passing; a network filling in |
| rise until the sheet edge and the table show | tilt about 28–32°, 20–25 px/G | the whole, the object | lines that reach the far districts; a chapter break |
| orbit a feature under a veil | tilt 20–25°, 45–50 px/G, heading drifting ±5°, aperture 6 | one line's moment | a ring closing; a new trunk line |
| low oblique sweep with shallow focus | tilt 56–61°, heading swinging about 40°, about 100 px/G, aperture 22, inked depth extended | density, life, the present tense | the busiest core; everything running at once |
| glide across the sheet to another panel | tilt rises to about 25° mid-move and back to 0°, aperture up to 8 | changing the question, same object | a comparison chart; a legend |
| locked frame, near top view | tilt 0–8°, aperture 0 | reading, judging, the end | a comparison or verdict (hold ≥ 2.5 s before it); the whole network with the end block |

When following a tip, keep tip speed × zoom at or under about 500 px/s on screen. The camera is never lower than about 25° above the paper (tilt ≤ 65°). Top views carry no blur; any tilt above 10° carries some. Framing: the subject sits off-centre with room ahead of a moving tip; the counter owns the top-left corner and nothing important goes under it; a held shot never crops a feature, a callout or the title at the frame edge (≥ 40 px margin). Transitions are glides and pull-backs over the same sheet; no page turns, no fades to black mid-film.

## 7. Sound palette

- **Tuned notes for stations**: each line has one timbre (marimba, glass bell, kalimba, harp, vibraphone, nylon string, music box …) and plays one note every time its pen tip passes a station, on a pentatonic or modal set; the notes climb along the line and turn back at the top, so each line is a phrase and the network's growth becomes a melody. Several lines at once become a soft cloud; thin notes that crowd within ~80 ms on one line, and lower the level of dense bursts.
- **Feedback sounds**: a soft click when a segment snaps, a small wooden tock when a terminus bar lands, a low pop with a pitch drop when an interchange pops, a faint ink dot when a stop lights, two soft ticks when the counter lands, a paper wipe for a printed callout, a faint felt-tip glide under every drawing tip.
- **A gentle pad** under everything, changing chord with the chapters; a riser while a featured line draws and a full chord when it completes.
- **Silence**: about half a second of near-silence before a verdict or a record; the end thins to the pad and one last chord.
- Synthesized (numpy, `core/audio/sfx.py`, `core/audio/pluck.py`) or CC0 samples (`sh tools/fetch.sh instruments …`). Never a game's sounds, jingles or music, and never their imitation.
- Mix: `neo/audio/cues.py` reads the picture's events (pass, snap, x, term, stop, land, callout …) so every sound sits on its frame; `neo/audio/master.py` brings the mix to −14 LUFS with true peak under −2 dBTP and checks that the master will be linear (loudness range ≤ 11 LU).

## 8. Native moves

- **The dragged line.** A pen tip pulls a line out stop by stop, snapping into each segment; each stop is a note. *Fits content like:* a product roadmap; a migration route; a career, job by job.
- **The springing interchange.** Two lines meet and the capsule pops; every later line makes it bounce again. *Fits content like:* two teams merging; a hub that keeps attracting connections.
- **The living network.** Trains ease from stop to stop on everything that is open, and the stations pulse as they are served. *Fits content like:* a service at work; "how it runs today".
- **The tunnel under the water.** Inside the water band a line turns dashed with a casing; the camera drops low to watch it cross. *Fits content like:* a cable under the sea; a deadline crossed.
- **The featured line under a veil.** The network fades under paper and one line draws on top at full strength (a ring closing, a new trunk); its stations pulse as it passes. *Fits content like:* the one change that ties everything together.
- **Levels of detail.** Pulling back, stops and their names fade first, interchange names next, hubs stay. *Fits content like:* zooming from a street to a city.
- **The light counter.** A paper card whose figures roll and land only on true values, each with its date. *Fits content like:* kilometres, users, stores, sensors.
- **Time lines.** Two networks drawn as two lines over one year axis, stops at sourced milestones. *Fits content like:* two companies' growth; a plan against what happened.
- **The plate by the lens.** A station name plate stands on the sheet near the camera, out of focus, as the low sweep passes it. *Fits content like:* a place that matters.

## 9. Pitfalls of the medium

- **Off-grid geometry**: any segment not at 0/45/90° breaks the style. Route between points with one automatic bend, choose the bend that overlaps no other line, and validate every segment.
- **A real network is too big to place by hand and too dense to place automatically.** Solve the octilinear layout on a skeleton (interchanges, termini, branch points), with each run's length set by its number of stations; expand the dense core and compress the far districts; then pin the core by hand and space the ordinary stations evenly along each run, away from corners.
- **Water on the wrong side**: a schematic moves stations, so a line can end up crossing the river between the wrong stations. Check every pair of neighbouring stations against the real track's crossings and fix the layout until they agree.
- **Thin lines in wide shots** read as a diagram, not a print: keep a minimum on-screen width.
- **Trains that look like stations**: white vehicles on a line read as interchanges at a distance. Vehicles are ink.
- **Labels over lines, or labels that jump**: place labels once against the finished network, with a paper halo; choose names per shot.
- **Too much text**: hide names by shot and zoom, fade callouts after their reading time.
- **A flat map**: a top view all the way through reads as a slideshow; tilt, focus and the sheet edge make it an object.
- **Paper too loud**: tooth and fibres stronger than a few percent turn the sheet into plaster; too smooth and it becomes a screen.
- **Springs that never settle**: overshoot must be small and settle within half a second, or the map wobbles. Nothing idles.
- **Counters that interpolate** invent numbers. Land only on sourced values, spin blurred between them, give each its date, and leave at least 3 s between landings of one row.
- **Ring lines**: the last station of a loop is the first; give it the end of the path, or the ring is never drawn.
- **Real networks**: published colours and station names are facts, logos and branded bullets are not; the film is an unofficial tribute and says so on screen. OpenStreetMap can miss a station: compare station lists with the operator. Stations are renamed; lines are split and renumbered.
- **Stale ink**: when the inked texture is reused, reset the 2D transform before clearing it.

## 10. Engine

The pipeline, independent of any code: (1) the network as data: stations with native and second-language names and a tier, lines as lists of stations, offsets and bends on the G lattice, water as bands and areas; (2) expand each route into an octilinear polyline, fillet the corners, measure arc length, find its corners; (3) precompute everything time-dependent once: when each tip passes each station and corner (by bisection on its progress), when a station becomes an interchange, when each terminus is reached, label placement on the finished network; (4) per frame: camera → the region of the sheet it sees → ink that region (water, lines with their snap, terminus bars, stations, trains, tips, bullets, labels) → lay it on the plane, print it on paper, light it, blur it by depth → draw the screen-space counter.

In our demo (`demo/`), the engine is generic and the film lives in data files:

- `gl.js`: `makePlane(canvas, paper)`: plane, calm paper, raking light, sheen, sheet edge, depth of field, vignette.
- `film.js`: the engine. Fillets and arc length (`rounded`, `pointAt`, `subPath`), corners and snaps, the hop-eased default progress (`hopEase`), water and tunnel intervals (`drawSpan`), the four line forms (`MODES`, `surfaceLine`), terminus bars, interchange pops, the train service (`service`), `placeLabels()`, bullets, the camera (`basis`, `toScreen`, `toPlane`), the inked region (`regionFor`), events for the score (pass, stop, snap, x, term, depart …), `window.TEXTS` for the reading-time check. It holds no network and no story.
- `net.js` → `window.NET = {G, ST, LINES, WATER, LINKS, pt, sid, expand}`. `ST`: `id: [x, y, native, second, tier]` (G; tier 1 hub, 2 interchange, 3 named stop, 4 ordinary). `LINES`: `{id, color, route, branch?, mode?: 'metro' | 'light' | 'bus' | 'ferry', bullet?, ink?, loop?}`; route items are a station id, `[id, dx, dy]` (an offset for parallels) or `[x, y]` (a bend), `'/'` puts the next bend diagonal-first. `WATER`: `{line, outer, inner, tunnel?}` bands and `{area, tunnel?}` outlines. `LINKS`: `{a, b, out?}`. For a real network it is generated (`demo/tools/prep.py`: OSM routes → skeleton → octilinear solve → hand pins → water check → net.js).
- `timeline.js` → `export const DATA`. Required: `DUR`, `SHEET [x0, y0, x1, y1]` (world units, 100 per G), `PHASES` (`{path, a, b, t0, t1, year?, yearLabel?, keys?, lin?, bLast?, glow?}`; without `keys` or `lin` the progress is hop-eased), `camera(t) → {x, y, z, tilt, head, ap, focus?, far?, vig?, dim?}`. Optional hooks, each with a neutral default:

| Hook | Signature | Does |
|---|---|---|
| `LABEL_PREF`, `nameAt`, `labelOnly`, `forceLabel`, `hubLabelScale` | `{id: 'e'…}`, `(n, t) → [native, second]`, `t → ids \| null`, `(n, t) → 0..1`, `z → k` | label side, renamed stations, names per shot, forced names, hub growth |
| `noRoundel`, `roundelPos`, `roundelAlpha`, `roundelScale` | `[ids]`, `{id: [x, y]}` or `(t, id) → [x, y] \| null` (G), `(t, id, z) → 0..1`, `z → k` | line bullets |
| `drops`, `dropRing` | `{id: true}`, `(c, n, k2, {capsule, INK})` | interchanges that fall instead of popping |
| `veil`, `stationDim`, `highlight` | `t → 0..1`, `(n, t, veil) → alpha`, `(c, t, {PATHS, PH, phaseHead, drawSpan, modeOf, LINE, pointAt, subPath}, top)` | paper veil and the featured line redrawn on top |
| `waterLabels`, `furniture`, `annotations` | `(c, t, view, helpers)` on the sheet | water names, title and end block, callouts |
| `trains` | `(c, t, {service, PATHS, PH, phaseHead, train, pointAt}) → [{path, s, a, at, k}]` | vehicles (`service(t, {every, alpha})` runs the illustrative shuttle) |
| `overlay`, `tunnelOnly` | `(c, t, {b, toScreen, F, INK, view, regW, regS})` in 1920 × 1080 screen space, `t → bool` | the counter, objects by the lens |
| `cues`, `init` | `[{t, type}]`, `(helpers)` | sound cues; access to the built network |

  Every text a hook prints that must be read is registered with `regW` (on the sheet) or `regS` (screen) for `window.TEXTS`.

## 11. Variation space

The agent decides the network (real or invented), what a line stands for, the order of growth, the camera route, which line (if any) is featured under a veil, which comparison (if any) gets a printed panel, and what the counter counts.

What does not vary, whatever the topic:

- **The network is real data, checked.** Use the user's own data first (lines, stations, opening dates, lengths, ridership). Without it, find it for the topic and cross-check every figure in at least two reliable sources, the operator and government open data first, the press next, encyclopaedias only in support. Keep `FACTS.md` in the project folder: on-screen claim, value, source URL, the quoted wording, date checked; plus the figures checked and not used, and why. A date known only from an encyclopaedia may order the drawing but is not printed (the counter spins through it). Station names and line colours are facts too (§9). An invented network is only for a topic that is itself fiction or a metaphor; it says so on screen.
- **Trains are honest.** Illustrative trains say so on the last card ("trains illustrative"); trains from a real timetable name it in `CREDITS`.
- **The map is full enough to carry the film**: roughly one new event (a line, an interchange, a landed value, a printed callout) every 3–5 s of film. Minimums, by kind of topic:

| Topic | Lines | Named stations | Interchanges | Geography and landmarks | Dated states |
|---|---|---|---|---|---|
| A whole network (a city, a region), 30–60 s | ≥ 5 | ≥ 40 | ≥ 8 | ≥ 1 water body, ≥ 3 named landmarks | ≥ 4 years or stages, each with a sourced value |
| One line or one route, up to about 20 s | the line + ≥ 3 lines it crosses | ≥ 8 on the line | ≥ 3 | as above | ≥ 2 |
| A topic drawn as a network (a roadmap, a career) | ≥ 4 | ≥ 20 | ≥ 4 | printed regions or bands standing for its domains | ≥ 3 |

  When the real network is smaller than the floor, draw what is real and widen the topic (its buses and ferries, the railway it meets, its history), never invent lines.
- **Structures**: a network growing by chapters with one featured line; a single line built stop by stop, ending on its terminus; two rival networks on one sheet, then compared; a network shrinking line by line and one survivor.
- **Openings** (the title is printed on the map, §4): the bare sheet with only its water and the title, the first tip starting beside it; a lamp or coin in close-up match-cut to a station dot; a low sweep over a finished map that rewinds to its first stop.
- **Endings** (every one closes on the whole network, §4): rise to the whole network with bullets at the line ends and the end block in a margin; a terminus bar lands, then the camera rises; a train leaving the last station, then the full view.
- **The game influence stays grammar**: bold lines, dragging, snaps, pops, running trains, tuned notes. No shape-coded stations or passengers, no queues, no clock or week counter, no line-token bar, no score, no copied palette, typeface, icon, sound or music, and no game named anywhere.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
