# Scroll Map — Style Prompt

> A real map, drawn as an antique Chinese handscroll: silk-coloured paper, an ink shoreline, a sea of fish-scale waves, mountains painted in elevation in blue and green, roads in cinnabar, place names on pasted slips. The geometry is OpenStreetMap; every mark is drawn in code.
> References (grammar only): Ming and Qing coastal-defence scroll maps (the coast pulled into one long strip, mountains as pictures, waves as a pattern, names on slips, red lines for routes) and blue-and-green landscape handscrolls (read from right to left, revealed a section at a time). Never copy a particular map's picture, inscription or seal, and never name one in the film.

Needs: the library's core tools, plus `neo/geo/osm.py` for the map data (Python standard library only; it calls the Overpass API, so the first run needs a network). The plucked instruments need the music tier (`setup.sh deps music`). Map data is © OpenStreetMap contributors under ODbL 1.0: tell the user the terms (credit on screen; the derived data files stay under ODbL) before using it, credit it on the last card and in `CREDITS`, and follow DIRECTOR.md §13 for every frame.

## 1. Essence, and what it is not

- **The map is true, the marks are old.** Coast, water, woods, peaks, roads and buildings sit where the data puts them; none of them is drawn the way a modern map draws them. If a viewer who knows the place cannot find their street, or a viewer who doesn't cannot tell it is a painting, it is not this style.
- **Plan and elevation on one sheet.** The ground is seen from above; mountains, houses and towers stand up on it, drawn from the side, their feet on their true position and their tops pointing up the frame.
- **It is an object.** The picture is a scroll lying on a dark table: paper with fibres and foxing, brocade borders, a roller. Wide shots show the object; close shots stay inside the paper.
- **It is made in front of you.** The paper arrives first, then the ink line, then the colour, then the names. Nothing fades up as a finished image.
- It is not a tinted web map (no tiles, no icons, no shields, no sans-serif labels), not an ink-wash landscape without geography, not a fantasy map (no invented land, no sea monsters, no compass rose), and not a 3D terrain fly-over.

## 2. Materials & rendering

- **Canvas 2D, vector, every frame from the data.** One world → screen transform; line widths are given in metres with a floor and a ceiling in pixels, so a road is a hairline in the wide shot and a brush stroke up close, and never a band.
- **Paper** is a tileable texture (low-frequency mottling, short fibres, foxing) multiplied over the whole painting, anchored to the world, cross-faded between two magnifications so that it neither blurs nor pops during a zoom. The scroll's long edges darken a little.
- **Sea**: a fish-scale wave pattern with small irregularities in every scale, anchored to the world at a fixed size in metres. Outside the shore, two or three waterlines hug the coast (stroke the coast wide in line colour, then narrower in sea colour, twice).
- **Land** is bare paper, with an ochre wash blurred inward from the shore, and a pale green wash under woods and parks.
- **Ink lines** are stroked twice: once plain, once wider through an irregular dash, which reads as the pressure of a brush. Coast and railways are ink; nothing else is.
- **Mountains** are signs, not terrain: two or three rounded peaks, ink on the ridge only, azurite at the top running through malachite into the paper at the foot, a few texture strokes and moss dots. Their size follows how deep the woodland is; a named peak with an elevation gets its own, sized by height. Northern ones are drawn first so that southern ones overlap them like ranges.
- **Buildings** are signs too: a footprint becomes a hall of its own size, turned the way the footprint lies (white body, dark hipped roof, one bay per 11 m of frontage), and its roof always points up the sheet: a footprint that runs north–south is drawn as halls one behind the other, all facing south, never as a hall lying on its side. A tall building (24 m and more) becomes a pavilion whose number of tiers follows its height, each tier narrower, eaves turned up, a finial on top; it always stands upright. Crowded small ones are thinned so that every sign is legible; what is underground (metro boxes, malls under a square) is not drawn.
- **Walled towns** get a crenellated square with gate towers.
- All of it is procedural and seeded by the feature, so nothing boils. Only the vignette is in screen space.

## 3. Colour logic

