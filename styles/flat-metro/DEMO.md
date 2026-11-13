# Flat Metro — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Half Past One* (凌晨一点半, 57 s) · `flat-metro.mp4` · source in [`demo/`](demo/)

An unofficial fan film about a real metro, not made with or endorsed by its operator, with no operator logo, map design or line bullet: line colours and station names are public facts. The timetable is Wiener Linien's GTFS feed (data.gv.at, CC BY 4.0) for 19–21 November 2026; the lines, water and green are OpenStreetMap data (© OpenStreetMap contributors, ODbL 1.0). Every fact on screen is in [`demo/FACTS.md`](demo/FACTS.md).

## Story & structure

The same map at the same minute on two nights: on Thursday at half past one Vienna's U-Bahn is asleep; on Friday at half past one it is still running.

- **Set-up (0–9 s).** On a night ground with the Danube as a flat field, U1 is pulled out of its real track from Oberlaa, the camera close on the hand; it snaps into 45° steps behind it and crosses the Danube. U6, U4, U2 and U3 follow, faster, while the camera pulls back to the whole network. Title: 凌晨一点半 / Half Past One.
- **Turn (9–27.75 s).** Thursday 23:20 → 01:00 at about 8 minutes a second: trains glide and brake into stops; between 00:47 and 01:00 each line's last train reaches its terminus and the line recedes into the ground. At 01:30 nothing runs; the clock almost stops (caption: all lines stopped). Then the ground sweeps through a whole day at 45°, following Vienna's real sun, and the clock lands on Friday night.
- **Ending (27.75–57 s).** Friday 00:13 → 01:30: past one the lines stay lit and the trains keep coming. The camera pushes into the inner city and the clock slows almost to real time: 21 trains running at 01:30. The verdict: weekend nights, every 15 minutes, all night. The camera pulls back while the clock runs to Saturday morning; the ground turns to day, the day timetable returns, and the last card sits beside the full network.

Native moves spent: the pull (opening), lines that rest (Thursday), the ground is the clock (the day passing, the dawn), the count (Friday 01:30), the push to a stop (the inner city).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–3.3 | U1 pulled from Oberlaa across the Danube | follows the tip, zoom 2.5 → 2.2 | the pull; the real track shown as a fine dotted guide ahead of the hand |
| 2 | 3.3–7.5 | U6, U4, U2, U3 pulled | lets go of the tip, pulls back to the whole network | station holes pop as each stretch settles |
| 3 | 7.5–19.5 | Thursday 23:20 → 01:28 | whole network, locked | title 8.25–13.5; last trains 17.1–18.0 s, each line rests |
| 4 | 19.5–24 | Thursday 01:30 | locked | first comparison, held 4.5 s; near silence |
| 5 | 24–27.75 | a day passes | locked | the 45° ground sweep, night → day → night |
| 6 | 27.75–36 | Friday 00:13 → 01:05 | locked, then a slow push | "past one, the trains keep coming" |
| 7 | 36–39 | into the inner city | push to 2.75× around Stephansplatz | the ground panel rises behind the text column |
| 8 | 39–43.5 | Friday 01:29–01:31 | 2.85×, almost locked | second comparison, held 4.5 s; trains brake into Schwedenplatz, Karlsplatz, Praterstern |
| 9 | 43.5–51 | 01:31 → 07:30 | pull back to the whole network | verdict 43.5–49.5; trains fade while the clock runs fast; dawn |
| 10 | 51–57 | Saturday 07:30 | whole network, locked | end card in the text column |

## Score structure

80 BPM (a bar is 3 s), F Lydian, original; vibraphone, felt marimba, sine bass, breath pad, brushes.

