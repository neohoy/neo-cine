# Metro Mosaic — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *Tile by Tile* (一片一片, 56.5 s) · `metro-mosaic.mp4` · source in [`demo/`](demo/)

An unofficial fan film about a real metro, not made with or endorsed by its operator, with no operator logo, lettering or line bullet: line colours and station names are public facts. The map is OpenStreetMap data (© OpenStreetMap contributors, ODbL 1.0); every date and figure on screen is sourced in [`demo/FACTS.md`](demo/FACTS.md).

## Story & structure

Shenzhen's metro is laid on a station wall in the order it really opened, from one tile to the whole wall.

- **Set-up (0–12.5 s).** Night in an empty station: an oblique macro on white tiles, a trowel, a raking light. At 2.8 s the first green tile lands at Luohu; a plaque is hung: 罗湖 Luohu, 2004.12.28, 第一天 First day. The camera tracks west as Line 1 is laid to Window of the World, faster and faster, and Line 4 crosses it at Convention & Exhibition Center: the network of the first day.
- **Turn (12.5–37.5 s).** The title plaque 一片一片 Tile by Tile is hung in Shenzhen Bay. Then the camera stands back and each period is laid at one hand speed, every stretch from the end where it joined the network: 2011 (5 lines, 178 km), 2016 (8, 285), 2020 (11, 411), each closed by a new enamel plaque hung over the last one in the Pearl River estuary. 2021–2025 is the rush: ten stretches at once, ceramic rain, the whole wall in frame. The camera pushes north-west while Line 13's 2026 extension is laid.
- **Ending (37.5–56.5 s).** Silence; the last station tile lands at 李松蓢 Lisonglang (opened 2026-06-28) with one bell. One pull-back to the whole wall while a train passes and its light runs across the glaze from left to right; the last plaque is hung over the others: 2026, urban rail 653.7 km, 452 stations. The camera descends to it and to the mural's label: unofficial fan film, data credits.

Native moves spent: laying the line (Line 1, the opening), tile by date (the turn), the station tile swap (every interchange), plaque over plaque (the figures), the last tile (the ending), the light passes (the reveal).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–3.75 | white tiles at Luohu | oblique macro (yaw 50°→22°), frame 9 tiles, shallow focus | raking light passes 0.5–3 s; first tile 2.8 s, station tile 3.4 s |
| 2 | 3.75–10 | Line 1 west to Window of the World | squares up and tracks the laying front, frame 19–26 tiles | Luohu plaque read 4–7.5 s; Line 4 laid 7.9–9.3 s |
| 3 | 10–13 | Window of the World | slow drift | plaque read 10–13.7 s |
| 4 | 13–17.5 | Futian–Nanshan and the bay | pull to 56–64 tiles, hold | title plaque hung 13.1 s; 2011 laying starts 16.25 s |
| 5 | 17.5–28.75 | the city | pull to 152–170 tiles, slow drift | plaques 2011 (20.0 s), 2016 (23.75 s), 2020 (27.5 s) |
| 6 | 28.75–33.75 | the whole wall | pull to 252 tiles | 2021–2025: about 1,000 tiles in 5 s |
| 7 | 33.75–37.5 | the north-west | push to 36 tiles at 李松蓢 | Line 13's last stretch, 85 tiles |
| 8 | 37.5–43.75 | 李松蓢 | hold, frame 31 tiles | silence; last tile 40.4 s; plaque read 40.7–43.75 s |
| 9 | 43.75–50 | the whole wall | one pull-back to 268 tiles | train 45–51 s, the light sweeps left to right; 2026 plaque hung 47.5 s |
| 10 | 50–56.5 | the label and the 2026 plaque | descend to 92 tiles at the bottom-left corner | both read 51.25–56.5 s |

## Score structure

96 BPM (a bar is 2.5 s), D major pentatonic, original; glass bells, porcelain tines, bass, glass harmonica.

