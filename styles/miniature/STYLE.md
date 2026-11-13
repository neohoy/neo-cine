# Miniature — Style Prompt

*中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

> A place built as a white architectural model, cut open on a thin display plinth and watched through a long lens: tiny people and vehicles run in loops, a roof or a floor lifts away to show the inside, and a calm explainer layer (numbered badges, leader-line labels, a growing dotted route) walks the viewer through how the place works, one step at a time.
> References (grammar only): architects' cut-away and section models; model railways and their figures; tilt-shift photography (the sharp band); museum labels and exploded diagrams in technical books (one numbered thing at a time). Copy none of their places, typefaces, colours or music, and never name them in a film.

Needs: the library's core tools (three.js r170 and its addons from the library's `node_modules`; numpy, scipy and numba for the sound). For a real place, `neo/geo/buildings.py` (OpenStreetMap; Overture needs `duckdb`, [`neo/requirements-geo.txt`](../../neo/requirements-geo.txt)). No image or model files: the kit in `demo/kit/` builds everything from code.

## 1. Essence, and what it is not

- **A model on a table.** The world ends at a thin plinth. Behind it there is only a flat background colour and the plinth's soft shadow: no sky, no horizon, no ground beyond the base.
- **Cut open to show the inside.** At least one face is a section: it shows slab thickness and the earth under the ground in a sand colour with faint strata. Roofs, canopies and upper facades lift off as one piece so the camera can look in.
- **A long lens.** Orthographic (or near-orthographic, about 9°) views: parallel edges stay parallel, nothing converges, the model reads as small. Close-ups add a tilt-shift band.
- **Model scale is legible.** A storey is about six units; a person is about 1.75, three-tenths of a storey. People, benches, gates and stairs are at one scale, so a viewer can count steps and seats.
- **A white model with few accents.** Almost everything is white, ivory and pale grey; colour is reserved for what carries meaning (§3).
- **It explains.** One thing at a time, each with a number; the route a person takes grows as a dotted line before they walk it.
- It is not an isometric infographic (no flat icons, no outlines, no isometric projection tricks), not pixel or voxel art, not a toy (no glossy saturated plastic, no big bevels), not a photoreal render (no photo textures, no sky), and not a CAD walkthrough (no first-person camera, no wireframes).

## 2. Materials & rendering

- **Every part is bevelled.** Boxes are the kit's own bevelled boxes (radius ≤ 0.06 units and ≤ a sixth of the smallest side); tree crowns are clusters of spheres; heads are spheres. No sharp CG edges, no faceting.
- **Quiet physical materials.** Stone and white model: roughness .72–.8, no metalness. Vehicle paint: roughness about .35 with a clear coat. Metal for rails and handrails: roughness .35, metalness .8. A low room environment (PMREM) gives soft reflections; no visible HDRI.
- **Glass without transmission.** Glass is a tinted, low-roughness, semi-transparent surface (opacity .16–.3, no depth write) that takes its sparkle from the environment map. Physical transmission is not used: on Windows (ANGLE, Direct3D 11) it makes shader compilation take minutes.
- **Contact shadows make it small.** One sun with a large soft shadow map; screen-space ambient occlusion (GTAO) limited to a box around the model and skipping transparent things; ACES tone mapping; 2× supersampling with MSAA. No grain, no outlines.
- **Tilt-shift is a screen-space pass**: two separable Gaussian passes whose radius grows with the distance from a horizontal sharp band. Wide shots barely blur (about 3 px at the edges); close-ups blur up to about 7 px.
- **Night is emissive.** Lamps, ceiling strips, screens, train windows and glass facades are registered as glow batches whose emissive intensity follows the light state; bloom runs only at night.
- **The section's earth** is one material that draws strata from world height (bands, thin boundary lines, a little grain), so any cut through it reads as ground.

## 3. Colour logic

