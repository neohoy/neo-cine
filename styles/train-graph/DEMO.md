# Train Graph — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Two Lines, One Day* (两条线，一天, 56 s) · `train-graph.mp4` · source in [`demo/`](demo/)

An unofficial fan film about real trains. The timetable is the gtfs.de "fv_free" feed of German long-distance trains (data DELFI e.V., CC BY 4.0) for the service day Wednesday 18 November 2026; the track and rivers are OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0). No operator logo appears; line names, station names and times are public facts. Every fact on screen is in [`demo/FACTS.md`](demo/FACTS.md).

## Story & structure

Between Köln and Frankfurt there are two railways: the left-bank Rhine valley line (221 km by Bonn, Koblenz and Mainz) and the high-speed line opened in 2002 (180 km). One day of long-distance trains on both, drawn on one sheet, shows two different slopes.

- **Set-up (0–15 s).** The two lines are inked on the ground as a map (two pens leave Köln and reach Frankfurt together), then cut open at Frankfurt and unbent into the distance axis: the Rhine line up, the high-speed line down, Köln in the middle. The rule slides in at 03:00 and the morning is ruled at an hour per bar.
- **Turn (15–26 s).** At 08:53 IC 55 leaves Köln up the Rhine valley; at 08:54 ICE 43 leaves down the high-speed line; both are bound for Mannheim. Tracing film dims every other train. At 09:49 ICE 43 is at Frankfurt Airport, and the clock stops: IC 55 is only just leaving Koblenz.
- **Ending (26–56 s).** The clock runs on, an hour per bar, then an hour per two beats, while the camera pulls out to the whole day: a dense steep hatch below, sparse shallow strokes above. The rule leaves the sheet at midnight and the title block is filled in.

Native moves spent: the straightening (opening), the fork and tracing film (the race), the held clock (verdict), the hatch with rings at the hourly :18 departures (the day), an overtake at Limburg Süd (evening), the title block (end).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–2.6 | the two lines on the ground | locked | two pens ink the map from Köln; rivers come with them |
| 2 | 2.6–4.4 | map to axis | the line unbends into the left column | the straightening; the margin, legend and station names land |
| 3 | 4.2–13.5 | night and morning, 03:00–08:45 | 5-hour window travelling with the rule | the clock runs 2 h/s, then an hour per bar; title note ahead of the rule |
| 4 | 13.5–15.5 | brake to 08:53 | push to a 2.8-hour window | tracing film slides over the morning (14.2–15.2) |
| 5 | 15.5–23 | the race | slow travel, an hour per four bars | the fork; minute figures and train names on the two lines |
| 6 | 23–26 | verdict | locked, clock held at 09:49 | two notes with leaders to the two pens |
| 7 | 26–36 | the day, 10:00–14:00 | widening to 10 hours | tracing film lifts; 2002 / 300 km/h note; rings at every :18/:19 departure |
| 8 | 36–46 | evening to midnight | pull out to the whole day | Limburg Süd overtake circled at 39.2 s |
| 9 | 46–56 | the finished sheet | locked | the rule lifts away; title block and footnote |

## Score structure

120 BPM, D Dorian, original. One beat is half a second; every accent sits on a beat.

