# Atlas Scroll — Style Prompt

> One of the Real Maps series: styles drawn over OpenStreetMap (the ground as it is today) and OpenHistoricalMap (borders, railways and routes by year).
> A real map that changes with the years, drawn as a nineteenth-century hand-coloured atlas plate on one long roll: engraved coast and rivers, each state or province in a pale wash with a darker band inside its border, names in spaced roman capitals, hills in hachures. A small traveller leads the eye across it. Borders by year come from OpenHistoricalMap, the ground from OpenStreetMap; every mark is drawn in code.
> References (grammar only): American engraved and lithographed atlases of the 1800s (outline colour, water lining, hachured hills, letter-spaced capitals, a cartouche for the title) and wall maps mounted on rollers. Never copy a plate's layout, ornament or title, and never name an atlas in the film.

Needs: the library's core tools, plus `neo/geo/ohm.py` (dated borders, railways, named routes from OpenHistoricalMap) and `neo/geo/osm.py` (coast, water, peaks from OpenStreetMap); both use only the Python standard library and call an Overpass API, so the first run needs a network. The plucked instruments need the music tier (`setup.sh deps music`). OpenHistoricalMap is CC0. OpenStreetMap is © its contributors under ODbL 1.0: tell the user the terms (credit on screen; the derived data files stay under ODbL) before using it. Credit both on the last card and in `CREDITS`. This style draws borders, so read DIRECTOR.md §13 before choosing a place: use it where the film is about how borders changed, draw only the borders of the film's subject, and keep present-day disputes out of the frame.

## 1. Essence, and what it is not

- **The map is a function of the year.** Every border on screen is the one that existed at the year the film has reached. A film in this style is always about change over time; a single year is a poster, not a film.
- **Outline colour.** A unit that belongs to the subject gets a pale wash and a darker band of the same colour just inside its border; neighbours never share a colour. What does not belong yet is bare paper.
- **Engraving, not painting.** Lines are thin, even and dark; water is lined along the shore; relief is hachured. Colour is the only soft thing.
- **A traveller leads.** One small vehicle (a wagon, a train, a ship, a rider) moves along a real route, the camera follows it at close range, and it changes when the age changes.
- **It is a roll.** The plate is on a long sheet with a wooden rod at one end and the unopened roll at the other; it unrolls in the direction the story moves.
- It is not a tinted web map, not a modern choropleth (no legend, no gradient scale, no sans-serif), not an antique Chinese scroll (brush, mineral colour, vertical names: that would be another style in this series), and not a 3D globe.

## 2. Materials & rendering

- **Canvas 2D, vector, every frame from the data.** One world → screen transform. Line widths are given in metres with a floor and a ceiling in pixels.
- **Projection.** A conic projection for a country (Albers, set in `neo/geo/osm.py --proj`), so parallels bend the way they do in an atlas. The page projects its own longitude/latitude points with the same formula.
- **Paper**: a tileable texture (mottling, foxing, two faint fold lines) multiplied over the plate, anchored to the world, cross-faded between two magnifications.
- **Sea**: a flat pale tint. Along every shore, three or four waterlines (stroke the land wide in line colour, then narrower in sea colour, repeatedly).
- **Political colour**, in this order: a faint wash over everything the subject holds that year; a grey-green inner band for organised but not yet admitted units; for admitted units a wash at about half strength, then the same colour at full strength stroked along the border and clipped to the inside. Colours are assigned once so that no two neighbours match (grid the vertices, greedy by order of arrival) and never change.
- **Lines**: unit borders are thin dashed ink; the subject's outer limit is a red dash-dot; the coast is a solid ink line on top.
- **Rivers and lakes**: only the named few. Major rivers a little heavier.
- **Relief**: one hachured hill per grid cell, at the highest peak in the cell: a ridge line, bare on the lit side, short slanted strokes on the other. No colour.
- **Railways** (or any network with opening dates): a thin ink line, with a paper-coloured dash laid over it when it is wide enough to show; each year's lines fade in when the year arrives; fainter in wide shots so that names stay legible.
- **The traveller** is drawn in elevation at a size clamped in pixels, wheels turning by the distance covered, with a ground shadow. A wagon leaves a dotted red trail.
- Everything is seeded or data-driven; nothing boils. The plates of §4 and the vignette are in screen space.