- **Neutral ground.** A warm light-grey background; a white, ivory and pale-grey model. Values are ordered: the plinth is the darkest thing (a slate), the cut earth is the middle (sand), the model is light.
- **Proportions (by screen area):** model whites and greys 80–85 %; plinth and earth 8–12 %; greenery 4–6 %; accents 5 % or less, and at most three accent hues in one frame.
- **Accents mean something.** One accent for the explainer (the route and the badges: a gold), one for a second flow if there is one (a teal), the hero's clothing (a coral), and the published colours of real transport lines only on line markers. Everything else (clothes, cars, signs) is muted.
- **No operator logos, liveries or lettering.** Signs are colour blocks and pictograms.
- **Night goes through blue.** Day → blue hour (a cool grey-blue) → deep blue-black; never through brown. Warm interior light against a cool night.
- No pure black, no saturated or gradient background.

## 4. Type & subtitles

- **Labels, not captions.** Every text is bilingual, two lines: Chinese on top (Noto Sans SC, 700, 26–40 px at 1080p), English below (Inter, 500, 15–20 px, letter-spaced, capitals on badges). Both OFL.
- **Step badge**: top left, a gold disc with the step number and the step's name in both languages. One badge on screen at a time.
- **Leader-line labels**: a dot on the model (white ring, gold centre), a thin ink line that bends once, and a paper-coloured plate at the side of the frame. The anchor is a world point projected every frame, so the label follows the model as the camera moves; the line draws first, then the text fades in.
- **Title and end cards**: lower left, the Chinese title large (about 76 px), a short gold rule, the English line in spaced capitals.
- Reading time: every text is reported through `window.TEXTS`; each stays fully visible for at least max(1.5 s, Chinese characters ÷ 4.5 + other characters ÷ 15 + 1.5 s). Labels that share a step may overlap in time; steps never do.
- No narration by default. With a voice, subtitles are one label strip at the bottom centre, clear of the plinth.

## 5. Motion quality

- 24 fps on ones; everything is a pure function of time.
- **People** walk at about 1.9 units/s (a little brisk, so they read as walking at model scale), with a leg and arm swing tied to distance; they stop, turn, sit, queue, ride escalators standing still and take stairs in shorter steps. A few stand still. Nobody fidgets.
- **Vehicles** brake at a constant rate to their stop and pull away at a constant rate (`x = stop − D(1−u)²` in, `stop + D·u²` out), at constant speed before and after. They enter and leave through the cut faces (clipping planes), never popping into view.
- **Machines** move like machines: gate flaps retract and return, escalator steps travel at a constant speed, doors slide.
- **Lifts** (roof, floors) rise on an ease-in-out of about 2.5 s and settle with a small clack; a roof can lift a little first (visible in the wide shot), then out of frame for the close-ups, and come down in one move at the end.
- **Lights snap on** in about a tenth of a second, batch by batch.
- **The route** grows ahead of the walker on each step (about 1.5 s), then the walker follows it.
- Never moves: the plinth, the cut faces, the buildings. No bounce, squash, wobble or idle pulsing.

## 6. Camera grammar

A shot is `{target, yaw, pitch, size}` (size is half the frame height in units). Moves are keyframes between shots with an ease-in-out; size interpolates logarithmically so pushes feel even.

| Move | What it expresses | Can serve |
|---|---|---|
| Wide hold on the whole plinth | the place as one object | an opening; a summary; the change of light |
| Push in to one station of the process | "this is the step" | a check-in desk; a machine; a ward |
| Lateral pan along a line of things | following a flow | a queue; a production line; a corridor |
| Orbit (yaw) around the model | the same place from the other side | going behind a wall; switching from inbound to outbound |
| Low pitch into a cut face | inside the section | an underpass; a basement; a pipe gallery |
| Crane down level by level | going deeper | a mine; a metro station; floors of a tower |
| Pull back to the wide | done explaining | a recap with the route still drawn |

- Close-ups use size 7–10 for a person-scale scene (a person is then about 6–9 % of the frame height); wide shots show the whole plinth with a margin. The camera never goes below the plinth top.
- Pitch 30–45° looks into opened rooms; 15–20° looks into a vertical cut face.
- One continuous take is the default; cut only between two holds. No cross-fades.
- Labels move with the model; frame the model so that labels have room at the sides.

## 7. Sound palette

