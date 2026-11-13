# Miniature — Style Prompt

*中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

A real place built as an architect's cut-away model on a thin display plinth and watched through a long lens: white bevelled parts, sparse accent colours, tiny people and vehicles running in loops, tiers that lift apart to show what is inside, and a day that turns to night until the windows light up. Our demo, *Futian, in Section*, is one example ([DEMO.md](DEMO.md)); the rules below are what make any film belong to this style.

Needs: the library's core tools (three.js r170 and its addons from the library's `node_modules`, numpy/scipy for the sound). For a real city behind the model, `neo/geo/buildings.py` (OpenStreetMap; Overture needs `duckdb`, [`neo/requirements-geo.txt`](../../neo/requirements-geo.txt)). No image or model files.

## 1. Essence, and what it is not

- **A model on a table.** The world ends at a thin plinth. Behind it there is only a flat background colour and the plinth's soft shadow; no sky, no horizon, no ground beyond the base.
- **Cut open to show the inside.** One or two cut faces (the front, and one side) expose the tiers. A cut face shows its matter: slab thickness, the earth between tiers in a sand colour with faint strata. The cut is straight and stays where it is.
- **A long lens.** Orthographic (or near-orthographic) views: parallel edges stay parallel, nothing converges, the model reads as small. Close-ups add a tilt-shift blur above and below a sharp band.
- **A white model with few accents.** Almost everything is white, ivory and pale grey; colour is reserved for what carries meaning (§3).
- **Life in loops.** People pace, vehicles arrive, stop and leave, tiers part and close; nothing is simulated, everything is a function of time.
- It is not an isometric infographic (no flat icons, no outlines), not pixel or voxel art (no pixelation, no dithering), not a toy (no glossy saturated plastic), not a photoreal city render (no photo facades, no sky), and not Folding City (no hinges, no poster flats, no coloured skies).

## 2. Materials & rendering

- **Physical materials, quiet reflections.** Matte stone and ivory (roughness about .75, a faint bump map for micro-surface), paint with a clear coat for vehicles, glass with transmission and low roughness, brushed metal for rails and handrails. A low-intensity room environment (PMREM) gives soft reflections; no visible HDRI.
- **Every part is bevelled.** Boxes are rounded boxes with a radius of at most .045 model units and never more than a sixth of the smallest side; heads are spheres; tree crowns are clusters of small spheres. No sharp CG edges, no low-poly facets, no pixel steps.
- **Contact shadows make it small.** One key light with a large soft shadow map; screen-space ambient occlusion (GTAO) at 2× resolution, limited to a box around the model; a shadow-only floor at the plinth's base. ACES tone mapping, exposure about 1.05, 2× supersampling with MSAA. No grain, no outlines.
- **Tilt-shift is a screen-space pass**, separable Gaussian, weighted by the distance from a horizontal focus band: about .3 on wide shots, 1 on close-ups.
- **Night is emissive.** Lamps, signs, vehicle windows and the context city's windows are registered materials whose emissive intensity follows the light state; each tier has warm point lights; a light bloom pass runs only at night.
- **Context from real data, as massing.** Buildings around the subject are real footprints and heights extruded as white blocks with a faint floor-band texture by day and lit windows (by batches) at night. No facade detail, no people or vehicles among them.

## 3. Colour logic

- **Neutral ground.** A warm light grey background, a white and ivory model. Values are ordered: the plinth is the darkest thing (a slate), cut faces are middle (sand earth, silver walls), the model is light.
- **Accents are rare and meaningful**, together well under a tenth of the frame: the published colours of transport lines (only on line markers and vehicle stripes, never on architecture), one colour per vehicle type, one colour for the place name (a red). Greenery is the only larger natural colour.
- **No operator logos or emblems.** Names, line numbers and line colours may appear; marks may not.
- **Night goes through blue.** Day → blue hour (a cool grey-blue) → deep blue-black; never through brown or grey. Warm interior light against cool moonlight.
- No pure black, no saturated background, no gradient background.

## 4. Type & subtitles

