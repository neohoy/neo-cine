# Miniature — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *How a High-Speed Station Works* 《一座高铁站怎么运转》 (69 s) · `miniature.mp4` · source in [`demo/`](demo/) · 中文版：[DEMO.zh-CN.md](DEMO.zh-CN.md)

**The station is illustrative: a fictional, typical Chinese high-speed rail station with no name.** It is not any real station; it shows no operator's logo, livery, lettering or signage (signs are colour blocks and pictograms), and its layout (a station building beside the tracks, an overpass in, an underpass out, one island platform) is a diagram with compressed distances. Trains, cars and people run on invented timings. The film prints no numbers; the procedures it names (real-name ID check, security check, ticket gates) are sourced from Ministry of Transport regulations in [`demo/FACTS.md`](demo/FACTS.md). The kit, the model, the film and the sound were all written for this library from scratch.

## Story & structure

Logline: a station opens like a box on a table, and one passenger with a suitcase shows how it works, from the taxi to the train, in seven numbered steps; the other side walks out underground; the lid closes and the lights come on.

- **The model (0–6.4 s).** The whole plinth, slowly turning; title card. The roof, the canopies and the upper facade lift a little.
- **① Drop-off (6.4–11.5 s).** Push in to the curb as the lid lifts out of frame. A taxi brakes to a stop; the passenger (coral jacket, white suitcase) takes the case and walks to the doors. The gold route grows to the ID gates. Label: drop-off curb.
- **② ID check · security (11.5–18.6 s).** A gate opens after a pause; the suitcase rides through the X-ray scanner while the passenger walks through the frame and picks it up. Labels: ID gates, X-ray scanner.
- **③ Waiting hall (18.6–25.7 s).** Into the hall, a seat in the first row. The first row of the departure board turns amber; the passenger stands up. Labels: waiting area, departure board.
- **④ Ticket gates (25.7–31.2 s).** Three others go through first; the passenger follows to the escalator. Behind the wall, train B pulls in on track 2. Label: ticket gates.
- **⑤ Overpass · down to the platform (31.2–48.0 s).** Up the escalator; the camera orbits behind the station as the passenger crosses the overpass over track 1 and walks down the stairs while the train on track 2 leaves and train A arrives. Labels: escalator, overpass, platform.
- **⑥ Board · departure (48.0–54.5 s).** Doors open, the people waiting at the doors board, then the passenger; doors close, the train pulls out through the right cut face. Label: train doors.
- **⑦ Exit · underpass (54.5–60.1 s).** The camera swings round to the right cut face: the passengers from the other train walk through the underground passage, up the stairs and through the exit gates; a teal route grows along their way. Label: exit underpass.
- **Night (60.1–69.4 s).** Pull back to the wide; the lid comes down in one move; blue hour, half a second of near-silence, then the lights come on in six batches; end card.

Native moves spent: lift the lid (3.2 s, out of frame at 6.4 s, down at 60.1 s), follow one person (whole film), two flows in two colours (gold in, teal out), through the cut (trains, cars, people on the plaza), into the section (⑦), lights on (63.1 s).

## Shots

One continuous orthographic take. Film time in seconds; size = half the frame height in model units (a person is 1.75).

| # | Time | Shot | Camera | Note |
|---|---|---|---|---|
| 1 | 0–6.4 | wide, whole plinth | yaw 22° → 30°, pitch 31° → 35°, size 24.5 → 23.5 | title card 0.3–6.6; lid lifts 3.2–5.8 |
| 2 | 6.4–11.5 | drop-off curb | yaw 16°, pitch 34°, size 8.4 | taxi stops 7.6 |
| 3 | 11.5–18.6 | entrance hall | yaw 14°, pitch 44°, size 7.4 | gate 11.8, belt 14.9 |
| 4 | 18.6–25.7 | waiting hall | yaw 18°, pitch 40°, size 7.8 | sits 22.3 |
| 5 | 25.7–31.2 | ticket gates | yaw 22°, pitch 38°, size 7.2 | |
| 6 | 31.2–35.4 | escalator | yaw 26°, pitch 30°, size 8.4 | |
| 7 | 35.4–41.7 | orbit behind, overpass | yaw → 130°, pitch 34°, size 10.4 | train B leaves 40.0 |
| 8 | 41.7–48.0 | stairs to the platform | yaw 152°, pitch 36°, size 8.6 | train A in 42.2–47.4 |
| 9 | 48.0–54.5 | platform, train doors | yaw 162° → 148°, size 9.4 → 13 | doors 48.0–51.6, out 52.3 |
| 10 | 54.5–60.1 | right cut face | yaw 72°, pitch 17°, size 9.4 | the underpass |
| 11 | 60.1–69.4 | wide | yaw 28° → 23°, size 24.5 | lid down 60.1–63.1, lights 63.1, end card 63.4 |

