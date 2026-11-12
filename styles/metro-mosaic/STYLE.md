# Metro Mosaic — Style Prompt

> A city's real transit network laid as a glazed ceramic mosaic on a station wall: white tiles are the ground, blue tiles the sea, every line a chain of tiles in its published colour along its true path, stations as round tiles, names on enamel plaques screwed to the wall. A real camera stands in front of the wall; the network grows by being laid, tile by tile.
> References (grammar only): hand-set mosaics and tiled name panels of early metro stations; *opus vermiculatum* (a line of tesserae following a curve through a gridded ground); vitreous-enamel signs; macro films where a moving light reveals a material. Never copy a station's panel, a sign layout, operator lettering or line bullets, and never name one in the film.

Needs: the core tools; `neo/geo/routes.py` (lines, stops) and `neo/geo/osm.py` (coast), which call the Overpass API on the first run. Map data © OpenStreetMap contributors, ODbL 1.0: tell the user the terms first, credit it on the last plaque and in `CREDITS`, follow DIRECTOR.md §13. Opening dates, lengths and counts come from the operator or the city (`FACTS.md`), never from OpenStreetMap.

## 1. Essence, and what it is not

- **The geography is true, the medium is tile.** Real paths, real coast, one tessera per grid cell (about 200 m of city for a metropolitan network). Someone who knows the city finds their line; anyone else sees a ceramic wall.
- **It is a physical wall** in a station: tiles with thickness, bevels, grout, glaze that reflects the lights, hand-set tilts; plain white subway tiles around the mosaic.
- **Growth is laying.** Tiles are pressed in one after another, in the order the line was built. Nothing fades in or is stroked.
- **Names live on the wall**: enamel plaques with screws, and at the largest scale lettering set in tesserae.
- Not a schematic (no octilinear angles, no printed paper), not flat pixel art (camera, light and depth are felt), not a 3D city, not an operator's map (no logos, line bullets or house lettering).

## 2. Materials & rendering

- **three.js, physically based, every frame from `t`.** One unit = one tile pitch; grout is the plane `z = 0`; tiles are instanced meshes.
- **Ground tessera**: a bevelled square, 0.9 of the pitch, a quarter of it thick, normals rolled across the bevel. Seeded jitter in position, rotation, tilt (a few degrees), size and thickness; colour from a small family (off-whites with a rare cream or grey; a few blues for the sea).
- **Line tessera**: a little thicker, set **along the path** at one pitch and turned to its tangent, not on the grid. The ground tiles under it are lifted out first; grout shows around it. A later line in a shared corridor is set one pitch aside.
- **Station tile**: round, white face, dark rim; an interchange is larger. Pressed on after the line reaches it; replaced by the larger one when a second line arrives.
- **Glaze**: clear-coated, low roughness, reflecting a built station environment (dark walls, very bright ceiling tubes), so each tilted tile catches its own segment of the tubes, more at grazing angles. Key from above, soft fill, and an animated **raking light**: a band along the wall from the side that lights one side of every bevel.
- **Grout**: a mid-grey mortar with grain, darker in the crevices (ambient occlusion).
- **Camera**: a perspective lens (about 30° vertical); depth of field scaled with distance (shallow in macro, sharp on the whole wall).
- **Plaques**: enamel on steel, domed edge, deep blue ground, off-white letters, an inset rule, four chrome screws; text in the texture at ≥ 64 px per tile.
- Nothing in screen space but the vignette and depth of field.

## 3. Colour logic