- **Museum labels, not captions.** Cards sit in a lower corner: ink on the background colour, a small accent square, the Chinese line in a heavy sans (600–700 weight, 30–80 px at 1080p), a small Latin line in spaced capitals or sentence case (15–18 px, tracking 3–5 px). A date or number can lead in a larger figure.
- **Leader lines** connect a column of tier names to anchor points on the model, through the one world → screen function, so they follow the model as it moves.
- **Lettering inside the model** (station names, platform boards, line squares) is part of the model: sign lettering at sign size. It is never used for sentences.
- Reading time: hold each card ≥ max(1.8 s, characters ÷ 4.5 + 1.5 s for Chinese, letters ÷ 15 + 1.5 s for Latin); every card is reported through `window.TEXTS`.
- No narration by default. With a voice, subtitles are one label strip, bottom centre, clear of the model's base.

## 5. Motion quality

- 24 fps on ones; camera, vehicles and people all move smoothly every frame.
- **Vehicles** brake at a constant rate to their stop and pull away at a constant rate (`x = stop + D·(1−u)²` in, `stop + D·u²` out). They enter and leave through the cut faces (clipping planes at the section's ends), never popping into view.
- **People** pace back and forth on sine paths; they turn through the camera-facing pose and their step swing follows their speed. A few stand still.
- **Tiers** lift on an ease-in-out of 2.5–3 s, the top one first and the next 0.2–0.3 s later, and settle with a small clack. Things that span two tiers (stairs, escalators) stretch with the gap.
- **Lights snap on** in about a tenth of a second; context windows follow in batches.
- Never moves: the plinth, the cut faces, the buildings. No bounce, no squash, no wobble.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Pull back from a detail to the whole plinth | scale: this is a model of a whole place | a reveal; a first look; a summary |
| Slow long-lens orbit (yaw) | the model as an object to walk around | time passing; a change of light; a calm hold |
| Crane down tier by tier | going deeper, one level at a time | a journey down; layers of a system; a process from top to bottom |
| Low pitch into the open gaps | inside the section | showing how layers relate; a cross-reference |
| Lateral drift along a platform | following life at one level | an arrival; a waiting room; a production line |
| Locked hold on the whole model | the model as a finished thing | a card to read; a comparison; an ending |

- Wide shots show the plinth's whole silhouette with a margin; close-ups keep the floor line in frame (pitch 10–15°) and one subject at a time. The camera never goes below the plinth top.
- The label column and cards stay clear of the model; move the model in frame (the camera target), not the text.
- One continuous take is the default; a cut is allowed only between two holds. No cross-fades.

## 7. Sound palette

- **Small tuned instruments**: kalimba, music box, marimba, glass bell, harp, over a soft synthesized pad; pentatonic or plain major and minor modes. Light ticks instead of a drum kit.
- **Foley from real sources at model level**: engines, rails (joint clicks that slow down with the vehicle), brake hiss, small electric motors for moving tiers, a wooden clack when they settle, a relay click and lamp hum when lights come on, paper for label cards, a soft breath of air for camera moves. Arrival chimes are generic intervals, never an operator's real chime.
- **Ambience per tier**: street air and birds above, a low hall hum underground, crickets and a distant city at night.
- **Silence as a tool**: near-silence (only a trace of air) before a tier opens and before the lights come on; the first sound after it is the event itself.
- Music under the foley; the mix is mastered with `neo/audio/master.py` to −14 LUFS.

## 8. Native moves

- **The lift.** The tiers part like a layered cake, each with its own slice of the cut earth, and close again. *Fits content like:* the floors of a hospital; the decks of a ship; the levels of a mine; a data centre's raised floor.
- **Through the cut.** A vehicle or a crowd enters from one cut face and leaves through the other. *Fits content like:* a tunnel boring machine; barges on a canal lock; a conveyor in a factory; a parade under a bridge.
- **Tier by tier.** The camera cranes down through the open gaps and holds on each level with a card. *Fits content like:* a lift ride in a tower; a deep-water pier; a museum's storeys; a water-treatment plant.
- **Lights on.** Day passes through blue hour to night; the interior lights snap on and the real city behind lights up in batches. *Fits content like:* a neighbourhood's evening; a launch night; a stadium before a match; a night market opening.
- **The real context.** The subject stands in front of the real buildings around it, as white massing. *Fits content like:* a new campus among its neighbours; a planned tower in its skyline; a school in its district.

## 9. Pitfalls of the medium

- **Too full.** Every tier crowded with people and props turns into noise. Fix: a handful of people per tier, empty stretches between groups, one vehicle per lane.
- **Pixelation creeping back.** Dithering, pixel filters or low-poly facets make it a game. Fix: bevels, smooth shading, 2× supersampling.
- **Toy look.** Saturated plastic, big bevels, high gloss. Fix: bevels ≤ .045, roughness ≥ .6 on most surfaces, accents rare.
- **Two scales fighting.** The section is at figure scale (a person is about 1.2 units tall, a tier about 4); real context massing at its true scale is far larger. Fix: keep them apart with a street, draw the context as plain white massing with no people, trees or vehicles mixed in, and keep one scale inside each.
- **Ambient occlusion artefacts in orthographic views.** GTAO writes dirty patches over the empty background. Fix: a scene clip box around the model.
- **Things that cross a moving tier.** Stairs and escalators tear when tiers part. Fix: scale them with the gap, or keep them inside one tier.
- **Night bloom halos.** Bloom on in daylight blurs the white model. Fix: bloom only at night, high threshold.
- **Muddy dusk.** Blending light grey to night blue through warm tones turns brown. Fix: go through a cool blue-grey.

## 10. Engine

- `demo/kit.js`: the parts. `mat(color, roughness, metalness)` (physical materials with stone and wood micro-surface), `glow(...)` (materials that light up at night, collected in `NIGHT`), `box` (cached rounded boxes), `label` (sign lettering on a canvas texture), `tree`, `bench`, `railings`, `stairs`, `escalators`, `person` + `walk(w, t)`, `metroTrain`, `hsrTrain`, `cityBus`, `clipX` (clip a vehicle at the cut faces), `earthMat`.
- `demo/model.js`: `buildCity(parent, data)` extrudes a `neo/geo/buildings.py` file into white massing (six window batches); `createModel(data)` builds the three tiers, the earth slices and the plinth, and merges static parts per material.
- `demo/main.js`: the renderer and the post chain (GTAO with a clip box, night bloom, the tilt-shift shader `TILT`), `setCamera(t)` (orthographic orbit from target, yaw, pitch, half-height), `drive(v, t)` (constant braking and acceleration), `setScene(t)` (tiers, vehicles, people, light), the cards and leader lines (`drawCards`, `drawLayers`), and the sound events (`window.EV`).
- `demo/timeline.js` holds every time; `demo/mix.py` reads the events.

A minimal start for something that is not in the demo, a two-deck ferry pier:

```js
import { seg, eio } from '/core/lib.js';
import { box, person, walk } from './kit.js';
const deck = (y) => { const g = new THREE.Group(); g.position.y = y; scene.add(g); box(g, 20, .24, 8, 0, -.12, 0, '#d9d9cc'); return g; };
const lower = deck(0), upper = deck(4);
const crowd = [0, 1, 2, 3].map(i => person(upper, -6 + i * 3, 1.5, '#4e8198'));
window.render = t => { upper.position.y = 4 + 2 * eio(seg(t, 3, 6)); crowd.forEach(w => walk(w, t)); composer.render(); };
```

## 11. Variation space

Free to change: the place and the cut (which faces, how many tiers, what each holds), the plinth's shape and colour, the accent colours within §3, the context's extent, the camera path, the cards' content and language, day only or night only, the instruments within §7.

- **Three structures:** a single descent from roof to basement; a day in the life of one tier, from first train to last; a before/after where the cut model is rebuilt piece by piece.
- **Three openings:** a top-down plan that tilts up into the model; a single person walking out of the cut face; the plinth empty, then the tiers stacking onto it.
- **Three endings:** the tiers close and the model is covered by its glass case; the camera rises to show this model is one of many on a long table; the lights go out tier by tier, leaving only the station's name lit.

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