- **0–12.5 s**: no pulse. Room tone, a trowel at 0.25 and 1.2 s. The first tile at 2.8 s rings one bell (A5); every station tile of Line 1 rings the next note of the scale upward, driven by the picture.
- **13.6 s**: the title plaque: low D, a bell triad, glass harmonica.
- **17.5–27.5 s**: tines in eighths over a D–Bm–G–A bar cycle, bass on the bar line; a bell pair on each figures plaque (20.5, 24.25, 28.0 s).
- **28.75–35 s**: the rush: tines in sixteenths (the beat is divided, the tempo stays).
- **35–37.5 s**: the arpeggio falls and thins. **37.5–40.36 s**: silence, room tone only.
- **40.36 s**: the last tile: one bell (D6), low D, glass. **45 s**: the train; the bell motif rises D5–A6 over a D pedal. **48.0 s**: the 2026 plaque, a D major bell chord inside the train's motif. **51.25 s**: two last bells as the camera reaches the label; the glass harmonica holds to the end (an ending that drops into silence widened the loudness range past 11 LU and failed the level check).
- Foley: 3,109 tile clicks and 431 station tiles from `window.EV`, each click scaled down by the local density; plaques are struck steel and two screw turns; the train is rumble, wind and wheel clicks panned left to right with the light.
- Levels printed by `mix.py`: score −20.5 dB, reverb −23 dB, foley −23 dB, ambience −26.5 dB (RMS); the foley and score buses are peak-limited (12 and 14 dB crest) before `neo/audio/master.py`, which then only applies one gain. `neo/audio/cues.py` checks ten accents against the picture (first tile, title, the acts, the plaques, the last tile, the train), all within 0.5 ms.

## Palette & props

The palette in STYLE.md §3 is this film's. 340 × 210 tiles of 200 m (113.76–114.43° E, 22.46–22.83° N), 3,109 line tiles in 16 colours (Lines 2 and 8 run through as one, one colour), 351 station tiles, 40 dated stretches. Above the map a 30-tile band in navy with 深圳地铁 SHENZHEN METRO set in white tesserae; around it a dark border with a gold line, and white subway tiles 7 × 3.5 tiles. Plaques: Luohu (with the first date), Window of the World, the title, Lisonglang, four figures plaques, the label.

## End card

The bottom-left corner of the mural: the 2026 plaque over the Pearl River estuary, and below the mosaic the label: 非官方粉丝作品 · Unofficial fan film, the OpenStreetMap credit (ODbL 1.0), the sources of the dates, "line colours and station names are public facts; no operator marks", and NEO-Cine · 瓷砖地铁图 Metro Mosaic.

## Build notes

| File | What it draws or does |
|---|---|
| `demo/index.html` | fonts, import map |
| `demo/timeline.js` | the one source of time: acts, plaques, the raking light, exposure, camera keys |
| `demo/mosaic.js` | tile and station-tile geometry, the glaze and its raking-light patch, enamel plaques, mosaic lettering |
| `demo/main.js` | the wall, the laying schedule, the station environment, camera, `window.render`, `window.TEXTS`, `window.EV` |
| `demo/mix.py` | score, foley, ambience, bus |
| `demo/tools/prep.py` | `data/metro.json` + `data/coast.json` → `data/mosaic.json` (grid, tiles, stations, the dated phases) |
| `demo/tools/fonts.sh` | fetches the fonts |
| `demo/FACTS.md` | every on-screen fact and every phase date with its source |

- Build: `sh styles/metro-mosaic/demo/build.sh vNNN` (map data if missing → prep → events → mix with the cue and level checks → picture → mux at −14 LUFS, BT.709, no grain → reading-time check → poster at 48.5 s, style frame at 9 s). `RENDER=remote` renders the picture on the render desktop with 3 workers.
- Render time: on the desktop (RTX 4060 Ti, 3 workers), 1,356 frames in about 65 seconds, about 3.5 minutes with the upload, the encode on the desktop and the copy back; the whole build about 8 minutes (the reading-time check, run locally, takes about 4). The mix takes about 30 seconds.
- Review: a frame every 2 s, 0.2 s steps around 2.5–3.5 s (first tile), 28.75–30 s (the rush) and 40–41 s (last tile).
- Pitfalls of this film:
  - Lines 2/5 and 2/11 share corridors in Luohu and Futian; the later stretches were laid as zero tiles until they were set one tile aside.
  - The Shenzhen River, drawn as water, read as a border: long thin water areas are left out.
  - Station positions from OpenStreetMap sat off the chain of tiles; each station now takes the position of its nearest tile on each line.
  - A periodic normal map on the glaze drew the same X on every tile; the variety now comes from tile tilts alone.
  - The first station tile covered the first green tile: it lands a beat later.
  - The mural's label sat half inside the bottom edge of the whole-wall shot (and of the poster): it now hangs lower on the station wall, outside that frame, and the last shot frames it with the 2026 plaque.

## content.json fields (scene styles only)

Not a scene style.