- **Mineral pigments on old silk**: one warm paper tone as the ground; ink; azurite blue and malachite green for mountains; a grey blue-green for water; ochre for washes; cinnabar. Nothing else, nothing saturated except cinnabar.
- **Cinnabar means people**: roads, the frames of name slips, seals, the pillars of pavilions, the slips of the oldest places. Nature never takes it. Use this to tell the story: a frame without cinnabar is a place before the city.
- **Green and blue belong to height.** Flat land stays paper; the more mountain, the more colour.
- Outside the paper only two things exist: a dark blue brocade with dull gold, and a near-black table.
- Example palette (the demo's): paper `#e6d6b2`, ink `#2a2521`, azurite `#2b5878`, malachite `#4a8468`, sea `#cdd2b9`, cinnabar `#bd3923`, brocade `#1c2a3c`.

## 4. Type & subtitles

- **Vertical, always.** Place names are written top to bottom in a regular-script brush face (LXGW WenKai, OFL).
- **Three kinds of name**: settlements on a pasted slip (pale slip, thin cinnabar frame, soft shadow); the oldest places on a cinnabar slip with pale characters; mountains and waters straight on the paper, mountains in ink with a paper-coloured halo, waters in blue-grey with wide spacing.
- **Title** in a running-script brush face (Ma Shan Zheng, OFL), on the blank paper at the right end of the scroll, with a square cinnabar seal beside it. The title is written, not faded in.
- Names live in the world: they have a size in metres, clamped to a readable range in pixels (18–52 px at 1080p), and a zoom range outside which they are not drawn.
- Default: no narration. If a film needs subtitles, set them horizontally on the table below the scroll, in the brocade's dull gold; the data credit goes there as well. Hold ≥ max(1.8 s, speech + 0.6 s).

## 5. Motion quality

- **Four fronts, always in this order**: the paper unrolls; the ink line follows; colour seeps in behind the ink through a soft, uneven edge; names drop onto the finished ground. The gaps between them are distances on the map, so a fast camera stretches them and a slow one closes them.
- **Things stand up, they do not fade in.** A mountain grows from its foot with a small overshoot; a pavilion is built tier by tier; a slip drops a short way and settles.
- **Cinnabar spreads from a point** along the lines that are already there, like a stain, not like a wipe.
- 24 fps, no stepping. Camera moves ease in and out and are long; holds are truly still. Zoom is interpolated in the logarithm of the frame height.
- What never moves: the paper's texture relative to the map, the waves, anything already painted. A finished part of the scroll is a painting.

## 6. Camera grammar

A camera state is a point on the map and a frame height in metres. North is up and the frame never rotates.

| Move | What it expresses | Can serve |
|---|---|---|
| Lateral travel along the scroll | reading; distance; time | a coast, a river, a road, a chronology |
| Push from region to district to street | "here, in particular" | arriving somewhere; the one place that matters |
| Locked frame while things are drawn | making; attention | a place being founded; reading time for a name |
| Pull out to the whole scroll with its rollers | scale; this was one object all along | a reveal; a summary; a comparison of the ends |
| Slow drift at street scale | dwelling | a neighbourhood; a crowd of buildings |

- Three scales, and a film should visit all three: the object (frame height ≥ the scroll's), the region (10–30 km), the street (2–6 km, where buildings appear).
- A name the film needs read sits in the middle two thirds of the frame while the camera holds or drifts.
- Transitions are travel and zoom only. No cuts inside the scroll, no dissolves, no rotation, no tilt.

## 7. Sound palette

- **Instruments**: guqin (open strings, slides, harmonics) for ink and paper; xiao or another end-blown flute for distance; pipa for people and speed; one large drum and a woodblock. No piano, no string pad.
- **Mode**: a five-note scale throughout. To accelerate, divide the beat (guqin in quarters, then eighths, then pipa in sixteenths) instead of changing tempo.
- **Foley is the scroll and the brush**: the wooden roll on the table with paper rustle, a dry brush hiss while lines are drawn, a small wooden tick when a mountain stands, a paper tap for a slip, a woodblock per tier of a pavilion, a low thump for the seal.
- **Ambience** comes from the map: surf where the frame holds sea, nothing where it doesn't.
- **Silence**: before a name that matters and before the seal. It may hold surf and a ringing string, nothing struck. The seal is the last heavy sound.
- Mix: dry and close, a short hall on the instruments only, −14 LUFS.

## 8. Native moves

- **Unrolling.** The roll travels left and paper appears behind it; the same move ends the film when the roll reaches the far roller. *Fits content like:* opening any place; a timeline; a route that is longer than the frame.
- **The brush leads.** The shoreline (or any hero line) is inked ahead of the colour, and the camera follows the tip. *Fits content like:* a coast; a river from source to mouth; a border wall; a trade route.
- **Mountains standing up** as the colour front passes, largest last. *Fits content like:* introducing a landscape; showing why a road bends; a ridge that separates two places.
- **Cinnabar spreading** from one point through the road net. *Fits content like:* a city growing from its first gate; a railway opening; a rumour, a market, an epidemic.
- **Towers as pavilions**, built tier by tier, the tallest last. *Fits content like:* a skyline; a ranking by height; one building that outgrows its neighbours.
- **Slip and seal.** A name is pasted; the work is stamped. *Fits content like:* naming a place for the first time; chapter marks; the end.

## 9. Pitfalls of the medium

- **Roads become red bands up close.** Cap every line in pixels (§2), and let small roads appear only past a zoom threshold.
- **The coast closes along the edge of the data** and draws a rectangle. Stroke only the true coast, and keep the painting's edge inside the data's edge by more than the widest wash.
- **Data is uneven.** Building heights are often missing; small buildings come in swarms. Draw a pavilion only where a height says the building is tall, a hall of the footprint's size everywhere else, and thin the swarms.
- **Names vanish into mountains.** Halo them or put them on a slip, and place them beside the thing, not on it.
- **A clip rectangle that starts off-screen** must still reach the right edge: compute its width from the screen, not from a constant.
- **Boundaries.** Don't fetch or draw them (DIRECTOR.md §13). Draw both sides of any line the same way, and keep the frame regional.
- **Too even.** A map with every layer on is wallpaper. Hold layers back and spend them one at a time.

## 10. Engine

- [`neo/geo/osm.py`](../../neo/geo/osm.py): bounding box and layer names in, one JSON file out (metres around an origin, simplified lines, land closed against the box). `--origin` lets a detail file overlay a wide one.
- [`demo/ink.js`](demo/ink.js): `makePaper`, `makeWaves`, `inkStroke(g, path, width, colour, seed)`, `drawPeak(g, x, y, w, h, seed)`, `drawHall(g, x, y, frontage, depth, angle, bays, seed)`, `drawTower(g, x, y, w, tiers, seed, growth)`, `drawSlip`, `vtext`, `drawSeal`.
- [`demo/main.js`](demo/main.js): `MOUNTAINS` (signs from woodland density and peaks), `HOUSES` (signs from footprints), `layer(draw, mask)` with `washMask` and `frontClip` for the fronts, `drawFort`, `drawScroll`.

```js
// a river town at street scale, nothing from the demo: paper, one inked river, three pavilions
g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
world(); inkStroke(g, riverPath, lw(40, 1.5, 5), C.ink, 7); screen();
[[-300, 2], [0, 5], [280, 3]].forEach(([x, tiers], i) => drawTower(g, sx(x), sy(120), 90 * S, tiers, i + 1, 1));
drawSlip(g, '渡口', sx(420), sy(260), 30, 'slip');
```

## 11. Variation space

The agent decides: the place and its bounding box; which end of the scroll is first; which layers exist at all (a film may have no roads); what cinnabar stands for; the three scales and the route between them; which names are read; the title and the seal; the palette within §3.

- **Three structures**: one line followed end to end (a river, a metro line); two sheets of the same place, one drawn over the other; a list of stops, each one a push-in and a slip.
- **Three openings**: a seal stamped on empty paper, and the map grows from it; a single cinnabar road already crossing blank paper; close on waves, and the first island's shoreline is inked.
- **Three endings**: the scroll rolls shut from the left; the camera stops on the one house the film was about; the last name is pasted and the paper stays otherwise empty.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
