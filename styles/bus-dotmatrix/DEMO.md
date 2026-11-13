# Bus Dot Matrix — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *A Day Under the Harbour* (海底下的一天, 52.5 s) · `bus-dotmatrix.mp4` · source in [`demo/`](demo/)

An unofficial fan film about real places and real public timetables. The timetable is the Transport Department's GTFS feed on DATA.GOV.HK; the paths and the coast are OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0). No operator's logo, livery, sign layout or chime is used; route numbers, destinations and stop names are public facts. Most trips are published as headways, so the dots are where the published timetable puts a bus, not real vehicles: the film says "from published headways" where counts appear. Every fact on screen is in [`demo/FACTS.md`](demo/FACTS.md).

## Story & structure

An amber board plays one real Wednesday of the buses that cross Hong Kong's harbour; nothing is drawn under the water, and the morning rush lights the three tunnels by itself.

- **Set-up (0–12.5 s).** Lamp test; the header rolls up "N182 中環(港澳碼頭)" in close-up, and a single dot crosses the harbour under it as the camera pulls back to the whole board. The map re-scans to all of Hong Kong; the clock runs from 05:00 to 07:00 and the departures multiply.
- **Turn (12.5–35.6 s).** Re-scan to the harbour. Three bright seams appear across the black water where no line was drawn; a light runs along each and its year drops beside it (1997, 1972, 1989). The day races by on the board seen at an angle; the evening rush swells the network again; the board dims.
- **Ending (35.6–52.5 s).** 03:00, the Cross Harbour Tunnel close up: an overnight bus, N121, crosses with its fading trail, in near silence (two more night buses pass through the same minutes); the camera pushes in on it; a stop bell. The clock flips through to 05:00, the map switches off, and the camera pulls back to the board on its wall with the title and the credits. The film opened on one dot and closes on the empty board, ready for the next one.

Native moves spent: the lamp test (opening), the flip (the header throughout; it cannot keep up at the rush), re-scan (five times), traffic draws the hidden (the signature: the tunnels), the swell (the two rushes), the lone dot (the ending).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–4.4 | lamp test, then the header "N182 中環(港澳碼頭)" | 15 px pitch on the header, pull back to the fill frame (6 px) | lamp test 0–0.25 s; first flip 0.25 s; the dot crosses the harbour below |
| 2 | 4.4–12.5 | all of Hong Kong, 05:10–07:00 | locked fill frame | re-scan at 5.0 s; two captions |
| 3 | 12.5–20 | the harbour, 07:00–08:50 | locked fill frame | re-scan at 12.5 s; tunnel sweeps and years at 15, 15.625, 16.25 s |
| 4 | 20–25 | the harbour, 09:00–16:00 | pull back and turn to 17°, back to square on at 25 s | the board as an object; the day in five seconds |
| 5 | 25–32.5 | all of Hong Kong, 16:00–21:30 | locked fill frame | re-scan at 25 s; the evening swell; the day's count |
| 6 | 32.5–40.4 | the harbour, then the Cross Harbour Tunnel, 21:30–03:06 | locked fill frame | re-scans at 32.5 and 35.625 s; the board dims; N121 and its trail |
| 7 | 40.4–44.4 | N121 under the water | push to 15 px following the bus, back to 6 px | the stop bell at 42.5 s; the clock races to 05:00 |
| 8 | 44.4–52.5 | the end card | pull back to 2.8 px, turned 15°, tilted −5° | the map switches off at 45 s; title 45.6 s; NEO-Cine 48.1 s |

## Score structure

96 BPM (a beat 0.625 s, a bar 2.5 s), A Dorian, original, every sound synthesized in `demo/mix.py`.

- **0–5 s**: the lamp test's relays, one low pad and one bass note.
- **5–12 s**: eighth-note bass and a sixteenth-note pulse arpeggio over Am7–Fmaj7–Cmaj7–G (two bars each); the arpeggio's filter opens with the number of buses on the road (`dens` events). **12.0–12.5 s** the bass stops: a breath before the peak.
- **12.5–20 s**: full: a low door-thud on each beat, bass, arpeggio, pads. The three tunnel years land on three FM bells rising E5, A5, C6.
- **20–25 s**: a whoosh and the groove without the thud while the day races. **25–32.5 s**: the second rush, thud back.
- **32.5–41.9 s**: pads only, the city hum and one engine (muffled under the water).
- **41.9–42.5 s** silence; **42.5 s** the stop bell (E6 over E5), the first sound after it. **42.75–44.4 s** a rising pulse and a quickening run of relays as the clock flips to 05:00; **44.55–45 s** a short drop.
- **45 s** the final chord; **45.6 s** an original two-note door chime (C♯6, A5) with the title; the chord carries to the end.
- Levels printed by `mix.py`: score −16.5 dB, reverb −30.6 dB, foley −41.0 dB (×2.6 on the bus), ambience −21.4 dB (RMS). `neo/audio/master.py` brings the mix to −14 LUFS with one gain (range 10.0 LU, true peak −2 dB); `neo/audio/cues.py` checks ten accents against the picture (section starts, the three years, the bell), all 0 ms off; the flips, scans, captions, engines and chime take their times from the events.