- **0–4.6 s**: a reed drone on D and A while the map is inked; a music-box fifth when the map is cut (2.6 s).
- **4.2 s**: the rule lands; clock ticks and a pizzicato bass from 5.0 s (roots D D C G D D A C, one per bar).
- **Throughout**: every train's first stroke is a note. High-speed line: music box on D F G A C over two octaves; Rhine valley: harp, an octave and a half lower; the pitch is the departure minute (minute × slots ÷ 60), so the hourly :18 departures repeat one note every bar.
- **15.5 s**: the race starts on the horn (A4 + E5, synthesized) and a harp chord; bass in eighths; rail joints every 10 km of each train (ICE 43 panned right, IC 55 left; the ICE's come twice as often).
- **22.45–23.0 s** near silence; **23.0 s** the heaviest hit (thump, low D, harp chord, music-box fifth); ticks stop until 26.
- **26 s** the day groove; **36 s** the beat divides (ticks on eighths, bass on every beat); **46 s** the last chord, ticks stop; a distant horn at 48.5 s answers the race's horn.
- Levels printed by `mix.py`: score −26.5 dB, reverb −38.5, foley −31.1, ambience −29.0 (RMS); `neo/audio/master.py` brings the mix to −14 LUFS with one gain (soft clip on 1 % of windows over 3 dB). Five cues checked against the picture by `neo/audio/cues.py`, all 0 ms; 412 sounds driven by picture events.

## Palette & props

The palette in STYLE.md §3 is this film's. ICE in red, IC in black (the feed holds only these two classes on the two lines that day). 179 train paths: 140 on the high-speed line, 39 in the Rhine valley; a path is one trip's run along one line, so ICE 45 (Köln–Limburg Süd–Wiesbaden–Mainz–Frankfurt) is drawn on both. The Köln/Bonn airport loop is folded onto the high-speed axis at its projected kilometre; Frankfurt Airport and Frankfurt Hbf appear on both halves, because the two lines share that last stretch.

Map view: the two lines and the rivers within 9 km of them, 6.85–8.75° E, 49.95–50.98° N, north up, no boundary lines.

## End card

The whole sheet; below it, left, the pencil footnote "只画长途列车，没有区域列车和货车 / Long-distance trains only: no regional or freight trains"; right, the title block: title and service date, the counts, and the credits "时刻表 gtfs.de（DELFI e.V.）CC BY 4.0 · 线路 © OpenStreetMap contributors ODbL · 非官方影片". No signature.

## Build notes

| File | What it draws or does |
|---|---|
| `demo/index.html` | fonts and the canvas |
| `demo/timeline.js` | the one source of time: `CLOCK` (film s → time of day), `CAM`, `GYB`, `STRIP`, `OVERLAY`, `RACE`, `NOTES`, `TITLEBLOCK`, `SECS` |
| `demo/draft.js` | the recipes: film, ink line, wet ink, nib, parallel rule, pencil note, leader, ring, title block |
| `demo/main.js` | data → train paths, the straightening, strip map, labels, grid, scales, trains and tracing film, notes, title block, sound events, `window.render` |
| `demo/mix.py` | score, foley, ambience, cue check and master |
| `demo/tools/prep.py` | GTFS (via `neo/geo/gtfs.py`) + OSM rail and rivers → `demo/data/graph.json` (142 kB) |
| `demo/tools/fonts.sh` | fetches the fonts |
| `demo/build.sh` | every step in order |

- Build: `sh styles/train-graph/demo/build.sh vNNN` with the next free number (fonts → data if `graph.json` is missing: download the feed into `data/gtfs.cache/`, run `prep.py` → events → mix with cue and level checks → picture at 24 fps → mux at −14 LUFS, BT.709, no grain → reading-time check → poster at 55 s and style frame at 24.6 s). `RENDER=remote` renders the picture on the desktop through `neo/render/remote.sh` (3 workers). Each build is a new version; nothing is overwritten.
- Render time: desktop (RTX 4060 Ti, 3 workers) 1,344 frames in about 50 s, about 95 s with transfer and encode; the whole build about 3 minutes; the mix about 10 s.
- `build.sh` deletes `out/video.mp4` before rendering and stops if it is not written again: when `neo/render/remote.sh` loses the connection while copying the film back, it does not fail, and the previous picture would be muxed into the new version.
- Review: a frame every 2 s, then 0.2 s steps through the straightening (2.4–4.6 s) and around the verdict (22.4–24 s).
- Pitfalls of this film:
  - The shortest path from Koblenz to Bingen first ran over the right bank (a via point on the wrong side of the Rhine): 159 km instead of 61. Via points are now at Boppard, St. Goar and Oberwesel, and the measured Köln–Mainz (184 km) is checked against Wikipedia's 181–185 km.
  - OSM maps each track separately and the crossovers are service tracks: parallel tracks were not connected and the path search failed. `prep.py` links nodes closer than 30 m.
  - `neo/geo/gtfs.py` keeps one time per stop (the departure); the dwell steps of the graph need arrivals too, so `prep.py` reads `stop_times.txt` again and checks that it finds the same 407 trips.
  - A first straightening interpolated positions from map to axis and tangled the two lines; it now unbends each line like a wire (headings and segment lengths interpolated from Köln outward).
  - With every train drawn the race was lost in the hatch: the tracing film came from that.

## content.json fields (scene styles only)

Not a scene style.
