# Bus Dot Matrix — Style Prompt

> A city's real transit network and a real day of its timetable, played on an amber LED dot-matrix board: the material of bus destination signs and stop displays. Every mark is a lit dot on one fixed pitch; a clock drives the departures; the board is a physical object with lenses, glass and a housing.
> References (grammar only): bus destination signs and stop displays (one hue, bitmap type, text that rolls), departure boards (time made visible by changing rows), LED walls seen up close (round lenses, bloom). Never copy an operator's livery, logo, sign layout or chime.

Needs: the core tools and `neo/geo/gtfs.py`, `routes.py`, `osm.py` (network on the first run). A timetable's licence is its publisher's: name feed, publisher and terms in `CREDITS` and on the last card. OpenStreetMap is ODbL 1.0: tell the user before using it. Every map frame follows DIRECTOR.md §13.

## 1. Essence, and what it is not

- **Everything is a dot.** Coast, roads, routes, vehicles, numbers, names and the clock are dots of one board on one pitch. Nothing is drawn between the dots, and nothing on the board is not a dot.
- **The data is a timetable.** Vehicles move because departures fire from a published schedule, at the stops' times, along the real roads. Time of day is the engine: a clock advances, the rush swells, the night thins.
- **Zoom is a re-render, not a lens.** Changing the map's scale redraws it on the same dots, with a scan line; the dot pitch stays. Only the camera magnifies, and the camera is looking at an object.
- **The board is an object.** Round lenses with a hot core, a dark gap, light that blooms, glass that reflects, a housing on a wall. Close shots stay inside the dots; wide shots show the thing.
- Not a printed metro schematic (no eight-direction lines, no paper), not a web map behind an LED filter, not pixel art (no sprites, no palette), not a heat-map dashboard (no colour scale), not a CRT.

## 2. Materials & rendering

- **Two halves.** A brightness buffer of NX × NY dots computed on the CPU each frame, and the board drawn as an object on the GPU (WebGL2): each pixel's view ray meets the board plane and the dot under it is shaded from the buffer. 320 × 180 dots at 6 px fill 1920 × 1080.
- **Rasterize on the dot grid.** Lines are integer DDA runs, land a fill thresholded at half coverage, the coast every land dot with a water neighbour; static layers once per view.
- **Moving things are sub-dot.** A vehicle splats over the four nearest dots, so it glides. The shutter is one frame: the road covered in that frame is lit with constant total energy (fast is long and dim), the head brighter, and a persistence tail of about four dots fades behind.
- **The lens.** A disc of radius ≈ 0.39 pitch with a hot core; unlit, a dark hemisphere with one highlight; each dot ±12 % in brightness, seeded by position; the gap near black.
- **Light.** Bloom only from dots above a threshold (vehicles, text), so the dim map never fogs. The glass reflects one faint band that slides with the camera; the housing is dark metal; the wall takes the board's spill and an offset shadow.
- **No moiré.** The disc is anti-aliased analytically; past a fifth of a dot per pixel the shader blends to the dots' mean (a mip of the buffer), so a pulled-back board never boils. Nothing carries over between frames.

## 3. Colour logic