## Palette & props

One amber, the ladder in STYLE.md §3. The board: 320 × 180 dots; header row (route, destination, clock) on rows 0–15, map on rows 18–151, captions on rows 153–179. Three map views: all of Hong Kong (190 m a dot), the harbour (48 m), the Cross Harbour Tunnel (16 m). The data: 196 cross-harbour route numbers, 486 stop patterns (402 on 18 Nov, 84 from the early hours of 19 Nov), 398 distinct paths, 7,965 departures on the service day. Two followed buses: N182 to 中環(港澳碼頭) at dawn (departed 04:10) and N121 to 牛頭角 at night (departed 02:45 on the 19th).

Map view: Hong Kong and the harbour, north up, no boundary lines; the widest frame stops inside the New Territories.

## End card

The board alone on a dark wall, the map off: 海底下的一天 at 2×, A DAY UNDER THE HARBOUR, then NEO-Cine · 公交点阵屏 / NEO-Cine · Bus Dot Matrix; the header reads 05:00. The fan-film note ("trips from published headways"), the Transport Department and DATA.GOV.HK, and © OpenStreetMap contributors (ODbL) are in [`demo/CREDITS`](demo/CREDITS) and at the top of this file, not on screen: a library demo signs off with NEO-Cine only.

## Build notes

| File | What it draws or does |
|---|---|
| `demo/index.html` | the fonts and the canvas |
| `demo/timeline.js` | the one source of time: views and scans, the clock curve, the followed buses, camera keys, captions, tunnel beats, power |
| `demo/board.js` | the engine: the dot buffer, the bitmap font, the WebGL board (lens, bloom, glass, housing, wall), the camera |
| `demo/main.js` | data → paths and trips, static layers per view, buses, header, captions, tunnel years, end card, sound events, `window.render` |
| `demo/mix.py` | score, foley, ambience and bus |
| `demo/data/bus.json`, `map.json` | trips and paths (≈ 380 kB), coast (≈ 25 kB), made by `demo/tools/prep.py` |
| `demo/tools/prep.py`, `roads.py`, `fonts.sh` | the data cut, the OSM road graph, the font fetch |
| `demo/FACTS.md`, `demo/CREDITS` | every fact with its source; every licence |
| `demo/build.sh` | every step in order |

- Build: `sh styles/bus-dotmatrix/demo/build.sh vNNN` with the next free number; `RENDER=remote` renders on the render machine (3 workers). Data first if `data/*.json` is missing (GTFS download, `gtfs.py` for two service days, the coast, `prep.py --refs` → `routes.py`, `roads.py`, `prep.py`), then events → mix (cue check, level check) → picture → mux (−14 LUFS, BT.709, no grain) → reading-time check → poster at 50.5 s, style frame at 17 s.
- Render time: Apple-silicon laptop, 4 workers, 1,260 frames in about 40 s. The render machine (RTX 4060 Ti, 3 workers, shared with two other renders): 1,260 frames in 216 s, of which one worker spent 180 s waiting to reopen its page; 280 s with the encode and the copy back. `prep.py` takes about 3 minutes (the road graph); the mix about 6 s.
- Review: a frame a second; adjacent frames enlarged at 3, 21.5 and 46.5 s for moiré; the whole film enlarged at the harbour for DIRECTOR.md §13.
- Pitfalls of this film:
  - Every route dot bloomed, so the busy harbour turned to fog: bloom now comes only from dots above 0.4.
  - Buses drawn with six frames of full-brightness trail filled the board with streaks at time-lapse speed: one frame of shutter at constant energy instead.
  - Text taken from 12 px browser rendering came out smeared on the Windows render machine: glyphs are drawn at 120 px and sampled at the cell centres.
  - A push-in during the rush cropped the header and the captions: pushes happen only where nothing must be read.
  - The Cross Harbour Tunnel's bus interchange is on private-access lanes with a franchised-bus exception: 37 trips could not be routed until the road graph kept them.
  - The night looked empty until the next service day's night routes (before 05:00 on the 19th) were added.
  - Followed by the camera, a bus that left the map dragged the frame off the board: its position is clamped to the map.