- **Small tuned instruments**: kalimba, music box, marimba, glass bell, harp, over a soft synthesized pad; pentatonic or plain major modes. One chord per step; a short rising motif when a step begins; a quiet marimba ostinato underneath.
- **Foley at model level**, all driven by picture events: engines and tyres, rail rumble with joint clicks that slow with the train, brake hiss, generic two-note door chimes (never an operator's real chime), gate beeps and flaps, conveyor and escalator motors, small motors and a wooden clack when a roof lifts or lands, paper for each label, a relay click for each batch of lights.
- **Ambience per zone**: outside air and birds, a low murmur in halls, open air on platforms, a hum underground, crickets at night.
- **Silence as a tool**: near-silence for half a second before the lights come on; the relay click is the first sound after it.
- Music under the foley; the mix is mastered with `neo/audio/master.py` to −14 LUFS and checked against the picture with `neo/audio/cues.py`.

## 8. Native moves

- **Lift the lid.** The roof, the canopies and the upper facade lift off together; at the end they come back down. *Fits content like:* a hospital ward; a school's classrooms; a data centre; a theatre backstage.
- **Follow one person.** A coloured figure walks the whole process while the gold route grows a step ahead. *Fits content like:* a patient from admission to discharge; a parcel through a sorting centre; a visitor through a museum; a voter through a polling station.
- **Two flows, two colours.** Inbound in gold, outbound in teal, crossing at different levels. *Fits content like:* arrivals and departures at an airport; clean and dirty routes in a kitchen; deliveries and shoppers in a mall.
- **Through the cut.** A vehicle or a crowd enters from one cut face and leaves through another. *Fits content like:* a tunnel boring machine; barges in a lock; a conveyor; a parade under a bridge.
- **Into the section.** The camera drops to a cut face and looks into what is underground. *Fits content like:* a metro concourse; a car park; utility tunnels; foundations.
- **Lights on.** Day goes through blue hour to night; lights snap on batch by batch. *Fits content like:* the end of a shift; a night market opening; a stadium before a match.
- **The real context.** The subject stands among the real buildings around it, as white massing from `neo/geo/buildings.py`. *Fits content like:* a new campus among its neighbours; a planned tower in its skyline; a school in its district.

## 9. Pitfalls of the medium

- **Too full.** Every room crowded turns into noise. Fix: a third to a half of the seats taken, empty stretches between groups, one vehicle per lane.
- **Pixelation creeping back.** Dithering, pixel filters or low-poly facets make it a game. Fix: bevels, smooth shading, 2× supersampling.
- **Toy look.** Saturated plastic, big bevels, gloss. Fix: bevel radius ≤ .06, roughness ≥ .6 on most surfaces, accents rare.
- **Two scales fighting.** Figures at model scale next to real massing at map scale. Fix: keep them apart with a street; real context is plain white massing with no figures, trees or vehicles mixed in.
- **Slow transparent glass.** Transmission takes minutes to compile on Windows. Fix: semi-transparent glass with environment reflections (§2).
- **Dirty AO in orthographic views.** GTAO paints patches on the empty background and black lines along glass edges. Fix: a clip box around the model, and transparent meshes hidden during the AO pass (the kit does both).
- **The roof in the shot.** A lifted roof hangs over close-ups in an orthographic view. Fix: lift a little for the wide shot, then far out of frame for close-ups.
- **Walls that hide the action.** A full-height front wall blocks the inside. Fix: cut the near facade low (about half a storey) and lift the rest with the roof; or orbit to the open side.
- **Bloom in daylight.** It blurs the white model. Fix: bloom only at night, high threshold.
- **Muddy dusk.** Blending light grey to night blue through warm tones turns brown. Fix: go through a cool blue-grey.
- **Labels that are too short.** Two labels in one step, each needing three seconds, do not fit in five. Fix: let them overlap, or lengthen the step; check with `readcheck.mjs`.
- **Pretending to be real.** An invented interior drawn over a real place's name misleads. Fix: say on the page and in `CREDITS` which parts are real data and which are a diagram (§10).

## 10. Engine

The kit is `demo/kit/`: plain ES modules, three.js from the library's `/node_modules` through an import map (see `demo/index.html`). `import { … } from './kit/index.js'` gives you everything.

| Module | What it holds |
|---|---|
| `core.js` | seeded random `rng(seed)` (`range`, `int`, `pick`, `fork`), easings, `seg`, `env`, `Path` (polyline with `length`, `at(d)`, `heading`), `keyframes`, `stopAndGo` (constant braking in, constant acceleration out), `resolveTime('@hero.sit+1.2', marks)` |
| `geom.js` | `bevelBox(w,h,d,r)` (our own rounded box: grid on each face, vertices projected onto an inner box plus radius), `sphere`, `cylinder` (cached), `Batch` (collects static parts and merges them per material), `subtractBoxes` (box minus voids, for tunnels and openings) |
| `materials.js` | `PALETTE`, `CLOTHES`, the colour proportions; `mat`, `paint`, `metal`, `glass`; `earthMat` (strata by world height); `Glow` (batches of emissive materials with switch-on times) |
| `base.js` | `plinth` (with an empty nameplate), `soil` (earth block with voids), `slab` (with holes), `wall` (with openings), `glassWall` (panes, mullions, transoms), `clipPlane` (cut along x or z) |
| `parts.js` | `column`, `beam`, `railing`, `stairs` (returns the walking path), `escalator` (moving steps; returns path and speed), `slidingDoor`, `gates` (a row of gates with retracting flaps, opened by the people who pass), `bench` (returns its seats), `bin`, `sign` (pictograms only), `canopy`, `tree`, `shrub`, `lamp`, `mast`, `board` (a screen of colour rows), `scanner`, `frameDetector` |
| `people.js` | `Crowd` (all figures in a dozen instanced meshes), `makeLook`, plans (`walk`, `wait`, `until`, `sit`, `ride`, `climb`, `bagOff`/`bagOn`, `hide`, `mark`), generators `seated`, `stream`, `offsetPath` |
| `vehicles.js` | `train` (head car, cars, sliding doors, window glow), `schedule` (arrive, doors, depart; `doorAt(k)`), `bus`, `car` (`kind: 'taxi'`), `traffic` (a looping lane) |
| `light.js` | `PRESETS` day / blue / night, `LightRig` (`stateAt(keys, t)`, `apply`) |
| `post.js` | `Post`: MSAA → GTAO (clip box, no glass) → tilt-shift (band centre, half-width, softness, radius, angle) → night bloom → output |
| `camera.js` | `CameraRig` (`'ortho'` or `'tele'`), `S(target, yaw°, pitch°, size)`, `shots(keys)`, helpers `orbit`, `pan`, `descend`, `pushIn` |
| `explain.js` | `Overlay` (`badge`, `callout`, `layer`, `card`, `line`, `texts()` for `window.TEXTS`), `RouteDots` (the growing dotted route) |
| `context.js` | `context(parent, data, {scale, rot, offset, keep, glow})`: real footprints and heights from `neo/geo/buildings.py` as white massing |
| `scene.js` | `buildMiniature(spec, {renderer})` → `world` with `update(t, night)`, `marks`, `refs`, `crowd`, `routes`, `glow`, `lightKeys` |

**The scene description.** A new miniature is mostly one data file (the demo's is `demo/station.js`). Units are about metres; y is up; the ground top is `board.top`. Any time may be a number or a mark: `'@hero.sit+1.2'` (a person's plan mark), `'@A.open'` (a vehicle's `arrive`, `stop`, `open`, `close`, `depart`, `gone`) or a name in `marks`.

```js
export default {
  seed: 1, storey: 6, marks: { lift: 2, lights: 30 },
  board: { x: [-20, 20], z: [-14, 14], top: 0, soil: 5, voids: [{ x: [8, 20], y: [-4, -.6], z: [-10, 2] }] },
  groups: { roof: { lift: { dy: 30, keys: [['@lift', 0], ['@lift+2.5', 1]] } } },       // parts with group: 'roof' lift together
  glow: { hall: { color: '#ffe0b0', on: '@lights' } },                                  // night batches
  build: [                                                                              // { type, …parameters of that kit function }
    { type: 'slab', x: [-12, 12], z: [-6, 6], y: .15, t: .15 },
    { type: 'wall', a: [-12, -6], b: [12, -6], y: [0, 6], openings: [{ at: 12, w: 2 }] },
    { type: 'box', group: 'roof', box: { x: [-12, 12], y: [6, 6.5], z: [-6, 6] } },
    { type: 'bench', id: 'seats', at: [-4, .15, 2], rot: Math.PI, seats: 4, repeat: { n: 3, d: [3, 0, 0] } },
    { type: 'gates', id: 'gates', x0: -3, z: -3, y: .15, n: 4 },
    { type: 'tree', at: [-16, 0, 10], seed: 3 },
  ],
  vehicles: [{ id: 'bus', type: 'bus', lane: { x: 0, z: 11, dir: 1 }, arrive: [3, 6], depart: [12, 15] }],
  people: [{ id: 'hero', look: { shirt: '#d4705a', bag: 'backpack' }, at: [0, .15, 10], start: '@bus.stop+.5', plan: [
    { walk: [[0, .15, 4]], mark: 'in' }, { sit: 3, seat: ['seats.1', 2] }, { gate: ['gates', 1, -1], mark: 'gate' }, { walk: [[0, .15, -9]] }] }],
  crowds: [{ kind: 'seated', seats: 'seats', fill: .4, seed: 2 }, { kind: 'stream', path: [[-21, .15, 8], [21, .15, 8]], n: 5, every: 6 }],
  routes: [{ id: 'hero', person: 'hero', grow: [['@hero.in-1', 0], ['@hero.in+.5', '@hero.gate']] }],
  light: [[0, 'day'], [26, 'day'], [28, 'blue'], ['@lights', 'night']],
};
```

The film page builds it and adds its own camera and explainer:

```js
const world = buildMiniature(SPEC, { renderer }); scene.add(world.root);
const rig = new CameraRig({ kind: 'ortho' }), lights = new LightRig(scene, renderer, { board: SPEC.board });
const post = new Post(renderer, scene, rig.camera, { clipBox }), O = new Overlay(canvas);
const cam = shots([[0, S([0, 0, 0], 25, 33, 20)], [4, S([0, 1, 4], 18, 40, 7)]]);
window.render = t => { rig.set(cam(t)); const st = lights.stateAt(world.lightKeys, t); lights.apply(st); world.update(t, st.night);
  post.set({ tilt: { center: .5, half: .12, soft: .22, maxR: 6 }, bloom: .7 * st.night }); post.render();
  O.begin(); O.badge('s1', 1, '候车', 'Waiting', { a: 1 }); O.callout('seats', rig.project([-4, 1, 2], 1920, 1080), [1300, 400], '座位', 'Seats'); };
window.TEXTS = () => O.texts();
```

`demo/main.js` shows the whole pattern: steps with times taken from plan marks, camera keys built from each step's shots, `window.EV` built from the steps, gates, vehicles and lights for `mix.py`, and `?textonly=1` for the reading-time check.

**Adding a part.** Write a function in `parts.js` (or your own module) that takes `(batch, params)` for static geometry — `batch.add(bevelBox(…), mat(…), x, y, z, ry)` — or `(parent, params)` and returns `{ group, update(t) }` for something that moves; then add one line to the `BUILD` table in `scene.js` so the description can name it. Use `bevelBox` for every block, `mat`/`paint`/`metal`/`glass` for materials, a `Glow` batch for anything that lights up, and return paths or anchor points (as `stairs`, `escalator`, `bench`, `gates` do) so people can use it.

**Real places.** Fetch the surroundings with `neo/geo/buildings.py --bbox … --origin …` and draw them with `context()`: white massing, no figures among them, separated from the subject by a street. Sections and interiors of a real building are almost always a diagram: say so at the top of `DEMO.md` and in `CREDITS`, and source every fact on screen in `FACTS.md`. For a fictional typical place (as in the demo), give it no name and no operator marks.

## 11. Variation space

Free to change: the place (hospital, airport, metro station, mall, school, factory, port), the cut (which faces, which levels, what lifts), the plinth's shape, the accent colours within §3, how many people and flows, the camera path, the number of steps, day only or night only, the instruments within §7.

- **Three structures:** a single descent from roof to basement, one level per step; two parallel flows told in alternation (arrivals, departures) until they cross; a before/after in which the model is rebuilt piece by piece onto the plinth.
- **Three openings:** a top-down plan that tilts up into the model; one figure stepping out of a cut face; an empty plinth on which the levels stack up.
- **Three endings:** the lid comes down and the model sits under a glass case; the camera rises to show the model is one of many on a long table; the lights go out room by room until only the route stays lit.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