- **One hue.** Amber (about 590 nm) on black. Brightness is the only variable, in a fixed ladder: water off; land a sparse 1-in-4 dot texture (≈ 0.06); coast ≈ 0.3; routes 0.07–0.15 rising with the traffic on them; vehicles 1; text 0.95.
- Water is dark: the absence of dots, which is why land has a texture.
- Never a second LED colour (no red for delay, no green for go), never a coloured fill, never a gradient legend. Emphasis is brightness, blinking, or a scan.
- The only light that is not amber: the faint cool reflection in the glass, and the dark wall.
- Example (the demo's, linear light): amber (1.0, 0.50, 0.085), core toward (1.0, 0.80, 0.50); unlit lens (0.0065, 0.0055, 0.005).

## 4. Type & subtitles

- **A bitmap font, one glyph pixel = one dot.** Fusion Pixel Font 12 px (OFL), proportional; larger only at integer multiples (2×, 3×).
- **Names as signed.** Route numbers and destinations come from the timetable, in the place's own script; the film's own words in the film's language. Bilingual boards alternate languages every two beats.
- **Rows, not boxes.** A header row (route, destination, clock), the map, a caption band of one line per language; dotted rules between. Map labels are short, with the dots under them switched off.
- Text arrives by rolling up a row (four frames) or by a column wipe, and leaves by being replaced; it never fades. Hold ≥ max(1.8 s, speech + 0.6 s), and the reading time `readcheck.mjs` asks for; text that changes every beat (the header, the clock) is not meant to be read in full.

## 5. Motion quality

- 24 fps. The board's content moves in whole dots (text rolls a row at a time); vehicles move sub-dot; the camera moves smoothly.
- **The clock is monotone and curved**: slow where a single vehicle must be followed, hours in a bar between; a monotone spline, never a jump.
- **Changes are scans and flips**: a new view sweeps down behind a scan line in half a second; a new header rolls up. No dissolve, no smooth zoom of the content.
- The whole board dims at night (auto-brightness).
- What never moves: the dot grid, the lenses, a static layer once drawn.

## 6. Camera grammar

The camera looks at the board: a target dot, a pitch in pixels, a yaw and a tilt.

| Move | What it expresses | Can serve |
|---|---|---|
| Locked fill frame (integer pitch, square on) | the board as the whole world; reading time | timetable sections; captions; a count |
| Push into the dots | "this one" | a single vehicle; one route number; a moment at night |
| Pull back to the object | scale; it was a sign all along | an opening after a close-up; an ending |
| Angled wide (yaw 12–18°) | the board in a room; time passing on a thing | a time-lapse; a break between sections |
| Re-scan (content, not camera) | a new scale, the same dots | city to district to one crossing |

- Fill frames are square on, at an integer pitch. While the camera crops the board, nothing that must be read is cropped. Transitions are scans, flips and camera moves; no dissolves.

## 7. Sound palette

- **Foley is the board and the bus.** Relays (a hard metallic double click) for every flip and wipe, a dense burst for a re-scan and the lamp test; the board's 100 Hz hum; diesel idles; a crowd of engines whose level follows the vehicles on the road; an original two-note door chime; one stop bell. Ambience: a low city hum.
- **Music is electric**: pulse waves through low-pass filters, FM bells, a bass with 2nd and 3rd harmonics, quiet pads; no piano, no string pad. Traffic density can open the filter as it brightens the board.
- **Silence** before the turn: the hum and one engine may stay; nothing struck. The first sound after it should be the bell or the chime.
- Mix: dry and close, a short room on the music only, −14 LUFS.

## 8. Native moves

- **Lamp test.** Every dot lights in one diagonal sweep, then the board starts. *Fits content like:* a system back after an outage; a title card; a chapter break.
- **Re-scan.** The map is redrawn at a new scale behind a scan line. *Fits content like:* city to neighbourhood; a network to one interchange; a before and after of a timetable change.
- **The flip.** The header rolls to the next departure on every beat; at the rush it cannot keep up. *Fits content like:* counting departures; a list of destinations; a route renumbering.
- **Traffic draws the hidden.** Nothing is drawn under water or underground; only vehicles light it. *Fits content like:* river crossings; a mountain tunnel; a ferry lane at dawn.
- **The swell.** Route brightness follows the vehicles on it. *Fits content like:* a weekday against a holiday; a strike; the first day of a new line.
- **The lone dot.** At night, one vehicle and its fading trail, in near silence. *Fits content like:* the last bus; an airport overnight route; a ferry in fog.

## 9. Pitfalls of the medium

- **Moiré** when the board is small in frame, **fog** when every dot blooms, **streaks** when time-lapse vehicles are drawn at full brightness: §2 has the fix for each.
- **Platform text.** Browser text rasterizes differently on each system; sample glyphs at 10× (§4).
- **Mush.** Roads, routes and land at similar levels read as noise: keep the ladder (§3), drop unused layers and small islands.
- **Over-precision.** A headway says "every 8 minutes", not "this bus": say "from published headways" where counts appear; never claim a real vehicle in real time.
- **Service days.** Late trips run past 24:00 and the next day's night routes start at 00:00: take both, or the night is wrongly empty.
- **Boundaries.** Don't fetch or draw them (DIRECTOR.md §13); keep the frame regional.

## 10. Engine

- [`neo/geo/gtfs.py`](../../neo/geo/gtfs.py), `routes.py`, `osm.py`: timetable, route paths, coast, in metres around one `--origin`.
- [`demo/tools/prep.py`](demo/tools/prep.py): which patterns to keep, each one's path (an OSM relation its stops fit, else a shortest drivable route between stops on the roads from [`demo/tools/roads.py`](demo/tools/roads.py)), compact encoding.
- [`demo/board.js`](demo/board.js): `makeBoard(NX, NY)` (`line`, `splat`, `blit`, `rect`), `textMask(s, family)`, `scaleMask(m, k)`, `makeGL(canvas, NX, NY)` → `draw(buffer, camera, {power, glass, wall})`, `camera(W, H, NX, NY, {u, v, pitchPx, yaw, tilt})`.
- [`demo/main.js`](demo/main.js): `layers(view)` (static dots per view), `active(T, f)` (every trip on the road at clock T), `sAt`/`along` (time → distance → point), `drawMap`, `drawHead`, `drawCaps`.

```js
// a tram stop display, nothing from the demo: a track, one tram, a big route number
B.clear(); B.line(20, 120, 300, 120, .12); B.splat(20 + 280 * ((t * .07) % 1), 120.5, 1);
B.blit(scaleMask(textMask('5'), 3), 12, 20, .95);
draw(B.buf, camera(W, H, NX, NY, { u: 160, v: 90, pitchPx: 6 }), { power: 1 });
```

## 11. Variation space

The agent decides: the city, operators and service day; which trips count; the board's size and layout; the views and scans; the shape of the clock; what the header shows; what the traffic reveals; the music within §7.

- **Three structures**: one route followed from first to last trip of the day; a weekday and a Sunday, one after the other on the same board; a countdown at one stop, with the map behind it filling as the buses approach.
- **Three openings**: a single route number rolling up on a dark board; the board seen across a dark room before the camera walks to it; the header alone, counting down to the first departure, before any map exists.
- **Three endings**: the last trip arrives and the board switches to "not in service"; the board goes dark row by row as the depot calls the buses in; the camera pulls back until the board is one lit rectangle in a city of them.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