- **0–8 s**: each line's pull is a zip and one vibraphone note (U1 C5, U6 E5, U4 G5, U2 A5, U3 C6); every station hole a felt tick in that line's pitch, interchanges lower, a soft snap when a line settles.
- **8.25 s**: the title: low F, an Fmaj7 spread.
- **9–18.2 s**: vibraphone arpeggio in eighths over F–G–Am–C, bass on the bar; the arpeggio has as many voices as there are lit lines, so it thins as each last train arrives (two falling notes per line at 17.1–18.0 s).
- **20.2–24 s**: near silence: city air only, while "all lines stopped" is read.
- **24 s**: the day passes: a rising vibraphone run over three octaves and a long zip; **27.75 s** the Friday chord.
- **29.25–38.25 s**: the arpeggio returns with all five voices and brushes; **36 s** a breath pad where Thursday thinned out.
- **39–43.5 s**: the music drops out; only the felt taps of trains braking into stops, louder in the close-up.
- **43.5 s**: the verdict, the heaviest chord (F–C–E–A–B–E, low F, a soft thump).
- **46.5–51 s**: the beat divides into sixteenths as the morning service comes back; **51 s** the last chord, the pad holds to the end.
- Levels printed by `mix.py` (RMS): score about −20.0 dB, reverb −27.8, foley −34.9, air −37.8; `neo/audio/master.py` brings the mix to −14 LUFS with one gain (soft clip on 2 % of windows by more than 1 dB). Eight cues checked against the picture by `neo/audio/cues.py`, all 0 ms; 483 sounds driven by picture events; `mux.sh` measured −13.8 LUFS, LRA 9.1 LU, peak −1.7 dBFS.

## Palette & props

The palette in STYLE.md §3 is this film's; the ground follows Vienna's sun in late November. Line colours from the GTFS: U1 `#E3000F`, U2 `#A862A4`, U3 `#EF7C00`, U4 `#319F49`, U6 `#9D6830`. 99 stations, 105 legs; two legs drawn with one bend; stations moved 270 m on average from their true place (at most about 1 km, Heiligenstadt). 931 trips of three service days are kept (the windows the film shows). Map view: 16.16–16.60° E, 48.09–48.33° N, north up, no boundary lines; streams under 60 m wide left out.

## End card

The text column beside the full network at Saturday 07:32: 凌晨一点半 / Half Past One; "Vienna U-Bahn, scheduled times 19–21 Nov 2026; train positions estimated"; the timetable credit (Wiener Linien GTFS, data.gv.at, CC BY 4.0); the map credit (© OpenStreetMap contributors, ODbL 1.0); "unofficial fan film, not affiliated with the operator"; NEO-Cine · 极简地铁 Flat Metro.

## Build notes

| File | What it draws or does |
|---|---|
| `demo/index.html` | fonts and the canvas |
| `demo/timeline.js` | the one source of time: `CLOCK`, `CAM`, `DRAW`, `FOLLOW`, `PASS`, `CAPS`, `END`, `SECS` |
| `demo/flat.js` | the recipes: ground and sun, derived colours, line, station hole, interchange pin, train block, clock digits |
| `demo/main.js` | data → lines, stations, trips; the pull; camera; trains; labels; text column; end card; sound events; `window.render` |
| `demo/mix.py` | score, foley, air, cue check and master |
| `demo/tools/prep.py` | OSM + GTFS → `data/net.json` (octilinear layout, fields, trips, service spans) |
| `demo/tools/fonts.sh` | fetches the fonts |
| `demo/build.sh` | every step in order |

- Build: `sh styles/flat-metro/demo/build.sh vNNN` (fonts → data if `net.json` is missing: OSM through Overpass, the GTFS zip (about 100 MB) into `data/gtfs.cache/`, three service days through `neo/geo/gtfs.py`, `prep.py` → events → mix with cue and level checks → picture at 24 fps → a check for crashed (white) frames → mux at −14 LUFS, BT.709, no grain → reading-time check → poster at 55 s, style frame at 41 s). `RENDER=remote` renders the picture on the desktop through `neo/render/remote.sh` (4 workers). Each build is a new version; nothing is overwritten.
- Render time: on the desktop (RTX 4060 Ti, 4 workers), 1,368 frames in 27 s, 50 s with the encode there; the remote step about 57 s with the transfer; the whole build about 1.5 minutes (mix about 3 s, mux about 17 s, reading-time check about 3 s).
- Review: a frame every 2.5 s; 0.2 s steps through the pull (0–4 s) and around the push (36–40 s); the Danube crossings enlarged.
- Pitfalls of this film:
  - The GTFS gives one time per stop: a 20 s stand is modelled before each published time, and the last card says positions are estimated.
  - The Saturday service day holds Friday night's trains (from 00:10): Friday night is drawn from two service days.
  - Train counts from the windowed trips were wrong in the daytime pass; the lines' "running" state now comes from service spans over all trips of the three days.
  - Map labels first appeared at the opening close-up (zoom above 2): the inner-city set now waits until every line has settled.
  - A first remote still came back white (a crashed browser tab, which `neo/render/frames.mjs` does not detect): `build.sh` now stops on any all-white stretch.

## content.json fields (scene styles only)

Not a scene style.
