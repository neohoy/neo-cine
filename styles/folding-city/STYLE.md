# Folding City — Style Prompt

*中文版：[STYLE.zh-CN.md](STYLE.zh-CN.md)*

A city drawn as flat poster art that turns out to be a real three-dimensional model. The picture keeps switching between a flat elevation and deep perspective, rows of buildings swing like doors and screens, and whole districts stand up as walls and become the next ground. Our demo, *Shenzhen, Folded*, is one example ([DEMO.md](DEMO.md)); the rules below are what make any city film belong to this style.

Needs: the library's core tools only (three.js r170 from the library's `node_modules`, numpy/scipy for the sound). No extra packages, no image or model assets.

## 1. Essence, and what it is not

- **The poster is a model.** Every flat frame is an orthographic view of a real scene. The surprise of the style is the moment a poster opens into depth, or depth is pressed back into a poster. If a flat frame is a painted image and the 3D is a second scene, it is not this style.
- **Folding is literal.** Things fold on hinges: a row of towers swings 90° like a door, a skyline creases into a zigzag screen, a district plate stands up as a wall. Nothing morphs, melts, dissolves or cross-fades.
- **One continuous take.** The camera never cuts. Position, direction and lens strength all travel together from one held composition to the next.
- It is not a photoreal city fly-through, not an isometric infographic with a fixed angle, not a paper pop-up book (no paper texture, no tabs, no page), and not a map.

## 2. Materials & rendering

- **Flat colour, a few hard steps.** Toon shading with a stepped gradient (four levels, nearest-neighbour): a lit face is the base colour, a shaded face and a cast shadow are the base colour multiplied by the ambient tint. No gradients inside a face, no outlines, no texture noise, no specular, no ambient occlusion.
- **Colours come out as written.** Colour management off, linear output: a hex in the code is the hex on screen.
- **One sun, one sharp shadow map** (directional light, large map, fitted around what the camera sees so edges stay crisp at every scale). Light = ambient tint + (1 − ambient tint) for the sun, so a fully lit face is exactly the base colour.
- **Facades are drawn textures, not geometry.** A small set of canvas-drawn window patterns (grid, horizontal bands, vertical ribs, full glass, lattice) with UVs measured in window cells, so every building has whole windows whatever its size. A few lit-window or diagonal highlight cells per facade.
- **Geometry is simple and chunky**: boxes, cylinders, lathed profiles, extruded shapes. Landmarks are recognisable by silhouette and two or three signature details, not by detail count.
- **Street furniture sells the scale**: trees, palms, lamps, cars and buses, zebra crossings, lane dashes. All in the same flat colours.
- Anti-aliased edges (render at 2× and let the browser downsample, plus MSAA). No film grain.

## 3. Colour logic

- **One saturated sky colour per district, filling the whole background.** No gradient sky, no horizon haze. The sky colour is the district's identity and changes only while the camera moves from one plate to the next.
- **Shadows are tinted, never grey.** Each district's ambient tint leans violet or blue, so shaded faces and shadows read as a coloured second tone of the same poster.
- **Buildings are mostly white and pale tints**, with glass in two or three strong hues per district; ground, road, lawn and water are flat fields of one colour each. Accents (cars, awnings, flags) pick up the other districts' sky colours.
- **The ending has its own colour** (a deep night blue in our demo), reached by a fast switch while the picture is in motion, never by a slow blend through muddy in-between colours.

## 4. Type & subtitles

- **A fold-out label, not a caption.** Each district gets one label in a lower corner made of solid panels (number | name and transliteration | landmarks) that unfold one after another like a leaflet and fold away in reverse. Heavy sans-serif, two colours only: a dark ink and white.
- **The end title is large and plain**: the film's name in the heaviest weight, a short accent rule, one line of small spaced capitals.
- Type is drawn on a 2D overlay above the 3D picture and never tilts, extrudes or sits in the scene. All of it is reported through `window.TEXTS` for the reading-time check.
- No narration by default. If a film needs subtitles, they are flat panels in the label's two colours, bottom centre, clear of the label.

## 5. Motion quality

- **Hold, then snap.** A composition is held with a slow linear drift (a second or so), then the camera travels to the next one in well under a second with a strong ease-in-out. Holds and moves both land on the beat grid.
- **Folds overshoot slightly and settle** (a small back ease) when something heavy stands up; doors and screens use a plain ease-in-out.
- **Everything is a function of time.** Traffic, trains, boats, clouds and waves run on closed-form loops; nothing accumulates frame to frame, and no random numbers are drawn at render time.
- Small life in every held frame: something should still be moving when the camera is not.

## 6. Camera grammar