## Score structure

90 BPM, D major pentatonic, all synthesized (`demo/mix.py`).

- 0–6.4: music box alone over a Dmaj9 pad, one note every two beats; air and birds outside; a glass-bell chord when the lid has lifted.
- Each step: the pad changes chord (D, Bm7, Gmaj7, Asus, D/F♯ → G → A, Bm7, Gmaj7), the kalimba plays three rising chord tones, a quiet marimba ostinato in eighths fills the step. Hall murmur from step ② to ⑤, open air on the platform, a hum underground in ⑦.
- Foley from the events: taxi engine and door, gate beeps and flaps, the scanner belt, the escalator hum, rail rumble with joint clicks that slow down, brake hiss, generic two-note door chimes, a paper sound and a glass note for every label, soft air for camera moves.
- 60.1: only the pad (Gmaj7); motors and a thump as the lid lands; crickets after dusk; near-silence 0.6 s before the lights; 63.1: relay click, a glass note per batch, a harp D major 9 arpeggio; music box at the end card; a 1.4 s fade.

## Palette & props

Background #e9e7e0 by day, #93a2bb at blue hour, #18222f at night. Model whites #f1efe8, #e8e4d8, #d2d0c6; plinth slate #4d5b5f; earth #cdbd9c with strata. Accents: route gold #d9a52e, exit route teal #3e9693, the passenger's coral #d4705a, the trains' blue stripe #3f6f93, gate lamps (teal for ID, amber for tickets, green for exit), exit signs green #3d6b55. Props (all from the kit): plinth 68 × 46 with 6 units of earth; station building 62 × 12, walls 9 high; ID gates (5 lanes), two X-ray scanners and walk-through frames, 27 benches of 4 seats in the hall, a departure board of colour rows, ticket gates (4), an escalator, a mezzanine and an overpass, an island platform with canopies, two tracks, two 6-car trains, a taxi, a bus, looping traffic, about 100 people.

## End card

Lower left over the night model: 一座高铁站怎么运转 / HOW A HIGH-SPEED STATION WORKS; NEO-Cine lower right. The illustrative-station note and the sources are in `demo/CREDITS`, `demo/FACTS.md` and at the top of this file, not on screen.

## Build notes

- `sh styles/miniature/demo/build.sh v003` (local, 3 workers) or `RENDER=remote sh styles/miniature/demo/build.sh v003` (the render desktop, 4 workers). Each version is new: `miniature-vNNN.mp4` and `poster-vNNN.jpg`; an existing version number is refused. `miniature.mp4`, `poster.jpg` and `demo/stills/styleframe.jpg` are copied only when missing; the new style frame is also saved as `demo/out/stills/styleframe-vNNN.jpg`.
- Code entry points: `demo/station.js` (the scene description: board, voids, lifting group, glow batches, ~150 parts, vehicles, the passenger's plan, crowds, routes, light), `demo/main.js` (the seven steps with their shots and labels, camera keys, `window.EV`, the page contract), `demo/kit/` (the kit, STYLE.md §10), `demo/mix.py` (the sound).
- Timings follow the passenger: each step starts and ends on marks of the plan (`'@hero.idgate'`, `'@hero.sit'` …), so moving a part or changing a walking speed moves the steps with it. Train and taxi times are numbers in `station.js`; keep train A's doors open before the passenger reaches them (`board` waits for the doors anyway). `marks.close` must equal the end of step ⑦ (`main.js` warns when it doesn't).
- Review: `node core/render/still.mjs styles/miniature/demo --range 0:69:3 --out <dir>`, then `core/render/sheet.py`; `node core/render/readcheck.mjs styles/miniature/demo --q 'textonly=1'` (`textonly` builds the timeline and the text boxes without WebGL).
- Poster at 67 s (night, lights on, the title on screen); style frame and gallery frame at 58 s (step ⑦: the underpass in section, the label, gold and teal flows).
- Pitfalls of this model: the near facade is cut at 3.2 and its upper part lifts with the roof, or it hides the halls; the platform canopy is split around the overpass stairs; the underpass, its stair shafts and the platform opening are voids cut from the earth and holes in the slabs, and they have to line up.