## 3. Colour logic

- **Ground**: one cream paper. **Ink**: one warm black, one sepia for secondary lettering and hachures.
- **Six washes** (rose, gamboge, green, blue, orange, lilac), all pale, all of similar value, so that the map reads as one sheet and no unit shouts.
- **Red is for the line of the story**: the subject's outer limit, the traveller's trail, the stars of the counter, the title in the second language. Nothing else is red.
- **Water** is a grey blue-green, paler than any wash.
- Outside the paper: a dark green silk edge, turned wood, a near-black table.
- Example palette (the demo's): paper `#efe4c6`, ink `#2b2118`, sepia `#5a4028`, sea `#cfdcd6`, red `#b5402c`, washes `#e7a79b` `#ecd183` `#a9c99a` `#a3c3d6` `#e6b57e` `#c7afd3`.

## 4. Type & subtitles

- **One old-style roman with its italic** (IM Fell English, OFL, in `core/fonts/`). Admitted units: upright capitals, letter-spaced, sized to fit the unit and capped. Units not yet admitted: italic capitals in sepia. Seas: wide-spaced italic capitals in the water colour. Names too small to read are not drawn.
- **Three plates in screen space**, each a paper slip with a double rule: the year (top left), a counter (top right: one mark per unit, the newest one swelling as it lands), and the caption (bottom centre).
- **Captions** are two lines on one plate: the film's language first in a serif (for Chinese, Noto Serif SC, OFL), the second language below in italic. One line each, never wrapped; each line held for its own reading time (CJK characters ÷ 4.5 + other characters ÷ 15 + 1.5 s). A caption that names a year appears when the year plate reaches that year, and while it is up the plate moves by one year at most: slow the clock under the caption and run it between captions.
- **Title** in a cartouche drawn on the map over open water, appearing last.
- Insets (places off the plate) are small plates on the map, as in an atlas.

## 5. Motion quality

- **The roll opens fast.** Paper is moving in the first frame and the subject is on screen within three seconds; later jumps of the roll follow the story (a purchase unrolls a third of the sheet at once).
- **The ground arrives through a soft, uneven edge** a little behind the roll; politics arrives by date, on top of ground that is already there.
- **A unit joins in 0.7 s**: its wash comes up while its border band narrows from double width to its resting width, like colour settling; one counter mark lands with it.
- **The traveller moves at constant speed between waypoints and stops completely at the one place that matters.** Wheels and legs are functions of distance, smoke of time.
- 24 fps, no stepping. Zoom is interpolated in the logarithm of the frame height. While following, the camera is a blend between its own path and the traveller's position.
- What never moves: paper texture against the map, anything already engraved.

## 6. Camera grammar

A camera state is a point and a frame height; north is up along the central meridian, and the frame never rotates.

| Move | What it expresses | Can serve |
|---|---|---|
| Follow the traveller at close range | a journey at human scale | a trail, a voyage, a campaign, a delivery |
| Pull out as the roll jumps | a change too large for the frame | a purchase, a treaty, a collapse |
| Look back along the route | something is catching up | a railway, a pursuit, a deadline |
| Slow travel across a filling map | accumulation | admissions, enclosures, electrification |
| Pull out to the whole roll | the sum | an ending; a before/after of the two ends |

- Three scales: the object (the whole roll), the country (a third to a half of it), the traveller (the traveller is 5–8 % of the frame width).
- Captions sit bottom centre; keep the traveller above that plate and out from under the top plates.
- Transitions are travel and zoom only. No cuts inside the roll, no dissolves.

## 7. Sound palette

- **Instruments of the place and century.** For nineteenth-century America: banjo, steel-string guitar, plucked bass, harmonica or fiddle, a foot stomp. For another subject choose its own plucked and reed instruments; never piano and string pad.
- **One note per unit.** Each admission plucks one pitch on a rising scale, so the score's density is the history's.
- To accelerate, divide the beat (eighths to sixteenths) rather than changing tempo.
- **Foley**: the roll on the table, the traveller's own sound (wheels and hooves; steam, rail joints, a whistle that is heard before the train is seen), a paper tap for captions, a stamp for insets.
- **Ambience** from the map: surf at a coast, wind on open country.
- **Silence** where the traveller stops, and before the last count. Mix dry, −14 LUFS.

## 8. Native moves

- **Colour settling.** A unit's wash comes up and its band tightens as it joins. *Fits content like:* admissions to a union; parishes joining a diocese; lines joining a network.
- **The jump.** The roll and the camera leap when one act changes the map. *Fits content like:* a purchase or cession; a dynastic union; a partition.
- **The traveller hands over.** A faster vehicle overtakes the first and becomes the guide. *Fits content like:* wagon to train; sail to steam; courier to telegraph.
- **The network grows by date** behind the traveller. *Fits content like:* railways, canals, post roads, power lines.
- **The counter.** A row of marks fills; the last ones are saved for after a silence. *Fits content like:* any "from N to M".
- **Insets.** What lies off the plate is pasted on as small plates. *Fits content like:* overseas territories; a city plan; a detail too small for the scale.

## 9. Pitfalls of the medium

- **Overpass and a country.** A regular expression or an `if:` filter over a whole country times out. Ask for exact names (`--query`), take big lakes as relations one or two at a time, take the coast from the simplified land polygons (`--coarse-land`), and cut peak queries into regions.
- **Negative longitudes** look like options to the shell: write `--bbox=-128,22,-64,52`.
- **A name is not a status.** The same name can be a colony, a republic and then a state. Decide admission from a date table or the right version, not from the first polygon with that name, and write the choice in `FACTS.md`.
- **Dense networks bury the names.** Lower their opacity with distance, and draw names after them with a halo.
- **Two travellers at one point** hide each other: offset the slower one.
- **A conic bends the data's edge.** The plate must lie inside the bent box; compute the corners before choosing it.
- **Borders.** See the note at the top: subject's borders only, by year, nothing present-day and disputed.

## 10. Engine

- [`neo/geo/ohm.py`](../../neo/geo/ohm.py): `--layers admin,rail,named` with start and end years on every feature; shared borders are simplified once so neighbours meet. [`neo/geo/osm.py`](../../neo/geo/osm.py): `--proj albers:…`, `--coarse-land`, `--query`, `--filter`.
- [`demo/tools/prep.py`](demo/tools/prep.py): cuts the full fetch down to the units the film draws.
- [`demo/atlas.js`](demo/atlas.js): `makePaper`, `drawHill`, `drawWagon`, `drawLoco`, `drawCompass`, `caps`, `star`, `plate`.
- [`demo/main.js`](demo/main.js): `shape` and `at(versions, year)` (which border is current), the neighbour colouring, `drawMap(t, year)`, `guideAt` and `drawGuides`, `drawHud`, `layer` with `washMask`.

```js
// one unit joining in a year the demo never shows: wash, inner band, name
const v = at(unit.versions, 1701), k = clamp((t - tJoin) / .7);
g.globalAlpha = k; g.fillStyle = rgba(C.tints[2], .46); g.fill(v.path);
g.save(); g.clip(v.path); g.strokeStyle = rgba(C.tints[2], .95); g.lineWidth = lw(56e3, 4, 13) * (2 - k); g.stroke(v.path); g.restore();
caps(g, 'BOHEMIA', sx(v.cx), sy(v.cy), 28, C.ink);
```

## 11. Variation space

The agent decides: the subject and its years; which way the roll opens; what counts as "admitted"; who the traveller is and when it hands over; which network grows; what the counter counts; the three scales and the route; the captions; the palette within §3.

- **Three structures**: growth from a core outward along one route; a partition told backwards, units leaving one by one; two travellers from opposite ends who meet.
- **Three openings**: the roll already half open on an empty continent, and the first border is engraved; close on the traveller standing still, then the roll moves; the counter alone on dark, its first mark landing as the paper arrives.
- **Three endings**: the traveller leaves the plate and the roll closes behind it; the last unit is left uncoloured; the camera returns to the first place, now one of many.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