- **A camera state is a look-at point, yaw, pitch, the frame height at the target, and a lens strength.** Lens strength near zero is an orthographic elevation; larger values are wide-angle perspective. Between two states the camera interpolates the inverse of its distance, so a flat poster opens into depth like a dolly-zoom while the subject keeps its size.
- **The five views**, used in alternation:
  1. *Poster*: head-on elevation, orthographic.
  2. *Street*: low and close, wide lens, looking down a street to a landmark.
  3. *Oblique*: raised three-quarter view, moderate lens.
  4. *Axonometric*: high, orthographic, turned: the view in which hinge folds are shown.
  5. *Canyon*: steep upward look between or beside towers, widest lens, a few degrees of roll.
- **Never two flat views or two deep views in a row.** The style lives on the alternation: flat → deep → flat.
- **Plan view happens only on a wall.** A district is seen from straight above only when its plate is standing upright in front of the camera, so that "plan" and "elevation" become the same picture.
- **The plate change is always the same three beats**: pull back wide while the next plate slides in flat and docks; the next plate stands up as a wall facing the camera; the camera rotates onto it and it becomes the ground while the previous plate drops out of frame.

## 7. Sound palette

- **Everything is synthesized**: plucked-synth arpeggios, a round bass, soft pads, a small drum kit, a bell line. Bright, major, mid-tempo (our demo: 120 BPM), built in bars that match the district lengths, one layer thicker per district.
- **Every move has a sound, from the same timeline**: a swept whoosh for each camera move, a click for landing on a flat view and a soft thump for landing on a deep one, a ratchet with a low rumble while doors and screens turn, a slide and a clack when a plate docks, a rising noise and one heavy impact when a plate stands up.
- **Silence before the big fold.** The drums drop out and the bus is pulled almost to nothing for a fraction of a second before each plate stands up; the impact is the loudest thing in the film.
- A quiet ambience per district (street, wind, sea…) under the music.

## 8. Native moves

- **Poster opens**: an orthographic elevation becomes a wide-angle street in under a second, the foreground row sliding apart by parallax alone.
- **Door fold**: two rows of towers standing in one line swing 90° on hinges at the centre and become the two sides of a canyon.
- **Screen fold**: one skyline, cut into panels, creases into a zigzag like a folding screen and opens flat again.
- **Plate stands up**: the next district, lying flat beyond the current one, rotates up on the shared edge into a wall; the camera turns onto it.
- **Closing fold**: all plates in one strip, then folded into a U (floor, wall, ceiling) for the end title.

A film in this style uses the poster-opens move in every district, at least one hinge fold, every plate change as a stand-up, and one closing fold.

## 9. Pitfalls of the medium

- **A folded-up plate hides the next one.** A previous plate standing between camera and subject blocks the frontal view. Plates must be able to disappear individually, and they switch on or off only at moments they are outside the frame.
- **Foreground filler kills the poster.** In an orthographic elevation everything between camera and subject stacks up in front of it. Keep the strip in front of a poster subject low: lawn, trees, a road.
- **Hinged rows and filler must not overlap.** Anything that swings needs its swept area kept empty.
- **Depth precision.** Near-orthographic views put the camera very far away; use a logarithmic depth buffer and move the near and far planes with the camera distance.
- **Shadow acne and soft edges** at large scales: fit the shadow camera to the visible area in steps, with a small normal bias.
- **Sky blends go muddy.** Interpolating two saturated sky colours passes through brown or grey: change sky while the frame is full of buildings and moving, and keep the blend short.
- **Headless WebGL can drop its context** on some machines mid-render; the library's renderer retries, but the page must rebuild nothing from previous frames.

## 10. Engine

- three.js r170, one scene, one perspective camera used for every view (orthographic views are a very long lens far away). Toon material with a custom gradient map; canvas-drawn facade textures; a 2D canvas overlay for type.
- **A building kit**: materials, facade textures, box / cylinder / lathe geometry with window-cell UVs, a parametric building with roof types, trees, palms, vehicles, lamps, road markings, a block filler that scatters low buildings on a grid from a seed.
- **Plates on a hinge chain**: each district is built in its own local coordinates on a plate of fixed size; an invisible chain of hinge frames gives each plate its world matrix (slide distance, fold angle), and every camera state is written in the coordinates of the plate it belongs to.
- **One timeline file** holds the section times, the camera states with their arrival times and eases, the scalar tracks (folds, slides, sky, light) and the per-plate visibility. The page derives the sound events from it (`window.EV`), and the mix script reads those.
- The page contract: `window.render(t)`, `window.DUR`, `window.READY`, `window.EV`, `window.TEXTS`.

## 11. Variation space

Free to change, the film stays in the style:

- the city, the districts and landmarks, the number of plates (two to four) and their order;
- every colour, within §3's logic; day or night;
- the label's layout and language; the title;
- which hinge folds are used and on what (bridges, piers, a stadium's stands, a wall of screens);
- tempo and instrumentation of the synthesized score; an outside music track cut to the same beat grid;
- frame size: 16:9, or vertical with the same camera grammar (the poster views then frame single landmarks).

Changes that turn it into another style: outlines or textures on the buildings; cuts or cross-fades; a camera that keeps one angle; type inside the 3D scene; photographic material.