- **White ground, blue sea**, lighter blue lakes; nothing else covers large areas. No long thin rivers (alone they read as borders).
- **Line colours are the published ones**, each tile varied by a few percent in lightness. Colour belongs to lines only; stations are white and black.
- **Plaques are deep blue with off-white letters**, apart from every line colour; the frame is a dark tile border with a thin gold line.
- No gradients, no glow; light comes from the lights.
- Example palette (the demo's): ground `#f5f4f0`, sea `#1d4f8f`–`#2a63a6`, reservoirs `#6c9ecf`, grout `#a39d91`, plaque `#1c3260`, border `#20262c`, gold `#c8a24a`.

## 4. Type & subtitles

- **Enamel plaques** carry every name, date and figure: Chinese in Source Han Sans (OFL), English in Barlow Semi Condensed (OFL), centred, Chinese above English. Kinds: station, dated station, figures (a large year, then the figure in both languages), title, and the mural's label (credits).
- **Mosaic lettering** for the one name that must read from across the station, in a band above the map: one tile per glyph pixel, glyphs ≥ 20 tiles high.
- Plaques are physical: they are hung (arrive, settle, are screwed), and a newer plaque is hung over an older one instead of its text changing. While read, Chinese is ≥ 26 px and English ≥ 20 px high at 1080p.
- Default: no narration or subtitles; when needed, they go on a plaque, not a screen bar. Hold ≥ max(1.8 s, speech + 0.6 s) and what `readcheck.mjs` asks.

## 5. Motion quality

- 24 fps, no stepping; camera and light smooth, tiles discrete events.
- **A tile lands** from in front of and beside the line, turning flat, and presses into the mortar with a small overshoot (about 0.3 s), just after the ground tile is lifted out.
- **Speed is density**: early tiles one by one, later many per second on many lines, each still seen landing.
- What never moves: a laid tile, a hung plaque, the grout. A finished part of the wall stays finished.

## 6. Camera grammar

A camera state: a point on the wall, a frame height in tiles (interpolated in its logarithm), yaw, pitch and depth-of-field strength.

| Move | What it expresses | Can serve |
|---|---|---|
| Oblique macro along the wall, shallow focus | material; "this is real ceramic" | an opening; the first tile; the last tile |
| Lateral track following the laying front | making; a route | one line built end to end; a journey |
| Push from city to district | "here, in particular" | a station that matters; a new line |
| Pull back to the whole wall | scale; it was one object all along | a reveal; a total; the end of a chronology |
| Locked frame while plaques are hung | attention, reading time | a date; a figure; a name |

- Three scales to visit: the tile (frame 8–30 tiles high), the district (50–120), the whole wall. Yaw only in close shots.
- Transitions are camera moves and the laying itself. No cuts, no dissolves.

## 7. Sound palette

- **Ceramic and glass instruments**: FM glass bells, short porcelain tines, a sine bass with 2nd and 3rd harmonics, a thin glass-harmonica sustain. No piano, no string pad.
- **One pentatonic mode**. Accelerate by subdividing (no pulse, eighths, sixteenths), not by changing tempo.
- **Foley is the wall**: each tile a ceramic click into mortar, quieter per tile when many land (a rush is ceramic rain); a station tile a thicker clack; a plaque struck steel and two screw turns; a trowel.
- **Ambience is the station**: air handling and room tone always; a passing train (rumble, wind, wheel clicks) is the style's one big sound, and it can move the light.
- **Silence**: before the tile that matters, everything stops but the room tone.
- Mix: dry foley, a long dark station reverb on the bells, −14 LUFS.

## 8. Native moves

- **Laying the line.** Ground tiles lift, coloured tiles land along the true path. *Fits content like:* a line opening; a pipeline; a river's course; a marathon route.
- **Tile by date.** Stretches laid in the order they opened, one hand speed for all. *Fits content like:* a network's history; a city's expansion; building phases.
- **The station tile swap.** A small station tile replaced by a larger one when a second line arrives. *Fits content like:* an interchange; a town becoming a hub; a merger.
- **Plaque over plaque.** A new enamel plaque is hung over the old one. *Fits content like:* a counter of years; a record broken; a renamed place.
- **The light passes.** A raking light or a train sweeps the wall and every glaze answers. *Fits content like:* a reveal; an arrival; the end.
- **The last tile.** Silence, one tile, one bell. *Fits content like:* the newest station; a missing link closed; a memorial.

## 9. Pitfalls of the medium

- **Plastic, not ceramic.** Uniform tiles under flat light look like a game: jitter every tile, give the glaze something bright to reflect, move a light.
- **A boundary by accident.** A long river drawn alone reads as a border: draw coast and lakes only (DIRECTOR.md §13).
- **Lines collide** in shared corridors: lay the earlier first, set the later a pitch aside, check the centre enlarged.
- **Plaques cover the network**: place each where the *finished* wall is empty.
- **Moiré** near the pixel pitch: supersample, keep tiles irregular, don't linger at that scale.
- **Text too small**: decide where each plaque is read and size it for that framing.
- **Ceramic rain clips**: scale each click by the local density.

## 10. Engine

- [`neo/geo/routes.py`](../../neo/geo/routes.py) and [`neo/geo/osm.py`](../../neo/geo/osm.py) (same `--origin`): lines, stops, coast.
- [`demo/tools/prep.py`](demo/tools/prep.py): grid cells (land, sea, reservoir), line tesserae along each path with phase and order, station positions, from a table of dated phases.
- [`demo/mosaic.js`](demo/mosaic.js): `tileGeo(hx, hy, depth, bevel)`, `discGeo()`, `glaze()` and `rakePatch(mat)` (the raking light band, `RAKE_U`), `plaque(w, h, draw)` and `line(...)` for enamel plaques, `rasterText(parts, cols, rows)` for mosaic lettering.
- [`demo/main.js`](demo/main.js): the station environment (`stationEnv`), the laying schedule (`FIRST`, `ACTS`, `timeAt`), `layTile`, `layDisc`, `hangPlaque`, the camera (`camAt`), `window.TEXTS` from the plaques, `window.EV`.

```js
// nothing from the demo: one red line of 12 tiles on a curve
const m = new THREE.InstancedMesh(tileGeo(.43, .43, .32, .07), glaze(), 12);
for (let k = 0; k < 12; k++) { o.position.set(k, 2 * Math.sin(k / 3), 0); o.rotation.z = .6 * Math.cos(k / 3); o.updateMatrix(); m.setMatrixAt(k, o.matrix); m.setColorAt(k, new THREE.Color('#d63a2f')); }
```

## 11. Variation space

The agent decides: the network and extent, the tile pitch, the lines and years, the plaques, the scales and route, the palette within §3.

- **Three structures**: one line laid end to end, a plaque at each station; today's wall with the planned lines laid over it in a paler glaze; one interchange at the centre, its lines arriving one by one.
- **Three openings**: a setter's chalk grid on bare mortar; a plaque hung on an empty white wall; the finished wall, then tiles prised out back to the start.
- **Three endings**: the station lights go out and one line's glaze still catches a torch; the camera stays on one interchange tile as the wall fills around it; the wall is left unfinished, a gap of bare grout where a line is still being built.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
